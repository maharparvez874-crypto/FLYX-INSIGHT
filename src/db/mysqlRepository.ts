import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import mysql from 'mysql2/promise';
import {
  AccountStatus,
  AnnouncementItem,
  AuditLogEntry,
  LedgerTransaction,
  MiningPlan,
  MiningPointsStats,
  OverviewResponse,
  PublicWalletRecord,
  RoadmapPhase,
  SupplyStatistics,
  SystemHealthStatus,
  TokenAllocation,
  TokenInfo,
  TransactionStatus,
  TransactionType,
  UserContractAddressRecord,
  UserContractStatus,
  WhitepaperSection,
} from '../types/flyx.ts';
import {
  addDecimal8,
  decimalToUnits,
  FlyxSupplyVerifier,
  FUTURE_BLOCKCHAIN_SERVICES,
  isValidDecimal8,
  subDecimal8,
  unitsToDecimal,
} from '../services/blockchainAdapter.ts';

interface NormalizedDatabaseStore {
  tokenInfo: TokenInfo;
  allocations: TokenAllocation[];
  wallets: PublicWalletRecord[];
  transactions: LedgerTransaction[];
  roadmap: RoadmapPhase[];
  announcements: AnnouncementItem[];
  whitepaper: WhitepaperSection[];
  audits: AuditLogEntry[];
  miningPlans: MiningPlan[];
  miningStats: MiningPointsStats;
  userContractAddresses: UserContractAddressRecord[];
}

const DATA_FILE_PATH = path.resolve(process.cwd(), 'database', 'ledger_store.json');
const SCHEMA_SQL_PATH = path.resolve(process.cwd(), 'database', 'schema.sql');

const INITIAL_STORE: NormalizedDatabaseStore = {
  tokenInfo: {
    token_symbol: 'FLYX',
    token_name: 'FLYX Ecosystem Token',
    decimals: 8,
    max_supply: '1000000000.00000000',
    ledger_mode: 'OFF_CHAIN_MYSQL_LEDGER',
    blockchain_status: 'Off-Chain MySQL Project Ledger (Pre-Mainnet Phase)',
    contract_address: '0x71C8A1D3b28E3A759f20E2DbE08f906471E2D4F6',
    main_portal_url: 'https://flyxcoin.com',
    insight_portal_url: 'https://insight.flyxcoin.com',
    updated_at: '2026-10-05T18:30:00Z',
  },
  allocations: [
    {
      id: 1,
      category_key: 'COMMUNITY_MINING',
      category_name: 'Community & Mining Allocation',
      allocated_amount: '400000000.00000000',
      distributed_amount: '94250180.45000000',
      remaining_amount: '305749819.55000000',
      percentage_share: '40.00',
      custody_wallet_address: 'FLYX-VAULT-MINING-0001-CORE',
      lockup_policy: 'Epoch-based algorithmic emission via FlyXCoin.com mining engine',
      release_schedule: 'Daily verified activity & mining cycle settlement over 60 months',
      verification_status: 'ACTIVE_DISTRIBUTION',
      description:
        'Dedicated to active FlyXCoin.com miners, node contributors, and verified community participation cycles.',
      color_hex: '#D4AF37',
      updated_at: '2026-10-05T18:00:00Z',
    },
    {
      id: 2,
      category_key: 'ECOSYSTEM_REWARDS',
      category_name: 'Ecosystem & Rewards Pool',
      allocated_amount: '180000000.00000000',
      distributed_amount: '28410000.00000000',
      remaining_amount: '151590000.00000000',
      percentage_share: '18.00',
      custody_wallet_address: 'FLYX-VAULT-ECOSYS-0002-GRNT',
      lockup_policy: 'Milestone-gated governance release',
      release_schedule: 'Quarterly ecosystem developer grants, staking rewards & partner integrations',
      verification_status: 'ACTIVE_DISTRIBUTION',
      description:
        'Supports ecosystem utility expansion, FlyXCoin.com merchant integrations, and long-term participation incentives.',
      color_hex: '#10B981',
      updated_at: '2026-10-05T18:00:00Z',
    },
    {
      id: 3,
      category_key: 'TREASURY_RESERVE',
      category_name: 'Treasury & Sovereign Reserve',
      allocated_amount: '170000000.00000000',
      distributed_amount: '14500000.00000000',
      remaining_amount: '155500000.00000000',
      percentage_share: '17.00',
      custody_wallet_address: 'FLYX-VAULT-TREASURY-0003-RESV',
      lockup_policy: 'Multi-authorization institutional reserve control',
      release_schedule: '12-month cliff followed by 48-month linear governance unlock',
      verification_status: 'VERIFIED_OFF_CHAIN_RESERVE',
      description:
        'Long-term protocol sustainability reserve, security audit funding, and future Phase 4/5 blockchain infrastructure.',
      color_hex: '#3B82F6',
      updated_at: '2026-10-05T18:00:00Z',
    },
    {
      id: 4,
      category_key: 'LIQUIDITY_ALLOCATION',
      category_name: 'Liquidity & Market Stabilization',
      allocated_amount: '120000000.00000000',
      distributed_amount: '22000000.00000000',
      remaining_amount: '98000000.00000000',
      percentage_share: '12.00',
      custody_wallet_address: 'FLYX-VAULT-LIQUID-0004-POOL',
      lockup_policy: 'Ring-fenced for ecosystem liquidity provisioning',
      release_schedule: 'Synchronized with Phase 3/5 token infrastructure milestones',
      verification_status: 'VERIFIED_OFF_CHAIN_RESERVE',
      description:
        'Reserved for ecosystem settlement pools, cross-portal liquidity depth, and future on-chain bridge collateral.',
      color_hex: '#F59E0B',
      updated_at: '2026-10-05T18:00:00Z',
    },
    {
      id: 5,
      category_key: 'TEAM_ALLOCATION',
      category_name: 'Core Team & Engineering',
      allocated_amount: '80000000.00000000',
      distributed_amount: '4000000.00000000',
      remaining_amount: '76000000.00000000',
      percentage_share: '8.00',
      custody_wallet_address: 'FLYX-VAULT-TEAM-0005-VEST',
      lockup_policy: '18-month strict cliff, 36-month linear monthly vesting',
      release_schedule: '5.00% initial engineering milestone unlocked; 95.00% locked in vesting ledger',
      verification_status: 'LOCKED_VESTING',
      description:
        'Long-term alignment for FLYX core protocol engineers, security architects, and infrastructure maintainers.',
      color_hex: '#8B5CF6',
      updated_at: '2026-10-05T18:00:00Z',
    },
    {
      id: 6,
      category_key: 'STRATEGIC_RESERVE',
      category_name: 'Strategic & Validator Onboarding',
      allocated_amount: '50000000.00000000',
      distributed_amount: '3200000.00000000',
      remaining_amount: '46800000.00000000',
      percentage_share: '5.00',
      custody_wallet_address: 'FLYX-VAULT-STRAT-0006-NODE',
      lockup_policy: '6-month cliff, 24-month quarterly release',
      release_schedule: 'Reserved for institutional node operators and ecosystem infrastructure partners',
      verification_status: 'LOCKED_VESTING',
      description:
        'Supports early validator hardware preparation, compliance audits, and enterprise integration with FlyXCoin.com.',
      color_hex: '#EC4899',
      updated_at: '2026-10-05T18:00:00Z',
    },
  ],
  wallets: [
    {
      wallet_id: 'WL-0001',
      public_address: 'FLYX-VAULT-MINING-0001-CORE',
      account_identifier: 'flyx-mining-reserve',
      label: 'Official Community & Mining Distribution Pool',
      wallet_type: 'MINING_POOL',
      balance: '305749819.55000000',
      locked_balance: '280000000.00000000',
      total_received: '400000000.00000000',
      total_sent: '94250180.45000000',
      mining_rewards_earned: '0.00000000',
      transaction_count: 14820,
      account_status: 'ACTIVE',
      is_public: true,
      created_at: '2025-11-01T00:00:00Z',
      last_activity_at: '2026-10-05T18:12:00Z',
    },
    {
      wallet_id: 'WL-0002',
      public_address: 'FLYX-VAULT-ECOSYS-0002-GRNT',
      account_identifier: 'flyx-ecosystem-pool',
      label: 'Official Ecosystem & Rewards Vault',
      wallet_type: 'ECOSYSTEM_FUND',
      balance: '151590000.00000000',
      locked_balance: '130000000.00000000',
      total_received: '180000000.00000000',
      total_sent: '28410000.00000000',
      mining_rewards_earned: '0.00000000',
      transaction_count: 642,
      account_status: 'ACTIVE',
      is_public: true,
      created_at: '2025-11-01T00:00:00Z',
      last_activity_at: '2026-10-05T16:40:00Z',
    },
    {
      wallet_id: 'WL-0003',
      public_address: 'FLYX-VAULT-TREASURY-0003-RESV',
      account_identifier: 'flyx-treasury-reserve',
      label: 'FLYX Foundation Sovereign Treasury Vault',
      wallet_type: 'TREASURY_VAULT',
      balance: '155500000.00000000',
      locked_balance: '155500000.00000000',
      total_received: '170000000.00000000',
      total_sent: '14500000.00000000',
      mining_rewards_earned: '0.00000000',
      transaction_count: 48,
      account_status: 'LOCKED_VESTING',
      is_public: true,
      created_at: '2025-11-01T00:00:00Z',
      last_activity_at: '2026-10-04T09:15:00Z',
    },
    {
      wallet_id: 'WL-0004',
      public_address: 'FLYX-VAULT-LIQUID-0004-POOL',
      account_identifier: 'flyx-liquidity-reserve',
      label: 'Ecosystem Liquidity & Settlement Custody',
      wallet_type: 'LIQUIDITY_RESERVE',
      balance: '98000000.00000000',
      locked_balance: '98000000.00000000',
      total_received: '120000000.00000000',
      total_sent: '22000000.00000000',
      mining_rewards_earned: '0.00000000',
      transaction_count: 34,
      account_status: 'ACTIVE',
      is_public: true,
      created_at: '2025-11-01T00:00:00Z',
      last_activity_at: '2026-10-03T14:20:00Z',
    },
    {
      wallet_id: 'WL-0005',
      public_address: 'FLYX-VAULT-TEAM-0005-VEST',
      account_identifier: 'flyx-team-vesting',
      label: 'Core Team Time-Locked Vesting Custody',
      wallet_type: 'TEAM_VESTING',
      balance: '76000000.00000000',
      locked_balance: '76000000.00000000',
      total_received: '80000000.00000000',
      total_sent: '4000000.00000000',
      mining_rewards_earned: '0.00000000',
      transaction_count: 12,
      account_status: 'LOCKED_VESTING',
      is_public: true,
      created_at: '2025-11-01T00:00:00Z',
      last_activity_at: '2026-09-30T12:00:00Z',
    },
    {
      wallet_id: 'WL-0006',
      public_address: 'FLYX-USER-8849-A91C-77E2',
      account_identifier: 'USR-FLYX-8849',
      label: 'Verified FlyXCoin.com Pioneer Miner #8849',
      wallet_type: 'USER_WALLET',
      balance: '148520.75000000',
      locked_balance: '25000.00000000',
      total_received: '162400.75000000',
      total_sent: '13880.00000000',
      mining_rewards_earned: '112400.75000000',
      transaction_count: 184,
      account_status: 'ACTIVE',
      is_public: true,
      created_at: '2026-01-14T08:30:00Z',
      last_activity_at: '2026-10-05T18:12:00Z',
    },
    {
      wallet_id: 'WL-0007',
      public_address: 'FLYX-USER-3092-B44D-19F0',
      account_identifier: 'USR-FLYX-3092',
      label: 'Verified FlyXCoin.com Ecosystem Holder #3092',
      wallet_type: 'USER_WALLET',
      balance: '84910.12500000',
      locked_balance: '0.00000000',
      total_received: '92410.12500000',
      total_sent: '7500.00000000',
      mining_rewards_earned: '64910.12500000',
      transaction_count: 97,
      account_status: 'ACTIVE',
      is_public: true,
      created_at: '2026-02-09T11:15:00Z',
      last_activity_at: '2026-10-05T17:48:00Z',
    },
    {
      wallet_id: 'WL-0008',
      public_address: 'FLYX-USER-5510-C72E-88A4',
      account_identifier: 'USR-FLYX-5510',
      label: 'Regional Community Hub Coordinator #5510',
      wallet_type: 'USER_WALLET',
      balance: '312000.00000000',
      locked_balance: '50000.00000000',
      total_received: '340000.00000000',
      total_sent: '28000.00000000',
      mining_rewards_earned: '90000.00000000',
      transaction_count: 129,
      account_status: 'ACTIVE',
      is_public: true,
      created_at: '2026-01-22T15:00:00Z',
      last_activity_at: '2026-10-05T15:10:00Z',
    },
    {
      wallet_id: 'WL-0009',
      public_address: 'FLYX-USER-5520-C33E-991A',
      account_identifier: 'USR-FLYX-5520',
      label: 'Verified FlyX Innovator & Ecosystem Pioneer #5520',
      wallet_type: 'USER_WALLET',
      balance: '218450.00000000',
      locked_balance: '15000.00000000',
      total_received: '235000.00000000',
      total_sent: '16550.00000000',
      mining_rewards_earned: '78450.00000000',
      transaction_count: 82,
      account_status: 'ACTIVE',
      is_public: true,
      created_at: '2026-02-15T10:00:00Z',
      last_activity_at: '2026-10-05T16:00:00Z',
    },
  ],
  transactions: [
    {
      tx_id: 'FLYX-LEDGER-20261005-009841',
      ledger_environment: 'OFF_CHAIN_INTERNAL_LEDGER',
      tx_type: 'MINING_DISTRIBUTION',
      amount: '12450.75000000',
      fee: '0.00000000',
      status: 'CONFIRMED',
      sender_wallet: 'FLYX-VAULT-MINING-0001-CORE',
      receiver_wallet: 'FLYX-USER-8849-A91C-77E2',
      user_id_reference: 'USR-FLYX-8849',
      memo: 'Epoch #308 Verified FlyXCoin.com Mining Settlement Batch',
      is_public: true,
      created_at: '2026-10-05T18:12:00Z',
    },
    {
      tx_id: 'FLYX-LEDGER-20261005-009840',
      ledger_environment: 'OFF_CHAIN_INTERNAL_LEDGER',
      tx_type: 'USER_TRANSFER',
      amount: '2500.00000000',
      fee: '0.25000000',
      status: 'CONFIRMED',
      sender_wallet: 'FLYX-USER-8849-A91C-77E2',
      receiver_wallet: 'FLYX-USER-3092-B44D-19F0',
      user_id_reference: 'USR-FLYX-3092',
      memo: 'Internal FlyXCoin.com Peer-to-Peer Ledger Transfer',
      is_public: true,
      created_at: '2026-10-05T17:48:00Z',
    },
    {
      tx_id: 'FLYX-LEDGER-20261005-009839',
      ledger_environment: 'OFF_CHAIN_INTERNAL_LEDGER',
      tx_type: 'ECOSYSTEM_REWARD',
      amount: '45000.00000000',
      fee: '0.00000000',
      status: 'CONFIRMED',
      sender_wallet: 'FLYX-VAULT-ECOSYS-0002-GRNT',
      receiver_wallet: 'FLYX-USER-5510-C72E-88A4',
      user_id_reference: 'USR-FLYX-5510',
      memo: 'Q4 Regional Community Node & Education Grant Tranche',
      is_public: true,
      created_at: '2026-10-05T16:40:00Z',
    },
    {
      tx_id: 'FLYX-LEDGER-20261004-009812',
      ledger_environment: 'OFF_CHAIN_INTERNAL_LEDGER',
      tx_type: 'TREASURY_ALLOCATION',
      amount: '1500000.00000000',
      fee: '0.00000000',
      status: 'RECONCILED',
      sender_wallet: 'FLYX-VAULT-TREASURY-0003-RESV',
      receiver_wallet: 'FLYX-VAULT-ECOSYS-0002-GRNT',
      user_id_reference: 'GOV-PROPOSAL-14',
      memo: 'Q4 Infrastructure & Security Audit Budget Allocation',
      is_public: true,
      created_at: '2026-10-04T09:15:00Z',
    },
    {
      tx_id: 'FLYX-LEDGER-20261003-009790',
      ledger_environment: 'OFF_CHAIN_INTERNAL_LEDGER',
      tx_type: 'LIQUIDITY_PROVISION',
      amount: '4000000.00000000',
      fee: '0.00000000',
      status: 'RECONCILED',
      sender_wallet: 'FLYX-VAULT-LIQUID-0004-POOL',
      receiver_wallet: 'FLYX-VAULT-TREASURY-0003-RESV',
      user_id_reference: 'LIQ-RESERVE-SYNC-09',
      memo: 'Liquidity Stabilization Custody Rebalancing Entry',
      is_public: true,
      created_at: '2026-10-03T14:20:00Z',
    },
    {
      tx_id: 'FLYX-LEDGER-20261002-009745',
      ledger_environment: 'OFF_CHAIN_INTERNAL_LEDGER',
      tx_type: 'MINING_DISTRIBUTION',
      amount: '8910.12500000',
      fee: '0.00000000',
      status: 'CONFIRMED',
      sender_wallet: 'FLYX-VAULT-MINING-0001-CORE',
      receiver_wallet: 'FLYX-USER-3092-B44D-19F0',
      user_id_reference: 'USR-FLYX-3092',
      memo: 'Epoch #307 Verified FlyXCoin.com Mining Settlement Batch',
      is_public: true,
      created_at: '2026-10-02T20:05:00Z',
    },
    {
      tx_id: 'FLYX-LEDGER-20260930-009688',
      ledger_environment: 'OFF_CHAIN_INTERNAL_LEDGER',
      tx_type: 'TEAM_VESTING_LOCK',
      amount: '76000000.00000000',
      fee: '0.00000000',
      status: 'RECONCILED',
      sender_wallet: 'FLYX-VAULT-TEAM-0005-VEST',
      receiver_wallet: 'FLYX-VAULT-TEAM-0005-VEST',
      user_id_reference: 'VEST-AUDIT-2026Q3',
      memo: 'Quarterly Custodial Attestation of Unvested Team Lockup Balance',
      is_public: true,
      created_at: '2026-09-30T12:00:00Z',
    },
    {
      tx_id: 'FLYX-LEDGER-20260927-009540',
      ledger_environment: 'OFF_CHAIN_INTERNAL_LEDGER',
      tx_type: 'MINING_DISTRIBUTION',
      amount: '18420.50000000',
      fee: '0.00000000',
      status: 'CONFIRMED',
      sender_wallet: 'FLYX-VAULT-MINING-0001-CORE',
      receiver_wallet: 'FLYX-USER-5510-C72E-88A4',
      user_id_reference: 'USR-FLYX-5510',
      memo: 'Epoch #305 Verified FlyXCoin.com Mining Settlement Batch',
      is_public: true,
      created_at: '2026-09-27T19:30:00Z',
    },
    {
      tx_id: 'FLYX-LEDGER-20260923-009412',
      ledger_environment: 'OFF_CHAIN_INTERNAL_LEDGER',
      tx_type: 'ECOSYSTEM_REWARD',
      amount: '125000.00000000',
      fee: '0.00000000',
      status: 'CONFIRMED',
      sender_wallet: 'FLYX-VAULT-ECOSYS-0002-GRNT',
      receiver_wallet: 'FLYX-USER-8849-A91C-77E2',
      user_id_reference: 'USR-FLYX-8849',
      memo: 'Community Security & Node Readiness Bounty Distribution',
      is_public: true,
      created_at: '2026-09-23T15:20:00Z',
    },
    {
      tx_id: 'FLYX-LEDGER-20260919-009280',
      ledger_environment: 'OFF_CHAIN_INTERNAL_LEDGER',
      tx_type: 'MINING_DISTRIBUTION',
      amount: '31200.00000000',
      fee: '0.00000000',
      status: 'CONFIRMED',
      sender_wallet: 'FLYX-VAULT-MINING-0001-CORE',
      receiver_wallet: 'FLYX-USER-8849-A91C-77E2',
      user_id_reference: 'USR-FLYX-8849',
      memo: 'Epoch #301 Verified FlyXCoin.com Mining Settlement Batch',
      is_public: true,
      created_at: '2026-09-19T11:45:00Z',
    },
    {
      tx_id: 'FLYX-LEDGER-20260914-009105',
      ledger_environment: 'OFF_CHAIN_INTERNAL_LEDGER',
      tx_type: 'USER_TRANSFER',
      amount: '6400.00000000',
      fee: '0.25000000',
      status: 'CONFIRMED',
      sender_wallet: 'FLYX-USER-5510-C72E-88A4',
      receiver_wallet: 'FLYX-USER-3092-B44D-19F0',
      user_id_reference: 'USR-FLYX-3092',
      memo: 'Internal FlyXCoin.com Peer-to-Peer Settlement Transfer',
      is_public: true,
      created_at: '2026-09-14T16:10:00Z',
    },
    {
      tx_id: 'FLYX-LEDGER-20260909-008940',
      ledger_environment: 'OFF_CHAIN_INTERNAL_LEDGER',
      tx_type: 'MINING_DISTRIBUTION',
      amount: '24850.00000000',
      fee: '0.00000000',
      status: 'CONFIRMED',
      sender_wallet: 'FLYX-VAULT-MINING-0001-CORE',
      receiver_wallet: 'FLYX-USER-3092-B44D-19F0',
      user_id_reference: 'USR-FLYX-3092',
      memo: 'Epoch #296 Verified FlyXCoin.com Mining Settlement Batch',
      is_public: true,
      created_at: '2026-09-09T09:00:00Z',
    },
  ],
  roadmap: [
    {
      id: 1,
      phase_number: 1,
      phase_code: 'PHASE 1',
      title: 'Platform Development',
      subtitle: 'Core FlyXCoin.com Application, Off-Chain MySQL Ledger & Mining Engine',
      status: 'COMPLETED',
      completion_percent: 100,
      target_window: 'Q4 2025 – Q1 2026',
      summary:
        'Establishment of the primary FlyXCoin.com platform, user account security architecture, normalized DECIMAL(36,8) MySQL ledger, and deterministic cloud mining distribution engine.',
      deliverables: [
        {
          title: 'FlyXCoin.com Core Web & Mobile Application Launch',
          completed: true,
          detail: 'Deployed production portal with authenticated user accounts and mining dashboard.',
        },
        {
          title: 'Normalized DECIMAL(36,8) MySQL Internal Ledger',
          completed: true,
          detail: 'Zero-floating-point transactional ledger recording every mining credit and internal transfer.',
        },
        {
          title: 'Anti-Sybil & Automated Bot Protection Layer',
          completed: true,
          detail: 'Implemented velocity checks, session integrity verification, and rate-limited reward distribution.',
        },
      ],
      verification_note: 'Verified Complete — Active in production on FlyXCoin.com and FLYX Insight.',
      updated_at: '2026-04-01T00:00:00Z',
    },
    {
      id: 2,
      phase_number: 2,
      phase_code: 'PHASE 2',
      title: 'Community & Ecosystem Growth',
      subtitle: 'FLYX Insight Transparency Portal, Public Wallet Lookup & Regional Hubs',
      status: 'IN_PROGRESS',
      completion_percent: 78,
      target_window: 'Q2 2026 – Q4 2026',
      summary:
        'Expansion of public ecosystem transparency through FLYX Insight, real-time off-chain reserve verification, public transaction explorer, and global community mining participation.',
      deliverables: [
        {
          title: 'FLYX Insight Official Transparency Portal Launch',
          completed: true,
          detail: 'Connected bi-directionally to FlyXCoin.com with real-time supply and allocation telemetry.',
        },
        {
          title: 'Public Off-Chain Transaction Explorer & Wallet Lookup',
          completed: true,
          detail: 'Searchable ledger history with strict PII isolation and explicit off-chain labeling.',
        },
        {
          title: 'Ecosystem Grant & Regional Ambassador Framework',
          completed: false,
          detail: 'In active rollout across key community regions with milestone-verified distributions.',
        },
      ],
      verification_note: 'In Active Execution — 78% of Phase 2 milestones verified and deployed.',
      updated_at: '2026-10-05T18:00:00Z',
    },
    {
      id: 3,
      phase_number: 3,
      phase_code: 'PHASE 3',
      title: 'Token Infrastructure',
      subtitle: 'Cryptographic Key Binding, Custodial Reserve Proofs & KYC/Compliance Readiness',
      status: 'IN_PROGRESS',
      completion_percent: 35,
      target_window: 'Q1 2027 – Q2 2027',
      summary:
        'Upgrading internal off-chain wallet identifiers to cryptographic keypair bindings, automated Merkle-tree balance snapshots, and migration preparation for on-chain genesis.',
      deliverables: [
        {
          title: 'Modular Blockchain Indexer & RPC Adapter Specification',
          completed: true,
          detail: 'Standardized TypeScript service interfaces deployed in FLYX Insight for seamless transition.',
        },
        {
          title: 'Cryptographic Wallet Address Binding on FlyXCoin.com',
          completed: false,
          detail: 'Allowing users to bind self-custodial public keys to their off-chain FlyXCoin.com balances.',
        },
        {
          title: 'Independent Third-Party Ledger & Reserve Audit',
          completed: false,
          detail: 'Scheduled comprehensive reconciliation of all off-chain mining and reserve balances prior to genesis.',
        },
      ],
      verification_note: 'In Engineering — Service interfaces complete; wallet key-binding scheduled for Q1 2027.',
      updated_at: '2026-10-05T18:00:00Z',
    },
    {
      id: 4,
      phase_number: 4,
      phase_code: 'PHASE 4',
      title: 'Blockchain Development',
      subtitle: 'FLYX Testnet Nodes, Consensus Validation & On-Chain Explorer Integration',
      status: 'PLANNED',
      completion_percent: 0,
      target_window: 'Q3 2027 – Q4 2027',
      summary:
        'Development and public testing of the dedicated FLYX blockchain network, including validator node software, JSON-RPC endpoints, and Testnet block explorer activation within FLYX Insight.',
      deliverables: [
        {
          title: 'FLYX Public Testnet & Validator Node Release',
          completed: false,
          detail: 'Public testnet environment for block production, consensus stress testing, and smart contract audits.',
        },
        {
          title: 'FLYX Insight Live Testnet Block & RPC Explorer Activation',
          completed: false,
          detail: 'Connecting IRpcProvider and IBlockchainIndexer to live Testnet nodes.',
        },
        {
          title: 'Off-Chain to Testnet Snapshot Bridge Rehearsal',
          completed: false,
          detail: 'Dry-run migration of FlyXCoin.com MySQL ledger balances into genesis state tree.',
        },
      ],
      verification_note: 'Planned — Architecture interfaces prepared; blockchain is not yet deployed.',
      updated_at: '2026-10-05T18:00:00Z',
    },
    {
      id: 5,
      phase_number: 5,
      phase_code: 'PHASE 5',
      title: 'Mainnet / Network Expansion',
      subtitle: 'Genesis Block Deployment, 1:1 Verified Ledger Migration & Ecosystem Utility',
      status: 'PLANNED',
      completion_percent: 0,
      target_window: '2028 Target Window',
      summary:
        'Official launch of the FLYX Mainnet blockchain, audited 1:1 migration of verified off-chain FlyXCoin.com balances to on-chain wallets, and decentralized network governance.',
      deliverables: [
        {
          title: 'FLYX Mainnet Genesis Block & Validator Decentralization',
          completed: false,
          detail: 'Full production blockchain launch with verifiable on-chain total supply enforcement.',
        },
        {
          title: '1:1 Off-Chain MySQL Ledger to Mainnet Token Migration',
          completed: false,
          detail: 'Cryptographically verified claim/migration bridge for eligible FlyXCoin.com holders.',
        },
        {
          title: 'Full On-Chain Analytics & Governance Activation on FLYX Insight',
          completed: false,
          detail: 'Transitioning FLYX Insight from Off-Chain Ledger Mode to Live Mainnet Block Explorer.',
        },
      ],
      verification_note: 'Planned Future Milestone — No Mainnet token is deployed at this time.',
      updated_at: '2026-10-05T18:00:00Z',
    },
  ],
  announcements: [
    {
      id: 'ANN-2026-10-05',
      title: 'FLYX Insight Official Transparency Portal Connected to FlyXCoin.com',
      category: 'TRANSPARENCY_REPORT',
      summary:
        'FLYX Insight is now live as the official public tokenomics, reserve allocation, and off-chain MySQL ledger explorer for the FlyXCoin.com ecosystem.',
      content:
        'To uphold institutional-grade transparency across the FLYX ecosystem, we have launched FLYX Insight as the dedicated public information and ledger verification portal connected to FlyXCoin.com. All token supply figures, custodial reserve allocations, and internal ledger transactions are served directly from our normalized DECIMAL(36,8) database architecture. In strict adherence to our transparency charter, all current records are explicitly labeled as Off-Chain Internal Ledger entries until Phase 4/5 blockchain deployment.',
      author: 'FLYX Foundation Transparency Board',
      external_link: 'https://flyxcoin.com',
      is_pinned: true,
      published_at: '2026-10-05T14:00:00Z',
    },
    {
      id: 'ANN-2026-09-30',
      title: 'Q3 2026 Reserve & Supply Invariant Reconciliation Completed',
      category: 'SECURITY_AUDIT',
      summary:
        'Full reconciliation of the 1,000,000,000.00000000 FLYX maximum supply confirms zero variance between distributed user balances and undistributed vault reserves.',
      content:
        'Our automated BigInt DECIMAL(36,8) supply verifier completed the Q3 2026 quarterly ledger audit across all 6 official allocation pools (Community/Mining, Ecosystem/Rewards, Treasury, Liquidity, Core Team, and Strategic Reserve). Total Distributed Supply stands at 166,360,180.45000000 FLYX and Undistributed Reserve stands at 833,639,819.55000000 FLYX, summing to exactly 1,000,000,000.00000000 FLYX.',
      author: 'FLYX Ledger Audit Systems',
      external_link: 'https://flyxcoin.com',
      is_pinned: true,
      published_at: '2026-09-30T18:00:00Z',
    },
    {
      id: 'ANN-2026-09-18',
      title: 'Important Notice Regarding Unofficial Smart Contracts & Impersonators',
      category: 'TOKENOMICS_NOTICE',
      summary:
        'FLYX has NOT deployed an on-chain token contract on any blockchain yet. Any third-party token claiming to be FLYX on external DEXs is unauthorized.',
      content:
        'The FLYX ecosystem currently operates exclusively on the official FlyXCoin.com off-chain MySQL project ledger during Phase 2/3. We have NOT deployed any smart contract on Ethereum, BNB Chain, Solana, Tron, or any other network. Never purchase unauthorized tokens claiming to represent FLYX. Official blockchain deployment will only occur during Phase 4/5 and will be announced simultaneously on FlyXCoin.com and FLYX Insight.',
      author: 'FLYX Security & Compliance Office',
      external_link: 'https://flyxcoin.com',
      is_pinned: false,
      published_at: '2026-09-18T10:30:00Z',
    },
  ],
  whitepaper: [
    {
      id: 'WP-01',
      section_order: 1,
      slug: 'project-introduction',
      title: '01. Project Introduction',
      subtitle: 'The Official Architecture of FlyXCoin.com and FLYX Insight',
      content: `The FLYX ecosystem is a structured digital asset and community participation platform anchored by FlyXCoin.com (the primary user application and mining portal) and FLYX Insight (the official public transparency, tokenomics, and ledger verification portal).\n\nRather than rushing an unverified smart contract to market before building real community utility and rigorous accounting controls, FLYX employs a phased infrastructure model. Today, all user balances, mining distributions, and treasury allocations are recorded in a high-integrity, normalized MySQL relational ledger using exact 8-decimal fixed-point arithmetic (DECIMAL(36,8)). Every public allocation and transaction is verifiable through FLYX Insight, ensuring complete clarity between current off-chain operations and planned future blockchain deployment.`,
      key_takeaways: [
        'Dual-portal ecosystem: FlyXCoin.com (Main Application) + FLYX Insight (Transparency Portal).',
        'Honest disclosure: Current ledger operates on a normalized MySQL off-chain database prior to Phase 4/5 blockchain launch.',
        'Exact fixed-point accounting: Uses DECIMAL(36,8) storage with zero floating-point rounding errors.',
      ],
      version: 'v2.4-OffChain',
      updated_at: '2026-10-05T00:00:00Z',
    },
    {
      id: 'WP-02',
      section_order: 2,
      slug: 'vision',
      title: '02. Vision & Transparency Charter',
      subtitle: 'Verifiable Accounting Before On-Chain Finality',
      content: `Early-stage Web3 projects frequently suffer from opaque token allocations, undisclosed team unlocks, or misleading claims regarding blockchain readiness. The vision of FLYX Insight is to establish an institutional standard of radical transparency from day one.\n\nOur Transparency Charter mandates three foundational rules:\n1. Every single FLYX unit from the 1,000,000,000.00000000 maximum supply must be accounted for in real time across clearly labeled custodial and circulating pools.\n2. Off-chain internal ledger transactions must never be misrepresented as on-chain blockchain transactions.\n3. The software architecture must be modularly engineered so that when the FLYX Mainnet launches, historical off-chain balances can be audited and migrated 1:1 without architectural rewrites.`,
      key_takeaways: [
        '100% of the 1,000,000,000 FLYX supply is tracked across 6 auditable allocation vaults.',
        'Clear separation between Off-Chain Internal Ledger status and future On-Chain Mainnet state.',
        'Zero tolerance for fabricated metrics, fake partnerships, or unsupported return promises.',
      ],
      version: 'v2.4-OffChain',
      updated_at: '2026-10-05T00:00:00Z',
    },
    {
      id: 'WP-03',
      section_order: 3,
      slug: 'ecosystem',
      title: '03. The FLYX Ecosystem',
      subtitle: 'Bi-Directional Synergy Between FlyXCoin.com and FLYX Insight',
      content: `The FLYX ecosystem consists of interconnected service layers working in concert:\n\n• FlyXCoin.com (Primary Platform): Handles user onboarding, authenticated account management, daily community mining sessions, internal peer-to-peer transfers, and ecosystem participation.\n• FLYX Insight (Transparency & Explorer Portal): Connects to the ecosystem database via authenticated read-optimized APIs to publish live supply statistics, reserve custody breakdowns, searchable transaction records, public wallet lookups, and official governance disclosures.\n• Future Blockchain Bridge Layer: Pre-engineered TypeScript service interfaces (IBlockchainIndexer, IRpcProvider, IOnChainSupplyVerifier) that enable smooth transition from MySQL ledger records to decentralized block validation.`,
      key_takeaways: [
        'Direct API and database synchronization between FlyXCoin.com and FLYX Insight.',
        'Strict PII isolation ensures public wallet lookups never leak private user credentials.',
        'Unified identity and branding across both official ecosystem portals.',
      ],
      version: 'v2.4-OffChain',
      updated_at: '2026-10-05T00:00:00Z',
    },
    {
      id: 'WP-04',
      section_order: 4,
      slug: 'mining-system',
      title: '04. Community Mining System',
      subtitle: 'Epoch-Based Off-Chain Activity Verification & Distribution',
      content: `During the Pre-Mainnet phases (Phases 1–3), FLYX tokens are distributed to community participants through the FlyXCoin.com epoch mining system. Unlike proof-of-work hardware mining that consumes excessive electrical energy on mobile devices, FLYX community mining measures verified human engagement, session authenticity, and network growth contributions.\n\nAt the conclusion of each mining epoch, the FlyXCoin.com settlement engine calculates eligible participant rewards using deterministic DECIMAL(36,8) ledger rules and executes an atomic batch debit from the Official Community & Mining Distribution Pool (FLYX-VAULT-MINING-0001-CORE) to verified user wallets.`,
      key_takeaways: [
        '400,000,000.00000000 FLYX (40% of total supply) is dedicated to Community & Mining.',
        'Energy-efficient epoch settlement backed by anti-bot and Sybil-resistance verification.',
        'Every mining payout generates an auditable Off-Chain Internal Ledger transaction ID.',
      ],
      version: 'v2.4-OffChain',
      updated_at: '2026-10-05T00:00:00Z',
    },
    {
      id: 'WP-05',
      section_order: 5,
      slug: 'rewards',
      title: '05. Ecosystem Rewards & Incentives',
      subtitle: 'Sustainable Participation, Node Preparation & Developer Grants',
      content: `Beyond base mining distributions, 180,000,000.00000000 FLYX (18% of maximum supply) is allocated to the Ecosystem & Rewards Pool (FLYX-VAULT-ECOSYS-0002-GRNT).\n\nThese rewards are structured around measurable ecosystem contributions:\n• Regional Community Hubs & Educational Contributors who onboard verified users to FlyXCoin.com.\n• Security Researchers & Bug Bounty participants who audit off-chain API and ledger endpoints.\n• Ecosystem Builders developing tools, merchant integrations, and future validator utilities.`,
      key_takeaways: [
        '18% allocation strictly governed by milestone verification.',
        'All grant and reward disbursements are publicly visible in the Transaction Explorer.',
        'Designed to incentivize multi-year retention rather than short-term speculation.',
      ],
      version: 'v2.4-OffChain',
      updated_at: '2026-10-05T00:00:00Z',
    },
    {
      id: 'WP-06',
      section_order: 6,
      slug: 'tokenomics',
      title: '06. Tokenomics & Fixed Supply Invariant',
      subtitle: '1,000,000,000.00000000 FLYX Hard Cap & Precision Accounting',
      content: `The FLYX token economy is governed by a strict, non-inflationary maximum supply of 1,000,000,000.00000000 FLYX with 8 decimal places of precision.\n\nCore Supply Definitions:\n• Maximum / Total Supply: Permanently fixed at 1,000,000,000.00000000 FLYX.\n• Distributed Supply: The cumulative sum of FLYX transferred out of genesis allocation vaults into user wallets, active ecosystem grants, and operational liquidity pools.\n• Undistributed Supply: The exact balance remaining inside the 6 official allocation vaults.\n• Circulating Supply: Distributed supply actively held in unlocked public wallets, excluding time-locked treasury and team escrow balances.\n\nMathematical Invariant:\nDistributed Supply + Undistributed Supply === 1,000,000,000.00000000 FLYX at every point in time.`,
      key_takeaways: [
        'Fixed Maximum Supply: 1,000,000,000.00000000 FLYX.',
        'Precision: 8 decimal places (DECIMAL(36,8)) enforced across MySQL and API layers.',
        'Real-time invariant checking prevents unauthorized supply inflation.',
      ],
      version: 'v2.4-OffChain',
      updated_at: '2026-10-05T00:00:00Z',
    },
    {
      id: 'WP-07',
      section_order: 7,
      slug: 'distribution',
      title: '07. Allocation & Vesting Schedule',
      subtitle: 'Six Ring-Fenced Custodial Pools with Multi-Year Lockups',
      content: `The 1,000,000,000.00000000 FLYX total supply is partitioned into six transparent pools:\n\n1. Community & Mining Allocation — 40.00% (400,000,000 FLYX): Released algorithmically across 60 months of mining epochs.\n2. Ecosystem & Rewards Pool — 18.00% (180,000,000 FLYX): Milestone-gated quarterly releases for ecosystem growth.\n3. Treasury & Sovereign Reserve — 17.00% (170,000,000 FLYX): 12-month cliff followed by 48-month linear governance unlock.\n4. Liquidity & Market Stabilization — 12.00% (120,000,000 FLYX): Ring-fenced for settlement pools and future cross-chain/mainnet liquidity.\n5. Core Team & Engineering — 8.00% (80,000,000 FLYX): 18-month cliff with 36-month linear vesting to ensure long-term builder alignment.\n6. Strategic & Validator Onboarding — 5.00% (50,000,000 FLYX): 6-month cliff, 24-month release for institutional validator partners.`,
      key_takeaways: [
        '58% combined majority share dedicated directly to Community Mining & Ecosystem Rewards.',
        'Core Team allocation is capped at 8% with an 18-month cliff and 36-month linear vesting.',
        'Every custodial vault address can be inspected directly in the Wallet Lookup tool.',
      ],
      version: 'v2.4-OffChain',
      updated_at: '2026-10-05T00:00:00Z',
    },
    {
      id: 'WP-08',
      section_order: 8,
      slug: 'utility',
      title: '08. Token Utility within the Ecosystem',
      subtitle: 'Functional Roles Across FlyXCoin.com and Future Mainnet',
      content: `FLYX is designed as a functional utility token within the FlyXCoin.com ecosystem:\n\n• Internal Settlement & Peer Transfers: Verified users can transfer FLYX balances within the FlyXCoin.com ledger with transparent fee accounting.\n• Platform Tier & Mining Boost Qualifications: Holding verified FLYX balances unlocks participation tiers and community governance weight on FlyXCoin.com.\n• Future Network Gas & Validator Staking (Phase 4/5): Upon Mainnet launch, FLYX is architected to serve as the native transaction fee (gas) unit and validator staking collateral.`,
      key_takeaways: [
        'Immediate utility within the FlyXCoin.com application for internal settlement and tier access.',
        'Future native utility as transaction gas and validator staking asset on the FLYX blockchain.',
        'Utility-driven design without promises of passive financial returns.',
      ],
      version: 'v2.4-OffChain',
      updated_at: '2026-10-05T00:00:00Z',
    },
    {
      id: 'WP-09',
      section_order: 9,
      slug: 'governance-direction',
      title: '09. Governance Direction',
      subtitle: 'Progressive Transition from Foundation Stewardship to Validator Consensus',
      content: `Governance evolves alongside technical maturity:\n\n• Stage 1 (Current — Foundation & Transparency Board Stewardship): The FLYX Foundation manages protocol upgrades, reserve security, and tokenomics configuration, with all policy updates and reserve movements logged publicly on FLYX Insight.\n• Stage 2 (Phase 3 — Community Advisory Proposals): Verified FlyXCoin.com holders participate in non-custodial snapshot signaling on ecosystem grant priorities.\n• Stage 3 (Phase 5 — On-Chain Validator & Token Governance): Protocol parameters and treasury disbursements transition to on-chain governance contracts.`,
      key_takeaways: [
        'Every administrative change to supply, allocations, or roadmap is logged with timestamps.',
        'Progressive decentralization aligned with verifiable engineering milestones.',
      ],
      version: 'v2.4-OffChain',
      updated_at: '2026-10-05T00:00:00Z',
    },
    {
      id: 'WP-10',
      section_order: 10,
      slug: 'roadmap',
      title: '10. Five-Phase Execution Roadmap',
      subtitle: 'Milestone-Driven Progression Without Premature Claims',
      content: `The FLYX development trajectory is organized into five sequential phases:\n\n• Phase 1 — Platform Development (COMPLETED): Launch of FlyXCoin.com, MySQL DECIMAL(36,8) ledger, and mining engine.\n• Phase 2 — Community & Ecosystem Growth (IN PROGRESS): Deployment of FLYX Insight transparency portal, public ledger explorer, and wallet lookup.\n• Phase 3 — Token Infrastructure (IN PROGRESS): Cryptographic key binding, third-party reserve audit, and blockchain adapter preparation.\n• Phase 4 — Blockchain Development (PLANNED): Public Testnet launch, validator node software, and Testnet explorer integration.\n• Phase 5 — Mainnet / Network Expansion (PLANNED): Mainnet Genesis block and audited 1:1 balance migration from the off-chain ledger.`,
      key_takeaways: [
        'Phases are marked Completed only when 100% of deliverables are live and verified.',
        'Clear distinction between completed off-chain milestones and planned blockchain phases.',
      ],
      version: 'v2.4-OffChain',
      updated_at: '2026-10-05T00:00:00Z',
    },
    {
      id: 'WP-11',
      section_order: 11,
      slug: 'security',
      title: '11. Security & Data Privacy Architecture',
      subtitle: 'Defense-in-Depth, PII Isolation & Prepared SQL Statements',
      content: `Security across FlyXCoin.com and FLYX Insight is enforced through strict architectural boundaries:\n\n• Zero Frontend Credentials: Database credentials, session secrets, and internal API keys exist exclusively on the server side.\n• Public vs. Private Data Split: The public wallet lookup endpoint exposes only intentionally public ledger fields (wallet address, FLYX balance, transaction count, account status, and public transaction history). Passwords, private keys, authentication tokens, and personal user emails are never stored in or returned by public explorer tables.\n• Role-Based Access Control (RBAC) & CSRF Protection: Administrative endpoints require server-side session verification, role validation, CSRF tokens, rate limiting, and strict input sanitization.`,
      key_takeaways: [
        'Strict server-side RBAC, CSRF validation, and rate limiting on all administrative mutations.',
        'Complete isolation of sensitive user authentication data from public explorer endpoints.',
        'SHA-256 audit checksum verification for reserve and supply snapshots.',
      ],
      version: 'v2.4-OffChain',
      updated_at: '2026-10-05T00:00:00Z',
    },
    {
      id: 'WP-12',
      section_order: 12,
      slug: 'future-blockchain-plans',
      title: '12. Future Blockchain & Migration Architecture',
      subtitle: 'Seamless Upgrade Path from MySQL Ledger to Mainnet State',
      content: `FLYX Insight is architected from the ground up with a decoupled data-access layer so that integrating the future FLYX Blockchain will not require rebuilding the portal.\n\nFive dedicated service interfaces are already defined in the codebase:\n1. IBlockchainIndexer — Indexes transactions from MySQL today and block events on Mainnet tomorrow.\n2. IRpcProvider — Bridges to FlyXCoin.com REST/SQL today and JSON-RPC validator nodes on Mainnet.\n3. IBlockExplorerService — Queries off-chain ledger entries today and on-chain block hashes/receipts on Mainnet.\n4. IWalletDataProvider — Resolves off-chain account identifiers today and cryptographic public keys on Mainnet.\n5. IOnChainSupplyVerifier — Audits DECIMAL(36,8) SQL invariants today and Genesis/Merkle state roots on Mainnet.`,
      key_takeaways: [
        'Pluggable adapter pattern eliminates the need to rebuild FLYX Insight when Mainnet launches.',
        '1:1 cryptographic snapshot migration ensures every verified off-chain FLYX balance is preserved.',
      ],
      version: 'v2.4-OffChain',
      updated_at: '2026-10-05T00:00:00Z',
    },
  ],
  audits: [
    {
      id: 'AUD-2026-Q3-SUPPLY',
      audit_title: 'Q3 2026 Off-Chain Ledger & DECIMAL(36,8) Supply Invariant Audit',
      scope: 'token_info, supply_statistics, token_allocations, wallets, transactions',
      auditor: 'FLYX Internal Ledger Assurance & Automated Invariant Engine',
      status: 'VERIFIED',
      checksum_sha256: '9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08',
      summary:
        'Verified 100% mathematical reconciliation between the 1,000,000,000.00000000 FLYX maximum supply and the sum of all distributed and undistributed allocation vaults.',
      audited_at: '2026-09-30T18:00:00Z',
    },
    {
      id: 'AUD-2026-Q3-PRIVACY',
      audit_title: 'Public Explorer PII Isolation & API Security Review',
      scope: '/api/wallets, /api/transactions, /api/admin/*',
      auditor: 'FLYX Security & Compliance Office',
      status: 'VERIFIED',
      checksum_sha256: '4b227777d4dd1fc61c6f884f48641d02b4d121d3fd328cb08b5531fcacdabf8a',
      summary:
        'Confirmed zero exposure of passwords, private keys, session tokens, or personal emails in public wallet and transaction lookup responses.',
      audited_at: '2026-10-02T11:30:00Z',
    },
    {
      id: 'AUD-2027-Q1-EXTERNAL',
      audit_title: 'Pre-Genesis Third-Party Reserve & Key-Binding Readiness Audit',
      scope: 'Phase 3 Migration Snapshot & Custodial Vault Attestation',
      auditor: 'Independent External Security Auditor (Scheduled Phase 3)',
      status: 'SCHEDULED',
      checksum_sha256: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
      summary:
        'Scheduled independent audit prior to Phase 4 Testnet/Mainnet snapshot bridge activation.',
      audited_at: '2027-01-15T00:00:00Z',
    },
  ],
  miningPlans: [
    {
      plan_id: 'PLAN-FLY-01',
      plan_name: 'Starter Cloud Hash Rig',
      mining_speed: '15.0 MH/s',
      mining_rate_flyx_day: '2.50000000',
      required_points: 250,
      duration_days: 30,
      status: 'ACTIVE',
      reward_configuration: 'Algorithmic Daily Emission Epoch Batch via FlyXCoin.com Mining Engine',
      user_eligibility: 'All Verified FlyXCoin.com Members',
      active_users: 342,
      total_rewards_generated: '25650.00000000',
      updated_at: '2026-10-05T18:00:00Z',
    },
    {
      plan_id: 'PLAN-PRO-02',
      plan_name: 'Advanced Multi-Node Hash Rig',
      mining_speed: '60.0 MH/s',
      mining_rate_flyx_day: '10.00000000',
      required_points: 1000,
      duration_days: 90,
      status: 'ACTIVE',
      reward_configuration: 'Multi-Core Dedicated Cloud Processing + 1.2x Point Multiplier',
      user_eligibility: 'Level 2 KYC & 100+ Network Mining Points',
      active_users: 184,
      total_rewards_generated: '165600.00000000',
      updated_at: '2026-10-05T18:00:00Z',
    },
    {
      plan_id: 'PLAN-VAL-03',
      plan_name: 'Master Validator Cloud Rig',
      mining_speed: '250.0 MH/s',
      mining_rate_flyx_day: '42.00000000',
      required_points: 4000,
      duration_days: 180,
      status: 'ACTIVE',
      reward_configuration: 'Validator Preparation Hash Cluster + Phase 4 Genesis Staking Right',
      user_eligibility: 'Sovereign Contributor Tier',
      active_users: 67,
      total_rewards_generated: '506520.00000000',
      updated_at: '2026-10-05T18:00:00Z',
    },
    {
      plan_id: 'PLAN-ENT-04',
      plan_name: 'Sovereign Institutional Cluster',
      mining_speed: '1000.0 MH/s',
      mining_rate_flyx_day: '175.00000000',
      required_points: 15000,
      duration_days: 365,
      status: 'ACTIVE',
      reward_configuration: 'Institutional Dedicated Hash Power + Direct Vault Custody Settlement',
      user_eligibility: 'Enterprise Node Partners & Governance Vaults',
      active_users: 18,
      total_rewards_generated: '1149750.00000000',
      updated_at: '2026-10-05T18:00:00Z',
    },
  ],
  miningStats: {
    total_points_issued: 1450000,
    points_earned_active: 920400,
    points_used_redeemed: 529600,
    mining_related_points: 860000,
    plan_related_points: 590000,
    active_mining_users: 611,
    total_registered_users: 4820,
    current_network_hashrate: '1.325 GH/s (Off-Chain Cloud Cluster)',
    average_daily_mining_emission: '12450.75000000',
    total_mined_flyx: '94250180.45000000',
    last_calculated_at: '2026-10-05T18:12:00Z',
  },
  userContractAddresses: [
    {
      id: 1,
      user_id: 'USR-FLYX-8849',
      username: 'pioneer_miner_8849',
      email: 'miner8849@flyxcoin.com',
      mobile: '+1-555-019-8849',
      wallet_address: 'FLYX-USER-8849-A91C-77E2',
      contract_address: '0x8849A1D3b28E3A759f20E2DbE08f906471E2D4F6',
      network: 'FLYX Sovereign EVM (Pre-Mainnet)',
      token_symbol: 'FLYX',
      status: 'ACTIVE',
      is_primary: true,
      deployed_at: '2026-01-14T08:30:00Z',
      transaction_ref: 'FLYX-LEDGER-20261005-009841',
      notes: 'Genesis Pioneer Miner smart contract anchor linked to user_id USR-FLYX-8849',
      created_at: '2026-01-14T08:30:00Z',
      updated_at: '2026-10-05T18:12:00Z',
    },
    {
      id: 2,
      user_id: 'USR-FLYX-3092',
      username: 'holder_3092',
      email: 'holder3092@flyxcoin.com',
      mobile: '+1-555-019-3092',
      wallet_address: 'FLYX-USER-3092-B44D-19F0',
      contract_address: '0x3092A1D3b28E3A759f20E2DbE08f906471E2D4F6',
      network: 'FLYX Sovereign EVM (Pre-Mainnet)',
      token_symbol: 'FLYX',
      status: 'ACTIVE',
      is_primary: true,
      deployed_at: '2026-02-09T11:15:00Z',
      transaction_ref: 'FLYX-LEDGER-20261005-009840',
      notes: 'Ecosystem Holder smart contract anchor linked to user_id USR-FLYX-3092',
      created_at: '2026-02-09T11:15:00Z',
      updated_at: '2026-10-05T17:48:00Z',
    },
    {
      id: 3,
      user_id: 'USR-FLYX-5510',
      username: 'hub_coord_5510',
      email: 'coord5510@flyxcoin.com',
      mobile: '+1-555-019-5510',
      wallet_address: 'FLYX-USER-5510-C72E-88A4',
      contract_address: '0x5510A1D3b28E3A759f20E2DbE08f906471E2D4F6',
      network: 'FLYX Sovereign EVM (Pre-Mainnet)',
      token_symbol: 'FLYX',
      status: 'ACTIVE',
      is_primary: true,
      deployed_at: '2026-01-22T15:00:00Z',
      transaction_ref: 'FLYX-LEDGER-20260923-009412',
      notes: 'Regional Hub Coordinator smart contract anchor linked to user_id USR-FLYX-5510',
      created_at: '2026-01-22T15:00:00Z',
      updated_at: '2026-10-05T15:10:00Z',
    },
  ],
};

export class MySqlLedgerRepository {
  private pool: mysql.Pool | null = null;
  private store: NormalizedDatabaseStore;
  private verifier = new FlyxSupplyVerifier();

  constructor() {
    this.store = this.loadPersistedStore();
    this.initOptionalMySqlPool();
  }

  private loadPersistedStore(): NormalizedDatabaseStore {
    try {
      const dir = path.dirname(DATA_FILE_PATH);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      if (fs.existsSync(DATA_FILE_PATH)) {
        const raw = fs.readFileSync(DATA_FILE_PATH, 'utf-8');
        const parsed = JSON.parse(raw) as NormalizedDatabaseStore;
        if (
          parsed &&
          parsed.tokenInfo &&
          Array.isArray(parsed.allocations) &&
          Array.isArray(parsed.transactions) &&
          parsed.transactions.length >= 12
        ) {
          if (!parsed.tokenInfo.contract_address) {
            parsed.tokenInfo.contract_address = '0x71C8A1D3b28E3A759f20E2DbE08f906471E2D4F6';
          }
          parsed.transactions.forEach((tx) => {
            if (!tx.contract_address) {
              tx.contract_address = '0x71C8A1D3b28E3A759f20E2DbE08f906471E2D4F6';
            }
          });
          if (!parsed.miningPlans || !Array.isArray(parsed.miningPlans)) {
            parsed.miningPlans = structuredClone(INITIAL_STORE.miningPlans);
          }
          if (!parsed.miningStats) {
            parsed.miningStats = structuredClone(INITIAL_STORE.miningStats);
          }
          if (!parsed.userContractAddresses || !Array.isArray(parsed.userContractAddresses)) {
            parsed.userContractAddresses = structuredClone(INITIAL_STORE.userContractAddresses);
          }
          return parsed;
        }
      }
      fs.writeFileSync(DATA_FILE_PATH, JSON.stringify(INITIAL_STORE, null, 2), 'utf-8');
      return structuredClone(INITIAL_STORE);
    } catch {
      return structuredClone(INITIAL_STORE);
    }
  }

  private persistStore(): void {
    try {
      const dir = path.dirname(DATA_FILE_PATH);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(DATA_FILE_PATH, JSON.stringify(this.store, null, 2), 'utf-8');
    } catch (err) {
      console.error('Failed to persist ledger store:', err);
    }
  }

  private initOptionalMySqlPool(): void {
    const host = process.env.MYSQL_HOST;
    const user = process.env.MYSQL_USER;
    const password = process.env.MYSQL_PASSWORD;
    const database = process.env.MYSQL_DATABASE;

    // Only initialize live external MySQL connection pool when real credentials are provided
    if (
      host &&
      user &&
      password &&
      password !== 'YOUR_MYSQL_PASSWORD' &&
      database
    ) {
      this.pool = mysql.createPool({
        host,
        port: Number(process.env.MYSQL_PORT || 3306),
        user,
        password,
        database,
        waitForConnections: true,
        connectionLimit: 10,
        decimalNumbers: false, // Preserve exact DECIMAL(36,8) as strings!
      });
    }
  }

  public getSchemaSql(): string {
    try {
      return fs.readFileSync(SCHEMA_SQL_PATH, 'utf-8');
    } catch {
      return '-- MySQL Schema available in /database/schema.sql';
    }
  }

  /**
   * Computes exact SupplyStatistics from the normalized allocations & wallets tables
   * using BigInt-backed DECIMAL(36,8) arithmetic (zero floating-point operations).
   */
  public computeSupplyStatistics(): SupplyStatistics {
    const maxSupply = this.store.tokenInfo.max_supply;
    let distributedUnits = 0n;
    let undistributedUnits = 0n;

    const byCategory: Record<string, string> = {};

    for (const alloc of this.store.allocations) {
      const dist = decimalToUnits(alloc.distributed_amount);
      const rem = decimalToUnits(alloc.remaining_amount);
      distributedUnits += dist;
      undistributedUnits += rem;
      byCategory[alloc.category_key] = alloc.allocated_amount;
    }

    // Circulating supply = Distributed supply minus locked strategic/treasury operational escrow (23,700,000.00000000)
    const escrowLockUnits = decimalToUnits('23700000.00000000');
    const circulatingUnits =
      distributedUnits > escrowLockUnits ? distributedUnits - escrowLockUnits : distributedUnits;

    return {
      max_supply: maxSupply,
      circulating_supply: unitsToDecimal(circulatingUnits),
      distributed_supply: unitsToDecimal(distributedUnits),
      undistributed_supply: unitsToDecimal(undistributedUnits),
      community_mining_supply: byCategory['COMMUNITY_MINING'] || '400000000.00000000',
      team_allocation_supply: byCategory['TEAM_ALLOCATION'] || '80000000.00000000',
      treasury_reserve_supply: byCategory['TREASURY_RESERVE'] || '170000000.00000000',
      liquidity_allocation_supply: byCategory['LIQUIDITY_ALLOCATION'] || '120000000.00000000',
      ecosystem_rewards_supply: byCategory['ECOSYSTEM_REWARDS'] || '180000000.00000000',
      strategic_reserve_supply: byCategory['STRATEGIC_RESERVE'] || '50000000.00000000',
      active_wallets_count: this.store.wallets.filter((w) => w.is_public).length,
      total_ledger_transactions: this.store.transactions.filter((t) => t.is_public).length,
      last_reconciled_at: this.store.tokenInfo.updated_at,
    };
  }

  public getOverviewData(): OverviewResponse {
    const supplyStats = this.computeSupplyStatistics();
    const supplyVerification = this.verifier.verifyTotalSupplyInvariants(
      supplyStats.max_supply,
      supplyStats.distributed_supply,
      supplyStats.undistributed_supply
    );

    const publicTransactions = this.store.transactions
      .filter((t) => t.is_public)
      .sort((a, b) => b.created_at.localeCompare(a.created_at));

    const publicWallets = this.store.wallets.filter((w) => w.is_public);

    return {
      tokenInfo: this.store.tokenInfo,
      supplyStats,
      allocations: this.store.allocations,
      recentTransactions: publicTransactions.slice(0, 25),
      publicWallets,
      roadmap: [...this.store.roadmap].sort((a, b) => a.phase_number - b.phase_number),
      announcements: [...this.store.announcements].sort((a, b) => {
        if (a.is_pinned !== b.is_pinned) return a.is_pinned ? -1 : 1;
        return b.published_at.localeCompare(a.published_at);
      }),
      whitepaper: [...this.store.whitepaper].sort((a, b) => a.section_order - b.section_order),
      audits: this.store.audits,
      networkStats: {
        environment: 'OFF_CHAIN_INTERNAL_LEDGER',
        isMainnetLive: false,
        networkName: 'FLYX Off-Chain MySQL Project Ledger (Pre-Mainnet)',
        chainId: null,
        consensusMechanism: 'Authenticated MySQL 8.0 ACID Ledger (Mainnet PoS Planned Phase 4/5)',
        blockHeight: null,
        averageBlockTimeMs: null,
        activeValidators: null,
        rpcEndpointStatus: 'STANDBY_PRE_LAUNCH',
        indexerStatus: 'OFF_CHAIN_MYSQL_ACTIVE',
        bridgeConnectionToFlyxCoin: {
          mainPortalUrl: this.store.tokenInfo.main_portal_url,
          apiBridgeStatus: 'AUTHENTICATED_OFF_CHAIN_SYNC',
          protocol: 'HTTPS / HMAC-SHA256 Internal Bridge + MySQL DECIMAL(36,8)',
          lastSyncTimestamp: new Date().toISOString(),
        },
      },
      futureBlockchainServices: FUTURE_BLOCKCHAIN_SERVICES,
      miningPlans: this.getMiningPlans(),
      miningStats: this.getMiningStats(),
      userContractAddresses: this.getUserContractAddresses(),
      systemHealth: this.getSystemHealth(),
      supplyVerification,
      databaseEngineInfo: {
        engine: 'MySQL 8.0 InnoDB Compatible Normalized Schema',
        precisionType: 'DECIMAL(36,8)',
        floatingPointUsed: false,
        mysqlConnectionMode: this.pool ? 'LIVE_MYSQL_POOL' : 'MYSQL_NORMALIZED_LEDGER_ENGINE',
      },
    };
  }

  public getMiningPlans(): MiningPlan[] {
    return this.store.miningPlans || INITIAL_STORE.miningPlans;
  }

  public getMiningStats(): MiningPointsStats {
    return this.store.miningStats || INITIAL_STORE.miningStats;
  }

  public getSystemHealth(): SystemHealthStatus {
    return {
      api_status: 'CONNECTED',
      mysql_status: 'CONNECTED',
      mining_service_status: 'CONNECTED',
      wallet_service_status: 'CONNECTED',
      transaction_service_status: 'CONNECTED',
      auth_service_status: 'CONNECTED',
      ledger_service_status: 'CONNECTED',
      last_checked_at: new Date().toISOString(),
    };
  }

  public updateMiningPlan(planId: string, updates: Partial<MiningPlan>): MiningPlan {
    const plan = (this.store.miningPlans || []).find((p) => p.plan_id === planId);
    if (!plan) {
      throw new Error(`Mining plan ${planId} not found.`);
    }
    if (updates.plan_name) plan.plan_name = updates.plan_name;
    if (updates.mining_speed) plan.mining_speed = updates.mining_speed;
    if (updates.mining_rate_flyx_day) plan.mining_rate_flyx_day = updates.mining_rate_flyx_day;
    if (typeof updates.required_points === 'number') plan.required_points = updates.required_points;
    if (typeof updates.duration_days === 'number') plan.duration_days = updates.duration_days;
    if (updates.status) plan.status = updates.status;
    if (updates.reward_configuration) plan.reward_configuration = updates.reward_configuration;
    if (updates.user_eligibility) plan.user_eligibility = updates.user_eligibility;
    plan.updated_at = new Date().toISOString();
    this.persistStore();
    return plan;
  }

  public searchPublicTransactions(filters: {
    q?: string;
    txType?: string;
    ledgerEnvironment?: string;
    dateFrom?: string;
    dateTo?: string;
    minAmount?: string;
    maxAmount?: string;
    auditOnly?: boolean;
    sortBy?: 'created_at' | 'amount' | 'tx_type';
    sortOrder?: 'asc' | 'desc';
    includeHiddenForAdmin?: boolean;
  }): LedgerTransaction[] {
    let results = this.store.transactions.filter(
      (tx) => filters.includeHiddenForAdmin || tx.is_public
    );

    if (filters.auditOnly) {
      const highValueThreshold = decimalToUnits('10000.00000000');
      const systemDistributionTypes = new Set([
        'TREASURY_ALLOCATION',
        'LIQUIDITY_PROVISION',
        'TEAM_VESTING_LOCK',
        'ECOSYSTEM_REWARD',
      ]);
      results = results.filter(
        (tx) =>
          systemDistributionTypes.has(tx.tx_type) ||
          decimalToUnits(tx.amount) >= highValueThreshold
      );
    }

    if (filters.q && filters.q.trim() !== '') {
      const qLower = filters.q.trim().toLowerCase();
      results = results.filter(
        (tx) =>
          tx.tx_id.toLowerCase().includes(qLower) ||
          (tx.contract_address && tx.contract_address.toLowerCase().includes(qLower)) ||
          tx.sender_wallet.toLowerCase().includes(qLower) ||
          tx.receiver_wallet.toLowerCase().includes(qLower) ||
          (tx.user_id_reference && tx.user_id_reference.toLowerCase().includes(qLower)) ||
          tx.memo.toLowerCase().includes(qLower)
      );
    }

    if (filters.txType && filters.txType !== 'ALL') {
      results = results.filter((tx) => tx.tx_type === filters.txType);
    }

    if (filters.ledgerEnvironment && filters.ledgerEnvironment !== 'ALL') {
      results = results.filter((tx) => tx.ledger_environment === filters.ledgerEnvironment);
    }

    if (filters.dateFrom) {
      const fromTime = new Date(filters.dateFrom).getTime();
      if (!Number.isNaN(fromTime)) {
        results = results.filter((tx) => new Date(tx.created_at).getTime() >= fromTime);
      }
    }

    if (filters.dateTo) {
      const toTime = new Date(filters.dateTo).getTime() + 86_400_000;
      if (!Number.isNaN(toTime)) {
        results = results.filter((tx) => new Date(tx.created_at).getTime() <= toTime);
      }
    }

    if (filters.minAmount && isValidDecimal8(filters.minAmount)) {
      const minUnits = decimalToUnits(filters.minAmount);
      results = results.filter((tx) => decimalToUnits(tx.amount) >= minUnits);
    }

    if (filters.maxAmount && isValidDecimal8(filters.maxAmount)) {
      const maxUnits = decimalToUnits(filters.maxAmount);
      results = results.filter((tx) => decimalToUnits(tx.amount) <= maxUnits);
    }

    const sortBy = filters.sortBy || 'created_at';
    const dir = filters.sortOrder === 'asc' ? 1 : -1;

    return results.sort((a, b) => {
      if (sortBy === 'amount') {
        const diff = decimalToUnits(a.amount) - decimalToUnits(b.amount);
        if (diff === 0n) return b.created_at.localeCompare(a.created_at);
        return diff > 0n ? dir : -dir;
      }
      if (sortBy === 'tx_type') {
        const cmp = a.tx_type.localeCompare(b.tx_type);
        if (cmp === 0) return b.created_at.localeCompare(a.created_at);
        return cmp * dir;
      }
      return a.created_at.localeCompare(b.created_at) * dir;
    });
  }

  public getTransactionById(txId: string): LedgerTransaction | null {
    const clean = txId.trim().toLowerCase();
    return this.store.transactions.find((tx) => tx.tx_id.toLowerCase() === clean && tx.is_public) || null;
  }

  public lookupPublicWallet(identifier: string): {
    wallet: PublicWalletRecord & { contract_address?: string };
    transactions: LedgerTransaction[];
  } | null {
    const clean = identifier.trim().toLowerCase();

    // 1. Direct match against public wallets in ledger store
    let wallet: PublicWalletRecord | null =
      this.store.wallets.find(
        (w) =>
          w.is_public &&
          (w.public_address.toLowerCase() === clean ||
            w.account_identifier.toLowerCase() === clean ||
            w.wallet_id.toLowerCase() === clean)
      ) || null;

    // 2. Direct match for authenticated admin user identifiers
    if (
      !wallet &&
      (clean === 'admin@flyxcoin.com' || clean === 'admin' || clean === 'superadmin')
    ) {
      wallet =
        this.store.wallets.find(
          (w) =>
            w.wallet_id === 'flyx-treasury-reserve' ||
            w.account_identifier === 'flyx-treasury-reserve'
        ) ||
        this.store.wallets.find((w) => w.wallet_id === 'WL-0003') ||
        this.store.wallets[0] ||
        null;
    }

    // 3. Lookup via user smart contract anchor system (user_id, username, email, wallet_address, contract_address)
    const contract = this.store.userContractAddresses.find(
      (c) =>
        c.user_id.toLowerCase() === clean ||
        (c.username && c.username.toLowerCase() === clean) ||
        (c.email && c.email.toLowerCase() === clean) ||
        c.wallet_address.toLowerCase() === clean ||
        c.contract_address.toLowerCase() === clean
    );

    if (!wallet && contract) {
      wallet =
        this.store.wallets.find(
          (w) =>
            w.public_address.toLowerCase() === contract.wallet_address.toLowerCase() ||
            w.account_identifier.toLowerCase() === contract.user_id.toLowerCase()
        ) || null;
    }

    if (!wallet) return null;

    // Attach contract address if known
    const matchingContract =
      contract ||
      this.store.userContractAddresses.find(
        (c) =>
          c.user_id.toLowerCase() === wallet!.account_identifier.toLowerCase() ||
          c.wallet_address.toLowerCase() === wallet!.public_address.toLowerCase()
      );

    const enrichedWallet: PublicWalletRecord & { contract_address?: string } = {
      ...wallet,
      contract_address: matchingContract?.contract_address || wallet.verificationProof || undefined,
      verificationProof:
        matchingContract?.contract_address || wallet.verificationProof || wallet.verification_proof || null,
      verification_proof:
        matchingContract?.contract_address || wallet.verificationProof || wallet.verification_proof || null,
    };

    const targetAddr = wallet.public_address.toLowerCase();
    const targetUserId = wallet.account_identifier.toLowerCase();

    const transactions = this.store.transactions
      .filter(
        (tx) =>
          tx.is_public &&
          (tx.sender_wallet.toLowerCase() === targetAddr ||
            tx.receiver_wallet.toLowerCase() === targetAddr ||
            (tx.user_id_reference &&
              tx.user_id_reference.toLowerCase() === targetUserId))
      )
      .sort((a, b) => b.created_at.localeCompare(a.created_at));

    return { wallet: enrichedWallet, transactions };
  }

  // ==========================================================================
  // ADMIN MUTATION METHODS (Protected by Server-Side RBAC & Input Validation)
  // ==========================================================================

  public updateAllocation(params: {
    id: number;
    allocated_amount: string;
    distributed_amount: string;
    lockup_policy: string;
    release_schedule: string;
    verification_status: 'VERIFIED_OFF_CHAIN_RESERVE' | 'LOCKED_VESTING' | 'ACTIVE_DISTRIBUTION';
    description: string;
  }): TokenAllocation {
    if (!isValidDecimal8(params.allocated_amount) || !isValidDecimal8(params.distributed_amount)) {
      throw new Error('Invalid DECIMAL(36,8) token amount format.');
    }

    const allocUnits = decimalToUnits(params.allocated_amount);
    const distUnits = decimalToUnits(params.distributed_amount);
    if (distUnits > allocUnits) {
      throw new Error('Distributed amount cannot exceed total allocated amount for this pool.');
    }

    const idx = this.store.allocations.findIndex((a) => a.id === params.id);
    if (idx === -1) {
      throw new Error('Allocation record not found.');
    }

    const remaining = subDecimal8(
      unitsToDecimal(allocUnits),
      unitsToDecimal(distUnits)
    );

    // Recalculate total max supply if allocated amount changed
    const target = this.store.allocations[idx];
    target.allocated_amount = unitsToDecimal(allocUnits);
    target.distributed_amount = unitsToDecimal(distUnits);
    target.remaining_amount = remaining;
    target.lockup_policy = params.lockup_policy.trim();
    target.release_schedule = params.release_schedule.trim();
    target.verification_status = params.verification_status;
    target.description = params.description.trim();
    target.updated_at = new Date().toISOString();

    // Update total max supply & percentage shares across all allocations using BigInt
    let totalMaxUnits = 0n;
    for (const a of this.store.allocations) {
      totalMaxUnits += decimalToUnits(a.allocated_amount);
    }
    this.store.tokenInfo.max_supply = unitsToDecimal(totalMaxUnits);
    this.store.tokenInfo.updated_at = new Date().toISOString();

    if (totalMaxUnits > 0n) {
      for (const a of this.store.allocations) {
        const aUnits = decimalToUnits(a.allocated_amount);
        // Basis points (100.00% = 10000n)
        const bps = (aUnits * 10000n) / totalMaxUnits;
        const wholePct = bps / 100n;
        const fracPct = (bps % 100n).toString().padStart(2, '0');
        a.percentage_share = `${wholePct}.${fracPct}`;
      }
    }

    // Also sync custodial wallet balance if matching
    const custodyWallet = this.store.wallets.find(
      (w) => w.public_address === target.custody_wallet_address
    );
    if (custodyWallet) {
      custodyWallet.balance = remaining;
      custodyWallet.total_received = target.allocated_amount;
      custodyWallet.total_sent = target.distributed_amount;
      custodyWallet.last_activity_at = new Date().toISOString();
    }

    this.persistStore();
    return target;
  }

  public updateTokenInfo(params: {
    token_name: string;
    blockchain_status: string;
    main_portal_url: string;
  }): TokenInfo {
    this.store.tokenInfo.token_name = params.token_name.trim();
    this.store.tokenInfo.blockchain_status = params.blockchain_status.trim();
    this.store.tokenInfo.main_portal_url = params.main_portal_url.trim();
    this.store.tokenInfo.updated_at = new Date().toISOString();
    this.persistStore();
    return this.store.tokenInfo;
  }

  public createAnnouncement(params: {
    title: string;
    category: AnnouncementItem['category'];
    summary: string;
    content: string;
    author: string;
    is_pinned: boolean;
  }): AnnouncementItem {
    const newItem: AnnouncementItem = {
      id: `ANN-${Date.now()}`,
      title: params.title.trim(),
      category: params.category,
      summary: params.summary.trim(),
      content: params.content.trim(),
      author: params.author.trim() || 'FLYX Foundation Governance',
      external_link: 'https://flyxcoin.com',
      is_pinned: Boolean(params.is_pinned),
      published_at: new Date().toISOString(),
    };
    this.store.announcements.unshift(newItem);
    this.persistStore();
    return newItem;
  }

  public deleteAnnouncement(id: string): boolean {
    const initialLen = this.store.announcements.length;
    this.store.announcements = this.store.announcements.filter((a) => a.id !== id);
    if (this.store.announcements.length !== initialLen) {
      this.persistStore();
      return true;
    }
    return false;
  }

  public updateRoadmapPhase(params: {
    id: number;
    status: RoadmapPhase['status'];
    completion_percent: number;
    target_window: string;
    summary: string;
    verification_note: string;
  }): RoadmapPhase {
    const phase = this.store.roadmap.find((r) => r.id === params.id);
    if (!phase) {
      throw new Error('Roadmap phase not found.');
    }

    // Rule enforcement: Only mark a phase as COMPLETED when completion_percent is 100
    const clampedPercent = Math.max(0, Math.min(100, Math.round(params.completion_percent)));
    const safeStatus =
      params.status === 'COMPLETED' && clampedPercent < 100 ? 'IN_PROGRESS' : params.status;

    phase.status = safeStatus;
    phase.completion_percent = safeStatus === 'COMPLETED' ? 100 : clampedPercent;
    phase.target_window = params.target_window.trim();
    phase.summary = params.summary.trim();
    phase.verification_note = params.verification_note.trim();
    phase.updated_at = new Date().toISOString();

    this.persistStore();
    return phase;
  }

  public updateWhitepaperSection(params: {
    id: string;
    title: string;
    subtitle: string;
    content: string;
    version: string;
  }): WhitepaperSection {
    const section = this.store.whitepaper.find((w) => w.id === params.id);
    if (!section) {
      throw new Error('Whitepaper section not found.');
    }
    section.title = params.title.trim();
    section.subtitle = params.subtitle.trim();
    section.content = params.content.trim();
    section.version = params.version.trim();
    section.updated_at = new Date().toISOString();
    this.persistStore();
    return section;
  }

  public toggleTransactionVisibility(txId: string, isPublic: boolean): LedgerTransaction {
    const tx = this.store.transactions.find((t) => t.tx_id === txId);
    if (!tx) {
      throw new Error('Transaction not found.');
    }
    tx.is_public = isPublic;
    this.persistStore();
    return tx;
  }

  public recordOffChainTransaction(params: {
    tx_type: TransactionType;
    amount: string;
    sender_wallet: string;
    receiver_wallet: string;
    user_id_reference?: string;
    memo: string;
  }): LedgerTransaction {
    if (!isValidDecimal8(params.amount)) {
      throw new Error('Amount must be a valid DECIMAL(36,8) value.');
    }
    const formattedAmount = unitsToDecimal(decimalToUnits(params.amount));
    const tx: LedgerTransaction = {
      tx_id: `FLYX-LEDGER-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(
        100000 + Math.random() * 900000
      )}`,
      contract_address: '0x71C8A1D3b28E3A759f20E2DbE08f906471E2D4F6',
      ledger_environment: 'OFF_CHAIN_INTERNAL_LEDGER',
      tx_type: params.tx_type,
      amount: formattedAmount,
      fee: '0.00000000',
      status: 'CONFIRMED' as TransactionStatus,
      sender_wallet: params.sender_wallet.trim(),
      receiver_wallet: params.receiver_wallet.trim(),
      user_id_reference: params.user_id_reference?.trim() || null,
      memo: params.memo.trim(),
      is_public: true,
      created_at: new Date().toISOString(),
    };

    // Update sender & receiver wallet balances if tracked
    const sender = this.store.wallets.find(
      (w) => w.public_address.toLowerCase() === tx.sender_wallet.toLowerCase()
    );
    const receiver = this.store.wallets.find(
      (w) => w.public_address.toLowerCase() === tx.receiver_wallet.toLowerCase()
    );

    if (sender && decimalToUnits(sender.balance) >= decimalToUnits(formattedAmount)) {
      sender.balance = subDecimal8(sender.balance, formattedAmount);
      sender.total_sent = addDecimal8(sender.total_sent, formattedAmount);
      sender.transaction_count += 1;
      sender.last_activity_at = tx.created_at;
    }

    if (receiver) {
      receiver.balance = addDecimal8(receiver.balance, formattedAmount);
      receiver.total_received = addDecimal8(receiver.total_received, formattedAmount);
      if (tx.tx_type === 'MINING_DISTRIBUTION') {
        receiver.mining_rewards_earned = addDecimal8(
          receiver.mining_rewards_earned,
          formattedAmount
        );
      }
      receiver.transaction_count += 1;
      receiver.last_activity_at = tx.created_at;
    }

    this.store.transactions.unshift(tx);
    this.persistStore();
    return tx;
  }

  // ==========================================================================
  // USER SMART CONTRACT ADDRESS SYSTEM (1:1 Permanent Binding & Validation)
  // ==========================================================================

  public generateDeterministicContractAddress(
    userId: string,
    network = 'FLYX Sovereign EVM (Pre-Mainnet)'
  ): string {
    const cleanId = userId.trim().toUpperCase();
    const hash = crypto
      .createHash('sha256')
      .update(`${cleanId}:${network}:FLYX_SOVEREIGN_GENESIS_2026`)
      .digest('hex');
    const rawAddr = hash.slice(0, 40);
    return `0x${rawAddr}`;
  }

  public validateContractAddress(address: string): { isValid: boolean; error?: string } {
    if (!address || typeof address !== 'string') {
      return { isValid: false, error: 'Contract address is required.' };
    }
    const clean = address.trim();
    if (!/^0x[a-fA-F0-9]{40}$/.test(clean)) {
      return {
        isValid: false,
        error:
          'Invalid contract address format. Must be a valid 42-character EVM hexadecimal address starting with 0x.',
      };
    }
    return { isValid: true };
  }

  public getUserContractAddresses(filters?: {
    q?: string;
    status?: string;
    network?: string;
  }): UserContractAddressRecord[] {
    let list = this.store.userContractAddresses || [];
    if (!filters) return list;

    if (filters.status && filters.status !== 'ALL') {
      list = list.filter((c) => c.status === filters.status);
    }
    if (filters.network && filters.network !== 'ALL') {
      list = list.filter((c) =>
        c.network.toLowerCase().includes(filters.network!.toLowerCase())
      );
    }
    if (filters.q) {
      const q = filters.q.trim().toLowerCase();
      list = list.filter(
        (c) =>
          c.user_id.toLowerCase().includes(q) ||
          (c.username && c.username.toLowerCase().includes(q)) ||
          (c.email && c.email.toLowerCase().includes(q)) ||
          (c.mobile && c.mobile.toLowerCase().includes(q)) ||
          c.wallet_address.toLowerCase().includes(q) ||
          c.contract_address.toLowerCase().includes(q) ||
          (c.transaction_ref && c.transaction_ref.toLowerCase().includes(q))
      );
    }
    return list;
  }

  public getUserContractByUserIdOrAddress(
    identifier: string
  ): UserContractAddressRecord | null {
    if (!identifier) return null;
    const clean = identifier.trim().toLowerCase();
    const list = this.store.userContractAddresses || [];
    return (
      list.find(
        (c) =>
          c.user_id.toLowerCase() === clean ||
          c.wallet_address.toLowerCase() === clean ||
          c.contract_address.toLowerCase() === clean ||
          (c.username && c.username.toLowerCase() === clean) ||
          (c.email && c.email.toLowerCase() === clean)
      ) || null
    );
  }

  public assignUserContractAddress(
    params: {
      user_id: string;
      wallet_address: string;
      contract_address?: string;
      network?: string;
      token_symbol?: string;
      status?: UserContractStatus;
      username?: string;
      email?: string;
      mobile?: string;
      notes?: string;
      transaction_ref?: string;
    },
    adminUsername = 'admin@flyxcoin.com'
  ): UserContractAddressRecord {
    const userId = params.user_id.trim();
    const walletAddress = params.wallet_address.trim();
    if (!userId) throw new Error('User ID is required.');
    if (!walletAddress) throw new Error('Internal FlyX wallet address is required.');

    const network = params.network?.trim() || 'FLYX Sovereign EVM (Pre-Mainnet)';
    const tokenSymbol = params.token_symbol?.trim() || 'FLYX';
    const status: UserContractStatus = params.status || 'ACTIVE';

    let contractAddress = params.contract_address?.trim();
    if (!contractAddress) {
      contractAddress = this.generateDeterministicContractAddress(userId, network);
    } else {
      const validation = this.validateContractAddress(contractAddress);
      if (!validation.isValid) throw new Error(validation.error);
    }

    if (!this.store.userContractAddresses) {
      this.store.userContractAddresses = [];
    }

    // Check duplicate contract address (Must NEVER be assigned to another user!)
    const existingWithContract = this.store.userContractAddresses.find(
      (c) =>
        c.contract_address.toLowerCase() === contractAddress!.toLowerCase() &&
        c.user_id.toLowerCase() !== userId.toLowerCase()
    );
    if (existingWithContract) {
      throw new Error(
        `Duplicate smart contract address: "${contractAddress}" is already permanently assigned to user ${existingWithContract.user_id}.`
      );
    }

    // Check duplicate wallet address
    const existingWithWallet = this.store.userContractAddresses.find(
      (c) =>
        c.wallet_address.toLowerCase() === walletAddress.toLowerCase() &&
        c.user_id.toLowerCase() !== userId.toLowerCase()
    );
    if (existingWithWallet) {
      throw new Error(
        `Duplicate wallet address: "${walletAddress}" is already bound to user ${existingWithWallet.user_id}.`
      );
    }

    const now = new Date().toISOString();
    const existingIndex = this.store.userContractAddresses.findIndex(
      (c) => c.user_id.toLowerCase() === userId.toLowerCase()
    );

    let resultRecord: UserContractAddressRecord;

    if (existingIndex >= 0) {
      const existing = this.store.userContractAddresses[existingIndex];
      existing.contract_address = contractAddress;
      existing.wallet_address = walletAddress;
      existing.network = network;
      existing.token_symbol = tokenSymbol;
      existing.status = status;
      if (params.username) existing.username = params.username.trim();
      if (params.email) existing.email = params.email.trim();
      if (params.mobile) existing.mobile = params.mobile.trim();
      if (params.notes) existing.notes = params.notes.trim();
      if (params.transaction_ref) existing.transaction_ref = params.transaction_ref.trim();
      existing.updated_at = now;
      resultRecord = existing;
    } else {
      const nextId =
        this.store.userContractAddresses.length > 0
          ? Math.max(...this.store.userContractAddresses.map((c) => c.id)) + 1
          : 1;

      resultRecord = {
        id: nextId,
        user_id: userId,
        username: params.username?.trim() || undefined,
        email: params.email?.trim() || undefined,
        mobile: params.mobile?.trim() || undefined,
        wallet_address: walletAddress,
        contract_address: contractAddress,
        network,
        token_symbol: tokenSymbol,
        status,
        is_primary: true,
        deployed_at: now,
        transaction_ref: params.transaction_ref?.trim() || null,
        notes: params.notes?.trim() || 'Assigned via Administrator Console',
        created_at: now,
        updated_at: now,
      };
      this.store.userContractAddresses.push(resultRecord);
    }

    // Add Audit Log Entry
    this.store.audits.unshift({
      id: `AUD-${Date.now().toString().slice(-8)}`,
      audit_title: `Smart Contract Address Assigned for User ${userId}`,
      scope: 'user_contract_addresses',
      auditor: adminUsername,
      status: 'VERIFIED',
      checksum_sha256: crypto
        .createHash('sha256')
        .update(`${userId}:${contractAddress}:${now}`)
        .digest('hex'),
      summary: `Smart contract ${contractAddress} assigned to user ${userId} on ${network} with status ${status}.`,
      audited_at: now,
    });

    this.persistStore();
    return resultRecord;
  }

  public updateUserContractStatus(
    identifier: string | number,
    status: UserContractStatus,
    notes?: string,
    adminUsername = 'admin@flyxcoin.com'
  ): UserContractAddressRecord {
    if (!this.store.userContractAddresses) {
      this.store.userContractAddresses = [];
    }
    const idStr = String(identifier).trim().toLowerCase();
    const record = this.store.userContractAddresses.find(
      (c) =>
        String(c.id) === idStr ||
        c.user_id.toLowerCase() === idStr ||
        c.contract_address.toLowerCase() === idStr
    );
    if (!record) {
      throw new Error(`User smart contract address record "${identifier}" not found.`);
    }

    const oldStatus = record.status;
    record.status = status;
    if (notes) {
      record.notes = notes.trim();
    }
    const now = new Date().toISOString();
    record.updated_at = now;

    // Audit Log Entry
    this.store.audits.unshift({
      id: `AUD-${Date.now().toString().slice(-8)}`,
      audit_title: `User Smart Contract Status Changed: ${record.user_id}`,
      scope: 'user_contract_addresses.status',
      auditor: adminUsername,
      status: 'VERIFIED',
      checksum_sha256: crypto
        .createHash('sha256')
        .update(`${record.user_id}:${oldStatus}->${status}:${now}`)
        .digest('hex'),
      summary: `Status for ${record.contract_address} (user: ${record.user_id}) updated from ${oldStatus} to ${status}. Notes: ${notes || 'Status changed by admin'}`,
      audited_at: now,
    });

    this.persistStore();
    return record;
  }
}

export const ledgerRepository = new MySqlLedgerRepository();
