import React, { useMemo } from 'react';
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { ShieldCheck } from 'lucide-react';
import { LedgerTransaction } from '../types/flyx.ts';
import {
  decimalToUnits,
  formatFlyxAmount,
  unitsToDecimal,
} from '../services/blockchainAdapter.ts';

interface AuditSummaryWidgetProps {
  transactions: LedgerTransaction[];
  highValueThresholdUnits: bigint;
  highlightEnabled?: boolean;
  theme: 'dark' | 'light';
}

interface AuditSliceData {
  key: 'high_value' | 'standard';
  name: string;
  shortLabel: string;
  count: number;
  percentage: string;
  exactVolumeDecimal: string;
  color: string;
}

export const AuditSummaryWidget: React.FC<AuditSummaryWidgetProps> = ({
  transactions,
  highValueThresholdUnits,
  highlightEnabled = true,
  theme,
}) => {
  const isDark = theme === 'dark';

  const summary = useMemo(() => {
    let highValueCount = 0;
    let standardCount = 0;
    let highValueUnits = 0n;
    let standardUnits = 0n;

    for (const tx of transactions) {
      const units = decimalToUnits(tx.amount);
      if (units >= highValueThresholdUnits) {
        highValueCount += 1;
        highValueUnits += units;
      } else {
        standardCount += 1;
        standardUnits += units;
      }
    }

    const totalCount = highValueCount + standardCount;
    const highPct =
      totalCount > 0 ? ((highValueCount / totalCount) * 100).toFixed(1) : '0.0';
    const stdPct =
      totalCount > 0 ? ((standardCount / totalCount) * 100).toFixed(1) : '0.0';

    const slices: AuditSliceData[] = [
      {
        key: 'high_value',
        name: 'High-Value Audit (≥ 10k FLYX)',
        shortLabel: 'High-Value',
        count: highValueCount,
        percentage: highPct,
        exactVolumeDecimal: unitsToDecimal(highValueUnits),
        color: '#D4AF37',
      },
      {
        key: 'standard',
        name: 'Standard Ledger (< 10k FLYX)',
        shortLabel: 'Standard',
        count: standardCount,
        percentage: stdPct,
        exactVolumeDecimal: unitsToDecimal(standardUnits),
        color: '#1D63FF',
      },
    ];

    return {
      totalCount,
      highValueCount,
      standardCount,
      highPct,
      stdPct,
      slices,
    };
  }, [transactions, highValueThresholdUnits]);

  const chartData =
    summary.totalCount > 0
      ? summary.slices
      : [
          {
            key: 'empty',
            name: 'No Matching Records',
            shortLabel: 'Empty',
            count: 1,
            percentage: '0.0',
            exactVolumeDecimal: '0.00000000',
            color: isDark ? '#1E293B' : '#E2E8F0',
          },
        ];

  return (
    <div
      className={`h-full p-5 rounded-2xl border flex flex-col justify-between space-y-4 transition-colors ${
        isDark
          ? 'bg-[#0E1424] border-slate-800 text-[#F8FAFC] shadow-lg'
          : 'bg-white border-neutral-200 text-[#0B162C] shadow-sm'
      }`}
    >
      <div className="space-y-0.5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-[#FFB800]">
            <ShieldCheck className="w-4 h-4" />
            <span>Audit Summary · High-Value vs. Standard</span>
          </div>
          <span className="font-mono text-[11px] text-[#9CA3AF]">
            {summary.totalCount} total
          </span>
        </div>
        <p className="text-xs text-[#9CA3AF]">
          Threshold breakdown (≥ 10,000 FLYX) for current search results
        </p>
      </div>

      {/* Small Clearly Labeled Pie Chart + Center Telemetry */}
      <div className="grid grid-cols-1 sm:grid-cols-12 items-center gap-4">
        <div className="sm:col-span-5 relative h-40 w-full flex items-center justify-center">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                dataKey="count"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={40}
                outerRadius={62}
                paddingAngle={summary.highValueCount > 0 && summary.standardCount > 0 ? 3 : 0}
                stroke={isDark ? '#10131C' : '#FFFFFF'}
                strokeWidth={2}
              >
                {chartData.map((entry) => (
                  <Cell key={entry.key} fill={entry.color} />
                ))}
              </Pie>
              {summary.totalCount > 0 && (
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload || !payload.length) return null;
                    const slice = payload[0].payload as AuditSliceData;
                    return (
                      <div
                        className={`p-2.5 rounded-lg border shadow-xl text-xs space-y-1 font-mono ${
                          isDark
                            ? 'bg-[#0B162C]/95 border-[#D4AF37]/50 text-white'
                            : 'bg-white border-neutral-300 text-neutral-900'
                        }`}
                      >
                        <div className="font-bold text-[#FFB800]">{slice.name}</div>
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-[#9CA3AF]">Count:</span>
                          <span className="font-semibold tabular-nums">
                            {slice.count} ({slice.percentage}%)
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-[#9CA3AF]">Volume:</span>
                          <span className="tabular-nums">
                            {formatFlyxAmount(slice.exactVolumeDecimal, 2)} FLYX
                          </span>
                        </div>
                      </div>
                    );
                  }}
                />
              )}
            </PieChart>
          </ResponsiveContainer>

          {/* Center Donut Label */}
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
            <span className="font-mono text-base font-bold tabular-nums text-[#D4AF37]">
              {summary.highPct}%
            </span>
            <span className="text-[10px] text-[#9CA3AF] leading-tight">
              High-Value
            </span>
          </div>
        </div>

        {/* Clearly Labeled Breakdown Legend */}
        <div className="sm:col-span-7 space-y-2.5">
          {summary.slices.map((slice) => (
            <div
              key={slice.key}
              className={`p-2.5 rounded-lg border ${
                slice.key === 'high_value'
                  ? isDark
                    ? 'border-[#D4AF37]/40 bg-[#D4AF37]/[0.06]'
                    : 'border-[#D4AF37]/50 bg-[#FFFBEB]'
                  : isDark
                  ? 'border-white/10 bg-black/25'
                  : 'border-neutral-200 bg-neutral-50'
              }`}
            >
              <div className="flex items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2 font-semibold">
                  <span
                    className="w-2.5 h-2.5 rounded-sm shrink-0"
                    style={{ backgroundColor: slice.color }}
                  />
                  <span>{slice.name}</span>
                </div>
                <span className="font-mono font-bold tabular-nums">
                  {slice.count}{' '}
                  <span className="text-[10px] font-normal text-[#9CA3AF]">
                    ({slice.percentage}%)
                  </span>
                </span>
              </div>
              <div className="mt-1 flex items-center justify-between text-[11px] font-mono text-[#9CA3AF]">
                <span>Volume:</span>
                <span className={`tabular-nums ${isDark ? 'text-[#F8FAFC]' : 'text-[#0B162C]'}`}>
                  {formatFlyxAmount(slice.exactVolumeDecimal, 2)} FLYX
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="pt-2 border-t border-white/10 flex items-center justify-between text-[11px] font-mono text-[#9CA3AF]">
        <span>Audit Threshold: &gt; 10,000.00000000 FLYX</span>
        <span className={highlightEnabled ? 'text-[#D4AF37]' : 'text-[#9CA3AF]'}>
          {highlightEnabled ? 'Gold Border Highlight Active' : 'Gold Border Highlight Off'}
        </span>
      </div>
    </div>
  );
};
