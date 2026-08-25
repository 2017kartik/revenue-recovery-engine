/**
 * worker.ts — DEPRECATED
 *
 * The node-cron based worker has been replaced by the BullMQ Worker
 * defined in src/queue.ts, which is started automatically when server.ts
 * imports recoveryQueue from that file.
 *
 * This file is kept as a placeholder to avoid breaking any import chains.
 * It can be safely deleted.
 */
export {};
