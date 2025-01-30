import {logWarn, logError, triggerPixel, deepSetValue, getParameterByName} from '../src/utils.js';
import {ortbConverter} from '../libraries/ortbConverter/converter.js'
import {registerBidder} from '../src/adapters/bidderFactory.js';
import {Renderer} from '../src/Renderer.js';
import {BANNER, VIDEO, NATIVE} from '../src/mediaTypes.js';
import {pbsExtensions} from '../libraries/pbsExtensions/pbsExtensions.js';
import {bidderSettings} from '../src/bidderSettings.js';

const ADAPTER_VERSION = '1.0.0';
const BIDDER_CODE = 'r2b2';
const GVL_ID = 1235;

const DEFAULT_CURRENCY = 'USD';
const DEFAULT_TTL = 360;
const DEFAULT_NET_REVENUE = true;
const DEBUG_PARAM = 'pbjs_test_r2b2';
const RENDERER_URL = 'https://delivery.r2b2.io/static/rendering.js';

const ENDPOINT = bidderSettings.get(BIDDER_CODE, 'endpoint') || 'hb.r2b2.cz';
const SERVER_URL = 'https://' + ENDPOINT;
const URL_BID = SERVER_URL + '/openrtb2/bid';
const URL_SYNC = SERVER_URL + '/cookieSync';
const URL_EVENT = SERVER_URL + '/event';

const URL_EVENT_ON_BIDDER_ERROR = URL_EVENT + '/bidError';
const URL_EVENT_ON_TIMEOUT = URL_EVENT + '/timeout';

const R2B2_TEST_UNIT = 'selfpromo';

export const internal = {
  placementsToSync: [],
  mappedParams: {}
}

let r2b2Error = function(message, params) {
  logError(message, params, BIDDER_CODE)
}

function getIdParamsFromPID(pid) {
  // selfpromo test creative
  if (pid === R2B2_TEST_UNIT) {
    return { d: 'test', g: 'test', p: 'selfpromo', m: 0, selfpromo: 1 }
  }
  if (!isNaN(pid)) {
    return { pid: Number(pid) }
  }
  if (typeof pid === 'string') {
    const params = pid.split('/');
    if (params.length === 3 || params.length === 4) {
      const paramNames = ['d', 'g', 'p', 'm'];
      return paramNames.reduce((p, paramName, index) => {
        let param = params[index];
        if (paramName === 'm') {
          param = ['desktop', 'classic', '0'].includes(param) ? 0 : Number(!!param)
        }
        p[paramName] = param;
        return p
      }, {});
    }
  }
}

function pickIdFromParams(params) {
  if (!params) return null;
  const { d, g, p, m, pid } = params;
  return d ? { d, g, p, m } : { pid };
}

function getIdsFromBids(bids) {
  return bids.reduce((ids, bid) => {
    const params = internal.mappedParams[bid.bidId];
    const id = pickIdFromParams(params);
    if (id) {
      ids.push(id);
    }
    return ids
  }, []);
}

function triggerEvent(eventUrl, ids) {
  if (ids && !ids.length) return;
  const timeStamp = new Date().getTime();
  const symbol = (eventUrl.indexOf('?') === -1 ? '?' : '&');
  const url = eventUrl + symbol + `p=${btoa(JSON.stringify(ids))}&cb=${timeStamp}`;
  triggerPixel(url)
}

const converter = ortbConverter({
  imp(buildImp, bidRequest, context) {
    const imp = buildImp(bidRequest, context);
    const idParams = getIdParamsFromPID(bidRequest.params.pid);
    deepSetValue(imp, 'ext.r2b2', idParams);
    internal.placementsToSync.push(idParams);
    internal.mappedParams[imp.id] = Object.assign({}, bidRequest.params, idParams);
    return imp;
  },
  request(buildRequest, imps, bidderRequest, context) {
    const request = buildRequest(imps, bidderRequest, context);
    deepSetValue(request, 'ext.version', ADAPTER_VERSION);
    request.cur = [DEFAULT_CURRENCY];
    const test = getParameterByName(DEBUG_PARAM) === '1' ? 1 : 0;
    deepSetValue(request, 'test', test);
    return request;
  },
  context: {
    netRevenue: DEFAULT_NET_REVENUE,
    ttl: DEFAULT_TTL
  },
  processors: pbsExtensions
});

function setUpRenderer(adUnitCode, bid) {
  // let renderer load once in main window, but pass the renderDocument
  let renderDoc;
  const config = {
    documentResolver: (bid, sourceDocument, renderDocument) => {
      renderDoc = renderDocument;
      return sourceDocument;
    }
  }
  let renderer = Renderer.install({
    url: RENDERER_URL,
    config: config,
    id: bid.requestId,
    adUnitCode
  });

  renderer.setRender(function (bid, doc) {
    doc = renderDoc || doc;
    window.R2B2 = window.R2B2 || {};
    let main = window.R2B2;
    main.HB = main.HB || {};
    main.HB.Render = main.HB.Render || {};
    main.HB.Render.queue = main.HB.Render.queue || [];
    main.HB.Render.queue.push(() => {
      const id = pickIdFromParams(internal.mappedParams[bid.requestId])
      main.HB.Renderer.render(id, bid, null, doc)
    })
  })

  return renderer
}

function getExtMediaType(bidMediaType, responseBid) {
  switch (bidMediaType) {
    case BANNER:
      return {
        type: 'banner',
        settings: {
          chd: null,
          width: responseBid.w,
          height: responseBid.h,
          ad: {
            type: 'content',
            data: responseBid.adm
          }
        }
      };
    case NATIVE:
      break;
    case VIDEO:
      break;
    default:
      break;
  }
}

function createPrebidResponseBid(requestImp, bidResponse, serverResponse, bids) {
  const bidId = requestImp.id;
  const adUnitCode = bids[0].adUnitCode;
  const mediaType = bidResponse.ext.prebid.type;
  let bidOut = {
    requestId: bidId,
    cpm: bidResponse.price,
    creativeId: bidResponse.crid,
    width: bidResponse.w,
    height: bidResponse.h,
    ttl: bidResponse.ttl ?? DEFAULT_TTL,
    netRevenue: serverResponse.netRevenue ?? DEFAULT_NET_REVENUE,
    currency: serverResponse.cur ?? DEFAULT_CURRENCY,
    ad: bidResponse.adm,
    mediaType: mediaType,
    winUrl: bidResponse.nurl,
    ext: {
      cid: bidResponse.ext?.r2b2?.cid,
      cdid: bidResponse.ext?.r2b2?.cdid,
      mediaType: getExtMediaType(mediaType, bidResponse),
      adUnit: adUnitCode,
      dgpm: internal.mappedParams[bidId],
      events: bidResponse.ext?.r2b2?.events
    }
  };
  if (bidResponse.ext?.r2b2?.useRenderer) {
    bidOut.renderer = setUpRenderer(adUnitCode, bidOut);
  }
  return bidOut;
}

export const spec = {
  code: BIDDER_CODE,
  gvlid: GVL_ID,
  supportedMediaTypes: [BANNER],

  isBidRequestValid: function(bid) {
    if (!bid.params || !bid.params.pid) {
      logWarn('Bad params, "pid" required.');
      return false
    }
    const id = getIdParamsFromPID(bid.params.pid);
    if (!id || !(id.pid || (id.d && id.g && id.p))) {
      logWarn('Bad params, "pid" has to be either a number or a correctly assembled string.');
      return false
    }
    return true
  },
  buildRequests: function(validBidRequests, bidderRequest) {
    const data = converter.toORTB({
      bidRequests: validBidRequests,
      bidderRequest
    });
    return [{
      method: 'POST',
      url: URL_BID,
      data,
      bids: bidderRequest.bids
    }]
  },

  interpretResponse: function(serverResponse, request) {
    // r2b2Error('error message', {params: 1});
    let prebidResponses = [];

    const response = serverResponse.body;
    if (!response || !response.seatbid || !response.seatbid[0] || !response.seatbid[0].bid) {
      return prebidResponses;
    }
    let requestImps = request.data.imp || [];
    try {
      response.seatbid.forEach(seat => {
        let bids = seat.bid;

        for (let responseBid of bids) {
          let responseImpId = responseBid.impid;
          let requestCurrentImp = requestImps.find((requestImp) => requestImp.id === responseImpId);
          if (!requestCurrentImp) {
            r2b2Error('Cant match bid response.', {impid: Boolean(responseBid.impid)});
            continue;// Skip this iteration if there's no match
          }
          prebidResponses.push(createPrebidResponseBid(requestCurrentImp, responseBid, response, request.bids));
        }
      })
    } catch (e) {
      r2b2Error('Error while interpreting response:', {msg: e.message});
    }
    return prebidResponses;
  },
  getUserSyncs: function(syncOptions, serverResponses, gdprConsent, uspConsent) {
    const syncs = [];

    if (!syncOptions.iframeEnabled) {
      logWarn('Please enable iframe based user sync.');
      return syncs;
    }

    let plString;
    try {
      plString = btoa(JSON.stringify(internal.placementsToSync || []));
    } catch (e) {
      logWarn('User sync failed: ' + e.message);
      return syncs
    }

    let url = URL_SYNC + `?p=${plString}`;

    if (gdprConsent) {
      url += `&gdpr=${Number(gdprConsent.gdprApplies)}&gdpr_consent=${gdprConsent.consentString}`
    }

    if (uspConsent) {
      url += `&us_privacy=${uspConsent}`
    }

    syncs.push({
      type: 'iframe',
      url: url
    })
    return syncs;
  },
  onBidWon: function(bid) {
    const url = bid.ext?.events?.onBidWon;
    if (url) {
      triggerEvent(url)
    }
  },
  onSetTargeting: function(bid) {
    const url = bid.ext?.events?.onSetTargeting;
    if (url) {
      triggerEvent(url)
    }
  },
  onTimeout: function(bids) {
    triggerEvent(URL_EVENT_ON_TIMEOUT, getIdsFromBids(bids))
  },
  onBidderError: function(params) {
    let { bidderRequest } = params;
    triggerEvent(URL_EVENT_ON_BIDDER_ERROR, getIdsFromBids(bidderRequest.bids))
  }
}
registerBidder(spec);
