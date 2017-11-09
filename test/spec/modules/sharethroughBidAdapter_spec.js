import { expect } from 'chai';
import { sharethroughAdapterSpec } from 'modules/sharethroughBidAdapter';
import { newBidder } from 'src/adapters/bidderFactory';

const spec = newBidder(sharethroughAdapterSpec).getSpec();
const bidderRequest = [
  {
    bidder: 'sharethrough',
    bidId: 'bidId1',
    sizes: [[600, 300]],
    placementCode: 'foo',
    params: {
      pkey: 'aaaa1111'
    }
  },
  {
    bidder: 'sharethrough',
    bidId: 'bidId2',
    sizes: [[700, 400]],
    placementCode: 'bar',
    params: {
      pkey: 'bbbb2222'
    }
  }];
const prebidRequest = [{
  method: 'GET',
  url: document.location.protocol + '//btlr.sharethrough.com' + '/header-bid/v1',
  data: {
    bidId: 'bidId',
    placement_key: 'pKey'
  }
}];
const bidderResponse = {
  body: {
    'adserverRequestId': '40b6afd5-6134-4fbb-850a-bb8972a46994',
    'bidId': 'bidId1',
    'version': 1,
    'creatives': [{
      'auctionWinId': 'b2882d5e-bf8b-44da-a91c-0c11287b8051',
      'cpm': 12.34,
      'creative': {
        'deal_id': 'aDealId',
        'creative_key': 'aCreativeId'
      }
    }],
    'stxUserId': ''
  },
  header: { get: (header) => header }
};

describe('sharethrough adapter spec', () => {
  describe('.code', () => {
    it('should return a bidder code of sharethrough', () => {
      expect(spec.code).to.eql('sharethrough');
    });
  })

  describe('.isBidRequestValid', () => {
    it('should return false if req has no pkey', () => {
      const invalidBidRequest = {
        bidder: 'sharethrough',
        params: {
          notPKey: 'abc123'
        }
      };
      expect(spec.isBidRequestValid(invalidBidRequest)).to.eql(false);
    });

    it('should return false if req has wrong bidder code', () => {
      const invalidBidRequest = {
        bidder: 'notSharethrough',
        params: {
          notPKey: 'abc123'
        }
      };
      expect(spec.isBidRequestValid(invalidBidRequest)).to.eql(false);
    });

    it('should return true if req is correct', () => {
      expect(spec.isBidRequestValid(bidderRequest[0])).to.eq(true);
      expect(spec.isBidRequestValid(bidderRequest[1])).to.eq(true);
    })
  });

  describe('.buildRequests', () => {
    it('should return an array of requests', () => {
      const bidRequests = spec.buildRequests(bidderRequest);

      expect(bidRequests[0].url).to.eq(
        'http://btlr.sharethrough.com/header-bid/v1');
      expect(bidRequests[1].url).to.eq(
        'http://btlr.sharethrough.com/header-bid/v1')
      expect(bidRequests[0].method).to.eq('GET');
    });
  });

  describe('.interpretResponse', () => {
    it('returns a correctly parsed out response', () => {
      expect(spec.interpretResponse(bidderResponse, prebidRequest[0])[0]).to.include(
        {
          width: 0,
          height: 0,
          cpm: 12.34,
          creativeId: 'aCreativeId',
          deal_id: 'aDealId',
          currency: 'USD',
          netRevenue: true,
          ttl: 360,
        });
    });

    it('correctly sends back a sfp script tag', () => {
      const adMarkup = spec.interpretResponse(bidderResponse, prebidRequest[0])[0].ad;
      const resp = btoa(JSON.stringify(bidderResponse));

      expect(adMarkup).to.match(
        /data-str-native-key="pKey" data-stx-response-name=\"str_response_bidId\"/);
      expect(!!adMarkup.indexOf(resp)).to.eql(true);
      expect(adMarkup).to.match(
        /<script src="\/\/native.sharethrough.com\/assets\/sfp-set-targeting.js"><\/script>/);
      expect(adMarkup).to.match(
        /sfp_js.src = "\/\/native.sharethrough.com\/assets\/sfp.js";/);
      expect(adMarkup).to.match(
        /window.top.document.getElementsByTagName\('body'\)\[0\].appendChild\(sfp_js\);/)
    });
  });
});
