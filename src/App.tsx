import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowDown,
  ArrowRight,
  ArrowUp,
  ArrowUpDown,
  ArrowUpRight,
  BookOpen,
  CheckCircle2,
  ChevronDown,
  Code2,
  Copy,
  Database,
  Download,
  ExternalLink,
  Eye,
  FileSpreadsheet,
  Filter,
  Flag,
  Globe,
  HelpCircle,
  Lock,
  Menu,
  Moon,
  Printer,
  Search,
  Settings2,
  Shield,
  Sparkles,
  Sun,
  Volume2,
  Wallet,
  X,
} from 'lucide-react';
import { FlyxCoin3D } from './components/FlyxCoin3D.tsx';
import { AdminConsoleModal } from './components/AdminConsoleModal.tsx';
import { TransactionVolumeChart } from './components/TransactionVolumeChart.tsx';
import { AuditSummaryWidget } from './components/AuditSummaryWidget.tsx';
import { NetworkStatisticsPanel } from './components/NetworkStatisticsPanel.tsx';
import { LivePricePanel } from './components/LivePricePanel.tsx';
import { Web3Background } from './components/Web3Background.tsx';
import { Web3KpiSection } from './components/Web3KpiSection.tsx';
import { TokenContractSection } from './components/TokenContractSection.tsx';
import { UserSmartContractSection } from './components/UserSmartContractSection.tsx';
import {
  LedgerTransaction,
  OverviewResponse,
  PublicWalletRecord,
} from './types/flyx.ts';
import {
  decimalToUnits,
  formatFlyxAmount,
  unitsToDecimal,
} from './services/blockchainAdapter.ts';
import { getOverview, getPrice } from './services/apiClient.ts';

type SortField = 'created_at' | 'amount' | 'tx_type';
type SortDirection = 'asc' | 'desc';

type CsvColumnKey =
  | 'tx_id'
  | 'contract_address'
  | 'batch_epoch'
  | 'ledger_environment'
  | 'tx_type'
  | 'amount'
  | 'fee'
  | 'high_value_flag'
  | 'status'
  | 'sender_wallet'
  | 'receiver_wallet'
  | 'user_id_reference'
  | 'memo'
  | 'created_at';

interface CsvExportToastInfo {
  id: string;
  filename: string;
  rowCount: number;
  columnCount: number;
  exportType: string;
  timestamp: string;
}

interface CsvColumnDefinition {
  key: CsvColumnKey;
  csvHeader: string;
  label: string;
  description: string;
  coreAuditColumn: boolean;
  rendersInLiveTable: boolean;
}

const CSV_EXPORT_COLUMNS: CsvColumnDefinition[] = [
  {
    key: 'tx_id',
    csvHeader: 'Transaction_ID',
    label: 'Transaction ID',
    description: 'Unique off-chain ledger transaction identifier & copy action',
    coreAuditColumn: true,
    rendersInLiveTable: true,
  },
  {
    key: 'contract_address',
    csvHeader: 'Token_Contract_Address',
    label: 'Contract Address',
    description: 'FLYX official token contract address with 1-click copy action',
    coreAuditColumn: true,
    rendersInLiveTable: true,
  },
  {
    key: 'batch_epoch',
    csvHeader: 'Settlement_Batch_Epoch',
    label: 'Batch ID / Epoch',
    description: 'Internal ledger settlement batch identifier and epoch number',
    coreAuditColumn: true,
    rendersInLiveTable: true,
  },
  {
    key: 'ledger_environment',
    csvHeader: 'Ledger_Environment',
    label: 'Ledger Environment',
    description: 'Off-Chain Internal Ledger vs. On-Chain Mainnet classification',
    coreAuditColumn: false,
    rendersInLiveTable: true,
  },
  {
    key: 'tx_type',
    csvHeader: 'Transaction_Type',
    label: 'Transaction Type',
    description: 'Operation category (Mining Distribution, Transfer, Treasury, etc.)',
    coreAuditColumn: true,
    rendersInLiveTable: true,
  },
  {
    key: 'amount',
    csvHeader: 'Amount_FLYX_DECIMAL_36_8',
    label: 'Amount (FLYX DECIMAL 36,8)',
    description: 'Exact 8-decimal fixed-point FLYX token amount',
    coreAuditColumn: true,
    rendersInLiveTable: true,
  },
  {
    key: 'fee',
    csvHeader: 'Fee_FLYX_DECIMAL_36_8',
    label: 'Settlement Fee (FLYX)',
    description: 'Exact 8-decimal FLYX internal ledger fee sub-detail',
    coreAuditColumn: false,
    rendersInLiveTable: true,
  },
  {
    key: 'high_value_flag',
    csvHeader: 'High_Value_Audit_Flag',
    label: 'High-Value Audit Flag',
    description: 'Indicates whether amount meets the >= 10,000 FLYX threshold',
    coreAuditColumn: true,
    rendersInLiveTable: true,
  },
  {
    key: 'status',
    csvHeader: 'Status',
    label: 'Status',
    description: 'Settlement verification status (CONFIRMED, RECONCILED)',
    coreAuditColumn: true,
    rendersInLiveTable: true,
  },
  {
    key: 'sender_wallet',
    csvHeader: 'Sender_Wallet',
    label: 'Sender Wallet',
    description: 'Originating custodial vault or public user wallet address',
    coreAuditColumn: true,
    rendersInLiveTable: true,
  },
  {
    key: 'receiver_wallet',
    csvHeader: 'Receiver_Wallet',
    label: 'Receiver Wallet',
    description: 'Destination custodial vault or public user wallet address',
    coreAuditColumn: true,
    rendersInLiveTable: true,
  },
  {
    key: 'user_id_reference',
    csvHeader: 'Public_Account_Ref',
    label: 'Public Account Reference',
    description: 'Non-sensitive public account or governance proposal reference',
    coreAuditColumn: false,
    rendersInLiveTable: true,
  },
  {
    key: 'memo',
    csvHeader: 'Memo',
    label: 'Audit Memo',
    description: 'Settlement epoch batch or governance audit note',
    coreAuditColumn: false,
    rendersInLiveTable: true,
  },
  {
    key: 'created_at',
    csvHeader: 'Created_At_UTC',
    label: 'Timestamp (UTC)',
    description: 'ISO-8601 UTC / Relative settlement timestamp',
    coreAuditColumn: true,
    rendersInLiveTable: true,
  },
];

const DEFAULT_CSV_COLUMNS_SELECTION: Record<CsvColumnKey, boolean> = {
  tx_id: true,
  contract_address: true,
  batch_epoch: true,
  ledger_environment: true,
  tx_type: true,
  amount: true,
  fee: true,
  high_value_flag: true,
  status: true,
  sender_wallet: true,
  receiver_wallet: true,
  user_id_reference: true,
  memo: true,
  created_at: true,
};

const HIGH_VALUE_AUDIT_UNITS = decimalToUnits('10000.00000000');
const SYSTEM_DISTRIBUTION_TYPES = new Set([
  'TREASURY_ALLOCATION',
  'LIQUIDITY_PROVISION',
  'TEAM_VESTING_LOCK',
  'ECOSYSTEM_REWARD',
]);

function isAuditOnlyTransaction(tx: LedgerTransaction): boolean {
  return (
    SYSTEM_DISTRIBUTION_TYPES.has(tx.tx_type) ||
    decimalToUnits(tx.amount) >= HIGH_VALUE_AUDIT_UNITS
  );
}

function resolveLedgerBatchInfo(tx: LedgerTransaction): {
  batchId: string;
  epochLabel: string;
  combinedCsvValue: string;
} {
  const dateCompact = tx.created_at.slice(0, 10).replace(/-/g, '') || '20261005';
  const typePrefixMap: Record<LedgerTransaction['tx_type'], string> = {
    MINING_DISTRIBUTION: 'MIN',
    USER_TRANSFER: 'TRN',
    TREASURY_ALLOCATION: 'TRS',
    ECOSYSTEM_REWARD: 'ECO',
    LIQUIDITY_PROVISION: 'LIQ',
    TEAM_VESTING_LOCK: 'VST',
  };
  const prefix = typePrefixMap[tx.tx_type] || 'LDG';
  const batchMatch = tx.memo.match(/Batch\s*#?(\d+)/i);
  const batchSuffix = batchMatch ? `B${batchMatch[1].padStart(3, '0')}` : prefix;
  const batchId = `BATCH-${dateCompact}-${batchSuffix}`;

  const epochMatch = tx.memo.match(/Epoch\s*#?(\d+)/i);
  let epochNum = 412;
  if (epochMatch) {
    epochNum = Number.parseInt(epochMatch[1], 10);
  } else {
    const dayNum = Number.parseInt(tx.created_at.slice(8, 10), 10);
    if (!Number.isNaN(dayNum)) {
      epochNum = 407 + dayNum;
    }
  }
  const epochLabel = `EPOCH #${epochNum}`;
  return {
    batchId,
    epochLabel,
    combinedCsvValue: `${batchId} (${epochLabel})`,
  };
}

function formatRelativeTime(isoUtcString: string): string {
  const txTime = new Date(isoUtcString).getTime();
  if (Number.isNaN(txTime)) return 'Recently';
  const anchorNow = Math.max(Date.now(), new Date('2026-10-05T20:39:00Z').getTime());
  const diffSeconds = Math.max(0, Math.floor((anchorNow - txTime) / 1000));

  if (diffSeconds < 60) return 'Just now';
  const diffMinutes = Math.floor(diffSeconds / 60);
  if (diffMinutes < 60) {
    return diffMinutes === 1 ? '1 minute ago' : `${diffMinutes} minutes ago`;
  }
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) {
    return diffHours === 1 ? '1 hour ago' : `${diffHours} hours ago`;
  }
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 30) {
    return diffDays === 1 ? '1 day ago' : `${diffDays} days ago`;
  }
  const diffMonths = Math.floor(diffDays / 30);
  return diffMonths === 1 ? '1 month ago' : `${diffMonths} months ago`;
}

function sortLedgerTransactions(
  list: LedgerTransaction[],
  field: SortField,
  direction: SortDirection
): LedgerTransaction[] {
  const factor = direction === 'asc' ? 1 : -1;
  return [...list].sort((a, b) => {
    if (field === 'amount') {
      const diff = decimalToUnits(a.amount) - decimalToUnits(b.amount);
      if (diff === 0n) return b.created_at.localeCompare(a.created_at);
      return diff > 0n ? factor : -factor;
    }
    if (field === 'tx_type') {
      const cmp = a.tx_type.localeCompare(b.tx_type);
      if (cmp === 0) return b.created_at.localeCompare(a.created_at);
      return cmp * factor;
    }
    return a.created_at.localeCompare(b.created_at) * factor;
  });
}

/**
 * Plays a subtle, futuristic Web3 success chime using the native Web Audio API.
 * Uses a soft two-tone ascending sequence (C5 -> G5 with a gentle harmonic shimmer)
 * with a smooth exponential gain curve and warm lowpass filter for pleasant feedback.
 */
function playExportSuccessSound(): void {
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;

    const ctx = new AudioCtx();
    const now = ctx.currentTime;

    // Master volume with subtle peak (soft and non-jarring)
    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(0.0001, now);
    masterGain.connect(ctx.destination);

    // Warm lowpass filter to soften harmonics
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(2400, now);
    filter.connect(masterGain);

    // Tone 1: 523.25 Hz (C5) - Gentle initiation chime
    const osc1 = ctx.createOscillator();
    const osc1Gain = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(523.25, now);
    osc1Gain.gain.setValueAtTime(0.0001, now);
    osc1Gain.gain.exponentialRampToValueAtTime(0.08, now + 0.025);
    osc1Gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.25);
    osc1.connect(osc1Gain);
    osc1Gain.connect(filter);

    // Tone 2: 783.99 Hz (G5) - Harmonic resolution
    const osc2 = ctx.createOscillator();
    const osc2Gain = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(783.99, now + 0.08);
    osc2Gain.gain.setValueAtTime(0.0001, now + 0.08);
    osc2Gain.gain.exponentialRampToValueAtTime(0.1, now + 0.11);
    osc2Gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.42);
    osc2.connect(osc2Gain);
    osc2Gain.connect(filter);

    // Subtle Glass Shimmer: 1318.51 Hz (E6)
    const osc3 = ctx.createOscillator();
    const osc3Gain = ctx.createGain();
    osc3.type = 'sine';
    osc3.frequency.setValueAtTime(1318.51, now + 0.1);
    osc3Gain.gain.setValueAtTime(0.0001, now + 0.1);
    osc3Gain.gain.exponentialRampToValueAtTime(0.035, now + 0.13);
    osc3Gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);
    osc3.connect(osc3Gain);
    osc3Gain.connect(filter);

    // Master envelope
    masterGain.gain.exponentialRampToValueAtTime(0.11, now + 0.04);
    masterGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.45);

    osc1.start(now);
    osc1.stop(now + 0.26);
    osc2.start(now + 0.08);
    osc2.stop(now + 0.45);
    osc3.start(now + 0.1);
    osc3.stop(now + 0.38);

    // Gracefully clean up audio context after playback completes
    setTimeout(() => {
      try {
        if (ctx.state !== 'closed') {
          ctx.close();
        }
      } catch {
        // Ignore audio cleanup errors
      }
    }, 550);
  } catch {
    // Graceful fallback if Web Audio is restricted or unavailable
  }
}

export default function App() {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [overview, setOverview] = useState<OverviewResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Transaction Explorer Filter & Sort States
  const [txQuery, setTxQuery] = useState('');
  const [txTypeFilter, setTxTypeFilter] = useState('ALL');
  const [txBatchEpochFilter, setTxBatchEpochFilter] = useState('ALL');
  const [txDateFrom, setTxDateFrom] = useState('');
  const [txDateTo, setTxDateTo] = useState('');
  const [txMinAmount, setTxMinAmount] = useState('');
  const [txAuditOnly, setTxAuditOnly] = useState(false);
  const [highlightHighValueRows, setHighlightHighValueRows] = useState(true);
  const [timestampFormat, setTimestampFormat] = useState<'relative' | 'iso'>('relative');
  const [csvHighValueOnly, setCsvHighValueOnly] = useState(false);
  const [txSortField, setTxSortField] = useState<SortField>('created_at');
  const [txSortDirection, setTxSortDirection] = useState<SortDirection>('desc');
  const [filteredTransactions, setFilteredTransactions] = useState<LedgerTransaction[]>([]);
  const [txListVersion, setTxListVersion] = useState(0);
  const [txLoading, setTxLoading] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<LedgerTransaction | null>(null);

  // Transaction Explorer Pagination States
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number | 'ALL'>(10);
  const [livePriceUsd, setLivePriceUsd] = useState<string>('3.50');
  const [livePriceChange, setLivePriceChange] = useState<string>('+4.28');

  // Live price polling for Dynamic Web3 KPI Section
  useEffect(() => {
    let isMounted = true;
    const fetchLivePriceData = async () => {
      try {
        const data = await getPrice();
        if (isMounted) {
          if (data.price_usd) setLivePriceUsd(data.price_usd);
          if (data.change_24h_percent) setLivePriceChange(data.change_24h_percent);
        }
      } catch {
        // preserve fallback
      }
    };
    fetchLivePriceData();
    const timer = setInterval(fetchLivePriceData, 25_000);
    return () => {
      isMounted = false;
      clearInterval(timer);
    };
  }, []);

  // Public Wallet Lookup & History Sort States
  const [walletSearchInput, setWalletSearchInput] = useState('USR-FLYX-8849');
  const [walletResult, setWalletResult] = useState<{
    wallet: PublicWalletRecord;
    transactions: LedgerTransaction[];
  } | null>(null);
  const [walletSortField, setWalletSortField] = useState<SortField>('created_at');
  const [walletSortDirection, setWalletSortDirection] = useState<SortDirection>('desc');
  const [walletError, setWalletError] = useState<string | null>(null);
  const [walletLoading, setWalletLoading] = useState(false);

  // Whitepaper & Roadmap Active States
  const [activeWpSlug, setActiveWpSlug] = useState('project-introduction');
  const [activePhaseNumber, setActivePhaseNumber] = useState<number>(2);

  // Modals & Refs
  const [adminOpen, setAdminOpen] = useState(false);
  const [schemaModalOpen, setSchemaModalOpen] = useState(false);
  const [shortcutsModalOpen, setShortcutsModalOpen] = useState(false);
  const [csvSettingsModalOpen, setCsvSettingsModalOpen] = useState(false);
  const [selectedCsvColumns, setSelectedCsvColumns] = useState<Record<CsvColumnKey, boolean>>(
    DEFAULT_CSV_COLUMNS_SELECTION
  );
  const [selectedTxIds, setSelectedTxIds] = useState<Record<string, boolean>>({});
  const [flaggedTxIds, setFlaggedTxIds] = useState<Record<string, boolean>>({});
  const [expandedTxIds, setExpandedTxIds] = useState<Record<string, boolean>>({});
  const [actionsDropdownOpenId, setActionsDropdownOpenId] = useState<string | null>(null);
  const [schemaSqlText, setSchemaSqlText] = useState<string>('');
  const [copiedText, setCopiedText] = useState<string | null>(null);

  // CSV Export Confirmation Toast Notification State
  const [csvExportToast, setCsvExportToast] = useState<CsvExportToastInfo | null>(null);
  const csvExportToastTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (csvExportToastTimerRef.current) {
        clearTimeout(csvExportToastTimerRef.current);
      }
    };
  }, []);

  // Live Off-Chain Ledger Sync Heartbeat & Latency State
  const [lastSyncTime, setLastSyncTime] = useState<string>(() =>
    new Date().toISOString().slice(11, 19)
  );
  const [isSyncPulsing, setIsSyncPulsing] = useState<boolean>(false);
  const [ledgerLatencyMs, setLedgerLatencyMs] = useState<number>(14);

  const txSearchInputRef = useRef<HTMLInputElement | null>(null);
  const walletInputRef = useRef<HTMLInputElement | null>(null);

  const isDark = theme === 'dark';

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark);
  }, [isDark]);

  // Global Keyboard Shortcuts for Power Users
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isEditable =
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable);

      if (e.key === 'Escape') {
        if (selectedTransaction) {
          setSelectedTransaction(null);
          return;
        }
        if (csvSettingsModalOpen) {
          setCsvSettingsModalOpen(false);
          return;
        }
        if (schemaModalOpen) {
          setSchemaModalOpen(false);
          return;
        }
        if (shortcutsModalOpen) {
          setShortcutsModalOpen(false);
          return;
        }
        if (adminOpen) {
          setAdminOpen(false);
          return;
        }
        if (mobileMenuOpen) {
          setMobileMenuOpen(false);
          return;
        }
        if (isEditable && target) {
          target.blur();
        }
        return;
      }

      // Do not trigger single-key shortcuts while typing inside inputs or when modifier keys are held
      if (isEditable || e.metaKey || e.ctrlKey || e.altKey) return;

      if (e.key === '/') {
        e.preventDefault();
        const explorerEl = document.getElementById('explorer');
        if (explorerEl) explorerEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
        txSearchInputRef.current?.focus();
        return;
      }

      if (e.key === 'w' || e.key === 'W') {
        e.preventDefault();
        const walletsEl = document.getElementById('wallets');
        if (walletsEl) walletsEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
        walletInputRef.current?.focus();
        return;
      }

      if (e.key === '?') {
        e.preventDefault();
        setShortcutsModalOpen((prev) => !prev);
        return;
      }

      const sectionMap: Record<string, string> = {
        '1': 'overview',
        '2': 'tokenomics',
        '3': 'explorer',
        '4': 'wallets',
        '5': 'whitepaper',
      };
      if (sectionMap[e.key]) {
        e.preventDefault();
        const sec = document.getElementById(sectionMap[e.key]);
        if (sec) sec.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Initial Load of Overview & Default Wallet Lookup
  useEffect(() => {
    let isMounted = true;
    const fetchInitial = async () => {
      setLoading(true);
      try {
        const t0 = performance.now();
        const data = await getOverview();
        if (isMounted) {
          const rtt = Math.max(2, Math.round(performance.now() - t0));
          setLedgerLatencyMs(rtt);
          setOverview(data);
          setFilteredTransactions(data.recentTransactions);
          setLastSyncTime(new Date().toISOString().slice(11, 19));
          await performWalletLookup('USR-FLYX-8849');
        }
      } catch (err: any) {
        if (isMounted) {
          setError(err.message || 'Unable to connect to FLYX Insight API.');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };
    fetchInitial();
    return () => {
      isMounted = false;
    };
  }, []);

  const triggerLedgerHeartbeat = async () => {
    setIsSyncPulsing(true);
    try {
      const t0 = performance.now();
      const data = await getOverview();
      const rtt = Math.max(2, Math.round(performance.now() - t0));
      setLedgerLatencyMs(rtt);
      setOverview(data);
      setLastSyncTime(new Date().toISOString().slice(11, 19));
    } catch {
      // Keep existing state on transient network hiccup
    } finally {
      window.setTimeout(() => setIsSyncPulsing(false), 900);
    }
  };

  // Periodic Off-Chain Ledger Heartbeat Sync (every 12 seconds)
  useEffect(() => {
    const intervalId = window.setInterval(() => {
      triggerLedgerHeartbeat();
    }, 12000);

    return () => window.clearInterval(intervalId);
  }, []);

  // Search Transactions Handler
  const handleSearchTransactions = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setTxLoading(true);
    try {
      const params = new URLSearchParams();
      if (txQuery.trim()) params.set('q', txQuery.trim());
      if (txTypeFilter !== 'ALL') params.set('txType', txTypeFilter);
      if (txDateFrom) params.set('dateFrom', txDateFrom);
      if (txDateTo) params.set('dateTo', txDateTo);
      if (txMinAmount.trim()) params.set('minAmount', txMinAmount.trim());
      if (txAuditOnly) params.set('auditOnly', 'true');
      params.set('sortBy', txSortField);
      params.set('sortOrder', txSortDirection);

      const res = await fetch(`/api/transactions?${params.toString()}`);
      const data = await res.json();
      if (res.ok && Array.isArray(data.transactions)) {
        setFilteredTransactions(data.transactions);
        setTxListVersion((v) => v + 1);
      }
    } catch {
      // Keep current list on transient error
    } finally {
      setTxLoading(false);
    }
  };

  // Public Wallet Lookup Handler
  const performWalletLookup = async (identifier: string) => {
    const clean = identifier.trim();
    if (!clean) return;
    setWalletSearchInput(clean);
    setWalletLoading(true);
    setWalletError(null);
    try {
      const res = await fetch(`/api/wallets/${encodeURIComponent(clean)}`);
      const data = await res.json();
      if (!res.ok) {
        setWalletResult(null);
        setWalletError(data.error || 'Wallet or account identifier not found.');
      } else {
        setWalletResult({
          wallet: data.wallet,
          transactions: data.transactions || [],
        });
      }
    } catch {
      setWalletError('Failed to query public wallet registry.');
    } finally {
      setWalletLoading(false);
    }
  };

  const inspectWalletAndScroll = (identifier: string) => {
    performWalletLookup(identifier);
    const el = document.getElementById('wallets');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  const openMySqlSchemaModal = async () => {
    setSchemaModalOpen(true);
    if (!schemaSqlText) {
      try {
        const res = await fetch('/api/schema-sql');
        const data = await res.json();
        if (data.sql) setSchemaSqlText(data.sql);
      } catch {
        setSchemaSqlText('-- Unable to load schema.sql');
      }
    }
  };

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(label);
    setTimeout(() => setCopiedText(null), 2000);
  };

  const activeCsvColumns = useMemo(
    () => CSV_EXPORT_COLUMNS.filter((col) => selectedCsvColumns[col.key]),
    [selectedCsvColumns]
  );

  const visiblePrintTableColCount = useMemo(() => {
    let count = 0;
    if (selectedCsvColumns.tx_id) count += 1;
    if (selectedCsvColumns.contract_address) count += 1;
    if (selectedCsvColumns.batch_epoch) count += 1;
    if (selectedCsvColumns.ledger_environment) count += 1;
    if (selectedCsvColumns.tx_type) count += 1;
    if (selectedCsvColumns.amount) count += 1;
    if (selectedCsvColumns.status) count += 1;
    if (selectedCsvColumns.sender_wallet || selectedCsvColumns.receiver_wallet) count += 1;
    if (selectedCsvColumns.created_at) count += 1;
    return Math.max(1, count);
  }, [selectedCsvColumns]);

  const toggleCsvColumn = (key: CsvColumnKey) => {
    setSelectedCsvColumns((prev) => {
      const nextVal = !prev[key];
      const nextState = { ...prev, [key]: nextVal };
      const anySelected = Object.values(nextState).some(Boolean);
      const anyTableColVisible =
        nextState.tx_id ||
        nextState.contract_address ||
        nextState.batch_epoch ||
        nextState.ledger_environment ||
        nextState.tx_type ||
        nextState.amount ||
        nextState.status ||
        nextState.sender_wallet ||
        nextState.receiver_wallet ||
        nextState.created_at;
      if (!anySelected || !anyTableColVisible) return prev;
      return nextState;
    });
  };

  const handleExportTransactionsCsv = (
    highValueOnly: boolean = csvHighValueOnly,
    customRows?: LedgerTransaction[]
  ) => {
    const baseRows = customRows ?? sortedExplorerTransactions;
    const targetRows =
      !customRows && highValueOnly
        ? baseRows.filter((tx) => decimalToUnits(tx.amount) >= HIGH_VALUE_AUDIT_UNITS)
        : baseRows;

    if (targetRows.length === 0 || activeCsvColumns.length === 0) return;

    const escapeCsvField = (value: string | null | undefined): string => {
      const str = value == null ? '' : String(value);
      if (str.includes('"') || str.includes(',') || str.includes('\n') || str.includes('\r')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const headers = activeCsvColumns.map((col) => col.csvHeader);

    const rows = targetRows.map((tx) => {
      const isHighVal = decimalToUnits(tx.amount) >= HIGH_VALUE_AUDIT_UNITS;
      const isFlagged = Boolean(flaggedTxIds[tx.tx_id]);
      const batchInfo = resolveLedgerBatchInfo(tx);
      const valueMap: Record<CsvColumnKey, string> = {
        tx_id: tx.tx_id,
        contract_address:
          tx.contract_address ||
          overview?.tokenInfo.contract_address ||
          '0x71C8A1D3b28E3A759f20E2DbE08f906471E2D4F6',
        batch_epoch: batchInfo.combinedCsvValue,
        ledger_environment: tx.ledger_environment,
        tx_type: tx.tx_type,
        amount: tx.amount,
        fee: tx.fee,
        high_value_flag: isFlagged
          ? `${isHighVal ? 'HIGH_VALUE_AUDIT_THRESHOLD_MET' : 'STANDARD'} | FLAGGED_FOR_REVIEW`
          : isHighVal
          ? 'HIGH_VALUE_AUDIT_THRESHOLD_MET'
          : 'STANDARD',
        status: isFlagged ? `${tx.status} (FLAGGED_FOR_REVIEW)` : tx.status,
        sender_wallet: tx.sender_wallet,
        receiver_wallet: tx.receiver_wallet,
        user_id_reference: tx.user_id_reference || '',
        memo: tx.memo,
        created_at: tx.created_at,
      };
      return activeCsvColumns
        .map((col) => escapeCsvField(valueMap[col.key]))
        .join(',');
    });

    const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const dateStamp = new Date().toISOString().slice(0, 10);
    const filePrefix = customRows
      ? 'flyx-insight-selected-audit-export'
      : highValueOnly
      ? 'flyx-insight-high-value-audit-export'
      : 'flyx-insight-ledger-export';
    const filename = `${filePrefix}-${dateStamp}.csv`;
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    // Play subtle Web3 success chime
    playExportSuccessSound();

    // Trigger confirmation toast notification
    if (csvExportToastTimerRef.current) {
      clearTimeout(csvExportToastTimerRef.current);
    }
    const exportLabel = customRows
      ? `Selected Items (${targetRows.length})`
      : highValueOnly
      ? `High-Value Audits (≥ 10,000 FLYX)`
      : `Complete Public Ledger`;

    setCsvExportToast({
      id: `toast-${Date.now()}`,
      filename,
      rowCount: targetRows.length,
      columnCount: activeCsvColumns.length,
      exportType: exportLabel,
      timestamp: new Date().toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      }),
    });

    csvExportToastTimerRef.current = setTimeout(() => {
      setCsvExportToast(null);
    }, 5500);
  };

  const toggleExplorerSort = (field: SortField) => {
    if (txSortField === field) {
      setTxSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setTxSortField(field);
      setTxSortDirection(field === 'tx_type' ? 'asc' : 'desc');
    }
    setTxListVersion((v) => v + 1);
  };

  const toggleWalletHistorySort = (field: SortField) => {
    if (walletSortField === field) {
      setWalletSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setWalletSortField(field);
      setWalletSortDirection(field === 'tx_type' ? 'asc' : 'desc');
    }
  };

  const availableBatchEpochOptions = useMemo(() => {
    const map = new Map<string, { batchId: string; epochLabel: string; count: number }>();
    const sourceList =
      overview?.recentTransactions && overview.recentTransactions.length > 0
        ? overview.recentTransactions
        : filteredTransactions;
    for (const tx of sourceList) {
      const info = resolveLedgerBatchInfo(tx);
      const existing = map.get(info.batchId);
      if (existing) {
        existing.count += 1;
      } else {
        map.set(info.batchId, {
          batchId: info.batchId,
          epochLabel: info.epochLabel,
          count: 1,
        });
      }
    }
    return Array.from(map.values()).sort((a, b) => b.batchId.localeCompare(a.batchId));
  }, [overview?.recentTransactions, filteredTransactions]);

  const sortedExplorerTransactions = useMemo(() => {
    let scoped = txAuditOnly
      ? filteredTransactions.filter(isAuditOnlyTransaction)
      : filteredTransactions;
    if (txBatchEpochFilter !== 'ALL') {
      scoped = scoped.filter(
        (tx) => resolveLedgerBatchInfo(tx).batchId === txBatchEpochFilter
      );
    }
    return sortLedgerTransactions(scoped, txSortField, txSortDirection);
  }, [filteredTransactions, txAuditOnly, txBatchEpochFilter, txSortField, txSortDirection]);

  const totalPages = useMemo(() => {
    if (pageSize === 'ALL') return 1;
    return Math.max(1, Math.ceil(sortedExplorerTransactions.length / pageSize));
  }, [sortedExplorerTransactions.length, pageSize]);

  const paginatedExplorerTransactions = useMemo(() => {
    if (pageSize === 'ALL') return sortedExplorerTransactions;
    const start = (currentPage - 1) * pageSize;
    return sortedExplorerTransactions.slice(start, start + pageSize);
  }, [sortedExplorerTransactions, currentPage, pageSize]);

  const highValueCsvRowsCount = useMemo(
    () =>
      sortedExplorerTransactions.filter(
        (tx) => decimalToUnits(tx.amount) >= HIGH_VALUE_AUDIT_UNITS
      ).length,
    [sortedExplorerTransactions]
  );

  const selectedVisibleTransactions = useMemo(
    () => sortedExplorerTransactions.filter((tx) => Boolean(selectedTxIds[tx.tx_id])),
    [sortedExplorerTransactions, selectedTxIds]
  );

  const allVisibleSelected =
    sortedExplorerTransactions.length > 0 &&
    selectedVisibleTransactions.length === sortedExplorerTransactions.length;

  const selectedTransactionsVolume = useMemo(() => {
    let sumUnits = 0n;
    for (const tx of selectedVisibleTransactions) {
      sumUnits += decimalToUnits(tx.amount);
    }
    return unitsToDecimal(sumUnits);
  }, [selectedVisibleTransactions]);

  const allSelectedAreFlagged =
    selectedVisibleTransactions.length > 0 &&
    selectedVisibleTransactions.every((tx) => Boolean(flaggedTxIds[tx.tx_id]));

  const flaggedVisibleCount = useMemo(
    () => sortedExplorerTransactions.filter((tx) => Boolean(flaggedTxIds[tx.tx_id])).length,
    [sortedExplorerTransactions, flaggedTxIds]
  );

  const toggleSelectTransaction = (txId: string) => {
    setSelectedTxIds((prev) => ({
      ...prev,
      [txId]: !prev[txId],
    }));
  };

  const toggleExpandTransaction = (txId: string) => {
    setExpandedTxIds((prev) => ({
      ...prev,
      [txId]: !prev[txId],
    }));
  };

  const toggleSelectAllVisible = () => {
    if (allVisibleSelected) {
      setSelectedTxIds((prev) => {
        const next = { ...prev };
        for (const tx of sortedExplorerTransactions) {
          delete next[tx.tx_id];
        }
        return next;
      });
    } else {
      setSelectedTxIds((prev) => {
        const next = { ...prev };
        for (const tx of sortedExplorerTransactions) {
          next[tx.tx_id] = true;
        }
        return next;
      });
    }
  };

  const handleCopySelectedTxIds = () => {
    if (selectedVisibleTransactions.length === 0) return;
    const idsText = selectedVisibleTransactions.map((tx) => tx.tx_id).join(', ');
    handleCopy(idsText, 'bulk-copy-tx-ids');
  };

  const handleToggleFlagSelectedForReview = () => {
    if (selectedVisibleTransactions.length === 0) return;
    setFlaggedTxIds((prev) => {
      const next = { ...prev };
      const shouldFlag = !allSelectedAreFlagged;
      for (const tx of selectedVisibleTransactions) {
        if (shouldFlag) {
          next[tx.tx_id] = true;
        } else {
          delete next[tx.tx_id];
        }
      }
      return next;
    });
  };

  const explorerSearchSummary = useMemo(() => {
    const count = sortedExplorerTransactions.length;
    if (count === 0) {
      return {
        count: 0,
        totalVolume: '0.00000000',
        averageSize: '0.00000000',
      };
    }
    let totalUnits = 0n;
    for (const tx of sortedExplorerTransactions) {
      totalUnits += decimalToUnits(tx.amount);
    }
    const avgUnits = totalUnits / BigInt(count);
    return {
      count,
      totalVolume: unitsToDecimal(totalUnits),
      averageSize: unitsToDecimal(avgUnits),
    };
  }, [sortedExplorerTransactions]);

  const sortedWalletTransactions = useMemo(
    () =>
      walletResult
        ? sortLedgerTransactions(walletResult.transactions, walletSortField, walletSortDirection)
        : [],
    [walletResult, walletSortField, walletSortDirection]
  );

  const walletMetadataMap = useMemo(() => {
    const map = new Map<string, PublicWalletRecord>();
    if (overview?.publicWallets) {
      for (const w of overview.publicWallets) {
        map.set(w.public_address.toLowerCase(), w);
      }
    }
    return map;
  }, [overview]);

  const resolveWalletMetadata = (address: string) => {
    const found = walletMetadataMap.get(address.toLowerCase());
    if (found) {
      return {
        label: found.label,
        accountId: found.account_identifier,
        walletType: found.wallet_type,
        status: found.account_status,
        balance: found.balance,
        txCount: found.transaction_count,
      };
    }
    const isVault = address.toUpperCase().startsWith('FLYX-VAULT-');
    return {
      label: isVault ? 'Official Ecosystem Custodial Vault' : 'Verified FlyXCoin.com Member Wallet',
      accountId: isVault ? 'SYSTEM-VAULT' : 'PUBLIC-LEDGER-ACCT',
      walletType: isVault ? 'TREASURY_VAULT' : 'USER_WALLET',
      status: 'ACTIVE',
      balance: null,
      txCount: null,
    };
  };

  const renderSortIcon = (activeField: SortField, targetField: SortField, dir: SortDirection) => {
    if (activeField !== targetField) {
      return <ArrowUpDown className="w-3.5 h-3.5 opacity-45 shrink-0" />;
    }
    return dir === 'asc' ? (
      <ArrowUp className="w-3.5 h-3.5 text-[#D4AF37] shrink-0" />
    ) : (
      <ArrowDown className="w-3.5 h-3.5 text-[#D4AF37] shrink-0" />
    );
  };

  if (loading || !overview) {
    return (
      <div
        className={`min-h-screen flex flex-col items-center justify-center p-6 ${
          isDark ? 'bg-[#090A0F] text-[#F5F2EB]' : 'bg-[#FAF8F5] text-[#111318]'
        }`}
      >
        <div className="w-12 h-12 rounded-full border-2 border-[#D4AF37] border-t-transparent animate-spin mb-4" />
        <div className="font-display text-lg font-semibold tracking-wider text-[#D4AF37]">
          FLYX Insight
        </div>
        <p className="text-xs text-[#9CA3AF] mt-1 font-mono">
          Synchronizing Normalized DECIMAL(36,8) Off-Chain Ledger...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-[#090A0F] text-[#F5F2EB]">
        <div className="max-w-md p-6 rounded-xl border border-red-500/30 bg-[#10131C] text-center space-y-3">
          <div className="text-red-400 font-semibold">Portal Synchronization Error</div>
          <p className="text-xs text-[#9CA3AF]">{error}</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="px-4 py-2 rounded-lg bg-[#D4AF37] text-[#090A0F] text-xs font-semibold"
          >
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  const activeWhitepaperSection =
    overview.whitepaper.find((w) => w.slug === activeWpSlug) || overview.whitepaper[0];
  const activeRoadmapPhase =
    overview.roadmap.find((p) => p.phase_number === activePhaseNumber) || overview.roadmap[1];

  return (
    <div
      className={`min-h-screen relative overflow-hidden transition-colors duration-200 ${
        isDark ? 'bg-[#080B11] text-[#F8FAFC]' : 'bg-[#F8FAFC] text-[#0F172A]'
      }`}
    >
      <Web3Background theme={theme} />

      {/* =====================================================================
          TOP BAR CONTRACT (Strictly 1-Row, 3-Zone Header matching FlyXCoin.com)
          Zone 1: Official FLYX Insight wordmark
          Zone 2: Clean text navigation links
          Zone 3: Theme toggle, Admin Console, and FlyXCoin.com Official Link
      ====================================================================== */}
      <header
        className={`sticky top-0 z-40 border-b backdrop-blur-md transition-colors ${
          isDark
            ? 'bg-[#0B0F19]/90 border-slate-800/80 text-white'
            : 'bg-white/95 text-slate-900 border-slate-200 shadow-sm'
        }`}
      >
        <div className="max-w-[1380px] mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          {/* Zone 1: Single wordmark matching FlyXCoin.com Gold + Blue typography */}
          <a
            href="#overview"
            className="font-display text-lg sm:text-xl font-extrabold tracking-wide whitespace-nowrap shrink-0"
          >
            <span className="text-[#FFB800]">FLYX</span>{' '}
            <span className="text-[#3B82F6]">INSIGHT</span>
          </a>

          {/* Zone 2: Single-Line Navigation Links */}
          <nav className="hidden lg:flex items-center gap-6 text-sm font-medium text-slate-200">
            <a
              href="#overview"
              className="hover:text-[#FFB800] transition-colors whitespace-nowrap"
            >
              Overview
            </a>
            <a
              href="#kpi-section"
              className="hover:text-[#FFB800] transition-colors whitespace-nowrap"
            >
              KPIs
            </a>
            <a
              href="#contract"
              className="hover:text-[#FFB800] transition-colors whitespace-nowrap"
            >
              Contract
            </a>
            <a
              href="#tokenomics"
              className="hover:text-[#FFB800] transition-colors whitespace-nowrap"
            >
              Tokenomics
            </a>
            <a
              href="#explorer"
              className="hover:text-[#FFB800] transition-colors whitespace-nowrap"
            >
              Ledger Explorer
            </a>
            <a
              href="#smart-contract"
              className="hover:text-[#FFB800] transition-colors whitespace-nowrap"
            >
              Smart Contracts
            </a>
            <a
              href="#wallets"
              className="hover:text-[#FFB800] transition-colors whitespace-nowrap"
            >
              Wallet Lookup
            </a>
            <a
              href="#whitepaper"
              className="hover:text-[#FFB800] transition-colors whitespace-nowrap"
            >
              Whitepaper & Roadmap
            </a>
          </nav>

          {/* Zone 3: Primary Actions */}
          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => setTheme(isDark ? 'light' : 'dark')}
              className="p-2 rounded-lg border border-white/15 text-slate-300 hover:text-[#FFB800] hover:border-[#FFB800]/50 transition-colors"
              title={isDark ? 'Switch to Light Mode' : 'Switch to Royal Navy Dark Mode'}
              aria-label="Toggle color theme"
            >
              {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            <button
              type="button"
              onClick={() => setAdminOpen(true)}
              className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold border border-[#FFB800]/40 bg-[#0B162C] text-[#FFB800] hover:bg-[#FFB800]/10 transition-colors whitespace-nowrap"
            >
              <Lock className="w-3.5 h-3.5 text-[#FFB800]" />
              <span>Admin Console</span>
            </button>

            <a
              href={overview.tokenInfo.main_portal_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold bg-[#1D63FF] text-white hover:bg-[#2563EB] shadow-sm transition-colors whitespace-nowrap"
            >
              <span>FlyXCoin.com</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </a>

            <button
              type="button"
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              className="lg:hidden p-2 rounded-lg border border-white/15 text-white"
              aria-label="Open navigation menu"
            >
              {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div
            className={`lg:hidden border-t px-4 py-4 space-y-3 ${
              isDark ? 'bg-[#0F1219] border-white/10' : 'bg-white border-neutral-200'
            }`}
          >
            <div className="flex flex-col space-y-2 text-sm font-medium">
              <a
                href="#overview"
                onClick={() => setMobileMenuOpen(false)}
                className="py-1.5 hover:text-[#D4AF37]"
              >
                Overview
              </a>
              <a
                href="#kpi-section"
                onClick={() => setMobileMenuOpen(false)}
                className="py-1.5 hover:text-[#D4AF37]"
              >
                KPIs
              </a>
              <a
                href="#contract"
                onClick={() => setMobileMenuOpen(false)}
                className="py-1.5 hover:text-[#D4AF37]"
              >
                Contract
              </a>
              <a
                href="#tokenomics"
                onClick={() => setMobileMenuOpen(false)}
                className="py-1.5 hover:text-[#D4AF37]"
              >
                Tokenomics
              </a>
              <a
                href="#explorer"
                onClick={() => setMobileMenuOpen(false)}
                className="py-1.5 hover:text-[#D4AF37]"
              >
                Ledger Explorer
              </a>
              <a
                href="#smart-contract"
                onClick={() => setMobileMenuOpen(false)}
                className="py-1.5 hover:text-[#D4AF37]"
              >
                Smart Contracts
              </a>
              <a
                href="#wallets"
                onClick={() => setMobileMenuOpen(false)}
                className="py-1.5 hover:text-[#D4AF37]"
              >
                Wallet Lookup
              </a>
              <a
                href="#whitepaper"
                onClick={() => setMobileMenuOpen(false)}
                className="py-1.5 hover:text-[#D4AF37]"
              >
                Whitepaper & Roadmap
              </a>
            </div>
            <div className="pt-2 border-t border-white/10 flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  setAdminOpen(true);
                }}
                className="w-full py-2 px-3 rounded-lg border border-[#D4AF37]/40 text-xs font-semibold text-[#D4AF37]"
              >
                Open Authorized Admin Console
              </button>
            </div>
          </div>
        )}
      </header>

      <main className="max-w-[1380px] mx-auto px-4 sm:px-6 lg:px-8 space-y-20 py-10 sm:py-14">
        {/* =====================================================================
            SECTION 1: HERO & OFFICIAL ECOSYSTEM TRANSPARENCY OVERVIEW
            Styled in Deep Royal Navy (#0B162C), Gold (#FFB800), and Electric Blue (#1D63FF)
            matching FlyXCoin.com
        ====================================================================== */}
        <section id="overview" className="space-y-10">
          <div className="rounded-3xl bg-[#0B162C] text-white border border-[#1E3A8A]/50 p-6 sm:p-10 shadow-2xl">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
              {/* Left Column: FlyXCoin.com Matching Modern Sans-Serif Copy */}
              <div className="lg:col-span-7 space-y-6">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
                    <span className="relative flex h-2 w-2">
                      <span
                        className={`absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75 ${
                          isSyncPulsing ? 'animate-ping scale-125' : 'animate-ping'
                        }`}
                      />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-400" />
                    </span>
                    <span>LIVE SYNC · {lastSyncTime} UTC</span>
                  </span>
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-mono bg-blue-500/10 border border-blue-500/25 text-blue-300">
                    STATUS: Sovereign Pre-Mainnet Anchor
                  </span>
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-mono bg-amber-500/10 border border-amber-500/25 text-amber-300">
                    PRECISION: DECIMAL(36,8)
                  </span>
                </div>

                <div className="space-y-2">
                  <div className="font-mono text-xs font-bold uppercase tracking-widest text-[#FFB800] flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-[#FFB800]" />
                    <span>Transparent. Verifiable. Connected.</span>
                  </div>
                  <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight leading-[1.12] text-white">
                    FLYX Insight <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-sky-300 to-amber-300">— Official Transparency Portal</span>
                  </h1>
                </div>

                <p className="text-sm sm:text-base leading-relaxed max-w-2xl text-slate-300">
                  Connected directly to{' '}
                  <a
                    href={overview.tokenInfo.main_portal_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#FFB800] font-semibold underline underline-offset-4 hover:opacity-80"
                  >
                    FlyXCoin.com
                  </a>{' '}
                  — the Future of Digital Gaming & Cloud Mining. Verify real-time FLYX token
                  supply, reserve allocations, public wallet balances, and off-chain internal
                  ledger transactions backed by exact{' '}
                  <code className="font-mono text-xs px-1.5 py-0.5 rounded bg-[#FFB800]/15 text-[#FFB800]">
                    DECIMAL(36,8)
                  </code>{' '}
                  MySQL precision.
                </p>

                {/* Primary Hero Actions matching FlyXCoin.com Blue, Gold, and Emerald buttons */}
                <div className="flex flex-wrap items-center gap-3 pt-1">
                  <a
                    href="#wallets"
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#1D63FF] text-white text-xs sm:text-sm font-bold hover:bg-[#2563EB] transition-colors whitespace-nowrap shadow-md"
                  >
                    <Wallet className="w-4 h-4" />
                    <span>Public Wallet Lookup</span>
                  </a>
                  <a
                    href="#explorer"
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full border border-[#FFB800]/50 bg-[#0F1E3A] text-[#FFB800] text-xs sm:text-sm font-bold hover:bg-[#FFB800]/10 transition-colors whitespace-nowrap"
                  >
                    <span>Mining & Ledger Explorer</span>
                    <ArrowRight className="w-4 h-4" />
                  </a>
                  <a
                    href="#tokenomics"
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#0D7A5F] text-white text-xs sm:text-sm font-bold hover:bg-[#059669] transition-colors whitespace-nowrap"
                  >
                    <span>Tokenomics & Reserves</span>
                  </a>
                  <button
                    type="button"
                    onClick={openMySqlSchemaModal}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#E59800] text-[#081021] text-xs sm:text-sm font-extrabold hover:bg-[#FFB800] transition-colors whitespace-nowrap"
                  >
                    <Database className="w-4 h-4" />
                    <span>MySQL Schema</span>
                  </button>
                </div>

                {/* Bi-Directional Ecosystem Connection Banner */}
                <div className="p-4 rounded-2xl bg-[#0F1E3A]/90 border border-[#1E3A8A]/60">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-xs font-bold text-[#FFB800] tracking-wider">
                        <Globe className="w-4 h-4 text-[#FFB800]" />
                        <span>FLYXCOIN — THE FUTURE OF DIGITAL GAMING & MINING</span>
                      </div>
                      <p className="text-xs text-slate-300">
                        Main Application:{' '}
                        <a
                          href={overview.tokenInfo.main_portal_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-mono font-semibold text-[#FFB800] hover:underline"
                        >
                          FlyXCoin.com ↗
                        </a>{' '}
                        ↔ Official Transparency Portal:{' '}
                        <span className="font-mono font-semibold text-[#60A5FA]">
                          FLYX Insight
                        </span>
                      </p>
                    </div>
                    <div className="text-left sm:text-right font-mono text-[11px] text-emerald-400 space-y-0.5">
                      <div className="inline-flex items-center gap-2 sm:justify-end">
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
                        </span>
                        <span>
                          {isSyncPulsing
                            ? 'Synchronizing Off-Chain Ledger...'
                            : `Network Active · Synced ${lastSyncTime} UTC`}
                        </span>
                      </div>
                      <div className="text-slate-400">
                        {overview.tokenInfo.blockchain_status}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column: Official 3D Rotating FLYX Coin Card */}
              <div className="lg:col-span-5">
                <div className="rounded-2xl bg-[#0F1E3A]/90 border border-[#1E3A8A]/70 p-4 sm:p-6 shadow-xl">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-bold text-[#FFB800] tracking-wider">
                      ★ OFFICIAL FLYX COIN 3D ★
                    </span>
                    <span className="inline-flex items-center gap-1.5 font-mono text-emerald-400 font-semibold">
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
                      </span>
                      <span>{isSyncPulsing ? 'Syncing...' : 'Live Sync'}</span>
                    </span>
                  </div>
                  <FlyxCoin3D theme={theme} />
                  <div className="mt-3 pt-3 border-t border-white/10 grid grid-cols-3 gap-2 text-center">
                    <div>
                      <div className="text-[10px] text-slate-400 font-medium">LEDGER MODE</div>
                      <div className="font-mono text-xs font-bold text-white mt-0.5">
                        Off-Chain SQL
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-400 font-medium">PRECISION</div>
                      <div className="font-mono text-xs font-bold text-[#FFB800] mt-0.5">
                        DECIMAL(36,8)
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-400 font-medium">ON-CHAIN STATUS</div>
                      <div className="font-mono text-xs font-bold text-amber-400 mt-0.5">
                        Phase 4/5 Planned
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

        </section>

        {/* =====================================================================
            SECTION 2: DYNAMIC WEB3 KPI TELEMETRY CARDS (8 Animated Metrics)
        ====================================================================== */}
        <Web3KpiSection
          overview={overview}
          lastSyncTime={lastSyncTime}
          isSyncPulsing={isSyncPulsing}
          theme={theme}
        />

        {/* =====================================================================
            SECTION 3: OFFICIAL FLYX TOKEN CONTRACT DEDICATED SECTION
        ====================================================================== */}
        <TokenContractSection
          tokenInfo={overview.tokenInfo}
          verificationResult={overview.supplyVerification}
          onViewExplorer={() => {
            const el = document.getElementById('explorer');
            if (el) el.scrollIntoView({ behavior: 'smooth' });
          }}
          onCopyAddress={(address) => handleCopy(address, 'token-contract-section')}
          copied={copiedText === 'token-contract-section'}
          theme={theme}
        />

        {/* =====================================================================
            MARKET SETTLEMENT RATE & DYNAMIC NETWORK TELEMETRY PANELS
        ====================================================================== */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <LivePricePanel
            mainPortalUrl={overview.tokenInfo.main_portal_url}
            theme={theme}
          />

          <NetworkStatisticsPanel
            overview={overview}
            ledgerLatencyMs={ledgerLatencyMs}
            lastSyncTime={lastSyncTime}
            isSyncPulsing={isSyncPulsing}
            onManualPing={triggerLedgerHeartbeat}
            theme={theme}
          />
        </div>

        {/* =====================================================================
            SECTION 2: PUBLIC TOKENOMICS & RESERVE ALLOCATION DASHBOARD
        ====================================================================== */}
        <section id="tokenomics" className="space-y-8 scroll-mt-20">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-white/10 pb-5">
            <div className="space-y-1.5">
              <div className="text-xs font-medium text-[#D4AF37]">
                Database-Driven Supply & Custodial Breakdown
              </div>
              <h2 className="font-display text-2xl sm:text-3xl font-bold">
                Public Tokenomics & Reserve Allocations
              </h2>
            </div>
            <div className="flex items-center gap-2 text-xs font-mono text-emerald-400">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{overview.supplyVerification.verificationProof}</span>
            </div>
          </div>

          {/* Horizontal Stacked Supply Distribution Bar */}
          <div
            className={`p-6 rounded-xl border space-y-4 ${
              isDark ? 'bg-[#10131C] border-white/10' : 'bg-white border-neutral-200 shadow-sm'
            }`}
          >
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
              <span className="font-semibold">
                1,000,000,000.00000000 FLYX Official Allocation Breakdown
              </span>
              <span className="font-mono text-[#9CA3AF]">
                Precision: MySQL DECIMAL(36,8) · Zero Floating-Point Math
              </span>
            </div>

            <div className="w-full h-5 rounded-lg overflow-hidden flex bg-black/40 p-0.5 gap-0.5">
              {overview.allocations.map((alloc) => (
                <div
                  key={alloc.id}
                  style={{
                    width: `${alloc.percentage_share}%`,
                    backgroundColor: alloc.color_hex,
                  }}
                  className="h-full first:rounded-l-md last:rounded-r-md transition-opacity hover:opacity-85"
                  title={`${alloc.category_name}: ${alloc.percentage_share}% (${formatFlyxAmount(
                    alloc.allocated_amount,
                    0
                  )} FLYX)`}
                />
              ))}
            </div>

            {/* Legend Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 pt-2">
              {overview.allocations.map((alloc) => (
                <div key={alloc.id} className="space-y-1">
                  <div className="flex items-center gap-2 text-xs font-medium">
                    <span
                      className="w-2.5 h-2.5 rounded-sm shrink-0"
                      style={{ backgroundColor: alloc.color_hex }}
                    />
                    <span className="truncate">{alloc.category_name}</span>
                  </div>
                  <div className="font-mono text-sm font-semibold tabular-nums">
                    {alloc.percentage_share}%
                  </div>
                  <div className="font-mono text-[11px] text-[#9CA3AF] tabular-nums">
                    {formatFlyxAmount(alloc.allocated_amount, 0)} FLYX
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Detailed Allocation Custody & Vesting Schedule Table */}
          <div
            className={`rounded-xl border overflow-hidden ${
              isDark ? 'bg-[#10131C] border-white/10' : 'bg-white border-neutral-200 shadow-sm'
            }`}
          >
            <div className="px-6 py-4 border-b border-white/10 flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-semibold">
                Official Allocation Pools, Custodial Vaults & Lockup Policies
              </h3>
              <span className="text-xs text-[#9CA3AF]">
                Click any Custodial Vault Address to inspect live balance in Wallet Lookup
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead
                  className={`border-b ${
                    isDark
                      ? 'bg-[#161A26] border-white/10 text-[#9CA3AF]'
                      : 'bg-neutral-100 border-neutral-200 text-neutral-600'
                  }`}
                >
                  <tr>
                    <th className="py-3.5 px-4 font-semibold">Allocation Pool</th>
                    <th className="py-3.5 px-4 font-semibold text-right">Share</th>
                    <th className="py-3.5 px-4 font-semibold text-right">Total Allocated (FLYX)</th>
                    <th className="py-3.5 px-4 font-semibold text-right">Distributed (FLYX)</th>
                    <th className="py-3.5 px-4 font-semibold text-right">
                      Remaining Reserve (FLYX)
                    </th>
                    <th className="py-3.5 px-4 font-semibold">Custodial Vault Identifier</th>
                    <th className="py-3.5 px-4 font-semibold">Vesting & Lockup Policy</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {overview.allocations.map((alloc) => (
                    <tr
                      key={alloc.id}
                      className={`transition-colors ${
                        isDark ? 'hover:bg-white/[0.02]' : 'hover:bg-neutral-50'
                      }`}
                    >
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-sm">{alloc.category_name}</div>
                        <div className="text-[11px] text-[#9CA3AF] mt-0.5 max-w-xs">
                          {alloc.description}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-mono font-semibold text-right text-[#D4AF37] tabular-nums">
                        {alloc.percentage_share}%
                      </td>
                      <td className="py-3.5 px-4 font-mono text-right tabular-nums">
                        {formatFlyxAmount(alloc.allocated_amount, 2)}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-right text-emerald-400 tabular-nums">
                        {formatFlyxAmount(alloc.distributed_amount, 2)}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-right tabular-nums font-medium">
                        {formatFlyxAmount(alloc.remaining_amount, 2)}
                      </td>
                      <td className="py-3.5 px-4">
                        <button
                          type="button"
                          onClick={() => inspectWalletAndScroll(alloc.custody_wallet_address)}
                          className="font-mono text-xs text-[#D4AF37] hover:underline inline-flex items-center gap-1"
                        >
                          <span>{alloc.custody_wallet_address}</span>
                          <ArrowUpRight className="w-3 h-3" />
                        </button>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-medium">{alloc.lockup_policy}</div>
                        <div className="text-[11px] text-[#9CA3AF] mt-0.5">
                          {alloc.release_schedule}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* =====================================================================
            SECTION 3: PUBLIC TRANSACTION EXPLORER (OFF-CHAIN / INTERNAL LEDGER)
        ====================================================================== */}
        <section id="explorer" className="space-y-6 scroll-mt-20">
          {/* Formal Print-Only Institutional Audit Header */}
          <div className="print-only border-b-2 border-[#0B162C] pb-4 mb-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-[10px] font-mono uppercase tracking-wider text-slate-600">
                  FLYX Insight · Official Ecosystem Transparency & Audit Report (FlyXCoin.com)
                </div>
                <h1 className="text-xl font-bold text-[#0B162C] mt-0.5">
                  Public Off-Chain Internal Ledger Audit Verification Report
                </h1>
                <p className="text-xs text-slate-600 mt-1">
                  Ledger Precision: MySQL DECIMAL(36,8) Fixed-Point Arithmetic · Classification:
                  Off-Chain / Internal Ledger (Pre-Mainnet)
                </p>
              </div>
              <div className="text-right font-mono text-[10px] text-slate-700 space-y-0.5">
                <div>Generated: {new Date().toISOString().replace('T', ' ').slice(0, 19)} UTC</div>
                <div>Matching Records: {sortedExplorerTransactions.length}</div>
                <div>
                  Filter Query: {txQuery.trim() ? `"${txQuery.trim()}"` : 'All Identifiers'} · Type:{' '}
                  {txTypeFilter} · Batch: {txBatchEpochFilter} · Scope:{' '}
                  {txAuditOnly ? 'Audit Only (High-Value & System)' : 'All Public'}
                </div>
                <div>
                  Sort Order: {txSortField.toUpperCase()} ({txSortDirection.toUpperCase()})
                </div>
              </div>
            </div>
          </div>

          <div className="no-print flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-white/10 pb-5">
            <div className="space-y-1.5">
              <div className="text-xs font-medium text-[#D4AF37]">
                Searchable MySQL Project Ledger
              </div>
              <h2 className="font-display text-2xl sm:text-3xl font-bold">
                Public Transaction & Distribution Explorer
              </h2>
            </div>
            <div className="text-xs text-amber-400 font-mono">
              Ledger Environment: Off-Chain / Internal Ledger (Pre-Mainnet)
            </div>
          </div>

          {/* Search & Multi-Parameter Filter Bar */}
          <form
            onSubmit={handleSearchTransactions}
            className={`no-print p-5 rounded-xl border space-y-4 ${
              isDark ? 'bg-[#10131C] border-white/10' : 'bg-white border-neutral-200 shadow-sm'
            }`}
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
              <div className="sm:col-span-2 lg:col-span-2">
                <label className="block text-[11px] text-[#9CA3AF] mb-1">
                  Search by Transaction ID, Wallet Address, or User ID
                </label>
                <div className="relative">
                  <Search className="w-4 h-4 text-[#9CA3AF] absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    ref={txSearchInputRef}
                    type="text"
                    value={txQuery}
                    onChange={(e) => setTxQuery(e.target.value)}
                    placeholder="e.g. FLYX-LEDGER-20261005-009841 or USR-FLYX-8849..."
                    className={`w-full pl-9 pr-12 py-2 rounded-lg text-xs font-mono border focus:outline-none focus:border-[#D4AF37] ${
                      isDark
                        ? 'bg-black/40 border-white/15 text-[#F5F2EB]'
                        : 'bg-neutral-50 border-neutral-300 text-neutral-900'
                    }`}
                  />
                  <kbd
                    title="Press '/' to focus transaction search"
                    className="hidden sm:inline-block pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 px-1.5 py-0.5 text-[10px] font-mono rounded border border-white/15 text-[#9CA3AF] bg-black/30"
                  >
                    /
                  </kbd>
                </div>
              </div>

              <div>
                <label className="block text-[11px] text-[#9CA3AF] mb-1">Transaction Type</label>
                <select
                  value={txTypeFilter}
                  onChange={(e) => setTxTypeFilter(e.target.value)}
                  className={`w-full px-3 py-2 rounded-lg text-xs border focus:outline-none focus:border-[#D4AF37] ${
                    isDark
                      ? 'bg-[#161A26] border-white/15 text-[#F5F2EB]'
                      : 'bg-neutral-50 border-neutral-300 text-neutral-900'
                  }`}
                >
                  <option value="ALL">All Ledger Types</option>
                  <option value="MINING_DISTRIBUTION">Mining Distribution</option>
                  <option value="USER_TRANSFER">User Transfer</option>
                  <option value="TREASURY_ALLOCATION">Treasury Allocation</option>
                  <option value="ECOSYSTEM_REWARD">Ecosystem Reward</option>
                  <option value="LIQUIDITY_PROVISION">Liquidity Provision</option>
                  <option value="TEAM_VESTING_LOCK">Team Vesting Lock</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] text-[#9CA3AF] mb-1">Batch / Epoch Filter</label>
                <select
                  value={txBatchEpochFilter}
                  onChange={(e) => {
                    setTxBatchEpochFilter(e.target.value);
                    setTxListVersion((v) => v + 1);
                  }}
                  className={`w-full px-3 py-2 rounded-lg text-xs font-mono border focus:outline-none focus:border-[#D4AF37] ${
                    isDark
                      ? 'bg-[#161A26] border-white/15 text-[#F5F2EB]'
                      : 'bg-neutral-50 border-neutral-300 text-neutral-900'
                  }`}
                >
                  <option value="ALL">All Settlement Batches</option>
                  {availableBatchEpochOptions.map((opt) => (
                    <option key={opt.batchId} value={opt.batchId}>
                      {opt.batchId} ({opt.epochLabel} · {opt.count})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] text-[#9CA3AF] mb-1">Minimum Amount (FLYX)</label>
                <input
                  type="text"
                  value={txMinAmount}
                  onChange={(e) => setTxMinAmount(e.target.value)}
                  placeholder="e.g. 1000.00"
                  className={`w-full px-3 py-2 rounded-lg text-xs font-mono border focus:outline-none focus:border-[#D4AF37] ${
                    isDark
                      ? 'bg-black/40 border-white/15 text-[#F5F2EB]'
                      : 'bg-neutral-50 border-neutral-300 text-neutral-900'
                  }`}
                />
              </div>

              <div>
                <label className="block text-[11px] text-[#9CA3AF] mb-1">From Date</label>
                <input
                  type="date"
                  value={txDateFrom}
                  onChange={(e) => setTxDateFrom(e.target.value)}
                  className={`w-full px-3 py-2 rounded-lg text-xs font-mono border focus:outline-none focus:border-[#D4AF37] ${
                    isDark
                      ? 'bg-black/40 border-white/15 text-[#F5F2EB]'
                      : 'bg-neutral-50 border-neutral-300 text-neutral-900'
                  }`}
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  role="switch"
                  aria-checked={txAuditOnly}
                  onClick={() => {
                    setTxAuditOnly((prev) => !prev);
                    setTxListVersion((v) => v + 1);
                  }}
                  className={`inline-flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                    txAuditOnly
                      ? 'border-[#FFB800] bg-[#FFB800]/15 text-[#FFB800]'
                      : isDark
                      ? 'border-white/15 bg-black/30 text-slate-300 hover:border-white/30'
                      : 'border-neutral-300 bg-neutral-50 text-neutral-700 hover:bg-neutral-100'
                  }`}
                  title="Show only high-value transfers (>= 10,000 FLYX) and official system/vault distributions"
                >
                  <span
                    className={`relative inline-flex h-4 w-7 shrink-0 items-center rounded-full transition-colors ${
                      txAuditOnly ? 'bg-[#FFB800]' : 'bg-slate-600'
                    }`}
                  >
                    <span
                      className={`inline-block h-3 w-3 transform rounded-full bg-[#081021] transition-transform ${
                        txAuditOnly ? 'translate-x-3.5' : 'translate-x-0.5'
                      }`}
                    />
                  </span>
                  <span>Audit Only</span>
                  <span className="hidden sm:inline font-mono text-[10px] opacity-80">
                    (≥10k FLYX & System Distributions)
                  </span>
                </button>

                <button
                  type="button"
                  role="switch"
                  aria-checked={highlightHighValueRows}
                  onClick={() => setHighlightHighValueRows((prev) => !prev)}
                  className={`inline-flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                    highlightHighValueRows
                      ? 'border-[#D4AF37] bg-[#D4AF37]/15 text-[#D4AF37]'
                      : isDark
                      ? 'border-white/15 bg-black/30 text-slate-300 hover:border-white/30'
                      : 'border-neutral-300 bg-neutral-50 text-neutral-700 hover:bg-neutral-100'
                  }`}
                  title="Toggle gold border highlight (high-value-audit-row-border) on rows > 10,000 FLYX without filtering the table"
                >
                  <span
                    className={`relative inline-flex h-4 w-7 shrink-0 items-center rounded-full transition-colors ${
                      highlightHighValueRows ? 'bg-[#D4AF37]' : 'bg-slate-600'
                    }`}
                  >
                    <span
                      className={`inline-block h-3 w-3 transform rounded-full bg-[#081021] transition-transform ${
                        highlightHighValueRows ? 'translate-x-3.5' : 'translate-x-0.5'
                      }`}
                    />
                  </span>
                  <span>Highlight High-Value</span>
                  <span className="hidden sm:inline font-mono text-[10px] opacity-80">
                    (&gt;10k Gold Border)
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setTimestampFormat((prev) => (prev === 'relative' ? 'iso' : 'relative'))
                  }
                  className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                    timestampFormat === 'iso'
                      ? 'border-[#3B82F6] bg-[#3B82F6]/15 text-[#60A5FA]'
                      : isDark
                      ? 'border-white/15 bg-black/30 text-slate-300 hover:border-white/30'
                      : 'border-neutral-300 bg-neutral-50 text-neutral-700 hover:bg-neutral-100'
                  }`}
                  title="Toggle global timestamp display format between Relative ('2 hours ago') and Absolute ISO-8601 ('2026-10-05T18:12:00Z')"
                >
                  <span>Time Format:</span>
                  <span className="font-mono text-[#FFB800]">
                    {timestampFormat === 'relative' ? 'Relative' : 'Absolute ISO'}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setCsvSettingsModalOpen(true)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                    activeCsvColumns.length < CSV_EXPORT_COLUMNS.length
                      ? 'border-[#D4AF37] bg-[#D4AF37]/15 text-[#FFB800]'
                      : isDark
                      ? 'border-white/15 bg-black/30 text-slate-300 hover:border-white/30'
                      : 'border-neutral-300 bg-neutral-50 text-neutral-700 hover:bg-neutral-100'
                  }`}
                  title="Customize visible columns in the live .print-audit-table and CSV export"
                >
                  <Settings2 className="w-3.5 h-3.5 text-[#D4AF37]" />
                  <span>Table &amp; CSV Columns</span>
                  <span className="font-mono text-[10px] text-[#FFB800]">
                    ({activeCsvColumns.length}/{CSV_EXPORT_COLUMNS.length})
                  </span>
                </button>

                <div className="text-xs text-[#9CA3AF]">
                  Showing{' '}
                  <span className="font-mono font-semibold">
                    {sortedExplorerTransactions.length}
                  </span>{' '}
                  verified off-chain ledger entries · Sorted by{' '}
                  <span className="font-mono text-[#D4AF37]">
                    {txSortField === 'created_at'
                      ? 'Date'
                      : txSortField === 'amount'
                      ? 'Amount'
                      : 'Type'}{' '}
                    ({txSortDirection.toUpperCase()})
                  </span>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  disabled={sortedExplorerTransactions.length === 0}
                  className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-medium border transition-colors whitespace-nowrap disabled:opacity-40 disabled:pointer-events-none ${
                    isDark
                      ? 'border-white/20 bg-white/5 text-slate-200 hover:border-[#FFB800]/50 hover:text-[#FFB800]'
                      : 'border-neutral-300 bg-white text-neutral-800 hover:bg-neutral-100'
                  }`}
                  title="Print clean multi-page audit report of current filtered ledger results"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Audit Report</span>
                </button>
                <div
                  className={`inline-flex items-center rounded-lg border overflow-hidden ${
                    isDark
                      ? 'border-[#FFB800]/40 bg-[#0B162C]'
                      : 'border-neutral-300 bg-neutral-50'
                  }`}
                >
                  <button
                    type="button"
                    role="switch"
                    aria-checked={csvHighValueOnly}
                    onClick={() => setCsvHighValueOnly((prev) => !prev)}
                    className={`px-2.5 py-1.5 text-[11px] font-mono border-r transition-colors whitespace-nowrap ${
                      csvHighValueOnly
                        ? 'bg-[#FFB800]/20 text-[#FFB800] border-[#FFB800]/40 font-semibold'
                        : isDark
                        ? 'text-slate-300 border-white/15 hover:text-white'
                        : 'text-neutral-600 border-neutral-300 hover:text-neutral-900'
                    }`}
                    title="Toggle high-value-only CSV export filter (>= 10,000 FLYX threshold)"
                  >
                    {csvHighValueOnly ? '★ High-Value CSV: ON' : 'High-Value CSV: OFF'}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleExportTransactionsCsv(csvHighValueOnly)}
                    disabled={
                      csvHighValueOnly
                        ? highValueCsvRowsCount === 0
                        : sortedExplorerTransactions.length === 0
                    }
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border-r transition-colors whitespace-nowrap disabled:opacity-40 disabled:pointer-events-none ${
                      isDark
                        ? 'text-[#FFB800] border-white/15 hover:bg-[#FFB800]/10'
                        : 'text-neutral-800 border-neutral-300 hover:bg-neutral-100'
                    }`}
                    title="Export current filtered ledger results as CSV for audit verification"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>
                      Download CSV (
                      {csvHighValueOnly
                        ? `${highValueCsvRowsCount} High-Value`
                        : sortedExplorerTransactions.length}
                      )
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setCsvSettingsModalOpen(true)}
                    className={`inline-flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-mono transition-colors whitespace-nowrap ${
                      isDark
                        ? 'text-slate-300 hover:text-[#FFB800] hover:bg-white/5'
                        : 'text-neutral-700 hover:text-neutral-900 hover:bg-neutral-100'
                    }`}
                    title="Customize which columns are included in exported CSV files"
                    aria-label="Open CSV column settings modal"
                  >
                    <Settings2 className="w-3.5 h-3.5 text-[#D4AF37]" />
                    <span>
                      Columns ({activeCsvColumns.length}/{CSV_EXPORT_COLUMNS.length})
                    </span>
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setTxQuery('');
                    setTxTypeFilter('ALL');
                    setTxBatchEpochFilter('ALL');
                    setTxDateFrom('');
                    setTxDateTo('');
                    setTxMinAmount('');
                    setTxAuditOnly(false);
                    setHighlightHighValueRows(true);
                    setTimestampFormat('relative');
                    setCsvHighValueOnly(false);
                    setSelectedCsvColumns(DEFAULT_CSV_COLUMNS_SELECTION);
                    setTxSortField('created_at');
                    setTxSortDirection('desc');
                    setFilteredTransactions(overview.recentTransactions);
                    setTxListVersion((v) => v + 1);
                  }}
                  className="px-3 py-1.5 rounded-lg text-xs text-[#9CA3AF] hover:text-white border border-white/10 whitespace-nowrap"
                >
                  Reset Filters
                </button>
                <button
                  type="submit"
                  disabled={txLoading}
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-[#D4AF37] text-[#090A0F] text-xs font-semibold hover:bg-[#e5c148] transition-colors whitespace-nowrap"
                >
                  <Filter className="w-3.5 h-3.5" />
                  <span>{txLoading ? 'Searching...' : 'Filter Ledger'}</span>
                </button>
              </div>
            </div>
          </form>

          {/* Current Search Results Summary Card */}
          <div
            className={`print-summary-grid ${
              sortedExplorerTransactions.length > 25 ? 'multi-page-summary-break' : ''
            } grid grid-cols-1 sm:grid-cols-3 rounded-xl border divide-y sm:divide-y-0 sm:divide-x ${
              isDark
                ? 'bg-[#10131C] border-white/10 divide-white/10'
                : 'bg-white border-neutral-200 divide-neutral-200 shadow-sm'
            }`}
          >
            <div className="p-4 sm:p-5 space-y-1">
              <div className="text-xs text-[#9CA3AF]">Matching Ledger Transactions</div>
              <div className="font-mono text-xl sm:text-2xl font-bold tabular-nums text-[#FFB800]">
                {explorerSearchSummary.count.toLocaleString()}{' '}
                <span className="text-xs font-normal text-[#9CA3AF]">records</span>
              </div>
              <div className="font-mono text-[11px] text-[#6B7280]">
                Filter Scope: {txTypeFilter === 'ALL' ? 'All Ledger Types' : txTypeFilter}
                {txBatchEpochFilter !== 'ALL' ? ` · ${txBatchEpochFilter}` : ''}
                {txAuditOnly ? ' · Audit Only (≥10k & System)' : ''}
              </div>
            </div>

            <div className="p-4 sm:p-5 space-y-1">
              <div className="text-xs text-[#9CA3AF]">Total FLYX Volume (Current Results)</div>
              <div className="font-mono text-xl sm:text-2xl font-bold tabular-nums">
                {formatFlyxAmount(explorerSearchSummary.totalVolume, 2)}{' '}
                <span className="text-xs font-normal text-[#FFB800]">FLYX</span>
              </div>
              <div className="font-mono text-[11px] text-[#6B7280]">
                Exact: {explorerSearchSummary.totalVolume}
              </div>
            </div>

            <div className="p-4 sm:p-5 space-y-1">
              <div className="text-xs text-[#9CA3AF]">Average Transaction Size</div>
              <div className="font-mono text-xl sm:text-2xl font-bold tabular-nums text-emerald-400">
                {formatFlyxAmount(explorerSearchSummary.averageSize, 2)}{' '}
                <span className="text-xs font-normal text-[#9CA3AF]">FLYX</span>
              </div>
              <div className="font-mono text-[11px] text-[#6B7280]">
                Exact: {explorerSearchSummary.averageSize}
              </div>
            </div>
          </div>

          {/* 30-Day Recharts Bar Chart + Audit Summary Pie Chart Widget */}
          <div className="no-print grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
            <div className="lg:col-span-7">
              <TransactionVolumeChart
                transactions={sortedExplorerTransactions}
                theme={theme}
              />
            </div>
            <div className="lg:col-span-5">
              <AuditSummaryWidget
                transactions={sortedExplorerTransactions}
                highValueThresholdUnits={HIGH_VALUE_AUDIT_UNITS}
                highlightEnabled={highlightHighValueRows}
                theme={theme}
              />
            </div>
          </div>

          {/* Transactions Table (Mobile-Optimized with Sticky Headers & Horizontal Scroll, Print-Optimized for Audit Reports) */}
          <div
            className={`print-table-wrapper rounded-2xl border overflow-hidden shadow-xl transition-colors ${
              isDark ? 'bg-[#0E1424] border-slate-800' : 'bg-white border-neutral-200 shadow-sm'
            }`}
          >
            <div className="no-print px-4 py-2.5 border-b border-white/10 flex items-center justify-between text-[11px] text-[#9CA3AF] md:hidden">
              <span>Tap any row to inspect full details · Off-Chain MySQL Ledger</span>
              <span className="font-mono text-[#FFB800]">Swipe → for more columns</span>
            </div>

            {/* Multi-Row Bulk Audit Action Bar */}
            <div
              className={`no-print px-4 py-2.5 border-b flex flex-wrap items-center justify-between gap-3 text-xs transition-colors ${
                selectedVisibleTransactions.length > 0
                  ? isDark
                    ? 'bg-[#D4AF37]/10 border-[#D4AF37]/30'
                    : 'bg-[#FFFBEB] border-[#D4AF37]/50'
                  : isDark
                  ? 'bg-[#121B30]/90 border-slate-800'
                  : 'bg-neutral-50 border-neutral-200'
              }`}
            >
              <div className="flex flex-wrap items-center gap-3">
                <label className="inline-flex items-center gap-2 cursor-pointer font-medium">
                  <input
                    type="checkbox"
                    checked={allVisibleSelected}
                    onChange={toggleSelectAllVisible}
                    disabled={sortedExplorerTransactions.length === 0}
                    className="h-3.5 w-3.5 rounded border-white/20 accent-[#D4AF37] cursor-pointer"
                  />
                  <span className={selectedVisibleTransactions.length > 0 ? 'text-[#FFB800] font-semibold' : 'text-[#9CA3AF]'}>
                    {selectedVisibleTransactions.length > 0
                      ? `${selectedVisibleTransactions.length} of ${sortedExplorerTransactions.length} selected`
                      : 'Select rows for bulk audit actions'}
                  </span>
                </label>
                {selectedVisibleTransactions.length > 0 && (
                  <span className="font-mono text-[11px] text-[#9CA3AF]">
                    Selected Volume:{' '}
                    <strong className="text-[#F8FAFC]">
                      {formatFlyxAmount(selectedTransactionsVolume, 2)} FLYX
                    </strong>
                  </span>
                )}
                {flaggedVisibleCount > 0 && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-rose-500/15 border border-rose-500/30 font-mono text-[10px] text-rose-300">
                    <Flag className="w-3 h-3 text-rose-400" />
                    <span>{flaggedVisibleCount} Flagged for Review</span>
                  </span>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleCopySelectedTxIds}
                  disabled={selectedVisibleTransactions.length === 0}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium border transition-colors disabled:opacity-40 disabled:pointer-events-none ${
                    copiedText === 'bulk-copy-tx-ids'
                      ? 'border-emerald-500/50 bg-emerald-500/15 text-emerald-400'
                      : isDark
                      ? 'border-white/15 bg-black/30 text-slate-200 hover:border-[#FFB800]/50 hover:text-[#FFB800]'
                      : 'border-neutral-300 bg-white text-neutral-800 hover:bg-neutral-100'
                  }`}
                  title="Copy all selected Transaction IDs to clipboard"
                >
                  {copiedText === 'bulk-copy-tx-ids' ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Copied {selectedVisibleTransactions.length} IDs!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy Selected IDs</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => handleExportTransactionsCsv(false, selectedVisibleTransactions)}
                  disabled={selectedVisibleTransactions.length === 0}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium border transition-colors disabled:opacity-40 disabled:pointer-events-none ${
                    isDark
                      ? 'border-[#D4AF37]/40 bg-[#D4AF37]/10 text-[#FFB800] hover:bg-[#D4AF37]/20'
                      : 'border-[#D4AF37] bg-[#FFFBEB] text-[#0B162C] hover:bg-[#FEF3C7]'
                  }`}
                  title="Download CSV containing only the selected transaction rows"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Selection as CSV ({selectedVisibleTransactions.length})</span>
                </button>

                <button
                  type="button"
                  onClick={handleToggleFlagSelectedForReview}
                  disabled={selectedVisibleTransactions.length === 0}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium border transition-colors disabled:opacity-40 disabled:pointer-events-none ${
                    allSelectedAreFlagged
                      ? 'border-rose-500/50 bg-rose-500/20 text-rose-300 hover:bg-rose-500/30'
                      : isDark
                      ? 'border-rose-500/30 bg-rose-500/10 text-rose-300 hover:border-rose-400'
                      : 'border-rose-300 bg-rose-50 text-rose-700 hover:bg-rose-100'
                  }`}
                  title="Mark or unmark selected transactions as Flagged for Audit Review"
                >
                  <Flag className="w-3.5 h-3.5" />
                  <span>{allSelectedAreFlagged ? 'Unflag Selected' : 'Flag for Review'}</span>
                </button>

                {selectedVisibleTransactions.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setSelectedTxIds({})}
                    className="px-2 py-1 rounded-md text-[11px] text-[#9CA3AF] hover:text-white"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>

            <div className="print-table-scroll overflow-x-auto max-h-[520px] overflow-y-auto relative">
              <table
                className={`print-audit-table ${
                  sortedExplorerTransactions.length > 25 ? 'multi-page-audit-table' : ''
                } w-full min-w-[540px] text-left text-xs border-collapse`}
              >
                <thead
                  className={`sticky top-0 z-20 border-b backdrop-blur-md ${
                    isDark
                      ? 'bg-[#121B30]/95 border-slate-800 text-slate-300'
                      : 'bg-neutral-100/95 border-neutral-200 text-neutral-600'
                  }`}
                >
                  <tr className="print-only print-repeating-summary-row hidden">
                    <th colSpan={visiblePrintTableColCount} className="font-mono text-[8pt] font-normal">
                      <div className="flex items-center justify-between gap-4">
                        <span>
                          <strong>Audit Summary (Repeating Header):</strong>{' '}
                          {explorerSearchSummary.count.toLocaleString()} Matching Records
                        </span>
                        <span>
                          <strong>Total Volume:</strong>{' '}
                          {formatFlyxAmount(explorerSearchSummary.totalVolume, 2)} FLYX (Exact:{' '}
                          {explorerSearchSummary.totalVolume})
                        </span>
                        <span>
                          <strong>Average Tx Size:</strong>{' '}
                          {formatFlyxAmount(explorerSearchSummary.averageSize, 2)} FLYX
                        </span>
                      </div>
                    </th>
                  </tr>
                  <tr>
                    <th className="no-print w-10 py-3.5 px-3 text-center">
                      <input
                        type="checkbox"
                        checked={allVisibleSelected}
                        onChange={toggleSelectAllVisible}
                        disabled={sortedExplorerTransactions.length === 0}
                        aria-label="Select all visible transactions"
                        className="h-3.5 w-3.5 rounded border-white/20 accent-[#D4AF37] cursor-pointer"
                      />
                    </th>
                    {selectedCsvColumns.tx_id && (
                      <th
                        className={`sticky left-0 z-30 py-3.5 px-3 sm:px-4 font-semibold ${
                          isDark ? 'bg-[#121B30]' : 'bg-neutral-100'
                        }`}
                      >
                        Transaction ID
                      </th>
                    )}
                    {selectedCsvColumns.contract_address && (
                      <th className="py-3.5 px-3 sm:px-4 font-semibold whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span>Token Contract Address</span>
                          <span className="no-print font-mono text-[9px] px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-400 font-semibold border border-amber-500/20">
                            FLYX
                          </span>
                        </div>
                      </th>
                    )}
                    {selectedCsvColumns.batch_epoch && (
                      <th className="hidden md:table-cell py-3.5 px-3 sm:px-4 font-semibold whitespace-nowrap">
                        Batch ID / Epoch
                      </th>
                    )}
                    {selectedCsvColumns.ledger_environment && (
                      <th className="hidden lg:table-cell py-3.5 px-4 font-semibold">
                        <div className="relative inline-flex items-center gap-1.5 group">
                          <span>Ledger Environment</span>
                          <button
                            type="button"
                            aria-label="Explain difference between Off-Chain and On-Chain statuses"
                            className="no-print text-[#9CA3AF] hover:text-[#FFB800] focus:text-[#FFB800] focus:outline-none transition-colors"
                          >
                            <HelpCircle className="w-3.5 h-3.5" />
                          </button>

                          {/* Hover & Focus-Within Tooltip Popover */}
                          <div
                            role="tooltip"
                            className={`no-print pointer-events-none opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity duration-150 absolute left-0 top-full mt-2 w-80 p-3.5 rounded-xl border shadow-2xl z-50 text-left font-normal leading-relaxed whitespace-normal ${
                              isDark
                                ? 'bg-[#0B162C] border-[#FFB800]/40 text-[#F8FAFC]'
                                : 'bg-white border-neutral-300 text-neutral-800'
                            }`}
                          >
                            <div className="font-bold text-xs text-[#FFB800] mb-1.5">
                              Off-Chain vs. On-Chain Ledger Status
                            </div>
                            <div className="space-y-2 text-[11px]">
                              <p>
                                <strong className="text-amber-400 font-mono">
                                  Off-Chain / Internal Ledger:
                                </strong>{' '}
                                Recorded in the authenticated FlyXCoin.com MySQL{' '}
                                <code className="font-mono">DECIMAL(36,8)</code> project database
                                during Pre-Mainnet phases (Phases 1–3).
                              </p>
                              <p>
                                <strong className="text-emerald-400 font-mono">
                                  On-Chain Mainnet:
                                </strong>{' '}
                                Cryptographically finalized on the decentralized FLYX Blockchain
                                (planned for Phase 4/5 launch). No off-chain entry is ever
                                misrepresented as on-chain.
                              </p>
                            </div>
                          </div>
                        </div>
                      </th>
                    )}
                    {selectedCsvColumns.tx_type && (
                      <th
                        className="py-3.5 px-3 sm:px-4 font-semibold"
                        aria-sort={
                          txSortField === 'tx_type'
                            ? txSortDirection === 'asc'
                              ? 'ascending'
                              : 'descending'
                            : 'none'
                        }
                      >
                        <button
                          type="button"
                          onClick={() => toggleExplorerSort('tx_type')}
                          className="inline-flex items-center gap-1.5 hover:text-[#D4AF37] transition-colors whitespace-nowrap"
                        >
                          <span>Type</span>
                          {renderSortIcon(txSortField, 'tx_type', txSortDirection)}
                        </button>
                      </th>
                    )}
                    {selectedCsvColumns.amount && (
                      <th
                        className="py-3.5 px-3 sm:px-4 font-semibold text-right"
                        aria-sort={
                          txSortField === 'amount'
                            ? txSortDirection === 'asc'
                              ? 'ascending'
                              : 'descending'
                            : 'none'
                        }
                      >
                        <button
                          type="button"
                          onClick={() => toggleExplorerSort('amount')}
                          className="inline-flex items-center justify-end gap-1.5 ml-auto hover:text-[#D4AF37] transition-colors whitespace-nowrap"
                        >
                          <span>Amount (FLYX)</span>
                          {renderSortIcon(txSortField, 'amount', txSortDirection)}
                        </button>
                      </th>
                    )}
                    {selectedCsvColumns.status && (
                      <th className="hidden sm:table-cell py-3.5 px-4 font-semibold">Status</th>
                    )}
                    {(selectedCsvColumns.sender_wallet || selectedCsvColumns.receiver_wallet) && (
                      <th className="hidden md:table-cell py-3.5 px-4 font-semibold">
                        {selectedCsvColumns.sender_wallet && selectedCsvColumns.receiver_wallet
                          ? 'Sender → Receiver'
                          : selectedCsvColumns.sender_wallet
                          ? 'Sender Wallet'
                          : 'Receiver Wallet'}
                      </th>
                    )}
                    {selectedCsvColumns.created_at && (
                      <th
                        className="py-3.5 px-3 sm:px-4 font-semibold text-right"
                        aria-sort={
                          txSortField === 'created_at'
                            ? txSortDirection === 'asc'
                              ? 'ascending'
                              : 'descending'
                            : 'none'
                        }
                      >
                        <div className="inline-flex items-center justify-end gap-1.5 ml-auto">
                          <button
                            type="button"
                            onClick={() => toggleExplorerSort('created_at')}
                            className="inline-flex items-center gap-1.5 hover:text-[#D4AF37] transition-colors whitespace-nowrap"
                          >
                            <span>
                              {timestampFormat === 'iso' ? 'Timestamp (ISO)' : 'Timestamp (UTC)'}
                            </span>
                            {renderSortIcon(txSortField, 'created_at', txSortDirection)}
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setTimestampFormat((prev) =>
                                prev === 'relative' ? 'iso' : 'relative'
                              )
                            }
                            title="Switch between Relative and Absolute ISO timestamp format"
                            className={`no-print px-1.5 py-0.5 rounded text-[9px] font-mono border transition-colors ${
                              isDark
                                ? 'border-white/15 bg-black/30 text-[#FFB800] hover:border-[#FFB800]/50'
                                : 'border-neutral-300 bg-white text-[#0B162C] hover:border-[#D4AF37]'
                            }`}
                          >
                            {timestampFormat === 'relative' ? 'REL' : 'ISO'}
                          </button>
                        </div>
                      </th>
                    )}
                    <th className="no-print py-3.5 px-3 sm:px-4 font-semibold text-right">
                      <div className="inline-flex items-center justify-end gap-2 ml-auto relative">
                        <span>Actions</span>
                        {selectedVisibleTransactions.length > 0 && (
                          <div className="relative">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setActionsDropdownOpenId((prev) =>
                                  prev === 'header' ? null : 'header'
                                );
                              }}
                              aria-expanded={actionsDropdownOpenId === 'header'}
                              aria-haspopup="menu"
                              className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-mono font-semibold border transition-colors ${
                                isDark
                                  ? 'border-[#FFB800]/60 bg-[#FFB800]/15 text-[#FFB800] hover:bg-[#FFB800]/25'
                                  : 'border-[#D4AF37] bg-[#FFFBEB] text-[#0B162C] hover:bg-[#FEF3C7]'
                              }`}
                              title="Bulk actions for selected transactions"
                            >
                              <span>Bulk ({selectedVisibleTransactions.length})</span>
                              <ChevronDown className="w-3 h-3" />
                            </button>

                            {actionsDropdownOpenId === 'header' && (
                              <div
                                role="menu"
                                onClick={(e) => e.stopPropagation()}
                                className={`absolute right-0 top-full mt-1.5 w-52 rounded-xl border shadow-2xl z-50 py-1.5 text-left font-sans font-normal ${
                                  isDark
                                    ? 'bg-[#0B162C] border-[#D4AF37]/50 text-[#F8FAFC]'
                                    : 'bg-white border-neutral-300 text-[#0B162C]'
                                }`}
                              >
                                <div className="px-3 py-1.5 border-b border-white/10 text-[10px] font-mono text-[#FFB800] font-semibold">
                                  SELECTED ROWS ({selectedVisibleTransactions.length})
                                </div>
                                <button
                                  type="button"
                                  role="menuitem"
                                  onClick={() => {
                                    handleCopySelectedTxIds();
                                    setActionsDropdownOpenId(null);
                                  }}
                                  className={`w-full px-3 py-2 text-xs flex items-center gap-2 transition-colors ${
                                    isDark ? 'hover:bg-white/10' : 'hover:bg-neutral-100'
                                  }`}
                                >
                                  <Copy className="w-3.5 h-3.5 text-[#D4AF37]" />
                                  <span>Copy Selected IDs</span>
                                </button>
                                <button
                                  type="button"
                                  role="menuitem"
                                  onClick={() => {
                                    handleToggleFlagSelectedForReview();
                                    setActionsDropdownOpenId(null);
                                  }}
                                  className={`w-full px-3 py-2 text-xs flex items-center gap-2 transition-colors ${
                                    isDark ? 'hover:bg-white/10' : 'hover:bg-neutral-100'
                                  }`}
                                >
                                  <Flag className="w-3.5 h-3.5 text-rose-400" />
                                  <span>
                                    {allSelectedAreFlagged ? 'Unflag Selected' : 'Flag for Review'}
                                  </span>
                                </button>
                                <div className="my-1 border-t border-white/10" />
                                <button
                                  type="button"
                                  role="menuitem"
                                  onClick={() => {
                                    setSelectedTxIds({});
                                    setActionsDropdownOpenId(null);
                                  }}
                                  className={`w-full px-3 py-2 text-xs flex items-center gap-2 text-rose-400 transition-colors ${
                                    isDark ? 'hover:bg-white/10' : 'hover:bg-neutral-100'
                                  }`}
                                >
                                  <X className="w-3.5 h-3.5" />
                                  <span>Clear Selection</span>
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${isDark ? 'divide-slate-800/80' : 'divide-neutral-200'}`}>
                  {sortedExplorerTransactions.length === 0 ? (
                    <tr>
                      <td
                        colSpan={visiblePrintTableColCount + 2}
                        className="py-10 text-center text-[#9CA3AF]"
                      >
                        No public ledger transactions matched your search criteria.
                      </td>
                    </tr>
                  ) : (
                    sortedExplorerTransactions.map((tx, idx) => {
                      const isHighValue = decimalToUnits(tx.amount) >= HIGH_VALUE_AUDIT_UNITS;
                      const showHighValueHighlight = isHighValue && highlightHighValueRows;
                      const isRowSelected = Boolean(selectedTxIds[tx.tx_id]);
                      const isRowFlagged = Boolean(flaggedTxIds[tx.tx_id]);
                      const isRowExpanded = Boolean(expandedTxIds[tx.tx_id]);
                      const batchInfo = resolveLedgerBatchInfo(tx);
                      const senderMeta = resolveWalletMetadata(tx.sender_wallet);
                      const receiverMeta = resolveWalletMetadata(tx.receiver_wallet);
                      const amountUnits = decimalToUnits(tx.amount);
                      const feeUnits = decimalToUnits(tx.fee);
                      const ledgerCommitFeeUnits = (feeUnits * 70n) / 100n;
                      const auditChecksumFeeUnits = feeUnits - ledgerCommitFeeUnits;
                      const grossTotalDebitDecimal = unitsToDecimal(amountUnits + feeUnits);
                      const flipPopoverUp =
                        sortedExplorerTransactions.length > 2 &&
                        idx >= sortedExplorerTransactions.length - 2;

                      const walletQuickRefPopover = (
                        <div
                          role="tooltip"
                          className={`no-print pointer-events-none opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity duration-150 absolute left-2 ${
                            flipPopoverUp ? 'bottom-full mb-1.5' : 'top-full mt-1.5'
                          } w-[310px] sm:w-[440px] p-3 rounded-xl border shadow-2xl z-50 text-left font-sans font-normal leading-snug whitespace-normal ${
                            isDark
                              ? 'bg-[#0B162C]/98 border-[#D4AF37]/50 text-[#F8FAFC]'
                              : 'bg-white/98 border-[#D4AF37] text-[#0B162C]'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2 pb-1.5 mb-2 border-b border-white/10 text-[10px] font-mono">
                            <span className="font-bold text-[#FFB800]">
                              WALLET METADATA QUICK REFERENCE · {tx.tx_id}
                            </span>
                            <span className="text-emerald-400 font-semibold">{tx.status}</span>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-[11px]">
                            <div
                              className={`p-2 rounded-lg border ${
                                isDark
                                  ? 'bg-black/35 border-white/10'
                                  : 'bg-neutral-50 border-neutral-200'
                              }`}
                            >
                              <div className="text-[10px] font-mono uppercase tracking-wider text-[#9CA3AF]">
                                Sender Wallet
                              </div>
                              <div className="font-semibold text-xs truncate mt-0.5">
                                {senderMeta.label}
                              </div>
                              <div className="font-mono text-[10px] text-[#D4AF37] truncate mt-0.5">
                                {tx.sender_wallet}
                              </div>
                              <div className="flex items-center justify-between gap-1 mt-1 pt-1 border-t border-white/10 font-mono text-[10px]">
                                <span className="text-[#9CA3AF]">{senderMeta.walletType}</span>
                                <span className="text-emerald-400">{senderMeta.status}</span>
                              </div>
                              {senderMeta.balance && (
                                <div className="font-mono text-[10px] text-[#9CA3AF] mt-0.5 tabular-nums">
                                  Bal: {formatFlyxAmount(senderMeta.balance, 2)} FLYX
                                </div>
                              )}
                            </div>

                            <div
                              className={`p-2 rounded-lg border ${
                                isDark
                                  ? 'bg-black/35 border-white/10'
                                  : 'bg-neutral-50 border-neutral-200'
                              }`}
                            >
                              <div className="text-[10px] font-mono uppercase tracking-wider text-[#9CA3AF]">
                                Receiver Wallet
                              </div>
                              <div className="font-semibold text-xs truncate mt-0.5">
                                {receiverMeta.label}
                              </div>
                              <div className="font-mono text-[10px] text-[#D4AF37] truncate mt-0.5">
                                {tx.receiver_wallet}
                              </div>
                              <div className="flex items-center justify-between gap-1 mt-1 pt-1 border-t border-white/10 font-mono text-[10px]">
                                <span className="text-[#9CA3AF]">{receiverMeta.walletType}</span>
                                <span className="text-emerald-400">{receiverMeta.status}</span>
                              </div>
                              {receiverMeta.balance && (
                                <div className="font-mono text-[10px] text-[#9CA3AF] mt-0.5 tabular-nums">
                                  Bal: {formatFlyxAmount(receiverMeta.balance, 2)} FLYX
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );

                      return (
                        <React.Fragment key={`${tx.tx_id}-${txListVersion}`}>
                        <tr
                          style={{ animationDelay: `${Math.min(idx * 20, 140)}ms` }}
                          onClick={() => toggleExpandTransaction(tx.tx_id)}
                          aria-expanded={isRowExpanded}
                          className={`animate-tx-row relative hover:z-40 group cursor-pointer transition-colors ${
                            isRowSelected
                              ? isDark
                                ? 'bg-[#D4AF37]/[0.14] hover:bg-[#D4AF37]/[0.18]'
                                : 'bg-[#FEF3C7] hover:bg-[#FDE68A]/70'
                              : showHighValueHighlight
                              ? isDark
                                ? 'high-value-audit-row high-value-audit-row-border bg-[#FFB800]/[0.055] hover:bg-[#FFB800]/[0.10]'
                                : 'high-value-audit-row high-value-audit-row-border bg-[#FFFBEB] hover:bg-[#FEF3C7]/80'
                              : isDark
                              ? 'hover:bg-white/[0.03]'
                              : 'hover:bg-neutral-50'
                          } ${
                            showHighValueHighlight
                              ? 'high-value-audit-row high-value-audit-row-border'
                              : ''
                          }`}
                        >
                          <td
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleSelectTransaction(tx.tx_id);
                            }}
                            className="no-print w-10 py-3 sm:py-3.5 px-3 text-center whitespace-nowrap"
                          >
                            <input
                              type="checkbox"
                              checked={isRowSelected}
                              onChange={() => toggleSelectTransaction(tx.tx_id)}
                              onClick={(e) => e.stopPropagation()}
                              aria-label={`Select transaction ${tx.tx_id}`}
                              className="h-3.5 w-3.5 rounded border-white/20 accent-[#D4AF37] cursor-pointer"
                            />
                          </td>
                          {selectedCsvColumns.tx_id && (
                            <td
                              className={`sticky left-0 z-10 py-3 sm:py-3.5 px-3 sm:px-4 font-mono font-medium text-[#D4AF37] whitespace-nowrap border-r border-white/5 sm:border-r-0 ${
                                showHighValueHighlight
                                  ? isDark
                                    ? 'border-l-2 border-l-[#FFB800] bg-[#181A1F] group-hover:bg-[#222324]'
                                    : 'border-l-2 border-l-[#D4AF37] bg-[#FFFBEB] group-hover:bg-[#FEF3C7]'
                                  : isDark
                                  ? 'bg-[#10131C] group-hover:bg-[#151925]'
                                  : 'bg-white group-hover:bg-neutral-50'
                              }`}
                            >
                              <div className="flex items-center gap-1.5">
                                <ChevronDown
                                  className={`no-print w-3.5 h-3.5 text-[#9CA3AF] shrink-0 transition-transform duration-150 ${
                                    isRowExpanded ? 'rotate-180 text-[#FFB800]' : '-rotate-90'
                                  }`}
                                />
                                <span className="truncate max-w-[130px] sm:max-w-none">
                                  {tx.tx_id}
                                </span>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleCopy(tx.tx_id, `tx-id-${tx.tx_id}`);
                                  }}
                                  aria-label={`Copy transaction ID ${tx.tx_id}`}
                                  title={
                                    copiedText === `tx-id-${tx.tx_id}`
                                      ? 'Copied to clipboard!'
                                      : 'Copy Transaction ID'
                                  }
                                  className={`no-print p-1 rounded border transition-colors shrink-0 ${
                                    copiedText === `tx-id-${tx.tx_id}`
                                      ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-400'
                                      : isDark
                                      ? 'border-white/10 bg-white/5 text-[#9CA3AF] hover:text-[#FFB800] hover:border-[#FFB800]/50'
                                      : 'border-neutral-200 bg-neutral-100 text-neutral-500 hover:text-[#0B162C] hover:border-[#D4AF37]'
                                  }`}
                                >
                                  {copiedText === `tx-id-${tx.tx_id}` ? (
                                    <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                                  ) : (
                                    <Copy className="w-3 h-3" />
                                  )}
                                </button>
                              </div>
                              {isRowFlagged && (
                                <div className="inline-flex items-center gap-1 mt-1 px-1.5 py-0.5 rounded bg-rose-500/20 border border-rose-500/40 text-[9px] font-mono font-semibold text-rose-300">
                                  <Flag className="w-2.5 h-2.5 text-rose-400" />
                                  <span>FLAGGED FOR REVIEW</span>
                                </div>
                              )}
                              <div className="no-print lg:hidden text-[10px] text-amber-400/90 font-normal mt-0.5">
                                Off-Chain Ledger ·{' '}
                                <span className="text-emerald-400">{tx.status}</span>
                              </div>
                            </td>
                          )}
                          {selectedCsvColumns.contract_address && (
                            <td className="py-3 sm:py-3.5 px-3 sm:px-4 font-mono text-[11px] whitespace-nowrap">
                              <div
                                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border transition-colors ${
                                  isDark
                                    ? 'bg-slate-900/80 border-slate-700/80 hover:border-amber-500/60 text-slate-200'
                                    : 'bg-neutral-100 border-neutral-300 hover:border-amber-500/60 text-neutral-800'
                                }`}
                              >
                                <span
                                  className="font-mono tracking-tight font-medium"
                                  title={
                                    tx.contract_address ||
                                    overview.tokenInfo.contract_address ||
                                    '0x71C8A1D3b28E3A759f20E2DbE08f906471E2D4F6'
                                  }
                                >
                                  {`${(
                                    tx.contract_address ||
                                    overview.tokenInfo.contract_address ||
                                    '0x71C8A1D3b28E3A759f20E2DbE08f906471E2D4F6'
                                  ).slice(0, 6)}...${(
                                    tx.contract_address ||
                                    overview.tokenInfo.contract_address ||
                                    '0x71C8A1D3b28E3A759f20E2DbE08f906471E2D4F6'
                                  ).slice(-4)}`}
                                </span>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const addr =
                                      tx.contract_address ||
                                      overview.tokenInfo.contract_address ||
                                      '0x71C8A1D3b28E3A759f20E2DbE08f906471E2D4F6';
                                    handleCopy(addr, `contract-${tx.tx_id}`);
                                  }}
                                  aria-label={`Copy token contract address for transaction ${tx.tx_id}`}
                                  title={
                                    copiedText === `contract-${tx.tx_id}`
                                      ? 'Contract address copied!'
                                      : 'Copy Token Contract Address'
                                  }
                                  className={`no-print p-0.5 rounded transition-colors shrink-0 ${
                                    isDark
                                      ? 'text-slate-400 hover:text-amber-400 hover:bg-white/10'
                                      : 'text-neutral-500 hover:text-amber-600 hover:bg-neutral-200'
                                  }`}
                                >
                                  {copiedText === `contract-${tx.tx_id}` ? (
                                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                                  ) : (
                                    <Copy className="w-3.5 h-3.5" />
                                  )}
                                </button>
                              </div>
                            </td>
                          )}
                          {selectedCsvColumns.batch_epoch && (
                            <td className="hidden md:table-cell py-3 sm:py-3.5 px-3 sm:px-4 font-mono text-[11px] whitespace-nowrap">
                              <div
                                className={`font-semibold leading-snug ${
                                  isDark ? 'text-[#D4AF37]' : 'text-[#0B162C]'
                                }`}
                              >
                                {batchInfo.batchId}
                              </div>
                              <div className="text-[10px] text-[#9CA3AF] leading-snug mt-0.5">
                                {batchInfo.epochLabel} · SETTLED
                              </div>
                            </td>
                          )}
                          {selectedCsvColumns.ledger_environment && (
                            <td className="hidden lg:table-cell py-3.5 px-4 whitespace-nowrap">
                              <span className="font-mono text-[11px] text-amber-400">
                                {tx.ledger_environment === 'OFF_CHAIN_INTERNAL_LEDGER'
                                  ? 'Off-Chain / Internal Ledger'
                                  : 'On-Chain Mainnet'}
                              </span>
                            </td>
                          )}
                          {selectedCsvColumns.tx_type && (
                            <td
                              className={`tx-type-cell relative py-3 sm:py-3.5 px-3 sm:px-4 font-mono text-[11px] leading-[1.7] sm:leading-normal font-semibold whitespace-nowrap ${
                                isDark ? 'text-white' : 'text-[#0B162C]'
                              }`}
                            >
                              <div>{tx.tx_type}</div>
                              {selectedCsvColumns.high_value_flag && (
                                <div
                                  className={`no-print sm:hidden text-[10px] font-semibold leading-[1.65] mt-0.5 ${
                                    isHighValue
                                      ? isDark
                                        ? 'text-[#FFB800]'
                                        : 'text-[#B45309]'
                                      : isDark
                                      ? 'text-emerald-300'
                                      : 'text-emerald-700'
                                  }`}
                                >
                                  {tx.status} · {isHighValue ? 'HIGH-VALUE AUDIT' : 'VERIFIED'}
                                </div>
                              )}
                              {walletQuickRefPopover}
                            </td>
                          )}
                          {selectedCsvColumns.amount && (
                            <td
                              className={`py-3 sm:py-3.5 px-3 sm:px-4 font-mono font-semibold text-right tabular-nums whitespace-nowrap ${
                                showHighValueHighlight ? 'text-[#FFB800]' : ''
                              }`}
                            >
                              <div>{formatFlyxAmount(tx.amount, 4)} FLYX</div>
                              {selectedCsvColumns.fee && (
                                <div className="text-[10px] font-normal text-[#9CA3AF] mt-0.5">
                                  Fee: {formatFlyxAmount(tx.fee, 4)}
                                </div>
                              )}
                            </td>
                          )}
                          {selectedCsvColumns.status && (
                            <td className="hidden sm:table-cell py-3.5 px-4 whitespace-nowrap">
                              <span className="text-emerald-400 font-medium">{tx.status}</span>
                              {selectedCsvColumns.high_value_flag && isHighValue && (
                                <div className="font-mono text-[9px] text-[#FFB800] mt-0.5">
                                  ★ HIGH-VALUE
                                </div>
                              )}
                            </td>
                          )}
                          {(selectedCsvColumns.sender_wallet ||
                            selectedCsvColumns.receiver_wallet) && (
                            <td className="hidden md:table-cell py-3.5 px-4 font-mono text-[11px]">
                              {selectedCsvColumns.sender_wallet && (
                                <div className="truncate max-w-[230px]">
                                  <span className="text-[#9CA3AF]">From:</span> {tx.sender_wallet}
                                </div>
                              )}
                              {selectedCsvColumns.receiver_wallet && (
                                <div className="truncate max-w-[230px]">
                                  <span className="text-[#9CA3AF]">To:</span> {tx.receiver_wallet}
                                </div>
                              )}
                              {selectedCsvColumns.user_id_reference && tx.user_id_reference && (
                                <div className="truncate max-w-[230px] text-[10px] text-[#D4AF37] mt-0.5">
                                  <span className="text-[#9CA3AF]">Ref:</span>{' '}
                                  {tx.user_id_reference}
                                </div>
                              )}
                              {selectedCsvColumns.memo && tx.memo && (
                                <div className="truncate max-w-[230px] text-[10px] text-[#9CA3AF] font-sans mt-0.5">
                                  {tx.memo}
                                </div>
                              )}
                            </td>
                          )}
                          {selectedCsvColumns.created_at && (
                            <td className="py-3 sm:py-3.5 px-3 sm:px-4 font-mono text-[11px] text-right whitespace-nowrap tabular-nums">
                              {timestampFormat === 'relative' ? (
                                <>
                                  <div
                                    className={`font-semibold leading-snug ${
                                      isDark ? 'text-[#F8FAFC]' : 'text-[#0B162C]'
                                    }`}
                                  >
                                    {formatRelativeTime(tx.created_at)}
                                  </div>
                                  <div className="text-[10px] text-[#9CA3AF] leading-snug mt-0.5 tabular-nums">
                                    {tx.created_at}
                                  </div>
                                </>
                              ) : (
                                <>
                                  <div
                                    className={`font-semibold leading-snug tabular-nums ${
                                      isDark ? 'text-[#F8FAFC]' : 'text-[#0B162C]'
                                    }`}
                                  >
                                    {tx.created_at}
                                  </div>
                                  <div className="text-[10px] text-[#9CA3AF] leading-snug mt-0.5">
                                    {formatRelativeTime(tx.created_at)}
                                  </div>
                                </>
                              )}
                            </td>
                          )}
                          <td className="no-print py-3 sm:py-3.5 px-3 sm:px-4 text-right whitespace-nowrap">
                            {!selectedCsvColumns.tx_type && walletQuickRefPopover}
                            <div className="inline-flex items-center justify-end gap-1.5 relative">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedTransaction(tx);
                                }}
                                aria-label={`Inspect transaction ${tx.tx_id}`}
                                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold border transition-colors ${
                                  isDark
                                    ? 'border-[#D4AF37]/40 bg-[#D4AF37]/10 text-[#FFB800] hover:bg-[#D4AF37]/25 hover:border-[#FFB800]'
                                    : 'border-[#D4AF37]/60 bg-[#FFFBEB] text-[#0B162C] hover:bg-[#FEF3C7]'
                                }`}
                              >
                                <Eye className="w-3.5 h-3.5" />
                                <span>Inspect</span>
                              </button>

                              {selectedVisibleTransactions.length > 0 && (
                                <div className="relative">
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setActionsDropdownOpenId((prev) =>
                                        prev === tx.tx_id ? null : tx.tx_id
                                      );
                                    }}
                                    aria-label={`Bulk selection actions menu for ${tx.tx_id}`}
                                    aria-expanded={actionsDropdownOpenId === tx.tx_id}
                                    aria-haspopup="menu"
                                    title="Selection actions (Copy Selected IDs, Flag for Review, Clear Selection)"
                                    className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-mono font-semibold border transition-colors ${
                                      isDark
                                        ? 'border-[#FFB800]/50 bg-[#FFB800]/15 text-[#FFB800] hover:bg-[#FFB800]/25'
                                        : 'border-[#D4AF37] bg-[#FFFBEB] text-[#0B162C] hover:bg-[#FEF3C7]'
                                    }`}
                                  >
                                    <span>{selectedVisibleTransactions.length}</span>
                                    <ChevronDown className="w-3 h-3" />
                                  </button>

                                  {actionsDropdownOpenId === tx.tx_id && (
                                    <div
                                      role="menu"
                                      onClick={(e) => e.stopPropagation()}
                                      className={`absolute right-0 ${
                                        flipPopoverUp ? 'bottom-full mb-1.5' : 'top-full mt-1.5'
                                      } w-52 rounded-xl border shadow-2xl z-50 py-1.5 text-left font-sans font-normal ${
                                        isDark
                                          ? 'bg-[#0B162C] border-[#D4AF37]/50 text-[#F8FAFC]'
                                          : 'bg-white border-neutral-300 text-[#0B162C]'
                                      }`}
                                    >
                                      <div className="px-3 py-1.5 border-b border-white/10 text-[10px] font-mono text-[#FFB800] font-semibold">
                                        BULK ACTIONS ({selectedVisibleTransactions.length} SELECTED)
                                      </div>
                                      <button
                                        type="button"
                                        role="menuitem"
                                        onClick={() => {
                                          handleCopySelectedTxIds();
                                          setActionsDropdownOpenId(null);
                                        }}
                                        className={`w-full px-3 py-2 text-xs flex items-center gap-2 transition-colors ${
                                          isDark ? 'hover:bg-white/10' : 'hover:bg-neutral-100'
                                        }`}
                                      >
                                        <Copy className="w-3.5 h-3.5 text-[#D4AF37]" />
                                        <span>Copy Selected IDs</span>
                                      </button>
                                      <button
                                        type="button"
                                        role="menuitem"
                                        onClick={() => {
                                          handleToggleFlagSelectedForReview();
                                          setActionsDropdownOpenId(null);
                                        }}
                                        className={`w-full px-3 py-2 text-xs flex items-center gap-2 transition-colors ${
                                          isDark ? 'hover:bg-white/10' : 'hover:bg-neutral-100'
                                        }`}
                                      >
                                        <Flag className="w-3.5 h-3.5 text-rose-400" />
                                        <span>
                                          {allSelectedAreFlagged
                                            ? 'Unflag Selected'
                                            : 'Flag for Review'}
                                        </span>
                                      </button>
                                      <div className="my-1 border-t border-white/10" />
                                      <button
                                        type="button"
                                        role="menuitem"
                                        onClick={() => {
                                          setSelectedTxIds({});
                                          setActionsDropdownOpenId(null);
                                        }}
                                        className={`w-full px-3 py-2 text-xs flex items-center gap-2 text-rose-400 transition-colors ${
                                          isDark ? 'hover:bg-white/10' : 'hover:bg-neutral-100'
                                        }`}
                                      >
                                        <X className="w-3.5 h-3.5" />
                                        <span>Clear Selection</span>
                                      </button>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                        {isRowExpanded && (
                          <tr
                            className={`no-print border-b transition-colors ${
                              isDark
                                ? 'bg-[#0B1324]/95 border-[#D4AF37]/30 text-[#F8FAFC]'
                                : 'bg-amber-50/40 border-[#D4AF37]/40 text-[#0B162C]'
                            }`}
                          >
                            <td colSpan={visiblePrintTableColCount + 2} className="p-4 sm:p-5">
                              <div className="space-y-4">
                                <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-white/10">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-[#FFB800]">
                                      Inline Audit Record Expansion · {tx.tx_id}
                                    </span>
                                    <span className="px-2 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/30 font-mono text-[10px] text-emerald-400">
                                      {tx.status}
                                    </span>
                                    <span className="px-2 py-0.5 rounded bg-amber-500/15 border border-amber-500/30 font-mono text-[10px] text-amber-300">
                                      {batchInfo.combinedCsvValue}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setSelectedTransaction(tx);
                                      }}
                                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-mono font-semibold border border-[#D4AF37]/40 bg-[#D4AF37]/10 text-[#FFB800] hover:bg-[#D4AF37]/20"
                                    >
                                      <Eye className="w-3 h-3" />
                                      <span>Open Modal View</span>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        toggleExpandTransaction(tx.tx_id);
                                      }}
                                      className="p-1 rounded text-[#9CA3AF] hover:text-white"
                                      title="Collapse inline details"
                                    >
                                      <X className="w-4 h-4" />
                                    </button>
                                  </div>
                                </div>

                                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 text-xs">
                                  {/* Panel 1: Full Raw Transaction Memo */}
                                  <div
                                    className={`p-3.5 rounded-xl border space-y-2 ${
                                      isDark
                                        ? 'bg-black/35 border-white/10'
                                        : 'bg-white border-neutral-200'
                                    }`}
                                  >
                                    <div className="flex items-center justify-between gap-2">
                                      <span className="text-[10px] font-mono uppercase tracking-wider text-[#D4AF37] font-semibold">
                                        Full Raw Transaction Memo
                                      </span>
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleCopy(tx.memo, `memo-${tx.tx_id}`);
                                        }}
                                        className="inline-flex items-center gap-1 font-mono text-[10px] text-[#9CA3AF] hover:text-[#FFB800]"
                                      >
                                        <Copy className="w-3 h-3" />
                                        <span>
                                          {copiedText === `memo-${tx.tx_id}` ? 'Copied!' : 'Copy Memo'}
                                        </span>
                                      </button>
                                    </div>
                                    <div className="font-mono text-xs leading-relaxed break-words">
                                      {tx.memo}
                                    </div>
                                    <div className="pt-2 border-t border-white/10 flex items-center justify-between text-[11px] font-mono text-[#9CA3AF]">
                                      <span>Account Ref:</span>
                                      <span className="text-[#F8FAFC]">
                                        {tx.user_id_reference || 'SYSTEM_CUSTODIAL_BATCH'}
                                      </span>
                                    </div>
                                  </div>

                                  {/* Panel 2: Exact DECIMAL(36,8) Fee Sub-Breakdown */}
                                  <div
                                    className={`p-3.5 rounded-xl border space-y-2 font-mono ${
                                      isDark
                                        ? 'bg-black/35 border-white/10'
                                        : 'bg-white border-neutral-200'
                                    }`}
                                  >
                                    <div className="text-[10px] uppercase tracking-wider text-[#D4AF37] font-semibold">
                                      DECIMAL(36,8) Fee Sub-Breakdown
                                    </div>
                                    <div className="space-y-1.5 text-[11px]">
                                      <div className="flex items-center justify-between">
                                        <span className="text-[#9CA3AF]">Principal Amount:</span>
                                        <span className="font-semibold text-[#FFB800] tabular-nums">
                                          {tx.amount} FLYX
                                        </span>
                                      </div>
                                      <div className="flex items-center justify-between">
                                        <span className="text-[#9CA3AF]">
                                          Ledger Indexing (70%):
                                        </span>
                                        <span className="tabular-nums">
                                          {unitsToDecimal(ledgerCommitFeeUnits)} FLYX
                                        </span>
                                      </div>
                                      <div className="flex items-center justify-between">
                                        <span className="text-[#9CA3AF]">
                                          Audit Checksum (30%):
                                        </span>
                                        <span className="tabular-nums">
                                          {unitsToDecimal(auditChecksumFeeUnits)} FLYX
                                        </span>
                                      </div>
                                      <div className="flex items-center justify-between pt-1 border-t border-white/10">
                                        <span className="text-[#9CA3AF]">Total Settlement Fee:</span>
                                        <span className="font-semibold text-emerald-400 tabular-nums">
                                          {tx.fee} FLYX
                                        </span>
                                      </div>
                                      <div className="flex items-center justify-between pt-1 border-t border-white/10 font-bold">
                                        <span className="text-[#9CA3AF]">Gross Ledger Debit:</span>
                                        <span className="text-[#F8FAFC] tabular-nums">
                                          {grossTotalDebitDecimal} FLYX
                                        </span>
                                      </div>
                                    </div>
                                  </div>

                                  {/* Panel 3: Associated System & Custodial Metadata */}
                                  <div
                                    className={`p-3.5 rounded-xl border space-y-2 font-mono ${
                                      isDark
                                        ? 'bg-black/35 border-white/10'
                                        : 'bg-white border-neutral-200'
                                    }`}
                                  >
                                    <div className="text-[10px] uppercase tracking-wider text-[#D4AF37] font-semibold">
                                      System &amp; Custodial Metadata
                                    </div>
                                    <div className="space-y-1.5 text-[11px]">
                                      <div className="flex items-center justify-between gap-2">
                                        <span className="text-[#9CA3AF]">Environment:</span>
                                        <span className="text-amber-400 truncate">
                                          {tx.ledger_environment}
                                        </span>
                                      </div>
                                      <div className="flex items-center justify-between gap-2">
                                        <span className="text-[#9CA3AF]">Settlement Batch:</span>
                                        <span className="text-[#D4AF37]">{batchInfo.batchId}</span>
                                      </div>
                                      <div className="flex items-center justify-between gap-2">
                                        <span className="text-[#9CA3AF]">Audit Scope:</span>
                                        <span
                                          className={
                                            isHighValue ? 'text-[#FFB800] font-semibold' : 'text-emerald-400'
                                          }
                                        >
                                          {isHighValue ? 'HIGH-VALUE (>10k FLYX)' : 'STANDARD_VERIFIED'}
                                        </span>
                                      </div>
                                      <div className="flex items-center justify-between gap-2 pt-1 border-t border-white/10">
                                        <span className="text-[#9CA3AF]">Token Contract:</span>
                                        <div className="flex items-center gap-1.5 font-mono text-[10px] text-amber-400 font-semibold truncate max-w-[210px] sm:max-w-none">
                                          <span title={tx.contract_address || overview.tokenInfo.contract_address || '0x71C8A1D3b28E3A759f20E2DbE08f906471E2D4F6'}>
                                            {tx.contract_address || overview.tokenInfo.contract_address || '0x71C8A1D3b28E3A759f20E2DbE08f906471E2D4F6'}
                                          </span>
                                          <button
                                            type="button"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              const addr = tx.contract_address || overview.tokenInfo.contract_address || '0x71C8A1D3b28E3A759f20E2DbE08f906471E2D4F6';
                                              handleCopy(addr, `expanded-contract-${tx.tx_id}`);
                                            }}
                                            className="p-0.5 rounded text-slate-400 hover:text-amber-400 hover:bg-white/5 transition-colors shrink-0"
                                            title="Copy Contract Address"
                                          >
                                            {copiedText === `expanded-contract-${tx.tx_id}` ? (
                                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                                            ) : (
                                              <Copy className="w-3.5 h-3.5" />
                                            )}
                                          </button>
                                        </div>
                                      </div>
                                      <div className="pt-1.5 border-t border-white/10 flex flex-wrap items-center justify-between gap-2">
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            inspectWalletAndScroll(tx.sender_wallet);
                                          }}
                                          className="text-[10px] text-[#D4AF37] hover:underline"
                                        >
                                          Sender: {senderMeta.label} ↗
                                        </button>
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            inspectWalletAndScroll(tx.receiver_wallet);
                                          }}
                                          className="text-[10px] text-[#D4AF37] hover:underline"
                                        >
                                          Receiver: {receiverMeta.label} ↗
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                        </React.Fragment>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Print-Only Official Audit Attestation Footer */}
          <div className="print-only pt-3 border-t border-slate-300 text-[9pt] font-mono text-slate-600">
            <div className="flex items-center justify-between">
              <span>
                Attestation: Verified Off-Chain MySQL DECIMAL(36,8) Internal Ledger · FlyXCoin.com ↔
                FLYX Insight
              </span>
              <span>
                Zero Floating-Point Arithmetic · Pre-Mainnet Transparency Record
              </span>
            </div>
          </div>

          {/* Table & CSV Column Visibility Settings Modal */}
          {csvSettingsModalOpen && (
            <div className="no-print fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
              <div
                className={`w-full max-w-2xl rounded-xl border p-6 space-y-5 shadow-2xl ${
                  isDark
                    ? 'bg-[#0F1219] border-[#D4AF37]/40 text-[#F5F2EB]'
                    : 'bg-white border-neutral-300 text-neutral-900'
                }`}
              >
                <div className="flex items-start justify-between gap-4 pb-3 border-b border-white/10">
                  <div>
                    <div className="flex items-center gap-1.5 text-xs text-[#D4AF37] font-semibold">
                      <Settings2 className="w-3.5 h-3.5" />
                      <span>Audit Table &amp; CSV Export Configuration</span>
                    </div>
                    <h3 className="font-display text-lg font-bold mt-0.5">
                      Customize Table &amp; CSV Column Visibility
                    </h3>
                    <p className="text-xs text-[#9CA3AF] mt-0.5">
                      Toggle which columns (Sender, Receiver, Status, DECIMAL(36,8) Amounts,
                      Timestamp, etc.) are visible in the live{' '}
                      <code className="font-mono text-[#D4AF37]">.print-audit-table</code>, printed
                      audit reports, and exported CSV files.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setCsvSettingsModalOpen(false)}
                    className="p-1.5 rounded-lg text-[#9CA3AF] hover:text-white"
                    aria-label="Close column visibility settings modal"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Preset Selection Bar */}
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="text-xs font-mono text-[#9CA3AF]">
                    Active Columns:{' '}
                    <span className="font-bold text-[#FFB800]">
                      {activeCsvColumns.length} / {CSV_EXPORT_COLUMNS.length}
                    </span>{' '}
                    · Live Table Cols:{' '}
                    <span className="font-bold text-emerald-400">{visiblePrintTableColCount}</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedCsvColumns(DEFAULT_CSV_COLUMNS_SELECTION)}
                      className={`px-3 py-1 rounded-md text-xs font-medium border transition-colors ${
                        isDark
                          ? 'border-white/15 bg-white/5 text-slate-200 hover:border-[#FFB800]/50'
                          : 'border-neutral-300 bg-neutral-100 text-neutral-800 hover:bg-neutral-200'
                      }`}
                    >
                      Show All ({CSV_EXPORT_COLUMNS.length} Columns)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const coreState = {} as Record<CsvColumnKey, boolean>;
                        for (const col of CSV_EXPORT_COLUMNS) {
                          coreState[col.key] = col.coreAuditColumn;
                        }
                        setSelectedCsvColumns(coreState);
                      }}
                      className={`px-3 py-1 rounded-md text-xs font-medium border transition-colors ${
                        isDark
                          ? 'border-[#D4AF37]/40 bg-[#D4AF37]/10 text-[#FFB800] hover:bg-[#D4AF37]/20'
                          : 'border-[#D4AF37] bg-[#FFFBEB] text-[#0B162C] hover:bg-[#FEF3C7]'
                      }`}
                    >
                      Core Audit Preset (9 Columns)
                    </button>
                  </div>
                </div>

                {/* Column Checkboxes Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[320px] overflow-y-auto pr-1">
                  {CSV_EXPORT_COLUMNS.map((col) => {
                    const isChecked = selectedCsvColumns[col.key];
                    const isLastActive = isChecked && activeCsvColumns.length === 1;
                    return (
                      <label
                        key={col.key}
                        className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                          isChecked
                            ? isDark
                              ? 'border-[#D4AF37]/50 bg-[#D4AF37]/[0.07]'
                              : 'border-[#D4AF37] bg-[#FFFBEB]'
                            : isDark
                            ? 'border-white/10 bg-black/25 opacity-70 hover:opacity-100'
                            : 'border-neutral-200 bg-neutral-50 opacity-75 hover:opacity-100'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          disabled={isLastActive}
                          onChange={() => toggleCsvColumn(col.key)}
                          className="mt-0.5 h-4 w-4 rounded border-white/20 accent-[#D4AF37]"
                        />
                        <div className="space-y-0.5 min-w-0">
                          <div className="flex flex-wrap items-center gap-1.5 text-xs font-semibold">
                            <span>{col.label}</span>
                            {col.rendersInLiveTable && (
                              <span className="font-mono text-[9px] px-1.5 py-0.2 rounded bg-emerald-500/15 text-emerald-400">
                                TABLE + CSV
                              </span>
                            )}
                            {col.coreAuditColumn && (
                              <span className="font-mono text-[9px] px-1.5 py-0.2 rounded bg-[#FFB800]/15 text-[#FFB800]">
                                CORE
                              </span>
                            )}
                          </div>
                          <div className="font-mono text-[10px] text-[#D4AF37] truncate">
                            {col.csvHeader}
                          </div>
                          <div className="text-[11px] text-[#9CA3AF] leading-snug">
                            {col.description}
                          </div>
                        </div>
                      </label>
                    );
                  })}
                </div>

                {/* Live Table & CSV Header Preview */}
                <div
                  className={`p-3 rounded-lg border space-y-1.5 ${
                    isDark ? 'bg-black/35 border-white/10' : 'bg-neutral-50 border-neutral-200'
                  }`}
                >
                  <div className="text-[10px] font-mono uppercase tracking-wider text-[#9CA3AF]">
                    Synchronized Live Table &amp; CSV Header Row Preview
                  </div>
                  <div className="font-mono text-[11px] text-[#D4AF37] break-all">
                    {activeCsvColumns.map((c) => c.csvHeader).join(',')}
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-white/10">
                  <span className="text-[11px] text-[#9CA3AF]">
                    Applies immediately to live <code className="font-mono">.print-audit-table</code>{' '}
                    &amp; CSV export
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setCsvSettingsModalOpen(false)}
                      className="px-4 py-2 rounded-lg text-xs font-medium border border-white/15 text-[#9CA3AF] hover:text-white"
                    >
                      Apply to Table
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        handleExportTransactionsCsv(csvHighValueOnly);
                        setCsvSettingsModalOpen(false);
                      }}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#D4AF37] text-[#090A0F] text-xs font-bold hover:bg-[#e5c148] transition-colors"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Export Custom CSV Now</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Transaction Inspection Modal */}
          {selectedTransaction && (
            <div className="no-print fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
              <div
                className={`w-full max-w-2xl rounded-xl border p-6 space-y-4 shadow-2xl ${
                  isDark
                    ? 'bg-[#0F1219] border-[#D4AF37]/40 text-[#F5F2EB]'
                    : 'bg-white border-neutral-300 text-neutral-900'
                }`}
              >
                <div className="flex items-center justify-between pb-3 border-b border-white/10">
                  <div>
                    <div className="text-xs text-[#D4AF37] font-semibold">
                      Verified Transaction Record Inspection
                    </div>
                    <h3 className="font-mono text-base font-bold mt-0.5">
                      {selectedTransaction.tx_id}
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedTransaction(null)}
                    className="p-1.5 rounded-lg text-[#9CA3AF] hover:text-white"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-xs text-amber-300">
                  <strong>Ledger Classification:</strong> Off-Chain / Internal Ledger (MySQL
                  DECIMAL(36,8)). This transaction is recorded on the official FlyXCoin.com off-chain
                  project ledger and is not an on-chain blockchain transaction.
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="p-3 rounded-lg bg-black/25 border border-white/10">
                    <div className="text-[#9CA3AF]">Amount (Exact DECIMAL(36,8))</div>
                    <div className="font-mono text-base font-semibold text-[#D4AF37] mt-1">
                      {selectedTransaction.amount} FLYX
                    </div>
                  </div>
                  <div className="p-3 rounded-lg bg-black/25 border border-white/10">
                    <div className="text-[#9CA3AF]">Status & Type</div>
                    <div className="font-mono text-sm font-semibold text-emerald-400 mt-1">
                      {selectedTransaction.status} · {selectedTransaction.tx_type}
                    </div>
                  </div>
                  <div className="p-3 rounded-lg bg-black/25 border border-white/10">
                    <div className="text-[#9CA3AF]">Sender Wallet</div>
                    <button
                      type="button"
                      onClick={() => {
                        const target = selectedTransaction.sender_wallet;
                        setSelectedTransaction(null);
                        inspectWalletAndScroll(target);
                      }}
                      className="font-mono text-xs text-[#D4AF37] hover:underline mt-1 text-left break-all"
                    >
                      {selectedTransaction.sender_wallet} ↗
                    </button>
                  </div>
                  <div className="p-3 rounded-lg bg-black/25 border border-white/10">
                    <div className="text-[#9CA3AF]">Receiver Wallet</div>
                    <button
                      type="button"
                      onClick={() => {
                        const target = selectedTransaction.receiver_wallet;
                        setSelectedTransaction(null);
                        inspectWalletAndScroll(target);
                      }}
                      className="font-mono text-xs text-[#D4AF37] hover:underline mt-1 text-left break-all"
                    >
                      {selectedTransaction.receiver_wallet} ↗
                    </button>
                  </div>
                </div>

                {/* Dedicated Token Contract Address with Quick Copy */}
                <div className="p-3.5 rounded-lg bg-black/30 border border-white/10 flex items-center justify-between gap-3 text-xs">
                  <div className="space-y-0.5 min-w-0">
                    <div className="text-[11px] text-[#9CA3AF] font-medium flex items-center gap-1.5">
                      <span>Token Contract Address</span>
                      <span className="font-mono text-[9px] px-1.5 py-0.2 rounded bg-amber-500/15 text-amber-400">
                        FLYX
                      </span>
                    </div>
                    <div className="font-mono text-xs sm:text-sm text-amber-400 font-semibold truncate">
                      {selectedTransaction.contract_address ||
                        overview.tokenInfo.contract_address ||
                        '0x71C8A1D3b28E3A759f20E2DbE08f906471E2D4F6'}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const addr =
                        selectedTransaction.contract_address ||
                        overview.tokenInfo.contract_address ||
                        '0x71C8A1D3b28E3A759f20E2DbE08f906471E2D4F6';
                      handleCopy(addr, `modal-contract-${selectedTransaction.tx_id}`);
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-800 text-xs font-semibold text-slate-200 hover:text-amber-400 hover:border-amber-500/50 transition-colors shrink-0"
                  >
                    {copiedText === `modal-contract-${selectedTransaction.tx_id}` ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-400 font-medium">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy Address</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="p-3 rounded-lg bg-black/25 border border-white/10 text-xs space-y-1">
                  <div className="text-[#9CA3AF]">Ledger Reference, Batch ID &amp; Memo</div>
                  <div className="font-mono text-xs font-semibold text-[#FFB800]">
                    {resolveLedgerBatchInfo(selectedTransaction).combinedCsvValue}
                  </div>
                  <div className="font-medium">{selectedTransaction.memo}</div>
                  {selectedTransaction.user_id_reference && (
                    <div className="font-mono text-[11px] text-[#9CA3AF]">
                      Associated Public Account ID: {selectedTransaction.user_id_reference}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </section>

        {/* =====================================================================
            SECTION: USER SMART CONTRACT ADDRESS SYSTEM (1:1 Permanent Anchor)
        ====================================================================== */}
        <UserSmartContractSection
          userContracts={overview.userContractAddresses || []}
          publicWallets={overview.publicWallets}
          theme={theme}
          onViewExplorer={(ref) => {
            if (ref) {
              setTxQuery(ref);
            }
            const el = document.getElementById('explorer');
            if (el) el.scrollIntoView({ behavior: 'smooth' });
          }}
          onCopyText={(text, label) => handleCopy(text, label)}
          copiedLabel={copiedText}
        />

        {/* =====================================================================
            SECTION 4: PUBLIC WALLET & CUSTODIAL VAULT LOOKUP
        ====================================================================== */}
        <section id="wallets" className="space-y-6 scroll-mt-20">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-white/10 pb-5">
            <div className="space-y-1.5">
              <div className="text-xs font-medium text-[#D4AF37]">
                Zero-PII Public Account & Vault Inspector
              </div>
              <h2 className="font-display text-2xl sm:text-3xl font-bold">
                Public Wallet & Balance Lookup
              </h2>
            </div>
            <div className="flex items-center gap-2 text-xs text-[#9CA3AF]">
              <Shield className="w-4 h-4 text-emerald-400" />
              <span>Passwords, private keys & personal data are strictly isolated</span>
            </div>
          </div>

          {/* Search Input + Quick Sample Identifiers */}
          <div
            className={`p-6 rounded-xl border space-y-4 ${
              isDark ? 'bg-[#10131C] border-white/10' : 'bg-white border-neutral-200 shadow-sm'
            }`}
          >
            <form
              onSubmit={(e) => {
                e.preventDefault();
                performWalletLookup(walletSearchInput);
              }}
              className="flex flex-col sm:flex-row gap-3"
            >
              <div className="relative flex-1">
                <Wallet className="w-4 h-4 text-[#9CA3AF] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  ref={walletInputRef}
                  type="text"
                  value={walletSearchInput}
                  onChange={(e) => setWalletSearchInput(e.target.value)}
                  placeholder="Enter Public Wallet Address (FLYX-...) or Account ID (USR-FLYX-8849)..."
                  className={`w-full pl-10 pr-12 py-2.5 rounded-lg text-xs sm:text-sm font-mono border focus:outline-none focus:border-[#D4AF37] ${
                    isDark
                      ? 'bg-black/40 border-white/15 text-[#F5F2EB]'
                      : 'bg-neutral-50 border-neutral-300 text-neutral-900'
                  }`}
                />
                <kbd
                  title="Press 'W' to focus wallet lookup"
                  className="hidden sm:inline-block pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 px-1.5 py-0.5 text-[10px] font-mono rounded border border-white/15 text-[#9CA3AF] bg-black/30"
                >
                  W
                </kbd>
              </div>
              <button
                type="submit"
                disabled={walletLoading}
                className="px-5 py-2.5 rounded-lg bg-[#D4AF37] text-[#090A0F] text-xs sm:text-sm font-semibold hover:bg-[#e5c148] transition-colors whitespace-nowrap"
              >
                {walletLoading ? 'Inspecting...' : 'Lookup Public Wallet'}
              </button>
            </form>

            {/* Quick-Select Public Wallets */}
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="text-[#9CA3AF]">Quick Inspect Public Accounts & Vaults:</span>
              {overview.publicWallets.map((w) => (
                <button
                  key={w.wallet_id}
                  type="button"
                  onClick={() => performWalletLookup(w.public_address)}
                  className={`px-2.5 py-1 rounded border font-mono text-[11px] transition-colors ${
                    walletResult?.wallet.public_address === w.public_address
                      ? 'border-[#D4AF37] bg-[#D4AF37]/15 text-[#D4AF37]'
                      : 'border-white/10 hover:border-white/25 text-[#9CA3AF]'
                  }`}
                >
                  {w.account_identifier}
                </button>
              ))}
            </div>
          </div>

          {walletError && (
            <div className="p-4 rounded-xl border border-red-500/30 bg-red-500/10 text-xs text-red-400">
              {walletError}
            </div>
          )}

          {walletResult && (
            <div
              className={`rounded-xl border p-6 space-y-6 ${
                isDark ? 'bg-[#10131C] border-white/10' : 'bg-white border-neutral-200 shadow-sm'
              }`}
            >
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-white/10">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-xs text-[#D4AF37] font-medium">
                    <span>{walletResult.wallet.wallet_type}</span>
                    <span aria-hidden="true">·</span>
                    <span>Account ID: {walletResult.wallet.account_identifier}</span>
                    <span aria-hidden="true">·</span>
                    <span className="text-emerald-400">
                      Status: {walletResult.wallet.account_status}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold">{walletResult.wallet.label}</h3>
                  <div className="flex items-center gap-2 font-mono text-xs text-[#9CA3AF]">
                    <span>Public Address: {walletResult.wallet.public_address}</span>
                    <button
                      type="button"
                      onClick={() =>
                        handleCopy(walletResult.wallet.public_address, 'wallet-addr')
                      }
                      className="text-[#D4AF37] hover:underline inline-flex items-center gap-1"
                    >
                      <Copy className="w-3 h-3" />
                      <span>{copiedText === 'wallet-addr' ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                </div>

                <div className="text-left lg:text-right">
                  <div className="text-xs text-[#9CA3AF]">Current Public FLYX Balance</div>
                  <div className="font-mono text-2xl sm:text-3xl font-bold text-[#D4AF37] tabular-nums">
                    {formatFlyxAmount(walletResult.wallet.balance, 4)} FLYX
                  </div>
                  <div className="font-mono text-[11px] text-[#6B7280]">
                    Exact DECIMAL(36,8): {walletResult.wallet.balance}
                  </div>
                </div>
              </div>

              {/* Wallet Telemetry Metrics (Total Earned, Total Mining Rewards, Mining Status, Total Transactions) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
                <div className="p-3.5 rounded-xl border border-white/10 bg-black/25">
                  <div className="text-[11px] font-mono uppercase tracking-wider text-[#9CA3AF]">Total Earned / Received</div>
                  <div className="font-mono text-base font-bold text-emerald-400 mt-1 tabular-nums">
                    +{formatFlyxAmount(walletResult.wallet.total_received, 2)} FLYX
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">All inflows verified</div>
                </div>

                <div className="p-3.5 rounded-xl border border-white/10 bg-black/25">
                  <div className="text-[11px] font-mono uppercase tracking-wider text-[#9CA3AF]">Total Mining Rewards</div>
                  <div className="font-mono text-base font-bold text-amber-300 mt-1 tabular-nums">
                    +{formatFlyxAmount(walletResult.wallet.mining_rewards_earned || '0.00000000', 2)} FLYX
                  </div>
                  <div className="text-[10px] text-amber-400/80 mt-0.5">Epoch mining distributions</div>
                </div>

                <div className="p-3.5 rounded-xl border border-white/10 bg-black/25">
                  <div className="text-[11px] font-mono uppercase tracking-wider text-[#9CA3AF]">Mining Status</div>
                  <div className="font-mono text-sm font-bold text-cyan-300 mt-1">
                    {parseFloat(walletResult.wallet.mining_rewards_earned || '0') > 0 ? (
                      <span className="inline-flex items-center gap-1 text-emerald-400">
                        <span className="h-2 w-2 rounded-full bg-emerald-400 inline-block animate-pulse" />
                        Active Mining
                      </span>
                    ) : (
                      <span className="text-slate-400">Non-Mining / Vault</span>
                    )}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">Account state: {walletResult.wallet.account_status}</div>
                </div>

                <div className="p-3.5 rounded-xl border border-white/10 bg-black/25">
                  <div className="text-[11px] font-mono uppercase tracking-wider text-[#9CA3AF]">Total Transactions</div>
                  <div className="font-mono text-base font-bold text-white mt-1 tabular-nums">
                    {walletResult.wallet.transaction_count.toLocaleString()}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">On-ledger records</div>
                </div>

                <div className="p-3.5 rounded-xl border border-white/10 bg-black/25">
                  <div className="text-[11px] font-mono uppercase tracking-wider text-[#9CA3AF]">Cumulative Outflows</div>
                  <div className="font-mono text-base font-bold text-slate-300 mt-1 tabular-nums">
                    {formatFlyxAmount(walletResult.wallet.total_sent, 2)} FLYX
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">Total transfers sent</div>
                </div>

                <div className="p-3.5 rounded-xl border border-white/10 bg-black/25">
                  <div className="text-[11px] font-mono uppercase tracking-wider text-[#9CA3AF]">Locked / Vesting</div>
                  <div className="font-mono text-base font-bold text-indigo-300 mt-1 tabular-nums">
                    {formatFlyxAmount(walletResult.wallet.locked_balance, 2)} FLYX
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">Vesting schedule hold</div>
                </div>
              </div>

              {/* Wallet Public Transaction History */}
              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h4 className="text-xs font-semibold text-[#9CA3AF]">
                    Public Off-Chain Transaction History for {walletResult.wallet.public_address}
                  </h4>
                  <span className="text-[11px] font-mono text-[#9CA3AF]">
                    Sorted by{' '}
                    <span className="text-[#D4AF37]">
                      {walletSortField === 'created_at'
                        ? 'Date'
                        : walletSortField === 'amount'
                        ? 'Amount'
                        : 'Type'}{' '}
                      ({walletSortDirection.toUpperCase()})
                    </span>
                  </span>
                </div>
                <div className="overflow-x-auto rounded-lg border border-white/10">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-black/30 text-[#9CA3AF] border-b border-white/10">
                      <tr>
                        <th className="py-2.5 px-3">Transaction ID</th>
                        <th className="py-2.5 px-3">Ledger Label</th>
                        <th
                          className="py-2.5 px-3"
                          aria-sort={
                            walletSortField === 'tx_type'
                              ? walletSortDirection === 'asc'
                                ? 'ascending'
                                : 'descending'
                              : 'none'
                          }
                        >
                          <button
                            type="button"
                            onClick={() => toggleWalletHistorySort('tx_type')}
                            className="inline-flex items-center gap-1.5 hover:text-[#D4AF37] transition-colors whitespace-nowrap"
                          >
                            <span>Type</span>
                            {renderSortIcon(walletSortField, 'tx_type', walletSortDirection)}
                          </button>
                        </th>
                        <th
                          className="py-2.5 px-3 text-right"
                          aria-sort={
                            walletSortField === 'amount'
                              ? walletSortDirection === 'asc'
                                ? 'ascending'
                                : 'descending'
                              : 'none'
                          }
                        >
                          <button
                            type="button"
                            onClick={() => toggleWalletHistorySort('amount')}
                            className="inline-flex items-center justify-end gap-1.5 ml-auto hover:text-[#D4AF37] transition-colors whitespace-nowrap"
                          >
                            <span>Amount (FLYX)</span>
                            {renderSortIcon(walletSortField, 'amount', walletSortDirection)}
                          </button>
                        </th>
                        <th className="py-2.5 px-3">Counterparty</th>
                        <th
                          className="py-2.5 px-3 text-right"
                          aria-sort={
                            walletSortField === 'created_at'
                              ? walletSortDirection === 'asc'
                                ? 'ascending'
                                : 'descending'
                              : 'none'
                          }
                        >
                          <button
                            type="button"
                            onClick={() => toggleWalletHistorySort('created_at')}
                            className="inline-flex items-center justify-end gap-1.5 ml-auto hover:text-[#D4AF37] transition-colors whitespace-nowrap"
                          >
                            <span>Date</span>
                            {renderSortIcon(walletSortField, 'created_at', walletSortDirection)}
                          </button>
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/10">
                      {sortedWalletTransactions.map((tx) => {
                        const isIncoming =
                          tx.receiver_wallet.toLowerCase() ===
                          walletResult.wallet.public_address.toLowerCase();
                        const isHighValue = decimalToUnits(tx.amount) >= HIGH_VALUE_AUDIT_UNITS;
                        return (
                          <tr
                            key={tx.tx_id}
                            className={
                              isHighValue
                                ? `high-value-audit-row-border ${
                                    isDark ? 'bg-[#FFB800]/[0.05]' : 'bg-[#FFFBEB]'
                                  }`
                                : ''
                            }
                          >
                            <td className="py-2.5 px-3 font-mono text-[#D4AF37]">{tx.tx_id}</td>
                            <td className="py-2.5 px-3 font-mono text-[11px] text-amber-400">
                              Off-Chain / Internal Ledger
                            </td>
                            <td className="py-2.5 px-3 font-mono text-[11px]">{tx.tx_type}</td>
                            <td
                              className={`py-2.5 px-3 font-mono font-semibold text-right tabular-nums ${
                                isIncoming ? 'text-emerald-400' : 'text-[#F5F2EB]'
                              }`}
                            >
                              {isIncoming ? '+' : '-'}
                              {formatFlyxAmount(tx.amount, 4)}
                            </td>
                            <td className="py-2.5 px-3 font-mono text-[11px]">
                              {isIncoming ? tx.sender_wallet : tx.receiver_wallet}
                            </td>
                            <td className="py-2.5 px-3 font-mono text-[11px] text-[#9CA3AF] text-right whitespace-nowrap tabular-nums">
                              {timestampFormat === 'relative'
                                ? `${formatRelativeTime(tx.created_at)} (${tx.created_at.slice(0, 10)})`
                                : tx.created_at}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* =====================================================================
            SECTION 5: OFFICIAL WHITEPAPER READER (12 CHAPTERS)
        ====================================================================== */}
        <section id="whitepaper" className="space-y-6 scroll-mt-20">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-white/10 pb-5">
            <div className="space-y-1.5">
              <div className="text-xs font-medium text-[#D4AF37]">
                Official Ecosystem Documentation ({activeWhitepaperSection.version})
              </div>
              <h2 className="font-display text-2xl sm:text-3xl font-bold">
                FLYX Ecosystem Whitepaper
              </h2>
            </div>
            <div className="text-xs text-[#9CA3AF]">
              12 Chapters · Complete Off-Chain & Future Mainnet Specification
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Chapter Selector Sidebar */}
            <div className="lg:col-span-4 space-y-1.5">
              {overview.whitepaper.map((sec) => (
                <button
                  key={sec.id}
                  type="button"
                  onClick={() => setActiveWpSlug(sec.slug)}
                  className={`w-full text-left px-4 py-3 rounded-lg border text-xs transition-colors flex items-center justify-between ${
                    activeWhitepaperSection.slug === sec.slug
                      ? 'border-[#D4AF37] bg-[#D4AF37]/15 text-[#D4AF37] font-semibold'
                      : isDark
                      ? 'border-white/10 bg-[#10131C] text-[#9CA3AF] hover:text-white'
                      : 'border-neutral-200 bg-white text-neutral-700 hover:border-neutral-400'
                  }`}
                >
                  <span className="truncate">{sec.title}</span>
                  <BookOpen className="w-3.5 h-3.5 shrink-0 opacity-70" />
                </button>
              ))}
            </div>

            {/* Active Chapter Content Reader */}
            <article
              className={`lg:col-span-8 rounded-xl border p-6 sm:p-8 space-y-6 ${
                isDark ? 'bg-[#10131C] border-white/10' : 'bg-white border-neutral-200 shadow-sm'
              }`}
            >
              <div className="space-y-2 border-b border-white/10 pb-5">
                <div className="flex items-center justify-between text-xs text-[#D4AF37] font-mono">
                  <span>CHAPTER {activeWhitepaperSection.section_order} OF 12</span>
                  <span>Version: {activeWhitepaperSection.version}</span>
                </div>
                <h3 className="font-display text-2xl font-bold">
                  {activeWhitepaperSection.title}
                </h3>
                <p className="text-sm text-[#9CA3AF]">{activeWhitepaperSection.subtitle}</p>
              </div>

              <div className="space-y-4 text-sm sm:text-base leading-relaxed whitespace-pre-line max-w-[72ch]">
                {activeWhitepaperSection.content}
              </div>

              <div className="p-5 rounded-xl bg-[#D4AF37]/10 border border-[#D4AF37]/30 space-y-2.5">
                <div className="text-xs font-semibold text-[#D4AF37]">
                  Key Architectural Takeaways
                </div>
                <ul className="space-y-2 text-xs sm:text-sm">
                  {activeWhitepaperSection.key_takeaways.map((point, idx) => (
                    <li key={idx} className="flex items-start gap-2.5">
                      <CheckCircle2 className="w-4 h-4 text-[#D4AF37] shrink-0 mt-0.5" />
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </article>
          </div>
        </section>

        {/* =====================================================================
            SECTION 6: INTERACTIVE 5-PHASE EXECUTION ROADMAP
        ====================================================================== */}
        <section id="roadmap" className="space-y-6 scroll-mt-20">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-white/10 pb-5">
            <div className="space-y-1.5">
              <div className="text-xs font-medium text-[#D4AF37]">
                Verified Engineering Progression
              </div>
              <h2 className="font-display text-2xl sm:text-3xl font-bold">
                Five-Phase Ecosystem Roadmap
              </h2>
            </div>
            <div className="text-xs text-[#9CA3AF]">
              Only phases with 100% verified deliverables are marked Completed
            </div>
          </div>

          {/* 5 Phase Selector Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {overview.roadmap.map((phase) => {
              const isSelected = phase.phase_number === activeRoadmapPhase.phase_number;
              return (
                <button
                  key={phase.id}
                  type="button"
                  onClick={() => setActivePhaseNumber(phase.phase_number)}
                  className={`text-left p-4 rounded-xl border transition-all space-y-2.5 ${
                    isSelected
                      ? 'border-[#D4AF37] bg-[#D4AF37]/10'
                      : isDark
                      ? 'border-white/10 bg-[#10131C] hover:border-white/25'
                      : 'border-neutral-200 bg-white hover:border-neutral-400'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-[#D4AF37] font-semibold">{phase.phase_code}</span>
                    <span
                      className={
                        phase.status === 'COMPLETED'
                          ? 'text-emerald-400'
                          : phase.status === 'IN_PROGRESS'
                          ? 'text-amber-400'
                          : 'text-[#9CA3AF]'
                      }
                    >
                      {phase.status}
                    </span>
                  </div>
                  <div className="font-semibold text-sm">{phase.title}</div>
                  <div className="w-full h-1.5 rounded-full bg-black/40 overflow-hidden">
                    <div
                      className="h-full bg-[#D4AF37]"
                      style={{ width: `${phase.completion_percent}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-[#9CA3AF] font-mono">
                    <span>{phase.target_window}</span>
                    <span>{phase.completion_percent}%</span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Active Phase Detail Panel */}
          <div
            className={`rounded-xl border p-6 sm:p-8 space-y-6 ${
              isDark ? 'bg-[#10131C] border-white/10' : 'bg-white border-neutral-200 shadow-sm'
            }`}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
              <div>
                <div className="text-xs font-mono text-[#D4AF37]">
                  {activeRoadmapPhase.phase_code} · {activeRoadmapPhase.target_window}
                </div>
                <h3 className="font-display text-xl sm:text-2xl font-bold mt-1">
                  {activeRoadmapPhase.title} — {activeRoadmapPhase.subtitle}
                </h3>
              </div>
              <div className="font-mono text-xs px-3 py-1.5 rounded-lg bg-black/30 border border-white/10">
                Status: <strong className="text-[#D4AF37]">{activeRoadmapPhase.status}</strong> (
                {activeRoadmapPhase.completion_percent}%)
              </div>
            </div>

            <p className="text-sm leading-relaxed text-[#9CA3AF] max-w-3xl">
              {activeRoadmapPhase.summary}
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {activeRoadmapPhase.deliverables.map((deliv, i) => (
                <div
                  key={i}
                  className="p-4 rounded-lg border border-white/10 bg-black/20 space-y-2"
                >
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span>{deliv.title}</span>
                    <span
                      className={`font-mono ${
                        deliv.completed ? 'text-emerald-400' : 'text-amber-400'
                      }`}
                    >
                      {deliv.completed ? 'VERIFIED' : 'PENDING'}
                    </span>
                  </div>
                  <p className="text-xs text-[#9CA3AF] leading-relaxed">{deliv.detail}</p>
                </div>
              ))}
            </div>

            <div className="text-xs font-mono text-[#9CA3AF] pt-2 border-t border-white/10">
              Audit Verification Note: {activeRoadmapPhase.verification_note}
            </div>
          </div>
        </section>

        {/* =====================================================================
            SECTION 7: FUTURE BLOCKCHAIN ARCHITECTURE & MODULAR INTERFACES
        ====================================================================== */}
        <section id="blockchain-architecture" className="space-y-6">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-white/10 pb-5">
            <div className="space-y-1.5">
              <div className="text-xs font-medium text-[#D4AF37]">
                Pluggable Service Architecture (Zero-Rebuild Mainnet Upgrade Path)
              </div>
              <h2 className="font-display text-2xl sm:text-3xl font-bold">
                Future Blockchain & On-Chain Analytics Readiness
              </h2>
            </div>
            <button
              type="button"
              onClick={openMySqlSchemaModal}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#D4AF37] hover:underline"
            >
              <Code2 className="w-4 h-4" />
              <span>Inspect Normalized MySQL Schema (schema.sql)</span>
            </button>
          </div>

          <div
            className={`p-5 rounded-xl border ${
              isDark ? 'bg-[#10131C] border-white/10' : 'bg-white border-neutral-200 shadow-sm'
            } space-y-4`}
          >
            <p className="text-xs sm:text-sm text-[#9CA3AF] leading-relaxed">
              FLYX Insight is engineered with decoupled TypeScript adapter interfaces so that when
              the FLYX Blockchain launches in Phase 4/5, the portal transitions from the current{' '}
              <strong>Off-Chain MySQL Project Ledger</strong> to live{' '}
              <strong>On-Chain RPC & Indexer Verification</strong> without rebuilding the website.
              Below is the live status of each service module:
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {overview.futureBlockchainServices.map((srv) => (
                <div
                  key={srv.serviceId}
                  className="p-4 rounded-xl border border-white/10 bg-black/20 space-y-2.5 flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs font-mono">
                      <span className="text-[#D4AF37] font-semibold">{srv.interfaceName}</span>
                      <span
                        className={
                          srv.deploymentState === 'ACTIVE_OFF_CHAIN'
                            ? 'text-emerald-400'
                            : 'text-amber-400'
                        }
                      >
                        {srv.deploymentState}
                      </span>
                    </div>
                    <h3 className="text-sm font-bold">{srv.serviceName}</h3>
                    <p className="text-xs text-[#9CA3AF] leading-relaxed">{srv.description}</p>
                  </div>

                  <div className="pt-3 border-t border-white/10 space-y-1 text-[11px] font-mono">
                    <div>
                      <span className="text-[#9CA3AF]">Today:</span> {srv.currentProvider}
                    </div>
                    <div>
                      <span className="text-[#9CA3AF]">Phase 4/5:</span> {srv.futureMainnetProvider}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* =====================================================================
            SECTION 8: OFFICIAL ANNOUNCEMENTS & AUDIT VERIFICATION REGISTRY
        ====================================================================== */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Official Announcements */}
          <div className="lg:col-span-7 space-y-4">
            <div className="border-b border-white/10 pb-3">
              <div className="text-xs font-medium text-[#D4AF37]">
                FLYX Foundation Communications
              </div>
              <h2 className="font-display text-xl sm:text-2xl font-bold">
                Official Ecosystem Announcements
              </h2>
            </div>

            <div className="space-y-3">
              {overview.announcements.map((ann) => (
                <article
                  key={ann.id}
                  className={`p-5 rounded-xl border space-y-2 ${
                    isDark
                      ? 'bg-[#10131C] border-white/10'
                      : 'bg-white border-neutral-200 shadow-sm'
                  }`}
                >
                  <div className="flex flex-wrap items-center gap-2 text-xs text-[#9CA3AF]">
                    <span className="text-[#D4AF37] font-semibold">{ann.category}</span>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono">{ann.published_at.slice(0, 10)}</span>
                    <span aria-hidden="true">·</span>
                    <span>{ann.author}</span>
                    {ann.is_pinned && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span className="text-emerald-400 font-medium">Pinned Notice</span>
                      </>
                    )}
                  </div>
                  <h3 className="text-base font-bold">{ann.title}</h3>
                  <p className="text-xs sm:text-sm text-[#9CA3AF] leading-relaxed">
                    {ann.content}
                  </p>
                </article>
              ))}
            </div>
          </div>

          {/* Audit & Verification Checksums */}
          <div className="lg:col-span-5 space-y-4">
            <div className="border-b border-white/10 pb-3">
              <div className="text-xs font-medium text-[#D4AF37]">
                Ledger Integrity Attestations
              </div>
              <h2 className="font-display text-xl sm:text-2xl font-bold">
                Transparency & Audit Logs
              </h2>
            </div>

            <div className="space-y-3">
              {overview.audits.map((aud) => (
                <div
                  key={aud.id}
                  className={`p-5 rounded-xl border space-y-2 ${
                    isDark
                      ? 'bg-[#10131C] border-white/10'
                      : 'bg-white border-neutral-200 shadow-sm'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-mono text-[#D4AF37]">{aud.id}</span>
                    <span
                      className={`font-mono font-semibold ${
                        aud.status === 'VERIFIED' ? 'text-emerald-400' : 'text-amber-400'
                      }`}
                    >
                      {aud.status}
                    </span>
                  </div>
                  <h3 className="text-sm font-bold">{aud.audit_title}</h3>
                  <p className="text-xs text-[#9CA3AF] leading-relaxed">{aud.summary}</p>
                  <div className="pt-2 border-t border-white/10 text-[11px] font-mono text-[#6B7280] break-all">
                    SHA-256: {aud.checksum_sha256}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      {/* =====================================================================
          FOOTER (Quiet Institutional Links & Explicit Off-Chain Disclosure)
      ====================================================================== */}
      <footer
        className={`border-t mt-20 py-12 ${
          isDark ? 'bg-[#07080C] border-white/10' : 'bg-neutral-100 border-neutral-200'
        }`}
      >
        <div className="max-w-[1380px] mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="md:col-span-2 space-y-3">
              <div className="font-display text-lg font-bold text-[#D4AF37]">FLYX Insight</div>
              <p className="text-xs text-[#9CA3AF] max-w-md leading-relaxed">
                The official public information, tokenomics, off-chain ledger explorer, and future
                blockchain architecture portal connected to{' '}
                <a
                  href={overview.tokenInfo.main_portal_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#D4AF37] underline"
                >
                  FlyXCoin.com
                </a>
                .
              </p>
              <p className="text-[11px] text-[#6B7280] leading-relaxed max-w-xl">
                Transparency Disclosure: FLYX is currently in Pre-Mainnet phases (Phase 2/3). All
                token balances and transactions displayed on FLYX Insight represent records on the
                official FlyXCoin.com MySQL off-chain project ledger and do not constitute an
                on-chain deployment or financial investment solicitation.
              </p>
            </div>

            <div className="space-y-2 text-xs">
              <div className="font-semibold text-[#D4AF37]">Portal Navigation</div>
              <ul className="space-y-1.5 text-[#9CA3AF]">
                <li>
                  <a href="#overview" className="hover:text-white">
                    Ecosystem Overview
                  </a>
                </li>
                <li>
                  <a href="#tokenomics" className="hover:text-white">
                    Public Tokenomics Dashboard
                  </a>
                </li>
                <li>
                  <a href="#explorer" className="hover:text-white">
                    Off-Chain Transaction Explorer
                  </a>
                </li>
                <li>
                  <a href="#wallets" className="hover:text-white">
                    Public Wallet Lookup
                  </a>
                </li>
                <li>
                  <a href="#whitepaper" className="hover:text-white">
                    Official Whitepaper & Roadmap
                  </a>
                </li>
              </ul>
            </div>

            <div className="space-y-2 text-xs">
              <div className="font-semibold text-[#D4AF37]">Official Ecosystem Links</div>
              <ul className="space-y-1.5 text-[#9CA3AF]">
                <li>
                  <a
                    href={overview.tokenInfo.main_portal_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[#D4AF37] hover:underline font-medium"
                  >
                    <span>FlyXCoin.com (Main Platform)</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={openMySqlSchemaModal}
                    className="hover:text-white"
                  >
                    MySQL DECIMAL(36,8) Database Schema
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => setAdminOpen(true)}
                    className="hover:text-white"
                  >
                    Authorized Admin Governance Console
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => setShortcutsModalOpen(true)}
                    className="hover:text-white"
                  >
                    Keyboard Shortcuts (?)
                  </button>
                </li>
                <li>
                  <a href="/sitemap.xml" target="_blank" className="hover:text-white">
                    XML Sitemap
                  </a>
                </li>
              </ul>
            </div>
          </div>

          <div className="pt-6 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#6B7280]">
            <div>
              © {new Date().getFullYear()} FLYX Insight & FlyXCoin.com Ecosystem. All rights
              reserved.
            </div>
            <div className="font-mono">
              Ledger Mode: {overview.tokenInfo.ledger_mode} · Precision: DECIMAL(36,8)
            </div>
          </div>
        </div>
      </footer>

      {/* =====================================================================
          MYSQL SCHEMA.SQL INSPECTION MODAL
      ====================================================================== */}
      {schemaModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div
            className={`w-full max-w-4xl max-h-[85vh] flex flex-col rounded-xl border p-6 shadow-2xl ${
              isDark
                ? 'bg-[#0F1219] border-[#D4AF37]/40 text-[#F5F2EB]'
                : 'bg-white border-neutral-300 text-neutral-900'
            }`}
          >
            <div className="flex items-center justify-between pb-4 border-b border-white/10">
              <div className="flex items-center gap-2.5">
                <Database className="w-5 h-5 text-[#D4AF37]" />
                <div>
                  <h3 className="font-display text-base font-bold">
                    Normalized MySQL 8.0 Database Schema (/database/schema.sql)
                  </h3>
                  <p className="text-xs text-[#9CA3AF]">
                    Strict DECIMAL(36,8) fixed-point precision for all token supply, wallet, and
                    ledger tables
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleCopy(schemaSqlText, 'sql')}
                  className="px-3 py-1.5 rounded-lg bg-[#D4AF37] text-[#090A0F] text-xs font-semibold"
                >
                  {copiedText === 'sql' ? 'Copied DDL' : 'Copy SQL Schema'}
                </button>
                <button
                  type="button"
                  onClick={() => setSchemaModalOpen(false)}
                  className="p-1.5 rounded-lg text-[#9CA3AF] hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <pre className="mt-4 p-4 rounded-lg bg-black/60 border border-white/10 text-xs font-mono text-emerald-300 overflow-y-auto flex-1 leading-relaxed">
              {schemaSqlText || 'Loading schema.sql...'}
            </pre>
          </div>
        </div>
      )}

      {/* =====================================================================
          KEYBOARD SHORTCUTS MODAL ('?' to toggle, 'Esc' to close)
      ====================================================================== */}
      {shortcutsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div
            className={`w-full max-w-lg rounded-xl border p-6 space-y-4 shadow-2xl ${
              isDark
                ? 'bg-[#0F1219] border-[#FFB800]/40 text-[#F8FAFC]'
                : 'bg-white border-neutral-300 text-neutral-900'
            }`}
          >
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div>
                <div className="text-xs font-semibold text-[#FFB800]">Power User Navigation</div>
                <h3 className="font-display text-base font-bold mt-0.5">
                  Global Keyboard Shortcuts
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShortcutsModalOpen(false)}
                className="p-1.5 rounded-lg text-[#9CA3AF] hover:text-white"
                aria-label="Close Keyboard Shortcuts Modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2 text-xs">
              {[
                { key: '/', desc: 'Focus Transaction Explorer search bar' },
                { key: 'W', desc: 'Focus Public Wallet Lookup search bar' },
                { key: 'Esc', desc: 'Close active modal / drawer or unfocus input' },
                { key: '1 – 5', desc: 'Jump directly to Overview, Tokenomics, Explorer, Wallets, or Whitepaper' },
                { key: '?', desc: 'Toggle this Keyboard Shortcuts reference dialog' },
              ].map((item) => (
                <div
                  key={item.key}
                  className="flex items-center justify-between py-2 px-3 rounded-lg bg-black/20 border border-white/10"
                >
                  <span className="text-[#9CA3AF]">{item.desc}</span>
                  <kbd className="px-2 py-1 rounded font-mono text-xs font-semibold bg-[#FFB800]/15 text-[#FFB800] border border-[#FFB800]/30">
                    {item.key}
                  </kbd>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          AUTHORIZED ADMIN CONSOLE MODAL
      ====================================================================== */}
      <AdminConsoleModal
        isOpen={adminOpen}
        onClose={() => setAdminOpen(false)}
        overview={overview}
        onOverviewUpdated={(updated) => {
          setOverview(updated);
          setFilteredTransactions(updated.recentTransactions);
        }}
        theme={theme}
      />

      {/* =====================================================================
          CSV EXPORT CONFIRMATION TOAST NOTIFICATION
      ====================================================================== */}
      {csvExportToast && (
        <aside
          role="status"
          aria-live="polite"
          className="fixed bottom-5 right-5 sm:bottom-6 sm:right-6 z-50 max-w-sm sm:max-w-md w-[calc(100vw-2.5rem)] animate-in fade-in slide-in-from-bottom-5 duration-300"
        >
          {/* Subtle Ambient Glow */}
          <div className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-[#D4AF37]/30 via-emerald-500/20 to-cyan-500/20 blur-lg -z-10" />

          <div
            className={`relative rounded-2xl border p-4 shadow-2xl backdrop-blur-xl transition-all ${
              isDark
                ? 'bg-[#10131C]/95 border-[#D4AF37]/40 text-[#F5F2EB]'
                : 'bg-white/95 border-emerald-500/40 text-neutral-900 shadow-emerald-500/10'
            }`}
          >
            <div className="flex items-start gap-3">
              {/* Icon with Glowing Badge */}
              <div className="relative shrink-0 mt-0.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-[#D4AF37] text-black flex items-center justify-center shadow-sm">
                  <CheckCircle2 className="w-3 h-3 text-black fill-[#D4AF37]" />
                </div>
              </div>

              {/* Toast Content */}
              <div className="flex-1 min-w-0 pr-1">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <span className="font-semibold text-xs tracking-wide text-emerald-400">
                      CSV Export Downloaded
                    </span>
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  </div>
                  <span className="font-mono text-[10px] text-[#9CA3AF]">
                    {csvExportToast.timestamp}
                  </span>
                </div>

                <div
                  className="font-mono text-xs font-semibold text-[#FFB800] mt-1 truncate"
                  title={csvExportToast.filename}
                >
                  {csvExportToast.filename}
                </div>

                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1.5 text-[11px] text-[#9CA3AF]">
                  <span className="inline-flex items-center gap-1 text-slate-300 font-mono">
                    <span className="text-white font-bold">{csvExportToast.rowCount}</span> records
                  </span>
                  <span>•</span>
                  <span className="font-mono text-slate-300">
                    <span className="text-white font-bold">{csvExportToast.columnCount}</span> columns
                  </span>
                  <span>•</span>
                  <span className="text-[10px] text-cyan-400 font-mono">UTF-8 + BOM</span>
                </div>

                <div className="mt-2 pt-2 border-t border-white/10 flex items-center justify-between text-[11px]">
                  <span className="text-[10px] text-[#9CA3AF] truncate">
                    {csvExportToast.exportType}
                  </span>
                  <span className="text-[10px] font-medium text-emerald-400/90 font-mono">
                    ✓ Saved to Downloads
                  </span>
                </div>
              </div>

              {/* Actions: Replay Chime & Dismiss */}
              <div className="flex items-center gap-0.5 shrink-0">
                <button
                  type="button"
                  onClick={() => playExportSuccessSound()}
                  className="p-1 rounded-lg text-slate-400 hover:text-[#FFB800] hover:bg-white/10 transition-colors shrink-0"
                  aria-label="Replay export sound chime"
                  title="Replay notification sound"
                >
                  <Volume2 className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (csvExportToastTimerRef.current) {
                      clearTimeout(csvExportToastTimerRef.current);
                    }
                    setCsvExportToast(null);
                  }}
                  className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors shrink-0"
                  aria-label="Dismiss export notification"
                  title="Dismiss"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </aside>
      )}
    </div>
  );
}
