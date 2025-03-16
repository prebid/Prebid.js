import {expect} from 'chai';
import {spec} from 'modules/talkadsBidAdapter.js';
import {newBidder} from 'src/adapters/bidderFactory.js';
import {config} from '../../../src/config';
import {server} from '../../mocks/xhr';

describe('TalkAds adapter', function () {
  const commonBidderRequest = {
    refererInfo: {
      referer: 'https://example.com/'
    },
    timeout: 3000,
  }
  const commonBidRequest = {
    bidder: 'talkads',
    params: {
      tag_id: 999999,
      bidder_url: 'https://test.natexo-programmatic.com/tad/tag/prebid',
    },
    bidId: '1a2b3c4d56e7f0',
    auctionId: '12345678-1234-1a2b-3c4d-1a2b3c4d56e7',
    transactionId: '4f68b713-04ba-4d7f-8df9-643bcdab5efb',
  };
  const nativeBidRequestParams = {
    nativeParams: {},
  };
  const bannerBidRequestParams = {
    sizes: [[300, 250], [300, 600]],
  };

  /**
   * isBidRequestValid
   */
  describe('isBidRequestValid1', function() {
    it('should fail when config is invalid', function () {
      const bidRequest = {
        ...commonBidRequest,
        ...bannerBidRequestParams,
      };
      bidRequest.params = Object.assign({}, bidRequest.params);
      delete bidRequest.params;
      expect(spec.isBidRequestValid(bidRequest)).to.equal(false);
    });
  }); // isBidRequestValid1
  describe('isBidRequestValid2', function() {
    it('should fail when config is invalid', function () {
      const bidRequest = {
        ...commonBidRequest,
        ...bannerBidRequestParams,
      };
      bidRequest.params = Object.assign({}, bidRequest.params);
      delete bidRequest.params.bidder_url;
      expect(spec.isBidRequestValid(bidRequest)).to.equal(false);
    });
  }); // isBidRequestValid2
  describe('isBidRequestValid3', function() {
    it('should fail when config is invalid', function () {
      const bidRequest = {
        ...commonBidRequest,
        ...bannerBidRequestParams,
      };
      bidRequest.params = Object.assign({}, bidRequest.params);
      delete bidRequest.params.tag_id;
      expect(spec.isBidRequestValid(bidRequest)).to.equal(false);
    });
  }); // isBidRequestValid3
  describe('isBidRequestValid4', function() {
    let bidRequest = {
      ...commonBidRequest,
      ...bannerBidRequestParams,
    };
    it('should succeed when a banner bid is valid', function () {
      expect(spec.isBidRequestValid(bidRequest)).to.equal(true);
    });
    bidRequest = {
      ...commonBidRequest,
      ...nativeBidRequestParams,
    };
    it('should succeed when a native bid is valid', function () {
      expect(spec.isBidRequestValid(bidRequest)).to.equal(true);
    });
  }); // isBidRequestValid4

  /**
   * buildRequests
   */
  describe('buildRequests1', function() {
    let bidRequest = {
      ...commonBidRequest,
      ...bannerBidRequestParams,
    };
    const loServerRequest = {
      cur: 'EUR',
      timeout: commonBidderRequest.timeout,
      auction_id: commonBidRequest.auctionId,
      transaction_id: commonBidRequest.transactionId,
      bids: [{ id: 0, bid_id: commonBidRequest.bidId, type: 'banner', size: bannerBidRequestParams.sizes }],
      gdpr: { applies: false, consent: false },
    };
    it('should generate a valid banner bid request', function () {
      let laResponse = spec.buildRequests([bidRequest], commonBidderRequest);
      expect(laResponse.method).to.equal('POST');
      expect(laResponse.url).to.equal('https://test.natexo-programmatic.com/tad/tag/prebid/999999');
      expect(laResponse.data).to.equal(JSON.stringify(loServerRequest));
    });
  }); // buildRequests1
  describe('buildRequests2', function() {
    let bidRequest = {
      ...commonBidRequest,
      ...nativeBidRequestParams,
    };
    const loServerRequest = {
      cur: 'EUR',
      timeout: commonBidderRequest.timeout,
      auction_id: commonBidRequest.auctionId,
      transaction_id: commonBidRequest.transactionId,
      bids: [{ id: 0, bid_id: commonBidRequest.bidId, type: 'native', size: [] }],
      gdpr: { applies: false, consent: false },
    };
    it('should generate a valid native bid request', function () {
      let laResponse = spec.buildRequests([bidRequest], commonBidderRequest);
      expect(laResponse.method).to.equal('POST');
      expect(laResponse.url).to.equal('https://test.natexo-programmatic.com/tad/tag/prebid/999999');
      expect(laResponse.data).to.equal(JSON.stringify(loServerRequest));
    });
    const bidderRequest = {
      ...commonBidderRequest,
      gdprConsent: { gdprApplies: true, consentString: 'yes' }
    };
    const loServerRequest2 = {
      ...loServerRequest,
      gdpr: { applies: true, consent: 'yes' },
    };
    it('should generate a valid native bid request', function () {
      let laResponse = spec.buildRequests([bidRequest], bidderRequest);
      expect(laResponse.method).to.equal('POST');
      expect(laResponse.url).to.equal('https://test.natexo-programmatic.com/tad/tag/prebid/999999');
      expect(laResponse.data).to.equal(JSON.stringify(loServerRequest2));
    });
  }); // buildRequests2

  /**
   * interpretResponse
   */
  describe('interpretResponse1', function() {
    it('should return empty array if no valid bids', function () {
      const laResult = spec.interpretResponse({}, [])
      expect(laResult).to.be.an('array').that.is.empty;
    });
    const loServerResult = {
      body: { status: 'error', error: 'aie' }
    };
    it('should return empty array if there is an error', function () {
      const laResult = spec.interpretResponse(loServerResult, [])
      expect(laResult).to.be.an('array').that.is.empty;
    });
  }); // interpretResponse1
  describe('interpretResponse2', function() {
    const loServerResult = {
      body: {
        status: 'ok',
        error: '',
        pbid: '6147833a65749742875ace47',
        bids: [{
          requestId: commonBidRequest.bidId,
          cpm: 0.10,
          currency: 'EUR',
          width: 300,
          height: 250,
          ad: 'test ad',
          ttl: 60,
          creativeId: 'c123a456',
          netRevenue: false,
        }]
      }
    };
    const loExpected = [{
      requestId: '1a2b3c4d56e7f0',
      cpm: 0.1,
      currency: 'EUR',
      width: 300,
      height: 250,
      ad: 'test ad',
      ttl: 60,
      creativeId: 'c123a456',
      netRevenue: false,
      pbid: '6147833a65749742875ace47'
    }];
    it('should return a correct bid response', function () {
      const laResult = spec.interpretResponse(loServerResult, [])
      expect(JSON.stringify(laResult)).to.equal(JSON.stringify(loExpected));
    });
  }); // interpretResponse2

  /**
   * onBidWon
   */
  describe('onBidWon', function() {
    it('should not make an ajax call if pbid is null', function () {
      const loBid = {
        requestId: '1a2b3c4d56e7f0',
        cpm: 0.1,
        currency: 'EUR',
        width: 300,
        height: 250,
        ad: 'test ad',
        ttl: 60,
        creativeId: 'c123a456',
        netRevenue: false,
        params: [Object.assign({}, commonBidRequest.params)],
      }
      spec.onBidWon(loBid)
      expect(server.requests.length).to.equals(0);
    });
    it('should make an ajax call', function () {
      const loBid = {
        requestId: '1a2b3c4d56e7f0',
        cpm: 0.1,
        currency: 'EUR',
        width: 300,
        height: 250,
        ad: 'test ad',
        ttl: 60,
        creativeId: 'c123a456',
        netRevenue: false,
        pbid: '6147833a65749742875ace47',
        params: [Object.assign({}, commonBidRequest.params)],
      }
      spec.onBidWon(loBid)
      expect(server.requests[0].url).to.equals('https://test.natexo-programmatic.com/tad/tag/prebidwon/6147833a65749742875ace47');
    });
  }); // onBidWon
});
