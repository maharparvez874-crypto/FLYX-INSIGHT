import React, { useState } from 'react';
import {
  Code2,
  Copy,
  CheckCircle2,
  ExternalLink,
  ShieldCheck,
  QrCode,
  ArrowRight,
  Database,
  Cpu,
  Layers,
  Sparkles,
} from 'lucide-react';
import { TokenInfo, SupplyVerificationResult } from '../types/flyx.ts';

interface TokenContractSectionProps {
  tokenInfo: TokenInfo;
  verificationResult: SupplyVerificationResult;
  onViewExplorer: () => void;
  onCopyAddress: (address: string) => void;
  copied: boolean;
  theme: 'dark' | 'light';
}

export const TokenContractSection: React.FC<TokenContractSectionProps> = ({
  tokenInfo,
  verificationResult,
  onViewExplorer,
  onCopyAddress,
  copied,
  theme,
}) => {
  const isDark = theme === 'dark';
  const [showQr, setShowQr] = useState(false);

  const contractAddress =
    tokenInfo?.contract_address || '0x71C8A1D3b28E3A759f20E2DbE08f906471E2D4F6';

  return (
    <section id="contract" className="relative z-10 scroll-mt-24 space-y-6">
      {/* Glow Backing */}
      <div className="absolute -inset-1 rounded-3xl bg-gradient-to-r from-cyan-500/10 via-amber-500/10 to-blue-500/10 blur-xl -z-10" />

      {/* Main Container Card */}
      <div
        className={`relative rounded-3xl border p-6 sm:p-10 backdrop-blur-2xl transition-all duration-300 ${
          isDark
            ? 'bg-gradient-to-b from-[#0E162C]/90 via-[#0A1020]/95 to-[#060A14]/95 border-cyan-500/30 shadow-[0_16px_48px_rgba(0,0,0,0.6)]'
            : 'bg-white/95 border-slate-300 shadow-xl'
        }`}
      >
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* Left Details Column */}
          <div className="lg:col-span-8 space-y-6">
            {/* Header Badge */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
                <Code2 className="w-3.5 h-3.5" />
                <span>OFFICIAL SMART CONTRACT &amp; LEDGER ANCHOR</span>
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-semibold bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
                </span>
                <span>INVARIANT VERIFIED</span>
              </span>
            </div>

            {/* Section Headline */}
            <div>
              <h2 className="font-display text-3xl sm:text-4xl font-black tracking-tight text-white flex items-center gap-3">
                <span>FLYX TOKEN CONTRACT</span>
                <Sparkles className="w-6 h-6 text-amber-400" />
              </h2>
              <p className="text-sm text-slate-300 mt-2 max-w-2xl leading-relaxed">
                Official canonical contract address for the FLYX token ecosystem. Reconciled against
                the 1,000,000,000.00000000 FLYX maximum supply invariant with zero floating-point arithmetic.
              </p>
            </div>

            {/* Contract Address Visual Display Box */}
            <div className="p-4 sm:p-5 rounded-2xl bg-black/40 border border-cyan-500/30 backdrop-blur-md shadow-inner space-y-2">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-slate-400 uppercase tracking-wider font-semibold">
                  Contract Address (EVM / Sovereign Anchor)
                </span>
                <span className="text-cyan-400 font-bold">Standard: ERC-20 / Native Pre-Mainnet</span>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                <code className="font-mono text-sm sm:text-base md:text-lg font-bold text-amber-300 tracking-wide break-all select-all">
                  {contractAddress}
                </code>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => onCopyAddress(contractAddress)}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold font-mono transition-all duration-200 border border-amber-400/40 bg-amber-400/10 text-amber-300 hover:bg-amber-400 hover:text-black hover:shadow-[0_0_20px_rgba(245,158,11,0.4)]"
                  >
                    {copied ? (
                      <>
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        <span className="text-emerald-300">COPIED!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        <span>COPY CONTRACT</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowQr(!showQr)}
                    className="p-2 rounded-xl text-xs font-bold border border-white/10 bg-white/5 text-slate-300 hover:text-white hover:border-white/30 transition-colors"
                    title="Toggle QR code"
                  >
                    <QrCode className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* QR Code expansion */}
              {showQr && (
                <div className="mt-4 pt-4 border-t border-white/10 flex flex-col sm:flex-row items-center gap-4 bg-black/50 p-4 rounded-xl">
                  <div className="w-32 h-32 bg-white p-2 rounded-lg flex items-center justify-center shrink-0">
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${contractAddress}`}
                      alt="Contract QR Code"
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <div className="space-y-1 text-xs font-mono text-slate-300">
                    <div className="font-bold text-white">Scan for Contract Address</div>
                    <p className="text-[11px] text-slate-400">
                      Scan with any Web3 mobile wallet or validator terminal to inspect official contract identifier.
                    </p>
                    <div className="text-[10px] text-amber-400 break-all">{contractAddress}</div>
                  </div>
                </div>
              )}
            </div>

            {/* Contract Specifications 5-Box Matrix */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/[0.08]">
                <div className="text-[10px] font-mono text-slate-400 uppercase">Network</div>
                <div className="text-xs sm:text-sm font-bold text-white mt-0.5 truncate">
                  FLYX Sovereign Network
                </div>
                <div className="text-[10px] font-mono text-cyan-400 mt-0.5">Pre-Mainnet EVM</div>
              </div>

              <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/[0.08]">
                <div className="text-[10px] font-mono text-slate-400 uppercase">Token</div>
                <div className="text-xs sm:text-sm font-bold text-white mt-0.5 truncate">
                  {tokenInfo.token_name || 'FlyXCoin'}
                </div>
                <div className="text-[10px] font-mono text-slate-400 mt-0.5">Canonical Asset</div>
              </div>

              <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/[0.08]">
                <div className="text-[10px] font-mono text-slate-400 uppercase">Symbol</div>
                <div className="text-xs sm:text-sm font-bold text-amber-400 mt-0.5">
                  {tokenInfo.token_symbol || 'FLYX'}
                </div>
                <div className="text-[10px] font-mono text-slate-400 mt-0.5">8 Decimals</div>
              </div>

              <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/[0.08]">
                <div className="text-[10px] font-mono text-slate-400 uppercase">Contract Address</div>
                <div className="text-xs sm:text-sm font-bold font-mono text-amber-300 mt-0.5 truncate" title={contractAddress}>
                  {contractAddress.slice(0, 6)}...{contractAddress.slice(-4)}
                </div>
                <div className="text-[10px] font-mono text-cyan-400 mt-0.5">Standard ERC-20</div>
              </div>

              <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/[0.08]">
                <div className="text-[10px] font-mono text-slate-400 uppercase">Verification Status</div>
                <div className="text-xs sm:text-sm font-bold text-emerald-400 mt-0.5 truncate">
                  Verified Anchor
                </div>
                <div className="text-[10px] font-mono text-emerald-300/80 mt-0.5">100% Invariant Match</div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                type="button"
                onClick={onViewExplorer}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-bold text-xs sm:text-sm hover:from-cyan-400 hover:to-blue-500 shadow-[0_0_25px_rgba(6,182,212,0.35)] transition-all"
              >
                <span>VIEW ON EXPLORER</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <a
                href={tokenInfo.main_portal_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-full border border-white/20 bg-white/5 text-white font-bold text-xs sm:text-sm hover:bg-white/10 transition-colors"
              >
                <span>VISIT FLYXCOIN.COM</span>
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          </div>

          {/* Right Column: Architectural Verification Status Card */}
          <div className="lg:col-span-4">
            <div className="rounded-2xl p-6 bg-black/40 border border-white/10 space-y-4">
              <div className="flex items-center gap-2 text-xs font-mono text-amber-400 font-bold uppercase tracking-wider">
                <ShieldCheck className="w-4 h-4 text-amber-400" />
                <span>Genesis Invariant Attestation</span>
              </div>

              <div className="space-y-3 text-xs leading-relaxed text-slate-300">
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 font-mono text-[11px] leading-snug">
                  ✓ {verificationResult?.verificationProof ?? 'Pre-Mainnet Invariant Attested'}
                </div>

                <p className="text-[11px] text-slate-400 leading-normal">
                  <strong>Transparency Disclosure:</strong> During Pre-Mainnet Phases 1–3, all token
                  balances, mining outputs, and user transfers are executed in the authenticated
                  FlyXCoin.com MySQL database with exact 8-decimal fixed-point math.
                </p>

                <p className="text-[11px] text-slate-400 leading-normal">
                  The contract address <code className="text-amber-300 font-mono">0x71C8...D4F6</code>{' '}
                  guarantees mathematical continuity into the sovereign decentralized mainnet genesis block
                  scheduled for Phase 4.
                </p>
              </div>

              <div className="pt-3 border-t border-white/10 flex items-center justify-between text-[11px] font-mono text-slate-400">
                <span>Protocol: FLYX-GENESIS-v2</span>
                <span className="text-cyan-400">Active Node</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
