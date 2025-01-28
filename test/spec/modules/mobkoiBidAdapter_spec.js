import {
  spec,
  utils,
  DEFAULT_AD_SERVER_BASE_URL
} from 'modules/mobkoiBidAdapter.js';

describe('Mobkoi bidding Adapter', function () {
  const testAdServerBaseUrl = 'http://test.adServerBaseUrl.com';
  const testRequestId = 'test-request-id';
  const testPublisherId = 'mobkoiPublisherId';
  const testPlacementId = 'mobkoiPlacementId';
  const testBidId = 'test-bid-id';
  const bidderCode = 'mobkoi';
  const testTransactionId = 'test-transaction-id';
  const testAdUnitId = 'test-ad-unit-id';
  const testAuctionId = 'test-auction-id';

  const getOrtb2 = () => ({
    site: {
      publisher: {
        id: testPublisherId,
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
      publisherId: testPublisherId,
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

    it('should return true when publisher id only exists in ortb2', function () {
      delete bid.params.publisherId;
      expect(spec.isBidRequestValid(bid)).to.equal(true);
    });

    it('should return true when placement id exist in ad unit params', function () {
      expect(spec.isBidRequestValid(bid)).to.equal(true);
    });

    it('should return true when publisher ID only exists in ad unit params', function () {
      delete bid.ortb2.site.publisher.id;
      expect(spec.isBidRequestValid(bid)).to.equal(true);
    });

    it('should return false when publisher id is missing both in ad unit params and ortb2', function () {
      delete bid.ortb2.site.publisher.id;
      delete bid.params.publisherId;
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });

    it('should return false when placement id is missing in ad unit params', function () {
      delete bid.params.placementId;
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });

    it('should return false when publisher id is empty in ad unit params and ortb2', function () {
      bid.ortb2.site.publisher.id = '';
      bid.params.publisherId = '';
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
      expect(ortbData.site.publisher.id).to.equal(bidderRequest.ortb2.site.publisher.id);
    });

    it('should obtain publisher ID from ad unit params if the value does not exist in ortb2.', function () {
      delete bidderRequest.ortb2.site.publisher.id;
      const request = spec.buildRequests(bidderRequest.bids, bidderRequest);
      const ortbData = request.data;

      expect(ortbData.site.publisher.id).to.equal(bidderRequest.bids[0].params.publisherId);
    });

    it('should obtain adServerBaseUrl from ad unit params if the value does not exist in ortb2.', function () {
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

    describe('getPublisherId', function () {
      it('should return the publisherId from the given object', function () {
        expect(utils.getPublisherId(bidderRequest)).to.equal(bidderRequest.ortb2.site.publisher.id);
      });

      it('should throw error when publisherId is missing', function () {
        delete bidderRequest.ortb2.site.publisher.id;
        delete bidderRequest.bids[0].params.publisherId;
        expect(() => {
          utils.getPublisherId(bidderRequest);
        }).to.throw();
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

    describe('replaceAllMacrosInPlace', function () {
      let bidderResponse, bidRequest, bidderRequest;

      beforeEach(function () {
        bidderRequest = getBidderRequest();
        bidRequest = spec.buildRequests(bidderRequest.bids, bidderRequest);
        bidderResponse = getBidderResponse();
      });

      it('should replace all macros in adm, nurl, and lurl fields', function () {
        const bid = bidderResponse.body.seatbid[0].bid[0];
        bid.nurl = '${BIDDING_API_BASE_URL}/win?price=${AUCTION_PRICE}&impressionId=${AUCTION_IMP_ID}&currency=${AUCTION_CURRENCY}&campaignId=${CAMPAIGN_ID}&creativeId=${CREATIVE_ID}&publisherId=${PUBLISHER_ID}&ortbId=${ORTB_ID}';
        bid.lurl = '${BIDDING_API_BASE_URL}/loss?price=${AUCTION_PRICE}&impressionId=${AUCTION_IMP_ID}&currency=${AUCTION_CURRENCY}&campaignId=${CAMPAIGN_ID}&creativeId=${CREATIVE_ID}&publisherId=${PUBLISHER_ID}&ortbId=${ORTB_ID}';
        bid.adm = '<div>${AUCTION_PRICE}${AUCTION_CURRENCY}${AUCTION_IMP_ID}${AUCTION_BID_ID}${CAMPAIGN_ID}${CREATIVE_ID}${PUBLISHER_ID}${ORTB_ID}${BIDDING_API_BASE_URL}</div>';

        const BIDDING_API_BASE_URL = testAdServerBaseUrl;
        const AUCTION_CURRENCY = bidderResponse.body.cur;
        const AUCTION_BID_ID = bidderRequest.auctionId;
        const AUCTION_PRICE = bid.price;
        const AUCTION_IMP_ID = bid.impid;
        const CREATIVE_ID = bid.crid;
        const CAMPAIGN_ID = bid.cid;
        const PUBLISHER_ID = bidderRequest.ortb2.site.publisher.id;
        const ORTB_ID = bidderResponse.body.id;

        const context = {
          bidRequest,
          bidderRequest
        }
        utils.replaceAllMacrosInPlace(bid, context);

        expect(bid.adm).to.equal(`<div>${AUCTION_PRICE}${AUCTION_CURRENCY}${AUCTION_IMP_ID}${AUCTION_BID_ID}${CAMPAIGN_ID}${CREATIVE_ID}${PUBLISHER_ID}${ORTB_ID}${BIDDING_API_BASE_URL}</div>`);
        expect(bid.lurl).to.equal(
          `${BIDDING_API_BASE_URL}/loss?price=${AUCTION_PRICE}&impressionId=${AUCTION_IMP_ID}&currency=${AUCTION_CURRENCY}&campaignId=${CAMPAIGN_ID}&creativeId=${CREATIVE_ID}&publisherId=${PUBLISHER_ID}&ortbId=${ORTB_ID}`
        );
        expect(bid.nurl).to.equal(
          `${BIDDING_API_BASE_URL}/win?price=${AUCTION_PRICE}&impressionId=${AUCTION_IMP_ID}&currency=${AUCTION_CURRENCY}&campaignId=${CAMPAIGN_ID}&creativeId=${CREATIVE_ID}&publisherId=${PUBLISHER_ID}&ortbId=${ORTB_ID}`
        );
      });
    })
  })
})
