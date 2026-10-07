/**
 * FLYX Insight — Exact Decimal(36,8) Fixed-Point Arithmetic & Future Blockchain Adapter
 *
 * 1. Zero Floating-Point Rule:
 *    All FLYX token amounts are stored and computed as exact 8-decimal strings
 *    backed by BigInt (1 FLYX = 100,000,000 base units / "flyxoshi").
 *
 * 2. Modular Ledger & Future Blockchain Architecture:
 *    Separates the current Off-Chain MySQL Project Ledger from the upcoming
 *    FLYX Mainnet Blockchain Indexer, RPC Provider, and On-Chain Supply Verifier.
 */

export const FLYX_DECIMALS = 8;
const SCALE_FACTOR = 100_000_000n; // 10^8

/**
 * Validates that a string is a valid non-negative DECIMAL(36, 8) representation.
 */
export function isValidDecimal8(value: string): boolean {
  if (typeof value !== 'string') return false;
  const trimmed = value.trim();
  return /^\d{1,28}(\.\d{1,8})?$/.test(trimmed);
}

/**
 * Converts a DECIMAL(36, 8) string to exact BigInt base units (flyxoshi).
 */
export function decimalToUnits(value: string): bigint {
  const clean = value.replace(/,/g, '').trim();
  if (!isValidDecimal8(clean)) {
    throw new Error(`Invalid DECIMAL(36,8) token amount: "${value}"`);
  }
  const [wholePart, fracPart = ''] = clean.split('.');
  const paddedFrac = fracPart.padEnd(FLYX_DECIMALS, '0').slice(0, FLYX_DECIMALS);
  return BigInt(wholePart) * SCALE_FACTOR + BigInt(paddedFrac);
}

/**
 * Converts exact BigInt base units back into canonical DECIMAL(36, 8) string ("1234.56000000").
 */
export function unitsToDecimal(units: bigint): string {
  const isNegative = units < 0n;
  const abs = isNegative ? -units : units;
  const whole = abs / SCALE_FACTOR;
  const frac = (abs % SCALE_FACTOR).toString().padStart(FLYX_DECIMALS, '0');
  return `${isNegative ? '-' : ''}${whole.toString()}.${frac}`;
}

/**
 * Exact addition of two DECIMAL(36, 8) strings without IEEE-754 floating-point error.
 */
export function addDecimal8(a: string, b: string): string {
  return unitsToDecimal(decimalToUnits(a) + decimalToUnits(b));
}

/**
 * Exact subtraction of two DECIMAL(36, 8) strings without IEEE-754 floating-point error.
 */
export function subDecimal8(a: string, b: string): string {
  return unitsToDecimal(decimalToUnits(a) - decimalToUnits(b));
}

/**
 * Formats a DECIMAL(36, 8) string for human display with thousand separators
 * while preserving exact decimal digits.
 */
export function formatFlyxAmount(value: string, fractionDigits = 2): string {
  if (!value) return '0.00';
  const clean = value.replace(/,/g, '').trim();
  const [whole = '0', frac = '00000000'] = clean.split('.');
  const formattedWhole = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  if (fractionDigits <= 0) return formattedWhole;
  const paddedFrac = frac.padEnd(8, '0').slice(0, fractionDigits);
  return `${formattedWhole}.${paddedFrac}`;
}

// ============================================================================
// FUTURE BLOCKCHAIN ARCHITECTURE INTERFACES
// Designed so that when the FLYX Blockchain launches in Phase 4/5, the portal
// switches or bridges to verified on-chain data without rebuilding the UI/API.
// ============================================================================

export type LedgerEnvironment = 'OFF_CHAIN_INTERNAL_LEDGER' | 'ON_CHAIN_MAINNET';

export interface BlockchainNetworkStats {
  environment: LedgerEnvironment;
  isMainnetLive: boolean;
  networkName: string;
  chainId: string | null;
  consensusMechanism: string;
  blockHeight: number | null;
  averageBlockTimeMs: number | null;
  activeValidators: number | null;
  rpcEndpointStatus: 'STANDBY_PRE_LAUNCH' | 'CONNECTED_TESTNET' | 'ONLINE_MAINNET';
  indexerStatus: 'OFF_CHAIN_MYSQL_ACTIVE' | 'SYNCING_BLOCKS' | 'INDEXED_MAINNET';
  bridgeConnectionToFlyxCoin: {
    mainPortalUrl: string;
    apiBridgeStatus: 'AUTHENTICATED_OFF_CHAIN_SYNC';
    protocol: string;
    lastSyncTimestamp: string;
  };
}

export interface ServiceModuleDescriptor {
  serviceId: string;
  serviceName: string;
  interfaceName: string;
  currentProvider: string;
  futureMainnetProvider: string;
  deploymentState: 'ACTIVE_OFF_CHAIN' | 'INTERFACE_READY_STANDBY';
  description: string;
  endpoints: string[];
}

export interface IBlockchainIndexer {
  getIndexerStatus(): Promise<{
    mode: LedgerEnvironment;
    indexedTransactions: number;
    lastReconciledTimestamp: string;
  }>;
}

export interface IRpcProvider {
  getNetworkStatistics(): Promise<BlockchainNetworkStats>;
}

export interface IOnChainSupplyVerifier {
  verifyTotalSupplyInvariants(
    maxSupply: string,
    distributedSupply: string,
    undistributedSupply: string
  ): {
    isValid: boolean;
    computedTotal: string;
    expectedMaxSupply: string;
    ledgerEnvironment: LedgerEnvironment;
    verificationProof: string;
  };
}

export class FlyxSupplyVerifier implements IOnChainSupplyVerifier {
  verifyTotalSupplyInvariants(
    maxSupply: string,
    distributedSupply: string,
    undistributedSupply: string
  ) {
    const computedTotal = addDecimal8(distributedSupply, undistributedSupply);
    const isValid = decimalToUnits(computedTotal) === decimalToUnits(maxSupply);
    return {
      isValid,
      computedTotal,
      expectedMaxSupply: unitsToDecimal(decimalToUnits(maxSupply)),
      ledgerEnvironment: 'OFF_CHAIN_INTERNAL_LEDGER' as const,
      verificationProof: isValid
        ? 'EXACT_DECIMAL_36_8_INVARIANT_MATCH (Distributed + Undistributed == Max Supply)'
        : 'SUPPLY_INVARIANT_MISMATCH_DETECTED',
    };
  }
}

export const FUTURE_BLOCKCHAIN_SERVICES: ServiceModuleDescriptor[] = [
  {
    serviceId: 'srv-indexer',
    serviceName: 'Blockchain & Ledger Indexer',
    interfaceName: 'IBlockchainIndexer',
    currentProvider: 'MySQL 8.0 Off-Chain Ledger Adapter (Active)',
    futureMainnetProvider: 'FLYX Mainnet Block & Event Indexer (Phase 4/5)',
    deploymentState: 'ACTIVE_OFF_CHAIN',
    description:
      'Indexes all token distributions, mining payouts, reserve transfers, and user ledger records with exact DECIMAL(36,8) precision.',
    endpoints: ['/api/transactions', '/api/overview'],
  },
  {
    serviceId: 'srv-rpc',
    serviceName: 'RPC / Node API Integration',
    interfaceName: 'IRpcProvider',
    currentProvider: 'FlyXCoin.com Authenticated REST/MySQL Bridge',
    futureMainnetProvider: 'FLYX JSON-RPC / gRPC Validator Gateway',
    deploymentState: 'INTERFACE_READY_STANDBY',
    description:
      'Provides standardized state queries. Currently bridges to the official FlyXCoin.com off-chain database; ready for JSON-RPC node attachment upon Mainnet launch.',
    endpoints: ['/api/blockchain-architecture', '/api/network-stats'],
  },
  {
    serviceId: 'srv-explorer',
    serviceName: 'Public Block & Transaction Explorer',
    interfaceName: 'IBlockExplorerService',
    currentProvider: 'Off-Chain Internal Ledger Explorer',
    futureMainnetProvider: 'FLYX On-Chain Block, TxHash & State Explorer',
    deploymentState: 'ACTIVE_OFF_CHAIN',
    description:
      'Allows public lookup by Transaction ID, Wallet Address, User ID, Date, Type, and Amount while strictly labeling each record as Off-Chain or On-Chain.',
    endpoints: ['/api/transactions', '/api/transactions/:txId'],
  },
  {
    serviceId: 'srv-wallet',
    serviceName: 'Public Wallet & Balance Registry',
    interfaceName: 'IWalletDataProvider',
    currentProvider: 'MySQL Public Account & Custodial Vault Registry',
    futureMainnetProvider: 'Cryptographic Ed25519 / Secp256k1 State Tree Reader',
    deploymentState: 'ACTIVE_OFF_CHAIN',
    description:
      'Exposes intentionally public wallet balances, allocation lockups, and transaction counts while stripping all personal credentials and private keys.',
    endpoints: ['/api/wallets', '/api/wallets/:identifier', '/api/wallets/:userId'],
  },
  {
    serviceId: 'srv-verifier',
    serviceName: 'Token Supply & Reserve Verification Engine',
    interfaceName: 'IOnChainSupplyVerifier',
    currentProvider: 'BigInt DECIMAL(36,8) MySQL Invariant Auditor',
    futureMainnetProvider: 'On-Chain Genesis & Mint/Burn Merkle Verifier',
    deploymentState: 'ACTIVE_OFF_CHAIN',
    description:
      'Continuously reconciles Maximum Supply against Circulating, Distributed, Undistributed, Treasury, Mining, Liquidity, and Team allocations.',
    endpoints: ['/api/overview', '/api/verify-supply'],
  },
];
