import { expect } from 'chai';
import { Renderer, executeRenderer } from 'src/Renderer.js';
import * as utils from 'src/utils.js';
import { loadExternalScriptStub } from 'test/mocks/adloaderStub.js';
import { getGlobal } from '../../src/prebidGlobal.js';

describe('Renderer', function () {
  let oldAdUnits;
  beforeEach(function () {
    oldAdUnits = getGlobal().adUnits;
    getGlobal().adUnits = [];
  });

  afterEach(function () {
    getGlobal().adUnits = oldAdUnits;
  });

  describe('Renderer: A renderer installed on a bid response', function () {
    let testRenderer1;
    let testRenderer2;
    let spyRenderFn;
    let spyEventHandler;

    beforeEach(function () {
      testRenderer1 = Renderer.install({
        url: 'https://httpbin.org/post',
        config: { test: 'config1' },
        id: 1
      });
      testRenderer2 = Renderer.install({
        url: 'https://httpbin.org/post',
        config: { test: 'config2' },
        id: 2
      });

      spyRenderFn = sinon.spy();
      spyEventHandler = sinon.spy();
    });

    it('is an instance of Renderer', function () {
      expect(testRenderer1 instanceof Renderer).to.equal(true);
    });

    it('has expected properties ', function () {
      expect(testRenderer1.url).to.equal('https://httpbin.org/post');
      expect(testRenderer1.config).to.deep.equal({ test: 'config1' });
      expect(testRenderer1.id).to.equal(1);
    });

    it('returns config from getConfig method', function () {
      expect(testRenderer1.getConfig()).to.deep.equal({ test: 'config1' });
      expect(testRenderer2.getConfig()).to.deep.equal({ test: 'config2' });
    });

    it('sets a render function with the setRender method', function () {
      testRenderer1.setRender(spyRenderFn);
      expect(typeof testRenderer1.render).to.equal('function');
      testRenderer1.render();
      expect(spyRenderFn.called).to.equal(true);
    });

    it('sets event handlers with setEventHandlers method and handles events with installed handlers', function () {
      testRenderer1.setEventHandlers({
        testEvent: spyEventHandler
      });

      expect(testRenderer1.handlers).to.deep.equal({
        testEvent: spyEventHandler
      });

      testRenderer1.handleVideoEvent({ id: 1, eventName: 'testEvent' });
      expect(spyEventHandler.called).to.equal(true);
    });

    it('pushes commands to queue if renderer is not loaded', function () {
      testRenderer1.loaded = false;
      testRenderer1.push(spyRenderFn);
      expect(testRenderer1.cmd.length).to.equal(1);

      // clear queue for next tests
      testRenderer1.cmd = [];
    });

    it('fires commands immediately if the renderer is loaded', function () {
      const func = sinon.spy();

      testRenderer1.loaded = true;
      testRenderer1.push(func);

      expect(testRenderer1.cmd.length).to.equal(0);

      sinon.assert.calledOnce(func);
    });

    it('processes queue by calling each function in queue', function () {
      testRenderer1.loaded = false;
      const func1 = sinon.spy();
      const func2 = sinon.spy();

      testRenderer1.push(func1);
      testRenderer1.push(func2);
      expect(testRenderer1.cmd.length).to.equal(2);

      testRenderer1.process();

      sinon.assert.calledOnce(func1);
      sinon.assert.calledOnce(func2);
      expect(testRenderer1.cmd.length).to.equal(0);
    });

    it('renders immediately when requested', function () {
      const testRenderer3 = Renderer.install({
        config: { test: 'config2' },
        id: 2,
        renderNow: true
      });
      const func1 = sinon.spy();
      const testArg = 'testArgument';

      testRenderer3.setRender(func1);
      testRenderer3.render(testArg);
      sinon.assert.calledWith(func1, testArg);
      sinon.assert.notCalled(loadExternalScriptStub);
    });
  });

  describe('render() result', function () {
    function rejectionOf(promise) {
      return promise.then(() => { throw new Error('did not reject'); }, (e) => e);
    }

    function failLoad(err) {
      loadExternalScriptStub.callsFake((url, type, code, callback) => {
        callback.error(err);
      });
    }

    function install(options = {}) {
      return Renderer.install({ url: 'https://renderer.example/r.js', ...options });
    }

    it('resolves once the script has loaded and the render function has run', async () => {
      const renderer = install();
      const renderFn = sinon.spy();
      renderer.setRender(renderFn);
      await renderer.render('bid');
      sinon.assert.calledWith(renderFn, 'bid');
    });

    it('rejects when the script fails to load, without rendering', async () => {
      const err = new Error('load failed');
      failLoad(err);
      const renderer = install();
      const renderFn = sinon.spy();
      renderer.setRender(renderFn);
      expect(await rejectionOf(renderer.render())).to.equal(err);
      sinon.assert.notCalled(renderFn);
    });

    it('rejects when the render function throws', async () => {
      const err = new Error('render failed');
      const renderer = install();
      renderer.setRender(() => { throw err; });
      expect(await rejectionOf(renderer.render())).to.equal(err);
    });

    it('rejects when a command pushed by the render function throws', async () => {
      const err = new Error('command failed');
      const renderer = install();
      renderer.setRender(() => renderer.push(() => { throw err; }));
      expect(await rejectionOf(renderer.render())).to.equal(err);
    });

    it('settles each queued render on its own outcome', async () => {
      const callbacks = [];
      loadExternalScriptStub.callsFake((url, type, code, callback) => { callbacks.push(callback); });
      const err = new Error('render failed');
      const renderer = install();
      renderer.setRender((bid) => renderer.push(() => {
        if (bid === 'bad') throw err;
      }));
      const good = renderer.render('good');
      const bad = renderer.render('bad');
      callbacks.forEach(cb => cb.success());
      await good;
      expect(await rejectionOf(bad)).to.equal(err);
    });

    it('resolves when the queue is drained by something other than process()', async () => {
      let renderer;
      renderer = install({
        callback() {
          renderer.loaded = true;
          renderer.cmd.splice(0).forEach(cmd => cmd());
        }
      });
      renderer.setRender(() => {});
      await renderer.render();
    });

    it('does not render a failed attempt when rendering again', async () => {
      failLoad(new Error('load failed'));
      const renderer = install();
      const renderFn = sinon.spy();
      renderer.setRender(renderFn);
      await rejectionOf(renderer.render());
      loadExternalScriptStub.resetBehavior();
      loadExternalScriptStub.callsFake((url, type, code, callback) => callback.success());
      await renderer.render();
      sinon.assert.calledOnce(renderFn);
    });

    describe('with a callback given to install', () => {
      it('resolves once that callback processes the queue', async () => {
        let renderer;
        const callback = sinon.spy(() => {
          renderer.loaded = true;
          renderer.process();
        });
        renderer = install({ callback });
        renderer.setRender(() => {});
        await renderer.render();
        sinon.assert.calledOnce(callback);
      });

      it('accepts it as a {success, error} object', async () => {
        let renderer;
        const callback = {
          success: sinon.spy(() => {
            renderer.loaded = true;
            renderer.process();
          }),
          error: sinon.spy()
        };
        renderer = install({ callback });
        const renderFn = sinon.spy();
        renderer.setRender(renderFn);
        await renderer.render();
        sinon.assert.calledOnce(callback.success);
        sinon.assert.calledOnce(renderFn);
      });

      it('calls the error handler of a {success, error} object on a load failure', async () => {
        const err = new Error('load failed');
        failLoad(err);
        const callback = { success: sinon.spy(), error: sinon.spy() };
        const renderer = install({ callback });
        expect(await rejectionOf(renderer.render())).to.equal(err);
        sinon.assert.calledWith(callback.error, err);
        sinon.assert.notCalled(callback.success);
      });

      it('rejects when that callback throws', async () => {
        const err = new Error('callback failed');
        loadExternalScriptStub.callsFake((url, type, code, callback) => {
          try {
            callback.success();
          } catch (e) {}
        });
        const renderer = install({ callback: () => { throw err; } });
        expect(await rejectionOf(renderer.render())).to.equal(err);
      });

      it('rejects on a load failure and still calls its error handler', async () => {
        const err = new Error('load failed');
        failLoad(err);
        const callback = Object.assign(sinon.spy(), { error: sinon.spy() });
        const renderer = install({ callback });
        expect(await rejectionOf(renderer.render())).to.equal(err);
        sinon.assert.calledWith(callback.error, err);
        sinon.assert.notCalled(callback);
      });
    });

    describe('with renderNow', () => {
      it('resolves after rendering, without loading a script', async () => {
        const renderer = install({ url: undefined, renderNow: true });
        const renderFn = sinon.spy();
        renderer.setRender(renderFn);
        await renderer.render();
        sinon.assert.calledOnce(renderFn);
        sinon.assert.notCalled(loadExternalScriptStub);
      });

      it('rejects when the render function throws', async () => {
        const err = new Error('render failed');
        const renderer = install({ url: undefined, renderNow: true });
        renderer.setRender(() => { throw err; });
        expect(await rejectionOf(renderer.render())).to.equal(err);
      });
    });
  });

  describe('3rd party renderer', function () {
    let logWarnSpy;
    beforeEach(function () {
      logWarnSpy = sinon.spy(utils, 'logWarn');
    });

    afterEach(function() {
      logWarnSpy.restore();
    });

    it('should not load renderer and log warn message', function() {
      getGlobal().adUnits = [{
        code: 'video1',
        renderer: {
          url: 'http://acdn.adnxs.com/video/outstream/ANOutstreamVideo.js',
          render: sinon.spy()
        }
      }];

      const testRenderer = Renderer.install({
        url: 'https://httpbin.org/post',
        config: { test: 'config1' },
        id: 1,
        adUnitCode: 'video1'
      });
      const renderFn = sinon.spy();
      testRenderer.setRender(renderFn);

      testRenderer.render();
      sinon.assert.calledOnce(logWarnSpy);
      sinon.assert.calledOnce(renderFn);
      sinon.assert.notCalled(loadExternalScriptStub);
    });

    it('should load renderer adunit renderer when backupOnly', function() {
      getGlobal().adUnits = [{
        code: 'video1',
        renderer: {
          url: 'http://acdn.adnxs.com/video/outstream/ANOutstreamVideo.js',
          backupOnly: true,
          render: sinon.spy()
        }
      }];

      const testRenderer = Renderer.install({
        url: 'https://httpbin.org/post',
        config: { test: 'config1' },
        id: 1,
        adUnitCode: 'video1'

      });
      testRenderer.setRender(() => {});

      testRenderer.render();
      expect(loadExternalScriptStub.called).to.be.true;
    });

    it('should load external script instead of publisher-defined one when backupOnly option is true in mediaTypes.video options', function() {
      getGlobal().adUnits = [{
        code: 'video1',
        mediaTypes: {
          video: {
            context: 'outstream',
            mimes: ['video/mp4'],
            playerSize: [[400, 300]],
            renderer: {
              url: 'https://acdn.adnxs.com/video/outstream/ANOutstreamVideo.js',
              backupOnly: true,
              render: sinon.spy()
            },
          }
        }
      }];

      const testRenderer = Renderer.install({
        url: 'https://httpbin.org/post',
        config: { test: 'config1' },
        id: 1,
        adUnitCode: 'video1'

      });
      testRenderer.setRender(() => {});

      testRenderer.render();
      expect(loadExternalScriptStub.called).to.be.true;
    });

    it('should call loadExternalScript() for script not defined on adUnit, only when .render() is called', function() {
      getGlobal().adUnits = [{
        code: 'video1',
        mediaTypes: { video: { context: 'outstream' } }
      }];
      const testRenderer = Renderer.install({
        url: 'https://httpbin.org/post',
        config: { test: 'config1' },
        id: 1,
        adUnitCode: 'video1'
      });
      const renderFn = sinon.spy();
      testRenderer.setRender(renderFn);
      sinon.assert.notCalled(loadExternalScriptStub);

      testRenderer.render();
      sinon.assert.calledWith(loadExternalScriptStub, 'https://httpbin.org/post');
      sinon.assert.calledOnce(renderFn);
    });

    it('renders into the document returned by documentResolver', function () {
      const resolvedDoc = document.implementation.createHTMLDocument('');
      const renderDoc = document.implementation.createHTMLDocument('');
      const documentResolver = sinon.stub().returns(resolvedDoc);
      const bid = {};

      const testRenderer = Renderer.install({
        url: 'https://httpbin.org/post',
        config: { documentResolver: documentResolver }
      });
      const renderFn = sinon.spy();
      testRenderer.setRender(renderFn);

      executeRenderer(testRenderer, bid, renderDoc);

      sinon.assert.calledWith(documentResolver, bid, document, renderDoc);
      expect(testRenderer.documentContext).to.equal(resolvedDoc);
      expect(loadExternalScriptStub.firstCall.args[4]).to.equal(resolvedDoc);
      sinon.assert.calledWith(renderFn, bid, resolvedDoc);
    });
  });
});
