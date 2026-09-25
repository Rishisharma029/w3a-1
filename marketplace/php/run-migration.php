<?php
require_once __DIR__ . '/db.php';
$pdo = getDbConnection();

echo "[MIGRATION] Checking columns in 'services' table...\n";
$stmt = $pdo->query("SHOW COLUMNS FROM services");
$existingColumns = array_column($stmt->fetchAll(PDO::FETCH_ASSOC), 'Field');

$columnsToAdd = [
    'is_api_backed' => "TINYINT(1) NOT NULL DEFAULT 0",
    'adapter_type' => "VARCHAR(64) DEFAULT NULL",
    'auth_type' => "VARCHAR(64) DEFAULT 'NONE'",
    'pricing_model' => "VARCHAR(64) DEFAULT 'PER_REQUEST'",
    'documentation_url' => "VARCHAR(255) DEFAULT NULL",
    'terms_url' => "VARCHAR(255) DEFAULT NULL",
    'source_url' => "VARCHAR(255) DEFAULT NULL",
    'health_status' => "VARCHAR(64) DEFAULT 'AVAILABLE'",
    'last_verified' => "TIMESTAMP NULL DEFAULT NULL",
    'env_key_name' => "VARCHAR(64) DEFAULT NULL",
    'request_schema' => "TEXT DEFAULT NULL",
    'response_schema' => "TEXT DEFAULT NULL",
];

foreach ($columnsToAdd as $colName => $colDef) {
    if (!in_array($colName, $existingColumns)) {
        echo "  Adding column $colName...\n";
        $pdo->exec("ALTER TABLE services ADD COLUMN `$colName` $colDef");
    } else {
        echo "  Column $colName already exists.\n";
    }
}

echo "[MIGRATION] All columns verified!\n";
