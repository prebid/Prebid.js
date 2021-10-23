import { expect } from 'chai';
import {
  BIDDER_CODE,
  BIDDER_ENDPOINT_URL,
  spec, USERSYNC_URL,
  getBidFloor
} from 'modules/deltaprojectsBidAdapter.js';

const BID_REQ_REFER = 'http://example.com/page?param=val';

describe('deltaprojectsBidAdapter', function() {
  describe('isBidRequestValid', function () {
    function makeBid() {
      return {
        bidder: BIDDER_CODE,
        params: {
          publisherId: '12345'
        },
        adUnitCode: 'adunit-code',
        sizes: [
          [300, 250],
        ],
        bidId: '30b31c1838de1e',
        bidderRequestId: '22edbae2733bf6',
        auctionId: '1d1a030790a475',
      };
    }

    it('should return true when bidder set correctly', function () {
      expect(spec.isBidRequestValid(makeBid())).to.equal(true);
    });

    it('should return false when bid request is null', function () {
      expect(spec.isBidRequestValid(undefined)).to.equal(false);
    });

    it('should return false when bidder not set correctly', function () {
      let bid = makeBid();
      delete bid.bidder;
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });

    it('should return false when publisher id is not set', function () {
      let bid = makeBid();
      delete bid.params.publisherId;
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });
  });

  describe('buildRequests', function () {
    const BIDREQ = {
      bidder: BIDDER_CODE,
      params: {
        tagId: '403370',
        siteId: 'example.com',
      },
      sizes: [
        [300, 250],
      ],
      bidId: '30b31c1838de1e',
      bidderRequestId: '22edbae2733bf6',
      auctionId: '1d1a030790a475',
    }
    const bidRequests = [BIDREQ];
    const bannerRequest = spec.buildRequests(bidRequests, {refererInfo: { referer: BID_REQ_REFER }})[0];
    const bannerRequestBody = bannerRequest.data;

    it('send bid request with test tag if it is set in the param', function () {
      const TEST_TAG = 1;
      const bidRequest = Object.assign({}, BIDREQ, {
        params: { ...BIDREQ.params, test: TEST_TAG },
      });
      const bidderRequest = { refererInfo: { referer: BID_REQ_REFER } };
      const request = spec.buildRequests([bidRequest], bidderRequest)[0];
      expect(request.data.test).to.equal(TEST_TAG);
    });

    it('send bid request with correct timeout', function () {
      const TMAX = 10;
      const bidderRequest = { refererInfo: { referer: BID_REQ_REFER }, timeout: TMAX };
      const request = spec.buildRequests(bidRequests, bidderRequest)[0];
      expect(request.data.tmax).to.equal(TMAX);
    });

    it('send bid request to the correct endpoint URL', function () {
      expect(bannerRequest.url).to.equal(BIDDER_ENDPOINT_URL);
    });

    it('sends bid request to our endpoint via POST', function () {
      expect(bannerRequest.method).to.equal('POST');
    });

    it('sends screen dimensions', function () {
      expect(bannerRequestBody.device.w).to.equal(screen.width);
      expect(bannerRequestBody.device.h).to.equal(screen.height);
    });

    it('includes the ad size in the bid request', function () {
      expect(bannerRequestBody.imp[0].banner.format[0].w).to.equal(BIDREQ.sizes[0][0]);
      expect(bannerRequestBody.imp[0].banner.format[0].h).to.equal(BIDREQ.sizes[0][1]);
    });

    it('sets domain and href correctly', function () {
      expect(bannerRequestBody.site.domain).to.equal(BIDREQ.params.siteId);
      expect(bannerRequestBody.site.page).to.equal(BID_REQ_REFER);
    });

    const gdprBidRequests = [{
      bidder: BIDDER_CODE,
      params: {
        tagId: '403370',
        siteId: 'example.com'
      },
      sizes: [
        [300, 250]
      ],
      bidId: '30b31c1838de1e',
      bidderRequestId: '22edbae2733bf6',
      auctionId: '1d1a030790a475'
    }];
    const consentString = 'BOJ/P2HOJ/P2HABABMAAAAAZ+A==';

    const GDPR_REQ_REFERER = 'http://localhost:9876/'
    function getGdprRequestBody(gdprApplies, consentString) {
      const gdprRequest = spec.buildRequests(gdprBidRequests, {
        gdprConsent: {
          gdprApplies: gdprApplies,
          consentString: consentString,
        },
        refererInfo: {
          referer: GDPR_REQ_REFERER,
        },
      })[0];
      return gdprRequest.data;
    }

    it('should handle gdpr applies being present and true', function() {
      const gdprRequestBody = getGdprRequestBody(true, consentString);
      expect(gdprRequestBody.regs.ext.gdpr).to.equal(1);
      expect(gdprRequestBody.user.ext.consent).to.equal(consentString);
    })

    it('should handle gdpr applies being present and false', function() {
      const gdprRequestBody = getGdprRequestBody(false, consentString);
      expect(gdprRequestBody.regs.ext.gdpr).to.equal(0);
      expect(gdprRequestBody.user.ext.consent).to.equal(consentString);
    })

    it('should handle gdpr applies  being undefined', function() {
      const gdprRequestBody = getGdprRequestBody(undefined, consentString);
      expect(gdprRequestBody.regs).to.deep.equal({ext: {}});
      expect(gdprRequestBody.user.ext.consent).to.equal(consentString);
    })

    it('should handle gdpr consent being undefined', function() {
      const gdprRequest = spec.buildRequests(gdprBidRequests, {refererInfo: { referer: GDPR_REQ_REFERER }})[0];
      const gdprRequestBody = gdprRequest.data;
      expect(gdprRequestBody.regs).to.deep.equal({ ext: {} });
      expect(gdprRequestBody.user).to.deep.equal({ ext: {} });
    })
  });

  describe('interpretResponse', function () {
    const bidRequests = [
      {
        bidder: BIDDER_CODE,
        params: {
          tagId: '403370',
          siteId: 'example.com',
          currency: 'USD',
        },
        sizes: [
          [300, 250],
        ],
        bidId: '30b31c1838de1e',
        bidderRequestId: '22edbae2733bf6',
        auctionId: '1d1a030790a475',
      },
    ];
    const request = spec.buildRequests(bidRequests, {refererInfo: { referer: BID_REQ_REFER }})[0];
    function makeResponse() {
      return {
        body: {
          id: '5e5c23a5ba71e78',
          seatbid: [
            {
              bid: [
                {
                  id: '6vmb3isptf',
                  crid: 'deltaprojectscreative',
                  impid: '322add653672f68',
                  price: 1.22,
                  adm: '<!-- creative -->',
                  attr: [5],
                  h: 90,
                  nurl: 'http://nurl',
                  w: 728,
                }
              ],
              seat: 'MOCK'
            }
          ],
          bidid: '5e5c23a5ba71e78',
          cur: 'USD'
        }
      };
    }
    const expectedBid = {
      requestId: '322add653672f68',
      cpm: 1.22,
      width: 728,
      height: 90,
      creativeId: 'deltaprojectscreative',
      dealId: null,
      currency: 'USD',
      netRevenue: true,
      mediaType: 'banner',
      ttl: 60,
      ad: '<!-- creative --><div style="position:absolute;left:0px;top:0px;visibility:hidden;"><img src="http://nurl"></div>'
    };

    it('should get incorrect bid response if response body is missing', function () {
      let response = makeResponse();
      delete response.body;
      let result = spec.interpretResponse(response, request);
      expect(result.length).to.equal(0);
    });

    it('should get incorrect bid response if id or seat id of response body is missing', function () {
      let response1 = makeResponse();
      delete response1.body.id;
      let result1 = spec.interpretResponse(response1, request);
      expect(result1.length).to.equal(0);

      let response2 = makeResponse();
      delete response2.body.seatbid;
      let result2 = spec.interpretResponse(response2, request);
      expect(result2.length).to.equal(0);
    });

    it('should get the correct bid response', function () {
      let result = spec.interpretResponse(makeResponse(), request);
      expect(result.length).to.equal(1);
      expect(result[0]).to.deep.equal(expectedBid);
    });

    it('should handle a missing crid', function () {
      let noCridResponse = makeResponse();
      delete noCridResponse.body.seatbid[0].bid[0].crid;
      const fallbackCrid = noCridResponse.body.seatbid[0].bid[0].id;
      let noCridResult = Object.assign({}, expectedBid, {'creativeId': fallbackCrid});
      let result = spec.interpretResponse(noCridResponse, request);
      expect(result.length).to.equal(1);
      expect(result[0]).to.deep.equal(noCridResult);
    });

    it('should handle a missing nurl', function () {
      let noNurlResponse = makeResponse();
      delete noNurlResponse.body.seatbid[0].bid[0].nurl;
      let noNurlResult = Object.assign({}, expectedBid);
      noNurlResult.ad = '<!-- creative -->';
      let result = spec.interpretResponse(noNurlResponse, request);
      expect(result.length).to.equal(1);
      expect(result[0]).to.deep.equal(noNurlResult);
    });

    it('handles empty bid response', function () {
      let response = {
        body: {
          id: '5e5c23a5ba71e78',
          seatbid: []
        }
      };
      let result = spec.interpretResponse(response, request);
      expect(result.length).to.equal(0);
    });

    it('should keep custom properties', () => {
      const customProperties = {test: 'a test message', param: {testParam: 1}};
      const expectedResult = Object.assign({}, expectedBid, {[spec.code]: customProperties});
      const response = makeResponse();
      response.body.seatbid[0].bid[0].ext = customProperties;
      const result = spec.interpretResponse(response, request);
      expect(result.length).to.equal(1);
      expect(result[0]).to.deep.equal(expectedResult);
    });
  });

  describe('onBidWon', function () {
    const OPEN_RTB_RESP = {
      body: {
        id: 'abc',
        seatbid: [
          {
            bid: [
              {
                'id': 'abc*123*456',
                'impid': 'xxxxxxx',
                'price': 46.657196,
                'adm': '<iframe id="dsp_iframe_228285197" src="https//abc/${AUCTION_PRICE:B64}&creative_id=123"></script>',
                'adomain': ['deltaprojects.com'],
                'h': 600,
                'w': 300,
                'cid': '868253',
                'crid': '732935',
                'cat': [],
              },
            ],
            'seat': '2147483647',
          },
        ],
        bidid: 'xyz',
        cur: 'USD',
      },
    }
    it('should replace auction price macro', () => {
      const bid = spec.interpretResponse(OPEN_RTB_RESP)[0];
      spec.onBidWon(bid);
      expect(bid.ad).to.contains(`${Math.round(bid.cpm * 1000000)}`);
    });
  });

  describe('getUserSyncs', function () {
    it('should not do user sync when pixel is disabled', () => {
      const syncOptions = { pixelEnabled: false }
      const result = spec.getUserSyncs(syncOptions)
      expect(result.length).to.equal(0);
    });

    it('should do user sync without gdpr params when gdprConsent missing', () => {
      const syncOptions = { pixelEnabled: true }
      const gdprConsent = undefined
      const result = spec.getUserSyncs(syncOptions, gdprConsent)
      expect(result[0].url).to.equal(USERSYNC_URL);
    });

    it('should do user sync with gdpr params when gdprConsent exists', () => {
      const syncOptions = { pixelEnabled: true }
      const gdprConsent = {
        gdprApplies: true,
        consentString: 'ABCABCABC'
      }
      const expectedResult1 = USERSYNC_URL + `?gdpr=${Number(gdprConsent.gdprApplies)}&gdpr_consent=${gdprConsent.consentString}`
      const result1 = spec.getUserSyncs(syncOptions, {}, gdprConsent)
      expect(result1[0].url).to.equal(expectedResult1);

      delete gdprConsent.gdprApplies
      const result2 = spec.getUserSyncs(syncOptions, {}, gdprConsent)
      const expectedResult2 = USERSYNC_URL + `?gdpr_consent=${gdprConsent.consentString}`
      expect(result2[0].url).to.equal(expectedResult2);
    });
  });

  describe('getBidFloor', () => {
    it('should not get bid floor when getFloor is not defined', () => {
      const bid = {};
      const currency = 'SEK';
      const result = getBidFloor(bid, 'banner', '*', currency);
      expect(result).to.be.undefined;
    });

    it('should not get bid floor when getFloor is not a function', () => {
      const bid = { getFloor: 1.0 };
      const currency = 'SEK';
      const result = getBidFloor(bid, 'banner', '*', currency);
      expect(result).to.be.undefined;
    });

    it('should not get bid floor when getFloor return empty', () => {
      const bid = { getFloor: () => ({}) };
      const currency = 'SEK';
      const result = getBidFloor(bid, 'banner', '*', currency);
      expect(result).to.be.undefined;
    });

    it('should not get bid floor in SEK when floor is not a number', () => {
      const bid = { getFloor: () => ({ currency: 'SEK', floor: '1.0' }) };
      const currency = 'SEK';
      const result = getBidFloor(bid, 'banner', '*', currency);
      expect(result).to.be.undefined;
    });

    it('should get bid floor in USD when currency is not defined', () => {
      const bid = { getFloor: () => ({ currency: 'USD', floor: 1.0 }) };
      const currency = undefined;
      const result = getBidFloor(bid, 'banner', '*', currency);
      expect(result.floor).to.equal(1.0);
      expect(result.currency).to.equal('USD');
    });

    it('should get bid floor in SEK when currency is SEK', () => {
      const bid = { getFloor: () => ({ currency: 'SEK', floor: 1.0 }) };
      const currency = 'SEK';
      const result = getBidFloor(bid, 'banner', '*', currency);
      expect(result.floor).to.equal(1.0);
      expect(result.currency).to.equal('SEK');
    });
  });
});
