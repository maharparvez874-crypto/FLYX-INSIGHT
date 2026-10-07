import React, { useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { BarChart3 } from 'lucide-react';
import { LedgerTransaction } from '../types/flyx.ts';
import {
  decimalToUnits,
  formatFlyxAmount,
  unitsToDecimal,
} from '../services/blockchainAdapter.ts';

interface TransactionVolumeChartProps {
  transactions: LedgerTransaction[];
  theme: 'dark' | 'light';
}

interface DailyVolumeBucket {
  dateKey: string; // YYYY-MM-DD
  shortLabel: string; // Oct 05
  txCount: number;
  exactVolumeDecimal: string; // Exact DECIMAL(36,8) computed via BigInt
  volumeNumber: number; // Used strictly by Recharts Y-axis geometry
}

export const TransactionVolumeChart: React.FC<TransactionVolumeChartProps> = ({
  transactions,
  theme,
}) => {
  const [metricMode, setMetricMode] = useState<'volume' | 'count'>('volume');
  const isDark = theme === 'dark';

  const dailyData = useMemo<DailyVolumeBucket[]>(() => {
    // Anchor the 30-day window to the latest transaction timestamp or current date (2026-10-05)
    let anchorTime = new Date('2026-10-05T23:59:59Z').getTime();
    const txList = Array.isArray(transactions) ? transactions : [];
    if (txList.length > 0) {
      let maxTxTime = 0;
      for (const tx of txList) {
        if (!tx || !tx.created_at) continue;
        const t = new Date(tx.created_at).getTime();
        if (!Number.isNaN(t) && t > maxTxTime) {
          maxTxTime = t;
        }
      }
      if (maxTxTime > 0) {
        anchorTime = maxTxTime;
      }
    }

    const bucketMap = new Map<
      string,
      { units: bigint; count: number; shortLabel: string }
    >();

    const monthNames = [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec',
    ];

    // Generate 30 consecutive daily buckets leading up to anchorTime
    for (let i = 29; i >= 0; i--) {
      const d = new Date(anchorTime - i * 86_400_000);
      const yyyy = d.getUTCFullYear();
      const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
      const dd = String(d.getUTCDate()).padStart(2, '0');
      const dateKey = `${yyyy}-${mm}-${dd}`;
      const shortLabel = `${monthNames[d.getUTCMonth()]} ${dd}`;
      bucketMap.set(dateKey, { units: 0n, count: 0, shortLabel });
    }

    // Aggregate currently filtered transactions using exact BigInt DECIMAL(36,8) base units
    for (const tx of transactions) {
      const dateKey = tx.created_at.slice(0, 10);
      const bucket = bucketMap.get(dateKey);
      if (bucket) {
        bucket.units += decimalToUnits(tx.amount);
        bucket.count += 1;
      }
    }

    const result: DailyVolumeBucket[] = [];
    for (const [dateKey, val] of bucketMap.entries()) {
      const exactDecimal = unitsToDecimal(val.units);
      const wholeFlyx = Number(val.units / 100_000_000n);
      const fracFlyx = Number(val.units % 100_000_000n) / 100_000_000;
      result.push({
        dateKey,
        shortLabel: val.shortLabel,
        txCount: val.count,
        exactVolumeDecimal: exactDecimal,
        volumeNumber: wholeFlyx + fracFlyx,
      });
    }

    return result;
  }, [transactions]);

  const activeDaysCount = useMemo(
    () => dailyData.filter((d) => d.txCount > 0).length,
    [dailyData]
  );

  const formatYAxis = (val: number) => {
    if (metricMode === 'count') return String(Math.round(val));
    if (val >= 1_000_000) return `${(val / 1_000_000).toFixed(1)}M`;
    if (val >= 1_000) return `${(val / 1_000).toFixed(0)}K`;
    return String(Math.round(val));
  };

  return (
    <div
      className={`p-5 rounded-2xl border space-y-4 transition-colors ${
        isDark
          ? 'bg-[#0E1424] border-slate-800 text-[#F8FAFC] shadow-lg'
          : 'bg-white border-neutral-200 text-[#0B162C] shadow-sm'
      }`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2 text-xs font-semibold text-[#FFB800]">
            <BarChart3 className="w-4 h-4" />
            <span>30-Day Off-Chain Ledger Volume & Activity Distribution</span>
          </div>
          <p className="text-xs text-[#9CA3AF]">
            Dynamically reflects the currently filtered search results across the last 30 days (
            <span className="font-mono text-[#F8FAFC]">{activeDaysCount}</span> active settlement
            days in view)
          </p>
        </div>

        {/* Toggle between Volume (FLYX) and Transaction Count */}
        <div className="flex items-center gap-1 p-1 rounded-lg bg-black/30 border border-white/10 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setMetricMode('volume')}
            className={`px-3 py-1 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
              metricMode === 'volume'
                ? 'bg-[#FFB800] text-[#081021] font-bold'
                : 'text-[#9CA3AF] hover:text-white'
            }`}
          >
            FLYX Volume
          </button>
          <button
            type="button"
            onClick={() => setMetricMode('count')}
            className={`px-3 py-1 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
              metricMode === 'count'
                ? 'bg-[#1D63FF] text-white font-bold'
                : 'text-[#9CA3AF] hover:text-white'
            }`}
          >
            Tx Count
          </button>
        </div>
      </div>

      <div className="w-full h-56 sm:h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={dailyData}
            margin={{ top: 10, right: 12, left: 0, bottom: 4 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              vertical={false}
              stroke={isDark ? 'rgba(255,255,255,0.07)' : 'rgba(15,23,42,0.08)'}
            />
            <XAxis
              dataKey="shortLabel"
              tick={{ fill: '#9CA3AF', fontSize: 11, fontFamily: 'JetBrains Mono, monospace' }}
              tickLine={false}
              axisLine={{ stroke: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(15,23,42,0.15)' }}
              interval={4}
            />
            <YAxis
              tickFormatter={formatYAxis}
              allowDecimals={false}
              tick={{ fill: '#9CA3AF', fontSize: 11, fontFamily: 'JetBrains Mono, monospace' }}
              tickLine={false}
              axisLine={false}
              width={48}
            />
            <Tooltip
              cursor={{
                fill: isDark ? 'rgba(255, 184, 0, 0.08)' : 'rgba(29, 99, 255, 0.06)',
              }}
              content={({ active, payload }) => {
                if (!active || !payload || !payload.length) return null;
                const item = payload[0].payload as DailyVolumeBucket;
                return (
                  <div
                    className={`p-3 rounded-lg border shadow-xl text-xs space-y-1.5 font-mono ${
                      isDark
                        ? 'bg-[#0B162C]/95 border-[#FFB800]/40 text-white'
                        : 'bg-white border-neutral-300 text-neutral-900'
                    }`}
                  >
                    <div className="font-bold text-[#FFB800] border-b border-white/10 pb-1">
                      {item.dateKey} (UTC)
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-[#9CA3AF]">Volume:</span>
                      <span className="font-semibold tabular-nums">
                        {formatFlyxAmount(item.exactVolumeDecimal, 2)} FLYX
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-4 text-[10px] text-[#9CA3AF]">
                      <span>DECIMAL(36,8):</span>
                      <span className="tabular-nums">{item.exactVolumeDecimal}</span>
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-[#9CA3AF]">Transactions:</span>
                      <span className="text-emerald-400 font-semibold tabular-nums">
                        {item.txCount} {item.txCount === 1 ? 'entry' : 'entries'}
                      </span>
                    </div>
                  </div>
                );
              }}
            />
            <Bar
              dataKey={metricMode === 'volume' ? 'volumeNumber' : 'txCount'}
              radius={[4, 4, 0, 0]}
              maxBarSize={28}
            >
              {dailyData.map((entry) => (
                <Cell
                  key={entry.dateKey}
                  fill={
                    entry.txCount > 0
                      ? metricMode === 'volume'
                        ? '#FFB800'
                        : '#1D63FF'
                      : isDark
                      ? 'rgba(255,255,255,0.06)'
                      : 'rgba(15,23,42,0.06)'
                  }
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
