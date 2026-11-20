/**
 * ClimateSphere AI — Industrial Asset & Hierarchy Service
 * Dynamic querying and persistence for Plants, Production Units, Equipment,
 * CEMS Analyzers, and Statutory Environmental Permits (IED 2010/75/EU).
 */

const fs = require('fs');
const path = require('path');
const dbService = require('./db_service');

const DATA_DIR = path.join(__dirname, '..', 'data');
const DB_FILE = path.join(DATA_DIR, 'telemetry_db.json');

const DEFAULT_FACILITIES = {
  'DU-03': {
    id: 'DU-03',
    tenantId: 'tenant-eu-energy',
    name: 'Duisburg Unit 3',
    country: 'DE',
    capacityMW: 845.0,
    baseSO2: 847.0,
    limitSO2: 500.0,
    baseNOx: 412.0,
    limitNOx: 200.0,
    baseCO: 78.0,
    limitCO: 100.0,
    refO2: 6.0,
    fuel: 'Bituminous Coal',
    analyzer: 'ABB AO2000-Ex'
  },
  'RT-07': {
    id: 'RT-07',
    tenantId: 'tenant-eu-energy',
    name: 'Rotterdam Plant 7',
    country: 'NL',
    capacityMW: 620.0,
    baseSO2: 621.0,
    limitSO2: 500.0,
    baseNOx: 389.0,
    limitNOx: 200.0,
    baseCO: 62.0,
    limitCO: 100.0,
    refO2: 3.0,
    fuel: 'Natural Gas Combined Cycle',
    analyzer: 'Sick MCS100E'
  },
  'MI-02': {
    id: 'MI-02',
    tenantId: 'tenant-eu-energy',
    name: 'Milan-Sesto 02',
    country: 'IT',
    capacityMW: 410.0,
    baseSO2: 298.0,
    limitSO2: 500.0,
    baseNOx: 201.0,
    limitNOx: 200.0,
    baseCO: 45.0,
    limitCO: 100.0,
    refO2: 11.0,
    fuel: 'Waste-to-Energy',
    analyzer: 'Horiba ENDA-5000'
  },
  'WA-04': {
    id: 'WA-04',
    tenantId: 'tenant-nordic-power',
    name: 'Warsaw Central 4',
    country: 'PL',
    capacityMW: 530.0,
    baseSO2: 156.0,
    limitSO2: 500.0,
    baseNOx: 189.0,
    limitNOx: 200.0,
    baseCO: 54.0,
    limitCO: 100.0,
    refO2: 6.0,
    fuel: 'Lignite & Biomass Co-firing',
    analyzer: 'Emerson Rosemount OPM'
  },
  'BA-01': {
    id: 'BA-01',
    tenantId: 'tenant-iberian-energy',
    name: 'Barcelona Port Bio-1',
    country: 'ES',
    capacityMW: 380.0,
    baseSO2: 89.0,
    limitSO2: 500.0,
    baseNOx: 142.0,
    limitNOx: 200.0,
    baseCO: 32.0,
    limitCO: 100.0,
    refO2: 6.0,
    fuel: 'Biomass & Renewable Pellets',
    analyzer: 'Servomex 4900'
  }
};

const DEFAULT_PERMITS = [
  {
    id: 'pmt-du03-so2',
    facility_id: 'DU-03',
    permit_number: 'NRW-CEMS-2024-8891',
    authority: 'Bezirksregierung Düsseldorf',
    framework: 'IED_2010_75_EU',
    pollutant: 'SO2',
    statutory_elv: 500.0,
    averaging_period: '15_MIN',
    ref_o2_pct: 6.0,
    effective_from: '2024-01-01',
    status: 'ACTIVE'
  },
  {
    id: 'pmt-du03-nox',
    facility_id: 'DU-03',
    permit_number: 'NRW-CEMS-2024-8892',
    authority: 'Bezirksregierung Düsseldorf',
    framework: 'IED_2010_75_EU',
    pollutant: 'NOx',
    statutory_elv: 200.0,
    averaging_period: '15_MIN',
    ref_o2_pct: 6.0,
    effective_from: '2024-01-01',
    status: 'ACTIVE'
  },
  {
    id: 'pmt-du03-co',
    facility_id: 'DU-03',
    permit_number: 'NRW-CEMS-2024-8893',
    authority: 'Bezirksregierung Düsseldorf',
    framework: 'IED_2010_75_EU',
    pollutant: 'CO',
    statutory_elv: 100.0,
    averaging_period: '15_MIN',
    ref_o2_pct: 6.0,
    effective_from: '2024-01-01',
    status: 'ACTIVE'
  }
];

function readFallbackDb() {
  try {
    if (fs.existsSync(DB_FILE)) {
      const data = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
      if (!Array.isArray(data.permits)) {
        data.permits = [...DEFAULT_PERMITS];
        fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
      }
      return data;
    }
  } catch (err) {
    console.warn('[Assets Service] Fallback DB read error:', err.message);
  }
  return { permits: [...DEFAULT_PERMITS] };
}

function writeFallbackDb(data) {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
  } catch (err) {
    console.warn('[Assets Service] Fallback DB write error:', err.message);
  }
}

// ── High-Performance In-Memory TTL Cache ──
let _cachedPlants = null;
let _cachedPlantsTime = 0;
let _cachedEquipment = null;
let _cachedEquipmentTime = 0;
const _cachedPermits = new Map(); // facilityId -> { data, time }
const CACHE_TTL_MS = 60000; // 60 seconds TTL

function invalidateAssetsCache() {
  _cachedPlants = null;
  _cachedPlantsTime = 0;
  _cachedEquipment = null;
  _cachedEquipmentTime = 0;
  _cachedPermits.clear();
}

async function getPlants(tenantId = null) {
  const now = Date.now();
  if (_cachedPlants && (now - _cachedPlantsTime < CACHE_TTL_MS)) {
    return _cachedPlants;
  }

  if (dbService.isPgAvailable()) {
    try {
      const plantsRes = await dbService.query('SELECT * FROM plants');
      const facilitiesRes = await dbService.query('SELECT * FROM facilities');
      const unitsRes = await dbService.query('SELECT * FROM units');
      const eqRes = await dbService.query('SELECT * FROM equipment');
      const anlRes = await dbService.query('SELECT * FROM cems_analyzers');

      const facMap = new Map((facilitiesRes.rows || []).map(f => [f.id, f]));

      const plants = (plantsRes.rows || []).map(p => {
        const fac = facMap.get(p.facility_id) || {};
        const plantUnits = (unitsRes.rows || []).filter(u => u.plant_id === p.id).map(u => ({
          id: u.id,
          unitCode: u.unit_code,
          thermalInputMW: parseFloat(u.thermal_input_mw) || 0,
          commissionedYear: u.commissioned_year,
          equipment: (eqRes.rows || []).filter(e => e.unit_id === u.id).map(e => ({
            id: e.id,
            name: e.name,
            equipmentType: e.equipment_type,
            healthScore: parseFloat(e.health_score) || 98.5,
            analyzers: (anlRes.rows || []).filter(a => a.equipment_id === e.id)
          }))
        }));

        return {
          id: p.id,
          facilityId: p.facility_id,
          name: p.name,
          fuelType: p.fuel_type,
          capacityMW: parseFloat(fac.capacity_mw) || 845.0,
          country: fac.country || 'DE',
          analyzerModel: fac.analyzer_model || 'ABB AO2000-Ex',
          units: plantUnits
        };
      });

      if (plants.length > 0) {
        const result = {
          source: 'POSTGRESQL_TIMESCALEDB',
          count: plants.length,
          plants
        };
        _cachedPlants = result;
        _cachedPlantsTime = now;
        return result;
      }
    } catch (err) {
      console.warn('[Assets Service] DB plants query error, falling back:', err.message);
    }
  }

  // Fallback to in-memory facilities map
  const fallbackPlants = Object.values(DEFAULT_FACILITIES).map(f => ({
    id: `plt-${f.id.toLowerCase()}`,
    facilityId: f.id,
    name: `${f.name} Island`,
    fuelType: f.fuel,
    capacityMW: f.capacityMW,
    country: f.country,
    analyzerModel: f.analyzer,
    units: [
      {
        id: `unt-${f.id.toLowerCase()}-1`,
        unitCode: `${f.id}-U1`,
        thermalInputMW: f.capacityMW * 2.2,
        commissionedYear: 2018,
        equipment: [
          { id: `eq-${f.id.toLowerCase()}-blr`, name: 'Supercritical Utility Boiler', equipmentType: 'BOILER', healthScore: 98.2 },
          { id: `eq-${f.id.toLowerCase()}-fgd`, name: 'Wet Flue Gas Desulfurization', equipmentType: 'FGD_SCRUBBER', healthScore: 96.5 },
          { id: `eq-${f.id.toLowerCase()}-scr`, name: 'Selective Catalytic Reduction (SCR)', equipmentType: 'SCR_REACTOR', healthScore: 99.1 }
        ]
      }
    ]
  }));

  const fallbackResult = {
    source: 'IN_MEMORY_FALLBACK',
    count: fallbackPlants.length,
    plants: fallbackPlants
  };
  _cachedPlants = fallbackResult;
  _cachedPlantsTime = now;
  return fallbackResult;
}

async function getPlantById(id) {
  const all = await getPlants();
  const plant = all.plants.find(p => p.id === id || p.facilityId === id);
  if (!plant) return null;
  const permits = await getPermits(plant.facilityId || plant.id);
  return {
    source: all.source,
    plant: {
      ...plant,
      regulatoryPermits: permits.permits
    }
  };
}

async function getEquipment() {
  const now = Date.now();
  if (_cachedEquipment && (now - _cachedEquipmentTime < CACHE_TTL_MS)) {
    return _cachedEquipment;
  }

  if (dbService.isPgAvailable()) {
    try {
      const [eqRes, unitRes, plantRes, anlRes] = await Promise.all([
        dbService.query('SELECT * FROM equipment'),
        dbService.query('SELECT * FROM units'),
        dbService.query('SELECT * FROM plants'),
        dbService.query('SELECT * FROM cems_analyzers')
      ]);

      const unitMap = new Map((unitRes.rows || []).map(u => [u.id, u]));
      const plantMap = new Map((plantRes.rows || []).map(p => [p.id, p]));

      const equipment = (eqRes.rows || []).map(e => {
        const u = unitMap.get(e.unit_id) || {};
        const p = plantMap.get(u.plant_id) || {};
        return {
          id: e.id,
          unitId: e.unit_id,
          unitCode: u.unit_code,
          plantId: p.id,
          plantName: p.name,
          facilityId: p.facility_id,
          name: e.name,
          equipmentType: e.equipment_type,
          healthScore: parseFloat(e.health_score) || 98.5,
          analyzers: (anlRes.rows || []).filter(a => a.equipment_id === e.id)
        };
      });

      if (equipment.length > 0) {
        const result = { source: 'POSTGRESQL_TIMESCALEDB', count: equipment.length, equipment };
        _cachedEquipment = result;
        _cachedEquipmentTime = now;
        return result;
      }
    } catch (err) {
      console.warn('[Assets Service] DB equipment query error, falling back:', err.message);
    }
  }

  // Fallback
  const allPlants = await getPlants();
  const equipment = [];
  allPlants.plants.forEach(p => {
    (p.units || []).forEach(u => {
      (u.equipment || []).forEach(e => {
        equipment.push({
          ...e,
          unitId: u.id,
          unitCode: u.unitCode,
          plantId: p.id,
          plantName: p.name,
          facilityId: p.facilityId
        });
      });
    });
  });

  const fallbackResult = { source: 'IN_MEMORY_FALLBACK', count: equipment.length, equipment };
  _cachedEquipment = fallbackResult;
  _cachedEquipmentTime = now;
  return fallbackResult;
}

async function getPermits(facilityId = null) {
  if (dbService.isPgAvailable()) {
    try {
      let q = 'SELECT * FROM regulatory_permits';
      const params = [];
      if (facilityId) {
        q += ' WHERE facility_id = $1';
        params.push(facilityId);
      }
      q += ' ORDER BY pollutant ASC';
      const res = await dbService.query(q, params);
      if (res.rows && res.rows.length > 0) {
        return { source: 'POSTGRESQL_TIMESCALEDB', count: res.rows.length, permits: res.rows };
      }
    } catch (err) {
      console.warn('[Assets Service] DB permits query error, falling back:', err.message);
    }
  }

  const db = readFallbackDb();
  let list = db.permits || DEFAULT_PERMITS;
  if (facilityId) {
    list = list.filter(p => p.facility_id === facilityId || p.facilityId === facilityId);
  }
  return { source: 'JSON_PERSISTENCE_STORE', count: list.length, permits: list };
}

async function createPermit(payload, actor = 'environmental_director@climatesphere.ai') {
  invalidateAssetsCache();
  const id = payload.id || `pmt-${Date.now()}`;
  const facilityId = payload.facility_id || payload.facilityId || 'DU-03';
  const permitNumber = payload.permit_number || payload.permitNumber || `PERMIT-${Date.now()}`;
  const authority = payload.authority || 'State Environmental Protection Agency';
  const framework = payload.framework || 'IED_2010_75_EU';
  const pollutant = payload.pollutant || 'SO2';
  const statutoryElv = parseFloat(payload.statutory_elv || payload.statutoryElv || 500.0);
  const averagingPeriod = payload.averaging_period || payload.averagingPeriod || '15_MIN';
  const refO2Pct = parseFloat(payload.ref_o2_pct || payload.refO2Pct || 6.0);
  const effectiveFrom = payload.effective_from || payload.effectiveFrom || new Date().toISOString().slice(0, 10);
  const status = payload.status || 'ACTIVE';

  const record = {
    id,
    facility_id: facilityId,
    permit_number: permitNumber,
    authority,
    framework,
    pollutant,
    statutory_elv: statutoryElv,
    averaging_period: averagingPeriod,
    ref_o2_pct: refO2Pct,
    effective_from: effectiveFrom,
    status
  };

  if (dbService.isPgAvailable()) {
    try {
      const q = `
        INSERT INTO regulatory_permits (
          id, facility_id, permit_number, authority, framework, pollutant,
          statutory_elv, averaging_period, ref_o2_pct, effective_from, status
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
        ON CONFLICT (id) DO UPDATE SET
          statutory_elv = EXCLUDED.statutory_elv,
          status = EXCLUDED.status
        RETURNING *;
      `;
      const res = await dbService.query(q, [
        id, facilityId, permitNumber, authority, framework, pollutant,
        statutoryElv, averagingPeriod, refO2Pct, effectiveFrom, status
      ]);
      return { source: 'POSTGRESQL_TIMESCALEDB', success: true, permit: res.rows[0] };
    } catch (err) {
      console.warn('[Assets Service] DB permit insert error, falling back:', err.message);
    }
  }

  const db = readFallbackDb();
  if (!Array.isArray(db.permits)) db.permits = [...DEFAULT_PERMITS];
  db.permits.push(record);
  writeFallbackDb(db);
  return { source: 'JSON_PERSISTENCE_STORE', success: true, permit: record };
}

module.exports = {
  getPlants,
  getPlantById,
  getEquipment,
  getPermits,
  createPermit,
  invalidateAssetsCache
};
