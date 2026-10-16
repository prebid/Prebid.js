import { expect } from 'chai';
import sinon from 'sinon';

function loadAutoplay() {
  delete require.cache[require.resolve('../../../libraries/autoplayDetection/autoplay.js')];
  return require('../../../libraries/autoplayDetection/autoplay.js');
}

describe('autoplay detection', () => {
  let createElementStub;
  afterEach(() => {
    if (createElementStub) {
      createElementStub?.restore();
    }
    delete require.cache[require.resolve('../../../libraries/autoplayDetection/autoplay.js')];
  });

  it('does not throw when play() does not return a promise', () => {
    const video = {
      play: sinon.stub().returns(undefined),
      setAttribute: sinon.stub(),
      muted: false,
      src: ''
    };
    createElementStub = sinon.stub(document, 'createElement');
    createElementStub.withArgs('video').returns(video);

    let mod;
    expect(() => { mod = loadAutoplay(); }).to.not.throw();
    expect(mod.isAutoplayEnabled()).to.equal(false);
  });

  function loadAutoplayWithPlay(play) {
    const video = {
      play: sinon.stub().callsFake(play),
      setAttribute: sinon.stub(),
      muted: false,
      src: ''
    };
    createElementStub = sinon.stub(document, 'createElement');
    createElementStub.withArgs('video').returns(video);
    return loadAutoplay();
  }

  const flushPromises = () => new Promise((resolve) => setTimeout(resolve, 0));

  it('returns true while the detection is pending', () => {
    const mod = loadAutoplayWithPlay(() => new Promise(() => {}));
    expect(mod.isAutoplayEnabled()).to.equal(true);
  });

  it('returns true when play() resolves', async () => {
    const mod = loadAutoplayWithPlay(() => Promise.resolve());
    await flushPromises();
    expect(mod.isAutoplayEnabled()).to.equal(true);
  });

  it('returns false when play() is rejected with a NotAllowedError', async () => {
    const mod = loadAutoplayWithPlay(() => Promise.reject(new DOMException('play() is not allowed', 'NotAllowedError')));
    await flushPromises();
    expect(mod.isAutoplayEnabled()).to.equal(false);
  });

  ['AbortError', 'NotSupportedError'].forEach((name) => {
    it(`returns true when play() is rejected with a ${name}`, async () => {
      const mod = loadAutoplayWithPlay(() => Promise.reject(new DOMException('play() failed', name)));
      await flushPromises();
      expect(mod.isAutoplayEnabled()).to.equal(true);
    });
  });
});
