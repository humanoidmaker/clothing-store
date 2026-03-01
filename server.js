const express = require('express');
const next = require('next');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');
const apiApp = require('./server/src/apiApp');
const { getMediaStorageRoot } = require('./server/src/utils/mediaStorage');
const {
  createAssetRateLimiter,
  createHotlinkProtection,
  setAssetHeaders
} = require('./server/src/middleware/assetProtection');

dotenv.config({ path: path.join(__dirname, '.env') });
dotenv.config({ path: path.join(__dirname, 'server/.env') });

const dev = process.env.NODE_ENV !== 'production';
const port = Number(process.env.PORT || 3000);
const hostname = process.env.HOSTNAME || '0.0.0.0';
const browserHost = hostname === '0.0.0.0' ? 'localhost' : hostname;

const nextApp = next({ dev, hostname, port });
const handle = nextApp.getRequestHandler();
const mediaStorageRoot = getMediaStorageRoot();
const configuredMediaPublicPath = String(process.env.MEDIA_PUBLIC_BASE_PATH || '/storage/media').trim();
const mediaPublicPath = /^https?:\/\//i.test(configuredMediaPublicPath)
  ? '/storage/media'
  : configuredMediaPublicPath;
const mediaPublicRoute = `/${mediaPublicPath.replace(/^\/+/, '').replace(/\/+$/, '')}`;
const pageRateLimiter = createAssetRateLimiter({
  windowMs: Number(process.env.PAGE_RATE_LIMIT_WINDOW_MS || 60_000),
  maxRequests: Number(process.env.PAGE_RATE_LIMIT_MAX || 420),
  botMaxRequests: Number(process.env.PAGE_BOT_RATE_LIMIT_MAX || 70)
});

fs.mkdirSync(mediaStorageRoot, { recursive: true });

nextApp.prepare().then(() => {
  const app = express();

  app.get('/robots.txt', (req, res) => {
    res.type('text/plain');
    res.send([
      'User-agent: *',
      'Disallow: /api/',
      `Disallow: ${mediaPublicRoute}/`,
      'Crawl-delay: 10'
    ].join('\n'));
  });

  app.use('/_next/static', createAssetRateLimiter());

  app.use((req, res, next) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      return next();
    }

    if (req.path.startsWith('/api')) {
      return next();
    }

    return pageRateLimiter(req, res, next);
  });

  app.use(
    mediaPublicRoute,
    createAssetRateLimiter(),
    createHotlinkProtection(),
    express.static(mediaStorageRoot, {
      etag: true,
      fallthrough: false,
      maxAge: '365d',
      immutable: true,
      setHeaders: (res) => setAssetHeaders(res)
    })
  );

  app.use('/api', apiApp);

  app.all('*', (req, res) => handle(req, res));

  app.listen(port, hostname, () => {
    console.log(`Next.js server running at http://${browserHost}:${port}`);
    if (browserHost !== hostname) {
      console.log(`Bound on ${hostname}:${port} for network access`);
    }
  });
});
