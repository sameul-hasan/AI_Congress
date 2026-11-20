/**
 * ClimateSphere — Energy Brain Module
 * NEW MODULE: AI-powered energy intelligence layer — renewable mix optimizer,
 * demand forecasting, grid arbitrage, decarbonization pathway builder,
 * and real-time energy cost/carbon intensity tracker.
 */

const EnergyBrain = (() => {

  const FACILITIES_ENERGY = [
    { id: 'DU-03', name: 'Duisburg Unit 3',  renewable: 12, coal: 58, gas: 22, nuclear: 8,
      consumption: 18420, cost: 1.42, intensity: 0.41, peak: 21800, forecast: [18100, 18300, 18500, 18420, 18800, 19200, 18900] },
    { id: 'RT-07', name: 'Rotterdam Plant 7', renewable: 28, coal: 30, gas: 32, nuclear: 10,
      consumption: 14100, cost: 1.18, intensity: 0.32, peak: 16200, forecast: [13800, 14000, 14200, 14100, 14400, 14600, 14300] },
    { id: 'MI-02', name: 'Milan-Sesto 02',    renewable: 44, coal: 10, gas: 36, nuclear: 10,
      consumption: 9800,  cost: 0.94, intensity: 0.24, peak: 11400, forecast: [9500, 9600, 9700, 9800, 10000, 10200, 9900] },
    { id: 'WA-04', name: 'Warsaw Central 4',  renewable: 61, coal: 4,  gas: 25, nuclear: 10,
      consumption: 6200,  cost: 0.72, intensity: 0.18, peak: 7100,  forecast: [6100, 6150, 6200, 6200, 6300, 6400, 6250] },
    { id: 'MD-01', name: 'Madrid Vallecas 1', renewable: 78, coal: 2,  gas: 12, nuclear: 8,
      consumption: 4100,  cost: 0.61, intensity: 0.12, peak: 4800,  forecast: [4000, 4050, 4100, 4100, 4200, 4250, 4150] },
  ];

  const DECARBONIZATION_PATHS = [
    {
      name: 'Wind PPA Contract',
      cost: '€38/MWh offset',
      reduction: 41,
      timeline: '6 months',
      npv: '€4.2M positive',
      risk: 'LOW',
      description: 'Long-term power purchase agreement with North Sea offshore wind farm. 120 GWh/yr.',
      color: '#46f6be',
    },
    {
      name: 'FGD Upgrade at DU-03',
      cost: '€12.4M CapEx',
      reduction: 28,
      timeline: '18 months',
      npv: '€2.1M positive',
      risk: 'MEDIUM',
      description: 'Install advanced flue-gas desulfurization (FGD) unit. Closes 28% of SO2 emission gap.',
      color: '#ffb957',
    },
    {
      name: 'Coal-to-Biomass Switch at WA-04',
      cost: '€8.7M CapEx',
      reduction: 19,
      timeline: '12 months',
      npv: '€1.6M positive',
      risk: 'MEDIUM',
      description: 'Partial fuel switch from coal to certified sustainable biomass pellets. REDII compliant.',
      color: '#93ccff',
    },
    {
      name: 'Green Hydrogen Trial',
      cost: '€2.1M pilot',
      reduction: 7,
      timeline: '9 months',
      npv: 'Break-even 2029',
      risk: 'HIGH',
      description: 'Pilot green hydrogen co-firing at RT-07. Based on HYBRIT techology partnership.',
      color: '#dae2fd',
    },
  ];

  const GRID_ARBITRAGE = [
    { hour: '00:00', price: 42, co2: 0.38, action: 'BUY' },
    { hour: '02:00', price: 38, co2: 0.35, action: 'BUY' },
    { hour: '04:00', price: 41, co2: 0.36, action: 'BUY' },
    { hour: '06:00', price: 56, co2: 0.44, action: 'HOLD' },
    { hour: '08:00', price: 71, co2: 0.52, action: 'REDUCE' },
    { hour: '10:00', price: 68, co2: 0.49, action: 'REDUCE' },
    { hour: '12:00', price: 58, co2: 0.42, action: 'HOLD' },
    { hour: '14:00', price: 54, co2: 0.40, action: 'HOLD' },
    { hour: '16:00', price: 74, co2: 0.53, action: 'REDUCE' },
    { hour: '18:00', price: 82, co2: 0.58, action: 'REDUCE' },
    { hour: '20:00', price: 67, co2: 0.48, action: 'HOLD' },
    { hour: '22:00', price: 48, co2: 0.39, action: 'BUY' },
  ];

  let selectedFacility = FACILITIES_ENERGY[0];

  function render() {
    const activeFid = window.ClimateSphere.state ? window.ClimateSphere.state.activeFacilityId : 'DU-03';
    selectedFacility = FACILITIES_ENERGY.find(f => f.id === activeFid) || FACILITIES_ENERGY[0];
    const scale = window.ClimateSphere.state ? window.ClimateSphere.state.getTimeScale() : 1.0;
    const timeRangeKey = window.ClimateSphere.state ? window.ClimateSphere.state.activeTimeRange.toUpperCase() : 'Q3';

    const totalConsumption = FACILITIES_ENERGY.reduce((s, f) => s + f.consumption * scale, 0);
    const avgRenewable = Math.round(FACILITIES_ENERGY.reduce((s, f) => s + f.renewable, 0) / FACILITIES_ENERGY.length);
    const totalCost = (FACILITIES_ENERGY.reduce((s, f) => s + f.cost * f.consumption * scale * 0.001, 0)).toFixed(1);
    const avgIntensity = (FACILITIES_ENERGY.reduce((s, f) => s + f.intensity, 0) / FACILITIES_ENERGY.length).toFixed(2);

    return `
      <div class="page-header">
        <div class="page-title-group">
          <span class="page-subtitle">ENERGY BRAIN · AI POWER INTELLIGENCE · ${timeRangeKey} CONTEXT</span>
          <h1 class="page-title">Energy Intelligence Platform</h1>
          <p class="page-meta">Real-time energy mix · Demand forecasting · Active Plant: <strong style="color:var(--primary);">${selectedFacility.name} (${selectedFacility.id})</strong></p>
        </div>
        <div class="page-actions">
          <select class="select" id="energyFacilitySelector">
            ${FACILITIES_ENERGY.map(f => `<option value="${f.id}" ${f.id === selectedFacility.id ? 'selected' : ''}>${f.id} — ${f.name}</option>`).join('')}
          </select>
          <button class="btn btn-secondary btn-sm" id="btnExportEnergy">Export Energy Report</button>
          <button class="btn btn-primary btn-sm" id="btnRunOptimizer">Run AI Optimizer</button>
        </div>
      </div>

      <!-- Portfolio KPIs -->
      <div class="grid-4" style="margin-bottom:var(--space-lg);">
        ${[
          { label: `PORTFOLIO CONSUMPTION (${timeRangeKey})`, value: (totalConsumption/1000).toFixed(1) + ' GWh', sub: `${timeRangeKey} Scaled`, delta: '+3.2% QoQ', color: 'var(--on-surface)', icon: '⚡' },
          { label: 'AVG RENEWABLE MIX',     value: avgRenewable + '%',                           sub: 'Target: 45%', delta: '▲ 8pp YoY',  color: 'var(--primary)',   icon: '🌿' },
          { label: 'TOTAL ENERGY COST',     value: '€' + totalCost + 'M',                        sub: 'All facilities', delta: '-€0.4M vs budget', color: 'var(--primary)', icon: '💶' },
          { label: 'GRID CARBON INTENSITY', value: avgIntensity + ' tCO2/MWh',                   sub: 'Weighted avg', delta: '▼ 12% YoY', color: 'var(--primary)',   icon: '🌡' },
        ].map(k => `
          <div class="metric-card primary">
            <div style="display:flex;align-items:flex-start;justify-content:space-between;">
              <span class="metric-label">${k.label}</span>
              <span style="font-size:20px;">${k.icon}</span>
            </div>
            <div class="metric-value" style="color:${k.color};font-size:28px;">${k.value}</div>
            <div style="display:flex;justify-content:space-between;margin-top:4px;">
              <span class="metric-change positive">${k.delta}</span>
              <span style="font-family:var(--font-mono);font-size:9px;color:var(--on-surface-dim);">${k.sub}</span>
            </div>
          </div>
        `).join('')}
      </div>

      <!-- Facility Energy Mix + Forecast -->
      <div class="grid-12" style="margin-bottom:var(--space-lg);">

        <!-- Energy Mix Donut -->
        <div class="card col-span-4">
          <div class="card-header">
            <span class="card-title">Energy Mix — ${selectedFacility.id}</span>
            <span class="chip chip-${selectedFacility.renewable >= 50 ? 'green' : selectedFacility.renewable >= 30 ? 'amber' : 'red'}">${selectedFacility.renewable}% RENEWABLE</span>
          </div>
          <div class="card-body">
            <div style="text-align:center;margin:var(--space-md) 0;" id="energyMixDonut"></div>
            ${[
              { label: 'Renewable',  pct: selectedFacility.renewable, color: '#46f6be' },
              { label: 'Natural Gas',pct: selectedFacility.gas,       color: '#93ccff' },
              { label: 'Coal',       pct: selectedFacility.coal,      color: '#ff6b6b' },
              { label: 'Nuclear',    pct: selectedFacility.nuclear,   color: '#dae2fd' },
            ].map(s => `
              <div style="margin-bottom:8px;">
                <div style="display:flex;justify-content:space-between;margin-bottom:3px;">
                  <div style="display:flex;align-items:center;gap:6px;">
                    <div style="width:8px;height:8px;border-radius:50%;background:${s.color};flex-shrink:0;"></div>
                    <span class="label-mono">${s.label}</span>
                  </div>
                  <span style="font-family:var(--font-mono);font-size:11px;color:${s.color};">${s.pct}%</span>
                </div>
                <div class="progress-bar"><div class="progress-fill" style="width:${s.pct}%;background:${s.color};"></div></div>
              </div>
            `).join('')}
            <div class="divider"></div>
            <div style="display:flex;justify-content:space-between;">
              <span class="label-mono">CONSUMPTION</span>
              <span style="font-family:var(--font-mono);font-size:12px;font-weight:600;color:var(--on-surface);">${selectedFacility.consumption.toLocaleString()} MWh/mo</span>
            </div>
            <div style="display:flex;justify-content:space-between;margin-top:6px;">
              <span class="label-mono">CARBON INTENSITY</span>
              <span style="font-family:var(--font-mono);font-size:12px;font-weight:600;color:${selectedFacility.intensity > 0.35 ? 'var(--secondary)' : 'var(--primary)'};">${selectedFacility.intensity} t/MWh</span>
            </div>
          </div>
        </div>

        <!-- Demand Forecast -->
        <div class="card col-span-8">
          <div class="card-header">
            <span class="card-title">AI Demand Forecast — ${selectedFacility.id}</span>
            <div style="display:flex;align-items:center;gap:8px;">
              <span style="font-family:var(--font-mono);font-size:9px;color:var(--on-surface-dim);">─── FORECAST ─── ACTUAL</span>
              <span class="chip chip-green">95% CONFIDENCE</span>
            </div>
          </div>
          <div class="card-body" style="padding:10px 14px 14px;">
            <div id="forecastChart" style="height:190px;"></div>
          </div>
        </div>

      </div>

      <!-- Grid Arbitrage Recommendation -->
      <div class="grid-12" style="margin-bottom:var(--space-lg);">
        <div class="card col-span-7">
          <div class="card-header">
            <span class="card-title">Grid Carbon-Cost Arbitrage</span>
            <div style="display:flex;align-items:center;gap:6px;padding:4px 10px;background:rgba(70,246,190,0.05);border:1px solid rgba(70,246,190,0.2);border-radius:4px;">
              <span class="pulse-dot"></span>
              <span style="font-family:var(--font-mono);font-size:9px;color:var(--primary);">AI OPTIMIZING</span>
            </div>
          </div>
          <div style="overflow-x:auto;">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Time</th>
                  <th class="right">Grid Price (€/MWh)</th>
                  <th class="right">CO₂ (t/MWh)</th>
                  <th>AI Action</th>
                </tr>
              </thead>
              <tbody>
                ${GRID_ARBITRAGE.map(row => `
                  <tr>
                    <td class="mono">${row.hour}</td>
                    <td class="mono" style="color:${row.price > 70 ? 'var(--status-red)' : row.price < 50 ? 'var(--primary)' : 'var(--on-surface)'};">€${row.price}</td>
                    <td class="mono">${row.co2}</td>
                    <td>
                      <span class="chip ${row.action === 'BUY' ? 'chip-green' : row.action === 'REDUCE' ? 'chip-red' : 'chip-neutral'}" style="font-size:9px;">${row.action}</span>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>

        <!-- Portfolio Energy Leaderboard -->
        <div class="card col-span-5">
          <div class="card-header">
            <span class="card-title">Facility Energy Leaderboard</span>
            <span class="card-meta">By Renewable Mix</span>
          </div>
          <div class="card-body" style="display:flex;flex-direction:column;gap:12px;">
            ${[...FACILITIES_ENERGY].sort((a,b) => b.renewable - a.renewable).map((f, i) => `
              <div>
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
                  <div style="display:flex;align-items:center;gap:8px;">
                    <span style="font-family:var(--font-mono);font-size:10px;color:var(--on-surface-dim);width:14px;">#${i+1}</span>
                    <span style="font-family:var(--font-mono);font-size:11px;font-weight:600;color:var(--on-surface);">${f.id}</span>
                    <span style="font-size:10px;color:var(--on-surface-variant);">${f.name}</span>
                  </div>
                  <span style="font-family:var(--font-mono);font-size:12px;font-weight:600;color:${f.renewable >= 50 ? 'var(--primary)' : f.renewable >= 30 ? 'var(--secondary)' : 'var(--status-red)'};">${f.renewable}%</span>
                </div>
                <div class="progress-bar">
                  <div class="progress-fill" style="width:${f.renewable}%;background:${f.renewable >= 50 ? '#46f6be' : f.renewable >= 30 ? '#ffb957' : '#ff6b6b'};"></div>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      </div>

      <!-- Decarbonization Pathways -->
      <div class="card">
        <div class="card-header">
          <span class="card-title">AI Decarbonization Pathways</span>
          <span class="card-meta">Ranked by cost-efficiency · NPV positive first</span>
        </div>
        <div class="grid-4" style="padding:var(--space-md);">
          ${DECARBONIZATION_PATHS.map(p => `
            <div style="padding:16px;background:var(--surface-container);border:1px solid var(--border-subtle);border-radius:var(--radius);border-top:2px solid ${p.color};">
              <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">
                <span style="font-size:12px;font-weight:600;color:var(--on-surface);line-height:1.3;">${p.name}</span>
                <span class="chip ${p.risk === 'LOW' ? 'chip-green' : p.risk === 'MEDIUM' ? 'chip-amber' : 'chip-red'}" style="font-size:8px;flex-shrink:0;">${p.risk} RISK</span>
              </div>
              <p style="font-size:11px;color:var(--on-surface-variant);line-height:1.5;margin-bottom:12px;">${p.description}</p>
              <div style="display:flex;justify-content:space-between;margin-bottom:6px;">
                <span class="label-mono">EMISSION REDUCTION</span>
                <span style="font-family:var(--font-mono);font-size:13px;font-weight:600;color:${p.color};">${p.reduction}%</span>
              </div>
              <div class="progress-bar" style="margin-bottom:10px;">
                <div class="progress-fill" style="width:${p.reduction}%;background:${p.color};"></div>
              </div>
              <div style="display:flex;flex-direction:column;gap:4px;">
                ${[
                  { k: 'Cost',     v: p.cost },
                  { k: 'Timeline', v: p.timeline },
                  { k: 'NPV',      v: p.npv },
                ].map(m => `
                  <div style="display:flex;justify-content:space-between;">
                    <span class="label-mono">${m.k}</span>
                    <span style="font-family:var(--font-mono);font-size:10px;color:var(--on-surface);">${m.v}</span>
                  </div>
                `).join('')}
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  function init() {
    // Energy mix donut
    const donutEl = document.getElementById('energyMixDonut');
    if (donutEl) {
      Charts.donut(donutEl, [
        selectedFacility.renewable,
        selectedFacility.gas,
        selectedFacility.coal,
        selectedFacility.nuclear,
      ], { size: 90, colors: ['#46f6be', '#93ccff', '#ff6b6b', '#dae2fd'], labels: ['Renew','Gas','Coal','Nuc'] });
    }

    // Demand forecast chart
    const fcastEl = document.getElementById('forecastChart');
    if (fcastEl) {
      const labels = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
      Charts.areaChart(fcastEl, [
        { data: selectedFacility.forecast, color: '#46f6be' },
        { data: selectedFacility.forecast.map(v => v * (0.95 + Math.random() * 0.1)), color: '#ffb957' },
      ], { height: 190, labels });
    }

    // Facility selector (Synced to State Bus)
    const sel = document.getElementById('energyFacilitySelector');
    if (sel) {
      sel.addEventListener('change', e => {
        if (window.ClimateSphere.state) {
          window.ClimateSphere.state.setFacility(e.target.value, true);
        }
      });
    }

    // Optimizer button
    const btnOptimizer = document.getElementById('btnRunOptimizer');
    if (btnOptimizer) {
      let running = false;
      btnOptimizer.addEventListener('click', () => {
        if (running) return;
        running = true;
        btnOptimizer.textContent = 'Optimizing…';
        btnOptimizer.disabled = true;
        window.ClimateSphere && window.ClimateSphere.showToast('AI Energy Optimizer running — analyzing 30-day patterns…', 3000);
        setTimeout(() => {
          btnOptimizer.textContent = 'Run AI Optimizer';
          btnOptimizer.disabled = false;
          running = false;
          window.ClimateSphere && window.ClimateSphere.showToast('Optimization complete — savings potential: €142K/yr identified');
        }, 2800);
      });
    }

    // Export
    const btnExport = document.getElementById('btnExportEnergy');
    if (btnExport) btnExport.addEventListener('click', () => window.ClimateSphere && window.ClimateSphere.export('Emissions Data (.csv)'));
  }

  return { render, init };
})();

window.EnergyBrain = EnergyBrain;
