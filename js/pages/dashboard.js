/**
 * ClimateSphere — Overview Dashboard Page
 */

const Dashboard = (() => {

  const hotspots = [
    { id: 'DU-03', name: 'Duisburg-03', country: 'Germany', region: 'Ruhr Valley', station: 'DENW034 (Walsum)', so2: 847, nox: 412, status: 'CRITICAL', lat: 38, lng: 42 },
    { id: 'RT-07', name: 'Rotterdam-07', country: 'Netherlands', region: 'Botlek Port', station: 'NL10418 (Botlek)', so2: 621, nox: 389, status: 'WARNING', lat: 30, lng: 37 },
    { id: 'MI-02', name: 'Milan-02', country: 'Italy', region: 'Po Basin', station: 'IT0451A (Sesto)', so2: 298, nox: 201, status: 'WARNING', lat: 44, lng: 49 },
    { id: 'WA-04', name: 'Warsaw-04', country: 'Poland', region: 'Masovia', station: 'PL0008A (Żerań)', so2: 156, nox: 134, status: 'NOMINAL', lat: 50, lng: 42 },
    { id: 'MD-01', name: 'Madrid-01', country: 'Spain', region: 'Vallecas', station: 'ES1528A (Vallecas)', so2: 89, nox: 76, status: 'NOMINAL', lat: 18, lng: 53 },
  ];

  const timeLabels = ['00:00','02:00','04:00','06:00','08:00','10:00','12:00','14:00','16:00','18:00','20:00','22:00'];
  const baseCo2 = [820,790,810,850,900,940,960,980,950,920,890,870];
  const baseNox = [340,320,315,350,400,420,410,415,405,390,370,360];

  function statusColor(s) {
    return s === 'CRITICAL' ? 'red' : s === 'WARNING' ? 'amber' : 'green';
  }

  function render() {
    const scale = window.ClimateSphere.state ? window.ClimateSphere.state.getTimeScale() : 1.0;
    const timeRangeKey = window.ClimateSphere.state ? window.ClimateSphere.state.activeTimeRange.toUpperCase() : 'Q3';
    const activeFid = window.ClimateSphere.state ? window.ClimateSphere.state.activeFacilityId : 'DU-03';

    const dynamicKpis = [
      { label: `TOTAL CO₂ EQUIVALENT (${timeRangeKey})`, value: Math.round(1247 * scale).toLocaleString(), unit: 'kt CO₂e', delta: '+2.4%', dir: 'up', type: 'red' },
      { label: `SCOPE 1 EMISSIONS (${timeRangeKey})`, value: Math.round(482 * scale).toLocaleString(), unit: 'kt CO₂e', delta: '-5.1%', dir: 'down', type: 'primary' },
      { label: 'CARBON INTENSITY', value: '0.38', unit: 't CO₂e/MWh', delta: '-3.8%', dir: 'down', type: 'primary' },
      { label: 'ACTIVE CEMS FEEDS', value: '47', unit: '/ 52 units', delta: '5 OFFLINE', dir: 'neutral', type: 'amber' },
    ];

    return `
      <!-- KPI Row -->
      <div class="page-header">
        <div class="page-title-group">
          <span class="page-subtitle">REAL-TIME INTELLIGENCE · ${timeRangeKey} CONTEXT · ACTIVE: ${activeFid}</span>
          <h1 class="page-title">Emissions Overview</h1>
          <p class="page-meta">European Operations Network · 52 facilities · Stream synchronizing via OPC-UA/MQTT Gateway</p>
        </div>
        <div class="page-actions">
          <button class="btn btn-secondary btn-sm" id="btnDashboardExportPdf">⬇ Export Certified PDF</button>
          <button class="btn btn-primary btn-sm" id="btnDashboardAiAnalysis">⚡ Run AI Analysis</button>
        </div>
      </div>

      <!-- KPI Cards -->
      <div class="grid-4" style="margin-bottom:var(--space-lg)">
        ${dynamicKpis.map((k, i) => `
          <div class="metric-card ${k.type}">
            <span class="metric-label">${k.label}</span>
            <div style="display:flex;align-items:baseline;gap:4px;">
              <span class="metric-value">${k.value}</span>
              <span class="metric-unit">${k.unit}</span>
            </div>
            <div class="metric-delta delta-${k.dir}">
              ${k.dir === 'up' ? '▲' : k.dir === 'down' ? '▼' : '◆'} ${k.delta}
              <span style="color:var(--on-surface-dim);font-weight:400;margin-left:2px;">vs previous cycle</span>
            </div>
            <div class="chart-wrapper" style="height:40px;" id="kpi-spark-${i}"></div>
          </div>
        `).join('')}
      </div>

      <!-- Main Grid -->
      <div class="grid-12" style="margin-bottom:var(--space-lg)">

        <!-- Emissions Timeline -->
        <div class="card col-span-8">
          <div class="card-header">
            <span class="card-title">Emissions Timeline — ${timeRangeKey} (UTC)</span>
            <div style="display:flex;gap:12px;align-items:center;">
              <div style="display:flex;align-items:center;gap:5px;"><span style="width:8px;height:2px;background:#46f6be;display:inline-block;border-radius:1px;"></span><span style="font-family:var(--font-mono);font-size:9px;color:var(--on-surface-variant);">CO₂</span></div>
              <div style="display:flex;align-items:center;gap:5px;"><span style="width:8px;height:2px;background:#ffb957;display:inline-block;border-radius:1px;"></span><span style="font-family:var(--font-mono);font-size:9px;color:var(--on-surface-variant);">NOₓ</span></div>
              <span class="card-meta">t/h · ROLLING AVG</span>
            </div>
          </div>
          <div class="card-body" style="padding:10px 14px 14px;">
            <div id="emissionsChart" style="height:180px;"></div>
          </div>
        </div>

        <!-- Scope Breakdown -->
        <div class="card col-span-4">
          <div class="card-header">
            <span class="card-title">Scope Breakdown</span>
            <span class="card-meta">Scaled to ${timeRangeKey}</span>
          </div>
          <div class="card-body" style="display:flex;flex-direction:column;align-items:center;gap:14px;padding:16px;">
            <div id="scopeDonut"></div>
            <div style="width:100%;display:flex;flex-direction:column;gap:8px;">
              ${[
                { label: 'Scope 1 — Direct', value: `${(38.7).toFixed(1)}%`, color: '#46f6be' },
                { label: 'Scope 2 — Energy', value: `${(29.4).toFixed(1)}%`, color: '#ffb957' },
                { label: 'Scope 3 — Value Chain', value: `${(31.9).toFixed(1)}%`, color: 'rgba(255,255,255,0.3)' },
              ].map(s => `
                <div style="display:flex;align-items:center;justify-content:space-between;">
                  <div style="display:flex;align-items:center;gap:8px;">
                    <span style="width:8px;height:8px;background:${s.color};border-radius:2px;display:inline-block;"></span>
                    <span style="font-size:11px;color:var(--on-surface-variant);">${s.label}</span>
                  </div>
                  <span style="font-family:var(--font-mono);font-size:11px;font-weight:600;color:var(--on-surface);">${s.value}</span>
                </div>
              `).join('')}
            </div>
          </div>
        </div>

      </div>

      <!-- Bottom Grid -->
      <div class="grid-12">

        <!-- Hotspot Map -->
        <div class="card col-span-7">
          <div class="card-header">
            <span class="card-title">Facility Hotspot Map — Europe</span>
            <div style="display:flex;gap:8px;">
              <span class="chip chip-red">● Critical (1)</span>
              <span class="chip chip-amber">◆ Warning (2)</span>
              <span class="chip chip-green">● Nominal (2)</span>
            </div>
          </div>
          <div class="map-container" style="height:220px;" id="hotspotMap">
            <div class="map-grid"></div>
            <!-- SVG world map outline -->
            <svg viewBox="0 0 500 300" class="world-map-svg" style="position:absolute;inset:0;width:100%;height:100%;opacity:0.08;" preserveAspectRatio="xMidYMid meet">
              <path d="M60,80 Q100,60 140,70 L160,90 Q180,85 200,95 L220,80 Q260,75 280,90 L300,80 Q340,70 360,85 L380,95 Q400,90 420,100 L440,110 Q450,130 440,150 L420,160 Q400,170 380,160 L360,150 Q340,155 320,165 L300,170 Q280,175 260,165 L240,155 Q220,160 200,170 L180,175 Q160,180 140,170 L120,160 Q100,155 80,165 L60,155 Q40,145 50,125 Z" fill="#bacac1"/>
              <path d="M100,120 Q120,115 130,125 L125,140 Q115,148 100,140 Z" fill="#bacac1"/>
              <path d="M380,140 Q400,135 420,145 L430,160 Q420,172 400,168 L385,158 Z" fill="#bacac1"/>
            </svg>
            <!-- Hotspot markers (Clickable) -->
            ${hotspots.map(h => `
              <div class="map-hotspot ${h.status.toLowerCase()} ${h.id === activeFid ? 'active-marker' : ''}" 
                   style="left:${h.lng}%;top:${h.lat}%;cursor:pointer;${h.id === activeFid ? 'transform:scale(1.4);box-shadow:0 0 16px var(--primary);' : ''}" 
                   data-fid="${h.id}" 
                   title="${h.name} (${h.id}) — Click to focus"></div>
            `).join('')}
          </div>
        </div>

        <!-- Hotspot Table -->
        <div class="card col-span-5">
          <div class="card-header">
            <span class="card-title">Top Emission Sites</span>
            <span class="card-meta">Click site to focus</span>
          </div>
          <div style="overflow-x:auto;">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Facility</th>
                  <th class="right">SO₂</th>
                  <th class="right">NOₓ</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                ${hotspots.map(h => `
                  <tr data-fid="${h.id}" style="cursor:pointer;transition:all 150ms;${h.id === activeFid ? 'background:rgba(70,246,190,0.08);border-left:3px solid var(--primary);' : ''}" title="Click to select ${h.name}">
                    <td>
                      <div style="display:flex;flex-direction:column;gap:1px;">
                        <span style="font-weight:${h.id === activeFid ? '700' : '500'};color:${h.id === activeFid ? 'var(--primary)' : 'var(--on-surface)'};">${h.name} ${h.id === activeFid ? '◀' : ''}</span>
                        <span style="font-family:var(--font-mono);font-size:9px;color:var(--on-surface-variant);">${h.id} · ${h.country} · ${h.station}</span>
                      </div>
                    </td>
                    <td class="mono" style="color:${h.so2 > 500 ? 'var(--status-red)' : 'inherit'};">${h.so2}</td>
                    <td class="mono" style="color:${h.nox > 200 ? 'var(--secondary)' : 'inherit'};">${h.nox}</td>
                    <td><span class="chip chip-${statusColor(h.status)}">${h.status}</span></td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      <!-- Compliance Strip -->
      <div style="margin-top:var(--space-md);">
        <div class="card">
          <div class="card-header">
            <span class="card-title">Compliance & Regulatory Status</span>
            <span class="card-meta">Updated hourly</span>
          </div>
          <div class="card-body">
            <div style="display:flex;gap:var(--space-lg);flex-wrap:wrap;">
              ${[
                { label: 'EU ETS Allowances Used', value: 82, color: '#ffb957' },
                { label: 'IED Permit Compliance', value: 94, color: '#46f6be' },
                { label: 'CSRD Disclosure Ready', value: 67, color: '#ffb957' },
                { label: 'EN 14181 QAL3 Valid', value: 88, color: '#46f6be' },
              ].map(c => `
                <div style="flex:1;min-width:150px;">
                  <div style="display:flex;justify-content:space-between;margin-bottom:6px;">
                    <span style="font-family:var(--font-mono);font-size:9px;letter-spacing:0.04em;text-transform:uppercase;color:var(--on-surface-variant);">${c.label}</span>
                    <span style="font-family:var(--font-mono);font-size:11px;font-weight:600;color:${c.color};">${c.value}%</span>
                  </div>
                  <div class="progress-bar">
                    <div class="progress-fill" style="width:${c.value}%;background:${c.color};"></div>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        </div>
      </div>
    `;
  }

  function init() {
    const scale = window.ClimateSphere.state ? window.ClimateSphere.state.getTimeScale() : 1.0;

    // Sparklines
    const sparkData = [
      [820,840,870,850,900,920,980,960,940,920,900,870].map(v => Math.round(v * scale)),
      [450,440,470,465,480,490,500,482,470,465,460,482].map(v => Math.round(v * scale)),
      [0.40,0.41,0.39,0.40,0.39,0.38,0.37,0.38,0.38,0.39,0.38,0.38],
      [47,47,49,50,49,48,47,47,48,48,47,47],
    ];
    const sparkColors = ['#ff6b6b','#46f6be','#46f6be','#ffb957'];
    sparkData.forEach((d, i) => {
      const el = document.getElementById(`kpi-spark-${i}`);
      if (el) Charts.sparkline(el, d, { height: 40, color: sparkColors[i] });
    });

    // Scaled emissions timeline chart
    const emEl = document.getElementById('emissionsChart');
    if (emEl) {
      Charts.areaChart(emEl, [
        { data: baseCo2.map(v => Math.round(v * scale + (Math.random()*10 - 5))), color: '#46f6be' },
        { data: baseNox.map(v => Math.round(v * scale + (Math.random()*6 - 3))), color: '#ffb957' },
      ], { height: 180, labels: timeLabels });
    }

    // Scope donut
    const donutEl = document.getElementById('scopeDonut');
    if (donutEl) {
      Charts.donut(donutEl, [
        { value: 38.7, color: '#46f6be' },
        { value: 29.4, color: '#ffb957' },
        { value: 31.9, color: 'rgba(255,255,255,0.2)' },
      ], { size: 130, thickness: 20, label: (1.24 * scale).toFixed(2), sublabel: 'MT CO₂e' });
    }

    // Bind plant clicks
    document.querySelectorAll('[data-fid]').forEach(el => {
      el.addEventListener('click', () => {
        const fid = el.dataset.fid;
        if (fid && window.ClimateSphere.state) {
          window.ClimateSphere.state.setFacility(fid, true);
        }
      });
    });

    // Action buttons
    const btnPdf = document.getElementById('btnDashboardExportPdf');
    if (btnPdf) btnPdf.addEventListener('click', () => window.ClimateSphere && window.ClimateSphere.export('Fleet_Emissions_Audit_Report.pdf'));

    const btnAi = document.getElementById('btnDashboardAiAnalysis');
    if (btnAi) btnAi.addEventListener('click', () => window.ClimateSphere && window.ClimateSphere.navigateTo('ai'));

    // Live Certified Copernicus CAMS & Edge Gateway Fleet Telemetry Sync
    (async () => {
      try {
        const certUrl = (window.ClimateSphere && window.ClimateSphere.getApiEndpoint)
          ? window.ClimateSphere.getApiEndpoint('/api/certified/fleet')
          : '/api/certified/fleet';
        const res = await fetch(certUrl);
        if (res.ok) {
          const certPayload = await res.json();
          if (certPayload && Array.isArray(certPayload.certificates)) {
            certPayload.certificates.forEach(cert => {
              const hs = hotspots.find(h => h.id === cert.facility.id);
              if (hs && cert.measurements && cert.measurements.stackCEMS) {
                const s = cert.measurements.stackCEMS;
                hs.so2 = Math.round(s.SO2_mg_Nm3);
                hs.nox = Math.round(s.NOx_mg_Nm3);
                hs.status = (hs.so2 > 500) ? 'CRITICAL' : (hs.so2 > 250 || hs.nox > 200) ? 'WARNING' : 'NOMINAL';
              }
            });
          }
        }

        const fleetUrl = (window.ClimateSphere && window.ClimateSphere.getApiEndpoint)
          ? window.ClimateSphere.getApiEndpoint('/api/telemetry/fleet')
          : '/api/telemetry/fleet';
        const fRes = await fetch(fleetUrl);
        if (fRes.ok) {
          const fleetData = await fRes.json();
          const items = Array.isArray(fleetData)
            ? fleetData
            : (fleetData && fleetData.fleet)
              ? Object.values(fleetData.fleet)
              : [];
          if (items.length > 0) {
            items.forEach(item => {
              const hs = hotspots.find(h => h.id === item.facilityId);
              if (hs && item.channels) {
                if (item.channels.SO2) hs.so2 = Math.round(item.channels.SO2.val);
                if (item.channels.NOx) hs.nox = Math.round(item.channels.NOx.val);
                hs.status = (hs.so2 > 500) ? 'CRITICAL' : (hs.so2 > 250 || hs.nox > 200) ? 'WARNING' : 'NOMINAL';
              }
            });
          }
        }
      } catch (err) {
        // Graceful fallback to rich local state
      }
    })();

    return null;
  }

  return { render, init };
})();

window.Dashboard = Dashboard;
