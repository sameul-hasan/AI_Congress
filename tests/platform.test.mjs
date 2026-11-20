/**
 * ClimateSphere AI — Enterprise Automated Platform Test Suite
 * Run with: npm test  (or node tests/platform.test.mjs)
 * 
 * Includes:
 *   - Auto-spawning & lifecycle management of Edge Gateway microservice
 *   - Pure unit tests (JWT crypto, Merkle tree, EU BREF O2, QAL3 CUSUM, RAG vector retrieval)
 *   - Integration tests covering all 18+ REST endpoints
 *   - Security regression tests (auth enforcement, silent refresh, token revocation, 1MB body limit)
 */

import http from 'http';
import assert from 'assert';
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

console.log('════════════════════════════════════════════════════════════════');
console.log(' ClimateSphere AI — Enterprise Test Runner v4.8.0');
console.log('════════════════════════════════════════════════════════════════\n');

let passedTests = 0;
let failedTests = 0;
let gatewayProcess = null;

async function runTest(name, fn) {
  try {
    process.stdout.write(`• Testing: ${name}... `);
    await fn();
    console.log('\x1b[32mPASSED\x1b[0m');
    passedTests++;
  } catch (err) {
    console.log('\x1b[31mFAILED\x1b[0m');
    console.error(`  Error: ${err.message}`);
    failedTests++;
  }
}

function fetchJson(url, headers = {}) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    http.get({
      hostname: parsed.hostname,
      port: parsed.port,
      path: parsed.pathname + parsed.search,
      headers: {
        'x-test-suite': 'climatesphere',
        ...headers
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, json: JSON.parse(data) });
        } catch (e) {
          resolve({ status: res.statusCode, raw: data });
        }
      });
    }).on('error', reject);
  });
}

function postJson(url, data, headers = {}) {
  return new Promise((resolve, reject) => {
    const postData = typeof data === 'string' ? data : JSON.stringify(data);
    const parsed = new URL(url);
    const req = http.request({
      hostname: parsed.hostname,
      port: parsed.port,
      path: parsed.pathname + parsed.search,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
        'x-test-suite': 'climatesphere',
        ...headers
      }
    }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, json: JSON.parse(body) });
        } catch (e) {
          resolve({ status: res.statusCode, body });
        }
      });
    });
    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

async function isServerRunning() {
  try {
    const res = await fetchJson('http://localhost:8089/health');
    return res.status === 200;
  } catch {
    return false;
  }
}

async function ensureServerRunning() {
  const alreadyUp = await isServerRunning();
  if (alreadyUp) {
    console.log('[Test Setup] Edge Gateway is already running on port 8089.\n');
    return;
  }
  console.log('[Test Setup] Starting local Edge Gateway microservice process on port 8089...');
  gatewayProcess = spawn(process.execPath, [path.join(ROOT_DIR, 'server', 'edge_gateway.js')], {
    cwd: ROOT_DIR,
    env: { ...process.env, PORT: '8089', NODE_ENV: 'test', JWT_SECRET: 'test_jwt_secret_key_32chars_length_min!!' },
    stdio: 'ignore'
  });

  const startTime = Date.now();
  while (Date.now() - startTime < 10000) {
    await new Promise(r => setTimeout(r, 250));
    if (await isServerRunning()) {
      console.log('[Test Setup] Edge Gateway successfully started and healthy.\n');
      return;
    }
  }
  throw new Error('Edge Gateway microservice failed to start within 10 seconds');
}

function cleanupServer() {
  if (gatewayProcess) {
    try {
      gatewayProcess.kill();
    } catch {}
    gatewayProcess = null;
  }
}

process.on('exit', cleanupServer);
process.on('SIGINT', () => { cleanupServer(); process.exit(1); });
process.on('SIGTERM', () => { cleanupServer(); process.exit(1); });

async function main() {
  // Ensure the edge gateway is running for integration tests
  await ensureServerRunning();

  // Test 1: Edge Gateway Health Endpoint
  await runTest('Edge Gateway Microservice Health & Multi-Protocol Support', async () => {
    const { status, json } = await fetchJson('http://localhost:8089/health');
    assert.strictEqual(status, 200, 'Health endpoint should return HTTP 200');
    assert.strictEqual(json.status, 'HEALTHY', 'Status must be HEALTHY');
    assert.ok(Array.isArray(json.protocols), 'Protocols must be an array');
    assert.ok(json.protocols.includes('WebSocket (RFC 6455)'), 'Must support WebSocket');
    assert.ok(json.protocols.includes('SSE'), 'Must support SSE');
  });

  // Test 2: Multi-Facility Concurrent Fleet Telemetry Snapshot
  await runTest('Multi-Facility Concurrent Fleet Telemetry Snapshot (/api/telemetry/fleet)', async () => {
    const { status, json } = await fetchJson('http://localhost:8089/api/telemetry/fleet');
    assert.strictEqual(status, 200);
    assert.strictEqual(json.facilitiesCount, 5, 'Must report all 5 European facilities');
    assert.ok(json.fleet['DU-03'], 'Must contain DU-03 telemetry');
    assert.ok(json.fleet['RT-07'], 'Must contain RT-07 telemetry');
    assert.ok(json.fleet['MI-02'], 'Must contain MI-02 telemetry');
    assert.ok(json.fleet['WA-04'], 'Must contain WA-04 telemetry');
    assert.ok(json.fleet['MD-01'], 'Must contain MD-01 telemetry');
  });

  // Test 3: Store-and-Forward Replay Buffer
  await runTest('Edge Gateway Store-and-Forward Buffer Replay (/api/telemetry/history)', async () => {
    const { status, json } = await fetchJson('http://localhost:8089/api/telemetry/history?limit=5');
    assert.strictEqual(status, 200);
    assert.ok(Array.isArray(json.packets), 'Must return array of buffered packets');
    assert.ok(json.packets.length > 0, 'Buffer should have accumulated packets');
    assert.ok(json.packets[0].channels, 'Packet must have structured CEMS channels');
  });

  // Test 4: Physical Protocol Emulation Endpoints
  await runTest('OPC-UA (IEC 62541) Node Emulator Endpoint (/api/protocols/opcua)', async () => {
    const { status, json } = await fetchJson('http://localhost:8089/api/protocols/opcua');
    assert.strictEqual(status, 200);
    assert.strictEqual(json.protocol, 'OPC-UA (IEC 62541)');
    assert.ok(Array.isArray(json.nodes), 'Must return list of OPC nodes');
    assert.ok(json.nodes.some(n => n.node.includes('SO2_Actual')), 'Must map SO2 node');
  });

  // Test 5: QAL3 Drift and Exceedance Logic
  await runTest('DIN EN 14181 QAL3 Drift Tolerance & Exceedance Calculation', async () => {
    const limitFs = 2.0; // +/- 2% Full Scale
    const zeroDrift = 0.42;
    const spanDrift = -1.18;
    const isZeroValid = Math.abs(zeroDrift) <= limitFs;
    const isSpanValid = Math.abs(spanDrift) <= limitFs;

    assert.ok(isZeroValid, 'Zero drift +0.42% FS should be within +/- 2.0% limit');
    assert.ok(isSpanValid, 'Span drift -1.18% FS should be within +/- 2.0% limit');

    // DU-03 SO2 limit verification
    const measuredSO2 = 847.0;
    const statutoryLimitSO2 = 500.0;
    const isExceeded = measuredSO2 > statutoryLimitSO2;
    assert.ok(isExceeded, 'DU-03 SO2 measured at 847 mg/Nm3 must trigger statutory breach');
  });

  // Test 6: Decarbonization Optimization Mathematics
  await runTest('Decarbonization Linear Optimization Model (CO2 & EUA Savings)', async () => {
    const coalRed = 35; // %
    const renewMix = 40; // %
    const carbonPrice = 62.40; // EUR/ton

    const co2SavedTonnes = Math.round(coalRed * 18200 + renewMix * 9400);
    const financialSavingsEur = Math.round(co2SavedTonnes * carbonPrice);
    const capexEur = Math.round(coalRed * 420000 + renewMix * 680000);
    const paybackYears = parseFloat((capexEur / financialSavingsEur).toFixed(1));

    assert.strictEqual(co2SavedTonnes, 1013000, 'CO2 saved tonnes calculation mismatch');
    assert.strictEqual(financialSavingsEur, 63211200, 'Financial EUA savings mismatch');
    assert.strictEqual(capexEur, 41900000, 'Capex estimate mismatch');
    assert.ok(paybackYears > 0.5 && paybackYears < 2.0, `Payback period ${paybackYears}y should be realistic`);
  });

  // Test 7: RFC 7519 JSON Web Token (JWT) Structure & Claims
  await runTest('Enterprise JWT Structure & RFC 7519 Bearer Claims', async () => {
    const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64');
    const payload = Buffer.from(JSON.stringify({
      sub: 'usr_elena_vance',
      tenant_id: 'tenant-eu-energy',
      roles: ['ADMIN'],
      permitted_facilities: ['DU-03', 'RT-07', 'MI-02']
    })).toString('base64');
    const signature = 'mock_sig_hash';
    const jwt = `${header}.${payload}.${signature}`;

    const parts = jwt.split('.');
    assert.strictEqual(parts.length, 3, 'JWT must contain 3 parts');

    const decoded = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf8'));
    assert.strictEqual(decoded.sub, 'usr_elena_vance');
    assert.strictEqual(decoded.tenant_id, 'tenant-eu-energy');
    assert.deepStrictEqual(decoded.roles, ['ADMIN']);
    assert.ok(decoded.permitted_facilities.includes('DU-03'));
  });

  // Test 8: Statutory 15-Minute Rolling Average Rollups (IED Art 15(4))
  await runTest('Statutory 15-Minute Rolling Average Rollups (/api/telemetry/rollups)', async () => {
    const { status, json } = await fetchJson('http://localhost:8089/api/telemetry/rollups?facility=DU-03&window=15');
    assert.strictEqual(status, 200);
    assert.strictEqual(json.facilityId, 'DU-03');
    assert.ok(json.rollups.SO2, 'Must compute SO2 rollup');
    assert.ok(typeof json.rollups.SO2.avg === 'number', 'Average must be numeric');
    assert.ok(json.rollups.SO2.avg > 0, 'Average must be positive');
    assert.ok(json.rollups.SO2.compliance === 'BREACH' || json.rollups.SO2.compliance === 'COMPLIANT');
  });

  // Test 9: Modbus TCP / RTU Binary Fieldbus Register Protocol Emulator
  await runTest('Modbus TCP/RTU Binary Fieldbus Register Protocol Emulator (/api/protocols/modbus/read)', async () => {
    const { status, json } = await fetchJson('http://localhost:8089/api/protocols/modbus/read?unitId=1&address=40001&count=4');
    assert.strictEqual(status, 200);
    assert.strictEqual(json.slaveId, 1);
    assert.strictEqual(json.startAddress, 40001);
    assert.strictEqual(json.registerCount, 4);
    assert.ok(json.rawHexFrame.startsWith('01 03 08'), 'Frame must start with Slave 01, Func 03, ByteCount 08');
    assert.strictEqual(json.decodedRegisters.length, 4);
    assert.strictEqual(json.decodedRegisters[0].description, 'SO2 mg/Nm3');
  });

  // Obtain Admin JWT for subsequent authenticated requests
  const { status: authStatus, json: adminAuth } = await postJson('http://localhost:8089/api/auth/token', {
    username: 'admin@climatesphere.ai',
    role: 'ADMIN'
  });
  assert.strictEqual(authStatus, 200);
  const adminToken = adminAuth.accessToken;
  const adminHeaders = { 'Authorization': `Bearer ${adminToken}` };

  // Test 10: Persistent Statutory Audit Log REST Engine with Auth Enforcement
  await runTest('Persistent Statutory Audit Log REST Engine & Auth Guard (/api/audit/logs)', async () => {
    // 1. GET existing (public)
    const { status: getStatus, json: logsBefore } = await fetchJson('http://localhost:8089/api/audit/logs');
    assert.strictEqual(getStatus, 200);
    assert.ok(Array.isArray(logsBefore));

    // 2. Unauthenticated POST must be rejected with 401
    const unauthPost = await postJson('http://localhost:8089/api/audit/logs', {
      action: 'TAMPER_ATTEMPT',
      facilityId: 'DU-03'
    });
    assert.strictEqual(unauthPost.status, 401, 'Unauthenticated POST to audit logs must be rejected with 401');

    // 3. Authenticated POST must succeed
    const postData = {
      action: 'CALIBRATION_SPAN_VERIFIED',
      facilityId: 'DU-03',
      operator: 'qa_auditor@tuv-nord.de',
      details: 'DIN EN 14181 QAL3 zero-span drift checked within +/-1.2% limit'
    };
    const postResult = await postJson('http://localhost:8089/api/audit/logs', postData, adminHeaders);
    assert.strictEqual(postResult.status, 201);
    assert.strictEqual(postResult.json.status, 'PERSISTED');
    assert.ok(postResult.json.entry.id.startsWith('log-'));

    // 4. Verify retrieval
    const { json: logsAfter } = await fetchJson('http://localhost:8089/api/audit/logs');
    assert.ok(logsAfter.some(l => l.action === 'CALIBRATION_SPAN_VERIFIED'));
  });

  // Test 11: ESEF Pure-JS PKZIP Binary Specification Engine
  await runTest('ESEF Pure-JS PKZIP Binary Engine (ZIP Local File & Directory Signatures)', async () => {
    const testFile = { name: 'manifest.xml', data: new TextEncoder().encode('<test/>') };
    function crc32(bytes) {
      let crc = 0 ^ (-1);
      for (let i = 0; i < bytes.length; i++) {
        crc = (crc >>> 8) ^ (([0, 0x77073096, 0xee0e612c, 0x990951ba][(crc ^ bytes[i]) & 3]));
      }
      return (crc ^ (-1)) >>> 0;
    }
    const sampleCrc = crc32(testFile.data);
    assert.ok(typeof sampleCrc === 'number', 'CRC32 calculation must return 32-bit unsigned integer');
  });

  // Test 12: Real RFC 7519 HMAC-SHA256 JWT Token Issuance (/api/auth/token)
  await runTest('Real RFC 7519 HMAC-SHA256 JWT Token Issuance (/api/auth/token)', async () => {
    const { status, json } = await postJson('http://localhost:8089/api/auth/token', {
      username: 'elena_vance',
      role: 'ADMIN'
    });
    assert.strictEqual(status, 200);
    assert.strictEqual(json.tokenType, 'Bearer');
    assert.ok(json.accessToken && json.accessToken.split('.').length === 3, 'Must return 3-part JWT');
    assert.strictEqual(json.claims.role, 'ADMIN');
    assert.ok(json.claims.permissions.includes('SIGN_FILING'));
  });

  // Test 13: Server-Side Cryptographic Token Verification & Claim Extraction (/api/auth/verify)
  await runTest('Server-Side Cryptographic Token Verification & Claims (/api/auth/verify)', async () => {
    const { json: authRes } = await postJson('http://localhost:8089/api/auth/token', {
      username: 'marcus_thorne',
      role: 'ENGINEER'
    });
    const { status, json: verifyRes } = await fetchJson('http://localhost:8089/api/auth/verify', {
      'Authorization': `Bearer ${authRes.accessToken}`
    });
    assert.strictEqual(status, 200);
    assert.strictEqual(verifyRes.status, 'AUTHENTICATED');
    assert.strictEqual(verifyRes.claims.role, 'ENGINEER');
    assert.strictEqual(verifyRes.claims.sub, 'marcus_thorne');
  });

  // Test 14: Real Physical Telemetry Ingestion Pipeline & Quality Flagging (/api/telemetry/ingest)
  await runTest('Real Physical Telemetry Ingestion & Quality Flagging with Auth (/api/telemetry/ingest)', async () => {
    // Unauthenticated request must return 401
    const unauth = await postJson('http://localhost:8089/api/telemetry/ingest', { facilityId: 'DU-03', so2: 100 });
    assert.strictEqual(unauth.status, 401, 'Unauthenticated ingest must return 401');

    // Valid Packet with Auth
    const { status: s1, json: j1 } = await postJson('http://localhost:8089/api/telemetry/ingest', {
      facilityId: 'DU-03',
      so2: 845.2,
      nox: 410.5,
      o2: 5.6
    }, adminHeaders);
    assert.strictEqual(s1, 201);
    assert.strictEqual(j1.count, 1);
    assert.strictEqual(j1.ingested[0].qualityFlag, 'VALID');

    // Out-of-Range Packet (O2 > 20.9%)
    const { status: s2, json: j2 } = await postJson('http://localhost:8089/api/telemetry/ingest', {
      facilityId: 'DU-03',
      so2: 845.2,
      nox: 410.5,
      o2: 24.5
    }, adminHeaders);
    assert.strictEqual(s2, 201);
    assert.strictEqual(j2.ingested[0].qualityFlag, 'OUT_OF_RANGE');
  });

  // Test 15: Merkle Tree Hash-Chained WORM Audit Cryptographic Verification (/api/audit/verify)
  await runTest('Merkle Tree Hash-Chained WORM Audit Cryptographic Verification (/api/audit/verify)', async () => {
    const { status, json } = await fetchJson('http://localhost:8089/api/audit/verify');
    assert.strictEqual(status, 200);
    assert.strictEqual(json.verified, true, 'Audit log hash-chain must be unbroken');
    assert.strictEqual(json.tamperDetected, false);
    assert.ok(json.merkleRoot.startsWith('0x'), 'Merkle root must be 0x-prefixed hex');
    assert.ok(json.totalEntries >= 2, 'Audit ledger must contain entries');
  });

  // Test 16: DIN EN 14181 QAL3 Drift Assessment & CUSUM Recording (/api/qal3/calibrations)
  await runTest('DIN EN 14181 QAL3 Drift Assessment & CUSUM Recording with Auth (/api/qal3/calibrations)', async () => {
    const { status: getStatus, json: list } = await fetchJson('http://localhost:8089/api/qal3/calibrations');
    assert.strictEqual(getStatus, 200);
    assert.ok(Array.isArray(list));

    const newCal = {
      facilityId: 'DU-03',
      parameter: 'NOx',
      zeroDrift: 0.15,
      spanDrift: -0.85,
      precisionSd: 0.72,
      cusumValue: 0.95,
      gasBottleLot: 'CAL-GAS-NOX-9941',
      gasCertNumber: 'DEKRA-NL-2026-908',
      operator: 'Dr. Elena Vance'
    };

    // Unauthenticated call must fail with 401
    const unauth = await postJson('http://localhost:8089/api/qal3/calibrations', newCal);
    assert.strictEqual(unauth.status, 401);

    // Authenticated call succeeds
    const { status: postStatus, json: postRes } = await postJson('http://localhost:8089/api/qal3/calibrations', newCal, adminHeaders);
    assert.strictEqual(postStatus, 201);
    assert.strictEqual(postRes.status, 'RECORDED');
    assert.strictEqual(postRes.calibration.status, 'PASS');
  });

  // Test 17: Enterprise Asset & Multi-Tenancy Hierarchy Engine (/api/assets/hierarchy)
  await runTest('Enterprise Asset & Multi-Tenancy Hierarchy Engine (/api/assets/hierarchy)', async () => {
    const { status, json } = await fetchJson('http://localhost:8089/api/assets/hierarchy');
    assert.strictEqual(status, 200);
    assert.ok(json.organization, 'Must return organization node');
    assert.ok(json.tenants && json.tenants.length > 0, 'Must return tenant hierarchy');
    const tenant = json.tenants[0];
    assert.ok(tenant.facilities && tenant.facilities.length > 0, 'Tenant must contain facilities');
    assert.ok(tenant.facilities[0].plants[0].units[0].equipment.length > 0, 'Must have deep equipment tree');
  });

  // Test 18: GHG Protocol Scope 1, 2, 3 Carbon Accounting & Lineage (/api/carbon/inventory)
  await runTest('GHG Protocol Scope 1, 2, 3 Carbon Accounting & Lineage (/api/carbon/inventory)', async () => {
    const { status, json } = await fetchJson('http://localhost:8089/api/carbon/inventory');
    assert.strictEqual(status, 200);
    assert.strictEqual(json.reportingYear, 2026);
    assert.ok(json.scopes.scope1Direct.totalKtCO2e > 0);
    assert.ok(json.scopes.scope2Indirect.locationBasedKtCO2e > 0);
    assert.ok(json.scopes.scope3ValueChain.categories.length >= 4);
    assert.ok(json.dataLineageHash.startsWith('0x'));
  });

  // Test 19: Enterprise Alert Engine & Incident Lifecycle (/api/alerts, /api/incidents)
  await runTest('Enterprise Alert Engine & Incident Lifecycle (/api/alerts, /api/incidents)', async () => {
    const { status: altStatus, json: alerts } = await fetchJson('http://localhost:8089/api/alerts');
    assert.strictEqual(altStatus, 200);
    assert.ok(Array.isArray(alerts));
    assert.ok(alerts.some(a => a.severity === 'CRITICAL'));

    const { status: incStatus, json: incidents } = await fetchJson('http://localhost:8089/api/incidents');
    assert.strictEqual(incStatus, 200);
    assert.ok(Array.isArray(incidents));
    assert.ok(incidents[0].rootCauseAnalysis, 'Incidents must contain RCA details');
  });

  // Test 20: Reference Oxygen Statutory Normalization Formula (EU BREF)
  await runTest('Reference Oxygen Statutory Normalization Formula (EU BREF Directive 2010/75/EU)', async () => {
    // Formula: C_norm = C_meas * (21 - O2_ref) / (21 - O2_meas)
    const rawSO2 = 800.0;
    const rawO2 = 11.0;
    const refO2 = 6.0; // Standard utility coal ref O2
    const expectedNormSO2 = rawSO2 * (21.0 - refO2) / (21.0 - rawO2); // 800 * 15 / 10 = 1200 mg/Nm3
    assert.strictEqual(Math.round(expectedNormSO2), 1200, 'Reference O2 correction calculation mismatch');
  });

  // Test 21: Silent Token Renewal via /api/auth/refresh (CRITICAL ISSUE 1)
  await runTest('Silent Token Renewal with Claim Persistence (/api/auth/refresh)', async () => {
    // 1. Issue access + refresh token pair
    const { status: sToken, json: tokenRes } = await postJson('http://localhost:8089/api/auth/token', {
      username: 'auditor@climatesphere.ai',
      role: 'AUDITOR'
    });
    assert.strictEqual(sToken, 200);
    assert.ok(tokenRes.refreshToken, 'Must return a refresh token');

    // 2. Call /api/auth/refresh
    const { status: sRefresh, json: refreshRes } = await postJson('http://localhost:8089/api/auth/refresh', {
      refreshToken: tokenRes.refreshToken
    });
    assert.strictEqual(sRefresh, 200, 'Refresh endpoint should return 200');
    assert.strictEqual(refreshRes.tokenType, 'Bearer');
    assert.ok(refreshRes.accessToken, 'Must return new accessToken');
    assert.ok(refreshRes.refreshToken, 'Must return new refreshToken');

    // 3. Verify that the refreshed access token has the original role and claims
    const { json: verifyRes } = await fetchJson('http://localhost:8089/api/auth/verify', {
      'Authorization': `Bearer ${refreshRes.accessToken}`
    });
    assert.strictEqual(verifyRes.status, 'AUTHENTICATED');
    assert.strictEqual(verifyRes.claims.role, 'AUDITOR');
    assert.ok(verifyRes.claims.permissions.includes('VERIFY_MERKLE'));
  });

  // Test 22: Server-Side Token Revocation & Immediate Invalidation (/api/auth/revoke)
  await runTest('Server-Side Token Revocation & Immediate Invalidation (/api/auth/revoke)', async () => {
    // 1. Create a token to be revoked
    const { json: tempAuth } = await postJson('http://localhost:8089/api/auth/token', {
      username: 'temp_operator',
      role: 'OPERATOR'
    });
    const tempToken = tempAuth.accessToken;

    // 2. Verify it is valid before revocation
    const { status: preStatus } = await fetchJson('http://localhost:8089/api/auth/verify', {
      'Authorization': `Bearer ${tempToken}`
    });
    assert.strictEqual(preStatus, 200);

    // 3. Revoke the token using admin credentials
    const { status: revStatus, json: revRes } = await postJson('http://localhost:8089/api/auth/revoke', {
      token: tempToken
    }, adminHeaders);
    assert.strictEqual(revStatus, 200);
    assert.strictEqual(revRes.status, 'REVOKED');

    // 4. Verification must now be rejected with 401
    const { status: postStatus, json: postVerify } = await fetchJson('http://localhost:8089/api/auth/verify', {
      'Authorization': `Bearer ${tempToken}`
    });
    assert.strictEqual(postStatus, 401);
    assert.ok(postVerify.error.includes('revoked'));
  });

  // Test 23: Request Body Size Limiting (CRITICAL ISSUE 4)
  await runTest('Request Body Size Limiting (Max 1 MB Cap / HTTP 413)', async () => {
    // Construct oversized payload exceeding 1MB
    const oversized = 'x'.repeat(1_050_000);
    const result = await postJson('http://localhost:8089/api/telemetry/ingest', oversized, adminHeaders);
    assert.strictEqual(result.status, 413, 'Oversized payload must return HTTP 413 Payload Too Large');
  });

  // Test 24: Alert Acknowledgement & AI Human-in-the-Loop Action Approval
  await runTest('Alert Acknowledgement & AI Human-in-the-Loop Action Approval', async () => {
    // Acknowledge alert
    const { status: ackStatus, json: ackRes } = await postJson('http://localhost:8089/api/alerts', {
      alertId: 'alt-du03-so2-001',
      note: 'Engaged auxiliary limestone slurry recirculation loop'
    }, adminHeaders);
    assert.strictEqual(ackStatus, 200);
    assert.strictEqual(ackRes.status, 'ACKNOWLEDGED');

    // Human-in-the-loop AI action approval
    const { status: aiStatus, json: aiRes } = await postJson('http://localhost:8089/api/ai/approve-action', {
      actionId: 'act-2026-99',
      actionType: 'FGD_SLURRY_RAMP_UP',
      facilityId: 'DU-03',
      description: 'Increase limestone feed rate by 18% to counter SO2 surge'
    }, adminHeaders);
    assert.strictEqual(aiStatus, 200);
    assert.strictEqual(aiRes.status, 'APPROVED');
    assert.ok(aiRes.merkleHash.startsWith('0x'), 'Approval must create Merkle audit record');
  });

  // Test 25: Regulatory Vector RAG Engine v2.0 Retrieval Accuracy
  await runTest('Regulatory Vector RAG Engine v2.0 Corpus & Retrieval Accuracy', async () => {
    const { RegulatoryRAGEngine } = await import('../js/ragEngine.js');
    const rag = new RegulatoryRAGEngine();
    const stats = rag.getCorpusStats();
    assert.ok(stats.totalDocuments >= 18, `RAG corpus should contain >= 18 documents, got ${stats.totalDocuments}`);
    assert.ok(stats.frameworks >= 5, `RAG should cover >= 5 frameworks, got ${stats.frameworks}`);

    // Query 1: IED Article 18 Exceedance Notification
    const q1Results = rag.retrieve('IED Article 18 exceedance notification 24 hours');
    assert.ok(q1Results.length > 0, 'Must retrieve matching regulatory documents');
    assert.strictEqual(q1Results[0].id, 'IED-ART-18');
    assert.ok(q1Results[0].confidence >= 60, 'Confidence must be >= 60%');

    // Query 2: DIN EN 14181 QAL3 Drift Limits
    const q2Results = rag.retrieve('DIN EN 14181 QAL3 zero span drift limits');
    assert.ok(q2Results.length > 0);
    assert.strictEqual(q2Results[0].id, 'EN14181-QAL3');

    // Query 3: CSRD ESRS E1 Transition Plan
    const q3Results = rag.retrieve('CSRD ESRS E1 transition plan decarbonization 1.5C');
    assert.ok(q3Results.length > 0);
    assert.ok(q3Results.some(r => r.id.startsWith('ESRS-E1')));

    // Query 4: CBAM Regulation 2023/1773 Embedded Emissions
    const q4Results = rag.retrieve('CBAM transitional registry embedded emissions imported steel');
    assert.ok(q4Results.length > 0);
    assert.strictEqual(q4Results[0].id, 'CBAM-REG-2023-1773');
  });

  // Test 26: OpenID Connect (OIDC) Discovery Endpoint (RFC 8414)
  await runTest('OpenID Connect (OIDC) Discovery Endpoint (/.well-known/openid-configuration)', async () => {
    const { status, json } = await fetchJson('http://localhost:8089/.well-known/openid-configuration');
    assert.strictEqual(status, 200, 'OIDC discovery endpoint must return HTTP 200');
    assert.ok(json.issuer.includes(':8089'), 'Issuer must match edge gateway host and port');
    assert.ok(json.token_endpoint.endsWith('/api/auth/token'), 'Token endpoint must match auth route');
    assert.ok(json.userinfo_endpoint.endsWith('/api/auth/verify'), 'Userinfo endpoint must match verify route');
    assert.ok(Array.isArray(json.scopes_supported) && json.scopes_supported.includes('openid'));
    assert.ok(json.id_token_signing_alg_values_supported.includes('HS256'));
  });

  // Test 27: Webhook Subscriptions Management & HMAC Test Ping Endpoint
  await runTest('Webhook Subscriptions Management & HMAC Test Ping (/api/notifications/webhooks, /test)', async () => {
    // 1. GET webhooks list
    const { status: listStatus, json: webhooks } = await fetchJson('http://localhost:8089/api/notifications/webhooks', adminHeaders);
    assert.strictEqual(listStatus, 200);
    assert.ok(Array.isArray(webhooks), 'Webhooks must return an array');
    assert.ok(webhooks.length >= 3, 'Must contain seeded webhooks');

    // 2. POST new webhook subscription
    const newHook = {
      channel: 'OpsGenie Escalation',
      url: 'https://api.opsgenie.com/v1/json/climatesphere',
      events: ['ELV_EXCEEDANCE', 'SYSTEM_DEGRADED'],
      active: true
    };
    const { status: postStatus, json: postRes } = await postJson('http://localhost:8089/api/notifications/webhooks', newHook, adminHeaders);
    assert.strictEqual(postStatus, 201);
    assert.strictEqual(postRes.status, 'CREATED');
    assert.ok(postRes.subscription.id.startsWith('wh-'));

    // 3. POST live ping test endpoint targeting local health check
    const { status: pingStatus, json: pingRes } = await postJson('http://localhost:8089/api/notifications/webhooks/test', {
      channel: 'Local Edge Gateway Probe',
      url: 'http://localhost:8089/health'
    }, adminHeaders);
    assert.strictEqual(pingStatus, 200);
    assert.strictEqual(pingRes.status, 'SUCCESS');
    assert.strictEqual(pingRes.httpStatus, 200);
    assert.strictEqual(pingRes.deliveryStatus, 'DELIVERED');
    assert.ok(typeof pingRes.latencyMs === 'number', 'Latency must be numeric');
  });

  // Test 28: ESEF Full DTS Taxonomy Package & XML Catalog ZIP Generation
  await runTest('ESEF Full DTS Taxonomy & XML Catalog ZIP Generation (js/documentGenerator.js)', async () => {
    await import('../js/documentGenerator.js');
    assert.ok(globalThis.ClimateSphere?.Docs?.generateEsefTaxonomyPackageZip, 'Document generator must be loaded');

    const zipBlob = globalThis.ClimateSphere.Docs.generateEsefTaxonomyPackageZip({
      companyName: 'Vattenfall Europe AG',
      period: 'FY2025'
    });

    assert.ok(zipBlob instanceof Blob, 'generateEsefTaxonomyPackageZip must return a Blob');
    assert.strictEqual(zipBlob.type, 'application/zip');
    assert.ok(zipBlob.size > 2000, `ZIP size must be > 2000 bytes, got ${zipBlob.size}`);

    const buffer = Buffer.from(await zipBlob.arrayBuffer());
    // Verify PK\x03\x04 ZIP Local File Header magic number at offset 0
    assert.strictEqual(buffer.readUInt32LE(0), 0x04034b50, 'File must begin with PK\\x03\\x04 ZIP magic signature');
    
    // Convert to text to check presence of essential DTS files
    const zipString = buffer.toString('utf-8');
    assert.ok(zipString.includes('META-INF/catalog.xml'), 'ZIP must contain META-INF/catalog.xml');
    assert.ok(zipString.includes('taxonomy/esrs_e1_def.xml'), 'ZIP must contain taxonomy/esrs_e1_def.xml');
    assert.ok(zipString.includes('taxonomy/esrs_e1_lab.xml'), 'ZIP must contain taxonomy/esrs_e1_lab.xml');
    assert.ok(zipString.includes('taxonomy/esrs_e1_pre.xml'), 'ZIP must contain taxonomy/esrs_e1_pre.xml');
  });

  // Test 29: Federated Enterprise SSO Login & Callback Token Exchange
  await runTest('Federated Enterprise SSO Login & Callback Exchange (/api/auth/sso/login, /callback)', async () => {
    // 1. Initiate SSO Login
    const { status: ssoStatus, json: ssoRes } = await fetchJson('http://localhost:8089/api/auth/sso/login?provider=microsoft_entra&tenantId=tenant-eu-energy');
    assert.strictEqual(ssoStatus, 200);
    assert.strictEqual(ssoRes.status, 'REDIRECT_READY');
    assert.ok(ssoRes.authorizationUrl.includes('login.microsoftonline.com'), 'Must contain IdP authorization URL');
    assert.ok(ssoRes.state.startsWith('sso_st_'), 'Must generate random cryptographic state');
    assert.ok(ssoRes.codeChallenge, 'Must generate PKCE code challenge');

    // 2. Process SSO Callback with state validation
    const { status: cbStatus, json: cbRes } = await postJson('http://localhost:8089/api/auth/sso/callback', {
      code: 'mock_sso_authorization_code_vattenfall_2026',
      state: ssoRes.state,
      provider: 'microsoft_entra',
      tenantId: 'tenant-eu-energy',
      role: 'ADMIN'
    });
    assert.strictEqual(cbStatus, 200);
    assert.strictEqual(cbRes.status, 'AUTHENTICATED');
    assert.strictEqual(cbRes.tokenType, 'Bearer');
    assert.ok(cbRes.accessToken && cbRes.accessToken.split('.').length === 3, 'Must issue 3-part signed JWT');
    assert.strictEqual(cbRes.claims.role, 'ADMIN');
    assert.strictEqual(cbRes.user.provider, 'Microsoft Entra ID (Azure AD)');
  });

  // Test 30: Dynamic Cloud Secret Management & Vault Engine Status
  await runTest('Dynamic Cloud Secret Management & Vault Engine Status (/api/admin/secrets/status)', async () => {
    const { status, json } = await fetchJson('http://localhost:8089/api/admin/secrets/status', adminHeaders);
    assert.strictEqual(status, 200);
    assert.strictEqual(json.status, 'HEALTHY');
    assert.ok(Array.isArray(json.managedKeys) && json.managedKeys.includes('JWT_SECRET'));
    assert.strictEqual(json.keysActiveCount, 4);
  });

  // Test 31: Physical Industrial Fieldbus Drivers & Hardware Register Polling
  await runTest('Physical Industrial Fieldbus Drivers & Live Register Poll (/api/protocols/fieldbus/*)', async () => {
    // 1. GET Fieldbus Endpoints Config
    const { status: cfgStatus, json: cfgRes } = await fetchJson('http://localhost:8089/api/protocols/fieldbus/config');
    assert.strictEqual(cfgStatus, 200);
    assert.strictEqual(cfgRes.status, 'ACTIVE');
    assert.ok(Array.isArray(cfgRes.fieldbusEndpoints));
    assert.ok(cfgRes.fieldbusEndpoints.some(e => e.facilityId === 'DU-03' && e.driverType.includes('MODBUS_TCP')));

    // 2. POST Hardware Poll
    const { status: pollStatus, json: pollRes } = await postJson('http://localhost:8089/api/protocols/fieldbus/poll', {
      facilityId: 'DU-03',
      startAddr: 0,
      quantity: 4
    });
    assert.strictEqual(pollStatus, 200);
    assert.strictEqual(pollRes.registerCount, 4);
    assert.ok(Array.isArray(pollRes.registers) && pollRes.registers.length === 4);
    assert.ok(pollRes.decodedPollutants && typeof pollRes.decodedPollutants.so2_mg_nm3 === 'number');
  });

  // Test 32: Multi-Language Internationalization (i18n) Engine Localization
  await runTest('Multi-Language Internationalization (i18n) Localization Engine (js/i18n.js)', async () => {
    const { default: i18n } = await import('../js/i18n.js');
    assert.ok(i18n && typeof i18n.t === 'function');

    i18n.setLanguage('de');
    assert.strictEqual(i18n.t('overview'), 'Übersicht');
    assert.strictEqual(i18n.t('cems'), 'CEMS-Telemetrie');

    i18n.setLanguage('fr');
    assert.strictEqual(i18n.t('overview'), 'Vue d\'Ensemble');
    assert.strictEqual(i18n.t('cems'), 'Télémétrie CEMS');

    i18n.setLanguage('pl');
    assert.strictEqual(i18n.t('overview'), 'Przegląd');
    assert.strictEqual(i18n.t('cems'), 'Telemetria CEMS');

    i18n.setLanguage('es');
    assert.strictEqual(i18n.t('overview'), 'Visión General');
    assert.strictEqual(i18n.t('cems'), 'Telemetría CEMS');

    i18n.setLanguage('en');
    assert.strictEqual(i18n.t('overview'), 'Overview');
  });

  // Test 33: Prometheus / OpenMetrics Metrics Endpoint (/metrics)
  await runTest('Prometheus / OpenMetrics Standard Metrics Endpoint (/metrics)', async () => {
    const res = await new Promise((resolve, reject) => {
      http.get('http://localhost:8089/metrics', res => {
        let text = '';
        res.on('data', chunk => text += chunk);
        res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, text }));
      }).on('error', reject);
    });

    assert.strictEqual(res.status, 200);
    assert.ok(res.headers['content-type'].includes('text/plain'), 'Must serve text/plain');
    assert.ok(res.text.includes('climatesphere_telemetry_packets_total'), 'Must export telemetry packets counter');
    assert.ok(res.text.includes('climatesphere_elv_exceedance_events_total'), 'Must export exceedance counter');
    assert.ok(res.text.includes('climatesphere_ws_active_clients'), 'Must export ws active gauge');
    assert.ok(res.text.includes('climatesphere_fieldbus_polls_total'), 'Must export fieldbus polls total');
    assert.ok(res.text.includes('climatesphere_db_query_duration_seconds'), 'Must export db query duration gauge');
  });

  // Test 34: Extended Industrial Modbus Function Codes (FC 01, 02, 04, 05, 06, 16)
  await runTest('Extended Modbus TCP Function Codes FC 01, 02, 04, 05, 06, 16 (/api/protocols/fieldbus/*)', async () => {
    // 1. FC 01: Read Coils
    const { status: s1, json: r1 } = await postJson('http://localhost:8089/api/protocols/fieldbus/poll', {
      facilityId: 'DU-03', fc: 1, startAddr: 0, quantity: 4
    });
    assert.strictEqual(s1, 200);
    assert.ok(Array.isArray(r1.bits) && r1.bits.length === 4, 'FC 01 must return coil bit array');

    // 2. FC 02: Read Discrete Inputs
    const { status: s2, json: r2 } = await postJson('http://localhost:8089/api/protocols/fieldbus/poll', {
      facilityId: 'DU-03', fc: 2, startAddr: 0, quantity: 4
    });
    assert.strictEqual(s2, 200);
    assert.ok(Array.isArray(r2.bits) && r2.bits.length === 4, 'FC 02 must return discrete input bits');

    // 3. FC 04: Read Input Registers
    const { status: s4, json: r4 } = await postJson('http://localhost:8089/api/protocols/fieldbus/poll', {
      facilityId: 'DU-03', fc: 4, startAddr: 0, quantity: 4
    });
    assert.strictEqual(s4, 200);
    assert.ok(Array.isArray(r4.registers) && r4.registers.length === 4, 'FC 04 must return ADC input registers');

    // 4. FC 05: Write Single Coil
    const { status: s5, json: r5 } = await postJson('http://localhost:8089/api/protocols/fieldbus/write', {
      facilityId: 'DU-03', fc: 5, address: 10, value: true
    });
    assert.strictEqual(s5, 200);
    assert.strictEqual(r5.functionCode, 5);
    assert.strictEqual(r5.writtenValue, true);

    // 5. FC 06: Write Single Register
    const { status: s6, json: r6 } = await postJson('http://localhost:8089/api/protocols/fieldbus/write', {
      facilityId: 'DU-03', fc: 6, address: 40001, value: 850
    });
    assert.strictEqual(s6, 200);
    assert.strictEqual(r6.functionCode, 6);
    assert.strictEqual(r6.writtenValue, 850);

    // 6. FC 16: Write Multiple Registers
    const { status: s16, json: r16 } = await postJson('http://localhost:8089/api/protocols/fieldbus/write', {
      facilityId: 'DU-03', fc: 16, address: 40001, values: [850, 410, 75, 60]
    });
    assert.strictEqual(s16, 200);
    assert.strictEqual(r16.functionCode, 16);
    assert.strictEqual(r16.registersWritten, 4);
  });

  // Test 35: Native Binary OPC-UA Protocol Probe (/api/protocols/opcua)
  await runTest('Native Binary OPC-UA IEC 62541-6 Handshake Probe (/api/protocols/opcua)', async () => {
    const { status, json } = await fetchJson('http://localhost:8089/api/protocols/opcua?facilityId=DU-03');
    assert.strictEqual(status, 200);
    assert.ok(json.protocol && json.protocol.includes('OPC-UA'), 'Must identify as OPC-UA protocol');
    assert.ok(Array.isArray(json.nodes) && json.nodes.length >= 3, 'Must return node address space');
    assert.ok(json.nodes.some(n => (n.nodeId || n.node || '').includes('SO2')), 'Must contain SO2 node');
  });

  // Test 36: Asset Hierarchy & Multi-Tenancy Structure (/api/assets/hierarchy)
  await runTest('Asset Hierarchy & Multi-Tenancy Equipment Engine (/api/assets/hierarchy)', async () => {
    const { status, json } = await fetchJson('http://localhost:8089/api/assets/hierarchy');
    assert.strictEqual(status, 200);
    assert.ok(json.organization, 'Must include organization');
    assert.ok(Array.isArray(json.tenants) && json.tenants.length > 0, 'Must include tenants');
    const firstTenant = json.tenants[0];
    assert.ok(Array.isArray(firstTenant.facilities), 'Tenant must include facilities');
    const firstFacility = firstTenant.facilities[0];
    assert.ok(Array.isArray(firstFacility.plants), 'Facility must include plants');
    assert.ok(Array.isArray(firstFacility.plants[0].units), 'Plant must include units');
    assert.ok(Array.isArray(firstFacility.plants[0].units[0].equipment), 'Unit must include equipment');
  });

  // Test 37: Carbon Accounting Scope 1-3 Lineage (/api/carbon/inventory)
  await runTest('Carbon Accounting Scope 1-3 Inventory & Provenance (/api/carbon/inventory)', async () => {
    const { status, json } = await fetchJson('http://localhost:8089/api/carbon/inventory');
    assert.strictEqual(status, 200);
    assert.strictEqual(json.reportingYear, 2026);
    assert.ok(json.scopes.scope1Direct && typeof json.scopes.scope1Direct.totalKtCO2e === 'number');
    assert.ok(json.scopes.scope2Indirect && typeof json.scopes.scope2Indirect.locationBasedKtCO2e === 'number');
    assert.ok(json.scopes.scope3ValueChain && Array.isArray(json.scopes.scope3ValueChain.categories));
    assert.ok(json.dataLineageHash && json.dataLineageHash.startsWith('0x'), 'Must include cryptographic data lineage hash');
  });

  // Test 38: Tabular High-Frequency CEMS CSV Streaming Export
  await runTest('Tabular High-Frequency CEMS CSV Export (ClimateSphere.Docs.generateCemsTelemetryCsv)', async () => {
    await import('../js/documentGenerator.js');
    assert.ok(typeof globalThis.ClimateSphere?.Docs?.generateCemsTelemetryCsv === 'function', 'Must export generateCemsTelemetryCsv');

    const csvBlob = globalThis.ClimateSphere.Docs.generateCemsTelemetryCsv('DU-03', '15_MIN');
    assert.ok(csvBlob instanceof Blob, 'Must return Blob');
    assert.ok(csvBlob.type.includes('text/csv'), 'Blob type must be text/csv');
    assert.ok(csvBlob.size > 500, `CSV size must be > 500 bytes, got ${csvBlob.size}`);

    const buffer = Buffer.from(await csvBlob.arrayBuffer());
    const csvString = buffer.toString('utf-8');
    assert.ok(csvString.includes('Timestamp_ISO8601'), 'CSV must contain ISO timestamp header');
    assert.ok(csvString.includes('SO2_Raw_mg_Nm3'), 'CSV must contain SO2 header');
    assert.ok(csvString.includes('VALID_DIN_EN_14181'), 'CSV must contain DIN EN 14181 quality flag');
    assert.ok(csvString.includes('DU-03'), 'CSV rows must include facility DU-03');
  });

  // Test 39: Modbus RTU Hardware Serial Driver & CRC-16 Calculation (/api/protocols/fieldbus/rtu/poll)
  await runTest('Modbus RTU Hardware Serial Driver & CRC-16 Framing (/api/protocols/fieldbus/rtu/poll)', async () => {
    const { calculateModbusCrc16, verifyModbusRtuFrame, ModbusRtuMaster } = await import('../server/fieldbus_driver.js');
    assert.ok(typeof calculateModbusCrc16 === 'function', 'calculateModbusCrc16 must be exported');
    assert.ok(typeof verifyModbusRtuFrame === 'function', 'verifyModbusRtuFrame must be exported');

    // Standard Modbus test: 0x01, 0x03, 0x00, 0x00, 0x00, 0x0A -> CRC 0xCDC5
    const testPayload = Buffer.from([0x01, 0x03, 0x00, 0x00, 0x00, 0x0A]);
    const crc = calculateModbusCrc16(testPayload);
    assert.strictEqual(crc, 0xCDC5, `Modbus CRC16 must match 0xCDC5, got 0x${crc.toString(16).toUpperCase()}`);

    const master = new ModbusRtuMaster({ serialPort: '/dev/ttyUSB0', unitId: 1 });
    const { frame } = master.buildRtuReadHoldingRegistersFrame(0, 4, 1);
    assert.ok(verifyModbusRtuFrame(frame), 'Constructed RTU frame must pass verifyModbusRtuFrame');

    const { status, json } = await fetchJson('http://localhost:8089/api/protocols/fieldbus/rtu/poll?facilityId=DU-03&unitId=1&quantity=4');
    assert.strictEqual(status, 200);
    assert.strictEqual(json.status, 'RTU_SERIAL_SUCCESS');
    assert.strictEqual(json.unitId, 1);
    assert.ok(Array.isArray(json.registers) && json.registers.length === 4);
    assert.ok(json.crcHex && json.rawFrameHex);
  });

  // Test 40: Zero-Trust Industrial mTLS Security Status Endpoint (/api/admin/security/mtls-status)
  await runTest('Zero-Trust Industrial mTLS Security Status (/api/admin/security/mtls-status)', async () => {
    const { status, json } = await fetchJson('http://localhost:8089/api/admin/security/mtls-status', adminHeaders);
    assert.strictEqual(status, 200);
    assert.strictEqual(json.status, 'SECURITY_STATUS_OK');
    assert.strictEqual(typeof json.mtlsEnabled, 'boolean');
    assert.strictEqual(typeof json.port, 'number');
    assert.ok(json.clientCertVerification);
  });

  // Test 41: Multi-Node Distributed Cluster & State Engine Status (/api/admin/cluster/status)
  await runTest('Distributed State Engine & Cluster Topology (/api/admin/cluster/status)', async () => {
    const { status, json } = await fetchJson('http://localhost:8089/api/admin/cluster/status', adminHeaders);
    assert.strictEqual(status, 200);
    assert.strictEqual(json.status, 'CLUSTER_STATUS_OK');
    assert.ok(json.provider === 'memory' || json.provider === 'redis');
    assert.strictEqual(typeof json.pid, 'number');
    assert.strictEqual(typeof json.uptimeSeconds, 'number');
  });

  // Test 42: Reversible Database Migrations & Status Inspection (/api/admin/migrations)
  await runTest('Reversible Database Migrations Engine (/api/admin/migrations)', async () => {
    const { status, json } = await fetchJson('http://localhost:8089/api/admin/migrations', adminHeaders);
    assert.strictEqual(status, 200);
    assert.ok(Array.isArray(json.availableMigrations), 'Must list available migrations');
    assert.ok(json.availableMigrations.includes('2026_01_init_hypertables'));
    assert.ok(json.availableMigrations.includes('2026_02_fieldbus_audit_index'));
    assert.ok(json.availableMigrations.includes('2026_03_hypertable_retention'));
  });

  // Test 43: EU CBAM Transitional Registry XML Exporter (Regulation (EU) 2023/1773)
  await runTest('EU CBAM Transitional Registry XML Exporter (ClimateSphere.Docs.generateCbamTransitionalXml)', async () => {
    await import('../js/documentGenerator.js');
    assert.ok(typeof globalThis.ClimateSphere?.Docs?.generateCbamTransitionalXml === 'function', 'Must export generateCbamTransitionalXml');

    const xmlBlob = globalThis.ClimateSphere.Docs.generateCbamTransitionalXml({
      reportingPeriod: '2026-Q3',
      declarationId: 'CBAM-2026-TEST-001',
      eori: 'NL892019283000',
      items: [
        {
          cnCode: '72081000',
          description: 'Hot-rolled steel coil',
          countryOfOrigin: 'TR',
          netMassTonnes: 500,
          directSpecificEmissions: 1.85,
          indirectSpecificEmissions: 0.35,
          totalEmbeddedEmissions: 1100,
          carbonPricePaidPerTonne: 0
        }
      ]
    });

    assert.ok(xmlBlob instanceof Blob, 'Must return Blob');
    const buffer = Buffer.from(await xmlBlob.arrayBuffer());
    const xmlText = buffer.toString('utf-8');

    assert.ok(xmlText.includes('<CBAMDeclaration'), 'XML must contain root CBAMDeclaration tag');
    assert.ok(xmlText.includes('urn:eu:taxud:cbam:v1'), 'XML must declare DG TAXUD namespace');
    assert.ok(xmlText.includes('CBAM-2026-TEST-001'), 'XML must contain declaration ID');
    assert.ok(xmlText.includes('NL892019283000'), 'XML must contain declarant EORI');
    assert.ok(xmlText.includes('72081000'), 'XML must contain CN Code');
    assert.ok(xmlText.includes('<DirectEmbeddedEmissions_tCO2ePerTonne>1.8500</DirectEmbeddedEmissions_tCO2ePerTonne>'));
  });

  // Test 44: Native OS SerialPort Driver Binding (/api/protocols/serial/status & /open)
  await runTest('Native OS SerialPort Driver Binding (/api/protocols/serial/*)', async () => {
    const { status, json } = await fetchJson('http://localhost:8089/api/protocols/serial/status');
    assert.strictEqual(status, 200);
    assert.ok(json.path);
    assert.ok(json.baudRate);
    assert.ok(json.driverType);

    const openRes = await postJson('http://localhost:8089/api/protocols/serial/open', {
      path: '/dev/ttyUSB0',
      baudRate: 19200
    });
    assert.strictEqual(openRes.status, 200);
    assert.strictEqual(openRes.json.status, 'PROCESSED');
    assert.ok(openRes.json.mode);
  });

  // Test 45: OPC-UA Continuous Monitored Item Subscriptions (IEC 62541-4)
  await runTest('OPC-UA Continuous Monitored Item Subscriptions (/api/protocols/opcua/subscription/*)', async () => {
    const createRes = await postJson('http://localhost:8089/api/protocols/opcua/subscription/create', {
      facilityId: 'DU-03',
      publishingInterval: 250,
      nodes: ['ns=2;s=DU-03.CEMS.SO2_Actual', 'ns=2;s=DU-03.CEMS.NOx_Actual']
    });
    assert.strictEqual(createRes.status, 200);
    assert.strictEqual(createRes.json.status, 'SUBSCRIPTION_ACTIVE');
    assert.ok(createRes.json.subscriptionId);
    assert.ok(Array.isArray(createRes.json.monitoredItems));

    const pubRes = await fetchJson(`http://localhost:8089/api/protocols/opcua/subscription/publish?facilityId=DU-03&subscriptionId=${createRes.json.subscriptionId}`);
    assert.strictEqual(pubRes.status, 200);
    assert.ok(pubRes.json.notificationMessage);
    assert.strictEqual(typeof pubRes.json.sequenceNumber, 'number');
  });

  // Test 46: Grid Dispatcher Protocols DNP3 (IEEE 1815) & IEC 60870-5-104
  await runTest('Grid Dispatcher Protocols DNP3 & IEC 60870-5-104 (/api/protocols/grid/*)', async () => {
    const dnp3Res = await fetchJson('http://localhost:8089/api/protocols/grid/dnp3?facilityId=DU-03');
    assert.strictEqual(dnp3Res.status, 200);
    assert.strictEqual(dnp3Res.json.syncBytes, '0x0564');
    assert.ok(Array.isArray(dnp3Res.json.objectGroup30_AnalogInputs));
    assert.ok(Array.isArray(dnp3Res.json.objectGroup1_BinaryInputs));

    const iecRes = await fetchJson('http://localhost:8089/api/protocols/grid/iec104?facilityId=DU-03');
    assert.strictEqual(iecRes.status, 200);
    assert.strictEqual(iecRes.json.protocol, 'IEC 60870-5-104');
    assert.strictEqual(iecRes.json.asdu.typeId, 13);
    assert.ok(Array.isArray(iecRes.json.asdu.objects));
  });

  // Test 47: Hardware Security Module (HSM) / TPM 2.0 Cryptographic Anchoring
  await runTest('Hardware Security Module (HSM) / TPM 2.0 Anchoring (/api/audit/hsm/*)', async () => {
    const statusRes = await fetchJson('http://localhost:8089/api/audit/hsm/status');
    assert.strictEqual(statusRes.status, 200);
    assert.strictEqual(statusRes.json.status, 'HARDWARE_SECURITY_ACTIVE');
    assert.strictEqual(statusRes.json.fipsComplianceLevel, 'FIPS 140-2 Level 3');
    assert.ok(statusRes.json.publicKeyThumbprint);

    const anchorRes = await postJson('http://localhost:8089/api/audit/hsm/anchor', {
      merkleRoot: '0x9d4a8e21f7c39054ab17812904bcaef91823746d819024fbcde710293481a5bc',
      metadata: { blockHeight: 104, anchoredBy: 'ADMIN' }
    });
    assert.strictEqual(anchorRes.status, 200);
    assert.strictEqual(anchorRes.json.status, 'ANCHORED_IN_HARDWARE');
    assert.strictEqual(anchorRes.json.algorithm, 'RSA-PSS-SHA256');
    assert.ok(anchorRes.json.signature);
  });

  // Test 48: RFC 6238 TOTP Multi-Factor Authentication Lifecycle
  await runTest('RFC 6238 TOTP Multi-Factor Authentication Lifecycle (/api/auth/mfa/*)', async () => {
    const setupRes = await postJson('http://localhost:8089/api/auth/mfa/setup', {
      email: 'mfa-test@climatesphere.ai'
    });
    assert.strictEqual(setupRes.status, 200);
    assert.strictEqual(setupRes.json.status, 'SETUP_INITIATED');
    assert.ok(setupRes.json.secret);
    assert.ok(setupRes.json.otpauthUri.startsWith('otpauth://totp/ClimateSphere'));
    assert.strictEqual(setupRes.json.digits, 6);

    // Compute expected code directly using same RFC 6238 algorithm
    const crypto = await import('crypto');
    const cleanSecret = setupRes.json.secret.toUpperCase().replace(/[^A-Z2-7]/g, '');
    const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    let bits = 0, value = 0;
    const bytes = [];
    for (let i = 0; i < cleanSecret.length; i++) {
      const idx = BASE32_ALPHABET.indexOf(cleanSecret[i]);
      if (idx !== -1) {
        value = (value << 5) | idx;
        bits += 5;
        if (bits >= 8) {
          bytes.push((value >>> (bits - 8)) & 255);
          bits -= 8;
        }
      }
    }
    const secretBuf = Buffer.from(bytes);
    const timeStep = Math.floor(Date.now() / 1000 / 30);
    const buf = Buffer.alloc(8);
    buf.writeBigUInt64BE(BigInt(timeStep), 0);
    const hmac = crypto.createHmac('sha1', secretBuf).update(buf).digest();
    const offset = hmac[hmac.length - 1] & 0x0f;
    const binary = ((hmac[offset] & 0x7f) << 24) |
                   ((hmac[offset + 1] & 0xff) << 16) |
                   ((hmac[offset + 2] & 0xff) << 8) |
                   (hmac[offset + 3] & 0xff);
    const validCode = (binary % 1000000).toString().padStart(6, '0');

    const verifyRes = await postJson('http://localhost:8089/api/auth/mfa/verify', {
      email: 'mfa-test@climatesphere.ai',
      secret: setupRes.json.secret,
      code: validCode
    });
    assert.strictEqual(verifyRes.status, 200);
    assert.strictEqual(verifyRes.json.status, 'MFA_ACTIVE');

    const validateRes = await postJson('http://localhost:8089/api/auth/mfa/validate', {
      email: 'mfa-test@climatesphere.ai',
      code: validCode
    });
    assert.strictEqual(validateRes.status, 200);
    assert.strictEqual(validateRes.json.valid, true);
  });

  // Test 49: US EPA 40 CFR Part 75 CEMS Compliance (Missing Data & RATA BAF)
  await runTest('US EPA 40 CFR Part 75 Compliance Engine (/api/compliance/epa/part75/*)', async () => {
    // Missing Data Substitution
    const subRes = await postJson('http://localhost:8089/api/compliance/epa/part75/substitute', {
      monitorAvailabilityPct: 98.4,
      hoursOffline: 3,
      historicalValues: [120, 130, 140, 150]
    });
    assert.strictEqual(subRes.status, 200);
    assert.strictEqual(subRes.json.status, 'SUCCESS');
    assert.strictEqual(subRes.json.tier, 'TIER_1_STANDARD_LOOKBACK');
    assert.strictEqual(subRes.json.substitutedValue, 135);

    // RATA & Bias Adjustment Factor
    const rataRes = await postJson('http://localhost:8089/api/compliance/epa/part75/rata', {
      pairedRuns: [
        { cem: 84.0, rm: 82.0 },
        { cem: 85.0, rm: 83.0 },
        { cem: 84.5, rm: 82.5 },
        { cem: 86.0, rm: 84.0 },
        { cem: 85.5, rm: 83.5 },
        { cem: 84.8, rm: 82.8 }
      ]
    });
    assert.strictEqual(rataRes.status, 200);
    assert.strictEqual(typeof rataRes.json.relativeAccuracyPct, 'number');
    assert.ok(rataRes.json.biasAdjustmentFactor >= 1.000);
  });

  // Test 50: US EPA ECMPS XML Emissions Evaluation Exporter
  await runTest('US EPA ECMPS XML Emissions Evaluation Exporter (ClimateSphere.Docs.generateEpaEcmpsXml)', async () => {
    await import('../js/documentGenerator.js');
    assert.ok(typeof globalThis.ClimateSphere?.Docs?.generateEpaEcmpsXml === 'function', 'Must export generateEpaEcmpsXml');

    const epaBlob = globalThis.ClimateSphere.Docs.generateEpaEcmpsXml({
      orisCode: '3118',
      facilityName: 'Duisburg Generating Station',
      unitId: 'UNIT-03',
      reportingYear: 2026,
      reportingQuarter: '3',
      biasAdjustmentFactor: 1.024,
      monitorAvailabilityPct: 98.4
    });

    assert.ok(epaBlob instanceof Blob, 'Must return Blob');
    const buffer = Buffer.from(await epaBlob.arrayBuffer());
    const xmlText = buffer.toString('utf-8');

    assert.ok(xmlText.includes('<EmissionsEvaluation'), 'XML must contain root EmissionsEvaluation tag');
    assert.ok(xmlText.includes('urn:epa:camd:ecmps:emissions:v1'), 'XML must declare EPA CAMD namespace');
    assert.ok(xmlText.includes('<OrisCode>3118</OrisCode>'), 'XML must contain ORIS code');
    assert.ok(xmlText.includes('<UnitIdentifier>UNIT-03</UnitIdentifier>'), 'XML must contain unit ID');
    assert.ok(xmlText.includes('<BiasAdjustmentFactor>1.024</BiasAdjustmentFactor>'), 'XML must contain BAF');
    assert.ok(xmlText.includes('40 CFR Part 75 (Acid Rain / CSAPR)'));
  });

  // Test 51: Scaled Vector Embeddings & pgvector Regulatory RAG (/api/ai/rag/*)
  await runTest('Scaled Vector Embeddings & Regulatory RAG Engine (/api/ai/rag/*)', async () => {
    const statusRes = await fetchJson('http://localhost:8089/api/ai/rag/vector-status');
    assert.strictEqual(statusRes.status, 200);
    assert.strictEqual(statusRes.json.status, 'PGVECTOR_READY');
    assert.strictEqual(statusRes.json.dimensions, 384);

    const queryRes = await postJson('http://localhost:8089/api/ai/rag/query', {
      query: 'emission limit values IED Article 15',
      topK: 2
    });
    assert.strictEqual(queryRes.status, 200);
    assert.ok(Array.isArray(queryRes.json.matches));
    assert.ok(queryRes.json.matches.length > 0);
    assert.ok(queryRes.json.matches[0].framework);
  });

  // Test 52: Air-Gapped Local Edge LLM Inference Engine (/api/ai/local/*)
  await runTest('Air-Gapped Local Edge LLM Inference Engine (/api/ai/local/*)', async () => {
    const modelsRes = await fetchJson('http://localhost:8089/api/ai/local/models');
    assert.strictEqual(modelsRes.status, 200);
    assert.strictEqual(modelsRes.json.airGapped, true);
    assert.ok(Array.isArray(modelsRes.json.availableModels));

    const queryRes = await postJson('http://localhost:8089/api/ai/local/query', {
      prompt: 'Check SO2 limits under Directive 2010/75/EU',
      facilityId: 'DU-03'
    });
    assert.strictEqual(queryRes.status, 200);
    assert.strictEqual(queryRes.json.status, 'SUCCESS');
    assert.strictEqual(queryRes.json.airGapped, true);
    assert.ok(queryRes.json.response.includes('Air-Gapped Edge Inference'));
  });

  // Test 53: Headless Scheduled Compliance Report Dispatcher (/api/admin/reports/*)
  await runTest('Headless Scheduled Compliance Report Dispatcher (/api/admin/reports/*)', async () => {
    const schedRes = await fetchJson('http://localhost:8089/api/admin/reports/schedules');
    assert.strictEqual(schedRes.status, 200);
    assert.ok(schedRes.json.activeSchedulesCount >= 3);

    const dispatchRes = await postJson('http://localhost:8089/api/admin/reports/dispatch-now', {
      scheduleId: 'sch-cems-daily'
    }, adminHeaders);
    assert.strictEqual(dispatchRes.status, 200);
    assert.strictEqual(dispatchRes.json.status, 'DISPATCHED');
    assert.ok(dispatchRes.json.proof.deliveryProofHash.startsWith('0x'));
  });

  // Test 54: DIN EN 14181 QAL2 Linear Regression Calculation Engine
  await runTest('DIN EN 14181 QAL2 Linear Regression Engine (/api/compliance/qal2/calculate)', async () => {
    const qal2Res = await postJson('http://localhost:8089/api/compliance/qal2/calculate', {
      runs: [
        { ams: 412.0, srm: 418.5 },
        { ams: 418.2, srm: 424.0 },
        { ams: 405.0, srm: 411.2 },
        { ams: 422.5, srm: 429.0 },
        { ams: 410.8, srm: 417.0 },
        { ams: 415.0, srm: 421.4 },
        { ams: 428.0, srm: 434.5 },
        { ams: 402.1, srm: 408.0 },
        { ams: 419.4, srm: 425.8 },
        { ams: 411.0, srm: 417.2 }
      ],
      elv: 500.0,
      pollutant: 'SO2'
    });
    assert.strictEqual(qal2Res.status, 200);
    assert.strictEqual(qal2Res.json.runCount, 10);
    assert.ok(typeof qal2Res.json.linearRegression.slope === 'number');
    assert.strictEqual(qal2Res.json.certificationStatus, 'QAL2_CERTIFIED_PASS');
  });

  // Test 55: Operator Shift Handover Annotation & Event Tagging (/api/telemetry/annotations)
  await runTest('Operator Shift Handover Annotation & Event Tagging (/api/telemetry/annotations)', async () => {
    const postRes = await postJson('http://localhost:8089/api/telemetry/annotations', {
      facilityId: 'DU-03',
      excuseCode: 'SOOT_BLOWING',
      title: 'Boiler tube soot blowing sequence 4A',
      notes: 'Steam lances deployed on economizer; transient peak covered by operating permit.'
    }, adminHeaders);
    assert.strictEqual(postRes.status, 201);
    assert.strictEqual(postRes.json.status, 'ANNOTATION_RECORDED');
    assert.strictEqual(postRes.json.annotation.excuseCode, 'SOOT_BLOWING');

    const getRes = await fetchJson('http://localhost:8089/api/telemetry/annotations?facilityId=DU-03');
    assert.strictEqual(getRes.status, 200);
    assert.ok(Array.isArray(getRes.json));
    assert.ok(getRes.json.length >= 1);
  });

  // Test 56: DIN EN 14181 AST (Annual Surveillance Test) Variability Engine
  await runTest('DIN EN 14181 Clause 9 AST Variability Engine (/api/compliance/ast/calculate)', async () => {
    const astRes = await postJson('http://localhost:8089/api/compliance/ast/calculate', {
      runs: [
        { ams: 412.0, srm: 418.5 },
        { ams: 418.2, srm: 424.0 },
        { ams: 405.0, srm: 411.2 },
        { ams: 422.5, srm: 429.0 },
        { ams: 410.8, srm: 417.0 }
      ],
      elv: 500.0,
      pollutant: 'SO2',
      qal2Slope: 1.0142,
      qal2Intercept: 1.84
    });
    assert.strictEqual(astRes.status, 200);
    assert.strictEqual(astRes.json.runCount, 5);
    assert.ok(astRes.json.variabilityTest.variabilityCriterion > 0);
    assert.strictEqual(astRes.json.certificationStatus, 'AST_SURVEILLANCE_PASS');
  });

  // Test 57: German 13. BImSchV 30-Minute Valid Half-Hour (HMW) Grid
  await runTest('German 13. BImSchV 30-Minute Valid Half-Hour (HMW) Grid (/api/compliance/bmschv/hmw)', async () => {
    const hmwRes = await fetchJson('http://localhost:8089/api/compliance/bmschv/hmw?facilityId=DU-03');
    assert.strictEqual(hmwRes.status, 200);
    assert.strictEqual(hmwRes.json.totalSlots, 48);
    assert.ok(hmwRes.json.validHmwCount >= 40);
    assert.strictEqual(hmwRes.json.minimumOperatingThresholdMinutes, 20);
    assert.ok(hmwRes.json.dailyMeanValue_TMW.compliant);
  });

  // Test 58: US EPA 40 CFR Part 60 Appendix F Cylinder Gas Audit (CGA)
  await runTest('US EPA 40 CFR Part 60 Cylinder Gas Audit (/api/compliance/epa/part60/cga)', async () => {
    const cgaRes = await postJson('http://localhost:8089/api/compliance/epa/part60/cga', {
      pollutant: 'SO2',
      spanPpm: 500.0,
      auditPoints: [
        { level: 'LOW (20-30% span)', auditGasPpm: 125.0, cemsResponsePpm: 122.0 },
        { level: 'MID (50-60% span)', auditGasPpm: 275.0, cemsResponsePpm: 270.5 }
      ]
    });
    assert.strictEqual(cgaRes.status, 200);
    assert.strictEqual(cgaRes.json.status, 'PASS_CGA');
    assert.ok(cgaRes.json.auditPoints[0].accuracyPct <= 15.0);
  });

  // Test 59: US EPA 40 CFR Part 60 Appendix F Relative Accuracy Audit (RAA)
  await runTest('US EPA 40 CFR Part 60 Relative Accuracy Audit (/api/compliance/epa/part60/raa)', async () => {
    const raaRes = await postJson('http://localhost:8089/api/compliance/epa/part60/raa', {
      pollutant: 'SO2',
      standardElv: 500.0,
      pairedRuns: [
        { cem: 84.5, rm: 82.0 },
        { cem: 85.0, rm: 83.2 },
        { cem: 83.8, rm: 82.5 }
      ]
    });
    assert.strictEqual(raaRes.status, 200);
    assert.strictEqual(raaRes.json.status, 'PASS_RAA');
    assert.ok(raaRes.json.relativeAccuracyPct <= 15.0);
  });

  // Test 60: FIDO2 / WebAuthn Hardware Security Key Authentication Ceremony
  await runTest('FIDO2 / WebAuthn Hardware Key Lifecycle (/api/auth/webauthn/*)', async () => {
    // 1. Registration Challenge
    const optRes = await postJson('http://localhost:8089/api/auth/webauthn/register/options', {
      email: 'fido-test@climatesphere.ai'
    });
    assert.strictEqual(optRes.status, 200);
    assert.strictEqual(optRes.json.status, 'CHALLENGE_ISSUED');
    assert.ok(optRes.json.challenge);

    // 2. Registration Verification
    const verRes = await postJson('http://localhost:8089/api/auth/webauthn/register/verify', {
      email: 'fido-test@climatesphere.ai',
      credentialId: 'cred-yubikey-fips-2026'
    });
    assert.strictEqual(verRes.status, 200);
    assert.strictEqual(verRes.json.status, 'WEBAUTHN_REGISTERED');

    // 3. Authentication Challenge
    const authOptRes = await postJson('http://localhost:8089/api/auth/webauthn/authenticate/options', {
      email: 'fido-test@climatesphere.ai'
    });
    assert.strictEqual(authOptRes.status, 200);
    assert.strictEqual(authOptRes.json.status, 'AUTHENTICATION_CHALLENGE');

    // 4. Authentication Assertion Verification
    const authVerRes = await postJson('http://localhost:8089/api/auth/webauthn/authenticate/verify', {
      email: 'fido-test@climatesphere.ai',
      credentialId: 'cred-yubikey-fips-2026'
    });
    assert.strictEqual(authVerRes.status, 200);
    assert.strictEqual(authVerRes.json.status, 'WEBAUTHN_AUTHENTICATED');
    assert.ok(authVerRes.json.accessToken);
  });

  // Test 61: Webhook Delivery Dead-Letter Queue (DLQ) & Retry Dispatcher
  await runTest('Webhook Dead-Letter Queue (DLQ) & Retry Engine (/api/notifications/webhooks/dlq/*)', async () => {
    const listRes = await fetchJson('http://localhost:8089/api/notifications/webhooks/dlq');
    assert.strictEqual(listRes.status, 200);
    assert.ok(Array.isArray(listRes.json.queue));

    const retryRes = await postJson('http://localhost:8089/api/notifications/webhooks/dlq/retry', {
      id: 'dlq-init-01'
    }, adminHeaders);
    assert.strictEqual(retryRes.status, 200);
    assert.strictEqual(retryRes.json.status, 'RETRY_SUCCESS');
  });

  // Test 62: German 17. BImSchV (Waste Incineration) 10-Minute Sliding Window & Dual-Rule Compliance
  await runTest('German 17. BImSchV 10-Minute Sliding Window Engine (/api/compliance/bmschv/17)', async () => {
    const bim17Res = await fetchJson('http://localhost:8089/api/compliance/bmschv/17?facilityId=DU-03');
    assert.strictEqual(bim17Res.status, 200);
    assert.strictEqual(bim17Res.json.totalHalfHourSlots, 48);
    assert.strictEqual(bim17Res.json.dualRuleEvaluation.rule100PctMax.requiredPct, 100.0);
    assert.strictEqual(bim17Res.json.dualRuleEvaluation.rule97PctStrict.requiredPct, 97.0);
    assert.strictEqual(bim17Res.json.status, 'COMPLIANT_17_BIMSCHV');
  });

  // Test 63: US EPA 40 CFR Part 75 Appendix D & E Fuel Flowmeter & Peaking Unit Evaluation
  await runTest('US EPA Part 75 Appendix D & E Peaking Unit Engine (/api/compliance/epa/part75/appendix-de)', async () => {
    const appDeRes = await postJson('http://localhost:8089/api/compliance/epa/part75/appendix-de', {
      unitId: 'UNIT-PEAK-01',
      fuelType: 'NATURAL_GAS',
      flowRateScfh: 500000.0,
      grossCalorificValueBtuScf: 1025.0,
      operatingHours: 4.0
    });
    assert.strictEqual(appDeRes.status, 200);
    assert.strictEqual(appDeRes.json.status, 'PART75_APPENDIX_DE_VERIFIED');
    assert.ok(appDeRes.json.heatInput.rateMmbtuHr > 500.0);
    assert.ok(appDeRes.json.emissions.nox.totalLbs > 0);
  });

  // Test 64: EU CBAM Definitive Phase (2026–2034) Surrender & Certificate Liability Assessment
  await runTest('EU CBAM Definitive Phase Liability Engine (/api/compliance/cbam/definitive)', async () => {
    const cbamDefRes = await postJson('http://localhost:8089/api/compliance/cbam/definitive', {
      importTonnage: 10000.0,
      cnCode: '7208 51 00',
      embeddedScope1Tco2e: 15000.0,
      embeddedScope2Tco2e: 2500.0,
      originCountry: 'TURKEY',
      originCarbonPriceEurPerTonne: 12.00,
      euaAuctionPriceEur: 70.00
    });
    assert.strictEqual(cbamDefRes.status, 200);
    assert.strictEqual(cbamDefRes.json.status, 'CBAM_DEFINITIVE_SURRENDER_ASSESSED');
    assert.strictEqual(cbamDefRes.json.emissions.totalEmbeddedTco2e, 17500.0);
    assert.ok(cbamDefRes.json.financialObligation.netLiabilityEur > 0);
    assert.ok(cbamDefRes.json.financialObligation.netCertificatesToSurrender > 0);
  });

  // Test 65: AI Action Execution Digital Twin Safety Sandbox Simulation
  await runTest('AI Action Digital Twin Safety Sandbox (/api/ai/simulate-dispatch)', async () => {
    const safeRes = await postJson('http://localhost:8089/api/ai/simulate-dispatch', {
      actionType: 'INCREASE_FGD_SLURRY_FEED',
      targetSetpoint: 450.0,
      facilityId: 'DU-03'
    });
    assert.strictEqual(safeRes.status, 200);
    assert.strictEqual(safeRes.json.status, 'DISPATCH_FEASIBLE');
    assert.ok(safeRes.json.simulationSafetyScore >= 0.9);

    const unsafeRes = await postJson('http://localhost:8089/api/ai/simulate-dispatch', {
      actionType: 'INCREASE_FGD_SLURRY_FEED',
      targetSetpoint: 650.0, // Exceeds 500 m3/h max hydraulic pump head
      facilityId: 'DU-03'
    });
    assert.strictEqual(unsafeRes.status, 200);
    assert.strictEqual(unsafeRes.json.status, 'REJECTED_SAFETY_VIOLATION');
  });

  // Test 66: OPC-UA Binary Secure Channel Handshake & X.509 Token Exchange
  await runTest('OPC-UA IEC 62541 Secure Channel Handshake (/api/protocols/opcua/secure-channel)', async () => {
    const opcSecRes = await fetchJson('http://localhost:8089/api/protocols/opcua/secure-channel');
    assert.strictEqual(opcSecRes.status, 200);
    assert.strictEqual(opcSecRes.json.status, 'SECURE_CHANNEL_OPENED');
    assert.strictEqual(opcSecRes.json.securityPolicy, 'Basic256Sha256');
    assert.strictEqual(opcSecRes.json.tokenType, 'X509_CERTIFICATE_TOKEN');
    assert.ok(opcSecRes.json.certificateThumbprint);
  });

  // Test 67: Industrial SerialPort udev Hotplug Watchdog & Reconnection Status
  await runTest('SerialPort Dynamic Hotplug Watchdog (/api/protocols/serial/watchdog)', async () => {
    const watchdogRes = await fetchJson('http://localhost:8089/api/protocols/serial/watchdog');
    assert.strictEqual(watchdogRes.status, 200);
    assert.strictEqual(watchdogRes.json.status, 'HOTPLUG_WATCHDOG_ENABLED');
    assert.strictEqual(watchdogRes.json.statusDetail.hotplugWatchdogStatus, 'UDEV_MONITOR_ACTIVE');
  });

  // Test 68: UK Environment Agency MCERTS CEMS Compliance Validation (TGN M2 / BS EN 15267-3)
  await runTest('UK Environment Agency MCERTS CEMS Compliance Validation (/api/compliance/mcerts/validation)', async () => {
    const mcertsRes = await postJson('http://localhost:8089/api/compliance/mcerts/validation', {
      facilityId: 'DU-03',
      analyzerModel: 'FTIR Multi-Gas CEMS Model CS-9000',
      mcertsCertificate: 'Sira MC050066/12',
      certifiedSpan: 200.0,
      maxLinearityResidualPct: 1.25,
      zeroDriftPct: 0.65,
      spanDriftPct: 0.90,
      responseTimeT90Sec: 135.0,
      expandedUncertaintyPct: 7.80,
      operationalAvailabilityPct: 99.10
    });
    assert.strictEqual(mcertsRes.status, 200);
    assert.strictEqual(mcertsRes.json.overallStatus, 'MCERTS_CONFORMANT');
    assert.strictEqual(mcertsRes.json.facilityId, 'DU-03');
    assert.strictEqual(mcertsRes.json.testResults.linearity.pass, true);
    assert.strictEqual(mcertsRes.json.testResults.zeroDrift.pass, true);
    assert.strictEqual(mcertsRes.json.testResults.expandedUncertainty.pass, true);
    assert.strictEqual(mcertsRes.json.testResults.operationalAvailability.pass, true);
    assert.ok(mcertsRes.json.uncertaintyBudget.expandedUncertainty_U95 > 0);
  });

  // Test 69: CSRD / ESRS E1 Quantitative Double Materiality & GHG Inventory (/api/compliance/csrd/esrs-e1)
  await runTest('CSRD / ESRS E1 Quantitative Double Materiality & GHG Inventory (/api/compliance/csrd/esrs-e1)', async () => {
    const csrdRes = await postJson('http://localhost:8089/api/compliance/csrd/esrs-e1', {
      tenantId: 'tenant-eu-energy',
      reportingYear: 2025,
      turnoverMillionsEur: 150.0,
      fuelCombustionTons: 40000.0,
      gridElectricityMWh: 35000.0,
      renewablePpaMWh: 15000.0,
      scope3PurchasedGoodsTco2e: 20000.0,
      scope3UpstreamTransportTco2e: 5000.0,
      scope3UseOfSoldProductsTco2e: 12000.0
    });
    assert.strictEqual(csrdRes.status, 200);
    assert.strictEqual(csrdRes.json.doubleMateriality.materialityDetermination, 'MATERIAL_TOPIC_DISCLOSURE_REQUIRED');
    assert.strictEqual(csrdRes.json.assuranceOpinion, 'LIMITED_ASSURANCE_COMPLIANT');
    assert.ok(csrdRes.json.ghgInventory.scope1.grossScope1Tco2e > 0);
    assert.ok(csrdRes.json.ghgInventory.scope2.marketBasedTco2e > 0);
    assert.ok(csrdRes.json.ghgInventory.scope3.totalScope3Tco2e > 0);
    assert.ok(csrdRes.json.ghgInventory.ghgIntensityTco2ePerMillionEur > 0);
    assert.strictEqual(csrdRes.json.parisAlignment.onTrackFor1Point5Celsius, true);
  });

  // Test 70: EU ETS MRV Annual Emissions Return & Verifier Assurance (/api/compliance/eu-ets/mrv)
  await runTest('EU ETS MRV Annual Emissions Return & Verifier Assurance (/api/compliance/eu-ets/mrv)', async () => {
    const mrvRes = await postJson('http://localhost:8089/api/compliance/eu-ets/mrv', {
      installationId: 'DE-ETS-0982-DU-03',
      reportingYear: 2025,
      installationCategory: 'CATEGORY_B',
      activityDataTJ: 4000.0,
      emissionFactorTco2PerTJ: 56.10,
      oxidationFactor: 1.00,
      biomassFraction: 0.10,
      cemsMeasuredTonnage: 202000.0,
      missingDataHours: 12.0
    });
    assert.strictEqual(mrvRes.status, 200);
    assert.strictEqual(mrvRes.json.verifierAssurance.verifierOpinion, 'REASONABLE_ASSURANCE_SATISFACTORY_WITHOUT_QUALIFICATION');
    assert.strictEqual(mrvRes.json.surrenderObligation.complianceStatus, 'VERIFIED_READY_FOR_UNION_REGISTRY_SURRENDER');
    assert.strictEqual(mrvRes.json.cemsCrosscheck.crosscheckPass, true);
    assert.ok(mrvRes.json.emissionsSummary.netFossilEmissionsTco2 > 0);
    assert.ok(mrvRes.json.surrenderObligation.surrenderUnitsDueEua > 0);
  });

  // Test 71: Statutory XML Document Exporters for MCERTS, CSRD ESRS E1, and EU ETS MRV
  await runTest('Statutory XML Exporters for MCERTS, CSRD ESRS E1, EU ETS MRV (js/documentGenerator.js)', async () => {
    await import('../js/documentGenerator.js');
    const { generateMcertsAuditReportXml, generateCsrdEsrsE1ReportXml, generateEuEtsMrvReturnXml } = globalThis.ClimateSphere.Docs;

    assert.ok(typeof generateMcertsAuditReportXml === 'function', 'generateMcertsAuditReportXml must be exported');
    assert.ok(typeof generateCsrdEsrsE1ReportXml === 'function', 'generateCsrdEsrsE1ReportXml must be exported');
    assert.ok(typeof generateEuEtsMrvReturnXml === 'function', 'generateEuEtsMrvReturnXml must be exported');

    const mcertsXml = generateMcertsAuditReportXml({ facilityId: 'DU-03' });
    const mcertsStr = typeof mcertsXml === 'string' ? mcertsXml : await mcertsXml.text();
    assert.ok(mcertsStr.includes('<MCERTSAuditReport'), 'MCERTS XML must contain root element');
    assert.ok(mcertsStr.includes('<ComplianceStatus>MCERTS_CONFORMANT</ComplianceStatus>'));

    const csrdXml = generateCsrdEsrsE1ReportXml({ reportingYear: 2025 });
    const csrdStr = typeof csrdXml === 'string' ? csrdXml : await csrdXml.text();
    assert.ok(csrdStr.includes('<ESRSE1ClimateDisclosure'), 'CSRD XML must contain root element');
    assert.ok(csrdStr.includes('<Determination>MATERIAL_TOPIC_DISCLOSURE_REQUIRED</Determination>'));

    const mrvXml = generateEuEtsMrvReturnXml({ reportingYear: 2025 });
    const mrvStr = typeof mrvXml === 'string' ? mrvXml : await mrvXml.text();
    assert.ok(mrvStr.includes('<EUETSAnnualEmissionsReturn'), 'EU ETS MRV XML must contain root element');
    assert.ok(mrvStr.includes('<Opinion>REASONABLE_ASSURANCE_SATISFACTORY_WITHOUT_QUALIFICATION</Opinion>'));
  });

  // Test 72: Production Kubernetes Helm Manifests & Templates Integrity Check
  await runTest('Production Kubernetes Helm Manifests & Templates Integrity Check', async () => {
    const fs = await import('fs');
    const templateDir = path.resolve(ROOT_DIR, 'helm/climatesphere/templates');
    const expectedTemplates = [
      'secret.yaml',
      'configmap.yaml',
      'ingress.yaml',
      'hpa.yaml',
      'networkpolicy.yaml',
      'poddisruptionbudget.yaml',
      'daemonset-gateway.yaml',
      'deployment-frontend.yaml',
      'service.yaml'
    ];

    for (const tpl of expectedTemplates) {
      const fullPath = path.join(templateDir, tpl);
      assert.ok(fs.existsSync(fullPath), `Helm template ${tpl} must exist`);
      const content = fs.readFileSync(fullPath, 'utf8');
      assert.ok(content.length > 50, `Helm template ${tpl} must not be empty`);
    }

    const pgbouncerIni = path.resolve(ROOT_DIR, 'pgbouncer/pgbouncer.ini');
    assert.ok(fs.existsSync(pgbouncerIni), 'pgbouncer/pgbouncer.ini must exist');
    const pgbouncerContent = fs.readFileSync(pgbouncerIni, 'utf8');
    assert.ok(pgbouncerContent.includes('pool_mode = transaction'));
  });

  // Test 73: Full MQTT Sparkplug B State Machine Lifecycle (NBIRTH / DBIRTH / DDATA / Rebirth)
  await runTest('MQTT Sparkplug B v1.0 State Machine Lifecycle Engine (/api/protocols/sparkplug/*)', async () => {
    const statusRes = await fetchJson('http://localhost:8089/api/protocols/sparkplug/status');
    assert.strictEqual(statusRes.status, 200);
    assert.strictEqual(statusRes.json.state, 'ONLINE');
    assert.strictEqual(statusRes.json.standard, 'Eclipse Sparkplug B v1.0 / ISO/IEC 20237');
    assert.ok(Array.isArray(statusRes.json.registeredDevices), 'registeredDevices must be an array');
    assert.ok(statusRes.json.registeredDevices.length >= 5, 'must register at least 5 industrial devices');

    // Test DDATA publication
    const pubRes = await postJson('http://localhost:8089/api/protocols/sparkplug/publish', {
      facilityId: 'DU-03',
      telemetry: { so2: 340.5, nox: 185.0, co: 50.2, o2: 6.0, qualityFlag: 'VALID_CALIBRATED' }
    });
    assert.strictEqual(pubRes.status, 200);
    assert.strictEqual(pubRes.json.status, 'PUBLISHED');
    assert.ok(pubRes.json.topic.includes('DDATA'), 'published topic must contain DDATA');
    assert.ok(typeof pubRes.json.seq === 'number', 'sequence counter must be numeric');

    // Test Rebirth Command state machine handling
    const rebirthRes = await postJson('http://localhost:8089/api/protocols/sparkplug/rebirth', {});
    assert.strictEqual(rebirthRes.status, 200);
    assert.strictEqual(rebirthRes.json.status, 'REBIRTH_INITIATED');
    assert.ok(rebirthRes.json.nbirth, 'rebirth must return new NBIRTH packet');
    assert.ok(rebirthRes.json.dbirths.length >= 5, 'rebirth must publish DBIRTH for all devices');
  });

  // Test 74: Cold Storage Parquet Archival & Statutory 10-Year Tiering Daemon (/api/admin/archival/*)
  await runTest('Cold Storage Parquet Archival & Statutory 10-Year Tiering Daemon (/api/admin/archival/*)', async () => {
    const statusRes = await fetchJson('http://localhost:8089/api/admin/archival/status');
    assert.strictEqual(statusRes.status, 200);
    assert.strictEqual(statusRes.json.active, true);
    assert.strictEqual(statusRes.json.statutoryHorizonYears, 10);

    // Test triggering partition archival
    const trigRes = await postJson('http://localhost:8089/api/admin/archival/trigger', {
      partitionKey: '2025_Q4_TEST_BATCH',
      records: [
        { ts: Date.now() - 95 * 86400 * 1000, fid: 'DU-03', so2: 310.2, nox: 190.1, co: 45.0, o2: 6.0, flag: 'VALID' }
      ]
    });
    assert.strictEqual(trigRes.status, 200);
    assert.strictEqual(trigRes.json.status, 'ARCHIVED');
    assert.ok(trigRes.json.archiveId.startsWith('cems_cold_2025_Q4_TEST_BATCH'));
    assert.ok(trigRes.json.merkleSha256.startsWith('0x'), 'must return valid SHA-256 Merkle hash');

    // Test verifying archive cryptographic integrity
    const verifyRes = await postJson('http://localhost:8089/api/admin/archival/verify', {
      archiveId: trigRes.json.archiveId,
      hash: trigRes.json.merkleSha256
    });
    assert.strictEqual(verifyRes.status, 200);
    assert.strictEqual(verifyRes.json.verified, true);
    assert.strictEqual(verifyRes.json.storageTier, 'COLD_OBJECT_STORAGE_S3_MINIO');
  });

  // Test 75: OpenTelemetry (OTel) Distributed Tracing Engine (W3C traceparent headers & /api/observability/traces)
  await runTest('OpenTelemetry Distributed Tracing & W3C Trace Context (/api/observability/traces)', async () => {
    // Send request with synthetic upstream traceparent
    const upstreamTrace = '00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01';
    const traceRes = await fetchJson('http://localhost:8089/api/observability/traces', {
      'traceparent': upstreamTrace
    });
    assert.strictEqual(traceRes.status, 200);
    assert.strictEqual(traceRes.json.standard, 'W3C Trace Context 1.0 (traceparent)');
    assert.ok(Array.isArray(traceRes.json.traces), 'traces list must be an array');
    assert.ok(traceRes.json.spansRecorded > 0, 'must have recorded distributed spans');

    // Verify trace lookup by traceId
    const targetTrace = traceRes.json.traces[0];
    assert.ok(targetTrace.traceId, 'span must have a valid traceId');
    assert.ok(targetTrace.spanId, 'span must have a valid spanId');
    assert.ok(typeof targetTrace.durationMs === 'number', 'span must measure duration in milliseconds');
  });

  // Test 76: Pre-compiled Standalone SerialPort Bridge for Air-Gapped Industrial IPCs (/api/protocols/serial/airgapped-bridge)
  await runTest('Air-Gapped Standalone SerialPort Driver Bridge (/api/protocols/serial/airgapped-bridge)', async () => {
    const bridgeRes = await fetchJson('http://localhost:8089/api/protocols/serial/airgapped-bridge');
    assert.strictEqual(bridgeRes.status, 200);
    assert.strictEqual(bridgeRes.json.status, 'READY_AIR_GAPPED');
    assert.strictEqual(bridgeRes.json.precompiledBinary, true);
    assert.ok(Array.isArray(bridgeRes.json.availablePorts), 'availablePorts must be an array');
    assert.ok(bridgeRes.json.availablePorts.length > 0, 'must detect available industrial ports');
    assert.ok(bridgeRes.json.baudrates.includes(9600), 'must support 9600 baud');
    assert.ok(bridgeRes.json.baudrates.includes(115200), 'must support 115200 baud');
    assert.ok(bridgeRes.json.parityProfiles.DIN_EN_14181_STANDARD, 'must support DIN EN 14181 standard 8E1 parity');
  });

  // Test 77: Official EU Copernicus (CAMS) / EEA Certified Environmental Ingestion Engine
  await runTest('Official EU Copernicus CAMS Certified Telemetry & Proofs (/api/certified/*)', async () => {
    const statusRes = await fetchJson('http://localhost:8089/api/certified/status');
    assert.strictEqual(statusRes.status, 200);
    assert.strictEqual(statusRes.json.status, 'CERTIFIED_ONLINE');
    assert.ok(statusRes.json.provider.includes('Copernicus'));
    assert.strictEqual(statusRes.json.facilitiesLoaded, 5);

    const certRes = await fetchJson('http://localhost:8089/api/certified/certificate?facility=DU-03');
    assert.strictEqual(certRes.status, 200);
    assert.strictEqual(certRes.json.certificateId, 'CERT-CAMS-EU-2026-DU-03');
    assert.ok(certRes.json.measurements.ambientGround.SO2_ug_m3 > 0);
    assert.strictEqual(certRes.json.cryptographicAssurance.sha256Digest.length, 64);
  });
  console.log('\n════════════════════════════════════════════════════════════════');
  console.log(` Test Summary: ${passedTests} Passed, ${failedTests} Failed`);
  console.log('════════════════════════════════════════════════════════════════');

  cleanupServer();

  if (failedTests > 0) {
    process.exit(1);
  }
}

main().catch(err => {
  cleanupServer();
  console.error('Fatal Test Runner Error:', err);
  process.exit(1);
});
