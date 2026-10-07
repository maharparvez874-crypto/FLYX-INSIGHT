import React, { useState } from 'react';
import {
  Pickaxe,
  Zap,
  Cpu,
  Server,
  Layers,
  Award,
  Users,
  ShieldCheck,
  ExternalLink,
  ChevronRight,
  TrendingUp,
  Clock,
  Sparkles,
  Database,
  ArrowUpRight,
} from 'lucide-react';
import { MiningPlan, MiningPointsStats, TokenInfo } from '../types/flyx.ts';
import { formatFlyxAmount } from '../services/blockchainAdapter.ts';

interface MiningPlansSectionProps {
  miningPlans: MiningPlan[];
  miningStats: MiningPointsStats;
  tokenInfo: TokenInfo;
  theme: 'dark' | 'light';
}

export const MiningPlansSection: React.FC<MiningPlansSectionProps> = ({
  miningPlans,
  miningStats,
  tokenInfo,
  theme,
}) => {
  const isDark = theme === 'dark';
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);

  const planIcons: Record<string, React.ReactNode> = {
    'PLAN-FLY-01': <Pickaxe className="w-5 h-5 text-amber-400" />,
    'PLAN-PRO-02': <Zap className="w-5 h-5 text-cyan-400" />,
    'PLAN-VAL-03': <Cpu className="w-5 h-5 text-indigo-400" />,
    'PLAN-ENT-04': <Server className="w-5 h-5 text-emerald-400" />,
  };

  return (
    <section id="mining" className="space-y-10 scroll-mt-24">
      {/* Section Header with Official Source Attribution */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-white/10 pb-5">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold bg-amber-500/10 border border-amber-500/30 text-amber-400">
              <Pickaxe className="w-3.5 h-3.5" />
              <span>OFFICIAL FLYXCOIN CLOUD MINING ENGINE</span>
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-semibold bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
              </span>
              <span>LIVE PRODUCTION DATA</span>
            </span>
          </div>

          <h2 className="font-display text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-white flex items-center gap-2.5">
            <span>Mining Engine, Points &amp; Active Plans</span>
            <Sparkles className="w-6 h-6 text-amber-400" />
          </h2>
          <p className="text-sm text-slate-300 max-w-2xl leading-relaxed">
            Direct real-time transparency feed connected to{' '}
            <a
              href={tokenInfo?.main_portal_url || 'https://flyxcoin.com'}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#FFB800] font-semibold underline underline-offset-4 hover:opacity-80"
            >
              FlyXCoin.com
            </a>
            . Inspect live mining difficulty, points accounting, network hashrate, and official active mining rigs.
          </p>
        </div>

        <div className="flex flex-col sm:items-end gap-1 font-mono text-xs text-slate-400">
          <div className="text-emerald-400 font-semibold flex items-center gap-1.5">
            <Database className="w-3.5 h-3.5" />
            <span>Source: FlyXCoin Production System</span>
          </div>
          <div>Precision: DECIMAL(36,8) · Zero PII Transmitted</div>
        </div>
      </div>

      {/* 4-Column Mining Points & Network Telemetry Grid */}
      <div
        className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 rounded-2xl border divide-y sm:divide-y-0 sm:divide-x ${
          isDark
            ? 'bg-[#0E1528]/80 border-slate-700/60 divide-slate-700/60 shadow-xl backdrop-blur-xl'
            : 'bg-white border-neutral-200 divide-neutral-200 shadow-sm'
        }`}
      >
        <div className="p-5 space-y-1.5">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Total Points Issued</span>
            <Award className="w-4 h-4 text-amber-400" />
          </div>
          <div className="font-mono text-xl sm:text-2xl font-bold tabular-nums text-amber-300">
            {miningStats.total_points_issued.toLocaleString()}{' '}
            <span className="text-xs font-normal text-slate-400">PTS</span>
          </div>
          <div className="font-mono text-[11px] text-slate-400">
            Active: {miningStats.points_earned_active.toLocaleString()} · Redeemed:{' '}
            {miningStats.points_used_redeemed.toLocaleString()}
          </div>
        </div>

        <div className="p-5 space-y-1.5">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Active Mining Users</span>
            <Users className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="font-mono text-xl sm:text-2xl font-bold tabular-nums text-cyan-300">
            {miningStats.active_mining_users.toLocaleString()}{' '}
            <span className="text-xs font-normal text-slate-400">MINERS</span>
          </div>
          <div className="font-mono text-[11px] text-emerald-400">
            {((miningStats.active_mining_users / miningStats.total_registered_users) * 100).toFixed(1)}% of{' '}
            {miningStats.total_registered_users.toLocaleString()} Total Users Active
          </div>
        </div>

        <div className="p-5 space-y-1.5">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Current Cloud Hashrate</span>
            <Zap className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="font-mono text-xl sm:text-2xl font-bold tabular-nums text-indigo-300">
            {miningStats.current_network_hashrate}
          </div>
          <div className="font-mono text-[11px] text-slate-400">
            Emission: {formatFlyxAmount(miningStats.average_daily_mining_emission, 2)} FLYX/day
          </div>
        </div>

        <div className="p-5 space-y-1.5">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Total Mined to Date</span>
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="font-mono text-xl sm:text-2xl font-bold tabular-nums text-emerald-300">
            {formatFlyxAmount(miningStats.total_mined_flyx, 2)}{' '}
            <span className="text-xs font-normal text-slate-400">FLYX</span>
          </div>
          <div className="font-mono text-[11px] text-slate-400 truncate">
            Exact: {miningStats.total_mined_flyx}
          </div>
        </div>
      </div>

      {/* Official Mining Plans Catalog */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-display text-xl font-bold text-white flex items-center gap-2">
              <span>Official FlyXCoin Mining Plans</span>
              <span className="font-mono text-xs px-2 py-0.5 rounded-full bg-cyan-500/15 border border-cyan-500/30 text-cyan-400 font-normal">
                {miningPlans.length} Plans Active
              </span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Authoritative parameters established in the FlyXCoin.com MySQL production ledger.
            </p>
          </div>

          <a
            href={tokenInfo.main_portal_url}
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border border-amber-400/30 bg-amber-400/10 text-amber-300 hover:bg-amber-400 hover:text-black transition-colors"
          >
            <span>Mine on FlyXCoin.com</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </a>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {miningPlans.map((plan) => {
            const isSelected = selectedPlanId === plan.plan_id;
            return (
              <div
                key={plan.plan_id}
                onClick={() => setSelectedPlanId(isSelected ? null : plan.plan_id)}
                className={`cursor-pointer rounded-2xl border p-5 transition-all duration-200 flex flex-col justify-between space-y-4 backdrop-blur-xl ${
                  isDark
                    ? isSelected
                      ? 'bg-[#121B35] border-amber-400 shadow-[0_0_25px_rgba(245,158,11,0.25)]'
                      : 'bg-gradient-to-b from-[#0F172C]/90 to-[#0A1020]/95 border-slate-700/60 hover:border-cyan-500/50 hover:-translate-y-1 hover:shadow-xl'
                    : 'bg-white border-neutral-200 shadow-sm hover:shadow-md'
                }`}
              >
                {/* Plan Header */}
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="p-2.5 rounded-xl bg-white/[0.05] border border-white/10 shrink-0">
                      {planIcons[plan.plan_id] || <Pickaxe className="w-5 h-5 text-amber-400" />}
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
                        {plan.status}
                      </span>
                      <span className="font-mono text-[9px] text-slate-400">
                        {plan.plan_id}
                      </span>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-display font-bold text-base text-white">
                      {plan.plan_name}
                    </h4>
                    <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">
                      {plan.user_eligibility}
                    </p>
                  </div>
                </div>

                {/* Key Spec Indicators */}
                <div className="space-y-2 pt-2 border-t border-white/10 text-xs font-mono">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Hashrate Speed:</span>
                    <span className="font-bold text-cyan-300">{plan.mining_speed}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Daily Emission:</span>
                    <span className="font-bold text-amber-300 tabular-nums">
                      {plan.mining_rate_flyx_day} FLYX
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Required Points:</span>
                    <span className="font-bold text-slate-200">{plan.required_points} PTS</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Cycle Duration:</span>
                    <span className="text-slate-300">{plan.duration_days} Days</span>
                  </div>
                  <div className="flex items-center justify-between pt-1 border-t border-white/5">
                    <span className="text-slate-400">Active Miners:</span>
                    <span className="text-emerald-400 font-semibold">{plan.active_users} Miners</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Total Generated:</span>
                    <span className="text-slate-200 tabular-nums">
                      {formatFlyxAmount(plan.total_rewards_generated, 2)} FLYX
                    </span>
                  </div>
                </div>

                {/* Reward Configuration Description */}
                <div className="p-2.5 rounded-xl bg-black/40 border border-white/5 text-[10px] text-slate-400 leading-relaxed font-sans">
                  <strong>Settlement Engine:</strong> {plan.reward_configuration}
                </div>

                <div className="pt-2">
                  <a
                    href={tokenInfo.main_portal_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-white/5 hover:bg-amber-400 hover:text-black border border-white/10 hover:border-amber-400 text-xs font-bold text-slate-200 transition-colors"
                  >
                    <span>Activate on FlyXCoin</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
