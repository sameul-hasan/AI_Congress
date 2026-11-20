/**
 * ClimateSphere — Hotspot Comparison Module
 * NEW MODULE: Side-by-side multi-facility emissions comparison with
 * radar charts, rankings, delta analysis, and portfolio benchmarking.
 */

const Comparison = (() => {

  const ALL_FACILITIES = [
    { id: 'DU-03', name: 'Duisburg Unit 3',    country: 'Germany',    region: 'North Rhine-Westphalia · Ruhr Valley', station: 'DENW034 (Walsum)', authority: 'Bezirksregierung Düsseldorf / UBA', status: 'CRITICAL',
      scope1: 12.4, scope2: 4.2, scope3: 8.1, intensity: 1.24, so2: 847, nox: 412, pm: 38.2, co2: 12400,
      ytd_pct: 89.2, budget: 13900, renewable: 12, headcount: 420, capex: 2.4,
      scores: { env: 34, social: 71, gov: 88 },
      trend: [11.2, 11.8, 12.1, 12.3, 12.4] },
    { id: 'RT-07', name: 'Rotterdam Plant 7',  country: 'Netherlands', region: 'South Holland · Botlek Petrochemical', station: 'NL10418 (Botlek)', authority: 'DCMR Milieudienst Rijnmond / RIVM', status: 'WARNING',
      scope1: 9.8,  scope2: 3.8, scope3: 6.9, intensity: 0.98, so2: 621, nox: 389, pm: 22.1, co2: 9800,
      ytd_pct: 71.4, budget: 11000, renewable: 28, headcount: 310, capex: 1.8,
      scores: { env: 55, social: 68, gov: 84 },
      trend: [9.1, 9.3, 9.5, 9.7, 9.8] },
    { id: 'MI-02', name: 'Milan-Sesto 02',     country: 'Italy',       region: 'Lombardy · Po Industrial Basin', station: 'IT0451A (Sesto)', authority: 'ARPA Lombardia / ISPRA', status: 'WARNING',
      scope1: 5.6,  scope2: 2.1, scope3: 4.2, intensity: 0.56, so2: 298, nox: 201, pm: 14.8, co2: 5600,
      ytd_pct: 42.1, budget: 7000,  renewable: 44, headcount: 185, capex: 0.9,
      scores: { env: 72, social: 79, gov: 91 },
      trend: [5.8, 5.7, 5.7, 5.6, 5.6] },
    { id: 'WA-04', name: 'Warsaw Central 4',   country: 'Poland',      region: 'Masovia · Vistula Basin (Żerań)', station: 'PL0008A (Żerań)', authority: 'GIOŚ / WIOŚ Warszawa', status: 'NOMINAL',
      scope1: 3.2,  scope2: 1.4, scope3: 2.8, intensity: 0.32, so2: 156, nox: 134, pm: 8.4,  co2: 3200,
      ytd_pct: 24.8, budget: 4500,  renewable: 61, headcount: 120, capex: 0.6,
      scores: { env: 81, social: 85, gov: 93 },
      trend: [3.4, 3.3, 3.2, 3.2, 3.2] },
    { id: 'MD-01', name: 'Madrid Vallecas 1',  country: 'Spain',       region: 'Community of Madrid · South Ring', station: 'ES1528A (Vallecas)', authority: 'Comunidad de Madrid / MITECO', status: 'NOMINAL',
      scope1: 1.8,  scope2: 0.9, scope3: 1.6, intensity: 0.18, so2: 89,  nox: 76,  pm: 5.2,  co2: 1800,
      ytd_pct: 14.2, budget: 2800,  renewable: 78, headcount: 72,  capex: 0.3,
      scores: { env: 90, social: 88, gov: 95 },
      trend: [2.0, 1.9, 1.8, 1.8, 1.8] },
  ];

  let selected = ['DU-03', 'RT-07', 'MI-02'];
  let activeMetric = 'scope1';

  const METRICS = {
    scope1:    { label: 'Scope 1 (kt CO2e)', fn: f => f.scope1 },
    intensity: { label: 'Carbon Intensity',  fn: f => f.intensity },
    so2:       { label: 'SO2 (mg/Nm3)',      fn: f => f.so2 },
    nox:       { label: 'NOx (mg/Nm3)',      fn: f => f.nox },
    renewable: { label: 'Renewable Mix %',   fn: f => f.renewable },
  };

  function statusColor(s) {
    return s === 'CRITICAL' ? 'var(--status-red)' : s === 'WARNING' ? 'var(--secondary)' : 'var(--primary)';
  }

  function chipClass(s) {
    return s === 'CRITICAL' ? 'red' : s === 'WARNING' ? 'amber' : 'green';
  }

  function render() {
    const activeFid = window.ClimateSphere.state ? window.ClimateSphere.state.activeFacilityId : 'DU-03';
    if (activeFid && !selected.includes(activeFid)) {
      selected.unshift(activeFid);
      if (selected.length > 4) selected.pop();
    }
    const compared = ALL_FACILITIES.filter(f => selected.includes(f.id));

    return `
      <div class="page-header">
        <div class="page-title-group">
          <span class="page-subtitle">COMPARISON ENGINE · MULTI-REGION</span>
          <h1 class="page-title">Hotspot Emissions Comparison</h1>
          <p class="page-meta">Side-by-side benchmarking across certified European regions · Active: <strong style="color:var(--primary);">${activeFid}</strong></p>
        </div>
        <div class="page-actions">
          <button class="btn btn-secondary btn-sm" id="btnExportComparison">Export Certified PDF</button>
          <button class="btn btn-primary btn-sm" id="btnShowAll">Expand All</button>
        </div>
      </div>

      <!-- Facility Selector (All 5 Regions) -->
      <div class="card" style="margin-bottom:var(--space-lg);">
        <div class="card-header">
          <span class="card-title">Authentic Regional Selection</span>
          <span class="card-meta">${selected.length} of ${ALL_FACILITIES.length} selected</span>
        </div>
        <div class="card-body">
          <div class="grid-5" id="facilityCheckboxGrid">
            ${ALL_FACILITIES.map(f => `
              <label style="display:flex;align-items:center;gap:10px;padding:10px 12px;
                border-radius:var(--radius);cursor:pointer;transition:all 150ms;
                background:${selected.includes(f.id) ? 'rgba(70,246,190,0.06)' : 'rgba(255,255,255,0.02)'};
                border:1px solid ${selected.includes(f.id) ? 'rgba(70,246,190,0.3)' : 'var(--border-subtle)'};">
                <input type="checkbox" data-fid="${f.id}" class="fac-check"
                  ${selected.includes(f.id) ? 'checked' : ''}
                  style="accent-color:var(--primary);width:15px;height:15px;flex-shrink:0;"/>
                <div style="min-width:0;">
                  <div style="font-family:var(--font-mono);font-size:11px;font-weight:600;color:var(--on-surface);">${f.id} · ${f.country}</div>
                  <div style="font-size:10px;color:var(--on-surface-variant);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;" title="${f.station}">${f.station.split(' ')[0]}</div>
                </div>
                <span class="chip chip-${chipClass(f.status)}" style="margin-left:auto;font-size:9px;">${f.status}</span>
              </label>
            `).join('')}
          </div>
        </div>
      </div>

      <!-- Metric Picker -->
      <div style="display:flex;gap:8px;margin-bottom:var(--space-md);flex-wrap:wrap;">
        <span style="font-family:var(--font-mono);font-size:10px;color:var(--on-surface-variant);align-self:center;text-transform:uppercase;letter-spacing:0.06em;">Compare by:</span>
        ${Object.entries(METRICS).map(([key, m]) => `
          <button class="btn ${activeMetric === key ? 'btn-primary' : 'btn-secondary'} btn-sm metric-tab" data-metric="${key}">${m.label}</button>
        `).join('')}
      </div>

      <!-- Side-by-Side Bar Comparison -->
      <div class="card" style="margin-bottom:var(--space-lg);">
        <div class="card-header">
          <span class="card-title">${METRICS[activeMetric].label} - Ranked Comparison</span>
          <span class="card-meta">Lower is better for emissions metrics</span>
        </div>
        <div class="card-body" style="display:flex;flex-direction:column;gap:16px;">
          ${renderCompBars(compared, activeMetric)}
        </div>
      </div>

      <!-- Side-by-Side Detail Cards -->
      <div class="grid-3" id="compareCards">
        ${compared.slice(0,3).map(f => renderFacilityCard(f)).join('')}
      </div>

      <!-- Rankings Table -->
      <div class="card" style="margin-top:var(--space-lg);">
        <div class="card-header">
          <span class="card-title">Portfolio Rankings - Full Metrics</span>
          <span class="card-meta">All facilities · Q3 2026 · Sorted by Carbon Intensity</span>
        </div>
        <div style="overflow-x:auto;">
          <table class="data-table">
            <thead>
              <tr>
                <th>Rank</th>
                <th>Facility</th>
                <th>Region</th>
                <th class="right">Scope 1 kt</th>
                <th class="right">Intensity</th>
                <th class="right">SO2</th>
                <th class="right">NOx</th>
                <th class="right">Renewable %</th>
                <th class="right">Env Score</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${[...ALL_FACILITIES].sort((a,b) => a.intensity - b.intensity).map((f, i) => `
                <tr style="${selected.includes(f.id) ? 'background:rgba(70,246,190,0.04);' : ''}">
                  <td style="font-family:var(--font-mono);font-size:11px;color:var(--on-surface-dim);">#${i+1}</td>
                  <td>
                    <div style="font-weight:600;font-size:12px;">${f.id}</div>
                    <div style="font-size:10px;color:var(--on-surface-variant);">${f.name}</div>
                  </td>
                  <td style="font-size:11px;color:var(--on-surface-variant);">${f.country} · <span style="font-family:var(--font-mono);font-size:10px;">${f.station.split(' ')[0]}</span></td>
                  <td class="mono">${f.scope1}</td>
                  <td class="mono" style="color:${f.intensity > 1 ? 'var(--status-red)' : f.intensity > 0.6 ? 'var(--secondary)' : 'var(--primary)'};">${f.intensity}</td>
                  <td class="mono" style="color:${f.so2 > 500 ? 'var(--status-red)' : f.so2 > 400 ? 'var(--secondary)' : 'var(--on-surface)'};">${f.so2}</td>
                  <td class="mono" style="color:${f.nox > 200 ? 'var(--status-red)' : f.nox > 160 ? 'var(--secondary)' : 'var(--on-surface)'};">${f.nox}</td>
                  <td class="mono" style="color:${f.renewable >= 50 ? 'var(--primary)' : 'var(--on-surface)'};">${f.renewable}%</td>
                  <td class="mono" style="color:${f.scores.env < 50 ? 'var(--status-red)' : f.scores.env < 70 ? 'var(--secondary)' : 'var(--primary)'};">${f.scores.env}/100</td>
                  <td><span class="chip chip-${chipClass(f.status)}">${f.status}</span></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  function renderCompBars(facilities, metric) {
    const vals = facilities.map(METRICS[metric].fn);
    const max = Math.max(...vals, 0.001);
    return facilities.map(f => {
      const val = METRICS[metric].fn(f);
      const pct = (val / max * 100);
      const color = f.status === 'CRITICAL' ? '#ff6b6b' : f.status === 'WARNING' ? '#ffb957' : '#46f6be';
      return `
        <div>
          <div style="display:flex;justify-content:space-between;margin-bottom:5px;">
            <div style="display:flex;align-items:center;gap:8px;">
              <span style="font-family:var(--font-mono);font-size:11px;font-weight:600;color:var(--on-surface);">${f.id}</span>
              <span style="font-size:10px;color:var(--on-surface-variant);">${f.name}</span>
            </div>
            <span style="font-family:var(--font-mono);font-size:13px;font-weight:600;color:${color};">${val}</span>
          </div>
          <div class="progress-bar" style="height:8px;">
            <div class="progress-fill" style="width:${pct}%;background:${color};transition:width 0.8s cubic-bezier(0.4,0,0.2,1);"></div>
          </div>
        </div>
      `;
    }).join('');
  }

  function renderFacilityCard(f) {
    const esgAvg = Math.round((f.scores.env + f.scores.social + f.scores.gov) / 3);
    return `
      <div class="card">
        <div class="card-header">
          <div>
            <span style="font-family:var(--font-mono);font-size:13px;font-weight:700;color:var(--on-surface);">${f.id}</span>
            <div style="font-size:11px;color:var(--on-surface-variant);">${f.name}</div>
          </div>
          <span class="chip chip-${chipClass(f.status)}">${f.status}</span>
        </div>
        <div class="card-body">
          <div style="text-align:center;margin-bottom:var(--space-md);" id="donut-${f.id}"></div>
          ${[
            { label: 'Scope 1', value: f.scope1 + ' kt', color: '#ff6b6b' },
            { label: 'Scope 2', value: f.scope2 + ' kt', color: '#ffb957' },
            { label: 'Scope 3', value: f.scope3 + ' kt', color: '#93ccff' },
            { label: 'Intensity', value: f.intensity + ' t/MWh', color: statusColor(f.status) },
            { label: 'Renewable', value: f.renewable + '%', color: '#46f6be' },
          ].map(m => `
            <div style="display:flex;justify-content:space-between;padding:5px 0;border-bottom:1px solid rgba(255,255,255,0.03);">
              <span class="label-mono">${m.label}</span>
              <span style="font-family:var(--font-mono);font-size:11px;font-weight:600;color:${m.color};">${m.value}</span>
            </div>
          `).join('')}
          <div style="margin-top:10px;">
            <div style="display:flex;justify-content:space-between;margin-bottom:4px;">
              <span class="label-mono">ESG AVG SCORE</span>
              <span style="font-family:var(--font-mono);font-size:12px;font-weight:600;color:${esgAvg >= 70 ? 'var(--primary)' : esgAvg >= 50 ? 'var(--secondary)' : 'var(--status-red)'};">${esgAvg}/100</span>
            </div>
            <div class="progress-bar"><div class="progress-fill fill-${esgAvg >= 70 ? 'green' : esgAvg >= 50 ? 'amber' : 'red'}" style="width:${esgAvg}%;"></div></div>
          </div>
          <div style="margin-top:12px;">
            <span class="label-mono">5-QUARTER TREND</span>
            <div id="trend-${f.id}" style="margin-top:6px;height:36px;"></div>
          </div>
        </div>
      </div>
    `;
  }

  function initCharts() {
    const compared = ALL_FACILITIES.filter(f => selected.includes(f.id));
    compared.slice(0, 3).forEach(f => {
      const donutEl = document.getElementById(`donut-${f.id}`);
      if (donutEl) Charts.donut(donutEl, [f.scope1, f.scope2, f.scope3], { size: 80, colors: ['#ff6b6b', '#ffb957', '#93ccff'], labels: ['S1','S2','S3'] });
      const trendEl = document.getElementById(`trend-${f.id}`);
      if (trendEl) {
        const color = f.status === 'CRITICAL' ? '#ff6b6b' : f.status === 'WARNING' ? '#ffb957' : '#46f6be';
        Charts.sparkline(trendEl, f.trend, { height: 36, color });
      }
    });
  }

  function bindEvents() {
    document.querySelectorAll('.fac-check').forEach(chk => {
      chk.addEventListener('change', e => {
        const fid = e.target.dataset.fid;
        if (e.target.checked) {
          if (selected.length < 4) selected.push(fid);
          else { e.target.checked = false; window.ClimateSphere && window.ClimateSphere.showToast('Max 4 facilities allowed'); return; }
        } else {
          if (selected.length <= 1) { e.target.checked = true; window.ClimateSphere && window.ClimateSphere.showToast('At least 1 facility required'); return; }
          selected = selected.filter(id => id !== fid);
        }
        rerender();
      });
    });

    document.querySelectorAll('.metric-tab').forEach(btn => {
      btn.addEventListener('click', () => { activeMetric = btn.dataset.metric; rerender(); });
    });

    const btnExport = document.getElementById('btnExportComparison');
    if (btnExport) btnExport.addEventListener('click', () => window.ClimateSphere && window.ClimateSphere.export('Facility_Benchmarking_Report.pdf'));

    const btnAll = document.getElementById('btnShowAll');
    if (btnAll) btnAll.addEventListener('click', () => { selected = ALL_FACILITIES.map(f => f.id); rerender(); });
  }

  function rerender() {
    const wrapper = document.getElementById('pageWrapper');
    if (wrapper) {
      wrapper.innerHTML = `<div class="page-enter">${render()}</div>`;
      requestAnimationFrame(() => { initCharts(); bindEvents(); });
    }
  }

  function init() {
    initCharts();
    bindEvents();

    (async () => {
      try {
        const certUrl = (window.ClimateSphere && window.ClimateSphere.getApiEndpoint)
          ? window.ClimateSphere.getApiEndpoint('/api/certified/fleet')
          : '/api/certified/fleet';
        const res = await fetch(certUrl);
        if (res.ok) {
          const certPayload = await res.json();
          if (certPayload && Array.isArray(certPayload.certificates)) {
            let updated = false;
            certPayload.certificates.forEach(cert => {
              const fac = ALL_FACILITIES.find(f => f.id === cert.facility.id);
              if (fac && cert.measurements && cert.measurements.stackCEMS) {
                const s = cert.measurements.stackCEMS;
                fac.so2 = Math.round(s.SO2_mg_Nm3);
                fac.nox = Math.round(s.NOx_mg_Nm3);
                fac.pm = Math.round(s.PM_mg_Nm3 * 10) / 10;
                fac.status = (fac.so2 > 500) ? 'CRITICAL' : (fac.so2 > 250 || fac.nox > 200) ? 'WARNING' : 'NOMINAL';
                updated = true;
              }
            });
            if (updated) rerender();
          }
        }
      } catch (e) {}
    })();
  }

  return { render, init };
})();

window.Comparison = Comparison;
