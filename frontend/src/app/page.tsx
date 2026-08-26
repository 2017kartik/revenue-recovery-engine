'use client';

import { useRecoveryDashboard } from '@/hooks/useRecoveryDashboard';
import RevenueRecoveryDashboard from '@/components/RevenueRecoveryDashboard';

export default function DashboardPage() {
  const {
    metrics,
    transactions,
    isLoading,
    lastRunResult,
    lastRefreshedAt,
    nextRefreshIn,
    error,
    runRecovery,
  } = useRecoveryDashboard();

  return (
    <>
      {error && (
        <div
          id="global-error-banner"
          role="alert"
          className="fixed top-0 inset-x-0 z-50 bg-red-600 text-white text-xs font-semibold px-4 py-2 text-center"
        >
          Backend error: {error} — retrying in{' '}
          <span className="tabular-nums font-bold">{nextRefreshIn}s</span>
        </div>
      )}
      <RevenueRecoveryDashboard
        transactions={transactions}
        metrics={metrics}
        isLoading={isLoading}
        onRunRecovery={runRecovery}
        lastRunResult={lastRunResult}
        lastRefreshedAt={lastRefreshedAt}
        nextRefreshIn={nextRefreshIn}
      />
    </>
  );
}
