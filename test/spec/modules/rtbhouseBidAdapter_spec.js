import { expect } from 'chai';
import { spec } from 'modules/rtbhouseBidAdapter';
import { newBidder } from 'src/adapters/bidderFactory';

describe('RTBHouseAdapter', () => {
  const adapter = newBidder(spec);

  describe('inherited functions', function () {
    it('exists and is a function', function () {
      expect(adapter.callBids).to.exist.and.to.be.a('function');
    });
  });

  describe('isBidRequestValid', function () {
    let bid = {
      'bidder': 'rtbhouse',
      'params': {
        'publisherId': 'PREBID_TEST',
        'region': 'prebid-eu'
      },
      'adUnitCode': 'adunit-code',
      'sizes': [[300, 250], [300, 600]],
      'bidId': '30b31c1838de1e',
      'bidderRequestId': '22edbae2733bf6',
      'auctionId': '1d1a030790a475'
    };

    it('should return true when required params found', function () {
      expect(spec.isBidRequestValid(bid)).to.equal(true);
    });

    it('should return false when required params are not passed', function () {
      let bid = Object.assign({}, bid);
      delete bid.params;
      bid.params = {
        'someIncorrectParam': 0
      };
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });
  });

  describe('buildRequests', function () {
    let bidRequests = [
      {
        'bidder': 'rtbhouse',
        'params': {
          'publisherId': 'PREBID_TEST',
          'region': 'prebid-eu',
          'test': 1
        },
        'adUnitCode': 'adunit-code',
        'sizes': [[300, 250], [300, 600]],
        'bidId': '30b31c1838de1e',
        'bidderRequestId': '22edbae2733bf6',
        'auctionId': '1d1a030790a475'
      }
    ];

    it('should build test param into the request', () => {
      let builtTestRequest = spec.buildRequests(bidRequests).data;
      expect(JSON.parse(builtTestRequest).test).to.equal(1);
    });

    it('should build valid OpenRTB banner object', () => {
      const request = JSON.parse(spec.buildRequests((bidRequests)).data);
      const imp = request.imp[0];
      expect(imp.banner).to.deep.equal({
        w: 300,
        h: 250,
        format: [{
          w: 300,
          h: 250
        }, {
          w: 300,
          h: 600
        }]
      })
    });

    it('sends bid request to ENDPOINT via POST', function () {
      let bidRequest = Object.assign([], bidRequests);
      delete bidRequest[0].params.test;
      const request = spec.buildRequests(bidRequest);
      expect(request.url).to.equal('https://prebid-eu.creativecdn.com/bidder/prebid/bids');
      expect(request.method).to.equal('POST');
    });

    it('should not populate GDPR if for non-EEA users', function () {
      let bidRequest = Object.assign([], bidRequests);
      delete bidRequest[0].params.test;
      const request = spec.buildRequests(bidRequest);
      let data = JSON.parse(request.data);
      expect(data).to.not.have.property('regs');
      expect(data).to.not.have.property('user');
    });

    it('should populate GDPR and consent string if available for EEA users', function () {
      let bidRequest = Object.assign([], bidRequests);
      delete bidRequest[0].params.test;
      const request = spec.buildRequests(bidRequest, {
        gdprConsent: {
          gdprApplies: true,
          consentString: 'BOJ8RZsOJ8RZsABAB8AAAAAZ+A=='
        }
      });
      let data = JSON.parse(request.data);
      expect(data.regs.ext.gdpr).to.equal(1);
      expect(data.user.ext.consent).to.equal('BOJ8RZsOJ8RZsABAB8AAAAAZ-A');
    });

    it('should populate GDPR and empty consent string if available for EEA users without consent string but with consent', function () {
      let bidRequest = Object.assign([], bidRequests);
      delete bidRequest[0].params.test;
      const request = spec.buildRequests(bidRequest, {gdprConsent: {gdprApplies: true}});
      let data = JSON.parse(request.data);
      expect(data.regs.ext.gdpr).to.equal(1);
      expect(data.user.ext.consent).to.equal('');
    });
  });

  describe('interpretResponse', function () {
    let response = [{
      'id': 'bidder_imp_identifier',
      'impid': '552b8922e28f27',
      'price': 0.5,
      'adid': 'Ad_Identifier',
      'adm': '<!-- test creative -->',
      'adomain': ['rtbhouse.com'],
      'cid': 'Ad_Identifier',
      'w': 300,
      'h': 250
    }];

    it('should get correct bid response', function () {
      let expectedResponse = [
        {
          'requestId': '552b8922e28f27',
          'cpm': 0.5,
          'creativeId': 29681110,
          'width': 300,
          'height': 250,
          'ad': '<!-- test creative -->',
          'mediaType': 'banner',
          'currency': 'USD',
          'ttl': 300,
          'netRevenue': true
        }
      ];
      let bidderRequest;
      let result = spec.interpretResponse({body: response}, {bidderRequest});
      expect(Object.keys(result[0])).to.have.members(Object.keys(expectedResponse[0]));
    });

    it('handles nobid responses', function () {
      let response = '';
      let bidderRequest;
      let result = spec.interpretResponse({body: response}, {bidderRequest});
      expect(result.length).to.equal(0);
    });
  });
});
