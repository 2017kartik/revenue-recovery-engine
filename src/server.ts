import 'dotenv/config';
import express from 'express';
import pool from './db';
import { v4 as uuidv4 } from 'uuid';
import { recoveryQueue, type RecoveryJobData } from './queue';
import cron from 'node-cron';

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

// ─── CORS ─────────────────────────────────────────────────────────────────────

app.use((req, res, next) => {
  res.setHeader(
    'Access-Control-Allow-Origin',
    process.env.FRONTEND_URL || 'http://localhost:3000'
  );
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

// ─── Health ───────────────────────────────────────────────────────────────────

app.get('/health', async (_req, res) => {
  try {
    const [dbResult, queueCounts] = await Promise.all([
      pool.query('SELECT NOW()'),
      recoveryQueue.getJobCounts('active', 'waiting', 'completed', 'failed'),
    ]);
    res.json({
      status: 'ok',
      db_time: dbResult.rows[0].now,
      queue: queueCounts,
    });
  } catch (error) {
    console.error('Health check error:', error);
    res.status(500).json({ error: 'Health check failed' });
  }
});

// ─── Dashboard Metrics ────────────────────────────────────────────────────────

app.get('/api/metrics', async (_req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        COUNT(*) FILTER (WHERE recovery_status = 'pending')             AS "failedCount",
        COUNT(*) FILTER (WHERE recovery_status = 'processing')          AS "inProgressCount",
        COALESCE(SUM(amount) FILTER (WHERE recovery_status = 'processed'), 0) AS "recoveredAmount",
        COUNT(*) FILTER (WHERE recovery_status = 'failed_permanently')  AS "failedPermanentlyCount"
      FROM failed_transactions
    `);
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching metrics:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// ─── Transactions List ────────────────────────────────────────────────────────

app.get('/api/transactions', async (_req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        id              AS "transactionId",
        customer_name   AS "customer",
        amount,
        recovery_status AS "status",
        sms_body        AS "smsBody",
        retry_count     AS "retryCount",
        created_at      AS "createdAt"
      FROM failed_transactions
      ORDER BY
        CASE recovery_status
          WHEN 'processing'          THEN 1
          WHEN 'processed'           THEN 2
          WHEN 'failed_permanently'  THEN 3
          ELSE 4
        END,
        created_at DESC
      LIMIT 100
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching transactions:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// ─── Manual Recovery Trigger ──────────────────────────────────────────────────

/**
 * POST /api/recovery/run
 *
 * 1. Opens a DB transaction and selects up to 5 pending rows with FOR UPDATE
 *    SKIP LOCKED (prevents duplicate processing on concurrent requests).
 * 2. Marks each row as 'processing'.
 * 3. Adds one BullMQ job per row — the worker handles LLM calls + audit writes.
 * 4. Commits the DB transaction and returns 200 immediately.
 *
 * The HTTP response is instant. All heavy work (LLM API calls) is done
 * asynchronously by the BullMQ worker with 3-attempt exponential backoff.
 */
app.post('/api/recovery/run', async (req, res) => {
  const client = await pool.connect();
  let transactions: any[] = [];

  try {
    // ── ACID claim: select + lock + mark as processing in one transaction ──
    await client.query('BEGIN');

    const result = await client.query(`
      SELECT id, customer_name, customer_phone, amount, failure_reason
      FROM failed_transactions
      WHERE recovery_status = 'pending'
      ORDER BY created_at ASC
      LIMIT 5
      FOR UPDATE SKIP LOCKED
    `);
    transactions = result.rows;

    if (transactions.length === 0) {
      await client.query('ROLLBACK');
      return res.json({ processed: 0, transactionIds: [], message: 'No pending transactions to recover.' });
    }

    // Mark all claimed rows as 'processing' before committing
    const txIds = transactions.map((tx) => tx.id);
    await client.query(
      `UPDATE failed_transactions
       SET recovery_status = 'processing'
       WHERE id = ANY($1)`,
      [txIds]
    );

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error claiming transactions:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  } finally {
    client.release();
  }

  // ── Enqueue one BullMQ job per claimed transaction ─────────────────────
  const jobPromises = transactions.map((tx) => {
    const jobData: RecoveryJobData = {
      txId:          tx.id,
      customerName:  tx.customer_name,
      customerPhone: tx.customer_phone ?? null,
      amount:        Number(tx.amount),
      failureReason: tx.failure_reason,
    };
    return recoveryQueue.add(`recover-${tx.id}`, jobData);
  });

  await Promise.all(jobPromises);

  console.log(`[Recovery] Queued ${transactions.length} job(s):`, transactions.map((tx) => tx.id));

  return res.json({
    processed: transactions.length,
    transactionIds: transactions.map((tx) => tx.id),
    message: `Recovery queued for ${transactions.length} transaction(s).`,
  });
});

// ─── Ingest Webhook ───────────────────────────────────────────────────────────

app.post('/api/webhooks/payment-failed', async (req, res) => {
  const { customer_name, amount, failure_reason, customer_phone } = req.body;

  if (
    typeof customer_name !== 'string' ||
    typeof amount !== 'number' ||
    typeof failure_reason !== 'string'
  ) {
    return res.status(400).json({ error: 'Bad Request: Invalid or missing fields.' });
  }

  // customer_phone is optional — if provided must be a string (E.164 format recommended)
  const phone: string | null =
    typeof customer_phone === 'string' && customer_phone.trim() ? customer_phone.trim() : null;

  const transaction_id = uuidv4();

  try {
    await pool.query(
      `INSERT INTO failed_transactions (id, customer_name, amount, failure_reason, customer_phone)
       VALUES ($1, $2, $3, $4, $5)`,
      [transaction_id, customer_name, amount, failure_reason, phone]
    );

    // ── Auto-enqueue: push directly to BullMQ with a 5-second delay so the
    //    frontend can render the initial 'pending' state before the worker
    //    claims the job. The job name mirrors the manual-trigger convention.
    const jobData: RecoveryJobData = {
      txId:          transaction_id,
      customerName:  customer_name,
      customerPhone: phone,
      amount,
      failureReason: failure_reason,
    };
    const job = await recoveryQueue.add(
      `recover-${transaction_id}`,
      jobData,
      { delay: 5000 }
    );

    console.log(`[Webhook] Queued job ${job.id} for tx ${transaction_id} (5 s delay)`);
    res.status(200).json({ transaction_id, job_id: job.id });
  } catch (error) {
    console.error('Error inserting failed transaction:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// ─── Backlog Auto-Drain ───────────────────────────────────────────────────────

/**
 * Atomically claims up to 5 'pending' rows, marks them 'processing', and
 * enqueues one BullMQ job each — identical to /api/recovery/run but driven
 * by a cron schedule instead of an HTTP request.
 *
 * Guards: skips the tick if the queue already has ≥ 5 in-flight jobs so we
 * never pile on faster than the worker (concurrency: 1) can consume.
 */
async function drainPendingBacklog(): Promise<void> {
  const counts = await recoveryQueue.getJobCounts('active', 'waiting', 'delayed');
  const inFlight = (counts.active ?? 0) + (counts.waiting ?? 0) + (counts.delayed ?? 0);
  if (inFlight >= 5) {
    console.log(`[Cron] ${inFlight} jobs already in-flight — skipping tick`);
    return;
  }

  const client = await pool.connect();
  let transactions: any[] = [];

  try {
    await client.query('BEGIN');
    const result = await client.query(`
      SELECT id, customer_name, customer_phone, amount, failure_reason
      FROM failed_transactions
      WHERE recovery_status = 'pending'
      ORDER BY created_at ASC
      LIMIT 5
      FOR UPDATE SKIP LOCKED
    `);
    transactions = result.rows;

    if (transactions.length === 0) {
      await client.query('ROLLBACK');
      return; // backlog is empty — nothing to do
    }

    await client.query(
      `UPDATE failed_transactions SET recovery_status = 'processing' WHERE id = ANY($1)`,
      [transactions.map((tx) => tx.id)]
    );
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[Cron] Error claiming backlog:', err);
    return;
  } finally {
    client.release();
  }

  await Promise.all(
    transactions.map((tx) =>
      recoveryQueue.add(`recover-${tx.id}`, {
        txId:          tx.id,
        customerName:  tx.customer_name,
        customerPhone: tx.customer_phone ?? null,
        amount:        Number(tx.amount),
        failureReason: tx.failure_reason,
      } satisfies RecoveryJobData)
    )
  );

  console.log(`[Cron] Auto-queued ${transactions.length} backlog job(s)`);
}

// ─── Boot ─────────────────────────────────────────────────────────────────────

app.listen(port, () => {
  console.log(`Express server is running on port ${port}`);
  console.log(`BullMQ worker is active — queue: ${recoveryQueue.name}`);

  // Schedule backlog drain: every 30 seconds, pick up 5 pending transactions.
  // Fires immediately on boot, then every 30 s thereafter.
  cron.schedule('*/30 * * * * *', () => {
    drainPendingBacklog().catch((err) =>
      console.error('[Cron] Unhandled drain error:', err)
    );
  });
  console.log('[Cron] Backlog drain scheduled — every 30 s, batch of 5');
});
