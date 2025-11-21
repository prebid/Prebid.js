import {expect} from 'chai';
import {getDevicePixelRatio} from 'libraries/devicePixelRatio/devicePixelRatio.js';

describe('device utils', () => {
  describe('getDevicePixelRatio', () => {
    it('returns the provided devicePixelRatio when valid', () => {
      expect(getDevicePixelRatio({devicePixelRatio: 2})).to.equal(2);
    });

    it('derives ratio from screen DPI metrics', () => {
      const win = {screen: {deviceXDPI: 240, logicalXDPI: 120}};
      expect(getDevicePixelRatio(win)).to.equal(2);
    });

    it('derives ratio from screen width and inner width', () => {
      const win = {innerWidth: 400, screen: {width: 1000}};
      expect(getDevicePixelRatio(win)).to.equal(2.5);
    });

    it('falls back to screen height when needed', () => {
      const win = {innerHeight: 300, screen: {height: 750}};
      expect(getDevicePixelRatio(win)).to.equal(2.5);
    });

    it('returns 1 when no ratio can be determined from provided window', () => {
      expect(getDevicePixelRatio({})).to.equal(1);
    });
  });
});
