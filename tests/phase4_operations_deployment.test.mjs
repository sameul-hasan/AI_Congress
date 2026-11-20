/**
 * ClimateSphere AI — Phase 4 Operations, UX & Full Deployment Verification Test Suite
 * 
 * Verifies:
 *   1. Frontend Admin Module UI Components & SBO DOM Structure (js/pages/admin.js)
 *   2. Columnar Parquet Cold Vault & WAL Archiving Monitor DOM Integration
 *   3. Containerized Deployment Manifests (docker-compose.yml, Dockerfile, nginx/nginx.conf)
 *   4. End-to-End Telecontrol & SBO Interlock Orchestration
 *   5. End-to-End CEMS Telemetry Ingestion -> Parquet Archival -> Merkle Proof Lifecycle
 *   6. Disaster Recovery Base Backup -> WAL Archiving -> Checksum Verification Lifecycle
 *   7. Full Microservice Health, Prometheus Metrics & OIDC Readiness
 */

import assert from 'node:assert';
import test from 'node:test';
import path from 'node:path';
import fs from 'node:fs';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

// Direct service imports
import authService from '../server/services/auth_service.js';
import scadaSboService from '../server/services/scada_sbo_service.js';
import { archivalService } from '../server/services/archival_service.js';
import { backupService } from '../server/services/backup_service.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

const GATEWAY_PORT = 8089;
const BASE_URL = `http://127.0.0.1:${GATEWAY_PORT}`;

let gatewayProcess = null;
let adminToken = '';

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

  const tokenRes = await fetch(`${BASE_URL}/api/auth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'elena_vance', role: 'ADMIN' })
  });
  const tokenData = await tokenRes.json();
  adminToken = tokenData.accessToken;
});

test.after(() => {
  if (gatewayProcess) {
    gatewayProcess.kill();
  }
});

// ── Test 1: Frontend Admin UI Module Structure ──────────────────────────────
test('UX Architecture: js/pages/admin.js exports render and contains SBO & Parquet/WAL components', () => {
  const adminJsPath = path.join(ROOT_DIR, 'js', 'pages', 'admin.js');
  assert.ok(fs.existsSync(adminJsPath), 'js/pages/admin.js must exist');

  const content = fs.readFileSync(adminJsPath, 'utf8');

  // Verify SBO Console DOM Elements
  assert.ok(content.includes('id="sboCommandSelect"'), 'Must contain SBO command selector');
  assert.ok(content.includes('id="sboTargetVal"'), 'Must contain SBO target setpoint input');
  assert.ok(content.includes('id="btnArmSboTicket"'), 'Must contain Arm SBO ticket button');
  assert.ok(content.includes('id="sboCountdownTimer"'), 'Must contain 30s countdown timer display');
  assert.ok(content.includes('id="btnExecuteSboTicket"'), 'Must contain Dual-Control Execute button');
  assert.ok(content.includes('id="btnCancelSboTicket"'), 'Must contain Disarm / Cancel button');

  // Verify Columnar Parquet Cold Vault DOM Elements
  assert.ok(content.includes('id="parquetPartitionsTable"'), 'Must contain Parquet partitions table');
  assert.ok(content.includes('id="btnTriggerArchivalNow"'), 'Must contain manual archival trigger button');
  assert.ok(content.includes('id="btnVerifyParquetRoot"'), 'Must contain Parquet Merkle verification button');

  // Verify Continuous WAL Disaster Recovery DOM Elements
  assert.ok(content.includes('id="walRpoStatus"'), 'Must contain RPO status badge');
  assert.ok(content.includes('id="walRtoStatus"'), 'Must contain RTO status badge');
  assert.ok(content.includes('id="walCurrentLsn"'), 'Must contain current WAL LSN indicator');
  assert.ok(content.includes('id="btnCreateBackupSnapshot"'), 'Must contain Base Snapshot creation button');
});

// ── Test 2: Containerized Deployment Manifests (Docker & Compose) ────────────
test('Deployment Manifests: docker-compose.yml and Dockerfile declare enterprise microservices', () => {
  const composePath = path.join(ROOT_DIR, 'docker-compose.yml');
  assert.ok(fs.existsSync(composePath));
  const composeContent = fs.readFileSync(composePath, 'utf8');

  // Verify services
  assert.ok(composeContent.includes('edge-gateway:'));
  assert.ok(composeContent.includes('timescaledb:'));
  assert.ok(composeContent.includes('pgbouncer:'));
  assert.ok(composeContent.includes('valkey:'));
  assert.ok(composeContent.includes('frontend:'));

  // Verify healthchecks and networks
  assert.ok(composeContent.includes('climatesphere-net'));
  assert.ok(composeContent.includes('http://localhost:8089/health'));

  // Verify Dockerfile
  const dockerfilePath = path.join(ROOT_DIR, 'Dockerfile');
  assert.ok(fs.existsSync(dockerfilePath));
  const dockerfileContent = fs.readFileSync(dockerfilePath, 'utf8');
  assert.ok(dockerfileContent.includes('FROM node:'));
  assert.ok(dockerfileContent.includes('EXPOSE 8089'));
  assert.ok(dockerfileContent.includes('CMD ["node", "server/edge_gateway.js"]'));
});

// ── Test 3: Production Nginx Reverse Proxy Configuration ────────────────────
test('Reverse Proxy: nginx/nginx.conf defines security headers and OIDC / WebSocket proxy routes', () => {
  const nginxPath = path.join(ROOT_DIR, 'nginx', 'nginx.conf');
  assert.ok(fs.existsSync(nginxPath));
  const nginxContent = fs.readFileSync(nginxPath, 'utf8');

  assert.ok(nginxContent.includes('location /api/'));
  assert.ok(nginxContent.includes('location /ws'));
  assert.ok(nginxContent.includes('location /events'));
  assert.ok(nginxContent.includes('location /.well-known/'));
  assert.ok(nginxContent.includes('proxy_pass http://edge_backend'));
  assert.ok(nginxContent.includes('X-Content-Type-Options "nosniff"'));
});

// ── Test 4: End-to-End SCADA SBO Orchestration ──────────────────────────────
test('E2E Telecontrol: Arming, interlock validation, and execution of generator setpoint', async () => {
  // 1. Arm SBO Ticket
  const selectRes = await fetch(`${BASE_URL}/api/scada/sbo/select`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${adminToken}`
    },
    body: JSON.stringify({
      facilityId: 'DU-03',
      commandType: 'FGD_SLURRY_BOOST',
      targetValue: 420.0,
      reason: 'E2E Automated Interlock Test'
    })
  });
  assert.strictEqual(selectRes.status, 201);
  const selectData = await selectRes.json();
  assert.strictEqual(selectData.status, 'ARMED_READY');
  assert.strictEqual(selectData.targetValue, 420.0);

  // 2. Execute SBO Ticket
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
  assert.ok(operateData.executionProof);
  assert.strictEqual(operateData.telecontrolConfirmation.dnp3ControlRelayBlock, 'PULSE_CLOSE_ACK');
});

// ── Test 5: End-to-End Telemetry Ingestion -> Cold Parquet Archival ─────────
test('E2E Data Pipeline: Ingesting telemetry and archiving to Cold Columnar Parquet Vault', async () => {
  // 1. Ingest fresh CEMS packet
  const ingestRes = await fetch(`${BASE_URL}/api/telemetry/ingest`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${adminToken}`
    },
    body: JSON.stringify({
      facilityId: 'DU-03',
      so2: 325.0,
      nox: 180.0,
      o2: 6.0
    })
  });
  assert.strictEqual(ingestRes.status, 201);

  // 2. Trigger Cold Storage Archival
  const archRes = await fetch(`${BASE_URL}/api/admin/archival/trigger`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      partitionKey: `E2E_PARTITION_${Date.now()}`
    })
  });
  assert.strictEqual(archRes.status, 200);
  const archData = await archRes.json();
  assert.strictEqual(archData.status, 'ARCHIVED');
  assert.ok(archData.objectPath.startsWith('s3://'));

  // 3. Verify Parquet partition proof
  const verRes = await fetch(`${BASE_URL}/api/admin/archival/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      archiveId: archData.archiveId,
      hash: archData.merkleSha256
    })
  });
  assert.strictEqual(verRes.status, 200);
  const verData = await verRes.json();
  assert.strictEqual(verData.verified, true);
  assert.strictEqual(verData.statutoryCompliant, true);
});

// ── Test 6: End-to-End WAL Archiving & Snapshot Creation ────────────────────
test('E2E Disaster Recovery: Creating base snapshot and verifying LSN point-in-time recovery', async () => {
  // 1. Create Base Snapshot
  const snapRes = await fetch(`${BASE_URL}/api/admin/backup/snapshot`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${adminToken}`
    },
    body: JSON.stringify({
      label: 'Phase 4 Verification Base Snapshot'
    })
  });
  assert.strictEqual(snapRes.status, 201);
  const snapData = await snapRes.json();
  assert.strictEqual(snapData.status, 'SNAPSHOT_CREATED');
  assert.ok(snapData.backupId);
  assert.ok(snapData.sha256Checksum);

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
});

// ── Test 7: Production Metrics & Observability Readiness ─────────────────────
test('Observability: Prometheus /metrics and OpenTelemetry /api/observability/traces return healthy telemetry', async () => {
  // 1. Prometheus Metrics
  const metricsRes = await fetch(`${BASE_URL}/metrics`);
  assert.strictEqual(metricsRes.status, 200);
  const metricsText = await metricsRes.text();
  assert.ok(metricsText.includes('climatesphere_telemetry_packets_total'));
  assert.ok(metricsText.includes('climatesphere_elv_exceedance_events_total'));

  // 2. OpenTelemetry Traces
  const tracesRes = await fetch(`${BASE_URL}/api/observability/traces?format=otlp`);
  assert.strictEqual(tracesRes.status, 200);
  const tracesData = await tracesRes.json();
  assert.ok(tracesData.resourceSpans || tracesData.spansCount !== undefined);
});

// ── Test 8: Four-Phase Full Architectural Integration Audit ──────────────────
test('Architectural Integrity: All 4 phases operational concurrently', async () => {
  // Phase 1: Decarbonization scenarios
  const p1Res = await fetch(`${BASE_URL}/api/scenarios`);
  assert.strictEqual(p1Res.status, 200);

  // Phase 2: OIDC Discovery & JWKS
  const p2Oidc = await fetch(`${BASE_URL}/.well-known/openid-configuration`);
  assert.strictEqual(p2Oidc.status, 200);
  const p2Jwks = await fetch(`${BASE_URL}/.well-known/jwks.json`);
  assert.strictEqual(p2Jwks.status, 200);

  // Phase 3: SCADA SBO status & WAL Archiving
  const p3Sbo = await fetch(`${BASE_URL}/api/scada/sbo/status`);
  assert.strictEqual(p3Sbo.status, 200);
  const p3Wal = await fetch(`${BASE_URL}/api/admin/backup/status`);
  assert.strictEqual(p3Wal.status, 200);

  // Phase 4: Archival catalog & Disaster Recovery
  const p4Cat = await fetch(`${BASE_URL}/api/admin/archival/catalog`);
  assert.strictEqual(p4Cat.status, 200);
  const p4Snaps = await fetch(`${BASE_URL}/api/admin/backup/snapshots`);
  assert.strictEqual(p4Snaps.status, 200);
});
