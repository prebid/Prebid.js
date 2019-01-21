import * as utils from '../src/utils'
import { Renderer } from '../src/Renderer'
import { registerBidder } from '../src/adapters/bidderFactory'
import { VIDEO } from '../src/mediaTypes'

function configureUniversalTag (exchangeRenderer) {
  parent.window.unruly = parent.window.unruly || {};
  parent.window.unruly['native'] = parent.window.unruly['native'] || {};
  parent.window.unruly['native'].siteId = parent.window.unruly['native'].siteId || exchangeRenderer.siteId;
  parent.window.unruly['native'].supplyMode = 'prebid';
}

function configureRendererQueue () {
  parent.window.unruly['native'].prebid = parent.window.unruly['native'].prebid || {};
  parent.window.unruly['native'].prebid.uq = parent.window.unruly['native'].prebid.uq || [];
}

function notifyRenderer (bidResponseBid) {
  parent.window.unruly['native'].prebid.uq.push(['render', bidResponseBid]);
}

const serverResponseToBid = (bid, rendererInstance) => ({
  requestId: bid.bidId,
  cpm: bid.cpm,
  width: bid.width,
  height: bid.height,
  vastUrl: bid.vastUrl,
  netRevenue: true,
  creativeId: bid.bidId,
  ttl: 360,
  currency: 'USD',
  renderer: rendererInstance
});

const buildPrebidResponseAndInstallRenderer = bids =>
  bids
    .filter(serverBid => !!utils.deepAccess(serverBid, 'ext.renderer'))
    .map(serverBid => {
      const exchangeRenderer = utils.deepAccess(serverBid, 'ext.renderer');
      configureUniversalTag(exchangeRenderer);
      configureRendererQueue();

      const rendererInstance = Renderer.install(Object.assign({}, exchangeRenderer, { callback: () => {} }));
      return { rendererInstance, serverBid };
    })
    .map(
      ({rendererInstance, serverBid}) => {
        const prebidBid = serverResponseToBid(serverBid, rendererInstance);

        const rendererConfig = Object.assign(
          {},
          prebidBid,
          {
            renderer: rendererInstance,
            adUnitCode: serverBid.ext.adUnitCode
          }
        );

        rendererInstance.setRender(() => { notifyRenderer(rendererConfig) });

        return prebidBid;
      }
    );

export const adapter = {
  code: 'unruly',
  supportedMediaTypes: [ VIDEO ],
  isBidRequestValid: function(bid) {
    if (!bid) return false;

    const context = utils.deepAccess(bid, 'mediaTypes.video.context');

    return bid.mediaType === 'video' || context === 'outstream';
  },

  buildRequests: function(validBidRequests, bidderRequest) {
    const url = 'https://targeting.unrulymedia.com/prebid';
    const method = 'POST';
    const data = {
      bidRequests: validBidRequests,
      bidderRequest
    };
    const options = { contentType: 'application/json' };

    return {
      url,
      method,
      data,
      options
    };
  },

  interpretResponse: function(serverResponse = {}) {
    const serverResponseBody = serverResponse.body;
    const noBidsResponse = [];
    const isInvalidResponse = !serverResponseBody || !serverResponseBody.bids;

    return isInvalidResponse
      ? noBidsResponse
      : buildPrebidResponseAndInstallRenderer(serverResponseBody.bids);
  }
};

registerBidder(adapter);
