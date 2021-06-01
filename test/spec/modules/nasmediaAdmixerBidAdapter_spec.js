import {expect} from 'chai';
import {spec} from 'modules/nasmediaAdmixerBidAdapter.js';
import {newBidder} from 'src/adapters/bidderFactory.js';

describe('nasmediaAdmixerBidAdapter', function () {
  const adapter = newBidder(spec);

  describe('inherited functions', function () {
    it('exists and is a function', function () {
      expect(adapter.callBids).to.exist.and.to.be.a('function');
    });
  });

  describe('isBidRequestValid', function () {
    const bid = {
      'bidder': 'nasmediaAdmixer',
      'params': {
        'media_key': 'media_key',
        'adunit_id': 'adunit_id',
      },
      'adUnitCode': 'adunit-code',
      'sizes': [[300, 250]],
      'bidId': '3361d01e67dbd6',
      'bidderRequestId': '2b60dcd392628a',
      'auctionId': '124cb070528662',
    };

    it('should return true when required params found', function () {
      expect(spec.isBidRequestValid(bid)).to.equal(true);
    });

    it('should return false when required params are not passed', function () {
      const bid = Object.assign({}, bid);
      delete bid.params;
      bid.params = {
        'media_key': '',
        'adunit_id': '',
      };
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });
  });

  describe('buildRequests', function () {
    const bidRequests = [
      {
        'bidder': 'nasmediaAdmixer',
        'params': {
          'media_key': '19038695',
          'adunit_id': '24190632',
        },
        'adUnitCode': 'adunit-code',
        'sizes': [[300, 250]],
        'bidId': '3361d01e67dbd6',
        'bidderRequestId': '2b60dcd392628a',
        'auctionId': '124cb070528662',
      }
    ];
    const bidderRequest = {refererInfo: {referer: 'https://example.com'}};

    it('sends bid request to url via GET', function () {
      const request = spec.buildRequests(bidRequests, bidderRequest)[0];
      expect(request.method).to.equal('GET');
      expect(request.url).to.match(new RegExp(`https://adn.admixer.co.kr`));
    });
  });

  describe('interpretResponse', function () {
    const response = {
      'body': {
        'bidder': 'nasmediaAdmixer',
        'req_id': '861a8e7952c82c',
        'error_code': 0,
        'error_msg': 'OK',
        'body': [{
          'ad_id': '20049',
          'width': 300,
          'height': 250,
          'currency': 'USD',
          'cpm': 1.769221,
          'ad': '<!-- Creative -->'
        }]
      },
      'headers': {
        'get': function () {
        }
      }
    };

    const bidRequest = {
      'bidder': 'nasmediaAdmixer',
      'params': {
        'media_key': '19038695',
        'adunit_id': '24190632',
      },
      'adUnitCode': 'adunit-code',
      'sizes': [[300, 250], [320, 480]],
      'bidId': '31300c8b9697cd',
      'bidderRequestId': '2bf570adcf83fa',
      'auctionId': '169827a33f03cc',
    };

    it('should get correct bid response', function () {
      const expectedResponse = [
        {
          'requestId': '861a8e7952c82c',
          'cpm': 1.769221,
          'currency': 'USD',
          'width': 300,
          'height': 250,
          'ad': '<!-- Creative -->',
          'creativeId': '20049',
          'ttl': 360,
          'netRevenue': false
        }
      ];

      const result = spec.interpretResponse(response, bidRequest);
      expect(result).to.have.lengthOf(1);
      let resultKeys = Object.keys(result[0]);
      expect(resultKeys.sort()).to.deep.equal(Object.keys(expectedResponse[0]).sort());
      resultKeys.forEach(function (k) {
        if (k === 'ad') {
          expect(result[0][k]).to.match(/<!-- Creative -->$/);
        } else {
          expect(result[0][k]).to.equal(expectedResponse[0][k]);
        }
      });
    });

    it('handles nobid responses', function () {
      response.body = {
        'bidder': 'nasmediaAdmixer',
        'req_id': '861a8e7952c82c',
        'error_code': 0,
        'error_msg': 'OK',
        'body': []
      };

      const result = spec.interpretResponse(response, bidRequest);
      expect(result).to.have.lengthOf(0);
    });
  });
});
