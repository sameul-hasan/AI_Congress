/**
 * ClimateSphere AI — Internationalization (i18n) Engine
 * Full localization support for EU multi-plant operations:
 * English (EN), German (DE), French (FR), Polish (PL), Spanish (ES)
 */

(function(root) {
  'use strict';

  const TRANSLATIONS = {
    en: {
      app_name: 'ClimateSphere',
      tagline: 'Environmental Intelligence AI',
      telemetry_live: 'TELEMETRY LIVE',
      landing_page: 'Landing Page',
      edge_gateway: 'EDGE GATEWAY',
      overview: 'Overview',
      carboniq: 'CarbonIQ',
      cems: 'CEMS Telemetry',
      climateshield: 'Climate Shield',
      energybrain: 'Energy Brain',
      emissions: 'Emissions Accounting',
      comparison: 'Hotspot Comparison',
      scenario: 'Scenario Workbench',
      ai: 'AI Terminal',
      calibration: 'Calibration / QAL3',
      compliance: 'CSRD / EPA Filing',
      admin: 'Admin & RBAC',
      webhooks: 'Webhooks & Alerts',
      today: 'Today',
      time_7d: '7D',
      time_30d: '30D',
      time_q3: 'Q3 2026',
      custom: 'Custom',
      search_placeholder: 'Search telemetry, assets…',
      active_alerts: 'ACTIVE ALERTS',
      critical_exceedance: 'CRITICAL ELV EXCEEDANCE DETECTED',
      investigate_cems: 'Investigate CEMS →',
      language: 'Language',
      select_language: 'Select Language',
      save: 'Save Changes',
      export_pdf: 'Export PDF Report',
      export_zip: 'Export ESEF XBRL ZIP',
      status: 'Status',
      facility: 'Facility',
      timestamp: 'Timestamp',
      actions: 'Actions'
    },
    de: {
      app_name: 'ClimateSphere',
      tagline: 'Umwelt-Entscheidungs-KI',
      telemetry_live: 'TELEMETRIE AKTIV',
      landing_page: 'Startseite',
      edge_gateway: 'EDGE-GATEWAY',
      overview: 'Übersicht',
      carboniq: 'CarbonIQ',
      cems: 'CEMS-Telemetrie',
      climateshield: 'Klimaschild',
      energybrain: 'Energie-Gehirn',
      emissions: 'Emissionsbilanz',
      comparison: 'Hotspot-Vergleich',
      scenario: 'Szenario-Werkbank',
      ai: 'KI-Terminal',
      calibration: 'Kalibrierung / QAL3',
      compliance: 'CSRD / UBA-Bericht',
      admin: 'Admin & RBAC',
      webhooks: 'Webhooks & Alarme',
      today: 'Heute',
      time_7d: '7 Tage',
      time_30d: '30 Tage',
      time_q3: 'Q3 2026',
      custom: 'Benutzerdefiniert',
      search_placeholder: 'Telemetrie, Anlagen suchen…',
      active_alerts: 'AKTIVE ALARME',
      critical_exceedance: 'KRITISCHE ELV-GRENZWERTÜBERSCHREITUNG',
      investigate_cems: 'CEMS prüfen →',
      language: 'Sprache',
      select_language: 'Sprache wählen',
      save: 'Änderungen speichern',
      export_pdf: 'PDF-Bericht exportieren',
      export_zip: 'ESEF-XBRL-ZIP exportieren',
      status: 'Status',
      facility: 'Anlage',
      timestamp: 'Zeitstempel',
      actions: 'Aktionen'
    },
    fr: {
      app_name: 'ClimateSphere',
      tagline: 'IA d\'Intelligence Environnementale',
      telemetry_live: 'TÉLÉMÉTRIE EN DIRECT',
      landing_page: 'Page d\'Accueil',
      edge_gateway: 'PASSERELLE EDGE',
      overview: 'Vue d\'Ensemble',
      carboniq: 'CarbonIQ',
      cems: 'Télémétrie CEMS',
      climateshield: 'Bouclier Climat',
      energybrain: 'Cerveau Énergie',
      emissions: 'Comptabilité Émissions',
      comparison: 'Comparaison des Sites',
      scenario: 'Simulateur Scénarios',
      ai: 'Terminal IA',
      calibration: 'Étalonnage / QAL3',
      compliance: 'Rapports CSRD / DREAL',
      admin: 'Admin & RBAC',
      webhooks: 'Webhooks & Alertes',
      today: 'Aujourd\'hui',
      time_7d: '7J',
      time_30d: '30J',
      time_q3: 'T3 2026',
      custom: 'Personnalisé',
      search_placeholder: 'Rechercher télémétrie, actifs…',
      active_alerts: 'ALERTES ACTIVES',
      critical_exceedance: 'DÉPASSEMENT CRITIQUE VLE DÉTECTÉ',
      investigate_cems: 'Analyser CEMS →',
      language: 'Langue',
      select_language: 'Choisir la langue',
      save: 'Enregistrer',
      export_pdf: 'Exporter Rapport PDF',
      export_zip: 'Exporter ZIP ESEF XBRL',
      status: 'Statut',
      facility: 'Installation',
      timestamp: 'Horodatage',
      actions: 'Actions'
    },
    pl: {
      app_name: 'ClimateSphere',
      tagline: 'Sztuczna Inteligencja Klimatyczna',
      telemetry_live: 'TELEMETRIA NA ŻYWO',
      landing_page: 'Strona Główna',
      edge_gateway: 'BRAMA EDGE',
      overview: 'Przegląd',
      carboniq: 'CarbonIQ',
      cems: 'Telemetria CEMS',
      climateshield: 'Tarcza Klimatyczna',
      energybrain: 'Mózg Energetyczny',
      emissions: 'Rozliczanie Emisji',
      comparison: 'Porównanie Obiektów',
      scenario: 'Pracownia Scenariuszy',
      ai: 'Terminal AI',
      calibration: 'Kalibracja / QAL3',
      compliance: 'Raportowanie CSRD / WIOŚ',
      admin: 'Admin i RBAC',
      webhooks: 'Webhooki i Alerty',
      today: 'Dzisiaj',
      time_7d: '7 Dni',
      time_30d: '30 Dni',
      time_q3: 'Q3 2026',
      custom: 'Niestandardowy',
      search_placeholder: 'Szukaj telemetrii, aktywów…',
      active_alerts: 'AKTYWNE ALERTY',
      critical_exceedance: 'WYKRYTO PRZEKROCZENIE NORMY EMISJI',
      investigate_cems: 'Zbadaj CEMS →',
      language: 'Język',
      select_language: 'Wybierz język',
      save: 'Zapisz zmiany',
      export_pdf: 'Eksportuj Raport PDF',
      export_zip: 'Eksportuj ESEF XBRL ZIP',
      status: 'Status',
      facility: 'Zakład',
      timestamp: 'Znacznik czasu',
      actions: 'Działania'
    },
    es: {
      app_name: 'ClimateSphere',
      tagline: 'IA de Inteligencia Ambiental',
      telemetry_live: 'TELEMETRÍA EN VIVO',
      landing_page: 'Página de Inicio',
      edge_gateway: 'PASARELA EDGE',
      overview: 'Visión General',
      carboniq: 'CarbonIQ',
      cems: 'Telemetría CEMS',
      climateshield: 'Escudo Climático',
      energybrain: 'Cerebro Energético',
      emissions: 'Contabilidad de Emisiones',
      comparison: 'Comparación de Puntos Críticos',
      scenario: 'Banco de Escenarios',
      ai: 'Terminal IA',
      calibration: 'Calibración / QAL3',
      compliance: 'Informes CSRD / MITECO',
      admin: 'Admin y RBAC',
      webhooks: 'Webhooks y Alertas',
      today: 'Hoy',
      time_7d: '7D',
      time_30d: '30D',
      time_q3: 'T3 2026',
      custom: 'Personalizado',
      search_placeholder: 'Buscar telemetría, activos…',
      active_alerts: 'ALERTAS ACTIVAS',
      critical_exceedance: 'EXCESO CRÍTICO DE LÍMITE DE EMISIÓN',
      investigate_cems: 'Investigar CEMS →',
      language: 'Idioma',
      select_language: 'Seleccionar idioma',
      save: 'Guardar cambios',
      export_pdf: 'Exportar Informe PDF',
      export_zip: 'Exportar ZIP ESEF XBRL',
      status: 'Estado',
      facility: 'Instalación',
      timestamp: 'Marca de tiempo',
      actions: 'Acciones'
    }
  };

  let currentLang = 'en';
  try {
    const saved = typeof localStorage !== 'undefined' ? localStorage.getItem('cs_lang') : null;
    if (saved && TRANSLATIONS[saved]) currentLang = saved;
  } catch (e) {}

  function setLanguage(lang) {
    if (!TRANSLATIONS[lang]) return;
    currentLang = lang;
    try {
      if (typeof localStorage !== 'undefined') localStorage.setItem('cs_lang', lang);
    } catch (e) {}

    updateDom();

    if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
      window.dispatchEvent(new CustomEvent('cs:language-changed', { detail: { lang } }));
    }
  }

  function getLanguage() {
    return currentLang;
  }

  function t(key, params = {}) {
    const dict = TRANSLATIONS[currentLang] || TRANSLATIONS.en;
    let text = dict[key] || TRANSLATIONS.en[key] || key;
    for (const [k, v] of Object.entries(params)) {
      text = text.replace(new RegExp(`{${k}}`, 'g'), v);
    }
    return text;
  }

  function updateDom() {
    if (typeof document === 'undefined') return;

    // Translate data-i18n text content
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      if (key) el.textContent = t(key);
    });

    // Translate navigation links
    const navItems = {
      'nav-dashboard': 'overview',
      'nav-carboniq': 'carboniq',
      'nav-cems': 'cems',
      'nav-climateshield': 'climateshield',
      'nav-energybrain': 'energybrain',
      'nav-emissions': 'emissions',
      'nav-comparison': 'comparison',
      'nav-scenario': 'scenario',
      'nav-ai': 'ai',
      'nav-calibration': 'calibration',
      'nav-compliance': 'compliance',
      'nav-admin': 'admin',
      'nav-webhooks': 'webhooks'
    };

    for (const [id, key] of Object.entries(navItems)) {
      const el = document.getElementById(id);
      if (el) {
        const span = el.querySelector('span:not(.nav-badge)');
        if (span) span.textContent = t(key);
      }
    }

    // Translate search input placeholder
    const searchInput = document.getElementById('searchInput');
    if (searchInput) searchInput.setAttribute('placeholder', t('search_placeholder'));

    // Translate time range buttons
    const timeBtnMap = {
      'today': 'today',
      '7d': 'time_7d',
      '30d': 'time_30d',
      'q3': 'time_q3',
      'custom': 'custom'
    };
    document.querySelectorAll('.time-btn[data-range]').forEach(btn => {
      const range = btn.getAttribute('data-range');
      if (range && timeBtnMap[range]) btn.textContent = t(timeBtnMap[range]);
    });
  }

  const I18nEngine = {
    TRANSLATIONS,
    setLanguage,
    getLanguage,
    t,
    updateDom
  };

  root.ClimateSphere = root.ClimateSphere || {};
  root.ClimateSphere.I18n = I18nEngine;

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = I18nEngine;
  }

  // Initial DOM pass when document is ready
  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => updateDom());
    } else {
      setTimeout(updateDom, 50);
    }
  }

})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this));
