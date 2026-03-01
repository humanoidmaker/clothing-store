const http = require('http');
const net = require('net');
const { listResellers, updateReseller } = require('./resellerStore');

const normalizeHostPort = (value) => String(value || '').trim();

const appendForwardedFor = (existing, remoteAddress) => {
  const left = normalizeHostPort(existing);
  const right = normalizeHostPort(remoteAddress);
  if (left && right) {
    return `${left}, ${right}`;
  }
  return left || right;
};

const startResellerDevProxyManager = ({
  targetHost = '127.0.0.1',
  targetPort,
  enabled = true,
  syncIntervalMs = 2000
}) => {
  if (!enabled || !Number.isFinite(Number(targetPort)) || Number(targetPort) <= 0) {
    return {
      stop: async () => {}
    };
  }

  const activeProxies = new Map();
  let syncTimer = null;
  let syncing = false;

  const usedListeningPorts = () => {
    const used = new Set();
    for (const proxy of activeProxies.values()) {
      const port = Number(proxy?.devPort || 0);
      if (port > 0) {
        used.add(port);
      }
    }
    return used;
  };

  const closeProxyServer = async (proxy) =>
    new Promise((resolve) => {
      if (!proxy?.server) {
        resolve();
        return;
      }

      proxy.server.close(() => resolve());
    });

  const buildForwardHeaders = (req, primaryDomain) => {
    const headers = {
      ...req.headers
    };

    headers.host = `${targetHost}:${targetPort}`;
    headers['x-forwarded-host'] = primaryDomain;
    headers['x-forwarded-proto'] = 'http';
    headers['x-forwarded-for'] = appendForwardedFor(headers['x-forwarded-for'], req.socket?.remoteAddress || '');

    return headers;
  };

  const createProxyServer = async (reseller) =>
    new Promise((resolve, reject) => {
      const server = http.createServer((req, res) => {
        const proxyRequest = http.request(
          {
            hostname: targetHost,
            port: targetPort,
            method: req.method,
            path: req.url,
            headers: buildForwardHeaders(req, reseller.primaryDomain)
          },
          (proxyResponse) => {
            res.writeHead(proxyResponse.statusCode || 502, proxyResponse.headers);
            proxyResponse.pipe(res);
          }
        );

        proxyRequest.on('error', (error) => {
          if (!res.headersSent) {
            res.statusCode = 502;
            res.setHeader('content-type', 'application/json');
          }
          res.end(JSON.stringify({ message: `Reseller proxy error: ${error.message}` }));
        });

        req.pipe(proxyRequest);
      });

      server.on('upgrade', (req, socket, head) => {
        const upstream = net.connect(Number(targetPort), targetHost, () => {
          const headers = buildForwardHeaders(req, reseller.primaryDomain);
          headers.connection = 'Upgrade';
          if (!headers.upgrade) {
            headers.upgrade = 'websocket';
          }

          const requestLine = `${req.method || 'GET'} ${req.url || '/'} HTTP/${req.httpVersion || '1.1'}\r\n`;
          const headerLines = Object.entries(headers)
            .map(([key, value]) => `${key}: ${value}`)
            .join('\r\n');
          upstream.write(`${requestLine}${headerLines}\r\n\r\n`);
          if (head && head.length > 0) {
            upstream.write(head);
          }

          socket.pipe(upstream).pipe(socket);
        });

        upstream.on('error', () => {
          socket.destroy();
        });
      });

      server.once('error', (error) => {
        reject(error);
      });

      server.listen(Number(reseller.devPort), '0.0.0.0', () => {
        resolve(server);
      });
    });

  const openProxyWithAutoPortFallback = async (reseller) => {
    const maxAttempts = 40;
    let candidatePort = Number(reseller?.devPort || 0);
    const reserved = usedListeningPorts();

    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      if (reserved.has(candidatePort) || candidatePort === Number(targetPort)) {
        candidatePort += 1;
        continue;
      }

      try {
        const server = await createProxyServer({
          ...reseller,
          devPort: candidatePort
        });

        if (candidatePort !== Number(reseller.devPort || 0)) {
          try {
            await updateReseller(reseller.id, { devPort: candidatePort });
          } catch (error) {
            console.error(
              `[reseller-dev-proxy] Port updated in memory but failed to persist devPort ${candidatePort} for ${reseller.primaryDomain}: ${error.message}`
            );
          }
        }

        return {
          server,
          devPort: candidatePort
        };
      } catch (error) {
        if (String(error?.code || '').trim().toUpperCase() === 'EADDRINUSE') {
          candidatePort += 1;
          continue;
        }
        throw error;
      }
    }

    throw new Error(`Unable to find a free dev port for ${reseller.primaryDomain}`);
  };

  const sync = async () => {
    if (syncing) {
      return;
    }
    syncing = true;

    try {
      const resellers = await listResellers();
      const desired = resellers.filter(
        (entry) => Boolean(entry?.isActive) && Boolean(entry?.primaryDomain) && Number(entry?.devPort) > 0
      );
      const desiredById = new Map(desired.map((entry) => [entry.id, entry]));

      for (const [resellerId, proxy] of activeProxies.entries()) {
        if (!desiredById.has(resellerId)) {
          await closeProxyServer(proxy);
          activeProxies.delete(resellerId);
        }
      }

      for (const reseller of desired) {
        const existing = activeProxies.get(reseller.id);
        const hasSameConfig =
          existing &&
          Number(existing.devPort) === Number(reseller.devPort) &&
          String(existing.primaryDomain) === String(reseller.primaryDomain);

        if (hasSameConfig) {
          continue;
        }

        if (existing) {
          await closeProxyServer(existing);
          activeProxies.delete(reseller.id);
        }

        try {
          const opened = await openProxyWithAutoPortFallback(reseller);
          activeProxies.set(reseller.id, {
            resellerId: reseller.id,
            primaryDomain: reseller.primaryDomain,
            devPort: Number(opened.devPort),
            server: opened.server
          });
          console.log(
            `[reseller-dev-proxy] ${reseller.name || reseller.id} -> http://localhost:${opened.devPort} (host: ${reseller.primaryDomain})`
          );
        } catch (error) {
          console.error(
            `[reseller-dev-proxy] Failed to open port ${reseller.devPort} for ${reseller.primaryDomain}: ${error.message}`
          );
        }
      }
    } catch (error) {
      console.error(`[reseller-dev-proxy] Sync failed: ${error.message}`);
    } finally {
      syncing = false;
    }
  };

  syncTimer = setInterval(() => {
    void sync();
  }, Math.max(1000, Number(syncIntervalMs || 2000)));

  void sync();

  return {
    stop: async () => {
      if (syncTimer) {
        clearInterval(syncTimer);
        syncTimer = null;
      }

      const proxies = Array.from(activeProxies.values());
      for (const proxy of proxies) {
        await closeProxyServer(proxy);
      }
      activeProxies.clear();
    }
  };
};

module.exports = {
  startResellerDevProxyManager
};
