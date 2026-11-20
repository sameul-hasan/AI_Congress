/**
 * ClimateSphere — Climate Shield Module
 * NEW MODULE: Regulatory compliance risk engine, IED/CSRD/EU ETS alert firewall,
 * permit capacity tracking, audit trail, and proactive risk scoring.
 */

const ClimateShield = (() => {

  const REGULATIONS = [
    {
      id: 'IED-75',
      name: 'Industrial Emissions Directive 2010/75/EU',
      status: 'BREACH',
      risk: 'CRITICAL',
      exposure: '€2.4M fine exposure',
      deadline: 'OVERDUE',
      details: 'SO2 at DU-03 exceeds ELV by 69.4% (847 vs 500 mg/Nm3). IED Article 18 mandatory reporting triggered.',
      facility: 'DU-03',
      action: 'Submit exceedance report within 24h',
    },
    {
      id: 'EU-ETS',
      name: 'EU Emissions Trading System Phase 4',
      status: 'AT RISK',
      risk: 'WARNING',
      exposure: '€1.8M allowance deficit',
      deadline: 'Apr 30, 2027',
      details: '127.4 kt CO2e verified (84% of 2026 budget). Deficit gap growing at 1.2 kt/month. EUA spot: €68.40/t.',
      facility: 'Portfolio',
      action: 'Purchase 12,000 EUAs before April 30',
    },
    {
      id: 'CSRD-E1',
      name: 'CSRD / ESRS E1 Climate Disclosure',
      status: 'IN PROGRESS',
      risk: 'WARNING',
      exposure: 'Reputational',
      deadline: 'Dec 31, 2026',
      details: 'ESRS E1-6 GHG data 78% complete. Scope 3 category 11 (use of sold products) data gap identified.',
      facility: 'All',
      action: 'Complete Scope 3 Cat 11 mapping by Nov 15',
    },
    {
      id: 'EN14181',
      name: 'EN 14181 QAL3 Calibration',
      status: 'OVERDUE',
      risk: 'WARNING',
      exposure: 'Data validity',
      deadline: 'OVERDUE +10d',
      details: 'MI-02 CEMS calibration certificate expired Sep 15. Data from MI-02 flagged as unverified since that date.',
      facility: 'MI-02',
      action: 'Schedule TUV audit immediately',
    },
    {
      id: 'REACH',
      name: 'REACH / CLP Hazardous Substance Reporting',
      status: 'COMPLIANT',
      risk: 'NOMINAL',
      exposure: 'None',
      deadline: 'Jun 1, 2027',
      details: 'All substance registrations current. SVHCs inventory updated Q2 2026. No authorization required.',
      facility: 'All',
      action: 'Annual review scheduled Q1 2027',
    },
    {
      id: 'SFDR',
      name: 'SFDR Article 9 PAI Reporting',
      status: 'COMPLIANT',
      risk: 'NOMINAL',
      exposure: 'None',
      deadline: 'Jun 30, 2027',
      details: 'Q1-Q2 2026 PAI indicators submitted. GHG emission intensity, biodiversity, and water data complete.',
      facility: 'All',
      action: 'Q3 data collection begins Nov 1',
    },
  ];

  const RISK_MATRIX = [
    { facility: 'DU-03', ied: 95, euets: 62, csrd: 45, en14181: 40, overall: 'CRITICAL' },
    { facility: 'RT-07', ied: 72, euets: 54, csrd: 48, en14181: 18, overall: 'WARNING' },
    { facility: 'MI-02', ied: 48, euets: 38, csrd: 52, en14181: 88, overall: 'WARNING' },
    { facility: 'WA-04', ied: 22, euets: 24, csrd: 40, en14181: 12, overall: 'NOMINAL' },
    { facility: 'MD-01', ied: 12, euets: 14, csrd: 35, en14181: 8,  overall: 'NOMINAL' },
  ];

  const AUDIT_TRAIL = [
    { ts: '2026-09-25 09:31', type: 'BREACH',  reg: 'IED-75',   text: 'SO2 ELV exceedance at DU-03 — 847 mg/Nm3. Auto-alert triggered.' },
    { ts: '2026-09-24 14:18', type: 'ACTION',  reg: 'EU-ETS',   text: 'EUA deficit projection updated. 12,000 EUAs required for compliance.' },
    { ts: '2026-09-22 10:02', type: 'WARNING', reg: 'EN14181',  text: 'QAL3 calibration certificate expired for MI-02. Data flagged unverified.' },
    { ts: '2026-09-20 11:45', type: 'INFO',    reg: 'CSRD-E1',  text: 'ESRS E1-7 energy intensity data collection completed for Q2 2026.' },
    { ts: '2026-09-18 09:00', type: 'INFO',    reg: 'SFDR',     text: 'Q2 2026 PAI indicators submitted to asset manager. All 18 PAIs complete.' },
    { ts: '2026-09-15 16:30', type: 'WARNING', reg: 'IED-75',   text: 'Precursor SO2 alert at DU-03 — 680 mg/Nm3. Warning threshold (80%) breached.' },
    { ts: '2026-09-10 08:21', type: 'INFO',    reg: 'EN14181',  text: 'QAL2 re-certification completed for DU-03 and RT-07 by TUV SUD.' },
  ];

  function chipClass(r) { return r === 'CRITICAL' ? 'red' : r === 'WARNING' ? 'amber' : 'green'; }
  function chipLabel(s) { return s; }

  function render() {
    const activeFid = window.ClimateSphere.state ? window.ClimateSphere.state.activeFacilityId : 'DU-03';
    const fac = (window.ClimateSphere.state && window.ClimateSphere.state.getFacility) ? window.ClimateSphere.state.getFacility(activeFid) : { name: 'Duisburg Unit 3' };

    const criticalCount = REGULATIONS.filter(r => r.risk === 'CRITICAL').length;
    const warningCount  = REGULATIONS.filter(r => r.risk === 'WARNING').length;
    const nominalCount  = REGULATIONS.filter(r => r.risk === 'NOMINAL').length;

    return `
      <div class="page-header">
        <div class="page-title-group">
          <span class="page-subtitle">CLIMATE SHIELD · REGULATORY RISK ENGINE · ACTIVE PLANT: ${activeFid} (${fac.name})</span>
          <h1 class="page-title">Regulatory Compliance Firewall</h1>
          <p class="page-meta">EU IED · EU ETS · CSRD/ESRS E1 · EN 14181 · REACH · SFDR — Real-time risk scoring</p>
        </div>
        <div class="page-actions">
          <button class="btn btn-secondary btn-sm" id="btnExportShield">Export Compliance Pack</button>
          <button class="btn btn-danger btn-sm" id="btnEscalate">Escalate Critical Breach</button>
        </div>
      </div>

      <!-- Risk Summary KPIs -->
      <div class="grid-4" style="margin-bottom:var(--space-lg);">
        <div class="metric-card red">
          <span class="metric-label">CRITICAL BREACHES</span>
          <div class="metric-value" style="color:var(--status-red);font-size:48px;">${criticalCount}</div>
          <span style="font-family:var(--font-mono);font-size:10px;color:var(--on-surface-variant);">Immediate action required</span>
        </div>
        <div class="metric-card amber">
          <span class="metric-label">AT-RISK ITEMS</span>
          <div class="metric-value" style="color:var(--secondary);font-size:48px;">${warningCount}</div>
          <span style="font-family:var(--font-mono);font-size:10px;color:var(--on-surface-variant);">Review within 7 days</span>
        </div>
        <div class="metric-card primary">
          <span class="metric-label">COMPLIANT ITEMS</span>
          <div class="metric-value" style="color:var(--primary);font-size:48px;">${nominalCount}</div>
          <span style="font-family:var(--font-mono);font-size:10px;color:var(--on-surface-variant);">No action required</span>
        </div>
        <div class="metric-card">
          <span class="metric-label">FINE EXPOSURE</span>
          <div class="metric-value" style="color:var(--status-red);font-size:32px;line-height:1.2;">€4.2M</div>
          <div style="display:flex;align-items:center;gap:4px;margin-top:4px;">
            <span style="font-family:var(--font-mono);font-size:10px;color:var(--status-red);">▲ €1.2M vs last quarter</span>
          </div>
        </div>
      </div>

      <!-- Regulations Grid -->
      <div class="grid-12" style="margin-bottom:var(--space-lg);">
        <div class="col-span-8 stack">
          ${REGULATIONS.map(r => `
            <div class="card" style="border-left:3px solid ${r.risk === 'CRITICAL' ? 'var(--status-red)' : r.risk === 'WARNING' ? 'var(--secondary)' : 'var(--primary)'};${r.facility === activeFid ? 'background:rgba(70,246,190,0.04);border:1px solid rgba(70,246,190,0.3);' : ''}">
              <div class="card-body" style="padding:14px 16px;">
                <div style="display:flex;align-items:flex-start;gap:12px;flex-wrap:wrap;">
                  <!-- Icon -->
                  <div style="width:36px;height:36px;background:${r.risk === 'CRITICAL' ? 'rgba(255,107,107,0.1)' : r.risk === 'WARNING' ? 'rgba(255,185,87,0.1)' : 'rgba(70,246,190,0.1)'};border-radius:6px;display:flex;align-items:center;justify-content:center;font-size:16px;flex-shrink:0;">
                    ${r.risk === 'CRITICAL' ? '⚠' : r.risk === 'WARNING' ? '◆' : '✓'}
                  </div>
                  <!-- Info -->
                  <div style="flex:1;min-width:0;">
                    <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:4px;">
                      <span style="font-family:var(--font-mono);font-size:10px;font-weight:600;color:var(--on-surface-dim);">${r.id}</span>
                      <span style="font-size:12px;font-weight:600;color:var(--on-surface);">${r.name}</span>
                      ${r.facility === activeFid ? `<span class="chip chip-green" style="font-size:9px;">ACTIVE PLANT (${r.facility})</span>` : ''}
                    </div>
                    <p style="font-size:11px;color:var(--on-surface-variant);line-height:1.5;margin:4px 0;">${r.details}</p>
                    <div style="display:flex;align-items:center;gap:8px;margin-top:8px;flex-wrap:wrap;">
                      <span style="font-family:var(--font-mono);font-size:10px;color:${r.risk === 'CRITICAL' ? 'var(--status-red)' : 'var(--secondary)'};">Action: ${r.action}</span>
                    </div>
                  </div>
                  <!-- Badges -->
                  <div style="display:flex;flex-direction:column;gap:6px;align-items:flex-end;flex-shrink:0;">
                    <span class="chip chip-${chipClass(r.risk)}">${r.status}</span>
                    <span style="font-family:var(--font-mono);font-size:9px;color:var(--on-surface-variant);">Due: ${r.deadline}</span>
                    <span style="font-family:var(--font-mono);font-size:10px;color:var(--secondary);">${r.exposure}</span>
                  </div>
                </div>
              </div>
            </div>
          `).join('')}
        </div>

        <!-- Risk Matrix + ETS -->
        <div class="col-span-4 stack">
          <div class="card">
            <div class="card-header">
              <span class="card-title">Facility Risk Matrix</span>
              <span class="card-meta">Click site to focus</span>
            </div>
            <div style="overflow-x:auto;">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>Facility</th>
                    <th class="right">IED</th>
                    <th class="right">ETS</th>
                    <th class="right">CSRD</th>
                    <th>Risk</th>
                  </tr>
                </thead>
                <tbody>
                  ${RISK_MATRIX.map(row => `
                    <tr data-fid="${row.facility}" style="cursor:pointer;transition:all 150ms;${row.facility === activeFid ? 'background:rgba(70,246,190,0.08);border-left:3px solid var(--primary);' : ''}" title="Click to select ${row.facility}">
                      <td style="font-family:var(--font-mono);font-size:11px;font-weight:${row.facility === activeFid ? '700' : '500'};color:${row.facility === activeFid ? 'var(--primary)' : 'inherit'};">
                        ${row.facility} ${row.facility === activeFid ? '◀' : ''}
                      </td>
                      <td class="mono" style="color:${row.ied > 70 ? 'var(--status-red)' : row.ied > 40 ? 'var(--secondary)' : 'var(--primary)'};">${row.ied}</td>
                      <td class="mono" style="color:${row.euets > 70 ? 'var(--status-red)' : row.euets > 40 ? 'var(--secondary)' : 'var(--primary)'};">${row.euets}</td>
                      <td class="mono" style="color:${row.csrd > 70 ? 'var(--status-red)' : row.csrd > 40 ? 'var(--secondary)' : 'var(--primary)'};">${row.csrd}</td>
                      <td><span class="chip chip-${chipClass(row.overall)}" style="font-size:8px;">${row.overall}</span></td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          </div>

          <!-- EU ETS Dashboard -->
          <div class="card">
            <div class="card-header">
              <span class="card-title">EU ETS Carbon Budget</span>
              <span class="card-meta">Phase 4 · 2026</span>
            </div>
            <div class="card-body">
              <div style="text-align:center;margin:var(--space-md) 0;" id="etsBudgetGauge"></div>
              ${[
                { label: 'ANNUAL BUDGET',   value: '151.4 kt EUAs' },
                { label: 'VERIFIED TO DATE',value: '127.4 kt',    color: 'var(--secondary)' },
                { label: 'REMAINING',       value: '24.0 kt' },
                { label: 'EUA SPOT PRICE',  value: '€68.40/t' },
                { label: 'MARKET EXPOSURE', value: '€1.84M',      color: 'var(--status-red)' },
              ].map(s => `
                <div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid rgba(255,255,255,0.03);">
                  <span class="label-mono">${s.label}</span>
                  <span style="font-family:var(--font-mono);font-size:11px;font-weight:600;color:${s.color || 'var(--on-surface)'};">${s.value}</span>
                </div>
              `).join('')}
              <div class="progress-bar" style="margin-top:12px;">
                <div class="progress-fill fill-amber" style="width:84%;"></div>
              </div>
              <div style="display:flex;justify-content:space-between;margin-top:4px;">
                <span class="label-mono">0%</span>
                <span class="label-mono" style="color:var(--secondary);">84% USED</span>
                <span class="label-mono">100%</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Audit Trail -->
      <div class="card">
        <div class="card-header">
          <span class="card-title">Compliance Audit Trail</span>
          <span class="card-meta">Last 30 days · Automated logging</span>
        </div>
        <div class="card-body">
          <div class="timeline">
            ${AUDIT_TRAIL.map(e => `
              <div class="timeline-item">
                <div class="timeline-dot ${e.type === 'BREACH' ? 'gray' : e.type === 'WARNING' ? 'amber' : 'green'}"></div>
                <div class="timeline-content">
                  <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
                    <span style="font-family:var(--font-mono);font-size:9px;color:var(--on-surface-dim);">${e.ts}</span>
                    <span class="chip ${e.type === 'BREACH' ? 'chip-red' : e.type === 'WARNING' ? 'chip-amber' : 'chip-neutral'}" style="font-size:8px;">${e.type}</span>
                    <span style="font-family:var(--font-mono);font-size:9px;color:var(--on-surface-variant);">${e.reg}</span>
                  </div>
                  <div class="timeline-title" style="margin-top:3px;">${e.text}</div>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    `;
  }

  function init() {
    // ETS budget gauge
    const etsSvg = document.getElementById('etsBudgetGauge');
    if (etsSvg) Charts.gauge(etsSvg, 127.4, 151.4, { size: 90, color: '#ffb957', label: 'ETS Used', unit: 'kt EUAs' });

    // Interactive row clicks for facility sync
    document.querySelectorAll('[data-fid]').forEach(el => {
      el.addEventListener('click', () => {
        const fid = el.dataset.fid;
        if (fid && window.ClimateSphere.state) {
          window.ClimateSphere.state.setFacility(fid, true);
        }
      });
    });

    // Wire buttons
    const btnExport = document.getElementById('btnExportShield');
    if (btnExport) btnExport.addEventListener('click', () => window.ClimateSphere && window.ClimateSphere.export('CSRD_Compliance_Pack.pdf'));

    const btnEscalate = document.getElementById('btnEscalate');
    if (btnEscalate) {
      btnEscalate.addEventListener('click', () => {
        const db = window.ClimateSphere.DB;
        if (db && !db.hasPermission('escalate_alert')) {
          window.ClimateSphere.showToast(`⛔ Access Denied: Role "${db.getCurrentUser().name}" cannot escalate critical breaches (Requires VP/Admin)`);
          return;
        }
        window.ClimateSphere && window.ClimateSphere.showToast('🚨 Critical breach escalation transmitted to Ministry & Legal Directorate.');
      });
    }
  }

  return { render, init };
})();

window.ClimateShield = ClimateShield;
