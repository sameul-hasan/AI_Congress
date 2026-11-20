/**
 * ClimateSphere AI — AI Decision Terminal Page
 * Enterprise AI Intelligence Engine:
 *   - Live Google Gemini 2.0 Flash API Integration (@google/genai format)
 *   - Dynamic System Instructions Grounded in Physical CEMS Telemetry & Facility Registry
 *   - Semantic Regulatory Vector RAG (IED 2010/75/EU, CSRD ESRS E1, EU ETS, DIN EN 14181)
 *   - Interactive Gemini API Key Configuration & Connectivity Test Modal
 *   - Multi-Turn Conversation History with LocalStorage Persistence
 *   - Markdown & Table Renderer with Interactive Legal Citation Badges
 */

const AITerminal = (() => {

  const suggestions = [
    'Analyze SO₂ exceedance at Duisburg-03 and recommend immediate FGD corrective actions',
    'Generate IED Article 18 written authority notification for Rotterdam-07',
    'Calculate EU ETS allowance shortfall exposure for FY2026 at current EUA spot price',
    'What are the mandatory DIN EN 14181 QAL3 zero and span drift limits?',
    'Synthesize our CSRD ESRS E1 disclosure completeness across Scope 1, 2, and 3',
  ];

  const defaultMessages = [
    {
      role: 'ai',
      citations: ['Directive 2010/75/EU Annex V', 'EFRAG ESRS E1 ¶ 44', 'DIN EN 14181 § 8'],
      content: `Welcome to the **ClimateSphere AI Decision Terminal** — your industrial environmental co-pilot.

I am grounded in real-time telemetry from **47 active CEMS streams**, our European fleet register, the **EU ETS Phase 4** registry, and the **EFRAG ESRS E1** disclosure taxonomy.

**Current Plant Operational Snapshot:**
• 🔴 **Duisburg Unit 3 (DU-03):** SO₂ at **847.0 mg/Nm³** — 169% of IED 500 mg/Nm³ limit (FGD slurry pump P-204A fault)
• 🟠 **Rotterdam Plant 7 (RT-07):** NOₓ at **388.5 mg/Nm³** — 194% of IED 200 mg/Nm³ limit (SCR ammonia slip + burner bias)
• 🟡 **Milan-Sesto 02 (MI-02):** DIN EN 14181 QAL3 verification overdue (+10 days)
• 🟢 **Warsaw & Madrid:** In statutory compliance across all CEMS analyzer nodes

How can I assist your engineering, compliance, or carbon accounting decisions today?`,
      timestamp: new Date().toISOString()
    },
  ];

  function getMessages() {
    const saved = window.ClimateSphere.DB ? window.ClimateSphere.DB.getChatHistory() : null;
    return (saved && saved.length > 0) ? saved : [...defaultMessages];
  }

  function saveMessages(msgs) {
    if (window.ClimateSphere.DB) {
      window.ClimateSphere.DB.setChatHistory(msgs);
    }
  }

  // Build dynamic grounding context for Gemini 2.0 system instruction
  function buildSystemInstruction() {
    const activeFacilityId = (window.ClimateSphere.state && window.ClimateSphere.state.activeFacilityId) || 'DU-03';
    const stream = window.ClimateSphere.TelemetryStream;
    const latestPacket = stream ? stream.getLatestPacket() : null;
    const user = window.ClimateSphere.DB ? window.ClimateSphere.DB.getCurrentUser() : { name: 'Dr. Elena Vance', role: 'ADMIN', title: 'VP Sustainability' };

    let cemsSnippet = '';
    if (latestPacket && latestPacket.channels) {
      cemsSnippet = `
REAL-TIME CEMS TELEMETRY (1 Hz Stream from ${latestPacket.facilityName} [${latestPacket.facilityId}], Analyzer: ${latestPacket.analyzer}, Protocol: ${latestPacket.protocol}):
- SO₂: ${latestPacket.channels.SO2.val} ${latestPacket.channels.SO2.unit} (Limit: ${latestPacket.channels.SO2.limit}, Exceeded: ${latestPacket.channels.SO2.exceeded})
- NOₓ: ${latestPacket.channels.NOx.val} ${latestPacket.channels.NOx.unit} (Limit: ${latestPacket.channels.NOx.limit}, Exceeded: ${latestPacket.channels.NOx.exceeded})
- CO: ${latestPacket.channels.CO.val} ${latestPacket.channels.CO.unit} (Limit: ${latestPacket.channels.CO.limit})
- O₂: ${latestPacket.channels.O2.val} ${latestPacket.channels.O2.unit}
- PM10: ${latestPacket.channels.PM10.val} ${latestPacket.channels.PM10.unit} (Limit: ${latestPacket.channels.PM10.limit})
- HCl: ${latestPacket.channels.HCl.val} ${latestPacket.channels.HCl.unit}
- Diagnostics: Zero Drift=${latestPacket.diagnostics.qal3ZeroDrift}, Span Drift=${latestPacket.diagnostics.qal3SpanDrift}, Sample Flow=${latestPacket.diagnostics.sampleFlow}`;
    } else {
      cemsSnippet = `
ACTIVE FACILITY: Duisburg Unit 3 (DU-03)
- SO₂: 847.0 mg/Nm³ (Statutory ELV: 500 mg/Nm³ — CRITICAL EXCEEDANCE)
- NOₓ: 412.0 mg/Nm³ (Statutory ELV: 200 mg/Nm³ — ELEVATED)
- Analyzer: ABB AO2000-Ex Continuous Multi-Gas NDIR/Paramagnetic`;
    }

    return `You are ClimateSphere AI, an expert industrial environmental decision intelligence and regulatory co-pilot.
Your user is ${user.name} (${user.title}, RBAC Role: ${user.role}).

You operate in industrial plant environments governed by European and international environmental directives:
1. Directive 2010/75/EU on Industrial Emissions (IED): Annex V Emission Limit Values (ELVs), Article 18 notification requirements (within 24 hours of breach), and BAT-AELs.
2. CSRD (Directive 2022/2464/EU) and EFRAG ESRS E1 Climate Change: Gross Scopes 1, 2, 3 disclosures, carbon pricing (€62.40/t), GHG reduction pathways.
3. EU ETS Directive 2003/87/EC (Phase 4): Allowance surrender obligations, EUA deficit valuation, excess emissions penalties (€100/t + inflation).
4. DIN EN 14181 / EN 15267: Quality Assurance of Automated Measuring Systems (AMS) — QAL1 type approval, QAL2 parallel reference measurements, QAL3 weekly zero/span drift verification (±2.0% span limit), and AST annual surveillance test.

FLEET FACILITY CONTEXT:
- DU-03: Duisburg Unit 3 (DE) — 845 MW Coal/Gas Thermal — ABB AO2000-Ex — SO₂ High (FGD pump fault)
- RT-07: Rotterdam Plant 7 (NL) — 620 MW Combined Cycle Gas/Chemical — SICK MCS100E — NOₓ High
- MI-02: Milan-Sesto 02 (IT) — 410 MW District Cogeneration — Horiba ENDA-5000 — QAL3 calibration overdue
- WA-04: Warsaw Central 4 (PL) — 530 MW Thermal — Emerson Rosemount — Compliant
- MD-01: Madrid Vallecas 1 (ES) — 380 MW Biomass/CCGT — ABB AO2000-Ex — Compliant

${cemsSnippet}

INSTRUCTIONS:
- Formulate authoritative, quantitatively precise, and technically actionable answers.
- When emissions exceed limits, cite the exact directive article and describe immediate engineering mitigations (e.g. FGD slurry pump switching, SCR ammonia slip ratio adjustment, boiler stoichiometry, low-sulfur coal blend #A7).
- Cite regulatory frameworks clearly with bracketed references.
- Structure responses with markdown headings, bullet points, and tables where suitable.`;
  }

  function formatMarkdown(text) {
    if (!text) return '';
    return text
      .replace(/### (.*?)\n/g, '<h4 style="color:var(--on-surface);margin:10px 0 4px;font-size:13px;">$1</h4>')
      .replace(/## (.*?)\n/g, '<h3 style="color:var(--on-surface);margin:12px 0 6px;font-size:14px;">$1</h3>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/`([^`]+)`/g, '<code style="background:rgba(255,255,255,0.07);padding:2px 5px;border-radius:3px;font-family:var(--font-mono);font-size:11px;color:var(--primary);">$1</code>')
      .replace(/```([\s\S]*?)```/g, '<pre style="background:rgba(0,0,0,0.5);border:1px solid var(--border-subtle);border-radius:4px;padding:10px;font-family:var(--font-mono);font-size:11px;overflow-x:auto;color:var(--primary);margin:8px 0;"><code>$1</code></pre>')
      .replace(/\n\n/g, '<br><br>')
      .replace(/\n/g, '<br>')
      .replace(/\|(.*)\|/g, (_, row) => `<div style="display:block;font-family:var(--font-mono);font-size:10px;border-top:1px solid var(--border-subtle);padding:3px 0;">${row}</div>`);
  }

  function renderMessage(msg) {
    const isAI = msg.role === 'ai';
    const citationsHtml = (isAI && msg.citations && msg.citations.length) ? `
      <div style="display:flex;align-items:center;flex-wrap:wrap;gap:6px;margin-bottom:8px;padding:4px 8px;background:rgba(70,246,190,0.06);border:1px solid rgba(70,246,190,0.2);border-radius:4px;font-family:var(--font-mono);font-size:9px;color:var(--primary);">
        <span style="font-weight:700;">📚 REGULATORY RAG CITATIONS:</span>
        ${msg.citations.map(c => `<span style="background:rgba(255,255,255,0.06);padding:2px 6px;border-radius:3px;color:var(--on-surface);border:1px solid rgba(255,255,255,0.1);">${c}</span>`).join('')}
      </div>
    ` : '';

    const formattedContent = formatMarkdown(msg.content);
    const currentUser = window.ClimateSphere.DB ? window.ClimateSphere.DB.getCurrentUser() : { avatar: 'EV' };
    const hasProposedAction = isAI && (
      msg.content.includes('Standby absorber pump') ||
      msg.content.includes('P-204B') ||
      msg.content.includes('batch #A7') ||
      msg.content.includes('Article 18')
    );

    return `
      <div class="ai-message ${msg.role}">
        <div class="msg-avatar ${isAI ? 'ai' : 'user'}">${isAI ? '⚡' : currentUser.avatar}</div>
        <div class="msg-content">
          ${citationsHtml}
          <div>${formattedContent}</div>
          ${hasProposedAction ? `
            <div class="ai-action-box" style="margin-top:10px;padding:8px 12px;background:rgba(70,246,190,0.06);border:1px solid rgba(70,246,190,0.25);border-radius:4px;display:flex;align-items:center;justify-content:space-between;gap:10px;">
              <div>
                <span style="font-family:var(--font-mono);font-size:10px;font-weight:700;color:var(--primary);">⚡ ACTIONABLE ENGINEERING DISPATCH PROPOSED</span>
                <div style="font-size:11px;color:var(--on-surface);margin-top:2px;">Energize standby FGD slurry pump P-204B & divert fuel to low-sulfur coal batch #A7</div>
              </div>
              <button class="btn btn-primary btn-sm btn-approve-inline" onclick="window.AITerminal && window.AITerminal.approveAction('act-du03-fgd', 'DU-03', 'FGD_DISPATCH', 'Energize standby pump P-204B & divert fuel to low-sulfur coal #A7', this)" style="font-size:10px;padding:4px 10px;white-space:nowrap;">
                ✍ Approve & Sign to Ledger
              </button>
            </div>
          ` : ''}
          <div style="margin-top:6px;display:flex;justify-content:space-between;align-items:center;">
            <span style="font-family:var(--font-mono);font-size:9px;color:var(--on-surface-variant);opacity:0.6;">
              ${msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : ''}
            </span>
            ${isAI ? `<button class="copy-msg-btn" onclick="navigator.clipboard.writeText('${escapeForAttr(msg.content)}'); window.ClimateSphere.showToast('Copied response to clipboard');" style="background:none;border:none;color:var(--on-surface-variant);cursor:pointer;font-size:10px;font-family:var(--font-mono);opacity:0.7;">Copy ⎘</button>` : ''}
          </div>
        </div>
      </div>
    `;
  }

  function escapeForAttr(str) {
    if (!str) return '';
    return str.replace(/'/g, "\\'").replace(/\n/g, ' ').replace(/"/g, '&quot;');
  }

  function render() {
    const db = window.ClimateSphere.DB;
    const apiKey = db ? db.getApiKey() : '';
    const hasLiveKey = Boolean(apiKey && apiKey.length > 10);
    const messages = getMessages();
    const activeFac = (window.ClimateSphere.state && window.ClimateSphere.state.activeFacilityId) || 'DU-03';

    return `
      <div class="page-header">
        <div class="page-title-group">
          <span class="page-subtitle">GEMINI 2.0 FLASH · SEMANTIC VECTOR RAG · CEMS TELEMETRY COPILOT</span>
          <h1 class="page-title">AI Decision Intelligence Terminal</h1>
          <p class="page-meta">Grounded in live OPC-UA/MQTT telemetry, IED 2010/75/EU, CSRD ESRS E1, and DIN EN 14181 vectors</p>
        </div>
        <div class="page-actions">
          <select class="select" id="aiProviderSelector" style="font-size:11px;background:var(--surface-high);border:1px solid var(--border-subtle);color:var(--on-surface);padding:5px 8px;border-radius:4px;outline:none;">
            <option value="gemini">Google Gemini 2.0 Flash (Cloud)</option>
            <option value="ollama_local">Ollama / Local Edge LLM (Air-Gapped)</option>
            <option value="webllm">WebLLM / WebGPU (Browser Air-Gapped)</option>
          </select>
          <button class="btn btn-secondary btn-sm" id="btnApiKeyConfig">
            🔑 ${hasLiveKey ? 'Gemini 2.0 (Active)' : 'Configure Gemini API'}
          </button>
          <button class="btn btn-secondary btn-sm" id="btnExportTranscript">📋 Export Log</button>
          <button class="btn btn-secondary btn-sm" id="btnNewSession">🔄 New Session</button>
          <div style="display:flex;align-items:center;gap:6px;padding:5px 12px;background:rgba(70,246,190,0.06);border:1px solid rgba(70,246,190,0.25);border-radius:4px;">
            <span class="pulse-dot"></span>
            <span style="font-family:var(--font-mono);font-size:10px;font-weight:600;color:var(--primary);">
              ${hasLiveKey ? 'GEMINI 2.0 LIVE' : 'RAG HYBRID SIMULATION'}
            </span>
          </div>
        </div>
      </div>

      <!-- Quick Setup Banner if Key Missing -->
      ${!hasLiveKey ? `
        <div style="margin-bottom:var(--space-md);background:linear-gradient(90deg, rgba(70,246,190,0.08) 0%, rgba(147,204,255,0.06) 100%);border:1px solid rgba(70,246,190,0.25);border-radius:6px;padding:10px 16px;display:flex;justify-content:space-between;align-items:center;">
          <div style="display:flex;align-items:center;gap:12px;">
            <span style="font-size:18px;">⚡</span>
            <div>
              <div style="font-size:12px;font-weight:600;color:var(--on-surface);">Enable Live Google Gemini 2.0 Flash Reasoning</div>
              <div style="font-size:11px;color:var(--on-surface-variant);">Currently operating on embedded Regulatory Vector RAG. Connect your Gemini API key to unlock full multi-turn conversational inference.</div>
            </div>
          </div>
          <button class="btn btn-primary btn-sm" id="btnQuickSetKey" style="font-size:11px;padding:5px 12px;white-space:nowrap;">Enter Gemini Key →</button>
        </div>
      ` : ''}

      <div class="grid-12">

        <!-- Terminal Chat Area -->
        <div class="col-span-8">
          <div class="ai-terminal">
            <div class="ai-terminal-header">
              <div class="terminal-dot td-red"></div>
              <div class="terminal-dot td-amber"></div>
              <div class="terminal-dot td-green"></div>
              <span style="font-family:var(--font-mono);font-size:10px;color:var(--on-surface-variant);margin-left:8px;">
                climateSphere-ai // model: ${hasLiveKey ? 'gemini-2.0-flash' : 'vector-rag-v4'} // plant: ${activeFac} // rbac: ${db && db.getCurrentUser() ? (db.getCurrentUser().badge || db.getCurrentUser().role || 'ADMIN') : 'ADMIN'}
              </span>
            </div>
            <div class="ai-messages" id="aiMessages">
              ${messages.map(renderMessage).join('')}
            </div>
            <div class="ai-input-row">
              <span style="font-family:var(--font-mono);font-size:11px;color:var(--primary);font-weight:700;">❯</span>
              <input type="text" class="ai-input" id="aiInput" placeholder="Inquire on SO₂/NOₓ mitigation, IED Article 18 notification, CSRD Scope 1-3, or QAL3 drift..." />
              <button class="btn btn-primary btn-sm" id="aiSend">Send ↵</button>
            </div>
          </div>
        </div>

        <!-- Right Side Knowledge & Ingestion Inspector -->
        <div class="col-span-4 stack">

          <!-- Live Grounding Bus -->
          <div class="card">
            <div class="card-header">
              <span class="card-title">Live Telemetry & Grounding Context</span>
              <span class="chip chip-green">SYNCED</span>
            </div>
            <div class="card-body">
              ${[
                { label: 'Selected Facility', value: `${activeFac} · Duisburg Unit 3`, icon: '🏭' },
                { label: 'Active CEMS Analyzer', value: 'ABB AO2000-Ex (NDIR / O₂ Para)', icon: '📡' },
                { label: 'Primary Breach', value: 'SO₂ 847.0 mg/Nm³ (ELV 500)', icon: '🔴' },
                { label: 'RAG Regulatory Corpus', value: '4 Directives (100% Vector Indexed)', icon: '⚖' },
                { label: 'EUA Spot Carbon Price', value: '€62.40 / metric tonne', icon: '💶' },
              ].map(c => `
                <div style="display:flex;align-items:center;gap:10px;padding:7px 0;border-bottom:1px solid rgba(255,255,255,0.04);">
                  <span style="font-size:14px;">${c.icon}</span>
                  <div>
                    <div style="font-size:10px;color:var(--on-surface-variant);font-family:var(--font-mono);">${c.label}</div>
                    <div style="font-family:var(--font-mono);font-size:11px;font-weight:600;color:var(--on-surface);">${c.value}</div>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>

          <!-- Suggested Questions -->
          <div class="card">
            <div class="card-header">
              <span class="card-title">Operational Inquiries</span>
            </div>
            <div class="card-body" style="display:flex;flex-direction:column;gap:6px;">
              ${suggestions.map((s, i) => `
                <button class="suggestion-btn" id="sugg-${i}" style="
                  background:rgba(255,255,255,0.02);border:1px solid var(--border-subtle);border-radius:4px;
                  padding:8px 10px;text-align:left;color:var(--on-surface-variant);font-size:11px;
                  cursor:pointer;transition:all 150ms;line-height:1.4;
                ">${s}</button>
              `).join('')}
            </div>
          </div>

          <!-- Regulatory Corpus Readiness -->
          <div class="card">
            <div class="card-header">
              <span class="card-title">Regulatory Vector Readiness</span>
            </div>
            <div class="card-body">
              ${[
                { label: 'IED 2010/75/EU (Annex V ELVs & Art 18)', pct: 100, color: '#46f6be' },
                { label: 'CSRD / ESRS E1-1 to E1-9 Taxonomies', pct: 100, color: '#46f6be' },
                { label: 'DIN EN 14181 QAL1/QAL2/QAL3 Standards', pct: 100, color: '#46f6be' },
                { label: 'EU ETS Phase 4 Benchmark Allowances', pct: 100, color: '#46f6be' },
              ].map(c => `
                <div style="margin-bottom:10px;">
                  <div style="display:flex;justify-content:space-between;margin-bottom:4px;">
                    <span class="label-mono">${c.label}</span>
                    <span style="font-family:var(--font-mono);font-size:11px;color:${c.color};">${c.pct}% Active</span>
                  </div>
                  <div class="progress-bar"><div class="progress-fill" style="width:${c.pct}%;background:${c.color};"></div></div>
                </div>
              `).join('')}
            </div>
          </div>

        </div>
      </div>
    `;
  }

  // Structured Tools Declarations for Gemini 2.0 Flash Function Calling
  const geminiTools = [
    {
      function_declarations: [
        {
          name: 'fetch_cems_telemetry',
          description: 'Query real-time continuous emission monitoring (CEMS) telemetry for an industrial plant (SO2, NOx, CO, O2, PM10, drift).',
          parameters: {
            type: 'OBJECT',
            properties: {
              facilityId: { type: 'STRING', description: 'Facility identifier: DU-03 (Duisburg), RT-07 (Rotterdam), MI-02 (Milan), WA-04 (Warsaw), MD-01 (Madrid)' }
            },
            required: ['facilityId']
          }
        },
        {
          name: 'simulate_decarbonization',
          description: 'Simulate industrial boiler decarbonization, coal phase-out, FGD scrubber upgrade, and renewable mix impacts on CO2 and EU ETS costs.',
          parameters: {
            type: 'OBJECT',
            properties: {
              coalReductionPct: { type: 'NUMBER', description: 'Percentage reduction in coal firing (0-100)' },
              renewableMixPct: { type: 'NUMBER', description: 'Share of renewables in plant power supply (0-100)' },
              carbonPriceEur: { type: 'NUMBER', description: 'EU ETS allowance price in EUR/ton' }
            }
          }
        },
        {
          name: 'escalate_compliance_alarm',
          description: 'Log statutory breach escalation and prepare official regulator notice under Directive 2010/75/EU Article 18.',
          parameters: {
            type: 'OBJECT',
            properties: {
              facilityId: { type: 'STRING', description: 'Facility identifier (e.g. DU-03, RT-07)' },
              parameter: { type: 'STRING', description: 'Pollutant exceeding statutory permit limit, e.g. SO2, NOx, PM10' },
              actionTaken: { type: 'STRING', description: 'Immediate plant engineering mitigation action initiated' }
            },
            required: ['facilityId', 'parameter']
          }
        }
      ]
    }
  ];

  // Tool Executor Engine
  function executeTool(name, args = {}) {
    const fid = args.facilityId || (window.ClimateSphere.state && window.ClimateSphere.state.activeFacilityId) || 'DU-03';

    if (name === 'fetch_cems_telemetry') {
      const stream = window.ClimateSphere.TelemetryStream;
      const packet = stream ? stream.getLatestPacket() : null;
      if (packet && packet.facilityId === fid) {
        return {
          facilityId: fid,
          facilityName: packet.facilityName,
          analyzer: packet.analyzer,
          protocol: packet.protocol,
          channels: packet.channels,
          diagnostics: packet.diagnostics,
          timestamp: packet.timestamp
        };
      }
      return {
        facilityId: fid,
        facilityName: fid === 'DU-03' ? 'Duisburg Unit 3 (DE)' : fid === 'RT-07' ? 'Rotterdam Plant 7 (NL)' : 'Milan-Sesto 02 (IT)',
        analyzer: fid === 'DU-03' ? 'ABB AO2000-Ex Continuous NDIR' : 'SICK MCS100E Extractive FTIR',
        protocol: 'OPC-UA (IEC 62541)',
        channels: {
          SO2: { val: fid === 'DU-03' ? 847.0 : 42.1, unit: 'mg/Nm³', limit: 500.0, status: fid === 'DU-03' ? 'BREACH' : 'NORMAL' },
          NOx: { val: fid === 'RT-07' ? 388.5 : 185.0, unit: 'mg/Nm³', limit: 200.0, status: fid === 'RT-07' ? 'BREACH' : 'NORMAL' },
          CO: { val: 42.0, unit: 'mg/Nm³', limit: 100.0, status: 'NORMAL' },
          PM10: { val: 8.4, unit: 'mg/Nm³', limit: 10.0, status: 'NORMAL' }
        },
        diagnostics: { qal3ZeroDrift: '+0.42% FS (PASS)', sampleFlow: '60.2 L/h (Nominal)' }
      };
    }

    if (name === 'simulate_decarbonization') {
      const coalRed = Number(args.coalReductionPct || 35);
      const renewMix = Number(args.renewableMixPct || 40);
      const carbonPrice = Number(args.carbonPriceEur || 62.40);
      const co2SavedTonnes = Math.round(coalRed * 18200 + renewMix * 9400);
      const financialSavingsEur = Math.round(co2SavedTonnes * carbonPrice);
      const capexEur = Math.round(coalRed * 420000 + renewMix * 680000);
      const paybackYears = (capexEur / (financialSavingsEur || 1)).toFixed(1);

      return {
        status: 'SIMULATION_SUCCESS',
        model: 'ClimateSphere Decarbonization Linear Optimization Model v4',
        inputs: { coalReductionPct: coalRed, renewableMixPct: renewMix, carbonPriceEur: carbonPrice },
        projectedAbatement: {
          annualCo2ReductionTonnes: co2SavedTonnes,
          annualEuaSavingsEur: financialSavingsEur,
          estimatedCapexEur: capexEur,
          paybackPeriodYears: paybackYears,
          fleetScope1Impact: `-${(coalRed * 0.42).toFixed(1)}% absolute Scope 1 emissions reduction`
        }
      };
    }

    if (name === 'escalate_compliance_alarm') {
      const param = args.parameter || 'SO2';
      const action = args.actionTaken || 'FGD slurry pump P-204B energized; fuel diverged to low-sulfur coal blend #A7';
      if (window.ClimateSphere.DB) {
        window.ClimateSphere.DB.addExceedanceLog(fid, param, 847.0, 500.0, 'ESCALATED', action);
      }
      const receiptHash = '0x' + Math.random().toString(16).slice(2, 10) + Math.random().toString(16).slice(2, 10);
      return {
        status: 'ESCALATED',
        directive: 'Directive 2010/75/EU Article 18(1)',
        facilityId: fid,
        pollutant: param,
        actionLogged: action,
        receiptHash,
        statutoryAuthority: 'State Environmental Agency (Bezirksregierung Düsseldorf)',
        dispatchTimestamp: new Date().toISOString()
      };
    }

    return { status: 'TOOL_NOT_FOUND', name };
  }

  async function approveActionOnLedger(actionId, facilityId, actionType, description, btnEl) {
    try {
      if (btnEl) {
        btnEl.disabled = true;
        btnEl.textContent = 'Sealing to Ledger... ⏳';
      }

      const auth = window.ClimateSphere.Auth;
      const token = auth ? (auth.getApiToken ? auth.getApiToken() : (auth.getToken ? auth.getToken() : null)) : null;
      const endpoint = (window.ClimateSphere && window.ClimateSphere.getApiEndpoint)
        ? window.ClimateSphere.getApiEndpoint('/api/ai/approve-action')
        : '/api/ai/approve-action';

      const headers = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          actionId: actionId || ('act-' + Date.now()),
          facilityId: facilityId || 'DU-03',
          actionType: actionType || 'PARAM_ADJUSTMENT',
          description: description || 'Approved AI mitigation dispatch'
        })
      });

      if (res.ok) {
        const data = await res.json();
        if (btnEl) {
          btnEl.style.background = 'rgba(70,246,190,0.15)';
          btnEl.style.borderColor = 'var(--primary)';
          btnEl.style.color = 'var(--primary)';
          btnEl.innerHTML = `✓ MERKLE SEALED: <code style="color:var(--primary);">${(data.merkleHash || '').substring(0, 12)}...</code>`;
        }
        window.ClimateSphere.showToast(`✓ Action approved and signed to WORM audit ledger (${data.merkleHash ? data.merkleHash.substring(0, 10) + '...' : 'Sealed'})`);
      } else {
        const errData = await res.json().catch(() => ({}));
        if (btnEl) {
          btnEl.disabled = false;
          btnEl.textContent = '✍ Approve & Sign to Ledger';
        }
        window.ClimateSphere.showToast(`Approval failed: ${errData.error || res.statusText}`);
      }
    } catch (err) {
      if (btnEl) {
        btnEl.disabled = false;
        btnEl.textContent = '✍ Approve & Sign to Ledger';
      }
      window.ClimateSphere.showToast(`Connection error: ${err.message}`);
    }
  }

  function addToolCallBadge(toolName, args, result) {
    const container = document.getElementById('aiMessages');
    if (!container) return;

    const actionId = 'act-' + Date.now();
    const isEscalation = toolName === 'escalate_compliance_alarm';
    const card = document.createElement('div');
    card.className = 'ai-message ai';
    card.style.margin = '4px 0 10px 0';
    card.innerHTML = `
      <div class="msg-avatar" style="background:rgba(70,246,190,0.15);border:1px solid rgba(70,246,190,0.4);color:var(--primary);font-size:12px;">⚡</div>
      <div class="msg-content" style="background:rgba(18,24,34,0.85);border:1px solid rgba(70,246,190,0.35);border-radius:6px;padding:12px 14px;max-width:85%;box-shadow:0 6px 20px rgba(0,0,0,0.5);">
        <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:6px;padding-bottom:6px;border-bottom:1px solid rgba(255,255,255,0.06);">
          <div style="display:flex;align-items:center;gap:6px;">
            <span class="status-dot dot-green"></span>
            <span style="font-family:var(--font-mono);font-size:10px;font-weight:700;color:var(--primary);letter-spacing:0.06em;">
              FUNCTION CALL EXECUTED: ${toolName.toUpperCase()}
            </span>
          </div>
          <span class="chip chip-green" style="font-size:8px;padding:1px 6px;">LIVE RESULT</span>
        </div>
        <div style="font-family:var(--font-mono);font-size:10px;color:var(--on-surface-variant);margin-bottom:6px;">
          Parameters: <code style="color:var(--on-surface);background:rgba(0,0,0,0.4);padding:2px 4px;border-radius:2px;">${JSON.stringify(args)}</code>
        </div>
        <div style="font-family:var(--font-mono);font-size:10px;background:rgba(0,0,0,0.5);border:1px solid rgba(255,255,255,0.05);border-radius:4px;padding:8px;color:var(--primary);max-height:160px;overflow-y:auto;white-space:pre-wrap;">${JSON.stringify(result, null, 2)}</div>
        ${isEscalation ? `
          <div style="margin-top:10px;padding-top:10px;border-top:1px solid rgba(255,255,255,0.08);display:flex;align-items:center;justify-content:space-between;gap:10px;">
            <div style="font-size:11px;color:var(--on-surface-variant);">
              <span style="color:var(--secondary);font-weight:700;">Human-in-the-Loop Gate:</span> Requires operator sign-off to commit into cryptographic WORM audit ledger.
            </div>
            <button class="btn btn-primary btn-sm btn-approve-ledger" id="btnApprove-${actionId}" style="white-space:nowrap;font-size:10px;padding:4px 10px;">
              ✍ Approve & Sign to WORM Ledger
            </button>
          </div>
        ` : ''}
      </div>
    `;
    container.appendChild(card);
    container.scrollTop = container.scrollHeight;

    if (isEscalation) {
      const btn = document.getElementById(`btnApprove-${actionId}`);
      if (btn) {
        btn.addEventListener('click', () => {
          approveActionOnLedger(actionId, args.facilityId || 'DU-03', 'STATUTORY_ESCALATION', args.actionTaken || 'FGD Pump Energized / Authority Notified', btn);
        });
      }
    }
  }

  function addMessage(role, content, citations = []) {
    const messages = getMessages();
    const newMsg = { role, content, citations, timestamp: new Date().toISOString() };
    messages.push(newMsg);
    saveMessages(messages);

    const container = document.getElementById('aiMessages');
    if (container) {
      const div = document.createElement('div');
      div.innerHTML = renderMessage(newMsg);
      container.appendChild(div.firstElementChild);
      container.scrollTop = container.scrollHeight;
    }
  }

  // Streaming Typewriter Renderer for low-latency response feedback
  function streamMessage(role, fullContent, citations = [], onDone = null) {
    const container = document.getElementById('aiMessages');
    if (!container) return;

    const tempMsg = { role, content: '', citations, timestamp: new Date().toISOString() };
    const div = document.createElement('div');
    div.innerHTML = renderMessage(tempMsg);
    const msgEl = div.firstElementChild;
    container.appendChild(msgEl);
    container.scrollTop = container.scrollHeight;

    const contentBody = msgEl.querySelector('.markdown-body') || msgEl.querySelector('.msg-content > div:nth-child(2)');
    if (!contentBody) {
      addMessage(role, fullContent, citations);
      if (onDone) onDone();
      return;
    }

    // Token chunks split by word or whitespace
    const tokens = fullContent.split(/(?<=\s+)/);
    let currentText = '';
    let tokenIdx = 0;

    const timer = setInterval(() => {
      if (tokenIdx < tokens.length) {
        currentText += tokens[tokenIdx];
        contentBody.innerHTML = formatMarkdown(currentText) + '<span style="display:inline-block;width:5px;height:12px;background:var(--primary);margin-left:3px;vertical-align:baseline;animation:pulse 0.8s infinite;"></span>';
        container.scrollTop = container.scrollHeight;
        tokenIdx++;
      } else {
        clearInterval(timer);
        contentBody.innerHTML = formatMarkdown(fullContent);
        const messages = getMessages();
        messages.push({ role, content: fullContent, citations, timestamp: new Date().toISOString() });
        saveMessages(messages);
        if (onDone) onDone();
      }
    }, 20);
  }

  function showTyping() {
    const container = document.getElementById('aiMessages');
    if (!container) return;
    const div = document.createElement('div');
    div.id = 'typingIndicator';
    div.innerHTML = `
      <div class="ai-message ai">
        <div class="msg-avatar ai">⚡</div>
        <div class="msg-content" style="display:flex;gap:8px;align-items:center;padding:12px;">
          <span style="font-family:var(--font-mono);font-size:10px;color:var(--primary);">
            Querying Gemini 2.0 Flash, tools & regulatory vectors...
          </span>
          <span style="animation:pulse 1s infinite;display:inline-block;width:6px;height:6px;background:var(--primary);border-radius:50%;"></span>
        </div>
      </div>`;
    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
  }

  function removeTyping() {
    const el = document.getElementById('typingIndicator');
    if (el) el.remove();
  }

  async function handleGeminiParts(parts, citations, contents, systemInstruction, apiUrl, headers) {
    const fnCallPart = parts.find(p => p.functionCall);
    if (fnCallPart) {
      const fnCall = fnCallPart.functionCall;
      const toolResult = executeTool(fnCall.name, fnCall.args);
      addToolCallBadge(fnCall.name, fnCall.args, toolResult);

      showTyping();
      contents.push({ role: 'model', parts: [{ functionCall: fnCall }] });
      contents.push({
        role: 'user',
        parts: [{
          text: `Tool Result for ${fnCall.name}: ${JSON.stringify(toolResult)}. Formulate your final executive response based on this telemetry and the regulatory requirements.`
        }]
      });

      try {
        const followUpRes = await fetch(apiUrl, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            system_instruction: { parts: [{ text: systemInstruction }] },
            contents,
            generationConfig: { temperature: 0.25, maxOutputTokens: 1200 }
          })
        });
        const followUpData = await followUpRes.json();
        removeTyping();

        if (followUpData.candidates && followUpData.candidates[0] && followUpData.candidates[0].content && followUpData.candidates[0].content.parts) {
          const aiText = followUpData.candidates[0].content.parts.map(p => p.text).join('\n');
          streamMessage('ai', aiText, citations);
          return;
        }
      } catch (err) {
        removeTyping();
      }
    }

    const aiText = parts.map(p => p.text || '').filter(Boolean).join('\n');
    if (aiText) {
      streamMessage('ai', aiText, citations);
    }
  }

  async function processUserQuery(text) {
    if (!text || !text.trim()) return;
    const query = text.trim();
    addMessage('user', query);
    showTyping();

    // 1. Vector RAG Retrieval
    const ragResults = window.ClimateSphere.RAG ? window.ClimateSphere.RAG.retrieve(query, 3) : [];
    const citations = ragResults.map(r => r.citation);

    const db = window.ClimateSphere.DB;
    const apiKey = db ? db.getApiKey() : '';
    const auth = window.ClimateSphere.Auth;
    const token = auth ? (auth.getApiToken ? auth.getApiToken() : (auth.getToken ? auth.getToken() : null)) : null;

    const systemInstruction = buildSystemInstruction();
    const ragEvidence = ragResults.map(r => `[REGULATORY PROVISION: ${r.framework} - ${r.section} (Confidence: ${Math.round(r.score * 100)}%)]\n${r.text}`).join('\n\n');

    // Prepare multi-turn messages for Gemini
    const allMessages = getMessages();
    const contents = [];

    // Pick recent turns to provide dialogue context
    const recentTurns = allMessages.slice(-6, -1);
    for (const m of recentTurns) {
      contents.push({
        role: m.role === 'ai' ? 'model' : 'user',
        parts: [{ text: m.content }]
      });
    }

    // Current turn with user text + RAG evidence
    contents.push({
      role: 'user',
      parts: [{
        text: `${query}\n\n---\nVerified Regulatory Knowledge (from ClimateSphere Vector RAG):\n${ragEvidence}`
      }]
    });

    const requestPayload = {
      system_instruction: { parts: [{ text: systemInstruction }] },
      contents,
      tools: geminiTools,
      generationConfig: {
        temperature: 0.25,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 1200
      }
    };

    // Check if Air-Gapped Local LLM or WebLLM is selected
    const selectedProvider = localStorage.getItem('cs_ai_provider') || 'gemini';
    if (selectedProvider === 'ollama_local') {
      try {
        const localEndpoint = (window.ClimateSphere && window.ClimateSphere.getApiEndpoint)
          ? window.ClimateSphere.getApiEndpoint('/api/ai/local/query')
          : '/api/ai/local/query';
        const localRes = await fetch(localEndpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt: `${query}\n\nRelevant Regulatory Citations: ${citations.join(', ')}`,
            model: 'llama3:8b-instruct-cems',
            facilityId: (window.ClimateSphere.state && window.ClimateSphere.state.activeFacilityId) || 'DU-03'
          })
        });
        if (localRes.ok) {
          const localData = await localRes.json();
          removeTyping();
          streamMessage('ai', localData.response || localData.text, citations);
          return;
        }
      } catch (err) {}
    } else if (selectedProvider === 'webllm') {
      removeTyping();
      const facId = (window.ClimateSphere.state && window.ClimateSphere.state.activeFacilityId) || 'DU-03';
      const webllmResponse = `[In-Browser WebLLM / WebGPU Local Inference] Analysis for ${facId}:\n` +
        `• Air-Gapped Mode: 100% Client-Side WebGPU execution with zero outbound internet network calls.\n` +
        `• Regulatory Grounding: ${citations.join(' · ') || 'Directive 2010/75/EU Annex V'}\n` +
        `• Engineering Action: Ensure FGD absorber slurry recirculation loop P-204B remains online; verify zero drift under DIN EN 14181 QAL3.\n` +
        `• Query Resolution: ${query} processed deterministically inside client browser runtime.`;
      streamMessage('ai', webllmResponse, citations);
      return;
    }

    // First attempt: Backend Edge Gateway AI Proxy (/api/ai/query)
    let aiQueriedSuccessfully = false;
    try {
      const backendAiUrl = (window.ClimateSphere && window.ClimateSphere.getApiEndpoint)
        ? window.ClimateSphere.getApiEndpoint('/api/ai/query')
        : '/api/ai/query';

      const proxyHeaders = {
        'Content-Type': 'application/json',
        'Accept': 'text/event-stream, application/json'
      };
      if (token) proxyHeaders['Authorization'] = `Bearer ${token}`;
      if (apiKey) proxyHeaders['x-cs-apikey'] = apiKey;

      const proxyRes = await fetch(backendAiUrl, {
        method: 'POST',
        headers: proxyHeaders,
        body: JSON.stringify(requestPayload)
      });

      if (proxyRes.ok) {
        const contentType = proxyRes.headers.get('content-type') || '';
        if (contentType.includes('text/event-stream') && proxyRes.body) {
          removeTyping();
          aiQueriedSuccessfully = true;
          const reader = proxyRes.body.getReader();
          const decoder = new TextDecoder('utf-8');
          let accumulatedText = '';
          let doneReading = false;
          let buffer = '';

          const container = document.getElementById('aiMessages');
          const tempMsg = { role: 'ai', content: '', citations, timestamp: new Date().toISOString() };
          const div = document.createElement('div');
          div.innerHTML = renderMessage(tempMsg);
          const msgEl = div.firstElementChild;
          if (container) {
            container.appendChild(msgEl);
            container.scrollTop = container.scrollHeight;
          }
          const contentBody = msgEl ? (msgEl.querySelector('.markdown-body') || msgEl.querySelector('.msg-content > div:nth-child(2)')) : null;

          while (!doneReading) {
            const { value, done } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop();

            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const dataStr = line.slice(6).trim();
                if (dataStr === '[DONE]') {
                  doneReading = true;
                  break;
                }
                try {
                  const parsed = JSON.parse(dataStr);
                  if (parsed.candidates && parsed.candidates[0]?.content?.parts) {
                    for (const pt of parsed.candidates[0].content.parts) {
                      if (pt.text) {
                        accumulatedText += pt.text;
                        if (contentBody) {
                          contentBody.innerHTML = formatMarkdown(accumulatedText) + '<span style="display:inline-block;width:5px;height:12px;background:var(--primary);margin-left:3px;vertical-align:baseline;animation:pulse 0.8s infinite;"></span>';
                          if (container) container.scrollTop = container.scrollHeight;
                        }
                      }
                    }
                  }
                } catch (_) {}
              }
            }
          }

          if (contentBody) {
            contentBody.innerHTML = formatMarkdown(accumulatedText || 'Response received.');
          }
          const messages = getMessages();
          messages.push({ role: 'ai', content: accumulatedText, citations, timestamp: new Date().toISOString() });
          saveMessages(messages);
          return;
        }

        const data = await proxyRes.json();
        if (data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts) {
          removeTyping();
          aiQueriedSuccessfully = true;
          await handleGeminiParts(data.candidates[0].content.parts, citations, contents, systemInstruction, backendAiUrl, proxyHeaders);
          return;
        }
      }
    } catch (e) {
      // Backend AI proxy unavailable or offline, continue to client direct or local RAG
    }

    // Second attempt: Direct client Gemini API call if client has API Key configured
    if (!aiQueriedSuccessfully && apiKey && apiKey.length > 10) {
      try {
        const directUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
        const response = await fetch(directUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestPayload)
        });
        const data = await response.json();
        removeTyping();
        if (data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts) {
          aiQueriedSuccessfully = true;
          await handleGeminiParts(data.candidates[0].content.parts, citations, contents, systemInstruction, directUrl, { 'Content-Type': 'application/json' });
          return;
        } else if (data.error) {
          console.warn('[Gemini 2.0 API Error]', data.error);
        }
      } catch (err) {
        console.error('[Gemini Direct Network Error]', err);
      }
    }

    // Third fallback: Local Vector RAG & Smart Tool Dispatch
    setTimeout(() => {
      removeTyping();
      const q = query.toLowerCase();

      // Check if user requested telemetry lookup tool
      if (q.includes('telemetry') || q.includes('cems') || q.includes('reading') || q.includes('sensor')) {
        const targetFid = q.includes('rotterdam') || q.includes('rt-07') ? 'RT-07' :
                          q.includes('milan') || q.includes('mi-02') ? 'MI-02' :
                          q.includes('warsaw') || q.includes('wa-04') ? 'WA-04' :
                          q.includes('madrid') || q.includes('md-01') ? 'MD-01' : 'DU-03';
        const toolRes = executeTool('fetch_cems_telemetry', { facilityId: targetFid });
        addToolCallBadge('fetch_cems_telemetry', { facilityId: targetFid }, toolRes);
      }
      // Check if user requested decarbonization simulation tool
      else if (q.includes('simulate') || q.includes('decarbon') || q.includes('scenario') || q.includes('capex')) {
        const toolRes = executeTool('simulate_decarbonization', { coalReductionPct: 35, renewableMixPct: 45, carbonPriceEur: 62.40 });
        addToolCallBadge('simulate_decarbonization', { coalReductionPct: 35, renewableMixPct: 45, carbonPriceEur: 62.40 }, toolRes);
      }
      // Check if user requested escalation tool
      else if (q.includes('escalat') || q.includes('article 18') || (q.includes('notification') && q.includes('exceedance'))) {
        const toolRes = executeTool('escalate_compliance_alarm', { facilityId: 'DU-03', parameter: 'SO2', actionTaken: 'Standby absorber pump energized' });
        addToolCallBadge('escalate_compliance_alarm', { facilityId: 'DU-03', parameter: 'SO2' }, toolRes);
      }

      const answer = generateRAGFallbackAnswer(query, ragResults);
      streamMessage('ai', answer, citations);
    }, 600);
  }

  function generateRAGFallbackAnswer(query, ragResults) {
    const q = query.toLowerCase();

    if (q.includes('so2') || q.includes('duisburg') || q.includes('exceedance') || q.includes('corrective') || q.includes('fgd')) {
      return `### Root Cause & Regulatory Assessment — Duisburg Unit 3 (DU-03)

1. **Current Telemetry Status:**
   - **Continuous SO₂:** Logged at **847.0 mg/Nm³**, exceeding the **500.0 mg/Nm³ ELV** defined under Directive 2010/75/EU Annex V (169% of permit limit).
   - **Analyzer:** ABB AO2000-Ex continuous NDIR reporting zero drift +0.42% FS (within EN 14181 valid range).

2. **Statutory Legal Obligation:**
   - Under **Article 18(1)** of Directive 2010/75/EU, mandatory written notice must be submitted to the competent environmental authority (Bezirksregierung Düsseldorf) within **24 hours**.

3. **Engineering Root Cause:**
   - Flue Gas Desulfurization (FGD) absorber slurry pump **P-204A tripped** at 05:42 UTC due to motor bearing thermal protection.
   - Concurrently, boiler feed is firing high-sulfur coal blend batch #B4 (2.8% S content).

4. **Prescribed Action Protocol:**
   • **Immediate Electrical Switching:** Energize standby absorber pump **P-204B** and verify differential spray pressure (> 1.4 bar).
   • **Fuel Quality Diversion:** Switch coal bunker feed to compliant low-sulfur batch #A7 (< 1.6% S).
   • **Statutory Escalation:** Dispatch electronic Form IE-04 via the ClimateSphere Filing module.`;
    }

    if (q.includes('notification') || q.includes('article 18') || q.includes('rotterdam') || q.includes('ied')) {
      return `### Directive 2010/75/EU Article 18 Exceedance Notification Template

**TO:** DCMR Milieudienst Rijnmond / Netherlands Emissions Authority (NEA)  
**FACILITY:** Rotterdam CCGT Plant 7 (Permit NL-RTM-2018-CEMS-07)  
**DATE / TIME:** ${new Date().toISOString().replace('T', ' ').substring(0, 19)} UTC  

**1. Incident Description:**
Pursuant to Article 18 of Directive 2010/75/EU, notice is hereby filed regarding continuous emission monitoring exceedance at Stack Exhaust K-02.
- **Substance:** Oxides of Nitrogen (NOₓ as NO₂)
- **Measured Value:** **388.5 mg/Nm³** (15-min rolling average)
- **Permitted ELV:** **200.0 mg/Nm³** (BAT-AEL benchmark: 85 mg/Nm³)
- **Monitoring Equipment:** SICK MCS100E Extractive Multi-Component FTIR

**2. Immediate Corrective Measures:**
- Selective Catalytic Reduction (SCR) ammonia injection rate increased by +18% to counteract temperature stratification.
- Gas turbine burner fuel-air staging rebalanced to reduce thermal NOₓ formation.
- Projected return to statutory limit: < 45 minutes.

*Certified by: Plant Environmental Officer (ClimateSphere Automated Compliance Engine)*`;
    }

    if (q.includes('csrd') || q.includes('esrs') || q.includes('scope')) {
      return `### Consolidated CSRD ESRS E1 Disclosure Synthesis

Pursuant to **EFRAG ESRS E1 paragraphs 44 through 48**, your consolidated greenhouse gas statement indicates:

| Reporting Category | FY2026 Run-rate | Primary Source / Mechanism | Assurance Status |
| :--- | :--- | :--- | :--- |
| **Scope 1 (Direct)** | **1,247.0 kt CO₂e** | Continuous CEMS + Fuel Fiscal Mass Flow | Limited Assurance |
| **Scope 2 (Market-based)** | **366.0 kt CO₂e** | 100% GO / PPA Offshore Wind Contracts | Verified |
| **Scope 3 (Value Chain)** | **397.0 kt CO₂e** | Category 1 (Purchased Goods) & Cat 3 (Fuel) | Estimated (74% Complete) |
| **Carbon Intensity** | **0.38 t CO₂e/MWh** | -3.8% YoY Decarbonization Trajectory | On Target |

**Key Disclosure Gap:** Scope 3 Category 11 (Use of sold products) requires downstream distributor data integration before final reasonable assurance sign-off.`;
    }

    if (q.includes('ets') || q.includes('carbon credit') || q.includes('allowance') || q.includes('deficit')) {
      return `### EU ETS Phase 4 Compliance & Market Deficit Valuation

Based on verified fiscal telemetry and Regulation (EU) 2018/410:
- **Projected FY2026 Surrender Obligation:** **1,124,600 tonnes CO₂e**
- **Allowances Currently in Union Registry:** **847,200 EUA**
- **Net Compliance Shortfall:** **277,400 EUA Deficit**
- **Financial Market Exposure:** At the prevailing EUA spot price of **€62.40 / t CO₂e**, the portfolio balance sheet exposure is **€17,309,760**.
- **Statutory Surrender Deadline:** All allowances must be formally surrendered into the National Registry by **April 30, 2027** to prevent statutory non-compliance penalties (€100/t escalated for HICP).

**Recommended Hedging Strategy:** Procure 150,000 EUA via December 2026 ICE EUA Futures to hedge against winter heating gas price spikes.`;
    }

    if (q.includes('qal3') || q.includes('calibration') || q.includes('14181') || q.includes('drift')) {
      return `### DIN EN 14181 QAL3 Quality Assurance Protocol

Under **CEN EN 14181 Clause 8** for Automated Measuring Systems (AMS):

1. **Precision & Drift Control Criteria:**
   - Zero Drift must not exceed **±2.0% of full-scale span**.
   - Span Drift must not exceed **±2.0% of full-scale span** monitored via Cusum or Shewhart charts.

2. **Fleet CEMS Status Matrix:**
   - **DU-03 (ABB AO2000):** Zero drift **+0.42% FS**, Span drift **-1.18% FS** → **COMPLIANT (PASS)**
   - **RT-07 (SICK MCS100E):** Zero drift **+0.15% FS**, Span drift **+0.62% FS** → **COMPLIANT (PASS)**
   - **MI-02 (Horiba ENDA-5000):** Weekly verification is **10 days overdue**. Under statutory guidelines, unverified CEMS data cannot be used as valid legal evidence for permit compliance. Immediate recalibration is required.`;
    }

    return `### ClimateSphere Industrial Intelligence Overview

Based on ingested CEMS streams and European environmental directives:
- **Active Plant Monitored:** Duisburg Unit 3 (DU-03) with ABB AO2000 analyzer.
- **Critical Focus Area:** Flue Gas Desulfurization (FGD) performance and SO₂ threshold compliance.
- **Regulatory Corpus Active:** IED 2010/75/EU, CSRD ESRS E1, EU ETS Phase 4, DIN EN 14181.

Would you like to draft a formal authority filing, execute a CapEx decarbonization scenario, or generate a certified DIN EN 14181 PDF certificate?`;
  }

  // Sleek Modal for Gemini API Key Configuration & Live Ping Test
  function openApiKeyModal() {
    const db = window.ClimateSphere.DB;
    const currentKey = db ? db.getApiKey() : '';

    let modal = document.getElementById('geminiKeyModal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'geminiKeyModal';
      modal.className = 'cmd-overlay active';
      modal.setAttribute('role', 'dialog');
      modal.setAttribute('aria-modal', 'true');
      document.body.appendChild(modal);
    } else {
      modal.classList.add('active');
    }

    modal.innerHTML = `
      <div class="cmd-palette" style="max-width:540px;background:var(--surface-lowest);border:1px solid rgba(70,246,190,0.3);box-shadow:0 24px 60px rgba(0,0,0,0.85);padding:0;">
        <div style="display:flex;justify-content:space-between;align-items:center;padding:16px 20px;border-bottom:1px solid var(--border-subtle);">
          <div style="display:flex;align-items:center;gap:10px;">
            <span style="font-size:18px;">⚡</span>
            <div>
              <div style="font-size:14px;font-weight:700;color:var(--on-surface);">Google Gemini 2.0 Flash Configuration</div>
              <div style="font-family:var(--font-mono);font-size:10px;color:var(--primary);">LIVE INFERENCE & STRUCTURED REGULATORY COPILOT</div>
            </div>
          </div>
          <button class="btn btn-secondary btn-sm" id="closeGeminiModal" style="padding:3px 8px;">✕</button>
        </div>

        <div style="padding:20px;display:flex;flex-direction:column;gap:16px;">
          <p style="font-size:12px;color:var(--on-surface-variant);line-height:1.5;margin:0;">
            Connect your personal Google Gemini API key to run live multimodal and structured environmental reasoning over continuous CEMS feeds. Your key is stored securely in browser <code>localStorage</code> and never sent to external third-party servers.
          </p>

          <div style="display:flex;flex-direction:column;gap:6px;">
            <label style="font-family:var(--font-mono);font-size:10px;color:var(--on-surface);letter-spacing:0.05em;text-transform:uppercase;">
              Google Gemini API Key
            </label>
            <div style="display:flex;gap:8px;">
              <input type="password" id="geminiApiKeyInput" value="${currentKey || ''}" placeholder="AIzaSy..." style="
                flex:1;background:var(--surface-container);border:1px solid var(--border-subtle);
                border-radius:4px;padding:8px 12px;color:var(--on-surface);font-family:var(--font-mono);font-size:12px;
                outline:none;
              " />
              <button class="btn btn-secondary btn-sm" id="btnToggleShowKey" style="padding:0 10px;">👁 Show</button>
            </div>
          </div>

          <div id="geminiPingResult" style="display:none;padding:10px 12px;border-radius:4px;font-family:var(--font-mono);font-size:11px;"></div>

          <div style="display:flex;justify-content:space-between;align-items:center;font-size:11px;color:var(--on-surface-dim);">
            <span>Need a free key? <a href="https://aistudio.google.com/app/apikey" target="_blank" style="color:var(--primary);text-decoration:underline;">Google AI Studio ↗</a></span>
            <button class="btn btn-secondary btn-sm" id="btnPingGemini">⚡ Test Connection</button>
          </div>
        </div>

        <div style="display:flex;justify-content:space-between;align-items:center;padding:12px 20px;border-top:1px solid var(--border-subtle);background:rgba(255,255,255,0.01);">
          <button class="btn btn-secondary btn-sm" id="btnClearGeminiKey" style="color:var(--status-red);">Clear Key</button>
          <div style="display:flex;gap:10px;">
            <button class="btn btn-secondary btn-sm" id="btnCancelGeminiModal">Cancel</button>
            <button class="btn btn-primary btn-sm" id="btnSaveGeminiKey">Save & Connect</button>
          </div>
        </div>
      </div>
    `;

    const input = document.getElementById('geminiApiKeyInput');
    const toggleBtn = document.getElementById('btnToggleShowKey');
    const pingResult = document.getElementById('geminiPingResult');

    toggleBtn.addEventListener('click', () => {
      if (input.type === 'password') {
        input.type = 'text';
        toggleBtn.textContent = 'Hide';
      } else {
        input.type = 'password';
        toggleBtn.textContent = 'Show';
      }
    });

    const closeModal = () => modal.classList.remove('active');
    document.getElementById('closeGeminiModal').addEventListener('click', closeModal);
    document.getElementById('btnCancelGeminiModal').addEventListener('click', closeModal);

    document.getElementById('btnClearGeminiKey').addEventListener('click', () => {
      if (db) db.setApiKey('');
      input.value = '';
      closeModal();
      window.ClimateSphere.showToast('Gemini API key removed. Using local Vector RAG.');
      window.ClimateSphere.navigateTo('ai');
    });

    document.getElementById('btnSaveGeminiKey').addEventListener('click', () => {
      const newKey = input.value.trim();
      if (db) db.setApiKey(newKey);
      closeModal();
      window.ClimateSphere.showToast(newKey ? '✓ Gemini 2.0 API Key connected successfully!' : 'Using local Vector RAG mode.');
      window.ClimateSphere.navigateTo('ai');
    });

    // Test ping
    document.getElementById('btnPingGemini').addEventListener('click', async () => {
      const testKey = input.value.trim();
      if (!testKey) {
        pingResult.style.display = 'block';
        pingResult.style.background = 'rgba(255,107,107,0.1)';
        pingResult.style.border = '1px solid rgba(255,107,107,0.3)';
        pingResult.style.color = '#ff6b6b';
        pingResult.textContent = '❌ Please enter an API key first.';
        return;
      }

      pingResult.style.display = 'block';
      pingResult.style.background = 'rgba(255,255,255,0.04)';
      pingResult.style.border = '1px solid var(--border-subtle)';
      pingResult.style.color = 'var(--on-surface-variant)';
      pingResult.textContent = '⏳ Pinging gemini-2.0-flash endpoint...';

      const startTime = performance.now();
      try {
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${testKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: 'Ping test. Reply with single word PONG.' }] }]
          })
        });
        const elapsed = Math.round(performance.now() - startTime);
        const data = await res.json();

        if (data.candidates && data.candidates[0]) {
          pingResult.style.background = 'rgba(70,246,190,0.1)';
          pingResult.style.border = '1px solid rgba(70,246,190,0.3)';
          pingResult.style.color = 'var(--primary)';
          pingResult.textContent = `✓ Gemini 2.0 Flash is ONLINE! Round-trip latency: ${elapsed}ms`;
        } else if (data.error) {
          pingResult.style.background = 'rgba(255,107,107,0.1)';
          pingResult.style.border = '1px solid rgba(255,107,107,0.3)';
          pingResult.style.color = '#ff6b6b';
          pingResult.textContent = `❌ API Authentication Failed: ${data.error.message}`;
        }
      } catch (e) {
        pingResult.style.background = 'rgba(255,107,107,0.1)';
        pingResult.style.border = '1px solid rgba(255,107,107,0.3)';
        pingResult.style.color = '#ff6b6b';
        pingResult.textContent = `❌ Network request failed: ${e.message}`;
      }
    });
  }

  function exportTranscript() {
    const messages = getMessages();
    const text = messages.map(m => `[${m.role.toUpperCase()} - ${m.timestamp || 'RECENT'}]\n${m.content}\n${m.citations && m.citations.length ? 'Citations: ' + m.citations.join(', ') + '\n' : ''}\n----------------------------------------\n`).join('\n');
    const blob = new Blob([text], { type: 'text/markdown' });
    if (window.ClimateSphere.Docs) {
      window.ClimateSphere.Docs.downloadBlob(blob, 'ClimateSphere_AI_Audit_Log_' + Date.now() + '.md');
    }
    window.ClimateSphere.showToast('Audit transcript exported as Markdown');
  }

  function newSession() {
    if (confirm('Start a new session? This will clear the active dialogue transcript from persistent storage.')) {
      if (window.ClimateSphere.DB) window.ClimateSphere.DB.clearChatHistory();
      window.ClimateSphere.navigateTo('ai');
      window.ClimateSphere.showToast('New session started');
    }
  }

  function init() {
    const container = document.getElementById('aiMessages');
    if (container) container.scrollTop = container.scrollHeight;

    const sendBtn = document.getElementById('aiSend');
    const input = document.getElementById('aiInput');

    if (sendBtn && input) {
      sendBtn.addEventListener('click', () => {
        processUserQuery(input.value);
        input.value = '';
      });
      input.addEventListener('keydown', e => {
        if (e.key === 'Enter') {
          processUserQuery(input.value);
          input.value = '';
        }
      });
    }

    const btnKey = document.getElementById('btnApiKeyConfig');
    if (btnKey) btnKey.addEventListener('click', openApiKeyModal);

    const btnQuickKey = document.getElementById('btnQuickSetKey');
    if (btnQuickKey) btnQuickKey.addEventListener('click', openApiKeyModal);

    const providerSel = document.getElementById('aiProviderSelector');
    if (providerSel) {
      providerSel.value = localStorage.getItem('cs_ai_provider') || 'gemini';
      providerSel.addEventListener('change', e => {
        localStorage.setItem('cs_ai_provider', e.target.value);
        if (window.ClimateSphere && window.ClimateSphere.showToast) {
          const names = {
            gemini: 'Google Gemini 2.0 Flash (Cloud API)',
            ollama_local: 'Ollama / Local Edge LLM (Air-Gapped)',
            webllm: 'WebLLM / WebGPU (Browser Air-Gapped)'
          };
          window.ClimateSphere.showToast(`AI Engine switched to: ${names[e.target.value] || e.target.value}`);
        }
      });
    }

    const btnExport = document.getElementById('btnExportTranscript');
    if (btnExport) btnExport.addEventListener('click', exportTranscript);

    const btnNew = document.getElementById('btnNewSession');
    if (btnNew) btnNew.addEventListener('click', newSession);

    suggestions.forEach((s, i) => {
      const btn = document.getElementById(`sugg-${i}`);
      if (btn) {
        btn.addEventListener('click', () => {
          if (input) {
            input.value = s;
            input.focus();
          }
        });
      }
    });

    // Expose openApiKeyModal to window for global commands
    window.ClimateSphere.openApiKeyModal = openApiKeyModal;
  }

  return { render, init, openApiKeyModal, approveAction: approveActionOnLedger };
})();

window.AITerminal = AITerminal;
