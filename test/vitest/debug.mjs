// VITEST_DEBUG=1: a 'debug' browser instance that runs nothing until /debug.html is opened. The page then asks for a run
// of the specs the other instance ran, and loads the session Vitest opens for it in an iframe, so they run in whatever browser
// has the page open, devtools and all.

export const DEBUG_INSTANCE = 'debug';

const DEBUG_PAGE = '/debug.html';
const NEXT = '/__debug__/next';
const RUN = '/__debug__/run';

let seq = 0;
let latest = null;
let waiters = [];
let vitest = null;
const debugProject = () => vitest?.projects.find(project => project.name === DEBUG_INSTANCE);

function publish(url) {
  latest = { seq: ++seq, url };
  waiters.forEach(fn => fn(latest));
  waiters = [];
}

function next(after) {
  return latest && latest.seq > after ? Promise.resolve(latest) : new Promise(resolve => waiters.push(resolve));
}

async function run() {
  // the specs come from the other instance's last run
  await vitest.waitForTestRunEnd();
  const files = new Set(vitest.state.getTestModules()
    .filter(module => module.project.name !== DEBUG_INSTANCE)
    .map(module => module.moduleId));
  if (!files.size) throw new Error('no spec files have run yet');
  await vitest.rerunTestSpecifications([...files].map(file => debugProject().createSpecification(file)), false);
}

function debugInstance(project) {
  // the orchestrator sizes the test iframe itself; this would resize the browser window
  project.browser.registerCommand('__vitest_viewport', () => {});
  let open = false;
  return {
    name: 'debug',
    supportsParallelism: false,
    isOpen: () => open,
    getCommandsContext: () => ({}),
    async openPage(_sessionId, url) {
      open = true;
      publish(url);
    },
    async close() {
      open = false;
    },
  };
}

// Instances of a project share one server, so they must have the same provider (by name and server); this one hands
// the debug instance to debug.html and the others to `provider`.
export function withDebugInstance(provider) {
  return {
    ...provider,
    providerFactory: (project) => project.name === DEBUG_INSTANCE ? debugInstance(project) : provider.providerFactory(project),
  };
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
    <button id="rerun" title="Run the specs again in this page">Re-run</button>
    <span id="status">Waiting for Vitest…</span>
  </div>
  <iframe id="frame"></iframe>
  <script>
    const status = document.getElementById('status');
    const frame = document.getElementById('frame');
    async function run() {
      const res = await fetch('${RUN}', { method: 'POST' });
      if (!res.ok) throw new Error(await res.text());
      return (await res.json()).seq;
    }
    async function poll(seq) {
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
    function report(e) {
      status.textContent = 'Run failed: ' + e.message;
    }
    document.getElementById('rerun').onclick = () => run().catch(report);
    // the run opens a session for this page; one still open (e.g. in another tab) would be reused instead
    run().then(poll, report);
  </script>
</body>
</html>`;

let pageUrl = null;
// once both the server is listening and Vitest is known, in either order
function announce() {
  if (pageUrl && vitest) vitest.logger.log(`\nDebug page: ${pageUrl}\n`);
}

export function debugPage() {
  return {
    name: 'prebid-vitest-debug-page',
    configureVitest(context) {
      vitest = context.vitest;
      announce();
    },
    configureServer(server) {
      server.httpServer?.once('listening', () => {
        pageUrl = server.resolvedUrls?.local[0] && new URL(DEBUG_PAGE, server.resolvedUrls.local[0]);
        announce();
      });
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
        } else if (url.pathname === RUN && req.method === 'POST') {
          if (!vitest?.shouldKeepServer()) {
            res.statusCode = 409;
            res.end('Vitest is not in watch mode');
            return;
          }
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ seq }));
          run().catch(e => vitest.logger.error(`debug page: ${e.message}`));
        } else {
          nextMiddleware();
        }
      };
      // ahead of Vitest's own, which answers a bare '/' with "Invalid session ID"
      server.middlewares.stack.unshift({ route: '', handle });
    },
  };
}
