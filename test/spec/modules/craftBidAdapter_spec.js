import {expect} from 'chai';
import {spec} from 'modules/craftBidAdapter.js';
import {newBidder} from 'src/adapters/bidderFactory.js';
import {config} from 'src/config.js';

describe('craftAdapter', function () {
  let adapter = newBidder(spec);

  describe('inherited functions', function () {
    it('exists and is a function', function () {
      expect(adapter.callBids).to.exist.and.to.be.a('function');
    });
  });

  describe('isBidRequestValid', function () {
    before(function() {
      this.windowContext = window.context;
      window.context = null;
    });

    after(function() {
      window.context = this.windowContext;
    });
    let bid = {
      bidder: 'craft',
      params: {
        sitekey: 'craft-prebid-example',
        placementId: '1234abcd'
      },
    };

    it('should return true when required params found', function () {
      expect(spec.isBidRequestValid(bid)).to.equal(true);
    });

    it('should return false when params.sitekey not found', function () {
      let bid = Object.assign({}, bid);
      delete bid.params;
      bid.params = {
        placementId: '1234abcd'
      };
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });

    it('should return false when params.placementId not found', function () {
      let bid = Object.assign({}, bid);
      delete bid.params;
      bid.params = {
        sitekey: 'craft-prebid-example'
      };
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });

    it('should return false when AMP cotext found', function () {
      window.context = {
        pageViewId: 'xxx'
      };
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });
  });

  describe('buildRequests', function () {
    let bidRequests = [{
      bidder: 'craft',
      params: {
        'sitekey': 'craft-prebid-example',
        'placementId': '1234abcd'
      },
      adUnitCode: '/21998384947/prebid-example',
      sizes: [[300, 250]],
      bidId: '0396fae4eb5f47',
      bidderRequestId: '4a859978b5d4bd',
      auctionId: '8720f980-4639-4150-923a-e96da2f1de36',
      transactionId: 'e0c52da2-c008-491c-a910-c6765d948700',
    }];
    let bidderRequest = {
      refererInfo: {
        referer: 'https://www.gacraft.jp/publish/craft-prebid-example.html'
      }
    };
    it('sends bid request to ENDPOINT via POST', function () {
      let request = spec.buildRequests(bidRequests, bidderRequest);
      expect(request.method).to.equal('POST');
      expect(request.url).to.equal('https://gacraft.jp/prebid-v3/craft-prebid-example');
      let data = JSON.parse(request.data);
      expect(data.tags).to.deep.equals([{
        sitekey: 'craft-prebid-example',
        placementId: '1234abcd',
        uid: null,
        sizes: [[300, 250]],
        primary_size: [300, 250],
        uuid: '0396fae4eb5f47'
      }]);
      expect(data.referrer_detection).to.deep.equals({
        rd_ref: 'https://www.gacraft.jp/publish/craft-prebid-example.html'
      });
    });
  });

  describe('interpretResponse', function() {
    let serverResponse = {
      body: {
        tags: [{
          uuid: '0396fae4eb5f47',
          bid_key: '72038482-c4c3-4055-9e7e-0579585bb421',
          won_url: 'https://www.gacraft.jp/publish/won',
          ads: [{
            content_source: 'rtb',
            ad_type: 'banner',
            creative_id: 9999,
            cpm: 10.01,
            deal_id: '8DEF60EFDFB5',
            rtb: {
              banner: {
                content: '<a href="https://www.gacraft.jp" target="_blank"><img width="300" height="250" style="border-style: none" src="https://www.gacraft.jp/publish/craft.png"/></a>',
                width: 300,
                height: 250
              },
            }
          }]
        }],
      }
    };
    let bidderRequest = {
      bids: [{
        bidId: '0396fae4eb5f47',
        adUnitCode: 'craft-prebid-example'
      }]
    };
    it('should get correct bid response', function() {
      let bids = spec.interpretResponse(serverResponse, {bidderRequest: bidderRequest});
      expect(bids).to.have.lengthOf(1);
      expect(bids[0]).to.deep.equals({
        _adUnitCode: 'craft-prebid-example',
        _bidKey: '72038482-c4c3-4055-9e7e-0579585bb421',
        _prebidWon: 'https://www.gacraft.jp/publish/won',
        ad: '<a href="https://www.gacraft.jp" target="_blank"><img width="300" height="250" style="border-style: none" src="https://www.gacraft.jp/publish/craft.png"/></a>',
        cpm: 10.01,
        creativeId: 9999,
        currency: 'JPY',
        dealId: '8DEF60EFDFB5',
        height: 250,
        mediaType: 'banner',
        meta: null,
        netRevenue: false,
        requestId: '0396fae4eb5f47',
        ttl: 360,
        width: 300,
      });
    });
  });
});
