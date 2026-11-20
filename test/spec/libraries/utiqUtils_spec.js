import { expect } from 'chai';
import { findUtiqService } from 'libraries/utiqUtils/utiqUtils.js';

describe('Utiq service discovery', () => {
  const moduleName = 'utiq-test-module';
  let sandbox;
  let storage;
  let refreshUserIds;
  let addEventListener;
  let postMessage;
  let locator;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
    storage = {
      setDataInLocalStorage: sandbox.spy(),
      removeDataFromLocalStorage: sandbox.spy()
    };
    refreshUserIds = sandbox.spy();
    // Capture the callback without registering a persistent window listener.
    addEventListener = sandbox.stub(window, 'addEventListener');
    postMessage = sandbox.stub(window, 'postMessage');
  });

  afterEach(() => {
    locator?.remove();
    sandbox.restore();
  });

  function discover() {
    locator = document.createElement('iframe');
    locator.name = '__utiqLocator';
    document.body.appendChild(locator);
    findUtiqService(storage, refreshUserIds, 'Utiq test', moduleName);
    return addEventListener.firstCall.args[1];
  }

  function reply(listener, { origin = 'https://publisher.example', action = 'returnIdGraphEntry', description = { moduleName }, idGraphData } = {}) {
    listener({ origin, data: { action, description, idGraphData } });
  }

  it('leaves storage and listeners unchanged when no frame has a Utiq locator', () => {
    findUtiqService(storage, refreshUserIds, 'Utiq test', moduleName);

    expect(addEventListener.called).to.be.false;
    expect(postMessage.called).to.be.false;
    expect(storage.setDataInLocalStorage.called).to.be.false;
    expect(storage.removeDataFromLocalStorage.called).to.be.false;
    expect(refreshUserIds.called).to.be.false;
  });

  it('requests an ID graph from the frame containing the Utiq locator', () => {
    discover();

    expect(addEventListener.calledOnceWithExactly('message', sinon.match.func)).to.be.true;
    expect(postMessage.calledOnceWithExactly({
      action: 'getIdGraphEntry',
      description: { moduleName }
    }, '*')).to.be.true;
    expect(refreshUserIds.called).to.be.false;
  });

  [
    { atid: 'advertising-token', mtid: 'marketing-token', domain: 'publisher.example' },
    { atid: 'advertising-token', domain: 'publisher.example' }
  ].forEach(idGraphData => {
    it(`stores a cross-origin ID graph ${idGraphData.mtid ? 'with' : 'without'} the optional marketing token before refreshing IDs`, () => {
      const listener = discover();
      reply(listener, { idGraphData });

      expect(storage.setDataInLocalStorage.calledOnceWithExactly('utiqPass', JSON.stringify({
        connectId: { idGraph: [idGraphData] }
      }))).to.be.true;
      expect(storage.removeDataFromLocalStorage.called).to.be.false;
      expect(refreshUserIds.calledOnceWithExactly()).to.be.true;
      expect(storage.setDataInLocalStorage.calledBefore(refreshUserIds)).to.be.true;
    });
  });

  [null, undefined].forEach(idGraphData => {
    it(`removes a stale pass and refreshes IDs when the cross-origin graph is ${idGraphData}`, () => {
      const listener = discover();
      reply(listener, { idGraphData });

      expect(storage.removeDataFromLocalStorage.calledOnceWithExactly('utiqPass')).to.be.true;
      expect(storage.setDataInLocalStorage.called).to.be.false;
      expect(refreshUserIds.calledOnceWithExactly()).to.be.true;
      expect(storage.removeDataFromLocalStorage.calledBefore(refreshUserIds)).to.be.true;
    });
  });

  [
    { origin: window.origin, idGraphData: { atid: 'same-origin-token' } },
    { action: 'otherAction', description: undefined, idGraphData: { atid: 'unrelated-token' } },
    { description: { moduleName: 'another-module' }, idGraphData: { atid: 'other-module-token' } }
  ].forEach(message => {
    it(`ignores a message for ${message.origin ? 'the current origin' : message.action || 'another module'}`, () => {
      const listener = discover();
      reply(listener, message);

      expect(storage.setDataInLocalStorage.called).to.be.false;
      expect(storage.removeDataFromLocalStorage.called).to.be.false;
      expect(refreshUserIds.called).to.be.false;
    });
  });
});
