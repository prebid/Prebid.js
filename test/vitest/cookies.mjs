// WebKit keeps a copy of a site's cookies in the web process (WebCookieCache), which a document.cookie write updates at
// once and the network process's echo of that write updates again later. An echo of an older write can land after a
// newer write, so for a moment document.cookie shows a value that was already overwritten or deleted: a test that
// reads a cookie the previous test's afterEach expired can still see it. setup.mjs waits that out between runnables.

/**
 * @param {string} assignment what was assigned to document.cookie
 * @returns {string} the cookie's name ('' for a nameless cookie, as browsers treat `document.cookie = 'value'`)
 */
export function cookieName(assignment) {
  const pair = String(assignment).split(';', 1)[0];
  const eq = pair.indexOf('=');
  return eq < 0 ? '' : pair.slice(0, eq).trim();
}

/**
 * @param {string} cookies document.cookie
 * @param {string} name
 * @returns {string[]} the values of every cookie of that name (several paths or domains), in document.cookie's order
 */
export function cookieValues(cookies, name) {
  return cookies.split(';').map(c => c.trim()).filter(Boolean).flatMap(c => {
    const eq = c.indexOf('=');
    return (eq < 0 ? '' : c.slice(0, eq).trim()) === name ? [eq < 0 ? c : c.slice(eq + 1).trim()] : [];
  });
}

/**
 * Remembers what each cookie name read as right after its last write, and waits until document.cookie reads that way
 * again, `quietMs` after the last write or stale read.
 * @param {object} options
 * @param {() => string} options.read reads document.cookie
 * @param {() => number} options.now milliseconds
 * @param {() => Promise<void>} options.wait yields to the event loop for at least a task
 * @param {(() => Promise<void>) | null} [options.barrier] resolves once the browser has applied the echoes of every
 *   earlier write; awaited in place of the first wait
 * @param {number} options.quietMs
 * @param {number} options.timeoutMs gives up, and leaves the cookies as they are, after this long
 */
export function cookieSettler({ read, now, wait, barrier, quietMs, timeoutMs }) {
  const expected = new Map();
  let lastWrite = -Infinity;
  // An empty value counts as no cookie: one cleared with an expiry of now reads as `name=` until that second is over
  const state = (cookies, name) => JSON.stringify(cookieValues(cookies, name).filter(Boolean));
  const matches = () => {
    const cookies = read();
    return [...expected].every(([name, value]) => state(cookies, name) === value);
  };
  return {
    written(assignment) {
      const name = cookieName(assignment);
      expected.set(name, state(read(), name));
      lastWrite = now();
    },
    /**
     * @returns {Promise<{ms: number, timedOut: boolean}> | null} null when nothing was written since the last settle
     */
    settle() {
      if (!expected.size) return null;
      return (async () => {
        const start = now();
        let stale = -Infinity;
        let timedOut = false;
        await (barrier ?? wait)();
        for (;;) {
          const t = now();
          if (!matches()) stale = t;
          else if (t - Math.max(stale, lastWrite) >= quietMs) break;
          if (t - start >= timeoutMs) {
            timedOut = true;
            break;
          }
          await wait();
        }
        expected.clear();
        return { ms: now() - start, timedOut };
      })();
    },
  };
}
