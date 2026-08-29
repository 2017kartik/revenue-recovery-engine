import React from 'react';

export interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
}

export function Pagination({
  currentPage,
  totalPages,
  totalItems,
  pageSize,
  onPageChange,
  onPageSizeChange,
}: PaginationProps) {
  // If there are no items, don't render pagination
  if (totalItems === 0) return null;

  const PAGE_SIZES = [5, 10, 25, 50];

  const startItem = (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems);

  return (
    <div className="border-t border-gray-100 px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4 bg-white rounded-b-2xl">
      {/* ── Left side: Rows per page & Status ── */}
      <div className="flex items-center gap-4 text-sm text-gray-500 font-medium">
        <div className="flex items-center gap-2">
          <span>Rows per page:</span>
          <select
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            className="border-gray-200 border rounded-lg text-navy text-sm font-semibold focus:ring-primary focus:border-primary py-1 pl-2 pr-8"
          >
            {PAGE_SIZES.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </div>
        
        <div className="hidden sm:block w-px h-4 bg-gray-200" aria-hidden="true" />
        
        <span>
          Showing <span className="font-bold text-navy">{startItem}</span> to <span className="font-bold text-navy">{endItem}</span> of <span className="font-bold text-navy">{totalItems}</span>
        </span>
      </div>

      {/* ── Right side: Controls ── */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={currentPage === 1}
          onClick={() => onPageChange(currentPage - 1)}
          className={`
            inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-bold transition-colors
            ${currentPage === 1 
              ? 'text-gray-300 cursor-not-allowed bg-gray-50' 
              : 'text-navy bg-white hover:bg-gray-50 border border-gray-200 shadow-sm'}
          `}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Prev
        </button>
        
        <div className="flex items-center gap-1 px-2">
          <span className="text-sm font-semibold text-gray-600">
            Page <span className="text-navy">{currentPage}</span> of {totalPages}
          </span>
        </div>

        <button
          type="button"
          disabled={currentPage === totalPages}
          onClick={() => onPageChange(currentPage + 1)}
          className={`
            inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-bold transition-colors
            ${currentPage === totalPages 
              ? 'text-gray-300 cursor-not-allowed bg-gray-50' 
              : 'text-navy bg-white hover:bg-gray-50 border border-gray-200 shadow-sm'}
          `}
        >
          Next
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </div>
  );
}
