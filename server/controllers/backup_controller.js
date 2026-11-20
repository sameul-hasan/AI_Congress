/**
 * ClimateSphere AI — WAL Archiving & PITR Backup Controller
 * server/controllers/backup_controller.js
 */

const { backupService } = require('../services/backup_service');

function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With'
  });
  res.end(JSON.stringify(data, null, 2));
}

async function getWalStatus(req, res) {
  const status = await backupService.getWalArchivingStatus();
  sendJson(res, 200, status);
}

function getSnapshots(req, res) {
  const catalog = backupService.getSnapshotsCatalog();
  sendJson(res, 200, catalog);
}

async function handleCreateSnapshot(req, res, user, bodyStr) {
  try {
    const options = JSON.parse(bodyStr || '{}');
    const snapshot = await backupService.createSnapshot(user, options);
    sendJson(res, 201, { ...snapshot, status: 'SNAPSHOT_CREATED' });
  } catch (err) {
    sendJson(res, 400, { error: err.message });
  }
}

function handleVerifyBackup(req, res, bodyStr) {
  try {
    const { backupId, checksum } = JSON.parse(bodyStr || '{}');
    const result = backupService.verifyBackup(backupId, checksum);
    sendJson(res, 200, result);
  } catch (err) {
    sendJson(res, 400, { error: err.message });
  }
}

module.exports = {
  getWalStatus,
  getSnapshots,
  handleCreateSnapshot,
  handleVerifyBackup
};
