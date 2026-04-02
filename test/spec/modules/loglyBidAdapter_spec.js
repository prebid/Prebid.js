import { expect } from 'chai';
import { config } from 'src/config.js';
import * as utils from 'src/utils.js';
import { spec } from '../../../modules/loglyBidAdapter.ts';

describe('loglyBidAdapter', function () {
  const bannerBidRequest = {
    bidder: 'logly',
    bidId: '254304ac29e265',
    params: {
      adspotId: 16
    },
    adUnitCode: '/19968336/prebid_banner_example_1',
    transactionId: '10aee457-617c-4572-ab5b-99df1d73ccb4',
    bidderRequestId: '15da3afd9632d7',
    auctionId: 'f890b7d9-e787-4237-ac21-6d8554abac9f',
    mediaTypes: {
      banner: {
        sizes: [[300, 250]]
      }
    }
  };

  const bidderRequest = {
    refererInfo: {
      page: 'https://example.com/article',
      ref: 'https://previous.example.com/',
      reachedTop: true,
      numIframes: 1,
      stack: []
    },
    auctionStart: 1632194172781,
    bidderCode: 'logly',
    bidderRequestId: '15da3afd9632d7',
    auctionId: 'f890b7d9-e787-4237-ac21-6d8554abac9f',
    timeout: 3000
  };

  beforeEach(function () {
    config.setConfig({
      bidderTimeout: 3000,
      currency: {
        adServerCurrency: 'JPY'
      },
      publisherDomain: 'publisher.example.com'
    });
  });

  afterEach(function () {
    config.resetConfig();
  });

  describe('isBidRequestValid', function () {
    it('should return true if adspotId is present', function () {
      expect(spec.isBidRequestValid(bannerBidRequest)).to.be.true;
    });

    it('should return false if the adspotId parameter is not present', function () {
      const bidRequest = utils.deepClone(bannerBidRequest);
      delete bidRequest.params.adspotId;
      expect(spec.isBidRequestValid(bidRequest)).to.be.false;
    });
  });

  describe('buildRequests', function () {
    it('should generate a valid POST request payload', function () {
      const request = spec.buildRequests([bannerBidRequest], bidderRequest)[0];
      expect(request.method).to.equal('POST');
      expect(request.url).to.equal('https://bid.logly.co.jp/prebid/client/v2?adspot_id=16');
      expect(request.data).to.exist;

      const data = JSON.parse(request.data);
      expect(data.auctionId).to.equal(bannerBidRequest.auctionId);
      expect(data.bidderRequestId).to.equal(bannerBidRequest.bidderRequestId);
      expect(data.transactionId).to.equal(bannerBidRequest.transactionId);
      expect(data.adUnitCode).to.equal(bannerBidRequest.adUnitCode);
      expect(data.bidId).to.equal(bannerBidRequest.bidId);
      expect(data.mediaTypes).to.deep.equal(bannerBidRequest.mediaTypes);
      expect(data.params).to.deep.equal(bannerBidRequest.params);
      expect(data.prebidJsVersion).to.equal('$prebid.version$');
      expect(data.url).to.exist;
      expect(data.domain).to.equal('publisher.example.com');
      expect(data.referer).to.equal(bidderRequest.refererInfo.ref);
      expect(data.auctionStartTime).to.equal(bidderRequest.auctionStart);
      expect(data.currency).to.equal('JPY');
      expect(data.timeout).to.equal(3000);
      expect(data).to.not.have.property('im_uid');
    });

    it('should send im_uid from bid userIdAsEids', function () {
      const bidRequest = {
        ...utils.deepClone(bannerBidRequest),
        userIdAsEids: [{
          source: 'intimatemerger.com',
          uids: [{
            id: 'bid-eid-imuid',
            atype: 1
          }]
        }]
      };

      const request = spec.buildRequests([bidRequest], bidderRequest)[0];

      expect(JSON.parse(request.data)).to.include({
        im_uid: 'bid-eid-imuid'
      });
    });

    it('should not send im_uid when userIdAsEids has no intimatemerger.com entry', function () {
      const bidRequest = {
        ...utils.deepClone(bannerBidRequest),
        userIdAsEids: [{
          source: 'other-provider.com',
          uids: [{ id: 'some-id', atype: 1 }]
        }]
      };

      const request = spec.buildRequests([bidRequest], bidderRequest)[0];

      expect(JSON.parse(request.data)).to.not.have.property('im_uid');
    });
  });

  describe('interpretResponse', function () {
    it('should return an empty array if an invalid response is passed', function () {
      expect(spec.interpretResponse({}, {})).to.be.an('array').that.is.empty;
    });

    it('should return a valid banner response when passed a valid server response', function () {
      const request = spec.buildRequests([bannerBidRequest], bidderRequest)[0];
      const interpretedResponse = spec.interpretResponse({
        body: {
          bids: [{
            requestId: '254304ac29e265',
            cpm: 10.123,
            width: 300,
            height: 250,
            creativeId: '123456789',
            currency: 'JPY',
            netRevenue: true,
            ttl: 30,
            ad: '<div>banner ad markup</div>'
          }]
        }
      }, request);

      expect(interpretedResponse).to.have.lengthOf(1);
      expect(interpretedResponse[0]).to.deep.include({
        requestId: '254304ac29e265',
        cpm: 10.123,
        width: 300,
        height: 250,
        creativeId: '123456789',
        currency: 'JPY',
        netRevenue: true,
        ttl: 30,
        ad: '<div>banner ad markup</div>'
      });
    });

    it('should return an empty array if body is missing, lacks bids, or has an error', function () {
      const request = spec.buildRequests([bannerBidRequest], bidderRequest)[0];
      expect(spec.interpretResponse({}, request)).to.be.an('array').that.is.empty;
      expect(spec.interpretResponse({ body: {} }, request)).to.be.an('array').that.is.empty;
      expect(spec.interpretResponse({ body: { error: 'no fill' } }, request)).to.be.an('array').that.is.empty;
    });
  });

  describe('getUserSyncs', function () {
    it('should return no usersyncs', function () {
      expect(spec.getUserSyncs({ iframeEnabled: true }, [])).to.be.an('array').that.is.empty;
    });
  });
});
