import {expect} from 'chai';
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
});
