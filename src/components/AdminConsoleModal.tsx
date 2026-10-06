import React, { useEffect, useState } from 'react';
import {
  CheckCircle2,
  Eye,
  EyeOff,
  Lock,
  LogOut,
  Plus,
  ShieldCheck,
  Trash2,
  X,
  Code2,
  Copy,
  Search,
  RefreshCw,
  KeyRound,
  AlertCircle,
  ShieldAlert,
} from 'lucide-react';
import {
  AnnouncementItem,
  LedgerTransaction,
  OverviewResponse,
  RoadmapPhase,
  TokenAllocation,
  TransactionType,
  UserContractAddressRecord,
  UserContractStatus,
  WhitepaperSection,
} from '../types/flyx.ts';
import { formatFlyxAmount } from '../services/blockchainAdapter.ts';

interface AdminConsoleModalProps {
  isOpen: boolean;
  onClose: () => void;
  overview: OverviewResponse;
  onOverviewUpdated: (updated: OverviewResponse) => void;
  theme: 'dark' | 'light';
}

interface AdminSessionState {
  sessionToken: string;
  csrfToken: string;
  username: string;
  role: string;
}

export const AdminConsoleModal: React.FC<AdminConsoleModalProps> = ({
  isOpen,
  onClose,
  overview,
  onOverviewUpdated,
  theme,
}) => {
  const [session, setSession] = useState<AdminSessionState | null>(null);
  const [username, setUsername] = useState('admin@flyxcoin.com');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<
    'allocations' | 'transactions' | 'user-contracts' | 'announcements' | 'roadmap' | 'whitepaper' | 'project'
  >('allocations');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Admin All Transactions (including hidden)
  const [adminTxs, setAdminTxs] = useState<LedgerTransaction[]>([]);

  // User Smart Contracts State
  const [userContractsList, setUserContractsList] = useState<UserContractAddressRecord[]>(
    overview.userContractAddresses || []
  );
  const [contractSearchQuery, setContractSearchQuery] = useState('');
  const [contractStatusFilter, setContractStatusFilter] = useState('ALL');
  const [contractNetworkFilter, setContractNetworkFilter] = useState('ALL');
  const [contractLoading, setContractLoading] = useState(false);
  const [copiedContractId, setCopiedContractId] = useState<string | null>(null);

  // New Contract Assignment Modal State
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assignUserId, setAssignUserId] = useState('');
  const [assignWalletAddr, setAssignWalletAddr] = useState('');
  const [assignContractAddr, setAssignContractAddr] = useState('');
  const [assignUsername, setAssignUsername] = useState('');
  const [assignEmail, setAssignEmail] = useState('');
  const [assignMobile, setAssignMobile] = useState('');
  const [assignNetwork, setAssignNetwork] = useState('FLYX Sovereign EVM (Pre-Mainnet)');
  const [assignStatus, setAssignStatus] = useState<UserContractStatus>('ACTIVE');
  const [assignNotes, setAssignNotes] = useState('');
  const [assignTxRef, setAssignTxRef] = useState('');

  // Allocation Editor State
  const [selectedAllocation, setSelectedAllocation] = useState<TokenAllocation | null>(
    overview.allocations[0] || null
  );
  const [allocAmount, setAllocAmount] = useState('');
  const [distAmount, setDistAmount] = useState('');
  const [lockupPolicy, setLockupPolicy] = useState('');
  const [releaseSchedule, setReleaseSchedule] = useState('');
  const [allocStatus, setAllocStatus] = useState<TokenAllocation['verification_status']>(
    'VERIFIED_OFF_CHAIN_RESERVE'
  );
  const [allocDesc, setAllocDesc] = useState('');

  // New Announcement State
  const [annTitle, setAnnTitle] = useState('');
  const [annCategory, setAnnCategory] =
    useState<AnnouncementItem['category']>('TRANSPARENCY_REPORT');
  const [annSummary, setAnnSummary] = useState('');
  const [annContent, setAnnContent] = useState('');
  const [annAuthor, setAnnAuthor] = useState('FLYX Foundation Transparency Board');
  const [annPinned, setAnnPinned] = useState(false);

  // Roadmap Editor State
  const [selectedPhase, setSelectedPhase] = useState<RoadmapPhase | null>(
    overview.roadmap[0] || null
  );
  const [phaseStatus, setPhaseStatus] = useState<RoadmapPhase['status']>('COMPLETED');
  const [phasePercent, setPhasePercent] = useState<number>(100);
  const [phaseWindow, setPhaseWindow] = useState('');
  const [phaseSummary, setPhaseSummary] = useState('');
  const [phaseNote, setPhaseNote] = useState('');

  // Whitepaper Editor State
  const [selectedWp, setSelectedWp] = useState<WhitepaperSection | null>(
    overview.whitepaper[0] || null
  );
  const [wpTitle, setWpTitle] = useState('');
  const [wpSubtitle, setWpSubtitle] = useState('');
  const [wpContent, setWpContent] = useState('');
  const [wpVersion, setWpVersion] = useState('');

  // New Off-Chain Transaction Entry State
  const [newTxType, setNewTxType] = useState<TransactionType>('MINING_DISTRIBUTION');
  const [newTxAmount, setNewTxAmount] = useState('5000.00000000');
  const [newTxSender, setNewTxSender] = useState('FLYX-VAULT-MINING-0001-CORE');
  const [newTxReceiver, setNewTxReceiver] = useState('FLYX-USER-8849-A91C-77E2');
  const [newTxUserRef, setNewTxUserRef] = useState('USR-FLYX-8849');
  const [newTxMemo, setNewTxMemo] = useState(
    'Verified FlyXCoin.com Off-Chain Epoch Settlement Entry'
  );

  // Project Info State
  const [tokenName, setTokenName] = useState(overview.tokenInfo.token_name);
  const [blockchainStatus, setBlockchainStatus] = useState(
    overview.tokenInfo.blockchain_status
  );
  const [mainPortalUrl, setMainPortalUrl] = useState(overview.tokenInfo.main_portal_url);

  useEffect(() => {
    if (selectedAllocation) {
      setAllocAmount(selectedAllocation.allocated_amount);
      setDistAmount(selectedAllocation.distributed_amount);
      setLockupPolicy(selectedAllocation.lockup_policy);
      setReleaseSchedule(selectedAllocation.release_schedule);
      setAllocStatus(selectedAllocation.verification_status);
      setAllocDesc(selectedAllocation.description);
    }
  }, [selectedAllocation]);

  useEffect(() => {
    if (selectedPhase) {
      setPhaseStatus(selectedPhase.status);
      setPhasePercent(selectedPhase.completion_percent);
      setPhaseWindow(selectedPhase.target_window);
      setPhaseSummary(selectedPhase.summary);
      setPhaseNote(selectedPhase.verification_note);
    }
  }, [selectedPhase]);

  useEffect(() => {
    if (selectedWp) {
      setWpTitle(selectedWp.title);
      setWpSubtitle(selectedWp.subtitle);
      setWpContent(selectedWp.content);
      setWpVersion(selectedWp.version);
    }
  }, [selectedWp]);

  useEffect(() => {
    if (session && activeTab === 'transactions') {
      fetch('/api/admin/transactions', {
        headers: { Authorization: `Bearer ${session.sessionToken}` },
      })
        .then((r) => r.json())
        .then((data) => {
          if (data.transactions) setAdminTxs(data.transactions);
        })
        .catch(() => {});
    }
  }, [session, activeTab, overview]);

  if (!isOpen) return null;

  const isDark = theme === 'dark';

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setAuthError(data.error || 'Authentication failed.');
        return;
      }
      setSession(data);
      setPassword('');
    } catch {
      setAuthError('Network error during server authentication.');
    }
  };

  const handleLogout = async () => {
    if (session) {
      await fetch('/api/admin/logout', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.sessionToken}`,
          'X-CSRF-Token': session.csrfToken,
        },
      });
    }
    setSession(null);
  };

  const handleSaveAllocation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session || !selectedAllocation) return;
    setStatusMessage(null);
    setErrorMessage(null);
    try {
      const res = await fetch(`/api/admin/allocations/${selectedAllocation.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.sessionToken}`,
          'X-CSRF-Token': session.csrfToken,
        },
        body: JSON.stringify({
          allocated_amount: allocAmount,
          distributed_amount: distAmount,
          lockup_policy: lockupPolicy,
          release_schedule: releaseSchedule,
          verification_status: allocStatus,
          description: allocDesc,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMessage(data.error || 'Failed to update allocation.');
        return;
      }
      onOverviewUpdated(data.overview);
      setSelectedAllocation(data.allocation);
      setStatusMessage(
        `Updated ${data.allocation.category_name} and recalculated DECIMAL(36,8) supply invariants.`
      );
    } catch {
      setErrorMessage('Request failed.');
    }
  };

  const handleCreateAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session) return;
    setStatusMessage(null);
    setErrorMessage(null);
    try {
      const res = await fetch('/api/admin/announcements', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.sessionToken}`,
          'X-CSRF-Token': session.csrfToken,
        },
        body: JSON.stringify({
          title: annTitle,
          category: annCategory,
          summary: annSummary,
          content: annContent,
          author: annAuthor,
          is_pinned: annPinned,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMessage(data.error || 'Failed to publish announcement.');
        return;
      }
      onOverviewUpdated(data.overview);
      setAnnTitle('');
      setAnnSummary('');
      setAnnContent('');
      setStatusMessage('Published official ecosystem announcement.');
    } catch {
      setErrorMessage('Failed to publish announcement.');
    }
  };

  const handleDeleteAnnouncement = async (id: string) => {
    if (!session) return;
    const res = await fetch(`/api/admin/announcements/${id}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${session.sessionToken}`,
        'X-CSRF-Token': session.csrfToken,
      },
    });
    const data = await res.json();
    if (res.ok && data.overview) {
      onOverviewUpdated(data.overview);
      setStatusMessage('Removed announcement.');
    }
  };

  const handleSaveRoadmap = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session || !selectedPhase) return;
    setStatusMessage(null);
    setErrorMessage(null);
    const res = await fetch(`/api/admin/roadmap/${selectedPhase.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.sessionToken}`,
        'X-CSRF-Token': session.csrfToken,
      },
      body: JSON.stringify({
        status: phaseStatus,
        completion_percent: phasePercent,
        target_window: phaseWindow,
        summary: phaseSummary,
        verification_note: phaseNote,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setErrorMessage(data.error || 'Failed to update roadmap phase.');
      return;
    }
    onOverviewUpdated(data.overview);
    setSelectedPhase(data.phase);
    setStatusMessage(`Updated ${data.phase.phase_code}: ${data.phase.title}.`);
  };

  const handleSaveWhitepaper = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session || !selectedWp) return;
    setStatusMessage(null);
    setErrorMessage(null);
    const res = await fetch(`/api/admin/whitepaper/${selectedWp.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.sessionToken}`,
        'X-CSRF-Token': session.csrfToken,
      },
      body: JSON.stringify({
        title: wpTitle,
        subtitle: wpSubtitle,
        content: wpContent,
        version: wpVersion,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setErrorMessage(data.error || 'Failed to update whitepaper section.');
      return;
    }
    onOverviewUpdated(data.overview);
    setSelectedWp(data.section);
    setStatusMessage(`Updated Whitepaper Section: ${data.section.title}.`);
  };

  const handleToggleTxVisibility = async (txId: string, nextPublic: boolean) => {
    if (!session) return;
    const res = await fetch(`/api/admin/transactions/${txId}/visibility`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.sessionToken}`,
        'X-CSRF-Token': session.csrfToken,
      },
      body: JSON.stringify({ is_public: nextPublic }),
    });
    const data = await res.json();
    if (res.ok && data.overview) {
      onOverviewUpdated(data.overview);
      setAdminTxs((prev) =>
        prev.map((t) => (t.tx_id === txId ? { ...t, is_public: nextPublic } : t))
      );
      setStatusMessage(
        `Transaction ${txId} visibility set to ${nextPublic ? 'PUBLIC' : 'HIDDEN'}.`
      );
    }
  };

  const handleCreateOffChainTx = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session) return;
    setStatusMessage(null);
    setErrorMessage(null);
    const res = await fetch('/api/admin/transactions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.sessionToken}`,
        'X-CSRF-Token': session.csrfToken,
      },
      body: JSON.stringify({
        tx_type: newTxType,
        amount: newTxAmount,
        sender_wallet: newTxSender,
        receiver_wallet: newTxReceiver,
        user_id_reference: newTxUserRef,
        memo: newTxMemo,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setErrorMessage(data.error || 'Failed to record off-chain transaction.');
      return;
    }
    onOverviewUpdated(data.overview);
    setAdminTxs((prev) => [data.transaction, ...prev]);
    setStatusMessage(`Recorded Off-Chain Internal Ledger entry ${data.transaction.tx_id}.`);
  };

  const handleSaveProjectInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session) return;
    setStatusMessage(null);
    setErrorMessage(null);
    const res = await fetch('/api/admin/token-info', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.sessionToken}`,
        'X-CSRF-Token': session.csrfToken,
      },
      body: JSON.stringify({
        token_name: tokenName,
        blockchain_status: blockchainStatus,
        main_portal_url: mainPortalUrl,
      }),
    });
    const data = await res.json();
    if (res.ok && data.overview) {
      onOverviewUpdated(data.overview);
      setStatusMessage('Updated FLYX Ecosystem & FlyXCoin.com bridge metadata.');
    }
  };

  // --- USER SMART CONTRACTS HANDLERS ---

  const fetchUserContracts = async (
    query = contractSearchQuery,
    status = contractStatusFilter,
    network = contractNetworkFilter
  ) => {
    if (!session) return;
    setContractLoading(true);
    try {
      const params = new URLSearchParams();
      if (query) params.append('q', query);
      if (status !== 'ALL') params.append('status', status);
      if (network !== 'ALL') params.append('network', network);

      const res = await fetch(`/api/admin/user-contracts?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${session.sessionToken}`,
        },
      });
      const data = await res.json();
      if (res.ok && Array.isArray(data.contracts)) {
        setUserContractsList(data.contracts);
      }
    } catch {
      // Keep existing list on transient failure
    } finally {
      setContractLoading(false);
    }
  };

  useEffect(() => {
    if (session && activeTab === 'user-contracts') {
      fetchUserContracts();
    }
  }, [session, activeTab, contractStatusFilter, contractNetworkFilter]);

  const handleSearchContractsSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchUserContracts(contractSearchQuery, contractStatusFilter, contractNetworkFilter);
  };

  const handleAssignContractSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session) return;
    setStatusMessage(null);
    setErrorMessage(null);
    try {
      const res = await fetch('/api/admin/user-contracts/assign', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.sessionToken}`,
          'X-CSRF-Token': session.csrfToken,
        },
        body: JSON.stringify({
          user_id: assignUserId,
          wallet_address: assignWalletAddr,
          contract_address: assignContractAddr || undefined,
          network: assignNetwork,
          status: assignStatus,
          username: assignUsername || undefined,
          email: assignEmail || undefined,
          mobile: assignMobile || undefined,
          notes: assignNotes || undefined,
          transaction_ref: assignTxRef || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMessage(data.error || 'Failed to assign user smart contract address.');
        return;
      }
      if (data.overview) onOverviewUpdated(data.overview);
      fetchUserContracts();
      setShowAssignModal(false);
      // Reset form
      setAssignUserId('');
      setAssignWalletAddr('');
      setAssignContractAddr('');
      setAssignUsername('');
      setAssignEmail('');
      setAssignMobile('');
      setAssignNotes('');
      setAssignTxRef('');
      setStatusMessage(
        `Smart contract ${data.contract.contract_address} permanently assigned to ${data.contract.user_id}.`
      );
    } catch {
      setErrorMessage('Network error while assigning user smart contract address.');
    }
  };

  const handleUpdateContractStatus = async (
    contract: UserContractAddressRecord,
    newStatus: UserContractStatus
  ) => {
    if (!session) return;
    setStatusMessage(null);
    setErrorMessage(null);
    try {
      const res = await fetch('/api/admin/user-contracts/status', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.sessionToken}`,
          'X-CSRF-Token': session.csrfToken,
        },
        body: JSON.stringify({
          id: contract.id,
          user_id: contract.user_id,
          status: newStatus,
          notes: `Status updated to ${newStatus} via Administrator Console`,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMessage(data.error || 'Failed to update contract status.');
        return;
      }
      if (data.overview) onOverviewUpdated(data.overview);
      fetchUserContracts();
      setStatusMessage(
        `Updated status for user ${contract.user_id} (${contract.contract_address}) to ${newStatus}.`
      );
    } catch {
      setErrorMessage('Network error while updating contract status.');
    }
  };

  const handleCopyContractAddress = (address: string, id: string) => {
    navigator.clipboard.writeText(address);
    setCopiedContractId(id);
    setTimeout(() => {
      setCopiedContractId((prev) => (prev === id ? null : prev));
    }, 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
      <div
        className={`relative w-full max-w-5xl max-h-[90vh] overflow-y-auto rounded-xl border ${
          isDark
            ? 'bg-[#0F1219] border-[#D4AF37]/30 text-[#F5F2EB]'
            : 'bg-white border-neutral-300 text-neutral-900'
        } shadow-2xl p-6`}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#D4AF37]/20">
          <div className="flex items-center gap-3">
            <ShieldCheck className="w-5 h-5 text-[#D4AF37]" />
            <div>
              <h2 className="font-display text-lg font-bold tracking-wide">
                FLYX Insight — Authorized Governance & Ledger Admin Console
              </h2>
              <p className="text-xs text-[#9CA3AF]">
                Server-Side RBAC · CSRF Token Enforced · Exact DECIMAL(36,8) Ledger Validation
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {session && (
              <button
                type="button"
                onClick={handleLogout}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-red-500/15 text-red-400 hover:bg-red-500/25 transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" />
                Sign Out ({session.username})
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-lg text-[#9CA3AF] hover:text-white hover:bg-white/10 transition-colors"
              aria-label="Close Admin Console"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {!session ? (
          /* Server-Side Admin Authentication Gate */
          <form onSubmit={handleLogin} className="max-w-md mx-auto py-10 space-y-5">
            <div className="flex items-center gap-2 text-sm font-semibold text-[#D4AF37]">
              <Lock className="w-4 h-4" />
              <span>Server-Authenticated Administrator Access</span>
            </div>
            <p className="text-xs text-[#9CA3AF] leading-relaxed">
              Enter your FLYX Foundation administrator credentials to manage token allocations,
              off-chain transaction visibility, whitepaper revisions, roadmap stages, and official
              announcements.
            </p>

            <div className="p-3 rounded-lg bg-[#D4AF37]/10 border border-[#D4AF37]/30 text-xs space-y-1">
              <div className="font-semibold text-[#D4AF37]">
                Preview Environment Evaluator Credentials:
              </div>
              <div className="font-mono">Username: admin@flyxcoin.com</div>
              <div className="font-mono">Password: flyx-admin-2026</div>
              <button
                type="button"
                onClick={() => {
                  setUsername('admin@flyxcoin.com');
                  setPassword('flyx-admin-2026');
                }}
                className="mt-1 underline text-[#D4AF37] hover:opacity-80"
              >
                Auto-fill Evaluator Credentials
              </button>
            </div>

            {authError && (
              <div className="p-3 rounded-lg bg-red-500/15 border border-red-500/30 text-xs text-red-400">
                {authError}
              </div>
            )}

            <div>
              <label className="block text-xs font-medium mb-1.5">Administrator Email</label>
              <input
                type="email"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-lg text-sm bg-black/30 border border-white/15 focus:border-[#D4AF37] focus:outline-none font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-medium mb-1.5">Administrator Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter server password..."
                className="w-full px-3.5 py-2.5 rounded-lg text-sm bg-black/30 border border-white/15 focus:border-[#D4AF37] focus:outline-none font-mono"
              />
            </div>

            <button
              type="submit"
              className="w-full py-2.5 px-4 rounded-lg bg-[#D4AF37] text-[#090A0F] font-semibold text-sm hover:bg-[#e3be42] transition-colors"
            >
              Authenticate & Issue CSRF Token
            </button>
          </form>
        ) : (
          /* Authenticated Admin Workspace */
          <div className="mt-5 space-y-5">
            {/* Navigation Tabs */}
            <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-lg bg-black/30 border border-white/10">
              {(
                [
                  ['allocations', 'Token Supply & Allocations'],
                  ['transactions', 'Ledger Transactions & Visibility'],
                  ['user-contracts', 'User Smart Contracts'],
                  ['announcements', 'Official Announcements'],
                  ['roadmap', 'Roadmap Phases'],
                  ['whitepaper', 'Whitepaper Sections'],
                  ['project', 'Ecosystem & Bridge Config'],
                ] as const
              ).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => {
                    setActiveTab(key);
                    setStatusMessage(null);
                    setErrorMessage(null);
                  }}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
                    activeTab === key
                      ? 'bg-[#D4AF37] text-[#090A0F] font-semibold'
                      : 'text-[#9CA3AF] hover:text-white'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {statusMessage && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-xs text-emerald-400">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{statusMessage}</span>
              </div>
            )}

            {errorMessage && (
              <div className="p-3 rounded-lg bg-red-500/15 border border-red-500/30 text-xs text-red-400">
                {errorMessage}
              </div>
            )}

            {/* TAB 1: ALLOCATIONS & SUPPLY */}
            {activeTab === 'allocations' && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <div className="text-xs font-semibold text-[#9CA3AF]">
                    Select Allocation Vault
                  </div>
                  {overview.allocations.map((alloc) => (
                    <button
                      key={alloc.id}
                      type="button"
                      onClick={() => setSelectedAllocation(alloc)}
                      className={`w-full text-left p-3 rounded-lg border transition-colors ${
                        selectedAllocation?.id === alloc.id
                          ? 'border-[#D4AF37] bg-[#D4AF37]/10'
                          : 'border-white/10 bg-black/20 hover:border-white/25'
                      }`}
                    >
                      <div className="flex items-center justify-between text-xs font-semibold">
                        <span>{alloc.category_name}</span>
                        <span className="font-mono text-[#D4AF37]">{alloc.percentage_share}%</span>
                      </div>
                      <div className="text-[11px] font-mono text-[#9CA3AF] mt-1">
                        Allocated: {formatFlyxAmount(alloc.allocated_amount, 2)} FLYX
                      </div>
                    </button>
                  ))}
                </div>

                {selectedAllocation && (
                  <form
                    onSubmit={handleSaveAllocation}
                    className="lg:col-span-2 space-y-4 p-4 rounded-lg border border-white/10 bg-black/20"
                  >
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-semibold">
                        Edit Pool: {selectedAllocation.category_name}
                      </h3>
                      <span className="text-xs font-mono text-[#9CA3AF]">
                        Vault: {selectedAllocation.custody_wallet_address}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs text-[#9CA3AF] mb-1">
                          Total Allocated Amount (DECIMAL(36,8))
                        </label>
                        <input
                          type="text"
                          value={allocAmount}
                          onChange={(e) => setAllocAmount(e.target.value)}
                          className="w-full px-3 py-2 rounded-lg text-xs font-mono bg-black/40 border border-white/15"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-[#9CA3AF] mb-1">
                          Distributed Amount (DECIMAL(36,8))
                        </label>
                        <input
                          type="text"
                          value={distAmount}
                          onChange={(e) => setDistAmount(e.target.value)}
                          className="w-full px-3 py-2 rounded-lg text-xs font-mono bg-black/40 border border-white/15"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs text-[#9CA3AF] mb-1">Lockup Policy</label>
                        <input
                          type="text"
                          value={lockupPolicy}
                          onChange={(e) => setLockupPolicy(e.target.value)}
                          className="w-full px-3 py-2 rounded-lg text-xs bg-black/40 border border-white/15"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-[#9CA3AF] mb-1">
                          Verification Status
                        </label>
                        <select
                          value={allocStatus}
                          onChange={(e) =>
                            setAllocStatus(
                              e.target.value as TokenAllocation['verification_status']
                            )
                          }
                          className="w-full px-3 py-2 rounded-lg text-xs bg-[#121621] border border-white/15"
                        >
                          <option value="ACTIVE_DISTRIBUTION">ACTIVE_DISTRIBUTION</option>
                          <option value="VERIFIED_OFF_CHAIN_RESERVE">
                            VERIFIED_OFF_CHAIN_RESERVE
                          </option>
                          <option value="LOCKED_VESTING">LOCKED_VESTING</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs text-[#9CA3AF] mb-1">Release Schedule</label>
                      <input
                        type="text"
                        value={releaseSchedule}
                        onChange={(e) => setReleaseSchedule(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg text-xs bg-black/40 border border-white/15"
                      />
                    </div>

                    <div>
                      <label className="block text-xs text-[#9CA3AF] mb-1">Description</label>
                      <textarea
                        rows={3}
                        value={allocDesc}
                        onChange={(e) => setAllocDesc(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg text-xs bg-black/40 border border-white/15"
                      />
                    </div>

                    <button
                      type="submit"
                      className="px-4 py-2 rounded-lg bg-[#D4AF37] text-[#090A0F] text-xs font-semibold hover:bg-[#e3be42] transition-colors"
                    >
                      Save Allocation & Reconcile Supply
                    </button>
                  </form>
                )}
              </div>
            )}

            {/* TAB 2: TRANSACTIONS & VISIBILITY */}
            {activeTab === 'transactions' && (
              <div className="space-y-6">
                <form
                  onSubmit={handleCreateOffChainTx}
                  className="p-4 rounded-lg border border-white/10 bg-black/20 space-y-3"
                >
                  <div className="text-xs font-semibold text-[#D4AF37]">
                    Record Verified Off-Chain Internal Ledger Entry
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[11px] text-[#9CA3AF] mb-1">Type</label>
                      <select
                        value={newTxType}
                        onChange={(e) => setNewTxType(e.target.value as TransactionType)}
                        className="w-full px-2.5 py-1.5 rounded text-xs bg-[#121621] border border-white/15"
                      >
                        <option value="MINING_DISTRIBUTION">MINING_DISTRIBUTION</option>
                        <option value="USER_TRANSFER">USER_TRANSFER</option>
                        <option value="TREASURY_ALLOCATION">TREASURY_ALLOCATION</option>
                        <option value="ECOSYSTEM_REWARD">ECOSYSTEM_REWARD</option>
                        <option value="LIQUIDITY_PROVISION">LIQUIDITY_PROVISION</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] text-[#9CA3AF] mb-1">
                        Amount (DECIMAL(36,8))
                      </label>
                      <input
                        type="text"
                        value={newTxAmount}
                        onChange={(e) => setNewTxAmount(e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded text-xs font-mono bg-black/40 border border-white/15"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-[#9CA3AF] mb-1">
                        User ID Ref (Optional)
                      </label>
                      <input
                        type="text"
                        value={newTxUserRef}
                        onChange={(e) => setNewTxUserRef(e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded text-xs font-mono bg-black/40 border border-white/15"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[11px] text-[#9CA3AF] mb-1">Sender Wallet</label>
                      <input
                        type="text"
                        value={newTxSender}
                        onChange={(e) => setNewTxSender(e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded text-xs font-mono bg-black/40 border border-white/15"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-[#9CA3AF] mb-1">
                        Receiver Wallet
                      </label>
                      <input
                        type="text"
                        value={newTxReceiver}
                        onChange={(e) => setNewTxReceiver(e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded text-xs font-mono bg-black/40 border border-white/15"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-[#9CA3AF] mb-1">Ledger Memo</label>
                      <input
                        type="text"
                        value={newTxMemo}
                        onChange={(e) => setNewTxMemo(e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded text-xs bg-black/40 border border-white/15"
                      />
                    </div>
                  </div>
                  <button
                    type="submit"
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#D4AF37] text-[#090A0F] text-xs font-semibold"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Commit Off-Chain Ledger Entry
                  </button>
                </form>

                <div className="space-y-2">
                  <div className="text-xs font-semibold text-[#9CA3AF]">
                    Manage Public Explorer Transaction Visibility
                  </div>
                  <div className="overflow-x-auto rounded-lg border border-white/10">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-black/40 text-[#9CA3AF] border-b border-white/10">
                        <tr>
                          <th className="py-2.5 px-3">Transaction ID</th>
                          <th className="py-2.5 px-3">Type</th>
                          <th className="py-2.5 px-3 text-right">Amount (FLYX)</th>
                          <th className="py-2.5 px-3">Visibility</th>
                          <th className="py-2.5 px-3 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/10">
                        {adminTxs.map((tx) => (
                          <tr key={tx.tx_id}>
                            <td className="py-2 px-3 font-mono">{tx.tx_id}</td>
                            <td className="py-2 px-3 font-mono">{tx.tx_type}</td>
                            <td className="py-2 px-3 font-mono text-right">
                              {formatFlyxAmount(tx.amount, 4)}
                            </td>
                            <td className="py-2 px-3">
                              {tx.is_public ? (
                                <span className="text-emerald-400 font-medium">Public</span>
                              ) : (
                                <span className="text-amber-400 font-medium">Hidden</span>
                              )}
                            </td>
                            <td className="py-2 px-3 text-right">
                              <button
                                type="button"
                                onClick={() => handleToggleTxVisibility(tx.tx_id, !tx.is_public)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded border border-white/15 hover:border-[#D4AF37] text-xs"
                              >
                                {tx.is_public ? (
                                  <>
                                    <EyeOff className="w-3 h-3" /> Hide
                                  </>
                                ) : (
                                  <>
                                    <Eye className="w-3 h-3" /> Make Public
                                  </>
                                )}
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* TAB: USER SMART CONTRACTS MANAGEMENT */}
            {activeTab === 'user-contracts' && (
              <div className="space-y-5">
                {/* Header & Metric Summary */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3.5 rounded-xl border border-white/10 bg-black/30 space-y-1">
                    <div className="text-[11px] font-mono text-slate-400 uppercase">Total Contracts</div>
                    <div className="font-mono text-xl font-bold text-white">
                      {userContractsList.length}
                    </div>
                    <div className="text-[10px] text-cyan-400 font-mono">1:1 Non-Duplicate</div>
                  </div>

                  <div className="p-3.5 rounded-xl border border-white/10 bg-black/30 space-y-1">
                    <div className="text-[11px] font-mono text-slate-400 uppercase">Active Anchors</div>
                    <div className="font-mono text-xl font-bold text-emerald-400">
                      {userContractsList.filter((c) => c.status === 'ACTIVE').length}
                    </div>
                    <div className="text-[10px] text-emerald-300/80 font-mono">Verified Invariants</div>
                  </div>

                  <div className="p-3.5 rounded-xl border border-white/10 bg-black/30 space-y-1">
                    <div className="text-[11px] font-mono text-slate-400 uppercase">Pending Deployment</div>
                    <div className="font-mono text-xl font-bold text-amber-300">
                      {userContractsList.filter((c) => c.status === 'PENDING_DEPLOYMENT').length}
                    </div>
                    <div className="text-[10px] text-amber-400/80 font-mono">Awaiting Bridge</div>
                  </div>

                  <div className="p-3.5 rounded-xl border border-white/10 bg-black/30 space-y-1">
                    <div className="text-[11px] font-mono text-slate-400 uppercase">Paused / Revoked</div>
                    <div className="font-mono text-xl font-bold text-rose-400">
                      {userContractsList.filter((c) => c.status === 'PAUSED' || c.status === 'REVOKED').length}
                    </div>
                    <div className="text-[10px] text-rose-300/80 font-mono">Audit Restriction</div>
                  </div>
                </div>

                {/* Search & Actions Bar */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 rounded-xl bg-black/30 border border-white/10">
                  <form onSubmit={handleSearchContractsSubmit} className="flex-1 flex gap-2">
                    <div className="relative flex-1">
                      <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={contractSearchQuery}
                        onChange={(e) => setContractSearchQuery(e.target.value)}
                        placeholder="Search by username, email, mobile, user ID, wallet, contract..."
                        className="w-full pl-9 pr-3 py-1.5 rounded-lg text-xs font-mono bg-black/40 border border-white/15 text-white focus:outline-none focus:border-[#D4AF37]"
                      />
                    </div>
                    <button
                      type="submit"
                      className="px-3.5 py-1.5 rounded-lg text-xs font-mono font-semibold bg-[#D4AF37] text-black hover:bg-[#e0bb42] transition-colors shrink-0"
                    >
                      Filter
                    </button>
                  </form>

                  <div className="flex items-center gap-2">
                    <select
                      value={contractStatusFilter}
                      onChange={(e) => setContractStatusFilter(e.target.value)}
                      className="px-2.5 py-1.5 rounded-lg text-xs font-mono bg-black/40 border border-white/15 text-white focus:outline-none"
                    >
                      <option value="ALL">All Statuses</option>
                      <option value="ACTIVE">Active</option>
                      <option value="PENDING_DEPLOYMENT">Pending Deployment</option>
                      <option value="PAUSED">Paused</option>
                      <option value="REVOKED">Revoked</option>
                    </select>

                    <button
                      type="button"
                      onClick={() => fetchUserContracts()}
                      disabled={contractLoading}
                      className="p-2 rounded-lg border border-white/15 hover:border-white/30 text-slate-300 hover:text-white"
                      title="Refresh User Contracts"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${contractLoading ? 'animate-spin' : ''}`} />
                    </button>

                    <button
                      type="button"
                      onClick={() => setShowAssignModal(true)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-cyan-500 text-black hover:bg-cyan-400 transition-colors shrink-0"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Assign Smart Contract</span>
                    </button>
                  </div>
                </div>

                {/* Contracts Table */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs text-[#9CA3AF]">
                    <span>
                      User Smart Contract Records ({userContractsList.length} registered)
                    </span>
                    <span className="font-mono text-[11px] text-amber-400">
                      Prepared Statements · Anti-IDOR · Invariant Enforced
                    </span>
                  </div>

                  <div className="overflow-x-auto rounded-xl border border-white/10">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-black/50 text-[#9CA3AF] border-b border-white/10 font-mono text-[11px]">
                        <tr>
                          <th className="py-2.5 px-3">User &amp; Contact</th>
                          <th className="py-2.5 px-3">Off-Chain Wallet</th>
                          <th className="py-2.5 px-3">Smart Contract Address</th>
                          <th className="py-2.5 px-3">Network &amp; Token</th>
                          <th className="py-2.5 px-3">Status</th>
                          <th className="py-2.5 px-3">Created / Tx Ref</th>
                          <th className="py-2.5 px-3 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/10 font-mono text-[11px]">
                        {userContractsList.length === 0 ? (
                          <tr>
                            <td colSpan={7} className="py-6 text-center text-slate-400">
                              No user smart contract records match your filter criteria.
                            </td>
                          </tr>
                        ) : (
                          userContractsList.map((contract) => (
                            <tr key={contract.id} className="hover:bg-white/[0.02] transition-colors">
                              {/* User Info */}
                              <td className="py-2.5 px-3 space-y-0.5">
                                <div className="font-bold text-white">{contract.user_id}</div>
                                {contract.username && (
                                  <div className="text-slate-400 text-[10px]">@{contract.username}</div>
                                )}
                                {contract.email && (
                                  <div className="text-slate-400 text-[10px]">{contract.email}</div>
                                )}
                                {contract.mobile && (
                                  <div className="text-slate-400 text-[10px]">{contract.mobile}</div>
                                )}
                              </td>

                              {/* Off-Chain Wallet */}
                              <td className="py-2.5 px-3">
                                <div className="flex items-center gap-1">
                                  <span className="text-cyan-300" title={contract.wallet_address}>
                                    {contract.wallet_address.slice(0, 10)}...{contract.wallet_address.slice(-4)}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => handleCopyContractAddress(contract.wallet_address, `w-${contract.id}`)}
                                    className="p-1 hover:text-white text-slate-400"
                                    title="Copy wallet address"
                                  >
                                    {copiedContractId === `w-${contract.id}` ? (
                                      <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                                    ) : (
                                      <Copy className="w-3 h-3" />
                                    )}
                                  </button>
                                </div>
                              </td>

                              {/* Smart Contract Address */}
                              <td className="py-2.5 px-3">
                                <div className="flex items-center gap-1.5">
                                  <span className="text-amber-300 font-bold" title={contract.contract_address}>
                                    {contract.contract_address.slice(0, 8)}...{contract.contract_address.slice(-6)}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => handleCopyContractAddress(contract.contract_address, `c-${contract.id}`)}
                                    className="p-1 hover:text-white text-slate-400"
                                    title="Copy smart contract address"
                                  >
                                    {copiedContractId === `c-${contract.id}` ? (
                                      <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                                    ) : (
                                      <Copy className="w-3 h-3" />
                                    )}
                                  </button>
                                </div>
                                <div className="text-[10px] text-slate-400 mt-0.5">
                                  {contract.is_primary ? 'Primary Anchor' : 'Secondary'}
                                </div>
                              </td>

                              {/* Network & Token */}
                              <td className="py-2.5 px-3">
                                <div className="text-white truncate max-w-[140px]" title={contract.network}>
                                  {contract.network}
                                </div>
                                <div className="text-amber-400 text-[10px]">{contract.token_symbol} · 8 Decimals</div>
                              </td>

                              {/* Status Badge */}
                              <td className="py-2.5 px-3">
                                <span
                                  className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                    contract.status === 'ACTIVE'
                                      ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-400'
                                      : contract.status === 'PENDING_DEPLOYMENT'
                                      ? 'bg-amber-500/15 border border-amber-500/30 text-amber-300'
                                      : contract.status === 'PAUSED'
                                      ? 'bg-yellow-500/15 border border-yellow-500/30 text-yellow-300'
                                      : 'bg-rose-500/15 border border-rose-500/30 text-rose-400'
                                  }`}
                                >
                                  {contract.status}
                                </span>
                              </td>

                              {/* Created / Tx Ref */}
                              <td className="py-2.5 px-3 text-[10px] text-slate-400">
                                <div>{contract.created_at.slice(0, 10)}</div>
                                {contract.transaction_ref && (
                                  <div className="text-cyan-400 truncate max-w-[120px]" title={contract.transaction_ref}>
                                    Tx: {contract.transaction_ref.slice(0, 16)}...
                                  </div>
                                )}
                              </td>

                              {/* Status Changer Actions */}
                              <td className="py-2.5 px-3 text-right">
                                <div className="inline-flex items-center gap-1 justify-end">
                                  {contract.status !== 'ACTIVE' && (
                                    <button
                                      type="button"
                                      onClick={() => handleUpdateContractStatus(contract, 'ACTIVE')}
                                      className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/30"
                                      title="Set status to ACTIVE"
                                    >
                                      Activate
                                    </button>
                                  )}
                                  {contract.status === 'ACTIVE' && (
                                    <button
                                      type="button"
                                      onClick={() => handleUpdateContractStatus(contract, 'PAUSED')}
                                      className="px-2 py-0.5 rounded text-[10px] font-semibold bg-yellow-500/20 text-yellow-300 border border-yellow-500/30 hover:bg-yellow-500/30"
                                      title="Set status to PAUSED"
                                    >
                                      Pause
                                    </button>
                                  )}
                                  {contract.status !== 'REVOKED' && (
                                    <button
                                      type="button"
                                      onClick={() => handleUpdateContractStatus(contract, 'REVOKED')}
                                      className="px-2 py-0.5 rounded text-[10px] font-semibold bg-rose-500/20 text-rose-300 border border-rose-500/30 hover:bg-rose-500/30"
                                      title="Set status to REVOKED"
                                    >
                                      Revoke
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* MODAL: ASSIGN NEW SMART CONTRACT */}
                {showAssignModal && (
                  <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                    <div className="w-full max-w-lg p-6 rounded-2xl bg-[#0E1320] border border-cyan-500/30 shadow-2xl space-y-4">
                      <div className="flex items-center justify-between border-b border-white/10 pb-3">
                        <div className="flex items-center gap-2">
                          <Code2 className="w-5 h-5 text-cyan-400" />
                          <h3 className="font-bold text-white text-base">Assign User Smart Contract</h3>
                        </div>
                        <button
                          type="button"
                          onClick={() => setShowAssignModal(false)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-white"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      </div>

                      <form onSubmit={handleAssignContractSubmit} className="space-y-3.5 text-xs">
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-slate-300 mb-1 font-semibold">User ID *</label>
                            <input
                              type="text"
                              required
                              placeholder="e.g. USR-FLYX-8849"
                              value={assignUserId}
                              onChange={(e) => setAssignUserId(e.target.value)}
                              className="w-full px-3 py-2 rounded-lg bg-black/40 border border-white/15 text-white font-mono focus:outline-none focus:border-cyan-400"
                            />
                          </div>

                          <div>
                            <label className="block text-slate-300 mb-1 font-semibold">FlyX Wallet Address *</label>
                            <input
                              type="text"
                              required
                              placeholder="e.g. FLYX-USER-8849-A91C-77E2"
                              value={assignWalletAddr}
                              onChange={(e) => setAssignWalletAddr(e.target.value)}
                              className="w-full px-3 py-2 rounded-lg bg-black/40 border border-white/15 text-white font-mono focus:outline-none focus:border-cyan-400"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-slate-300 mb-1 font-semibold">
                            Smart Contract Address (Optional)
                          </label>
                          <input
                            type="text"
                            placeholder="Leave empty to auto-generate unique EVM 0x... address"
                            value={assignContractAddr}
                            onChange={(e) => setAssignContractAddr(e.target.value)}
                            className="w-full px-3 py-2 rounded-lg bg-black/40 border border-white/15 text-white font-mono focus:outline-none focus:border-cyan-400"
                          />
                          <span className="text-[10px] text-slate-400 mt-0.5 block">
                            If empty, a deterministic 42-char collision-free 0x address is generated.
                          </span>
                        </div>

                        <div className="grid grid-cols-3 gap-3">
                          <div>
                            <label className="block text-slate-300 mb-1">Username</label>
                            <input
                              type="text"
                              placeholder="e.g. pioneer_8849"
                              value={assignUsername}
                              onChange={(e) => setAssignUsername(e.target.value)}
                              className="w-full px-3 py-2 rounded-lg bg-black/40 border border-white/15 text-white font-mono focus:outline-none"
                            />
                          </div>

                          <div>
                            <label className="block text-slate-300 mb-1">Email</label>
                            <input
                              type="email"
                              placeholder="user@flyxcoin.com"
                              value={assignEmail}
                              onChange={(e) => setAssignEmail(e.target.value)}
                              className="w-full px-3 py-2 rounded-lg bg-black/40 border border-white/15 text-white font-mono focus:outline-none"
                            />
                          </div>

                          <div>
                            <label className="block text-slate-300 mb-1">Mobile</label>
                            <input
                              type="text"
                              placeholder="+1-555-..."
                              value={assignMobile}
                              onChange={(e) => setAssignMobile(e.target.value)}
                              className="w-full px-3 py-2 rounded-lg bg-black/40 border border-white/15 text-white font-mono focus:outline-none"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-slate-300 mb-1 font-semibold">Blockchain Network</label>
                            <input
                              type="text"
                              value={assignNetwork}
                              onChange={(e) => setAssignNetwork(e.target.value)}
                              className="w-full px-3 py-2 rounded-lg bg-black/40 border border-white/15 text-white font-mono focus:outline-none"
                            />
                          </div>

                          <div>
                            <label className="block text-slate-300 mb-1 font-semibold">Initial Status</label>
                            <select
                              value={assignStatus}
                              onChange={(e) => setAssignStatus(e.target.value as UserContractStatus)}
                              className="w-full px-3 py-2 rounded-lg bg-black/40 border border-white/15 text-white font-mono focus:outline-none"
                            >
                              <option value="ACTIVE">ACTIVE</option>
                              <option value="PENDING_DEPLOYMENT">PENDING_DEPLOYMENT</option>
                              <option value="PAUSED">PAUSED</option>
                              <option value="REVOKED">REVOKED</option>
                            </select>
                          </div>
                        </div>

                        <div>
                          <label className="block text-slate-300 mb-1">Audit Notes / Memo</label>
                          <input
                            type="text"
                            placeholder="e.g. Verified Genesis Pioneer Miner smart contract anchor"
                            value={assignNotes}
                            onChange={(e) => setAssignNotes(e.target.value)}
                            className="w-full px-3 py-2 rounded-lg bg-black/40 border border-white/15 text-white font-mono focus:outline-none"
                          />
                        </div>

                        <div className="pt-2 flex justify-end gap-2 border-t border-white/10">
                          <button
                            type="button"
                            onClick={() => setShowAssignModal(false)}
                            className="px-4 py-2 rounded-lg text-slate-300 hover:text-white border border-white/10"
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            className="px-5 py-2 rounded-lg bg-cyan-500 text-black font-bold hover:bg-cyan-400 transition-colors"
                          >
                            Assign &amp; Persist
                          </button>
                        </div>
                      </form>
                    </div>
                  </div>
                )}
              </div>
            )}
            {activeTab === 'announcements' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <form
                  onSubmit={handleCreateAnnouncement}
                  className="space-y-3 p-4 rounded-lg border border-white/10 bg-black/20"
                >
                  <h3 className="text-sm font-semibold text-[#D4AF37]">
                    Publish Official Announcement
                  </h3>
                  <div>
                    <label className="block text-xs text-[#9CA3AF] mb-1">Headline</label>
                    <input
                      type="text"
                      required
                      value={annTitle}
                      onChange={(e) => setAnnTitle(e.target.value)}
                      placeholder="e.g., Q4 Mining Epoch Settlement Schedule"
                      className="w-full px-3 py-2 rounded-lg text-xs bg-black/40 border border-white/15"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-[#9CA3AF] mb-1">Category</label>
                      <select
                        value={annCategory}
                        onChange={(e) =>
                          setAnnCategory(e.target.value as AnnouncementItem['category'])
                        }
                        className="w-full px-3 py-2 rounded-lg text-xs bg-[#121621] border border-white/15"
                      >
                        <option value="TRANSPARENCY_REPORT">TRANSPARENCY_REPORT</option>
                        <option value="PLATFORM_UPDATE">PLATFORM_UPDATE</option>
                        <option value="TOKENOMICS_NOTICE">TOKENOMICS_NOTICE</option>
                        <option value="SECURITY_AUDIT">SECURITY_AUDIT</option>
                        <option value="ECOSYSTEM_NEWS">ECOSYSTEM_NEWS</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-[#9CA3AF] mb-1">Author</label>
                      <input
                        type="text"
                        value={annAuthor}
                        onChange={(e) => setAnnAuthor(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg text-xs bg-black/40 border border-white/15"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs text-[#9CA3AF] mb-1">Executive Summary</label>
                    <input
                      type="text"
                      required
                      value={annSummary}
                      onChange={(e) => setAnnSummary(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg text-xs bg-black/40 border border-white/15"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-[#9CA3AF] mb-1">Full Notice Body</label>
                    <textarea
                      rows={4}
                      required
                      value={annContent}
                      onChange={(e) => setAnnContent(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg text-xs bg-black/40 border border-white/15"
                    />
                  </div>
                  <label className="flex items-center gap-2 text-xs">
                    <input
                      type="checkbox"
                      checked={annPinned}
                      onChange={(e) => setAnnPinned(e.target.checked)}
                    />
                    <span>Pin as Priority Transparency Notice</span>
                  </label>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-lg bg-[#D4AF37] text-[#090A0F] text-xs font-semibold"
                  >
                    Publish Announcement
                  </button>
                </form>

                <div className="space-y-2.5">
                  <div className="text-xs font-semibold text-[#9CA3AF]">
                    Existing Official Announcements
                  </div>
                  {overview.announcements.map((item) => (
                    <div
                      key={item.id}
                      className="p-3 rounded-lg border border-white/10 bg-black/20 flex items-start justify-between gap-3"
                    >
                      <div>
                        <div className="text-xs font-semibold">{item.title}</div>
                        <div className="text-[11px] text-[#9CA3AF] mt-0.5">
                          {item.category} · {item.published_at.slice(0, 10)}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDeleteAnnouncement(item.id)}
                        className="p-1.5 text-red-400 hover:bg-red-500/15 rounded"
                        title="Delete announcement"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB 4: ROADMAP */}
            {activeTab === 'roadmap' && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="space-y-2">
                  {overview.roadmap.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setSelectedPhase(p)}
                      className={`w-full text-left p-3 rounded-lg border transition-colors ${
                        selectedPhase?.id === p.id
                          ? 'border-[#D4AF37] bg-[#D4AF37]/10'
                          : 'border-white/10 bg-black/20'
                      }`}
                    >
                      <div className="flex items-center justify-between text-xs font-semibold">
                        <span>
                          {p.phase_code} — {p.title}
                        </span>
                        <span className="font-mono text-[#D4AF37]">{p.completion_percent}%</span>
                      </div>
                      <div className="text-[11px] text-[#9CA3AF] mt-1">{p.status}</div>
                    </button>
                  ))}
                </div>

                {selectedPhase && (
                  <form
                    onSubmit={handleSaveRoadmap}
                    className="lg:col-span-2 space-y-4 p-4 rounded-lg border border-white/10 bg-black/20"
                  >
                    <h3 className="text-sm font-semibold">
                      Update {selectedPhase.phase_code}: {selectedPhase.title}
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-xs text-[#9CA3AF] mb-1">Status</label>
                        <select
                          value={phaseStatus}
                          onChange={(e) =>
                            setPhaseStatus(e.target.value as RoadmapPhase['status'])
                          }
                          className="w-full px-3 py-2 rounded-lg text-xs bg-[#121621] border border-white/15"
                        >
                          <option value="COMPLETED">COMPLETED (Requires 100%)</option>
                          <option value="IN_PROGRESS">IN_PROGRESS</option>
                          <option value="PLANNED">PLANNED</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs text-[#9CA3AF] mb-1">
                          Completion Percent (0-100)
                        </label>
                        <input
                          type="number"
                          min={0}
                          max={100}
                          value={phasePercent}
                          onChange={(e) => setPhasePercent(Number(e.target.value))}
                          className="w-full px-3 py-2 rounded-lg text-xs font-mono bg-black/40 border border-white/15"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-[#9CA3AF] mb-1">Target Window</label>
                        <input
                          type="text"
                          value={phaseWindow}
                          onChange={(e) => setPhaseWindow(e.target.value)}
                          className="w-full px-3 py-2 rounded-lg text-xs bg-black/40 border border-white/15"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs text-[#9CA3AF] mb-1">Phase Summary</label>
                      <textarea
                        rows={3}
                        value={phaseSummary}
                        onChange={(e) => setPhaseSummary(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg text-xs bg-black/40 border border-white/15"
                      />
                    </div>

                    <div>
                      <label className="block text-xs text-[#9CA3AF] mb-1">Verification Note</label>
                      <input
                        type="text"
                        value={phaseNote}
                        onChange={(e) => setPhaseNote(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg text-xs bg-black/40 border border-white/15"
                      />
                    </div>

                    <button
                      type="submit"
                      className="px-4 py-2 rounded-lg bg-[#D4AF37] text-[#090A0F] text-xs font-semibold"
                    >
                      Save Roadmap Stage
                    </button>
                  </form>
                )}
              </div>
            )}

            {/* TAB 5: WHITEPAPER */}
            {activeTab === 'whitepaper' && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="space-y-1.5 max-h-[380px] overflow-y-auto pr-1">
                  {overview.whitepaper.map((sec) => (
                    <button
                      key={sec.id}
                      type="button"
                      onClick={() => setSelectedWp(sec)}
                      className={`w-full text-left p-2.5 rounded-lg border text-xs transition-colors ${
                        selectedWp?.id === sec.id
                          ? 'border-[#D4AF37] bg-[#D4AF37]/10 font-semibold'
                          : 'border-white/10 bg-black/20'
                      }`}
                    >
                      {sec.title}
                    </button>
                  ))}
                </div>

                {selectedWp && (
                  <form
                    onSubmit={handleSaveWhitepaper}
                    className="lg:col-span-2 space-y-3 p-4 rounded-lg border border-white/10 bg-black/20"
                  >
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="sm:col-span-2">
                        <label className="block text-xs text-[#9CA3AF] mb-1">Section Title</label>
                        <input
                          type="text"
                          value={wpTitle}
                          onChange={(e) => setWpTitle(e.target.value)}
                          className="w-full px-3 py-2 rounded-lg text-xs bg-black/40 border border-white/15"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-[#9CA3AF] mb-1">Version Tag</label>
                        <input
                          type="text"
                          value={wpVersion}
                          onChange={(e) => setWpVersion(e.target.value)}
                          className="w-full px-3 py-2 rounded-lg text-xs font-mono bg-black/40 border border-white/15"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs text-[#9CA3AF] mb-1">Subtitle</label>
                      <input
                        type="text"
                        value={wpSubtitle}
                        onChange={(e) => setWpSubtitle(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg text-xs bg-black/40 border border-white/15"
                      />
                    </div>

                    <div>
                      <label className="block text-xs text-[#9CA3AF] mb-1">Section Prose</label>
                      <textarea
                        rows={7}
                        value={wpContent}
                        onChange={(e) => setWpContent(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg text-xs bg-black/40 border border-white/15 leading-relaxed"
                      />
                    </div>

                    <button
                      type="submit"
                      className="px-4 py-2 rounded-lg bg-[#D4AF37] text-[#090A0F] text-xs font-semibold"
                    >
                      Save Whitepaper Section
                    </button>
                  </form>
                )}
              </div>
            )}

            {/* TAB 6: PROJECT & BRIDGE CONFIG */}
            {activeTab === 'project' && (
              <form
                onSubmit={handleSaveProjectInfo}
                className="max-w-xl space-y-4 p-4 rounded-lg border border-white/10 bg-black/20"
              >
                <h3 className="text-sm font-semibold text-[#D4AF37]">
                  Ecosystem & FlyXCoin.com Bridge Metadata
                </h3>
                <div>
                  <label className="block text-xs text-[#9CA3AF] mb-1">Official Token Name</label>
                  <input
                    type="text"
                    value={tokenName}
                    onChange={(e) => setTokenName(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg text-xs bg-black/40 border border-white/15"
                  />
                </div>
                <div>
                  <label className="block text-xs text-[#9CA3AF] mb-1">
                    Current Ledger & Blockchain Status Disclosure
                  </label>
                  <input
                    type="text"
                    value={blockchainStatus}
                    onChange={(e) => setBlockchainStatus(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg text-xs bg-black/40 border border-white/15"
                  />
                </div>
                <div>
                  <label className="block text-xs text-[#9CA3AF] mb-1">
                    Connected Primary Platform URL (FlyXCoin.com)
                  </label>
                  <input
                    type="url"
                    value={mainPortalUrl}
                    onChange={(e) => setMainPortalUrl(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg text-xs font-mono bg-black/40 border border-white/15"
                  />
                </div>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-[#D4AF37] text-[#090A0F] text-xs font-semibold"
                >
                  Update Ecosystem Configuration
                </button>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
