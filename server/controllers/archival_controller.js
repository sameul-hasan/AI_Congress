/**
 * ClimateSphere AI — Columnar Parquet Archival Controller
 * server/controllers/archival_controller.js
 */

const { archivalService } = require('../services/archival_service');

function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With'
  });
  res.end(JSON.stringify(data, null, 2));
}

function getStatus(req, res) {
  const status = archivalService.getStatus();
  sendJson(res, 200, status);
}

function getCatalog(req, res, url) {
  const page = parseInt(url.searchParams.get('page') || '1', 10);
  const pageSize = parseInt(url.searchParams.get('pageSize') || '20', 10);
  const catalog = archivalService.getCatalog(page, pageSize);
  sendJson(res, 200, catalog);
}

function handleTrigger(req, res, bodyStr) {
  try {
    const { partitionKey = '2025_Q4_HISTORICAL', records = [] } = JSON.parse(bodyStr || '{}');
    const entry = archivalService.archiveTelemetryPartition(partitionKey, records);
    sendJson(res, 200, { status: 'ARCHIVED', ...entry });
  } catch (err) {
    sendJson(res, 400, { error: err.message });
  }
}

function handleVerify(req, res, bodyStr) {
  try {
    const { archiveId, hash } = JSON.parse(bodyStr || '{}');
    const result = archivalService.verifyArchiveIntegrity(archiveId, hash);
    sendJson(res, 200, result);
  } catch (err) {
    sendJson(res, 400, { error: err.message });
  }
}

module.exports = {
  getStatus,
  getCatalog,
  handleTrigger,
  handleVerify
};
