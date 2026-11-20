/**
 * ClimateSphere — Calibration / QAL3 Page
 * EN 14181 / EN 15267 Continuous Emission Monitoring Quality Assurance
 * Synchronized with Global State Bus (activeFacilityId) & Interactive Modals
 */

const Calibration = (() => {

  const facilityProfiles = {
    'DU-03': {
      id: 'DU-03', name: 'Duisburg Unit 3', type: 'ABB AO2000-Ex Continuous Multi-Gas NDIR',
      channel: 'SO₂ (Sulfur Dioxide)', last: '2026-09-10', next: '2026-10-10', status: 'VALID', daysLeft: 14,
      certNo: 'QAL3-2026-0421', issuer: 'TÜV SÜD Industrie Service GmbH', inspector: 'H. Weber, Lead AMS Auditor',
      zeroDrift: '+0.42% FS', spanDrift: '-1.18% FS', result: 'PASS (EN 14181 § 8.3)',
      driftMonths: ['Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep'],
      zeroHistory: [0.8, 0.5, 0.3, 0.7, 0.9, 0.6, 0.42],
      spanHistory: [-1.2, -0.8, -0.5, -1.0, -1.5, -1.1, -1.18],
      routineProgress: 57,
      steps: [
        { step: 1, name: 'Pre-calibration Check', desc: 'Verify analyzer optical bench temperature & baseline purge', duration: '15 min', status: 'COMPLETE' },
        { step: 2, name: 'Zero Gas Injection', desc: 'Inject 99.999% N₂ zero gas (< 1 ppm SO₂), verify flow at 60 L/h', duration: '10 min', status: 'COMPLETE' },
        { step: 3, name: 'Zero Point Verification', desc: 'Confirm zero deviation < 2.0% FS (Logged: +0.42% FS)', duration: '5 min', status: 'COMPLETE' },
        { step: 4, name: 'Span Gas Injection', desc: 'Inject 80% FS certified calibration cylinder (400 mg/Nm³ SO₂ in N₂)', duration: '10 min', status: 'ACTIVE' },
        { step: 5, name: 'Span Point Verification', desc: 'Confirm span drift within ±2.0% of certified value', duration: '5 min', status: 'PENDING' },
        { step: 6, name: 'Mid-span Linearity Check', desc: '40% FS linearity point injection & verification (EN 15267-3)', duration: '8 min', status: 'PENDING' },
        { step: 7, name: 'QAL3 Certificate Generation', desc: 'Generate EN 14181 QAL3 cryptographic certificate', duration: '5 min', status: 'PENDING' },
      ]
    },
    'RT-07': {
      id: 'RT-07', name: 'Rotterdam Plant 7', type: 'SICK MCS100E Extractive Multi-Component Analyzer',
      channel: 'NOₓ (Nitrogen Oxides)', last: '2026-09-05', next: '2026-10-05', status: 'VALID', daysLeft: 9,
      certNo: 'QAL3-2026-0389', issuer: 'SIRA Certification Service (MCERTS)', inspector: 'J. van Dijk, Senior CEMS Specialist',
      zeroDrift: '+0.28% FS', spanDrift: '+0.85% FS', result: 'PASS (EN 14181 § 8.3)',
      driftMonths: ['Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep'],
      zeroHistory: [0.4, 0.6, 0.3, 0.5, 0.4, 0.35, 0.28],
      spanHistory: [0.9, 1.1, 0.7, 0.8, 1.0, 0.9, 0.85],
      routineProgress: 100,
      steps: [
        { step: 1, name: 'Pre-calibration Check', desc: 'Optics bench clean, heated line at 180°C', duration: '15 min', status: 'COMPLETE' },
        { step: 2, name: 'Zero Gas Injection', desc: 'Synthetic air 20.9% O₂, trace NO < 0.1 ppm', duration: '10 min', status: 'COMPLETE' },
        { step: 3, name: 'Zero Point Verification', desc: 'Deviation +0.28% FS (limit: ±2.0%)', duration: '5 min', status: 'COMPLETE' },
        { step: 4, name: 'Span Gas Injection', desc: '160 mg/Nm³ NO in N₂ certified span gas', duration: '10 min', status: 'COMPLETE' },
        { step: 5, name: 'Span Point Verification', desc: 'Span error +0.85% FS (limit: ±2.0%)', duration: '5 min', status: 'COMPLETE' },
        { step: 6, name: 'Mid-span Linearity Check', desc: 'Linearity deviation < 1.2% over 5 test points', duration: '8 min', status: 'COMPLETE' },
        { step: 7, name: 'QAL3 Certificate Generation', desc: 'TÜV/MCERTS cryptographic signing complete', duration: '5 min', status: 'COMPLETE' },
      ]
    },
    'MI-02': {
      id: 'MI-02', name: 'Milan-Sesto 02', type: 'Horiba ENDA-5000 Stack Gas Analysis System',
      channel: 'CO / NOₓ Dual Channel', last: '2026-08-15', next: '2026-09-15', status: 'OVERDUE', daysLeft: -11,
      certNo: 'QAL3-2026-0294', issuer: 'TÜV Rheinland Energy GmbH', inspector: 'M. Rossi, AMS Assessor',
      zeroDrift: '+2.45% FS', spanDrift: '-2.15% FS', result: 'FAIL - DRIFT EXCEEDED (Requires Re-Cal)',
      driftMonths: ['Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep'],
      zeroHistory: [0.7, 0.9, 1.2, 1.5, 1.8, 2.1, 2.45],
      spanHistory: [-1.1, -1.3, -1.5, -1.7, -1.9, -2.0, -2.15],
      routineProgress: 20,
      steps: [
        { step: 1, name: 'Pre-calibration Check', desc: 'Gas sampling probe filter clogged — purge initiated', duration: '15 min', status: 'ACTIVE' },
        { step: 2, name: 'Zero Gas Injection', desc: 'Zero gas response unstable (> 2.4% FS drift)', duration: '10 min', status: 'PENDING' },
        { step: 3, name: 'Zero Point Verification', desc: 'Requires optical realignment prior to lock', duration: '5 min', status: 'PENDING' },
        { step: 4, name: 'Span Gas Injection', desc: 'Span calibration pending probe replacement', duration: '10 min', status: 'PENDING' },
        { step: 5, name: 'Span Point Verification', desc: 'Awaiting span gas verification', duration: '5 min', status: 'PENDING' },
        { step: 6, name: 'Mid-span Linearity Check', desc: 'Scheduled post-repair', duration: '8 min', status: 'PENDING' },
        { step: 7, name: 'QAL3 Certificate Generation', desc: 'Locked pending valid calibration pass', duration: '5 min', status: 'PENDING' },
      ]
    },
    'WA-04': {
      id: 'WA-04', name: 'Warsaw Central 4', type: 'Emerson Rosemount OPM-4000 Transmittance/Gas',
      channel: 'PM10 & CO Channel', last: '2026-09-20', next: '2026-10-20', status: 'VALID', daysLeft: 24,
      certNo: 'QAL3-2026-0455', issuer: 'TÜV Rheinland Polska', inspector: 'P. Kowalski, Lead Metrologist',
      zeroDrift: '+0.15% FS', spanDrift: '+0.40% FS', result: 'PASS (EN 14181 § 8.3)',
      driftMonths: ['Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep'],
      zeroHistory: [0.3, 0.25, 0.2, 0.2, 0.18, 0.16, 0.15],
      spanHistory: [0.5, 0.45, 0.4, 0.42, 0.38, 0.41, 0.4],
      routineProgress: 100,
      steps: [
        { step: 1, name: 'Pre-calibration Check', desc: 'Transmittance beam alignment verified 99.8%', duration: '15 min', status: 'COMPLETE' },
        { step: 2, name: 'Zero Gas Injection', desc: 'Zero reflector optical clean verified', duration: '10 min', status: 'COMPLETE' },
        { step: 3, name: 'Zero Point Verification', desc: 'Zero drift +0.15% FS', duration: '5 min', status: 'COMPLETE' },
        { step: 4, name: 'Span Gas Injection', desc: 'Internal optical span filter insertion', duration: '10 min', status: 'COMPLETE' },
        { step: 5, name: 'Span Point Verification', desc: 'Span drift +0.40% FS', duration: '5 min', status: 'COMPLETE' },
        { step: 6, name: 'Mid-span Linearity Check', desc: '5-point neutral density filter check PASS', duration: '8 min', status: 'COMPLETE' },
        { step: 7, name: 'QAL3 Certificate Generation', desc: 'Official certificate dispatched to GIOŚ', duration: '5 min', status: 'COMPLETE' },
      ]
    },
    'MD-01': {
      id: 'MD-01', name: 'Madrid Vallecas 1', type: 'ABB AO2000-Ex Multi-Channel CEMS',
      channel: 'SO₂ & NOₓ Channel', last: '2026-09-18', next: '2026-10-18', status: 'VALID', daysLeft: 22,
      certNo: 'QAL3-2026-0442', issuer: 'Applus+ IDIADA Spain', inspector: 'C. Morales, Lead Inspector',
      zeroDrift: '+0.32% FS', spanDrift: '-0.70% FS', result: 'PASS (EN 14181 § 8.3)',
      driftMonths: ['Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep'],
      zeroHistory: [0.5, 0.4, 0.35, 0.3, 0.38, 0.34, 0.32],
      spanHistory: [-0.9, -0.8, -0.75, -0.82, -0.78, -0.74, -0.7],
      routineProgress: 100,
      steps: [
        { step: 1, name: 'Pre-calibration Check', desc: 'Condensate removal & cooler temp at 3.5°C', duration: '15 min', status: 'COMPLETE' },
        { step: 2, name: 'Zero Gas Injection', desc: 'High purity N₂ 5.0 injected at 1.2 bar', duration: '10 min', status: 'COMPLETE' },
        { step: 3, name: 'Zero Point Verification', desc: 'Zero deviation +0.32% FS', duration: '5 min', status: 'COMPLETE' },
        { step: 4, name: 'Span Gas Injection', desc: 'Span gas cylinder certified ISO 17025', duration: '10 min', status: 'COMPLETE' },
        { step: 5, name: 'Span Point Verification', desc: 'Span deviation -0.70% FS', duration: '5 min', status: 'COMPLETE' },
        { step: 6, name: 'Mid-span Linearity Check', desc: 'Multi-gas calibration curve validated', duration: '8 min', status: 'COMPLETE' },
        { step: 7, name: 'QAL3 Certificate Generation', desc: 'Stored in ClimateSphere ledger', duration: '5 min', status: 'COMPLETE' },
      ]
    }
  };

  const allUnitsList = [
    { id: 'DU-03', name: 'Duisburg Unit 3', type: 'ABB AO2000-Ex', channel: 'SO₂', last: '2026-09-10', next: '2026-10-10', status: 'VALID', daysLeft: 14, cert: 'QAL3-2026-0421' },
    { id: 'RT-07', name: 'Rotterdam Plant 7', type: 'Sick MCS100E', channel: 'NOₓ', last: '2026-09-05', next: '2026-10-05', status: 'VALID', daysLeft: 9, cert: 'QAL3-2026-0389' },
    { id: 'MI-02', name: 'Milan-Sesto 02', type: 'Horiba ENDA-5000', channel: 'CO/NOₓ', last: '2026-08-15', next: '2026-09-15', status: 'OVERDUE', daysLeft: -11, cert: 'QAL3-2026-0294' },
    { id: 'WA-04', name: 'Warsaw Central 4', type: 'Emerson Rosemount', channel: 'PM10', last: '2026-09-20', next: '2026-10-20', status: 'VALID', daysLeft: 24, cert: 'QAL3-2026-0455' },
    { id: 'MD-01', name: 'Madrid Vallecas 1', type: 'ABB AO2000-Ex', channel: 'SO₂/NOₓ', last: '2026-09-18', next: '2026-10-18', status: 'VALID', daysLeft: 22, cert: 'QAL3-2026-0442' },
  ];

  function getActiveProfile() {
    const activeFid = (window.ClimateSphere.state && window.ClimateSphere.state.activeFacilityId) || 'DU-03';
    return facilityProfiles[activeFid] || facilityProfiles['DU-03'];
  }

  function render() {
    const prof = getActiveProfile();
    const activeFid = prof.id;

    return `
      <div class="page-header">
        <div class="page-title-group">
          <span class="page-subtitle">CEMS · EN 14181 / EN 15267 · QAL3 METROLOGICAL QUALITY ASSURANCE</span>
          <h1 class="page-title">Calibration & Quality Assurance</h1>
          <p class="page-meta">
            Automated Measuring Systems (AMS) Zero/Span Drift Surveillance · 
            <strong style="color:var(--primary);">${prof.name} (${prof.id})</strong>
          </p>
        </div>
        <div class="page-actions">
          <button class="btn btn-primary btn-sm" id="btnOpenQal2Wizard" style="background:var(--primary);color:#0d1117;font-weight:700;">📐 15-Run QAL2 Lab Wizard</button>
          <button class="btn btn-secondary btn-sm" id="btnOpenAllCerts">📋 View All Certificates (${allUnitsList.length})</button>
          <button class="btn btn-primary btn-sm" id="btnOpenScheduleCal">+ Schedule Calibration</button>
        </div>
      </div>

      <!-- Status Overview -->
      <div class="grid-4" style="margin-bottom:var(--space-lg);">
        ${[
          { label: 'UNITS CALIBRATED (YTD)', value: '47', unit: '/ 52 certified', type: 'primary' },
          { label: 'CALIBRATIONS THIS MONTH', value: '12', unit: 'routines passed', type: 'primary' },
          { label: 'OVERDUE CALIBRATIONS', value: '1', unit: 'unit (MI-02)', type: 'red' },
          { label: 'ACTIVE UNIT STATUS', value: prof.status, unit: `${prof.daysLeft >= 0 ? prof.daysLeft + ' days remaining' : Math.abs(prof.daysLeft) + ' days overdue'}`, type: prof.status === 'VALID' ? 'primary' : 'red' },
        ].map(k => `
          <div class="metric-card ${k.type}">
            <span class="metric-label">${k.label}</span>
            <div style="display:flex;align-items:baseline;gap:4px;">
              <span class="metric-value">${k.value}</span>
              <span class="metric-unit">${k.unit}</span>
            </div>
          </div>
        `).join('')}
      </div>

      <div class="grid-12">

        <!-- Units Table -->
        <div class="card col-span-5">
          <div class="card-header">
            <div>
              <span class="card-title">CEMS Unit Calibration Registry</span>
              <div style="font-family:var(--font-mono);font-size:10px;color:var(--on-surface-variant);margin-top:2px;">
                Click any row to switch global active analyzer
              </div>
            </div>
            <span class="chip chip-neutral">EN 14181 QAL3</span>
          </div>
          <div style="overflow-x:auto;">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Unit</th>
                  <th>Analyzer & Channel</th>
                  <th>Last Cal</th>
                  <th class="right">Expires</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                ${allUnitsList.map(u => {
                  const isSelected = u.id === activeFid;
                  return `
                    <tr class="cal-unit-row" data-fid="${u.id}" style="cursor:pointer;background:${isSelected ? 'rgba(70,246,190,0.08)' : 'transparent'};border-left:${isSelected ? '3px solid var(--primary)' : '3px solid transparent'};transition:background 150ms;">
                      <td>
                        <div style="font-weight:700;color:${isSelected ? 'var(--primary)' : 'var(--on-surface)'};display:flex;align-items:center;gap:6px;">
                          ${u.id}
                          ${isSelected ? '<span class="pulse-dot" style="width:5px;height:5px;"></span>' : ''}
                        </div>
                        <div style="font-family:var(--font-mono);font-size:9px;color:var(--on-surface-variant);">${u.name}</div>
                      </td>
                      <td>
                        <div style="font-size:11px;color:var(--on-surface);">${u.type}</div>
                        <div style="font-family:var(--font-mono);font-size:9px;color:var(--primary);">${u.channel}</div>
                      </td>
                      <td class="mono">${u.last}</td>
                      <td class="mono right" style="color:${u.daysLeft < 0 ? 'var(--status-red)' : u.daysLeft < 14 ? 'var(--secondary)' : 'var(--on-surface)'};font-weight:600;">
                        ${u.daysLeft < 0 ? `+${Math.abs(u.daysLeft)}d overdue` : `${u.daysLeft}d left`}
                      </td>
                      <td>
                        <span class="chip chip-${u.status === 'VALID' ? 'green' : 'red'}">${u.status}</span>
                      </td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>
        </div>

        <!-- Active Calibration Routine -->
        <div class="card col-span-7">
          <div class="card-header">
            <div>
              <div style="display:flex;align-items:center;gap:8px;">
                <span class="card-title">Active Routine — ${prof.id} · ${prof.channel}</span>
                <span class="chip chip-${prof.status === 'VALID' ? 'green' : 'red'}">${prof.status}</span>
              </div>
              <div style="font-family:var(--font-mono);font-size:10px;color:var(--on-surface-variant);margin-top:2px;">
                ${prof.name} · ${prof.type}
              </div>
            </div>
            <div style="display:flex;align-items:center;gap:8px;">
              <span class="pulse-dot"></span>
              <span style="font-family:var(--font-mono);font-size:10px;color:var(--primary);font-weight:600;">
                ${prof.routineProgress}% COMPLETE
              </span>
            </div>
          </div>
          <div class="card-body">
            <div class="progress-bar" style="margin-bottom:16px;">
              <div class="progress-fill" style="width:${prof.routineProgress}%;background:${prof.routineProgress === 100 ? '#46f6be' : '#ffb957'};"></div>
            </div>
            <div class="timeline">
              ${prof.steps.map(s => `
                <div class="timeline-item">
                  <div class="timeline-dot ${s.status === 'COMPLETE' ? 'green' : s.status === 'ACTIVE' ? 'amber' : 'gray'}"></div>
                  <div class="timeline-content">
                    <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;">
                      <div>
                        <div class="timeline-title">Step ${s.step}: ${s.name}</div>
                        <div class="timeline-sub">${s.desc} · <span style="font-family:var(--font-mono);">${s.duration}</span></div>
                      </div>
                      <span class="chip chip-${s.status === 'COMPLETE' ? 'green' : s.status === 'ACTIVE' ? 'amber' : 'neutral'}">${s.status}</span>
                    </div>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        </div>

        <!-- Drift Chart -->
        <div class="card col-span-8">
          <div class="card-header">
            <div>
              <span class="card-title">Zero & Span Drift History — ${prof.id} (${prof.channel})</span>
              <div style="font-family:var(--font-mono);font-size:10px;color:var(--on-surface-variant);margin-top:2px;">
                DIN EN 14181 QAL3 Cusum Surveillance · Maximum Tolerable Limit: ±2.0% Full Scale (FS)
              </div>
            </div>
            <div style="display:flex;gap:12px;font-family:var(--font-mono);font-size:10px;">
              <span style="color:#46f6be;">● Zero Drift (FS)</span>
              <span style="color:#ffb957;">● Span Drift (FS)</span>
            </div>
          </div>
          <div class="card-body" style="padding:10px 14px 14px;">
            <div id="driftChart" style="height:160px;"></div>
          </div>
        </div>

        <!-- Certificate Panel -->
        <div class="card col-span-4">
          <div class="card-header">
            <span class="card-title">Latest Metrology Certificate</span>
            <span class="chip chip-${prof.status === 'VALID' ? 'green' : 'red'}">${prof.status}</span>
          </div>
          <div class="card-body">
            ${[
              { label: 'CERTIFICATE NO.', value: prof.certNo },
              { label: 'FACILITY & UNIT', value: `${prof.id} · ${prof.channel}` },
              { label: 'ACCREDITED BODY', value: prof.issuer },
              { label: 'LEAD AUDITOR', value: prof.inspector },
              { label: 'CALIBRATION DATE', value: prof.last },
              { label: 'EXPIRATION DATE', value: prof.next },
              { label: 'RECORDED ZERO DRIFT', value: prof.zeroDrift },
              { label: 'RECORDED SPAN DRIFT', value: prof.spanDrift },
              { label: 'AUDIT VERDICT', value: prof.result },
            ].map(r => `
              <div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid rgba(255,255,255,0.03);">
                <span class="label-mono">${r.label}</span>
                <span style="font-family:var(--font-mono);font-size:10px;font-weight:600;color:var(--on-surface);text-align:right;">${r.value}</span>
              </div>
            `).join('')}
            <button class="btn btn-secondary" id="btnDownloadQal3Cert" style="width:100%;margin-top:14px;justify-content:center;font-size:11px;">
              ⬇ Download Certified QAL3 PDF
            </button>
          </div>
        </div>

      </div>

      <!-- ════════ MODAL: ALL CERTIFICATES ════════ -->
      <div class="cmd-overlay" id="modalAllCertsOverlay">
        <div class="cmd-palette" style="max-width:760px;background:var(--surface-lowest);border:1px solid rgba(70,246,190,0.3);box-shadow:0 24px 64px rgba(0,0,0,0.8);">
          <div style="display:flex;align-items:center;justify-content:space-between;padding:16px 20px;border-bottom:1px solid var(--border-subtle);background:rgba(255,255,255,0.02);">
            <div>
              <div style="font-family:var(--font-mono);font-size:10px;color:var(--primary);letter-spacing:0.08em;font-weight:700;">DIN EN 14181 / EN 15267 METROLOGY LEDGER</div>
              <div style="font-size:14px;font-weight:700;color:var(--on-surface);margin-top:2px;">Certified AMS Calibration Ledger & Certificates</div>
            </div>
            <button class="close-btn" id="btnCloseAllCerts" style="font-size:18px;cursor:pointer;background:none;border:none;color:var(--on-surface-variant);">✕</button>
          </div>
          <div style="padding:14px 20px;max-height:420px;overflow-y:auto;">
            <table class="data-table" style="width:100%;">
              <thead>
                <tr>
                  <th>Cert #</th>
                  <th>Facility / Unit</th>
                  <th>Analyzer & Gas</th>
                  <th>Accreditation</th>
                  <th>Expires</th>
                  <th>Status</th>
                  <th class="right">Action</th>
                </tr>
              </thead>
              <tbody>
                ${allUnitsList.map(u => `
                  <tr>
                    <td class="mono" style="color:var(--primary);font-weight:600;">${u.cert}</td>
                    <td>
                      <div style="font-weight:600;">${u.id}</div>
                      <div style="font-size:10px;color:var(--on-surface-variant);">${u.name}</div>
                    </td>
                    <td>
                      <div style="font-size:11px;">${u.type}</div>
                      <span class="mono" style="font-size:9px;color:var(--secondary);">${u.channel}</span>
                    </td>
                    <td style="font-size:10px;color:var(--on-surface-dim);">TÜV / MCERTS</td>
                    <td class="mono">${u.next}</td>
                    <td><span class="chip chip-${u.status === 'VALID' ? 'green' : 'red'}">${u.status}</span></td>
                    <td class="right">
                      <button class="btn btn-secondary btn-sm btn-dl-single-cert" data-cert="${u.cert}" style="padding:3px 8px;font-size:10px;">
                        ⬇ PDF
                      </button>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
          <div style="padding:12px 20px;border-top:1px solid var(--border-subtle);display:flex;justify-content:space-between;align-items:center;background:rgba(0,0,0,0.2);">
            <span style="font-family:var(--font-mono);font-size:10px;color:var(--on-surface-variant);">5 Certified CEMS Units Displayed · Cryptographically Hashed</span>
            <button class="btn btn-primary btn-sm" id="btnDownloadAllBundle">📦 Export Complete Audit Pack (.ZIP/.PDF)</button>
          </div>
        </div>
      </div>

      <!-- ════════ MODAL: SCHEDULE CALIBRATION ════════ -->
      <div class="cmd-overlay" id="modalScheduleCalOverlay">
        <div class="cmd-palette" style="max-width:540px;background:var(--surface-lowest);border:1px solid rgba(70,246,190,0.3);box-shadow:0 24px 64px rgba(0,0,0,0.8);">
          <div style="display:flex;align-items:center;justify-content:space-between;padding:16px 20px;border-bottom:1px solid var(--border-subtle);background:rgba(255,255,255,0.02);">
            <div>
              <div style="font-family:var(--font-mono);font-size:10px;color:var(--primary);letter-spacing:0.08em;font-weight:700;">EN 14181 QAL3 CALIBRATION DISPATCH</div>
              <div style="font-size:14px;font-weight:700;color:var(--on-surface);margin-top:2px;">Schedule Metrology Calibration Routine</div>
            </div>
            <button class="close-btn" id="btnCloseScheduleCal" style="font-size:18px;cursor:pointer;background:none;border:none;color:var(--on-surface-variant);">✕</button>
          </div>
          <form id="formScheduleCal" style="padding:16px 20px;display:flex;flex-direction:column;gap:14px;">
            <div>
              <label style="display:block;font-family:var(--font-mono);font-size:10px;color:var(--on-surface-variant);margin-bottom:6px;">TARGET CEMS FACILITY & ANALYZER</label>
              <select id="schedFacilitySelect" style="width:100%;background:var(--surface-high);border:1px solid var(--border-subtle);color:var(--on-surface);padding:8px 10px;border-radius:4px;font-family:var(--font-mono);font-size:12px;outline:none;">
                ${allUnitsList.map(u => `
                  <option value="${u.id}" ${u.id === activeFid ? 'selected' : ''}>${u.id} — ${u.name} (${u.type} · ${u.channel})</option>
                `).join('')}
              </select>
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
              <div>
                <label style="display:block;font-family:var(--font-mono);font-size:10px;color:var(--on-surface-variant);margin-bottom:6px;">ROUTINE PROCEDURE</label>
                <select id="schedRoutineType" style="width:100%;background:var(--surface-high);border:1px solid var(--border-subtle);color:var(--on-surface);padding:8px 10px;border-radius:4px;font-size:11px;outline:none;">
                  <option value="qal3">EN 14181 QAL3 Weekly Zero/Span Drift</option>
                  <option value="linearity">EN 15267-3 5-Point Linearity Check</option>
                  <option value="ast">EN 14181 AST Annual Surveillance Test</option>
                  <option value="overhaul">Optical Bench Recalibration & Purge</option>
                </select>
              </div>
              <div>
                <label style="display:block;font-family:var(--font-mono);font-size:10px;color:var(--on-surface-variant);margin-bottom:6px;">SCHEDULED EXECUTION DATE</label>
                <input type="date" id="schedDate" value="${new Date().toISOString().substring(0, 10)}" style="width:100%;background:var(--surface-high);border:1px solid var(--border-subtle);color:var(--on-surface);padding:8px 10px;border-radius:4px;font-family:var(--font-mono);font-size:11px;outline:none;" />
              </div>
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
              <div>
                <label style="display:block;font-family:var(--font-mono);font-size:10px;color:var(--on-surface-variant);margin-bottom:6px;">LEAD CEMS METROLOGIST</label>
                <input type="text" id="schedTechnician" value="Dr. Elena Vance (Lead Metrologist)" style="width:100%;background:var(--surface-high);border:1px solid var(--border-subtle);color:var(--on-surface);padding:8px 10px;border-radius:4px;font-size:11px;outline:none;" />
              </div>
              <div>
                <label style="display:block;font-family:var(--font-mono);font-size:10px;color:var(--on-surface-variant);margin-bottom:6px;">CERTIFIED GAS CYLINDER LOT #</label>
                <input type="text" id="schedGasLot" value="BAM-CRM-2026-N2-SO2-094" style="width:100%;background:var(--surface-high);border:1px solid var(--border-subtle);color:var(--on-surface);padding:8px 10px;border-radius:4px;font-family:var(--font-mono);font-size:11px;outline:none;" />
              </div>
            </div>
            <div style="background:rgba(70,246,190,0.06);border:1px solid rgba(70,246,190,0.2);border-radius:4px;padding:10px;font-size:11px;color:var(--on-surface-variant);line-height:1.4;">
              ℹ️ Scheduling a calibration locks the CEMS stream during the zero/span test window and automatically notifies the plant SCADA / PLC to apply data substitution under IED Article 15(4).
            </div>
            <div style="display:flex;justify-content:flex-end;gap:10px;margin-top:4px;">
              <button type="button" class="btn btn-secondary" id="btnCancelSched">Cancel</button>
              <button type="submit" class="btn btn-primary">Confirm & Dispatch Work Order</button>
            </div>
          </form>
        </div>
      </div>

      <!-- ════════ MODAL: 15-RUN QAL2 LINEAR REGRESSION WIZARD ════════ -->
      <div class="cmd-overlay" id="modalQal2WizardOverlay">
        <div class="cmd-palette" style="max-width:920px;background:var(--surface-lowest);border:1px solid rgba(70,246,190,0.4);box-shadow:0 32px 80px rgba(0,0,0,0.85);max-height:92vh;display:flex;flex-direction:column;">
          <div style="display:flex;align-items:center;justify-content:space-between;padding:16px 20px;border-bottom:1px solid var(--border-subtle);background:rgba(255,255,255,0.02);">
            <div>
              <div style="font-family:var(--font-mono);font-size:10px;color:var(--primary);letter-spacing:0.08em;font-weight:700;">DIN EN 14181 § 6 / EN 15267 METROLOGY WIZARD</div>
              <div style="font-size:15px;font-weight:700;color:var(--on-surface);margin-top:2px;">15-Run Parallel Standard Reference Method (SRM) Calibration Wizard</div>
            </div>
            <button class="close-btn" id="btnCloseQal2Wizard" style="font-size:18px;cursor:pointer;background:none;border:none;color:var(--on-surface-variant);">✕</button>
          </div>

          <div style="padding:16px 20px;overflow-y:auto;flex:1;">
            <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;margin-bottom:14px;background:rgba(255,255,255,0.02);padding:10px 14px;border-radius:4px;border:1px solid var(--border-subtle);">
              <div style="display:flex;align-items:center;gap:12px;">
                <div>
                  <span class="label-mono">TARGET FACILITY:</span>
                  <span style="font-family:var(--font-mono);font-size:12px;font-weight:600;color:var(--primary);margin-left:6px;">${prof.name} (${prof.id})</span>
                </div>
                <div style="width:1px;height:18px;background:var(--border-subtle);"></div>
                <div>
                  <span class="label-mono">ANALYZER:</span>
                  <span style="font-size:12px;margin-left:6px;">${prof.type}</span>
              <div style="display:flex;align-items:center;gap:10px;">
                <button class="btn btn-primary btn-sm" id="btnModeQal2" style="font-size:11px;font-weight:700;">15-Run QAL2 Calibration</button>
                <button class="btn btn-secondary btn-sm" id="btnModeAst" style="font-size:11px;">5-Run AST Surveillance</button>
                <button class="btn btn-secondary btn-sm" id="btnLoadQal2Benchmark" style="font-size:11px;border-color:rgba(70,246,190,0.4);">
                  ⚡ Load Benchmark Data
                </button>
              </div>
            </div>

            <!-- 15-Run Paired Measurement Table -->
            <div style="border:1px solid var(--border-subtle);border-radius:4px;overflow:hidden;margin-bottom:16px;">
              <table class="data-table" style="width:100%;font-size:11px;">
                <thead>
                  <tr>
                    <th style="width:50px;">Run #</th>
                    <th>AMS Reading (x<sub>i</sub> mg/Nm³)</th>
                    <th>SRM Lab Reading (y<sub>i</sub> mg/Nm³)</th>
                    <th>Difference (D<sub>i</sub>)</th>
                    <th>Calibrated Function (ŷ<sub>i</sub>)</th>
                  </tr>
                </thead>
                <tbody id="qal2RunsTableBody">
                  <!-- Dynamically populated or rendered -->
                </tbody>
              </table>
            </div>

            <!-- Mathematical Results Cards -->
            <div class="grid-4" style="gap:10px;margin-bottom:12px;" id="qal2ResultsCards">
              <div class="metric-card primary" style="padding:10px;">
                <span class="metric-label">CALIBRATION FUNCTION</span>
                <div id="qal2FormulaDisplay" style="font-family:var(--font-mono);font-size:12px;font-weight:700;color:var(--primary);margin-top:4px;">y = a + b·x</div>
                <span style="font-size:9px;color:var(--on-surface-variant);" id="qal2SlopeIntercept">Slope b: -- · Intercept a: --</span>
              </div>
              <div class="metric-card" style="padding:10px;">
                <span class="metric-label">DIFF STD DEV (s<sub>D</sub>)</span>
                <div id="qal2SdDisplay" style="font-family:var(--font-mono);font-size:13px;font-weight:700;margin-top:4px;">-- mg/Nm³</div>
                <span style="font-size:9px;color:var(--on-surface-variant);">Standard dev. of differences</span>
              </div>
              <div class="metric-card" style="padding:10px;">
                <span class="metric-label">VARIABILITY CRITERION (σ₀·k<sub>v</sub>)</span>
                <div id="qal2CriterionDisplay" style="font-family:var(--font-mono);font-size:13px;font-weight:700;margin-top:4px;">-- mg/Nm³</div>
                <span style="font-size:9px;color:var(--on-surface-variant);">k<sub>v</sub> = 0.9885 (N=15)</span>
              </div>
              <div class="metric-card" style="padding:10px;" id="qal2StatusCard">
                <span class="metric-label">EN 14181 CERTIFICATION</span>
                <div id="qal2VerdictDisplay" style="font-family:var(--font-mono);font-size:12px;font-weight:700;margin-top:4px;">AWAITING CALCULATION</div>
                <span style="font-size:9px;color:var(--on-surface-variant);" id="qal2VerdictSub">Variability test s<sub>D</sub> ≤ σ₀·k<sub>v</sub></span>
              </div>
            </div>
          </div>

          <div style="padding:12px 20px;border-top:1px solid var(--border-subtle);display:flex;justify-content:space-between;align-items:center;background:rgba(0,0,0,0.2);">
            <button type="button" class="btn btn-secondary btn-sm" id="btnRecalcQal2">🔄 Recalculate Regression</button>
            <div style="display:flex;gap:10px;">
              <button type="button" class="btn btn-secondary btn-sm" id="btnCancelQal2">Close</button>
              <button type="button" class="btn btn-primary btn-sm" id="btnIssueQal2Cert">📜 Issue & Seal QAL2 Certificate</button>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  function init() {
    const prof = getActiveProfile();

    // 1. Render Drift Chart
    const driftEl = document.getElementById('driftChart');
    if (driftEl) {
      Charts.areaChart(driftEl, [
        { data: prof.zeroHistory, color: '#46f6be' },
        { data: prof.spanHistory.map(v => Math.abs(v)), color: '#ffb957' },
      ], { height: 160, labels: prof.driftMonths });
    }

    // 2. Download Certificate
    const btnCert = document.getElementById('btnDownloadQal3Cert');
    if (btnCert) {
      btnCert.addEventListener('click', () => {
        if (window.ClimateSphere && window.ClimateSphere.export) {
          window.ClimateSphere.export(`DIN_EN_14181_QAL3_Certificate_${prof.id}.pdf`);
        }
      });
    }

    // 3. Interactive Unit Table Rows
    document.querySelectorAll('.cal-unit-row').forEach(row => {
      row.addEventListener('click', () => {
        const fid = row.dataset.fid;
        if (fid && window.ClimateSphere && window.ClimateSphere.state) {
          window.ClimateSphere.state.setFacility(fid, true);
        }
      });
    });

    // 4. Modal: View All Certificates
    const modalAllCerts = document.getElementById('modalAllCertsOverlay');
    const btnOpenAll = document.getElementById('btnOpenAllCerts');
    const btnCloseAll = document.getElementById('btnCloseAllCerts');
    const btnBundle = document.getElementById('btnDownloadAllBundle');

    if (btnOpenAll && modalAllCerts) {
      btnOpenAll.addEventListener('click', () => modalAllCerts.classList.add('active'));
    }
    if (btnCloseAll && modalAllCerts) {
      btnCloseAll.addEventListener('click', () => modalAllCerts.classList.remove('active'));
    }
    if (btnBundle) {
      btnBundle.addEventListener('click', () => {
        if (window.ClimateSphere && window.ClimateSphere.export) {
          window.ClimateSphere.export('EN_14181_Full_Audit_Certificates_Pack.zip');
        }
      });
    }
    document.querySelectorAll('.btn-dl-single-cert').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const cert = btn.dataset.cert;
        if (window.ClimateSphere && window.ClimateSphere.export) {
          window.ClimateSphere.export(`${cert}_Certified_Calibration.pdf`);
        }
      });
    });

    // 5. Modal: Schedule Calibration
    const modalSched = document.getElementById('modalScheduleCalOverlay');
    const btnOpenSched = document.getElementById('btnOpenScheduleCal');
    const btnCloseSched = document.getElementById('btnCloseScheduleCal');
    const btnCancelSched = document.getElementById('btnCancelSched');
    const formSched = document.getElementById('formScheduleCal');

    if (btnOpenSched && modalSched) {
      btnOpenSched.addEventListener('click', () => modalSched.classList.add('active'));
    }
    if (btnCloseSched && modalSched) {
      btnCloseSched.addEventListener('click', () => modalSched.classList.remove('active'));
    }
    if (btnCancelSched && modalSched) {
      btnCancelSched.addEventListener('click', () => modalSched.classList.remove('active'));
    }
    if (formSched) {
      formSched.addEventListener('submit', (e) => {
        e.preventDefault();
        const targetFid = document.getElementById('schedFacilitySelect').value;
        const routineType = document.getElementById('schedRoutineType').value.toUpperCase();
        const targetDate = document.getElementById('schedDate').value;
        const tech = document.getElementById('schedTechnician').value;

        modalSched.classList.remove('active');
        if (window.ClimateSphere && window.ClimateSphere.showToast) {
          window.ClimateSphere.showToast(`✅ Work Order Dispatched: ${routineType} for ${targetFid} on ${targetDate} (${tech})`);
        }
        if (window.ClimateSphere && window.ClimateSphere.state) {
          window.ClimateSphere.state.setFacility(targetFid, true);
        }
      });
    }

    // 6. Modal: 15-Run QAL2 Linear Regression Wizard
    const modalQal2 = document.getElementById('modalQal2WizardOverlay');
    const btnOpenQal2 = document.getElementById('btnOpenQal2Wizard');
    const btnCloseQal2 = document.getElementById('btnCloseQal2Wizard');
    const btnCancelQal2 = document.getElementById('btnCancelQal2');
    const btnLoadBench = document.getElementById('btnLoadQal2Benchmark');
    const btnRecalc = document.getElementById('btnRecalcQal2');
    const btnIssueCert = document.getElementById('btnIssueQal2Cert');
    const tableBody = document.getElementById('qal2RunsTableBody');

    const BENCHMARK_RUNS = [
      [412.0, 418.5], [418.2, 424.0], [405.0, 411.2], [422.5, 429.0], [410.8, 417.0],
      [415.0, 421.4], [428.0, 434.5], [402.1, 408.0], [419.4, 425.8], [411.0, 417.2],
      [424.6, 431.0], [416.3, 422.5], [409.5, 415.8], [421.0, 427.2], [414.2, 420.0]
    ];

    let currentRuns = BENCHMARK_RUNS.map(([ams, srm]) => ({ ams, srm }));

    function renderRunsTable() {
      if (!tableBody) return;
      tableBody.innerHTML = currentRuns.map((r, i) => `
        <tr>
          <td class="mono" style="font-weight:700;color:var(--primary);text-align:center;">#${i + 1}</td>
          <td>
            <input type="number" step="0.1" class="qal2-ams-input" data-index="${i}" value="${r.ams}" style="width:100%;background:var(--surface-high);border:1px solid var(--border-subtle);color:var(--on-surface);padding:4px 8px;border-radius:3px;font-family:var(--font-mono);font-size:11px;" />
          </td>
          <td>
            <input type="number" step="0.1" class="qal2-srm-input" data-index="${i}" value="${r.srm}" style="width:100%;background:var(--surface-high);border:1px solid var(--border-subtle);color:var(--on-surface);padding:4px 8px;border-radius:3px;font-family:var(--font-mono);font-size:11px;" />
          </td>
          <td class="mono" id="qal2-diff-${i}" style="color:var(--on-surface-variant);font-size:11px;">--</td>
          <td class="mono" id="qal2-yhat-${i}" style="color:var(--secondary);font-size:11px;font-weight:600;">--</td>
        </tr>
      `).join('');

      tableBody.querySelectorAll('.qal2-ams-input').forEach(input => {
        input.addEventListener('input', e => {
          const idx = parseInt(e.target.dataset.index, 10);
          currentRuns[idx].ams = parseFloat(e.target.value) || 0;
          calculateRegression();
        });
      });

      tableBody.querySelectorAll('.qal2-srm-input').forEach(input => {
        input.addEventListener('input', e => {
          const idx = parseInt(e.target.dataset.index, 10);
          currentRuns[idx].srm = parseFloat(e.target.value) || 0;
          calculateRegression();
        });
      });
    }

    function calculateRegression() {
      const n = currentRuns.length;
      if (n < 5) return;

      const meanAms = currentRuns.reduce((a, b) => a + b.ams, 0) / n;
      const meanSrm = currentRuns.reduce((a, b) => a + b.srm, 0) / n;

      const num = currentRuns.reduce((acc, r) => acc + (r.ams - meanAms) * (r.srm - meanSrm), 0);
      const den = currentRuns.reduce((acc, r) => acc + Math.pow(r.ams - meanAms, 2), 0);
      const slope = den === 0 ? 1.0 : num / den;
      const intercept = meanSrm - slope * meanAms;

      currentRuns.forEach((r, i) => {
        const yHat = intercept + slope * r.ams;
        const diff = r.srm - yHat;
        const diffEl = document.getElementById(`qal2-diff-${i}`);
        const yhatEl = document.getElementById(`qal2-yhat-${i}`);
        if (diffEl) diffEl.textContent = (diff >= 0 ? '+' : '') + diff.toFixed(2);
        if (yhatEl) yhatEl.textContent = yHat.toFixed(1);
      });

      const diffs = currentRuns.map(r => r.srm - (intercept + slope * r.ams));
      const meanDiff = diffs.reduce((a, b) => a + b, 0) / n;
      const sdDiff = Math.sqrt(diffs.reduce((acc, d) => acc + Math.pow(d - meanDiff, 2), 0) / (n - 1));

      const elv = 500.0;
      const kv = 0.9885;
      const sigma0 = elv * (0.20 / 1.96);
      const isAst = wizardMode === 'AST';
      const criterion = (isAst ? 1.15 : 1.0) * sigma0 * kv;
      const pass = sdDiff <= criterion;

      const formulaDisplay = document.getElementById('qal2FormulaDisplay');
      const slopeInterceptDisplay = document.getElementById('qal2SlopeIntercept');
      const sdDisplay = document.getElementById('qal2SdDisplay');
      const critDisplay = document.getElementById('qal2CriterionDisplay');
      const verdictDisplay = document.getElementById('qal2VerdictDisplay');
      const verdictSub = document.getElementById('qal2VerdictSub');
      const statusCard = document.getElementById('qal2StatusCard');

      if (formulaDisplay) formulaDisplay.textContent = `ŷ = ${intercept >= 0 ? '+' : ''}${intercept.toFixed(2)} + ${slope.toFixed(4)}·x`;
      if (slopeInterceptDisplay) slopeInterceptDisplay.textContent = `Slope b: ${slope.toFixed(4)} · Intercept a: ${intercept.toFixed(2)}`;
      if (sdDisplay) sdDisplay.textContent = `${sdDiff.toFixed(3)} mg/Nm³`;
      if (critDisplay) critDisplay.textContent = `≤ ${criterion.toFixed(2)} mg/Nm³`;

      if (verdictDisplay) {
        verdictDisplay.textContent = pass ? 'PASS (EN 14181 § 6 CERTIFIED)' : 'FAIL (VARIABILITY EXCEEDED)';
        verdictDisplay.style.color = pass ? '#46f6be' : '#ff6b6b';
      }
      if (verdictSub) {
        verdictSub.textContent = pass ? `sD (${sdDiff.toFixed(2)}) ≤ Criterion (${criterion.toFixed(1)})` : `sD exceeds allowable threshold`;
      }
      if (statusCard) {
        statusCard.className = `metric-card ${pass ? 'primary' : 'red'}`;
      }
    }

    if (btnOpenQal2 && modalQal2) {
      btnOpenQal2.addEventListener('click', () => {
        renderRunsTable();
        calculateRegression();
        modalQal2.classList.add('active');
      });
    }
    if (btnCloseQal2 && modalQal2) {
      btnCloseQal2.addEventListener('click', () => modalQal2.classList.remove('active'));
    }
    if (btnCancelQal2 && modalQal2) {
      btnCancelQal2.addEventListener('click', () => modalQal2.classList.remove('active'));
    }
    const btnModeQal2 = document.getElementById('btnModeQal2');
    const btnModeAst = document.getElementById('btnModeAst');
    let wizardMode = 'QAL2';

    if (btnModeQal2 && btnModeAst) {
      btnModeQal2.addEventListener('click', () => {
        wizardMode = 'QAL2';
        btnModeQal2.className = 'btn btn-primary btn-sm';
        btnModeAst.className = 'btn btn-secondary btn-sm';
        currentRuns = BENCHMARK_RUNS.map(([ams, srm]) => ({ ams, srm }));
        renderRunsTable();
        calculateRegression();
        if (window.ClimateSphere?.showToast) {
          window.ClimateSphere.showToast('Switched to DIN EN 14181 QAL2 15-Run Calibration Mode');
        }
      });

      btnModeAst.addEventListener('click', () => {
        wizardMode = 'AST';
        btnModeAst.className = 'btn btn-primary btn-sm';
        btnModeQal2.className = 'btn btn-secondary btn-sm';
        currentRuns = BENCHMARK_RUNS.slice(0, 5).map(([ams, srm]) => ({ ams, srm }));
        renderRunsTable();
        calculateRegression();
        if (window.ClimateSphere?.showToast) {
          window.ClimateSphere.showToast('Switched to DIN EN 14181 Clause 9 AST (5-Run Surveillance) Mode');
        }
      });
    }

    if (btnLoadBench) {
      btnLoadBench.addEventListener('click', () => {
        currentRuns = (wizardMode === 'AST' ? BENCHMARK_RUNS.slice(0, 5) : BENCHMARK_RUNS).map(([ams, srm]) => ({ ams, srm }));
        renderRunsTable();
        calculateRegression();
        if (window.ClimateSphere && window.ClimateSphere.showToast) {
          window.ClimateSphere.showToast(`✓ Loaded TÜV SÜD ${wizardMode === 'AST' ? '5-Run AST' : '15-Run QAL2'} Benchmark Data`);
        }
      });
    }
    if (btnRecalc) {
      btnRecalc.addEventListener('click', () => calculateRegression());
    }
    if (btnIssueCert) {
      btnIssueCert.addEventListener('click', () => {
        modalQal2.classList.remove('active');
        const certName = wizardMode === 'AST'
          ? `DIN_EN_14181_AST_Surveillance_Certificate_${prof.id}.pdf`
          : `DIN_EN_14181_QAL2_Certificate_${prof.id}.pdf`;
        if (window.ClimateSphere && window.ClimateSphere.showToast) {
          window.ClimateSphere.showToast(`📜 ${wizardMode} Certificate Issued & Cryptographically Sealed for ${prof.id}`);
        }
        if (window.ClimateSphere && window.ClimateSphere.export) {
          window.ClimateSphere.export(certName);
        }
      });
    }

    // 7. Listen to global state changes to re-render if active page
    const onFacilityChanged = () => {
      const pageWrapper = document.getElementById('pageWrapper');
      if (pageWrapper && document.getElementById('driftChart')) {
        pageWrapper.innerHTML = Calibration.render();
        Calibration.init();
      }
    };
    window.addEventListener('climatesphere:facilityChanged', onFacilityChanged);

    return () => {
      window.removeEventListener('climatesphere:facilityChanged', onFacilityChanged);
    };
  }

  return { render, init };
})();

window.Calibration = Calibration;
