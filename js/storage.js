/**
 * ClimateSphere AI — Persistent Database & Local Storage Layer
 * Local TimescaleDB / PostgreSQL replica for time-series telemetry frames,
 * audit events, scenario state, AI chat history, and Role-Based Access Control (RBAC).
 */

(function(window) {
  'use strict';

  const DB_PREFIX = 'climatesphere_v2_';
  const IDB_NAME = 'ClimateSphereTimescaleDB';
  const IDB_VERSION = 1;

  let idb = null;

  // Initialize IndexedDB
  function initIDB() {
    if (!window.indexedDB) return;
    const req = window.indexedDB.open(IDB_NAME, IDB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains('telemetry_series')) {
        const store = db.createObjectStore('telemetry_series', { keyPath: 'id', autoIncrement: true });
        store.createIndex('facilityId', 'facilityId', { unique: false });
        store.createIndex('timestamp', 'timestamp', { unique: false });
      }
      if (!db.objectStoreNames.contains('audit_events')) {
        db.createObjectStore('audit_events', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('offline_mutations')) {
        db.createObjectStore('offline_mutations', { keyPath: 'id' });
      }
    };
    req.onsuccess = (e) => {
      idb = e.target.result;
      console.log('[ClimateSphere DB] TimescaleDB/PostgreSQL local replica initialized.');
    };
    req.onerror = (e) => console.warn('[ClimateSphere DB] IndexedDB init failed', e);
  }

  initIDB();

  const Storage = {
    // ── Key-Value Helpers ──────────────────────────────────────────
    get(key, defaultValue = null) {
      try {
        const item = localStorage.getItem(DB_PREFIX + key);
        return item ? JSON.parse(item) : defaultValue;
      } catch (e) {
        console.warn('[Storage] Error reading', key, e);
        return defaultValue;
      }
    },

    set(key, value) {
      try {
        localStorage.setItem(DB_PREFIX + key, JSON.stringify(value));
        return true;
      } catch (e) {
        console.error('[Storage] Error writing', key, e);
        return false;
      }
    },

    remove(key) {
      try {
        localStorage.removeItem(DB_PREFIX + key);
      } catch (e) {}
    },

    // ── Time-Series Telemetry (TimescaleDB Replica) ─────────────────
    saveTelemetryFrame(packet) {
      if (!idb) return;
      try {
        const tx = idb.transaction(['telemetry_series'], 'readwrite');
        const store = tx.objectStore('telemetry_series');
        store.add({
          facilityId: packet.facilityId || packet.facility,
          timestamp: packet.timestamp || new Date().toISOString(),
          seq: packet.seq,
          channels: packet.channels,
          diagnostics: packet.diagnostics,
        });
      } catch (e) {}
    },

    async getRecentTelemetry(facilityId = 'DU-03', limit = 30) {
      return new Promise((resolve) => {
        if (!idb) { resolve([]); return; }
        try {
          const tx = idb.transaction(['telemetry_series'], 'readonly');
          const store = tx.objectStore('telemetry_series');
          const req = store.getAll();
          req.onsuccess = () => {
            const all = req.result || [];
            const filtered = all.filter(r => r.facilityId === facilityId).slice(-limit);
            resolve(filtered);
          };
          req.onerror = () => resolve([]);
        } catch (e) { resolve([]); }
      });
    },

    getStorageMetrics() {
      return {
        idbStatus: idb ? 'ONLINE (IndexedDB Active)' : 'INITIALIZING',
        storageEngine: 'TimescaleDB / PostgreSQL Client Replica',
        tables: ['telemetry_series', 'audit_events', 'scenarios', 'chat_transcripts'],
        userCount: Object.keys(this.ROLES).length,
        logsCount: this.getExceedanceLogs().length,
      };
    },

    // ── RBAC & User Profile ────────────────────────────────────────
    ROLES: {
      vp: {
        id: 'vp',
        name: 'Dr. Elena Vance',
        title: 'VP Sustainability & ESG',
        org: 'Global Executive Council',
        avatar: 'EV',
        badge: 'ADMIN',
        permissions: ['read_all', 'export_esg', 'sign_filing', 'escalate_alert', 'adjust_carbon_price', 'manage_team'],
      },
      engineer: {
        id: 'engineer',
        name: 'Thomas Becker, PE',
        title: 'Lead CEMS Instrumentation Engineer',
        org: 'Ruhr Environmental Operations',
        avatar: 'TB',
        badge: 'ENGINEER',
        permissions: ['read_all', 'calibrate_cems', 'purge_analyzer', 'log_qal3', 'export_telemetry'],
      },
      operator: {
        id: 'operator',
        name: 'Jan de Jong',
        title: 'Rotterdam Plant Operations Director',
        org: 'Industrial Site #7',
        avatar: 'JJ',
        badge: 'OPERATOR',
        permissions: ['read_telemetry', 'acknowledge_alert', 'adjust_load', 'export_cems'],
      },
      auditor: {
        id: 'auditor',
        name: 'Claire Dupont',
        title: 'Statutory ESG Auditor (PwC / DEKRA)',
        org: 'Independent Verification Body',
        avatar: 'CD',
        badge: 'AUDITOR',
        permissions: ['read_all', 'verify_hash', 'export_ixbrl', 'export_pdf', 'audit_trail'],
      },
    },

    getCurrentUser() {
      const roleId = this.get('user_role', 'vp');
      return this.ROLES[roleId] || this.ROLES.vp;
    },

    setCurrentUser(roleId) {
      if (this.ROLES[roleId]) {
        this.set('user_role', roleId);
        window.dispatchEvent(new CustomEvent('climatesphere:roleChanged', { detail: this.ROLES[roleId] }));
        return this.ROLES[roleId];
      }
      return null;
    },

    hasPermission(permission) {
      const user = this.getCurrentUser();
      return user.permissions.includes(permission);
    },

    // ── AI Configuration & Transcripts ─────────────────────────────
    getApiKey() {
      return this.get('gemini_api_key', '');
    },

    setApiKey(key) {
      this.set('gemini_api_key', (key || '').trim());
    },

    getChatHistory() {
      return this.get('chat_history', null);
    },

    setChatHistory(history) {
      this.set('chat_history', history);
    },

    clearChatHistory() {
      this.remove('chat_history');
    },

    // ── Scenario Workbench State ───────────────────────────────────
    getScenarioParams() {
      return this.get('scenario_params', {
        coalReduction: 25,
        renewableMix: 40,
        fgdEfficiency: 92,
        productionVolume: 85,
        carbonPrice: 62,
        timeHorizon: 2030,
      });
    },

    setScenarioParams(params) {
      this.set('scenario_params', params);
    },

    async getSavedScenarios() {
      const endpoint = window.ClimateSphere && typeof window.ClimateSphere.getApiEndpoint === 'function'
        ? window.ClimateSphere.getApiEndpoint('/api/scenarios')
        : '/api/scenarios';
      try {
        const res = await fetch(endpoint);
        if (res.ok) {
          const data = await res.json();
          const list = data.scenarios || [];
          this.set('saved_scenarios', list);
          return list;
        }
      } catch (err) {
        console.warn('[Storage] Remote scenario fetch failed, using local cache:', err.message);
      }
      return this.get('saved_scenarios', []);
    },

    async saveScenarioToServer(scenarioData) {
      const endpoint = window.ClimateSphere && typeof window.ClimateSphere.getApiEndpoint === 'function'
        ? window.ClimateSphere.getApiEndpoint('/api/scenarios')
        : '/api/scenarios';
      try {
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(scenarioData)
        });
        if (res.ok) {
          const data = await res.json();
          const saved = data.scenario || scenarioData;
          const cached = this.get('saved_scenarios', []);
          const idx = cached.findIndex(s => s.id === saved.id);
          if (idx >= 0) cached[idx] = saved;
          else cached.unshift(saved);
          this.set('saved_scenarios', cached);
          return saved;
        }
      } catch (err) {
        console.warn('[Storage] Remote scenario save failed, saving locally:', err.message);
      }
      const cached = this.get('saved_scenarios', []);
      cached.unshift(scenarioData);
      this.set('saved_scenarios', cached);
      return scenarioData;
    },

    async deleteScenarioFromServer(id) {
      const endpoint = window.ClimateSphere && typeof window.ClimateSphere.getApiEndpoint === 'function'
        ? window.ClimateSphere.getApiEndpoint(`/api/scenarios/${encodeURIComponent(id)}`)
        : `/api/scenarios/${encodeURIComponent(id)}`;
      try {
        await fetch(endpoint, { method: 'DELETE' });
      } catch (e) {
        console.warn('[Storage] Remote scenario delete error:', e.message);
      }
      const cached = this.get('saved_scenarios', []).filter(s => s.id !== id);
      this.set('saved_scenarios', cached);
      return true;
    },

    // ── Telemetry Exceedance Logs ──────────────────────────────────
    getExceedanceLogs() {
      return this.get('exceedance_logs', [
        { id: 'LOG-8812', timestamp: '2026-09-25T14:31:00Z', facility: 'DU-03', param: 'SO₂', value: 847, limit: 500, status: 'OPEN', acknowledgedBy: null },
        { id: 'LOG-8811', timestamp: '2026-09-25T13:45:00Z', facility: 'RT-07', param: 'NOₓ', value: 389, limit: 200, status: 'ACKNOWLEDGED', acknowledgedBy: 'Jan de Jong' },
        { id: 'LOG-8810', timestamp: '2026-09-24T09:12:00Z', facility: 'MI-02', param: 'QAL3', value: 'Overdue +10d', limit: '30d cycle', status: 'ESCALATED', acknowledgedBy: 'Thomas Becker' },
      ]);
    },

    logExceedance(entry) {
      const logs = this.getExceedanceLogs();
      logs.unshift({
        id: 'LOG-' + Math.floor(1000 + Math.random() * 9000),
        timestamp: new Date().toISOString(),
        status: 'OPEN',
        acknowledgedBy: null,
        ...entry,
      });
      if (logs.length > 50) logs.pop();
      this.set('exceedance_logs', logs);
      window.dispatchEvent(new CustomEvent('climatesphere:exceedanceLogged', { detail: entry }));
      return logs;
    },

    acknowledgeExceedance(logId) {
      const logs = this.getExceedanceLogs();
      const item = logs.find(l => l.id === logId);
      if (item) {
        item.status = 'ACKNOWLEDGED';
        item.acknowledgedBy = this.getCurrentUser().name;
        this.set('exceedance_logs', logs);
        window.dispatchEvent(new CustomEvent('climatesphere:exceedanceUpdated', { detail: item }));
      }
      return item;
    },

    // ── Offline Background Sync Mutation Queue ─────────────────────
    getPendingMutations() {
      return this.get('pending_mutations', []);
    },

    queueOfflineMutation(action, payload) {
      const queue = this.getPendingMutations();
      const mutation = {
        id: 'mut-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5),
        action,
        payload,
        queuedAt: new Date().toISOString(),
        retries: 0
      };
      queue.push(mutation);
      this.set('pending_mutations', queue);
      window.dispatchEvent(new CustomEvent('climatesphere:offlineMutationQueued', { detail: mutation }));
      console.log(`[Storage] Queued offline mutation "${action}" (Total pending: ${queue.length})`);
      return mutation;
    },

    async flushOfflineMutations() {
      const queue = this.getPendingMutations();
      if (!queue.length) return { processed: 0 };
      console.log(`[Storage] Reconnected to network. Flushing ${queue.length} offline mutations...`);
      let processed = 0;
      const remaining = [];

      for (const mut of queue) {
        try {
          if (mut.action === 'ACKNOWLEDGE_ALERT') {
            const token = window.ClimateSphere?.Auth?.getApiToken?.();
            await fetch(getApiEndpoint('/api/alerts'), {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', ...(token ? { 'Authorization': `Bearer ${token}` } : {}) },
              body: JSON.stringify(mut.payload)
            });
            processed++;
          } else if (mut.action === 'RECORD_CALIBRATION') {
            const token = window.ClimateSphere?.Auth?.getApiToken?.();
            await fetch(getApiEndpoint('/api/qal3/calibrations'), {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', ...(token ? { 'Authorization': `Bearer ${token}` } : {}) },
              body: JSON.stringify(mut.payload)
            });
            processed++;
          } else {
            processed++;
          }
        } catch (e) {
          mut.retries = (mut.retries || 0) + 1;
          remaining.push(mut);
        }
      }

      this.set('pending_mutations', remaining);
      window.dispatchEvent(new CustomEvent('climatesphere:offlineMutationsFlushed', { detail: { processed, remaining: remaining.length } }));
      return { processed, remaining: remaining.length };
    },
  };

  if (typeof window !== 'undefined') {
    window.addEventListener('online', () => {
      Storage.flushOfflineMutations().catch(() => {});
    });
  }

  function getApiEndpoint(path) {
    if (typeof window !== 'undefined' && window.location) {
      if (window.location.protocol === 'file:') return `http://localhost:8089${path}`;
      return path;
    }
    return path;
  }

  function getWsEndpoint(path = '/ws') {
    if (typeof window !== 'undefined' && window.location) {
      if (window.location.protocol === 'file:') return `ws://localhost:8089${path}`;
      const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      return `${proto}//${window.location.host}${path}`;
    }
    return `ws://localhost:8089${path}`;
  }

  function getSseEndpoint(path = '/events') {
    if (typeof window !== 'undefined' && window.location) {
      if (window.location.protocol === 'file:') return `http://localhost:8089${path}`;
      return path;
    }
    return `http://localhost:8089${path}`;
  }

  window.ClimateSphere = window.ClimateSphere || {};
  window.ClimateSphere.DB = Storage;
  window.ClimateSphere.getApiEndpoint = getApiEndpoint;
  window.ClimateSphere.getWsEndpoint = getWsEndpoint;
  window.ClimateSphere.getSseEndpoint = getSseEndpoint;

})(window);
