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
      pkey: 'bbbb2222',
      iframe: true
    }
  },
  {
    bidder: 'sharethrough',
    bidId: 'bidId3',
    sizes: [[700, 400]],
    placementCode: 'coconut',
    params: {
      pkey: 'cccc3333',
      iframe: true,
      iframeSize: [500, 500]
    },
  },
];

const prebidRequests = [
  {
    method: 'GET',
    url: document.location.protocol + '//btlr.sharethrough.com' + '/header-bid/v1',
    data: {
      bidId: 'bidId',
      placement_key: 'pKey'
    },
    strData: {
      stayInIframe: false,
      sizes: []
    }
  },
  {
    method: 'GET',
    url: document.location.protocol + '//btlr.sharethrough.com' + '/header-bid/v1',
    data: {
      bidId: 'bidId',
      placement_key: 'pKey'
    },
    strData: {
      stayInIframe: true,
      sizes: [[300, 250], [300, 300], [250, 250], [600, 50]]
    }
  },
  {
    method: 'GET',
    url: document.location.protocol + '//btlr.sharethrough.com' + '/header-bid/v1',
    data: {
      bidId: 'bidId',
      placement_key: 'pKey'
    },
    strData: {
      stayInIframe: true,
      iframeSize: [500, 500],
      sizes: [[300, 250], [300, 300], [250, 250], [600, 50]]
    }
  },
];

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
        'creative_key': 'aCreativeId',
        'title': '✓ à la mode'
      }
    }],
    'stxUserId': ''
  },
  header: { get: (header) => header }
};

// Mirrors the one in modules/sharethroughBidAdapter.js as the function is unexported
const b64EncodeUnicode = (str) => {
  return btoa(
    encodeURIComponent(str).replace(/%([0-9A-F]{2})/g,
      function toSolidBytes(match, p1) {
        return String.fromCharCode('0x' + p1);
      }));
}

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

    it('should add consent parameters if gdprConsent is present', () => {
      const gdprConsent = { consentString: 'consent_string123', gdprApplies: true };
      const fakeBidRequest = { gdprConsent: gdprConsent };
      const bidRequest = spec.buildRequests(bidderRequest, fakeBidRequest)[0];
      expect(bidRequest.data.consent_required).to.eq(true);
      expect(bidRequest.data.consent_string).to.eq('consent_string123');
    });

    it('should handle gdprConsent is present but values are undefined case', () => {
      const gdprConsent = { consent_string: undefined, gdprApplies: undefined };
      const fakeBidRequest = { gdprConsent: gdprConsent };
      const bidRequest = spec.buildRequests(bidderRequest, fakeBidRequest)[0];
      expect(bidRequest.data).to.not.include.any.keys('consent_string')
    });
  });

  describe('.interpretResponse', () => {
    it('returns a correctly parsed out response', () => {
      expect(spec.interpretResponse(bidderResponse, prebidRequests[0])[0]).to.include(
        {
          width: 0,
          height: 0,
          cpm: 12.34,
          creativeId: 'aCreativeId',
          dealId: 'aDealId',
          currency: 'USD',
          netRevenue: true,
          ttl: 360,
        });
    });

    it('returns a correctly parsed out response with largest size when strData.stayInIframe is true', () => {
      expect(spec.interpretResponse(bidderResponse, prebidRequests[1])[0]).to.include(
        {
          width: 300,
          height: 300,
          cpm: 12.34,
          creativeId: 'aCreativeId',
          dealId: 'aDealId',
          currency: 'USD',
          netRevenue: true,
          ttl: 360,
        });
    });

    it('returns a correctly parsed out response with explicitly defined size when strData.stayInIframe is true and strData.iframeSize is provided', () => {
      expect(spec.interpretResponse(bidderResponse, prebidRequests[2])[0]).to.include(
        {
          width: 500,
          height: 500,
          cpm: 12.34,
          creativeId: 'aCreativeId',
          dealId: 'aDealId',
          currency: 'USD',
          netRevenue: true,
          ttl: 360,
        });
    });

    it('returns a blank array if there are no creatives', () => {
      const bidResponse = { body: { creatives: [] } };
      expect(spec.interpretResponse(bidResponse, prebidRequests[0])).to.be.an('array').that.is.empty;
    });

    it('returns a blank array if body object is empty', () => {
      const bidResponse = { body: {} };
      expect(spec.interpretResponse(bidResponse, prebidRequests[0])).to.be.an('array').that.is.empty;
    });

    it('returns a blank array if body is null', () => {
      const bidResponse = { body: null };
      expect(spec.interpretResponse(bidResponse, prebidRequests[0])).to.be.an('array').that.is.empty;
    });

    it('correctly generates ad markup', () => {
      const adMarkup = spec.interpretResponse(bidderResponse, prebidRequests[0])[0].ad;
      let resp = null;

      expect(() => btoa(JSON.stringify(bidderResponse))).to.throw();
      expect(() => resp = b64EncodeUnicode(JSON.stringify(bidderResponse))).not.to.throw();
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

    it('correctly generates ad markup for staying in iframe', () => {
      const adMarkup = spec.interpretResponse(bidderResponse, prebidRequests[1])[0].ad;
      let resp = null;

      expect(() => btoa(JSON.stringify(bidderResponse))).to.throw();
      expect(() => resp = b64EncodeUnicode(JSON.stringify(bidderResponse))).not.to.throw();
      expect(adMarkup).to.match(
        /data-str-native-key="pKey" data-stx-response-name=\"str_response_bidId\"/);
      expect(!!adMarkup.indexOf(resp)).to.eql(true);
      expect(adMarkup).to.match(
        /<script src="\/\/native.sharethrough.com\/assets\/sfp.js"><\/script>/);
    });
  });

  describe('.getUserSyncs', () => {
    const cookieSyncs = ['cookieUrl1', 'cookieUrl2', 'cookieUrl3'];
    const serverResponses = [{ body: { cookieSyncUrls: cookieSyncs } }];

    it('returns an array of correctly formatted user syncs', () => {
      const syncArray = spec.getUserSyncs({ pixelEnabled: true }, serverResponses);
      expect(syncArray).to.deep.equal([
        { type: 'image', url: 'cookieUrl1' },
        { type: 'image', url: 'cookieUrl2' },
        { type: 'image', url: 'cookieUrl3' }]
      );
    });

    it('returns an empty array if the body is null', () => {
      const syncArray = spec.getUserSyncs({ pixelEnabled: true }, [{ body: null }]);
      expect(syncArray).to.be.an('array').that.is.empty;
    });

    it('returns an empty array if the body.cookieSyncUrls is missing', () => {
      const syncArray = spec.getUserSyncs({ pixelEnabled: true }, [{ body: { creatives: ['creative'] } }]);
      expect(syncArray).to.be.an('array').that.is.empty;
    });

    it('returns an empty array if pixels are not enabled', () => {
      const syncArray = spec.getUserSyncs({ pixelEnabled: false }, serverResponses);
      expect(syncArray).to.be.an('array').that.is.empty;
    });
  });
});
