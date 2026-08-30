import React from 'react';
import type { RecoveryStatus } from '@/types/recovery';

export const STATUS_CONFIG: Record<
  RecoveryStatus,
  { label: string; bg: string; text: string; dot: string; hover: string }
> = {
  pending: {
    label: 'Failed',
    bg: 'bg-red-50',
    text: 'text-red-700',
    dot: 'bg-red-500',
    hover: 'hover:bg-red-50',
  },
  processing: {
    label: 'Processing',
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    dot: 'bg-amber-400',
    hover: 'hover:bg-amber-50',
  },
  processed: {
    label: 'Recovered',
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    dot: 'bg-emerald-500',
    hover: 'hover:bg-emerald-50/50 cursor-pointer',
  },
};

export function StatusBadge({ status }: { status: RecoveryStatus }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.pending;
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold tracking-wide uppercase ${cfg.bg} ${cfg.text}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}
