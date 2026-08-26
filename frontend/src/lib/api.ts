import type { Metrics, Transaction, RecoveryRunResult } from '@/types/recovery';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export const api = {
  getMetrics: () => apiFetch<Metrics>('/api/metrics'),
  getTransactions: () => apiFetch<Transaction[]>('/api/transactions'),
  runRecovery: () =>
    apiFetch<RecoveryRunResult>('/api/recovery/run', { method: 'POST' }),
};
