const express = require('express');
const next = require('next');
const dotenv = require('dotenv');
const path = require('path');
const apiApp = require('./server/src/apiApp');

dotenv.config({ path: path.join(__dirname, '.env') });
dotenv.config({ path: path.join(__dirname, 'server/.env') });

const dev = process.env.NODE_ENV !== 'production';
const port = Number(process.env.PORT || 3000);
const hostname = process.env.HOSTNAME || '0.0.0.0';
const browserHost = hostname === '0.0.0.0' ? 'localhost' : hostname;

const nextApp = next({ dev, hostname, port });
const handle = nextApp.getRequestHandler();

nextApp.prepare().then(() => {
  const app = express();

  app.use('/api', apiApp);

  app.all('*', (req, res) => handle(req, res));

  app.listen(port, hostname, () => {
    console.log(`Next.js server running at http://${browserHost}:${port}`);
    if (browserHost !== hostname) {
      console.log(`Bound on ${hostname}:${port} for network access`);
    }
  });
});
