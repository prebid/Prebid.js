import { EventEmitter } from 'node:events';
import { expect } from 'chai';
import { describe, it, beforeEach } from 'mocha';
import { DEBUG_INSTANCE, debugPage, withDebugInstance } from '../vitest/debug.mjs';

// debug.mjs keeps its sessions in module state, so these tests only assert seq numbers relative to the latest one
const tick = () => new Promise(resolve => setImmediate(resolve));

function request(url, method = 'GET') {
  return Object.assign(new EventEmitter(), { url, method });
}

function response() {
  let done;
  const res = {
    statusCode: 200,
    headers: {},
    ended: false,
    finished: new Promise(resolve => { done = resolve; }),
    setHeader(name, value) { this.headers[name.toLowerCase()] = value; },
    end(body) {
      this.ended = true;
      this.body = body;
      done(this);
    },
  };
  return res;
}

function fakeVitest() {
  const debugProject = { name: DEBUG_INSTANCE, createSpecification: file => ({ project: DEBUG_INSTANCE, file }) };
  const module = (name, moduleId) => ({ project: { name }, moduleId });
  return {
    watching: true,
    reruns: [],
    projects: [{ name: 'chromium' }, debugProject],
    shouldKeepServer() { return this.watching; },
    async waitForTestRunEnd() {},
    state: {
      getTestModules: () => [
        module('chromium', '/a_spec.js'),
        module('chromium', '/b_spec.js'),
        module('chromium', '/a_spec.js'),
        module(DEBUG_INSTANCE, '/c_spec.js'),
      ],
    },
    async rerunTestSpecifications(specs, allTestsRun) { this.reruns.push({ specs, allTestsRun }); },
    logger: { log() {}, error() {} },
  };
}

// the middleware debugPage() puts ahead of Vitest's own
function middleware(plugin) {
  const server = { middlewares: { stack: [{ route: '', handle: 'vitest' }] } };
  plugin.configureServer(server);
  expect(server.middlewares.stack[1].handle).to.equal('vitest');
  return server.middlewares.stack[0].handle;
}

describe('Vitest debug page (test/vitest/debug.mjs)', () => {
  let vitest, handle, debugInstance;

  beforeEach(() => {
    vitest = fakeVitest();
    const plugin = debugPage();
    plugin.configureVitest({ vitest });
    handle = middleware(plugin);
    debugInstance = withDebugInstance({ name: 'playwright', providerFactory: () => null })
      .providerFactory({ name: DEBUG_INSTANCE, browser: { registerCommand() {} } });
  });

  function get(url, req = request(url)) {
    const res = response();
    let passed = false;
    handle(req, res, () => { passed = true; });
    return { req, res, passed: () => passed };
  }

  async function latestSeq() {
    await debugInstance.openPage('session', '/?sessionId=latest');
    return JSON.parse((await get('/__debug__/next?after=0').res.finished).body).seq;
  }

  describe('withDebugInstance', () => {
    it('gives the debug project the stub provider, and the others the wrapped one', () => {
      const wrapped = { browser: 'chromium' };
      const provider = withDebugInstance({ name: 'playwright', options: { x: 1 }, providerFactory: () => wrapped });
      expect(provider).to.include({ name: 'playwright' });
      expect(provider.options).to.eql({ x: 1 });
      expect(provider.providerFactory({ name: 'chromium' })).to.equal(wrapped);
      const commands = {};
      const stub = provider.providerFactory({ name: DEBUG_INSTANCE, browser: { registerCommand: (name, fn) => { commands[name] = fn; } } });
      expect(stub).to.not.equal(wrapped);
      expect(stub.name).to.equal('debug');
      expect(commands).to.have.property('__vitest_viewport');
    });

    it('the stub is open between openPage and close', async () => {
      expect(debugInstance.isOpen()).to.equal(false);
      await debugInstance.openPage('session', '/?sessionId=1');
      expect(debugInstance.isOpen()).to.equal(true);
      await debugInstance.close();
      expect(debugInstance.isOpen()).to.equal(false);
    });
  });

  describe('/__debug__/next', () => {
    it('answers a pending long-poll with the session the stub opens next', async () => {
      const seq = await latestSeq();
      const { res } = get(`/__debug__/next?after=${seq}`);
      await tick();
      expect(res.ended).to.equal(false);
      await debugInstance.openPage('session', '/?sessionId=next');
      await res.finished;
      expect(JSON.parse(res.body)).to.eql({ seq: seq + 1, url: '/?sessionId=next' });
      expect(res.headers).to.include({ 'content-type': 'application/json', 'cache-control': 'no-store' });
    });

    it('answers at once with the latest session when asked after an older one', async () => {
      const seq = await latestSeq();
      await debugInstance.openPage('session', '/?sessionId=newer');
      const { res } = get(`/__debug__/next?after=${seq - 1}`);
      await res.finished;
      expect(JSON.parse(res.body)).to.eql({ seq: seq + 1, url: '/?sessionId=newer' });
    });

    it('does not answer a long-poll whose request has closed', async () => {
      const seq = await latestSeq();
      const gone = get(`/__debug__/next?after=${seq}`);
      const live = get(`/__debug__/next?after=${seq}`);
      gone.req.emit('close');
      await debugInstance.openPage('session', '/?sessionId=after-close');
      await live.res.finished;
      await tick();
      expect(gone.res.ended).to.equal(false);
    });
  });

  describe('/__debug__/run', () => {
    it('is refused outside of watch mode', async () => {
      vitest.watching = false;
      const { res } = get('/__debug__/run', request('/__debug__/run', 'POST'));
      await res.finished;
      expect(res.statusCode).to.equal(409);
      expect(vitest.reruns).to.eql([]);
    });

    it('answers with the current seq and reruns the other instance\'s specs in the debug instance', async () => {
      const seq = await latestSeq();
      const { res } = get('/__debug__/run', request('/__debug__/run', 'POST'));
      await res.finished;
      expect(res.statusCode).to.equal(200);
      expect(JSON.parse(res.body)).to.eql({ seq });
      await tick();
      expect(vitest.reruns).to.eql([{
        specs: [{ project: DEBUG_INSTANCE, file: '/a_spec.js' }, { project: DEBUG_INSTANCE, file: '/b_spec.js' }],
        allTestsRun: false,
      }]);
    });

    it('is only for POST', () => {
      expect(get('/__debug__/run').passed()).to.equal(true);
    });
  });

  describe('the page', () => {
    ['/debug.html', '/', '/?foo=1'].forEach(url => {
      it(`is served at ${url}`, async () => {
        const { res, passed } = get(url);
        await res.finished;
        expect(passed()).to.equal(false);
        expect(res.headers['content-type']).to.equal('text/html');
        expect(res.body).to.contain('/__debug__/run');
      });
    });

    it('leaves the test iframe\'s /?sessionId= and everything else to the next middleware', () => {
      ['/?sessionId=abc', '/context.html', '/__vitest_test__/'].forEach(url => {
        const { res, passed } = get(url);
        expect(passed(), url).to.equal(true);
        expect(res.ended, url).to.equal(false);
      });
    });
  });
});
