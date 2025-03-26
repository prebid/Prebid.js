import {
  spec,
  utils,
  DEFAULT_AD_SERVER_BASE_URL
} from 'modules/mobkoiBidAdapter.js';

describe('Mobkoi bidding Adapter', function () {
  const testAdServerBaseUrl = 'http://test.adServerBaseUrl.com';
  const testRequestId = 'test-request-id';
  const testPlacementId = 'mobkoiPlacementId';
  const testBidId = 'test-bid-id';
  const bidderCode = 'mobkoi';
  const testTransactionId = 'test-transaction-id';
  const testAdUnitId = 'test-ad-unit-id';
  const testAuctionId = 'test-auction-id';

  const getOrtb2 = () => ({
    site: {
      publisher: {
        ext: { adServerBaseUrl: testAdServerBaseUrl }
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
      adServerBaseUrl: testAdServerBaseUrl,
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

    it('should obtain adServerBaseUrl from ad unit params if the value does not exist in ortb2', function () {
      delete bidderRequest.ortb2.site.publisher.ext.adServerBaseUrl;
      const request = spec.buildRequests(bidderRequest.bids, bidderRequest);
      const ortbData = request.data;

      expect(ortbData.site.publisher.ext.adServerBaseUrl).to.equal(bidderRequest.bids[0].params.adServerBaseUrl);
    });

    it('should use the pro server url when the ad server base url is not set', function () {
      delete bidderRequest.ortb2.site.publisher.ext.adServerBaseUrl;
      delete bidderRequest.bids[0].params.adServerBaseUrl;

      const request = spec.buildRequests(bidderRequest.bids, bidderRequest);
      expect(request.url).to.equal(DEFAULT_AD_SERVER_BASE_URL + '/bid');
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

    describe('getAdServerEndpointBaseUrl', function () {
      it('should return the adServerBaseUrl from the given object', function () {
        expect(utils.getAdServerEndpointBaseUrl(bidderRequest))
          .to.equal(testAdServerBaseUrl);
      });

      it('should return default prod ad server url when adServerBaseUrl is missing in params and ortb2', function () {
        delete bidderRequest.ortb2.site.publisher.ext.adServerBaseUrl;
        delete bidderRequest.bids[0].params.adServerBaseUrl;

        expect(utils.getAdServerEndpointBaseUrl(bidderRequest)).to.equal(DEFAULT_AD_SERVER_BASE_URL);
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
})
