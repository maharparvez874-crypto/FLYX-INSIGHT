<?php
// ============================================================================
// FLYX INSIGHT PRODUCTION API — PRICE ENDPOINT
// Endpoint: GET /api/price
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
        'error'   => 'Method not allowed. Use GET.',
    ], JSON_UNESCAPED_SLASHES);
    exit;
}

try {
    require_once __DIR__ . '/db.php';
    $data = getFlyxPriceData();

    http_response_code(200);
    echo json_encode(array_merge([
        'success' => true,
        'data'    => $data,
    ], $data), JSON_UNESCAPED_SLASHES);
    exit;
} catch (Throwable $e) {
    error_log('FlyX API /price error: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error'   => 'Failed to retrieve FLYX token price.',
    ], JSON_UNESCAPED_SLASHES);
    exit;
}
