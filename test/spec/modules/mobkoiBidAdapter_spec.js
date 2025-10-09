import sinon from 'sinon';

import {
  spec,
  utils,
  DEFAULT_PREBID_JS_INTEGRATION_ENDPOINT
} from 'modules/mobkoiBidAdapter.js';
import * as prebidUtils from 'src/utils';

describe('Mobkoi bidding Adapter', function () {
  const testIntegrationEndpoint = 'http://test.integration.endpoint.com/bid';
  const testRequestId = 'test-request-id';
  const testPlacementId = 'mobkoiPlacementId';
  const testBidId = 'test-bid-id';
  const bidderCode = 'mobkoi';
  const testTransactionId = 'test-transaction-id';
  const testAdUnitId = 'test-ad-unit-id';
  const testAuctionId = 'test-auction-id';

  let sandbox;

  const getOrtb2 = () => ({
    site: {
      publisher: {
        ext: { integrationEndpoint: testIntegrationEndpoint }
      }
    }
  })

  const getBidRequest = () => ({
    bidder: bidderCode,
    adUnitCode: 'banner-ad',
    transactionId: testTransactionId,
    adUnitId: testAdUnitId,
    bidId: testBidId,
    bidderRequestId: testRequestId,
    auctionId: testAuctionId,
    ortb2: getOrtb2(),
    params: {
      integrationEndpoint: testIntegrationEndpoint,
      placementId: testPlacementId
    }
  })

  const getBidderRequest = () => ({
    bidderCode,
    auctionId: testAuctionId,
    bidderRequestId: testRequestId,
    bids: [getBidRequest()],
    ortb2: getOrtb2()
  })

  const getConvertedBidRequest = () => ({
    id: testRequestId,
    imp: [{
      id: testBidId,
      tagid: testPlacementId,
    }],
    ...getOrtb2(),
    test: 0
  })

  const adm = '<div>test ad</div>';
  const lurl = 'test.com/loss';
  const nurl = 'test.com/win';

  const getBidderResponse = () => ({
    body: {
      id: testBidId,
      cur: 'USD',
      seatbid: [
        {
          seat: 'mobkoi_debug',
          bid: [
            {
              id: testBidId,
              impid: testBidId,
              cid: 'campaign_1',
              crid: 'creative_1',
              price: 1,
              cur: [
                'USD'
              ],
              adomain: [
                'advertiser.com'
              ],
              adm,
              w: 300,
              h: 250,
              mtype: 1,
              lurl,
              nurl
            }
          ]
        }
      ],
    }
  })

  beforeEach(function () {
    sandbox = sinon.createSandbox();
    sandbox.stub(prebidUtils, 'logInfo');
    sandbox.stub(prebidUtils, 'logWarn');
    sandbox.stub(prebidUtils, 'logError');
  });

  afterEach(function () {
    sandbox.restore();
  });

  describe('isBidRequestValid', function () {
    let bid;

    beforeEach(function () {
      bid = getBidderRequest().bids[0];
    });

    it('should return true when placement id exist in ad unit params', function () {
      expect(spec.isBidRequestValid(bid)).to.equal(true);
    });

    it('should return false when placement id is missing in ad unit params', function () {
      delete bid.params.placementId;
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });
  });

  describe('buildRequests', function () {
    let bidderRequest, convertedBidRequest;

    beforeEach(function () {
      bidderRequest = getBidderRequest();
      convertedBidRequest = getConvertedBidRequest();
    });

    it('should include converted ORTB data in request', function () {
      const request = spec.buildRequests(bidderRequest.bids, bidderRequest);
      const ortbData = request.data;

      expect(ortbData.id).to.equal(bidderRequest.bidderRequestId);
    });

    it('should obtain integrationEndpoint from ad unit params if the value does not exist in ortb2', function () {
      delete bidderRequest.ortb2.site.publisher.ext.integrationEndpoint;
      const request = spec.buildRequests(bidderRequest.bids, bidderRequest);
      const ortbData = request.data;

      expect(ortbData.site.publisher.ext.integrationBaseUrl).to.equal(bidderRequest.bids[0].params.integrationEndpoint);
    });

    it('should use the pro server url when the integration endpoint is not set', function () {
      delete bidderRequest.ortb2.site.publisher.ext.integrationEndpoint;
      delete bidderRequest.bids[0].params.integrationEndpoint;

      const request = spec.buildRequests(bidderRequest.bids, bidderRequest);
      expect(request.url).to.equal(DEFAULT_PREBID_JS_INTEGRATION_ENDPOINT);
      expect(request.url).to.include('/bid');
    });

    it('should set ext.mobkoi.integration_type to "pbjs" in the ORTB request', function () {
      const request = spec.buildRequests(bidderRequest.bids, bidderRequest);
      const ortbData = request.data;
      expect(ortbData).to.have.nested.property('ext.mobkoi.integration_type', 'pbjs');
    });
  });

  describe('interpretResponse', function () {
    let bidderRequest, bidRequest, bidderResponse;

    beforeEach(function () {
      bidderRequest = getBidderRequest();
      bidRequest = spec.buildRequests(bidderRequest.bids, bidderRequest);
      bidderResponse = getBidderResponse();
    });

    it('should return empty array when response is empty', function () {
      expect(spec.interpretResponse({}, {})).to.deep.equal([]);
    });

    it('should interpret valid bid response', function () {
      const bidsResponse = spec.interpretResponse(bidderResponse, bidRequest);
      expect(bidsResponse).to.not.be.empty;
      const bid = bidsResponse[0];

      expect(bid.ad).to.include(adm);
      expect(bid.requestId).to.equal(bidderResponse.body.seatbid[0].bid[0].impid);
      expect(bid.cpm).to.equal(bidderResponse.body.seatbid[0].bid[0].price);
      expect(bid.width).to.equal(bidderResponse.body.seatbid[0].bid[0].w);
      expect(bid.height).to.equal(bidderResponse.body.seatbid[0].bid[0].h);
      expect(bid.creativeId).to.equal(bidderResponse.body.seatbid[0].bid[0].crid);
      expect(bid.currency).to.equal(bidderResponse.body.cur);
      expect(bid.netRevenue).to.be.true;
      expect(bid.ttl).to.equal(30);
    });
  })

  describe('utils', function () {
    let bidderRequest;

    beforeEach(function () {
      bidderRequest = getBidderRequest();
    });

    describe('getIntegrationEndpoint', function () {
      it('should return the integrationEndpoint from the given object', function () {
        expect(utils.getIntegrationEndpoint(bidderRequest))
          .to.equal(testIntegrationEndpoint);
      });

      it('should return default prod integration endpoint when integrationEndpoint is missing in params and ortb2', function () {
        delete bidderRequest.ortb2.site.publisher.ext.integrationEndpoint;
        delete bidderRequest.bids[0].params.integrationEndpoint;

        expect(utils.getIntegrationEndpoint(bidderRequest)).to.equal(DEFAULT_PREBID_JS_INTEGRATION_ENDPOINT);
      });
    })

    describe('getOrtbId', function () {
      it('should return the ortbId from the prebid request object (i.e bidderRequestId)', function () {
        expect(utils.getOrtbId(bidderRequest)).to.equal(bidderRequest.bidderRequestId);
      });

      it('should return the ortbId from the prebid response object (i.e seatBidId)', function () {
        const customBidRequest = { ...bidderRequest, seatBidId: bidderRequest.bidderRequestId };
        delete customBidRequest.bidderRequestId;
        expect(utils.getOrtbId(customBidRequest)).to.equal(bidderRequest.bidderRequestId);
      });

      it('should return the ortbId from the interpreted prebid response object (i.e ortbId)', function () {
        const customBidRequest = { ...bidderRequest, ortbId: bidderRequest.bidderRequestId };
        delete customBidRequest.bidderRequestId;
        expect(utils.getOrtbId(customBidRequest)).to.equal(bidderRequest.bidderRequestId);
      });

      it('should return the ortbId from the ORTB request object (i.e has imp)', function () {
        const customBidRequest = { ...bidderRequest, imp: {}, id: bidderRequest.bidderRequestId };
        delete customBidRequest.bidderRequestId;
        expect(utils.getOrtbId(customBidRequest)).to.equal(bidderRequest.bidderRequestId);
      });

      it('should throw error when ortbId is missing', function () {
        delete bidderRequest.bidderRequestId;
        expect(() => {
          utils.getOrtbId(bidderRequest);
        }).to.throw();
      });
    })
  })

  describe('getUserSyncs', function () {
    let syncOptions;

    beforeEach(function () {
      syncOptions = {
        pixelEnabled: true,
        iframeEnabled: false
      };
    });

    it('should return empty array when pixelEnabled is false', function () {
      syncOptions.pixelEnabled = false;
      const gdprConsent = { gdprApplies: true, consentString: 'test-consent' };
      const serverResponses = [{ body: { ext: { pixels: [['image', 'test-url']] } } }];

      const result = spec.getUserSyncs(syncOptions, serverResponses, gdprConsent);
      expect(result).to.be.an('array').that.is.empty;
    });

    it('should return empty array when no pixels in response', function () {
      const gdprConsent = { gdprApplies: true, consentString: 'test-consent' };
      const serverResponses = [{ body: { ext: {} } }];

      const result = spec.getUserSyncs(syncOptions, serverResponses, gdprConsent);
      expect(result).to.be.an('array').that.is.empty;
    });

    it('should return empty array when pixels is not an array', function () {
      const gdprConsent = { gdprApplies: true, consentString: 'test-consent' };
      const serverResponses = [{ body: { ext: { pixels: 'not-an-array' } } }];

      const result = spec.getUserSyncs(syncOptions, serverResponses, gdprConsent);
      expect(result).to.be.an('array').that.is.empty;
    });

    it('should process image pixels correctly', function () {
      const gdprConsent = { gdprApplies: true, consentString: 'test-consent-string' };
      const testUrl = 'https://example.com/sync?gdpr=test-consent-string&param=value';
      const serverResponses = [{
        body: {
          ext: {
            pixels: [
              ['image', testUrl],
              ['image', 'https://another.com/pixel']
            ]
          }
        }
      }];

      const result = spec.getUserSyncs(syncOptions, serverResponses, gdprConsent);

      expect(result).to.have.length(2);
      expect(result[0]).to.deep.equal({
        type: 'image',
        url: 'https://example.com/sync?gdpr=test-consent-string&param=value'
      });
      expect(result[1]).to.deep.equal({
        type: 'image',
        url: 'https://another.com/pixel'
      });
    });

    it('should ignore non-image pixel types', function () {
      const gdprConsent = { gdprApplies: true, consentString: 'test-consent' };
      const serverResponses = [{
        body: {
          ext: {
            pixels: [
              ['iframe', 'https://iframe.com/sync'],
              ['image', 'https://image.com/pixel'],
              ['unknown', 'https://unknown.com/pixel']
            ]
          }
        }
      }];

      const result = spec.getUserSyncs(syncOptions, serverResponses, gdprConsent);

      expect(result).to.have.length(1);
      expect(result[0]).to.deep.equal({
        type: 'image',
        url: 'https://image.com/pixel'
      });
    });

    it('should handle responses without ext field gracefully', function () {
      const gdprConsent = { gdprApplies: true, consentString: 'test-consent' };
      const serverResponses = [
        { body: {} },
        { body: { ext: { pixels: [['image', 'https://valid.com/pixel']] } } }
      ];

      const result = spec.getUserSyncs(syncOptions, serverResponses, gdprConsent);

      expect(result).to.have.length(1);
      expect(result[0].url).to.equal('https://valid.com/pixel');
    });
  })
})
