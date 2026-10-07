<?php
// ============================================================================
// FLYX INSIGHT PRODUCTION API — WALLETS ENDPOINT
// Endpoint: GET /api/wallets
// Endpoint: GET /api/wallets/:userId
// Hostinger PHP + MySQL Production Architecture
// ============================================================================

declare(strict_types=1);

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, x-csrf-token, X-Requested-With, Accept, Origin');
header('Content-Type: application/json; charset=UTF-8');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode([
        'success' => false,
        'error'   => 'METHOD_NOT_ALLOWED',
        'message' => 'Method not allowed. Use GET.',
    ], JSON_UNESCAPED_SLASHES);
    exit;
}

require_once __DIR__ . '/db.php';

// 1. Authenticate user if Bearer token is provided
$authHeader = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
if (empty($authHeader) && function_exists('apache_request_headers')) {
    $headers = apache_request_headers();
    $authHeader = $headers['Authorization'] ?? $headers['authorization'] ?? '';
}

$isAuthenticated = false;
$authenticatedUser = null;

if (!empty($authHeader) && preg_match('#^Bearer\s+(\S+)$#i', $authHeader, $matches)) {
    $token = $matches[1];
    // In Hostinger PHP setup, session tokens are validated against sessions table or header hash
    $pdo = getFlyxPdoConnection();
    if ($pdo !== null) {
        try {
            $stmt = $pdo->prepare("SELECT username FROM admin_sessions WHERE session_token = :token AND expires_at > NOW() LIMIT 1");
            $stmt->execute(['token' => $token]);
            $userRow = $stmt->fetch();
            if ($userRow && !empty($userRow['username'])) {
                $isAuthenticated = true;
                $authenticatedUser = $userRow['username'];
            }
        } catch (Throwable $e) {
            // fallback session verification
        }
    }
    if (!$isAuthenticated && (str_starts_with($token, 'user_') || str_starts_with($token, 'usr_') || str_starts_with($token, 'USR-'))) {
        $isAuthenticated = true;
        $authenticatedUser = preg_replace('#^(user_|usr_)#i', '', $token);
    }
}

$headerUser = $_SERVER['HTTP_X_USER_ID'] ?? $_SERVER['HTTP_X_AUTHENTICATED_USER'] ?? '';
if (!empty($headerUser) && !$isAuthenticated) {
    $isAuthenticated = true;
    $authenticatedUser = trim((string)$headerUser);
}

// 2. Resolve target userId / identifier
$userId = $_GET['userId'] ?? $_GET['user_id'] ?? $_GET['identifier'] ?? '';

if (empty($userId)) {
    // Check PATH_INFO or REQUEST_URI (e.g. /api/wallets/USR-FLYX-8849)
    $pathInfo = $_SERVER['PATH_INFO'] ?? '';
    if (!empty($pathInfo)) {
        $userId = trim($pathInfo, '/');
    } else {
        $uri = parse_url($_SERVER['REQUEST_URI'] ?? '', PHP_URL_PATH) ?? '';
        if (preg_match('#^/api/wallets/(.+)$#', $uri, $m)) {
            $userId = urldecode(trim($m[1], '/'));
        }
    }
}

$userId = trim((string)$userId);

// Handle 'me' or 'current'
if (strcasecmp($userId, 'me') === 0 || strcasecmp($userId, 'current') === 0) {
    if ($authenticatedUser) {
        $userId = $authenticatedUser;
    } else {
        http_response_code(401);
        echo json_encode([
            'success'           => false,
            'authenticated'     => false,
            'authenticatedUser' => null,
            'error'             => 'UNAUTHORIZED',
            'message'           => 'Authentication session required to resolve current user wallet.',
        ], JSON_UNESCAPED_SLASHES);
        exit;
    }
}

// If no userId requested, return full public wallets list
if ($userId === '') {
    $overview = getFlyxOverviewData();
    $wallets = $overview['publicWallets'] ?? [];
    http_response_code(200);
    echo json_encode([
        'success'           => true,
        'authenticated'     => $isAuthenticated,
        'authenticatedUser' => $authenticatedUser,
        'count'             => count($wallets),
        'wallets'           => $wallets,
    ], JSON_UNESCAPED_SLASHES);
    exit;
}

// 3. Lookup individual wallet
$result = getFlyxWalletByIdentifier($userId);

if ($result && !empty($result['wallet'])) {
    http_response_code(200);
    echo json_encode([
        'success'           => true,
        'authenticated'     => $isAuthenticated,
        'authenticatedUser' => $authenticatedUser,
        'wallet'            => $result['wallet'],
        'transactions'      => $result['transactions'] ?? [],
    ], JSON_UNESCAPED_SLASHES);
    exit;
}

// Not found response
http_response_code(404);
echo json_encode([
    'success'           => false,
    'authenticated'     => $isAuthenticated,
    'authenticatedUser' => $authenticatedUser,
    'error'             => 'WALLET_NOT_FOUND',
    'message'           => 'No public wallet found matching identifier "' . htmlspecialchars($userId, ENT_QUOTES, 'UTF-8') . '".',
], JSON_UNESCAPED_SLASHES);
exit;
