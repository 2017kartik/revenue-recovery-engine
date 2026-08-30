import React from 'react';

export interface MetricCardProps {
  label: string;
  value: string | number;
  sublabel?: string;
  icon: React.ReactNode;
}

export function MetricCard({ label, value, sublabel, icon }: MetricCardProps) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col gap-3 transition-shadow hover:shadow-md">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold tracking-wider uppercase text-gray-500">{label}</span>
        <div className="p-2 bg-gray-50 rounded-xl text-gray-400">
          {icon}
        </div>
      </div>
      <div className="flex flex-col gap-1 mt-2">
        <span className="text-4xl font-black text-navy tracking-tight">{value}</span>
        {sublabel && (
          <span className="text-sm font-medium text-gray-400">{sublabel}</span>
        )}
      </div>
    </div>
  );
}
