const bidfactory = require('src/bidfactory');
const bidmanager = require('src/bidmanager');
const utils = require('src/utils');
const adloader = require('src/adloader');
var adaptermanager = require('src/adaptermanager');

const BIDDER_CODE = 'gumgum';
const CALLBACKS = {};

const GumgumAdapter = function GumgumAdapter() {
  const bidEndpoint = `https://g2.gumgum.com/hbid/imp`;

  let topWindow;
  let topScreen;
  let pageViewId;
  const requestCache = {};
  const throttleTable = {};
  const defaultThrottle = 3e4;
  const dtCredentials = { member: 'YcXr87z2lpbB' };

  try {
    topWindow = global.top;
    topScreen = topWindow.screen;
  } catch (error) {
    return utils.logError(error);
  }

  function _getTimeStamp() {
    return new Date().getTime();
  }

  function _getDigiTrustQueryParams() {
    function getDigiTrustId () {
      var digiTrustUser = (window.DigiTrust && window.DigiTrust.getUser) ? window.DigiTrust.getUser(dtCredentials) : {};
      return (digiTrustUser && digiTrustUser.success && digiTrustUser.identity) || '';
    };

    let digiTrustId = getDigiTrustId();
    // Verify there is an ID and this user has not opted out
    if (!digiTrustId || (digiTrustId.privacy && digiTrustId.privacy.optout)) {
      return {};
    }
    return {
      'dt': digiTrustId.id
    };
  }

  function _callBids({ bids }) {
    const browserParams = {
      vw: topWindow.innerWidth,
      vh: topWindow.innerHeight,
      sw: topScreen.width,
      sh: topScreen.height,
      pu: topWindow.location.href,
      ce: navigator.cookieEnabled,
      dpr: topWindow.devicePixelRatio || 1
    };

    utils._each(bids, bidRequest => {
      const { bidId
        , params = {}
        , placementCode
      } = bidRequest;
      const timestamp = _getTimeStamp();
      const trackingId = params.inScreen;
      const nativeId = params.native;
      const slotId = params.inSlot;
      const bid = { tmax: $$PREBID_GLOBAL$$.cbTimeout };

      /* slot/native ads need the placement id */
      switch (true) {
        case !!(params.inImage): bid.pi = 1; break;
        case !!(params.inScreen): bid.pi = 2; break;
        case !!(params.inSlot): bid.pi = 3; break;
        case !!(params.native): bid.pi = 5; break;
        default: return utils.logWarn(
          `[GumGum] No product selected for the placement ${placementCode}` +
          ', please check your implementation.'
        );
      }

      /* throttle based on the latest request for this product */
      const productId = bid.pi;
      const requestKey = productId + '|' + placementCode;
      const throttle = throttleTable[productId];
      const latestRequest = requestCache[requestKey];
      if (latestRequest && throttle && (timestamp - latestRequest) < throttle) {
        return utils.logWarn(
          `[GumGum] The refreshes for "${placementCode}" with the params ` +
          `${JSON.stringify(params)} should be at least ${throttle / 1e3}s apart.`
        );
      }
      /* update the last request */
      requestCache[requestKey] = timestamp;

      /* tracking id is required for in-image and in-screen */
      if (trackingId) bid.t = trackingId;
      /* native ads require a native placement id */
      if (nativeId) bid.ni = nativeId;
      /* slot ads require a slot id */
      if (slotId) bid.si = slotId;

      /* include the pageViewId, if any */
      if (pageViewId) bid.pv = pageViewId;

      const cachedBid = Object.assign({
        placementCode,
        id: bidId
      }, bid);

      const callback = { jsonp: `$$PREBID_GLOBAL$$.handleGumGumCB['${bidId}']` };
      CALLBACKS[bidId] = _handleGumGumResponse(cachedBid);
      const query = Object.assign(callback, browserParams, bid, _getDigiTrustQueryParams());
      const bidCall = `${bidEndpoint}?${utils.parseQueryStringParameters(query)}`;
      adloader.loadScript(bidCall);
    });
  }

  const _handleGumGumResponse = cachedBidRequest => (bidResponse = {}) => {
    const { pi: productId
    } = cachedBidRequest;
    const { ad = {}
      , pag = {}
      , thms: throttle
    } = bidResponse;
    /* cache the pageViewId */
    if (pag && pag.pvid) pageViewId = pag.pvid;
    if (ad && ad.id) {
      /* set the new throttle */
      throttleTable[productId] = throttle || defaultThrottle;
      /* create the bid */
      const bid = bidfactory.createBid(1);
      const { t: trackingId
      } = pag;
      bidResponse.request = cachedBidRequest;
      const encodedResponse = encodeURIComponent(JSON.stringify(bidResponse));
      const gumgumAdLoader = `<script>
        (function (context, topWindow, d, s, G) {
          G = topWindow.GUMGUM;
          d = topWindow.document;
          function loadAd() {
            topWindow.GUMGUM.pbjs("${trackingId}", ${productId}, "${encodedResponse}" , context);
          }
          if (G) {
            loadAd();
          } else {
            topWindow.$$PREBID_GLOBAL$$.loadScript("https://js.gumgum.com/services.js", loadAd);
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

adaptermanager.registerBidAdapter(new GumgumAdapter(), 'gumgum');

module.exports = GumgumAdapter;
