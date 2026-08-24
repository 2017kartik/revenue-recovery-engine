import 'dotenv/config';
import { Queue, Worker, type Job } from 'bullmq';
import IORedis from 'ioredis';
import { v4 as uuidv4 } from 'uuid';
import pool from './db';
import { generateRecoverySMS } from './aiService';

// ─── Redis Connection ─────────────────────────────────────────────────────────

const REDIS_URL = process.env.REDIS_URL;
if (!REDIS_URL) throw new Error('CRITICAL: REDIS_URL is not set in .env');

/**
 * IORedis connection shared by both Queue (producer) and Worker (consumer).
 * maxRetriesPerRequest: null is required by BullMQ for blocking commands.
 */
export const redisConnection = new IORedis(REDIS_URL, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
  tls: REDIS_URL.startsWith('rediss://') || REDIS_URL.includes('upstash')
    ? { rejectUnauthorized: false }
    : undefined,
});

redisConnection.on('connect', () => console.log('✓ Redis connected'));
redisConnection.on('error', (err) => console.error('✗ Redis error:', err.message));

// ─── Queue (Producer-side singleton) ─────────────────────────────────────────

export const QUEUE_NAME = 'recovery-queue';

/**
 * BullMQ Queue — jobs are added by the /api/recovery/run HTTP handler.
 * The queue itself is stateless; it just pushes job payloads into Redis.
 */
export const recoveryQueue = new Queue(QUEUE_NAME, {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000, // 2s → 4s → 8s
    },
    removeOnComplete: { count: 200 }, // keep last 200 completed jobs
    removeOnFail:     { count: 500 }, // keep last 500 failed jobs for inspection
  },
});

// ─── Job Payload Type ─────────────────────────────────────────────────────────

export interface RecoveryJobData {
  txId:           string;
  customerName:   string;
  amount:         number;
  failureReason:  string;
}

// ─── Worker (Consumer) ────────────────────────────────────────────────────────

/**
 * BullMQ Worker — processes recovery jobs one at a time (concurrency: 1).
 * Concurrency is deliberately kept low to respect LLM rate limits and avoid
 * hammering the providers. Increase to 2-3 once you have paid-tier quotas.
 */
export const recoveryWorker = new Worker<RecoveryJobData>(
  QUEUE_NAME,
  async (job: Job<RecoveryJobData>) => {
    const { txId, customerName, amount, failureReason } = job.data;

    console.log(`[Job ${job.id}] Processing tx ${txId} — attempt ${job.attemptsMade + 1}`);

    // ── Step 1: Mark row as processing (idempotent on retry) ─────────────────
    await pool.query(
      `UPDATE failed_transactions
       SET recovery_status = 'processing', retry_after = NULL
       WHERE id = $1 AND recovery_status IN ('pending', 'processing')`,
      [txId]
    );

    // ── Step 2: Call LLM router (Groq primary → Gemini fallback) ─────────────
    //    If this throws, BullMQ catches it and schedules an exponential retry.
    const { prompt, smsResponse, model } = await generateRecoverySMS(
      customerName, amount, failureReason
    );

    // ── Step 3: Atomic audit + completion (ACID transaction) ─────────────────
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const auditId = uuidv4();
      await client.query(
        `INSERT INTO audit_logs (id, transaction_id, llm_prompt, llm_response)
         VALUES ($1, $2, $3, $4)`,
        [auditId, txId, prompt, `[${model}] ${smsResponse}`]
      );

      await client.query(
        `UPDATE failed_transactions
         SET recovery_status = 'processed', retry_after = NULL
         WHERE id = $1`,
        [txId]
      );

      await client.query('COMMIT');
      console.log(`✓ [Job ${job.id}] tx ${txId} recovered via ${model}`);
    } catch (dbError) {
      await client.query('ROLLBACK');
      console.error(`✗ [Job ${job.id}] DB write failed for tx ${txId}:`, dbError);
      throw dbError; // re-throw so BullMQ retries the whole job
    } finally {
      client.release();
    }
  },
  {
    connection: redisConnection,
    concurrency: 1, // one job at a time — respects LLM free-tier rate limits
  }
);

// ─── Worker lifecycle hooks ───────────────────────────────────────────────────

recoveryWorker.on('completed', (job) =>
  console.log(`✓ [Worker] Job ${job.id} completed`)
);

recoveryWorker.on('failed', (job, err) => {
  // On final failure (all attempts exhausted), revert the row to pending
  // so it can be re-queued on the next manual trigger
  if (job && job.attemptsMade >= (job.opts.attempts ?? 1)) {
    pool.query(
      `UPDATE failed_transactions
       SET recovery_status = 'pending'
       WHERE id = $1 AND recovery_status = 'processing'`,
      [job.data.txId]
    ).catch((dbErr) =>
      console.error(`CRITICAL: Could not revert tx ${job.data.txId} to pending:`, dbErr)
    );
  }
  console.error(`✗ [Worker] Job ${job?.id} failed (attempt ${job?.attemptsMade}):`, err.message);
});

recoveryWorker.on('error', (err) =>
  console.error('[Worker] Unhandled error:', err)
);
