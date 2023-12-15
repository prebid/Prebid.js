import { expect } from 'chai'
import { spec } from 'modules/vrtcalBidAdapter'
import { newBidder } from 'src/adapters/bidderFactory'
import { config } from 'src/config.js';
import { createEidsArray } from 'modules/userId/eids.js';

describe('vrtcalBidAdapter', function () {
  const adapter = newBidder(spec)

  let bidRequest = {
    bidId: 'bidID0001',
    transactionId: 'transID0001',
    sizes: [[ 300, 250 ]]
  }

  describe('isBidRequestValid', function () {
    it('should return true 100% of time as no special additional params are required, thus no additional validation needed', function () {
      expect(spec.isBidRequestValid(bidRequest)).to.be.true
    })
  })

  describe('buildRequests', function () {
    let bidRequests = [
      {
        'bidder': 'vrtcal',
        'adUnitCode': 'adunit0001',
        'sizes': [[300, 250]],
        'bidId': 'bidID0001',
        'bidderRequestId': 'br0001',
        'auctionId': 'auction0001',
        'userIdAsEids': {},
        timeout: 435,

        refererInfo: {
          page: 'page'
        }

      }
    ];

    let request = spec.buildRequests(bidRequests);

    it('sends bid request to our endpoint via POST', function () {
      expect(request[0].method).to.equal('POST');
    });

    it('adUnitCode should be sent as prebidAdUnitCode parameters on any requests', function () {
      expect(request[0].data).to.match(/"prebidAdUnitCode":"adunit0001"/);
    });

    it('if the publisher has NOT set a floor via the floors module, zero should be sent as  bidfloor parameter on any requests', function () {
      expect(request[0].data).to.match(/"bidfloor":0/);
    });

    it('if the publisher has set a floor via the floors module, it should be sent as  bidfloor parameter on any requests', function () {
      let floorInfo;
      bidRequests[0].getFloor = () => floorInfo;
      floorInfo = {currency: 'USD', floor: 0.55};
      request = spec.buildRequests(bidRequests);
      expect(request[0].data).to.match(/"bidfloor":0.55/);
    });

    it('pass GDPR,CCPA,COPPA, and GPP indicators/consent strings with the request when present', function () {
      bidRequests[0].gdprConsent = {consentString: 'gdpr-consent-string', gdprApplies: true};
      bidRequests[0].uspConsent = 'ccpa-consent-string';
      config.setConfig({ coppa: false });

      bidRequests[0].ortb2 = {
        regs: {
          gpp: 'testGpp',
          gpp_sid: [1, 2, 3]
        }
      }

      request = spec.buildRequests(bidRequests);
      expect(request[0].data).to.match(/"user":{"ext":{"consent":"gdpr-consent-string"/);
      expect(request[0].data).to.match(/"regs":{"coppa":0,"ext":{"gdpr":1,"us_privacy":"ccpa-consent-string","gpp":"testGpp","gpp_sid":\[1,2,3\]}}/);
    });

    it('pass bidder timeout/tmax with the request', function () {
      config.setConfig({ bidderTimeout: 435 });
      request = spec.buildRequests(bidRequests);
      expect(request[0].data).to.match(/"tmax":435/);
    });

    it('pass 3rd party IDs with the request when present', function () {
      bidRequests[0].userIdAsEids = [
        {
          source: 'adserver.org',
          uids: [{id: 'TTD_ID_FROM_USER_ID_MODULE', atype: 1, ext: {rtiPartner: 'TDID'}}]
        }
      ];

      request = spec.buildRequests(bidRequests);
      expect(request[0].data).to.include(JSON.stringify({ext: {consent: 'gdpr-consent-string', eids: [{source: 'adserver.org', uids: [{id: 'TTD_ID_FROM_USER_ID_MODULE', atype: 1, ext: {rtiPartner: 'TDID'}}]}]}}));
    });
  });

  describe('interpretResponse', function () {
    it('should form compliant bid object response', function () {
      let res = {
        body: {
          id: 'bidID0001',
          seatbid: [{
            bid: [{
              id: 'VRTB_240d3c8a3c12b68_1',
              impid: '1',
              price: 0.7554,
              adm: 'TEST AD',
              nurl: 'https://adplatform.vrtcal.com/wintracker',
              w: 300,
              h: 250,
              crid: 'v2_1064_vrt_vrtcaltestdisplay2_300_250',
              adomain: ['vrtcal.com'],
            }],
            seat: '16'
          }],
          cur: 'USD'
        }
      }

      let ir = spec.interpretResponse(res, bidRequest)

      expect(ir.length).to.equal(1)

      let en = ir[0]

      expect(en.requestId != null &&
            en.cpm != null && typeof en.cpm === 'number' &&
            en.width != null && typeof en.width === 'number' &&
            en.height != null && typeof en.height === 'number' &&
            en.ad != null &&
            en.creativeId != null
      ).to.be.true
    })
  })

  describe('getUserSyncs', function() {
    const syncurl_iframe = 'https://usync.vrtcal.com/i?ssp=1804&synctype=iframe';
    const syncurl_redirect = 'https://usync.vrtcal.com/i?ssp=1804&synctype=redirect';

    it('base iframe sync pper config', function() {
      expect(spec.getUserSyncs({ iframeEnabled: true }, {}, undefined, undefined)).to.deep.equal([{
        type: 'iframe', url: syncurl_iframe + '&us_privacy=&gdpr=0&gdpr_consent=&gpp=&gpp_sid=&surl='
      }]);
    });

    it('base redirect sync per config', function() {
      expect(spec.getUserSyncs({ iframeEnabled: false }, {}, undefined, undefined)).to.deep.equal([{
        type: 'image', url: syncurl_redirect + '&us_privacy=&gdpr=0&gdpr_consent=&gpp=&gpp_sid=&surl='
      }]);
    });

    it('pass with ccpa data', function() {
      expect(spec.getUserSyncs({ iframeEnabled: true }, {}, undefined, 'ccpa_consent_string', undefined)).to.deep.equal([{
        type: 'iframe', url: syncurl_iframe + '&us_privacy=ccpa_consent_string&gdpr=0&gdpr_consent=&gpp=&gpp_sid=&surl='
      }]);
    });

    it('pass with gdpr data', function() {
      expect(spec.getUserSyncs({ iframeEnabled: true }, {}, {gdprApplies: 1, consentString: 'gdpr_consent_string'}, undefined, undefined)).to.deep.equal([{
        type: 'iframe', url: syncurl_iframe + '&us_privacy=&gdpr=1&gdpr_consent=gdpr_consent_string&gpp=&gpp_sid=&surl='
      }]);
    });

    it('pass with gpp data', function() {
      expect(spec.getUserSyncs({ iframeEnabled: true }, {}, undefined, undefined, {gppString: 'gpp_consent_string', applicableSections: [1, 5]})).to.deep.equal([{
        type: 'iframe', url: syncurl_iframe + '&us_privacy=&gdpr=0&gdpr_consent=&gpp=gpp_consent_string&gpp_sid=1,5&surl='
      }]);
    });
  })
})
