/**
 * ClimateSphere AI — Enterprise Identity & Security Controller
 * HTTP handlers for OIDC Discovery, JWKS, and RBAC Permissions Catalog
 */

const authService = require('../services/auth_service');

const crypto = require('crypto');

function sendJson(res, statusCode, data, req = null, cacheControl = 'public, max-age=300, stale-while-revalidate=600') {
  const bodyStr = JSON.stringify(data);
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With'
  };

  if (statusCode === 200) {
    const etag = 'W/"' + crypto.createHash('md5').update(bodyStr).digest('hex') + '"';
    headers['ETag'] = etag;
    headers['Cache-Control'] = cacheControl;
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

function getJwks(req, res) {
  const jwks = authService.getJwks();
  sendJson(res, 200, jwks, req, 'public, max-age=600, stale-while-revalidate=1200');
}

function getOpenIdConfiguration(req, res, port = 8089) {
  const proto = req.headers['x-forwarded-proto'] || 'http';
  const host = req.headers.host || `localhost:${port}`;
  const issuer = `${proto}://${host}`;

  const config = {
    issuer,
    authorization_endpoint: `${issuer}/api/auth/token`,
    token_endpoint: `${issuer}/api/auth/token`,
    userinfo_endpoint: `${issuer}/api/auth/verify`,
    sso_login_endpoint: `${issuer}/api/auth/sso/login`,
    sso_callback_endpoint: `${issuer}/api/auth/sso/callback`,
    jwks_uri: `${issuer}/.well-known/jwks.json`,
    response_types_supported: ['token', 'id_token', 'code'],
    subject_types_supported: ['public'],
    id_token_signing_alg_values_supported: ['RS256', 'HS256'],
    token_endpoint_auth_methods_supported: ['client_secret_basic', 'client_secret_post', 'private_key_jwt'],
    code_challenge_methods_supported: ['S256', 'plain'],
    scopes_supported: ['openid', 'profile', 'email', 'roles', 'permissions'],
    claims_supported: ['sub', 'iss', 'aud', 'exp', 'iat', 'tenant_id', 'role', 'permissions', 'permitted_facilities'],
    sso_providers_supported: ['microsoft_entra', 'okta', 'ping_identity', 'keycloak']
  };

  sendJson(res, 200, config, req, 'public, max-age=600, stale-while-revalidate=1200');
}

function getPermissionsCatalog(req, res, user = null) {
  const userRole = (user && user.role) ? user.role.toUpperCase() : 'ANONYMOUS';
  const userPermissions = user ? authService.getPermissionsForRole(userRole) : [];

  sendJson(res, 200, {
    status: 'PERMISSIONS_CATALOG',
    userRole,
    assignedPermissions: userPermissions,
    roleMatrix: authService.ROLE_PERMISSIONS_MATRIX,
    permissionsCatalog: authService.INDUSTRIAL_PERMISSIONS
  }, req, 'public, max-age=120, stale-while-revalidate=240');
}

module.exports = {
  getJwks,
  getOpenIdConfiguration,
  getPermissionsCatalog
};
