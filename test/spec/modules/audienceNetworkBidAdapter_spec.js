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
const pbv = '$prebid.version$';
const pageUrl = encodeURIComponent(utils.getTopWindowUrl());

describe('AudienceNetwork adapter', () => {
  describe('Public API', () => {
    it('code', () => {
      expect(code).to.equal(bidder);
    });
    it('supportedMediaTypes', () => {
      expect(supportedMediaTypes).to.deep.equal(['banner', 'video']);
    });
    it('isBidRequestValid', () => {
      expect(isBidRequestValid).to.be.a('function');
    });
    it('buildRequests', () => {
      expect(buildRequests).to.be.a('function');
    });
    it('interpretResponse', () => {
      expect(interpretResponse).to.be.a('function');
    });
  });

  describe('isBidRequestValid', () => {
    it('missing placementId parameter', () => {
      expect(isBidRequestValid({
        bidder,
        sizes: [[300, 250]]
      })).to.equal(false);
    });

    it('invalid sizes parameter', () => {
      expect(isBidRequestValid({
        bidder,
        sizes: ['', undefined, null, '300x100', [300, 100], [300], {}],
        params: { placementId }
      })).to.equal(false);
    });

    it('valid when at least one valid size', () => {
      expect(isBidRequestValid({
        bidder,
        sizes: [[1, 1], [300, 250]],
        params: { placementId }
      })).to.equal(true);
    });

    it('valid parameters', () => {
      expect(isBidRequestValid({
        bidder,
        sizes: [[300, 250], [320, 50]],
        params: { placementId }
      })).to.equal(true);
    });

    it('fullwidth', () => {
      expect(isBidRequestValid({
        bidder,
        sizes: [[300, 250], [336, 280]],
        params: {
          placementId,
          format: 'fullwidth'
        }
      })).to.equal(true);
    });

    it('native', () => {
      expect(isBidRequestValid({
        bidder,
        sizes: [[300, 250]],
        params: {
          placementId,
          format: 'native'
        }
      })).to.equal(true);
    });

    it('native with non-IAB size', () => {
      expect(isBidRequestValid({
        bidder,
        sizes: [[728, 90]],
        params: {
          placementId,
          format: 'native'
        }
      })).to.equal(true);
    });

    it('video', () => {
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

  describe('buildRequests', () => {
    let isSafariBrowserStub;
    before(() => {
      isSafariBrowserStub = sinon.stub(utils, 'isSafariBrowser');
    });

    after(() => {
      isSafariBrowserStub.restore();
    });

    it('can build URL for IAB unit', () => {
      expect(buildRequests([{
        bidder,
        bidId: requestId,
        sizes: [[300, 250], [320, 50]],
        params: { placementId }
      }])).to.deep.equal([{
        adformats: ['300x250'],
        method: 'GET',
        requestIds: [requestId],
        sizes: ['300x250'],
        url: 'https://an.facebook.com/v2/placementbid.json',
        data: `placementids[]=test-placement-id&adformats[]=300x250&testmode=false&pageurl=${pageUrl}&sdk[]=5.5.web&pbv=${pbv}`
      }]);
    });

    it('can build URL for video unit', () => {
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
        data: `placementids[]=test-placement-id&adformats[]=video&testmode=false&pageurl=${pageUrl}&sdk[]=&pbv=${pbv}&playerwidth=640&playerheight=480`
      }]);
    });

    it('can build URL for native unit in non-IAB size', () => {
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
        data: `placementids[]=test-placement-id&adformats[]=native&testmode=false&pageurl=${pageUrl}&sdk[]=5.5.web&pbv=${pbv}`
      }]);
    });

    it('can build URL for fullwidth 300x250 unit', () => {
      expect(buildRequests([{
        bidder,
        bidId: requestId,
        sizes: [[300, 250]],
        params: {
          placementId,
          format: 'fullwidth'
        }
      }])).to.deep.equal([{
        adformats: ['fullwidth'],
        method: 'GET',
        requestIds: [requestId],
        sizes: ['300x250'],
        url: 'https://an.facebook.com/v2/placementbid.json',
        data: `placementids[]=test-placement-id&adformats[]=fullwidth&testmode=false&pageurl=${pageUrl}&sdk[]=5.5.web&pbv=${pbv}`
      }]);
    });

    it('can build URL on Safari that includes a cachebuster param', () => {
      isSafariBrowserStub.returns(true);
      expect(buildRequests([{
        bidder,
        bidId: requestId,
        sizes: [[300, 250]],
        params: { placementId }
      }])[0].data).to.contain('&cb=');
    });
  });

  describe('interpretResponse', () => {
    it('error in response', () => {
      expect(interpretResponse({
        body: {
          errors: ['test-error-message']
        }
      }, {})).to.deep.equal([]);
    });

    it('valid native bid in response', () => {
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
      expect(bidResponse.creativeId).to.equal(placementId);
      expect(bidResponse.netRevenue).to.equal(true);
      expect(bidResponse.currency).to.equal('USD');

      expect(bidResponse.hb_bidder).to.equal('fan');
      expect(bidResponse.fb_bidid).to.equal('test-bid-id');
      expect(bidResponse.fb_format).to.equal('native');
      expect(bidResponse.fb_placementid).to.equal(placementId);
    });

    it('valid IAB bid in response', () => {
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
      expect(bidResponse.creativeId).to.equal(placementId);
      expect(bidResponse.netRevenue).to.equal(true);
      expect(bidResponse.currency).to.equal('USD');
      expect(bidResponse.hb_bidder).to.equal('fan');
      expect(bidResponse.fb_bidid).to.equal('test-bid-id');
      expect(bidResponse.fb_format).to.equal('300x250');
      expect(bidResponse.fb_placementid).to.equal(placementId);
    });

    it('filters invalid slot sizes', () => {
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
      expect(bidResponse.creativeId).to.equal(placementId);
      expect(bidResponse.netRevenue).to.equal(true);
      expect(bidResponse.currency).to.equal('USD');
      expect(bidResponse.hb_bidder).to.equal('fan');
      expect(bidResponse.fb_bidid).to.equal('test-bid-id');
      expect(bidResponse.fb_format).to.equal('300x250');
      expect(bidResponse.fb_placementid).to.equal(placementId);
    });

    it('valid multiple bids in response', () => {
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
      expect(bidResponseIab.creativeId).to.equal(placementIdIab);
      expect(bidResponseIab.netRevenue).to.equal(true);
      expect(bidResponseIab.currency).to.equal('USD');
      expect(bidResponseIab.hb_bidder).to.equal('fan');
      expect(bidResponseIab.fb_bidid).to.equal('test-bid-id-iab');
      expect(bidResponseIab.fb_format).to.equal('300x250');
      expect(bidResponseIab.fb_placementid).to.equal(placementIdIab);
    });

    it('valid video bid in response', () => {
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
      expect(bidResponse.mediaType).to.equal('video');
      expect(bidResponse.vastUrl).to.equal(`https://an.facebook.com/v1/instream/vast.xml?placementid=${placementId}&pageurl=${pageUrl}&playerwidth=${playerwidth}&playerheight=${playerheight}&bidid=${bidId}`);
      expect(bidResponse.width).to.equal(playerwidth);
      expect(bidResponse.height).to.equal(playerheight);
    });

    it('mixed video and native bids', () => {
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
      expect(bidResponseVideo.mediaType).to.equal('video');
      expect(bidResponseVideo.vastUrl).to.equal(`https://an.facebook.com/v1/instream/vast.xml?placementid=${videoPlacementId}&pageurl=${pageUrl}&playerwidth=${playerwidth}&playerheight=${playerheight}&bidid=${videoBidId}`);
      expect(bidResponseVideo.width).to.equal(playerwidth);
      expect(bidResponseVideo.height).to.equal(playerheight);

      expect(bidResponseNative.cpm).to.equal(4.56);
      expect(bidResponseNative.requestId).to.equal(requestId);
      expect(bidResponseNative.width).to.equal(300);
      expect(bidResponseNative.height).to.equal(250);
      expect(bidResponseNative.ad).to.contain(`placementid:'${nativePlacementId}',format:'native',bidid:'${nativeBidId}'`);
    });

    it('mixture of valid native bid and error in response', () => {
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
