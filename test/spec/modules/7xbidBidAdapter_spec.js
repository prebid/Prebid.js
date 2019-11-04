import {expect} from 'chai';
import {spec, _getUrlVars} from 'modules/7xbidBidAdapter';
import * as utils from 'src/utils';
import {config} from 'src/config';

const BASE_URI = '//bidder.7xbid.com/api/v1/prebid/banner'
const NATIVE_BASE_URI = '//bidder.7xbid.com/api/v1/prebid/native'

describe('7xbid adapter', function() {
  let bidRequests;
  let nativeBidRequests;

  beforeEach(function() {
    bidRequests = [
      {
        bidder: '7xbid',
        params: {
          placementId: 1425292,
          currency: 'USD'
        }
      }
    ]

    nativeBidRequests = [
      {
        bidder: '7xbid',
        params: {
          placementId: 1429695,
          currency: 'USD'
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
        bidder: '7xbid',
        params: {
          placementId: 1425292,
          currency: 'USD'
        }
      }
      let isValid = spec.isBidRequestValid(validBid);
      expect(isValid).to.equal(true);
    });

    it('invalid bid case: placementId is not passed', function() {
      let validBid = {
        bidder: '7xbid',
        params: {
        }
      }
      let isValid = spec.isBidRequestValid(validBid);
      expect(isValid).to.equal(false);
    })

    it('invalid bid case: currency is not support', function() {
      let validBid = {
        bidder: '7xbid',
        params: {
          placementId: 1108295,
          currency: 'AUD'
        }
      }
      let isValid = spec.isBidRequestValid(validBid);
      expect(isValid).to.equal(false);
    })
  })

  describe('buildRequests', function () {
    it('sends bid request to ENDPOINT via GET', function () {
      const request = spec.buildRequests(bidRequests)[0];
      expect(request.url).to.equal(BASE_URI);
      expect(request.method).to.equal('GET');
    });

    it('sends native bid request to ENDPOINT via GET', function () {
      const request = spec.buildRequests(nativeBidRequests)[0];
      expect(request.url).to.equal(NATIVE_BASE_URI);
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
      const data = _getUrlVars(request.data)
      expect(parseInt(data.placementid)).to.exist.and.to.equal(bidRequests[0].params.placementId);
      expect(data.cur).to.exist.and.to.equal(bidRequests[0].params.currency);
    })

    it('Native request params check', function() {
      let request = spec.buildRequests(nativeBidRequests)[0];
      const data = _getUrlVars(request.data)
      expect(parseInt(data.placementid)).to.exist.and.to.equal(nativeBidRequests[0].params.placementId);
      expect(data.cur).to.exist.and.to.equal(nativeBidRequests[0].params.currency);
    })
  })

  describe('interpretResponse', function () {
    let response = {
      1425292:
      {
        'creativeId': '<!-- CREATIVE ID -->',
        'cur': 'USD',
        'price': 0.0920,
        'width': 300,
        'height': 250,
        'requestid': '2e42361a6172bf',
        'adm': '<!-- ADS TAG -->'
      }
    }

    it('should get correct bid response', function () {
      let expectedResponse = [
        {
          'requestId': '2e42361a6172bf',
          'cpm': 0.0920,
          'width': 300,
          'height': 250,
          'netRevenue': true,
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
      expect(result[0].netRevenue).to.equal(true);
    });
  })
})
