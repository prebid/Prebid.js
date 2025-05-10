import { expect } from 'chai';
import { spec } from 'modules/yieldloveBidAdapter.js';

const ENDPOINT_URL = 'https://s2s.yieldlove-ad-serving.net/openrtb2/auction';

// test params
const pid = 34437;
const rid = 'website.com';

describe('Yieldlove Bid Adaper', function () {
  const bidRequests = [
    {
      'bidder': 'yieldlove',
      'adUnitCode': 'adunit-code',
      'sizes': [ [300, 250] ],
      'params': {
        pid,
        rid
      }
    }
  ];

  const serverResponse = {
    body: {
      seatbid: [
        {
          bid: [
            {
              impid: 'aaaa',
              price: 0.5,
              w: 300,
              h: 250,
              adm: '<div>test</div>',
              crid: '1234',
            }
          ]
        }
      ],
      ext: {}
    }
  }

  describe('isBidRequestValid', () => {
    const bid = bidRequests[0];

    it('should return true when required params found', function () {
      expect(spec.isBidRequestValid(bid)).to.equal(true);
    });

    it('should return false when required params are not present', function () {
      const invalidBid = { ...bid, params: {} };
      expect(spec.isBidRequestValid(invalidBid)).to.equal(false);
    });

    it('should return false when required param "pid" is not present', function () {
      const invalidBid = { ...bid, params: { ...bid.params, pid: undefined } };
      expect(spec.isBidRequestValid(invalidBid)).to.equal(false);
    });

    it('should return false when required param "rid" is not present', function () {
      const invalidBid = { ...bid, params: { ...bid.params, rid: undefined } };
      expect(spec.isBidRequestValid(invalidBid)).to.equal(false);
    });
  });

  describe('buildRequests', () => {
    it('should build the request', function () {
      const request = spec.buildRequests(bidRequests, {});
      const payload = request.data;
      const url = request.url;

      expect(url).to.equal(ENDPOINT_URL);

      expect(payload.site).to.exist;
      expect(payload.site.publisher).to.exist;
      expect(payload.site.publisher.id).to.exist;
      expect(payload.site.publisher.id).to.equal(rid);
      expect(payload.site.domain).to.exist;
      expect(payload.site.domain).to.equal(rid);

      expect(payload.imp).to.exist;
      expect(payload.imp[0]).to.exist;
      expect(payload.imp[0].ext).to.exist;
      expect(payload.imp[0].ext.prebid).to.exist;
      expect(payload.imp[0].ext.prebid.storedrequest).to.exist;
      expect(payload.imp[0].ext.prebid.storedrequest.id).to.exist;
      expect(payload.imp[0].ext.prebid.storedrequest.id).to.equal(pid.toString());
    });
  });

  describe('interpretResponse', () => {
    it('should interpret the response by pushing it in the bids elem', function () {
      const allResponses = spec.interpretResponse(serverResponse);
      const response = allResponses[0];
      const seatbid = serverResponse.body.seatbid[0].bid[0];

      expect(response.requestId).to.exist;
      expect(response.requestId).to.equal(seatbid.impid);
      expect(response.cpm).to.exist;
      expect(response.cpm).to.equal(seatbid.price);
      expect(response.width).to.exist;
      expect(response.width).to.equal(seatbid.w);
      expect(response.height).to.exist;
      expect(response.height).to.equal(seatbid.h);
      expect(response.ad).to.exist;
      expect(response.ad).to.equal(seatbid.adm);
      expect(response.ttl).to.exist;
      expect(response.creativeId).to.exist;
      expect(response.creativeId).to.equal(seatbid.crid);
      expect(response.netRevenue).to.exist;
      expect(response.currency).to.exist;
    });
  });

  describe('getUserSyncs', function() {
    it('should retrieve user iframe syncs', function () {
      expect(spec.getUserSyncs({ iframeEnabled: true }, [serverResponse], undefined, undefined)).to.deep.equal([{
        type: 'iframe',
        url: 'https://cdn-a.yieldlove.com/load-cookie.html?endpoint=yieldlove&max_sync_count=100&gdpr=NaN&gdpr_consent=&'
      }]);

      expect(spec.getUserSyncs({ iframeEnabled: true }, [serverResponse], { gdprApplies: true, consentString: 'example' }, undefined)).to.deep.equal([{
        type: 'iframe',
        url: 'https://cdn-a.yieldlove.com/load-cookie.html?endpoint=yieldlove&max_sync_count=100&gdpr=1&gdpr_consent=example&'
      }]);
    });
  });
})
