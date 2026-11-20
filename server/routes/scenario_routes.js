/**
 * ClimateSphere AI — Scenario Routes Dispatcher
 */

const scenarioController = require('../controllers/scenario_controller');

async function handleScenarioRoute(req, res, url, body = '', user = null) {
  const pathname = url.pathname;

  if (pathname === '/api/scenarios' || pathname === '/api/scenarios/') {
    if (req.method === 'GET') {
      await scenarioController.getScenarios(req, res, url);
      return true;
    }
    if (req.method === 'POST') {
      await scenarioController.createScenario(req, res, body, user);
      return true;
    }
  }

  if (pathname === '/api/scenarios/optimize' && req.method === 'POST') {
    await scenarioController.optimizeScenario(req, res, body);
    return true;
  }

  if (pathname.startsWith('/api/scenarios/')) {
    const id = pathname.slice('/api/scenarios/'.length).trim();
    if (id && !id.includes('/')) {
      if (req.method === 'GET') {
        await scenarioController.getScenarioById(req, res, id);
        return true;
      }
      if (req.method === 'PUT' || req.method === 'PATCH') {
        await scenarioController.updateScenario(req, res, id, body, user);
        return true;
      }
      if (req.method === 'DELETE') {
        await scenarioController.deleteScenario(req, res, id);
        return true;
      }
    }
  }

  return false;
}

module.exports = {
  handleScenarioRoute
};
