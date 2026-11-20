/**
 * ClimateSphere — Emissions Accounting Page
 */

const Emissions = (() => {

  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const scope1 = [38,40,42,44,46,45,44,43,41,null,null,null];
  const scope2 = [28,29,30,31,32,31,30,29,28,null,null,null];
  const scope3 = [30,31,32,33,34,33,32,31,30,null,null,null];

  const facilities_emissions = [
    { id: 'DU-03', name: 'Duisburg-03', country: 'Germany', region: 'Ruhr Valley', station: 'DENW034 (Walsum)', scope1: 12.4, scope2: 4.2, scope3: 8.1, intensity: 1.24, ytd: 89.2 },
    { id: 'RT-07', name: 'Rotterdam-07', country: 'Netherlands', region: 'Botlek Port', station: 'NL10418 (Botlek)', scope1: 9.8, scope2: 3.8, scope3: 6.9, intensity: 0.98, ytd: 71.4 },
    { id: 'MI-02', name: 'Milan-02', country: 'Italy', region: 'Po Basin', station: 'IT0451A (Sesto)', scope1: 5.6, scope2: 2.1, scope3: 4.2, intensity: 0.56, ytd: 42.1 },
    { id: 'WA-04', name: 'Warsaw-04', country: 'Poland', region: 'Masovia', station: 'PL0008A (Żerań)', scope1: 3.2, scope2: 1.4, scope3: 2.8, intensity: 0.32, ytd: 24.8 },
    { id: 'MD-01', name: 'Madrid-01', country: 'Spain', region: 'Vallecas', station: 'ES1528A (Vallecas)', scope1: 1.8, scope2: 0.9, scope3: 1.6, intensity: 0.18, ytd: 14.2 },
  ];

  function render() {
    const scale = window.ClimateSphere.state ? window.ClimateSphere.state.getTimeScale() : 1.0;
    const totalScope1 = (facilities_emissions.reduce((a, f) => a + f.scope1, 0) * scale).toFixed(1);
    const totalScope2 = (facilities_emissions.reduce((a, f) => a + f.scope2, 0) * scale).toFixed(1);
    const totalScope3 = (facilities_emissions.reduce((a, f) => a + f.scope3, 0) * scale).toFixed(1);

    return `
      <div class="page-header">
        <div class="page-title-group">
          <span class="page-subtitle">CARBONIQ · REGIONAL EMISSIONS ACCOUNTING</span>
          <h1 class="page-title">GHG Emissions Inventory</h1>
          <p class="page-meta">ISO 14064-1 · GHG Protocol Corporate Standard · 5 Certified European Operations</p>
        </div>
        <div class="page-actions">
          <select class="select">
            <option>FY 2026 (YTD)</option>
            <option>FY 2025</option>
            <option>FY 2024</option>
          </select>
          <button class="btn btn-secondary btn-sm" id="btnExportEmissionsCsv">⬇ Export CSV / XLSX</button>
          <button class="btn btn-secondary btn-sm" id="btnExportXbrl">⬇ ESEF / iXBRL Export</button>
          <button class="btn btn-primary btn-sm" id="btnGenerateCsrd">📊 Generate CSRD PDF</button>
        </div>
      </div>

      <!-- Scope KPIs -->
      <div class="grid-4" style="margin-bottom:var(--space-lg)">
        <div class="metric-card primary">
          <span class="metric-label">SCOPE 1 — DIRECT</span>
          <div style="display:flex;align-items:baseline;gap:4px;">
            <span class="metric-value">${totalScope1}</span>
            <span class="metric-unit">kt CO₂e</span>
          </div>
          <div class="metric-delta delta-down">▼ 5.1% vs 2025</div>
          <div style="margin-top:6px;">
            <div style="font-family:var(--font-mono);font-size:9px;color:var(--on-surface-variant);margin-bottom:4px;">OF ANNUAL TARGET (42 kt)</div>
            <div class="progress-bar"><div class="progress-fill fill-green" style="width:${totalScope1/42*100}%;"></div></div>
          </div>
        </div>

        <div class="metric-card amber">
          <span class="metric-label">SCOPE 2 — ENERGY INDIRECT</span>
          <div style="display:flex;align-items:baseline;gap:4px;">
            <span class="metric-value">${totalScope2}</span>
            <span class="metric-unit">kt CO₂e</span>
          </div>
          <div class="metric-delta delta-down">▼ 3.2% vs 2025</div>
          <div style="margin-top:6px;">
            <div style="font-family:var(--font-mono);font-size:9px;color:var(--on-surface-variant);margin-bottom:4px;">MARKET-BASED METHOD</div>
            <div class="progress-bar"><div class="progress-fill fill-amber" style="width:82%;"></div></div>
          </div>
        </div>

        <div class="metric-card">
          <span class="metric-label">SCOPE 3 — VALUE CHAIN</span>
          <div style="display:flex;align-items:baseline;gap:4px;">
            <span class="metric-value">${totalScope3}</span>
            <span class="metric-unit">kt CO₂e</span>
          </div>
          <div class="metric-delta delta-neutral">◆ +0.8% vs 2025</div>
          <div style="margin-top:6px;">
            <div style="font-family:var(--font-mono);font-size:9px;color:var(--on-surface-variant);margin-bottom:4px;">15 CATEGORIES REPORTED</div>
            <div class="progress-bar"><div class="progress-fill" style="width:71%;background:rgba(255,255,255,0.3);"></div></div>
          </div>
        </div>

        <div class="metric-card primary">
          <span class="metric-label">CARBON INTENSITY</span>
          <div style="display:flex;align-items:baseline;gap:4px;">
            <span class="metric-value">0.38</span>
            <span class="metric-unit">t/MWh</span>
          </div>
          <div class="metric-delta delta-down">▼ 3.8% vs 2025</div>
          <div style="margin-top:6px;">
            <div style="font-family:var(--font-mono);font-size:9px;color:var(--on-surface-variant);margin-bottom:4px;">SECTOR BENCHMARK: 0.52</div>
            <div class="progress-bar"><div class="progress-fill fill-green" style="width:73%;"></div></div>
          </div>
        </div>
      </div>

      <!-- Charts Row -->
      <div class="grid-12" style="margin-bottom:var(--space-lg)">
        <div class="card col-span-8">
          <div class="card-header">
            <span class="card-title">Monthly Emissions by Scope — 2026 YTD</span>
            <div style="display:flex;gap:10px;align-items:center;">
              <span style="font-family:var(--font-mono);font-size:9px;color:#46f6be;">─── Scope 1</span>
              <span style="font-family:var(--font-mono);font-size:9px;color:#ffb957;">─── Scope 2</span>
              <span style="font-family:var(--font-mono);font-size:9px;color:rgba(255,255,255,0.4);">─── Scope 3</span>
            </div>
          </div>
          <div class="card-body" style="padding:10px 14px 14px;">
            <div id="scopeChart" style="height:170px;"></div>
          </div>
        </div>

        <div class="card col-span-4">
          <div class="card-header">
            <span class="card-title">Scope 3 Categories</span>
            <span class="card-meta">Top 5 by mass</span>
          </div>
          <div class="card-body">
            ${[
              { cat: 'Cat 11 — Use of sold products', pct: 31, val: '7.24 kt' },
              { cat: 'Cat 1 — Purchased goods', pct: 22, val: '5.14 kt' },
              { cat: 'Cat 4 — Upstream transport', pct: 18, val: '4.21 kt' },
              { cat: 'Cat 7 — Employee commuting', pct: 12, val: '2.80 kt' },
              { cat: 'Cat 12 — End-of-life treatment', pct: 9, val: '2.10 kt' },
            ].map(c => `
              <div style="margin-bottom:10px;">
                <div style="display:flex;justify-content:space-between;margin-bottom:4px;">
                  <span style="font-size:11px;color:var(--on-surface-variant);">${c.cat}</span>
                  <span style="font-family:var(--font-mono);font-size:11px;font-weight:600;color:var(--on-surface);">${c.val}</span>
                </div>
                <div class="progress-bar">
                  <div class="progress-fill" style="width:${c.pct}%;background:rgba(255,255,255,0.25);"></div>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      </div>

      <!-- Facility Breakdown Table -->
      <div class="card">
        <div class="card-header">
          <span class="card-title">Facility-Level Emissions Breakdown</span>
          <div style="display:flex;gap:6px;">
            <button class="btn btn-secondary btn-sm" style="font-size:9px;">CO₂e/tProduct</button>
            <button class="btn btn-secondary btn-sm" style="font-size:9px;">Absolute</button>
          </div>
        </div>
        <div style="overflow-x:auto;">
          <table class="data-table">
            <thead>
              <tr>
                <th>Facility &amp; Region</th>
                <th class="right">Scope 1 (kt)</th>
                <th class="right">Scope 2 (kt)</th>
                <th class="right">Scope 3 (kt)</th>
                <th class="right">Total (kt)</th>
                <th class="right">Intensity</th>
                <th class="right">YTD Budget %</th>
                <th>Trend</th>
              </tr>
            </thead>
            <tbody>
              ${facilities_emissions.map(f => {
                const total = (f.scope1 + f.scope2 + f.scope3).toFixed(1);
                return `
                  <tr>
                    <td>
                      <div style="font-weight:600;font-size:12px;">${f.name}</div>
                      <div style="font-family:var(--font-mono);font-size:9px;color:var(--on-surface-variant);">${f.id} · ${f.country} · ${f.station}</div>
                    </td>
                    <td class="mono">${f.scope1}</td>
                    <td class="mono">${f.scope2}</td>
                    <td class="mono">${f.scope3}</td>
                    <td class="mono" style="font-weight:600;">${total}</td>
                    <td class="mono">${f.intensity}</td>
                    <td>
                      <div style="display:flex;align-items:center;gap:8px;">
                        <div class="progress-bar" style="width:60px;">
                          <div class="progress-fill" style="width:${f.ytd}%;background:${f.ytd > 90 ? '#ff6b6b' : f.ytd > 75 ? '#ffb957' : '#46f6be'};"></div>
                        </div>
                        <span style="font-family:var(--font-mono);font-size:10px;color:${f.ytd > 90 ? 'var(--status-red)' : 'var(--on-surface-variant)'};">${f.ytd}%</span>
                      </div>
                    </td>
                    <td><div id="etable-spark-${f.name.replace(/[^a-z0-9]/gi,'')}" style="width:60px;height:24px;display:inline-block;"></div></td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  function init() {
    // Scope chart
    const scopeEl = document.getElementById('scopeChart');
    if (scopeEl) {
      Charts.areaChart(scopeEl, [
        { data: scope1.filter(v => v !== null), color: '#46f6be' },
        { data: scope2.filter(v => v !== null), color: '#ffb957' },
        { data: scope3.filter(v => v !== null), color: 'rgba(255,255,255,0.3)' },
      ], { height: 170, labels: months.slice(0, 9) });
    }

    // Table sparklines
    facilities_emissions.forEach(f => {
      const id = `etable-spark-${f.name.replace(/[^a-z0-9]/gi,'')}`;
      const el = document.getElementById(id);
      if (el) {
        const d = Array.from({length:9}, () => f.scope1 * (0.85 + Math.random()*0.3));
        Charts.sparkline(el, d, { height: 24, color: f.ytd > 90 ? '#ff6b6b' : '#46f6be', fill: false });
      }
    });

    // Action buttons
    const btnCsv = document.getElementById('btnExportEmissionsCsv');
    if (btnCsv) btnCsv.addEventListener('click', () => window.ClimateSphere && window.ClimateSphere.export('GHG_Emissions_Inventory_2026.csv'));

    const btnXbrl = document.getElementById('btnExportXbrl');
    if (btnXbrl) btnXbrl.addEventListener('click', () => window.ClimateSphere && window.ClimateSphere.export('CSRD_ESRS_E1_iXBRL_Report.xhtml'));

    const btnCsrd = document.getElementById('btnGenerateCsrd');
    if (btnCsrd) btnCsrd.addEventListener('click', () => window.ClimateSphere && window.ClimateSphere.export('CSRD_ESRS_E1_Disclosure_Pack.pdf'));
  }

  return { render, init };
})();

window.Emissions = Emissions;
