-- ============================================================================
-- FLYX INSIGHT — OFFICIAL ECOSYSTEM TRANSPARENCY & LEDGER MYSQL SCHEMA
-- Connected to: FlyXCoin.com Official Ecosystem
-- Engine: InnoDB | Character Set: utf8mb4 | Precision: DECIMAL(36, 8)
-- Note: Zero floating-point types (FLOAT/DOUBLE) are used for financial values.
-- ============================================================================

CREATE DATABASE IF NOT EXISTS `flyx_ecosystem_ledger`
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE `flyx_ecosystem_ledger`;

-- 1. TOKEN INFORMATION TABLE
CREATE TABLE IF NOT EXISTS `token_info` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `token_symbol` VARCHAR(16) NOT NULL DEFAULT 'FLYX',
  `token_name` VARCHAR(64) NOT NULL DEFAULT 'FLYX Ecosystem Token',
  `decimals` TINYINT UNSIGNED NOT NULL DEFAULT 8,
  `max_supply` DECIMAL(36, 8) NOT NULL DEFAULT 1000000000.00000000,
  `ledger_mode` ENUM('OFF_CHAIN_MYSQL_LEDGER', 'HYBRID_BRIDGE', 'ON_CHAIN_MAINNET') NOT NULL DEFAULT 'OFF_CHAIN_MYSQL_LEDGER',
  `blockchain_status` VARCHAR(64) NOT NULL DEFAULT 'Pre-Mainnet (Off-Chain MySQL Project Ledger)',
  `contract_address` VARCHAR(128) NULL DEFAULT NULL COMMENT 'Null until official Phase 4/5 blockchain deployment',
  `main_portal_url` VARCHAR(255) NOT NULL DEFAULT 'https://flyxcoin.com',
  `insight_portal_url` VARCHAR(255) NOT NULL DEFAULT 'https://insight.flyxcoin.com',
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. SUPPLY STATISTICS TABLE
CREATE TABLE IF NOT EXISTS `supply_statistics` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `max_supply` DECIMAL(36, 8) NOT NULL,
  `circulating_supply` DECIMAL(36, 8) NOT NULL,
  `distributed_supply` DECIMAL(36, 8) NOT NULL,
  `undistributed_supply` DECIMAL(36, 8) NOT NULL,
  `community_mining_supply` DECIMAL(36, 8) NOT NULL,
  `team_allocation_supply` DECIMAL(36, 8) NOT NULL,
  `treasury_reserve_supply` DECIMAL(36, 8) NOT NULL,
  `liquidity_allocation_supply` DECIMAL(36, 8) NOT NULL,
  `ecosystem_rewards_supply` DECIMAL(36, 8) NOT NULL,
  `strategic_reserve_supply` DECIMAL(36, 8) NOT NULL,
  `active_wallets_count` INT UNSIGNED NOT NULL DEFAULT 0,
  `total_ledger_transactions` BIGINT UNSIGNED NOT NULL DEFAULT 0,
  `last_reconciled_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. TOKEN ALLOCATIONS & RESERVE POOLS TABLE
CREATE TABLE IF NOT EXISTS `token_allocations` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `category_key` VARCHAR(48) NOT NULL UNIQUE,
  `category_name` VARCHAR(96) NOT NULL,
  `allocated_amount` DECIMAL(36, 8) NOT NULL,
  `distributed_amount` DECIMAL(36, 8) NOT NULL,
  `remaining_amount` DECIMAL(36, 8) NOT NULL,
  `percentage_share` DECIMAL(6, 2) NOT NULL,
  `custody_wallet_address` VARCHAR(96) NOT NULL,
  `lockup_policy` VARCHAR(160) NOT NULL,
  `release_schedule` VARCHAR(160) NOT NULL,
  `verification_status` ENUM('VERIFIED_OFF_CHAIN_RESERVE', 'LOCKED_VESTING', 'ACTIVE_DISTRIBUTION') NOT NULL DEFAULT 'VERIFIED_OFF_CHAIN_RESERVE',
  `description` TEXT NOT NULL,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_alloc_category` (`category_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. PUBLIC WALLETS & USER BALANCES TABLE (PII-Isolated)
CREATE TABLE IF NOT EXISTS `wallets` (
  `wallet_id` VARCHAR(64) NOT NULL,
  `public_address` VARCHAR(96) NOT NULL UNIQUE,
  `account_identifier` VARCHAR(64) NOT NULL UNIQUE,
  `label` VARCHAR(120) NOT NULL,
  `wallet_type` ENUM('TREASURY_VAULT', 'MINING_POOL', 'LIQUIDITY_RESERVE', 'TEAM_VESTING', 'ECOSYSTEM_FUND', 'USER_WALLET') NOT NULL DEFAULT 'USER_WALLET',
  `balance` DECIMAL(36, 8) NOT NULL DEFAULT 0.00000000,
  `locked_balance` DECIMAL(36, 8) NOT NULL DEFAULT 0.00000000,
  `total_received` DECIMAL(36, 8) NOT NULL DEFAULT 0.00000000,
  `total_sent` DECIMAL(36, 8) NOT NULL DEFAULT 0.00000000,
  `mining_rewards_earned` DECIMAL(36, 8) NOT NULL DEFAULT 0.00000000,
  `transaction_count` INT UNSIGNED NOT NULL DEFAULT 0,
  `account_status` ENUM('ACTIVE', 'LOCKED_VESTING', 'AUDIT_HOLD', 'SUSPENDED') NOT NULL DEFAULT 'ACTIVE',
  `is_public` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `last_activity_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`wallet_id`),
  INDEX `idx_wallets_address` (`public_address`),
  INDEX `idx_wallets_identifier` (`account_identifier`),
  INDEX `idx_wallets_type` (`wallet_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. TRANSACTIONS & PUBLIC LEDGER ENTRIES TABLE
CREATE TABLE IF NOT EXISTS `transactions` (
  `tx_id` VARCHAR(64) NOT NULL,
  `ledger_environment` ENUM('OFF_CHAIN_INTERNAL_LEDGER', 'ON_CHAIN_MAINNET') NOT NULL DEFAULT 'OFF_CHAIN_INTERNAL_LEDGER',
  `tx_type` ENUM('MINING_DISTRIBUTION', 'USER_TRANSFER', 'TREASURY_ALLOCATION', 'ECOSYSTEM_REWARD', 'LIQUIDITY_PROVISION', 'TEAM_VESTING_LOCK') NOT NULL,
  `amount` DECIMAL(36, 8) NOT NULL,
  `fee` DECIMAL(36, 8) NOT NULL DEFAULT 0.00000000,
  `status` ENUM('CONFIRMED', 'PENDING', 'RECONCILED') NOT NULL DEFAULT 'CONFIRMED',
  `sender_wallet` VARCHAR(96) NOT NULL,
  `receiver_wallet` VARCHAR(96) NOT NULL,
  `user_id_reference` VARCHAR(64) NULL,
  `memo` VARCHAR(255) NOT NULL DEFAULT '',
  `is_public` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`tx_id`),
  INDEX `idx_tx_sender` (`sender_wallet`),
  INDEX `idx_tx_receiver` (`receiver_wallet`),
  INDEX `idx_tx_user_ref` (`user_id_reference`),
  INDEX `idx_tx_type` (`tx_type`),
  INDEX `idx_tx_created` (`created_at`),
  INDEX `idx_tx_amount` (`amount`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. ROADMAP PHASES TABLE
CREATE TABLE IF NOT EXISTS `roadmap_phases` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `phase_number` TINYINT UNSIGNED NOT NULL UNIQUE,
  `phase_code` VARCHAR(32) NOT NULL,
  `title` VARCHAR(120) NOT NULL,
  `subtitle` VARCHAR(200) NOT NULL,
  `status` ENUM('COMPLETED', 'IN_PROGRESS', 'PLANNED') NOT NULL DEFAULT 'PLANNED',
  `completion_percent` TINYINT UNSIGNED NOT NULL DEFAULT 0,
  `target_window` VARCHAR(64) NOT NULL,
  `summary` TEXT NOT NULL,
  `deliverables_json` JSON NOT NULL,
  `verification_note` VARCHAR(255) NOT NULL,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. OFFICIAL ANNOUNCEMENTS TABLE
CREATE TABLE IF NOT EXISTS `announcements` (
  `id` VARCHAR(48) NOT NULL,
  `title` VARCHAR(180) NOT NULL,
  `category` ENUM('TRANSPARENCY_REPORT', 'PLATFORM_UPDATE', 'TOKENOMICS_NOTICE', 'SECURITY_AUDIT', 'ECOSYSTEM_NEWS') NOT NULL,
  `summary` VARCHAR(320) NOT NULL,
  `content` TEXT NOT NULL,
  `author` VARCHAR(96) NOT NULL DEFAULT 'FLYX Foundation Governance',
  `external_link` VARCHAR(255) NULL DEFAULT 'https://flyxcoin.com',
  `is_pinned` TINYINT(1) NOT NULL DEFAULT 0,
  `published_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_announcements_published` (`published_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 8. WHITEPAPER SECTIONS TABLE
CREATE TABLE IF NOT EXISTS `whitepaper_sections` (
  `id` VARCHAR(48) NOT NULL,
  `section_order` TINYINT UNSIGNED NOT NULL UNIQUE,
  `slug` VARCHAR(64) NOT NULL UNIQUE,
  `title` VARCHAR(140) NOT NULL,
  `subtitle` VARCHAR(220) NOT NULL,
  `content` LONGTEXT NOT NULL,
  `key_takeaways_json` JSON NOT NULL,
  `version` VARCHAR(24) NOT NULL DEFAULT 'v2.4-OffChain',
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 9. TRANSPARENCY & AUDIT VERIFICATION TABLE
CREATE TABLE IF NOT EXISTS `audit_logs` (
  `id` VARCHAR(48) NOT NULL,
  `audit_title` VARCHAR(160) NOT NULL,
  `scope` VARCHAR(120) NOT NULL,
  `auditor` VARCHAR(120) NOT NULL,
  `status` ENUM('VERIFIED', 'IN_REVIEW', 'SCHEDULED') NOT NULL DEFAULT 'VERIFIED',
  `checksum_sha256` VARCHAR(64) NOT NULL,
  `summary` TEXT NOT NULL,
  `audited_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 10. FLYXCOIN OFFICIAL MINING PLANS TABLE
CREATE TABLE IF NOT EXISTS `mining_plans` (
  `plan_id` VARCHAR(64) NOT NULL,
  `plan_name` VARCHAR(120) NOT NULL,
  `mining_speed` VARCHAR(64) NOT NULL,
  `mining_rate_flyx_day` DECIMAL(36, 8) NOT NULL,
  `required_points` INT UNSIGNED NOT NULL DEFAULT 0,
  `duration_days` INT UNSIGNED NOT NULL DEFAULT 30,
  `status` ENUM('ACTIVE', 'MAINTENANCE', 'ARCHIVED') NOT NULL DEFAULT 'ACTIVE',
  `reward_configuration` VARCHAR(255) NOT NULL,
  `user_eligibility` VARCHAR(160) NOT NULL,
  `active_users` INT UNSIGNED NOT NULL DEFAULT 0,
  `total_rewards_generated` DECIMAL(36, 8) NOT NULL DEFAULT 0.00000000,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`plan_id`),
  INDEX `idx_plans_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 11. FLYXCOIN MINING POINTS & POOL METRICS SUMMARY TABLE
CREATE TABLE IF NOT EXISTS `mining_points_summary` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `total_points_issued` BIGINT UNSIGNED NOT NULL DEFAULT 0,
  `points_earned_active` BIGINT UNSIGNED NOT NULL DEFAULT 0,
  `points_used_redeemed` BIGINT UNSIGNED NOT NULL DEFAULT 0,
  `mining_related_points` BIGINT UNSIGNED NOT NULL DEFAULT 0,
  `plan_related_points` BIGINT UNSIGNED NOT NULL DEFAULT 0,
  `active_mining_users` INT UNSIGNED NOT NULL DEFAULT 0,
  `total_registered_users` INT UNSIGNED NOT NULL DEFAULT 0,
  `current_network_hashrate` VARCHAR(64) NOT NULL DEFAULT '1.325 GH/s',
  `average_daily_mining_emission` DECIMAL(36, 8) NOT NULL DEFAULT 12450.75000000,
  `total_mined_flyx` DECIMAL(36, 8) NOT NULL DEFAULT 94250180.45000000,
  `last_calculated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 12. MINING SESSIONS & SETTLEMENT AUDIT LOGS TABLE
CREATE TABLE IF NOT EXISTS `mining_sessions` (
  `session_id` VARCHAR(64) NOT NULL,
  `user_id_reference` VARCHAR(64) NOT NULL,
  `wallet_address` VARCHAR(96) NOT NULL,
  `plan_id` VARCHAR(64) NOT NULL,
  `points_consumed` INT UNSIGNED NOT NULL DEFAULT 0,
  `reward_amount` DECIMAL(36, 8) NOT NULL,
  `status` ENUM('CONFIRMED', 'PENDING', 'SETTLED') NOT NULL DEFAULT 'CONFIRMED',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`session_id`),
  INDEX `idx_mining_user` (`user_id_reference`),
  INDEX `idx_mining_plan` (`plan_id`),
  INDEX `idx_mining_wallet` (`wallet_address`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 13. USER SMART CONTRACT ADDRESSES TABLE
-- Permanent 1:1 binding between internal user_id, off-chain FlyX wallet, and sovereign Smart Contract Address.
CREATE TABLE IF NOT EXISTS `user_contract_addresses` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` VARCHAR(64) NOT NULL,
  `username` VARCHAR(64) NULL,
  `email` VARCHAR(128) NULL,
  `mobile` VARCHAR(32) NULL,
  `wallet_address` VARCHAR(96) NOT NULL,
  `contract_address` VARCHAR(128) NOT NULL,
  `network` VARCHAR(96) NOT NULL DEFAULT 'FLYX Sovereign EVM (Pre-Mainnet)',
  `token_symbol` VARCHAR(16) NOT NULL DEFAULT 'FLYX',
  `status` ENUM('ACTIVE', 'PENDING_DEPLOYMENT', 'PAUSED', 'REVOKED') NOT NULL DEFAULT 'ACTIVE',
  `is_primary` TINYINT(1) NOT NULL DEFAULT 1,
  `deployed_at` TIMESTAMP NULL DEFAULT NULL,
  `transaction_ref` VARCHAR(64) NULL,
  `notes` VARCHAR(255) NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_uca_user_id` (`user_id`),
  UNIQUE KEY `uq_uca_wallet_address` (`wallet_address`),
  UNIQUE KEY `uq_uca_contract_address` (`contract_address`),
  INDEX `idx_uca_username` (`username`),
  INDEX `idx_uca_email` (`email`),
  INDEX `idx_uca_mobile` (`mobile`),
  INDEX `idx_uca_network` (`network`),
  INDEX `idx_uca_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


