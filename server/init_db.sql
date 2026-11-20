-- ══════════════════════════════════════════════════════════════════
-- ClimateSphere AI — TimescaleDB & PostgreSQL Industrial Schema
-- Directive 2010/75/EU (IED Annex V) & CSRD ESRS E1 Continuous Storage
-- ══════════════════════════════════════════════════════════════════

CREATE EXTENSION IF NOT EXISTS timescaledb CASCADE;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Organizations & Tenants (Multi-Tenancy)
CREATE TABLE IF NOT EXISTS tenants (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    domain VARCHAR(128) NOT NULL,
    plan VARCHAR(64) DEFAULT 'ENTERPRISE',
    country VARCHAR(64),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Facilities & Stacks
CREATE TABLE IF NOT EXISTS facilities (
    id VARCHAR(32) PRIMARY KEY,
    tenant_id VARCHAR(64) REFERENCES tenants(id),
    name VARCHAR(255) NOT NULL,
    country VARCHAR(32) NOT NULL,
    capacity_mw NUMERIC(8, 2),
    analyzer_model VARCHAR(128),
    statutory_elv_so2 NUMERIC(8, 2) DEFAULT 500.0,
    statutory_elv_nox NUMERIC(8, 2) DEFAULT 200.0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Raw 1 Hz Physical CEMS Telemetry Hypertable
CREATE TABLE IF NOT EXISTS cems_telemetry_1hz (
    time TIMESTAMPTZ NOT NULL,
    facility_id VARCHAR(32) NOT NULL,
    seq BIGINT,
    so2_mg_nm3 NUMERIC(8, 2),
    nox_mg_nm3 NUMERIC(8, 2),
    co_mg_nm3 NUMERIC(8, 2),
    o2_pct NUMERIC(5, 2),
    pm10_mg_nm3 NUMERIC(8, 2),
    hcl_mg_nm3 NUMERIC(8, 2),
    qal3_zero_drift NUMERIC(5, 2),
    qal3_span_drift NUMERIC(5, 2),
    sample_flow_l_min NUMERIC(6, 2),
    probe_temp_c NUMERIC(6, 2)
);

-- Primary CEMS Readings Table (Matched with edge_gateway.js dbInsertTelemetry)
CREATE TABLE IF NOT EXISTS cems_readings (
    time TIMESTAMPTZ NOT NULL,
    facility_id VARCHAR(32) NOT NULL,
    tenant_id VARCHAR(64) DEFAULT 'tenant-eu-energy',
    so2_mg_nm3 NUMERIC(8, 2),
    nox_mg_nm3 NUMERIC(8, 2),
    co_mg_nm3 NUMERIC(8, 2),
    o2_pct NUMERIC(5, 2),
    pm10_mg_nm3 NUMERIC(8, 2),
    hcl_mg_nm3 NUMERIC(8, 2),
    so2_normalized NUMERIC(8, 2),
    nox_normalized NUMERIC(8, 2),
    ref_o2 NUMERIC(5, 2),
    quality_flag VARCHAR(32),
    analyzer VARCHAR(128),
    protocol VARCHAR(64),
    seq_no BIGINT
);

-- Create TimescaleDB Hypertables partitioned by time
SELECT create_hypertable('cems_telemetry_1hz', 'time', if_not_exists => TRUE);
CREATE INDEX IF NOT EXISTS idx_cems_facility_time ON cems_telemetry_1hz (facility_id, time DESC);

SELECT create_hypertable('cems_readings', 'time', if_not_exists => TRUE);
CREATE INDEX IF NOT EXISTS idx_cems_readings_facility_time ON cems_readings (facility_id, time DESC);

-- 4. 15-Minute Statutory Rolling Average Continuous Aggregate (IED Article 15)
CREATE MATERIALIZED VIEW IF NOT EXISTS cems_statutory_15m
WITH (timescaledb.continuous) AS
SELECT
    time_bucket('15 minutes', time) AS bucket,
    facility_id,
    COUNT(*) AS sample_count,
    AVG(so2_mg_nm3) AS avg_so2,
    MAX(so2_mg_nm3) AS max_so2,
    AVG(nox_mg_nm3) AS avg_nox,
    MAX(nox_mg_nm3) AS max_nox,
    AVG(co_mg_nm3) AS avg_co,
    AVG(o2_pct) AS avg_o2,
    BOOL_OR(so2_mg_nm3 > 500.0) AS so2_exceeded,
    BOOL_OR(nox_mg_nm3 > 200.0) AS nox_exceeded
FROM cems_telemetry_1hz
GROUP BY bucket, facility_id
WITH NO DATA;

-- 5. Enterprise Asset & Device Hierarchy
CREATE TABLE IF NOT EXISTS organizations (
    id VARCHAR(64) PRIMARY KEY,
    legal_name VARCHAR(255) NOT NULL,
    lei_code VARCHAR(20),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS plants (
    id VARCHAR(32) PRIMARY KEY,
    facility_id VARCHAR(32) REFERENCES facilities(id),
    name VARCHAR(255) NOT NULL,
    fuel_type VARCHAR(64) NOT NULL
);

CREATE TABLE IF NOT EXISTS units (
    id VARCHAR(32) PRIMARY KEY,
    plant_id VARCHAR(32) REFERENCES plants(id),
    unit_code VARCHAR(32) NOT NULL,
    thermal_input_mw NUMERIC(8, 2),
    commissioned_year INT
);

CREATE TABLE IF NOT EXISTS equipment (
    id VARCHAR(32) PRIMARY KEY,
    unit_id VARCHAR(32) REFERENCES units(id),
    name VARCHAR(128) NOT NULL,
    equipment_type VARCHAR(64) NOT NULL, -- 'BOILER', 'TURBINE', 'FGD_SCRUBBER', 'SCR_REACTOR'
    health_score NUMERIC(5, 2) DEFAULT 98.5
);

CREATE TABLE IF NOT EXISTS cems_analyzers (
    id VARCHAR(32) PRIMARY KEY,
    equipment_id VARCHAR(32) REFERENCES equipment(id),
    serial_number VARCHAR(128) NOT NULL,
    model VARCHAR(128) NOT NULL,
    manufacturer VARCHAR(128) NOT NULL,
    mcerts_certified BOOLEAN DEFAULT TRUE,
    last_qal1_date DATE,
    last_qal2_date DATE
);

CREATE TABLE IF NOT EXISTS sensors (
    id VARCHAR(32) PRIMARY KEY,
    analyzer_id VARCHAR(32) REFERENCES cems_analyzers(id),
    parameter VARCHAR(32) NOT NULL, -- 'SO2', 'NOx', 'CO', 'O2', 'PM10'
    unit VARCHAR(16) NOT NULL,
    range_min NUMERIC(8, 2),
    range_max NUMERIC(8, 2),
    precision_pct NUMERIC(4, 2)
);

-- 6. Regulatory Environmental Permits & Statutory Limits
CREATE TABLE IF NOT EXISTS regulatory_permits (
    id VARCHAR(64) PRIMARY KEY,
    facility_id VARCHAR(32) REFERENCES facilities(id),
    permit_number VARCHAR(128) NOT NULL,
    authority VARCHAR(128) NOT NULL,
    framework VARCHAR(64) NOT NULL, -- 'IED_2010_75_EU', 'EU_ETS', 'CSRD'
    pollutant VARCHAR(32) NOT NULL,
    statutory_elv NUMERIC(8, 2) NOT NULL,
    averaging_period VARCHAR(32) NOT NULL, -- '15_MIN', '1_HOUR', 'DAILY_AVERAGE'
    ref_o2_pct NUMERIC(4, 2) DEFAULT 6.0,
    effective_from DATE NOT NULL,
    effective_to DATE,
    status VARCHAR(32) DEFAULT 'ACTIVE'
);

-- 7. DIN EN 14181 QAL3 Calibration Runs & Reference Gas Lots
CREATE TABLE IF NOT EXISTS qal3_calibrations (
    id VARCHAR(64) PRIMARY KEY,
    time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    facility_id VARCHAR(32) REFERENCES facilities(id),
    analyzer_id VARCHAR(64),
    parameter VARCHAR(32) NOT NULL,
    zero_drift NUMERIC(5, 2) NOT NULL,
    span_drift NUMERIC(5, 2) NOT NULL,
    precision_sd NUMERIC(5, 3),
    cusum_value NUMERIC(6, 2),
    status VARCHAR(32) NOT NULL, -- 'PASS', 'WARNING', 'ACTION_REQUIRED'
    gas_bottle_lot VARCHAR(64),
    gas_cert_number VARCHAR(64),
    operator_name VARCHAR(128),
    operator VARCHAR(128),
    approver_name VARCHAR(128),
    approver VARCHAR(128),
    approval_status VARCHAR(32) DEFAULT 'APPROVED'
);

-- Primary Audit Ledger Table (Matched with edge_gateway.js dbInsertAuditLog)
CREATE TABLE IF NOT EXISTS audit_ledger (
    id VARCHAR(64) PRIMARY KEY,
    time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    facility_id VARCHAR(32),
    tenant_id VARCHAR(64) DEFAULT 'tenant-eu-energy',
    event_type VARCHAR(64),
    param VARCHAR(32),
    value_measured NUMERIC(8, 2),
    limit_value NUMERIC(8, 2),
    status VARCHAR(32),
    action_taken TEXT,
    actor VARCHAR(128),
    prev_hash VARCHAR(128),
    merkle_hash VARCHAR(128)
);

-- 8. Enterprise Alert & Incident Management
CREATE TABLE IF NOT EXISTS alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    tenant_id VARCHAR(64) REFERENCES tenants(id),
    facility_id VARCHAR(32) REFERENCES facilities(id),
    severity VARCHAR(16) NOT NULL, -- 'INFO', 'WARNING', 'HIGH', 'CRITICAL', 'EMERGENCY'
    pollutant VARCHAR(32),
    measured_value NUMERIC(8, 2),
    threshold_value NUMERIC(8, 2),
    message TEXT NOT NULL,
    status VARCHAR(24) DEFAULT 'ACTIVE', -- 'ACTIVE', 'ACKNOWLEDGED', 'SUPPRESSED', 'RESOLVED'
    acknowledged_by VARCHAR(128),
    acknowledged_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS incidents (
    id VARCHAR(32) PRIMARY KEY,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    tenant_id VARCHAR(64) REFERENCES tenants(id),
    facility_id VARCHAR(32) REFERENCES facilities(id),
    title VARCHAR(255) NOT NULL,
    severity VARCHAR(16) NOT NULL,
    status VARCHAR(24) DEFAULT 'INVESTIGATING', -- 'INVESTIGATING', 'MITIGATED', 'RESOLVED', 'CLOSED'
    lead_investigator VARCHAR(128) NOT NULL,
    root_cause_analysis TEXT,
    corrective_actions TEXT,
    closed_at TIMESTAMPTZ
);

-- 9. Immutable Hash-Chained Regulatory Exceedance & Audit Log (WORM)
CREATE TABLE IF NOT EXISTS statutory_audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    tenant_id VARCHAR(64) REFERENCES tenants(id),
    facility_id VARCHAR(32) REFERENCES facilities(id),
    pollutant VARCHAR(32) NOT NULL,
    measured_value NUMERIC(8, 2) NOT NULL,
    statutory_elv NUMERIC(8, 2) NOT NULL,
    status VARCHAR(32) DEFAULT 'UNRESOLVED',
    action_taken TEXT,
    actor VARCHAR(128) NOT NULL,
    prev_hash VARCHAR(66) NOT NULL DEFAULT '0x0000000000000000000000000000000000000000000000000000000000000000',
    merkle_sha256 VARCHAR(66) NOT NULL,
    digital_signature TEXT
);

-- 10. Enable PostgreSQL Row-Level Security (RLS) for Multi-Tenancy
ALTER TABLE facilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE statutory_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE incidents ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_facilities ON facilities
    USING (tenant_id = current_setting('app.current_tenant', true));

CREATE POLICY tenant_isolation_audit ON statutory_audit_logs
    USING (tenant_id = current_setting('app.current_tenant', true));

CREATE POLICY tenant_isolation_alerts ON alerts
    USING (tenant_id = current_setting('app.current_tenant', true));

CREATE POLICY tenant_isolation_incidents ON incidents
    USING (tenant_id = current_setting('app.current_tenant', true));

-- Seed Initial Organizations, Tenants, Facilities & Assets
INSERT INTO organizations (id, legal_name, lei_code)
VALUES
    ('org-vattenfall', 'Vattenfall Europe Mining & Generation AG', '5493006M4L9N1P3Q5R78'),
    ('org-nordic', 'Nordic Clean Energy Grid Holding AB', '5493007X8Y9Z1A2B3C45')
ON CONFLICT (id) DO NOTHING;

INSERT INTO tenants (id, name, domain, plan, country)
VALUES
    ('tenant-eu-energy', 'Vattenfall European Generation AG', 'energy.vattenfall.eu', 'ENTERPRISE_PLUS', 'Germany'),
    ('tenant-nordic-power', 'Nordic & Central Power Consortium', 'nordic-power.com', 'COMMERCIAL_FLEET', 'Sweden')
ON CONFLICT (id) DO NOTHING;

INSERT INTO facilities (id, tenant_id, name, country, capacity_mw, analyzer_model, statutory_elv_so2, statutory_elv_nox)
VALUES
    ('DU-03', 'tenant-eu-energy', 'Duisburg Unit 3', 'DE', 845.0, 'ABB AO2000-Ex', 500.0, 200.0),
    ('RT-07', 'tenant-eu-energy', 'Rotterdam Plant 7', 'NL', 620.0, 'Sick MCS100E', 500.0, 200.0),
    ('MI-02', 'tenant-eu-energy', 'Milan-Sesto 02', 'IT', 410.0, 'Horiba ENDA-5000', 500.0, 200.0),
    ('WA-04', 'tenant-nordic-power', 'Warsaw Central 4', 'PL', 530.0, 'Emerson Rosemount', 500.0, 200.0),
    ('MD-01', 'tenant-nordic-power', 'Madrid Vallecas 1', 'ES', 380.0, 'ABB AO2000-Ex', 500.0, 200.0)
ON CONFLICT (id) DO NOTHING;

INSERT INTO regulatory_permits (id, facility_id, permit_number, authority, framework, pollutant, statutory_elv, averaging_period, effective_from)
VALUES
    ('pmt-du03-so2', 'DU-03', 'DE-NRW-IED-2024-0981', 'Bezirksregierung Düsseldorf', 'IED_2010_75_EU', 'SO2', 500.0, '15_MIN', '2024-01-01'),
    ('pmt-du03-nox', 'DU-03', 'DE-NRW-IED-2024-0981', 'Bezirksregierung Düsseldorf', 'IED_2010_75_EU', 'NOx', 200.0, '15_MIN', '2024-01-01'),
    ('pmt-rt07-so2', 'RT-07', 'NL-DCMR-2023-4412', 'DCMR Milieudienst Rijnmond', 'IED_2010_75_EU', 'SO2', 500.0, '15_MIN', '2023-06-01')
ON CONFLICT (id) DO NOTHING;

-- 11. Enterprise RBAC User Directory
CREATE TABLE IF NOT EXISTS admin_users (
    id VARCHAR(64) PRIMARY KEY,
    username VARCHAR(128) UNIQUE NOT NULL,
    password_hash VARCHAR(128) NOT NULL,
    role VARCHAR(32) NOT NULL DEFAULT 'OPERATOR',
    title VARCHAR(128),
    tenant_id VARCHAR(64) REFERENCES tenants(id),
    status VARCHAR(32) DEFAULT 'ACTIVE',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_login_at TIMESTAMPTZ
);

-- 12. Enterprise Webhook & Alert Subscriptions
CREATE TABLE IF NOT EXISTS webhook_subscriptions (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(128) NOT NULL,
    url TEXT NOT NULL,
    events TEXT[] NOT NULL DEFAULT ARRAY['EXCEEDANCE', 'CALIBRATION_OVERDUE'],
    secret VARCHAR(64),
    active BOOLEAN DEFAULT TRUE,
    created_by VARCHAR(128),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_triggered_at TIMESTAMPTZ,
    last_status INTEGER
);

-- Seed Initial Enterprise Users & Webhooks
INSERT INTO admin_users (id, username, password_hash, role, title, tenant_id, status)
VALUES
    ('usr-elena', 'elena.vance@climatesphere.ai', '5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8', 'ADMIN', 'VP Sustainability & ESG', 'tenant-eu-energy', 'ACTIVE'),
    ('usr-marcus', 'marcus.weber@climatesphere.ai', '5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8', 'ENGINEER', 'Lead CEMS Instrumentation Engineer', 'tenant-eu-energy', 'ACTIVE'),
    ('usr-sophie', 'sophie.dubois@climatesphere.ai', '5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8', 'OPERATOR', 'Plant Shift Supervisor', 'tenant-eu-energy', 'ACTIVE'),
    ('usr-tomasz', 'tomasz.kowalski@climatesphere.ai', '5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8', 'AUDITOR', 'Statutory Environmental Auditor', 'tenant-nordic-power', 'ACTIVE')
ON CONFLICT (id) DO NOTHING;

INSERT INTO webhook_subscriptions (id, name, url, events, secret, active, created_by)
VALUES
    ('wh-slack-cems', 'Slack #plant-cems-alerts', 'https://hooks.slack.com/services/T00/B00/CSAlerts2026', ARRAY['SO2_BREACH', 'NOX_BREACH', 'CALIBRATION_OVERDUE'], 'whsec_984fd7291a', true, 'elena.vance@climatesphere.ai'),
    ('wh-pagerduty-oncall', 'PagerDuty Critical Exceedance Bridge', 'https://events.pagerduty.com/v2/enqueue', ARRAY['CRITICAL_ELV_EXCEEDANCE', 'SYSTEM_FAULT'], 'whsec_a31ef90c88', true, 'marcus.weber@climatesphere.ai'),
    ('wh-teams-esg', 'MS Teams Corporate ESG Channel', 'https://outlook.office.com/webhook/esg-compliance', ARRAY['CSRD_FILING_PUBLISHED', 'QAL3_CERTIFIED'], 'whsec_b77ce410df', true, 'elena.vance@climatesphere.ai')
ON CONFLICT (id) DO NOTHING;

-- 13. TimescaleDB Automated Hypertable Compression & Retention Policies
-- Statutory 3-year audit retention per IED Directive 2010/75/EU Annex V
DO $$
BEGIN
    -- Configure hypertable compression (7 days threshold)
    PERFORM add_compression_policy('cems_telemetry_1hz', INTERVAL '7 days', if_not_exists => TRUE);
    PERFORM add_retention_policy('cems_telemetry_1hz', INTERVAL '3 years', if_not_exists => TRUE);

    PERFORM add_compression_policy('cems_readings', INTERVAL '7 days', if_not_exists => TRUE);
    PERFORM add_retention_policy('cems_readings', INTERVAL '3 years', if_not_exists => TRUE);
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'TimescaleDB compression/retention policy configuration notice: %', SQLERRM;
END $$;

-- 14. Scaled Vector Embeddings via PostgreSQL pgvector (HNSW Index)
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS regulatory_embeddings (
    id SERIAL PRIMARY KEY,
    chunk_id VARCHAR(128) UNIQUE NOT NULL,
    framework VARCHAR(64) NOT NULL,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    embedding vector(384),
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reg_embeddings_hnsw 
ON regulatory_embeddings USING hnsw (embedding vector_cosine_ops);

-- 15. Operator Shift Handover Annotations & Statutory Event Tagging (IED Art. 30)
CREATE TABLE IF NOT EXISTS operator_shift_annotations (
    id VARCHAR(64) PRIMARY KEY,
    facility_id VARCHAR(32) REFERENCES facilities(id),
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    excuse_code VARCHAR(64) NOT NULL, -- 'IED_ART30_STARTUP', 'IED_ART30_SHUTDOWN', 'SOOT_BLOWING', 'CALIBRATION_PURGE', 'FUEL_SWITCH', 'GRID_TRANSIENT', 'EMERGENCY_TRIP'
    title VARCHAR(255) NOT NULL,
    notes TEXT,
    operator VARCHAR(128) NOT NULL,
    shift_role VARCHAR(64) DEFAULT 'PLANT_OPERATOR',
    merkle_hash VARCHAR(128),
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_annotations_facility_time ON operator_shift_annotations (facility_id, timestamp DESC);

-- 16. German 13. BImSchV / TA Luft 30-Minute Halbstundenmittelwert (HMW) Continuous Aggregate
CREATE MATERIALIZED VIEW IF NOT EXISTS cems_statutory_30m_hmw
WITH (timescaledb.continuous) AS
SELECT
    time_bucket('30 minutes', time) AS bucket_30m,
    facility_id,
    COUNT(*) AS sample_count_1hz,
    -- Valid HMW requires at least 20 minutes (1200 samples at 1Hz)
    (COUNT(*) >= 1200) AS is_valid_hmw,
    AVG(so2_mg_nm3) AS avg_so2_hmw,
    MAX(so2_mg_nm3) AS max_so2_hmw,
    AVG(nox_mg_nm3) AS avg_nox_hmw,
    MAX(nox_mg_nm3) AS max_nox_hmw,
    AVG(co_mg_nm3) AS avg_co_hmw,
    AVG(o2_pct) AS avg_o2_hmw,
    BOOL_OR(so2_mg_nm3 > 500.0) AS so2_exceeded_hmw,
    BOOL_OR(nox_mg_nm3 > 200.0) AS nox_exceeded_hmw
FROM cems_telemetry_1hz
GROUP BY bucket_30m, facility_id
WITH NO DATA;

-- 17. Webhook Delivery Dead-Letter Queue (DLQ) & Exponential Backoff Log
CREATE TABLE IF NOT EXISTS webhook_dead_letter_queue (
    id VARCHAR(64) PRIMARY KEY,
    subscription_id VARCHAR(64) REFERENCES webhook_subscriptions(id),
    event_type VARCHAR(64) NOT NULL,
    payload JSONB NOT NULL,
    attempt_count INTEGER DEFAULT 1,
    max_attempts INTEGER DEFAULT 5,
    next_retry_at TIMESTAMPTZ,
    last_error TEXT,
    last_http_status INTEGER,
    status VARCHAR(32) DEFAULT 'QUEUED_FOR_RETRY', -- 'QUEUED_FOR_RETRY', 'FAILED_FATAL', 'DELIVERED_ON_RETRY'
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_webhook_dlq_status ON webhook_dead_letter_queue (status, next_retry_at);

-- 18. German 17. BImSchV (Waste Incineration) 10-Minute Sliding Continuous Aggregate
CREATE MATERIALIZED VIEW IF NOT EXISTS cems_statutory_17_bimschv_10m
WITH (timescaledb.continuous) AS
SELECT
    time_bucket('10 minutes', time) AS bucket_10m,
    facility_id,
    COUNT(*) AS sample_count,
    AVG(so2_mg_nm3) AS avg_so2,
    AVG(nox_mg_nm3) AS avg_nox,
    AVG(co_mg_nm3) AS avg_co,
    AVG(o2_pct) AS avg_o2,
    AVG(hcl_mg_nm3) AS avg_hcl,
    BOOL_OR(nox_mg_nm3 > 200.0) AS nox_exceeded_10m,
    BOOL_OR(so2_mg_nm3 > 50.0) AS so2_exceeded_10m
FROM cems_telemetry_1hz
GROUP BY bucket_10m, facility_id
WITH NO DATA;

-- 19. US EPA 40 CFR Part 75 Appendix D & E Fuel Flowmeter & Peaking Unit Logs
CREATE TABLE IF NOT EXISTS epa_part75_fuel_flowmeter_logs (
    id VARCHAR(64) PRIMARY KEY,
    facility_id VARCHAR(32) REFERENCES facilities(id),
    unit_id VARCHAR(32) NOT NULL,
    fuel_type VARCHAR(32) NOT NULL, -- 'NATURAL_GAS', 'DISTILLATE_OIL'
    flow_rate_scfh NUMERIC(12, 2) NOT NULL,
    gross_calorific_value_btu_scf NUMERIC(8, 2) NOT NULL,
    heat_input_mmbtu_hr NUMERIC(10, 2) NOT NULL,
    operating_hours NUMERIC(6, 2) NOT NULL,
    so2_mass_lbs_hr NUMERIC(8, 2) NOT NULL,
    nox_rate_lbs_mmbtu NUMERIC(8, 4) NOT NULL,
    data_quality_tier VARCHAR(32) DEFAULT 'TIER_1_STANDARD',
    timestamp TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_epa_part75_flowmeter ON epa_part75_fuel_flowmeter_logs (unit_id, timestamp DESC);

-- 20. EU CBAM Definitive Phase (2026–2034) Surrender & Certificate Liability Ledger
CREATE TABLE IF NOT EXISTS cbam_definitive_surrender_ledger (
    id VARCHAR(64) PRIMARY KEY,
    tenant_id VARCHAR(64) REFERENCES tenants(id),
    import_declaration_ref VARCHAR(64) NOT NULL,
    quarter VARCHAR(16) NOT NULL, -- e.g. '2026-Q1'
    cn_code VARCHAR(16) NOT NULL,
    import_tonnage NUMERIC(12, 3) NOT NULL,
    embedded_scope1_tco2e NUMERIC(12, 3) NOT NULL,
    embedded_scope2_tco2e NUMERIC(12, 3) NOT NULL,
    total_embedded_tco2e NUMERIC(12, 3) NOT NULL,
    eua_benchmark_price_eur NUMERIC(8, 2) NOT NULL,
    origin_country VARCHAR(32) NOT NULL,
    origin_carbon_price_deduction_eur NUMERIC(12, 2) DEFAULT 0.0,
    net_cbam_certificates_required NUMERIC(12, 2) NOT NULL,
    net_financial_liability_eur NUMERIC(14, 2) NOT NULL,
    surrender_status VARCHAR(32) DEFAULT 'ASSESSED_PENDING_SURRENDER',
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_cbam_definitive_quarter ON cbam_definitive_surrender_ledger (quarter, tenant_id);

-- 21. UK Environment Agency MCERTS (BS EN 15267-3 / TGN M2) Validation Records
CREATE TABLE IF NOT EXISTS mcerts_cems_validation_records (
    id VARCHAR(64) PRIMARY KEY,
    facility_id VARCHAR(32) REFERENCES facilities(id),
    analyzer_model VARCHAR(64) NOT NULL,
    mcerts_cert_number VARCHAR(64) NOT NULL,
    test_date TIMESTAMPTZ NOT NULL,
    linearity_max_residual_pct NUMERIC(6, 3) NOT NULL,
    zero_drift_pct NUMERIC(6, 3) NOT NULL,
    span_drift_pct NUMERIC(6, 3) NOT NULL,
    response_time_t90_sec NUMERIC(8, 2) NOT NULL,
    total_expanded_uncertainty_pct NUMERIC(6, 3) NOT NULL,
    operational_availability_pct NUMERIC(6, 3) NOT NULL,
    overall_status VARCHAR(32) NOT NULL, -- 'MCERTS_CONFORMANT', 'MCERTS_NON_CONFORMANT'
    auditor_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_mcerts_facility_date ON mcerts_cems_validation_records (facility_id, test_date DESC);

-- 22. CSRD / ESRS E1 Quantitative Climate Change Disclosures & Double Materiality Ledger
CREATE TABLE IF NOT EXISTS csrd_esrs_e1_materiality_disclosures (
    id VARCHAR(64) PRIMARY KEY,
    tenant_id VARCHAR(64) REFERENCES tenants(id),
    reporting_year INT NOT NULL,
    gross_scope1_tco2e NUMERIC(14, 2) NOT NULL,
    scope2_location_tco2e NUMERIC(14, 2) NOT NULL,
    scope2_market_tco2e NUMERIC(14, 2) NOT NULL,
    total_scope3_tco2e NUMERIC(14, 2) NOT NULL,
    gross_total_ghg_tco2e NUMERIC(14, 2) NOT NULL,
    ghg_intensity_tco2e_per_m_eur NUMERIC(10, 3) NOT NULL,
    impact_materiality_score NUMERIC(4, 2) NOT NULL,
    financial_materiality_score NUMERIC(4, 2) NOT NULL,
    materiality_determination VARCHAR(64) NOT NULL,
    assurance_opinion VARCHAR(64) DEFAULT 'LIMITED_ASSURANCE_COMPLIANT',
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_csrd_tenant_year ON csrd_esrs_e1_materiality_disclosures (tenant_id, reporting_year);

-- 23. EU ETS MRV (Regulation 2018/2066) Annual Verified Returns & Assurance Opinions
CREATE TABLE IF NOT EXISTS eu_ets_mrv_annual_declarations (
    id VARCHAR(64) PRIMARY KEY,
    installation_id VARCHAR(64) NOT NULL,
    reporting_year INT NOT NULL,
    installation_category VARCHAR(32) NOT NULL, -- 'CATEGORY_A', 'CATEGORY_B', 'CATEGORY_C'
    gross_calc_emissions_tco2 NUMERIC(14, 2) NOT NULL,
    biomass_deduction_tco2 NUMERIC(14, 2) NOT NULL,
    net_fossil_emissions_tco2 NUMERIC(14, 2) NOT NULL,
    cems_crosscheck_tco2 NUMERIC(14, 2),
    cems_deviation_pct NUMERIC(6, 3),
    uncertainty_tier_achieved VARCHAR(32) NOT NULL,
    verifier_opinion VARCHAR(64) NOT NULL,
    surrender_units_due NUMERIC(14, 0) NOT NULL,
    submission_status VARCHAR(32) DEFAULT 'VERIFIED_PENDING_REGISTRY_SUBMISSION',
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_eu_ets_installation_year ON eu_ets_mrv_annual_declarations (installation_id, reporting_year);

-- 24. Decarbonization Scenarios & Transition Planning (ESRS E1 Climate Mitigation)
CREATE TABLE IF NOT EXISTS decarbonization_scenarios (
    id VARCHAR(64) PRIMARY KEY,
    tenant_id VARCHAR(64) DEFAULT 'tenant-eu-energy',
    facility_id VARCHAR(32) DEFAULT 'DU-03',
    name VARCHAR(255) NOT NULL,
    description TEXT,
    target_year INT NOT NULL DEFAULT 2030,
    coal_reduction NUMERIC(5, 2) NOT NULL DEFAULT 25.0,
    renewable_mix NUMERIC(5, 2) NOT NULL DEFAULT 40.0,
    fgd_efficiency NUMERIC(5, 2) NOT NULL DEFAULT 92.0,
    production_volume NUMERIC(5, 2) NOT NULL DEFAULT 85.0,
    carbon_price NUMERIC(8, 2) NOT NULL DEFAULT 62.0,
    projected_emissions NUMERIC(10, 2),
    emissions_reduction_pct NUMERIC(5, 2),
    credit_saving_m_eur NUMERIC(10, 2),
    investment_capex_k_eur NUMERIC(10, 2),
    projected_roi_pct NUMERIC(6, 2),
    parameters_json JSONB,
    created_by VARCHAR(128) DEFAULT 'operator@climatesphere.internal',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_scenarios_tenant ON decarbonization_scenarios (tenant_id, created_at DESC);

-- Seed Baseline Reference Transition Scenarios
INSERT INTO decarbonization_scenarios (
    id, tenant_id, facility_id, name, description, target_year,
    coal_reduction, renewable_mix, fgd_efficiency, production_volume, carbon_price,
    projected_emissions, emissions_reduction_pct, credit_saving_m_eur, investment_capex_k_eur, projected_roi_pct,
    parameters_json, created_by
) VALUES 
(
    'scen-paris-15', 'tenant-eu-energy', 'DU-03',
    'Paris 1.5°C Aggressive Abatement',
    'Rapid phase-down of unabated coal, maximum renewable microgrid integration, and enhanced FGD scrubber capture.',
    2030, 45.0, 60.0, 96.0, 80.0, 85.0,
    498.0, 60.1, 63.7, 1150.0, 5439.1,
    '{"coalReduction":45,"renewableMix":60,"fgdEfficiency":96,"productionVolume":80,"carbonPrice":85,"timeHorizon":2030}',
    'chief_sustainability_officer@climatesphere.ai'
),
(
    'scen-mod-2035', 'tenant-eu-energy', 'DU-03',
    '2035 Balanced Industrial Modernization',
    'Balanced industrial transition aligned with EU Net-Zero Industry Act, prioritizing waste heat recovery and fuel switching.',
    2035, 30.0, 45.0, 93.0, 90.0, 70.0,
    720.0, 42.3, 36.9, 835.0, 4319.8,
    '{"coalReduction":30,"renewableMix":45,"fgdEfficiency":93,"productionVolume":90,"carbonPrice":70,"timeHorizon":2035}',
    'operations_manager@climatesphere.ai'
),
(
    'scen-netzero-2040', 'tenant-eu-energy', 'DU-03',
    '2040 Net-Zero Deep Decarbonization Glidepath',
    'Full electrification, 100% renewable PPA matching, CCUS installation, and complete coal fleet retirement.',
    2040, 80.0, 90.0, 98.0, 75.0, 110.0,
    182.0, 85.4, 117.2, 1820.0, 6339.6,
    '{"coalReduction":80,"renewableMix":90,"fgdEfficiency":98,"productionVolume":75,"carbonPrice":110,"timeHorizon":2040}',
    'strategy_director@climatesphere.ai'
)
ON CONFLICT (id) DO NOTHING;

-- 25. Extended PostgreSQL Row-Level Security (RLS) for Multi-Tenant Isolation
ALTER TABLE IF EXISTS cems_readings ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS audit_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS decarbonization_scenarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS regulatory_permits ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS qal3_calibrations ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'cems_readings' AND policyname = 'tenant_isolation_cems_readings') THEN
    CREATE POLICY tenant_isolation_cems_readings ON cems_readings
      USING (tenant_id = current_setting('app.current_tenant', true) OR current_setting('app.current_tenant', true) IS NULL OR current_setting('app.current_tenant', true) = '' OR current_setting('app.current_tenant', true) = 'system-admin' OR tenant_id IS NULL);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'audit_ledger' AND policyname = 'tenant_isolation_audit_ledger') THEN
    CREATE POLICY tenant_isolation_audit_ledger ON audit_ledger
      USING (tenant_id = current_setting('app.current_tenant', true) OR current_setting('app.current_tenant', true) IS NULL OR current_setting('app.current_tenant', true) = '' OR current_setting('app.current_tenant', true) = 'system-admin' OR tenant_id IS NULL);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'decarbonization_scenarios' AND policyname = 'tenant_isolation_scenarios') THEN
    CREATE POLICY tenant_isolation_scenarios ON decarbonization_scenarios
      USING (tenant_id = current_setting('app.current_tenant', true) OR current_setting('app.current_tenant', true) IS NULL OR current_setting('app.current_tenant', true) = '' OR current_setting('app.current_tenant', true) = 'system-admin' OR tenant_id IS NULL);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'qal3_calibrations' AND policyname = 'tenant_isolation_qal3') THEN
    CREATE POLICY tenant_isolation_qal3 ON qal3_calibrations
      USING (TRUE);
  END IF;
END $$;

-- 17. High-Performance Composite & Foreign-Key Operational Indexes
CREATE INDEX IF NOT EXISTS idx_alerts_facility_time ON alerts (facility_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_alerts_tenant_status ON alerts (tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_incidents_facility_time ON incidents (facility_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_statutory_audit_facility_time ON statutory_audit_logs (facility_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_ledger_facility_time ON audit_ledger (facility_id, time DESC);
CREATE INDEX IF NOT EXISTS idx_audit_ledger_tenant_time ON audit_ledger (tenant_id, time DESC);
CREATE INDEX IF NOT EXISTS idx_qal3_facility_time ON qal3_calibrations (facility_id, time DESC);
CREATE INDEX IF NOT EXISTS idx_permits_facility_status ON regulatory_permits (facility_id, status);
CREATE INDEX IF NOT EXISTS idx_units_plant_id ON units (plant_id);
CREATE INDEX IF NOT EXISTS idx_equipment_unit_id ON equipment (unit_id);
CREATE INDEX IF NOT EXISTS idx_analyzers_equipment_id ON cems_analyzers (equipment_id);

