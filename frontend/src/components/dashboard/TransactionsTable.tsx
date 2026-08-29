import React, { useState, useEffect, useMemo } from 'react';
import type { Transaction, StatusFilter } from '@/types/recovery';
import { StatusBadge, STATUS_CONFIG } from '@/components/ui/StatusBadge';
import { FilterBar } from '@/components/ui/FilterBar';
import { Pagination } from '@/components/ui/Pagination';

interface TransactionsTableProps {
  transactions: Transaction[];
  filteredTransactions: Transaction[];
  activeFilter: StatusFilter;
  filterCounts: Record<StatusFilter, number>;
  onFilterChange: (f: StatusFilter) => void;
  onRowClick: (tx: Transaction) => void;
}

export function TransactionsTable({
  transactions,
  filteredTransactions,
  activeFilter,
  filterCounts,
  onFilterChange,
  onRowClick,
}: TransactionsTableProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [prevFilter, setPrevFilter] = useState<StatusFilter>(activeFilter);

  // Reset to page 1 whenever the filter changes (derived state during render)
  if (activeFilter !== prevFilter) {
    setCurrentPage(1);
    setPrevFilter(activeFilter);
  }

  // Derived state for pagination
  const totalItems = filteredTransactions.length;
  const totalPages = Math.ceil(totalItems / pageSize) || 1;
  
  // Ensure currentPage is not out of bounds if items are deleted/filtered
  const safeCurrentPage = Math.min(currentPage, totalPages);
  
  const paginatedTransactions = useMemo(() => {
    const startIndex = (safeCurrentPage - 1) * pageSize;
    return filteredTransactions.slice(startIndex, startIndex + pageSize);
  }, [filteredTransactions, safeCurrentPage, pageSize]);

  return (
    <section className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="border-b border-gray-100 px-6 py-4 flex items-center justify-between bg-white">
        <h2 className="text-sm font-bold text-navy tracking-wide">
          Transactions
        </h2>
        <span className="text-xs font-semibold text-gray-400 tabular-nums bg-gray-50 px-3 py-1 rounded-full">
          {filteredTransactions.length} of {transactions.length}
        </span>
      </div>

      <FilterBar active={activeFilter} counts={filterCounts} onChange={onFilterChange} />

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-white border-b border-gray-100">
              {['Transaction ID', 'Amount', 'Customer'].map((col) => (
                <th
                  key={col}
                  className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest whitespace-nowrap"
                >
                  {col}
                </th>
              ))}
              <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest hidden md:table-cell whitespace-nowrap">
                Date
              </th>
              <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">
                Status
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {paginatedTransactions.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-24 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center text-gray-300 mb-2">
                      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                    </div>
                    <p className="text-base text-gray-500 font-semibold">
                      {activeFilter !== 'all' ? 'No transactions match this filter' : 'No transactions found'}
                    </p>
                    {activeFilter === 'all' && (
                      <p className="text-sm text-gray-400">
                        Use the <strong className="text-gray-600">Inject Failed Payment</strong> button above.
                      </p>
                    )}
                  </div>
                </td>
              </tr>
            ) : (
              paginatedTransactions.map((tx) => {
                const formattedAmount = new Intl.NumberFormat('en-US', {
                  style: 'currency', currency: 'USD',
                }).format(Number(tx.amount));
                
                const formattedDate = new Intl.DateTimeFormat('en-US', {
                  dateStyle: 'medium', timeStyle: 'short',
                }).format(new Date(tx.createdAt));

                const cfg = STATUS_CONFIG[tx.status];

                return (
                  <tr
                    key={tx.transactionId}
                    onClick={() => onRowClick(tx)}
                    className={`transition-colors duration-150 bg-white ${cfg.hover}`}
                    title={tx.status === 'processed' ? "Click to view AI Recovery Message" : undefined}
                  >
                    <td className="px-6 py-4 font-mono text-[13px] text-gray-500 whitespace-nowrap font-medium">
                      {tx.transactionId.slice(0, 8).toUpperCase()}
                      <span className="text-gray-300">…</span>
                    </td>
                    <td className="px-6 py-4 font-bold tabular-nums text-navy text-[15px]">
                      {formattedAmount}
                    </td>
                    <td className="px-6 py-4 text-sm font-semibold text-gray-700">{tx.customer}</td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-400 hidden md:table-cell whitespace-nowrap">
                      {formattedDate}
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge status={tx.status} />
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <Pagination
        currentPage={safeCurrentPage}
        totalPages={totalPages}
        totalItems={totalItems}
        pageSize={pageSize}
        onPageChange={setCurrentPage}
        onPageSizeChange={(newSize) => {
          setPageSize(newSize);
          setCurrentPage(1);
        }}
      />
    </section>
  );
}
