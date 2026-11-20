#!/usr/bin/env bash
# ClimateSphere AI — TLS/SSL Certificate Generation Script
# Generates self-signed certificates with Subject Alternative Names (SAN) for localhost / dev / staging

set -euo pipefail

SSL_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/ssl"
mkdir -p "${SSL_DIR}"

DAYS=365
KEY_FILE="${SSL_DIR}/key.pem"
CERT_FILE="${SSL_DIR}/cert.pem"

echo "Generating ClimateSphere AI TLS private key and certificate..."

openssl req -x509 -nodes -days "${DAYS}" -newkey rsa:2048 \
  -keyout "${KEY_FILE}" \
  -out "${CERT_FILE}" \
  -subj "/C=DE/ST=NRW/L=Duisburg/O=ClimateSphere AI/OU=Industrial CEMS Gateway/CN=localhost" \
  -addext "subjectAltName=DNS:localhost,DNS:climatesphere.internal,IP:127.0.0.1,IP:0.0.0.0"

chmod 600 "${KEY_FILE}"
chmod 644 "${CERT_FILE}"

echo "SSL Certificate generated successfully:"
echo "  - Private Key: ${KEY_FILE}"
echo "  - Certificate: ${CERT_FILE}"
