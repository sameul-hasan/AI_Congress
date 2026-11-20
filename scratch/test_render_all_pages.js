// Test render of all 13 pages matching js/app.js modules
globalThis.window = globalThis;
globalThis.document = {
  getElementById: () => null,
  querySelectorAll: () => [],
  addEventListener: () => {}
};
globalThis.localStorage = {
  getItem: () => null,
  setItem: () => {}
};
globalThis.sessionStorage = {
  getItem: () => null,
  setItem: () => {}
};
globalThis.CustomEvent = class {};
globalThis.dispatchEvent = () => {};

globalThis.ClimateSphere = {
  state: {
    activeFacilityId: 'DU-03',
    activeTimeRange: 'q3',
    getTimeScale: () => 1.0,
    getFacility: () => ({
      id: 'DU-03', name: 'Duisburg Unit 3', country: 'Germany',
      limitSO2: 500, limitNOx: 200, baseSO2: 847, baseNOx: 412
    })
  },
  Charts: {
    sparkline: () => '<svg></svg>',
    createTimelineChart: () => ({ destroy: () => {} })
  },
  i18n: {
    t: (k) => k
  }
};

const pages = {
  dashboard:     'Dashboard',
  carboniq:      'CarbonIQ',
  cems:          'CEMS',
  climateshield: 'ClimateShield',
  energybrain:   'EnergyBrain',
  emissions:     'Emissions',
  comparison:    'Comparison',
  scenario:      'Scenario',
  ai:            'AITerminal',
  calibration:   'Calibration',
  compliance:    'Compliance',
  admin:         'Admin',
  webhooks:      'Webhooks',
};

async function test() {
  for (const [key, modName] of Object.entries(pages)) {
    try {
      await import(`../js/pages/${key}.js`);
      const mod = globalThis.window[modName];
      if (!mod) {
        console.error(`Page ${key}: MODULE NOT FOUND (${modName}) on window`);
        continue;
      }
      if (typeof mod.render !== 'function') {
        console.error(`Page ${key}: mod.render is not a function`);
        continue;
      }
      const html = mod.render();
      console.log(`✓ Page ${key} (${modName}): rendered successfully (${html.length} chars)`);
    } catch (err) {
      console.error(`✗ Page ${key} (${modName}): ERROR rendering:`, err.message);
    }
  }
}

test();
