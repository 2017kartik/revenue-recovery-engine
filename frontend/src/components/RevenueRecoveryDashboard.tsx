'use client';

import React, { useMemo, useState } from 'react';
import type {
  RevenueRecoveryDashboardProps,
  Transaction,
  RecoveryStatus,
  StatusFilter,
} from '@/types/recovery';

// ─── Status Config ────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<
  RecoveryStatus,
  { label: string; bg: string; text: string; dot: string }
> = {
  pending: {
    label: 'Failed',
    bg: 'bg-red-50',
    text: 'text-red-700',
    dot: 'bg-red-500',
  },
  processing: {
    label: 'Processing',
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    dot: 'bg-amber-400',
  },
  processed: {
    label: 'Recovered',
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    dot: 'bg-emerald-500',
  },
};

function StatusBadge({ status }: { status: RecoveryStatus }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.pending;
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-semibold tracking-wide uppercase ${cfg.bg} ${cfg.text} border border-current border-opacity-20`}
    >
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}

// ─── Filter Bar ───────────────────────────────────────────────────────────────

interface FilterBarProps {
  active: StatusFilter;
  counts: Record<StatusFilter, number>;
  onChange: (f: StatusFilter) => void;
}

const FILTER_TABS: { value: StatusFilter; label: string }[] = [
  { value: 'all',        label: 'All' },
  { value: 'pending',    label: 'Failed' },
  { value: 'processing', label: 'In Progress' },
  { value: 'processed',  label: 'Recovered' },
];

function FilterBar({ active, counts, onChange }: FilterBarProps) {
  return (
    <div
      id="status-filter-bar"
      role="tablist"
      aria-label="Filter transactions by status"
      className="flex items-stretch border-b border-gray-200"
    >
      {FILTER_TABS.map((tab) => {
        const isActive = tab.value === active;
        return (
          <button
            key={tab.value}
            id={`filter-tab-${tab.value}`}
            role="tab"
            aria-selected={isActive}
            type="button"
            onClick={() => onChange(tab.value)}
            className={`
              relative px-4 py-2.5 text-xs font-semibold tracking-wide uppercase
              flex items-center gap-2
              transition-colors duration-100 focus-visible:outline-none
              focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-gray-900
              ${isActive
                ? 'text-gray-900 bg-white'
                : 'text-gray-400 bg-gray-50 hover:text-gray-600 hover:bg-white'
              }
            `}
          >
            {isActive && (
              <span
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-gray-900"
                aria-hidden="true"
              />
            )}
            {tab.label}
            <span
              className={`
                tabular-nums px-1.5 py-0.5 rounded text-[10px] font-bold
                ${isActive ? 'bg-gray-900 text-white' : 'bg-gray-200 text-gray-500'}
              `}
            >
              {counts[tab.value]}
            </span>
          </button>
        );
      })}
    </div>
  );
}

// ─── Metric Card ──────────────────────────────────────────────────────────────

interface MetricCardProps {
  label: string;
  value: string | number;
  accent: 'red' | 'amber' | 'emerald' | 'violet';
  sublabel?: string;
}

const ACCENT_CLASSES: Record<MetricCardProps['accent'], { bar: string; value: string }> = {
  red:     { bar: 'bg-red-500',     value: 'text-red-600' },
  amber:   { bar: 'bg-amber-400',   value: 'text-amber-600' },
  emerald: { bar: 'bg-emerald-500', value: 'text-emerald-600' },
  violet:  { bar: 'bg-violet-500',  value: 'text-violet-600' },
};

function MetricCard({ label, value, accent, sublabel }: MetricCardProps) {
  const cls = ACCENT_CLASSES[accent];
  return (
    <div className="border border-gray-200 bg-white flex flex-col overflow-hidden">
      <div className={`h-0.5 w-full ${cls.bar}`} />
      <div className="px-5 py-4 flex flex-col gap-1">
        <span className="text-[11px] font-semibold tracking-widest uppercase text-gray-400">
          {label}
        </span>
        <span className={`text-3xl font-bold tabular-nums ${cls.value}`}>{value}</span>
        {sublabel && (
          <span className="text-[11px] text-gray-400">{sublabel}</span>
        )}
      </div>
    </div>
  );
}

// ─── Spinner ──────────────────────────────────────────────────────────────────

function Spinner({ size = 'sm' }: { size?: 'sm' | 'md' }) {
  const cls = size === 'sm' ? 'w-4 h-4' : 'w-5 h-5';
  return (
    <svg
      className={`animate-spin ${cls} text-current`}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

// ─── Table Row ────────────────────────────────────────────────────────────────

function TransactionRow({ tx, index }: { tx: Transaction; index: number }) {
  const formattedAmount = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(Number(tx.amount));

  const formattedDate = new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(tx.createdAt));

  return (
    <tr
      id={`tx-row-${tx.transactionId}`}
      className={`border-b border-gray-200 transition-colors duration-150 hover:bg-gray-50 ${
        index % 2 === 0 ? 'bg-white' : 'bg-gray-50/40'
      }`}
    >
      <td className="px-4 py-3.5 font-mono text-xs text-gray-500 whitespace-nowrap">
        {tx.transactionId.slice(0, 8).toUpperCase()}
        <span className="text-gray-300">…</span>
      </td>
      <td className="px-4 py-3.5 font-semibold tabular-nums text-gray-900 text-sm">
        {formattedAmount}
      </td>
      <td className="px-4 py-3.5 text-sm text-gray-700">{tx.customer}</td>
      <td className="px-4 py-3.5 text-sm text-gray-400 hidden md:table-cell whitespace-nowrap">
        {formattedDate}
      </td>
      <td className="px-4 py-3.5">
        <StatusBadge status={tx.status} />
      </td>
    </tr>
  );
}

// ─── Empty State ──────────────────────────────────────────────────────────────

function EmptyState({ filtered }: { filtered: boolean }) {
  return (
    <tr>
      <td colSpan={5} className="py-16 text-center">
        <div className="flex flex-col items-center gap-2">
          <svg className="w-8 h-8 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          <p className="text-sm text-gray-400 font-medium">
            {filtered ? 'No transactions match this filter' : 'No transactions found'}
          </p>
          {!filtered && (
            <p className="text-xs text-gray-300">
              POST to <code className="font-mono">/api/webhooks/payment-failed</code> to ingest data
            </p>
          )}
        </div>
      </td>
    </tr>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function RevenueRecoveryDashboard({
  transactions,
  metrics,
  isLoading,
  onRunRecovery,
  lastRunResult,
  lastRefreshedAt,
  nextRefreshIn = 8,
}: RevenueRecoveryDashboardProps) {
  const [activeFilter, setActiveFilter] = useState<StatusFilter>('all');

  // ── Derived data ───────────────────────────────────────────────────────────

  const filteredTransactions = useMemo<Transaction[]>(() => {
    if (activeFilter === 'all') return transactions;
    return transactions.filter((tx) => tx.status === activeFilter);
  }, [transactions, activeFilter]);

  const filterCounts = useMemo<Record<StatusFilter, number>>(() => ({
    all:        transactions.length,
    pending:    transactions.filter((tx) => tx.status === 'pending').length,
    processing: transactions.filter((tx) => tx.status === 'processing').length,
    processed:  transactions.filter((tx) => tx.status === 'processed').length,
  }), [transactions]);

  const recoveredFormatted = useMemo(
    () =>
      new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        maximumFractionDigits: 0,
      }).format(Number(metrics.recoveredAmount)),
    [metrics.recoveredAmount]
  );

  const lastRefreshedFormatted = useMemo(() => {
    if (!lastRefreshedAt) return null;
    return new Intl.DateTimeFormat('en-US', { timeStyle: 'medium' }).format(
      new Date(lastRefreshedAt)
    );
  }, [lastRefreshedAt]);

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <main
      id="revenue-recovery-dashboard"
      className="min-h-screen bg-gray-50 font-sans antialiased"
    >
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <header
        id="dashboard-header"
        className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between"
      >
        <div className="flex items-center gap-3">
          <div className="w-1 h-7 bg-gray-900 rounded-sm" aria-hidden="true" />
          <div>
            <h1 className="text-lg font-extrabold tracking-tight text-gray-900 leading-none">
              Revenue Recovery Engine
            </h1>
            <p className="text-[11px] text-gray-400 mt-0.5 font-medium tracking-wide uppercase">
              AI-Powered Payment Recovery
            </p>
          </div>
        </div>

        {lastRefreshedFormatted && (
          <span className="text-[11px] text-gray-400 font-medium hidden sm:block">
            Last refreshed at {lastRefreshedFormatted}
          </span>
        )}
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-5">

        {/* ── Metrics Grid ─────────────────────────────────────────────── */}
        <section
          id="metrics-grid"
          aria-label="Key metrics"
          className="grid grid-cols-3 gap-0 border border-gray-200 divide-x divide-gray-200 overflow-hidden"
        >
          <MetricCard
            label="Failed Payments"
            value={metrics.failedCount}
            accent="red"
            sublabel="Pending recovery"
          />
          <MetricCard
            label="In Progress"
            value={metrics.inProgressCount}
            accent="amber"
            sublabel="AI outreach active"
          />
          <MetricCard
            label="Revenue Recovered"
            value={recoveredFormatted}
            accent="emerald"
            sublabel="Total this period"
          />
        </section>

        {/* ── Action Bar ──────────────────────────────────────────────────── */}
        <section
          id="action-bar"
          aria-label="Recovery actions"
          className="bg-white border border-gray-200 px-5 py-3.5 flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4"
        >
          <button
            id="run-recovery-btn"
            type="button"
            disabled={isLoading}
            onClick={onRunRecovery}
            aria-busy={isLoading}
            className={`
              inline-flex items-center gap-2 px-5 py-2.5
              text-sm font-bold tracking-wide text-white
              border border-gray-900 bg-gray-900
              transition-colors duration-150
              focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-900 focus-visible:ring-offset-2
              disabled:opacity-50 disabled:cursor-not-allowed
              hover:enabled:bg-gray-700 hover:enabled:border-gray-700
            `}
          >
            {isLoading ? (
              <>
                <Spinner size="sm" />
                <span>Running Recovery…</span>
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                <span>Run AI Recovery</span>
              </>
            )}
          </button>

          {lastRunResult && (
            <p id="run-result-message" className="text-sm text-gray-600" aria-live="polite">
              <span className="font-semibold text-emerald-600">✓</span>{' '}
              {lastRunResult.message}
            </p>
          )}

          <div className="ml-auto hidden sm:flex items-center gap-1.5 text-[11px] text-gray-400">
            <span
              className={`w-1.5 h-1.5 rounded-full animate-pulse transition-colors duration-500 ${
                nextRefreshIn <= 2 ? 'bg-amber-400' : 'bg-emerald-400'
              }`}
              aria-hidden="true"
            />
            <span className="tabular-nums">
              Refreshing in <span className="font-bold text-gray-600">{nextRefreshIn}s</span>
            </span>
          </div>
        </section>

        {/* ── Transactions Table ──────────────────────────────────────────── */}
        <section
          id="transactions-table-section"
          aria-label="Transaction list"
          className="bg-white border border-gray-200 overflow-hidden"
        >
          <div className="border-b border-gray-200 px-5 py-3 flex items-center justify-between">
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-widest">
              Transactions
            </h2>
            <span className="text-xs text-gray-400 tabular-nums">
              {filteredTransactions.length} of {transactions.length} record
              {transactions.length !== 1 ? 's' : ''}
            </span>
          </div>

          <FilterBar active={activeFilter} counts={filterCounts} onChange={setActiveFilter} />

          <div className="overflow-x-auto">
            <table
              id="transactions-table"
              className="w-full text-left border-collapse"
              aria-label="Failed transactions"
            >
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  {['Transaction ID', 'Amount', 'Customer'].map((col) => (
                    <th
                      key={col}
                      scope="col"
                      className="px-4 py-2.5 text-[11px] font-semibold text-gray-500 uppercase tracking-widest whitespace-nowrap"
                    >
                      {col}
                    </th>
                  ))}
                  <th scope="col" className="px-4 py-2.5 text-[11px] font-semibold text-gray-500 uppercase tracking-widest hidden md:table-cell whitespace-nowrap">
                    Date
                  </th>
                  <th scope="col" className="px-4 py-2.5 text-[11px] font-semibold text-gray-500 uppercase tracking-widest">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredTransactions.length === 0 ? (
                  <EmptyState filtered={activeFilter !== 'all'} />
                ) : (
                  filteredTransactions.map((tx, i) => (
                    <TransactionRow key={tx.transactionId} tx={tx} index={i} />
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}
