import { expect } from 'chai';
import { spec } from 'modules/radsBidAdapter';
import { newBidder } from 'src/adapters/bidderFactory';

const RADS_ENDPOINT_URL = 'https://rads.recognified.net/md.request.php';

describe('radsAdapter', function () {
  const adapter = newBidder(spec);

  describe('isBidRequestValid', function () {
    let bid = {
      'bidder': 'rads',
      'params': {
        'placement': '6682',
        'pfilter': {
          'floorprice': 1000000
        },
        'bcat': 'IAB2,IAB4',
        'dvt': 'desktop',
        'ip': '1.1.1.1'
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
      'bidder': 'rads',
      'params': {
        'placement': '6682',
        'pfilter': {
          'floorprice': 1000000,
          'geo': {
            'country': 'DE'
          }
        },
        'bcat': 'IAB2,IAB4',
        'dvt': 'desktop',
        'ip': '1.1.1.1'
      },
      'sizes': [
        [300, 250]
      ],
      'bidId': '30b31c1838de1e',
      'bidderRequestId': '22edbae2733bf6',
      'auctionId': '1d1a030790a475'
    }, {
      'bidder': 'rads',
      'params': {
        'placement': '6682',
        'pfilter': {
          'floorprice': 1000000,
          'geo': {
            'country': 'DE',
            'region': 'DE-BE'
          },
        },
        'bcat': 'IAB2,IAB4',
        'dvt': 'desktop'
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
    it('sends bid request to our endpoint via GET', function () {
      expect(request[0].method).to.equal('GET');
      let data = request[0].data.replace(/rnd=\d+\&/g, '').replace(/ref=.*\&bid/g, 'bid');
      expect(data).to.equal('rt=bid-response&_f=prebid_js&_ps=6682&srw=300&srh=250&idt=100&p=some_referrer.net&bid_id=30b31c1838de1e&pfilter%5Bfloorprice%5D=1000000&pfilter%5Bgeo%5D%5Bcountry%5D=DE&bcat=IAB2%2CIAB4&dvt=desktop&i=1.1.1.1');
    });

    it('sends bid video request to our rads endpoint via GET', function () {
      expect(request[1].method).to.equal('GET');
      let data = request[1].data.replace(/rnd=\d+\&/g, '').replace(/ref=.*\&bid/g, 'bid');
      expect(data).to.equal('rt=vast2&_f=prebid_js&_ps=6682&srw=640&srh=480&idt=100&p=some_referrer.net&bid_id=30b31c1838de1e&pfilter%5Bfloorprice%5D=1000000&pfilter%5Bgeo%5D%5Bcountry%5D=DE&pfilter%5Bgeo%5D%5Bregion%5D=DE-BE&bcat=IAB2%2CIAB4&dvt=desktop');
    });
  });

  describe('interpretResponse', function () {
    let serverBannerResponse = {
      'body': {
        'cpm': 5000000,
        'crid': 100500,
        'width': '300',
        'height': '250',
        'adTag': '<!-- test creative -->',
        'requestId': '220ed41385952a',
        'currency': 'EUR',
        'ttl': 60,
        'netRevenue': true,
        'zone': '6682'
      }
    };
    let serverVideoResponse = {
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
      ad: '<!-- test creative -->'
    }, {
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

    it('should get the correct bid response by display ad', function () {
      let bidRequest = [{
        'method': 'GET',
        'url': RADS_ENDPOINT_URL,
        'refererInfo': {
          'referer': ''
        },
        'data': {
          'bid_id': '30b31c1838de1e'
        }
      }];
      let result = spec.interpretResponse(serverBannerResponse, bidRequest[0]);
      expect(Object.keys(result[0])).to.have.members(Object.keys(expectedResponse[0]));
    });

    it('should get the correct rads video bid response by display ad', function () {
      let bidRequest = [{
        'method': 'GET',
        'url': RADS_ENDPOINT_URL,
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
      let result = spec.interpretResponse(serverVideoResponse, bidRequest[0]);
      expect(Object.keys(result[0])).to.have.members(Object.keys(expectedResponse[1]));
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
