import { expect } from 'chai'
import * as utils from 'src/utils'
import { spec } from 'modules/rdnBidAdapter'
import { newBidder } from 'src/adapters/bidderFactory'

describe('rdnBidAdapter', function() {
  const adapter = newBidder(spec);
  const ENDPOINT = 'https://s-bid.rmp.rakuten.co.jp/h';

  describe('inherited functions', () => {
    it('exists and is a function', () => {
      expect(adapter.callBids).to.exist.and.to.be.a('function')
    })
  });

  describe('isBidRequestValid', () => {
    let bid = {
      bidder: 'rdn',
      params: {
        adSpotId: '56789'
      }
    };

    it('should return true when required params found', () => {
      expect(spec.isBidRequestValid(bid)).to.equal(true)
    });

    it('should return false when required params are not passed', () => {
      bid.params.adSpotId = '';
      expect(spec.isBidRequestValid(bid)).to.equal(false)
    });

    it('should return false when required params are not passed', () => {
      let bid = Object.assign({}, bid);
      delete bid.params;
      bid.params = {};
      expect(spec.isBidRequestValid(bid)).to.equal(false)
    })
  });

  describe('buildRequests', () => {
    const bidRequests = [
      {
        // banner
        params: {
          adSpotId: '58278'
        }
      }
    ];

    it('sends bid request to ENDPOINT via GET', () => {
      const request = spec.buildRequests(bidRequests)[0];
      expect(request.url).to.equal(ENDPOINT);
      expect(request.method).to.equal('GET')
    })
  });

  describe('interpretResponse', () => {
    const bidRequests = {
      banner: {
        method: 'GET',
        url: '',
        data: {
          t: '56789',
          s: 'https',
          ua:
            'Mozilla/5.0 (Linux; Android 5.0; SM-G900P Build/LRX21T) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/67.0.3396.99 Mobile Safari/537.36',
          l: 'ja',
          d: 'examples.com',
          tp: 'https://examples.com/foo/fuga',
          pp: 'https://examples.com/hoge/muga'
        }
      }
    };

    const serverResponse = {
      noAd: [],
      banner: {
        requestId: 'biequa9oaph4we',
        cpm: 37.66,
        width: 300,
        height: 250,
        creativeId: 140281,
        dealId: 'phoh3pad-ai4ah-xoh7x-ahk7cheasae3oh',
        currency: 'JPY',
        netRevenue: 300,
        ttl: 3000,
        referrer: utils.getTopWindowUrl(),
        ad: '<!-- adtag -->'
      }
    };

    it('handles nobid responses', () => {
      const result = spec.interpretResponse(
        { body: serverResponse.noAd },

        bidRequests.banner
      );
      expect(result.length).to.equal(1)
    })
  });
  describe('spec.getUserSyncs', function () {
    const syncResponse = [{
      body: {
        request_id: 'biequa9oaph4we',
        sync_urls: ['https://rdn1.test/sync?uid=9876543210', 'https://rdn2.test/sync?uid=9876543210']
      }
    }];
    const nosyncResponse = [{
      body: {
        request_id: 'biequa9oaph4we',
        sync_urls: []
      }
    }];
    let syncOptions
    beforeEach(function () {
      syncOptions = {
        pixelEnabled: true
      }
    });
    it('sucess usersync url', function () {
      const result = [];
      result.push({type: 'image', url: 'https://rdn1.test/sync?uid=9876543210'});
      result.push({type: 'image', url: 'https://rdn2.test/sync?uid=9876543210'});
      expect(spec.getUserSyncs(syncOptions, syncResponse)).to.deep.equal(result);
    });
  });
});
