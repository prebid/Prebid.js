const bidfactory = require('../bidfactory');
const bidmanager = require('../bidmanager');
const utils      = require('../utils');
const adloader   = require('../adloader');

const BIDDER_CODE = 'gumgum';
const CALLBACKS = {};

const GumgumAdapter = function GumgumAdapter() {

  const bidEndpoint = `https://g2.gumgum.com/hbid/imp`;

  let WINDOW;
  let SCREEN;

  try {
    WINDOW = global.top;
    SCREEN = WINDOW.screen;
  } catch (error) {
    utils.logError(error);
    return;
  }

  function _callBids({ bids }) {
    const browserParams = {
      vw: WINDOW.innerWidth,
      vh: WINDOW.innerHeight,
      sw: SCREEN.width,
      sh: SCREEN.height,
      pu: WINDOW.location.href,
      dpr: WINDOW.devicePixelRatio || 1
    };
    utils._each(bids, bidRequest => {
      const { bidId
            , params = {}
            , placementCode
            } = bidRequest;
      const trackingId = params.inScreen;
      const nativeId   = params.native;
      const slotId     = params.inSlot;
      const bid = {};

      /* slot/native ads need the placement id */
      switch (true) {
        case !!(params.inImage):  bid.pi = 1; break;
        case !!(params.inScreen): bid.pi = 2; break;
        case !!(params.inSlot):   bid.pi = 3; break;
        case !!(params.native):   bid.pi = 5; break;
        default: return utils.logWarn(
          `[GumGum] No product selected for the placement ${placementCode}` +
          ', please check your implementation.'
        );
      }
      /* tracking id is required for in-image and in-screen */
      if (trackingId) bid.t = trackingId;
      /* native ads require a native placement id */
      if (nativeId) bid.ni = nativeId;
      /* slot ads require a slot id */
      if (slotId) bid.si = slotId;

      const cachedBid = Object.assign({
        placementCode,
        id: bidId
      }, bid);

      const callback = { jsonp: `$$PREBID_GLOBAL$$.handleGumGumCB['${ bidId }']` };
      CALLBACKS[bidId] = _handleGumGumResponse(cachedBid);
      const query = Object.assign(callback, browserParams, bid);
      const bidCall = `${bidEndpoint}?${utils.parseQueryStringParameters(query)}`;
      adloader.loadScript(bidCall);
    });
  }

  const _handleGumGumResponse = cachedBidRequest => bidResponse => {
    const ad = bidResponse && bidResponse.ad;
    if (ad && ad.id) {
      const bid = bidfactory.createBid(1);
      const { t: trackingId
            , pi: productId
            , placementCode
            } = cachedBidRequest;
      bidResponse.placementCode = placementCode;
      const encodedResponse = encodeURIComponent(JSON.stringify(bidResponse));
      const gumgumAdLoader = `<script>
        (function (context, topWindow, d, s, G) {
          G = topWindow.GUMGUM;
          d = topWindow.document;
          function loadAd() {
            topWindow.GUMGUM.pbjs("${ trackingId }", ${ productId }, "${ encodedResponse }" , context, topWindow);
          }
          if (G) {
            loadAd();
          } else {
            topWindow.$$PREBID_GLOBAL$$.loadScript("https://g2.gumgum.com/javascripts/ggv2.js", loadAd);
          }
        }(window, top));
      </script>`;
      Object.assign(bid, {
        cpm: ad.price,
        ad: gumgumAdLoader,
        width: ad.width,
        height: ad.height,
        bidderCode: BIDDER_CODE
      });
      bidmanager.addBidResponse(cachedBidRequest.placementCode, bid);
    } else {
      const noBid = bidfactory.createBid(2);
      noBid.bidderCode = BIDDER_CODE;
      bidmanager.addBidResponse(cachedBidRequest.placementCode, noBid);
    }
    delete CALLBACKS[cachedBidRequest.id];
  };

  window.$$PREBID_GLOBAL$$.handleGumGumCB = CALLBACKS;

  return {
    callBids: _callBids
  };

};

module.exports = GumgumAdapter;
