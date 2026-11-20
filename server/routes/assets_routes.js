/**
 * ClimateSphere AI — Assets Routes Dispatcher
 */

const assetsController = require('../controllers/assets_controller');

async function handleAssetsRoute(req, res, url, body = '', user = null) {
  const pathname = url.pathname;

  // Plants
  if (pathname === '/api/plants' || pathname === '/api/plants/') {
    if (req.method === 'GET') {
      await assetsController.getPlants(req, res, url);
      return true;
    }
  }

  if (pathname.startsWith('/api/plants/')) {
    const id = pathname.slice('/api/plants/'.length).trim();
    if (id && !id.includes('/')) {
      if (req.method === 'GET') {
        await assetsController.getPlantById(req, res, id);
        return true;
      }
    }
  }

  // Equipment
  if (pathname === '/api/equipment' || pathname === '/api/equipment/') {
    if (req.method === 'GET') {
      await assetsController.getEquipment(req, res, url);
      return true;
    }
  }

  // Permits
  if (pathname === '/api/permits' || pathname === '/api/permits/') {
    if (req.method === 'GET') {
      await assetsController.getPermits(req, res, url);
      return true;
    }
    if (req.method === 'POST') {
      await assetsController.createPermit(req, res, body, user);
      return true;
    }
  }

  return false;
}

module.exports = {
  handleAssetsRoute
};
