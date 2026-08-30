import React from 'react';
import type { StatusFilter } from '@/types/recovery';

interface FilterBarProps {
  active: StatusFilter;
  counts: Record<StatusFilter, number>;
  onChange: (f: StatusFilter) => void;
}

const FILTER_TABS: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'pending', label: 'Failed' },
  { value: 'processing', label: 'In Progress' },
  { value: 'processed', label: 'Recovered' },
];

export function FilterBar({ active, counts, onChange }: FilterBarProps) {
  return (
    <div
      role="tablist"
      aria-label="Filter transactions by status"
      className="flex items-stretch border-b border-gray-100 px-2"
    >
      {FILTER_TABS.map((tab) => {
        const isActive = tab.value === active;
        return (
          <button
            key={tab.value}
            role="tab"
            aria-selected={isActive}
            type="button"
            onClick={() => onChange(tab.value)}
            className={`
              relative px-5 py-4 text-sm font-semibold tracking-wide
              flex items-center gap-2
              transition-colors duration-150 focus-visible:outline-none
              ${isActive
                ? 'text-primary'
                : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
              }
            `}
          >
            {isActive && (
              <span
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-t-full"
                aria-hidden="true"
              />
            )}
            {tab.label}
            <span
              className={`
                tabular-nums px-2 py-0.5 rounded-full text-[11px] font-bold
                ${isActive ? 'bg-blue-50 text-primary' : 'bg-gray-100 text-gray-500'}
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
