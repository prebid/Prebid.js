import { expect } from 'chai';
import { spec } from '../../../modules/chtnwBidAdapter.js';
import * as utils from '../../../src/utils.js';

describe('ChtnwAdapter', function () {
  describe('isBidRequestValid', function () {
    const bid = {
      code: 'adunit-code',
      bidder: 'chtnw',
      params: {
        placementId: '38EL412LO82XR9O6'
      },
      sizes: [
        [300, 250]
      ],
    };

    it('should return true when required params found', function () {
      const bidRequest = utils.deepClone(bid);
      expect(spec.isBidRequestValid(bidRequest)).to.equal(true);
    });

    it('should return false when required params are missing', function () {
      const bidRequest = utils.deepClone(bid);
      delete bidRequest.params;
      expect(spec.isBidRequestValid(bidRequest)).to.equal(false);
    });
  });

  describe('buildRequests', function () {
    let bidRequests = [{
      code: 'adunit-code',
      bidder: 'chtnw',
      params: {
        placementId: '38EL412LO82XR9O6'
      },
      sizes: [
        [300, 250]
      ],
    }];

    let request;
    before(() => {
      request = spec.buildRequests(bidRequests);
    })

    it('Returns POST method', function () {
      expect(request.method).to.equal('POST');
    });

    it('Returns general data valid', function () {
      let data = request.data;
      expect(data).to.be.an('object');
      expect(data).to.have.property('bids');
      expect(data).to.have.property('uuid');
      expect(data).to.have.property('device');
      expect(data).to.have.property('site');
    });
  });

  describe('interpretResponse', function () {
    let responseBody = [{
      'requestId': 'test',
      'cpm': 0.5,
      'currency': 'USD',
      'width': 300,
      'height': 250,
      'netRevenue': true,
      'ttl': 60,
      'creativeId': 'AD',
      'ad': '<h1>AD<h1>',
      'mediaType': 'banner',
      'meta': {
        'advertiserDomains': [
          'www.example.com'
        ]
      }
    }];

    it('handles empty bid response', function () {
      let response = {
        body: responseBody
      };
      let result = spec.interpretResponse(response);
      expect(result.length).to.not.equal(0);
      expect(result[0].meta.advertiserDomains).to.be.an('array');
    });

    it('handles empty bid response', function () {
      let response = {
        body: []
      };
      let result = spec.interpretResponse(response);
      expect(result.length).to.equal(0);
    });
  });

  describe('getUserSyncs', function () {
    it('should register type is image', function () {
      const syncOptions = {
        'pixelEnabled': 'true'
      }
      let userSync = spec.getUserSyncs(syncOptions);
      expect(userSync[0].type).to.equal('image');
      expect(userSync[0].url).to.have.string('ssp');
    });
  });
});
