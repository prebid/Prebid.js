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
      expect(bidRequest.data.consent_string).to.eq('consent_string123');
      expect(bidRequest.data.consent_required).to.eq(true);
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

    it('returns a blank array if there are no creatives', () => {
      const bidResponse = { body: { creatives: [] } };
      expect(spec.interpretResponse(bidResponse, prebidRequest[0])).to.be.an('array').that.is.empty;
    });

    it('returns a blank array if body object is empty', () => {
      const bidResponse = { body: {} };
      expect(spec.interpretResponse(bidResponse, prebidRequest[0])).to.be.an('array').that.is.empty;
    });

    it('returns a blank array if body is null', () => {
      const bidResponse = { body: null };
      expect(spec.interpretResponse(bidResponse, prebidRequest[0])).to.be.an('array').that.is.empty;
    });

    it('correctly sends back a sfp script tag', () => {
      const adMarkup = spec.interpretResponse(bidderResponse, prebidRequest[0])[0].ad;
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

    it('returns an empty array if pixels are not enabled', () => {
      const syncArray = spec.getUserSyncs({ pixelEnabled: false }, serverResponses);
      expect(syncArray).to.be.an('array').that.is.empty;
    });
  });
});
