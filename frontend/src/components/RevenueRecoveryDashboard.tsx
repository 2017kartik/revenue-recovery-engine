'use client';

import React, { useMemo, useState } from 'react';
import type {
  RevenueRecoveryDashboardProps,
  Transaction,
  StatusFilter,
} from '@/types/recovery';
import DemoTriggerButton from './DemoTriggerButton';
import { Spinner } from '@/components/ui/Spinner';
import { Toast } from '@/components/ui/Toast';
import { MetricCard } from '@/components/dashboard/MetricCard';
import { TransactionsTable } from '@/components/dashboard/TransactionsTable';

export default function RevenueRecoveryDashboard({
  transactions,
  metrics,
  isLoading,
  onRunRecovery,
  lastRefreshedAt,
  nextRefreshIn = 8,
}: RevenueRecoveryDashboardProps) {
  const [activeFilter, setActiveFilter] = useState<StatusFilter>('all');
  const [activeToast, setActiveToast] = useState<{ title?: string; message: string } | null>(null);

  // ── Derived data ───────────────────────────────────────────────────────────

  const filteredTransactions = useMemo<Transaction[]>(() => {
    if (activeFilter === 'all') return transactions;
    return transactions.filter((tx) => tx.status === activeFilter);
  }, [transactions, activeFilter]);

  const filterCounts = useMemo<Record<StatusFilter, number>>(() => ({
    all: transactions.length,
    pending: transactions.filter((tx) => tx.status === 'pending').length,
    processing: transactions.filter((tx) => tx.status === 'processing').length,
    processed: transactions.filter((tx) => tx.status === 'processed').length,
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

  const handleRowClick = (tx: Transaction) => {
    if (tx.status === 'processed') {
      setActiveToast({
        title: `AI Message sent to ${tx.customer}`,
        message: tx.smsBody || 'No message recorded.',
      });
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <main
      id="revenue-recovery-dashboard"
      className="min-h-screen bg-bg-light font-sans antialiased pb-12"
    >
      {/* ── Top App Bar (Navy) ──────────────────────────────────────────────── */}
      <header
        className="bg-navy text-white px-8 py-5 flex items-center justify-between shadow-md relative z-10"
      >
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-primary/20 rounded-xl flex items-center justify-center text-primary">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-wide leading-tight">
              Revenue Recovery Engine
            </h1>
            <p className="text-xs text-blue-200/70 font-medium tracking-wide mt-0.5">
              AI-POWERED PAYMENT RECOVERY
            </p>
          </div>
        </div>

        {lastRefreshedFormatted && (
          <div className="hidden sm:flex items-center gap-3 bg-white/5 rounded-full px-4 py-2 border border-white/10">
            <span
              className={`w-2 h-2 rounded-full animate-pulse transition-colors duration-500 ${nextRefreshIn <= 2 ? 'bg-amber-400' : 'bg-emerald-400'}`}
              aria-hidden="true"
            />
            <span className="text-xs font-medium text-gray-300 tabular-nums">
              Refreshed at {lastRefreshedFormatted}
            </span>
          </div>
        )}
      </header>

      <div className="max-w-[1400px] mx-auto px-4 sm:px-8 py-8 space-y-8">
        
        {/* ── Action Bar ──────────────────────────────────────────────────── */}
        <section
          className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
        >
          <div className="flex items-center gap-4">
            <button
              type="button"
              disabled={isLoading}
              onClick={onRunRecovery}
              className={`
                inline-flex items-center gap-2 px-6 py-3 rounded-xl
                text-sm font-bold tracking-wide text-white
                bg-navy shadow-sm hover:shadow-md hover:bg-blue-950
                transition-all duration-200 active:scale-95
                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-bg-light
                disabled:opacity-60 disabled:cursor-not-allowed disabled:active:scale-100
              `}
            >
              {isLoading ? (
                <>
                  <Spinner size="sm" />
                  <span>Running Recovery…</span>
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>Run AI Recovery</span>
                </>
              )}
            </button>
            
            <DemoTriggerButton />
          </div>
        </section>

        {/* ── Metrics Grid ─────────────────────────────────────────────── */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <MetricCard
            label="Failed Payments"
            value={metrics.failedCount}
            sublabel="Pending recovery"
            icon={<svg className="w-6 h-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>}
          />
          <MetricCard
            label="In Progress"
            value={metrics.inProgressCount}
            sublabel="AI outreach active"
            icon={<svg className="w-6 h-6 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>}
          />
          <MetricCard
            label="Revenue Recovered"
            value={recoveredFormatted}
            sublabel="Total this period"
            icon={<svg className="w-6 h-6 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
          />
        </section>

        {/* ── Transactions Table ──────────────────────────────────────────── */}
        <TransactionsTable
          transactions={transactions}
          filteredTransactions={filteredTransactions}
          activeFilter={activeFilter}
          filterCounts={filterCounts}
          onFilterChange={setActiveFilter}
          onRowClick={handleRowClick}
        />
      </div>

      {activeToast && (
        <Toast
          title={activeToast.title}
          message={activeToast.message}
          onClose={() => setActiveToast(null)}
        />
      )}
    </main>
  );
}
