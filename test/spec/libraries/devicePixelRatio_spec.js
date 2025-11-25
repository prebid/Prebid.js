import {expect} from 'chai';
import {getDevicePixelRatio} from 'libraries/devicePixelRatio/devicePixelRatio.js';
import {internal} from '../../../src/utils/winDimensions.js';

describe('device utils', () => {
  let sandbox, winDimensions;
  beforeEach(() => {
    winDimensions = {};
    sandbox = sinon.createSandbox();
    sandbox.stub(internal.winDimensions, 'obj').get(() => winDimensions);
  });
  afterEach(() => {
    sandbox.restore();
  });
  describe('getDevicePixelRatio', () => {
    it('does NOT return the provided devicePixelRatio when valid', () => {
      winDimensions = {innerWidth: 400, screen: {width: 1000}, devicePixelRatio: 2};
      expect(getDevicePixelRatio()).to.equal(2.5);
    });

    it('derives ratio from screen DPI metrics', () => {
      const win = {screen: {deviceXDPI: 240, logicalXDPI: 120}};
      expect(getDevicePixelRatio(win)).to.equal(2);
    });

    it('derives ratio from screen width and inner width', () => {
      winDimensions = {innerWidth: 400, screen: {width: 1000}};
      expect(getDevicePixelRatio()).to.equal(2.5);
    });

    it('falls back to screen height when needed', () => {
      winDimensions = {innerHeight: 300, screen: {height: 750}};
      expect(getDevicePixelRatio()).to.equal(2.5);
    });

    it('returns 1 when no ratio can be determined', () => {
      expect(getDevicePixelRatio({})).to.equal(1);
    });

    it('does not choke when window throws', () => {
      expect(getDevicePixelRatio(Object.defineProperty({}, 'screen', {
        get() {
          throw new Error();
        }
      }))).to.eql(1);
    });
  });
});
