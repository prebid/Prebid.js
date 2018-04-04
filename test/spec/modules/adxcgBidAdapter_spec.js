import {expect} from 'chai';
import * as url from 'src/url';
import {spec} from 'modules/adxcgBidAdapter';

describe('AdxcgAdapter', () => {
  describe('isBidRequestValid', () => {
    let bid = {
      'bidder': 'adxcg',
      'params': {
        'adzoneid': '1'
      },
      'adUnitCode': 'adunit-code',
      'sizes': [[300, 250], [640, 360], [1, 1]],
      'bidId': '84ab500420319d',
      'bidderRequestId': '7101db09af0db2',
      'auctionId': '1d1a030790a475',
    };

    it('should return true when required params found', () => {
      expect(spec.isBidRequestValid(bid)).to.equal(true);
    });

    it('should return false when required params are not passed', () => {
      let bid = Object.assign({}, bid);
      delete bid.params;
      bid.params = {};
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });
  });

  describe('request function http', () => {
    let bid = {
      'bidder': 'adxcg',
      'params': {
        'adzoneid': '1'
      },
      'adUnitCode': 'adunit-code',
      'sizes': [[300, 250], [640, 360], [1, 1]],
      'bidId': '84ab500420319d',
      'bidderRequestId': '7101db09af0db2',
      'auctionId': '1d1a030790a475',
    };

    it('creates a valid adxcg request url', () => {
      let request = spec.buildRequests([bid]);
      expect(request).to.exist;
      // console.log('IS:' + JSON.stringify(request));

      expect(request.method).to.equal('GET');
      let parsedRequestUrl = url.parse(request.url);

      expect(parsedRequestUrl.hostname).to.equal('hbp.adxcg.net');
      expect(parsedRequestUrl.pathname).to.equal('/get/adi');

      let query = parsedRequestUrl.search;
      expect(query.renderformat).to.equal('javascript');
      expect(query.ver).to.equal('r20171102PB10');
      expect(query.source).to.equal('pbjs10');
      expect(query.pbjs).to.equal('$prebid.version$');
      expect(query.adzoneid).to.equal('1');
      expect(query.format).to.equal('300x250|640x360|1x1');
      expect(query.jsonp).to.be.empty;
      expect(query.prebidBidIds).to.equal('84ab500420319d');
    });
  });

  describe('response handler', () => {
    let BIDDER_REQUEST = {
      'bidder': 'adxcg',
      'params': {
        'adzoneid': '1'
      },
      'adUnitCode': 'adunit-code',
      'sizes': [[300, 250], [640, 360], [1, 1]],
      'bidId': '84ab500420319d',
      'bidderRequestId': '7101db09af0db2',
      'auctionId': '1d1a030790a475',
    };

    let BANNER_RESPONSE =
      {
        body: [{
          'bidId': '84ab500420319d',
          'bidderCode': 'adxcg',
          'width': 300,
          'height': 250,
          'creativeId': '42',
          'cpm': 0.45,
          'currency': 'USD',
          'netRevenue': true,
          'ad': '<!-- adContent -->'
        }],
        header: {'someheader': 'fakedata'}
      }

    let BANNER_RESPONSE_WITHDEALID =
      {
        body: [{
          'bidId': '84ab500420319d',
          'bidderCode': 'adxcg',
          'width': 300,
          'height': 250,
          'deal_id': '7722',
          'creativeId': '42',
          'cpm': 0.45,
          'currency': 'USD',
          'netRevenue': true,
          'ad': '<!-- adContent -->'
        }],
        header: {'someheader': 'fakedata'}
      }

    let VIDEO_RESPONSE =
      {
        body: [{
          'bidId': '84ab500420319d',
          'bidderCode': 'adxcg',
          'width': 640,
          'height': 360,
          'creativeId': '42',
          'cpm': 0.45,
          'currency': 'USD',
          'netRevenue': true,
          'vastUrl': 'vastContentUrl'
        }],
        header: {'someheader': 'fakedata'}
      }

    let NATIVE_RESPONSE =
      {
        body: [{
          'bidId': '84ab500420319d',
          'bidderCode': 'adxcg',
          'width': 0,
          'height': 0,
          'creativeId': '42',
          'cpm': 0.45,
          'currency': 'USD',
          'netRevenue': true,
          'nativeResponse': {
            'assets': [{
              'id': 1,
              'required': 0,
              'title': {
                'text': 'titleContent'
              }
            }, {
              'id': 2,
              'required': 0,
              'img': {
                'url': 'imageContent',
                'w': 600,
                'h': 600
              }
            }, {
              'id': 3,
              'required': 0,
              'data': {
                'label': 'DESC',
                'value': 'descriptionContent'
              }
            }, {
              'id': 0,
              'required': 0,
              'data': {
                'label': 'SPONSORED',
                'value': 'sponsoredByContent'
              }
            }],
            'link': {
              'url': 'linkContent'
            },
            'imptrackers': ['impressionTracker1', 'impressionTracker2']
          }
        }],
        header: {'someheader': 'fakedata'}
      }

    it('handles regular responses', () => {
      let result = spec.interpretResponse(BANNER_RESPONSE, BIDDER_REQUEST);

      expect(result).to.have.lengthOf(1);

      expect(result[0]).to.exist;
      expect(result[0].width).to.equal(300);
      expect(result[0].height).to.equal(250);
      expect(result[0].creativeId).to.equal(42);
      expect(result[0].cpm).to.equal(0.45);
      expect(result[0].ad).to.equal('<!-- adContent -->');
      expect(result[0].currency).to.equal('USD');
      expect(result[0].netRevenue).to.equal(true);
      expect(result[0].ttl).to.equal(300);
      expect(result[0].dealId).to.not.exist;
    });

    it('handles regular responses with dealid', () => {
      let result = spec.interpretResponse(BANNER_RESPONSE_WITHDEALID, BIDDER_REQUEST);

      expect(result).to.have.lengthOf(1);

      expect(result[0].width).to.equal(300);
      expect(result[0].height).to.equal(250);
      expect(result[0].creativeId).to.equal(42);
      expect(result[0].cpm).to.equal(0.45);
      expect(result[0].ad).to.equal('<!-- adContent -->');
      expect(result[0].currency).to.equal('USD');
      expect(result[0].netRevenue).to.equal(true);
      expect(result[0].ttl).to.equal(300);
    });

    it('handles video responses', () => {
      let result = spec.interpretResponse(VIDEO_RESPONSE, BIDDER_REQUEST);
      expect(result).to.have.lengthOf(1);

      expect(result[0].width).to.equal(640);
      expect(result[0].height).to.equal(360);
      expect(result[0].mediaType).to.equal('video');
      expect(result[0].creativeId).to.equal(42);
      expect(result[0].cpm).to.equal(0.45);
      expect(result[0].vastUrl).to.equal('vastContentUrl');
      expect(result[0].descriptionUrl).to.equal('vastContentUrl');
      expect(result[0].currency).to.equal('USD');
      expect(result[0].netRevenue).to.equal(true);
      expect(result[0].ttl).to.equal(300);
    });

    it('handles native responses', () => {
      let result = spec.interpretResponse(NATIVE_RESPONSE, BIDDER_REQUEST);

      expect(result[0].width).to.equal(0);
      expect(result[0].height).to.equal(0);
      expect(result[0].mediaType).to.equal('native');
      expect(result[0].creativeId).to.equal(42);
      expect(result[0].cpm).to.equal(0.45);
      expect(result[0].currency).to.equal('USD');
      expect(result[0].netRevenue).to.equal(true);
      expect(result[0].ttl).to.equal(300);

      expect(result[0].native.clickUrl).to.equal('linkContent');
      expect(result[0].native.impressionTrackers).to.deep.equal(['impressionTracker1', 'impressionTracker2']);
      expect(result[0].native.title).to.equal('titleContent');
      expect(result[0].native.image).to.equal('imageContent');
      expect(result[0].native.body).to.equal('descriptionContent');
      expect(result[0].native.sponsoredBy).to.equal('sponsoredByContent');
    });

    it('handles nobid responses', () => {
      let response = [];
      let bidderRequest = BIDDER_REQUEST;

      let result = spec.interpretResponse(response, bidderRequest);
      expect(result.length).to.equal(0);
    });
  });

  describe('getUserSyncs', () => {
    let syncoptionsIframe = {
      'iframeEnabled': 'true'
    };

    it('should return iframe sync option', () => {
      expect(spec.getUserSyncs(syncoptionsIframe)[0].type).to.equal('iframe');
      expect(spec.getUserSyncs(syncoptionsIframe)[0].url).to.equal('//cdn.adxcg.net/pb-sync.html');
    });
  });
});
