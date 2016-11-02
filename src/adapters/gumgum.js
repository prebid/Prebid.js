const bidfactory = require('../bidfactory');
const bidmanager = require('../bidmanager');
const utils      = require('../utils');
const adloader   = require('../adloader');

const BIDDER_CODE = 'gumgum';
const CALLBACKS = {};

const GumgumAdapter = function GumgumAdapter() {

  const bidEndpoint = `https://g2.gumgum.com/hbid/imp`;

  const WINDOW = global.top;
  const SCREEN = WINDOW.screen;

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
      const gumgumAdLoader = `r("${trackingId}",${productId},"${ encodedResponse }",window,top)`;
      const gumgumLibrary = `(function(r){${gumgumAdLoader}})(function(trackingId,prodId,data,context,w,d,s,G){` +
        'G=w.GUMGUM;d=w.document;function lg(){w.GUMGUM.pbjs(trackingId,prodId,data,context,this)}return!G?w' +
        '.$$PREBID_GLOBAL$$.loadScript("https://g2.gumgum.com/javascripts/ggv2.js",lg):lg()});';
      Object.assign(bid, {
        cpm: ad.price,
        ad: `<script>${gumgumLibrary}</script>`,
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
