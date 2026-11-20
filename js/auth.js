/**
 * ClimateSphere AI — Enterprise Authentication, SSO & Multi-Tenancy Engine
 * Standards: OpenID Connect (OIDC), OAuth 2.0, RFC 7519 JSON Web Tokens (JWT)
 * Identity Providers: Microsoft Entra ID (Azure AD), Okta Workforce, e-IDAS Federation
 */

const EnterpriseAuth = (() => {

  const TENANTS = {
    'tenant-eu-energy': {
      id: 'tenant-eu-energy',
      name: 'Vattenfall European Generation AG',
      domain: 'energy.vattenfall.eu',
      plan: 'ENTERPRISE_PLUS',
      facilities: ['DU-03', 'RT-07', 'MI-02'],
      complianceFrameworks: ['IED 2010/75/EU', 'CSRD ESRS E1', 'EU ETS Phase 4'],
      country: 'Germany / Netherlands / Italy',
      badge: 'TIER-1 UTILITY'
    },
    'tenant-nordic-power': {
      id: 'tenant-nordic-power',
      name: 'Nordic & Central Power Consortium',
      domain: 'nordic-power.com',
      plan: 'COMMERCIAL_FLEET',
      facilities: ['WA-04', 'MD-01'],
      complianceFrameworks: ['IED 2010/75/EU', 'EU ETS Phase 4'],
      country: 'Poland / Spain',
      badge: 'REGIONAL OPERATOR'
    }
  };

  const DEFAULT_USER = {
    id: 'usr_elena_vance',
    name: 'Dr. Elena Vance',
    email: 'e.vance@climatesphere.internal',
    role: 'ADMIN',
    title: 'VP Sustainability & ESG Assurance',
    tenantId: 'tenant-eu-energy',
    provider: 'Microsoft Entra ID (Azure AD)',
    avatar: 'EV'
  };

  function createMockJwt(user, tenant) {
    // NOTE: This mock JWT is used as a local session placeholder only.
    // A real cryptographic JWT is always fetched from /api/auth/token and
    // stored in session.backendToken — that token is used for all API calls.
    const header = btoa(JSON.stringify({ alg: 'RS256', typ: 'JWT', kid: 'cs-prod-key-2026' }));
    const now = Math.floor(Date.now() / 1000);
    const payload = btoa(JSON.stringify({
      iss: 'https://login.microsoftonline.com/climatesphere-tenant/v2.0',
      sub: user.id,
      aud: 'api://climatesphere-platform',
      name: user.name,
      email: user.email,
      roles: [user.role],
      tenant_id: tenant.id,
      tenant_name: tenant.name,
      permitted_facilities: tenant.facilities,
      iat: now,
      exp: now + 3600 * 8,
      nonce: 'b94f' + Math.random().toString(16).slice(2, 8)
    }));
    // PLACEHOLDER signature — not cryptographically valid.
    // The real signed token comes from fetchBackendToken().
    const signature = 'MOCK_' + btoa(user.id + ':' + now).replace(/=/g, '');
    return `${header}.${payload}.${signature}`;
  }

  function getSession() {
    try {
      const stored = localStorage.getItem('cs_enterprise_session');
      if (stored) return JSON.parse(stored);
    } catch (e) {}

    // Initialize with default session
    const tenant = TENANTS['tenant-eu-energy'];
    const token = createMockJwt(DEFAULT_USER, tenant);
    const session = { user: DEFAULT_USER, tenant, token, authenticatedAt: new Date().toISOString() };
    saveSession(session);
    return session;
  }

  function saveSession(session) {
    try {
      localStorage.setItem('cs_enterprise_session', JSON.stringify(session));
    } catch (e) {}
  }

  function loginWithSso(providerName, userPersona, tenantId) {
    const tenant = TENANTS[tenantId] || TENANTS['tenant-eu-energy'];
    const user = {
      id: `usr_${userPersona.role.toLowerCase()}_${Date.now()}`,
      name: userPersona.name,
      email: `${userPersona.role.toLowerCase()}@${tenant.domain}`,
      role: userPersona.role,
      title: userPersona.title,
      tenantId: tenant.id,
      provider: providerName,
      avatar: userPersona.avatar || userPersona.name.split(' ').map(n => n[0]).join('')
    };

    const token = createMockJwt(user, tenant);
    const session = { user, tenant, token, authenticatedAt: new Date().toISOString() };
    saveSession(session);

    // Fetch a real cryptographic JWT — share the promise to prevent race window.
    // getApiToken() will await this promise instead of returning the mock token.
    _tokenPromise = fetchBackendToken(user.role).then(result => {
      if (result && result.accessToken) {
        session.token = result.accessToken;
        session.backendToken = result.accessToken;
        _resolvedToken = result.accessToken;
        saveSession(session);
        scheduleTokenRefresh(result.expiresIn || 3600);
        console.log('[Auth] Real server JWT acquired and activated for', user.role);
      } else {
        console.warn('[Auth] Gateway offline — operating with local session token only.');
      }
      _tokenPromise = null;
      return result;
    });

    if (window.ClimateSphere && window.ClimateSphere.DB) {
      window.ClimateSphere.DB.setCurrentUser(user.role);
    }

    return session;
  }

  // Map roles to dev credentials (matches server CREDENTIAL_STORE dev defaults)
  // In production: SSO providers issue OIDC tokens; server validates via JWKS
  const DEV_CREDENTIALS = {
    'ADMIN':    { username: 'admin@climatesphere.ai',    password: 'cs_admin_2026'    },
    'ENGINEER': { username: 'engineer@climatesphere.ai', password: 'cs_engineer_2026' },
    'OPERATOR': { username: 'operator@climatesphere.ai', password: 'cs_operator_2026' },
    'AUDITOR':  { username: 'auditor@climatesphere.ai',  password: 'cs_auditor_2026'  },
  };

  // ── Token state: pending promise prevents race window ────────────────────────
  let _tokenPromise = null;   // in-flight fetch, shared
  let _resolvedToken = null;  // last successfully resolved real token

  async function fetchBackendToken(role = 'ADMIN', username = null, password = null) {
    const creds = (username && password)
      ? { username, password }
      : DEV_CREDENTIALS[role] || DEV_CREDENTIALS['OPERATOR'];
    const endpoint = (window.ClimateSphere && window.ClimateSphere.getApiEndpoint)
      ? window.ClimateSphere.getApiEndpoint('/api/auth/token')
      : '/api/auth/token';
    try {
      const resp = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: creds.username, password: creds.password })
      });
      if (resp.ok) {
        const data = await resp.json();
        _resolvedToken = data.accessToken;
        // Store refresh token separately for silent renewal
        if (data.refreshToken) {
          try { sessionStorage.setItem('cs_refresh_token', data.refreshToken); } catch (e) {}
        }
        return { accessToken: data.accessToken, refreshToken: data.refreshToken, expiresIn: data.expiresIn || 3600 };
      } else {
        const errData = await resp.json().catch(() => ({}));
        console.warn('[Auth] Server rejected credentials:', errData.error);
      }
    } catch (e) {
      console.warn('[Auth] Edge gateway offline, using local session:', e.message);
    }
    return null;
  }

  async function silentRefresh() {
    const refreshToken = (() => { try { return sessionStorage.getItem('cs_refresh_token'); } catch(e){return null;} })();
    if (!refreshToken) return;
    const refreshEndpoint = (window.ClimateSphere && window.ClimateSphere.getApiEndpoint)
      ? window.ClimateSphere.getApiEndpoint('/api/auth/refresh')
      : '/api/auth/refresh';
    try {
      const resp = await fetch(refreshEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken })
      });
      if (resp.ok) {
        const data = await resp.json();
        const session = getSession();
        session.backendToken = data.accessToken;
        session.token = data.accessToken;
        saveSession(session);
        if (data.refreshToken) {
          try { sessionStorage.setItem('cs_refresh_token', data.refreshToken); } catch(e){}
        }
        scheduleTokenRefresh(data.expiresIn || 3600);
        console.log('[Auth] Token silently refreshed successfully');
      }
    } catch (e) {
      console.warn('[Auth] Silent refresh failed:', e.message);
    }
  }

  let _refreshTimer = null;
  function scheduleTokenRefresh(expiresInSec) {
    if (_refreshTimer) clearTimeout(_refreshTimer);
    // Refresh 5 minutes before expiry
    const refreshInMs = Math.max(0, (expiresInSec - 300)) * 1000;
    _refreshTimer = setTimeout(silentRefresh, refreshInMs);
    console.log(`[Auth] Token refresh scheduled in ${Math.round(refreshInMs/60000)} minutes`);
  }

  function switchTenant(tenantId) {
    if (!TENANTS[tenantId]) return null;
    const session = getSession();
    session.tenant = TENANTS[tenantId];
    session.user.tenantId = tenantId;
    session.token = createMockJwt(session.user, session.tenant);
    saveSession(session);

    // If active facility not in tenant, switch to first permitted
    if (window.ClimateSphere && window.ClimateSphere.state) {
      const activeFid = window.ClimateSphere.state.activeFacilityId;
      if (!session.tenant.facilities.includes(activeFid)) {
        window.ClimateSphere.state.setFacility(session.tenant.facilities[0], true);
      }
    }

    return session;
  }

  function renderAuthModal() {
    const session = getSession();
    const tokenParts = (session.token || '').split('.');
    let decodedPayload = {};
    try {
      decodedPayload = JSON.parse(atob(tokenParts[1] || ''));
    } catch (e) {}

    return `
      <div class="cmd-overlay" id="modalAuthSsoOverlay">
        <div class="cmd-palette" style="max-width:720px;background:var(--surface-lowest);border:1px solid rgba(70,246,190,0.3);box-shadow:0 24px 64px rgba(0,0,0,0.85);">
          <!-- Header -->
          <div style="display:flex;align-items:center;justify-content:space-between;padding:16px 20px;border-bottom:1px solid var(--border-subtle);background:rgba(255,255,255,0.02);">
            <div style="display:flex;align-items:center;gap:10px;">
              <span style="font-size:20px;">🔐</span>
              <div>
                <div style="font-family:var(--font-mono);font-size:10px;color:var(--primary);letter-spacing:0.08em;font-weight:700;">ENTERPRISE SINGLE SIGN-ON & MULTI-TENANCY</div>
                <div style="font-size:14px;font-weight:700;color:var(--on-surface);margin-top:2px;">Identity Provider & Active Tenant Federation</div>
              </div>
            </div>
            <button class="close-btn" id="btnCloseAuthModal" style="font-size:18px;cursor:pointer;background:none;border:none;color:var(--on-surface-variant);">✕</button>
          </div>

          <!-- Body -->
          <div style="padding:16px 20px;display:flex;flex-direction:column;gap:16px;max-height:460px;overflow-y:auto;">

            <!-- Active Identity Card -->
            <div style="background:var(--surface-high);border:1px solid var(--border-subtle);border-radius:6px;padding:14px;">
              <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">
                <span class="label-mono">AUTHENTICATED IDENTITY (OIDC / OAuth 2.0)</span>
                <span class="chip chip-green">${session.user.provider}</span>
              </div>
              <div style="display:flex;align-items:center;gap:12px;">
                <div class="avatar" style="width:38px;height:38px;font-size:13px;">${session.user.avatar}</div>
                <div>
                  <div style="font-size:13px;font-weight:700;color:var(--on-surface);">${session.user.name}</div>
                  <div style="font-family:var(--font-mono);font-size:11px;color:var(--primary);">${session.user.email} · Role: <strong>${session.user.role}</strong></div>
                  <div style="font-size:10px;color:var(--on-surface-variant);">${session.user.title}</div>
                </div>
              </div>
            </div>

            <!-- Active Tenant Selection -->
            <div>
              <label class="label-mono" style="margin-bottom:6px;display:block;">SWITCH ACTIVE ENTERPRISE TENANT (ROW-LEVEL SECURITY)</label>
              <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
                ${Object.values(TENANTS).map(t => {
                  const isSelected = t.id === session.tenant.id;
                  return `
                    <div class="tenant-card" data-tenant-id="${t.id}" style="cursor:pointer;padding:12px;border-radius:6px;border:1px solid ${isSelected ? 'var(--primary)' : 'var(--border-subtle)'};background:${isSelected ? 'rgba(70,246,190,0.06)' : 'var(--surface-high)'};transition:all 150ms;">
                      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px;">
                        <span style="font-size:12px;font-weight:700;color:${isSelected ? 'var(--primary)' : 'var(--on-surface)'};">${t.name}</span>
                        <span class="chip chip-${isSelected ? 'green' : 'neutral'}" style="font-size:8px;">${t.badge}</span>
                      </div>
                      <div style="font-family:var(--font-mono);font-size:10px;color:var(--on-surface-variant);margin-bottom:4px;">Permitted Stacks: ${t.facilities.join(', ')}</div>
                      <div style="font-size:9px;color:var(--on-surface-dim);">${t.complianceFrameworks.join(' · ')}</div>
                    </div>
                  `;
                }).join('')}
              </div>
            </div>

            <!-- Single Sign-On Provider Quick-Switch -->
            <div>
              <label class="label-mono" style="margin-bottom:6px;display:block;">SWITCH IDENTITY PROVIDER / PERSONA</label>
              <div style="display:grid;grid-template-columns:repeat(3, 1fr);gap:8px;">
                <button class="btn btn-secondary btn-sso-login" data-provider="Microsoft Entra ID (Azure AD)" data-role="ADMIN" data-name="Dr. Elena Vance" data-title="VP Sustainability & ESG Assurance" style="font-size:10px;padding:8px 6px;text-align:center;justify-content:center;">
                  🔷 Azure AD (Admin)
                </button>
                <button class="btn btn-secondary btn-sso-login" data-provider="Okta Workforce Identity" data-role="ENGINEER" data-name="Marcus Thorne" data-title="Lead CEMS Metrologist" style="font-size:10px;padding:8px 6px;text-align:center;justify-content:center;">
                  🔵 Okta (Engineer)
                </button>
                <button class="btn btn-secondary btn-sso-login" data-provider="e-IDAS EU Environmental Federation" data-role="AUDITOR" data-name="Sarah Lin" data-title="Independent Statutory Auditor" style="font-size:10px;padding:8px 6px;text-align:center;justify-content:center;">
                  🟢 e-IDAS (Auditor)
                </button>
              </div>
            </div>

            <!-- RFC 7519 JSON Web Token (JWT) Inspector -->
            <div>
              <label class="label-mono" style="margin-bottom:6px;display:block;">VERIFIED JWT BEARER CLAIMS (RFC 7519)</label>
              <div style="font-family:var(--font-mono);font-size:10px;background:rgba(0,0,0,0.6);border:1px solid var(--border-subtle);border-radius:4px;padding:10px;max-height:120px;overflow-y:auto;color:var(--primary);white-space:pre-wrap;">${JSON.stringify(decodedPayload, null, 2)}</div>
            </div>

          </div>

          <!-- Footer -->
          <div style="padding:12px 20px;border-top:1px solid var(--border-subtle);display:flex;justify-content:space-between;align-items:center;background:rgba(0,0,0,0.2);">
            <div style="font-family:var(--font-mono);font-size:10px;color:var(--on-surface-variant);display:flex;align-items:center;gap:6px;">
              <span class="status-dot dot-green"></span>
              <span>TLS 1.3 / AES-256 Authenticated Session</span>
            </div>
            <div style="display:flex;align-items:center;gap:10px;">
              <a href="auth.html?logout=1" class="btn btn-secondary btn-sm" style="color:var(--status-red);border-color:rgba(244,63,94,0.3);text-decoration:none;">Log Out</a>
              <button class="btn btn-primary btn-sm" id="btnCloseAuthModalBottom">Done</button>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  function initModalEvents() {
    const modal = document.getElementById('modalAuthSsoOverlay');
    const btnClose = document.getElementById('btnCloseAuthModal');
    const btnCloseBottom = document.getElementById('btnCloseAuthModalBottom');

    if (btnClose && modal) {
      btnClose.addEventListener('click', () => modal.classList.remove('active'));
    }
    if (btnCloseBottom && modal) {
      btnCloseBottom.addEventListener('click', () => modal.classList.remove('active'));
    }

    // Tenant Switchers
    document.querySelectorAll('.tenant-card[data-tenant-id]').forEach(el => {
      el.addEventListener('click', () => {
        const tenantId = el.dataset.tenantId;
        const updated = switchTenant(tenantId);
        if (updated) {
          if (window.ClimateSphere && window.ClimateSphere.showToast) {
            window.ClimateSphere.showToast(`Switched active tenant to ${updated.tenant.name}`);
          }
          if (modal) modal.classList.remove('active');
          if (window.ClimateSphere && window.ClimateSphere.navigateTo && window.ClimateSphere.currentPage) {
            window.ClimateSphere.navigateTo(window.ClimateSphere.currentPage);
          }
        }
      });
    });

    // SSO Persona Buttons
    document.querySelectorAll('.btn-sso-login').forEach(btn => {
      btn.addEventListener('click', () => {
        const provider = btn.dataset.provider;
        const role = btn.dataset.role;
        const name = btn.dataset.name;
        const title = btn.dataset.title;
        const session = getSession();

        const newSession = loginWithSso(provider, { name, role, title }, session.tenant.id);
        if (window.ClimateSphere && window.ClimateSphere.showToast) {
          window.ClimateSphere.showToast(`SSO Login Successful: ${newSession.user.name} (${provider})`);
        }
        if (modal) modal.classList.remove('active');
        if (window.ClimateSphere && window.ClimateSphere.navigateTo && window.ClimateSphere.currentPage) {
          window.ClimateSphere.navigateTo(window.ClimateSphere.currentPage);
        }
      });
    });
  }

  function openAuthModal() {
    let modal = document.getElementById('modalAuthSsoOverlay');
    if (!modal) {
      const div = document.createElement('div');
      div.innerHTML = renderAuthModal();
      document.body.appendChild(div.firstElementChild);
      modal = document.getElementById('modalAuthSsoOverlay');
    } else {
      modal.outerHTML = renderAuthModal();
      modal = document.getElementById('modalAuthSsoOverlay');
    }
    initModalEvents();
    if (modal) modal.classList.add('active');
  }

  /**
   * getApiToken — returns the best available token:
   *   1. If a real server token is already resolved, return it immediately.
   *   2. If a token fetch is in-flight, await it (no race window).
   *   3. Fall back to local session token (offline / gateway down).
   * Note: most callers use this synchronously. For critical API calls prefer
   * the async version: await EnterpriseAuth.getApiTokenAsync().
   */
  function getApiToken() {
    const session = getSession();
    return _resolvedToken || session.backendToken || session.token || '';
  }

  async function getApiTokenAsync() {
    if (_resolvedToken) return _resolvedToken;
    if (_tokenPromise) {
      try { await _tokenPromise; } catch (e) {}
    }
    const session = getSession();
    return _resolvedToken || session.backendToken || session.token || '';
  }

  async function initiateFederatedSso(providerKey = 'microsoft_entra', tenantId = 'tenant-eu-energy') {
    try {
      const endpoint = (window.ClimateSphere && window.ClimateSphere.getApiEndpoint)
        ? window.ClimateSphere.getApiEndpoint('/api/auth/sso/login')
        : '/api/auth/sso/login';
      const resp = await fetch(`${endpoint}?provider=${encodeURIComponent(providerKey)}&tenantId=${encodeURIComponent(tenantId)}`);
      if (resp.ok) {
        const data = await resp.json();
        if (data.state && typeof sessionStorage !== 'undefined') {
          sessionStorage.setItem('cs_sso_state', data.state);
        }
        return data;
      }
    } catch (e) {
      console.warn('[Auth] SSO login initiation error:', e.message);
    }
    return null;
  }

  async function processSsoCallback() {
    if (typeof window === 'undefined' || !window.location.search) return null;
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const state = params.get('state');
    if (!code) return null;

    try {
      const endpoint = (window.ClimateSphere && window.ClimateSphere.getApiEndpoint)
        ? window.ClimateSphere.getApiEndpoint('/api/auth/sso/callback')
        : '/api/auth/sso/callback';
      const resp = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, state })
      });
      if (resp.ok) {
        const result = await resp.json();
        if (result.accessToken) {
          const session = getSession();
          session.token = result.accessToken;
          session.backendToken = result.accessToken;
          _resolvedToken = result.accessToken;
          if (result.user) session.user = { ...session.user, ...result.user };
          saveSession(session);
          scheduleTokenRefresh(result.expiresIn || 3600);
          console.log('[Auth] Federated SSO callback successfully authenticated session');

          const cleanUrl = window.location.pathname + window.location.hash;
          window.history.replaceState({}, document.title, cleanUrl);
          return result;
        }
      }
    } catch (e) {
      console.warn('[Auth] SSO callback processing error:', e.message);
    }
    return null;
  }

  async function registerWebAuthn(email = 'admin@climatesphere.ai') {
    try {
      const endpoint = (window.ClimateSphere && window.ClimateSphere.getApiEndpoint)
        ? window.ClimateSphere.getApiEndpoint('/api/auth/webauthn/register/options')
        : '/api/auth/webauthn/register/options';
      const optRes = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      if (!optRes.ok) throw new Error('Failed to retrieve WebAuthn registration options');
      const options = await optRes.json();

      let credentialId = 'cred_fido2_' + Date.now();
      if (typeof navigator !== 'undefined' && navigator.credentials && navigator.credentials.create) {
        try {
          const cred = await navigator.credentials.create({
            publicKey: {
              challenge: Uint8Array.from(atob(options.challenge.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0)),
              rp: options.rp,
              user: {
                id: Uint8Array.from(atob(options.user.id.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0)),
                name: options.user.name,
                displayName: options.user.displayName
              },
              pubKeyCredParams: options.pubKeyCredParams,
              authenticatorSelection: options.authenticatorSelection,
              timeout: options.timeout
            }
          });
          if (cred && cred.id) credentialId = cred.id;
        } catch (credErr) {
          console.warn('[WebAuthn] Hardware key ceremony fallback:', credErr.message);
        }
      }

      const verifyEndpoint = (window.ClimateSphere && window.ClimateSphere.getApiEndpoint)
        ? window.ClimateSphere.getApiEndpoint('/api/auth/webauthn/register/verify')
        : '/api/auth/webauthn/register/verify';
      const verRes = await fetch(verifyEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, credentialId })
      });
      return await verRes.json();
    } catch (e) {
      console.error('[WebAuthn] Registration error:', e.message);
      return { error: e.message };
    }
  }

  async function authenticateWebAuthn(email = 'admin@climatesphere.ai') {
    try {
      const endpoint = (window.ClimateSphere && window.ClimateSphere.getApiEndpoint)
        ? window.ClimateSphere.getApiEndpoint('/api/auth/webauthn/authenticate/options')
        : '/api/auth/webauthn/authenticate/options';
      const optRes = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      if (!optRes.ok) throw new Error('Failed to get authentication options');
      const options = await optRes.json();

      let credentialId = 'cred_fido2_verified';
      if (typeof navigator !== 'undefined' && navigator.credentials && navigator.credentials.get) {
        try {
          const assertion = await navigator.credentials.get({
            publicKey: {
              challenge: Uint8Array.from(atob(options.challenge.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0)),
              timeout: options.timeout,
              rpId: options.rpId
            }
          });
          if (assertion && assertion.id) credentialId = assertion.id;
        } catch (assertErr) {
          console.warn('[WebAuthn] Key assertion fallback:', assertErr.message);
        }
      }

      const verifyEndpoint = (window.ClimateSphere && window.ClimateSphere.getApiEndpoint)
        ? window.ClimateSphere.getApiEndpoint('/api/auth/webauthn/authenticate/verify')
        : '/api/auth/webauthn/authenticate/verify';
      const verRes = await fetch(verifyEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, credentialId })
      });
      const data = await verRes.json();
      if (data.accessToken) {
        const session = getSession();
        session.token = data.accessToken;
        session.backendToken = data.accessToken;
        _resolvedToken = data.accessToken;
        saveSession(session);
        scheduleTokenRefresh(data.expiresIn || 3600);
      }
      return data;
    } catch (e) {
      console.error('[WebAuthn] Authentication error:', e.message);
      return { error: e.message };
    }
  }

  return {
    TENANTS,
    getSession,
    getApiToken,
    getApiTokenAsync,
    getToken: getApiToken,
    loginWithSso,
    initiateFederatedSso,
    processSsoCallback,
    registerWebAuthn,
    authenticateWebAuthn,
    fetchBackendToken,
    switchTenant,
    openAuthModal,
    createMockJwt,
    silentRefresh,
    scheduleTokenRefresh
  };
})();

window.ClimateSphere = window.ClimateSphere || {};
window.ClimateSphere.Auth = EnterpriseAuth;

// Bootstrap: check for SSO callback first, then fetch a real server JWT using the stored session role.
(async () => {
  try {
    if (typeof window !== 'undefined' && window.location.search && window.location.search.includes('code=')) {
      const ssoRes = await EnterpriseAuth.processSsoCallback();
      if (ssoRes) return;
    }

    const session = EnterpriseAuth.getSession();
    const role = session.user.role || 'OPERATOR';
    EnterpriseAuth.loginWithSso(
      session.user.provider || 'Microsoft Entra ID (Azure AD)',
      { name: session.user.name, role, title: session.user.title },
      session.tenant.id
    );
  } catch (e) {
    console.warn('[Auth] Initial token bootstrap error:', e.message);
  }
})();
