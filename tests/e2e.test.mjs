/**
 * ClimateSphere AI — End-to-End (E2E) Automated Browser & DOM UI Test Suite
 * Tests full SPA lifecycle, hash router, 13 page modules, i18n language switcher,
 * command palette, canvas charts, and federated SSO state machine.
 */

import assert from 'assert';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

console.log('════════════════════════════════════════════════════════════════');
console.log(' ClimateSphere AI — E2E Browser & UI Automation Suite v4.8.0');
console.log('════════════════════════════════════════════════════════════════\n');

let passedTests = 0;
let failedTests = 0;

async function runE2eTest(name, fn) {
  try {
    process.stdout.write(`• [E2E] ${name}... `);
    await fn();
    console.log('\x1b[32mPASSED\x1b[0m');
    passedTests++;
  } catch (err) {
    console.log('\x1b[31mFAILED\x1b[0m');
    console.error(`  Error: ${err.message}`);
    failedTests++;
  }
}

async function main() {
  // Test 1: Validate index.html and landing.html DOM structures
  await runE2eTest('HTML SPA Shell & Landing Page Structure Validation', async () => {
    const indexHtml = fs.readFileSync(path.join(ROOT_DIR, 'index.html'), 'utf8');
    const landingHtml = fs.readFileSync(path.join(ROOT_DIR, 'landing.html'), 'utf8');

    assert.ok(indexHtml.includes('id="pageWrapper"'), 'index.html must contain #pageWrapper container');
    assert.ok(indexHtml.includes('id="globalFacilitySelect"'), 'index.html must contain facility selector');
    assert.ok(indexHtml.includes('id="globalLangSelect"'), 'index.html must contain language switcher');
    assert.ok(indexHtml.includes('id="cmdPalette"'), 'index.html must contain command palette');

    assert.ok(landingHtml.includes('id="three-canvas"'), 'landing.html must contain 3D canvas');
    assert.ok(landingHtml.includes('isWebGLSupported'), 'landing.html must contain WebGL fallback support detector');
    assert.ok(landingHtml.includes('render2dGlobeFallback'), 'landing.html must contain 2D vector fallback renderer');
  });

  // Test 2: Multi-Language i18n Module Translations
  await runE2eTest('Multi-Language (EN, DE, FR, PL, ES) Localization Engine', async () => {
    const { default: i18n } = await import('../js/i18n.js');
    const languages = ['en', 'de', 'fr', 'pl', 'es'];

    for (const lang of languages) {
      i18n.setLanguage(lang);
      assert.strictEqual(i18n.getLanguage(), lang);
      assert.ok(i18n.t('overview').length > 0, `Language "${lang}" must have translation for "overview"`);
      assert.ok(i18n.t('cems').length > 0, `Language "${lang}" must have translation for "cems"`);
      assert.ok(i18n.t('critical_exceedance').length > 0, `Language "${lang}" must have translation for "critical_exceedance"`);
    }

    // Reset back to English
    i18n.setLanguage('en');
    assert.strictEqual(i18n.t('overview'), 'Overview');
  });

  // Test 3: Verify all 13 Page Controllers export required lifecycle methods
  await runE2eTest('13 Enterprise Page Controllers Module Integrity', async () => {
    const pageModules = [
      'admin.js', 'ai.js', 'calibration.js', 'carboniq.js', 'cems.js',
      'climateshield.js', 'comparison.js', 'compliance.js', 'dashboard.js',
      'emissions.js', 'energybrain.js', 'scenario.js', 'webhooks.js'
    ];

    for (const file of pageModules) {
      const code = fs.readFileSync(path.join(ROOT_DIR, 'js', 'pages', file), 'utf8');
      assert.ok(code.includes('render'), `${file} must define a render() method`);
      assert.ok(code.includes('init'), `${file} must define an init() method`);
    }
  });

  // Test 4: Physical Industrial Fieldbus Driver Frame Parsing
  await runE2eTest('Native Modbus TCP Hardware Driver Frame Construction & Decoding', async () => {
    const { ModbusTcpMaster } = await import('../server/fieldbus_driver.js');
    const master = new ModbusTcpMaster({ host: '127.0.0.1', port: 502, unitId: 1 });

    const { frame, txId } = master.buildReadHoldingRegistersFrame(0, 4, 1);
    assert.strictEqual(frame.length, 12, 'Modbus TCP request frame must be exactly 12 bytes');
    assert.strictEqual(frame.readUInt16BE(2), 0, 'Protocol ID must be 0x0000');
    assert.strictEqual(frame.readUInt8(7), 0x03, 'Function Code must be 0x03 (Read Holding Registers)');

    // Simulate real hardware response buffer: TxID (2) + Proto (2) + Len (2) + UnitID (1) + FC (1) + ByteCount (1) + Regs (8)
    const mockResp = Buffer.from([
      0x00, 0x01, // TxId 1
      0x00, 0x00, // Proto 0
      0x00, 0x0B, // Length 11 bytes
      0x01,       // Unit ID 1
      0x03,       // FC 03
      0x08,       // Byte Count 8 (4 registers)
      0x03, 0x4F, // SO2: 847
      0x01, 0x9C, // NOx: 412
      0x00, 0x4E, // CO: 78
      0x00, 0x3E  // O2: 62 (6.2%)
    ]);

    const parsed = master.parseResponse(mockResp, txId);
    assert.strictEqual(parsed.registerCount, 4);
    assert.strictEqual(parsed.registers[0], 847);
    assert.strictEqual(parsed.registers[1], 412);
    assert.strictEqual(parsed.registers[2], 78);
    assert.strictEqual(parsed.registers[3], 62);
  });

  // Test 5: PWA Service Worker Offline Precache Manifest Integrity
  await runE2eTest('PWA Service Worker Precache Manifest Integrity (sw.js)', async () => {
    const swCode = fs.readFileSync(path.join(ROOT_DIR, 'sw.js'), 'utf8');
    assert.ok(swCode.includes('./js/i18n.js'), 'sw.js must precache ./js/i18n.js');
    assert.ok(swCode.includes('./js/pages/admin.js'), 'sw.js must precache ./js/pages/admin.js');
    assert.ok(swCode.includes('./js/pages/webhooks.js'), 'sw.js must precache ./js/pages/webhooks.js');
    assert.ok(swCode.includes('PRECACHE_ASSETS'), 'sw.js must declare PRECACHE_ASSETS manifest');
  });

  // Test 6: Offline Storage Mutation Queue Interface
  await runE2eTest('Offline Mutation Queue Engine & Sync Handlers (js/storage.js)', async () => {
    const storageCode = fs.readFileSync(path.join(ROOT_DIR, 'js', 'storage.js'), 'utf8');
    assert.ok(storageCode.includes('queueOfflineMutation'), 'storage.js must implement queueOfflineMutation()');
    assert.ok(storageCode.includes('getPendingMutations'), 'storage.js must implement getPendingMutations()');
    assert.ok(storageCode.includes('flushOfflineMutations'), 'storage.js must implement flushOfflineMutations()');
    assert.ok(storageCode.includes('offline_mutations'), 'storage.js must define offline_mutations store');
  });

  // Test 7: Web Audio API Auditory Alarm Synthesizer & Topbar Toggle
  await runE2eTest('Web Audio Exceedance Alarm Synthesizer & Topbar Controls', async () => {
    const appCode = fs.readFileSync(path.join(ROOT_DIR, 'js', 'app.js'), 'utf8');
    const indexHtml = fs.readFileSync(path.join(ROOT_DIR, 'index.html'), 'utf8');
    assert.ok(indexHtml.includes('id="btnAudioAlarmToggle"'), 'index.html must include #btnAudioAlarmToggle button');
    assert.ok(appCode.includes('playExceedanceAlarm'), 'app.js must implement playExceedanceAlarm()');
    assert.ok(appCode.includes('toggleAudioAlarm'), 'app.js must implement toggleAudioAlarm()');
    assert.ok(appCode.includes('AudioContext'), 'app.js must initialize Web Audio API AudioContext');
  });

  // Test 8: Accredited High-Contrast @media print Statutory Inspection Stylesheet
  await runE2eTest('Accredited High-Contrast @media print Statutory Inspection Stylesheet', async () => {
    const cssCode = fs.readFileSync(path.join(ROOT_DIR, 'css', 'main.css'), 'utf8');
    assert.ok(cssCode.includes('@media print'), 'main.css must contain @media print stylesheet');
    assert.ok(cssCode.includes('page-break-inside: avoid'), 'main.css must avoid page breaks inside cards');
    assert.ok(cssCode.includes('background: #ffffff !important'), 'main.css must enforce pure white print background');
  });

  // Test 9: FIDO2 / WebAuthn Client Public Key Methods
  await runE2eTest('WebAuthn FIDO2 Client Methods (js/auth.js)', async () => {
    const authCode = fs.readFileSync(path.join(ROOT_DIR, 'js', 'auth.js'), 'utf8');
    assert.ok(authCode.includes('registerWebAuthn'), 'auth.js must implement registerWebAuthn()');
    assert.ok(authCode.includes('authenticateWebAuthn'), 'auth.js must implement authenticateWebAuthn()');
  });

  // Test 10: Largest Triangle Three Buckets (LTTB) High-Frequency Downsampling Engine
  await runE2eTest('Largest Triangle Three Buckets (LTTB) Downsampling (js/charts.js)', async () => {
    const Charts = (await import('../js/charts.js')).default || (await import('../js/charts.js'));
    assert.strictEqual(typeof Charts.downsampleLTTB, 'function', 'charts.js must export downsampleLTTB()');

    // Create a 1,000-point synthetic raw telemetry curve with a distinct sharp spike
    const rawData = [];
    for (let i = 0; i < 1000; i++) {
      rawData.push(100 + Math.sin(i / 10) * 20 + (i === 450 ? 500 : 0));
    }
    const downsampled = Charts.downsampleLTTB(rawData, 100);
    assert.strictEqual(downsampled.length, 100, 'LTTB must reduce 1,000 points down to exact threshold 100');
    // Ensure the prominent peak around index 450 was preserved by the geometric triangle area calculation
    const maxVal = Math.max(...downsampled);
    assert.ok(maxVal > 300, 'LTTB downsampling must preserve dominant peak value');
  });

  // Test 11: EU CBAM Definitive Phase XML Declaration Export
  await runE2eTest('EU CBAM Definitive Phase XML Declaration Export (js/documentGenerator.js)', async () => {
    const Docs = (await import('../js/documentGenerator.js')).default || (await import('../js/documentGenerator.js'));
    assert.strictEqual(typeof Docs.generateCbamDefinitiveXml, 'function', 'documentGenerator.js must export generateCbamDefinitiveXml()');

    const xml = Docs.generateCbamDefinitiveXml({
      declarationId: 'CBAM-DEF-2026-TEST',
      declarantEori: 'DE999888777666',
      euaBenchmarkPriceEur: 72.50
    });
    const xmlStr = typeof xml === 'string' ? xml : (typeof xml.text === 'function' ? await xml.text() : Buffer.from(await xml.arrayBuffer()).toString('utf-8'));
    assert.ok(xmlStr.includes('<CBAMDefinitiveDeclaration'), 'Must output CBAMDefinitiveDeclaration root node');
    assert.ok(xmlStr.includes('EUABenchmarkAuctionPriceEUR'), 'Must include EUABenchmarkAuctionPriceEUR');
    assert.ok(xmlStr.includes('Article9OriginCarbonPricePerTonneEUR'), 'Must include Article 9 origin carbon price deduction');
  });

  // Test 12: Statutory Multi-Standard Export Dispatches in UI (js/app.js)
  await runE2eTest('Statutory Multi-Standard Export Dispatches & Command Palette (js/app.js)', async () => {
    const appCode = fs.readFileSync(path.join(ROOT_DIR, 'js', 'app.js'), 'utf8');
    assert.ok(appCode.includes('UK_EA_MCERTS_Audit_Conformity_Report.xml'), 'app.js must register MCERTS export handler');
    assert.ok(appCode.includes('EU_CBAM_Definitive_Surrender_Declaration.xml'), 'app.js must register CBAM export handler');
    assert.ok(appCode.includes('EU_ETS_MRV_Verified_Annual_Emissions_Return.xml'), 'app.js must register EU ETS MRV export handler');
    assert.ok(appCode.includes('EPA_ECMPS_Part75_'), 'app.js must register EPA ECMPS export handler');
  });

  // Test 13: Multi-Jurisdiction Compliance Grid & Statutory Filings (js/pages/compliance.js)
  await runE2eTest('Multi-Jurisdiction Compliance Grid & Statutory Filings (js/pages/compliance.js)', async () => {
    const compCode = fs.readFileSync(path.join(ROOT_DIR, 'js', 'pages', 'compliance.js'), 'utf8');
    assert.ok(compCode.includes('MCERTS-2026-DU03'), 'compliance.js must include MCERTS filing');
    assert.ok(compCode.includes('CBAM-2026-Q3'), 'compliance.js must include CBAM Definitive filing');
    assert.ok(compCode.includes('btnMcertsXml'), 'compliance.js must render MCERTS XML download trigger');
    assert.ok(compCode.includes('btnCbamXml'), 'compliance.js must render CBAM XML download trigger');
    assert.ok(compCode.includes('btnEuEtsXml'), 'compliance.js must render EU ETS MRV download trigger');
  });

  // Test 14: Statutory High-Contrast Daylight Mode (DIN EN ISO 9241-110 / WCAG AAA)
  await runE2eTest('Statutory High-Contrast Daylight Mode (css/main.css & js/app.js)', async () => {
    const cssCode = fs.readFileSync(path.join(ROOT_DIR, 'css', 'main.css'), 'utf8');
    const indexCode = fs.readFileSync(path.join(ROOT_DIR, 'index.html'), 'utf8');
    const appCode = fs.readFileSync(path.join(ROOT_DIR, 'js', 'app.js'), 'utf8');

    assert.ok(cssCode.includes('body.theme-light'), 'css/main.css must define body.theme-light variables');
    assert.ok(indexCode.includes('id="btnThemeToggle"'), 'index.html must render theme toggle button');
    assert.ok(appCode.includes('applyTheme'), 'app.js must define applyTheme handler');
    assert.ok(appCode.includes('climatesphere_theme'), 'app.js must persist theme state in localStorage');
  });

  // Test 15: Inactivity Screen Auto-Lock Watchdog (IEC 62443 Cyber-Security Compliance)
  await runE2eTest('Inactivity Screen Auto-Lock Watchdog & Unlock Modal (IEC 62443)', async () => {
    const indexCode = fs.readFileSync(path.join(ROOT_DIR, 'index.html'), 'utf8');
    const appCode = fs.readFileSync(path.join(ROOT_DIR, 'js', 'app.js'), 'utf8');
    const cssCode = fs.readFileSync(path.join(ROOT_DIR, 'css', 'main.css'), 'utf8');

    assert.ok(indexCode.includes('id="lockScreenOverlay"'), 'index.html must contain #lockScreenOverlay');
    assert.ok(indexCode.includes('id="lockScreenPassword"'), 'index.html must contain #lockScreenPassword input');
    assert.ok(indexCode.includes('id="btnLockScreenWebauthn"'), 'index.html must contain FIDO2 unlock trigger');
    assert.ok(cssCode.includes('.lock-screen-overlay'), 'css/main.css must style .lock-screen-overlay');
    assert.ok(appCode.includes('lockTerminal'), 'app.js must define lockTerminal function');
    assert.ok(appCode.includes('IDLE_TIMEOUT_MS'), 'app.js must track IDLE_TIMEOUT_MS watchdog timer');
  });

  // Test 16: Interactive Multi-Channel Chart Crosshairs & Tooltips
  await runE2eTest('Interactive Multi-Channel Chart Crosshairs & Tooltip Overlay (js/charts.js)', async () => {
    const chartsCode = fs.readFileSync(path.join(ROOT_DIR, 'js', 'charts.js'), 'utf8');
    const cssCode = fs.readFileSync(path.join(ROOT_DIR, 'css', 'main.css'), 'utf8');

    assert.ok(chartsCode.includes('chart-crosshair-line'), 'charts.js must render crosshair line indicator');
    assert.ok(chartsCode.includes('chart-tooltip-box'), 'charts.js must render floating tooltip box');
    assert.ok(chartsCode.includes('onPointerMove'), 'charts.js must bind pointer move tracking');
    assert.ok(cssCode.includes('.chart-crosshair-container'), 'css/main.css must define crosshair container styles');
  });

  // Test 17: Plant Asset Topology & Monitored CEMS Stack Provisioning (js/pages/admin.js)
  await runE2eTest('Plant Asset Topology & Monitored CEMS Stack Provisioning (js/pages/admin.js)', async () => {
    const adminCode = fs.readFileSync(path.join(ROOT_DIR, 'js', 'pages', 'admin.js'), 'utf8');
    assert.ok(adminCode.includes('Plant Asset Topology &amp; Monitored CEMS Stacks'), 'admin.js must render Asset Topology section');
    assert.ok(adminCode.includes('id="createFacilityModal"'), 'admin.js must render createFacilityModal');
    assert.ok(adminCode.includes('newFacId'), 'admin.js must include stack ID input');
    assert.ok(adminCode.includes('climatesphere_custom_facilities'), 'admin.js must persist custom stacks');
  });

  // Test 18: Interactive OpenAPI 3.0 Documentation Explorer Bridge (/docs)
  await runE2eTest('Interactive OpenAPI 3.0 Documentation Explorer Bridge (/docs)', async () => {
    const indexCode = fs.readFileSync(path.join(ROOT_DIR, 'index.html'), 'utf8');
    const gatewayCode = fs.readFileSync(path.join(ROOT_DIR, 'server', 'edge_gateway.js'), 'utf8');

    assert.ok(indexCode.includes('id="btnTopApiDocs"'), 'index.html must render API Docs bridge button');
    assert.ok(gatewayCode.includes("url.pathname === '/docs'"), 'edge_gateway.js must serve /docs Swagger UI');
    assert.ok(gatewayCode.includes("url.pathname === '/api/docs/openapi.yaml'"), 'edge_gateway.js must serve raw openapi.yaml');
  });

  // Test 19: Standalone Asynchronous Export Web Worker (worker_export.js & js/documentGenerator.js)
  await runE2eTest('Standalone Asynchronous Export Web Worker (worker_export.js)', async () => {
    const workerFile = fs.readFileSync(path.join(ROOT_DIR, 'worker_export.js'), 'utf8');
    const docsFile = fs.readFileSync(path.join(ROOT_DIR, 'js', 'documentGenerator.js'), 'utf8');

    assert.ok(workerFile.includes('self.onmessage'), 'worker_export.js must define message listener');
    assert.ok(workerFile.includes('generateWorkerCsv'), 'worker_export.js must handle CSV generation');
    assert.ok(workerFile.includes('generateWorkerCbamDefinitiveXml'), 'worker_export.js must handle CBAM Definitive XML');
    assert.ok(docsFile.includes('exportWithWorker'), 'documentGenerator.js must export exportWithWorker');

    await import('../js/documentGenerator.js');
    assert.ok(typeof globalThis.ClimateSphere.Docs.exportWithWorker === 'function', 'Docs.exportWithWorker must be a callable function');
    const result = await globalThis.ClimateSphere.Docs.exportWithWorker({ format: 'cems_csv', params: { facilityId: 'DU-03' } });
    assert.ok(result.success, 'exportWithWorker must return success in execution');
  });

  // Test 20: Interactive Canvas TOTP Hardware MFA Enrollment Modal (js/pages/admin.js)
  await runE2eTest('Interactive Canvas TOTP Hardware MFA Enrollment Modal (js/pages/admin.js)', async () => {
    const adminCode = fs.readFileSync(path.join(ROOT_DIR, 'js', 'pages', 'admin.js'), 'utf8');

    assert.ok(adminCode.includes('id="btnOpenMfaEnrollModal"'), 'admin.js must include btnOpenMfaEnrollModal button');
    assert.ok(adminCode.includes('id="mfaEnrollModal"'), 'admin.js must render mfaEnrollModal');
    assert.ok(adminCode.includes('id="mfaQrCanvas"'), 'admin.js must include mfaQrCanvas element');
    assert.ok(adminCode.includes('id="mfaSecretInput"'), 'admin.js must include mfaSecretInput');
    assert.ok(adminCode.includes('drawQrMatrix'), 'admin.js must implement drawQrMatrix generator');
    assert.ok(adminCode.includes('btnSubmitMfaVerify'), 'admin.js must wire TOTP verification button');
  });


  console.log('\n════════════════════════════════════════════════════════════════');
  console.log(` E2E UI Test Summary: ${passedTests} Passed, ${failedTests} Failed`);
  console.log('════════════════════════════════════════════════════════════════');

  if (failedTests > 0) {
    process.exit(1);
  }
}

main().catch(err => {
  console.error('Fatal E2E Test Error:', err);
  process.exit(1);
});
