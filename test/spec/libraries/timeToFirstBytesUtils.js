import { expect } from 'chai';
import sinon from 'sinon';
import { getTimeToFirstByte } from './timeToFirstBytesUtils';

describe('getTimeToFirstByte', () => {
  let win;

  beforeEach(() => {
    win = {
      performance: {
        getEntriesByType: sinon.stub(),
        timing: {
          responseStart: 0,
          requestStart: 0
        }
      }
    };
  });

  it('should return TTFB using Navigation Timing Level 2 API', () => {
    win.performance.getEntriesByType.withArgs('navigation').returns([{
      responseStart: 100,
      requestStart: 50
    }]);

    const ttfb = getTimeToFirstByte(win);
    expect(ttfb).to.equal('50');
  });

  it('should return TTFB using Navigation Timing Level 1 API', () => {
    win.performance.getEntriesByType.returns([]);
    win.performance.timing.responseStart = 100;
    win.performance.timing.requestStart = 50;

    const ttfb = getTimeToFirstByte(win);
    expect(ttfb).to.equal('50');
  });

  it('should return an empty string if TTFB cannot be determined', () => {
    win.performance.getEntriesByType.returns([]);
    win.performance.timing.responseStart = 0;
    win.performance.timing.requestStart = 0;

    const ttfb = getTimeToFirstByte(win);
    expect(ttfb).to.equal('');
  });

  it('should return an empty string if performance object is not available', () => {
    win.performance = null;

    const ttfb = getTimeToFirstByte(win);
    expect(ttfb).to.equal('');
  });
});
