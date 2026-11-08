import { expect } from 'chai';
import { collectUtmTagData, trimAdUnit, trimBid, trimBidderRequest } from 'libraries/asteriobidUtils/asteriobidUtils.js';

describe('asteriobid utilities', function () {
  describe('collectUtmTagData', function () {
    const emptyTags = {
      utm_source: '',
      utm_medium: '',
      utm_campaign: '',
      utm_term: '',
      utm_content: ''
    };
    let storage;
    let getParameterByName;
    let logError;

    beforeEach(function () {
      storage = {
        getDataFromLocalStorage: sinon.stub(),
        setDataInLocalStorage: sinon.stub()
      };
      getParameterByName = sinon.stub().returns('');
      logError = sinon.spy();
    });

    function collect() {
      return collectUtmTagData(storage, getParameterByName, logError, 'testAnalytics');
    }

    it('returns all current campaign tags and persists them for later page views', function () {
      const tags = {
        utm_source: 'newsletter',
        utm_medium: 'email',
        utm_campaign: 'summer',
        utm_term: 'banner',
        utm_content: 'sidebar'
      };
      Object.entries(tags).forEach(([key, value]) => getParameterByName.withArgs(key).returns(value));

      expect(collect()).to.deep.equal(tags);
      expect(getParameterByName.callCount).to.equal(5);
      expect(storage.getDataFromLocalStorage.called).to.be.false;
      expect(storage.setDataInLocalStorage.callCount).to.equal(5);
      Object.entries(tags).forEach(([key, value]) => {
        expect(storage.setDataInLocalStorage.calledWithExactly(`pm_${key}`, value)).to.be.true;
      });
      expect(logError.called).to.be.false;
    });

    it('clears old campaign fields when only one new tag is present', function () {
      getParameterByName.withArgs('utm_content').returns('new-creative');
      storage.getDataFromLocalStorage.returns('previous-campaign');

      expect(collect()).to.deep.equal({ ...emptyTags, utm_content: 'new-creative' });
      expect(storage.getDataFromLocalStorage.called).to.be.false;
      expect(storage.setDataInLocalStorage.calledWithExactly('pm_utm_source', '')).to.be.true;
      expect(storage.setDataInLocalStorage.calledWithExactly('pm_utm_campaign', '')).to.be.true;
      expect(storage.setDataInLocalStorage.calledWithExactly('pm_utm_content', 'new-creative')).to.be.true;
    });

    it('recovers saved campaign tags when the current URL has none', function () {
      storage.getDataFromLocalStorage.withArgs('pm_utm_source').returns('search');
      storage.getDataFromLocalStorage.withArgs('pm_utm_medium').returns('organic');
      storage.getDataFromLocalStorage.withArgs('pm_utm_campaign').returns(null);
      storage.getDataFromLocalStorage.withArgs('pm_utm_term').returns('');

      expect(collect()).to.deep.equal({ ...emptyTags, utm_source: 'search', utm_medium: 'organic' });
      expect(storage.getDataFromLocalStorage.callCount).to.equal(5);
      expect(storage.setDataInLocalStorage.called).to.be.false;
      expect(logError.called).to.be.false;
    });

    it('returns empty tags when neither the URL nor storage contains campaign data', function () {
      expect(collect()).to.deep.equal(emptyTags);
      expect(storage.setDataInLocalStorage.called).to.be.false;
    });

    it('reports URL parsing errors and preserves tags collected before the error', function () {
      const error = new Error('invalid URL');
      getParameterByName.withArgs('utm_source').returns('newsletter');
      getParameterByName.withArgs('utm_medium').throws(error);

      expect(collect()).to.deep.equal({ utm_source: 'newsletter', error_utm: 1 });
      expect(logError.calledOnceWithExactly('testAnalytics Error', error)).to.be.true;
      expect(storage.getDataFromLocalStorage.called).to.be.false;
      expect(storage.setDataInLocalStorage.called).to.be.false;
    });

    it('returns an error flag instead of propagating storage read failures', function () {
      const error = new Error('storage unavailable');
      storage.getDataFromLocalStorage.throws(error);

      expect(collect()).to.deep.equal({ ...emptyTags, error_utm: 1 });
      expect(logError.calledOnceWithExactly('testAnalytics Error', error)).to.be.true;
    });

    it('keeps current campaign data when persisting it fails', function () {
      const error = new Error('storage quota exceeded');
      getParameterByName.withArgs('utm_source').returns('newsletter');
      storage.setDataInLocalStorage.throws(error);

      expect(collect()).to.deep.equal({ ...emptyTags, utm_source: 'newsletter', error_utm: 1 });
      expect(logError.calledOnceWithExactly('testAnalytics Error', error)).to.be.true;
    });
  });

  describe('analytics payload trimming', function () {
    [null, undefined].forEach(value => {
      it(`preserves ${value} values for optional ad units, bids, and requests`, function () {
        expect(trimAdUnit(value)).to.equal(value);
        expect(trimBid(value)).to.equal(value);
        expect(trimBidderRequest(value)).to.equal(value);
      });
    });

    it('retains only ad unit identity and sizes without changing the original', function () {
      const sizes = [[300, 250]];
      const adUnit = Object.freeze({ code: 'sidebar', sizes, bids: [{ bidder: 'example' }], mediaTypes: { banner: {} } });

      const trimmed = trimAdUnit(adUnit);

      expect(trimmed).to.deep.equal({ code: 'sidebar', sizes: [[300, 250]] });
      expect(trimmed).not.to.equal(adUnit);
      expect(adUnit.bids).to.deep.equal([{ bidder: 'example' }]);
    });

    it('keeps bid analytics fields while excluding creatives and bidder parameters', function () {
      const analyticsFields = {
        auctionId: 'auction-1',
        bidder: 'example',
        bidderRequestId: 'request-1',
        bidId: 'bid-1',
        crumbs: { pubcid: 'publisher-id' },
        cpm: 0,
        currency: 'USD',
        mediaTypes: { banner: { sizes: [[300, 250]] } },
        sizes: [[300, 250]],
        transactionId: 'transaction-1',
        adUnitCode: 'sidebar',
        bidRequestsCount: 0,
        serverResponseTimeMs: 0
      };
      const bid = Object.freeze({ ...analyticsFields, ad: '<script>creative</script>', adUrl: 'https://example.test/ad', params: { accountId: '123' } });

      const trimmed = trimBid(bid);

      expect(trimmed).to.deep.equal(analyticsFields);
      expect(trimmed).not.to.equal(bid);
      expect(bid.params).to.deep.equal({ accountId: '123' });
    });

    it('sanitizes every bid in a bidder request without mutating the request', function () {
      const firstBid = { bidId: 'bid-1', ad: 'creative-one' };
      const secondBid = { bidId: 'bid-2', params: { accountId: 'private' } };
      const bids = Object.freeze([Object.freeze(firstBid), Object.freeze(secondBid)]);
      const request = Object.freeze({
        auctionId: 'auction-1',
        auctionStart: 123456,
        bidderRequestId: 'request-1',
        bidderCode: 'example',
        bids,
        refererInfo: { page: 'https://example.test/private' }
      });

      const trimmed = trimBidderRequest(request);

      expect(trimmed).to.have.all.keys('auctionId', 'auctionStart', 'bidderRequestId', 'bidderCode', 'bids');
      expect(trimmed).to.include({ auctionId: 'auction-1', auctionStart: 123456, bidderRequestId: 'request-1', bidderCode: 'example' });
      expect(trimmed.bids.map(bid => bid.bidId)).to.deep.equal(['bid-1', 'bid-2']);
      expect(trimmed.bids[0]).not.to.have.property('ad');
      expect(trimmed.bids[1]).not.to.have.property('params');
      expect(trimmed.bids).not.to.equal(bids);
      expect(firstBid.ad).to.equal('creative-one');
      expect(secondBid.params).to.deep.equal({ accountId: 'private' });
    });

    it('supports requests with missing or empty bids', function () {
      expect(trimBidderRequest({ bidderCode: 'example' }).bids).to.be.undefined;
      expect(trimBidderRequest({ bidderCode: 'example', bids: [] }).bids).to.deep.equal([]);
    });
  });
});
