<?php
// ============================================================================
// FLYX INSIGHT PRODUCTION API DISPATCHER
// ============================================================================

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, x-csrf-token, X-Requested-With, Accept, Origin");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

$endpoint = $_GET['endpoint'] ?? '';
$endpoint = trim(parse_url($endpoint, PHP_URL_PATH) ?? '', '/');

if (empty($endpoint)) {
    // Attempt parsing from REQUEST_URI
    $uri = parse_url($_SERVER['REQUEST_URI'] ?? '', PHP_URL_PATH) ?? '';
    if (preg_match('#^/api/(.+)$#', $uri, $matches)) {
        $endpoint = trim($matches[1], '/');
    }
}

if ($endpoint === 'overview' || $endpoint === 'v1/overview') {
    require __DIR__ . '/overview.php';
    exit;
}

if ($endpoint === 'price' || $endpoint === 'v1/price' || $endpoint === 'rates/flyx-usd') {
    require __DIR__ . '/price.php';
    exit;
}

header("Content-Type: application/json; charset=UTF-8");
http_response_code(404);
echo json_encode([
    "success" => false,
    "error" => "API endpoint not found: /api/" . $endpoint
], JSON_UNESCAPED_SLASHES);
exit;
