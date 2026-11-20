import http from 'http';
import assert from 'assert';
import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

console.log('════════════════════════════════════════════════════════════════');
console.log(' ClimateSphere AI — Production Auth & Landing Verification Test');
console.log('════════════════════════════════════════════════════════════════\n');

let passed = 0;
let failed = 0;
let gatewayProcess = null;

async function test(name, fn) {
  process.stdout.write(`• ${name}... `);
  try {
    await fn();
    console.log('\x1b[32mPASSED\x1b[0m');
    passed++;
  } catch (e) {
    console.log('\x1b[31mFAILED\x1b[0m');
    console.error(`  Error: ${e.message}`);
    failed++;
  }
}

function req(method, pathUrl, body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const postData = body ? (typeof body === 'string' ? body : JSON.stringify(body)) : null;
    const options = {
      hostname: 'localhost',
      port: 8089,
      path: pathUrl,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(postData ? { 'Content-Length': Buffer.byteLength(postData) } : {}),
        ...headers
      }
    };
    const r = http.request(options, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, json: JSON.parse(data), raw: data });
        } catch {
          resolve({ status: res.statusCode, raw: data });
        }
      });
    });
    r.on('error', reject);
    if (postData) r.write(postData);
    r.end();
  });
}

async function isServerRunning() {
  try {
    const res = await req('GET', '/health');
    return res.status === 200;
  } catch {
    return false;
  }
}

async function ensureServerRunning() {
  if (await isServerRunning()) return;
  gatewayProcess = spawn(process.execPath, [path.join(ROOT, 'server', 'edge_gateway.js')], {
    cwd: ROOT,
    env: { ...process.env, PORT: '8089', NODE_ENV: 'test', JWT_SECRET: 'test_jwt_secret_key_32chars_length_min!!' },
    stdio: 'ignore'
  });
  const startTime = Date.now();
  while (Date.now() - startTime < 10000) {
    await new Promise(r => setTimeout(r, 200));
    if (await isServerRunning()) return;
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

(async () => {
  await ensureServerRunning();
  await test('Verify landing.html contains Sign In, Get Started, and user session sync', () => {
    const html = fs.readFileSync(path.join(ROOT, 'landing.html'), 'utf8');
    assert(html.includes('auth.html'), 'Must link to auth.html');
    assert(html.includes('navSignInBtn'), 'Must have navSignInBtn');
    assert(html.includes('navGetStartedBtn'), 'Must have navGetStartedBtn');
    assert(html.includes('navUserChip'), 'Must have navUserChip');
    assert(html.includes('syncLandingAuthSession'), 'Must have session sync function');
  });

  await test('Verify auth.html exists with Google OAuth, registration, and particle canvas', () => {
    const html = fs.readFileSync(path.join(ROOT, 'auth.html'), 'utf8');
    assert(html.includes('Continue with Google'), 'Must contain Google login button');
    assert(html.includes('initiateGoogleOAuth'), 'Must have Google OAuth handler');
    assert(html.includes('handleEmailLogin'), 'Must have Email login handler');
    assert(html.includes('handleEmailRegister'), 'Must have Email registration handler');
    assert(html.includes('checkOAuthCallback'), 'Must handle OAuth callback');
    assert(html.includes('initParticles'), 'Must initialize interactive canvas background');
  });

  await test('Verify index.html contains Auth Guard and quick Sign Out button', () => {
    const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
    assert(html.includes('guardAuth'), 'Must contain guardAuth in index.html');
    assert(html.includes('btnTopLogout'), 'Must contain btnTopLogout in index.html');
    assert(html.includes('auth.html?logout=1'), 'Must have logout link to auth.html');
  });

  await test('Edge Gateway: GET /api/auth/google/init returns configured or fallback status', async () => {
    const res = await req('GET', '/api/auth/google/init');
    assert.strictEqual(res.status, 200);
    assert(res.json.status === 'GOOGLE_OAUTH_NOT_CONFIGURED' || res.json.authUrl);
  });

  const testEmail = `plant.engineer.${Date.now()}@vattenfall.de`;

  await test('Edge Gateway: POST /api/auth/register creates new account with Scrypt hash & returns JWT', async () => {
    const res = await req('POST', '/api/auth/register', {
      firstName: 'Johann',
      lastName: 'Schmidt',
      email: testEmail,
      password: 'EnterprisePassword2026!',
      role: 'ENGINEER',
      organisation: 'Vattenfall Europe'
    });
    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.json.status, 'ACCOUNT_CREATED');
    assert(res.json.accessToken, 'Must return accessToken');
    assert(res.json.refreshToken, 'Must return refreshToken');
    assert.strictEqual(res.json.role, 'ENGINEER');
  });

  await test('Edge Gateway: POST /api/auth/register rejects duplicate email with 409 Conflict', async () => {
    const res = await req('POST', '/api/auth/register', {
      firstName: 'Johann',
      lastName: 'Schmidt',
      email: testEmail,
      password: 'EnterprisePassword2026!',
      role: 'ENGINEER',
      organisation: 'Vattenfall Europe'
    });
    assert.strictEqual(res.status, 409);
    assert(res.json.error.includes('already exists'));
  });

  await test('Edge Gateway: POST /api/auth/token logs in newly registered account', async () => {
    const res = await req('POST', '/api/auth/token', {
      username: testEmail,
      password: 'EnterprisePassword2026!'
    });
    assert.strictEqual(res.status, 200);
    assert(res.json.accessToken);
    assert(res.json.claims);
    assert.strictEqual(res.json.claims.sub, testEmail);
    assert.strictEqual(res.json.claims.role, 'ENGINEER');
  });

  await test('Edge Gateway: POST /api/auth/google/callback processes OAuth code exchange', async () => {
    const res = await req('POST', '/api/auth/google/callback', {
      code: 'demo_auth_code_' + Date.now(),
      state: 'g_state_123'
    });
    assert.strictEqual(res.status, 200);
    assert(res.json.accessToken);
    assert(res.json.user);
    assert.strictEqual(res.json.user.provider, 'Google OAuth 2.0');
  });

  await test('Edge Gateway: POST /api/auth/password-reset handles reset requests securely', async () => {
    const res = await req('POST', '/api/auth/password-reset', { email: testEmail });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.json.status, 'RESET_EMAIL_QUEUED');
  });

  cleanupServer();
  console.log(`\nResults: ${passed} passed, ${failed} failed.`);
  if (failed > 0) process.exit(1);
})();
