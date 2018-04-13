import {expect} from 'chai';
import {spec} from 'modules/openxBidAdapter';
import {newBidder} from 'src/adapters/bidderFactory';
import {BANNER, VIDEO} from 'src/mediaTypes';
import {userSync} from 'src/userSync';

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
    describe('when request is for a banner ad', () => {
      const bannerBid = {
        bidder: 'openx',
        params: {
          unit: '12345678',
          delDomain: 'test-del-domain'
        },
        adUnitCode: 'adunit-code',
        mediaTypes: {banner: {}},
        sizes: [[300, 250], [300, 600]],
        bidId: '30b31c1838de1e',
        bidderRequestId: '22edbae2733bf6',
        auctionId: '1d1a030790a475'
      };

      it('should return true when required params found', () => {
        expect(spec.isBidRequestValid(bannerBid)).to.equal(true);
      });

      it('should return false when there is no delivery domain', () => {
        let bid = Object.assign({}, bannerBid);
        bid.params = {'unit': '12345678'};
        expect(spec.isBidRequestValid(bid)).to.equal(false);
      });

      it('should return false when there is no ad unit id ', () => {
        let bid = Object.assign({}, bannerBid);
        bid.params = {delDomain: 'test-del-domain'};
        expect(spec.isBidRequestValid(bid)).to.equal(false);
      });
    });

    describe('when request is for a video ad', function () {
      const videoBidWithMediaTypes = {
        bidder: 'openx',
        params: {
          unit: '12345678',
          delDomain: 'test-del-domain',
          video: {
            be: 'true',
            url: 'abc.com'
          }
        },
        adUnitCode: 'adunit-code',
        mediaTypes: {video: {}},
        sizes: [640, 480],
        bidId: '30b31c1838de1e',
        bidderRequestId: '22edbae2733bf6',
        auctionId: '1d1a030790a475',
        transactionId: '4008d88a-8137-410b-aa35-fbfdabcb478e'
      };

      const videoBidWithMediaType = {
        'bidder': 'openx',
        'params': {
          'unit': '12345678',
          'delDomain': 'test-del-domain',
          'video': {
            'be': 'true',
            'url': 'abc.com'
          }
        },
        'adUnitCode': 'adunit-code',
        'mediaTypes': 'video',
        'sizes': [640, 480],
        'bidId': '30b31c1838de1e',
        'bidderRequestId': '22edbae2733bf6',
        'auctionId': '1d1a030790a475',
        'transactionId': '4008d88a-8137-410b-aa35-fbfdabcb478e'
      };
      it('should return true when required params found', () => {
        expect(spec.isBidRequestValid(videoBidWithMediaTypes)).to.equal(true);
      });

      it('should return false when required params are not passed', () => {
        let videoBidWithMediaTypes = Object.assign({}, videoBidWithMediaTypes);
        videoBidWithMediaTypes.params = {};
        expect(spec.isBidRequestValid(videoBidWithMediaTypes)).to.equal(false);
      });

      it('should return true when required params found', () => {
        expect(spec.isBidRequestValid(videoBidWithMediaType)).to.equal(true);
      });

      it('should return false when required params are not passed', () => {
        let videoBidWithMediaType = Object.assign({}, videoBidWithMediaType);
        delete videoBidWithMediaType.params;
        videoBidWithMediaType.params = {};
        expect(spec.isBidRequestValid(videoBidWithMediaType)).to.equal(false);
      });
    });
  });

  describe('buildRequests for banner ads', () => {
    const bidRequestsWithMediaType = [{
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
      'auctionId': '1d1a030790a475'
    }];
    const bidRequestsWithMediaTypes = [{
      'bidder': 'openx',
      'params': {
        'unit': '12345678',
        'delDomain': 'test-del-domain'
      },
      'adUnitCode': 'adunit-code',
      mediaTypes: {
        banner: {
          sizes: [[300, 250], [300, 600]]
        }
      },
      'bidId': '30b31c1838de1e',
      'bidderRequestId': '22edbae2733bf6',
      'auctionId': '1d1a030790a475'
    }];

    it('should send bid request to openx url via GET, with mediaType specified as banner', () => {
      const request = spec.buildRequests(bidRequestsWithMediaType);
      expect(request[0].url).to.equal('//' + bidRequestsWithMediaType[0].params.delDomain + URLBASE);
      expect(request[0].method).to.equal('GET');
    });

    it('should send bid request to openx url via GET, with mediaTypes specified with banner type', () => {
      const request = spec.buildRequests(bidRequestsWithMediaTypes);
      expect(request[0].url).to.equal('//' + bidRequestsWithMediaTypes[0].params.delDomain + URLBASE);
      expect(request[0].method).to.equal('GET');
    });

    describe('when there is a legacy request with no media type', function () {
      const deprecatedBidRequestsFormatWithNoMediaType = [{
        'bidder': 'openx',
        'params': {
          'unit': '12345678',
          'delDomain': 'test-del-domain'
        },
        'adUnitCode': 'adunit-code',
        'sizes': [[300, 250], [300, 600]],
        'bidId': '30b31c1838de1e',
        'bidderRequestId': '22edbae2733bf6',
        'auctionId': '1d1a030790a475'
      }];

      let requestData;

      beforeEach(function () {
        requestData = spec.buildRequests(deprecatedBidRequestsFormatWithNoMediaType)[0].data;
      });

      it('should have an ad unit id', () => {
        expect(requestData.auid).to.equal('12345678');
      });

      it('should have ad sizes', function () {
        expect(requestData.aus).to.equal('300x250,300x600');
      });
    });

    it('should send out custom params on bids that have customParams specified', () => {
      const bidRequest = Object.assign({},
        bidRequestsWithMediaTypes[0],
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
      const bidRequest = Object.assign({},
        bidRequestsWithMediaTypes[0],
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
      const bidRequest = Object.assign({},
        bidRequestsWithMediaTypes[0],
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
    const bidRequestsWithMediaTypes = [{
      'bidder': 'openx',
      'mediaTypes': {
        video: {
          playerSize: [640, 480]
        }
      },
      'params': {
        'unit': '12345678',
        'delDomain': 'test-del-domain',
        'video': {
          'url': 'abc.com'
        }
      },
      'adUnitCode': 'adunit-code',

      'bidId': '30b31c1838de1e',
      'bidderRequestId': '22edbae2733bf6',
      'auctionId': '1d1a030790a475',
      'transactionId': '4008d88a-8137-410b-aa35-fbfdabcb478e'
    }];

    const bidRequestsWithMediaType = [{
      'bidder': 'openx',
      'mediaType': 'video',
      'params': {
        'unit': '12345678',
        'delDomain': 'test-del-domain',
        'video': {
          'url': 'abc.com'
        }
      },
      'adUnitCode': 'adunit-code',
      'sizes': [640, 480],
      'bidId': '30b31c1838de1e',
      'bidderRequestId': '22edbae2733bf6',
      'auctionId': '1d1a030790a475',
      'transactionId': '4008d88a-8137-410b-aa35-fbfdabcb478e'
    }];

    it('should send bid request to openx url via GET, with mediaType as video', () => {
      const request = spec.buildRequests(bidRequestsWithMediaType);
      expect(request[0].url).to.equal('//' + bidRequestsWithMediaType[0].params.delDomain + URLBASEVIDEO);
      expect(request[0].method).to.equal('GET');
    });

    it('should send bid request to openx url via GET, with mediaTypes having video parameter', () => {
      const request = spec.buildRequests(bidRequestsWithMediaTypes);
      expect(request[0].url).to.equal('//' + bidRequestsWithMediaTypes[0].params.delDomain + URLBASEVIDEO);
      expect(request[0].method).to.equal('GET');
    });

    it('should have the correct parameters', () => {
      const request = spec.buildRequests(bidRequestsWithMediaTypes);
      const dataParams = request[0].data;

      expect(dataParams.auid).to.equal('12345678');
      expect(dataParams.url).to.equal('abc.com');
      expect(dataParams.vht).to.equal(480);
      expect(dataParams.vwd).to.equal(640);
    });
  });

  describe('interpretResponse for banner ads', () => {
    beforeEach(() => {
      sinon.spy(userSync, 'registerSync');
    });

    afterEach(function () {
      userSync.registerSync.restore();
    });

    const bids = [{
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
      'auctionId': '1d1a030790a475'
    }];
    const bidRequest = {
      method: 'GET',
      url: '//openx-d.openx.net/v/1.0/arj',
      data: {},
      payload: {'bids': bids, 'startTime': new Date()}
    };

    const bidResponse = {
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
                    'impression': 'http://openx-d.openx.net/v/1.0/ri?ts=ts',
                    'inview': 'test_inview',
                    'click': 'test_click'
                  }
                }
              ]
            }]
        }

    };
    it('should return correct bid response', () => {
      const expectedResponse = [
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

      const result = spec.interpretResponse({body: bidResponse}, bidRequest);
      expect(Object.keys(result[0])).to.eql(Object.keys(expectedResponse[0]));
    });

    it('handles nobid responses', () => {
      const bidResponse = {
        'ads':
          {
            'version': 1,
            'count': 1,
            'pixels': 'http://testpixels.net',
            'ad': []
          }
      };

      const result = spec.interpretResponse({body: bidResponse}, bidRequest);
      expect(result.length).to.equal(0);
    });

    it('should register a user sync', () => {
      spec.interpretResponse({body: bidResponse}, bidRequest);
      sinon.assert.calledWith(userSync.registerSync, 'iframe', 'openx', 'http://testpixels.net');
    });

    it('should register a beacon', () => {
      spec.interpretResponse({body: bidResponse}, bidRequest);
      sinon.assert.calledWith(userSync.registerSync, 'image', 'openx', sinon.match(/\/\/openx-d\.openx\.net.*\/bo\?.*ts=ts/));
    });
  });

  describe('interpretResponse for video ads', () => {
    beforeEach(() => {
      sinon.spy(userSync, 'registerSync');
    });

    afterEach(function () {
      userSync.registerSync.restore();
    });

    const bidsWithMediaTypes = [{
      'bidder': 'openx',
      'mediaTypes': {video: {}},
      'params': {
        'unit': '12345678',
        'delDomain': 'test-del-domain',
        'video': {
          'url': 'abc.com'
        }
      },
      'adUnitCode': 'adunit-code',
      'sizes': [640, 480],
      'bidId': '30b31c1838de1e',
      'bidderRequestId': '22edbae2733bf6',
      'auctionId': '1d1a030790a475',
      'transactionId': '4008d88a-8137-410b-aa35-fbfdabcb478e'
    }];
    const bidsWithMediaType = [{
      'bidder': 'openx',
      'mediaType': 'video',
      'params': {
        'unit': '12345678',
        'delDomain': 'test-del-domain',
        'video': {
          'url': 'abc.com'
        }
      },
      'adUnitCode': 'adunit-code',
      'sizes': [640, 480],
      'bidId': '30b31c1838de1e',
      'bidderRequestId': '22edbae2733bf6',
      'auctionId': '1d1a030790a475',
      'transactionId': '4008d88a-8137-410b-aa35-fbfdabcb478e'
    }];
    const bidRequestsWithMediaTypes = {
      method: 'GET',
      url: '//openx-d.openx.net/v/1.0/avjp',
      data: {},
      payload: {'bid': bidsWithMediaTypes[0], 'startTime': new Date()}
    };
    const bidRequestsWithMediaType = {
      method: 'GET',
      url: '//openx-d.openx.net/v/1.0/avjp',
      data: {},
      payload: {'bid': bidsWithMediaType[0], 'startTime': new Date()}
    };
    const bidResponse = {
      'pub_rev': '1',
      'width': '640',
      'height': '480',
      'adid': '5678',
      'vastUrl': 'http://testvast.com/vastpath?colo=http://test-colo.com&ph=test-ph&ts=test-ts',
      'pixels': 'http://testpixels.net'
    };

    it('should return correct bid response with MediaTypes', () => {
      const expectedResponse = [
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

      const result = spec.interpretResponse({body: bidResponse}, bidRequestsWithMediaTypes);
      expect(JSON.stringify(Object.keys(result[0]).sort())).to.eql(JSON.stringify(Object.keys(expectedResponse[0]).sort()));
    });

    it('should return correct bid response with MediaType', () => {
      const expectedResponse = [
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

      const result = spec.interpretResponse({body: bidResponse}, bidRequestsWithMediaType);
      expect(JSON.stringify(Object.keys(result[0]).sort())).to.eql(JSON.stringify(Object.keys(expectedResponse[0]).sort()));
    });

    it('should handle nobid responses for bidRequests with MediaTypes', () => {
      const bidResponse = {'vastUrl': '', 'pub_rev': '', 'width': '', 'height': '', 'adid': '', 'pixels': ''};
      const result = spec.interpretResponse({body: bidResponse}, bidRequestsWithMediaTypes);
      expect(result.length).to.equal(0);
    });

    it('should handle nobid responses for bidRequests with MediaType', () => {
      const bidResponse = {'vastUrl': '', 'pub_rev': '', 'width': '', 'height': '', 'adid': '', 'pixels': ''};
      const result = spec.interpretResponse({body: bidResponse}, bidRequestsWithMediaType);
      expect(result.length).to.equal(0);
    });

    it('should register a user sync', () => {
      spec.interpretResponse({body: bidResponse}, bidRequestsWithMediaTypes);
      sinon.assert.calledWith(userSync.registerSync, 'iframe', 'openx', 'http://testpixels.net');
    });

    it('should register a beacon', () => {
      spec.interpretResponse({body: bidResponse}, bidRequestsWithMediaTypes);
      sinon.assert.calledWith(userSync.registerSync, 'image', 'openx', sinon.match(/^\/\/test-colo\.com/))
      sinon.assert.calledWith(userSync.registerSync, 'image', 'openx', sinon.match(/ph=test-ph/));
      sinon.assert.calledWith(userSync.registerSync, 'image', 'openx', sinon.match(/ts=test-ts/));
    });
  });
});
