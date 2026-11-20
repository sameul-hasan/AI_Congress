const fs = require('fs');
const http = require('http');
const { handleHttpRequest } = require('../server/edge_gateway.js');

const server = http.createServer(handleHttpRequest);
server.listen(8093, async () => {
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

  console.log('=== AFTER PERFORMANCE AUDIT: API LATENCY, COMPRESSION & 304 CONDITIONAL CACHING ===');
  console.log('Endpoint'.padEnd(36) + ' | Status | Latency   | Size     | Compression | ETag | Cache-Control');
  console.log('-'.repeat(110));

  let totalLatency = 0;
  let totalPayloadBytes = 0;
  const etags = {};

  // Pass 1: Browser request with Accept-Encoding: br, gzip
  for (const ep of endpoints) {
    const start = process.hrtime.bigint();
    await new Promise((resolve) => {
      const req = http.request({
        hostname: 'localhost',
        port: 8093,
        path: ep,
        method: 'GET',
        headers: {
          'Accept-Encoding': 'br, gzip'
        }
      }, (res) => {
        let size = 0;
        res.on('data', chunk => size += chunk.length);
        res.on('end', () => {
          const durationMs = Number(process.hrtime.bigint() - start) / 1e6;
          totalLatency += durationMs;
          totalPayloadBytes += size;
          const enc = res.headers['content-encoding'] || 'none';
          const cache = res.headers['cache-control'] || 'none';
          const etag = res.headers['etag'] || '';
          if (etag) etags[ep] = etag;

          console.log(
            ep.padEnd(36) + ' | ' +
            String(res.statusCode).padEnd(6) + ' | ' +
            (durationMs.toFixed(2) + 'ms').padEnd(9) + ' | ' +
            ((size / 1024).toFixed(2) + ' KB').padEnd(8) + ' | ' +
            enc.padEnd(11) + ' | ' +
            (etag ? 'YES' : 'NO').padEnd(4) + ' | ' +
            cache
          );
          resolve();
        });
      });
      req.end();
    });
  }

  console.log('-'.repeat(110));
  console.log(`PASS 1 (First Load with Compression): Avg Latency: ${(totalLatency / endpoints.length).toFixed(2)}ms | Total Payload: ${(totalPayloadBytes / 1024).toFixed(2)} KB`);

  // Pass 2: Repeat with If-None-Match (Conditional 304 validation)
  console.log('\n=== PASS 2: CONDITIONAL RE-VALIDATION (If-None-Match -> 304 Not Modified) ===');
  console.log('Endpoint'.padEnd(36) + ' | Status | Latency   | Transferred Size | Bandwidth Saved');
  console.log('-'.repeat(90));

  let pass2Latency = 0;
  let pass2Transferred = 0;

  for (const ep of endpoints) {
    const etag = etags[ep];
    const start = process.hrtime.bigint();
    await new Promise((resolve) => {
      const req = http.request({
        hostname: 'localhost',
        port: 8093,
        path: ep,
        method: 'GET',
        headers: {
          'Accept-Encoding': 'br, gzip',
          ...(etag ? { 'If-None-Match': etag } : {})
        }
      }, (res) => {
        let size = 0;
        res.on('data', chunk => size += chunk.length);
        res.on('end', () => {
          const durationMs = Number(process.hrtime.bigint() - start) / 1e6;
          pass2Latency += durationMs;
          pass2Transferred += size;
          const saved = res.statusCode === 304 ? '100% (Cached)' : '0%';
          console.log(
            ep.padEnd(36) + ' | ' +
            String(res.statusCode).padEnd(6) + ' | ' +
            (durationMs.toFixed(2) + 'ms').padEnd(9) + ' | ' +
            (size + ' B').padEnd(16) + ' | ' +
            saved
          );
          resolve();
        });
      });
      req.end();
    });
  }

  console.log('-'.repeat(90));
  console.log(`PASS 2 SUMMARY: Avg Latency: ${(pass2Latency / endpoints.length).toFixed(2)}ms | Total Transferred: ${pass2Transferred} bytes`);
  server.close(() => process.exit(0));
});
