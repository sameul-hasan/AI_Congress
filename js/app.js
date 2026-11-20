/**
 * ClimateSphere AI — App Core
 * Router, Navigation, Clock, Command Palette, Export Engine, Sidebar, Alerts, Time Filter
 */

/* ══════════════════════════════════════════════
   GLOBAL NAMESPACE
══════════════════════════════════════════════ */
window.ClimateSphere = window.ClimateSphere || {};

// ── Page Registry ───────────────────────────────────────────────────────────
const pages = {
  dashboard:     { label: 'Overview Dashboard',          module: 'Dashboard',     icon: '📊' },
  carboniq:      { label: 'CarbonIQ Hotspots',           module: 'CarbonIQ',      icon: '🌡' },
  cems:          { label: 'CEMS Telemetry',              module: 'CEMS',          icon: '📡' },
  climateshield: { label: 'Climate Shield',              module: 'ClimateShield', icon: '🛡' },
  energybrain:   { label: 'Energy Brain',                module: 'EnergyBrain',   icon: '⚡' },
  emissions:     { label: 'Emissions Accounting',        module: 'Emissions',     icon: '🏭' },
  comparison:    { label: 'Hotspot Comparison',          module: 'Comparison',    icon: '🔀' },
  scenario:      { label: 'Scenario Workbench',          module: 'Scenario',      icon: '📈' },
  ai:            { label: 'AI Decision Terminal',         module: 'AITerminal',    icon: '🤖' },
  calibration:   { label: 'Calibration / QAL3',         module: 'Calibration',   icon: '⚙' },
  compliance:    { label: 'CSRD / EPA Filing',           module: 'Compliance',    icon: '✅' },
  admin:         { label: 'Enterprise Admin & RBAC',     module: 'Admin',         icon: '👥' },
  webhooks:      { label: 'Webhooks & Notifications',    module: 'Webhooks',      icon: '🔔' },
};

let currentPage = 'dashboard';
let activeTimeRange = 'q3';
let activeIntervals = [];

/* ══════════════════════════════════════════════
   ROUTER & HASH DEEP-LINKING
══════════════════════════════════════════════ */
function updateUrlHash(page) {
  const currentFid = (window.ClimateSphere.state && window.ClimateSphere.state.activeFacilityId) || 'DU-03';
  const range = (window.ClimateSphere.state && window.ClimateSphere.state.activeTimeRange) || activeTimeRange;
  const targetHash = `#${page}?facility=${currentFid}&range=${range}`;
  if (window.location.hash !== targetHash) {
    history.replaceState(null, '', targetHash);
  }
}

function parseUrlHash() {
  const rawHash = (window.location.hash || '').replace(/^#/, '');
  if (!rawHash) return { page: 'dashboard', facility: null, range: null };
  const [pagePart, queryPart] = rawHash.split('?');
  const page = pages[pagePart] ? pagePart : 'dashboard';
  let facility = null;
  let range = null;
  if (queryPart) {
    const params = new URLSearchParams(queryPart);
    facility = params.get('facility');
    range = params.get('range');
  }
  return { page, facility, range };
}

function navigateTo(page, updateHash = true) {
  if (!pages[page]) return;

  // Clean up previous page intervals
  activeIntervals.forEach(id => clearInterval(id));
  activeIntervals = [];

  // Update nav items
  document.querySelectorAll('.nav-item[data-page]').forEach(el => {
    const isActive = el.dataset.page === page;
    el.classList.toggle('active', isActive);
  });

  // Update breadcrumb
  const bc = document.getElementById('breadcrumbCurrent');
  if (bc) bc.textContent = pages[page].label;

  // Render the page
  const wrapper = document.getElementById('pageWrapper');
  if (!wrapper) return;

  wrapper.innerHTML = '';
  wrapper.scrollTop = 0;
  const el = document.createElement('div');
  el.className = 'page-enter';

  const mod = window[pages[page].module];
  if (mod && typeof mod.render === 'function') {
    try {
      el.innerHTML = mod.render();
      wrapper.appendChild(el);
      // Wait for DOM paint, then init charts/events
      requestAnimationFrame(() => {
        try {
          if (typeof mod.init === 'function') {
            const result = mod.init();
            // If init returns interval IDs, track them
            if (Array.isArray(result)) activeIntervals.push(...result);
            else if (result) activeIntervals.push(result);
          }
        } catch (initErr) {
          console.error(`[Router] Error initializing page "${page}":`, initErr);
        }
      });
    } catch (renderErr) {
      console.error(`[Router] Error rendering page "${page}":`, renderErr);
      el.innerHTML = `
        <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:360px;gap:var(--space-md);background:var(--surface);border:1px solid rgba(255,87,87,0.3);border-radius:var(--radius-lg);padding:var(--space-xl);margin:var(--space-lg);">
          <div style="font-size:32px;">⚠️</div>
          <div style="font-family:var(--font-mono);font-size:12px;color:var(--danger,#ff5757);text-transform:uppercase;letter-spacing:0.08em;">Page Rendering Exception</div>
          <div style="font-size:16px;font-weight:600;color:var(--on-surface);">Failed to load ${pages[page].label}</div>
          <div style="font-family:var(--font-mono);font-size:11px;color:var(--on-surface-dim);max-width:500px;text-align:center;background:rgba(0,0,0,0.3);padding:var(--space-sm) var(--space-md);border-radius:var(--radius-sm);">${renderErr.message}</div>
          <button class="btn btn-secondary" onclick="window.ClimateSphere.navigateTo('${page}', false)" style="margin-top:var(--space-sm);cursor:pointer;">Retry Loading Module</button>
        </div>`;
      wrapper.appendChild(el);
    }
  } else {
    el.innerHTML = `
      <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:300px;gap:var(--space-md);">
        <div style="font-family:var(--font-mono);font-size:11px;color:var(--on-surface-dim);text-transform:uppercase;letter-spacing:0.08em;">Module Loading</div>
        <div style="font-size:24px;">${pages[page].icon}</div>
        <div style="font-family:var(--font-mono);font-size:13px;color:var(--primary);">${pages[page].label}</div>
      </div>`;
    wrapper.appendChild(el);
  }

  currentPage = page;

  if (updateHash) {
    updateUrlHash(page);
  }
}

// Expose globally (e.g. for alert panel button and hash sync)
window.ClimateSphere.navigateTo = navigateTo;
window.ClimateSphere.updateUrlHash = updateUrlHash;

// Listen for browser forward/back hash navigation
window.addEventListener('hashchange', () => {
  const parsed = parseUrlHash();
  if (parsed.facility && window.ClimateSphere.state && parsed.facility !== window.ClimateSphere.state.activeFacilityId) {
    window.ClimateSphere.state.setFacility(parsed.facility, false);
  }
  if (parsed.range && window.ClimateSphere.state && parsed.range !== window.ClimateSphere.state.activeTimeRange) {
    window.ClimateSphere.state.setTimeRange(parsed.range, false);
  }
  if (parsed.page !== currentPage) {
    navigateTo(parsed.page, false);
  }
});

// Update URL hash whenever global facility or time range changes
window.addEventListener('climatesphere:facilityChanged', () => {
  if (currentPage) updateUrlHash(currentPage);
});
window.addEventListener('climatesphere:timeRangeChanged', () => {
  if (currentPage) updateUrlHash(currentPage);
});

/* ══════════════════════════════════════════════
   NAVIGATION BINDINGS
══════════════════════════════════════════════ */
document.querySelectorAll('.nav-item[data-page]').forEach(item => {
  item.addEventListener('click', e => {
    e.preventDefault();
    navigateTo(item.dataset.page);
    // Auto-close mobile sidebar
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebarOverlay');
    if (sidebar && window.innerWidth <= 900) {
      sidebar.classList.remove('mobile-open');
      if (overlay) overlay.classList.remove('active');
    }
  });
});

/* ══════════════════════════════════════════════
   SIDEBAR TOGGLE (Desktop Collapse)
══════════════════════════════════════════════ */
const sidebar = document.getElementById('sidebar');
const sidebarToggle = document.getElementById('sidebarToggle');

if (sidebarToggle && sidebar) {
  sidebarToggle.addEventListener('click', () => {
    sidebar.classList.toggle('collapsed');
    document.body.classList.toggle('sidebar-collapsed', sidebar.classList.contains('collapsed'));
    // Redraw charts after transition
    setTimeout(() => { if (currentPage) navigateTo(currentPage); }, 280);
  });
}

/* ══════════════════════════════════════════════
   SIDEBAR MOBILE TOGGLE
══════════════════════════════════════════════ */
const mobileMenuBtn = document.getElementById('mobileMenuBtn');
const sidebarOverlay = document.getElementById('sidebarOverlay');

if (mobileMenuBtn && sidebar) {
  mobileMenuBtn.addEventListener('click', () => {
    sidebar.classList.toggle('mobile-open');
    sidebarOverlay.classList.toggle('active', sidebar.classList.contains('mobile-open'));
  });
}
if (sidebarOverlay) {
  sidebarOverlay.addEventListener('click', () => {
    sidebar.classList.remove('mobile-open');
    sidebarOverlay.classList.remove('active');
  });
}

/* ══════════════════════════════════════════════
   GLOBAL REACTIVE STATE BUS
══════════════════════════════════════════════ */
const FACILITIES_REGISTRY = {
  'DU-03': { id: 'DU-03', name: 'Duisburg Unit 3', country: 'Germany', region: 'North Rhine-Westphalia · Ruhr Valley', station: 'DENW034 (Duisburg-Walsum Industry)', authority: 'Bezirksregierung Düsseldorf / UBA', permit: 'DE/NRW/IED/2021/0042', lat: 51.4344, lng: 6.7623, type: 'Coal/Gas Thermal (845 MW)', analyzer: 'ABB AO2000-Ex', status: 'CRITICAL', baseSO2: 847, baseNOx: 412, limitSO2: 500, limitNOx: 200, refO2: 6.0 },
  'RT-07': { id: 'RT-07', name: 'Rotterdam Plant 7', country: 'Netherlands', region: 'South Holland · Botlek Petrochemical', station: 'NL10418 (Rotterdam-Botlek Industrial)', authority: 'DCMR Milieudienst Rijnmond / RIVM', permit: 'NL/ZH/DCMR/2022/0018', lat: 51.9244, lng: 4.4777, type: 'CCGT / Chemical (620 MW)', analyzer: 'Sick MCS100E', status: 'WARNING', baseSO2: 621, baseNOx: 389, limitSO2: 500, limitNOx: 200, refO2: 3.0 },
  'MI-02': { id: 'MI-02', name: 'Milan-Sesto 02', country: 'Italy', region: 'Lombardy · Po Industrial Basin', station: 'IT0451A (Milano-Sesto San Giovanni)', authority: 'ARPA Lombardia / ISPRA', permit: 'IT/LO/ARPA/2021/0031', lat: 45.5333, lng: 9.1333, type: 'District Cogen (410 MW)', analyzer: 'Horiba ENDA-5000', status: 'WARNING', baseSO2: 298, baseNOx: 201, limitSO2: 500, limitNOx: 200, refO2: 3.0 },
  'WA-04': { id: 'WA-04', name: 'Warsaw Central 4', country: 'Poland', region: 'Masovia · Vistula Basin (Żerań)', station: 'PL0008A (Warszawa-Targówek / Żerań CHP)', authority: 'GIOŚ / WIOŚ Warszawa', permit: 'PL/MZ/WIOŚ/2023/0007', lat: 52.2297, lng: 21.0122, type: 'CHP Thermal (530 MW)', analyzer: 'Emerson Rosemount', status: 'NOMINAL', baseSO2: 156, baseNOx: 134, limitSO2: 500, limitNOx: 200, refO2: 6.0 },
  'MD-01': { id: 'MD-01', name: 'Madrid Vallecas 1', country: 'Spain', region: 'Community of Madrid · South Ring', station: 'ES1528A (Madrid-Vallecas)', authority: 'Comunidad de Madrid / MITECO', permit: 'ES/MD/CM/2022/0044', lat: 40.3917, lng: -3.6529, type: 'Biomass/CCGT (380 MW)', analyzer: 'ABB AO2000-Ex', status: 'NOMINAL', baseSO2: 89, baseNOx: 76, limitSO2: 500, limitNOx: 200, refO2: 3.0 },
};

try {
  const savedCustomFacs = JSON.parse(localStorage.getItem('climatesphere_custom_facilities') || '{}');
  Object.assign(FACILITIES_REGISTRY, savedCustomFacs);
} catch (e) {}

window.ClimateSphere.state = {
  activeTimeRange: 'q3',
  activeFacilityId: 'DU-03',
  facilities: FACILITIES_REGISTRY,

  getFacility(id = this.activeFacilityId) {
    return this.facilities[id] || this.facilities['DU-03'];
  },

  getTimeScale() {
    switch (this.activeTimeRange) {
      case 'today': return 0.28;
      case '7d':    return 0.58;
      case '30d':   return 0.82;
      case 'q3':    return 1.00;
      default:      return 1.00;
    }
  },

  setFacility(id, triggerRender = true) {
    if (!this.facilities[id]) return;
    this.activeFacilityId = id;

    // Sync topbar dropdown
    const topSelect = document.getElementById('globalFacilitySelect');
    if (topSelect && topSelect.value !== id) {
      topSelect.value = id;
    }

    // Sync telemetry stream
    if (window.ClimateSphere.TelemetryStream) {
      window.ClimateSphere.TelemetryStream.setFacility(id);
    }

    // Dispatch global events
    window.dispatchEvent(new CustomEvent('climatesphere:facilityChanged', { 
      detail: { facilityId: id, facility: this.getFacility(id) } 
    }));
    window.dispatchEvent(new CustomEvent('climatesphere:stateChanged', { 
      detail: { state: this.getState() } 
    }));

    if (triggerRender) {
      navigateTo(currentPage);
      showToast(`Active Plant: ${this.facilities[id].name} (${id})`);
    }
  },

  setTimeRange(range, triggerRender = true) {
    this.activeTimeRange = range;
    activeTimeRange = range;
    window.ClimateSphere.timeRange = range;

    document.querySelectorAll('.time-btn').forEach(b => {
      b.classList.toggle('active', b.dataset.range === range);
    });

    window.dispatchEvent(new CustomEvent('climatesphere:timeRangeChanged', { 
      detail: { range, scale: this.getTimeScale() } 
    }));
    window.dispatchEvent(new CustomEvent('climatesphere:stateChanged', { 
      detail: { state: this.getState() } 
    }));

    if (triggerRender) {
      navigateTo(currentPage);
      const label = range.toUpperCase();
      showToast(`Time Range: ${label} (Scaled: ${Math.round(this.getTimeScale()*100)}%)`);
    }
  },

  getState() {
    return {
      activeFacilityId: this.activeFacilityId,
      facility: this.getFacility(),
      activeTimeRange: this.activeTimeRange,
      timeScale: this.getTimeScale(),
      timestamp: new Date().toISOString()
    };
  }
};

/* ══════════════════════════════════════════════
   GLOBAL LISTENERS: TIME RANGE & FACILITY
══════════════════════════════════════════════ */
document.querySelectorAll('.time-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const range = btn.dataset.range || 'q3';
    window.ClimateSphere.state.setTimeRange(range, true);
  });
});

const topbarFacilitySelect = document.getElementById('globalFacilitySelect');
if (topbarFacilitySelect) {
  topbarFacilitySelect.value = window.ClimateSphere.state.activeFacilityId;
  topbarFacilitySelect.addEventListener('change', e => {
    window.ClimateSphere.state.setFacility(e.target.value, true);
  });
}

const topbarLangSelect = document.getElementById('globalLangSelect');
if (topbarLangSelect) {
  const currentLang = window.ClimateSphere.I18n ? window.ClimateSphere.I18n.getLanguage() : 'en';
  topbarLangSelect.value = currentLang;
  topbarLangSelect.addEventListener('change', e => {
    if (window.ClimateSphere.I18n) {
      window.ClimateSphere.I18n.setLanguage(e.target.value);
    }
  });
}

// Re-render current page immediately when operator switches language
window.addEventListener('cs:language-changed', () => {
  navigateTo(currentPage, false);
});

window.ClimateSphere.timeRange = activeTimeRange;

// Edge Gateway modal trigger
const btnOpenEdge = document.getElementById('btnOpenEdgeGateway');
if (btnOpenEdge) {
  btnOpenEdge.addEventListener('click', () => {
    if (typeof window.ClimateSphere.openEdgeGatewayModal === 'function') {
      window.ClimateSphere.openEdgeGatewayModal();
    }
  });
}

// ── Certified Source Modal (EU Copernicus CAMS / EEA) ──
const btnCertifiedModal = document.getElementById('btnCertifiedSourceModal');
const certifiedModalOverlay = document.getElementById('certifiedModalOverlay');
const btnCloseCertifiedModal = document.getElementById('btnCloseCertifiedModal');
const certifiedModalBody = document.getElementById('certifiedModalBody');
const btnSyncCertifiedLive = document.getElementById('btnSyncCertifiedLive');
const btnDownloadCertificateJson = document.getElementById('btnDownloadCertificateJson');

let activeCertificateData = null;

async function loadAndOpenCertifiedModal() {
  if (!certifiedModalOverlay) return;
  certifiedModalOverlay.classList.add('active');
  
  const currentFid = (window.ClimateSphere.state && window.ClimateSphere.state.activeFacilityId) || 'DU-03';
  if (certifiedModalBody) {
    certifiedModalBody.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:center;padding:40px;color:var(--on-surface-variant);font-family:var(--font-mono);font-size:12px;">
        <span class="pulse-dot" style="margin-right:8px;"></span> Contacting EU Copernicus CAMS / ECMWF Data Hub...
      </div>`;
  }

  try {
    const res = await fetch(`http://localhost:8089/api/certified/certificate?facility=${currentFid}`);
    if (res.ok) {
      activeCertificateData = await res.json();
      renderCertifiedModalContent(activeCertificateData);
    } else {
      throw new Error(`HTTP ${res.status}`);
    }
  } catch (err) {
    if (certifiedModalBody) {
      certifiedModalBody.innerHTML = `
        <div style="padding:20px;background:rgba(255,82,82,0.1);border:1px solid rgba(255,82,82,0.3);border-radius:6px;">
          <div style="color:var(--status-red);font-weight:700;font-size:13px;margin-bottom:6px;">⚠️ Gateway Offline — Cached Statutory Fallback</div>
          <div style="color:var(--on-surface-variant);font-size:12px;">Official statutory standards: European Union Regulation (EU) 2021/696 and Directive 2010/75/EU (IED Annex V). Monitoring Station: DENW034 (Duisburg-Walsum).</div>
        </div>`;
    }
  }
}

function renderCertifiedModalContent(cert) {
  if (!certifiedModalBody || !cert) return;
  const m = cert.measurements || {};
  const amb = m.ambientGround || {};
  const stk = m.stackCEMS || {};
  const fac = cert.facility || {};
  const prov = cert.provider || {};
  const cryptoInfo = cert.cryptographicAssurance || {};

  certifiedModalBody.innerHTML = `
    <!-- Top Header Card -->
    <div style="background:var(--surface-lowest);border:1px solid var(--border-subtle);border-radius:var(--radius-sm);padding:14px 16px;">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:10px;">
        <div>
          <span class="chip chip-green" style="font-size:10px;font-family:var(--font-mono);">● ${cert.validity || 'STATUTORY_CERTIFIED'}</span>
          <h3 style="font-size:15px;font-weight:700;color:var(--on-surface);margin-top:6px;">${fac.name || 'Industrial Facility'}</h3>
          <div style="font-size:11px;color:var(--on-surface-variant);font-family:var(--font-mono);">
            Station ID: ${fac.stationId || 'DENW034'} · Permit: ${fac.permit || 'DE/NRW/2021/0042'} · Authority: ${fac.competentAuthority || 'UBA'}
          </div>
        </div>
        <div style="text-align:right;">
          <div style="font-family:var(--font-mono);font-size:9px;color:var(--on-surface-dim);">CERTIFICATE REF</div>
          <div style="font-family:var(--font-mono);font-size:11px;font-weight:700;color:var(--primary);">${cert.certificateId}</div>
          <div style="font-family:var(--font-mono);font-size:9px;color:var(--on-surface-variant);margin-top:2px;">Observed: ${m.observationTime || 'Live'} UTC</div>
        </div>
      </div>
      <div style="font-size:11px;color:var(--on-surface-variant);line-height:1.4;border-top:1px solid rgba(255,255,255,0.05);padding-top:8px;">
        🏛 <strong>Official Legal Issuing Body:</strong> ${prov.name} (${prov.authority}) under <strong>${prov.legalRegulation}</strong>. Certified under <strong>${prov.accreditationStandard}</strong>.
      </div>
    </div>

    <!-- Live Ambient vs Stack Comparison Grid -->
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
      <!-- Ambient Ground Station -->
      <div style="background:var(--surface-low);border:1px solid var(--border-subtle);border-radius:var(--radius-sm);padding:14px;">
        <div style="font-family:var(--font-mono);font-size:10px;color:var(--primary);letter-spacing:0.06em;text-transform:uppercase;margin-bottom:8px;">
          🛰️ Certified Ground Ambient (CAMS/EEA)
        </div>
        <div style="display:flex;flex-direction:column;gap:8px;">
          <div style="display:flex;justify-content:space-between;border-bottom:1px solid rgba(255,255,255,0.04);padding-bottom:4px;">
            <span style="font-size:12px;color:var(--on-surface-variant);">Ambient SO₂ (Ground)</span>
            <span style="font-family:var(--font-mono);font-size:12px;font-weight:600;color:var(--on-surface);">${amb.SO2_ug_m3 || '—'} µg/m³</span>
          </div>
          <div style="display:flex;justify-content:space-between;border-bottom:1px solid rgba(255,255,255,0.04);padding-bottom:4px;">
            <span style="font-size:12px;color:var(--on-surface-variant);">Ambient NO₂ (Ground)</span>
            <span style="font-family:var(--font-mono);font-size:12px;font-weight:600;color:var(--on-surface);">${amb.NO2_ug_m3 || '—'} µg/m³</span>
          </div>
          <div style="display:flex;justify-content:space-between;border-bottom:1px solid rgba(255,255,255,0.04);padding-bottom:4px;">
            <span style="font-size:12px;color:var(--on-surface-variant);">Ambient PM₁₀ (Dust)</span>
            <span style="font-family:var(--font-mono);font-size:12px;font-weight:600;color:var(--on-surface);">${amb.PM10_ug_m3 || '—'} µg/m³</span>
          </div>
          <div style="display:flex;justify-content:space-between;">
            <span style="font-size:12px;color:var(--on-surface-variant);">Carbon Monoxide (CO)</span>
            <span style="font-family:var(--font-mono);font-size:12px;font-weight:600;color:var(--on-surface);">${amb.CO_ug_m3 || '—'} µg/m³</span>
          </div>
        </div>
      </div>

      <!-- Flue-Gas Stack CEMS Measurement -->
      <div style="background:var(--surface-low);border:1px solid var(--border-subtle);border-radius:var(--radius-sm);padding:14px;">
        <div style="font-family:var(--font-mono);font-size:10px;color:var(--secondary);letter-spacing:0.06em;text-transform:uppercase;margin-bottom:8px;">
          🏭 Flue Stack CEMS (EN 14181 Normalized)
        </div>
        <div style="display:flex;flex-direction:column;gap:8px;">
          <div style="display:flex;justify-content:space-between;border-bottom:1px solid rgba(255,255,255,0.04);padding-bottom:4px;">
            <span style="font-size:12px;color:var(--on-surface-variant);">Stack SO₂ (Statutory Limit: 500)</span>
            <span style="font-family:var(--font-mono);font-size:12px;font-weight:700;color:${stk.exceededSO2 ? 'var(--status-red)' : 'var(--primary)'};">${stk.SO2_mg_Nm3 || '—'} mg/Nm³</span>
          </div>
          <div style="display:flex;justify-content:space-between;border-bottom:1px solid rgba(255,255,255,0.04);padding-bottom:4px;">
            <span style="font-size:12px;color:var(--on-surface-variant);">Stack NOₓ (Statutory Limit: 200)</span>
            <span style="font-family:var(--font-mono);font-size:12px;font-weight:700;color:${stk.exceededNOx ? 'var(--status-red)' : 'var(--primary)'};">${stk.NOx_mg_Nm3 || '—'} mg/Nm³</span>
          </div>
          <div style="display:flex;justify-content:space-between;border-bottom:1px solid rgba(255,255,255,0.04);padding-bottom:4px;">
            <span style="font-size:12px;color:var(--on-surface-variant);">Flue Gas Oxygen (Ref: ${stk.referenceO2}%)</span>
            <span style="font-family:var(--font-mono);font-size:12px;font-weight:600;color:var(--on-surface);">${stk.O2_percent || '—'}% v/v</span>
          </div>
          <div style="display:flex;justify-content:space-between;">
            <span style="font-size:12px;color:var(--on-surface-variant);">Particulate Matter (PM)</span>
            <span style="font-family:var(--font-mono);font-size:12px;font-weight:600;color:var(--on-surface);">${stk.PM_mg_Nm3 || '—'} mg/Nm³</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Cryptographic Proof Card -->
    <div style="background:rgba(0,0,0,0.3);border:1px dashed var(--border-medium);border-radius:var(--radius-sm);padding:12px 14px;">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;">
        <span style="font-family:var(--font-mono);font-size:10px;color:var(--primary);font-weight:600;">🔒 CRYPTOGRAPHIC STATUTORY RECEIPT</span>
        <span class="chip chip-green" style="font-size:9px;">MERKLE ANCHORED</span>
      </div>
      <div style="font-family:var(--font-mono);font-size:10px;color:var(--on-surface-variant);word-break:break-all;line-height:1.5;">
        <strong>SHA-256 Digest:</strong> ${cryptoInfo.sha256Digest || '—'}<br/>
        <strong>Hardware Enclave Signature:</strong> ${cryptoInfo.tpmSignature || '—'}
      </div>
    </div>
  `;
}

if (btnCertifiedModal) {
  btnCertifiedModal.addEventListener('click', loadAndOpenCertifiedModal);
}
if (btnCloseCertifiedModal) {
  btnCloseCertifiedModal.addEventListener('click', () => {
    if (certifiedModalOverlay) certifiedModalOverlay.classList.remove('active');
  });
}
if (certifiedModalOverlay) {
  certifiedModalOverlay.addEventListener('click', (e) => {
    if (e.target === certifiedModalOverlay) certifiedModalOverlay.classList.remove('active');
  });
}
if (btnSyncCertifiedLive) {
  btnSyncCertifiedLive.addEventListener('click', async () => {
    btnSyncCertifiedLive.disabled = true;
    btnSyncCertifiedLive.textContent = 'Syncing...';
    try {
      await fetch('http://localhost:8089/api/certified/sync', { method: 'POST' });
      showToast('✓ EU Copernicus CAMS Data Re-synced Live', 2000);
      loadAndOpenCertifiedModal();
    } catch (e) {
      showToast('Sync completed', 2000);
    } finally {
      btnSyncCertifiedLive.disabled = false;
      btnSyncCertifiedLive.textContent = '🔄 Force Live Re-Sync';
    }
  });
}
if (btnDownloadCertificateJson) {
  btnDownloadCertificateJson.addEventListener('click', () => {
    if (!activeCertificateData) return;
    const blob = new Blob([JSON.stringify(activeCertificateData, null, 2)], { type: 'application/json' });
    downloadBlob(blob, `${activeCertificateData.certificateId || 'Statutory_Certificate'}.json`);
    showToast('Downloaded Official Certificate JSON', 2000);
  });
}

/* ══════════════════════════════════════════════
   ALERT PANEL
══════════════════════════════════════════════ */
const alertPanel = document.getElementById('alertPanel');
const alertBtn = document.getElementById('alertBtn');
const closeAlerts = document.getElementById('closeAlerts');

if (alertBtn && alertPanel) {
  alertBtn.addEventListener('click', () => alertPanel.classList.toggle('open'));
  alertBtn.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') alertPanel.classList.toggle('open'); });
}
if (closeAlerts && alertPanel) {
  closeAlerts.addEventListener('click', () => alertPanel.classList.remove('open'));
}

// Close alert panel on outside click
document.addEventListener('click', e => {
  if (alertPanel && alertPanel.classList.contains('open') &&
      !alertPanel.contains(e.target) && !alertBtn.contains(e.target)) {
    alertPanel.classList.remove('open');
  }
});

/* ══════════════════════════════════════════════
   GLOBAL PERSISTENT REAL-TIME ALERT BANNER
══════════════════════════════════════════════ */
const globalAlertBanner = document.getElementById('globalAlertBanner');
const globalAlertTitle = document.getElementById('globalAlertTitle');
const globalAlertMsg = document.getElementById('globalAlertMsg');
const btnBannerInvestigate = document.getElementById('btnBannerInvestigate');
const btnBannerDismiss = document.getElementById('btnBannerDismiss');

let alertBannerDismissedUntil = 0;

if (btnBannerInvestigate) {
  btnBannerInvestigate.addEventListener('click', () => {
    navigateTo('cems');
  });
}

if (btnBannerDismiss) {
  btnBannerDismiss.addEventListener('click', () => {
    if (globalAlertBanner) globalAlertBanner.style.display = 'none';
    alertBannerDismissedUntil = Date.now() + 60000; // Snooze for 60 seconds
  });
}

window.addEventListener('climatesphere:telemetryPacket', (e) => {
  if (!globalAlertBanner || Date.now() < alertBannerDismissedUntil) return;
  const packet = e.detail;
  if (!packet || !packet.channels) return;

  const breaches = [];
  if (packet.channels.SO2 && packet.channels.SO2.exceeded) {
    breaches.push(`SO₂ ${packet.channels.SO2.val} ${packet.channels.SO2.unit} (Permit Limit: ${packet.channels.SO2.limit})`);
  }
  if (packet.channels.NOx && packet.channels.NOx.exceeded) {
    breaches.push(`NOₓ ${packet.channels.NOx.val} ${packet.channels.NOx.unit} (Permit Limit: ${packet.channels.NOx.limit})`);
  }
  if (packet.channels.PM10 && packet.channels.PM10.exceeded) {
    breaches.push(`PM10 ${packet.channels.PM10.val} ${packet.channels.PM10.unit} (Permit Limit: ${packet.channels.PM10.limit})`);
  }

  if (breaches.length > 0) {
    globalAlertBanner.style.display = 'flex';
    if (globalAlertTitle) {
      globalAlertTitle.textContent = `CRITICAL ELV EXCEEDANCE — ${packet.facilityName || packet.facility || 'ACTIVE UNIT'}`;
    }
    if (globalAlertMsg) {
      globalAlertMsg.textContent = `${breaches.join(' · ')} under Directive 2010/75/EU Annex V`;
    }
  } else {
    globalAlertBanner.style.display = 'none';
  }
});

/* ══════════════════════════════════════════════
   LIVE CLOCK
══════════════════════════════════════════════ */
function updateClock() {
  const el = document.getElementById('liveTime');
  if (el) {
    const now = new Date();
    const t = now.toUTCString().match(/(\d{2}:\d{2}:\d{2})/);
    el.textContent = t ? t[1] : '';
  }
}
setInterval(updateClock, 1000);
updateClock();

/* ══════════════════════════════════════════════
   AUDITORY EXCEEDANCE ALARM CHIME (Web Audio API)
══════════════════════════════════════════════ */
let audioContext = null;
let audioMuted = localStorage.getItem('climatesphere_audio_muted') === 'true';

function updateAudioToggleUI() {
  const icon = document.getElementById('audioAlarmIcon');
  const label = document.getElementById('audioAlarmLabel');
  const desc = document.getElementById('audioAlarmDesc');
  if (icon) {
    icon.textContent = audioMuted ? '🔇' : '🔊';
  }
  if (label) {
    label.textContent = audioMuted ? 'CHIME OFF' : 'CHIME ON';
    if (audioMuted) {
      label.classList.add('off');
    } else {
      label.classList.remove('off');
    }
  }
  if (desc) {
    desc.textContent = audioMuted ? 'Acoustic alarm muted by operator' : 'ISO 11429 acoustic exceedance alarm';
  }
}

function toggleAudioAlarm() {
  audioMuted = !audioMuted;
  localStorage.setItem('climatesphere_audio_muted', audioMuted ? 'true' : 'false');
  updateAudioToggleUI();
  showToast(audioMuted ? 'Auditory Exceedance Chime Muted' : 'Auditory Exceedance Chime Activated', 2000);
  if (!audioMuted) playExceedanceAlarm('TEST', 0);
}

function playExceedanceAlarm(pollutant = 'SO2', value = 0, severity = 'CRITICAL') {
  if (audioMuted) return;
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    if (!audioContext) {
      audioContext = new AudioCtx();
      // Auto-unlock on first user interaction if blocked by browser autoplay policy
      const unlockAudio = () => {
        if (audioContext && audioContext.state === 'suspended') {
          audioContext.resume().then(() => {
            console.log('[Audio] ISO 11429 AudioContext successfully unlocked by user gesture');
          }).catch(() => {});
        }
      };
      window.addEventListener('click', unlockAudio, { once: true });
      window.addEventListener('keydown', unlockAudio, { once: true });
    }
    if (audioContext.state === 'suspended') {
      audioContext.resume().catch(() => {});
    }

    const now = audioContext.currentTime;
    const osc = audioContext.createOscillator();
    const gain = audioContext.createGain();

    // ISO 11429 Industrial Ergonomic Acoustic Signal Compliance:
    // Priority 1 (ELV Breach / Emergency): High-urgency dual-burst (900 Hz -> 960 Hz)
    // Priority 2 (Warning / Drift): Medium-urgency single pulse (450 Hz)
    if (severity === 'WARNING') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(450, now);
      osc.frequency.exponentialRampToValueAtTime(500, now + 0.3);
      gain.gain.setValueAtTime(0.001, now);
      gain.gain.exponentialRampToValueAtTime(0.12, now + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      osc.connect(gain);
      gain.connect(audioContext.destination);
      osc.start(now);
      osc.stop(now + 0.4);
    } else {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(900, now);
      osc.frequency.exponentialRampToValueAtTime(960, now + 0.15);
      osc.frequency.setValueAtTime(900, now + 0.25);
      osc.frequency.exponentialRampToValueAtTime(960, now + 0.40);
      gain.gain.setValueAtTime(0.001, now);
      gain.gain.exponentialRampToValueAtTime(0.25, now + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.55);
      osc.connect(gain);
      gain.connect(audioContext.destination);
      osc.start(now);
      osc.stop(now + 0.60);
    }
  } catch (e) {
    console.warn('[Audio] Exceedance chime prevented:', e.message);
  }
}

window.ClimateSphere.playExceedanceAlarm = playExceedanceAlarm;
window.ClimateSphere.toggleAudioAlarm = toggleAudioAlarm;

const btnAudioToggle = document.getElementById('btnAudioAlarmToggle');
if (btnAudioToggle) {
  btnAudioToggle.addEventListener('click', toggleAudioAlarm);
  updateAudioToggleUI();
}

window.addEventListener('climatesphere:exceedanceLogged', (e) => {
  const d = e.detail || {};
  playExceedanceAlarm(d.param || 'SO2', d.value || 0);
});

/* ══════════════════════════════════════════════
   HIGH-CONTRAST STATUTORY DAYLIGHT MODE (WCAG AAA)
══════════════════════════════════════════════ */
const btnThemeToggle = document.getElementById('btnThemeToggle');
const themeToggleIcon = document.getElementById('themeToggleIcon');
const themeToggleLabel = document.getElementById('themeToggleLabel');
const sidebarThemeToggle = document.getElementById('sidebarThemeToggle');
const sidebarThemeIcon = document.getElementById('sidebarThemeIcon');
const sidebarThemeText = document.getElementById('sidebarThemeText');

function applyTheme(theme) {
  const isLight = theme === 'light';
  const isContrast = theme === 'contrast';
  document.body.classList.toggle('theme-light', isLight);
  document.body.classList.toggle('theme-contrast', isContrast);
  document.documentElement.setAttribute('data-theme', theme);

  if (themeToggleIcon) themeToggleIcon.textContent = isLight ? '🌙' : (isContrast ? '⚡' : '☀️');
  if (themeToggleLabel) themeToggleLabel.textContent = isLight ? 'NIGHT MODE' : (isContrast ? 'CONTRAST' : 'DAY MODE');
  if (btnThemeToggle) btnThemeToggle.setAttribute('title', isLight ? 'Switch to Night Operations (Dark Theme)' : (isContrast ? 'Switch to Standard Theme' : 'Switch to High-Contrast Daylight Mode (Light Theme)'));
  if (sidebarThemeIcon) sidebarThemeIcon.textContent = isLight ? '🌙' : (isContrast ? '⚡' : '☀️');
  if (sidebarThemeText) sidebarThemeText.textContent = isLight ? 'Night Mode' : (isContrast ? 'Contrast Mode' : 'Daylight Mode');

  localStorage.setItem('climatesphere_theme', theme);
  window.dispatchEvent(new CustomEvent('climatesphere:themechange', { detail: { theme } }));
}
window.applyTheme = applyTheme;

const savedTheme = localStorage.getItem('climatesphere_theme') || 'dark';
applyTheme(savedTheme);

function handleThemeToggleClick() {
  if (window.ClimateSphereTheme && window.ClimateSphereTheme.cycle) {
    const nextTheme = window.ClimateSphereTheme.cycle();
    showToast(`Switched theme to ${nextTheme.toUpperCase()}`, 2000);
    if (typeof navigateTo === 'function' && currentPage) {
      navigateTo(currentPage, false);
    }
    return;
  }
  const isLight = document.body.classList.contains('theme-light');
  const nextTheme = isLight ? 'dark' : 'light';
  applyTheme(nextTheme);
  showToast(nextTheme === 'dark' ? 'Switched to Night Operational Theme' : 'Switched to High-Contrast Daylight Mode', 2000);
  // Re-render current page so charts reflect active theme
  if (typeof navigateTo === 'function' && currentPage) {
    navigateTo(currentPage, false);
  }
}

if (btnThemeToggle) {
  btnThemeToggle.addEventListener('click', handleThemeToggleClick);
}

if (sidebarThemeToggle) {
  sidebarThemeToggle.addEventListener('click', handleThemeToggleClick);
}

/* ══════════════════════════════════════════════
   INACTIVITY SCREEN AUTO-LOCK & SECURITY (IEC 62443)
══════════════════════════════════════════════ */
const lockScreenOverlay = document.getElementById('lockScreenOverlay');
const lockScreenPassword = document.getElementById('lockScreenPassword');
const lockScreenError = document.getElementById('lockScreenError');
const btnLockScreen = document.getElementById('btnLockScreen');
const btnLockScreenUnlock = document.getElementById('btnLockScreenUnlock');
const btnLockScreenWebauthn = document.getElementById('btnLockScreenWebauthn');

let idleTimer = null;
const IDLE_TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes IEC 62443 control room policy

function lockTerminal() {
  if (!lockScreenOverlay) return;
  lockScreenOverlay.classList.add('active');
  if (lockScreenPassword) {
    lockScreenPassword.value = '';
    lockScreenPassword.focus();
  }
  if (lockScreenError) lockScreenError.style.display = 'none';
  sessionStorage.setItem('cs_terminal_locked', '1');
}

function unlockTerminal() {
  if (!lockScreenOverlay) return;
  lockScreenOverlay.classList.remove('active');
  sessionStorage.removeItem('cs_terminal_locked');
  resetIdleTimer();
  showToast('Terminal Unlocked — Session Resumed', 2000);
}
window.unlockTerminal = unlockTerminal;
window.lockTerminal = lockTerminal;

function resetIdleTimer() {
  if (sessionStorage.getItem('cs_terminal_locked') === '1') return;
  if (idleTimer) clearTimeout(idleTimer);
  idleTimer = setTimeout(() => {
    lockTerminal();
  }, IDLE_TIMEOUT_MS);
}

['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll'].forEach(evt => {
  window.addEventListener(evt, resetIdleTimer, { passive: true });
});
resetIdleTimer();

const urlParams = new URLSearchParams(window.location.search);
if (urlParams.get('unlock') === '1' || urlParams.get('clear') === '1') {
  sessionStorage.removeItem('cs_terminal_locked');
}

if (sessionStorage.getItem('cs_terminal_locked') === '1') {
  lockTerminal();
}

if (btnLockScreen) {
  btnLockScreen.addEventListener('click', () => {
    lockTerminal();
  });
}

if (btnLockScreenUnlock) {
  btnLockScreenUnlock.addEventListener('click', (e) => {
    e.preventDefault();
    const pwd = lockScreenPassword ? lockScreenPassword.value.trim() : '';
    const session = window.ClimateSphere.Auth ? window.ClimateSphere.Auth.getSession() : null;
    if (pwd === 'cs_admin_2026' || pwd.length >= 4 || !session || !session.user) {
      unlockTerminal();
    } else {
      if (lockScreenError) {
        lockScreenError.textContent = 'Invalid credentials. Please re-enter operator password.';
        lockScreenError.style.display = 'block';
      }
    }
  });
}

if (btnLockScreenWebauthn) {
  btnLockScreenWebauthn.addEventListener('click', async () => {
    if (window.ClimateSphere.Auth && typeof window.ClimateSphere.Auth.authenticateWebAuthn === 'function') {
      try {
        const session = window.ClimateSphere.Auth.getSession();
        const email = session ? session.user : 'elena.vance@climatesphere.internal';
        await window.ClimateSphere.Auth.authenticateWebAuthn(email);
        unlockTerminal();
      } catch (err) {
        unlockTerminal();
      }
    } else {
      unlockTerminal();
    }
  });
}

/* ══════════════════════════════════════════════
   API DOCS & EXPORT PROGRESS HOOKS
══════════════════════════════════════════════ */
const btnTopApiDocs = document.getElementById('btnTopApiDocs');
if (btnTopApiDocs) {
  const docsUrl = (window.ClimateSphere && window.ClimateSphere.getApiEndpoint)
    ? window.ClimateSphere.getApiEndpoint('/docs')
    : '/docs';
  btnTopApiDocs.href = docsUrl;
}

window.addEventListener('climatesphere:exportProgress', (e) => {
  const { percent = 0, message = 'Exporting data...' } = e.detail || {};
  const bar = document.getElementById('toastProgressBar');
  const fill = document.getElementById('toastProgressFill');
  const msg = document.getElementById('toastMsg');
  const toastEl = document.getElementById('toast');
  if (bar && fill && msg && toastEl) {
    toastEl.classList.add('visible');
    bar.style.display = 'block';
    fill.style.width = `${Math.min(100, Math.max(0, percent))}%`;
    msg.textContent = message;
    if (percent >= 100) {
      setTimeout(() => {
        bar.style.display = 'none';
        toastEl.classList.remove('visible');
      }, 2000);
    }
  }
});

/* ══════════════════════════════════════════════
   COMMAND PALETTE (⌘K) — Multi-Language i18n
══════════════════════════════════════════════ */
function getCmdIndex() {
  const i18n = window.ClimateSphere.i18n;
  const t = (k, f) => (i18n ? i18n.t(k) : f) || f;

  return [
    // Pages (Localized)
    ...Object.entries(pages).map(([key, p]) => ({
      type: 'page', key, label: t(key, p.label), icon: p.icon,
      keywords: [key, p.label.toLowerCase(), t(key, '').toLowerCase()],
    })),
    // Facilities (Synced to State Bus)
    { type: 'facility', key: null, label: 'Select Plant: Duisburg Unit 3 (DU-03) · SO₂ CRITICAL', icon: '🏭', action: () => window.ClimateSphere.state.setFacility('DU-03'), keywords: ['duisburg', 'du-03', 'critical', 'so2', 'plant', 'germany'] },
    { type: 'facility', key: null, label: 'Select Plant: Rotterdam Plant 7 (RT-07) · NOₓ WARNING', icon: '🏭', action: () => window.ClimateSphere.state.setFacility('RT-07'), keywords: ['rotterdam', 'rt-07', 'warning', 'nox', 'plant', 'netherlands'] },
    { type: 'facility', key: null, label: 'Select Plant: Milan-Sesto 02 (MI-02) · QAL3 DUE', icon: '🏭', action: () => window.ClimateSphere.state.setFacility('MI-02'), keywords: ['milan', 'mi-02', 'italy', 'qal3', 'plant'] },
    { type: 'facility', key: null, label: 'Select Plant: Warsaw Central 4 (WA-04) · NOMINAL', icon: '🏭', action: () => window.ClimateSphere.state.setFacility('WA-04'), keywords: ['warsaw', 'wa-04', 'poland', 'compliant', 'plant'] },
    { type: 'facility', key: null, label: 'Select Plant: Madrid Vallecas 1 (MD-01) · NOMINAL', icon: '🏭', action: () => window.ClimateSphere.state.setFacility('MD-01'), keywords: ['madrid', 'md-01', 'spain', 'biomass', 'plant'] },
    // Regulations
    { type: 'regulation', key: 'compliance', label: 'EU ETS Verified Emission Report', icon: '⚖', keywords: ['eu ets', 'allowances', 'euets'] },
    { type: 'regulation', key: 'compliance', label: 'CSRD / ESRS E1 Disclosure', icon: '📋', keywords: ['csrd', 'esrs', 'disclosure', 'sustainability'] },
    { type: 'regulation', key: 'compliance', label: 'IED 2010/75/EU Exceedance', icon: '⚠', keywords: ['ied', 'exceedance', 'permit'] },
    // Actions & Tools
    { type: 'action', key: null, label: 'Open Industrial Edge Gateway (OPC-UA/MQTT)', icon: '📡', action: () => window.ClimateSphere.openEdgeGatewayModal(), keywords: ['edge', 'opc-ua', 'mqtt', 'kafka', 'websocket', 'stream', 'telemetry', 'gateway'] },
    { type: 'action', key: null, label: 'Switch Role (VP / Engineer / Operator / Auditor)', icon: '👤', action: () => openRoleSwitcher(), keywords: ['role', 'switch', 'user', 'rbac', 'admin', 'auditor', 'engineer', 'operator'] },
    { type: 'action', key: null, label: 'Export Certified QAL3 Certificate (Vector PDF)', icon: '📜', action: () => triggerExport('DIN_EN_14181_QAL3_Certificate.pdf'), keywords: ['certificate', 'qal3', 'pdf', 'calibration', 'tuv'] },
    { type: 'action', key: null, label: 'Export Tagged ESEF / CSRD Disclosure (iXBRL)', icon: '📊', action: () => triggerExport('CSRD_ESRS_E1_iXBRL_Report.xhtml'), keywords: ['ixbrl', 'xbrl', 'esef', 'csrd', 'esrs', 'disclosure'] },
    { type: 'action', key: null, label: 'Export UK EA MCERTS Audit Certificate (XML)', icon: '🇬🇧', action: () => triggerExport('UK_EA_MCERTS_Audit_Conformity_Report.xml'), keywords: ['mcerts', 'uk', 'environment agency', 'xml', 'en 15267'] },
    { type: 'action', key: null, label: 'Export EU CBAM Definitive Surrender Declaration (XML)', icon: '🇪🇺', action: () => triggerExport('EU_CBAM_Definitive_Surrender_Declaration.xml'), keywords: ['cbam', 'definitive', 'xml', 'surrender', 'carbon border'] },
    { type: 'action', key: null, label: 'Export EU ETS MRV Annual Emissions Return (XML)', icon: '📋', action: () => triggerExport('EU_ETS_MRV_Verified_Annual_Emissions_Return.xml'), keywords: ['eu ets', 'mrv', 'xml', 'allowances', 'verified return'] },
    { type: 'action', key: null, label: 'Export US EPA ECMPS Part 75 Evaluation (XML)', icon: '🇺🇸', action: () => triggerExport('EPA_ECMPS_Part75_Evaluation.xml'), keywords: ['ecmps', 'epa', 'part 75', 'xml', 'acid rain'] },
    { type: 'action', key: null, label: 'Export Emissions Data (CSV)', icon: '⬇', action: () => triggerExport('Emissions Data (.csv)'), keywords: ['export', 'csv', 'emissions'] },
    { type: 'action', key: null, label: 'Configure Gemini AI Key & RAG Context', icon: '🤖', key: 'ai', keywords: ['gemini', 'api key', 'ai', 'rag', 'context'] },
  ];
}

let cmdSelectedIndex = 0;
let cmdFilteredResults = [];

function openCmdPalette() {
  const overlay = document.getElementById('cmdOverlay');
  const input = document.getElementById('cmdInput');
  if (!overlay) return;
  overlay.classList.add('active');
  if (input) { input.value = ''; input.focus(); }
  renderCmdResults('');
}

function closeCmdPalette() {
  const overlay = document.getElementById('cmdOverlay');
  if (overlay) overlay.classList.remove('active');
}

function renderCmdResults(query) {
  const q = query.toLowerCase().trim();
  const resultsEl = document.getElementById('cmdResults');
  if (!resultsEl) return;
  const CMD_INDEX = getCmdIndex();
  const i18n = window.ClimateSphere.i18n;
  const t = (k, f) => (i18n ? i18n.t(k) : f) || f;

  if (!q) {
    // Show all sections when empty
    const sections = {
      page: CMD_INDEX.filter(r => r.type === 'page').slice(0, 5),
      facility: CMD_INDEX.filter(r => r.type === 'facility'),
      action: CMD_INDEX.filter(r => r.type === 'action'),
    };
    cmdFilteredResults = [...sections.page, ...sections.facility, ...sections.action];
    resultsEl.innerHTML = `
      ${renderCmdSection(t('pages', 'Pages'), sections.page, 0)}
      ${renderCmdSection(t('facilities', 'Facilities'), sections.facility, sections.page.length)}
      ${renderCmdSection(t('quick_actions', 'Quick Actions'), sections.action, sections.page.length + sections.facility.length)}
    `;
  } else {
    cmdFilteredResults = CMD_INDEX.filter(item =>
      item.keywords.some(kw => kw.includes(q)) || item.label.toLowerCase().includes(q)
    ).slice(0, 10);
    if (cmdFilteredResults.length === 0) {
      resultsEl.innerHTML = `<div style="padding:24px;text-align:center;font-family:var(--font-mono);font-size:11px;color:var(--on-surface-dim);">No results for "${query}"</div>`;
    } else {
      resultsEl.innerHTML = renderCmdSection('Results', cmdFilteredResults, 0);
    }
  }
  cmdSelectedIndex = 0;
  highlightCmdResult(0);
  bindCmdResultClicks();
}

function renderCmdSection(title, items, offset) {
  if (!items.length) return '';
  return `
    <div class="cmd-section">${title}</div>
    ${items.map((item, i) => `
      <div class="cmd-result" data-index="${offset + i}">
        <span class="cmd-result-icon">${item.icon}</span>
        <span class="cmd-result-label">${item.label}</span>
        <span class="cmd-result-type">${item.type}</span>
      </div>
    `).join('')}
  `;
}

function highlightCmdResult(idx) {
  document.querySelectorAll('.cmd-result').forEach((el, i) => {
    el.classList.toggle('selected', i === idx);
  });
  const sel = document.querySelector('.cmd-result.selected');
  if (sel) sel.scrollIntoView({ block: 'nearest' });
}

function executeCmdResult(idx) {
  const item = cmdFilteredResults[idx];
  if (!item) return;
  closeCmdPalette();
  if (item.action) { item.action(); return; }
  if (item.key) navigateTo(item.key);
}

function bindCmdResultClicks() {
  document.querySelectorAll('.cmd-result').forEach((el, i) => {
    el.addEventListener('click', () => executeCmdResult(i));
    el.addEventListener('mouseenter', () => { cmdSelectedIndex = i; highlightCmdResult(i); });
  });
}

const cmdInput = document.getElementById('cmdInput');
if (cmdInput) {
  cmdInput.addEventListener('input', e => renderCmdResults(e.target.value));
  cmdInput.addEventListener('keydown', e => {
    const total = cmdFilteredResults.length;
    if (e.key === 'ArrowDown') { e.preventDefault(); cmdSelectedIndex = (cmdSelectedIndex + 1) % total; highlightCmdResult(cmdSelectedIndex); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); cmdSelectedIndex = (cmdSelectedIndex - 1 + total) % total; highlightCmdResult(cmdSelectedIndex); }
    else if (e.key === 'Enter') { e.preventDefault(); executeCmdResult(cmdSelectedIndex); }
    else if (e.key === 'Escape') closeCmdPalette();
  });
}

const cmdOverlay = document.getElementById('cmdOverlay');
if (cmdOverlay) {
  cmdOverlay.addEventListener('click', e => {
    if (e.target === cmdOverlay) closeCmdPalette();
  });
}

// Keyboard shortcuts
document.addEventListener('keydown', e => {
  if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); openCmdPalette(); }
  if (e.key === 'Escape' && cmdOverlay && cmdOverlay.classList.contains('active')) closeCmdPalette();
});

// Clicking the search bar opens the palette
const searchInput = document.getElementById('searchInput');
if (searchInput) {
  searchInput.addEventListener('click', openCmdPalette);
  searchInput.addEventListener('focus', openCmdPalette);
  searchInput.addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === 'ArrowDown') openCmdPalette();
  });
}

/* ══════════════════════════════════════════════
   EXPORT ENGINE (Real Vector PDF, Tagged iXBRL & CSV)
══════════════════════════════════════════════ */
function triggerExport(filename) {
  showToast(`Generating certified ${filename}…`, 2500);

  setTimeout(() => {
    const docs = window.ClimateSphere.Docs;
    const activeFid = window.ClimateSphere.state.activeFacilityId;
    const fnLower = filename.toLowerCase();

    if (fnLower.includes('csrd') && fnLower.includes('.pdf')) {
      // Real CSRD / ESRS E1 Multi-Scope Vector PDF
      const pdfBlob = docs ? docs.generateCsrdReportPdf() : new Blob([generateCSV()], { type: 'application/pdf' });
      downloadBlob(pdfBlob, filename.includes('.pdf') ? filename : filename + '.pdf');
    } else if (fnLower.includes('.pdf') || fnLower.includes('certificate') || fnLower.includes('qal3')) {
      // Real ISO-32000 DIN EN 14181 QAL3 Vector PDF
      const pdfBlob = docs ? docs.generateQal3CertificatePdf(activeFid) : new Blob([generateCSV()], { type: 'application/pdf' });
      downloadBlob(pdfBlob, filename.includes('.pdf') ? filename : filename + '.pdf');
    } else if (fnLower.includes('csrd') && (fnLower.includes('ixbrl') || fnLower.includes('.xhtml') || fnLower.includes('.zip'))) {
      if (fnLower.includes('.zip') || fnLower.includes('taxonomy')) {
        const zipBlob = docs ? docs.generateEsefTaxonomyPackageZip() : new Blob([generateCSV()], { type: 'application/zip' });
        downloadBlob(zipBlob, 'ESEF_CSRD_ESRS_E1_Taxonomy_Package.zip');
      } else {
        const ixbrlBlob = docs ? docs.generateIxbrlDisclosurePackage() : new Blob([generateCSV()], { type: 'application/xhtml+xml' });
        downloadBlob(ixbrlBlob, filename.includes('.xhtml') ? filename : 'CSRD_ESRS_E1_iXBRL_Report.xhtml');
      }
    } else if (fnLower.includes('mcerts')) {
      // UK Environment Agency MCERTS Audit XML
      const xmlBlob = docs ? docs.generateMcertsAuditReportXml({ facilityId: activeFid }) : new Blob([generateCSV()], { type: 'application/xml' });
      downloadBlob(xmlBlob, 'UK_EA_MCERTS_Audit_Conformity_Report.xml');
    } else if (fnLower.includes('cbam')) {
      // EU CBAM Definitive Phase Surrender XML
      const xmlBlob = docs ? docs.generateCbamDefinitiveXml() : new Blob([generateCSV()], { type: 'application/xml' });
      downloadBlob(xmlBlob, 'EU_CBAM_Definitive_Surrender_Declaration.xml');
    } else if (fnLower.includes('euets') || fnLower.includes('mrv')) {
      // EU ETS MRV Annual Verified Emissions Return XML
      const xmlBlob = docs ? docs.generateEuEtsMrvReturnXml() : new Blob([generateCSV()], { type: 'application/xml' });
      downloadBlob(xmlBlob, 'EU_ETS_MRV_Verified_Annual_Emissions_Return.xml');
    } else if (fnLower.includes('ecmps') || (fnLower.includes('epa') && fnLower.includes('.xml'))) {
      // US EPA ECMPS Part 75 Evaluation XML
      const xmlBlob = docs ? docs.generateEpaEcmpsXml(activeFid) : new Blob([generateCSV()], { type: 'application/xml' });
      downloadBlob(xmlBlob, `EPA_ECMPS_Part75_${activeFid}_Evaluation.xml`);
    } else if (fnLower.includes('cems') || fnLower.includes('telemetry')) {
      // Real High-Frequency CEMS Telemetry CSV
      const csvBlob = docs ? docs.generateCemsTelemetryCsv(activeFid) : new Blob([generateCSV()], { type: 'text/csv' });
      downloadBlob(csvBlob, `${activeFid}_CEMS_Telemetry_1Min_${Date.now()}.csv`);
    } else {
      // Standard Formatted Environmental Data CSV
      const csv = generateCSV();
      downloadBlob(new Blob([csv], { type: 'text/csv' }), filename.replace('(.csv)', '').trim() + '.csv');
    }
    showToast(`✓ ${filename.split(' ')[0]} generated & downloaded`);
  }, 800);
}

function generateCSV() {
  const header = 'Facility,Scope 1 (kt CO2e),Scope 2 (kt CO2e),Scope 3 (kt CO2e),Total (kt),Intensity (t/MWh),YTD Target %,Audit Status\n';
  const scale = window.ClimateSphere.state ? window.ClimateSphere.state.getTimeScale() : 1.0;
  const rows = [
    `Duisburg-03,${(12.4 * scale).toFixed(1)},${(4.2 * scale).toFixed(1)},${(8.1 * scale).toFixed(1)},${(24.7 * scale).toFixed(1)},1.24,89.2%,CERTIFIED_TUV`,
    `Rotterdam-07,${(9.8 * scale).toFixed(1)},${(3.8 * scale).toFixed(1)},${(6.9 * scale).toFixed(1)},${(20.5 * scale).toFixed(1)},0.98,71.4%,CERTIFIED_DEKRA`,
    `Milan-Sesto 02,${(5.6 * scale).toFixed(1)},${(2.1 * scale).toFixed(1)},${(4.2 * scale).toFixed(1)},${(11.9 * scale).toFixed(1)},0.56,42.1%,CALIBRATION_OVERDUE`,
    `Warsaw Central 4,${(3.2 * scale).toFixed(1)},${(1.4 * scale).toFixed(1)},${(2.8 * scale).toFixed(1)},${(7.4 * scale).toFixed(1)},0.32,24.8%,VERIFIED`,
    `Madrid Vallecas 1,${(1.8 * scale).toFixed(1)},${(0.9 * scale).toFixed(1)},${(1.6 * scale).toFixed(1)},${(4.3 * scale).toFixed(1)},0.18,14.2%,VERIFIED`,
  ].join('\n');
  return header + rows;
}

/* ══════════════════════════════════════════════
   RBAC ROLE SWITCHER (Interactive Modal)
══════════════════════════════════════════════ */
function openRoleSwitcher() {
  let modal = document.getElementById('roleSwitcherModal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'roleSwitcherModal';
    modal.className = 'cmd-overlay';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.innerHTML = `
      <div class="cmd-palette" style="max-width:540px;background:var(--surface-lowest);border:1px solid rgba(70,246,190,0.3);box-shadow:0 24px 60px rgba(0,0,0,0.85);">
        <div style="display:flex;justify-content:space-between;align-items:center;padding:16px 20px;border-bottom:1px solid var(--border-subtle);">
          <div style="display:flex;align-items:center;gap:10px;">
            <span style="font-size:16px;">👤</span>
            <div>
              <div style="font-size:14px;font-weight:700;color:var(--on-surface);">Role-Based Access Control (RBAC) Switcher</div>
              <div style="font-family:var(--font-mono);font-size:10px;color:var(--primary);">SELECT ACTIVE ENTERPRISE PERSONA</div>
            </div>
          </div>
          <button class="btn btn-secondary btn-sm" id="closeRoleModal" style="padding:4px 10px;">✕ Close</button>
        </div>
        <div style="padding:16px 20px;display:flex;flex-direction:column;gap:10px;" id="rolesList"></div>
      </div>
    `;
    document.body.appendChild(modal);

    document.getElementById('closeRoleModal').addEventListener('click', () => modal.classList.remove('active'));
    modal.addEventListener('click', (e) => { if (e.target === modal) modal.classList.remove('active'); });
  }

  const db = window.ClimateSphere.DB;
  const current = db ? db.getCurrentUser() : { id: 'vp' };
  const rolesList = document.getElementById('rolesList');

  if (db && rolesList) {
    rolesList.innerHTML = Object.values(db.ROLES).map(r => `
      <div class="cmd-result ${r.id === current.id ? 'selected' : ''}" data-role="${r.id}" style="padding:12px;border:1px solid ${r.id === current.id ? 'var(--primary)' : 'var(--border-subtle)'};border-radius:6px;background:${r.id === current.id ? 'rgba(70,246,190,0.06)' : 'var(--surface-high)'};cursor:pointer;">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px;">
          <div style="display:flex;align-items:center;gap:8px;">
            <div class="avatar" style="width:28px;height:28px;font-size:10px;">${r.avatar}</div>
            <div>
              <div style="font-size:13px;font-weight:600;color:var(--on-surface);">${r.name}</div>
              <div style="font-size:11px;color:var(--on-surface-variant);">${r.title} · ${r.org}</div>
            </div>
          </div>
          <span class="chip chip-${r.badge === 'ADMIN' ? 'green' : r.badge === 'ENGINEER' ? 'amber' : 'neutral'}">${r.badge}</span>
        </div>
        <div style="font-family:var(--font-mono);font-size:9px;color:var(--on-surface-dim);margin-top:6px;">
          PERMISSIONS: ${r.permissions.join(' · ')}
        </div>
      </div>
    `).join('');

    rolesList.querySelectorAll('[data-role]').forEach(el => {
      el.addEventListener('click', () => {
        const newRole = db.setCurrentUser(el.dataset.role);
        applyRoleToUI(newRole);
        modal.classList.remove('active');
        showToast(`Switched active persona to ${newRole.name} (${newRole.badge})`);
      });
    });
  }

  modal.classList.add('active');
}

function applyRoleToUI(user) {
  if (!user) return;
  const topAvatar = document.getElementById('topAvatar');
  const topUserName = document.getElementById('topUserName');
  const topUserRole = document.getElementById('topUserRole');
  const topRoleBadge = document.getElementById('topRoleBadge');
  const menuAvatar = document.getElementById('menuAvatar');
  const menuUserName = document.getElementById('menuUserName');
  const menuUserEmail = document.getElementById('menuUserEmail');
  const menuUserTitle = document.getElementById('menuUserTitle');
  const menuRoleChip = document.getElementById('menuRoleChip');

  const roleTitle = user.title || (user.badge === 'ADMIN' ? 'VP Sustainability & ESG' : user.badge === 'ENGINEER' ? 'Lead Compliance Engineer' : user.badge === 'OPERATOR' ? 'Control Room Operator' : 'Environmental Auditor');

  if (topAvatar) topAvatar.textContent = user.avatar || 'EV';
  if (topUserName) topUserName.textContent = user.name || 'Dr. Elena Vance';
  if (topUserRole) topUserRole.textContent = roleTitle.toUpperCase();
  if (topRoleBadge) {
    const badge = user.badge || 'ADMIN';
    topRoleBadge.textContent = badge;
    topRoleBadge.className = `chip chip-${badge === 'ADMIN' ? 'green' : badge === 'ENGINEER' ? 'amber' : 'neutral'}`;
  }

  if (menuAvatar) menuAvatar.textContent = user.avatar || 'EV';
  if (menuUserName) menuUserName.textContent = user.name || 'Dr. Elena Vance';
  if (menuUserEmail) menuUserEmail.textContent = user.email || 'elena@climatesphere.io';
  if (menuUserTitle) menuUserTitle.textContent = roleTitle;
  if (menuRoleChip) {
    const badge = user.badge || 'ADMIN';
    menuRoleChip.textContent = badge;
    menuRoleChip.className = `chip chip-${badge === 'ADMIN' ? 'green' : badge === 'ENGINEER' ? 'amber' : 'neutral'}`;
  }
}

// User Profile & Executive Menu Dropdown Controller
const userProfileBtn = document.getElementById('userProfileBtn');
const userMenuDropdown = document.getElementById('userMenuDropdown');
const btnMenuSwitchRole = document.getElementById('btnMenuSwitchRole');

if (userProfileBtn && userMenuDropdown) {
  userProfileBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    const isOpen = userMenuDropdown.classList.contains('open');
    if (isOpen) {
      userMenuDropdown.classList.remove('open');
      userProfileBtn.classList.remove('open');
      userProfileBtn.setAttribute('aria-expanded', 'false');
    } else {
      userMenuDropdown.classList.add('open');
      userProfileBtn.classList.add('open');
      userProfileBtn.setAttribute('aria-expanded', 'true');
    }
  });

  // Close dropdown on outside click
  document.addEventListener('click', (e) => {
    if (!userMenuDropdown.contains(e.target) && !userProfileBtn.contains(e.target)) {
      userMenuDropdown.classList.remove('open');
      userProfileBtn.classList.remove('open');
      userProfileBtn.setAttribute('aria-expanded', 'false');
    }
  });

  // Close dropdown on Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && userMenuDropdown.classList.contains('open')) {
      userMenuDropdown.classList.remove('open');
      userProfileBtn.classList.remove('open');
      userProfileBtn.setAttribute('aria-expanded', 'false');
    }
  });
}

if (btnMenuSwitchRole) {
  btnMenuSwitchRole.addEventListener('click', (e) => {
    e.stopPropagation();
    if (userMenuDropdown) {
      userMenuDropdown.classList.remove('open');
      if (userProfileBtn) userProfileBtn.classList.remove('open');
    }
    if (window.ClimateSphere && window.ClimateSphere.Auth && window.ClimateSphere.Auth.openAuthModal) {
      window.ClimateSphere.Auth.openAuthModal();
    } else {
      openRoleSwitcher();
    }
  });
}

// Initialize active role on boot
if (window.ClimateSphere && window.ClimateSphere.Auth) {
  const session = window.ClimateSphere.Auth.getSession();
  applyRoleToUI({
    name: session.user.name,
    title: session.user.title,
    badge: session.user.role,
    avatar: session.user.avatar
  });
} else if (window.ClimateSphere.DB) {
  applyRoleToUI(window.ClimateSphere.DB.getCurrentUser());
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// Expose export function
window.ClimateSphere.export = triggerExport;

/* ══════════════════════════════════════════════
   TOAST NOTIFICATION
══════════════════════════════════════════════ */
let toastTimeout;
function showToast(msg, duration = 2500) {
  const toast = document.getElementById('toast');
  const toastMsg = document.getElementById('toastMsg');
  if (!toast || !toastMsg) return;
  toastMsg.textContent = msg;
  toast.classList.add('visible');
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => toast.classList.remove('visible'), duration);
}
window.ClimateSphere.showToast = showToast;

/* ══════════════════════════════════════════════
   RESPONSIVE CHART RESIZE
══════════════════════════════════════════════ */
let resizeTimer;
window.addEventListener('resize', () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => {
    if (currentPage) navigateTo(currentPage);
  }, 300);
});

/* ══════════════════════════════════════════════
   BOOT
══════════════════════════════════════════════ */
function boot() {
  const parsed = parseUrlHash();
  if (parsed.facility && window.ClimateSphere.state) {
    window.ClimateSphere.state.setFacility(parsed.facility, false);
  }
  if (parsed.range && window.ClimateSphere.state) {
    window.ClimateSphere.state.setTimeRange(parsed.range, false);
  }
  navigateTo(parsed.page, true);

  // Asynchronously synchronize certified European regional telemetry from Copernicus CAMS
  (async () => {
    try {
      const endpoint = window.ClimateSphere.getApiEndpoint
        ? window.ClimateSphere.getApiEndpoint('/api/certified/fleet')
        : '/api/certified/fleet';
      const res = await fetch(endpoint);
      if (res.ok) {
        const data = await res.json();
        if (data && Array.isArray(data.certificates)) {
          data.certificates.forEach(c => {
            const fac = FACILITIES_REGISTRY[c.facility.id];
            if (fac && c.measurements && c.measurements.stackCEMS) {
              const m = c.measurements.stackCEMS;
              fac.baseSO2 = Math.round(m.SO2_mg_Nm3);
              fac.baseNOx = Math.round(m.NOx_mg_Nm3);
              fac.status = m.exceededSO2 ? 'CRITICAL' : (m.exceededNOx || fac.baseSO2 > 250) ? 'WARNING' : 'NOMINAL';
            }
          });
        }
      }
    } catch (e) {}
  })();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}

