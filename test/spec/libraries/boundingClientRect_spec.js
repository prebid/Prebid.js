import { getBoundingClientRect } from '../../../libraries/boundingClientRect/boundingClientRect';
import { startAuction } from '../../../src/prebid';

describe('getBoundingClientRect', () => {
  let element, getBoundingClientRectSpy;

  beforeEach(() => {
    element = document.createElement('div');
    getBoundingClientRectSpy = sinon.spy(element, 'getBoundingClientRect');
  })

  afterEach(() => {
    getBoundingClientRectSpy.restore();
  });

  it('should fire getBoundingClientRect on element initially', () => {
    getBoundingClientRect(element);
    expect(getBoundingClientRectSpy.calledOnce).to.equal(true);
  });

  it('should not fire getBoundingClientRect twice for the same element', () => {
    getBoundingClientRect(element);
    getBoundingClientRect(element);
    expect(getBoundingClientRectSpy.callCount).to.equal(1);
  });

  it('should fire getBoundingClientRect on element again if new auction was started', (done) => {
    const onAuctionDone = function() {
      getBoundingClientRect(element);
      expect(getBoundingClientRectSpy.callCount).to.equal(2);
      done();
    }

    const mockAuctionData = {
      bidsBackHandler: onAuctionDone,
      ortb2Fragments: {},
      timeout: 3000,
      adUnitCodes: [],
      adUnits: [],
      ttlBuffer: 1000,
      auctionId: '909090',
      defer: {resolve: () => {}}
    };

    getBoundingClientRect(element);
    startAuction(mockAuctionData);
  });

  it('should return same value for multiple calls', () => {
    const expectedWidth = 200
    const expectedHeight = 300;
    element.style.width = expectedWidth + 'px';
    element.style.height = expectedHeight + 'px';
    document.body.append(element);

    const result1 = getBoundingClientRect(element);

    expect(result1.width).to.deep.eql(expectedWidth);
    expect(result1.height).to.deep.eql(expectedHeight);

    const result2 = getBoundingClientRect(element);

    expect(result2).to.deep.eql(result1);

    document.body.removeChild(element);
  });
});
