import {expect} from 'chai';
import {resetWinDimensions} from '../../../src/utils.js';
import * as devicePixelRatio from '../../../libraries/devicePixelRatio/devicePixelRatio.js';

describe('devicePixelRatio', () => {
  let sandbox;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
  });

  afterEach(() => {
    sandbox.restore();
  });

  it('should reset together with basic dimensions', () => {
    const fetchSpy = sandbox.spy(devicePixelRatio.internal, 'fetchDevicePixelRatio');
    resetWinDimensions();
    sinon.assert.called(fetchSpy);
  });

  it('should expose the window devicePixelRatio', () => {
    expect(devicePixelRatio.getDevicePixelRatio()).to.equal(window.top.devicePixelRatio);
  });
});
