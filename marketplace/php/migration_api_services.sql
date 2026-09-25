-- ============================================================================
-- Migration: Add API-Backed Service Metadata Columns to W3A-1 Marketplace
-- Database: w3a1_marketplace
-- ============================================================================

USE w3a1_marketplace;

ALTER TABLE services
  ADD COLUMN IF NOT EXISTS is_api_backed TINYINT(1) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS adapter_type VARCHAR(64) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS auth_type VARCHAR(64) DEFAULT 'NONE',
  ADD COLUMN IF NOT EXISTS pricing_model VARCHAR(64) DEFAULT 'PER_REQUEST',
  ADD COLUMN IF NOT EXISTS documentation_url VARCHAR(255) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS terms_url VARCHAR(255) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS source_url VARCHAR(255) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS health_status VARCHAR(64) DEFAULT 'AVAILABLE',
  ADD COLUMN IF NOT EXISTS last_verified TIMESTAMP NULL DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS env_key_name VARCHAR(64) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS request_schema TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS response_schema TEXT DEFAULT NULL;

-- Rollback instructions:
-- ALTER TABLE services
--   DROP COLUMN is_api_backed,
--   DROP COLUMN adapter_type,
--   DROP COLUMN auth_type,
--   DROP COLUMN pricing_model,
--   DROP COLUMN documentation_url,
--   DROP COLUMN terms_url,
--   DROP COLUMN source_url,
--   DROP COLUMN health_status,
--   DROP COLUMN last_verified,
--   DROP COLUMN env_key_name,
--   DROP COLUMN request_schema,
--   DROP COLUMN response_schema;
