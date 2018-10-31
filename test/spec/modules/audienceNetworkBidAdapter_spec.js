/**
 * @file Tests for AudienceNetwork adapter.
 */
import { expect } from 'chai';

import { spec } from 'modules/audienceNetworkBidAdapter';
import * as utils from 'src/utils';

const {
  code,
  supportedMediaTypes,
  isBidRequestValid,
  buildRequests,
  interpretResponse
} = spec;

const bidder = 'audienceNetwork';
const placementId = 'test-placement-id';
const playerwidth = 320;
const playerheight = 180;
const requestId = 'test-request-id';
const debug = 'adapterver=1.1.0&platform=241394079772386&platver=$prebid.version$&cb=test-uuid';
const pageUrl = encodeURIComponent(utils.getTopWindowUrl());

describe('AudienceNetwork adapter', function () {
  describe('Public API', function () {
    it('code', function () {
      expect(code).to.equal(bidder);
    });
    it('supportedMediaTypes', function () {
      expect(supportedMediaTypes).to.deep.equal(['banner', 'video']);
    });
    it('isBidRequestValid', function () {
      expect(isBidRequestValid).to.be.a('function');
    });
    it('buildRequests', function () {
      expect(buildRequests).to.be.a('function');
    });
    it('interpretResponse', function () {
      expect(interpretResponse).to.be.a('function');
    });
  });

  describe('isBidRequestValid', function () {
    it('missing placementId parameter', function () {
      expect(isBidRequestValid({
        bidder,
        sizes: [[300, 250]]
      })).to.equal(false);
    });

    it('invalid sizes parameter', function () {
      expect(isBidRequestValid({
        bidder,
        sizes: ['', undefined, null, '300x100', [300, 100], [300], {}],
        params: { placementId }
      })).to.equal(false);
    });

    it('valid when at least one valid size', function () {
      expect(isBidRequestValid({
        bidder,
        sizes: [[1, 1], [300, 250]],
        params: { placementId }
      })).to.equal(true);
    });

    it('valid parameters', function () {
      expect(isBidRequestValid({
        bidder,
        sizes: [[300, 250], [320, 50]],
        params: { placementId }
      })).to.equal(true);
    });

    it('fullwidth', function () {
      expect(isBidRequestValid({
        bidder,
        sizes: [[300, 250], [336, 280]],
        params: {
          placementId,
          format: 'fullwidth'
        }
      })).to.equal(true);
    });

    it('native', function () {
      expect(isBidRequestValid({
        bidder,
        sizes: [[300, 250]],
        params: {
          placementId,
          format: 'native'
        }
      })).to.equal(true);
    });

    it('native with non-IAB size', function () {
      expect(isBidRequestValid({
        bidder,
        sizes: [[728, 90]],
        params: {
          placementId,
          format: 'native'
        }
      })).to.equal(true);
    });

    it('video', function () {
      expect(isBidRequestValid({
        bidder,
        sizes: [[playerwidth, playerheight]],
        params: {
          placementId,
          format: 'video'
        }
      })).to.equal(true);
    });
  });

  describe('buildRequests', function () {
    before(function () {
      sinon
        .stub(utils, 'generateUUID')
        .returns('test-uuid');
    });

    after(function () {
      utils.generateUUID.restore();
    });

    it('can build URL for IAB unit', function () {
      expect(buildRequests([{
        bidder,
        bidId: requestId,
        sizes: [[300, 50], [300, 250], [320, 50]],
        params: { placementId }
      }])).to.deep.equal([{
        adformats: ['300x250'],
        method: 'GET',
        requestIds: [requestId],
        sizes: ['300x250'],
        url: 'https://an.facebook.com/v2/placementbid.json',
        data: `placementids[]=test-placement-id&adformats[]=300x250&testmode=false&pageurl=${pageUrl}&sdk[]=5.5.web&${debug}`
      }]);
    });

    it('can build URL for video unit', function () {
      expect(buildRequests([{
        bidder,
        bidId: requestId,
        sizes: [[640, 480]],
        params: {
          placementId,
          format: 'video'
        }
      }])).to.deep.equal([{
        adformats: ['video'],
        method: 'GET',
        requestIds: [requestId],
        sizes: ['640x480'],
        url: 'https://an.facebook.com/v2/placementbid.json',
        data: `placementids[]=test-placement-id&adformats[]=video&testmode=false&pageurl=${pageUrl}&sdk[]=&${debug}&playerwidth=640&playerheight=480`
      }]);
    });

    it('can build URL for native unit in non-IAB size', function () {
      expect(buildRequests([{
        bidder,
        bidId: requestId,
        sizes: [[728, 90]],
        params: {
          placementId,
          format: 'native'
        }
      }])).to.deep.equal([{
        adformats: ['native'],
        method: 'GET',
        requestIds: [requestId],
        sizes: ['728x90'],
        url: 'https://an.facebook.com/v2/placementbid.json',
        data: `placementids[]=test-placement-id&adformats[]=native&testmode=false&pageurl=${pageUrl}&sdk[]=5.5.web&${debug}`
      }]);
    });

    it('can build URL for deprecated fullwidth unit, overriding platform', function () {
      const platform = 'test-platform';
      const debugPlatform = debug.replace('241394079772386', platform);

      expect(buildRequests([{
        bidder,
        bidId: requestId,
        sizes: [[300, 250]],
        params: {
          placementId,
          platform,
          format: 'fullwidth'
        }
      }])).to.deep.equal([{
        adformats: ['300x250'],
        method: 'GET',
        requestIds: [requestId],
        sizes: ['300x250'],
        url: 'https://an.facebook.com/v2/placementbid.json',
        data: `placementids[]=test-placement-id&adformats[]=300x250&testmode=false&pageurl=${pageUrl}&sdk[]=5.5.web&${debugPlatform}`
      }]);
    });
  });

  describe('interpretResponse', function () {
    it('error in response', function () {
      expect(interpretResponse({
        body: {
          errors: ['test-error-message']
        }
      }, {})).to.deep.equal([]);
    });

    it('valid native bid in response', function () {
      const [bidResponse] = interpretResponse({
        body: {
          errors: [],
          bids: {
            [placementId]: [{
              placement_id: placementId,
              bid_id: 'test-bid-id',
              bid_price_cents: 123,
              bid_price_currency: 'usd',
              bid_price_model: 'cpm'
            }]
          }
        }
      }, {
        adformats: ['native'],
        requestIds: [requestId],
        sizes: [[300, 250]]
      });

      expect(bidResponse.cpm).to.equal(1.23);
      expect(bidResponse.requestId).to.equal(requestId);
      expect(bidResponse.width).to.equal(300);
      expect(bidResponse.height).to.equal(250);
      expect(bidResponse.ad)
        .to.contain(`placementid:'${placementId}',format:'native',bidid:'test-bid-id'`, 'ad missing parameters')
        .and.to.contain('getElementsByTagName("style")', 'ad missing native styles')
        .and.to.contain('<div class="thirdPartyRoot"><a class="fbAdLink">', 'ad missing native container');
      expect(bidResponse.ttl).to.equal(600);
      expect(bidResponse.creativeId).to.equal(placementId);
      expect(bidResponse.netRevenue).to.equal(true);
      expect(bidResponse.currency).to.equal('USD');

      expect(bidResponse.hb_bidder).to.equal('fan');
      expect(bidResponse.fb_bidid).to.equal('test-bid-id');
      expect(bidResponse.fb_format).to.equal('native');
      expect(bidResponse.fb_placementid).to.equal(placementId);
    });

    it('valid IAB bid in response', function () {
      const [bidResponse] = interpretResponse({
        body: {
          errors: [],
          bids: {
            [placementId]: [{
              placement_id: placementId,
              bid_id: 'test-bid-id',
              bid_price_cents: 123,
              bid_price_currency: 'usd',
              bid_price_model: 'cpm'
            }]
          }
        }
      }, {
        adformats: ['300x250'],
        requestIds: [requestId],
        sizes: [[300, 250]]
      });

      expect(bidResponse.cpm).to.equal(1.23);
      expect(bidResponse.requestId).to.equal(requestId);
      expect(bidResponse.width).to.equal(300);
      expect(bidResponse.height).to.equal(250);
      expect(bidResponse.ad)
        .to.contain(`placementid:'${placementId}',format:'300x250',bidid:'test-bid-id'`, 'ad missing parameters')
        .and.not.to.contain('getElementsByTagName("style")', 'ad should not contain native styles')
        .and.not.to.contain('<div class="thirdPartyRoot"><a class="fbAdLink">', 'ad should not contain native container');
      expect(bidResponse.ttl).to.equal(600);
      expect(bidResponse.creativeId).to.equal(placementId);
      expect(bidResponse.netRevenue).to.equal(true);
      expect(bidResponse.currency).to.equal('USD');
      expect(bidResponse.hb_bidder).to.equal('fan');
      expect(bidResponse.fb_bidid).to.equal('test-bid-id');
      expect(bidResponse.fb_format).to.equal('300x250');
      expect(bidResponse.fb_placementid).to.equal(placementId);
    });

    it('filters invalid slot sizes', function () {
      const [bidResponse] = interpretResponse({
        body: {
          errors: [],
          bids: {
            [placementId]: [{
              placement_id: placementId,
              bid_id: 'test-bid-id',
              bid_price_cents: 123,
              bid_price_currency: 'usd',
              bid_price_model: 'cpm'
            }]
          }
        }
      }, {
        adformats: ['300x250'],
        requestIds: [requestId],
        sizes: [[300, 250]]
      });

      expect(bidResponse.cpm).to.equal(1.23);
      expect(bidResponse.requestId).to.equal(requestId);
      expect(bidResponse.width).to.equal(300);
      expect(bidResponse.height).to.equal(250);
      expect(bidResponse.ttl).to.equal(600);
      expect(bidResponse.creativeId).to.equal(placementId);
      expect(bidResponse.netRevenue).to.equal(true);
      expect(bidResponse.currency).to.equal('USD');
      expect(bidResponse.hb_bidder).to.equal('fan');
      expect(bidResponse.fb_bidid).to.equal('test-bid-id');
      expect(bidResponse.fb_format).to.equal('300x250');
      expect(bidResponse.fb_placementid).to.equal(placementId);
    });

    it('valid multiple bids in response', function () {
      const placementIdNative = 'test-placement-id-native';
      const placementIdIab = 'test-placement-id-iab';

      const [bidResponseNative, bidResponseIab] = interpretResponse({
        body: {
          errors: [],
          bids: {
            [placementIdNative]: [{
              placement_id: placementIdNative,
              bid_id: 'test-bid-id-native',
              bid_price_cents: 123,
              bid_price_currency: 'usd',
              bid_price_model: 'cpm'
            }],
            [placementIdIab]: [{
              placement_id: placementIdIab,
              bid_id: 'test-bid-id-iab',
              bid_price_cents: 456,
              bid_price_currency: 'usd',
              bid_price_model: 'cpm'
            }]
          }
        }
      }, {
        adformats: ['native', '300x250'],
        requestIds: [requestId, requestId],
        sizes: ['300x250', [300, 250]]
      });

      expect(bidResponseNative.cpm).to.equal(1.23);
      expect(bidResponseNative.requestId).to.equal(requestId);
      expect(bidResponseNative.width).to.equal(300);
      expect(bidResponseNative.height).to.equal(250);
      expect(bidResponseNative.ad).to.contain(`placementid:'${placementIdNative}',format:'native',bidid:'test-bid-id-native'`, 'ad missing parameters');
      expect(bidResponseNative.ttl).to.equal(600);
      expect(bidResponseNative.creativeId).to.equal(placementIdNative);
      expect(bidResponseNative.netRevenue).to.equal(true);
      expect(bidResponseNative.currency).to.equal('USD');
      expect(bidResponseNative.hb_bidder).to.equal('fan');
      expect(bidResponseNative.fb_bidid).to.equal('test-bid-id-native');
      expect(bidResponseNative.fb_format).to.equal('native');
      expect(bidResponseNative.fb_placementid).to.equal(placementIdNative);

      expect(bidResponseIab.cpm).to.equal(4.56);
      expect(bidResponseIab.requestId).to.equal(requestId);
      expect(bidResponseIab.width).to.equal(300);
      expect(bidResponseIab.height).to.equal(250);
      expect(bidResponseIab.ad).to.contain(`placementid:'${placementIdIab}',format:'300x250',bidid:'test-bid-id-iab'`, 'ad missing parameters');
      expect(bidResponseIab.ttl).to.equal(600);
      expect(bidResponseIab.creativeId).to.equal(placementIdIab);
      expect(bidResponseIab.netRevenue).to.equal(true);
      expect(bidResponseIab.currency).to.equal('USD');
      expect(bidResponseIab.hb_bidder).to.equal('fan');
      expect(bidResponseIab.fb_bidid).to.equal('test-bid-id-iab');
      expect(bidResponseIab.fb_format).to.equal('300x250');
      expect(bidResponseIab.fb_placementid).to.equal(placementIdIab);
    });

    it('valid video bid in response', function () {
      const bidId = 'test-bid-id-video';

      const [bidResponse] = interpretResponse({
        body: {
          errors: [],
          bids: {
            [placementId]: [{
              placement_id: placementId,
              bid_id: bidId,
              bid_price_cents: 123,
              bid_price_currency: 'usd',
              bid_price_model: 'cpm'
            }]
          }
        }
      }, {
        adformats: ['video'],
        requestIds: [requestId],
        sizes: [[playerwidth, playerheight]]
      });

      expect(bidResponse.cpm).to.equal(1.23);
      expect(bidResponse.requestId).to.equal(requestId);
      expect(bidResponse.ttl).to.equal(3600);
      expect(bidResponse.mediaType).to.equal('video');
      expect(bidResponse.vastUrl).to.equal(`https://an.facebook.com/v1/instream/vast.xml?placementid=${placementId}&pageurl=${pageUrl}&playerwidth=${playerwidth}&playerheight=${playerheight}&bidid=${bidId}`);
      expect(bidResponse.width).to.equal(playerwidth);
      expect(bidResponse.height).to.equal(playerheight);
    });

    it('mixed video and native bids', function () {
      const videoPlacementId = 'test-video-placement-id';
      const videoBidId = 'test-video-bid-id';
      const nativePlacementId = 'test-native-placement-id';
      const nativeBidId = 'test-native-bid-id';

      const [bidResponseVideo, bidResponseNative] = interpretResponse({
        body: {
          errors: [],
          bids: {
            [videoPlacementId]: [{
              placement_id: videoPlacementId,
              bid_id: videoBidId,
              bid_price_cents: 123,
              bid_price_currency: 'usd',
              bid_price_model: 'cpm'
            }],
            [nativePlacementId]: [{
              placement_id: nativePlacementId,
              bid_id: nativeBidId,
              bid_price_cents: 456,
              bid_price_currency: 'usd',
              bid_price_model: 'cpm'
            }]
          }
        }
      }, {
        adformats: ['video', 'native'],
        requestIds: [requestId, requestId],
        sizes: [[playerwidth, playerheight], [300, 250]]
      });

      expect(bidResponseVideo.cpm).to.equal(1.23);
      expect(bidResponseVideo.requestId).to.equal(requestId);
      expect(bidResponseVideo.ttl).to.equal(3600);
      expect(bidResponseVideo.mediaType).to.equal('video');
      expect(bidResponseVideo.vastUrl).to.equal(`https://an.facebook.com/v1/instream/vast.xml?placementid=${videoPlacementId}&pageurl=${pageUrl}&playerwidth=${playerwidth}&playerheight=${playerheight}&bidid=${videoBidId}`);
      expect(bidResponseVideo.width).to.equal(playerwidth);
      expect(bidResponseVideo.height).to.equal(playerheight);

      expect(bidResponseNative.cpm).to.equal(4.56);
      expect(bidResponseNative.requestId).to.equal(requestId);
      expect(bidResponseNative.ttl).to.equal(600);
      expect(bidResponseNative.width).to.equal(300);
      expect(bidResponseNative.height).to.equal(250);
      expect(bidResponseNative.ad).to.contain(`placementid:'${nativePlacementId}',format:'native',bidid:'${nativeBidId}'`);
    });

    it('mixture of valid native bid and error in response', function () {
      const [bidResponse] = interpretResponse({
        body: {
          errors: ['test-error-message'],
          bids: {
            [placementId]: [{
              placement_id: placementId,
              bid_id: 'test-bid-id',
              bid_price_cents: 123,
              bid_price_currency: 'usd',
              bid_price_model: 'cpm'
            }]
          }
        }
      }, {
        adformats: ['native'],
        requestIds: [requestId],
        sizes: [[300, 250]]
      });

      expect(bidResponse.cpm).to.equal(1.23);
      expect(bidResponse.requestId).to.equal(requestId);
      expect(bidResponse.width).to.equal(300);
      expect(bidResponse.height).to.equal(250);
      expect(bidResponse.ad)
        .to.contain(`placementid:'${placementId}',format:'native',bidid:'test-bid-id'`, 'ad missing parameters')
        .and.to.contain('getElementsByTagName("style")', 'ad missing native styles')
        .and.to.contain('<div class="thirdPartyRoot"><a class="fbAdLink">', 'ad missing native container');
      expect(bidResponse.ttl).to.equal(600);
      expect(bidResponse.creativeId).to.equal(placementId);
      expect(bidResponse.netRevenue).to.equal(true);
      expect(bidResponse.currency).to.equal('USD');

      expect(bidResponse.hb_bidder).to.equal('fan');
      expect(bidResponse.fb_bidid).to.equal('test-bid-id');
      expect(bidResponse.fb_format).to.equal('native');
      expect(bidResponse.fb_placementid).to.equal(placementId);
    });
  });
});
