import type {
  BlockchainNetworkStats,
  LedgerEnvironment,
  ServiceModuleDescriptor,
} from '../services/blockchainAdapter.ts';

export interface TokenInfo {
  token_symbol: string;
  token_name: string;
  decimals: number;
  max_supply: string; // DECIMAL(36,8)
  ledger_mode: 'OFF_CHAIN_MYSQL_LEDGER' | 'HYBRID_BRIDGE' | 'ON_CHAIN_MAINNET';
  blockchain_status: string;
  contract_address: string | null;
  main_portal_url: string;
  insight_portal_url: string;
  updated_at: string;
}

export interface SupplyStatistics {
  max_supply: string;
  circulating_supply: string;
  distributed_supply: string;
  undistributed_supply: string;
  community_mining_supply: string;
  team_allocation_supply: string;
  treasury_reserve_supply: string;
  liquidity_allocation_supply: string;
  ecosystem_rewards_supply: string;
  strategic_reserve_supply: string;
  active_wallets_count: number;
  total_ledger_transactions: number;
  last_reconciled_at: string;
}

export interface TokenAllocation {
  id: number;
  category_key: string;
  category_name: string;
  allocated_amount: string; // DECIMAL(36,8)
  distributed_amount: string; // DECIMAL(36,8)
  remaining_amount: string; // DECIMAL(36,8)
  percentage_share: string; // DECIMAL(6,2)
  custody_wallet_address: string;
  lockup_policy: string;
  release_schedule: string;
  verification_status: 'VERIFIED_OFF_CHAIN_RESERVE' | 'LOCKED_VESTING' | 'ACTIVE_DISTRIBUTION';
  description: string;
  color_hex: string;
  updated_at: string;
}

export type WalletType =
  | 'TREASURY_VAULT'
  | 'MINING_POOL'
  | 'LIQUIDITY_RESERVE'
  | 'TEAM_VESTING'
  | 'ECOSYSTEM_FUND'
  | 'USER_WALLET';

export type AccountStatus = 'ACTIVE' | 'LOCKED_VESTING' | 'AUDIT_HOLD' | 'SUSPENDED';

export type UserContractStatus =
  | 'ACTIVE'
  | 'PENDING_DEPLOYMENT'
  | 'PAUSED'
  | 'REVOKED';

export interface UserContractAddressRecord {
  id: number;
  user_id: string;
  username?: string;
  email?: string;
  mobile?: string;
  wallet_address: string; // Internal FlyX off-chain wallet identifier (e.g. FLYX-USER-8849-A91C-77E2)
  contract_address: string; // Unique Smart Contract address (e.g. 0x8849A1D3b28E3A759f20E2DbE08f906471E2D4F6)
  network: string; // e.g. "FLYX Sovereign EVM (Pre-Mainnet)"
  token_symbol: string; // "FLYX"
  status: UserContractStatus;
  is_primary: boolean;
  deployed_at?: string | null;
  transaction_ref?: string | null;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface PublicWalletRecord {
  wallet_id: string;
  public_address: string;
  account_identifier: string;
  label: string;
  wallet_type: WalletType;
  balance: string; // DECIMAL(36,8)
  locked_balance: string; // DECIMAL(36,8)
  total_received: string; // DECIMAL(36,8)
  total_sent: string; // DECIMAL(36,8)
  mining_rewards_earned: string; // DECIMAL(36,8)
  transaction_count: number;
  account_status: AccountStatus;
  is_public: boolean;
  verificationProof?: string | null;
  verification_proof?: string | null;
  created_at: string;
  last_activity_at: string;
}

export type TransactionType =
  | 'MINING_DISTRIBUTION'
  | 'USER_TRANSFER'
  | 'TREASURY_ALLOCATION'
  | 'ECOSYSTEM_REWARD'
  | 'LIQUIDITY_PROVISION'
  | 'TEAM_VESTING_LOCK';

export type TransactionStatus = 'CONFIRMED' | 'PENDING' | 'RECONCILED';

export interface LedgerTransaction {
  tx_id: string;
  contract_address?: string;
  ledger_environment: LedgerEnvironment;
  tx_type: TransactionType;
  amount: string; // DECIMAL(36,8)
  fee: string; // DECIMAL(36,8)
  status: TransactionStatus;
  sender_wallet: string;
  receiver_wallet: string;
  user_id_reference: string | null;
  memo: string;
  is_public: boolean;
  created_at: string;
}

export interface RoadmapPhase {
  id: number;
  phase_number: number;
  phase_code: string;
  title: string;
  subtitle: string;
  status: 'COMPLETED' | 'IN_PROGRESS' | 'PLANNED';
  completion_percent: number;
  target_window: string;
  summary: string;
  deliverables: {
    title: string;
    completed: boolean;
    detail: string;
  }[];
  verification_note: string;
  updated_at: string;
}

export interface AnnouncementItem {
  id: string;
  title: string;
  category:
    | 'TRANSPARENCY_REPORT'
    | 'PLATFORM_UPDATE'
    | 'TOKENOMICS_NOTICE'
    | 'SECURITY_AUDIT'
    | 'ECOSYSTEM_NEWS';
  summary: string;
  content: string;
  author: string;
  external_link: string;
  is_pinned: boolean;
  published_at: string;
}

export interface WhitepaperSection {
  id: string;
  section_order: number;
  slug: string;
  title: string;
  subtitle: string;
  content: string;
  key_takeaways: string[];
  version: string;
  updated_at: string;
}

export interface AuditLogEntry {
  id: string;
  audit_title: string;
  scope: string;
  auditor: string;
  status: 'VERIFIED' | 'IN_REVIEW' | 'SCHEDULED';
  checksum_sha256: string;
  summary: string;
  audited_at: string;
}

export interface MiningPlan {
  plan_id: string;
  plan_name: string;
  mining_speed: string; // e.g. "15.0 MH/s"
  mining_rate_flyx_day: string; // DECIMAL(36,8) daily emission
  required_points: number;
  duration_days: number;
  status: 'ACTIVE' | 'MAINTENANCE' | 'ARCHIVED';
  reward_configuration: string;
  user_eligibility: string;
  active_users: number;
  total_rewards_generated: string; // DECIMAL(36,8)
  updated_at: string;
}

export interface MiningPointsStats {
  total_points_issued: number;
  points_earned_active: number;
  points_used_redeemed: number;
  mining_related_points: number;
  plan_related_points: number;
  active_mining_users: number;
  total_registered_users: number;
  current_network_hashrate: string;
  average_daily_mining_emission: string; // DECIMAL(36,8)
  total_mined_flyx: string; // DECIMAL(36,8)
  last_calculated_at: string;
}

export interface SystemHealthStatus {
  api_status: 'CONNECTED' | 'WARNING' | 'ERROR';
  mysql_status: 'CONNECTED' | 'WARNING' | 'ERROR';
  mining_service_status: 'CONNECTED' | 'WARNING' | 'ERROR';
  wallet_service_status: 'CONNECTED' | 'WARNING' | 'ERROR';
  transaction_service_status: 'CONNECTED' | 'WARNING' | 'ERROR';
  auth_service_status: 'CONNECTED' | 'WARNING' | 'ERROR';
  ledger_service_status: 'CONNECTED' | 'WARNING' | 'ERROR';
  last_checked_at: string;
}

export interface OverviewResponse {
  tokenInfo: TokenInfo;
  supplyStats: SupplyStatistics;
  allocations: TokenAllocation[];
  recentTransactions: LedgerTransaction[];
  publicWallets: PublicWalletRecord[];
  roadmap: RoadmapPhase[];
  announcements: AnnouncementItem[];
  whitepaper: WhitepaperSection[];
  audits: AuditLogEntry[];
  networkStats: BlockchainNetworkStats;
  futureBlockchainServices: ServiceModuleDescriptor[];
  miningPlans: MiningPlan[];
  miningStats: MiningPointsStats;
  userContractAddresses: UserContractAddressRecord[];
  systemHealth: SystemHealthStatus;
  supplyVerification: {
    isValid: boolean;
    computedTotal: string;
    expectedMaxSupply: string;
    ledgerEnvironment: LedgerEnvironment;
    verificationProof: string;
  };
  databaseEngineInfo: {
    engine: string;
    precisionType: 'DECIMAL(36,8)';
    floatingPointUsed: false;
    mysqlConnectionMode: 'LIVE_MYSQL_POOL' | 'MYSQL_NORMALIZED_LEDGER_ENGINE';
  };
}

export type SupplyVerificationResult = OverviewResponse['supplyVerification'];
export type OverviewData = OverviewResponse;

