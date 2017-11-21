import { expect } from 'chai';
import { spec } from 'modules/openxBidAdapter';
import { newBidder } from 'src/adapters/bidderFactory';

const URLBASE = '/w/1.0/arj';
const URLBASEVIDEO = '/v/1.0/avjp';

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
      'mediaType': 'banner',
      'sizes': [[300, 250], [300, 600]],
      'bidId': '30b31c1838de1e',
      'bidderRequestId': '22edbae2733bf6',
      'auctionId': '1d1a030790a475',
    };

    let videoBid = {
      'bidder': 'openx',
      'params': {
        'unit': '12345678',
        'delDomain': 'test-del-domain',
        'video': {
          'be': 'true',
          'url': 'abc.com',
          'vtest': '1'
        }
      },
      'adUnitCode': 'adunit-code',
      'mediaType': 'video',
      'sizes': [640, 480],
      'bidId': '30b31c1838de1e',
      'bidderRequestId': '22edbae2733bf6',
      'auctionId': '1d1a030790a475',
      'transactionId': '4008d88a-8137-410b-aa35-fbfdabcb478e'
    };

    it('should return true when required params found for a banner ad', () => {
      expect(spec.isBidRequestValid(bid)).to.equal(true);
    });

    it('should return false when required params are not passed for a banner ad', () => {
      let bid = Object.assign({}, bid);
      delete bid.params;
      bid.params = {'unit': '12345678'};
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });

    it('should return true when required params found for a video ad', () => {
      expect(spec.isBidRequestValid(videoBid)).to.equal(true);
    });

    it('should return false when required params are not passed for a video ad', () => {
      let videoBid = Object.assign({}, videoBid);
      delete videoBid.params;
      videoBid.params = {};
      expect(spec.isBidRequestValid(videoBid)).to.equal(false);
    });
  });

  describe('buildRequests for banner ads', () => {
    let bidRequests = [{
      'bidder': 'openx',
      'params': {
        'unit': '12345678',
        'delDomain': 'test-del-domain'
      },
      'adUnitCode': 'adunit-code',
      'mediaType': 'banner',
      'sizes': [[300, 250], [300, 600]],
      'bidId': '30b31c1838de1e',
      'bidderRequestId': '22edbae2733bf6',
      'auctionId': '1d1a030790a475',
    }];

    it('should send bid request to openx url via GET', () => {
      const request = spec.buildRequests(bidRequests);
      expect(request[0].url).to.equal('//' + bidRequests[0].params.delDomain + URLBASE);
      expect(request[0].method).to.equal('GET');
    });

    it('should have the correct parameters', () => {
      const request = spec.buildRequests(bidRequests);
      const dataParams = request[0].data;

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
      const dataParams = request[0].data;

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
      const dataParams = request[0].data;

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
      const dataParams = request[0].data;

      expect(dataParams.bc).to.exist;
      expect(dataParams.bc).to.equal('hb_override');
    });
  });

  describe('buildRequests for video', () => {
    let bidRequests = [{
      'bidder': 'openx',
      'mediaType': 'video',
      'params': {
        'unit': '12345678',
        'delDomain': 'test-del-domain',
        'video': {
          'url': 'abc.com',
        }
      },
      'adUnitCode': 'adunit-code',
      'sizes': [640, 480],
      'bidId': '30b31c1838de1e',
      'bidderRequestId': '22edbae2733bf6',
      'auctionId': '1d1a030790a475',
      'transactionId': '4008d88a-8137-410b-aa35-fbfdabcb478e'
    }];

    it('should send bid request to openx url via GET', () => {
      const request = spec.buildRequests(bidRequests);
      expect(request[0].url).to.equal('http://' + bidRequests[0].params.delDomain + URLBASEVIDEO);
      expect(request[0].method).to.equal('GET');
    });

    it('should have the correct parameters', () => {
      const request = spec.buildRequests(bidRequests);
      const dataParams = request[0].data;

      expect(dataParams.auid).to.exist;
      expect(dataParams.auid).to.equal('12345678');
      expect(dataParams.url).to.exist;
      expect(dataParams.url).to.equal('abc.com');
    });
  });

  describe('interpretResponse for banner ads', () => {
    let bids = [{
      'bidder': 'openx',
      'params': {
        'unit': '12345678',
        'delDomain': 'test-del-domain'
      },
      'adUnitCode': 'adunit-code',
      'mediaType': 'banner',
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
      let bidResponse = {
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

  describe('interpretResponse for video ads', () => {
    let bids = [{
      'bidder': 'openx',
      'mediaType': 'video',
      'params': {
        'unit': '12345678',
        'delDomain': 'test-del-domain',
        'video': {
          'url': 'abc.com',
        }
      },
      'adUnitCode': 'adunit-code',
      'sizes': [640, 480],
      'bidId': '30b31c1838de1e',
      'bidderRequestId': '22edbae2733bf6',
      'auctionId': '1d1a030790a475',
      'transactionId': '4008d88a-8137-410b-aa35-fbfdabcb478e'
    }];
    let bidRequest = {
      method: 'GET',
      url: 'url',
      data: {},
      payload: {'bid': bids[0], 'startTime': new Date()}
    };
    let bidResponse = {
      'pub_rev': '1',
      'width': '640',
      'height': '480',
      'adid': '5678',
      'vastUrl': 'http://testvast.com',
      'pixels': 'http://testpixels.net'
    };

    it('should return correct bid response', () => {
      let expectedResponse = [
        {
          'requestId': '30b31c1838de1e',
          'bidderCode': 'openx',
          'cpm': 1,
          'width': '640',
          'height': '480',
          'mediaType': 'video',
          'creativeId': '5678',
          'vastUrl': 'http://testvast.com',
          'ttl': 300,
          'netRevenue': true,
          'currency': 'USD'
        }
      ];

      let result = spec.interpretResponse({body: bidResponse}, bidRequest);
      expect(JSON.stringify(Object.keys(result[0]).sort())).to.eql(JSON.stringify(Object.keys(expectedResponse[0]).sort()));
    });

    it('handles nobid responses', () => {
      let bidResponse = {'vastUrl': '', 'pub_rev': '', 'width': '', 'height': '', 'adid': '', 'pixels': ''};
      let result = spec.interpretResponse({body: bidResponse}, bidRequest);
      expect(result.length).to.equal(0);
    });
  });
});
