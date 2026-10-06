<?php
// ============================================================================
// FLYX INSIGHT PRODUCTION API — PRICE ENDPOINT
// Endpoint: GET /api/price
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

$pricePayload = [
    "symbol" => "FLYX",
    "currency" => "USD",
    "price_usd" => "3.50000000",
    "change_24h_percent" => "+4.28",
    "high_24h_usd" => "3.54000000",
    "low_24h_usd" => "3.35000000",
    "reference_volume_24h_flyx" => "59950.75000000",
    "source_portal" => "FlyXCoin.com Internal Dual-Fiat Wallet Settlement Feed",
    "rate_type" => "OFF_CHAIN_INTERNAL_SETTLEMENT_RATE",
    "updated_at" => gmdate("Y-m-d\TH:i:s\Z")
];

http_response_code(200);
echo json_encode(array_merge([
    "success" => true,
    "data" => $pricePayload
], $pricePayload), JSON_UNESCAPED_SLASHES);
exit;
