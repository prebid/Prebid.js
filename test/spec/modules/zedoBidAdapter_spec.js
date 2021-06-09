import { expect } from 'chai';
import { spec } from 'modules/zedoBidAdapter';

describe('The ZEDO bidding adapter', function () {
  describe('isBidRequestValid', function () {
    it('should return false when given an invalid bid', function () {
      const bid = {
        bidder: 'zedo',
      };
      const isValid = spec.isBidRequestValid(bid);
      expect(isValid).to.equal(false);
    });

    it('should return true when given a channelcode bid', function () {
      const bid = {
        bidder: 'zedo',
        params: {
          channelCode: 20000000,
          dimId: 9
        },
      };
      const isValid = spec.isBidRequestValid(bid);
      expect(isValid).to.equal(true);
    });
  });

  describe('buildRequests', function () {
    const bidderRequest = {
      timeout: 3000,
    };

    it('should properly build a channelCode request for dim Id with type not defined', function () {
      const bidRequests = [
        {
          bidder: 'zedo',
          adUnitCode: 'p12345',
          transactionId: '12345667',
          sizes: [[300, 200]],
          params: {
            channelCode: 20000000,
            dimId: 10,
            pubId: 1
          },
        },
      ];
      const request = spec.buildRequests(bidRequests, bidderRequest);
      expect(request.url).to.match(/^https:\/\/saxp.zedo.com\/asw\/fmh.json/);
      expect(request.method).to.equal('GET');
      const zedoRequest = request.data;
      expect(zedoRequest).to.equal('g={"placements":[{"network":20,"channel":0,"publisher":1,"width":300,"height":200,"dimension":10,"version":"$prebid.version$","keyword":"","transactionId":"12345667","renderers":[{"name":"display"}]}]}');
    });

    it('should properly build a channelCode request for video with type defined', function () {
      const bidRequests = [
        {
          bidder: 'zedo',
          adUnitCode: 'p12345',
          transactionId: '12345667',
          sizes: [640, 480],
          mediaTypes: {
            video: {
              context: 'instream',
            },
          },
          params: {
            channelCode: 20000000,
            dimId: 85
          },
        },
      ];
      const request = spec.buildRequests(bidRequests, bidderRequest);
      expect(request.url).to.match(/^https:\/\/saxp.zedo.com\/asw\/fmh.json/);
      expect(request.method).to.equal('GET');
      const zedoRequest = request.data;
      expect(zedoRequest).to.equal('g={"placements":[{"network":20,"channel":0,"publisher":0,"width":640,"height":480,"dimension":85,"version":"$prebid.version$","keyword":"","transactionId":"12345667","renderers":[{"name":"Inarticle"}]}]}');
    });

    describe('buildGDPRRequests', function () {
      let consentString = 'BOJ8RZsOJ8RZsABAB8AAAAAZ+A==';
      const bidderRequest = {
        timeout: 3000,
        gdprConsent: {
          'consentString': consentString,
          'gdprApplies': true
        }
      };

      it('should properly build request with gdpr consent', function () {
        const bidRequests = [
          {
            bidder: 'zedo',
            adUnitCode: 'p12345',
            transactionId: '12345667',
            sizes: [[300, 200]],
            params: {
              channelCode: 20000000,
              dimId: 10
            },
          },
        ];
        const request = spec.buildRequests(bidRequests, bidderRequest);
        expect(request.method).to.equal('GET');
        const zedoRequest = request.data;
        expect(zedoRequest).to.equal('g={"placements":[{"network":20,"channel":0,"publisher":0,"width":300,"height":200,"dimension":10,"version":"$prebid.version$","keyword":"","transactionId":"12345667","renderers":[{"name":"display"}]}],"gdpr":1,"gdpr_consent":"BOJ8RZsOJ8RZsABAB8AAAAAZ+A=="}');
      });
    });
  });
  describe('interpretResponse', function () {
    it('should return an empty array when there is bid response', function () {
      const response = {};
      const request = { bidRequests: [] };
      const bids = spec.interpretResponse(response, request);
      expect(bids).to.have.lengthOf(0);
    });

    it('should properly parse a bid response with no valid creative', function () {
      const response = {
        body: {
          ad: [
            {
              'slotId': 'ad1d762',
              'network': '2000',
              'creatives': [
                {
                  'adId': '12345',
                  'height': '600',
                  'width': '160',
                  'isFoc': true,
                  'creativeDetails': {
                    'type': 'StdBanner',
                    'adContent': {
                      'focImage': {
                        'url': 'https://c13.zedo.com/OzoDB/0/0/0/blank.gif',
                        'target': '_blank',
                      }
                    }
                  },
                  'cpm': '0'
                }
              ]
            }
          ]
        }
      };
      const request = {
        bidRequests: [{
          bidder: 'zedo',
          adUnitCode: 'p12345',
          bidId: 'test-bidId',
          params: {
            channelCode: 2000000,
            dimId: 9
          }
        }]
      };
      const bids = spec.interpretResponse(response, request);
      expect(bids).to.have.lengthOf(0);
    });

    it('should properly parse a bid response with valid display creative', function () {
      const response = {
        body: {
          ad: [
            {
              'slotId': 'ad1d762',
              'network': '2000',
              'creatives': [
                {
                  'adId': '12345',
                  'height': '600',
                  'width': '160',
                  'isFoc': true,
                  'creativeDetails': {
                    'type': 'StdBanner',
                    'adContent': '<a href="some_path"></a>'
                  },
                  'bidCpm': '720000'
                }
              ]
            }
          ]
        }
      };
      const request = {
        bidRequests: [{
          bidder: 'zedo',
          adUnitCode: 'test-requestId',
          bidId: 'test-bidId',
          params: {
            channelCode: 2000000,
            dimId: 9
          },
        }]
      };
      const bids = spec.interpretResponse(response, request);
      expect(bids).to.have.lengthOf(1);
      expect(bids[0].requestId).to.equal('ad1d762');
      expect(bids[0].cpm).to.equal(0.72);
      expect(bids[0].width).to.equal('160');
      expect(bids[0].height).to.equal('600');
    });

    it('should properly parse a bid response with valid video creative', function () {
      const response = {
        body: {
          ad: [
            {
              'slotId': 'ad1d762',
              'network': '2000',
              'creatives': [
                {
                  'adId': '12345',
                  'height': '480',
                  'width': '640',
                  'isFoc': true,
                  'creativeDetails': {
                    'type': 'VAST',
                    'adContent': '<VAST></VAST>'
                  },
                  'bidCpm': '780000'
                }
              ]
            }
          ]
        }
      };
      const request = {
        bidRequests: [{
          bidder: 'zedo',
          adUnitCode: 'test-requestId',
          bidId: 'test-bidId',
          params: {
            channelCode: 2000000,
            dimId: 85
          },
        }]
      };

      const bids = spec.interpretResponse(response, request);
      expect(bids).to.have.lengthOf(1);
      expect(bids[0].requestId).to.equal('ad1d762');
      expect(bids[0].cpm).to.equal(0.78);
      expect(bids[0].width).to.equal('640');
      expect(bids[0].height).to.equal('480');
      expect(bids[0].adType).to.equal('VAST');
      expect(bids[0].vastXml).to.not.equal('');
      expect(bids[0].ad).to.be.an('undefined');
      expect(bids[0].renderer).not.to.be.an('undefined');
    });
  });

  describe('user sync', function () {
    it('should register the iframe sync url', function () {
      let syncs = spec.getUserSyncs({
        iframeEnabled: true
      });
      expect(syncs).to.not.be.an('undefined');
      expect(syncs).to.have.lengthOf(1);
      expect(syncs[0].type).to.equal('iframe');
    });

    it('should pass gdpr params', function () {
      let syncs = spec.getUserSyncs({ iframeEnabled: true }, {}, {
        gdprApplies: false, consentString: 'test'
      });
      expect(syncs).to.not.be.an('undefined');
      expect(syncs).to.have.lengthOf(1);
      expect(syncs[0].type).to.equal('iframe');
      expect(syncs[0].url).to.contains('gdpr=0');
    });
  });

  describe('bid events', function () {
    it('should trigger a win pixel', function () {
      const bid = {
        'bidderCode': 'zedo',
        'width': '300',
        'height': '250',
        'statusMessage': 'Bid available',
        'adId': '148018fe5e',
        'cpm': 0.5,
        'ad': 'dummy data',
        'ad_id': '12345',
        'sizeId': '15',
        'adResponse':
          {
            'creatives': [
              {
                'adId': '12345',
                'height': '480',
                'width': '640',
                'isFoc': true,
                'creativeDetails': {
                  'type': 'VAST',
                  'adContent': '<VAST></VAST>'
                },
                'seeder': {
                  'network': 1234,
                  'servedChan': 1234567,
                },
                'cpm': '1200000',
                'servedChan': 1234,
              }]
          },
        'params': [{
          'channelCode': '123456',
          'dimId': '85'
        }],
        'requestTimestamp': 1540401686,
        'responseTimestamp': 1540401687,
        'timeToRespond': 6253,
        'pbLg': '0.50',
        'pbMg': '0.50',
        'pbHg': '0.53',
        'adUnitCode': '/123456/header-bid-tag-0',
        'bidder': 'zedo',
        'size': '300x250',
        'adserverTargeting': {
          'hb_bidder': 'zedo',
          'hb_adid': '148018fe5e',
          'hb_pb': '10.00',
        }
      };
      spec.onBidWon(bid);
      spec.onTimeout(bid);
    });
    it('should trigger a timeout pixel', function () {
      const bid = {
        'bidderCode': 'zedo',
        'width': '300',
        'height': '250',
        'statusMessage': 'Bid available',
        'adId': '148018fe5e',
        'cpm': 0.5,
        'ad': 'dummy data',
        'ad_id': '12345',
        'sizeId': '15',
        'params': [{
          'channelCode': '123456',
          'dimId': '85'
        }],
        'timeout': 1,
        'requestTimestamp': 1540401686,
        'responseTimestamp': 1540401687,
        'timeToRespond': 6253,
        'adUnitCode': '/123456/header-bid-tag-0',
        'bidder': 'zedo',
        'size': '300x250',
      };
      spec.onBidWon(bid);
      spec.onTimeout(bid);
    });
  });
});
