-- ============================================================================
-- W3A-1 Autonomous x402 Marketplace Database Schema
-- Database: w3a1_marketplace
-- Engine: InnoDB | Charset: utf8mb4
-- ============================================================================

CREATE DATABASE IF NOT EXISTS w3a1_marketplace CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE w3a1_marketplace;

-- 1. USERS
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    wallet_address VARCHAR(66) NOT NULL,
    role ENUM('agent', 'owner', 'customer') DEFAULT 'agent',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- 2. CATEGORIES
CREATE TABLE IF NOT EXISTS categories (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- 3. PROVIDERS
CREATE TABLE IF NOT EXISTS providers (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    service_type VARCHAR(128) NOT NULL,
    endpoint VARCHAR(255) NOT NULL,
    rating DECIMAL(3, 2) NOT NULL DEFAULT 4.80,
    quality_score DECIMAL(3, 2) NOT NULL DEFAULT 0.92,
    availability TINYINT(1) NOT NULL DEFAULT 1,
    verified TINYINT(1) NOT NULL DEFAULT 1,
    wallet_address VARCHAR(66) DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- 4. SERVICES
CREATE TABLE IF NOT EXISTS services (
    id VARCHAR(64) PRIMARY KEY,
    provider_id VARCHAR(64) NOT NULL,
    category_id VARCHAR(64) NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price DECIMAL(10, 2) NOT NULL DEFAULT 4.00,
    price_unit VARCHAR(64) NOT NULL DEFAULT 'USDC / request',
    delivery_time VARCHAR(64) NOT NULL DEFAULT '195ms',
    latency_ms INT NOT NULL DEFAULT 195,
    quality_score DECIMAL(3, 2) NOT NULL DEFAULT 0.94,
    availability TINYINT(1) NOT NULL DEFAULT 1,
    status VARCHAR(32) NOT NULL DEFAULT 'AVAILABLE',
    endpoint VARCHAR(255) NOT NULL,
    x402_enabled TINYINT(1) NOT NULL DEFAULT 1,
    is_api_backed TINYINT(1) NOT NULL DEFAULT 0,
    adapter_type VARCHAR(64) DEFAULT NULL,
    auth_type VARCHAR(64) DEFAULT 'NONE',
    pricing_model VARCHAR(64) DEFAULT 'PER_REQUEST',
    documentation_url VARCHAR(255) DEFAULT NULL,
    terms_url VARCHAR(255) DEFAULT NULL,
    source_url VARCHAR(255) DEFAULT NULL,
    health_status VARCHAR(64) DEFAULT 'AVAILABLE',
    last_verified TIMESTAMP NULL DEFAULT NULL,
    env_key_name VARCHAR(64) DEFAULT NULL,
    request_schema TEXT DEFAULT NULL,
    response_schema TEXT DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_services_provider FOREIGN KEY (provider_id) REFERENCES providers (id) ON DELETE CASCADE,
    CONSTRAINT fk_services_category FOREIGN KEY (category_id) REFERENCES categories (id) ON DELETE CASCADE,
    INDEX idx_services_category (category_id),
    INDEX idx_services_provider (provider_id),
    INDEX idx_services_query (category_id, price, availability, quality_score)
) ENGINE=InnoDB;

-- 5. ORDERS
CREATE TABLE IF NOT EXISTS orders (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) NOT NULL,
    service_id VARCHAR(64) NOT NULL,
    provider_id VARCHAR(64) NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'PENDING',
    payload_input TEXT,
    payload_output TEXT,
    delivery_hash VARCHAR(255) DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_orders_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
    CONSTRAINT fk_orders_service FOREIGN KEY (service_id) REFERENCES services (id) ON DELETE CASCADE,
    CONSTRAINT fk_orders_provider FOREIGN KEY (provider_id) REFERENCES providers (id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 6. TRANSACTIONS
CREATE TABLE IF NOT EXISTS transactions (
    id VARCHAR(64) PRIMARY KEY,
    order_id VARCHAR(64) NOT NULL,
    transaction_reference VARCHAR(128) NOT NULL UNIQUE,
    amount DECIMAL(10, 2) NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'SETTLED',
    risk_score DECIMAL(3, 2) NOT NULL DEFAULT 0.05,
    block_number INT DEFAULT NULL,
    network VARCHAR(64) NOT NULL DEFAULT 'Ethereum Sepolia Testnet',
    chain_id INT NOT NULL DEFAULT 11155111,
    etherscan_url VARCHAR(255) DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_transactions_order FOREIGN KEY (order_id) REFERENCES orders (id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 7. REVIEWS
CREATE TABLE IF NOT EXISTS reviews (
    id VARCHAR(64) PRIMARY KEY,
    order_id VARCHAR(64) NOT NULL,
    user_id VARCHAR(64) NOT NULL,
    provider_id VARCHAR(64) NOT NULL,
    rating DECIMAL(2, 1) NOT NULL DEFAULT 5.0,
    comment TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_reviews_order FOREIGN KEY (order_id) REFERENCES orders (id) ON DELETE CASCADE,
    CONSTRAINT fk_reviews_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
    CONSTRAINT fk_reviews_provider FOREIGN KEY (provider_id) REFERENCES providers (id) ON DELETE CASCADE
) ENGINE=InnoDB;
