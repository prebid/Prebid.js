import {expect} from 'chai';
import {spec} from 'modules/temedyaBidAdapter.js';
import * as utils from 'src/utils.js';

const ENDPOINT_URL = 'https://adm.vidyome.com/';

export const _getUrlVars = function(url) {
  var hash;
  var myJson = {};
  var hashes = url.slice(url.indexOf('?') + 1).split('&');
  for (var i = 0; i < hashes.length; i++) {
    hash = hashes[i].split('=');
    myJson[hash[0]] = hash[1];
  }
  return myJson;
}

describe('temedya adapter', function() {
  let bidRequests;
  let nativeBidRequests;

  beforeEach(function() {
    bidRequests = [
      {
        bidder: 'temedya',
        params: {
          widgetId: 753497,
          count: 1
        },
        mediaTypes: {
          banner: {
            sizes: [[300, 250]]
          }
        }
      }
    ]

    nativeBidRequests = [
      {
        bidder: 'temedya',
        params: {
          widgetId: 753497,
          count: 1
        },
        nativeParams: {
          title: {
            required: true
          },
          image: {
            required: true
          }
        }
      }
    ]
  })

  describe('isBidRequestValid', function () {
    it('valid bid case', function () {
      let validBid = {
        bidder: 'temedya',
        params: {
          widgetId: 753497,
          count: 1
        }
      }
      let isValid = spec.isBidRequestValid(validBid);
      expect(isValid).to.equal(true);
    });

    it('invalid bid case: widgetId and countId is not passed', function() {
      let validBid = {
        bidder: 'temedya',
        params: {
        }
      }
      let isValid = spec.isBidRequestValid(validBid);
      expect(isValid).to.equal(false);
    })
  })

  describe('buildRequests', function () {
    it('sends bid request to ENDPOINT via GET', function () {
      const request = spec.buildRequests(bidRequests)[0];
      expect(request.url).to.include(ENDPOINT_URL);
      expect(request.method).to.equal('GET');
    });

    it('buildRequests function should not modify original bidRequests object', function () {
      let originalBidRequests = utils.deepClone(bidRequests);
      let request = spec.buildRequests(bidRequests);
      expect(bidRequests).to.deep.equal(originalBidRequests);
    });

    it('buildRequests function should not modify original nativeBidRequests object', function () {
      let originalBidRequests = utils.deepClone(nativeBidRequests);
      let request = spec.buildRequests(nativeBidRequests);
      expect(nativeBidRequests).to.deep.equal(originalBidRequests);
    });

    it('Request params check', function() {
      let request = spec.buildRequests(bidRequests)[0];
      const data = _getUrlVars(request.url)
      data.type = 'native';
      data.wid = bidRequests[0].params.widgetId;
      data.count = bidRequests[0].params.count;
    })
  })

  describe('interpretResponse', function () {
    let response = {
      ads: [
        {
          'id': 30,
          'name': 'Pro Trader Desktop Ocak',
          'assets': {
            'sponsor': 'Yatırım Bülteni',
            'cpm': '0.30188070875464',
            'name': 'SLC2-DESKTOP',
            'files': [
              'https://dsp-vidyome.cdn.vidyome.com/dsp/assets/84066_SLC2_640X480_82KB.jpg'
            ],
            'id': 9,
            'title': '6 ayda zengin oldu! Günde 2 saat çalışarak bilgisayar başında zengin oldu.',
            'body': 'Sizde yapabilirsiniz!',
            'landing_url': 'https://bit.ly/3l6RhKG',
            'click_url': 'https://adclick.adm.vidyome.com/collect?campaignId=30&creativeId=9&widId=122129&v=1609960813742&uri=https%3A%2F%2Fbit.ly%2F3l6RhKG%3Futm_source%3DVidyome%26utm_medium%3Dnative%26utm_campaign%3D30%26utm_term%3D9%26utm_content%3D122129'
          },
          'conversion_urls': [

          ],
          'impression_urls': [

          ]
        }
      ],
      base: {
        'isSmartphone': false,
        'isTablet': false,
        'isDesktop': true,
        'isConnectedTv': false,
        'country': 'tr',
        'wid': 753497,
        'type': 'native',
        'locale': 'tr',
        'widget': {
          'click': 'https://stats.vidyome.com/s/widgets/collect?widgetId=122129&eventType=click',
          'impression': 'https://impression.adm.vidyome.com/collect/v1?widgetId=122129'
        }
      },
    };

    it('should get correct bid response', function () {
      let expectedResponse = [
        {
          'requestId': '1d236f7890b',
          'cpm': 0.0920,
          'width': 300,
          'height': 250,
          'netRevenue': false,
          'mediaType': 'native',
          'currency': 'TRY',
          'creativeId': '<!-- CREATIVE ID -->',
          'ttl': 700,
          'ad': '<!-- ADS TAG -->'
        }
      ];
      let request = spec.buildRequests(bidRequests)[0];
      let result = spec.interpretResponse({body: response}, request);
      expect(Object.keys(result[0])).to.have.members(Object.keys(expectedResponse[0]));
      expect(result[0].cpm).to.not.equal(null);
      expect(result[0].creativeId).to.not.equal(null);
      expect(result[0].ad).to.not.equal(null);
      expect(result[0].currency).to.equal('TRY');
      expect(result[0].netRevenue).to.equal(false);
    });
  })
})
