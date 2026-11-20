/**
 * ClimateSphere AI — Phase 1 Architecture & Persistence Verification Test Suite
 * Tests:
 *   1. Decarbonization Scenarios REST CRUD API (/api/scenarios)
 *   2. Linear Abatement Model & AI Optimization Engine
 *   3. Dynamic Industrial Assets Hierarchy API (/api/plants, /api/equipment, /api/permits)
 *   4. TimescaleDB Service & Database Migrations (2026_04_decarbonization_scenarios)
 */

import assert from 'node:assert';
import test from 'node:test';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

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

test('Decarbonization Scenario: GET /api/scenarios returns seeded scenarios', async () => {
  const res = await fetch(`${BASE_URL}/api/scenarios`);
  assert.strictEqual(res.status, 200);
  const data = await res.json();
  assert.ok(data.scenarios && Array.isArray(data.scenarios), 'Response must include scenarios array');
  assert.ok(data.scenarios.length >= 3, 'Should include at least 3 baseline reference scenarios');
  
  const parisScen = data.scenarios.find(s => s.id === 'scen-paris-15' || s.name.includes('Paris'));
  assert.ok(parisScen, 'Must include Paris 1.5°C scenario');
  assert.strictEqual(parisScen.target_year, 2030);
  assert.ok(parisScen.projected_roi_pct > 0, 'Scenario should compute positive ROI');
});

test('Decarbonization Scenario: Full Lifecycle CRUD (Create, Read, Update, Delete)', async () => {
  const testId = `scen-test-${Date.now()}`;
  
  // 1. Create
  const createRes = await fetch(`${BASE_URL}/api/scenarios`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      id: testId,
      name: 'Automated Hydrogen Transition Test',
      facility_id: 'DU-03',
      target_year: 2032,
      coal_reduction: 50,
      renewable_mix: 65,
      fgd_efficiency: 97,
      production_volume: 85,
      carbon_price: 90
    })
  });
  assert.strictEqual(createRes.status, 201);
  const created = await createRes.json();
  assert.strictEqual(created.success, true);
  assert.strictEqual(created.scenario.id, testId);
  assert.ok(created.scenario.projected_emissions < 1247, 'Emissions should be reduced vs 1247 baseline');

  // 2. Read single
  const getRes = await fetch(`${BASE_URL}/api/scenarios/${testId}`);
  assert.strictEqual(getRes.status, 200);
  const single = await getRes.json();
  assert.strictEqual(single.scenario.name, 'Automated Hydrogen Transition Test');

  // 3. Update
  const updateRes = await fetch(`${BASE_URL}/api/scenarios/${testId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Automated Hydrogen Transition Test (Updated)',
      coal_reduction: 70
    })
  });
  assert.strictEqual(updateRes.status, 200);
  const updated = await updateRes.json();
  assert.strictEqual(updated.scenario.name, 'Automated Hydrogen Transition Test (Updated)');
  assert.strictEqual(updated.scenario.coal_reduction, 70);

  // 4. Delete
  const delRes = await fetch(`${BASE_URL}/api/scenarios/${testId}`, { method: 'DELETE' });
  assert.strictEqual(delRes.status, 200);
  const delData = await delRes.json();
  assert.strictEqual(delData.success, true);

  // 5. Verify 404 after delete
  const verifyRes = await fetch(`${BASE_URL}/api/scenarios/${testId}`);
  assert.strictEqual(verifyRes.status, 404);
});

test('Decarbonization Scenario: POST /api/scenarios/optimize returns AI recommendations', async () => {
  const res = await fetch(`${BASE_URL}/api/scenarios/optimize`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      coalReduction: 30,
      renewableMix: 40,
      carbonPrice: 70
    })
  });
  assert.strictEqual(res.status, 200);
  const data = await res.json();
  assert.strictEqual(data.success, true);
  assert.ok(data.optimizedParameters, 'Must return optimized parameters');
  assert.ok(data.optimizedParameters.coalReduction > 30, 'Should recommend higher coal reduction');
  assert.ok(data.rationale, 'Must provide optimization rationale');
});

test('Industrial Assets: GET /api/plants returns multi-unit plant topology', async () => {
  const res = await fetch(`${BASE_URL}/api/plants`);
  assert.strictEqual(res.status, 200);
  const data = await res.json();
  assert.ok(data.plants && Array.isArray(data.plants), 'Should return plants array');
  assert.ok(data.plants.length >= 5, 'Should return at least 5 industrial plants');

  const du = data.plants.find(p => p.id === 'plt-du-03' || p.facilityId === 'DU-03');
  assert.ok(du, 'Must include DU-03 plant');
  assert.ok(du.units && du.units.length > 0, 'Plant must contain monitored units');
});

test('Industrial Assets: GET /api/plants/:id returns plant detail with permits', async () => {
  const res = await fetch(`${BASE_URL}/api/plants/DU-03`);
  assert.strictEqual(res.status, 200);
  const data = await res.json();
  assert.ok(data.plant, 'Must return plant object');
  assert.ok(data.plant.regulatoryPermits && Array.isArray(data.plant.regulatoryPermits), 'Plant must include permits');
  assert.ok(data.plant.regulatoryPermits.some(p => p.pollutant === 'SO2'), 'Must include SO2 permit');
});

test('Industrial Assets: GET /api/equipment returns asset catalog with health scores', async () => {
  const res = await fetch(`${BASE_URL}/api/equipment`);
  assert.strictEqual(res.status, 200);
  const data = await res.json();
  assert.ok(data.equipment && Array.isArray(data.equipment), 'Should return equipment array');
  assert.ok(data.equipment.length > 0, 'Equipment list must not be empty');
  const first = data.equipment[0];
  assert.ok(first.healthScore !== undefined, 'Equipment must have healthScore');
  assert.ok(first.equipmentType, 'Equipment must have equipmentType');
});

test('Industrial Assets: Regulatory Permits CRUD (GET & POST /api/permits)', async () => {
  const testPermitNumber = `TEST-PERMIT-${Date.now()}`;
  
  // Create permit
  const createRes = await fetch(`${BASE_URL}/api/permits`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      facility_id: 'DU-03',
      permit_number: testPermitNumber,
      authority: 'District Government of Düsseldorf',
      framework: 'IED_2010_75_EU',
      pollutant: 'HCl',
      statutory_elv: 10.0,
      averaging_period: 'DAILY_AVERAGE',
      ref_o2_pct: 6.0
    })
  });
  assert.strictEqual(createRes.status, 201);
  const created = await createRes.json();
  assert.strictEqual(created.success, true);
  assert.strictEqual(created.permit.pollutant, 'HCl');

  // List permits
  const listRes = await fetch(`${BASE_URL}/api/permits?facility=DU-03`);
  assert.strictEqual(listRes.status, 200);
  const list = await listRes.json();
  assert.ok(list.permits.some(p => p.permit_number === testPermitNumber), 'List should contain new permit');
});

test('Database Migrations: Migration status and version 2026_04 registered', async () => {
  const authRes = await fetch(`${BASE_URL}/api/auth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'admin@climatesphere.ai', role: 'ADMIN' })
  });
  const authData = await authRes.json();
  const token = authData.accessToken;

  const res = await fetch(`${BASE_URL}/api/admin/migrations`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  assert.strictEqual(res.status, 200);
  const data = await res.json();
  assert.ok(data.availableMigrations, 'Must list available migrations');
  assert.ok(data.availableMigrations.includes('2026_04_decarbonization_scenarios'), 'Must include 2026_04 migration');
});

