import 'dotenv/config';
import express from 'express';
import pool from './db';
import { v4 as uuidv4 } from 'uuid';
import { recoveryQueue, type RecoveryJobData } from './queue';

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

// ─── CORS ─────────────────────────────────────────────────────────────────────

app.use((req, res, next) => {
  res.setHeader(
    'Access-Control-Allow-Origin',
    process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
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
        COUNT(*) FILTER (WHERE recovery_status = 'pending')    AS "failedCount",
        COUNT(*) FILTER (WHERE recovery_status = 'processing') AS "inProgressCount",
        COALESCE(SUM(amount) FILTER (WHERE recovery_status = 'processed'), 0) AS "recoveredAmount"
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
        created_at      AS "createdAt"
      FROM failed_transactions
      ORDER BY
        CASE recovery_status
          WHEN 'processing' THEN 1
          WHEN 'processed'  THEN 2
          ELSE 3
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
      SELECT id, customer_name, amount, failure_reason
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
  const { customer_name, amount, failure_reason } = req.body;

  if (
    typeof customer_name !== 'string' ||
    typeof amount !== 'number' ||
    typeof failure_reason !== 'string'
  ) {
    return res.status(400).json({ error: 'Bad Request: Invalid or missing fields.' });
  }

  const transaction_id = uuidv4();

  try {
    await pool.query(
      `INSERT INTO failed_transactions (id, customer_name, amount, failure_reason)
       VALUES ($1, $2, $3, $4)`,
      [transaction_id, customer_name, amount, failure_reason]
    );
    res.status(200).json({ transaction_id });
  } catch (error) {
    console.error('Error inserting failed transaction:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// ─── Boot ─────────────────────────────────────────────────────────────────────

app.listen(port, () => {
  console.log(`Express server is running on port ${port}`);
  console.log(`BullMQ worker is active — queue: ${recoveryQueue.name}`);
});
