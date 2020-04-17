import { expect } from 'chai';
import { spec } from 'modules/sortableBidAdapter.js';
import { newBidder } from 'src/adapters/bidderFactory.js';
import * as utils from 'src/utils.js';

describe('sortableBidAdapter', function() {
  const adapter = newBidder(spec);

  describe('isBidRequestValid', function () {
    function makeBid() {
      return {
        'bidder': 'sortable',
        'params': {
          'tagId': '403370',
          'siteId': 'example.com',
          'keywords': {
            'key1': 'val1',
            'key2': 'val2'
          },
          'floorSizeMap': {
            '728x90': 0.15,
            '300x250': 1.20
          }
        },
        'adUnitCode': 'adunit-code',
        'sizes': [
          [300, 250]
        ],
        'bidId': '30b31c1838de1e',
        'bidderRequestId': '22edbae2733bf6',
        'auctionId': '1d1a030790a475',
      };
    }

    it('should return true when required params found', function () {
      expect(spec.isBidRequestValid(makeBid())).to.equal(true);
    });

    it('should return false when tagId not passed correctly', function () {
      let bid = makeBid();
      delete bid.params.tagId;
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });

    it('should return false when sizes not passed correctly', function () {
      let bid = makeBid();
      delete bid.sizes;
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });

    it('should return false when sizes are wrong length', function () {
      let bid = makeBid();
      bid.sizes = [[300]];
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });

    it('should return false when sizes are empty', function () {
      let bid = makeBid();
      bid.sizes = [];
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });

    it('should return false when require params are not passed', function () {
      let bid = makeBid();
      bid.params = {};
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });

    it('should return false when the floorSizeMap is invalid', function () {
      let bid = makeBid();
      bid.params.floorSizeMap = {
        'sixforty by foureighty': 1234
      };
      expect(spec.isBidRequestValid(bid)).to.equal(false);
      bid.params.floorSizeMap = {
        '728x90': 'three'
      }
      expect(spec.isBidRequestValid(bid)).to.equal(false);
      bid.params.floorSizeMap = 'a';
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });

    it('should return true when the floorSizeMap is missing or empty', function () {
      let bid = makeBid();
      bid.params.floorSizeMap = {};
      expect(spec.isBidRequestValid(bid)).to.equal(true);
      delete bid.params.floorSizeMap;
      expect(spec.isBidRequestValid(bid)).to.equal(true);
    });
    it('should return false when the keywords are invalid', function () {
      let bid = makeBid();
      bid.params.keywords = {
        'badval': 1234
      };
      expect(spec.isBidRequestValid(bid)).to.equal(false);
      bid.params.keywords = 'a';
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });

    it('should return true when the keywords are missing or empty', function () {
      let bid = makeBid();
      bid.params.keywords = {};
      expect(spec.isBidRequestValid(bid)).to.equal(true);
      delete bid.params.keywords;
      expect(spec.isBidRequestValid(bid)).to.equal(true);
    });

    it('should return true with video media type', () => {
      const videoBid = {
        'bidder': 'sortable',
        'params': {
          'tagId': '403370',
          'siteId': 'example.com',
        },
        'adUnitCode': 'adunit-code',
        'bidId': '30b31c1838de1e',
        'bidderRequestId': '22edbae2733bf6',
        'auctionId': '1d1a030790a475',
        'mediaTypes': {
          'video': {
          }
        }
      };
      expect(spec.isBidRequestValid(videoBid)).to.equal(true);
    });
  });

  describe('buildRequests', function () {
    const bidRequests = [{
      'bidder': 'sortable',
      'params': {
        'tagId': '403370',
        'siteId': 'example.com',
        'floor': 0.21,
        'keywords': {
          'key1': 'val1',
          'key2': 'val2'
        },
        'floorSizeMap': {
          '728x90': 0.15,
          '300x250': 1.20
        }
      },
      'sizes': [
        [300, 250]
      ],
      'bidId': '30b31c1838de1e',
      'bidderRequestId': '22edbae2733bf6',
      'auctionId': '1d1a030790a475'
    }, {
      'bidder': 'sortable',
      'params': {
        'tagId': '403371',
        'siteId': 'example.com',
        'floor': 0.21
      },
      'sizes': [
        [300, 250]
      ],
      'bidId': '30b31c1838de1e',
      'bidderRequestId': '22edbae2733bf6',
      'auctionId': '1d1a030790a475',
      'mediaTypes': {
        'native': {
          'body': {'required': true, 'sendId': true},
          'clickUrl': {'required': true, 'sendId': true},
          'cta': {'required': true, 'sendId': true},
          'icon': {'required': true, 'sendId': true},
          'image': {'required': true, 'sendId': true},
          'sponsoredBy': {'required': true, 'sendId': true},
          'title': {'required': true, 'sendId': true, 'len': 100}
        }
      }
    }];

    const request = spec.buildRequests(bidRequests, {refererInfo: { referer: 'http://example.com/page?param=val' }});
    const requestBody = JSON.parse(request.data);

    it('sends bid request to our endpoint via POST', function () {
      expect(request.method).to.equal('POST');
    });

    it('attaches source and version to endpoint URL as query params', function () {
      const ENDPOINT = `https://c.deployads.com/openrtb2/auction?src=$$REPO_AND_VERSION$$&host=example.com`;
      expect(request.url).to.equal(ENDPOINT);
    });

    it('sends screen dimensions', function () {
      expect(requestBody.site.device.w).to.equal(screen.width);
      expect(requestBody.site.device.h).to.equal(screen.height);
    });

    it('includes the ad size in the bid request', function () {
      expect(requestBody.imp[0].banner.format[0].w).to.equal(300);
      expect(requestBody.imp[0].banner.format[0].h).to.equal(250);
    });

    it('includes the params in the bid request', function () {
      expect(requestBody.imp[0].ext.keywords).to.deep.equal(
        {'key1': 'val1',
          'key2': 'val2'}
      );
      expect(requestBody.site.publisher.id).to.equal('example.com');
      expect(requestBody.imp[0].tagid).to.equal('403370');
      expect(requestBody.imp[0].bidfloor).to.equal(0.21);
    });

    it('should have the floor size map set', function () {
      expect(requestBody.imp[0].ext.floorSizeMap).to.deep.equal({
        '728x90': 0.15,
        '300x250': 1.20
      });
    });

    it('sets domain and href correctly', function () {
      expect(requestBody.site.domain).to.equal('example.com');
      expect(requestBody.site.page).to.equal('http://example.com/page?param=val');
    });

    it('should have the version in native object set for native bid', function() {
      expect(requestBody.imp[1].native.ver).to.equal('1');
    });

    it('should have the assets set for native bid', function() {
      const assets = JSON.parse(requestBody.imp[1].native.request).assets;
      expect(assets[0]).to.deep.equal({'title': {'len': 100}, 'required': 1, 'id': 0});
      expect(assets[1]).to.deep.equal({'img': {'type': 3, 'wmin': 1, 'hmin': 1}, 'required': 1, 'id': 1});
      expect(assets[2]).to.deep.equal({'img': {'type': 1, 'wmin': 1, 'hmin': 1}, 'required': 1, 'id': 2});
      expect(assets[3]).to.deep.equal({'data': {'type': 2}, 'required': 1, 'id': 3});
      expect(assets[4]).to.deep.equal({'data': {'type': 12}, 'required': 1, 'id': 4});
      expect(assets[5]).to.deep.equal({'data': {'type': 1}, 'required': 1, 'id': 5});
    });

    const videoBidRequests = [{
      'bidder': 'sortable',
      'params': {
        'tagId': '403370',
        'siteId': 'example.com',
        'video': {
          'minduration': 5,
          'maxduration': 10,
          'startdelay': 0
        }
      },
      'bidId': '30b31c1838de1e',
      'bidderRequestId': '22edbae2733bf6',
      'auctionId': '1d1a030790a475',
      'mediaTypes': {
        'video': {
          'context': 'instream',
          'mimes': ['video/x-ms-wmv'],
          'playerSize': [[400, 300]],
          'api': [0],
          'protocols': [2, 3],
          'playbackmethod': [1]
        }
      }
    }];

    const videoRequest = spec.buildRequests(videoBidRequests, {refererInfo: { referer: 'http://localhost:9876/' }});
    const videoRequestBody = JSON.parse(videoRequest.data);

    it('should include video params', () => {
      const video = videoRequestBody.imp[0].video;
      expect(video.mimes).to.deep.equal(['video/x-ms-wmv']);
      expect(video.w).to.equal(400);
      expect(video.h).to.equal(300);
      expect(video.api).to.deep.equal([0]);
      expect(video.protocols).to.deep.equal([2, 3]);
      expect(video.playbackmethod).to.deep.equal([1]);
      expect(video.minduration).to.equal(5);
      expect(video.maxduration).to.equal(10);
      expect(video.startdelay).to.equal(0);
    });

    it('sets domain and href correctly', function () {
      expect(videoRequestBody.site.domain).to.equal('localhost');
      expect(videoRequestBody.site.page).to.equal('http://localhost:9876/');
    });

    const gdprBidRequests = [{
      'bidder': 'sortable',
      'params': {
        'tagId': '403370',
        'siteId': 'example.com',
        'floor': 0.21,
        'keywords': {},
        'floorSizeMap': {}
      },
      'sizes': [
        [300, 250]
      ],
      'bidId': '30b31c1838de1e',
      'bidderRequestId': '22edbae2733bf6',
      'auctionId': '1d1a030790a475'
    }];
    const consentString = 'BOJ/P2HOJ/P2HABABMAAAAAZ+A==';

    function getGdprRequestBody(gdprApplies, consentString) {
      const gdprRequest = spec.buildRequests(gdprBidRequests, {'gdprConsent': {
        'gdprApplies': gdprApplies,
        'consentString': consentString
      },
      refererInfo: {
        referer: 'http://localhost:9876/'
      }});
      return JSON.parse(gdprRequest.data);
    }

    it('should handle gdprApplies being present and true', function() {
      const gdprRequestBody = getGdprRequestBody(true, consentString);
      expect(gdprRequestBody.regs.ext.gdpr).to.equal(1);
      expect(gdprRequestBody.user.ext.consent).to.equal(consentString);
    })

    it('should handle gdprApplies being present and false', function() {
      const gdprRequestBody = getGdprRequestBody(false, consentString);
      expect(gdprRequestBody.regs.ext.gdpr).to.equal(0);
      expect(gdprRequestBody.user.ext.consent).to.equal(consentString);
    })

    it('should handle gdprApplies being undefined', function() {
      const gdprRequestBody = getGdprRequestBody(undefined, consentString);
      expect(gdprRequestBody.regs).to.deep.equal({ext: {}});
      expect(gdprRequestBody.user.ext.consent).to.equal(consentString);
    })

    it('should handle gdprConsent being undefined', function() {
      const gdprRequest = spec.buildRequests(gdprBidRequests, {refererInfo: { referer: 'http://localhost:9876/' }});
      const gdprRequestBody = JSON.parse(gdprRequest.data);
      expect(gdprRequestBody.regs).to.deep.equal({ext: {}});
      expect(gdprRequestBody.user).to.equal(undefined);
    })
  });

  describe('interpretResponse', function () {
    function makeResponse() {
      return {
        body: {
          'id': '5e5c23a5ba71e78',
          'seatbid': [
            {
              'bid': [
                {
                  'id': '6vmb3isptf',
                  'crid': 'sortablescreative',
                  'impid': '322add653672f68',
                  'price': 1.22,
                  'adm': '<!-- creative -->',
                  'attr': [5],
                  'h': 90,
                  'nurl': 'http://nurl',
                  'w': 728
                }
              ],
              'seat': 'MOCK'
            }
          ],
          'bidid': '5e5c23a5ba71e78'
        }
      };
    }

    function makeNativeResponse() {
      return {
        body: {
          'id': '5e5c23a5ba71e77',
          'seatbid': [
            {
              'bid': [
                {
                  'id': '6vmb3isptf',
                  'crid': 'sortablescreative',
                  'impid': '322add653672f67',
                  'price': 1.55,
                  'adm': '{"native":{"link":{"clicktrackers":[],"url":"https://www.sortable.com/"},"assets":[{"title":{"text":"Ads With Sortable"},"id":1},{"img":{"w":790,"url":"https://path.to/image","h":294},"id":2},{"img":{"url":"https://path.to/icon"},"id":3},{"data":{"value":"Body here"},"id":4},{"data":{"value":"Learn More"},"id":5},{"data":{"value":"Sortable"},"id":6}],"imptrackers":[],"ver":1}}',
                  'ext': {'ad_format': 'native'},
                  'h': 90,
                  'nurl': 'http://nurl',
                  'w': 728
                }
              ],
              'seat': 'MOCK'
            }
          ],
          'bidid': '5e5c23a5ba71e77'
        }
      };
    }

    const expectedBid = {
      'requestId': '322add653672f68',
      'cpm': 1.22,
      'width': 728,
      'height': 90,
      'creativeId': 'sortablescreative',
      'dealId': null,
      'currency': 'USD',
      'netRevenue': true,
      'mediaType': 'banner',
      'ttl': 60,
      'ad': '<!-- creative --><div style="position:absolute;left:0px;top:0px;visibility:hidden;"><img src="http://nurl"></div>'
    };

    const expectedNativeBid = {
      'requestId': '322add653672f67',
      'cpm': 1.55,
      'width': 728,
      'height': 90,
      'creativeId': 'sortablescreative',
      'dealId': null,
      'currency': 'USD',
      'netRevenue': true,
      'sortable': { 'ad_format': 'native' },
      'mediaType': 'native',
      'ttl': 60,
      'native': {
        'clickUrl': 'https://www.sortable.com/',
        'title': 'Ads With Sortable',
        'image': {'url': 'https://path.to/image', 'height': 294, 'width': 790},
        'icon': 'https://path.to/icon',
        'body': 'Body here',
        'cta': 'Learn More',
        'sponsoredBy': 'Sortable'
      }
    };

    it('should get the correct bid response', function () {
      let result = spec.interpretResponse(makeResponse());
      expect(result.length).to.equal(1);
      expect(result[0]).to.deep.equal(expectedBid);
    });

    it('should handle a missing crid', function () {
      let noCridResponse = makeResponse();
      delete noCridResponse.body.seatbid[0].bid[0].crid;
      const fallbackCrid = noCridResponse.body.seatbid[0].bid[0].id;
      let noCridResult = Object.assign({}, expectedBid, {'creativeId': fallbackCrid});
      let result = spec.interpretResponse(noCridResponse);
      expect(result.length).to.equal(1);
      expect(result[0]).to.deep.equal(noCridResult);
    });

    it('should handle a missing nurl', function () {
      let noNurlResponse = makeResponse();
      delete noNurlResponse.body.seatbid[0].bid[0].nurl;
      let noNurlResult = Object.assign({}, expectedBid);
      noNurlResult.ad = '<!-- creative -->';
      let result = spec.interpretResponse(noNurlResponse);
      expect(result.length).to.equal(1);
      expect(result[0]).to.deep.equal(noNurlResult);
    });

    it('should handle a missing adm', function () {
      let noAdmResponse = makeResponse();
      delete noAdmResponse.body.seatbid[0].bid[0].adm;
      let noAdmResult = Object.assign({}, expectedBid);
      delete noAdmResult.ad;
      noAdmResult.adUrl = 'http://nurl';
      let result = spec.interpretResponse(noAdmResponse);
      expect(result.length).to.equal(1);
      expect(result[0]).to.deep.equal(noAdmResult);
    });

    it('handles empty bid response', function () {
      let response = {
        body: {
          'id': '5e5c23a5ba71e78',
          'seatbid': []
        }
      };
      let result = spec.interpretResponse(response);
      expect(result.length).to.equal(0);
    });

    it('should get the correct native bid response', function () {
      let result = spec.interpretResponse(makeNativeResponse());
      expect(result.length).to.equal(1);
      expect(result[0]).to.deep.equal(expectedNativeBid);
    });

    it('fail to parse invalid native bid response', function () {
      let response = makeNativeResponse();
      response.body.seatbid[0].bid[0].adm = '<!-- creative -->';
      let result = spec.interpretResponse(response);
      expect(result.length).to.equal(0);
    });

    it('should keep custom properties', () => {
      const customProperties = {test: 'a test message', param: {testParam: 1}};
      const expectedResult = Object.assign({}, expectedBid, {[spec.code]: customProperties});
      const response = makeResponse();
      response.body.seatbid[0].bid[0].ext = customProperties;
      const result = spec.interpretResponse(response);
      expect(result.length).to.equal(1);
      expect(result[0]).to.deep.equal(expectedResult);
    });

    it('should handle instream response', () => {
      const response = makeResponse();
      const bid = response.body.seatbid[0].bid[0];
      delete bid.nurl;
      bid.ext = {ad_format: 'instream'};
      const result = spec.interpretResponse(response)[0];
      expect(result.mediaType).to.equal('video');
      expect(result.vastXml).to.equal(bid.adm);
    });

    it('should return iframe syncs', () => {
      const syncResponse = {
        ext: {
          sync_dsps: [
            ['iframe', 'http://example-dsp/sync-iframe'],
            ['image', 'http://example-dsp/sync-image']
          ]
        }
      };
      expect(spec.getUserSyncs({iframeEnabled: true}, [{body: syncResponse}])).to.deep.equal([{
        type: 'iframe',
        url: 'http://example-dsp/sync-iframe'
      }]);
    });

    it('should return image syncs', () => {
      const syncResponse = {
        ext: {
          sync_dsps: [
            ['iframe', 'http://example-dsp/sync-iframe'],
            ['image', 'http://example-dsp/sync-image']
          ]
        }
      };
      expect(spec.getUserSyncs({pixelEnabled: true}, [{body: syncResponse}])).to.deep.equal([{
        type: 'image',
        url: 'http://example-dsp/sync-image'
      }]);
    });
  });
});
