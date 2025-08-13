const REQUIRED_KEYS = ['DATABASE_URL','NEXTAUTH_SECRET'];

class ConfigError extends Error {
  constructor(missing) { super(`Missing environment variables: ${missing.join(', ')}`); this.code = 'CONFIG_ERROR'; }
}

function ensureConfig(required = REQUIRED_KEYS) {
  const keys = [...required];
  const missing = [];
  if (keys.includes('JWKS_URL') && keys.includes('JWT_SECRET')) {
    if (!process.env.JWKS_URL && !process.env.JWT_SECRET) missing.push('JWKS_URL or JWT_SECRET');
    keys.splice(keys.indexOf('JWKS_URL'), 1);
    keys.splice(keys.indexOf('JWT_SECRET'), 1);
  }
  for (const k of keys) if (!process.env[k]) missing.push(k);
  if (missing.length) throw new ConfigError(missing);
  return true;
}

module.exports = { ensureConfig };
