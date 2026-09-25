import { expect } from 'chai';
import { spec } from '../../../modules/pragmaAdxBidAdapter.js';

describe('Pragma Adx Bid Adapter', function () {
  const validBidRequest = {
    bidder: 'pragmaAdx',
    bidId: '2f6g8h1',
    params: {
      apiKey: 'adx_pub_test_key',
      adUnitId: 1,
      placement: 'article_inline'
    },
    mediaTypes: {
      video: {
        context: 'instream',
        playerSize: [[640, 360]],
        mimes: ['video/mp4']
      }
    }
  };

  describe('isBidRequestValid', function () {
    it('returns true for a valid video bid with apiKey and adUnitId', function () {
      expect(spec.isBidRequestValid(validBidRequest)).to.be.true;
    });

    it('returns false when apiKey is missing', function () {
      const bid = JSON.parse(JSON.stringify(validBidRequest));
      delete bid.params.apiKey;
      expect(spec.isBidRequestValid(bid)).to.be.false;
    });

    it('returns false when adUnitId is missing', function () {
      const bid = JSON.parse(JSON.stringify(validBidRequest));
      delete bid.params.adUnitId;
      expect(spec.isBidRequestValid(bid)).to.be.false;
    });

    it('returns false when there is no video mediaType (banner-only bid)', function () {
      const bid = JSON.parse(JSON.stringify(validBidRequest));
      delete bid.mediaTypes.video;
      expect(spec.isBidRequestValid(bid)).to.be.false;
    });

    it('returns false for a falsy bid', function () {
      expect(spec.isBidRequestValid(null)).to.be.false;
    });
  });

  describe('buildRequests', function () {
    it('builds one POST ServerRequest per valid bid request', function () {
      const requests = spec.buildRequests([validBidRequest], {});
      expect(requests).to.have.lengthOf(1);
      expect(requests[0].method).to.equal('POST');
      expect(requests[0].url).to.equal('https://apps.pragma-crm.com/api/adx/prebid');
      expect(requests[0].options).to.deep.equal({
        contentType: 'application/json',
        withCredentials: false
      });
    });

    it('sends api_key, ad_unit_id, bid_id and the resolved player size', function () {
      const requests = spec.buildRequests([validBidRequest], {});
      const payload = requests[0].data;
      expect(payload.api_key).to.equal('adx_pub_test_key');
      expect(payload.ad_unit_id).to.equal(1);
      expect(payload.bid_id).to.equal('2f6g8h1');
      expect(payload.w).to.equal(640);
      expect(payload.h).to.equal(360);
      expect(payload.placement).to.equal('article_inline');
    });

    it('falls back to the documented default player size when none is configured', function () {
      const bid = JSON.parse(JSON.stringify(validBidRequest));
      delete bid.mediaTypes.video.playerSize;
      const requests = spec.buildRequests([bid], {});
      expect(requests[0].data.w).to.equal(640);
      expect(requests[0].data.h).to.equal(360);
    });

    it('accepts a flat [w, h] playerSize as well as [[w, h]]', function () {
      const bid = JSON.parse(JSON.stringify(validBidRequest));
      bid.mediaTypes.video.playerSize = [1280, 720];
      const requests = spec.buildRequests([bid], {});
      expect(requests[0].data.w).to.equal(1280);
      expect(requests[0].data.h).to.equal(720);
    });

    it('forwards optional userId and ifa only when configured', function () {
      const bid = JSON.parse(JSON.stringify(validBidRequest));
      bid.params.userId = 'user-123';
      bid.params.ifa = 'idfa-456';
      const requests = spec.buildRequests([bid], {});
      expect(requests[0].data.user_id).to.equal('user-123');
      expect(requests[0].data.ifa).to.equal('idfa-456');
    });

    it('forwards the page URL from bidderRequest.refererInfo', function () {
      const bidderRequest = {
        refererInfo: { page: 'https://publisher.example.com/article' }
      };
      const requests = spec.buildRequests([validBidRequest], bidderRequest);
      expect(requests[0].data.page_url).to.equal('https://publisher.example.com/article');
    });

    it('forwards the GDPR consent string only when gdprApplies is not false', function () {
      const bidderRequest = {
        gdprConsent: { gdprApplies: true, consentString: 'CONSENT_STRING' }
      };
      const requests = spec.buildRequests([validBidRequest], bidderRequest);
      expect(requests[0].data.gdpr_consent).to.equal('CONSENT_STRING');
    });

    it('does not forward a GDPR consent string when gdprApplies is false', function () {
      const bidderRequest = {
        gdprConsent: { gdprApplies: false, consentString: 'CONSENT_STRING' }
      };
      const requests = spec.buildRequests([validBidRequest], bidderRequest);
      expect(requests[0].data.gdpr_consent).to.be.undefined;
    });

    it('forwards the US Privacy (CCPA) string verbatim', function () {
      const bidderRequest = { uspConsent: '1YNN' };
      const requests = spec.buildRequests([validBidRequest], bidderRequest);
      expect(requests[0].data.us_privacy).to.equal('1YNN');
    });

    it('forwards the GPP string and applicable section IDs', function () {
      const bidderRequest = {
        gppConsent: { gppString: 'DBABLA~BVQY', applicableSections: [2, 6] }
      };
      const requests = spec.buildRequests([validBidRequest], bidderRequest);
      expect(requests[0].data.gpp).to.equal('DBABLA~BVQY');
      expect(requests[0].data.gpp_sid).to.deep.equal([2, 6]);
    });

    it('returns one ServerRequest per bid for multiple valid bid requests', function () {
      const secondBid = JSON.parse(JSON.stringify(validBidRequest));
      secondBid.bidId = 'other-bid-id';
      secondBid.params.adUnitId = 2;
      const requests = spec.buildRequests([validBidRequest, secondBid], {});
      expect(requests).to.have.lengthOf(2);
      expect(requests[1].data.ad_unit_id).to.equal(2);
    });
  });

  describe('interpretResponse', function () {
    it('maps a real DSP-priced bid onto a Prebid bid object', function () {
      const serverResponse = {
        body: {
          bids: [{
            requestId: '2f6g8h1',
            cpm: 2.75,
            currency: 'USD',
            width: 640,
            height: 360,
            creativeId: 'adx-123',
            netRevenue: false,
            ttl: 300,
            vastXml: '<VAST version="4.0"></VAST>',
            meta: { advertiserDomains: ['advertiser.example.com'] }
          }]
        }
      };

      const bids = spec.interpretResponse(serverResponse);
      expect(bids).to.have.lengthOf(1);
      const bid = bids[0];
      expect(bid.requestId).to.equal('2f6g8h1');
      expect(bid.cpm).to.equal(2.75);
      expect(bid.currency).to.equal('USD');
      expect(bid.width).to.equal(640);
      expect(bid.height).to.equal(360);
      expect(bid.creativeId).to.equal('adx-123');
      expect(bid.netRevenue).to.be.false;
      expect(bid.ttl).to.equal(300);
      expect(bid.mediaType).to.equal('video');
      expect(bid.vastXml).to.equal('<VAST version="4.0"></VAST>');
      expect(bid.meta.advertiserDomains).to.deep.equal(['advertiser.example.com']);
    });

    it('returns an empty array for an explicit no-bid response', function () {
      const serverResponse = { body: { bids: [], no_bid_reason: 'house' } };
      expect(spec.interpretResponse(serverResponse)).to.deep.equal([]);
    });

    it('filters out a bid with no vastXml', function () {
      const serverResponse = {
        body: { bids: [{ requestId: 'x', cpm: 1.5, currency: 'USD' }] }
      };
      expect(spec.interpretResponse(serverResponse)).to.deep.equal([]);
    });

    it('filters out a bid with a zero or missing cpm', function () {
      const serverResponse = {
        body: {
          bids: [{ requestId: 'x', cpm: 0, vastXml: '<VAST></VAST>' }]
        }
      };
      expect(spec.interpretResponse(serverResponse)).to.deep.equal([]);
    });

    it('defaults advertiserDomains to an empty array when meta is absent', function () {
      const serverResponse = {
        body: {
          bids: [{
            requestId: 'x',
            cpm: 1.5,
            vastXml: '<VAST></VAST>'
          }]
        }
      };
      const bids = spec.interpretResponse(serverResponse);
      expect(bids[0].meta.advertiserDomains).to.deep.equal([]);
    });

    it('handles a missing response body without throwing', function () {
      expect(spec.interpretResponse({})).to.deep.equal([]);
    });
  });
});
