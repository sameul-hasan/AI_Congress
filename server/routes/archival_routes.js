/**
 * ClimateSphere AI — Columnar Parquet Archival Route Dispatcher
 * server/routes/archival_routes.js
 */

const archivalController = require('../controllers/archival_controller');

async function handleArchivalRoute(req, res, url, body) {
  const pathname = url.pathname;

  // GET /api/admin/archival/status
  if (pathname === '/api/admin/archival/status' && req.method === 'GET') {
    archivalController.getStatus(req, res);
    return true;
  }

  // GET /api/admin/archival/catalog
  if (pathname === '/api/admin/archival/catalog' && req.method === 'GET') {
    archivalController.getCatalog(req, res, url);
    return true;
  }

  // POST /api/admin/archival/trigger
  if (pathname === '/api/admin/archival/trigger' && req.method === 'POST') {
    archivalController.handleTrigger(req, res, body);
    return true;
  }

  // POST /api/admin/archival/verify
  if (pathname === '/api/admin/archival/verify' && req.method === 'POST') {
    archivalController.handleVerify(req, res, body);
    return true;
  }

  return false;
}

module.exports = { handleArchivalRoute };
