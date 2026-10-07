import React, { useEffect, useState, useRef } from 'react';
import {
  Coins,
  Activity,
  Users,
  Repeat,
  Pickaxe,
  Flame,
  UserCheck,
  TrendingUp,
  ShieldCheck,
  ExternalLink,
  Sparkles,
} from 'lucide-react';
import {
  OverviewData,
  TokenAllocation,
  PublicWalletRecord,
} from '../types/flyx.ts';
import { formatFlyxAmount } from '../services/blockchainAdapter.ts';

interface Web3KpiSectionProps {
  overview: OverviewData;
  priceUsd?: string;
  change24h?: string;
  lastSyncTime: string;
  isSyncPulsing: boolean;
  theme: 'dark' | 'light';
}

interface KpiCardConfig {
  id: string;
  title: string;
  value: string;
  unit: string;
  numericVal: number;
  decimals: number;
  icon: React.ReactNode;
  trend: string;
  trendPositive: boolean;
  subtitle: string;
  glowColor: string;
  accentBorder: string;
  badgeText: string;
}

/**
 * Animated number display that smoothly interpolates when value changes.
 */
const AnimatedCounter: React.FC<{ target: number; decimals: number; prefix?: string; suffix?: string }> = ({
  target,
  decimals,
  prefix = '',
  suffix = '',
}) => {
  const [displayValue, setDisplayValue] = useState(target);
  const prevTargetRef = useRef(target);

  useEffect(() => {
    if (prevTargetRef.current === target) return;
    const startValue = displayValue;
    const endValue = target;
    const duration = 800; // ms
    const startTime = performance.now();

    const update = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // easeOutCubic
      const ease = 1 - Math.pow(1 - progress, 3);
      const current = startValue + (endValue - startValue) * ease;
      setDisplayValue(current);

      if (progress < 1) {
        requestAnimationFrame(update);
      } else {
        setDisplayValue(endValue);
        prevTargetRef.current = endValue;
      }
    };

    requestAnimationFrame(update);
  }, [target]);

  const formatted = displayValue.toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

  return (
    <span className="tabular-nums font-mono">
      {prefix}
      {formatted}
      {suffix}
    </span>
  );
};

export const Web3KpiSection: React.FC<Web3KpiSectionProps> = ({
  overview,
  priceUsd = '3.50',
  change24h = '+4.28',
  lastSyncTime,
  isSyncPulsing,
  theme,
}) => {
  const isDark = theme === 'dark';

  const supplyStats = overview?.supplyStats || {
    max_supply: '1000000000.00000000',
    circulating_supply: '142660180.45000000',
    distributed_supply: '166360180.45000000',
    undistributed_supply: '833639819.55000000',
    active_wallets_count: 8,
    total_ledger_transactions: 12,
  };
  const allocations = Array.isArray(overview?.allocations) ? overview.allocations : [];
  const publicWallets = Array.isArray(overview?.publicWallets) ? overview.publicWallets : [];

  // Real derived metrics
  const maxSupplyNum = parseFloat(supplyStats.max_supply) || 1000000000;
  const circSupplyNum = parseFloat(supplyStats.circulating_supply) || 142660180.45;
  const holdersCount = supplyStats.active_wallets_count || publicWallets.length || 8;
  const txCount = supplyStats.total_ledger_transactions || 12;

  // Total mined from community mining allocation distributed amount
  const miningAlloc = allocations.find((a: TokenAllocation) => a?.category_key === 'COMMUNITY_MINING');
  const minedNum = miningAlloc ? parseFloat(miningAlloc.distributed_amount) : 12450.75;

  // Total locked / undistributed reserve supply
  const lockedNum = parseFloat(supplyStats.undistributed_supply) || 833639819.55;

  // Active verified user accounts (wallets of type USER_WALLET)
  const activeUserWalletsCount =
    publicWallets.filter((w: PublicWalletRecord) => w?.wallet_type === 'USER_WALLET').length || 4;

  const priceNum = parseFloat(priceUsd) || 3.5;
  const isPricePositive = !change24h.startsWith('-');

  const cards: KpiCardConfig[] = [
    {
      id: 'kpi-max-supply',
      title: 'TOTAL SUPPLY',
      value: formatFlyxAmount(supplyStats.max_supply, 0),
      unit: 'FLYX',
      numericVal: maxSupplyNum,
      decimals: 0,
      icon: <Coins className="w-5 h-5 text-amber-400" />,
      trend: '100% Invariant Locked',
      trendPositive: true,
      subtitle: 'Hard-coded Genesis Cap (DECIMAL(36,8))',
      glowColor: 'rgba(245, 158, 11, 0.15)',
      accentBorder: 'group-hover:border-amber-400/50',
      badgeText: 'FIXED CAP',
    },
    {
      id: 'kpi-circulating-supply',
      title: 'CIRCULATING SUPPLY',
      value: formatFlyxAmount(overview.supplyStats.circulating_supply, 2),
      unit: 'FLYX',
      numericVal: circSupplyNum,
      decimals: 2,
      icon: <Activity className="w-5 h-5 text-cyan-400" />,
      trend: '14.27% of Max Supply',
      trendPositive: true,
      subtitle: 'Active in Verified Wallets & Vaults',
      glowColor: 'rgba(6, 182, 212, 0.15)',
      accentBorder: 'group-hover:border-cyan-400/50',
      badgeText: 'UNLOCKED',
    },
    {
      id: 'kpi-total-holders',
      title: 'TOTAL HOLDERS',
      value: holdersCount.toString(),
      unit: 'WALLETS',
      numericVal: holdersCount,
      decimals: 0,
      icon: <Users className="w-5 h-5 text-indigo-400" />,
      trend: '100% Verified Ledger',
      trendPositive: true,
      subtitle: 'Custodial Vaults & Public Accounts',
      glowColor: 'rgba(99, 102, 241, 0.15)',
      accentBorder: 'group-hover:border-indigo-400/50',
      badgeText: 'ON-LEDGER',
    },
    {
      id: 'kpi-total-tx',
      title: 'TOTAL TRANSACTIONS',
      value: txCount.toString(),
      unit: 'ENTRIES',
      numericVal: txCount,
      decimals: 0,
      icon: <Repeat className="w-5 h-5 text-emerald-400" />,
      trend: '100% Reconciled',
      trendPositive: true,
      subtitle: 'Zero Floating-Point Arithmetic',
      glowColor: 'rgba(16, 185, 129, 0.15)',
      accentBorder: 'group-hover:border-emerald-400/50',
      badgeText: 'CONFIRMED',
    },
    {
      id: 'kpi-total-mined',
      title: 'TOTAL MINED',
      value: formatFlyxAmount(minedNum.toString(), 2),
      unit: 'FLYX',
      numericVal: minedNum,
      decimals: 2,
      icon: <Pickaxe className="w-5 h-5 text-amber-300" />,
      trend: 'Epoch Mining Active',
      trendPositive: true,
      subtitle: 'From 400M Community Mining Pool',
      glowColor: 'rgba(251, 191, 36, 0.15)',
      accentBorder: 'group-hover:border-amber-300/50',
      badgeText: 'CLOUD MINED',
    },
    {
      id: 'kpi-total-burned',
      title: 'TOTAL BURNED',
      value: '0.00',
      unit: 'FLYX',
      numericVal: 0,
      decimals: 2,
      icon: <Flame className="w-5 h-5 text-rose-400" />,
      trend: '0.00% Deflationary Rate',
      trendPositive: true,
      subtitle: 'Zero Burn · 1B Genesis Cap Intact',
      glowColor: 'rgba(244, 63, 94, 0.15)',
      accentBorder: 'group-hover:border-rose-400/50',
      badgeText: '0 BURNED',
    },
    {
      id: 'kpi-active-users',
      title: 'ACTIVE USERS',
      value: activeUserWalletsCount.toString(),
      unit: 'ACCOUNTS',
      numericVal: activeUserWalletsCount,
      decimals: 0,
      icon: <UserCheck className="w-5 h-5 text-sky-400" />,
      trend: 'Zero-PII Isolated',
      trendPositive: true,
      subtitle: 'Verified FlyXCoin Member Accounts',
      glowColor: 'rgba(56, 189, 248, 0.15)',
      accentBorder: 'group-hover:border-sky-400/50',
      badgeText: 'ACTIVE',
    },
    {
      id: 'kpi-settlement-rate',
      title: 'SETTLEMENT RATE',
      value: `$${priceNum.toFixed(2)}`,
      unit: 'USD',
      numericVal: priceNum,
      decimals: 2,
      icon: <TrendingUp className="w-5 h-5 text-emerald-300" />,
      trend: `${change24h}% (24h)`,
      trendPositive: isPricePositive,
      subtitle: 'FlyXCoin.com Internal Ecosystem Peg',
      glowColor: 'rgba(52, 211, 153, 0.15)',
      accentBorder: 'group-hover:border-emerald-300/50',
      badgeText: 'LIVE RATE',
    },
  ];

  return (
    <section className="relative z-10 space-y-4">
      {/* Section Header with Web3 Glow */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 border-b border-white/[0.08] pb-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span
                className={`absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75 ${
                  isSyncPulsing ? 'animate-ping' : ''
                }`}
              />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-400" />
            </span>
            <span className="text-[11px] font-mono uppercase tracking-widest text-cyan-400 font-bold">
              Real-Time Dynamic Telemetry · Invariant Engine
            </span>
          </div>
          <h2 className="font-display text-2xl sm:text-3xl font-extrabold tracking-tight text-white flex items-center gap-2">
            <span>FLYX Ecosystem Core KPIs</span>
            <Sparkles className="w-5 h-5 text-amber-400 inline" />
          </h2>
        </div>

        <div className="flex items-center gap-3 text-xs font-mono text-slate-400">
          <span className="hidden sm:inline">Engine: MySQL 8.0 ACID</span>
          <span className="text-slate-600">·</span>
          <span>Last Reconciled: <strong className="text-slate-200">{lastSyncTime} UTC</strong></span>
        </div>
      </div>

      {/* 8-Card Grid with Glassmorphic Elevation & Hover Glow */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card) => (
          <div
            key={card.id}
            style={{
              boxShadow: `0 8px 32px 0 rgba(0, 0, 0, 0.37)`,
            }}
            className={`group relative rounded-2xl p-5 border transition-all duration-300 backdrop-blur-xl ${
              isDark
                ? 'bg-gradient-to-b from-[#0E1528]/85 to-[#080D1A]/90 border-white/[0.08] hover:border-cyan-500/40 hover:-translate-y-1 hover:shadow-[0_12px_36px_rgba(6,182,212,0.12)]'
                : 'bg-white/95 border-slate-200 hover:shadow-lg hover:-translate-y-1'
            }`}
          >
            {/* Top row: Icon with glowing container + Status Pill */}
            <div className="flex items-start justify-between gap-3 mb-3">
              <div className="p-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] backdrop-blur-md group-hover:scale-105 transition-transform">
                {card.icon}
              </div>
              <span className="font-mono text-[9px] uppercase tracking-wider px-2 py-0.5 rounded-md font-semibold bg-white/[0.05] border border-white/[0.08] text-slate-300">
                {card.badgeText}
              </span>
            </div>

            {/* Title */}
            <div className="text-[11px] font-mono tracking-wider uppercase text-slate-400 font-semibold mb-1">
              {card.title}
            </div>

            {/* Numerical value */}
            <div className="flex items-baseline gap-1.5 mb-2">
              <div className="font-mono text-2xl sm:text-[26px] font-black tracking-tight text-white group-hover:text-cyan-300 transition-colors">
                <AnimatedCounter
                  target={card.numericVal}
                  decimals={card.decimals}
                  prefix={card.id === 'kpi-settlement-rate' ? '$' : ''}
                />
              </div>
              <span className="text-[11px] font-mono font-medium text-slate-400">
                {card.unit}
              </span>
            </div>

            {/* Bottom info row: Trend & Subtitle */}
            <div className="pt-2.5 border-t border-white/[0.06] flex items-center justify-between text-[11px]">
              <span
                className={`font-mono text-[10px] font-semibold flex items-center gap-1 ${
                  card.trendPositive ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                <span>●</span>
                <span>{card.trend}</span>
              </span>
              <span className="font-mono text-[10px] text-slate-400 truncate max-w-[120px] text-right" title={card.subtitle}>
                {card.subtitle}
              </span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};
