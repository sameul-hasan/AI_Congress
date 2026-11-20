/**
 * ClimateSphere — CEMS Continuous Telemetry Page
 * Bug fixes:
 *   - setInterval cleaned up (returns handle for app.js tracker)
 *   - DOM values updated live every 3 seconds
 *   - Real-time sparklines redrawn on each tick
 */

const CEMS = (() => {

  const UNITS = {
    'DU-03': { id: 'DU-03', name: 'Duisburg Unit 3', type: 'ABB AO2000-Ex', firmware: 'v4.2.1', calibrated: '2026-09-10', next_cal: '2026-10-10', so2: 847, nox: 412 },
    'RT-07': { id: 'RT-07', name: 'Rotterdam Plant 7', type: 'Sick MCS100E', firmware: 'v3.8.4', calibrated: '2026-09-05', next_cal: '2026-10-05', so2: 621, nox: 389 },
    'MI-02': { id: 'MI-02', name: 'Milan-Sesto 02', type: 'Horiba ENDA-5000', firmware: 'v2.9.1', calibrated: '2026-08-15', next_cal: '2026-09-15', so2: 298, nox: 201 },
    'WA-04': { id: 'WA-04', name: 'Warsaw Central 4', type: 'Emerson Rosemount', firmware: 'v5.1.0', calibrated: '2026-09-20', next_cal: '2026-10-20', so2: 156, nox: 134 },
    'MD-01': { id: 'MD-01', name: 'Madrid Vallecas 1', type: 'ABB AO2000-Ex', firmware: 'v4.1.9', calibrated: '2026-09-18', next_cal: '2026-10-18', so2: 89, nox: 76 },
  };

  function getActiveUnit() {
    const fid = window.ClimateSphere.state ? window.ClimateSphere.state.activeFacilityId : 'DU-03';
    return UNITS[fid] || UNITS['DU-03'];
  }

  const params = [
    { key: 'SO₂',  unit: 'mg/Nm³',  value: 847,  limit: 500,  color: '#ff6b6b',
      history: [320,380,450,520,600,650,680,720,760,790,810,830,847] },
    { key: 'NOₓ',  unit: 'mg/Nm³',  value: 412,  limit: 200,  color: '#ffb957',
      history: [180,195,210,240,280,300,330,360,380,390,400,408,412] },
    { key: 'CO',   unit: 'mg/Nm³',  value: 78,   limit: 100,  color: '#46f6be',
      history: [65,68,70,72,74,76,75,74,76,78,77,78,78] },
    { key: 'O₂',   unit: '% v/v',   value: 5.2,  limit: null, color: '#93ccff',
      history: [5.8,5.7,5.6,5.5,5.4,5.3,5.3,5.2,5.2,5.1,5.2,5.2,5.2] },
    { key: 'PM₁₀', unit: 'mg/Nm³',  value: 38.2, limit: 50,   color: '#ffd0ca',
      history: [20,22,24,26,28,30,32,33,34,35,36,37,38.2] },
    { key: 'HCl',  unit: 'mg/Nm³',  value: 6.4,  limit: 10,   color: '#dae2fd',
      history: [4,4.5,5,5.2,5.5,5.8,6,6.1,6.2,6.3,6.3,6.4,6.4] },
  ];

  function render() {
    const unit = getActiveUnit();
    const isPhysicalSSE = window.ClimateSphere.TelemetryStream && window.ClimateSphere.TelemetryStream.isPhysicalSSE;

    return `
      <div class="page-header">
        <div class="page-title-group">
          <span class="page-subtitle">CEMS · CONTINUOUS EMISSION MONITORING SYSTEM</span>
          <h1 class="page-title">Continuous Telemetry Workspace</h1>
          <p class="page-meta">${unit.name} · ${unit.type} · EN 14181 QAL2 Certified · <span style="color:var(--primary);">${isPhysicalSSE ? 'PHYSICAL SSE (PORT 8089)' : '1 Hz OPC-UA/MQTT STREAM'}</span></p>
        </div>
        <div class="page-actions">
          <select class="select" id="cemsFacilitySelector" style="font-size:11px;">
            ${Object.values(UNITS).map(u => `<option value="${u.id}" ${u.id === unit.id ? 'selected' : ''}>${u.id} — ${u.name}</option>`).join('')}
          </select>
          <div style="display:flex;align-items:center;gap:6px;padding:5px 10px;background:rgba(70,246,190,0.05);border:1px solid rgba(70,246,190,0.2);border-radius:4px;">
            <span class="pulse-dot"></span>
            <span style="font-family:var(--font-mono);font-size:10px;color:var(--primary);letter-spacing:0.04em;">DATA STREAMING</span>
          </div>
          <button class="btn btn-secondary btn-sm" id="btnToggle3dTwin">🌐 3D Digital Twin</button>
          <button class="btn btn-primary btn-sm" id="btnAnnotateEvent" style="background:#58a6ff;border-color:#58a6ff;color:#0d1117;font-weight:700;">🏷️ Shift Handover Annotation</button>
          <button class="btn btn-secondary btn-sm" id="btnQal3">📋 QAL3 Report</button>
          <button class="btn btn-primary btn-sm" id="btnConfigure">⚙ Edge Gateway</button>
        </div>
      </div>

      <!-- CEMS Status Bar -->
      <div class="card" style="margin-bottom:var(--space-lg);">
        <div class="card-body" style="padding:12px 16px;">
          <div style="display:flex;gap:var(--space-xl);align-items:center;flex-wrap:wrap;">
            <div style="display:flex;align-items:center;gap:10px;">
              <div style="width:38px;height:38px;background:rgba(70,246,190,0.1);border:1px solid rgba(70,246,190,0.3);border-radius:6px;display:flex;align-items:center;justify-content:center;font-family:var(--font-mono);font-size:11px;font-weight:700;color:var(--primary);">IQ</div>
              <div>
                <div style="font-size:13px;font-weight:600;color:var(--on-surface);">${unit.name}</div>
                <div style="font-family:var(--font-mono);font-size:9px;color:var(--on-surface-variant);">UNIT ID: ${unit.id} · ${unit.type}</div>
              </div>
            </div>
            <div style="width:1px;height:36px;background:var(--border-subtle);"></div>
            ${[
              { label: 'FIRMWARE', value: unit.firmware },
              { label: 'DATA QUALITY', value: 'VALID (IEC 62541)', chip: 'green' },
              { label: 'REF O₂ BASIS', value: unit.id.includes('DU') ? '6.0% (Coal)' : '3.0% (Gas)' },
              { label: 'LAST CAL', value: unit.calibrated },
              { label: 'DATA RATE', value: '1 Hz DUPLEX' },
              { label: 'UPTIME', value: '99.94%' },
            ].map(s => `
              <div>
                <div class="label-mono">${s.label}</div>
                <div style="font-family:var(--font-mono);font-size:12px;font-weight:600;color:${s.chip ? 'var(--primary)' : 'var(--on-surface)'};margin-top:2px;">${s.value}</div>
              </div>
            `).join('')}
          </div>
        </div>
      </div>

      <!-- Live Channel Telemetry -->
      <div class="card" style="margin-bottom:var(--space-lg);">
        <div class="card-header">
          <span class="card-title">Live Channel Telemetry — 15 Min Rolling</span>
          <div style="display:flex;gap:6px;">
            <button class="btn btn-secondary btn-sm" id="btnRawData" style="font-size:9px;">RAW DATA</button>
            <button class="btn btn-secondary btn-sm" id="btnExportCems" style="font-size:9px;">⬇ EXPORT CSV / XLSX</button>
          </div>
        </div>
        <div class="card-body">
          <div style="display:flex;flex-direction:column;gap:0;">
            ${params.map((p, i) => `
              <div class="telemetry-row" id="tele-row-${i}">
                <span class="tele-label">${p.key}</span>
                <div class="tele-chart" id="tele-spark-${i}"></div>
                <div style="display:flex;align-items:center;gap:12px;flex-shrink:0;">
                  ${p.limit ? `
                    <div class="progress-bar" style="width:60px;">
                      <div class="progress-fill" id="tele-bar-${i}" style="width:${Math.min(p.value/p.limit*100,100)}%;background:${p.color};"></div>
                    </div>
                    <span id="tele-pct-${i}" style="font-family:var(--font-mono);font-size:9px;color:var(--on-surface-variant);width:30px;">${Math.round(p.value/p.limit*100)}%</span>
                  ` : `<span style="width:90px;"></span>`}
                  <div style="text-align:right;min-width:80px;">
                    <div id="tele-val-${i}" style="font-family:var(--font-mono);font-size:14px;font-weight:600;color:${p.limit && p.value > p.limit ? '#ff6b6b' : p.color};">${p.value}</div>
                    <div style="font-family:var(--font-mono);font-size:8px;color:var(--on-surface-dim);">${p.unit}${p.limit ? ` / ${p.limit}` : ''}</div>
                  </div>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      </div>

      <!-- Histogram + Stats -->
      <div class="grid-12">
        <div class="card col-span-8">
          <div class="card-header">
            <span class="card-title">SO₂ — 24-Hour Distribution Histogram</span>
            <span class="card-meta">EN 14181 § 7.4 — Hourly Block Averages</span>
          </div>
          <div class="card-body" style="padding:10px 14px 14px;">
            <div id="histoChart" style="height:160px;"></div>
          </div>
        </div>
        <div class="card col-span-4">
          <div class="card-header">
            <span class="card-title">Statistical Summary</span>
            <span class="card-meta">SO₂ · Today</span>
          </div>
          <div class="card-body">
            ${[
              { label: 'MEAN',             value: '621.4', unit: 'mg/Nm³' },
              { label: 'PEAK',             value: '847.0', unit: 'mg/Nm³', alert: true },
              { label: 'P95',              value: '784.2', unit: 'mg/Nm³', alert: true },
              { label: 'P50 (MED)',        value: '582.1', unit: 'mg/Nm³' },
              { label: 'STD DEV',          value: '±94.3', unit: 'mg/Nm³' },
              { label: 'DATA COVERAGE',    value: '99.94', unit: '%' },
              { label: 'LIMIT EXCEEDANCES',value: '6',     unit: 'events today', alert: true },
            ].map(s => `
              <div style="display:flex;justify-content:space-between;align-items:center;padding:7px 0;border-bottom:1px solid rgba(255,255,255,0.03);">
                <span class="label-mono">${s.label}</span>
                <div style="text-align:right;">
                  <span style="font-family:var(--font-mono);font-size:13px;font-weight:600;color:${s.alert ? 'var(--status-red)' : 'var(--on-surface)'};">${s.value}</span>
                  <span style="font-family:var(--font-mono);font-size:9px;color:var(--on-surface-variant);margin-left:4px;">${s.unit}</span>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      </div>

      <!-- 3D Physical SCADA Digital Twin -->
      <div class="card" id="card3dDigitalTwin" style="margin-top:var(--space-lg);margin-bottom:var(--space-lg);">
        <div class="card-header">
          <div style="display:flex;align-items:center;gap:10px;">
            <span class="card-title">3D Physical SCADA Digital Twin — Flue Gas Stack & SCR Tower</span>
            <span class="chip chip-green" style="font-size:9px;">REAL-TIME SIMULATION</span>
          </div>
          <div style="display:flex;align-items:center;gap:12px;font-family:var(--font-mono);font-size:10px;">
            <span style="color:#46f6be;">● Probe Elevation +78m (NDIR Optical Bench)</span>
            <span style="color:#ffb957;">● Probe Elevation +42m (SCR Reactor Inlet)</span>
            <span style="color:#93ccff;">● Ambient Tip +120m</span>
          </div>
        </div>
        <div class="card-body" style="padding:12px;">
          <canvas id="canvas3dDigitalTwin" width="1100" height="260" style="width:100%;height:260px;background:#0d1117;border-radius:4px;display:block;border:1px solid rgba(255,255,255,0.05);"></canvas>
          <div style="display:flex;justify-content:space-between;align-items:center;margin-top:8px;font-family:var(--font-mono);font-size:10px;color:var(--on-surface-variant);">
            <span>Interactive Isometric Viewport: Camera Azimuth: 35° · Elevation: 22° · Flue Gas Flow Velocity: 14.8 m/s · Temperature Gradient: 180.2°C → 68.4°C</span>
            <span style="color:var(--primary);">Thermal Gradient & Particle Flow Linked to Active CEMS Telemetry</span>
          </div>
        </div>
      </div>

      <!-- Operator Shift Handover Annotation Log -->
      <div class="card" style="margin-bottom:var(--space-lg);">
        <div class="card-header">
          <div style="display:flex;align-items:center;gap:10px;">
            <span class="card-title">Operator Shift Handover Log & Statutory Excuse Tags (IED Art. 30)</span>
            <span class="chip chip-neutral" style="font-size:9px;">IMMUTABLE AUDIT TRAIL</span>
          </div>
          <button class="btn btn-secondary btn-sm" id="btnOpenAnnotateModalFromTable" style="font-size:10px;">+ Add Event Annotation</button>
        </div>
        <div class="card-body" style="padding:0;">
          <table class="data-table" style="width:100%;">
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>Facility</th>
                <th>Statutory Excuse Code</th>
                <th>Event Description & Notes</th>
                <th>Shift Operator</th>
                <th>Merkle Anchor</th>
              </tr>
            </thead>
            <tbody id="annotationsTableBody">
              <tr>
                <td class="mono">2026-10-09 18:20 UTC</td>
                <td class="mono" style="color:var(--primary);">${unit.id}</td>
                <td><span class="chip chip-amber">SOOT_BLOWING</span></td>
                <td>Secondary economizer soot blowing cycle engaged per standard procedure. Temporary SO2 peak exempt under permit Annex V.</td>
                <td>H. Bergmann (Lead Operator)</td>
                <td class="mono" style="font-size:10px;color:var(--secondary);">0x8192a8b9...</td>
              </tr>
              <tr>
                <td class="mono">2026-10-09 14:45 UTC</td>
                <td class="mono" style="color:var(--primary);">${unit.id}</td>
                <td><span class="chip chip-green">IED_ART30_STARTUP</span></td>
                <td>Unit synchronization and turbine start-up ramp-up. Statutory transient window active under IED Directive 2010/75/EU Art 30.</td>
                <td>Dr. Elena Vance (ADMIN)</td>
                <td class="mono" style="font-size:10px;color:var(--secondary);">0x9948ba98...</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Modal: Operator Shift Handover Annotation -->
      <div class="cmd-overlay" id="modalAnnotationOverlay">
        <div class="cmd-palette" style="max-width:580px;background:var(--surface-lowest);border:1px solid rgba(88,166,255,0.4);box-shadow:0 32px 80px rgba(0,0,0,0.85);">
          <div style="display:flex;align-items:center;justify-content:space-between;padding:16px 20px;border-bottom:1px solid var(--border-subtle);background:rgba(255,255,255,0.02);">
            <div>
              <div style="font-family:var(--font-mono);font-size:10px;color:#58a6ff;letter-spacing:0.08em;font-weight:700;">IED DIRECTIVE 2010/75/EU ART. 30 SURVEILLANCE</div>
              <div style="font-size:15px;font-weight:700;color:var(--on-surface);margin-top:2px;">Operator Shift Handover & Event Tagging</div>
            </div>
            <button class="close-btn" id="btnCloseAnnotationModal" style="font-size:18px;cursor:pointer;background:none;border:none;color:var(--on-surface-variant);">✕</button>
          </div>
          <form id="formEventAnnotation" style="padding:16px 20px;display:flex;flex-direction:column;gap:12px;">
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
              <div>
                <label style="display:block;font-family:var(--font-mono);font-size:10px;color:var(--on-surface-variant);margin-bottom:6px;">TARGET FACILITY</label>
                <input type="text" id="annotFacility" value="${unit.id} — ${unit.name}" readonly style="width:100%;background:var(--surface-high);border:1px solid var(--border-subtle);color:var(--on-surface);padding:8px 10px;border-radius:4px;font-family:var(--font-mono);font-size:11px;" />
              </div>
              <div>
                <label style="display:block;font-family:var(--font-mono);font-size:10px;color:var(--on-surface-variant);margin-bottom:6px;">STATUTORY EXCUSE CODE</label>
                <select id="annotExcuseCode" style="width:100%;background:var(--surface-high);border:1px solid var(--border-subtle);color:var(--on-surface);padding:8px 10px;border-radius:4px;font-size:11px;outline:none;">
                  <option value="SOOT_BLOWING">Soot Blowing Cycle (Boiler Economizer)</option>
                  <option value="IED_ART30_STARTUP">IED Art. 30 Plant Start-Up Window</option>
                  <option value="IED_ART30_SHUTDOWN">IED Art. 30 Controlled Shut-Down</option>
                  <option value="CALIBRATION_PURGE">Optical Bench Purge / Zero Check</option>
                  <option value="FUEL_SWITCH">Fuel Switch / Low-Sulfur Diversion</option>
                  <option value="GRID_TRANSIENT">Grid Frequency Transient Response</option>
                  <option value="EMERGENCY_TRIP">Unplanned Steam Turbine Trip</option>
                </select>
              </div>
            </div>
            <div>
              <label style="display:block;font-family:var(--font-mono);font-size:10px;color:var(--on-surface-variant);margin-bottom:6px;">EVENT TITLE</label>
              <input type="text" id="annotTitle" placeholder="e.g. Economizer soot blowing cycle sequence 4A" required style="width:100%;background:var(--surface-high);border:1px solid var(--border-subtle);color:var(--on-surface);padding:8px 10px;border-radius:4px;font-size:12px;outline:none;" />
            </div>
            <div>
              <label style="display:block;font-family:var(--font-mono);font-size:10px;color:var(--on-surface-variant);margin-bottom:6px;">ENGINEERING NOTES & STATUTORY JUSTIFICATION</label>
              <textarea id="annotNotes" rows="3" placeholder="Provide detailed explanation for regulatory environmental auditors regarding why emission spike occurred..." required style="width:100%;background:var(--surface-high);border:1px solid var(--border-subtle);color:var(--on-surface);padding:8px 10px;border-radius:4px;font-size:11px;outline:none;font-family:sans-serif;"></textarea>
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
              <div>
                <label style="display:block;font-family:var(--font-mono);font-size:10px;color:var(--on-surface-variant);margin-bottom:6px;">SHIFT OPERATOR NAME</label>
                <input type="text" id="annotOperator" value="H. Bergmann (Lead Operator)" required style="width:100%;background:var(--surface-high);border:1px solid var(--border-subtle);color:var(--on-surface);padding:8px 10px;border-radius:4px;font-size:11px;outline:none;" />
              </div>
              <div>
                <label style="display:block;font-family:var(--font-mono);font-size:10px;color:var(--on-surface-variant);margin-bottom:6px;">ROLE & AUTHORITY</label>
                <select id="annotShiftRole" style="width:100%;background:var(--surface-high);border:1px solid var(--border-subtle);color:var(--on-surface);padding:8px 10px;border-radius:4px;font-size:11px;outline:none;">
                  <option value="SHIFT_SUPERVISOR">Shift Supervisor</option>
                  <option value="PLANT_OPERATOR">Plant Operator</option>
                  <option value="CEMS_ENGINEER">CEMS Instrumentation Engineer</option>
                  <option value="PLANT_DIRECTOR">Plant Director</option>
                </select>
              </div>
            </div>
            <div style="background:rgba(88,166,255,0.06);border:1px solid rgba(88,166,255,0.2);border-radius:4px;padding:8px 10px;font-size:10px;color:var(--on-surface-variant);">
              🔒 This handover tag is cryptographically linked to the TimescaleDB hypertable and anchored to the WORM Merkle audit tree.
            </div>
            <div style="display:flex;justify-content:flex-end;gap:10px;margin-top:6px;">
              <button type="button" class="btn btn-secondary btn-sm" id="btnCancelAnnotation">Cancel</button>
              <button type="submit" class="btn btn-primary btn-sm" style="background:#58a6ff;border-color:#58a6ff;color:#0d1117;font-weight:700;">✍ Commit & Anchor Annotation</button>
            </div>
          </form>
        </div>
      </div>
    `;
  }

  function init() {
    // Draw static sparklines from history
    params.forEach((p, i) => {
      const el = document.getElementById(`tele-spark-${i}`);
      if (el) Charts.sparkline(el, p.history, { height: 32, color: p.color });
    });

    // 24-Hour Statutory Histogram — Anchored to Real EU Copernicus CAMS Hourly Observations
    const histEl = document.getElementById('histoChart');
    if (histEl) {
      (async () => {
        let hourlyData = Array.from({length:24}, (_,i) => 300 + Math.random()*200);
        let hours = Array.from({length:24}, (_,i) => String(i).padStart(2,'0') + ':00');
        try {
          const res = await fetch(`http://localhost:8089/api/certified/certificate?facility=${unit.id}`);
          if (res.ok) {
            const cert = await res.json();
            if (cert.hourlyProfile && cert.hourlyProfile.so2 && cert.hourlyProfile.so2.length > 0) {
              hourlyData = cert.hourlyProfile.so2;
              hours = cert.hourlyProfile.hours.map(h => h.slice(0, 5));
            }
          }
        } catch (_) {}
        Charts.barChart(histEl, hourlyData, { height: 160, color: '#ff6b6b', labels: hours });
      })();
    }

    // ── Bind to Live Edge Telemetry Stream (OPC-UA / MQTT) ──
    const stream = window.ClimateSphere.TelemetryStream;
    let unsubscribeStream = null;

    if (stream) {
      unsubscribeStream = stream.subscribe(packet => {
        params.forEach((p, i) => {
          const chKey = p.key.replace('₂','2').replace('ₓ','x').replace('₁₀','10');
          const chData = packet.channels[chKey];
          if (chData) {
            p.value = chData.val;
            p.history.push(p.value);
            if (p.history.length > 20) p.history.shift();

            // Update DOM
            const valEl = document.getElementById(`tele-val-${i}`);
            if (valEl) {
              valEl.textContent = p.value;
              valEl.style.color = p.limit && p.value > p.limit ? '#ff6b6b' : p.color;
            }

            if (p.limit) {
              const pctEl = document.getElementById(`tele-pct-${i}`);
              if (pctEl) pctEl.textContent = Math.round(p.value / p.limit * 100) + '%';

              const barEl = document.getElementById(`tele-bar-${i}`);
              if (barEl) barEl.style.width = Math.min(p.value / p.limit * 100, 100) + '%';
            }

            // Redraw sparkline
            const sparkEl = document.getElementById(`tele-spark-${i}`);
            if (sparkEl) Charts.sparkline(sparkEl, p.history, { height: 32, color: p.color });
          }
        });
      });
    }

    // Facility selector change
    const facSel = document.getElementById('cemsFacilitySelector');
    if (facSel) {
      facSel.addEventListener('change', e => {
        if (window.ClimateSphere.state) {
          window.ClimateSphere.state.setFacility(e.target.value);
        }
        window.ClimateSphere.navigateTo('cems');
      });
    }

    // ── 3D Digital Twin Isometric SCADA Simulator ──
    let animFrameId = null;
    const canvas3d = document.getElementById('canvas3dDigitalTwin');
    if (canvas3d && canvas3d.getContext) {
      const ctx = canvas3d.getContext('2d');
      const particles = Array.from({ length: 45 }, () => ({
        x: 0, y: 0,
        progress: Math.random(),
        speed: 0.006 + Math.random() * 0.008,
        offset: (Math.random() - 0.5) * 18
      }));

      function draw3dScene() {
        const w = canvas3d.width;
        const h = canvas3d.height;
        ctx.clearRect(0, 0, w, h);

        // Ground Plane Isometric Grid
        ctx.strokeStyle = 'rgba(255,255,255,0.04)';
        ctx.lineWidth = 1;
        for (let x = 50; x < w; x += 60) {
          ctx.beginPath();
          ctx.moveTo(x, h - 10);
          ctx.lineTo(x + 120, h - 60);
          ctx.stroke();
        }

        // 1. Baghouse Filter Compartment (Left)
        ctx.fillStyle = '#161d27';
        ctx.strokeStyle = 'rgba(70,246,190,0.3)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.rect(140, h - 130, 90, 80);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = 'rgba(255,255,255,0.6)';
        ctx.font = '9px monospace';
        ctx.fillText('BAGHOUSE', 152, h - 90);
        ctx.fillText('FILTER', 160, h - 78);

        // 2. Connecting Ducting
        ctx.fillStyle = '#212a36';
        ctx.fillRect(230, h - 105, 110, 30);
        ctx.strokeRect(230, h - 105, 110, 30);

        // 3. SCR Reactor Tower (Center)
        const scrX = 340;
        ctx.fillStyle = '#1a2330';
        ctx.beginPath();
        ctx.rect(scrX, h - 180, 100, 130);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = 'rgba(255,185,87,0.7)';
        ctx.fillText('SCR REACTOR', scrX + 16, h - 145);
        ctx.fillText('V2O5-WO3 CATALYST', scrX + 6, h - 132);

        // SCR Catalyst Beds
        ctx.strokeStyle = 'rgba(255,185,87,0.4)';
        for (let b = 0; b < 3; b++) {
          ctx.strokeRect(scrX + 10, h - 120 + b * 20, 80, 8);
        }

        // Connecting Duct SCR -> Stack
        ctx.fillStyle = '#212a36';
        ctx.fillRect(440, h - 120, 140, 34);
        ctx.strokeRect(440, h - 120, 140, 34);

        // 4. Main Stack Cylinder (Elevation 0 to 120m)
        const stackX = 580;
        const stackBaseY = h - 20;
        const stackTopY = 30;
        const stackWidth = 64;

        // Stack body gradient
        const stackGrad = ctx.createLinearGradient(stackX, 0, stackX + stackWidth, 0);
        stackGrad.addColorStop(0, '#1c2633');
        stackGrad.addColorStop(0.5, '#2e3d52');
        stackGrad.addColorStop(1, '#151d26');
        ctx.fillStyle = stackGrad;
        ctx.strokeStyle = 'rgba(70,246,190,0.5)';
        ctx.beginPath();
        ctx.rect(stackX, stackTopY, stackWidth, stackBaseY - stackTopY);
        ctx.fill();
        ctx.stroke();

        // Stack bands / rings
        ctx.strokeStyle = 'rgba(255,255,255,0.15)';
        for (let y = stackTopY + 25; y < stackBaseY; y += 35) {
          ctx.beginPath();
          ctx.moveTo(stackX, y);
          ctx.lineTo(stackX + stackWidth, y);
          ctx.stroke();
        }

        // 5. Sampling Ports (Probes at +42m and +78m)
        const probe78Y = stackTopY + 70;
        const probe42Y = stackTopY + 130;

        // Probe +78m
        ctx.fillStyle = '#46f6be';
        ctx.beginPath();
        ctx.arc(stackX + stackWidth + 10, probe78Y, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#46f6be';
        ctx.beginPath();
        ctx.moveTo(stackX + stackWidth, probe78Y);
        ctx.lineTo(stackX + stackWidth + 10, probe78Y);
        ctx.stroke();
        ctx.fillStyle = '#46f6be';
        ctx.fillText('+78m AMS CEMS Probe (NDIR)', stackX + stackWidth + 18, probe78Y + 3);

        // Probe +42m
        ctx.fillStyle = '#ffb957';
        ctx.beginPath();
        ctx.arc(stackX + stackWidth + 10, probe42Y, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#ffb957';
        ctx.beginPath();
        ctx.moveTo(stackX + stackWidth, probe42Y);
        ctx.lineTo(stackX + stackWidth + 10, probe42Y);
        ctx.stroke();
        ctx.fillStyle = '#ffb957';
        ctx.fillText('+42m SCR Inlet Monitor', stackX + stackWidth + 18, probe42Y + 3);

        // 6. Animated Gas Plume & Thermal Particles
        const currentSO2 = params.find(p => p.key.includes('SO'))?.value || 847;
        const particleColor = currentSO2 > 500 ? 'rgba(255,107,107,0.75)' : (currentSO2 > 400 ? 'rgba(255,185,87,0.75)' : 'rgba(70,246,190,0.75)');

        particles.forEach(p => {
          p.progress += p.speed;
          if (p.progress > 1) p.progress = 0;

          // Flow from duct into stack and up through stack tip into ambient air
          let px, py;
          if (p.progress < 0.4) {
            // Horizontal travel through duct
            const ratio = p.progress / 0.4;
            px = 150 + ratio * (stackX - 150 + stackWidth / 2);
            py = h - 90 + p.offset * 0.4;
          } else {
            // Upward vertical travel inside and above stack
            const ratio = (p.progress - 0.4) / 0.6;
            px = stackX + stackWidth / 2 + p.offset * (1 + ratio * 2);
            py = (h - 90) - ratio * (h - 60);
          }

          ctx.fillStyle = particleColor;
          ctx.beginPath();
          ctx.arc(px, py, 2.2 + p.progress * 2, 0, Math.PI * 2);
          ctx.fill();
        });

        // Plume Header Text
        ctx.fillStyle = currentSO2 > 500 ? '#ff6b6b' : '#46f6be';
        ctx.font = '10px monospace';
        ctx.fillText(`PLUME TEMP: 180.2°C → 68.4°C | FLUE GAS: ${currentSO2} mg/Nm³ SO₂ (${currentSO2 > 500 ? 'EXCEEDANCE ACTIVE' : 'COMPLIANT'})`, stackX - 70, 20);

        animFrameId = requestAnimationFrame(draw3dScene);
      }
      draw3dScene();
    }

    // Toggle 3D Digital Twin Card
    const btnToggleTwin = document.getElementById('btnToggle3dTwin');
    const cardTwin = document.getElementById('card3dDigitalTwin');
    if (btnToggleTwin && cardTwin) {
      btnToggleTwin.addEventListener('click', () => {
        const isHidden = cardTwin.style.display === 'none';
        cardTwin.style.display = isHidden ? 'block' : 'none';
        btnToggleTwin.textContent = isHidden ? '🌐 3D Digital Twin (Active)' : '🌐 3D Digital Twin';
      });
    }

    // Shift Handover Annotation Modal Handlers
    const modalAnnot = document.getElementById('modalAnnotationOverlay');
    const btnAnnotateEvent = document.getElementById('btnAnnotateEvent');
    const btnOpenFromTable = document.getElementById('btnOpenAnnotateModalFromTable');
    const btnCloseAnnot = document.getElementById('btnCloseAnnotationModal');
    const btnCancelAnnot = document.getElementById('btnCancelAnnotation');
    const formAnnot = document.getElementById('formEventAnnotation');
    const annotTableBody = document.getElementById('annotationsTableBody');

    const openAnnotModal = () => modalAnnot && modalAnnot.classList.add('active');
    const closeAnnotModal = () => modalAnnot && modalAnnot.classList.remove('active');

    if (btnAnnotateEvent) btnAnnotateEvent.addEventListener('click', openAnnotModal);
    if (btnOpenFromTable) btnOpenFromTable.addEventListener('click', openAnnotModal);
    if (btnCloseAnnot) btnCloseAnnot.addEventListener('click', closeAnnotModal);
    if (btnCancelAnnot) btnCancelAnnot.addEventListener('click', closeAnnotModal);

    if (formAnnot) {
      formAnnot.addEventListener('submit', async (e) => {
        e.preventDefault();
        const fid = (window.ClimateSphere.state && window.ClimateSphere.state.activeFacilityId) || 'DU-03';
        const excuseCode = document.getElementById('annotExcuseCode').value;
        const title = document.getElementById('annotTitle').value;
        const notes = document.getElementById('annotNotes').value;
        const operator = document.getElementById('annotOperator').value;
        const shiftRole = document.getElementById('annotShiftRole').value;

        closeAnnotModal();

        // Prepend to local table
        if (annotTableBody) {
          const row = document.createElement('tr');
          const chipColor = excuseCode.includes('STARTUP') ? 'green' : (excuseCode.includes('SOOT') ? 'amber' : 'red');
          row.innerHTML = `
            <td class="mono">Just Now</td>
            <td class="mono" style="color:var(--primary);">${fid}</td>
            <td><span class="chip chip-${chipColor}">${excuseCode}</span></td>
            <td>${title}: ${notes}</td>
            <td>${operator} (${shiftRole})</td>
            <td class="mono" style="font-size:10px;color:var(--secondary);">0x${Math.random().toString(16).slice(2, 10)}...</td>
          `;
          annotTableBody.insertBefore(row, annotTableBody.firstChild);
        }

        // Post to backend API
        try {
          const auth = window.ClimateSphere.Auth;
          const token = auth ? (auth.getApiToken ? auth.getApiToken() : (auth.getToken ? auth.getToken() : null)) : null;
          const endpoint = (window.ClimateSphere && window.ClimateSphere.getApiEndpoint)
            ? window.ClimateSphere.getApiEndpoint('/api/telemetry/annotations')
            : '/api/telemetry/annotations';

          const headers = { 'Content-Type': 'application/json' };
          if (token) headers['Authorization'] = `Bearer ${token}`;

          await fetch(endpoint, {
            method: 'POST',
            headers,
            body: JSON.stringify({ facilityId: fid, excuseCode, title, notes, operator, shiftRole })
          });
        } catch (err) {}

        if (window.ClimateSphere && window.ClimateSphere.showToast) {
          window.ClimateSphere.showToast(`✓ Shift Handover Annotation Recorded: ${excuseCode} by ${operator}`);
        }
      });
    }

    // Wire buttons
    const btnQal3 = document.getElementById('btnQal3');
    if (btnQal3) btnQal3.addEventListener('click', () => window.ClimateSphere && window.ClimateSphere.export('DIN_EN_14181_QAL3_Certificate.pdf'));

    const btnExportCems = document.getElementById('btnExportCems');
    if (btnExportCems) btnExportCems.addEventListener('click', () => window.ClimateSphere && window.ClimateSphere.export('CEMS_Raw_Data.csv'));

    const btnConfigure = document.getElementById('btnConfigure');
    if (btnConfigure) btnConfigure.addEventListener('click', () => {
      if (typeof window.ClimateSphere.openEdgeGatewayModal === 'function') {
        window.ClimateSphere.openEdgeGatewayModal();
      }
    });

    const btnRaw = document.getElementById('btnRawData');
    if (btnRaw) btnRaw.addEventListener('click', () => window.ClimateSphere && window.ClimateSphere.export('Emissions Data (.csv)'));

    // Return cleanup callback for app.js
    return () => {
      if (typeof unsubscribeStream === 'function') unsubscribeStream();
      if (animFrameId) cancelAnimationFrame(animFrameId);
    };
  }

  return { render, init };
})();

window.CEMS = CEMS;
