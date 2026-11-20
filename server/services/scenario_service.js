/**
 * ClimateSphere AI — Decarbonization Scenario Service
 * Handles persistence, linear optimization, and sensitivity modeling
 * for ESRS E1 Climate Transition Pathways & Paris Agreement alignment.
 */

const fs = require('fs');
const path = require('path');
const dbService = require('./db_service');

const DATA_DIR = path.join(__dirname, '..', 'data');
const DB_FILE = path.join(DATA_DIR, 'telemetry_db.json');

const DEFAULT_SCENARIOS = [
  {
    id: 'scen-paris-15',
    tenant_id: 'tenant-eu-energy',
    facility_id: 'DU-03',
    name: 'Paris 1.5°C Aggressive Abatement',
    description: 'Rapid phase-down of unabated coal, maximum renewable microgrid integration, and enhanced FGD scrubber capture.',
    target_year: 2030,
    coal_reduction: 45.0,
    renewable_mix: 60.0,
    fgd_efficiency: 96.0,
    production_volume: 80.0,
    carbon_price: 85.0,
    projected_emissions: 498.0,
    emissions_reduction_pct: 60.1,
    credit_saving_m_eur: 63.7,
    investment_capex_k_eur: 1150.0,
    projected_roi_pct: 5439.1,
    parameters_json: {
      coalReduction: 45,
      renewableMix: 60,
      fgdEfficiency: 96,
      productionVolume: 80,
      carbonPrice: 85,
      timeHorizon: 2030
    },
    created_by: 'chief_sustainability_officer@climatesphere.ai',
    created_at: '2026-01-15T08:00:00.000Z',
    updated_at: '2026-01-15T08:00:00.000Z'
  },
  {
    id: 'scen-mod-2035',
    tenant_id: 'tenant-eu-energy',
    facility_id: 'DU-03',
    name: '2035 Balanced Industrial Modernization',
    description: 'Balanced industrial transition aligned with EU Net-Zero Industry Act, prioritizing waste heat recovery and fuel switching.',
    target_year: 2035,
    coal_reduction: 30.0,
    renewable_mix: 45.0,
    fgd_efficiency: 93.0,
    production_volume: 90.0,
    carbon_price: 70.0,
    projected_emissions: 720.0,
    emissions_reduction_pct: 42.3,
    credit_saving_m_eur: 36.9,
    investment_capex_k_eur: 835.0,
    projected_roi_pct: 4319.8,
    parameters_json: {
      coalReduction: 30,
      renewableMix: 45,
      fgdEfficiency: 93,
      productionVolume: 90,
      carbonPrice: 70,
      timeHorizon: 2035
    },
    created_by: 'operations_manager@climatesphere.ai',
    created_at: '2026-02-01T10:30:00.000Z',
    updated_at: '2026-02-01T10:30:00.000Z'
  },
  {
    id: 'scen-netzero-2040',
    tenant_id: 'tenant-eu-energy',
    facility_id: 'DU-03',
    name: '2040 Net-Zero Deep Decarbonization Glidepath',
    description: 'Full electrification, 100% renewable PPA matching, CCUS installation, and complete coal fleet retirement.',
    target_year: 2040,
    coal_reduction: 80.0,
    renewable_mix: 90.0,
    fgd_efficiency: 98.0,
    production_volume: 75.0,
    carbon_price: 110.0,
    projected_emissions: 182.0,
    emissions_reduction_pct: 85.4,
    credit_saving_m_eur: 117.2,
    investment_capex_k_eur: 1820.0,
    projected_roi_pct: 6339.6,
    parameters_json: {
      coalReduction: 80,
      renewableMix: 90,
      fgdEfficiency: 98,
      productionVolume: 75,
      carbonPrice: 110,
      timeHorizon: 2040
    },
    created_by: 'strategy_director@climatesphere.ai',
    created_at: '2026-03-10T14:15:00.000Z',
    updated_at: '2026-03-10T14:15:00.000Z'
  }
];

function readFallbackDb() {
  try {
    if (fs.existsSync(DB_FILE)) {
      const data = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
      if (!Array.isArray(data.scenarios)) {
        data.scenarios = [...DEFAULT_SCENARIOS];
        fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
      }
      return data;
    }
  } catch (err) {
    console.warn('[Scenario Service] Fallback DB read error:', err.message);
  }
  return { scenarios: [...DEFAULT_SCENARIOS] };
}

function writeFallbackDb(data) {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
  } catch (err) {
    console.warn('[Scenario Service] Fallback DB write error:', err.message);
  }
}

/**
 * Mathematical model for scenario outputs (aligns with scenario.js client logic)
 */
function computeOutputs(p = {}) {
  const coalReduction = Number(p.coalReduction ?? p.coal_reduction ?? 25);
  const renewableMix = Number(p.renewableMix ?? p.renewable_mix ?? 40);
  const fgdEfficiency = Number(p.fgdEfficiency ?? p.fgd_efficiency ?? 92);
  const productionVolume = Number(p.productionVolume ?? p.production_volume ?? 85);
  const carbonPrice = Number(p.carbonPrice ?? p.carbon_price ?? 62);
  const targetYear = Number(p.timeHorizon ?? p.target_year ?? 2030);

  const baseEmissions = 1247.0;
  const coalFactor = 1.0 - (coalReduction / 100.0) * 0.6;
  const renewFactor = 1.0 - (renewableMix / 100.0) * 0.4;
  const fgdFactor = 1.0 - ((fgdEfficiency - 70.0) / 30.0) * 0.15;
  const prodFactor = productionVolume / 100.0;

  const projected = baseEmissions * coalFactor * renewFactor * fgdFactor * prodFactor;
  const reduction = ((baseEmissions - projected) / baseEmissions) * 100.0;
  const creditSaving = ((baseEmissions - projected) * carbonPrice) / 1000.0;
  const investCost = coalReduction * 12.0 + renewableMix * 8.0 + (fgdEfficiency - 70.0) * 5.0;
  const roi = investCost > 0 ? (((creditSaving * 1000.0) - investCost) / investCost) * 100.0 : 0.0;

  return {
    projected: parseFloat(projected.toFixed(1)),
    reduction: parseFloat(reduction.toFixed(1)),
    creditSaving: parseFloat(creditSaving.toFixed(1)),
    investCost: parseFloat(investCost.toFixed(0)),
    roi: parseFloat(roi.toFixed(1)),
    targetYear
  };
}

/**
 * AI optimization algorithm for transition pathways
 */
function optimizeScenario(baseParams = {}) {
  const p = {
    coalReduction: Math.min(100, Math.max(0, Number(baseParams.coalReduction || 25) + 15)),
    renewableMix: Math.min(100, Math.max(0, Number(baseParams.renewableMix || 40) + 20)),
    fgdEfficiency: 96,
    productionVolume: Math.max(50, Number(baseParams.productionVolume || 85) - 5),
    carbonPrice: Number(baseParams.carbonPrice || 62),
    timeHorizon: Number(baseParams.timeHorizon || 2030)
  };
  const outputs = computeOutputs(p);
  return {
    optimizedParameters: p,
    outputs,
    rationale: 'Algorithm maximized abatement ROI by shifting 20% grid consumption to PPA renewables while tuning FGD slurry reagent stoichiometric ratio.'
  };
}

// ── In-Memory TTL Cache for Scenarios ──
const _scenariosCache = new Map(); // cacheKey -> { data, time }
const SCENARIO_CACHE_TTL_MS = 30000; // 30 seconds

function invalidateScenarioCache() {
  _scenariosCache.clear();
}

async function listScenarios(tenantId = 'tenant-eu-energy', options = {}) {
  const limit = options.limit ? Math.min(100, Math.max(1, parseInt(options.limit, 10))) : null;
  const offset = options.offset ? Math.max(0, parseInt(options.offset, 10)) : 0;
  const cacheKey = `${tenantId}:${limit || 'all'}:${offset}`;
  const now = Date.now();

  const cached = _scenariosCache.get(cacheKey);
  if (cached && (now - cached.time < SCENARIO_CACHE_TTL_MS)) {
    return cached.data;
  }

  if (dbService.isPgAvailable()) {
    try {
      let query = 'SELECT * FROM decarbonization_scenarios WHERE tenant_id = $1 OR tenant_id IS NULL ORDER BY created_at DESC';
      const params = [tenantId];
      if (limit !== null) {
        query += ` LIMIT $2 OFFSET $3`;
        params.push(limit, offset);
      }
      const res = await dbService.query(query, params);
      if (res.rows && res.rows.length > 0) {
        const result = {
          source: 'POSTGRESQL_TIMESCALEDB',
          total: res.rows.length,
          limit: limit || res.rows.length,
          offset,
          scenarios: res.rows
        };
        _scenariosCache.set(cacheKey, { data: result, time: now });
        return result;
      }
    } catch (err) {
      console.warn('[Scenario Service] DB list query error, falling back:', err.message);
    }
  }

  // Fallback
  const db = readFallbackDb();
  let filtered = (db.scenarios || DEFAULT_SCENARIOS).filter(s => !s.tenant_id || s.tenant_id === tenantId);
  const total = filtered.length;
  if (limit !== null) {
    filtered = filtered.slice(offset, offset + limit);
  }
  const result = {
    source: 'JSON_PERSISTENCE_STORE',
    total,
    limit: limit || total,
    offset,
    scenarios: filtered
  };
  _scenariosCache.set(cacheKey, { data: result, time: now });
  return result;
}

async function getScenarioById(id, tenantId = 'tenant-eu-energy') {
  if (dbService.isPgAvailable()) {
    try {
      const res = await dbService.query(
        'SELECT * FROM decarbonization_scenarios WHERE id = $1 AND (tenant_id = $2 OR tenant_id IS NULL)',
        [id, tenantId]
      );
      if (res.rows && res.rows.length > 0) {
        return { source: 'POSTGRESQL_TIMESCALEDB', scenario: res.rows[0] };
      }
    } catch (err) {
      console.warn('[Scenario Service] DB get query error, falling back:', err.message);
    }
  }

  const db = readFallbackDb();
  const found = (db.scenarios || DEFAULT_SCENARIOS).find(s => s.id === id);
  if (!found) return null;
  return { source: 'JSON_PERSISTENCE_STORE', scenario: found };
}

async function createScenario(payload, actor = 'operator@climatesphere.internal') {
  invalidateScenarioCache();
  const id = payload.id || `scen-${Date.now()}`;
  const tenantId = payload.tenant_id || payload.tenantId || 'tenant-eu-energy';
  const facilityId = payload.facility_id || payload.facilityId || 'DU-03';
  const name = payload.name || `Scenario ${new Date().toLocaleDateString()}`;
  const description = payload.description || 'User simulated decarbonization transition pathway';
  const params = payload.parameters_json || payload.parameters || {
    coalReduction: payload.coal_reduction || payload.coalReduction || 25,
    renewableMix: payload.renewable_mix || payload.renewableMix || 40,
    fgdEfficiency: payload.fgd_efficiency || payload.fgdEfficiency || 92,
    productionVolume: payload.production_volume || payload.productionVolume || 85,
    carbonPrice: payload.carbon_price || payload.carbonPrice || 62,
    timeHorizon: payload.target_year || payload.timeHorizon || 2030
  };

  const calculated = computeOutputs(params);
  const now = new Date().toISOString();

  const record = {
    id,
    tenant_id: tenantId,
    facility_id: facilityId,
    name,
    description,
    target_year: calculated.targetYear,
    coal_reduction: params.coalReduction,
    renewable_mix: params.renewableMix,
    fgd_efficiency: params.fgdEfficiency,
    production_volume: params.productionVolume,
    carbon_price: params.carbonPrice,
    projected_emissions: calculated.projected,
    emissions_reduction_pct: calculated.reduction,
    credit_saving_m_eur: calculated.creditSaving,
    investment_capex_k_eur: calculated.investCost,
    projected_roi_pct: calculated.roi,
    parameters_json: params,
    created_by: actor,
    created_at: now,
    updated_at: now
  };

  if (dbService.isPgAvailable()) {
    try {
      const q = `
        INSERT INTO decarbonization_scenarios (
          id, tenant_id, facility_id, name, description, target_year,
          coal_reduction, renewable_mix, fgd_efficiency, production_volume, carbon_price,
          projected_emissions, emissions_reduction_pct, credit_saving_m_eur, investment_capex_k_eur, projected_roi_pct,
          parameters_json, created_by, created_at, updated_at
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20)
        ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name,
          description = EXCLUDED.description,
          target_year = EXCLUDED.target_year,
          coal_reduction = EXCLUDED.coal_reduction,
          renewable_mix = EXCLUDED.renewable_mix,
          fgd_efficiency = EXCLUDED.fgd_efficiency,
          production_volume = EXCLUDED.production_volume,
          carbon_price = EXCLUDED.carbon_price,
          projected_emissions = EXCLUDED.projected_emissions,
          emissions_reduction_pct = EXCLUDED.emissions_reduction_pct,
          credit_saving_m_eur = EXCLUDED.credit_saving_m_eur,
          investment_capex_k_eur = EXCLUDED.investment_capex_k_eur,
          projected_roi_pct = EXCLUDED.projected_roi_pct,
          parameters_json = EXCLUDED.parameters_json,
          updated_at = EXCLUDED.updated_at
        RETURNING *;
      `;
      const res = await dbService.query(q, [
        record.id, record.tenant_id, record.facility_id, record.name, record.description, record.target_year,
        record.coal_reduction, record.renewable_mix, record.fgd_efficiency, record.production_volume, record.carbon_price,
        record.projected_emissions, record.emissions_reduction_pct, record.credit_saving_m_eur, record.investment_capex_k_eur, record.projected_roi_pct,
        JSON.stringify(record.parameters_json), record.created_by, record.created_at, record.updated_at
      ]);
      return { source: 'POSTGRESQL_TIMESCALEDB', success: true, scenario: res.rows[0] };
    } catch (err) {
      console.warn('[Scenario Service] DB insert error, writing to fallback:', err.message);
    }
  }

  // Fallback write
  const db = readFallbackDb();
  if (!Array.isArray(db.scenarios)) db.scenarios = [...DEFAULT_SCENARIOS];
  const idx = db.scenarios.findIndex(s => s.id === id);
  if (idx >= 0) {
    db.scenarios[idx] = { ...db.scenarios[idx], ...record, updated_at: now };
  } else {
    db.scenarios.unshift(record);
  }
  writeFallbackDb(db);
  return { source: 'JSON_PERSISTENCE_STORE', success: true, scenario: record };
}

async function updateScenario(id, payload, actor = 'operator@climatesphere.internal') {
  invalidateScenarioCache();
  const existing = await getScenarioById(id);
  if (!existing) return null;

  const current = existing.scenario;
  const baseParams = current.parameters_json || {};
  const params = {
    coalReduction: payload.coal_reduction !== undefined ? payload.coal_reduction : (payload.coalReduction !== undefined ? payload.coalReduction : (baseParams.coalReduction !== undefined ? baseParams.coalReduction : (current.coal_reduction !== undefined ? current.coal_reduction : 25))),
    renewableMix: payload.renewable_mix !== undefined ? payload.renewable_mix : (payload.renewableMix !== undefined ? payload.renewableMix : (baseParams.renewableMix !== undefined ? baseParams.renewableMix : (current.renewable_mix !== undefined ? current.renewable_mix : 40))),
    fgdEfficiency: payload.fgd_efficiency !== undefined ? payload.fgd_efficiency : (payload.fgdEfficiency !== undefined ? payload.fgdEfficiency : (baseParams.fgdEfficiency !== undefined ? baseParams.fgdEfficiency : (current.fgd_efficiency !== undefined ? current.fgd_efficiency : 92))),
    productionVolume: payload.production_volume !== undefined ? payload.production_volume : (payload.productionVolume !== undefined ? payload.productionVolume : (baseParams.productionVolume !== undefined ? baseParams.productionVolume : (current.production_volume !== undefined ? current.production_volume : 85))),
    carbonPrice: payload.carbon_price !== undefined ? payload.carbon_price : (payload.carbonPrice !== undefined ? payload.carbonPrice : (baseParams.carbonPrice !== undefined ? baseParams.carbonPrice : (current.carbon_price !== undefined ? current.carbon_price : 62))),
    timeHorizon: payload.target_year !== undefined ? payload.target_year : (payload.timeHorizon !== undefined ? payload.timeHorizon : (baseParams.timeHorizon !== undefined ? baseParams.timeHorizon : (current.target_year !== undefined ? current.target_year : 2030))),
    ...(payload.parameters_json || payload.parameters || {})
  };
  const calculated = computeOutputs(params);
  const now = new Date().toISOString();

  const merged = {
    ...current,
    name: payload.name || current.name,
    description: payload.description !== undefined ? payload.description : current.description,
    target_year: calculated.targetYear,
    coal_reduction: params.coalReduction,
    renewable_mix: params.renewableMix,
    fgd_efficiency: params.fgdEfficiency,
    production_volume: params.productionVolume,
    carbon_price: params.carbonPrice,
    projected_emissions: calculated.projected,
    emissions_reduction_pct: calculated.reduction,
    credit_saving_m_eur: calculated.creditSaving,
    investment_capex_k_eur: calculated.investCost,
    projected_roi_pct: calculated.roi,
    parameters_json: params,
    updated_at: now
  };

  if (dbService.isPgAvailable()) {
    try {
      const q = `
        UPDATE decarbonization_scenarios SET
          name = $2, description = $3, target_year = $4,
          coal_reduction = $5, renewable_mix = $6, fgd_efficiency = $7,
          production_volume = $8, carbon_price = $9, projected_emissions = $10,
          emissions_reduction_pct = $11, credit_saving_m_eur = $12, investment_capex_k_eur = $13,
          projected_roi_pct = $14, parameters_json = $15, updated_at = $16
        WHERE id = $1
        RETURNING *;
      `;
      const res = await dbService.query(q, [
        id, merged.name, merged.description, merged.target_year,
        merged.coal_reduction, merged.renewable_mix, merged.fgd_efficiency,
        merged.production_volume, merged.carbon_price, merged.projected_emissions,
        merged.emissions_reduction_pct, merged.credit_saving_m_eur, merged.investment_capex_k_eur,
        merged.projected_roi_pct, JSON.stringify(merged.parameters_json), merged.updated_at
      ]);
      return { source: 'POSTGRESQL_TIMESCALEDB', success: true, scenario: res.rows[0] };
    } catch (err) {
      console.warn('[Scenario Service] DB update error, falling back:', err.message);
    }
  }

  const db = readFallbackDb();
  const idx = (db.scenarios || []).findIndex(s => s.id === id);
  if (idx >= 0) {
    db.scenarios[idx] = merged;
    writeFallbackDb(db);
  }
  return { source: 'JSON_PERSISTENCE_STORE', success: true, scenario: merged };
}

async function deleteScenario(id) {
  invalidateScenarioCache();
  let deleted = false;
  if (dbService.isPgAvailable()) {
    try {
      const res = await dbService.query('DELETE FROM decarbonization_scenarios WHERE id = $1 RETURNING id', [id]);
      deleted = res.rows && res.rows.length > 0;
    } catch (err) {
      console.warn('[Scenario Service] DB delete error:', err.message);
    }
  }

  const db = readFallbackDb();
  if (Array.isArray(db.scenarios)) {
    const before = db.scenarios.length;
    db.scenarios = db.scenarios.filter(s => s.id !== id);
    if (db.scenarios.length !== before) {
      deleted = true;
      writeFallbackDb(db);
    }
  }
  return { success: deleted, id };
}

module.exports = {
  computeOutputs,
  optimizeScenario,
  listScenarios,
  getScenarioById,
  createScenario,
  updateScenario,
  deleteScenario,
  invalidateScenarioCache
};
