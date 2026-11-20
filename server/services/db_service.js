/**
 * ClimateSphere AI — Enterprise Database Service
 * PostgreSQL / TimescaleDB Client with PgBouncer Pooling, Reconnect Circuit Breaker,
 * and Reversible Industrial Migrations.
 */

const fs = require('fs');
const path = require('path');

let pgPool = null;
let pgAvailable = false;
let dbReconnectTimer = null;
let dbReconnectBackoffMs = 5000;

const DB_MIGRATIONS = [
  {
    version: '2026_01_init_hypertables',
    up: `CREATE INDEX IF NOT EXISTS idx_cems_readings_seq ON cems_readings (seq_no);`,
    down: `DROP INDEX IF EXISTS idx_cems_readings_seq;`
  },
  {
    version: '2026_02_fieldbus_audit_index',
    up: `CREATE INDEX IF NOT EXISTS idx_audit_ledger_merkle ON audit_ledger (merkle_hash);`,
    down: `DROP INDEX IF EXISTS idx_audit_ledger_merkle;`
  },
  {
    version: '2026_03_hypertable_retention',
    up: `CREATE INDEX IF NOT EXISTS idx_telemetry_facility_time ON cems_readings (facility_id, time DESC);`,
    down: `DROP INDEX IF EXISTS idx_telemetry_facility_time;`
  },
  {
    version: '2026_04_decarbonization_scenarios',
    up: `CREATE TABLE IF NOT EXISTS decarbonization_scenarios (
      id VARCHAR(64) PRIMARY KEY,
      tenant_id VARCHAR(64) DEFAULT 'tenant-eu-energy',
      facility_id VARCHAR(32) DEFAULT 'DU-03',
      name VARCHAR(255) NOT NULL,
      description TEXT,
      target_year INT NOT NULL DEFAULT 2030,
      coal_reduction NUMERIC(5, 2) NOT NULL DEFAULT 25.0,
      renewable_mix NUMERIC(5, 2) NOT NULL DEFAULT 40.0,
      fgd_efficiency NUMERIC(5, 2) NOT NULL DEFAULT 92.0,
      production_volume NUMERIC(5, 2) NOT NULL DEFAULT 85.0,
      carbon_price NUMERIC(8, 2) NOT NULL DEFAULT 62.0,
      projected_emissions NUMERIC(10, 2),
      emissions_reduction_pct NUMERIC(5, 2),
      credit_saving_m_eur NUMERIC(10, 2),
      investment_capex_k_eur NUMERIC(10, 2),
      projected_roi_pct NUMERIC(6, 2),
      parameters_json JSONB,
      created_by VARCHAR(128) DEFAULT 'operator@climatesphere.internal',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_scenarios_tenant ON decarbonization_scenarios (tenant_id, created_at DESC);`,
    down: `DROP TABLE IF EXISTS decarbonization_scenarios;`
  },
  {
    version: '2026_05_enable_tenant_row_level_security',
    up: `
      ALTER TABLE IF EXISTS cems_readings ENABLE ROW LEVEL SECURITY;
      ALTER TABLE IF EXISTS audit_ledger ENABLE ROW LEVEL SECURITY;
      ALTER TABLE IF EXISTS decarbonization_scenarios ENABLE ROW LEVEL SECURITY;
      ALTER TABLE IF EXISTS regulatory_permits ENABLE ROW LEVEL SECURITY;
      ALTER TABLE IF EXISTS qal3_calibrations ENABLE ROW LEVEL SECURITY;

      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'cems_readings' AND policyname = 'tenant_isolation_cems_readings') THEN
          CREATE POLICY tenant_isolation_cems_readings ON cems_readings
            USING (tenant_id = current_setting('app.current_tenant', true) OR current_setting('app.current_tenant', true) IS NULL OR current_setting('app.current_tenant', true) = '' OR current_setting('app.current_tenant', true) = 'system-admin' OR tenant_id IS NULL);
        END IF;

        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'audit_ledger' AND policyname = 'tenant_isolation_audit_ledger') THEN
          CREATE POLICY tenant_isolation_audit_ledger ON audit_ledger
            USING (tenant_id = current_setting('app.current_tenant', true) OR current_setting('app.current_tenant', true) IS NULL OR current_setting('app.current_tenant', true) = '' OR current_setting('app.current_tenant', true) = 'system-admin' OR tenant_id IS NULL);
        END IF;

        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'decarbonization_scenarios' AND policyname = 'tenant_isolation_scenarios') THEN
          CREATE POLICY tenant_isolation_scenarios ON decarbonization_scenarios
            USING (tenant_id = current_setting('app.current_tenant', true) OR current_setting('app.current_tenant', true) IS NULL OR current_setting('app.current_tenant', true) = '' OR current_setting('app.current_tenant', true) = 'system-admin' OR tenant_id IS NULL);
        END IF;
      END $$;
    `,
    down: `
      DROP POLICY IF EXISTS tenant_isolation_cems_readings ON cems_readings;
      DROP POLICY IF EXISTS tenant_isolation_audit_ledger ON audit_ledger;
      DROP POLICY IF EXISTS tenant_isolation_scenarios ON decarbonization_scenarios;
      ALTER TABLE IF EXISTS cems_readings DISABLE ROW LEVEL SECURITY;
      ALTER TABLE IF EXISTS audit_ledger DISABLE ROW LEVEL SECURITY;
      ALTER TABLE IF EXISTS decarbonization_scenarios DISABLE ROW LEVEL SECURITY;
    `
  },
  {
    version: '2026_06_high_performance_composite_indexes',
    up: `
      CREATE INDEX IF NOT EXISTS idx_alerts_facility_time ON alerts (facility_id, created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_alerts_tenant_status ON alerts (tenant_id, status);
      CREATE INDEX IF NOT EXISTS idx_incidents_facility_time ON incidents (facility_id, created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_statutory_audit_facility_time ON statutory_audit_logs (facility_id, timestamp DESC);
      CREATE INDEX IF NOT EXISTS idx_audit_ledger_facility_time ON audit_ledger (facility_id, time DESC);
      CREATE INDEX IF NOT EXISTS idx_audit_ledger_tenant_time ON audit_ledger (tenant_id, time DESC);
      CREATE INDEX IF NOT EXISTS idx_qal3_facility_time ON qal3_calibrations (facility_id, time DESC);
      CREATE INDEX IF NOT EXISTS idx_permits_facility_status ON regulatory_permits (facility_id, status);
      CREATE INDEX IF NOT EXISTS idx_units_plant_id ON units (plant_id);
      CREATE INDEX IF NOT EXISTS idx_equipment_unit_id ON equipment (unit_id);
      CREATE INDEX IF NOT EXISTS idx_analyzers_equipment_id ON cems_analyzers (equipment_id);
    `,
    down: `
      DROP INDEX IF EXISTS idx_alerts_facility_time;
      DROP INDEX IF EXISTS idx_alerts_tenant_status;
      DROP INDEX IF EXISTS idx_incidents_facility_time;
      DROP INDEX IF EXISTS idx_statutory_audit_facility_time;
      DROP INDEX IF EXISTS idx_audit_ledger_facility_time;
      DROP INDEX IF EXISTS idx_audit_ledger_tenant_time;
      DROP INDEX IF EXISTS idx_qal3_facility_time;
      DROP INDEX IF EXISTS idx_permits_facility_status;
      DROP INDEX IF EXISTS idx_units_plant_id;
      DROP INDEX IF EXISTS idx_equipment_unit_id;
      DROP INDEX IF EXISTS idx_analyzers_equipment_id;
    `
  }
];

function tryConnectPg() {
  if (pgAvailable && pgPool) return;
  try {
    const { Pool } = require('pg');
    const dbUrl = process.env.DATABASE_POOL_URL || process.env.DATABASE_URL;
    if (!dbUrl) {
      pgAvailable = false;
      return;
    }
    if (!pgPool) {
      pgPool = new Pool({
        connectionString: dbUrl,
        connectionTimeoutMillis: 5000,
        idleTimeoutMillis: 30000,
        max: parseInt(process.env.DB_POOL_MAX || '50', 10),
      });
      pgPool.on('error', (poolErr) => {
        console.warn('[DB Pool Idle Client Error]', poolErr.message);
        pgAvailable = false;
      });
    }
    pgPool.query('SELECT 1').then(() => {
      pgAvailable = true;
      dbReconnectBackoffMs = 5000;
      console.log('[DB Service] TimescaleDB/PgBouncer pool connected successfully (max clients: 50)');
      runDatabaseMigrations().catch(() => {});
    }).catch(err => {
      pgAvailable = false;
      dbReconnectBackoffMs = Math.min(30000, dbReconnectBackoffMs * 1.5);
    });
  } catch (e) {
    pgAvailable = false;
  }
}

// Background health check & circuit breaker
if (!dbReconnectTimer) {
  dbReconnectTimer = setInterval(() => {
    if (!pgPool) {
      tryConnectPg();
      return;
    }
    pgPool.query('SELECT 1').then(() => {
      pgAvailable = true;
    }).catch(() => {
      pgAvailable = false;
    });
  }, 15000);
  if (dbReconnectTimer.unref) dbReconnectTimer.unref();
}

async function runDatabaseMigrations() {
  if (!pgAvailable || !pgPool) return { applied: [], notice: 'Database unavailable' };
  try {
    // Check if base tables exist; if missing, bootstrap from init_db.sql
    try {
      const tableCheck = await pgPool.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' AND table_name = 'cems_readings'
        );
      `);
      if (tableCheck.rows && tableCheck.rows[0] && !tableCheck.rows[0].exists) {
        const initSqlPath = path.join(__dirname, '..', 'init_db.sql');
        if (fs.existsSync(initSqlPath)) {
          console.log('[DB Bootstrap] Auto-provisioning core schema & TimescaleDB hypertables from init_db.sql...');
          const initSql = fs.readFileSync(initSqlPath, 'utf8');
          await pgPool.query(initSql);
          console.log('[DB Bootstrap] Core schema & hypertables provisioned successfully.');
        }
      }
    } catch (bootstrapErr) {
      console.warn('[DB Bootstrap Notice]', bootstrapErr.message);
    }

    await pgPool.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version VARCHAR(64) PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
    const applied = await pgPool.query('SELECT version FROM schema_migrations');
    const appliedSet = new Set(applied.rows.map(r => r.version));
    const newlyApplied = [];

    for (const mig of DB_MIGRATIONS) {
      if (!appliedSet.has(mig.version)) {
        await pgPool.query(mig.up);
        await pgPool.query('INSERT INTO schema_migrations (version) VALUES ($1)', [mig.version]);
        newlyApplied.push(mig.version);
        console.log(`[DB Migration] Applied migration: ${mig.version}`);
      }
    }
    return { applied: newlyApplied, status: 'MIGRATIONS_UP_TO_DATE' };
  } catch (err) {
    if (err.code !== '42P01') console.warn('[DB Migration] Notice:', err.message);
    return { error: err.message };
  }
}

async function rollbackDatabaseMigration(targetVersion = null) {
  if (!pgAvailable || !pgPool) return { success: false, error: 'Database unavailable' };
  const client = await pgPool.connect();
  try {
    await client.query('BEGIN');
    const applied = await client.query('SELECT version FROM schema_migrations ORDER BY applied_at DESC');
    const rolledBack = [];

    for (const row of applied.rows) {
      const v = row.version;
      if (targetVersion && v <= targetVersion) break;
      const mig = DB_MIGRATIONS.find(m => m.version === v);
      if (mig && mig.down) {
        await client.query(mig.down);
      }
      await client.query('DELETE FROM schema_migrations WHERE version = $1', [v]);
      rolledBack.push(v);
      console.log(`[DB Migration] Rolled back migration: ${v}`);
      if (targetVersion && v === targetVersion) break;
    }
    await client.query('COMMIT');
    return { success: true, rolledBack };
  } catch (err) {
    await client.query('ROLLBACK');
    return { success: false, error: err.message };
  } finally {
    client.release();
  }
}

async function getMigrationStatus() {
  if (!pgAvailable || !pgPool) {
    return {
      status: 'DATABASE_OFFLINE',
      pgAvailable: false,
      availableMigrations: DB_MIGRATIONS.map(m => m.version),
      appliedMigrations: []
    };
  }
  try {
    await pgPool.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version VARCHAR(64) PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
    const res = await pgPool.query('SELECT version, applied_at FROM schema_migrations ORDER BY applied_at ASC');
    const appliedList = res.rows.map(r => r.version);
    return {
      status: 'MIGRATIONS_SYNCHRONIZED',
      pgAvailable: true,
      availableMigrations: DB_MIGRATIONS.map(m => m.version),
      appliedMigrations: appliedList,
      pendingMigrations: DB_MIGRATIONS.filter(m => !appliedList.includes(m.version)).map(m => m.version)
    };
  } catch (e) {
    return { status: 'ERROR', error: e.message, pgAvailable: false };
  }
}

async function query(text, params = []) {
  if (!pgAvailable || !pgPool) {
    throw new Error('TimescaleDB connection unavailable');
  }
  return pgPool.query(text, params);
}

/**
 * Execute queries within an isolated PostgreSQL Row-Level Security tenant session
 */
async function withTenantContext(tenantId, callback) {
  if (!pgAvailable || !pgPool) {
    // Fallback: run callback without connection
    return callback(null);
  }
  const client = await pgPool.connect();
  try {
    await client.query('BEGIN');
    if (tenantId) {
      await client.query('SET LOCAL app.current_tenant = $1', [tenantId]);
    }
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

// Initial connection attempt
tryConnectPg();

module.exports = {
  DB_MIGRATIONS,
  getPgPool: () => pgPool,
  isPgAvailable: () => pgAvailable,
  setPgPool: (pool, available = true) => { pgPool = pool; pgAvailable = available; },
  tryConnectPg,
  runDatabaseMigrations,
  rollbackDatabaseMigration,
  getMigrationStatus,
  query,
  withTenantContext
};
