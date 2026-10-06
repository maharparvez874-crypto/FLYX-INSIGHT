<?php
// ============================================================================
// FLYX INSIGHT PRODUCTION API DISPATCHER
// Hostinger PHP + MySQL Production Architecture
// ============================================================================

declare(strict_types=1);

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, x-csrf-token, X-Requested-With, Accept, Origin');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

$endpoint = $_GET['endpoint'] ?? '';
$endpoint = trim(parse_url($endpoint, PHP_URL_PATH) ?? '', '/');

if (empty($endpoint)) {
    $uri = parse_url($_SERVER['REQUEST_URI'] ?? '', PHP_URL_PATH) ?? '';
    if (preg_match('#^/api/(.+)$#', $uri, $matches)) {
        $endpoint = trim($matches[1], '/');
    }
}

// Route: Overview
if ($endpoint === 'overview' || $endpoint === 'v1/overview') {
    require __DIR__ . '/overview.php';
    exit;
}

// Route: Price
if ($endpoint === 'price' || $endpoint === 'v1/price' || $endpoint === 'rates/flyx-usd') {
    require __DIR__ . '/price.php';
    exit;
}

// Route: Transactions
if ($endpoint === 'transactions' || $endpoint === 'v1/transactions') {
    header('Content-Type: application/json; charset=UTF-8');
    require_once __DIR__ . '/db.php';
    $overview = getFlyxOverviewData();
    $txs = $overview['recentTransactions'] ?? [];
    http_response_code(200);
    echo json_encode([
        'success'      => true,
        'count'        => count($txs),
        'transactions' => $txs,
    ], JSON_UNESCAPED_SLASHES);
    exit;
}

// Route: Single Wallet Lookup (/api/wallets/:identifier or /api/wallets?identifier=...)
if (preg_match('#^wallets/(.+)$#', $endpoint, $walletMatches)) {
    header('Content-Type: application/json; charset=UTF-8');
    require_once __DIR__ . '/db.php';
    $identifier = urldecode($walletMatches[1]);
    $result = getFlyxWalletByIdentifier($identifier);

    if ($result && !empty($result['wallet'])) {
        http_response_code(200);
        echo json_encode([
            'success'      => true,
            'wallet'       => $result['wallet'],
            'transactions' => $result['transactions'] ?? [],
        ], JSON_UNESCAPED_SLASHES);
        exit;
    }

    http_response_code(404);
    echo json_encode([
        'success' => false,
        'error'   => 'WALLET_NOT_FOUND',
        'message' => 'Wallet not found',
    ], JSON_UNESCAPED_SLASHES);
    exit;
}

// Route: Wallets List (/api/wallets)
if ($endpoint === 'wallets' || $endpoint === 'v1/wallets') {
    header('Content-Type: application/json; charset=UTF-8');
    require_once __DIR__ . '/db.php';

    // Check if query parameter identifier/user_id is passed
    $identifier = $_GET['identifier'] ?? $_GET['user_id'] ?? $_GET['userId'] ?? null;
    if ($identifier) {
        $result = getFlyxWalletByIdentifier(trim($identifier));
        if ($result && !empty($result['wallet'])) {
            http_response_code(200);
            echo json_encode([
                'success'      => true,
                'wallet'       => $result['wallet'],
                'transactions' => $result['transactions'] ?? [],
            ], JSON_UNESCAPED_SLASHES);
            exit;
        }

        http_response_code(404);
        echo json_encode([
            'success' => false,
            'error'   => 'WALLET_NOT_FOUND',
            'message' => 'Wallet not found',
        ], JSON_UNESCAPED_SLASHES);
        exit;
    }

    $overview = getFlyxOverviewData();
    $wallets = $overview['publicWallets'] ?? [];
    http_response_code(200);
    echo json_encode([
        'success' => true,
        'count'   => count($wallets),
        'wallets' => $wallets,
    ], JSON_UNESCAPED_SLASHES);
    exit;
}

// Route: User Contracts
if ($endpoint === 'user-contracts' || $endpoint === 'user/contract-address') {
    header('Content-Type: application/json; charset=UTF-8');
    require_once __DIR__ . '/db.php';
    $overview = getFlyxOverviewData();
    $contracts = $overview['userContractAddresses'] ?? [];

    $userId = $_GET['user_id'] ?? $_GET['userId'] ?? null;
    $contractAddr = $_GET['contract_address'] ?? $_GET['contractAddress'] ?? null;
    $walletAddr = $_GET['wallet_address'] ?? $_GET['walletAddress'] ?? null;

    if ($userId || $contractAddr || $walletAddr) {
        $matched = null;
        foreach ($contracts as $c) {
            if ($userId && strcasecmp($c['user_id'] ?? '', $userId) === 0) {
                $matched = $c;
                break;
            }
            if ($contractAddr && strcasecmp($c['contract_address'] ?? '', $contractAddr) === 0) {
                $matched = $c;
                break;
            }
            if ($walletAddr && strcasecmp($c['wallet_address'] ?? '', $walletAddr) === 0) {
                $matched = $c;
                break;
            }
        }
        if ($matched) {
            http_response_code(200);
            echo json_encode([
                'success' => true,
                'data'    => $matched,
            ], JSON_UNESCAPED_SLASHES);
            exit;
        }
    }

    http_response_code(200);
    echo json_encode([
        'success'   => true,
        'count'     => count($contracts),
        'contracts' => $contracts,
    ], JSON_UNESCAPED_SLASHES);
    exit;
}

// Route 404 Fallback
header('Content-Type: application/json; charset=UTF-8');
http_response_code(404);
echo json_encode([
    'success' => false,
    'error'   => 'API_ENDPOINT_NOT_FOUND',
    'message' => 'API endpoint not found: /api/' . $endpoint,
], JSON_UNESCAPED_SLASHES);
exit;
