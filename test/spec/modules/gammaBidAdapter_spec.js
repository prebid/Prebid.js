import * as utils from 'src/utils';
import { expect } from 'chai';
import { spec } from 'modules/gammaBidAdapter';
import { newBidder } from 'src/adapters/bidderFactory';

describe('gammaBidAdapter', function() {
  const adapter = newBidder(spec);

  describe('isBidRequestValid', () => {
    let bid = {
      'bidder': 'gamma',
      'params': {
        siteId: '1465446377',
        zoneId: '1515999290',
        gaxDomain: 'hb.gammaplatform.com'
      },
      'adUnitCode': 'adunit-code',
      'sizes': [
        [300, 250]
      ],
      'bidId': '23beaa6af6cdde',
      'bidderRequestId': '19c0c1efdf37e7',
      'auctionId': '61466567-d482-4a16-96f0-fe5f25ffbdf1',
    };

    it('should return true when required params found', () => {
      expect(spec.isBidRequestValid(bid)).to.equal(true);
    });

    it('should return false when require params are not passed', () => {
      let bid = Object.assign({}, bid);
      bid.params = {};
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });

    it('should return false when siteId not passed correctly', () => {
      bid.params.siteId = '';
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });

    it('should return false when zoneId not passed correctly', () => {
      bid.params.zoneId = '';
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });

    it('should return false when gaxDomain not passed correctly', () => {
      bid.params.gaxDomain = '';
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });
  });

  describe('buildRequests', () => {
    let bidRequests = [
      {
        'bidder': 'gamma',
        'params': {
          siteId: '1465446377',
          zoneId: '1515999290',
          gaxDomain: 'hb.gammaplatform.com'
        },
        'adUnitCode': 'adunit-code',
        'sizes': [
          [300, 250]
        ],
        'bidId': '23beaa6af6cdde',
        'bidderRequestId': '19c0c1efdf37e7',
        'auctionId': '61466567-d482-4a16-96f0-fe5f25ffbdf1',
      }
    ];

    const request = spec.buildRequests(bidRequests);

    it('sends bid request to our endpoint via GET', () => {
      const request = spec.buildRequests(bidRequests)[0];
      expect(request.method).to.equal('GET');
      expect(request.url).to.match(new RegExp(`//${bidRequests[0].params.gaxDomain}/adx/request`));
    });

    it('attaches source to endpoint URL as query params', () => {
      const request = spec.buildRequests(bidRequests)[0];
      expect(request.url).to.include('wid=' + bidRequests[0].params.siteId + '&zid=' + bidRequests[0].params.zoneId + '&hb=pbjs&bidid=' + bidRequests[0].bidId + '&urf=' + utils.getTopWindowUrl());
    });
  });

  describe('interpretResponse', () => {
    let serverResponse = {
      body: {
        'id': '23beaa6af6cdde',
        'seatbid': [{
          'bid': [{
            'id': 'a_403370_332fdb9b064040ddbec05891bd13ab28',
            'impid': '263c448586f5a1',
            'price': 0.45,
            'adm': '<!-- Creative -->',
            'h': 90,
            'w': 728
          }]
        }]
      }
    };

    it('should get the correct bid response', () => {
      let expectedResponse = [{
        'requestId': '23beaa6af6cdde',
        'cpm': 0.45,
        'width': 300,
        'height': 250,
        'creativeId': '1515999070',
        'dealId': 'gax-paj2qarjf2g',
        'currency': 'USD',
        'netRevenue': true,
        'ttl': 300,
        'ad': '<!-- adtag -->'
      }];
      let result = spec.interpretResponse(serverResponse);
      expect(Object.keys(result)).to.deep.equal(Object.keys(expectedResponse));
    });

    it('handles empty bid response', () => {
      let response = {
        body: {}
      };
      let result = spec.interpretResponse(response);
      expect(result.length).to.equal(0);
    });
  });
});
