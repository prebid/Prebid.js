import { expect } from 'chai';
import { init } from 'modules/userId/index.js';
import * as utils from 'src/utils.js';
import * as idImportLibrary from 'modules/idImportLibrary.js';
import { getGlobal } from 'src/prebidGlobal.js';
import { config } from 'src/config.js';
import { hook } from 'src/hook.js';
import * as activities from 'src/activities/rules.js';
import { ACTIVITY_ENRICH_UFPD } from 'src/activities/activities.js';
import { server } from 'test/mocks/xhr.js';
import * as emailHash from 'libraries/uid2IdSystemShared/uid2IdSystem_shared.js';
import { GreedyPromise } from 'libraries/greedy/greedyPromise.js';

describe('IdImportLibrary', function () {
  const NativeMutationObserver = window.MutationObserver;
  const url = 'https://example.com/id-import';
  const userIds = { id: { MOCKID: '1111' } };
  let sandbox;
  let fixture;
  let observers;
  let observerStub;
  let refreshUserIds;
  let getUserIds;
  let hashStub;

  before(function () {
    hook.ready();
    init(config);
  });

  beforeEach(function () {
    sandbox = sinon.createSandbox();
    sandbox.stub(utils, 'logInfo');
    sandbox.stub(utils, 'logError');
    sandbox.stub(activities, 'isActivityAllowed').returns(true);
    refreshUserIds = sandbox.stub(getGlobal(), 'refreshUserIds');
    getUserIds = sandbox.stub(getGlobal(), 'getUserIds').returns(userIds);
    // Keep non-hashing tests synchronous so no digest outlives its test.
    hashStub = sandbox.stub(emailHash, 'sha256Base64').returns(GreedyPromise.resolve('hashed-email'));
    fixture = document.createElement('div');
    document.body.appendChild(fixture);
    observers = [];
    observerStub = sandbox.stub(window, 'MutationObserver').callsFake(callback => {
      const observer = { callback, observe: sandbox.spy(), disconnect: sandbox.spy() };
      observers.push(observer);
      return observer;
    });
  });

  afterEach(function () {
    // An accepted empty input scan also removes listeners left by an unfinished scan.
    fixture.innerHTML = '';
    activities.isActivityAllowed.returns(true);
    idImportLibrary.setConfig({ url, inputscan: true });
    observers.forEach(observer => observer.disconnect());
    fixture.remove();
    sandbox.restore();
  });

  function configure(options = {}) {
    const settings = { url, ...options };
    idImportLibrary.setConfig(settings);
    return settings;
  }

  function input(value = '', type = 'text', id) {
    const element = document.createElement('input');
    if (type !== null) element.type = type;
    if (id) element.id = id;
    element.value = value;
    fixture.appendChild(element);
    return element;
  }

  function dispatch(element, type, value = 'test@example.com') {
    element.value = value;
    element.dispatchEvent(new Event(type));
  }

  describe('configuration', function () {
    [undefined, {}, { inputscan: true }].forEach(settings => {
      it(`rejects missing configuration or URL: ${JSON.stringify(settings)}`, function () {
        idImportLibrary.setConfig(settings);
        sinon.assert.calledOnce(utils.logError);
        sinon.assert.notCalled(refreshUserIds);
        sinon.assert.notCalled(observerStub);
      });
    });

    it('sets defaults and preserves explicit options', function () {
      expect(configure({ inputscan: true })).to.include({ debounce: 250, fullscan: false, inputscan: true });
      expect(configure({ debounce: 0, fullscan: true, inputscan: false }))
        .to.include({ debounce: 0, fullscan: true, inputscan: false });
    });

    it('does not scan when the activity is denied', function () {
      activities.isActivityAllowed.returns(false);
      input('test@example.com');
      configure({ inputscan: true });
      sinon.assert.calledWith(activities.isActivityAllowed, ACTIVITY_ENRICH_UFPD);
      sinon.assert.calledOnce(utils.logError);
      sinon.assert.notCalled(refreshUserIds);
    });
  });

  describe('input listeners', function () {
    ['change', 'blur'].forEach(eventType => {
      it(`stops all scanned inputs after the first valid ${eventType}`, function () {
        const first = input();
        const second = input('', 'email');
        configure({ inputscan: true });
        dispatch(first, eventType, 'invalid');
        sinon.assert.notCalled(refreshUserIds);
        dispatch(first, eventType);
        dispatch(first, 'change');
        dispatch(first, 'blur');
        dispatch(second, 'change');
        dispatch(second, 'blur');
        sinon.assert.calledOnce(refreshUserIds);
      });

      [null, 'text', 'email', 'search'].forEach(type => {
        it(`removes both listeners from a configured ${type || 'default-type'} input after ${eventType}`, function () {
          const element = input('', type, 'id-import-email');
          configure({ formElementId: element.id });
          dispatch(element, eventType);
          dispatch(element, 'change');
          dispatch(element, 'blur');
          sinon.assert.calledOnce(refreshUserIds);
        });
      });
    });

    it('cleans up the original elements after they are detached or their type changes', function () {
      const detached = input();
      const changed = input();
      configure({ inputscan: true });
      detached.remove();
      changed.type = 'search';
      dispatch(changed, 'change');
      dispatch(detached, 'change');
      dispatch(detached, 'blur');
      dispatch(changed, 'blur');
      sinon.assert.calledOnce(refreshUserIds);
    });

    it('removes old listeners when configuration changes', function () {
      const oldInput = input('', 'text', 'id-import-old');
      const newInput = input('', 'text', 'id-import-new');
      configure({ formElementId: oldInput.id });
      configure({ formElementId: newInput.id });
      dispatch(oldInput, 'change');
      sinon.assert.notCalled(refreshUserIds);
      dispatch(newInput, 'blur');
      sinon.assert.calledOnce(refreshUserIds);
    });

    it('does not duplicate listeners when configured repeatedly', function () {
      const element = input();
      configure({ inputscan: true });
      configure({ inputscan: true });
      dispatch(element, 'change');
      sinon.assert.calledOnce(refreshUserIds);
    });

    it('accepts an already populated input without registering listeners', function () {
      const element = input('test@example.com');
      configure({ inputscan: true });
      dispatch(element, 'change');
      sinon.assert.calledOnce(refreshUserIds);
    });

    it('accepts an already populated configured form input', function () {
      const element = input('test@example.com', 'email', 'id-import-email');
      configure({ formElementId: element.id });
      sinon.assert.calledOnce(refreshUserIds);
    });

    it('ignores a missing configured form input', function () {
      expect(() => configure({ formElementId: 'id-import-missing' })).not.to.throw();
      sinon.assert.notCalled(refreshUserIds);
    });

    it('does not post when user IDs are empty', function () {
      getUserIds.returns({});
      input('test@example.com');
      configure({ inputscan: true });
      sinon.assert.calledOnce(refreshUserIds);
      sinon.assert.notCalled(hashStub);
      expect(server.requests).to.have.length(0);
    });
  });

  describe('observers', function () {
    it('scans the body once without installing a fullscan observer by default', function () {
      fixture.textContent = 'test@example.com';
      configure();
      sinon.assert.calledOnce(refreshUserIds);
      sinon.assert.notCalled(observerStub);
    });

    it('debounces body mutations and disconnects after finding an email', function () {
      const clock = sandbox.useFakeTimers();
      configure({ fullscan: true, debounce: 250 });
      const observer = observers[0];
      fixture.textContent = 'test@example.com';
      observer.callback([], observer);
      clock.tick(100);
      observer.callback([], observer);
      clock.tick(249);
      sinon.assert.notCalled(refreshUserIds);
      clock.tick(1);
      sinon.assert.calledOnce(refreshUserIds);
      sinon.assert.calledOnce(observer.disconnect);
    });

    it('filters unrelated attributes while observing value changes', async function () {
      const clock = sandbox.useFakeTimers();
      observerStub.callsFake(callback => {
        const observer = new NativeMutationObserver(callback);
        observers.push(observer);
        return observer;
      });
      const element = input();
      configure({ fullscan: true, debounce: 10 });
      element.setAttribute('data-email', 'test@example.com');
      await Promise.resolve();
      clock.tick(10);
      sinon.assert.notCalled(refreshUserIds);
      element.setAttribute('value', 'test@example.com');
      await Promise.resolve();
      clock.tick(10);
      sinon.assert.calledOnce(refreshUserIds);
    });

    it('disconnects the body observer if an input has already supplied an email', function () {
      const clock = sandbox.useFakeTimers();
      configure({ fullscan: true, debounce: 0 });
      const observer = observers[0];
      input('test@example.com');
      configure({ inputscan: true });
      observer.callback([], observer);
      clock.tick(0);
      sinon.assert.calledOnce(refreshUserIds);
      sinon.assert.calledOnce(observer.disconnect);
    });

    it('reads an existing target', function () {
      fixture.innerHTML = '<div id="id-import-target">test@example.com</div>';
      configure({ target: 'id-import-target' });
      sinon.assert.calledOnce(refreshUserIds);
      sinon.assert.notCalled(observers[0].observe);
    });

    it('observes an empty target and disconnects after text is added', function () {
      const clock = sandbox.useFakeTimers();
      fixture.innerHTML = '<div id="id-import-target"></div>';
      configure({ target: 'id-import-target', debounce: 0 });
      const observer = observers[0];
      sinon.assert.calledWith(observer.observe, fixture.firstChild, sinon.match({ attributeFilter: ['value'] }));
      observer.callback([{ addedNodes: [document.createTextNode('test@example.com')] }], observer);
      clock.tick(0);
      sinon.assert.calledOnce(refreshUserIds);
      sinon.assert.calledOnce(observer.disconnect);
    });

    it('ignores a missing target', function () {
      configure({ target: 'id-import-missing' });
      sinon.assert.notCalled(observers[0].observe);
      sinon.assert.notCalled(refreshUserIds);
    });
  });

  if (window.isSecureContext) {
    describe('posted email hashes', function () {
      // Resolve the real digest before teardown, including if assertions fail.
      async function postedRequest(action) {
        const requestsBefore = server.requests.length;
        let hashing;
        hashStub.callsFake(value => {
          hashing = hashStub.wrappedMethod(value);
          return hashing;
        });
        action();
        expect(hashing).to.exist;
        await hashing;
        expect(server.requests).to.have.length(requestsBefore + 1);
        return server.requests[requestsBefore];
      }

      [
        ['Test.User+promo@Gmail.com', '2unHxVaXuhcNa0lMRYZJvUaa9SVSAoDQ3PyY100TsX4='],
        ['test.user+promo@example.com', 'GW/KUA/us/8JCF3etL7dyk3ugEVUsnTAbNYHHJXVr0g='],
        ['test%promo@example.com', '2lwHebR7ZNi+W2ihsvn3ohtJibznlAFbqCkg+jB59UY=']
      ].forEach(([address, expectedHash]) => {
        it(`extracts and posts the full address for ${address}`, async function () {
          input(address);
          const request = await postedRequest(() => configure({ inputscan: true }));
          expect(request.method).to.equal('POST');
          expect(JSON.parse(request.requestBody)).to.deep.equal({ hid: expectedHash, uids: userIds });
          expect(request.withCredentials).to.equal(true);
        });
      });

      it('posts only once for subsequent change and blur events', async function () {
        const element = input();
        configure({ inputscan: true });
        await postedRequest(() => {
          dispatch(element, 'change');
          dispatch(element, 'blur');
          dispatch(element, 'change');
        });
        sinon.assert.calledOnce(refreshUserIds);
        sinon.assert.calledOnce(hashStub);
      });

      it('keeps the configured URL while hashing is pending', async function () {
        input('test@example.com');
        const request = await postedRequest(() => {
          configure({ inputscan: true });
          configure({ url: `${url}/new`, target: 'id-import-missing' });
        });
        expect(request.url).to.equal(url);
      });
    });
  }
});
