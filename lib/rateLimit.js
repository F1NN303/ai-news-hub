const DEFAULT_WINDOW_MS = 15 * 60 * 1000;
const DEFAULT_MAX_ATTEMPTS = 5;

function createRateLimiter({ windowMs = DEFAULT_WINDOW_MS, max = DEFAULT_MAX_ATTEMPTS } = {}) {
  const attempts = new Map();

  function getKey(prefix, value) {
    return `${prefix}:${value}`;
  }

  function isLimited(ip, email) {
    const now = Date.now();
    const keys = [getKey('ip', ip), getKey('email', email)];
    for (const k of keys) {
      const entry = attempts.get(k);
      if (entry && now < entry.expires && entry.count >= max) {
        return true;
      }
    }
    return false;
  }

  function recordFailure(ip, email) {
    const now = Date.now();
    const keys = [getKey('ip', ip), getKey('email', email)];
    for (const k of keys) {
      const entry = attempts.get(k);
      if (!entry || now > entry.expires) {
        attempts.set(k, { count: 1, expires: now + windowMs });
      } else {
        entry.count++;
      }
    }
  }

  function clear(ip, email) {
    attempts.delete(getKey('ip', ip));
    attempts.delete(getKey('email', email));
  }

  return { isLimited, recordFailure, clear };
}

module.exports = { createRateLimiter };
