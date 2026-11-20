/**
 * ClimateSphere AI — SCADA Select-Before-Operate (SBO) Route Dispatcher
 * server/routes/scada_sbo_routes.js
 */

const scadaSboController = require('../controllers/scada_sbo_controller');

async function handleScadaSboRoute(req, res, url, body, user) {
  const pathname = url.pathname;

  // GET /api/scada/sbo/status
  if (pathname === '/api/scada/sbo/status' && req.method === 'GET') {
    scadaSboController.getStatus(req, res);
    return true;
  }

  // GET /api/scada/sbo/envelope
  if (pathname === '/api/scada/sbo/envelope' && req.method === 'GET') {
    scadaSboController.getOperatingEnvelope(req, res, url);
    return true;
  }

  // POST /api/scada/sbo/select
  if (pathname === '/api/scada/sbo/select' && req.method === 'POST') {
    scadaSboController.handleSelect(req, res, user, body);
    return true;
  }

  // POST /api/scada/sbo/operate
  if (pathname === '/api/scada/sbo/operate' && req.method === 'POST') {
    scadaSboController.handleOperate(req, res, user, body);
    return true;
  }

  // POST /api/scada/sbo/cancel
  if (pathname === '/api/scada/sbo/cancel' && req.method === 'POST') {
    scadaSboController.handleCancel(req, res, user, body);
    return true;
  }

  return false;
}

module.exports = { handleScadaSboRoute };
