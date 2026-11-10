// Runs in the browser before each spec file. Supplies the globals the specs were written against
// (karma-mocha, karma-chai and karma-sinon supplied them under Karma): Mocha's BDD interface on top of
// Vitest's runner, chai's expect/assert/should, and sinon. No spec is changed.
import * as vitest from 'vitest';
import * as chai from 'chai';
import sinon from 'sinon';
import { commands } from 'vitest/browser';
import { cookieSettler } from './cookies.mjs';

const DEFAULT_TIMEOUT = 3000; // Mocha's timeout under Karma (client.mocha.timeout)
const NO_TIMEOUT = 2 ** 31 - 1;
// like Mocha, keep the real timers: specs install sinon fake timers on the global object
const realSetTimeout = globalThis.setTimeout.bind(globalThis);
const realClearTimeout = globalThis.clearTimeout.bind(globalThis);
const realNow = performance.now.bind(performance);

// karma-chai / karma-sinon globals (test_deps.js replaces `sinon` with the bundled copy)
globalThis.chai = chai;
globalThis.expect = chai.expect;
globalThis.assert = chai.assert;
globalThis.should = chai.should();
globalThis.sinon = sinon;

// The tester page is test/vitest/context.html, shaped like karma's: Vitest's own is
// `<html lang="en">` (FPD enrichment turns that into site.content.language) titled "Vitest Browser Tester".
// ~170 specs hard-code karma's test page URL (http://localhost:9876/context.html); the config serves
// Vitest on port 9876 when it's free, and this gives the test iframe karma's path. Its referrer is karma's parent page.
if (globalThis.__VITEST_KARMA_URL__ !== false) {
  // Only when the URL isn't already karma's: Safari throws a SecurityError on more than 100 replaceState calls
  // per page in 10 seconds, and the top page outlives every test file of the run.
  const karmaUrl = (win, url) => {
    if (win.location.pathname + win.location.search !== url) win.history.replaceState(win.history.state, '', url);
  };
  karmaUrl(window, '/context.html');
  if (window.top !== window) {
    // karma's top page is http://localhost:9876/?id=<browser id> (karma-chrome-launcher)
    karmaUrl(window.top, '/?id=73195742');
  }
  Object.defineProperty(document, 'referrer', { value: `${location.origin}/`, configurable: true });
}

// BrowserStack selects a device's OS by major version only, so record what this session actually runs
if (typeof __VITEST_BROWSERSTACK__ !== 'undefined' && __VITEST_BROWSERSTACK__) {
  // eslint-disable-next-line no-console
  console.info(`browserstack: ${navigator.userAgent}; screen ${screen.width}x${screen.height}, window ${innerWidth}x${innerHeight}, top ${top.innerWidth}x${top.innerHeight}`);
}

// ---- Mocha BDD interface on top of Vitest -------------------------------------------------------

// A Mocha `Context`: tests and hooks of a suite share it (prototypally inherited from the parent suite),
// so `this.foo = ...` in a hook is visible in the tests.
const rootSuite = { title: '', parent: null, timeout: DEFAULT_TIMEOUT, retries: 0, ctx: {} };
rootSuite.ctx = makeCtx(null);
let currentSuite = rootSuite;
// Mocha silently ignores it()/hooks declared while a test or hook is running (they're added to a suite
// that has already been collected, and never run). Vitest fails the enclosing test instead.
let running = 0;

function makeCtx(parent) {
  const ctx = parent ? Object.create(parent) : {};
  Object.defineProperties(ctx, {
    timeout: {
      value(ms) {
        if (ms === undefined) return this.runnable?.timeout ?? currentSuite.timeout;
        if (this.runnable) this.runnable.setTimeout(ms);
        return this;
      },
      writable: true
    },
    slow: { value() { return this; }, writable: true },
    retries: { value() { return this; }, writable: true },
    skip: {
      value() {
        if (this.vctx?.skip) return this.vctx.skip();
        throw new Error('this.skip() is not supported here');
      },
      writable: true
    },
  });
  return ctx;
}

// what a Mocha Suite's `this` looks like inside a describe() body
function suiteThis(suite) {
  return {
    title: suite.title,
    timeout(ms) { if (ms === undefined) return suite.timeout; suite.timeout = ms; return this; },
    retries(n) { if (n === undefined) return suite.retries; suite.retries = n; return this; },
    slow() { return this; },
    ctx: suite.ctx,
    beforeAll: (...args) => globalThis.before(...args),
    afterAll: (...args) => globalThis.after(...args),
    beforeEach: (...args) => globalThis.beforeEach(...args),
    afterEach: (...args) => globalThis.afterEach(...args),
  };
}

function testInfo(task, ctx) {
  const parentOf = (t) => {
    const s = t?.suite;
    if (!s || s.type !== 'suite' || s.filepath) return { title: '', parent: null, root: true, fullTitle: () => '' };
    return { title: s.name, parent: parentOf(s), fullTitle() { const p = this.parent.fullTitle(); return p ? `${p} ${this.title}` : this.title; } };
  };
  const parent = parentOf(task);
  return {
    title: task.name,
    parent,
    ctx,
    get state() {
      const s = task.result?.state;
      return s === 'pass' ? 'passed' : s === 'fail' ? 'failed' : s === 'skip' ? 'pending' : undefined;
    },
    get err() { return task.result?.errors?.[0]; },
    fullTitle() { const p = parent.fullTitle(); return p ? `${p} ${task.name}` : task.name; },
    titlePath() { const out = []; let p = parent; while (p && !p.root) { out.unshift(p.title); p = p.parent; } return [...out, task.name]; },
  };
}

// Run a Mocha runnable (test or hook) with Mocha semantics: `this` is the suite context, `done`
// callbacks, returned promises, a resettable timeout (`this.timeout(n)`), "overspecified" detection.
// Mocha starts every test and hook from a fresh macrotask (its browser build schedules runnables with
// setTimeout); Vitest chains them on microtasks. Specs whose previous test leaves timers or yields
// pending rely on those running first, so give them the same gap.
const channel = new MessageChannel();
const waiting = [];
channel.port1.onmessage = () => waiting.shift()?.();
function macrotask() {
  return new Promise(resolve => { waiting.push(resolve); channel.port2.postMessage(null); });
}

// One gap per test, ahead of all its hooks (a hook per runnable would cost ~4ms each to timer clamping).
vitest.beforeEach(() => macrotask());

const cookieAccessor = Object.getOwnPropertyDescriptor(Document.prototype, 'cookie');
// In WebKit, a runnable after one that wrote cookies starts once document.cookie stops showing stale values (cookies.mjs)
const cookies = typeof __VITEST_WEBKIT__ !== 'undefined' && __VITEST_WEBKIT__ ? cookieSettler({
  read: () => cookieAccessor.get.call(document),
  now: realNow,
  wait: () => new Promise(resolve => realSetTimeout(resolve, 1)),
  // a round trip to the network process, which (in Playwright's WebKit) answers after the echoes of earlier writes
  barrier: globalThis.cookieStore ? () => globalThis.cookieStore.get('__vitest_cookie_barrier').catch(() => {}) : null,
  quietMs: globalThis.cookieStore ? 0 : 5,
  timeoutMs: 500,
}) : null;
if (cookies) {
  Object.defineProperty(Document.prototype, 'cookie', {
    ...cookieAccessor,
    get: cookieAccessor.get,
    set(value) {
      cookieAccessor.set.call(this, value);
      if (this === document) cookies.written(value);
    },
  });
}

function run(fn, options) {
  const settling = cookies?.settle();
  return settling ? settling.then(() => runNow(fn, options)) : runNow(fn, options);
}

function runNow(fn, { suite, timeout, title, vctx, kind }) {
  const ctx = suite.ctx;
  return new Promise((resolve, reject) => {
    let timer;
    let finished = false;
    const runnable = {
      timeout,
      setTimeout(ms) {
        this.timeout = ms;
        arm();
      }
    };
    function arm() {
      realClearTimeout(timer);
      const ms = runnable.timeout;
      if (ms > 0 && ms < NO_TIMEOUT) {
        timer = realSetTimeout(() => finish(new Error(
          `Timeout of ${ms}ms exceeded. For async tests and hooks, ensure "done()" is called; if returning a Promise, ensure it resolves. (${title})`
        )), ms);
      }
    }
    function finish(err) {
      if (finished) return;
      finished = true;
      realClearTimeout(timer);
      ctx.runnable = prev.runnable;
      running--;
      if (err != null && err !== false) {
        reject(err instanceof Error || (err && err.constructor?.name?.endsWith('Error')) ? err : new Error(`done() invoked with non-Error: ${JSON.stringify(err)}`));
      } else {
        resolve();
      }
    }
    const prev = { runnable: ctx.runnable };
    running++;
    ctx.runnable = runnable;
    ctx.vctx = vctx;
    ctx.test = vctx?.task ? testInfo(vctx.task, ctx) : { title, ctx };
    if (kind === 'test') ctx.currentTest = ctx.test;
    arm();
    // As Mocha does, a done() called before the function returns only settles once it has returned, so an
    // error thrown after it still fails the test; and a second done() is an error, raised out of band (where
    // Vitest reports it, failing the run) when the test has already settled.
    let calling = false;
    let calls = 0;
    let early;
    function done(err) {
      calls++;
      const e = calls > 1 ? new Error(`done() called multiple times in ${kind === 'test' ? 'test' : 'hook'} <${title}>`) : err;
      if (calling) {
        early = { err: e };
      } else if (!finished) {
        finish(e);
      } else if (e != null && e !== false) {
        realSetTimeout(() => { throw e; });
      }
    }
    try {
      if (fn.length > 0) {
        calling = true;
        let r;
        try {
          r = fn.call(ctx, done);
        } finally {
          calling = false;
        }
        if (r && typeof r.then === 'function') {
          finish(new Error('Resolution method is overspecified. Specify a callback *or* return a Promise; not both.'));
        } else if (early) {
          finish(early.err);
        }
      } else {
        const r = fn.call(ctx);
        if (r && typeof r.then === 'function') {
          r.then(() => finish(), (e) => finish(e ?? new Error('Promise rejected with no or falsy reason')));
        } else {
          finish();
        }
      }
    } catch (e) {
      finish(e);
    }
  });
}

// Mocha runs a suite's own tests before its child suites; Vitest runs them in declaration order.
// Some specs depend on Mocha's order (a test declared after a nested describe that only passes when
// it runs first), so put the tests first: a stable partition of what this describe() registered.
function mochaOrder() {
  const tasks = vitest.TestRunner.getCurrentSuite()?.tasks;
  if (!Array.isArray(tasks)) return;
  const tests = tasks.filter(t => t.type !== 'collector');
  const suites = tasks.filter(t => t.type === 'collector');
  tasks.splice(0, tasks.length, ...tests, ...suites);
}

function wrapDescribe(vDescribe) {
  return function describe(title, fn) {
    if (running) return ignoredWhileRunning('describe', title);
    if (typeof fn !== 'function') return vDescribe(title);
    const parent = currentSuite;
    const suite = { title, parent, timeout: parent.timeout, retries: parent.retries, ctx: makeCtx(parent.ctx) };
    return vDescribe(String(title), function () {
      currentSuite = suite;
      try {
        return fn.call(suiteThis(suite));
      } finally {
        currentSuite = parent;
        mochaOrder();
      }
    });
  };
}

function wrapIt(vIt) {
  return function it(title, fn) {
    if (running) return ignoredWhileRunning('it', title);
    if (typeof fn !== 'function') return vitest.it.skip(String(title), () => {});
    const suite = currentSuite;
    const timeout = suite.timeout;
    const opts = { timeout: NO_TIMEOUT, ...(suite.retries ? { retry: suite.retries } : {}) };
    return vIt(String(title), opts, (vctx) => run(fn, { suite, timeout, title, vctx, kind: "test" }));
  };
}

// Mocha silently ignores it()/describe()/hooks called while a test or hook is running, so whatever they
// assert never runs and the spec still passes (#16043). Fail the running test instead, so a new one can't
// go unnoticed. ESLint's mocha/no-nested-tests reports most of these too, but not a hook inside a test.
function ignoredWhileRunning(kind, title) {
  throw new Error(`[mocha shim] ${kind}(${title ? `'${title}'` : ''}) called inside a running test or hook. Mocha ignores ` +
    `it, so it would never run: move it to the enclosing describe() (for cleanup, use try/finally in the test).`);
}

function hookArgs(args) {
  // Mocha allows before('description', fn)
  return typeof args[0] === 'function' ? args[0] : args[1];
}

function wrapEachHook(vHook, setsCurrentTest) {
  return function (...args) {
    if (running) return ignoredWhileRunning(vHook.name, '');
    const fn = hookArgs(args);
    const suite = currentSuite;
    const timeout = suite.timeout;
    vHook((vctx) => {
      if (setsCurrentTest) suite.ctx.currentTest = testInfo(vctx.task, suite.ctx);
      return run(fn, { suite, timeout, title: `"${vHook.name}" hook`, vctx, kind: 'hook' });
    }, NO_TIMEOUT);
  };
}

function wrapAllHook(vHook) {
  return function (...args) {
    if (running) return ignoredWhileRunning(vHook.name, '');
    const fn = hookArgs(args);
    const suite = currentSuite;
    const timeout = suite.timeout;
    vHook(() => run(fn, { suite, timeout, title: `"${vHook.name}" hook`, kind: 'hook' }), NO_TIMEOUT);
  };
}

const describe = wrapDescribe(vitest.describe);
describe.only = wrapDescribe(vitest.describe.only);
describe.skip = wrapDescribe(vitest.describe.skip);
const it = wrapIt(vitest.it);
it.only = wrapIt(vitest.it.only);
it.skip = (title) => vitest.it.skip(String(title), () => {});

Object.assign(globalThis, {
  describe,
  context: describe,
  xdescribe: describe.skip,
  xcontext: describe.skip,
  it,
  specify: it,
  xit: it.skip,
  xspecify: it.skip,
  before: wrapAllHook(vitest.beforeAll),
  after: wrapAllHook(vitest.afterAll),
  beforeEach: wrapEachHook(vitest.beforeEach, true),
  afterEach: wrapEachHook(vitest.afterEach, true),
});

// With VITEST_COVERAGE=1 the sources are instrumented (babel-plugin-istanbul, as under karma-coverage);
// hand this page's counters to Node once the file is done (the writeCoverage command in vitest.config.mjs).
// Registered before the spec loads, so with sequence.hooks 'list' it runs ahead of the spec's top-level
// after() hooks; those are cleanup code, so their few counters are missed.
vitest.afterAll(async () => {
  if (window.__coverage__) await commands.writeCoverage(JSON.stringify(window.__coverage__));
});
