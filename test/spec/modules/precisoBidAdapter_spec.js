import { expect } from 'chai';
import { spec } from '../../../modules/precisoBidAdapter.js';
// simport { config } from '../../../src/config.js';

const DEFAULT_PRICE = 1
const DEFAULT_CURRENCY = 'USD'
const DEFAULT_BANNER_WIDTH = 300
const DEFAULT_BANNER_HEIGHT = 250
const BIDDER_CODE = 'preciso';

describe('PrecisoAdapter', function () {
  let bid = {
    precisoBid: true,
    bidId: '23fhj33i987f',
    bidder: 'preciso',
    buyerUid: 'testuid',
    mediaTypes: {
      banner: {
        sizes: [[DEFAULT_BANNER_WIDTH, DEFAULT_BANNER_HEIGHT]]
      }
    },
    params: {
      host: 'prebid',
      sourceid: '0',
      publisherId: '0',
      mediaType: 'banner',
      region: 'IND'

    },
    userId: {
      pubcid: '12355454test'

    },
    user: {
      geo: {
        region: 'IND',
      }
    },
    ortb2: {
      device: {
        w: 1920,
        h: 166,
        dnt: 0,
      },
      site: {
        domain: 'localHost'
      },
      source: {
        tid: 'eaff09b-a1ab-4ec6-a81e-c5a75bc1dde3'
      }

    }

  };

  describe('isBidRequestValid', function () {
    it('Should return true if there are bidId, params and sourceid parameters present', function () {
      expect(spec.isBidRequestValid(bid)).to.be.true;
    });
    it('Should return false if at least one of parameters is not present', function () {
      delete bid.params.publisherId;
      expect(spec.isBidRequestValid(bid)).to.be.false;
    });
  });

  describe('buildRequests', function () {
    let serverRequest = spec.buildRequests([bid]);
    it('Creates a ServerRequest object with method, URL and data', function () {
      expect(serverRequest).to.exist;
      expect(serverRequest.method).to.exist;
      expect(serverRequest.url).to.exist;
      expect(serverRequest.data).to.exist;
    });
    it('Returns POST method', function () {
      expect(serverRequest.method).to.equal('POST');
    });
    it('Returns valid URL', function () {
      expect(serverRequest.url).to.equal('https://ssp-bidder.mndtrk.com/bid_request/openrtb');
    });
    it('Returns valid data if array of bids is valid', function () {
      let data = serverRequest.data;
      expect(data).to.be.an('object');
      expect(data.device).to.be.a('object');
      expect(data.user).to.be.a('object');
      expect(data.source).to.be.a('object');
      expect(data.site).to.be.a('object');
    });
    it('Returns empty data if no valid requests are passed', function () {
      delete bid.ortb2.device;
      serverRequest = spec.buildRequests([bid]);
      let data = serverRequest.data;
      expect(data.device).to.be.undefined;
    });
  });

  describe('interpretResponse', function () {
    it('should get correct bid response', function () {
      let response = {

        bidderRequestId: 'f6adb85f-4e19-45a0-b41e-2a5b9a48f23a',

        seatbid: [
          {
            bid: [
              {
                id: '123',
                impid: 'b4f290d7-d4ab-4778-ab94-2baf06420b22',
                price: DEFAULT_PRICE,
                adm: '<b>hi</b>',
                cid: 'test_cid',
                crid: 'test_banner_crid',
                w: DEFAULT_BANNER_WIDTH,
                h: DEFAULT_BANNER_HEIGHT,
                adomain: [],
              }
            ],
            seat: BIDDER_CODE
          }
        ],
      }

      let expectedResponse = [
        {
          requestId: 'b4f290d7-d4ab-4778-ab94-2baf06420b22',
          cpm: DEFAULT_PRICE,
          width: DEFAULT_BANNER_WIDTH,
          height: DEFAULT_BANNER_HEIGHT,
          creativeId: 'test_banner_crid',
          ad: '<b>hi</b>',
          currency: DEFAULT_CURRENCY,
          netRevenue: true,
          ttl: 300,
          meta: { advertiserDomains: [] },
        }
      ]
      let result = spec.interpretResponse({ body: response })

      expect(Object.keys(result[0])).to.have.members(Object.keys(expectedResponse[0]))
    })
  })
  describe('getUserSyncs', function () {
    const syncUrl = 'https://ck.2trk.info/rtb/user/usersync.aspx?id=NA&gdpr=0&gdpr_consent=&us_privacy=&t=4';
    const syncOptions = {
      iframeEnabled: true,
      spec: true
    };
    let userSync = spec.getUserSyncs(syncOptions);
    it('Returns valid URL and type', function () {
      expect(userSync).to.be.an('array').with.lengthOf(1);
      expect(userSync[0].type).to.exist;
      expect(userSync[0].url).to.exist;
      expect(userSync).to.deep.equal([
        { type: 'iframe', url: syncUrl }
      ]);
    });
  });
});
