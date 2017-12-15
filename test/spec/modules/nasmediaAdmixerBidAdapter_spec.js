import {expect} from 'chai';
import {spec} from 'modules/nasmediaAdmixerBidAdapter';
import {newBidder} from 'src/adapters/bidderFactory';

describe('nasmediaAdmixerBidAdapter', () => {
  const adapter = newBidder(spec);

  describe('inherited functions', () => {
    it('exists and is a function', () => {
      expect(adapter.callBids).to.exist.and.to.be.a('function');
    });
  });

  describe('isBidRequestValid', () => {
    const bid = {
      'bidder': 'nasmediaAdmixer',
      'params': {
        'ax_key': 'ax_key'
      },
      'adUnitCode': 'adunit-code',
      'sizes': [[300, 250]],
      'bidId': '3361d01e67dbd6',
      'bidderRequestId': '2b60dcd392628a',
      'auctionId': '124cb070528662',
    };

    it('should return true when required params found', () => {
      expect(spec.isBidRequestValid(bid)).to.equal(true);
    });

    it('should return false when required params are not passed', () => {
      const bid = Object.assign({}, bid);
      delete bid.params;
      bid.params = {
        'ax_key': 0
      };
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });
  });

  describe('buildRequests', () => {
    const bidRequests = [
      {
        'bidder': 'nasmediaAdmixer',
        'params': {
          'ax_key': 'ajj7jba3'
        },
        'adUnitCode': 'adunit-code',
        'sizes': [[300, 250]],
        'bidId': '3361d01e67dbd6',
        'bidderRequestId': '2b60dcd392628a',
        'auctionId': '124cb070528662',
      }
    ];

    it('sends bid request to url via GET', () => {
      const request = spec.buildRequests(bidRequests)[0];
      expect(request.method).to.equal('GET');
      expect(request.url).to.match(new RegExp(`https://adn.admixer.co.kr`));
    });
  });

  describe('interpretResponse', () => {
    const response = {
      'body': {
        'bidder': 'nasmedia_admixer',
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
        'ax_key': 'ajj7jba3',
      },
      'adUnitCode': 'adunit-code',
      'sizes': [[300, 250], [320, 480]],
      'bidId': '31300c8b9697cd',
      'bidderRequestId': '2bf570adcf83fa',
      'auctionId': '169827a33f03cc',
    };

    it('should get correct bid response', () => {
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

    it('handles nobid responses', () => {
      response.body = {
        'bidder': 'nasmedia_admixer',
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
