/**
 * ClimateSphere — Scenario Simulation Workbench
 */

const Scenario = (() => {

  function getSavedParams() {
    return window.ClimateSphere.DB ? window.ClimateSphere.DB.getScenarioParams() : {
      coalReduction: 25,
      renewableMix: 40,
      fgdEfficiency: 92,
      productionVolume: 85,
      carbonPrice: 62,
      timeHorizon: 2030,
    };
  }

  let params = getSavedParams();

  function computeOutputs(p) {
    const baseEmissions = 1247;
    const coalFactor = 1 - (p.coalReduction / 100) * 0.6;
    const renewFactor = 1 - (p.renewableMix / 100) * 0.4;
    const fgdFactor = 1 - ((p.fgdEfficiency - 70) / 30) * 0.15;
    const prodFactor = p.productionVolume / 100;
    const projected = baseEmissions * coalFactor * renewFactor * fgdFactor * prodFactor;
    const reduction = ((baseEmissions - projected) / baseEmissions * 100).toFixed(1);
    const creditSaving = ((baseEmissions - projected) * p.carbonPrice / 1000).toFixed(1);
    const investCost = (p.coalReduction * 12 + p.renewableMix * 8 + (p.fgdEfficiency - 70) * 5).toFixed(0);
    const roi = parseFloat(investCost) > 0 ? (((parseFloat(creditSaving) * 1000 - parseFloat(investCost)) / parseFloat(investCost)) * 100).toFixed(1) : '0.0';
    return { projected: projected.toFixed(0), reduction, creditSaving, investCost, roi };
  }

  function render() {
    params = getSavedParams();
    const out = computeOutputs(params);
    return `
      <div class="page-header">
        <div class="page-title-group">
          <span class="page-subtitle">AI SCENARIO · SIMULATION WORKBENCH</span>
          <h1 class="page-title">Decarbonization Scenario Planner</h1>
          <p class="page-meta">Explore emission pathways · Paris Agreement alignment · 1.5°C compatible targets</p>
        </div>
        <div class="page-actions" style="display:flex;align-items:center;gap:8px;">
          <select class="btn btn-secondary btn-sm" id="savedScenarioSelect" style="font-size:11px;padding:4px 8px;cursor:pointer;">
            <option value="">📂 Load Scenario...</option>
          </select>
          <button class="btn btn-secondary btn-sm" id="btnSaveScenario">💾 Save Scenario</button>
          <button class="btn btn-secondary btn-sm" id="btnExportScenario">⬇ Export</button>
          <button class="btn btn-primary btn-sm" id="btnAIOptimize">🤖 AI Optimize</button>
        </div>
      </div>

      <div class="grid-12">

        <!-- Controls Panel -->
        <div class="card col-span-4">
          <div class="card-header">
            <span class="card-title">Scenario Parameters</span>
            <button class="btn btn-secondary btn-sm" id="resetBtn" style="font-size:9px;">↺ Reset</button>
          </div>
          <div class="card-body stack">

            ${[
              { key: 'coalReduction', label: 'COAL REDUCTION', min: 0, max: 100, unit: '%', color: '#ff6b6b' },
              { key: 'renewableMix', label: 'RENEWABLE MIX', min: 0, max: 100, unit: '%', color: '#46f6be' },
              { key: 'fgdEfficiency', label: 'FGD EFFICIENCY', min: 70, max: 99, unit: '%', color: '#ffb957' },
              { key: 'productionVolume', label: 'PRODUCTION VOLUME', min: 50, max: 120, unit: '%', color: '#93ccff' },
              { key: 'carbonPrice', label: 'CARBON PRICE (€/EUA)', min: 20, max: 150, unit: '€', color: '#dae2fd' },
            ].map(p => `
              <div class="scenario-slider">
                <div style="display:flex;justify-content:space-between;margin-bottom:6px;">
                  <span class="label-mono">${p.label}</span>
                  <span style="font-family:var(--font-mono);font-size:13px;font-weight:600;color:${p.color};" id="val-${p.key}">${params[p.key]}${p.unit}</span>
                </div>
                <input type="range" min="${p.min}" max="${p.max}" value="${params[p.key]}" 
                  id="slider-${p.key}" data-key="${p.key}" data-unit="${p.unit}"
                  style="accent-color:${p.color};" />
                <div style="display:flex;justify-content:space-between;margin-top:2px;">
                  <span style="font-family:var(--font-mono);font-size:8px;color:var(--on-surface-dim);">${p.min}${p.unit}</span>
                  <span style="font-family:var(--font-mono);font-size:8px;color:var(--on-surface-dim);">${p.max}${p.unit}</span>
                </div>
              </div>
            `).join('')}

            <div style="margin-top:4px;">
              <div style="display:flex;justify-content:space-between;margin-bottom:6px;">
                <span class="label-mono">TARGET YEAR</span>
                <span style="font-family:var(--font-mono);font-size:13px;font-weight:600;color:var(--on-surface);" id="val-timeHorizon">${params.timeHorizon}</span>
              </div>
              <input type="range" min="2026" max="2050" value="${params.timeHorizon}" id="slider-timeHorizon" data-key="timeHorizon" data-unit="" style="accent-color:#46f6be;" class="scenario-slider" />
              <div style="display:flex;justify-content:space-between;margin-top:2px;">
                <span style="font-family:var(--font-mono);font-size:8px;color:var(--on-surface-dim);">2026</span>
                <span style="font-family:var(--font-mono);font-size:8px;color:var(--on-surface-dim);">2050</span>
              </div>
            </div>

          </div>
        </div>

        <!-- Output Cards + Charts -->
        <div class="col-span-8 stack">

          <!-- Output Metrics -->
          <div class="grid-4">
            <div class="metric-card primary">
              <span class="metric-label">PROJECTED EMISSIONS</span>
              <div style="display:flex;align-items:baseline;gap:4px;">
                <span class="metric-value" id="out-projected">${out.projected}</span>
                <span class="metric-unit">kt CO₂e</span>
              </div>
              <div class="metric-delta delta-down">▼ <span id="out-reduction">${out.reduction}</span>% vs. baseline</div>
            </div>
            <div class="metric-card primary">
              <span class="metric-label">CARBON CREDIT SAVING</span>
              <div style="display:flex;align-items:baseline;gap:4px;">
                <span class="metric-value" id="out-saving">€${out.creditSaving}</span>
                <span class="metric-unit">M/yr</span>
              </div>
              <div class="metric-delta delta-down">▼ Penalty avoidance</div>
            </div>
            <div class="metric-card amber">
              <span class="metric-label">INVESTMENT REQUIRED</span>
              <div style="display:flex;align-items:baseline;gap:4px;">
                <span class="metric-value" id="out-invest">€${out.investCost}</span>
                <span class="metric-unit">K</span>
              </div>
              <div class="metric-delta delta-neutral">◆ CAPEX estimate</div>
            </div>
            <div class="metric-card primary">
              <span class="metric-label">PROJECTED ROI</span>
              <div style="display:flex;align-items:baseline;gap:4px;">
                <span class="metric-value" id="out-roi">${out.roi}</span>
                <span class="metric-unit">%</span>
              </div>
              <div class="metric-delta delta-down">▼ By ${params.timeHorizon}</div>
            </div>
          </div>

          <!-- Pathway Chart -->
          <div class="card">
            <div class="card-header">
              <span class="card-title">Emission Reduction Pathway — Baseline vs. Scenario</span>
              <div style="display:flex;gap:10px;">
                <span style="font-family:var(--font-mono);font-size:9px;color:rgba(255,255,255,0.3);">─── Baseline (BAU)</span>
                <span style="font-family:var(--font-mono);font-size:9px;color:#46f6be;">─── Your Scenario</span>
                <span style="font-family:var(--font-mono);font-size:9px;color:#ffb957;">─── 1.5°C Pathway</span>
              </div>
            </div>
            <div class="card-body" style="padding:10px 14px 14px;">
              <div id="pathwayChart" style="height:160px;"></div>
            </div>
          </div>

          <!-- Pathway Benchmarks -->
          <div class="card">
            <div class="card-header">
              <span class="card-title">Alignment vs. Climate Targets</span>
            </div>
            <div class="card-body">
              <div style="display:flex;flex-direction:column;gap:10px;">
                ${[
                  { label: 'Paris Agreement 1.5°C', target: 'Net Zero by 2050', pct: 72, color: '#46f6be', status: 'ON TRACK' },
                  { label: 'EU Green Deal 2030 Target', target: '55% reduction vs. 1990', pct: out.reduction > 55 ? 100 : out.reduction/55*100, color: '#ffb957', status: out.reduction > 55 ? 'ACHIEVED' : 'AT RISK' },
                  { label: 'Science-Based Targets (SBTi)', target: '42% Scope 1+2 by 2030', pct: out.reduction > 42 ? 100 : out.reduction/42*100, color: '#ffb957', status: out.reduction > 42 ? 'ACHIEVED' : 'AT RISK' },
                  { label: 'EU ETS Phase 4 (2021–2030)', target: 'Annual cap reductions', pct: 88, color: '#46f6be', status: 'COMPLIANT' },
                ].map(b => `
                  <div>
                    <div style="display:flex;justify-content:space-between;margin-bottom:4px;align-items:center;">
                      <div>
                        <div style="font-size:12px;font-weight:500;color:var(--on-surface);">${b.label}</div>
                        <div style="font-family:var(--font-mono);font-size:9px;color:var(--on-surface-variant);">${b.target}</div>
                      </div>
                      <span class="chip chip-${b.status === 'ON TRACK' || b.status === 'COMPLIANT' || b.status === 'ACHIEVED' ? 'green' : 'amber'}">${b.status}</span>
                    </div>
                    <div class="progress-bar">
                      <div class="progress-fill" style="width:${Math.min(b.pct,100)}%;background:${b.color};"></div>
                    </div>
                  </div>
                `).join('')}
              </div>
            </div>
          </div>

        </div>
      </div>
    `;
  }

  function updateOutputs() {
    const out = computeOutputs(params);
    const setEl = (id, val) => { const e = document.getElementById(id); if(e) e.textContent = val; };
    setEl('out-projected', out.projected);
    setEl('out-reduction', out.reduction);
    setEl('out-saving', `€${out.creditSaving}`);
    setEl('out-invest', `€${out.investCost}`);
    setEl('out-roi', out.roi);

    // Redraw pathway chart
    renderPathwayChart();
  }

  function renderPathwayChart() {
    const el = document.getElementById('pathwayChart');
    if (!el) return;
    const years = [2026, 2028, 2030, 2032, 2035, 2040, 2045, 2050];
    const baseline = years.map((y, i) => 1247 * Math.pow(1.005, i * 2));
    const targetYear = params.timeHorizon;
    const finalEmissions = parseFloat(computeOutputs(params).projected);
    const scenario = years.map((y, i) => {
      const t = (y - 2026) / (targetYear - 2026);
      return t >= 1 ? finalEmissions : 1247 - (1247 - finalEmissions) * Math.min(t, 1);
    });
    const paris = years.map((y, i) => 1247 * Math.pow(0.92, i));

    Charts.areaChart(el, [
      { data: baseline, color: 'rgba(255,255,255,0.3)' },
      { data: scenario, color: '#46f6be' },
      { data: paris, color: '#ffb957' },
    ], { height: 160, labels: years.map(String) });
  }

  function init() {
    renderPathwayChart();

    // Slider bindings
    document.querySelectorAll('input[type="range"][data-key]').forEach(slider => {
      const key = slider.dataset.key;
      const unit = slider.dataset.unit;
      slider.addEventListener('input', () => {
        params[key] = parseFloat(slider.value);
        if (window.ClimateSphere.DB) window.ClimateSphere.DB.setScenarioParams(params);
        const label = document.getElementById(`val-${key}`);
        if (label) label.textContent = params[key] + unit;
        updateOutputs();
      });
    });

    // Scenario dropdown population & switching
    const scenarioSelect = document.getElementById('savedScenarioSelect');
    if (scenarioSelect && window.ClimateSphere && window.ClimateSphere.DB && typeof window.ClimateSphere.DB.getSavedScenarios === 'function') {
      window.ClimateSphere.DB.getSavedScenarios().then(list => {
        if (!Array.isArray(list) || list.length === 0) return;
        scenarioSelect.innerHTML = '<option value="">📂 Load Saved Scenario (' + list.length + ')...</option>' + 
          list.map(s => `<option value="${s.id}">${s.name} (${s.target_year || (s.parameters_json && s.parameters_json.timeHorizon) || 2030})</option>`).join('');
      }).catch(() => {});

      scenarioSelect.addEventListener('change', () => {
        const id = scenarioSelect.value;
        if (!id || !window.ClimateSphere.DB) return;
        const cached = window.ClimateSphere.DB.get('saved_scenarios', []);
        const found = cached.find(s => s.id === id);
        if (found) {
          const p = found.parameters_json || found.parameters || {};
          params = {
            coalReduction: p.coalReduction !== undefined ? Number(p.coalReduction) : (found.coal_reduction !== undefined ? Number(found.coal_reduction) : params.coalReduction),
            renewableMix: p.renewableMix !== undefined ? Number(p.renewableMix) : (found.renewable_mix !== undefined ? Number(found.renewable_mix) : params.renewableMix),
            fgdEfficiency: p.fgdEfficiency !== undefined ? Number(p.fgdEfficiency) : (found.fgd_efficiency !== undefined ? Number(found.fgd_efficiency) : params.fgdEfficiency),
            productionVolume: p.productionVolume !== undefined ? Number(p.productionVolume) : (found.production_volume !== undefined ? Number(found.production_volume) : params.productionVolume),
            carbonPrice: p.carbonPrice !== undefined ? Number(p.carbonPrice) : (found.carbon_price !== undefined ? Number(found.carbon_price) : params.carbonPrice),
            timeHorizon: p.timeHorizon !== undefined ? Number(p.timeHorizon) : (found.target_year !== undefined ? Number(found.target_year) : params.timeHorizon),
          };
          window.ClimateSphere.DB.setScenarioParams(params);
          // Sync slider inputs and labels
          Object.keys(params).forEach(k => {
            const slider = document.getElementById(`slider-${k}`);
            if (slider) slider.value = params[k];
            const label = document.getElementById(`val-${k}`);
            if (label) {
              const unit = slider ? (slider.dataset.unit || '') : '';
              label.textContent = params[k] + unit;
            }
          });
          updateOutputs();
          window.ClimateSphere.showToast(`✓ Loaded scenario: ${found.name}`);
        }
      });
    }

    // Save button
    const btnSave = document.getElementById('btnSaveScenario');
    if (btnSave) {
      btnSave.addEventListener('click', async () => {
        if (window.ClimateSphere.DB) {
          window.ClimateSphere.DB.setScenarioParams(params);
          const defaultName = `Transition Pathway ${params.timeHorizon} (${params.coalReduction}% Coal Cut)`;
          const name = (typeof window.prompt === 'function') 
            ? (window.prompt('Enter scenario name:', defaultName) || defaultName)
            : defaultName;
          
          const scenarioPayload = {
            id: `scen-${Date.now()}`,
            name,
            description: `Model: ${params.coalReduction}% coal reduction, ${params.renewableMix}% renewable mix, ${params.fgdEfficiency}% FGD capture`,
            facility_id: 'DU-03',
            target_year: params.timeHorizon,
            parameters: params
          };

          if (typeof window.ClimateSphere.DB.saveScenarioToServer === 'function') {
            await window.ClimateSphere.DB.saveScenarioToServer(scenarioPayload);
          }
          window.ClimateSphere.showToast('✓ Decarbonization pathway saved to TimescaleDB & local store');

          if (scenarioSelect && typeof window.ClimateSphere.DB.getSavedScenarios === 'function') {
            const updatedList = await window.ClimateSphere.DB.getSavedScenarios();
            scenarioSelect.innerHTML = '<option value="">📂 Load Saved Scenario (' + updatedList.length + ')...</option>' + 
              updatedList.map(s => `<option value="${s.id}">${s.name} (${s.target_year || 2030})</option>`).join('');
          }
        }
      });
    }


    // Export button
    const btnExport = document.getElementById('btnExportScenario');
    if (btnExport) {
      btnExport.addEventListener('click', () => {
        const out = computeOutputs(params);
        const csvContent = `Metric,Value,Unit\nTarget Year,${params.timeHorizon},Year\nCoal Reduction,${params.coalReduction},%\nRenewable Mix,${params.renewableMix},%\nFGD Efficiency,${params.fgdEfficiency},%\nCarbon Price,${params.carbonPrice},EUR/EUA\nProjected Emissions,${out.projected},kt CO2e\nEmissions Reduction,${out.reduction},%\nAnnual Credit Saving,${out.creditSaving},M EUR\nInvestment CapEx,${out.investCost},k EUR\nProjected ROI,${out.roi},%\n`;
        const blob = new Blob([csvContent], { type: 'text/csv' });
        if (window.ClimateSphere.Docs) {
          window.ClimateSphere.Docs.downloadBlob(blob, `Scenario_Pathway_${params.timeHorizon}.csv`);
        }
        window.ClimateSphere.showToast('Scenario pathway exported (.csv)');
      });
    }

    // AI Optimize button
    const btnOpt = document.getElementById('btnAIOptimize');
    if (btnOpt) {
      btnOpt.addEventListener('click', () => {
        // AI recommended best-fit Paris 1.5°C parameters
        params = {
          coalReduction: 65,
          renewableMix: 75,
          fgdEfficiency: 98,
          productionVolume: 90,
          carbonPrice: 85,
          timeHorizon: 2030,
        };
        if (window.ClimateSphere.DB) window.ClimateSphere.DB.setScenarioParams(params);
        window.ClimateSphere.showToast('🤖 AI Optimized: Paris 1.5°C Paris-aligned pathway applied');
        window.ClimateSphere.navigateTo('scenario');
      });
    }

    // Reset
    const resetBtn = document.getElementById('resetBtn');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        params = { coalReduction: 25, renewableMix: 40, fgdEfficiency: 92, productionVolume: 85, carbonPrice: 62, timeHorizon: 2030 };
        if (window.ClimateSphere.DB) window.ClimateSphere.DB.setScenarioParams(params);
        window.ClimateSphere.navigateTo('scenario');
      });
    }
  }

  return { render, init };
})();

window.Scenario = Scenario;
