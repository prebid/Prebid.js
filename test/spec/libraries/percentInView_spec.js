import { getBoundingBox } from '../../../libraries/percentInView/percentInView';
import { startAuction } from '../../../src/prebid';

describe('getBoundingBox', () => {
  let element, getBoundingClientRectSpy;

  beforeEach(() => {
    element = document.createElement('div');
    getBoundingClientRectSpy = sinon.spy(element, 'getBoundingClientRect');
  })

  afterEach(() => {
    getBoundingClientRectSpy.restore();
  });

  it('should fire getBoundingClientRect on element initially', () => {
    getBoundingBox(element);
    expect(getBoundingClientRectSpy.calledOnce).to.equal(true);
  });

  it('should not fire getBoundingClientRect twice for the same element', () => {
    getBoundingBox(element);
    getBoundingBox(element);
    expect(getBoundingClientRectSpy.callCount).to.equal(1);
  });

  it('should fire getBoundingClientRect on element again if new auction was started', () => {
    const mockAuctionData = {
      bidsBackHandler: () => {},
      timeout: 3000,
      adUnits: [],
      adUnitCodes: [],
      ttlBuffer: 1000,
      auctionId: '12345',
      defer: {resolve: () => {}}
    };

    getBoundingBox(element);
    startAuction(mockAuctionData);
    getBoundingBox(element);

    expect(getBoundingClientRectSpy.callCount).to.equal(2);
  });

  it('should return same value for multiple calls', () => {
    const expectedWidth = 200
    const expectedHeight = 300;
    element.style.width = expectedWidth + 'px';
    element.style.height = expectedHeight + 'px';
    document.body.append(element);

    const result1 = getBoundingBox(element);

    expect(result1.width).to.deep.eql(expectedWidth);
    expect(result1.height).to.deep.eql(expectedHeight);

    const result2 = getBoundingBox(element);

    expect(result2).to.deep.eql(result1);

    document.body.removeChild(element);
  });
});
