import type { Metrics, Transaction, RecoveryRunResult } from '@/types/recovery';

// Strip trailing slash to prevent double-slash 404 errors (e.g. https://backend.com//api/metrics)
const rawBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
const BASE_URL = rawBaseUrl.replace(/\/$/, '');
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
