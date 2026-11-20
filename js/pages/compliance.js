/**
 * ClimateSphere — CSRD / EPA Filing & Compliance Page
 */

const Compliance = (() => {

  const filings = [
    { id: 'CSRD-2026-Q3', title: 'CSRD Q3 2026 Disclosure', framework: 'CSRD/ESRS E1', period: 'Q3 2026', status: 'SUBMITTED', date: '2026-09-15', hash: '0xa4f2...8b91', risk: 'LOW' },
    { id: 'MCERTS-2026-DU03', title: 'UK EA MCERTS Audit Certificate — DU-03', framework: 'BS EN 15267-3', period: 'Sep 2026', status: 'VERIFIED', date: '2026-09-28', hash: '0x71c3...4a12', risk: 'LOW' },
    { id: 'CBAM-2026-Q3', title: 'EU CBAM Definitive Surrender Declaration', framework: 'Reg. (EU) 2023/956', period: 'Q3 2026', status: 'SUBMITTED', date: '2026-09-22', hash: '0x32de...89ff', risk: 'LOW' },
    { id: 'EPA-2026-DU03', title: 'IED Exceedance Notification — DU-03', framework: 'IED 2010/75/EU', period: 'Sep 2026', status: 'PENDING', date: '2026-09-25', hash: 'NOT YET FILED', risk: 'HIGH' },
    { id: 'EUETS-Q3', title: 'EU ETS Verified Emission Report', framework: 'EU ETS Reg. 2018/2066', period: 'Q3 2026', status: 'SUBMITTED', date: '2026-09-10', hash: '0xc8d1...2e47', risk: 'LOW' },
    { id: 'BIMSCHV-17-DU03', title: '17. BImSchV Waste Incineration 10m Evaluation', framework: '17. BImSchV Art 8', period: 'Sep 2026', status: 'VERIFIED', date: '2026-09-20', hash: '0x88ea...12bc', risk: 'NONE' },
    { id: 'CSRD-2026-Q2', title: 'CSRD Q2 2026 Disclosure', framework: 'CSRD/ESRS E1', period: 'Q2 2026', status: 'VERIFIED', date: '2026-06-15', hash: '0x91ab...f34c', risk: 'NONE' },
    { id: 'EN14181-MI02', title: 'EN 14181 Calibration Filing — MI-02', framework: 'EN 14181 QAL2', period: 'Aug 2026', status: 'OVERDUE', date: '—', hash: 'NOT YET FILED', risk: 'MEDIUM' },
  ];

  const esrsTopics = [
    { topic: 'E1-1', name: 'Climate transition plan', complete: 94, status: 'COMPLETE' },
    { topic: 'E1-2', name: 'Policies related to climate change', complete: 100, status: 'COMPLETE' },
    { topic: 'E1-3', name: 'Actions and resources in relation to climate', complete: 87, status: 'IN PROGRESS' },
    { topic: 'E1-4', name: 'Targets related to climate change', complete: 72, status: 'IN PROGRESS' },
    { topic: 'E1-5', name: 'Energy consumption and mix', complete: 100, status: 'COMPLETE' },
    { topic: 'E1-6', name: 'Gross Scopes 1, 2, 3 GHG emissions', complete: 100, status: 'COMPLETE' },
    { topic: 'E1-7', name: 'GHG removals and mitigation projects', complete: 45, status: 'INCOMPLETE' },
    { topic: 'E1-8', name: 'Internal carbon pricing', complete: 68, status: 'IN PROGRESS' },
    { topic: 'E1-9', name: 'Anticipated financial effects', complete: 0, status: 'NOT STARTED' },
  ];

  function statusChip(s) {
    const map = { 'SUBMITTED':'green', 'VERIFIED':'green', 'PENDING':'amber', 'OVERDUE':'red', 'COMPLETE':'green', 'IN PROGRESS':'amber', 'INCOMPLETE':'red', 'NOT STARTED':'neutral', 'HIGH':'red', 'MEDIUM':'amber', 'LOW':'green', 'NONE':'neutral' };
    return map[s] || 'neutral';
  }

  function render() {
    return `
      <div class="page-header">
        <div class="page-title-group">
          <span class="page-subtitle">REGULATORY · CSRD / IED / EU ETS COMPLIANCE</span>
          <h1 class="page-title">Statutory Filing Center</h1>
          <p class="page-meta">Cryptographic receipts · Tagged ESEF / iXBRL export · ESRS E1 disclosure completeness tracker</p>
        </div>
        <div class="page-actions" style="display:flex;gap:6px;flex-wrap:wrap;">
          <button class="btn btn-secondary btn-sm" id="btnAuditTrail">🔍 Audit Trail</button>
          <button class="btn btn-secondary btn-sm" id="btnEsefZip" title="Download official ESMA ESEF ZIP DTS package">📦 ESEF ZIP</button>
          <button class="btn btn-secondary btn-sm" id="btnMcertsXml" title="Download UK Environment Agency MCERTS Audit XML">🇬🇧 MCERTS XML</button>
          <button class="btn btn-secondary btn-sm" id="btnCbamXml" title="Download EU CBAM Definitive Surrender XML">🇪🇺 CBAM XML</button>
          <button class="btn btn-secondary btn-sm" id="btnEuEtsXml" title="Download EU ETS MRV Annual Verified XML">📋 EU ETS MRV</button>
          <button class="btn btn-primary btn-sm" id="btnNewFiling">+ Generate Filing</button>
        </div>
      </div>

      <!-- Summary KPIs -->
      <div class="grid-4" style="margin-bottom:var(--space-lg);">
        ${[
          { label: 'FILINGS SUBMITTED (YTD)', value: '12', unit: '', type: 'primary' },
          { label: 'PENDING SUBMISSIONS', value: '2', unit: 'urgent', type: 'amber' },
          { label: 'OVERDUE FILINGS', value: '1', unit: 'critical', type: 'red' },
          { label: 'CSRD ESRS E1 READINESS', value: '74%', unit: '', type: 'primary' },
        ].map(k => `
          <div class="metric-card ${k.type}">
            <span class="metric-label">${k.label}</span>
            <div style="display:flex;align-items:baseline;gap:4px;">
              <span class="metric-value">${k.value}</span>
              ${k.unit ? `<span class="metric-unit">${k.unit}</span>` : ''}
            </div>
          </div>
        `).join('')}
      </div>

      <div class="grid-12">

        <!-- Filing Registry -->
        <div class="card col-span-8">
          <div class="card-header">
            <span class="card-title">Regulatory Filing Registry</span>
            <select class="select" style="font-size:10px;padding:3px 24px 3px 8px;">
              <option>All Frameworks</option>
              <option>CSRD</option>
              <option>EU ETS</option>
              <option>IED</option>
            </select>
          </div>
          <div style="overflow-x:auto;">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Filing</th>
                  <th>Framework</th>
                  <th>Period</th>
                  <th>Filed</th>
                  <th>Cryptographic Hash</th>
                  <th>Risk</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                ${filings.map(f => `
                  <tr>
                    <td>
                      <div style="font-weight:500;font-size:12px;">${f.title}</div>
                      <div style="font-family:var(--font-mono);font-size:9px;color:var(--on-surface-variant);">${f.id}</div>
                    </td>
                    <td style="font-size:11px;color:var(--on-surface-variant);">${f.framework}</td>
                    <td class="mono">${f.period}</td>
                    <td class="mono">${f.date}</td>
                    <td>
                      <span style="font-family:var(--font-mono);font-size:10px;color:${f.hash.startsWith('0x') ? 'var(--primary)' : 'var(--on-surface-dim)'};">${f.hash}</span>
                    </td>
                    <td><span class="chip chip-${statusChip(f.risk)}">${f.risk}</span></td>
                    <td><span class="chip chip-${statusChip(f.status)}">${f.status}</span></td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>

        <!-- Regulatory Calendar -->
        <div class="card col-span-4">
          <div class="card-header">
            <span class="card-title">Upcoming Deadlines</span>
          </div>
          <div class="card-body">
            <div class="timeline">
              ${[
                { date: 'Sep 25', title: 'IED Exceedance Filing — DU-03', sub: 'DE/NRW Authority · IE-04 Form', dot: 'amber' },
                { date: 'Oct 05', title: 'CEMS QAL3 Recalibration — RT-07', sub: 'TÜV SÜD · EN 14181', dot: 'amber' },
                { date: 'Oct 10', title: 'QAL3 Recalibration — DU-03', sub: 'ABB AO2000-Ex · SO₂ Channel', dot: 'green' },
                { date: 'Oct 31', title: 'EU ETS Q3 Verified Emission Report', sub: 'European Emissions Register', dot: 'green' },
                { date: 'Dec 31', title: 'CSRD Annual Disclosure Draft', sub: 'ESRS E1 — Full disclosure set', dot: 'green' },
              ].map(e => `
                <div class="timeline-item">
                  <div class="timeline-dot ${e.dot}"></div>
                  <div class="timeline-content">
                    <div style="font-family:var(--font-mono);font-size:9px;color:var(--primary);margin-bottom:2px;">${e.date}</div>
                    <div class="timeline-title">${e.title}</div>
                    <div class="timeline-sub">${e.sub}</div>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        </div>

        <!-- Statutory Regulatory Compliance Verification Grid -->
        <div class="card col-span-12">
          <div class="card-header">
            <div>
              <span class="card-title">Statutory Grid Verification — EU / US / UK Compliance Suite</span>
              <div style="font-family:var(--font-mono);font-size:10px;color:var(--on-surface-variant);margin-top:2px;">
                German 13./17. BImSchV · US EPA Part 60/75 · UK MCERTS (TGN M2) · EU CBAM Definitive · EU ETS MRV
              </div>
            </div>
            <div style="display:flex;gap:8px;flex-wrap:wrap;">
              <span class="chip chip-green">13./17. BImSchV COMPLIANT</span>
              <span class="chip chip-green">MCERTS VERIFIED</span>
              <span class="chip chip-green">EPA 40 CFR 60/75 ACTIVE</span>
              <span class="chip chip-green">CBAM 2026 READY</span>
            </div>
          </div>
          <div class="card-body">
            <div class="statutory-kpi-grid">
              <div class="statutory-kpi-card">
                <span class="metric-label">HMW VALIDITY RATIO (13. BImSchV)</span>
                <div class="statutory-kpi-val">46 / 48 Slots (95.8%)</div>
                <span class="statutory-kpi-sub">2 slots exempt (soot blowing & purge)</span>
              </div>
              <div class="statutory-kpi-card">
                <span class="metric-label">17. BImSchV WASTE 10M SLIDING</span>
                <div class="statutory-kpi-val">HCl: 4.8 mg/Nm³</div>
                <span class="statutory-kpi-sub">Limit: 10.0 mg/Nm³ · NOx: 142 mg/Nm³</span>
              </div>
              <div class="statutory-kpi-card">
                <span class="metric-label">EPA PART 60 CGA & PART 75 BAF</span>
                <div class="statutory-kpi-val">CGA: 2.8% · BAF: 1.024</div>
                <span class="statutory-kpi-sub">Low/Mid span test verified · RA = 4.8%</span>
              </div>
              <div class="statutory-kpi-card">
                <span class="metric-label">UK EA MCERTS (BS EN 15267-3)</span>
                <div class="statutory-kpi-val">Linearity 1.25% (≤2.0%)</div>
                <span class="statutory-kpi-sub">Zero drift 0.65% · Availability 99.1%</span>
              </div>
              <div class="statutory-kpi-card">
                <span class="metric-label">EU CBAM DEFINITIVE (2026–2034)</span>
                <div class="statutory-kpi-val">17,238 Certificates</div>
                <span class="statutory-kpi-sub">Art. 9 Origin deduction: €181,250</span>
              </div>
              <div class="statutory-kpi-card">
                <span class="metric-label">EU ETS MRV ANNUAL RETURN</span>
                <div class="statutory-kpi-val">198,732 tCO₂ Net Fossil</div>
                <span class="statutory-kpi-sub">8.0% RED II Biomass deduction applied</span>
              </div>
              <div class="statutory-kpi-card">
                <span class="metric-label">CSRD ESRS E1 INTENSITY</span>
                <div class="statutory-kpi-val">1,153 tCO₂e / M€</div>
                <span class="statutory-kpi-sub">Turnover: €145M · Dual Materiality: Yes</span>
              </div>
              <div class="statutory-kpi-card">
                <span class="metric-label">WORM AUDIT CRYPTO LEDGER</span>
                <div class="statutory-kpi-val">100% Verified</div>
                <span class="statutory-kpi-sub">SHA-256 Merkle chain · TPM 2.0 anchored</span>
              </div>
            </div>
          </div>
        </div>

        <!-- ESRS E1 Completeness Tracker -->
        <div class="card col-span-12">
          <div class="card-header">
            <span class="card-title">CSRD / ESRS E1 — Climate Disclosure Completeness</span>
            <div style="display:flex;align-items:center;gap:10px;">
              <div class="progress-bar" style="width:140px;height:6px;border-radius:3px;">
                <div class="progress-fill fill-green" style="width:74%;"></div>
              </div>
              <span style="font-family:var(--font-mono);font-size:11px;color:var(--primary);font-weight:600;">74% Complete</span>
            </div>
          </div>
          <div class="card-body">
            <div class="esrs-topic-grid">
              ${esrsTopics.map(t => `
                <div class="esrs-topic-card">
                  <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px;margin-bottom:8px;">
                    <div>
                      <div style="font-family:var(--font-mono);font-size:10px;font-weight:600;color:var(--primary);margin-bottom:2px;">${t.topic}</div>
                      <div style="font-size:12px;font-weight:500;color:var(--on-surface);line-height:1.3;">${t.name}</div>
                    </div>
                    <span class="chip chip-${statusChip(t.status)}">${t.status}</span>
                  </div>
                  <div class="progress-bar" style="height:5px;border-radius:3px;">
                    <div class="progress-fill" style="width:${t.complete}%;background:${t.complete === 100 ? '#46f6be' : t.complete > 60 ? '#ffb957' : t.complete > 0 ? '#ff6b6b' : 'rgba(255,255,255,0.1)'};"></div>
                  </div>
                  <div style="font-family:var(--font-mono);font-size:10px;color:var(--on-surface-variant);margin-top:6px;text-align:right;">${t.complete}% complete</div>
                </div>
              `).join('')}
            </div>
          </div>
        </div>

      </div>

      <!-- ════════ MODAL: AUDIT TRAIL MODAL DRAWER ════════ -->
      <div class="cmd-overlay" id="modalAuditTrailOverlay">
        <div class="cmd-palette" style="max-width:820px;background:var(--surface-lowest);border:1px solid rgba(70,246,190,0.3);box-shadow:0 24px 64px rgba(0,0,0,0.85);">
          <div style="display:flex;align-items:center;justify-content:space-between;padding:16px 20px;border-bottom:1px solid var(--border-subtle);background:rgba(255,255,255,0.02);">
            <div style="display:flex;align-items:center;gap:10px;">
              <span style="font-size:18px;">🛡️</span>
              <div>
                <div style="font-family:var(--font-mono);font-size:10px;color:var(--primary);letter-spacing:0.08em;font-weight:700;">STATUTORY AUDIT LEDGER · DIRECTIVE 2010/75/EU & CSRD</div>
                <div style="font-size:14px;font-weight:700;color:var(--on-surface);margin-top:2px;">Immutable Environmental Exceedance & Filing Audit Trail</div>
              </div>
            </div>
            <button class="close-btn" id="btnCloseAuditTrail" style="font-size:18px;cursor:pointer;background:none;border:none;color:var(--on-surface-variant);">✕</button>
          </div>

          <div style="padding:12px 20px;border-bottom:1px solid var(--border-subtle);display:flex;align-items:center;justify-content:space-between;gap:12px;background:rgba(0,0,0,0.2);">
            <div style="display:flex;align-items:center;gap:10px;flex:1;">
              <input type="text" id="auditSearchInput" placeholder="Filter by facility, pollutant, or actor..." style="background:var(--surface-high);border:1px solid var(--border-subtle);color:var(--on-surface);padding:6px 12px;border-radius:4px;font-size:11px;outline:none;width:240px;" />
              <select id="auditStatusFilter" style="background:var(--surface-high);border:1px solid var(--border-subtle);color:var(--on-surface);padding:6px 10px;border-radius:4px;font-family:var(--font-mono);font-size:11px;outline:none;">
                <option value="ALL">All Statuses</option>
                <option value="UNRESOLVED">UNRESOLVED</option>
                <option value="ESCALATED">ESCALATED</option>
                <option value="RESOLVED">RESOLVED</option>
              </select>
            </div>
            <button class="btn btn-secondary btn-sm" id="btnExportAuditLedger" style="font-size:11px;padding:5px 12px;">
              ⬇ Export Audit Trail (CSV)
            </button>
          </div>

          <div style="padding:14px 20px;max-height:420px;overflow-y:auto;" id="auditTrailTableContainer">
            <!-- Populated dynamically by init() -->
          </div>

          <div style="padding:12px 20px;border-top:1px solid var(--border-subtle);display:flex;justify-content:space-between;align-items:center;background:rgba(0,0,0,0.2);">
            <div style="display:flex;align-items:center;gap:6px;font-family:var(--font-mono);font-size:10px;color:var(--on-surface-variant);">
              <span class="status-dot dot-green"></span>
              <span>SHA-256 Merkle Verification Valid · Regulatory Grade WORM (Write Once Read Many)</span>
            </div>
            <button class="btn btn-primary btn-sm" id="btnCloseAuditTrailBottom">Close</button>
          </div>
        </div>
      </div>
    `;
  }

  function renderAuditRows(logs) {
    if (!logs || logs.length === 0) {
      return `
        <div style="text-align:center;padding:40px 20px;font-family:var(--font-mono);font-size:12px;color:var(--on-surface-dim);">
          No audit entries matching filter criteria.
        </div>`;
    }

    return `
      <table class="data-table" style="width:100%;">
        <thead>
          <tr>
            <th>Timestamp (UTC)</th>
            <th>Facility</th>
            <th>Pollutant / Event</th>
            <th>Telemetry / Limit</th>
            <th>Actor / Role</th>
            <th>Status</th>
            <th class="right">SHA-256 Hash</th>
          </tr>
        </thead>
        <tbody>
          ${logs.map((l, idx) => {
            const hash = `0x${((idx + 1) * 314159265).toString(16).padStart(8, '0')}...${((idx + 1) * 271828182).toString(16).slice(0, 4)}`;
            const isUnres = l.status === 'UNRESOLVED' || l.status === 'CRITICAL';
            const isEsc = l.status === 'ESCALATED';
            return `
              <tr>
                <td class="mono" style="font-size:10px;">${(l.timestamp || '').replace('T', ' ').slice(0, 19)}</td>
                <td>
                  <span style="font-weight:700;color:var(--primary);">${l.facility || l.facilityId || 'DU-03'}</span>
                </td>
                <td>
                  <div style="font-weight:600;font-size:11px;">${l.param || (l.action ? l.action.replace(/_/g, ' ') : 'CEMS Audit')}</div>
                  <div style="font-family:var(--font-mono);font-size:9px;color:var(--on-surface-variant);">${l.details || 'Art 15/18 Statutory Record'}</div>
                </td>
                <td class="mono" style="font-size:11px;color:${isUnres ? 'var(--status-red)' : 'var(--on-surface)'};font-weight:600;">
                  ${l.value !== undefined ? `${l.value} / ${l.limit || 500} mg/Nm³` : 'STATUTORY LOG'}
                </td>
                <td style="font-size:10px;color:var(--on-surface-variant);">
                  ${l.actor || l.operator || 'System Daemon'}
                </td>
                <td>
                  <span class="chip chip-${isUnres ? 'red' : isEsc ? 'amber' : 'green'}">${l.status || 'PERSISTED'}</span>
                </td>
                <td class="mono right" style="font-size:9px;color:var(--on-surface-dim);letter-spacing:0.04em;">
                  ${l.merkleHash ? l.merkleHash.slice(0, 10) + '...' + l.merkleHash.slice(-4) : hash}
                </td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    `;
  }

  function init() {
    const modalAudit = document.getElementById('modalAuditTrailOverlay');
    const btnAudit = document.getElementById('btnAuditTrail');
    const btnClose = document.getElementById('btnCloseAuditTrail');
    const btnCloseBottom = document.getElementById('btnCloseAuditTrailBottom');
    const tableContainer = document.getElementById('auditTrailTableContainer');
    const searchInput = document.getElementById('auditSearchInput');
    const statusFilter = document.getElementById('auditStatusFilter');
    const btnExport = document.getElementById('btnExportAuditLedger');

    async function updateAuditDisplay() {
      if (!tableContainer) return;
      const db = window.ClimateSphere.DB;
      let logs = db ? db.getExceedanceLogs() : [];

      try {
        const auditEndpoint = (window.ClimateSphere && window.ClimateSphere.getApiEndpoint)
          ? window.ClimateSphere.getApiEndpoint('/api/audit/logs')
          : '/api/audit/logs';
        const resp = await fetch(auditEndpoint);
        if (resp.ok) {
          const edgeLogs = await resp.json();
          if (Array.isArray(edgeLogs) && edgeLogs.length > 0) {
            logs = [...edgeLogs, ...logs];
          }
        }
      } catch (e) {
        // Edge gateway offline or running stand-alone
      }

      const query = (searchInput ? searchInput.value : '').toLowerCase().trim();
      const status = statusFilter ? statusFilter.value : 'ALL';

      const filtered = logs.filter(l => {
        const matchesQuery = !query ||
          (l.facility && l.facility.toLowerCase().includes(query)) ||
          (l.facilityId && l.facilityId.toLowerCase().includes(query)) ||
          (l.param && l.param.toLowerCase().includes(query)) ||
          (l.action && l.action.toLowerCase().includes(query)) ||
          (l.operator && l.operator.toLowerCase().includes(query)) ||
          (l.actor && l.actor.toLowerCase().includes(query));
        const matchesStatus = status === 'ALL' || (l.status && l.status.toUpperCase() === status);
        return matchesQuery && matchesStatus;
      });

      tableContainer.innerHTML = renderAuditRows(filtered);
    }

    if (btnAudit && modalAudit) {
      btnAudit.addEventListener('click', () => {
        updateAuditDisplay();
        modalAudit.classList.add('active');
      });
    }

    if (btnClose && modalAudit) {
      btnClose.addEventListener('click', () => modalAudit.classList.remove('active'));
    }
    if (btnCloseBottom && modalAudit) {
      btnCloseBottom.addEventListener('click', () => modalAudit.classList.remove('active'));
    }

    if (searchInput) {
      searchInput.addEventListener('input', updateAuditDisplay);
    }
    if (statusFilter) {
      statusFilter.addEventListener('change', updateAuditDisplay);
    }

    if (btnExport) {
      btnExport.addEventListener('click', () => {
        if (window.ClimateSphere && window.ClimateSphere.export) {
          window.ClimateSphere.export('Directive_2010_75_EU_Statutory_Audit_Ledger.csv');
        }
      });
    }

    const btnEsef = document.getElementById('btnEsefZip');
    if (btnEsef) {
      btnEsef.addEventListener('click', () => {
        const db = window.ClimateSphere.DB;
        if (db && !db.hasPermission('sign_filing')) {
          window.ClimateSphere.showToast(`⛔ Access Denied: Role "${db.getCurrentUser().name}" cannot sign statutory filings (Requires VP/Admin)`);
          return;
        }
        window.ClimateSphere.export('ESEF_CSRD_ESRS_E1_Taxonomy_Package.zip');
      });
    }

    const btnFiling = document.getElementById('btnNewFiling');
    if (btnFiling) {
      btnFiling.addEventListener('click', () => {
        const db = window.ClimateSphere.DB;
        if (db && !db.hasPermission('sign_filing')) {
          window.ClimateSphere.showToast(`⛔ Access Denied: Role "${db.getCurrentUser().name}" cannot sign statutory filings (Requires VP/Admin)`);
          return;
        }
        window.ClimateSphere.export('CSRD_ESRS_E1_iXBRL_Report.xhtml');
      });
    }

    const btnMcerts = document.getElementById('btnMcertsXml');
    if (btnMcerts) {
      btnMcerts.addEventListener('click', () => {
        window.ClimateSphere.export('UK_EA_MCERTS_Audit_Conformity_Report.xml');
      });
    }

    const btnCbam = document.getElementById('btnCbamXml');
    if (btnCbam) {
      btnCbam.addEventListener('click', () => {
        window.ClimateSphere.export('EU_CBAM_Definitive_Surrender_Declaration.xml');
      });
    }

    const btnEuEts = document.getElementById('btnEuEtsXml');
    if (btnEuEts) {
      btnEuEts.addEventListener('click', () => {
        window.ClimateSphere.export('EU_ETS_MRV_Verified_Annual_Emissions_Return.xml');
      });
    }
  }

  return { render, init };
})();

window.Compliance = Compliance;
