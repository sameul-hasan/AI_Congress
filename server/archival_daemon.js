/**
 * ClimateSphere AI — Cold Storage Parquet Archival & 10-Year Statutory Tiering Daemon
 * server/archival_daemon.js
 * 
 * Re-exports EnterpriseArchivalService for complete backwards compatibility.
 */

const { EnterpriseArchivalService, archivalService } = require('./services/archival_service');

class ColdStorageArchivalDaemon extends EnterpriseArchivalService {
  constructor(options = {}) {
    super(options);
  }
}

module.exports = {
  ColdStorageArchivalDaemon,
  archivalService
};
