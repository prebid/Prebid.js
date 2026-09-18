import { isStr, replaceAuctionPrice, triggerPixel, deepSetValue, deepAccess } from '../src/utils.js';
import { registerBidder } from '../src/adapters/bidderFactory.js';
import { NATIVE, BANNER } from '../src/mediaTypes.js';
import { config } from '../src/config.js';
import { ortbConverter } from '../libraries/ortbConverter/converter.js';
import { getDeviceType as getDeviceTypeFromLib } from '../libraries/userAgentUtils/index.js';
import { deviceTypes } from '../libraries/userAgentUtils/userAgentTypes.enums.js';

export const ENDPOINT = 'https://app.readpeak.com/header/prebid';

const BIDDER_CODE = 'readpeak';
const GVLID = 290;
const ORTB_MTYPE_BANNER = 1;
const ORTB_MTYPE_NATIVE = 4;

// Map userAgentUtils device types to OpenRTB 2.x device type values
const DEVICE_TYPE_TO_ORTB = Object.freeze({
  [deviceTypes.DESKTOP]: 2,
  [deviceTypes.MOBILE]: 4,
  [deviceTypes.TABLET]: 5,
});

const DEFAULT_CURRENCY = 'USD';

const converter = ortbConverter({
  context: {
    netRevenue: true,
    ttl: 300,
  },

  imp(buildImp, bidRequest, context) {
    const imp = buildImp(bidRequest, context);
    if (!imp) return imp;

    // Floors module (via registered processors) sets imp.bidfloor/bidfloorcur.
    // Only fill from params when the floors module didn't provide a value.
    if (imp.bidfloor == null) {
      imp.bidfloor = bidRequest.params.bidfloor ?? 0;
      imp.bidfloorcur = bidRequest.params.bidfloorcur || DEFAULT_CURRENCY;
    }
    imp.bidfloorcur = imp.bidfloorcur || DEFAULT_CURRENCY;

    imp.tagid = bidRequest.params.tagId || imp.tagid || bidRequest.adUnitCode || '0';

    return imp;
  },

  request(buildRequest, imps, bidderRequest, context) {
    const request = buildRequest(imps, bidderRequest, context);

    deepSetValue(request, 'source.ext.prebid', '$prebid.version$');

    const firstBid = context.bidRequests && context.bidRequests[0];
    if (firstBid && firstBid.params) {
      const appParams = firstBid.params.app;
      if (request.app || appParams) {
        delete request.site;
        if (firstBid.params.publisherId) {
          deepSetValue(request, 'app.publisher.id', firstBid.params.publisherId.toString());
        }
        if (firstBid.params.siteId) {
          deepSetValue(request, 'app.id', firstBid.params.siteId.toString());
        } else if (firstBid.params.publisherId) {
          deepSetValue(request, 'app.id', firstBid.params.publisherId.toString());
        }
        if (appParams?.bundle) {
          deepSetValue(request, 'app.bundle', appParams.bundle);
        }
        if (appParams?.storeUrl) {
          deepSetValue(request, 'app.storeurl', appParams.storeUrl);
        }
        if (appParams?.domain) {
          deepSetValue(request, 'app.domain', appParams.domain);
        }
      } else {
        // Site publisher and site id from params
        if (firstBid.params.publisherId) {
          deepSetValue(request, 'site.publisher.id', firstBid.params.publisherId.toString());
        }
        if (firstBid.params.siteId) {
          deepSetValue(request, 'site.id', firstBid.params.siteId.toString());
        } else if (firstBid.params.publisherId) {
          deepSetValue(request, 'site.id', firstBid.params.publisherId.toString());
        }
      }
    }

    // Ensure devicetype is always present for backend validation.
    // Prefer value from publisher ortb2 config or RTD modules; fall back to UA detection.
    if (!deepAccess(request, 'device.devicetype')) {
      deepSetValue(request, 'device.devicetype', getOrtbDeviceType());
    }

    if (!request.cur) {
      request.cur = [config.getConfig('currency')?.adServerCurrency || DEFAULT_CURRENCY];
    }

    return request;
  },

  bidResponse(buildBidResponse, bid, context) {
    context.mediaType = getBidMediaType(bid, context);
    return buildBidResponse(bid, context);
  },
});

export const spec = {
  code: BIDDER_CODE,
  gvlid: GVLID,

  supportedMediaTypes: [NATIVE, BANNER],

  isBidRequestValid: (bid) => !!(bid && bid.params && bid.params.publisherId),

  buildRequests: (bidRequests, bidderRequest) => {
    const data = converter.toORTB({ bidRequests, bidderRequest });
    return {
      method: 'POST',
      url: ENDPOINT,
      data,
    };
  },

  interpretResponse: (response, request) => {
    if (!response.body) {
      return [];
    }
    return converter.fromORTB({ request: request.data, response: response.body }).bids;
  },

  onBidBillable: (bid) => {
    if (bid.burl && isStr(bid.burl)) {
      triggerPixel(replaceAuctionPrice(bid.burl, bid.originalCpm || bid.cpm));
    }
  },
};

registerBidder(spec);

function getBidMediaType(bid, context) {
  // Prefer the explicit mtype signal from the endpoint
  if (bid.mtype === ORTB_MTYPE_NATIVE) {
    return NATIVE;
  }
  if (bid.mtype === ORTB_MTYPE_BANNER) {
    return BANNER;
  }
  // Fallback: sniff adm when mtype is absent
  if (isNativeAdm(bid.adm)) {
    return NATIVE;
  }
  if (context.imp && context.imp.native && !context.imp.banner) {
    return NATIVE;
  }
  return undefined;
}

function isNativeAdm(adm) {
  if (adm && typeof adm === 'object') {
    return Array.isArray(adm.assets);
  }
  if (isStr(adm)) {
    try {
      const parsed = JSON.parse(adm);
      return !!(parsed && Array.isArray(parsed.assets));
    } catch (e) {}
  }
  return false;
}

/**
 * Maps the user agent to an OpenRTB 2.x devicetype value.
 * Checks for Connected TV first (the shared library has no CTV branch),
 * then delegates phone/tablet/desktop detection to userAgentUtils.
 * Falls back to desktop (2) if detection yields an unknown value.
 */
function getOrtbDeviceType() {
  if (/(smart[-]?tv|hbbtv|appletv|googletv|hdmi|netcast\.tv|viera|nettv|roku|\bdtv\b|sonydtv|inettvbrowser|\btv\b)/i.test(navigator.userAgent)) {
    return 3; // ConnectedTV
  }
  return DEVICE_TYPE_TO_ORTB[getDeviceTypeFromLib()] ?? 2;
}
