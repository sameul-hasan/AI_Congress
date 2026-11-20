/**
 * ClimateSphere AI — Industrial Assets Controller
 * REST HTTP Request Handlers for Plants, Equipment, and Permits
 */

const assetsService = require('../services/assets_service');

const crypto = require('crypto');

function sendJson(res, statusCode, data, req = null) {
  const bodyStr = JSON.stringify(data);
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
  };

  if (statusCode === 200) {
    const etag = 'W/"' + crypto.createHash('md5').update(bodyStr).digest('hex') + '"';
    headers['ETag'] = etag;
    headers['Cache-Control'] = 'public, max-age=60, stale-while-revalidate=120';
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

async function getPlants(req, res, url) {
  try {
    const tenantId = url.searchParams.get('tenant');
    const result = await assetsService.getPlants(tenantId);
    sendJson(res, 200, result, req);
  } catch (err) {
    sendJson(res, 500, { error: 'Failed to fetch plant assets', details: err.message }, req);
  }
}

async function getPlantById(req, res, id) {
  try {
    const result = await assetsService.getPlantById(id);
    if (!result) {
      sendJson(res, 404, { error: `Plant asset not found: ${id}` }, req);
      return;
    }
    sendJson(res, 200, result, req);
  } catch (err) {
    sendJson(res, 500, { error: 'Failed to retrieve plant asset', details: err.message }, req);
  }
}

async function getEquipment(req, res, url) {
  try {
    const result = await assetsService.getEquipment();
    sendJson(res, 200, result, req);
  } catch (err) {
    sendJson(res, 500, { error: 'Failed to fetch equipment assets', details: err.message }, req);
  }
}

async function getPermits(req, res, url) {
  try {
    const facilityId = url.searchParams.get('facility');
    const result = await assetsService.getPermits(facilityId);
    sendJson(res, 200, result, req);
  } catch (err) {
    sendJson(res, 500, { error: 'Failed to fetch statutory permits', details: err.message }, req);
  }
}

async function createPermit(req, res, body, user = null) {
  try {
    const payload = typeof body === 'string' ? JSON.parse(body || '{}') : (body || {});
    const actor = (user && user.email) || 'environmental_director@climatesphere.ai';
    const result = await assetsService.createPermit(payload, actor);
    sendJson(res, 201, result);
  } catch (err) {
    sendJson(res, 400, { error: 'Failed to register regulatory permit', details: err.message });
  }
}

module.exports = {
  getPlants,
  getPlantById,
  getEquipment,
  getPermits,
  createPermit
};
