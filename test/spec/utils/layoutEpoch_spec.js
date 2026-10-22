import {
  dep,
  endLayoutEpoch,
  enterLayoutEpoch,
  onLayoutEpochEnd,
  startLayoutEpoch
} from '../../../src/utils/layoutEpoch.js';
import { clearCache, getBoundingClientRect } from '../../../libraries/boundingClientRect/boundingClientRect.js';
import {
  getWinDimensions,
  internal as winDimensionsInternal,
  resetWinDimensions
} from '../../../src/utils/winDimensions.js';
import { CachedApiWrapper } from '../../../src/utils/cachedApiWrapper.js';

describe('layoutEpoch', () => {
  let sandbox, now, frames, reset, unregister;

  function runFrame() {
    frames.splice(0).forEach(callback => callback());
  }

  beforeEach(() => {
    sandbox = sinon.createSandbox();
    now = 1000;
    frames = [];
    sandbox.stub(dep, 'now').callsFake(() => now);
    sandbox.stub(dep, 'requestAnimationFrame').callsFake(callback => frames.push(callback));
    endLayoutEpoch();
    reset = sinon.stub();
    unregister = onLayoutEpochEnd(reset);
  });

  afterEach(() => {
    unregister();
    sandbox.restore();
    endLayoutEpoch();
  });

  it('does not end the epoch while it is current', () => {
    enterLayoutEpoch();
    now += 20;
    enterLayoutEpoch();
    sinon.assert.notCalled(reset);
  });

  it('ends the epoch at the next animation frame', () => {
    enterLayoutEpoch();
    runFrame();
    sinon.assert.calledOnce(reset);
  });

  it('ends the epoch once it is older than 20ms, when no frame runs', () => {
    enterLayoutEpoch();
    now += 21;
    enterLayoutEpoch();
    sinon.assert.calledOnce(reset);
  });

  it('ends the epoch if the clock goes backwards', () => {
    enterLayoutEpoch();
    now -= 1;
    enterLayoutEpoch();
    sinon.assert.calledOnce(reset);
  });

  it('does not let the frame requested for an earlier epoch end a later one', () => {
    enterLayoutEpoch();
    const staleFrame = frames.pop();
    endLayoutEpoch();
    enterLayoutEpoch();
    reset.resetHistory();
    staleFrame();
    sinon.assert.notCalled(reset);
  });

  it('startLayoutEpoch does not end a running epoch, however old', () => {
    startLayoutEpoch();
    now += 1000;
    startLayoutEpoch();
    sinon.assert.notCalled(reset);
  });

  it('ends epochs on time alone when animation frames are not available', () => {
    dep.requestAnimationFrame.throws(new Error());
    enterLayoutEpoch();
    now += 21;
    enterLayoutEpoch();
    sinon.assert.calledOnce(reset);
  });

  it('stops calling a reset once it is unregistered', () => {
    unregister();
    enterLayoutEpoch();
    runFrame();
    sinon.assert.notCalled(reset);
  });

  describe('keeps element rects and window dimensions coherent', () => {
    let element, win, original;

    beforeEach(() => {
      element = document.createElement('div');
      sandbox.stub(element, 'getBoundingClientRect').returns({ top: 100 });
      win = { scrollY: 0 };
      original = winDimensionsInternal.winDimensions;
      winDimensionsInternal.winDimensions = new CachedApiWrapper(() => win, { scrollY: true });
    });

    afterEach(() => {
      winDimensionsInternal.winDimensions = original;
    });

    function documentY() {
      return getBoundingClientRect(element).top + getWinDimensions().scrollY;
    }

    function scroll(y) {
      win.scrollY = y;
      element.getBoundingClientRect.returns({ top: 100 - y });
    }

    it('serves both from cache within an epoch', () => {
      expect(documentY()).to.equal(100);
      now += 10;
      scroll(40);
      expect(documentY()).to.equal(100);
      expect(getWinDimensions().scrollY).to.equal(0);
      sinon.assert.calledOnce(element.getBoundingClientRect);
    });

    Object.entries({
      'at the next animation frame': runFrame,
      'once the epoch is too old': () => { now += 21; },
      'when window dimensions are reset': resetWinDimensions,
      'when the rect cache is cleared': clearCache,
    }).forEach(([t, endEpoch]) => {
      it(`discards both ${t}`, () => {
        documentY();
        scroll(40);
        endEpoch();
        expect(getBoundingClientRect(element).top).to.equal(60);
        expect(getWinDimensions().scrollY).to.equal(40);
        expect(documentY()).to.equal(100);
      });
    });
  });
});
