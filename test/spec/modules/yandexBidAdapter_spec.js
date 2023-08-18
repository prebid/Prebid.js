import {assert, expect} from 'chai';
import {spec} from 'modules/yandexBidAdapter.js';
import {parseUrl} from 'src/utils.js';
import {BANNER} from '../../../src/mediaTypes';

describe('Yandex adapter', function () {
  function getBidConfig() {
    return {
      bidder: 'yandex',
      params: {
        pageId: 123,
        impId: 1,
      },
    };
  }

  function getBidRequest() {
    return {
      ...getBidConfig(),
      bidId: 'bidid-1',
      adUnitCode: 'adUnit-123',
      mediaTypes: {
        banner: {
          sizes: [
            [300, 250],
            [300, 600]
          ],
        },
      },
    };
  }

  describe('isBidRequestValid', function () {
    it('should return true when required params found', function () {
      const bid = getBidConfig();
      assert(spec.isBidRequestValid(bid));
    });

    it('should return false when required params not found', function () {
      expect(spec.isBidRequestValid({})).to.be.false;
    });

    it('should return false when required params.pageId are not passed', function () {
      const bid = getBidConfig();
      delete bid.params.pageId;

      expect(spec.isBidRequestValid(bid)).to.be.false
    });

    it('should return false when required params.impId are not passed', function () {
      const bid = getBidConfig();
      delete bid.params.impId;

      expect(spec.isBidRequestValid(bid)).to.be.false
    });
  });

  describe('buildRequests', function () {
    const gdprConsent = {
      gdprApplies: 1,
      consentString: 'concent-string',
      apiVersion: 1,
    };

    const bidderRequest = {
      refererInfo: {
        domain: 'yandex.ru'
      },
      gdprConsent
    };

    it('creates a valid banner request', function () {
      const bannerRequest = getBidRequest();
      bannerRequest.getFloor = () => ({
        currency: 'USD',
        // floor: 0.5
      });

      const requests = spec.buildRequests([bannerRequest], bidderRequest);

      expect(requests).to.have.lengthOf(1);
      const request = requests[0];

      expect(request).to.exist;
      const { method, url, data } = request;

      expect(method).to.equal('POST');

      const parsedRequestUrl = parseUrl(url);
      const { search: query } = parsedRequestUrl

      expect(parsedRequestUrl.hostname).to.equal('bs-metadsp.yandex.ru');
      expect(parsedRequestUrl.pathname).to.equal('/metadsp/123');

      expect(query['imp-id']).to.equal('1');
      expect(query['target-ref']).to.equal('yandex.ru');
      expect(query['ssp-id']).to.equal('10500');

      expect(query['gdpr']).to.equal('1');
      expect(query['tcf-consent']).to.equal('concent-string');

      expect(request.data).to.exist;
      expect(data.site).to.not.equal(null);
      expect(data.site.page).to.equal('yandex.ru');

      // expect(data.device).to.not.equal(null);
      // expect(data.device.w).to.equal(window.innerWidth);
      // expect(data.device.h).to.equal(window.innerHeight);

      expect(data.imp).to.have.lengthOf(1);
      expect(data.imp[0].banner).to.not.equal(null);
      expect(data.imp[0].banner.w).to.equal(300);
      expect(data.imp[0].banner.h).to.equal(250);
    });
  });

  describe('response handler', function () {
    const bannerRequest = getBidRequest();

    const bannerResponse = {
      body: {
        seatbid: [{
          bid: [
            {
              impid: '1',
              price: 0.3,
              crid: 321,
              adm: '<!-- HTML/JS -->',
              w: 300,
              h: 250,
              adomain: [
                'example.com'
              ],
              adid: 'yabs.123=',
            }
          ]
        }],
        cur: 'USD',
      },
    };

    it('handles banner responses', function () {
      bannerRequest.bidRequest = {
        mediaType: BANNER,
        bidId: 'bidid-1',
      };
      const result = spec.interpretResponse(bannerResponse, bannerRequest);

      expect(result).to.have.lengthOf(1);
      expect(result[0]).to.exist;

      const rtbBid = result[0];
      expect(rtbBid.width).to.equal(300);
      expect(rtbBid.height).to.equal(250);
      expect(rtbBid.cpm).to.be.within(0.1, 0.5);
      expect(rtbBid.ad).to.equal('<!-- HTML/JS -->');
      expect(rtbBid.currency).to.equal('USD');
      expect(rtbBid.netRevenue).to.equal(true);
      expect(rtbBid.ttl).to.equal(180);

      expect(rtbBid.meta.advertiserDomains).to.deep.equal(['example.com']);
    });
  });
});
