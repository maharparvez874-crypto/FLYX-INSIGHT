<?php
// ============================================================================
// FLYX INSIGHT PRODUCTION DATABASE CONFIGURATION
// Domain: https://flyxinsight.flyxcoin.com (Hostinger Production Environment)
// ============================================================================

return [
    'host'     => getenv('MYSQL_HOST') ?: '127.0.0.1',
    'port'     => (int)(getenv('MYSQL_PORT') ?: 3306),
    'user'     => getenv('MYSQL_USER') ?: 'u538309072_coin',
    'password' => getenv('MYSQL_PASSWORD') ?: '1~dUHnD^x5KL',
    'database' => getenv('MYSQL_DATABASE') ?: 'u538309072_coin',
];
