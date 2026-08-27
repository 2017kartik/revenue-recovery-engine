// ─── Domain Types ─────────────────────────────────────────────────────────────
// These mirror the exact column names returned by GET /api/transactions
// and GET /api/metrics from the Express backend.

export type RecoveryStatus = 'pending' | 'processing' | 'processed' | 'failed_permanently';

export interface Transaction {
  transactionId: string;
  customer: string;
  amount: number;
  status: RecoveryStatus;
  smsBody:    string | null;  // AI-generated recovery message (null until processed)
  retryCount: number;         // total BullMQ attempts exhausted
  createdAt: string; // ISO 8601
}

export interface Metrics {
  failedCount: number;              // pending rows
  inProgressCount: number;          // processing rows (BullMQ active jobs)
  recoveredAmount: number;          // sum(amount) for processed rows
  failedPermanentlyCount: number;   // rows that exhausted all retries
}

export interface RecoveryRunResult {
  processed: number;
  message: string;
  /** UUIDs of the transactions that were atomically claimed by this run */
  transactionIds: string[];
}

// ─── Component Prop Contracts ─────────────────────────────────────────────────

export interface RevenueRecoveryDashboardProps {
  /** Live transaction rows from GET /api/transactions */
  transactions: Transaction[];
  /** Aggregate metrics from GET /api/metrics */
  metrics: Metrics;
  /** Whether the AI recovery POST is currently in-flight */
  isLoading: boolean;
  /** Trigger called when the user clicks "Run AI Recovery" */
  onRunRecovery: () => void;
  /** Optional last-run result message to show in the action bar */
  lastRunResult?: RecoveryRunResult | null;
  /** Optional ISO timestamp of the last data refresh */
  lastRefreshedAt?: string | null;
  /** Seconds until the next automatic poll (live countdown) */
  nextRefreshIn?: number;
}
// ─── Filter Types ─────────────────────────────────────────────────────────────

/** Maps to the status values shown in the filter bar. 'all' is a UI-only sentinel. */
export type StatusFilter = 'all' | RecoveryStatus;
