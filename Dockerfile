# ══════════════════════════════════════════════════════════════════
# ClimateSphere AI — Enterprise Edge Telemetry Microservice
# Multi-protocol Industrial Telemetry, OIDC/RBAC & Compliance Engine
# ══════════════════════════════════════════════════════════════════

FROM node:20.11.1-alpine AS base

WORKDIR /app

# Install system utilities & C++ build toolchain for native serialport / fieldbus bindings
RUN apk add --no-cache curl wget python3 make g++ linux-headers

# Copy package manifests
COPY package.json ./

# Install production dependencies
RUN npm install --omit=dev --no-audit --no-fund

# Copy backend server and test tree
COPY server/ ./server/
COPY tests/ ./tests/

# Environment Defaults
ENV NODE_ENV=production
ENV EDGE_PORT=8089
ENV EDGE_HOST=0.0.0.0

# Expose Edge Ingestion Gateway
EXPOSE 8089

# Healthcheck against Edge Gateway status endpoint
HEALTHCHECK --interval=15s --timeout=5s --start-period=5s --retries=3 \
  CMD wget -qO- http://localhost:8089/health || exit 1

# Production Entrypoint: Run Node.js Edge Telemetry Gateway
CMD ["node", "server/edge_gateway.js"]
