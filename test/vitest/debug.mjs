// VITEST_DEBUG=1: instead of launching a browser, Vitest's pages are handed to whatever browser has /debug.html open,
// which loads each in an iframe, so the tests run in a browser of your choosing, devtools and all.

// installed with @vitest/browser-playwright, at its version
// eslint-disable-next-line import/no-extraneous-dependencies
import { defineBrowserProvider } from '@vitest/browser';

const DEBUG_PAGE = '/debug.html';
const NEXT = '/__debug__/next';
const RERUN = '/__debug__/rerun';

let seq = 0;
let latest = null;
let waiters = [];
let vitest = null;

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
      vitest = project.vitest;
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
    #bar { display: flex; gap: 8px; align-items: center; padding: 4px 8px; background: #eee; }
    #status { flex: 1; }
    iframe { flex: 1; border: 0; width: 100%; }
  </style>
</head>
<body>
  <div id="bar">
    <button id="rerun" title="Like 'r' in Vitest's terminal (watch mode only)">Re-run</button>
    <span id="status">Waiting for Vitest to start a session…</span>
  </div>
  <iframe id="frame"></iframe>
  <script>
    const status = document.getElementById('status');
    const frame = document.getElementById('frame');
    let seq = 0;
    document.getElementById('rerun').onclick = async () => {
      const res = await fetch('${RERUN}', { method: 'POST' });
      if (!res.ok) status.textContent = 'Re-run failed: ' + await res.text();
    };
    async function poll() {
      for (;;) {
        try {
          const res = await fetch('${NEXT}?after=' + seq);
          if (!res.ok) throw new Error(res.status);
          const session = await res.json();
          seq = session.seq;
          // Vitest drops a session when its page goes away, e.g. on a reload of this one
          if ((await fetch(session.url, { method: 'HEAD' })).ok) {
            status.textContent = 'Session ' + seq + ': ' + session.url;
            frame.src = session.url;
          } else {
            status.textContent = 'Waiting for Vitest to start another session (Re-run)…';
          }
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
      const handle = (req, res, nextMiddleware) => {
        const url = new URL(req.url, 'http://localhost');
        // also '/' (but not the test iframe's '/?sessionId='): setup.mjs gives the top page Karma's URL, so that is
        // what a reload asks for
        if (url.pathname === DEBUG_PAGE || (url.pathname === '/' && !url.searchParams.has('sessionId'))) {
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
        } else if (url.pathname === RERUN && req.method === 'POST') {
          if (!vitest?.config.watch) {
            res.statusCode = 409;
            res.end('Vitest is not in watch mode');
            return;
          }
          vitest.rerunFiles(undefined, 'debug.html').catch(e => vitest.logger.error(e));
          res.statusCode = 204;
          res.end();
        } else {
          nextMiddleware();
        }
      };
      // ahead of Vitest's own, which answers a bare '/' with "Invalid session ID"
      server.middlewares.stack.unshift({ route: '', handle });
    },
  };
}
