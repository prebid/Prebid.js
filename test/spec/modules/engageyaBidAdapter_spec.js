import {expect} from 'chai';
import {spec} from 'modules/engageyaBidAdapter.js';
import * as utils from 'src/utils.js';

const ENDPOINT_URL = 'https://recs.engageya.com/rec-api/getrecs.json';

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

describe('engageya adapter', function() {
  let bidRequests;
  let nativeBidRequests;

  beforeEach(function() {
    bidRequests = [
      {
        bidder: 'engageya',
        params: {
          widgetId: 85610,
          websiteId: 91140,
          pageUrl: '[PAGE_URL]'
        }
      }
    ]

    nativeBidRequests = [
      {
        bidder: 'engageya',
        params: {
          widgetId: 85610,
          websiteId: 91140,
          pageUrl: '[PAGE_URL]'
        },
        nativeParams: {
          title: {
            required: true,
            len: 80
          },
          image: {
            required: true,
            sizes: [150, 50]
          },
          sponsoredBy: {
            required: true
          }
        }
      }
    ]
  })
  describe('isBidRequestValid', function () {
    it('valid bid case', function () {
      let validBid = {
        bidder: 'engageya',
        params: {
          widgetId: 85610,
          websiteId: 91140,
          pageUrl: '[PAGE_URL]'
        }
      }
      let isValid = spec.isBidRequestValid(validBid);
      expect(isValid).to.equal(true);
    });

    it('invalid bid case: widgetId and websiteId is not passed', function() {
      let validBid = {
        bidder: 'engageya',
        params: {
        }
      }
      let isValid = spec.isBidRequestValid(validBid);
      expect(isValid).to.equal(false);
    })

    it('invalid bid case: widget id must be number', function() {
      let invalidBid = {
        bidder: 'engageya',
        params: {
          widgetId: '157746a',
          websiteId: 91140,
          pageUrl: '[PAGE_URL]'
        }
      }
      let isValid = spec.isBidRequestValid(invalidBid);
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
      expect(parseInt(data.wid)).to.exist.and.to.equal(bidRequests[0].params.widgetId);
      expect(parseInt(data.webid)).to.exist.and.to.equal(bidRequests[0].params.websiteId);
    })
  })

  describe('interpretResponse', function () {
    let response = {recs: [
      {
        'ecpm': 0.0920,
        'postId': '<!-- CREATIVE ID -->',
        'ad': '<!-- ADS TAG -->',
        'thumbnail_path': 'https://engageya.live/wp-content/uploads/2019/05/images.png'
      }
    ],
    imageWidth: 300,
    imageHeight: 250,
    ireqId: '1d236f7890b',
    pbtypeId: 2};

    it('should get correct bid response', function () {
      let expectedResponse = [
        {
          'requestId': '1d236f7890b',
          'cpm': 0.0920,
          'width': 300,
          'height': 250,
          'netRevenue': false,
          'currency': 'USD',
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
      expect(result[0].currency).to.equal('USD');
      expect(result[0].netRevenue).to.equal(false);
    });
  })
})
