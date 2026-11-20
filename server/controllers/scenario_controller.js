/**
 * ClimateSphere AI — Scenario Controller
 * REST HTTP Request Handlers for Decarbonization Scenarios
 */

const scenarioService = require('../services/scenario_service');

const crypto = require('crypto');

function sendJson(res, statusCode, data, req = null) {
  const bodyStr = JSON.stringify(data);
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
  };

  if (statusCode === 200) {
    const etag = 'W/"' + crypto.createHash('md5').update(bodyStr).digest('hex') + '"';
    headers['ETag'] = etag;
    headers['Cache-Control'] = 'public, max-age=30, stale-while-revalidate=60';
    if (req && req.headers && req.headers['if-none-match'] === etag) {
      res.writeHead(304, headers);
      res.end();
      return;
    }
  } else {
    headers['Cache-Control'] = 'no-store, no-cache';
  }

  res.writeHead(statusCode, headers);
  res.end(bodyStr);
}

async function getScenarios(req, res, url) {
  try {
    const tenantId = url.searchParams.get('tenant') || 'tenant-eu-energy';
    const limit = url.searchParams.get('limit');
    const offset = url.searchParams.get('offset');
    const result = await scenarioService.listScenarios(tenantId, { limit, offset });
    sendJson(res, 200, result, req);
  } catch (err) {
    sendJson(res, 500, { error: 'Failed to fetch scenarios', details: err.message }, req);
  }
}

async function getScenarioById(req, res, id) {
  try {
    const result = await scenarioService.getScenarioById(id);
    if (!result) {
      sendJson(res, 404, { error: `Scenario not found: ${id}` });
      return;
    }
    sendJson(res, 200, result);
  } catch (err) {
    sendJson(res, 500, { error: 'Failed to retrieve scenario', details: err.message });
  }
}

async function createScenario(req, res, body, user = null) {
  try {
    const payload = typeof body === 'string' ? JSON.parse(body || '{}') : (body || {});
    const actor = (user && user.email) || payload.created_by || 'operator@climatesphere.internal';
    const result = await scenarioService.createScenario(payload, actor);
    sendJson(res, 201, result);
  } catch (err) {
    sendJson(res, 400, { error: 'Invalid scenario payload', details: err.message });
  }
}

async function updateScenario(req, res, id, body, user = null) {
  try {
    const payload = typeof body === 'string' ? JSON.parse(body || '{}') : (body || {});
    const actor = (user && user.email) || 'operator@climatesphere.internal';
    const result = await scenarioService.updateScenario(id, payload, actor);
    if (!result) {
      sendJson(res, 404, { error: `Scenario not found: ${id}` });
      return;
    }
    sendJson(res, 200, result);
  } catch (err) {
    sendJson(res, 400, { error: 'Failed to update scenario', details: err.message });
  }
}

async function deleteScenario(req, res, id) {
  try {
    const result = await scenarioService.deleteScenario(id);
    if (!result.success) {
      sendJson(res, 404, { error: `Scenario not found or already deleted: ${id}` });
      return;
    }
    sendJson(res, 200, result);
  } catch (err) {
    sendJson(res, 500, { error: 'Failed to delete scenario', details: err.message });
  }
}

async function optimizeScenario(req, res, body) {
  try {
    const payload = typeof body === 'string' ? JSON.parse(body || '{}') : (body || {});
    const optimized = scenarioService.optimizeScenario(payload);
    sendJson(res, 200, { success: true, ...optimized });
  } catch (err) {
    sendJson(res, 400, { error: 'Failed to run scenario optimization', details: err.message });
  }
}

module.exports = {
  getScenarios,
  getScenarioById,
  createScenario,
  updateScenario,
  deleteScenario,
  optimizeScenario
};
