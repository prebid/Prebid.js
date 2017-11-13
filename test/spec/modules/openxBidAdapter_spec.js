import { expect } from 'chai';
import { spec } from 'modules/openxBidAdapter';
import { newBidder } from 'src/adapters/bidderFactory';

const URLBASE = '/w/1.0/arj';

describe('OpenxAdapter', () => {
  const adapter = newBidder(spec);

  describe('inherited functions', () => {
    it('exists and is a function', () => {
      expect(adapter.callBids).to.exist.and.to.be.a('function');
    });
  });

  describe('isBidRequestValid', () => {
    let bid = {
      'bidder': 'openx',
      'params': {
        'unit': '12345678',
        'delDomain': 'test-del-domain'
      },
      'adUnitCode': 'adunit-code',
      'sizes': [[300, 250], [300, 600]],
      'bidId': '30b31c1838de1e',
      'bidderRequestId': '22edbae2733bf6',
      'auctionId': '1d1a030790a475',
    };

    it('should return true when required params found', () => {
      expect(spec.isBidRequestValid(bid)).to.equal(true);
    });

    it('should return false when required params are not passed', () => {
      let bid = Object.assign({}, bid);
      delete bid.params;
      bid.params = {'unit': '12345678'};
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });
  });

  describe('buildRequests', () => {
    let bidRequests = [{
      'bidder': 'openx',
      'params': {
        'unit': '12345678',
        'delDomain': 'test-del-domain'
      },
      'adUnitCode': 'adunit-code',
      'sizes': [[300, 250], [300, 600]],
      'bidId': '30b31c1838de1e',
      'bidderRequestId': '22edbae2733bf6',
      'auctionId': '1d1a030790a475',
    }];

    it('should send bid request to openx url via GET', () => {
      const request = spec.buildRequests(bidRequests);
      expect(request.url).to.equal('//' + bidRequests[0].params.delDomain + URLBASE);
      expect(request.method).to.equal('GET');
    });

    it('should have the correct parameters', () => {
      const request = spec.buildRequests(bidRequests);
      const dataParams = request.data;

      expect(dataParams.auid).to.exist;
      expect(dataParams.auid).to.equal('12345678');
      expect(dataParams.aus).to.exist;
      expect(dataParams.aus).to.equal('300x250,300x600');
    });

    it('should send out custom params on bids that have customParams specified', () => {
      let bidRequest = Object.assign({},
        bidRequests[0],
        {
          params: {
            'unit': '12345678',
            'delDomain': 'test-del-domain',
            'customParams': {'Test1': 'testval1+', 'test2': ['testval2/', 'testval3']}
          }
        }
      );

      const request = spec.buildRequests([bidRequest]);
      const dataParams = request.data;

      expect(dataParams.tps).to.exist;
      expect(dataParams.tps).to.equal(btoa('test1=testval1.&test2=testval2_,testval3'));
    });

    it('should send out custom floors on bids that have customFloors specified', () => {
      let bidRequest = Object.assign({},
        bidRequests[0],
        {
          params: {
            'unit': '12345678',
            'delDomain': 'test-del-domain',
            'customFloor': 1.5
          }
        }
      );

      const request = spec.buildRequests([bidRequest]);
      const dataParams = request.data;

      expect(dataParams.aumfs).to.exist;
      expect(dataParams.aumfs).to.equal('1500');
    });

    it('should send out custom bc parameter, if override is present', () => {
      let bidRequest = Object.assign({},
        bidRequests[0],
        {
          params: {
            'unit': '12345678',
            'delDomain': 'test-del-domain',
            'bc': 'hb_override'
          }
        }
      );

      const request = spec.buildRequests([bidRequest]);
      const dataParams = request.data;

      expect(dataParams.bc).to.exist;
      expect(dataParams.bc).to.equal('hb_override');
    });
  });

  describe('interpretResponse', () => {
    let bids = [{
      'bidder': 'openx',
      'params': {
        'unit': '12345678',
        'delDomain': 'test-del-domain'
      },
      'adUnitCode': 'adunit-code',
      'sizes': [[300, 250], [300, 600]],
      'bidId': '30b31c1838de1e',
      'bidderRequestId': '22edbae2733bf6',
      'auctionId': '1d1a030790a475',
    }];
    let bidRequest = {
      method: 'GET',
      url: 'url',
      data: {},
      payload: {'bids': bids, 'startTime': new Date()}
    };
    let bidResponse = {
      'ads':
      {
        'version': 1,
        'count': 1,
        'pixels': 'http://testpixels.net',
        'ad': [
          {
            'adunitid': 12345678,
            'adid': 5678,
            'type': 'html',
            'html': 'test_html',
            'framed': 1,
            'is_fallback': 0,
            'ts': 'ts',
            'cpipc': 1000,
            'pub_rev': '1000',
            'adv_id': 'adv_id',
            'brand_id': '',
            'creative': [
              {
                'width': '300',
                'height': '250',
                'target': '_blank',
                'mime': 'text/html',
                'media': 'test_media',
                'tracking': {
                  'impression': 'test_impression',
                  'inview': 'test_inview',
                  'click': 'test_click'
                }
              }
            ]
          }]
      }
    };
    it('should return correct bid response', () => {
      let expectedResponse = [
        {
          'requestId': '30b31c1838de1e',
          'cpm': 1,
          'width': '300',
          'height': '250',
          'creativeId': 5678,
          'ad': 'test_html',
          'ttl': 300,
          'netRevenue': true,
          'currency': 'USD',
          'ts': 'ts'
        }
      ];

      let result = spec.interpretResponse({body: bidResponse}, bidRequest);
      expect(Object.keys(result[0])).to.eql(Object.keys(expectedResponse[0]));
    });

    it('handles nobid responses', () => {
      bidResponse = {
        'ads':
        {
          'version': 1,
          'count': 1,
          'pixels': 'http://testpixels.net',
          'ad': []
        }
      };

      let result = spec.interpretResponse({body: bidResponse}, bidRequest);
      expect(result.length).to.equal(0);
    });
  });
});
