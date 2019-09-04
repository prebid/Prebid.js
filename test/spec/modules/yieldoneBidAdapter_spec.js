import { expect } from 'chai';
import { spec } from 'modules/yieldoneBidAdapter';
import { newBidder } from 'src/adapters/bidderFactory';

const ENDPOINT = 'https://y.one.impact-ad.jp/h_bid';
const USER_SYNC_URL = 'https://y.one.impact-ad.jp/push_sync';
const VIDEO_PLAYER_URL = 'https://img.ak.impact-ad.jp/ic/pone/ivt/firstview/js/dac-video-prebid.min.js';

describe('yieldoneBidAdapter', function() {
  const adapter = newBidder(spec);

  describe('isBidRequestValid', function () {
    let bid = {
      'bidder': 'yieldone',
      'params': {
        placementId: '36891'
      },
      'adUnitCode': 'adunit-code',
      'sizes': [[300, 250], [336, 280]],
      'bidId': '23beaa6af6cdde',
      'bidderRequestId': '19c0c1efdf37e7',
      'auctionId': '61466567-d482-4a16-96f0-fe5f25ffbdf1',
    };

    it('should return true when required params found', function () {
      expect(spec.isBidRequestValid(bid)).to.equal(true);
    });

    it('should return false when placementId not passed correctly', function () {
      bid.params.placementId = '';
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });

    it('should return false when require params are not passed', function () {
      let bid = Object.assign({}, bid);
      bid.params = {};
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });
  });

  describe('buildRequests', function () {
    let bidRequests = [
      {
        'bidder': 'yieldone',
        'params': {
          placementId: '36891'
        },
        'adUnitCode': 'adunit-code1',
        'sizes': [[300, 250], [336, 280]],
        'bidId': '23beaa6af6cdde',
        'bidderRequestId': '19c0c1efdf37e7',
        'auctionId': '61466567-d482-4a16-96f0-fe5f25ffbdf1',
      },
      {
        'bidder': 'yieldone',
        'params': {
          placementId: '47919'
        },
        'adUnitCode': 'adunit-code2',
        'sizes': [[300, 250]],
        'bidId': '382091349b149f"',
        'bidderRequestId': '"1f9c98192de251"',
        'auctionId': '61466567-d482-4a16-96f0-fe5f25ffbdf1',
      }
    ];

    const request = spec.buildRequests(bidRequests);

    it('sends bid request to our endpoint via GET', function () {
      expect(request[0].method).to.equal('GET');
      expect(request[1].method).to.equal('GET');
    });

    it('attaches source and version to endpoint URL as query params', function () {
      expect(request[0].url).to.equal(ENDPOINT);
      expect(request[1].url).to.equal(ENDPOINT);
    });

    it('parameter sz has more than one size on banner requests', function () {
      expect(request[0].data.sz).to.equal('300x250,336x280');
      expect(request[1].data.sz).to.equal('300x250');
    });

    it('width and height should be set as separate parameters on outstream requests', function () {
      const bidRequest = Object.assign({}, bidRequests[0]);
      bidRequest.mediaTypes = {};
      bidRequest.mediaTypes.video = {context: 'outstream'};
      const request = spec.buildRequests([bidRequest]);
      expect(request[0].data.w).to.equal('300');
      expect(request[0].data.h).to.equal('250');
    });

    it('adUnitCode should be sent as uc parameters on any requests', function () {
      expect(request[0].data.uc).to.equal('adunit-code1');
      expect(request[1].data.uc).to.equal('adunit-code2');
    });
  });

  describe('interpretResponse', function () {
    let bidRequestBanner = [
      {
        'method': 'GET',
        'url': 'https://y.one.impact-ad.jp/h_bid',
        'data': {
          'v': 'hb1',
          'p': '36891',
          'sz': '300x250,336x280',
          'cb': 12892917383,
          'r': 'http%3A%2F%2Flocalhost%3A9876%2F%3Fid%3D74552836',
          'uid': '23beaa6af6cdde',
          't': 'i'
        }
      }
    ];

    let serverResponseBanner = {
      body: {
        'adTag': '<!-- adtag -->',
        'uid': '23beaa6af6cdde',
        'height': 250,
        'width': 300,
        'cpm': 0.0536616,
        'crid': '2494768',
        'currency': 'JPY',
        'statusMessage': 'Bid available',
        'dealId': 'P1-FIX-7800-DSP-MON'
      }
    };

    it('should get the correct bid response for banner', function () {
      let expectedResponse = [{
        'requestId': '23beaa6af6cdde',
        'cpm': 53.6616,
        'width': 300,
        'height': 250,
        'creativeId': '2494768',
        'dealId': 'P1-FIX-7800-DSP-MON',
        'currency': 'JPY',
        'netRevenue': true,
        'ttl': 3000,
        'referrer': '',
        'mediaType': 'banner',
        'ad': '<!-- adtag -->'
      }];
      let result = spec.interpretResponse(serverResponseBanner, bidRequestBanner[0]);
      expect(Object.keys(result[0])).to.deep.equal(Object.keys(expectedResponse[0]));
      expect(result[0].mediaType).to.equal(expectedResponse[0].mediaType);
    });

    let serverResponseVideo = {
      body: {
        'uid': '23beaa6af6cdde',
        'height': 360,
        'width': 640,
        'cpm': 0.0536616,
        'dealId': 'P1-FIX-766-DSP-MON',
        'crid': '2494768',
        'currency': 'JPY',
        'statusMessage': 'Bid available',
        'adm': '<!-- vast -->'
      }
    };

    let bidRequestVideo = [
      {
        'method': 'GET',
        'url': 'https://y.one.impact-ad.jp/h_bid',
        'data': {
          'v': 'hb1',
          'p': '41993',
          'w': '640',
          'h': '360',
          'cb': 12892917383,
          'r': 'http%3A%2F%2Flocalhost%3A9876%2F%3Fid%3D74552836',
          'uid': '23beaa6af6cdde',
          't': 'i'
        }
      }
    ];

    it('should get the correct bid response for video', function () {
      let expectedResponse = [{
        'requestId': '23beaa6af6cdde',
        'cpm': 53.6616,
        'width': 640,
        'height': 360,
        'creativeId': '2494768',
        'dealId': 'P1-FIX-7800-DSP-MON',
        'currency': 'JPY',
        'netRevenue': true,
        'ttl': 3000,
        'referrer': '',
        'mediaType': 'video',
        'vastXml': '<!-- vast -->',
        'renderer': {
          id: '23beaa6af6cdde',
          url: VIDEO_PLAYER_URL
        }
      }];
      let result = spec.interpretResponse(serverResponseVideo, bidRequestVideo[0]);
      expect(Object.keys(result[0])).to.deep.equal(Object.keys(expectedResponse[0]));
      expect(result[0].mediaType).to.equal(expectedResponse[0].mediaType);
      expect(result[0].renderer.id).to.equal(expectedResponse[0].renderer.id);
      expect(result[0].renderer.url).to.equal(expectedResponse[0].renderer.url);
    });

    it('handles empty bid response', function () {
      let response = {
        body: {
          'uid': '2c0b634db95a01',
          'height': 0,
          'crid': '',
          'statusMessage': 'Bid returned empty or error response',
          'width': 0,
          'cpm': 0
        }
      };
      let result = spec.interpretResponse(response, bidRequestBanner[0]);
      expect(result.length).to.equal(0);
    });
  });

  describe('getUserSyncs', function () {
    it('handles empty sync options', function () {
      expect(spec.getUserSyncs({})).to.be.undefined;
    });

    it('should return a sync url if iframe syncs are enabled', function () {
      expect(spec.getUserSyncs({
        'iframeEnabled': true
      })).to.deep.equal([{
        type: 'iframe', url: USER_SYNC_URL
      }]);
    });
  });
});
