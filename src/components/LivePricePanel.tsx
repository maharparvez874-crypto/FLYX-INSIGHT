import React, { useEffect, useMemo, useState } from 'react';
import {
  Calculator,
  DollarSign,
  ExternalLink,
  RefreshCw,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import {
  decimalToUnits,
  formatFlyxAmount,
  isValidDecimal8,
  unitsToDecimal,
} from '../services/blockchainAdapter.ts';
import { getPrice } from '../services/apiClient.ts';

export interface LivePriceData {
  symbol: string;
  currency: string;
  price_usd: string; // DECIMAL(36,8)
  change_24h_percent: string;
  high_24h_usd: string;
  low_24h_usd: string;
  reference_volume_24h_flyx: string;
  source_portal: string;
  rate_type: string;
  updated_at: string;
}

interface LivePricePanelProps {
  mainPortalUrl: string;
  theme: 'dark' | 'light';
}

export const LivePricePanel: React.FC<LivePricePanelProps> = ({
  mainPortalUrl,
  theme,
}) => {
  const [priceData, setPriceData] = useState<LivePriceData>({
    symbol: 'FLYX',
    currency: 'USD',
    price_usd: '3.50000000',
    change_24h_percent: '+4.28',
    high_24h_usd: '3.54000000',
    low_24h_usd: '3.35000000',
    reference_volume_24h_flyx: '59950.75000000',
    source_portal: 'FlyXCoin.com Internal Dual-Fiat Wallet Settlement Feed',
    rate_type: 'OFF_CHAIN_INTERNAL_SETTLEMENT_RATE',
    updated_at: new Date().toISOString(),
  });
  const [fetching, setFetching] = useState<boolean>(false);
  const [calcFlyxInput, setCalcFlyxInput] = useState<string>('500580.00');

  const isDark = theme === 'dark';

  const fetchLivePrice = async () => {
    setFetching(true);
    try {
      const data = await getPrice();
      setPriceData(data);
    } catch {
      // Keep last known rate on transient error
    } finally {
      window.setTimeout(() => setFetching(false), 350);
    }
  };

  useEffect(() => {
    let isMounted = true;
    const loadPrice = async () => {
      try {
        const data = await getPrice();
        if (isMounted) setPriceData(data);
      } catch {
        // preserve
      }
    };
    loadPrice();
    const timer = window.setInterval(loadPrice, 15000);
    return () => {
      isMounted = false;
      window.clearInterval(timer);
    };
  }, []);

  const isPositiveChange = !priceData.change_24h_percent.trim().startsWith('-');

  // Exact BigInt DECIMAL(36,8) calculation for FLYX -> USD settlement valuation
  const calculatedUsdValuation = useMemo(() => {
    const cleanInput = calcFlyxInput.replace(/,/g, '').trim();
    if (!cleanInput || !isValidDecimal8(cleanInput)) {
      return '0.00000000';
    }
    try {
      const flyxUnits = decimalToUnits(cleanInput);
      const priceUnits = decimalToUnits(priceData.price_usd);
      // Both have 8 decimals (10^8), so product divided by 10^8 yields exact 8-decimal USD units
      const usdUnits = (flyxUnits * priceUnits) / 100_000_000n;
      return unitsToDecimal(usdUnits);
    } catch {
      return '0.00000000';
    }
  }, [calcFlyxInput, priceData.price_usd]);

  return (
    <div
      className={`rounded-2xl border overflow-hidden transition-colors ${
        isDark
          ? 'bg-[#0E1424] border-slate-800 text-[#F8FAFC] shadow-lg'
          : 'bg-white border-neutral-200 text-[#0B162C] shadow-sm'
      }`}
    >
      {/* Header Bar */}
      <div
        className={`px-5 py-3.5 border-b flex flex-wrap items-center justify-between gap-3 ${
          isDark
            ? 'bg-[#121B30]/90 border-slate-800'
            : 'bg-neutral-100 border-neutral-200'
        }`}
      >
        <div className="flex flex-wrap items-center gap-2">
          <DollarSign className="w-4 h-4 text-[#FFB800]" />
          <h2 className="text-xs sm:text-sm font-bold tracking-wide">
            FlyXCoin.com Live Internal Settlement Rate & Valuation Feed
          </h2>
          <span className="hidden md:inline text-xs text-[#9CA3AF]">·</span>
          <span className="hidden md:inline font-mono text-[11px] text-amber-400">
            Off-Chain Ecosystem Reference Rate (Pre-Mainnet)
          </span>
        </div>

        <div className="flex items-center gap-3">
          <a
            href={mainPortalUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs font-medium text-[#60A5FA] hover:underline"
          >
            <span>Source: FlyXCoin.com</span>
            <ExternalLink className="w-3 h-3" />
          </a>
          <button
            type="button"
            onClick={fetchLivePrice}
            disabled={fetching}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border border-[#FFB800]/40 text-[#FFB800] hover:bg-[#FFB800]/10 transition-colors whitespace-nowrap"
          >
            <RefreshCw className={`w-3 h-3 ${fetching ? 'animate-spin' : ''}`} />
            <span>{fetching ? 'Updating...' : 'Refresh Price'}</span>
          </button>
        </div>
      </div>

      {/* Main Content Grid */}
      <div
        className={`grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x ${
          isDark ? 'divide-white/10' : 'divide-neutral-200'
        }`}
      >
        {/* Left: Live FLYX Token Price & 24h Change */}
        <div className="lg:col-span-4 p-5 space-y-2">
          <div className="text-xs text-[#9CA3AF]">
            Last FLYX Ecosystem Settlement Rate
          </div>
          <div className="flex flex-wrap items-baseline gap-3">
            <span className="font-mono text-2xl sm:text-3xl font-extrabold tabular-nums text-[#FFB800]">
              ${formatFlyxAmount(priceData.price_usd, 2)}{' '}
              <span className="text-xs font-normal text-[#9CA3AF]">
                {priceData.currency}
              </span>
            </span>

            <span
              className={`inline-flex items-center gap-1 font-mono text-xs font-bold tabular-nums ${
                isPositiveChange ? 'text-emerald-400' : 'text-red-400'
              }`}
            >
              {isPositiveChange ? (
                <TrendingUp className="w-3.5 h-3.5" />
              ) : (
                <TrendingDown className="w-3.5 h-3.5" />
              )}
              <span>{priceData.change_24h_percent}% (24h)</span>
            </span>
          </div>
          <div className="font-mono text-[11px] text-[#6B7280] tabular-nums">
            Exact DECIMAL(36,8): ${priceData.price_usd} USD / 1 FLYX
          </div>
        </div>

        {/* Middle: 24h Range & Internal Settlement Volume */}
        <div className="lg:col-span-4 p-5 space-y-2.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-[#9CA3AF]">24h Internal Settlement Range</span>
            <span className="font-mono text-[11px] text-emerald-400">Active Feed</span>
          </div>

          <div className="space-y-1.5">
            <div className="w-full h-2 rounded-full bg-black/40 overflow-hidden p-0.5">
              <div className="h-full w-[78%] rounded-full bg-gradient-to-r from-[#1D63FF] to-[#FFB800]" />
            </div>
            <div className="flex items-center justify-between font-mono text-xs tabular-nums">
              <span className="text-[#9CA3AF]">
                Low: <strong className="text-[#F8FAFC]">${formatFlyxAmount(priceData.low_24h_usd, 2)}</strong>
              </span>
              <span className="text-[#9CA3AF]">
                High: <strong className="text-[#FFB800]">${formatFlyxAmount(priceData.high_24h_usd, 2)}</strong>
              </span>
            </div>
          </div>

          <div className="font-mono text-[11px] text-[#6B7280] tabular-nums">
            24h Internal Ledger Volume: {formatFlyxAmount(priceData.reference_volume_24h_flyx, 2)} FLYX
          </div>
        </div>

        {/* Right: Interactive FLYX <-> USD Dual-Fiat Wallet Calculator */}
        <div className="lg:col-span-4 p-5 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="inline-flex items-center gap-1.5 text-[#9CA3AF]">
              <Calculator className="w-3.5 h-3.5 text-[#FFB800]" />
              <span>Dual-Fiat Wallet Valuation Calculator</span>
            </span>
            <span className="font-mono text-[10px] text-[#9CA3AF]">BigInt Exact Math</span>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                value={calcFlyxInput}
                onChange={(e) => setCalcFlyxInput(e.target.value)}
                aria-label="FLYX balance to convert to USD"
                className={`w-full px-3 py-1.5 pr-12 rounded-lg text-xs font-mono border focus:outline-none focus:border-[#FFB800] ${
                  isDark
                    ? 'bg-black/40 border-white/15 text-white'
                    : 'bg-neutral-50 border-neutral-300 text-neutral-900'
                }`}
              />
              <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 font-mono text-[10px] text-[#FFB800] font-bold">
                FLYX
              </span>
            </div>
            <span className="font-mono text-xs text-[#9CA3AF]">=</span>
            <div className="px-3 py-1.5 rounded-lg bg-[#FFB800]/15 border border-[#FFB800]/30 font-mono text-xs font-bold text-[#FFB800] tabular-nums whitespace-nowrap">
              ${formatFlyxAmount(calculatedUsdValuation, 2)} USD
            </div>
          </div>

          <div className="text-[11px] text-[#6B7280]">
            Source: {priceData.source_portal}
          </div>
        </div>
      </div>
    </div>
  );
};
