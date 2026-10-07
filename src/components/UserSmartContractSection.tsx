import React, { useState } from 'react';
import {
  Code2,
  Copy,
  CheckCircle2,
  ShieldCheck,
  ExternalLink,
  Layers,
  ArrowRight,
  Sparkles,
  Search,
  Wallet,
  AlertTriangle,
  QrCode,
  Lock,
} from 'lucide-react';
import { UserContractAddressRecord, PublicWalletRecord } from '../types/flyx.ts';

interface UserSmartContractSectionProps {
  userContracts: UserContractAddressRecord[];
  publicWallets: PublicWalletRecord[];
  theme: 'dark' | 'light';
  onViewExplorer?: (txRefOrWallet?: string) => void;
  onCopyText: (text: string, label: string) => void;
  copiedLabel: string | null;
}

export const UserSmartContractSection: React.FC<UserSmartContractSectionProps> = ({
  userContracts,
  publicWallets,
  theme,
  onViewExplorer,
  onCopyText,
  copiedLabel,
}) => {
  const isDark = theme === 'dark';

  const safeContracts = Array.isArray(userContracts) ? userContracts : [];
  const safeWallets = Array.isArray(publicWallets) ? publicWallets : [];

  // Selected or looked-up user
  const defaultUser = safeContracts[0] || null;
  const [selectedUserId, setSelectedUserId] = useState<string>(
    defaultUser ? defaultUser.user_id : 'USR-FLYX-8849'
  );
  const [searchInput, setSearchInput] = useState('');
  const [showQr, setShowQr] = useState(false);
  const [searchFeedback, setSearchFeedback] = useState<string | null>(null);

  // Find active record
  const currentContract =
    safeContracts.find(
      (c) =>
        c?.user_id?.toLowerCase() === selectedUserId.toLowerCase() ||
        c?.wallet_address?.toLowerCase() === selectedUserId.toLowerCase() ||
        c?.contract_address?.toLowerCase() === selectedUserId.toLowerCase()
    ) || defaultUser;

  // Matching wallet record if available
  const matchingWallet = currentContract
    ? safeWallets.find(
        (w) =>
          w?.account_identifier?.toLowerCase() === currentContract.user_id?.toLowerCase() ||
          w?.public_address?.toLowerCase() === currentContract.wallet_address?.toLowerCase()
      )
    : null;

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const query = searchInput.trim().toLowerCase();
    if (!query) return;

    const found = safeContracts.find(
      (c) =>
        c?.user_id?.toLowerCase() === query ||
        (c?.username && c.username.toLowerCase() === query) ||
        c?.wallet_address?.toLowerCase() === query ||
        c?.contract_address?.toLowerCase() === query
    );

    if (found) {
      setSelectedUserId(found.user_id);
      setSearchFeedback(null);
    } else {
      setSearchFeedback(`No assigned Smart Contract found for "${searchInput.trim()}". Showing nearest active user.`);
    }
  };

  if (!currentContract) {
    return null;
  }

  const isCopied = copiedLabel === `user-contract-${currentContract.user_id}`;

  return (
    <section id="smart-contract" className="relative z-10 scroll-mt-24 space-y-6">
      {/* Background Neon Accent Glow */}
      <div className="absolute -inset-1 rounded-3xl bg-gradient-to-r from-blue-600/10 via-cyan-500/10 to-amber-500/10 blur-xl -z-10" />

      {/* Main Container Card */}
      <div
        className={`relative rounded-3xl border p-6 sm:p-10 backdrop-blur-2xl transition-all duration-300 ${
          isDark
            ? 'bg-gradient-to-b from-[#0B1428]/95 via-[#080E1E]/95 to-[#050A14]/95 border-cyan-500/25 shadow-[0_16px_48px_rgba(0,0,0,0.55)]'
            : 'bg-white/95 border-slate-300 shadow-xl'
        }`}
      >
        {/* Header Badges & Section Title */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 border-b border-white/[0.08] pb-6">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold bg-cyan-500/15 border border-cyan-500/35 text-cyan-300">
                <Code2 className="w-3.5 h-3.5 text-cyan-400" />
                <span>USER SMART CONTRACT ADDRESS</span>
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-semibold bg-emerald-500/15 border border-emerald-500/35 text-emerald-300">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
                </span>
                <span>STATUS: {currentContract.status}</span>
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-mono bg-amber-500/15 border border-amber-500/30 text-amber-300">
                PERMANENT 1:1 BINDING
              </span>
            </div>

            <h2 className="font-display text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-white flex items-center gap-3">
              <span>Personal Smart Contract Address</span>
              <Sparkles className="w-6 h-6 text-amber-400 inline" />
            </h2>

            <p className="text-xs sm:text-sm text-slate-300 max-w-3xl leading-relaxed">
              Every verified FlyXCoin account receives a deterministic, unique Smart Contract Address
              permanently linked to their internal <code className="font-mono text-cyan-300">user_id</code>.
              This guarantees mathematical asset continuity between the current Pre-Mainnet MySQL ledger and
              the upcoming decentralized sovereign blockchain mainnet.
            </p>
          </div>

          {/* Quick User Selector Pills */}
          <div className="flex flex-col sm:items-end gap-2 shrink-0">
            <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">
              Inspect Verified User Accounts:
            </span>
            <div className="flex flex-wrap items-center gap-1.5">
              {userContracts.map((c) => (
                <button
                  key={c.user_id}
                  type="button"
                  onClick={() => {
                    setSelectedUserId(c.user_id);
                    setSearchFeedback(null);
                  }}
                  className={`px-2.5 py-1 rounded-lg text-xs font-mono transition-all border ${
                    selectedUserId.toLowerCase() === c.user_id.toLowerCase()
                      ? 'border-cyan-400 bg-cyan-500/20 text-cyan-300 shadow-[0_0_12px_rgba(6,182,212,0.3)]'
                      : 'border-white/10 bg-white/[0.04] text-slate-400 hover:text-white hover:border-white/25'
                  }`}
                >
                  {c.user_id}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* User Search & Verification Filter Bar */}
        <div className="pt-6 pb-2">
          <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row gap-2.5">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search contract by User ID (USR-FLYX-8849), Wallet (FLYX-USER-...), or Contract (0x...)..."
                className="w-full pl-10 pr-4 py-2 rounded-xl text-xs sm:text-sm font-mono border bg-black/40 border-white/15 text-white focus:outline-none focus:border-cyan-400"
              />
            </div>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl text-xs sm:text-sm font-bold font-mono bg-cyan-500 text-black hover:bg-cyan-400 transition-colors shrink-0 shadow-md"
            >
              Verify Contract
            </button>
          </form>

          {searchFeedback && (
            <div className="mt-2 text-xs font-mono text-amber-300 flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
              <span>{searchFeedback}</span>
            </div>
          )}
        </div>

        {/* Contract Address Visual Display Box */}
        <div className="mt-6 p-5 sm:p-6 rounded-2xl bg-black/50 border border-cyan-500/30 backdrop-blur-md shadow-inner space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs font-mono">
            <div className="flex items-center gap-2">
              <span className="text-slate-400 uppercase tracking-wider font-semibold">
                Assigned Smart Contract Address (EVM Sovereign Anchor)
              </span>
              <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px]">
                {currentContract.is_primary ? 'PRIMARY CANONICAL' : 'SECONDARY'}
              </span>
            </div>
            <span className="text-cyan-400 font-bold">Standard: ERC-20 Compatible</span>
          </div>

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pt-1">
            <code className="font-mono text-sm sm:text-base lg:text-lg font-black text-amber-300 tracking-wider break-all select-all">
              {currentContract.contract_address}
            </code>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() =>
                  onCopyText(currentContract.contract_address, `user-contract-${currentContract.user_id}`)
                }
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold font-mono transition-all duration-200 border border-amber-400/50 bg-amber-400/15 text-amber-300 hover:bg-amber-400 hover:text-black hover:shadow-[0_0_20px_rgba(245,158,11,0.4)]"
              >
                {isCopied ? (
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
                className="p-2.5 rounded-xl text-xs font-bold border border-white/10 bg-white/5 text-slate-300 hover:text-white hover:border-white/30 transition-colors"
                title="Toggle QR Code"
              >
                <QrCode className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* QR Code expansion */}
          {showQr && (
            <div className="mt-4 pt-4 border-t border-white/10 flex flex-col sm:flex-row items-center gap-4 bg-black/60 p-4 rounded-xl">
              <div className="w-32 h-32 bg-white p-2 rounded-lg flex items-center justify-center shrink-0">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${currentContract.contract_address}`}
                  alt="User Contract QR Code"
                  className="w-full h-full object-contain"
                />
              </div>
              <div className="space-y-1 text-xs font-mono text-slate-300">
                <div className="font-bold text-white">Smart Contract QR Code</div>
                <p className="text-[11px] text-slate-400">
                  Scan to verify recipient address in compatible Web3 mobile wallets or explorer interfaces.
                </p>
                <div className="text-[10px] text-amber-400 break-all">{currentContract.contract_address}</div>
              </div>
            </div>
          )}
        </div>

        {/* 5-Column Contract Metadata Matrix */}
        <div className="mt-6 grid grid-cols-2 sm:grid-cols-5 gap-3.5">
          <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/[0.08]">
            <div className="text-[10px] font-mono text-slate-400 uppercase">Contract Network</div>
            <div className="text-xs sm:text-sm font-bold text-white mt-1 truncate" title={currentContract.network}>
              {currentContract.network}
            </div>
            <div className="text-[10px] font-mono text-cyan-400 mt-0.5">Pre-Mainnet EVM</div>
          </div>

          <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/[0.08]">
            <div className="text-[10px] font-mono text-slate-400 uppercase">Token & Decimals</div>
            <div className="text-xs sm:text-sm font-bold text-amber-400 mt-1">
              {currentContract.token_symbol} (8 Decimals)
            </div>
            <div className="text-[10px] font-mono text-slate-400 mt-0.5">DECIMAL(36,8)</div>
          </div>

          <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/[0.08]">
            <div className="text-[10px] font-mono text-slate-400 uppercase">Internal User ID</div>
            <div className="text-xs sm:text-sm font-bold font-mono text-cyan-300 mt-1 truncate">
              {currentContract.user_id}
            </div>
            <div className="text-[10px] font-mono text-slate-400 mt-0.5">Permanent Anchor</div>
          </div>

          <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/[0.08]">
            <div className="text-[10px] font-mono text-slate-400 uppercase">Off-Chain Wallet ID</div>
            <div
              className="text-xs sm:text-sm font-bold font-mono text-slate-200 mt-1 truncate"
              title={currentContract.wallet_address}
            >
              {currentContract.wallet_address.slice(0, 10)}...{currentContract.wallet_address.slice(-4)}
            </div>
            <div className="text-[10px] font-mono text-emerald-400 mt-0.5">Internal FlyX Wallet</div>
          </div>

          <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/[0.08]">
            <div className="text-[10px] font-mono text-slate-400 uppercase">Verification State</div>
            <div className="text-xs sm:text-sm font-bold text-emerald-400 mt-1 truncate">
              {currentContract.status === 'ACTIVE' ? 'Active · Verified' : currentContract.status}
            </div>
            <div className="text-[10px] font-mono text-emerald-300/80 mt-0.5">1:1 Non-Duplicate</div>
          </div>
        </div>

        {/* Dual Comparison & Security Guarantee Box */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-12 gap-5 items-stretch">
          {/* Left: Architecture Separation Explainer */}
          <div className="md:col-span-7 rounded-2xl p-5 bg-black/40 border border-white/10 space-y-3">
            <div className="flex items-center gap-2 text-xs font-mono font-bold text-cyan-400 uppercase">
              <Layers className="w-4 h-4" />
              <span>Strict Architectural Boundary: Off-Chain vs. Smart Contract</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              <strong>Off-Chain FlyX Wallet ID:</strong>{' '}
              <code className="text-cyan-300 font-mono text-[11px]">{currentContract.wallet_address}</code> is used for
              internal epoch mining calculations, game-rewards distribution, and instant zero-fee peer settlements inside FlyXCoin.com.
            </p>
            <p className="text-xs text-slate-300 leading-relaxed">
              <strong>Smart Contract Address:</strong>{' '}
              <code className="text-amber-300 font-mono text-[11px]">{currentContract.contract_address}</code> is the
              immutable Web3 sovereign anchor generated deterministically for the user on the FLYX Sovereign EVM network.
            </p>
          </div>

          {/* Right: Security Attestation & Zero-PII disclosure */}
          <div className="md:col-span-5 rounded-2xl p-5 bg-black/40 border border-white/10 space-y-3 flex flex-col justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs font-mono font-bold text-emerald-400 uppercase">
                <ShieldCheck className="w-4 h-4" />
                <span>Zero-Credential Exposure</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                <Lock className="w-3.5 h-3.5 inline mr-1 text-slate-500" />
                Private keys, seed phrases, passwords, and sensitive API secrets are never generated in plain text or
                exposed through public endpoints. Only public, cryptographically verifiable addresses are transmitted.
              </p>
            </div>

            <div className="pt-2 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  if (onViewExplorer) {
                    onViewExplorer(currentContract.transaction_ref || currentContract.wallet_address);
                  } else {
                    const el = document.getElementById('explorer');
                    if (el) el.scrollIntoView({ behavior: 'smooth' });
                  }
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold font-mono bg-gradient-to-r from-cyan-500 to-blue-600 text-white hover:from-cyan-400 hover:to-blue-500 transition-all shadow-md"
              >
                <span>VIEW ON EXPLORER</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>

              {matchingWallet && (
                <button
                  type="button"
                  onClick={() => {
                    const el = document.getElementById('wallets');
                    if (el) el.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold font-mono border border-white/20 bg-white/5 text-slate-200 hover:bg-white/10 transition-colors"
                >
                  <Wallet className="w-3.5 h-3.5 text-amber-400" />
                  <span>INSPECT WALLET</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
