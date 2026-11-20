/**
 * ClimateSphere AI — SCADA Select-Before-Operate (SBO) Controller
 * server/controllers/scada_sbo_controller.js
 */

const scadaSboService = require('../services/scada_sbo_service');

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
  const status = scadaSboService.getStatus();
  sendJson(res, 200, status);
}

function getOperatingEnvelope(req, res, url) {
  const facilityId = url.searchParams.get('facilityId') || 'DU-03';
  const envelope = scadaSboService.getOperatingEnvelope(facilityId);
  sendJson(res, 200, { facilityId, envelope });
}

function handleSelect(req, res, user, bodyStr) {
  try {
    const data = JSON.parse(bodyStr || '{}');
    const result = scadaSboService.selectCommand(user, data);
    if (!result.passed && result.status === 'INTERLOCK_REJECTED') {
      return sendJson(res, 422, result);
    }
    return sendJson(res, 201, result);
  } catch (err) {
    return sendJson(res, 400, { error: err.message });
  }
}

function handleOperate(req, res, user, bodyStr) {
  try {
    const data = JSON.parse(bodyStr || '{}');
    const result = scadaSboService.operateCommand(user, data);
    return sendJson(res, 200, result);
  } catch (err) {
    const isConflict = err.message.includes('expired') || err.message.includes('not armed');
    const isInterlock = err.message.includes('interlock') || err.message.includes('Dual-Control');
    const statusCode = isConflict ? 409 : (isInterlock ? 422 : 400);
    return sendJson(res, statusCode, { error: err.message });
  }
}

function handleCancel(req, res, user, bodyStr) {
  try {
    const { ticketId, reason } = JSON.parse(bodyStr || '{}');
    const result = scadaSboService.cancelCommand(user, ticketId, reason);
    return sendJson(res, 200, result);
  } catch (err) {
    return sendJson(res, 400, { error: err.message });
  }
}

module.exports = {
  getStatus,
  getOperatingEnvelope,
  handleSelect,
  handleOperate,
  handleCancel
};
