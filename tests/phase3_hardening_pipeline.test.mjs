/**
 * ClimateSphere AI — Phase 3 Industrial Hardening & Data Pipeline Verification Test Suite
 * 
 * Verifies:
 *   1. SCADA Select-Before-Operate (SBO) Two-Step Control Lifecycle (Select -> Operate)
 *   2. Industrial Safety Interlocks (Physical Envelopes, Slew Rate, Environmental Constraints)
 *   3. SBO Cancellation, Dual-Control Verification, and Expiration Guards
 *   4. SCADA Status, Operating Envelope & Interlock Profiles Catalog
 *   5. Binary Columnar Parquet Serializer (PAR1 magic bytes, Schema, Snappy Codec)
 *   6. Statutory 10-Year Cold Storage Tiering & S3/Blob Partitioning Catalog
 *   7. PostgreSQL Continuous WAL Archiving & Point-In-Time Recovery (PITR) RPO/RTO Monitor
 *   8. Disaster Recovery Snapshots Catalog & Cryptographic Integrity Verification
 */

import assert from 'node:assert';
import test from 'node:test';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

// Direct service imports for unit verification
import scadaSboService from '../server/services/scada_sbo_service.js';
import { archivalService } from '../server/services/archival_service.js';
import { backupService } from '../server/services/backup_service.js';
import authService from '../server/services/auth_service.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

const GATEWAY_PORT = 8089;
const BASE_URL = `http://127.0.0.1:${GATEWAY_PORT}`;

let gatewayProcess = null;
let adminToken = '';
let engineerToken = '';

async function waitForServer(url, timeoutMs = 15000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(`${url}/health`);
      if (res.ok) return true;
    } catch (e) {
      // Server not ready yet
    }
    await new Promise(r => setTimeout(r, 300));
  }
  throw new Error(`Gateway at ${url} failed to start within ${timeoutMs}ms`);
}

test.before(async () => {
  let isRunning = false;
  try {
    const existing = await fetch(`${BASE_URL}/health`);
    isRunning = existing.ok;
  } catch (e) {}

  if (!isRunning) {
    gatewayProcess = spawn(process.execPath, [path.join(ROOT_DIR, 'server', 'edge_gateway.js')], {
      env: {
        ...process.env,
        PORT: String(GATEWAY_PORT),
        NODE_ENV: 'test',
        CORS_ORIGIN: '*'
      },
      stdio: 'ignore'
    });
    await waitForServer(BASE_URL);
  }

  // Obtain genuine JWTs from Edge Gateway
  const adminRes = await fetch(`${BASE_URL}/api/auth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'elena_vance', role: 'ADMIN' })
  });
  const adminData = await adminRes.json();
  adminToken = adminData.accessToken;

  const engRes = await fetch(`${BASE_URL}/api/auth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'marcus_thorne', role: 'ENGINEER' })
  });
  const engData = await engRes.json();
  engineerToken = engData.accessToken;
});

test.after(() => {
  if (gatewayProcess) {
    gatewayProcess.kill();
  }
});

// ── Test 1: SCADA SBO Lifecycle (Select -> Operate) ──────────────────────────
test('SCADA SBO: Full Select-Before-Operate Lifecycle with Dual-Control and Telecontrol Ack', async () => {
  // 1. SELECT command (Engineer selects 680 MW from current 650 MW, +30 MW ramp < 75 MW limit)
  const selectRes = await fetch(`${BASE_URL}/api/scada/sbo/select`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${engineerToken}`
    },
    body: JSON.stringify({
      facilityId: 'DU-03',
      commandType: 'SETPOINT_DISPATCH',
      targetValue: 680.0,
      reason: 'European Grid Primary Frequency Response Demand'
    })
  });
  assert.strictEqual(selectRes.status, 201);
  const selectData = await selectRes.json();
  assert.strictEqual(selectData.status, 'ARMED_READY');
  assert.ok(selectData.ticketId.startsWith('sbo_tkt_'));
  assert.strictEqual(selectData.timeoutSeconds, 30);
  assert.ok(selectData.challengeNonce);
  assert.strictEqual(selectData.targetValue, 680.0);

  // 2. OPERATE command (Admin approves / confirms execution)
  const operateRes = await fetch(`${BASE_URL}/api/scada/sbo/operate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${adminToken}`
    },
    body: JSON.stringify({
      ticketId: selectData.ticketId,
      challengeResponse: selectData.challengeNonce
    })
  });
  assert.strictEqual(operateRes.status, 200);
  const operateData = await operateRes.json();
  assert.strictEqual(operateData.status, 'COMMAND_EXECUTED');
  assert.ok(operateData.executionProof.startsWith('0x'));
  assert.ok(operateData.telecontrolConfirmation);
  assert.strictEqual(operateData.telecontrolConfirmation.dnp3ControlRelayBlock, 'PULSE_CLOSE_ACK');
  assert.strictEqual(operateData.telecontrolConfirmation.iec104AsduResponse, 'COT_ACTIVATION_CON (0x07)');
});

// ── Test 2: SCADA Safety Interlocks (Physical Envelope & Slew Rate) ──────────
test('SCADA Interlocks: Enforces physical limits and maximum slew rates', async () => {
  // 1. Value Exceeds Rated Plant Envelope (Target 1100 MW > 900 MW max)
  const envelopeRes = await fetch(`${BASE_URL}/api/scada/sbo/select`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${engineerToken}`
    },
    body: JSON.stringify({
      facilityId: 'DU-03',
      commandType: 'SETPOINT_DISPATCH',
      targetValue: 1100.0
    })
  });
  assert.strictEqual(envelopeRes.status, 422);
  const envData = await envelopeRes.json();
  assert.strictEqual(envData.status, 'INTERLOCK_REJECTED');
  assert.ok(envData.reason.includes('exceeds allowable envelope'));

  // 2. Slew Rate Violation (Delta 200 MW > 75 MW max step)
  const slewRes = await fetch(`${BASE_URL}/api/scada/sbo/select`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${engineerToken}`
    },
    body: JSON.stringify({
      facilityId: 'DU-03',
      commandType: 'SETPOINT_DISPATCH',
      targetValue: 880.0
    })
  });
  assert.strictEqual(slewRes.status, 422);
  const slewData = await slewRes.json();
  assert.strictEqual(slewData.status, 'INTERLOCK_REJECTED');
  assert.ok(slewData.reason.includes('exceeds maximum slew rate'));
});

// ── Test 3: SBO Cancellation & Conflict Guards ──────────────────────────────
test('SCADA SBO: Manual disarm cancellation and prevention of double-execution', async () => {
  // 1. Select command
  const selectRes = await fetch(`${BASE_URL}/api/scada/sbo/select`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${engineerToken}`
    },
    body: JSON.stringify({
      facilityId: 'DU-03',
      commandType: 'FGD_SLURRY_BOOST',
      targetValue: 410.0
    })
  });
  assert.strictEqual(selectRes.status, 201);
  const { ticketId } = await selectRes.json();

  // 2. Explicit Cancel
  const cancelRes = await fetch(`${BASE_URL}/api/scada/sbo/cancel`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${engineerToken}`
    },
    body: JSON.stringify({
      ticketId,
      reason: 'Shift supervisor aborted pump ramp'
    })
  });
  assert.strictEqual(cancelRes.status, 200);
  const cancelData = await cancelRes.json();
  assert.strictEqual(cancelData.status, 'CANCELLED');

  // 3. Attempt Operate on Cancelled Ticket (Must return 409 Conflict)
  const operateRes = await fetch(`${BASE_URL}/api/scada/sbo/operate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${adminToken}`
    },
    body: JSON.stringify({ ticketId })
  });
  assert.strictEqual(operateRes.status, 409);
  const operateData = await operateRes.json();
  assert.ok(operateData.error.includes('not armed'));
});

// ── Test 4: SCADA SBO Status & Interlock Catalog ────────────────────────────
test('SCADA SBO: GET /api/scada/sbo/status returns interlock profiles and telecontrol metrics', async () => {
  const res = await fetch(`${BASE_URL}/api/scada/sbo/status`);
  assert.strictEqual(res.status, 200);
  const data = await res.json();

  assert.ok(data.statutoryStandards.includes('IEC 60870-5-104'));
  assert.ok(data.statutoryStandards.includes('IEEE 1815 (DNP3)'));
  assert.strictEqual(data.sboTimeoutSeconds, 30);
  assert.ok(data.interlockProfiles.SETPOINT_DISPATCH);
  assert.ok(data.interlockProfiles.FGD_SLURRY_BOOST);
  assert.ok(data.interlockProfiles.SCR_AMMONIA_INJECTION);
  assert.ok(data.interlockProfiles.TURBINE_CURTAILMENT);
  assert.ok(data.interlockProfiles.EMERGENCY_BREAKER_TRIP);

  // Check plant operating envelope
  const envRes = await fetch(`${BASE_URL}/api/scada/sbo/envelope?facilityId=DU-03`);
  assert.strictEqual(envRes.status, 200);
  const envData = await envRes.json();
  assert.strictEqual(envData.facilityId, 'DU-03');
  assert.ok(envData.envelope.currentGrossMW > 0);
});

// ── Test 5: Binary Columnar Parquet Serializer & Inspector ───────────────────
test('Parquet Engine: Encodes and inspects columnar Parquet binary format', () => {
  const records = [
    { ts: 1776510000000, fid: 'DU-03', so2: 340.2, nox: 185.1, co: 44.0, o2: 5.9, flag: 'VALID' },
    { ts: 1776510060000, fid: 'DU-03', so2: 342.8, nox: 186.4, co: 43.8, o2: 6.0, flag: 'VALID' },
    { ts: 1776510120000, fid: 'DU-03', so2: 339.1, nox: 184.9, co: 44.2, o2: 5.8, flag: 'VALID' }
  ];

  // 1. Encode
  const parquetBuffer = archivalService.encodeParquetColumnar(records);
  assert.ok(Buffer.isBuffer(parquetBuffer));
  assert.ok(parquetBuffer.length > 50, 'Parquet buffer must contain header, data, and footer');

  // Verify Magic Bytes 'PAR1'
  assert.strictEqual(parquetBuffer.subarray(0, 4).toString('ascii'), 'PAR1', 'Must start with PAR1 magic bytes');
  assert.strictEqual(parquetBuffer.subarray(parquetBuffer.length - 4).toString('ascii'), 'PAR1', 'Must end with PAR1 magic bytes');

  // 2. Inspect
  const inspected = archivalService.decodeAndInspectParquet(parquetBuffer);
  assert.strictEqual(inspected.valid, true);
  assert.strictEqual(inspected.magic, 'PAR1');
  assert.strictEqual(inspected.recordCount, 3);
  assert.strictEqual(inspected.columnsCount, 7);
  assert.strictEqual(inspected.compressionCodec, 'SNAPPY');
  assert.ok(inspected.sha256.startsWith('0x'));

  // Corrupted buffer detection
  const corrupted = Buffer.from(parquetBuffer);
  corrupted[0] = 0x00;
  assert.throws(() => archivalService.decodeAndInspectParquet(corrupted), /Missing PAR1 magic byte/i);
});

// ── Test 6: Statutory Cold Storage Archival & Partition Catalog ──────────────
test('Cold Storage: Partitions telemetry and serves 10-year archival catalog', async () => {
  // 1. Trigger partition archival
  const trigRes = await fetch(`${BASE_URL}/api/admin/archival/trigger`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      partitionKey: '2025_Q3_COMPLIANCE_VAULT',
      records: [
        { ts: Date.now() - 100 * 86400 * 1000, fid: 'DU-03', so2: 315.0, nox: 188.0, co: 42.0, o2: 6.0, flag: 'VALID' }
      ]
    })
  });
  assert.strictEqual(trigRes.status, 200);
  const trigData = await trigRes.json();
  assert.strictEqual(trigData.status, 'ARCHIVED');
  assert.ok(trigData.archiveId.includes('2025_Q3_COMPLIANCE_VAULT'));
  assert.ok(trigData.objectPath.includes('facility_id=DU-03'));
  assert.ok(trigData.merkleSha256.startsWith('0x'));

  // 2. Fetch Catalog
  const catRes = await fetch(`${BASE_URL}/api/admin/archival/catalog?page=1&pageSize=10`);
  assert.strictEqual(catRes.status, 200);
  const catData = await catRes.json();
  assert.ok(Array.isArray(catData.archives));
  assert.ok(catData.totalArchives >= 1);
  assert.strictEqual(catData.tieringPolicy.coldTierYears, 10);

  // 3. Verify Archive Checksum
  const verRes = await fetch(`${BASE_URL}/api/admin/archival/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      archiveId: trigData.archiveId,
      hash: trigData.merkleSha256
    })
  });
  assert.strictEqual(verRes.status, 200);
  const verData = await verRes.json();
  assert.strictEqual(verData.verified, true);
  assert.strictEqual(verData.statutoryCompliant, true);
});

// ── Test 7: PostgreSQL WAL Archiving & PITR Health Monitor ───────────────────
test('WAL Archiving: GET /api/admin/backup/status reports RPO and RTO SLA compliance', async () => {
  const res = await fetch(`${BASE_URL}/api/admin/backup/status`);
  assert.strictEqual(res.status, 200);
  const data = await res.json();

  assert.strictEqual(data.status, 'WAL_STREAMING_HEALTHY');
  assert.strictEqual(data.archiveMode, true);
  assert.ok(data.currentWalLsn);
  assert.ok(data.lastArchivedWal);
  assert.ok(data.lastArchivedTime);

  // RPO metrics: Max 300s (5 minutes)
  assert.ok(data.rpo);
  assert.strictEqual(data.rpo.slaSeconds, 300);
  assert.strictEqual(data.rpo.status, 'COMPLIANT');

  // RTO metrics: Max 1800s (30 minutes)
  assert.ok(data.rto);
  assert.strictEqual(data.rto.slaSeconds, 1800);
  assert.strictEqual(data.rto.status, 'COMPLIANT');
});

// ── Test 8: Disaster Recovery Snapshots Catalog & Verification ───────────────
test('Disaster Recovery: Atomic snapshot creation and SHA-256 verification', async () => {
  // 1. Create Snapshot (Requires admin:keys:rotate / ADMIN role)
  const snapRes = await fetch(`${BASE_URL}/api/admin/backup/snapshot`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${adminToken}`
    },
    body: JSON.stringify({
      label: 'Automated Pre-Maintenance Base Snapshot'
    })
  });
  assert.strictEqual(snapRes.status, 201);
  const snapData = await snapRes.json();
  assert.strictEqual(snapData.status, 'SNAPSHOT_CREATED');
  assert.ok(snapData.backupId.startsWith('climatesphere_backup_'));
  assert.ok(snapData.sha256Checksum.startsWith('0x'));
  assert.ok(snapData.tablesIncluded.includes('cems_readings'));
  assert.ok(snapData.tablesIncluded.includes('audit_ledger'));

  // 2. Verify Snapshot
  const verifyRes = await fetch(`${BASE_URL}/api/admin/backup/verify`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${adminToken}`
    },
    body: JSON.stringify({
      backupId: snapData.backupId,
      checksum: snapData.sha256Checksum
    })
  });
  assert.strictEqual(verifyRes.status, 200);
  const verifyData = await verifyRes.json();
  assert.strictEqual(verifyData.verified, true);
  assert.strictEqual(verifyData.pitrConsistent, true);

  // 3. Inspect Snapshots Catalog
  const catRes = await fetch(`${BASE_URL}/api/admin/backup/snapshots`);
  assert.strictEqual(catRes.status, 200);
  const catData = await catRes.json();
  assert.ok(catData.totalSnapshots >= 2);
  assert.strictEqual(catData.retentionPolicyDays, 1095);
});
