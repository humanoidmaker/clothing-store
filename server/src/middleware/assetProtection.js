const BOT_USER_AGENT_PATTERN =
  /(bot|crawler|spider|slurp|headless|wget|curl|python-requests|axios|scrapy|httpclient|go-http-client)/i;

const memoryStore = new Map();

const getClientIp = (req) => {
  const forwardedFor = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
  if (forwardedFor) return forwardedFor;
  return req.ip || req.socket?.remoteAddress || 'unknown';
};

const cleanupStore = (now, windowMs) => {
  if (memoryStore.size < 1200) {
    return;
  }

  for (const [key, value] of memoryStore.entries()) {
    if (!value || now - value.startedAt > windowMs * 2) {
      memoryStore.delete(key);
    }
  }
};

const createAssetRateLimiter = ({
  windowMs = Number(process.env.ASSET_RATE_LIMIT_WINDOW_MS || 60_000),
  maxRequests = Number(process.env.ASSET_RATE_LIMIT_MAX || 240),
  botMaxRequests = Number(process.env.ASSET_BOT_RATE_LIMIT_MAX || 45)
} = {}) => (req, res, next) => {
  const now = Date.now();
  cleanupStore(now, windowMs);

  const userAgent = String(req.get('user-agent') || '');
  const isBot = BOT_USER_AGENT_PATTERN.test(userAgent);
  const limit = isBot ? botMaxRequests : maxRequests;
  const key = `${getClientIp(req)}:${isBot ? 'bot' : 'user'}`;
  const current = memoryStore.get(key);

  if (!current || now - current.startedAt > windowMs) {
    memoryStore.set(key, { count: 1, startedAt: now });
    return next();
  }

  current.count += 1;
  if (current.count > limit) {
    const retryAfterSeconds = Math.max(1, Math.ceil((windowMs - (now - current.startedAt)) / 1000));
    res.set('Retry-After', String(retryAfterSeconds));
    return res.status(429).json({ message: 'Too many asset requests. Please retry shortly.' });
  }

  return next();
};

const parseAllowedDomains = () => {
  const configured = String(process.env.HOTLINK_ALLOWED_DOMAINS || '').trim();
  if (!configured) {
    return [];
  }

  return configured
    .split(',')
    .map((domain) => domain.trim().toLowerCase())
    .filter(Boolean);
};

const createHotlinkProtection = () => {
  const allowlist = parseAllowedDomains();
  const isEnabled = String(process.env.ENABLE_HOTLINK_PROTECTION || 'true').trim().toLowerCase() === 'true';

  return (req, res, next) => {
    if (!isEnabled) {
      return next();
    }

    const referer = String(req.get('referer') || '').trim();
    if (!referer) {
      return next();
    }

    let refererHost = '';
    try {
      refererHost = String(new URL(referer).hostname || '').toLowerCase();
    } catch {
      return res.status(403).json({ message: 'Invalid referer' });
    }

    const requestHost = String(req.get('host') || '').split(':')[0].toLowerCase();
    const isSameHost = refererHost === requestHost;
    const isAllowed = allowlist.some((domain) => refererHost === domain || refererHost.endsWith(`.${domain}`));

    if (isSameHost || isAllowed) {
      return next();
    }

    return res.status(403).json({ message: 'Hotlinking is not allowed for media assets' });
  };
};

const setAssetHeaders = (res) => {
  res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
  res.setHeader('X-Robots-Tag', 'noimageindex, nofollow');
  res.setHeader('X-Content-Type-Options', 'nosniff');
};

module.exports = {
  createAssetRateLimiter,
  createHotlinkProtection,
  setAssetHeaders
};
