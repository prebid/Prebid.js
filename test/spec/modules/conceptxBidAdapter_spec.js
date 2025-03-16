// import or require modules necessary for the test, e.g.:
import { expect } from 'chai'; // may prefer 'assert' in place of 'expect'
import { spec } from 'modules/conceptxBidAdapter.js';
import { newBidder } from 'src/adapters/bidderFactory.js';
// import { config } from 'src/config.js';

describe('conceptxBidAdapter', function () {
  const URL = 'https://conceptx.cncpt-central.com/openrtb';

  // before(() => {

  // });

  // after(() => {
  //   // $$PREBID_GLOBAL$$.bidderSettings = {};
  // });

  // afterEach(function () {
  //   config.resetConfig();
  // });

  const ENDPOINT_URL = `${URL}`;
  const ENDPOINT_URL_CONSENT = `${URL}?gdpr_applies=true&consentString=ihaveconsented`;
  const adapter = newBidder(spec);

  const bidderRequests = [
    {
      bidId: '123',
      bidder: 'conceptx',
      params: {
        site: 'example',
        adunit: 'some-id-3'
      },
      mediaTypes: {
        banner: {
          sizes: [[930, 180]],
        }
      },
    }
  ]

  const singleBidRequest = {
    bid: [
      {
        bidId: '123',
      }
    ]
  }

  const serverResponse = {
    body: {
      'bidResponses': [
        {
          'ads': [
            {
              'referrer': 'http://localhost/prebidpage_concept_bidder.html',
              'ttl': 360,
              'html': '<h1>DUMMY</h1>',
              'requestId': '214dfadd1f8826',
              'cpm': 46,
              'currency': 'DKK',
              'width': 930,
              'height': 180,
              'creativeId': 'FAKE-ID',
              'meta': {
                'mediaType': 'banner'
              },
              'netRevenue': true,
              'destinationUrls': {
                'destination': 'https://concept.dk'
              }
            }
          ],
          'matchedAdCount': 1,
          'targetId': '214dfadd1f8826'
        }
      ]
    }
  }

  describe('inherited functions', function () {
    it('exists and is a function', function () {
      expect(adapter.callBids).to.exist.and.to.be.a('function');
    });
  });

  describe('isBidRequestValid', function () {
    it('should return true when required params found', function () {
      expect(spec.isBidRequestValid(bidderRequests[0])).to.equal(true);
    });
  });

  describe('buildRequests', function () {
    it('Test requests', function () {
      const request = spec.buildRequests(bidderRequests, {});
      expect(request.length).to.equal(1);
      expect(request[0]).to.have.property('data');
      const bid = JSON.parse(request[0].data).adUnits[0]
      expect(bid.site).to.equal('example');
      expect(bid.adunit).to.equal('some-id-3');
      expect(JSON.stringify(bid.dimensions)).to.equal(JSON.stringify([
        [930, 180]]));
    });
  });

  describe('user privacy', function () {
    it('should NOT send GDPR Consent data if gdprApplies equals undefined', function () {
      let request = spec.buildRequests(bidderRequests, { gdprConsent: { gdprApplies: undefined, consentString: 'iDoNotConsent' } });
      expect(request.length).to.equal(1);
      expect(request[0]).to.have.property('url')
      expect(request[0].url).to.equal(ENDPOINT_URL);
    });
    it('should send GDPR Consent data if gdprApplies', function () {
      let request = spec.buildRequests(bidderRequests, { gdprConsent: { gdprApplies: true, consentString: 'ihaveconsented' } });
      expect(request.length).to.equal(1);
      expect(request[0]).to.have.property('url')
      expect(request[0].url).to.equal(ENDPOINT_URL_CONSENT);
    });
  });

  describe('interpretResponse', function () {
    it('should return valid response when passed valid server response', function () {
      const interpretedResponse = spec.interpretResponse(serverResponse, singleBidRequest);
      const ad = serverResponse.body.bidResponses[0].ads[0]
      expect(interpretedResponse).to.have.lengthOf(1);
      expect(interpretedResponse[0].cpm).to.equal(ad.cpm);
      expect(interpretedResponse[0].width).to.equal(Number(ad.width));
      expect(interpretedResponse[0].height).to.equal(Number(ad.height));
      expect(interpretedResponse[0].creativeId).to.equal(ad.creativeId);
      expect(interpretedResponse[0].currency).to.equal(ad.currency);
      expect(interpretedResponse[0].netRevenue).to.equal(true);
      expect(interpretedResponse[0].ad).to.equal(ad.html);
      expect(interpretedResponse[0].ttl).to.equal(360);
    });
  });
});
