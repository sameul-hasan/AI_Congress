const fs = require('fs');
const http = require('http');
const { handleHttpRequest } = require('../server/edge_gateway.js');

const server = http.createServer(handleHttpRequest);
server.listen(8092, async () => {
  const endpoints = [
    '/health',
    '/api/scenarios',
    '/api/plants',
    '/api/equipment',
    '/api/permits',
    '/api/telemetry/fleet',
    '/api/telemetry/rollups',
    '/api/audit/logs',
    '/api/compliance/rules',
    '/api/auth/permissions',
    '/.well-known/openid-configuration',
    '/.well-known/jwks.json',
    '/metrics'
  ];

  console.log('=== BEFORE PERFORMANCE AUDIT: API LATENCY & PAYLOAD SIZE ===');
  console.log('Endpoint'.padEnd(36) + ' | Status | Latency   | Size     | Compression | ETag | Cache-Control');
  console.log('-'.repeat(110));

  let totalLatency = 0;
  let totalPayloadBytes = 0;

  for (const ep of endpoints) {
    const start = process.hrtime.bigint();
    await new Promise((resolve) => {
      http.get('http://localhost:8092' + ep, (res) => {
        let size = 0;
        res.on('data', chunk => size += chunk.length);
        res.on('end', () => {
          const durationMs = Number(process.hrtime.bigint() - start) / 1e6;
          totalLatency += durationMs;
          totalPayloadBytes += size;
          const enc = res.headers['content-encoding'] || 'none';
          const cache = res.headers['cache-control'] || 'none';
          const etag = res.headers['etag'] ? 'YES' : 'NO';
          console.log(
            ep.padEnd(36) + ' | ' +
            String(res.statusCode).padEnd(6) + ' | ' +
            (durationMs.toFixed(2) + 'ms').padEnd(9) + ' | ' +
            ((size / 1024).toFixed(2) + ' KB').padEnd(8) + ' | ' +
            enc.padEnd(11) + ' | ' +
            etag.padEnd(4) + ' | ' +
            cache
          );
          resolve();
        });
      });
    });
  }

  console.log('-'.repeat(110));
  console.log(`TOTALS: Avg Latency: ${(totalLatency / endpoints.length).toFixed(2)}ms | Total Payload: ${(totalPayloadBytes / 1024).toFixed(2)} KB`);
  server.close(() => process.exit(0));
});
