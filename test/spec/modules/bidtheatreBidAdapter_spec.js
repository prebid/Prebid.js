import { expect } from 'chai';
import { spec, ENDPOINT_URL, BIDDER_CODE, DEFAULT_CURRENCY } from 'modules/bidtheatreBidAdapter.js';
import { BANNER, VIDEO } from 'src/mediaTypes.js';
import { deepClone } from 'src/utils.js';

const VALID_PUBLISHER_ID = '73b20b3a-12a0-4869-b54e-8d42b55786ee';
const STATIC_IMP_ID = '3263e5dec855c5';
const BID_PRICE = 5.112871170043945;
const AUCTION_PRICE_MACRO = '${AUCTION_PRICE}';

const BANNER_BID_REQUEST = [
  {
    'bidder': BIDDER_CODE,
    'params': {
      'publisherId': VALID_PUBLISHER_ID
    },
    'bidId': STATIC_IMP_ID,
    'mediaTypes': {
      'banner': {
        'sizes': [
          [
            980,
            240
          ]
        ]
      }
    },
    'sizes': [
      [
        980,
        240
      ]
    ]
  }
];

const BANNER_BIDDER_REQUEST = {'bidderCode': BIDDER_CODE, 'bids': BANNER_BID_REQUEST};

const BANNER_BID_RESPONSE = {
  'cur': 'USD',
  'seatbid': [
    {
      'seat': '5',
      'bid': [
        {
          'ext': {
            'usersync_urls': [
              'https://match.adsby.bidtheatre.com/usersync?gdpr=1&gdpr_consent=CONSENT_STRING'
            ]
          },
          'crid': '1915538',
          'h': 240,
          'adm': "<script type=\"text/javascript\">\n    var uri = 'https://adsby.bidtheatre.com/imp?z=27025&a=1915538&so=1&ex=36&eb=3672319&xs=940400838&wp=${AUCTION_PRICE}&su=127.0.0.1%3A8080&es=http%3A%2F%2F127.0.0.1%3A8080&tag=unspec_980_240&kuid=c7f97d10-52e6-4650-9922-731402ada179&dealId=&mp=&ma=eyJjZCI6ZmFsc2UsInN0IjoxLCJtbGF0Ijo1OS4yNywiYWRjIjotMSwibW9yZyI6InRlbGlhIG5ldHdvcmsgc2VydmljZXMiLCJtbHNjb3JlIjowLjM3MjM4NTU5MTI2ODUzOTQzLCJtemlwIjoiMTI4IDM1IiwiYmlwIjoiODEuMjI3LjgyLjI4IiwiYWdpZCI6MzU2MjcwMiwibWxtb2RlbCI6Im1hc3Rlcl9tbF9jbGtfNTM2IiwidWEiOiJNb3ppbGxhXC81LjAgKE1hY2ludG9zaDsgSW50ZWwgTWFjIE9TIFggMTBfMTVfNykgQXBwbGVXZWJLaXRcLzUzNy4zNiAoS0hUTUwsIGxpa2UgR2Vja28pIENocm9tZVwvMTMwLjAuMC4wIFNhZmFyaVwvNTM3LjM2IiwibWxvbiI6MTguMTMsIm1yZWdpb24iOiJhYiIsImR0IjoxLCJtY2l0eSI6InNrYXJwbmFjayIsInBhZ2V1cmwiOiJodHRwOlwvXC8xMjcuMC4wLjE6ODA4MFwvaHcuaHRtbD9wYmpzX2RlYnVnPXRydWUiLCJpbXBpZCI6IngzNl9hc3gtYi1zMV8zOTI1MjA4NjEwNzE0NjYzODk0IiwibWNvdW50cnkiOiJzd2UiLCJ0cyI6MTczMTUwMjUxNDE0Mn0%3D&usersync=1&cd=0&impId=x36_asx-b-s1_3925208610714663894&gdpr=0&gdpr_consent=&cb0=&rnd=' + new String (Math.random()).substring (2, 11);\n    document.write('<sc'+'ript type=\"text/javascript\" src=\"'+uri+'\" charset=\"ISO-8859-1\"></sc'+'ript>');\n</script>",
          'mtype': 1,
          'adid': '1915538',
          'adomain': [
            'bidtheatre.com'
          ],
          'price': BID_PRICE,
          'cat': [
            'IAB3-1'
          ],
          'w': 980,
          'id': STATIC_IMP_ID,
          'impid': STATIC_IMP_ID,
          'cid': 'c154375'
        }
      ]
    }
  ]
};

const VIDEO_BID_REQUEST = [
  {
    'bidder': BIDDER_CODE,
    'params': {
      'publisherId': VALID_PUBLISHER_ID
    },
    'bidId': STATIC_IMP_ID,
    'mediaTypes': {
      'video': {
        'playerSize': [
          [
            1280,
            720
          ]
        ],
        'context': 'instream'
      }
    },
    'sizes': [[1280, 720]]
  }
];

const VIDEO_BIDDER_REQUEST = {'bidderCode': BIDDER_CODE, 'bids': VIDEO_BID_REQUEST};

const VIDEO_BID_RESPONSE = {
  'cur': 'USD',
  'seatbid': [
    {
      'seat': '5',
      'bid': [
        {
          'ext': {
            'usersync_urls': [
              'https://match.adsby.bidtheatre.com/usersync?gdpr=0&gdpr_consent='
            ]
          },
          'crid': '1922926',
          'h': 720,
          'mtype': 2,
          'nurl': 'https://adsby.bidtheatre.com/video?z=27025;a=1922926;ex=36;es=http%3A%2F%2F127.0.0.1%3A8080;eb=3672319;xs=940400838;so=1;tag=unspec_1280_720;kuid=05914b22-88cb-4c5d-9f7c-f133fdf9669a;wp=${AUCTION_PRICE};su=127.0.0.1%3A8080;iab=vast2;dealId=;ma=eyJjZCI6ZmFsc2UsInN0IjozLCJtbGF0Ijo1OS4yNywibW9yZyI6InRlbGlhIG5ldHdvcmsgc2VydmljZXMiLCJtbHNjb3JlIjowLjg2MDcwMDU0NzY5NTE1OTksIm16aXAiOiIxMjggMzUiLCJiaXAiOiI4MS4yMjcuODIuMjgiLCJhZ2lkIjozNTYyNzAyLCJtbG1vZGVsIjoibWFzdGVyX21sX2Nsa181MzYiLCJ1YSI6Ik1vemlsbGFcLzUuMCAoTWFjaW50b3NoOyBJbnRlbCBNYWMgT1MgWCAxMF8xNV83KSBBcHBsZVdlYktpdFwvNTM3LjM2IChLSFRNTCwgbGlrZSBHZWNrbykgQ2hyb21lXC8xMzAuMC4wLjAgU2FmYXJpXC81MzcuMzYiLCJtbG9uIjoxOC4xMywibXJlZ2lvbiI6ImFiIiwiZHQiOjEsIm1jaXR5Ijoic2thcnBuYWNrIiwicGFnZXVybCI6Imh0dHA6XC9cLzEyNy4wLjAuMTo4MDgwXC92aWRlby5odG1sP3BianNfZGVidWc9dHJ1ZSIsImltcGlkIjoieDM2X2FzeC1iLXMyXzQxNDMzMTA0MTIyMzUyNTU3NDgiLCJtY291bnRyeSI6InN3ZSIsInRzIjoxNzMxNTA3NTY5Njg3fQ%3D%3D;cd=0;cb0=;impId=x36_asx-b-s2_4143310412235255748;gdpr=1;gdpr_consent=CP-S4UAP-S4UACGABBENAzEsAP_gAEPgAAAAKKtV_H__bW1r8X73aft0eY1P9_j77sQxBhfJE-4FzLvW_JwXx2ExNA36tqIKmRIEu3bBIQNlHJDUTVCgaogVryDMakWcoTNKJ6BkiFMRO2dYCF5vmwtj-QKY5vr993dx2D-t_dv83dzyz4VHn3a5_2e0WJCdA58tDfv9bROb-9IPd_58v4v0_F_rE2_eT1l_tevp7D9-ct87_XW-9_fff79Ll9-goqAWYaFRAHWBISEGgYRQIAVBWEBFAgAAABIGiAgBMGBTsDAJdYSIAQAoABggBAACjIAEAAAEACEQAQAFAgAAgECgABAAgEAgAIGAAEAFgIBAACA6BCmBBAoFgAkZkRCmBCFAkEBLZUIJAECCuEIRZ4AEAiJgoAAAAACsAAQFgsDiSQEqEggS4g2gAAIAEAghAqEEnJgACBI2WoPBE2jK0gDQ04SAAAAA.YAAAAAAAAAAA',
          'adid': '1922926',
          'adomain': [
            'bidtheatre.com'
          ],
          'price': BID_PRICE,
          'cat': [
            'IAB3-1'
          ],
          'w': 1280,
          'id': STATIC_IMP_ID,
          'impid': STATIC_IMP_ID,
          'cid': 'c154375'
        }
      ]
    }
  ]
}

describe('BidtheatreAdapter', function () {
  describe('isBidRequestValid', function () {
    let bid = {
      'bidder': BIDDER_CODE,
      'params': {
        'publisherId': VALID_PUBLISHER_ID
      },
      'sizes': [[980, 240]]
    };

    it('should return true when required param found and of correct type', function () {
      expect(spec.isBidRequestValid(bid)).to.equal(true);
    });

    it('should return false when required param is not passed', function () {
      let invalidBid = Object.assign({}, bid);
      delete invalidBid.params;
      invalidBid.params = {

      };
      expect(spec.isBidRequestValid(invalidBid)).to.equal(false);
    });

    it('should return false when required param of incorrect data type', function () {
      let invalidBid = Object.assign({}, bid);
      delete invalidBid.params;
      invalidBid.params = {
        'publisherId': 12345
      };
      expect(spec.isBidRequestValid(invalidBid)).to.equal(false);
    });

    it('should return false when required param of incorrect length', function () {
      let invalidBid = Object.assign({}, bid);
      delete invalidBid.params;
      invalidBid.params = {
        'publisherId': '73b20b3a-12a0-4869-b54e-8d42b55786e'
      };
      expect(spec.isBidRequestValid(invalidBid)).to.equal(false);
    });
  });

  describe('buildRequests', function () {
    it('should include correct http method, correct url and existing data', function () {
      const request = spec.buildRequests(BANNER_BID_REQUEST, BANNER_BIDDER_REQUEST);
      expect(request[0].method).to.equal('POST');
      expect(request[0].url).to.equal(ENDPOINT_URL);
      expect(request[0].data).to.exist;
    });

    it('should include required bid param in request', function () {
      const request = spec.buildRequests(BANNER_BID_REQUEST, BANNER_BIDDER_REQUEST);
      const data = request[0].data;
      expect(data.imp[0].ext.bidder.publisherId).to.equal(VALID_PUBLISHER_ID);
    });

    it('should include imp array in request', function () {
      const request = spec.buildRequests(BANNER_BID_REQUEST, BANNER_BIDDER_REQUEST);
      const data = request[0].data;
      expect(data).to.have.property('imp').that.is.an('array').with.lengthOf.at.least(1);
      expect(data.imp[0]).to.be.an('object');
    });
  });

  describe('interpretResponse', function () {
    it('should have exactly one bid in banner response', function () {
      const request = spec.buildRequests(BANNER_BID_REQUEST, BANNER_BIDDER_REQUEST);
      const bids = spec.interpretResponse({body: BANNER_BID_RESPONSE}, request[0]);
      expect(bids).to.be.an('array').with.lengthOf(1);
      expect(bids[0]).to.be.an('object');
    });

    it('should have currency set to USD in banner response', function () {
      const request = spec.buildRequests(BANNER_BID_REQUEST, BANNER_BIDDER_REQUEST);
      const bids = spec.interpretResponse({body: BANNER_BID_RESPONSE}, request[0]);
      expect(bids[0].currency).to.be.a('string').and.to.equal(DEFAULT_CURRENCY);
    });

    it('should have ad in response and auction price macros replaced in banner response', function () {
      const request = spec.buildRequests(BANNER_BID_REQUEST, BANNER_BIDDER_REQUEST);
      const bids = spec.interpretResponse({body: BANNER_BID_RESPONSE}, request[0]);
      const ad = bids[0].ad;
      expect(ad).to.exist;
      expect(ad).to.be.a('string');
      expect(ad).to.include('&wp=' + BID_PRICE + '&');
      expect(ad).to.not.include(AUCTION_PRICE_MACRO);
    });

    if (FEATURES.VIDEO) {
      it('should have exactly one bid in video response', function () {
        const request = spec.buildRequests(VIDEO_BID_REQUEST, VIDEO_BIDDER_REQUEST);
        const bids = spec.interpretResponse({body: VIDEO_BID_RESPONSE}, request[0]);
        expect(bids).to.be.an('array').with.lengthOf(1);
        expect(bids[0]).to.be.an('object');
      });

      it('should have currency set to USD in video response', function () {
        const request = spec.buildRequests(VIDEO_BID_REQUEST, VIDEO_BIDDER_REQUEST);
        const bids = spec.interpretResponse({body: VIDEO_BID_RESPONSE}, request[0]);
        expect(bids[0].currency).to.be.a('string').and.to.equal(DEFAULT_CURRENCY);
      });

      it('should have vastUrl in response and auction price macros replaced in video response', function () {
        const request = spec.buildRequests(VIDEO_BID_REQUEST, VIDEO_BIDDER_REQUEST);
        const bids = spec.interpretResponse({body: VIDEO_BID_RESPONSE}, request[0]);
        const vastUrl = bids[0].vastUrl;
        expect(vastUrl).to.exist;
        expect(vastUrl).to.be.a('string');
        expect(vastUrl).to.include(';wp=' + BID_PRICE + ';');
        expect(vastUrl).to.not.include(AUCTION_PRICE_MACRO);
      });
    }
  });

  describe('getUserSyncs', function () {
    const bidResponse = deepClone(BANNER_BID_RESPONSE);
    const bidResponseSyncURL = bidResponse.seatbid[0].bid[0].ext.usersync_urls[0];

    const gdprConsent = {
      gdprApplies: true,
      consentString: 'CONSENT_STRING'
    };

    it('should return empty when pixel is disallowed', function () {
      expect(spec.getUserSyncs({ pixelEnabled: false }, bidResponse, gdprConsent)).to.be.empty;
    });

    it('should return empty when no server response is present', function () {
      expect(spec.getUserSyncs({ pixelEnabled: true }, [], gdprConsent)).to.be.empty;
    });

    it('should return usersync url when pixel is allowed and present in bid response', function () {
      expect(spec.getUserSyncs({ pixelEnabled: true }, [{body: bidResponse}], gdprConsent)).to.deep.equal([{ type: 'image', url: bidResponseSyncURL }]);
    });
  });
});
