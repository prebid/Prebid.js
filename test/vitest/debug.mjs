// VITEST_DEBUG=1: instead of launching a browser, Vitest's pages are handed to whatever browser has /debug.html open,
// which loads each in an iframe, so the tests run in a browser of your choosing, devtools and all.

// installed with @vitest/browser-playwright, at its version
// eslint-disable-next-line import/no-extraneous-dependencies
import { defineBrowserProvider } from '@vitest/browser';

const DEBUG_PAGE = '/debug.html';
const NEXT = '/__debug__/next';

let seq = 0;
let latest = null;
let waiters = [];

function publish(url) {
  latest = { seq: ++seq, url };
  waiters.forEach(fn => fn(latest));
  waiters = [];
}

function next(after) {
  return latest && latest.seq > after ? Promise.resolve(latest) : new Promise(resolve => waiters.push(resolve));
}

export function debugProvider() {
  return defineBrowserProvider({
    name: 'debug',
    providerFactory(project) {
      let open = false;
      return {
        name: 'debug',
        supportsParallelism: false,
        isOpen: () => open,
        getCommandsContext: () => ({}),
        async openPage(_sessionId, url) {
          open = true;
          const page = new URL(DEBUG_PAGE, url).toString();
          project.vitest.logger.log(`\nWaiting for a browser: open ${page}\n`);
          publish(url);
        },
        async close() {
          open = false;
        },
      };
    },
  });
}

const PAGE = `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <title>vitest debug</title>
  <style>
    html, body { margin: 0; height: 100%; font: 13px sans-serif; }
    body { display: flex; flex-direction: column; }
    #status { padding: 4px 8px; background: #eee; }
    iframe { flex: 1; border: 0; width: 100%; }
  </style>
</head>
<body>
  <div id="status">Waiting for Vitest to start a session…</div>
  <iframe id="frame"></iframe>
  <script>
    const status = document.getElementById('status');
    const frame = document.getElementById('frame');
    let seq = 0;
    async function poll() {
      for (;;) {
        try {
          const res = await fetch('${NEXT}?after=' + seq);
          if (!res.ok) throw new Error(res.status);
          const session = await res.json();
          seq = session.seq;
          status.textContent = 'Session ' + seq + ': ' + session.url;
          frame.src = session.url;
        } catch (e) {
          status.textContent = 'Lost the Vitest server (' + e + '), retrying…';
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }
    }
    poll();
  </script>
</body>
</html>`;

export function debugPage() {
  return {
    name: 'prebid-vitest-debug-page',
    configureServer(server) {
      server.middlewares.use((req, res, nextMiddleware) => {
        const url = new URL(req.url, 'http://localhost');
        if (url.pathname === DEBUG_PAGE) {
          res.setHeader('Content-Type', 'text/html');
          res.end(PAGE);
        } else if (url.pathname === NEXT) {
          let closed = false;
          req.on('close', () => { closed = true; });
          next(Number(url.searchParams.get('after')) || 0).then(session => {
            if (closed) return;
            res.setHeader('Content-Type', 'application/json');
            res.setHeader('Cache-Control', 'no-store');
            res.end(JSON.stringify(session));
          });
        } else {
          nextMiddleware();
        }
      });
    },
  };
}
