import { expect } from 'chai';
import { spec } from 'modules/stvBidAdapter';
import { newBidder } from 'src/adapters/bidderFactory';

const VADS_ENDPOINT_URL = 'https://ads.smartstream.tv/r/';

describe('stvAdapter', function () {
  const adapter = newBidder(spec);

  describe('isBidRequestValid', function () {
    let bid = {
      'bidder': 'stv',
      'params': {
        'placement': '6682',
        'pfilter': {
          'floorprice': 1000000
        },
        'bcat': 'IAB2,IAB4',
        'dvt': 'desktop'
      },
      'sizes': [
        [300, 250]
      ],
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
    let bidRequests = [{
      'bidder': 'stv',
      'params': {
        'source': 'vads',
        'placement': 'prer0-0%3D4137',
        'pfilter': {
          'min_duration': 1,
          'max_duration': 100,
          'min_bitrate': 32,
          'max_bitrate': 128,
        },
        'noskip': 1
      },
      'mediaTypes': {
        'video': {
          'playerSize': [640, 480],
          'context': 'instream'
        }
      },
      'bidId': '30b31c1838de1e',
      'bidderRequestId': '22edbae2733bf6',
      'auctionId': '1d1a030790a475'
    }];

    let bidderRequest = {
      refererInfo: {
        referer: 'some_referrer.net'
      }
    }

    const request = spec.buildRequests(bidRequests, bidderRequest);
    it('sends bid video request to our vads endpoint via GET', function () {
      expect(request[0].method).to.equal('GET');
      let data = request[0].data.replace(/rnd=\d+\&/g, '').replace(/ref=.*\&bid/g, 'bid');
      expect(data).to.equal('_f=vast2&alternative=prebid_js&_ps=prer0-0%3D4137&srw=640&srh=480&idt=100&bid_id=30b31c1838de1e&pfilter%5Bmin_duration%5D=1&pfilter%5Bmax_duration%5D=100&pfilter%5Bmin_bitrate%5D=32&pfilter%5Bmax_bitrate%5D=128&noskip=1');
    });
  });

  describe('interpretResponse', function () {
    let vadsServerVideoResponse = {
      'body': {
        'cpm': 5000000,
        'crid': 100500,
        'width': '300',
        'height': '250',
        'vastXml': '{"reason":7001,"status":"accepted"}',
        'requestId': '220ed41385952a',
        'currency': 'EUR',
        'ttl': 60,
        'netRevenue': true,
        'zone': '6682'
      }
    };

    let expectedResponse = [{
      requestId: '23beaa6af6cdde',
      cpm: 0.5,
      width: 0,
      height: 0,
      creativeId: 100500,
      dealId: '',
      currency: 'EUR',
      netRevenue: true,
      ttl: 300,
      vastXml: '{"reason":7001,"status":"accepted"}',
      mediaType: 'video'
    }];

    it('should get the correct vads video bid response by display ad', function () {
      let bidRequest = [{
        'method': 'GET',
        'url': VADS_ENDPOINT_URL,
        'mediaTypes': {
          'video': {
            'playerSize': [640, 480],
            'context': 'instream'
          }
        },
        'data': {
          'bid_id': '30b31c1838de1e'
        }
      }];
      let result = spec.interpretResponse(vadsServerVideoResponse, bidRequest[0]);
      expect(Object.keys(result[0])).to.have.members(Object.keys(expectedResponse[0]));
    });

    it('handles empty bid response', function () {
      let response = {
        body: {}
      };
      let result = spec.interpretResponse(response);
      expect(result.length).to.equal(0);
    });
  });
});
