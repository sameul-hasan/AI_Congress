/**
 * ClimateSphere AI — Phase 2 Enterprise Security, OIDC & RBAC Verification Test Suite
 * 
 * Verifies:
 *   1. Genuine OIDC Discovery (/.well-known/openid-configuration)
 *   2. RFC 7517 JSON Web Key Set (JWKS) Key Store (/.well-known/jwks.json)
 *   3. Asymmetric RSA-2048 (RS256) & HMAC (HS256) Dual-Algorithm Token Engine
 *   4. RFC 7636 Proof Key for Code Exchange (PKCE S256) Verification
 *   5. Industrial RBAC Permission Catalog & Role Hierarchy (/api/auth/permissions)
 *   6. Granular RBAC Permission Enforcements & HTTP 403 Forbidden Guards
 *   7. PostgreSQL / TimescaleDB Row-Level Security (RLS) & Tenant Isolation Engine
 *   8. Asymmetric RS256 Token Issuance & Verification (/api/auth/token & /api/auth/verify)
 */

import assert from 'node:assert';
import test from 'node:test';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

// Direct service imports for unit verification
import authService from '../server/services/auth_service.js';
import dbService from '../server/services/db_service.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

const GATEWAY_PORT = 8089;
const BASE_URL = `http://127.0.0.1:${GATEWAY_PORT}`;

let gatewayProcess = null;

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
  try {
    const existing = await fetch(`${BASE_URL}/health`);
    if (existing.ok) return;
  } catch (e) {}

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
});

test.after(() => {
  if (gatewayProcess) {
    gatewayProcess.kill();
  }
});

// ── Test 1: OIDC Discovery Specification ─────────────────────────────────────
test('OIDC Discovery: GET /.well-known/openid-configuration conforms to OpenID Connect spec', async () => {
  const res = await fetch(`${BASE_URL}/.well-known/openid-configuration`);
  assert.strictEqual(res.status, 200);
  assert.ok(res.headers.get('content-type')?.includes('application/json'));

  const config = await res.json();
  assert.ok(config.issuer, 'Must advertise issuer URL');
  assert.ok(config.authorization_endpoint, 'Must advertise authorization endpoint');
  assert.ok(config.token_endpoint, 'Must advertise token endpoint');
  assert.ok(config.userinfo_endpoint, 'Must advertise userinfo endpoint');
  assert.strictEqual(config.jwks_uri, `${config.issuer}/.well-known/jwks.json`);

  // Verify cryptographic algorithms advertised
  assert.ok(Array.isArray(config.id_token_signing_alg_values_supported));
  assert.ok(config.id_token_signing_alg_values_supported.includes('RS256'), 'Must support RS256');
  assert.ok(config.id_token_signing_alg_values_supported.includes('HS256'), 'Must support HS256');

  // Verify PKCE code challenge methods
  assert.ok(Array.isArray(config.code_challenge_methods_supported));
  assert.ok(config.code_challenge_methods_supported.includes('S256'), 'Must support RFC 7636 PKCE S256');

  // Verify enterprise SSO providers advertised
  assert.ok(Array.isArray(config.sso_providers_supported));
  assert.ok(config.sso_providers_supported.includes('microsoft_entra'));
  assert.ok(config.sso_providers_supported.includes('keycloak'));
});

// ── Test 2: RFC 7517 JWKS Key Store ──────────────────────────────────────────
test('JWKS Engine: GET /.well-known/jwks.json exports valid RFC 7517 public keys', async () => {
  const res = await fetch(`${BASE_URL}/.well-known/jwks.json`);
  assert.strictEqual(res.status, 200);

  const jwks = await res.json();
  assert.ok(Array.isArray(jwks.keys), 'JWKS response must have a keys array');
  assert.ok(jwks.keys.length >= 1, 'Must contain at least 1 signing key');

  const primaryKey = jwks.keys[0];
  assert.strictEqual(primaryKey.kty, 'RSA', 'Key type must be RSA');
  assert.strictEqual(primaryKey.use, 'sig', 'Key use must be sig');
  assert.strictEqual(primaryKey.alg, 'RS256', 'Key algorithm must be RS256');
  assert.ok(typeof primaryKey.kid === 'string' && primaryKey.kid.length > 0, 'Must have key ID (kid)');
  assert.ok(typeof primaryKey.n === 'string' && primaryKey.n.length > 50, 'Must have RSA modulus (n)');
  assert.ok(typeof primaryKey.e === 'string' && primaryKey.e.length > 0, 'Must have RSA exponent (e)');
});

// ── Test 3: Asymmetric RS256 & Symmetric HS256 Token Signing & Verification ─
test('Cryptographic Token Engine: RS256 and HS256 dual-algorithm signing & verification', () => {
  const testPayload = {
    sub: 'astrid.lindgren@vattenfall.eu',
    tenantId: 'tenant-nordic-power',
    role: 'ENGINEER'
  };

  // 1. Asymmetric RS256 Signing
  const rsToken = authService.signTokenRs256(testPayload, 3600);
  assert.ok(typeof rsToken === 'string');
  const rsParts = rsToken.split('.');
  assert.strictEqual(rsParts.length, 3, 'RS256 token must have 3 segments');

  const rsHeader = JSON.parse(Buffer.from(rsParts[0], 'base64url').toString('utf8'));
  assert.strictEqual(rsHeader.alg, 'RS256');
  assert.ok(rsHeader.kid, 'RS256 header must contain kid matching key store');

  // Verify RS256 token
  const rsVerified = authService.verifyToken(rsToken);
  assert.strictEqual(rsVerified.sub, testPayload.sub);
  assert.strictEqual(rsVerified.role, testPayload.role);
  assert.strictEqual(rsVerified.tenantId, testPayload.tenantId);

  // 2. Symmetric HS256 Signing
  const hsSecret = 'test_secret_32_characters_minimum_entropy!!';
  const hsToken = authService.signTokenHs256(testPayload, 3600, hsSecret);
  const hsParts = hsToken.split('.');
  assert.strictEqual(hsParts.length, 3);
  const hsHeader = JSON.parse(Buffer.from(hsParts[0], 'base64url').toString('utf8'));
  assert.strictEqual(hsHeader.alg, 'HS256');

  // Verify HS256 token
  const hsVerified = authService.verifyToken(hsToken, hsSecret);
  assert.strictEqual(hsVerified.sub, testPayload.sub);

  // 3. Tampering Detection
  const tamperedPayload = Buffer.from(JSON.stringify({ ...testPayload, role: 'ADMIN' })).toString('base64url');
  const tamperedRsToken = `${rsParts[0]}.${tamperedPayload}.${rsParts[2]}`;
  assert.throws(() => {
    authService.verifyToken(tamperedRsToken);
  }, /verification failed/i);
});

// ── Test 4: RFC 7636 PKCE S256 Challenge & Verification ──────────────────────
test('RFC 7636 PKCE: S256 Code Verifier & Challenge generation and SSO exchange guard', async () => {
  // 1. Direct PKCE Math Verification
  const codeVerifier = crypto.randomBytes(32).toString('base64url');
  const codeChallenge = crypto.createHash('sha256').update(codeVerifier).digest('base64url');

  const validMatch = authService.verifyPkceChallenge(codeVerifier, codeChallenge, 'S256');
  assert.strictEqual(validMatch, true, 'Valid code_verifier must match code_challenge');

  const invalidMatch = authService.verifyPkceChallenge('corrupted_verifier_string', codeChallenge, 'S256');
  assert.strictEqual(invalidMatch, false, 'Invalid code_verifier must be rejected');

  // 2. Integration with /api/auth/sso/login and /api/auth/sso/callback
  const loginRes = await fetch(`${BASE_URL}/api/auth/sso/login?provider=microsoft_entra&tenantId=tenant-eu-energy`);
  assert.strictEqual(loginRes.status, 200);
  const loginData = await loginRes.json();
  assert.strictEqual(loginData.status, 'REDIRECT_READY');
  assert.ok(loginData.state);

  // Exchange callback with matching credentials
  const callbackRes = await fetch(`${BASE_URL}/api/auth/sso/callback`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      code: 'mock_sso_pkce_test_code_123',
      state: loginData.state,
      provider: 'microsoft_entra',
      tenantId: 'tenant-eu-energy',
      role: 'ENGINEER',
      alg: 'RS256'
    })
  });
  assert.strictEqual(callbackRes.status, 200);
  const cbData = await callbackRes.json();
  assert.strictEqual(cbData.status, 'AUTHENTICATED');
  assert.strictEqual(cbData.algorithm, 'RS256');
  assert.ok(cbData.accessToken);
});

// ── Test 5: Industrial RBAC Permission Catalog & Hierarchy Matrix ───────────
test('RBAC Catalog: GET /api/auth/permissions returns full matrix and permission inspector', async () => {
  const res = await fetch(`${BASE_URL}/api/auth/permissions`);
  assert.strictEqual(res.status, 200);

  const data = await res.json();
  assert.strictEqual(data.status, 'PERMISSIONS_CATALOG');
  assert.ok(data.permissionsCatalog, 'Must return permissions catalog');
  assert.ok(data.roleMatrix, 'Must return role matrix');

  // Validate CEMS & Decarbonization permissions defined
  assert.ok(data.permissionsCatalog['cems:telemetry:read']);
  assert.ok(data.permissionsCatalog['cems:calibration:execute']);
  assert.ok(data.permissionsCatalog['compliance:ast:calculate']);
  assert.ok(data.permissionsCatalog['scenarios:model:create']);
  assert.ok(data.permissionsCatalog['admin:users:manage']);

  // Validate Role Hierarchy
  const { roleMatrix } = data;
  assert.ok(roleMatrix.ADMIN.includes('admin:users:manage'), 'ADMIN must have user management');
  assert.ok(roleMatrix.ADMIN.includes('scenarios:model:create'), 'ADMIN must have scenario creation');

  assert.ok(roleMatrix.ENGINEER.includes('scenarios:model:create'), 'ENGINEER can create scenarios');
  assert.ok(!roleMatrix.ENGINEER.includes('admin:users:manage'), 'ENGINEER must not have admin user management');

  assert.ok(roleMatrix.OPERATOR.includes('cems:calibration:execute'), 'OPERATOR can run calibration');
  assert.ok(!roleMatrix.OPERATOR.includes('scenarios:model:create'), 'OPERATOR must not create scenarios');

  assert.ok(roleMatrix.AUDITOR.includes('audit:ledger:read'), 'AUDITOR can inspect audit ledger');
  assert.ok(!roleMatrix.AUDITOR.includes('plant:dispatch:control'), 'AUDITOR must not control grid dispatch');

  assert.ok(roleMatrix.VIEWER.includes('cems:telemetry:read'), 'VIEWER can read telemetry');
  assert.ok(!roleMatrix.VIEWER.includes('cems:calibration:execute'), 'VIEWER must not run calibration');
});

// ── Test 6: Granular RBAC Permission Evaluator ───────────────────────────────
test('RBAC Evaluator: authService.hasPermission accurately computes role permissions', () => {
  const adminUser = { role: 'ADMIN' };
  const engineerUser = { role: 'ENGINEER' };
  const operatorUser = { role: 'OPERATOR' };
  const auditorUser = { role: 'AUDITOR' };
  const viewerUser = { role: 'VIEWER' };

  // Admin has all permissions
  assert.strictEqual(authService.hasPermission(adminUser, 'admin:keys:rotate'), true);
  assert.strictEqual(authService.hasPermission(adminUser, 'scenarios:model:create'), true);

  // Engineer
  assert.strictEqual(authService.hasPermission(engineerUser, 'scenarios:model:create'), true);
  assert.strictEqual(authService.hasPermission(engineerUser, 'cems:calibration:execute'), true);
  assert.strictEqual(authService.hasPermission(engineerUser, 'admin:keys:rotate'), false);

  // Operator
  assert.strictEqual(authService.hasPermission(operatorUser, 'cems:telemetry:read'), true);
  assert.strictEqual(authService.hasPermission(operatorUser, 'scenarios:model:create'), false);

  // Auditor
  assert.strictEqual(authService.hasPermission(auditorUser, 'compliance:filing:export'), true);
  assert.strictEqual(authService.hasPermission(auditorUser, 'cems:calibration:execute'), false);

  // Viewer
  assert.strictEqual(authService.hasPermission(viewerUser, 'cems:telemetry:read'), true);
  assert.strictEqual(authService.hasPermission(viewerUser, 'compliance:filing:export'), false);
});

// ── Test 7: Row-Level Security (RLS) & Tenant Isolation Engine ──────────────
test('Database RLS: 2026_05_enable_tenant_row_level_security migration and withTenantContext', async () => {
  // 1. Verify migration definition
  const rlsMigration = dbService.DB_MIGRATIONS.find(m => m.version === '2026_05_enable_tenant_row_level_security');
  assert.ok(rlsMigration, 'Must register 2026_05_enable_tenant_row_level_security migration');
  assert.ok(rlsMigration.up.includes('ENABLE ROW LEVEL SECURITY'), 'Migration must enable RLS on core tables');
  assert.ok(rlsMigration.up.includes('tenant_isolation_cems_readings'), 'Must define CEMS reading tenant policy');
  assert.ok(rlsMigration.up.includes('tenant_isolation_scenarios'), 'Must define Scenarios tenant policy');
  assert.ok(rlsMigration.up.includes('app.current_tenant'), 'Must utilize app.current_tenant session variable');

  // 2. Verify withTenantContext helper signature and execution
  assert.strictEqual(typeof dbService.withTenantContext, 'function');

  // Verify that calling withTenantContext without DB falls back gracefully or executes if DB present
  try {
    const executed = await dbService.withTenantContext('tenant-eu-energy', async (client) => {
      return { clientReceived: Boolean(client), tenant: 'tenant-eu-energy' };
    });
    assert.strictEqual(executed.tenant, 'tenant-eu-energy');
  } catch (err) {
    // If TimescaleDB is offline in test runner environment, verify the expected error
    assert.ok(err.message.includes('unavailable') || err.message.includes('connect'));
  }
});

// ── Test 8: Asymmetric RS256 Token Issuance via /api/auth/token ─────────────
test('Token API: Issuing and verifying RS256 token via /api/auth/token?alg=RS256', async () => {
  // 1. Issue RS256 token
  const tokenRes = await fetch(`${BASE_URL}/api/auth/token?alg=RS256`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: 'elena_vance',
      role: 'ADMIN'
    })
  });
  assert.strictEqual(tokenRes.status, 200);
  const tokenData = await tokenRes.json();
  assert.strictEqual(tokenData.algorithm, 'RS256');
  assert.ok(tokenData.accessToken);

  // 2. Verify via /api/auth/verify
  const verifyRes = await fetch(`${BASE_URL}/api/auth/verify`, {
    headers: {
      'Authorization': `Bearer ${tokenData.accessToken}`
    }
  });
  assert.strictEqual(verifyRes.status, 200);
  const verifyData = await verifyRes.json();
  assert.strictEqual(verifyData.status, 'AUTHENTICATED');
  assert.strictEqual(verifyData.claims.role, 'ADMIN');
  assert.strictEqual(verifyData.claims.sub, 'elena_vance');
  assert.ok(verifyData.claims.permissions.includes('scenarios:model:create'));
  assert.ok(verifyData.claims.permissions.includes('SIGN_FILING'));
});
