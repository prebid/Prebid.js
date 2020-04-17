import * as utils from '../src/utils.js'
import { Renderer } from '../src/Renderer.js'
import { registerBidder } from '../src/adapters/bidderFactory.js'
import { VIDEO } from '../src/mediaTypes.js'

function configureUniversalTag (exchangeRenderer) {
  if (!exchangeRenderer.config) throw new Error('UnrulyBidAdapter: Missing renderer config.')
  if (!exchangeRenderer.config.siteId) throw new Error('UnrulyBidAdapter: Missing renderer siteId.')

  parent.window.unruly = parent.window.unruly || {};
  parent.window.unruly['native'] = parent.window.unruly['native'] || {};
  parent.window.unruly['native'].siteId = parent.window.unruly['native'].siteId || exchangeRenderer.config.siteId;
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
  renderer: rendererInstance,
  mediaType: VIDEO
});

const buildPrebidResponseAndInstallRenderer = bids =>
  bids
    .filter(serverBid => {
      const hasConfig = !!utils.deepAccess(serverBid, 'ext.renderer.config');
      const hasSiteId = !!utils.deepAccess(serverBid, 'ext.renderer.config.siteId');

      if (!hasConfig) utils.logError(new Error('UnrulyBidAdapter: Missing renderer config.'));
      if (!hasSiteId) utils.logError(new Error('UnrulyBidAdapter: Missing renderer siteId.'));

      return hasSiteId
    })
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
    const options = { contentType: 'text/plain' };

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
  },

  getUserSyncs: function(syncOptions, response, gdprConsent) {
    let params = '';
    if (gdprConsent && 'gdprApplies' in gdprConsent) {
      if (gdprConsent.gdprApplies && typeof gdprConsent.consentString === 'string') {
        params += `?gdpr=1&gdpr_consent=${gdprConsent.consentString}`;
      } else {
        params += `?gdpr=0`;
      }
    }

    const syncs = []
    if (syncOptions.iframeEnabled) {
      syncs.push({
        type: 'iframe',
        url: 'https://video.unrulymedia.com/iframes/third-party-iframes.html' + params
      });
    }
    return syncs;
  }
};

registerBidder(adapter);
