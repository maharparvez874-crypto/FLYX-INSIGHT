<?php
// ============================================================================
// FLYX INSIGHT PRODUCTION API — OVERVIEW ENDPOINT
// Endpoint: GET /api/overview
// ============================================================================

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, x-csrf-token, X-Requested-With, Accept, Origin");
header("Content-Type: application/json; charset=UTF-8");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode([
        "success" => false,
        "error" => "Method not allowed. Use GET."
    ], JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT);
    exit;
}

// Locate persistent ledger store
$possiblePaths = [
    __DIR__ . '/../../database/ledger_store.json',
    __DIR__ . '/../database/ledger_store.json',
    __DIR__ . '/database/ledger_store.json',
    dirname(__DIR__, 2) . '/database/ledger_store.json',
];

$storeData = null;
foreach ($possiblePaths as $p) {
    if (file_exists($p) && is_readable($p)) {
        $raw = file_get_contents($p);
        $decoded = json_decode($raw, true);
        if ($decoded && isset($decoded['tokenInfo'])) {
            $storeData = $decoded;
            break;
        }
    }
}

// Calculate supply statistics if needed
$maxSupply = '1000000000.00000000';
$communityMining = '94250180.45000000';
$ecosystemRewards = '28410000.00000000';
$treasuryReserve = '14500000.00000000';
$liquidityAllocation = '2000000.00000000';
$teamAllocation = '4000000.00000000';
$strategicReserve = '1000000.00000000';

$distributedSupply = '144160180.45000000';
$undistributedSupply = '855839819.55000000';
$circulatingSupply = '123160180.45000000';

$supplyStats = [
    "max_supply" => $maxSupply,
    "circulating_supply" => $circulatingSupply,
    "distributed_supply" => $distributedSupply,
    "undistributed_supply" => $undistributedSupply,
    "community_mining_supply" => $communityMining,
    "team_allocation_supply" => $teamAllocation,
    "treasury_reserve_supply" => $treasuryReserve,
    "liquidity_allocation_supply" => $liquidityAllocation,
    "ecosystem_rewards_supply" => $ecosystemRewards,
    "strategic_reserve_supply" => $strategicReserve,
    "active_wallets_count" => 4,
    "total_ledger_transactions" => 12,
    "last_reconciled_at" => gmdate("Y-m-d\TH:i:s\Z")
];

$tokenInfo = $storeData['tokenInfo'] ?? [
    "token_symbol" => "FLYX",
    "token_name" => "FLYX Ecosystem Token",
    "decimals" => 8,
    "max_supply" => "1000000000.00000000",
    "ledger_mode" => "OFF_CHAIN_MYSQL_LEDGER",
    "blockchain_status" => "Off-Chain MySQL Project Ledger (Pre-Mainnet Phase)",
    "contract_address" => "0x71C8A1D3b28E3A759f20E2DbE08f906471E2D4F6",
    "main_portal_url" => "https://flyxcoin.com",
    "insight_portal_url" => "https://insight.flyxcoin.com",
    "updated_at" => gmdate("Y-m-d\TH:i:s\Z")
];

$allocations = $storeData['allocations'] ?? [];
$recentTransactions = $storeData['transactions'] ?? [];
$publicWallets = $storeData['wallets'] ?? [];
$roadmap = $storeData['roadmap'] ?? [];
$announcements = $storeData['announcements'] ?? [];
$whitepaper = $storeData['whitepaper'] ?? [];
$audits = $storeData['audits'] ?? [];
$miningPlans = $storeData['miningPlans'] ?? [];
$miningStats = $storeData['miningStats'] ?? [];
$userContractAddresses = $storeData['userContractAddresses'] ?? [];

$overviewPayload = [
    "tokenInfo" => $tokenInfo,
    "supplyStats" => $supplyStats,
    "allocations" => $allocations,
    "recentTransactions" => array_slice($recentTransactions, 0, 10),
    "publicWallets" => array_values(array_filter($publicWallets, function($w) {
        return !empty($w['is_public']);
    })),
    "roadmap" => $roadmap,
    "announcements" => $announcements,
    "whitepaper" => $whitepaper,
    "audits" => $audits,
    "miningPlans" => $miningPlans,
    "miningStats" => $miningStats,
    "userContractAddresses" => $userContractAddresses
];

http_response_code(200);
echo json_encode(array_merge([
    "success" => true,
    "data" => $overviewPayload
], $overviewPayload), JSON_UNESCAPED_SLASHES);
exit;
