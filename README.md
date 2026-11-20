# ClimateSphere AI — Enterprise Industrial Decarbonization Platform

> **Version:** 4.8.0-ENTERPRISE | **Regulatory Scope:** IED 2010/75/EU, CSRD ESRS E1, EU ETS Phase 4, DIN EN 14181

[![Node.js](https://img.shields.io/badge/Node.js-20%2B-brightgreen.svg)](https://nodejs.org)
[![TimescaleDB](https://img.shields.io/badge/TimescaleDB-2.14-blue.svg)](https://www.timescale.com)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ED.svg)](https://www.docker.com)
[![License](https://img.shields.io/badge/License-Proprietary-red.svg)](#license)

ClimateSphere AI is an industrial-grade environmental intelligence, continuous emissions monitoring (CEMS), and decarbonization decision intelligence platform built for heavy European industrial operators (power generation, chemical refining, cement, and steel manufacturing).

---

## 🏗️ System Architecture

```
                                  [ Edge Devices & Fieldbuses ]
                                     │   │               │
                            Modbus   │   │ OPC-UA        │ MQTT Sparkplug B
                            TCP/RTU  │   │ (IEC 62541)   │ (spBv1.0/EU_FLEET)
                                     ▼   ▼               ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                       ClimateSphere Edge Gateway (:8089)                    │
│                                                                             │
│  ┌───────────────────────┐  ┌───────────────────────┐  ┌──────────────────┐ │
│  │ Ingestion & Quality   │  │ DIN EN 14181 QAL3     │  │ Cryptographic    │ │
│  │ Flagging Engine       │  │ CUSUM & Drift Engine  │  │ Merkle WORM Tree │ │
│  └───────────────────────┘  └───────────────────────┘  └──────────────────┘ │
│  ┌───────────────────────┐  ┌───────────────────────┐  ┌──────────────────┐ │
│  │ Statutory Normalizer  │  │ RFC 7519 HMAC-SHA256  │  │ Gemini 2.0 Flash │ │
│  │ (EU BREF Ref O2)      │  │ Auth & Token Refresh  │  │ Regulatory Proxy │ │
│  └───────────────────────┘  └───────────────────────┘  └──────────────────┘ │
└──────────────────────┬──────────────────────┬───────────────────────────────┘
                       │                      │
       Persistent Time-Series          WebSocket (RFC 6455) & SSE
                       ▼                      ▼
┌───────────────────────────────┐      ┌──────────────────────────────────────┐
│  TimescaleDB 2.14 / PG 16     │      │   Nginx Reverse Proxy (:80 / :443)   │
│  - 15-min Continuous Rollups  │      │   - TLS 1.3 / SSL Termination        │
│  - Row-Level Security (RLS)   │      │   - DDoS Rate Limiting               │
│  - JSON Fallback Storage      │      │   - Static SPA Asset Serving         │
└───────────────────────────────┘      └──────────────────┬───────────────────┘
                                                          │
                                                          ▼
                                       ┌──────────────────────────────────────┐
                                       │   ClimateSphere Web SPA Application  │
                                       │   (Vanilla JS + Vite, PWA Offline)   │
                                       └──────────────────────────────────────┘
```

---

## ⚡ Key Capabilities

### 1. Statutory CEMS Compliance (IED 2010/75/EU & EU BREF)
- **Reference Oxygen Normalization:** Enforces standard oxygen normalization per fuel type ($6\%$ for solid fuel, $3\%$ for natural gas, $11\%$ for waste incineration) according to the statutory formula:
  $$C_{\text{norm}} = C_{\text{meas}} \times \frac{21 - O_{2,\text{ref}}}{21 - O_{2,\text{meas}}}$$
- **15-Minute Statutory Rollups:** Rolling continuous average calculations matching IED Article 15(4) ELV compliance limits.
- **Article 18 Written Notification Generator:** Generates automated 24-hour statutory breach notices for competent environmental authorities.

### 2. Quality Assurance of Automated Measuring Systems (DIN EN 14181)
- **QAL3 Control Charts:** Evaluates zero and span drift against the statutory $\pm 2.0\%$ full-scale action limit using Shewhart and CUSUM (cumulative sum) statistical process control algorithms.
- **Audit Lineage:** Calibration records link gas bottle lot numbers, CRM certificates (e.g., DEKRA, TÜV SÜD), and operator identity.

### 3. Tamper-Evident Regulatory Audit Ledger (Merkle Tree WORM)
- **Cryptographic Chaining:** Every mutation (calibration, exceedance, permit modification) is hashed with SHA-256 and chained to the previous record (`prevHash`).
- **Binary Merkle Root Verification:** Computes the complete cryptographic Merkle root across all ledger entries via `/api/audit/verify`, providing auditors with mathematical proof of ledger integrity.

### 4. Enterprise Industrial Security Architecture
- **RFC 7519 HMAC-SHA256 JWT:** Authenticates edge telemetry and API callers with granular RBAC permissions (`ADMIN`, `ENGINEER`, `OPERATOR`, `AUDITOR`).
- **Silent Token Renewal:** Silent session refresh via `POST /api/auth/refresh` ensures uninterrupted operations during long monitoring shifts.
- **Instant Token Revocation:** `POST /api/auth/revoke` terminates compromised tokens with automatic 10-minute TTL cleanup.
- **Stream Protection:** 1 MB payload limits with stream draining (`413 Payload Too Large`) and configurable CORS origin controls.

### 5. Multi-Protocol Fieldbus & Telemetry Ingestion
- **Modbus TCP/RTU:** Binary fieldbus register driver (`/api/protocols/modbus/read`) decoding IEEE 754 floats and raw UInt16 holding registers.
- **MQTT Sparkplug B:** Real-time topic subscriber (`spBv1.0/EU_FLEET/DDATA/<FID>/CEMS`) with automatic packet deserialization and WS/SSE broadcast.
- **OPC-UA (IEC 62541):** Industrial node address space mapping telemetry points and drift status.

### 6. AI Regulatory Vector RAG Engine v2.0
- **Semantic Corpus:** Contains 20+ regulatory documents across IED 2010/75/EU, CSRD ESRS E1, EU ETS Phase 4, EU MRR 601/2012, DIN EN 14181, EN 15267, BAT LCP 2021/2326, EPA 40 CFR Part 75, and GHG Protocol Scope 1-3.
- **Gemini 2.0 Flash Co-Pilot:** Live telemetry-grounded conversational AI assistant with human-in-the-loop action approval (`/api/ai/approve-action`).

---

## 🚀 Getting Started

### Prerequisites
- **Node.js** v18.0.0+ (v20+ recommended)
- **npm** v9.0.0+
- **Docker & Docker Compose** (for production stack)

### Option A: Local Development (Vite + Edge Gateway)

1. **Clone & Install Dependencies:**
   ```bash
   git clone <repo-url>
   cd "Climate v2"
   npm install
   ```

2. **Configure Environment:**
   ```bash
   cp .env.example .env
   # Edit .env and supply your JWT_SECRET and optional GEMINI_API_KEY
   ```

3. **Start the Edge Gateway Microservice:**
   ```bash
   npm run dev:gateway
   # Server starts on http://localhost:8089
   ```

4. **Start the Frontend Vite Dev Server (in another terminal):**
   ```bash
   npm run dev
   # Vite starts on http://localhost:8080 with auto-proxy to :8089
   ```

5. **Open Browser:**
   - Platform Dashboard: [http://localhost:8080/index.html](http://localhost:8080/index.html)
   - Landing Page: [http://localhost:8080/landing.html](http://localhost:8080/landing.html)

---

### Option B: Production Container Deployment (Docker Compose)

The production stack orchestrates:
- **`climatesphere-frontend`:** Hardened Nginx 1.25 Alpine reverse proxy (Port 80/443, SSL/TLS 1.3, rate limiting, WSS/SSE proxy)
- **`climatesphere-edge-gateway`:** Node.js microservice (Port 8089)
- **`climatesphere-timescaledb`:** TimescaleDB 2.14 (PostgreSQL 16) with automated schema initialization (`server/init_db.sql`)

1. **Generate TLS Certificates (Optional for local HTTPS):**
   ```bash
   # On Linux / macOS:
   bash nginx/generate_ssl_certs.sh

   # On Windows PowerShell:
   powershell -ExecutionPolicy Bypass -File nginx/generate_ssl_certs.ps1
   ```

2. **Launch Container Stack:**
   ```bash
   docker compose up -d --build
   ```

3. **Verify Service Health:**
   ```bash
   docker compose ps
   curl -k https://localhost:8443/health
   ```

---

## 🧪 Testing Suite

ClimateSphere AI includes a comprehensive automated test runner verifying all 25 integration, calculation, and security specifications:

```bash
npm test
```

### Test Coverage Highlights:
- ✅ Health probes & multi-protocol handshake (WS RFC 6455, SSE, Modbus, MQTT)
- ✅ Reference oxygen statutory correction (EU BREF Directive 2010/75/EU)
- ✅ Decarbonization Linear Optimization Model (CO₂ and EUA savings)
- ✅ DIN EN 14181 QAL3 drift thresholds and CUSUM control charts
- ✅ HMAC-SHA256 JWT issuance, claim validation, silent refresh, and revocation
- ✅ Request body size enforcement (1 MB hard cap with HTTP 413)
- ✅ Cryptographic Merkle-tree tamper detection
- ✅ Regulatory Vector RAG retrieval across 20+ statutory standards

---

## 📡 REST API Reference

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/health` | None | System readiness and active protocol probes |
| `GET` | `/metrics` | None | OpenMetrics / Prometheus operational telemetry counters |
| `POST` | `/api/auth/token` | None | Exchange credentials for HMAC-SHA256 JWT access + refresh pair |
| `POST` | `/api/auth/register` | None | Self-service plant user registration with Scrypt hashing |
| `GET` | `/api/auth/google/init` | None | Initialize Google OAuth 2.0 PKCE flow |
| `POST` | `/api/auth/google/callback` | None | Exchange Google OAuth code for authenticated JWT session |
| `POST` | `/api/auth/password-reset` | None | Secure password reset token dispatcher |
| `GET` | `/api/auth/verify` | Bearer | Verify token validity and inspect claims |
| `POST` | `/api/auth/refresh` | None | Silent token renewal using refresh token |
| `POST` | `/api/auth/revoke` | Bearer | Invalidate an active session token |
| `GET` | `/api/telemetry/fleet` | None | Live CEMS telemetry across all 5 European facilities |
| `POST` | `/api/telemetry/ingest` | Bearer | Ingest physical sensor readings with quality flagging |
| `GET` | `/api/telemetry/history` | None | Store-and-forward buffer replay (last $N$ packets) |
| `GET` | `/api/telemetry/rollups` | None | 15-minute statutory compliance rolling averages |
| `GET` | `/api/qal3/calibrations` | None | Retrieve DIN EN 14181 QAL3 calibration history |
| `POST` | `/api/qal3/calibrations` | Bearer (`TRIGGER_CALIBRATION`) | Record certified zero/span drift calibration |
| `GET` | `/api/audit/logs` | None | Retrieve immutable audit records |
| `POST` | `/api/audit/logs` | Bearer | Append tamper-evident entry to Merkle ledger |
| `GET` | `/api/audit/verify` | None | Verify Merkle root hash chain integrity |
| `GET` | `/api/alerts` | None | Query active plant exceedance alerts |
| `POST` | `/api/alerts` | Bearer (`ACKNOWLEDGE_ALERT`) | Acknowledge alarm with operator notes |
| `GET` | `/api/incidents` | None | List environmental deviation incident cases |
| `POST` | `/api/incidents` | Bearer (`RESOLVE_INCIDENT`) | Update root-cause analysis or close incident |
| `GET` | `/api/assets/hierarchy` | None | Plant equipment and analyzer hierarchy |
| `GET` | `/api/carbon/inventory` | None | GHG Protocol Scope 1, 2, and 3 accounting |
| `GET` | `/api/protocols/modbus/read` | None | Read Modbus holding registers (IEEE 754 float) |
| `GET` | `/api/protocols/opcua` | None | Query simulated OPC-UA address space nodes |
| `GET` | `/api/protocols/mqtt` | None | Sparkplug B telemetry topic subscriber status |
| `POST` | `/api/compliance/qal2/calculate` | None | DIN EN 14181 QAL2 orthogonal linear regression |
| `GET` | `/api/compliance/cbam/definitive` | None | EU CBAM definitive phase carbon liability calculator |
| `GET` | `/api/compliance/csrd/esrs-e1` | None | CSRD ESRS E1 quantitative double-materiality inventory |
| `POST` | `/api/ai/query` | Bearer / API Key | Server-side Gemini 2.0 Flash AI query proxy |
| `POST` | `/api/ai/approve-action` | Bearer (`TRIGGER_CALIBRATION`) | Human-in-the-loop dispatch with audit stamp |

> For the complete OpenAPI 3.1.0 specification, see [`docs/openapi.yaml`](docs/openapi.yaml).

---

## 🔒 Security & Regulatory Hardening

- **Content Security Policy:** Hardened headers preventing script injection while supporting required fonts and styles.
- **Row-Level Security (PostgreSQL):** Tenant isolation guaranteed via `tenant_id` policies in `server/init_db.sql`.
- **WORM Audit Trail:** SHA-256 hash-chaining prevents retroactive alterations; regulators can verify the Merkle root on demand.
- **Production Guardrails:** Server halts immediately if default secrets are detected when `NODE_ENV=production`.

---

## 📄 License

Proprietary enterprise software. All rights reserved. ClimateSphere Intelligence Engineering Team.
