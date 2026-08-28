'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import type { Metrics, Transaction } from '@/types/recovery';

const POLL_INTERVAL_MS = 8_000;
const POLL_INTERVAL_SEC = POLL_INTERVAL_MS / 1_000;
/** Faster poll rate when jobs are actively processing — catches live transitions */
const FAST_POLL_MS = 2_000;

export interface UseRecoveryDashboardReturn {
  metrics: Metrics;
  transactions: Transaction[];
  isLoading: boolean;
  isFetching: boolean;
  lastRefreshedAt: string | null;
  /** Seconds until the next automatic poll (counts 8→0, resets each cycle) */
  nextRefreshIn: number;
  error: string | null;
  runRecovery: () => Promise<void>;
  refresh: () => Promise<void>;
}

const EMPTY_METRICS: Metrics = {
  failedCount: 0,
  inProgressCount: 0,
  recoveredAmount: 0,
};

export function useRecoveryDashboard(): UseRecoveryDashboardReturn {
  const [metrics, setMetrics] = useState<Metrics>(EMPTY_METRICS);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<string | null>(null);
  const [nextRefreshIn, setNextRefreshIn] = useState<number>(POLL_INTERVAL_SEC);
  const [error, setError] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    setIsFetching(true);
    setError(null);
    try {
      const [m, t] = await Promise.all([api.getMetrics(), api.getTransactions()]);
      setMetrics(m);
      setTransactions(t);
      setLastRefreshedAt(new Date().toISOString());
      // 🐛 Fix: Do NOT reset nextRefreshIn here, otherwise fast-poll hijacks the countdown!
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to fetch data';
      setError(msg);
    } finally {
      setIsFetching(false);
    }
  }, []);

  // 1. Initial load
  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // 2. Tick the countdown every second independently
  useEffect(() => {
    const tickId = setInterval(() => {
      setNextRefreshIn((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1_000);
    return () => clearInterval(tickId);
  }, []);

  // 3. When countdown hits 0, refresh and reset to 8s
  useEffect(() => {
    if (nextRefreshIn === 0) {
      fetchAll();
      setNextRefreshIn(POLL_INTERVAL_SEC);
    }
  }, [nextRefreshIn, fetchAll]);

  // ⚡ Fast-poll overlay: when jobs are actively processing, poll every 2 s
  // so the Failed → In Progress → Recovered transition is visible in real-time.
  useEffect(() => {
    if (metrics.inProgressCount === 0) return;
    const fastId = setInterval(fetchAll, FAST_POLL_MS);
    return () => clearInterval(fastId);
  }, [metrics.inProgressCount, fetchAll]);

  const runRecovery = useCallback(async () => {
    if (isLoading) return;
    setIsLoading(true);
    try {
      await api.runRecovery();
      // We rely completely on the 8-second auto-polling loop to update the UI grid.
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Recovery failed';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, [isLoading]);

  return {
    metrics,
    transactions,
    isLoading,
    isFetching,
    lastRefreshedAt,
    nextRefreshIn,
    error,
    runRecovery,
    refresh: fetchAll,
  };
}
