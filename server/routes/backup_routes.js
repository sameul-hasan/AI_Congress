/**
 * ClimateSphere AI — WAL Archiving & PITR Backup Route Dispatcher
 * server/routes/backup_routes.js
 */

const backupController = require('../controllers/backup_controller');

async function handleBackupRoute(req, res, url, body, user) {
  const pathname = url.pathname;

  // GET /api/admin/backup/status
  if (pathname === '/api/admin/backup/status' && req.method === 'GET') {
    await backupController.getWalStatus(req, res);
    return true;
  }

  // GET /api/admin/backup/snapshots
  if (pathname === '/api/admin/backup/snapshots' && req.method === 'GET') {
    backupController.getSnapshots(req, res);
    return true;
  }

  // POST /api/admin/backup/snapshot
  if (pathname === '/api/admin/backup/snapshot' && req.method === 'POST') {
    await backupController.handleCreateSnapshot(req, res, user, body);
    return true;
  }

  // POST /api/admin/backup/verify
  if (pathname === '/api/admin/backup/verify' && req.method === 'POST') {
    backupController.handleVerifyBackup(req, res, body);
    return true;
  }

  return false;
}

module.exports = { handleBackupRoute };
