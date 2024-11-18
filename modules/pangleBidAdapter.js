import { BANNER, VIDEO } from '../src/mediaTypes.js';
import { ortbConverter } from '../libraries/ortbConverter/converter.js'
import { registerBidder } from '../src/adapters/bidderFactory.js';
import { deepSetValue, generateUUID, timestamp, deepAccess } from '../src/utils.js';
import { getStorageManager } from '../src/storageManager.js';
import { MODULE_TYPE_RTD } from '../src/activities/modules.js';

import { Renderer } from '../src/Renderer.js';

const BIDDER_CODE = 'pangle';
const ENDPOINT = 'https://pangle.pangleglobal.com/api/ad/union/web_js/common/get_ads';

const OUTSTREAM_RENDERER_URL = 'https://sf16-static.i18n-pglstatp.com/obj/ad-pattern-sg/pangle/web/ads/video.js';

const DEFAULT_BID_TTL = 30;
const DEFAULT_CURRENCY = 'USD';
const DEFAULT_NET_REVENUE = true;
const PANGLE_COOKIE = '_pangle_id';
const COOKIE_EXP = 86400 * 1000 * 365 * 1; // 1 year
const MEDIA_TYPES = {
  Banner: 1,
  Video: 2
};

export const storage = getStorageManager({ moduleType: MODULE_TYPE_RTD, moduleName: BIDDER_CODE })

export function isValidUuid(uuid) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    uuid
  );
}

function getPangleCookieId() {
  let sid = storage.cookiesAreEnabled() && storage.getCookie(PANGLE_COOKIE);

  if (!sid || !isValidUuid(sid)) {
    sid = generateUUID();
    setPangleCookieId(sid);
  }

  return sid;
}

function setPangleCookieId(sid) {
  if (storage.cookiesAreEnabled()) {
    const expires = new Date(timestamp() + COOKIE_EXP).toGMTString();

    storage.setCookie(PANGLE_COOKIE, sid, expires);
  }
}

function createRequest(bidRequests, bidderRequest, mediaType) {
  const data = converter.toORTB({
    bidRequests,
    bidderRequest,
    context: { mediaType },
  });
  const devicetype = spec.getDeviceType(navigator.userAgent);
  deepSetValue(data, 'device.devicetype', devicetype);
  if (bidderRequest.userId && typeof bidderRequest.userId === 'object') {
    const pangleId = getPangleCookieId();
    // add pangle cookie
    const _eids = data.user?.ext?.eids ?? [];
    deepSetValue(data, 'user.ext.eids', [
      ..._eids,
      {
        source: document.location.host,
        uids: [
          {
            id: pangleId,
            atype: 1,
          },
        ],
      },
    ]);
  }
  bidRequests.forEach((item, idx) => {
    deepSetValue(data.imp[idx], 'ext.networkids', item.params);
    deepSetValue(data.imp[idx], 'banner.api', [5]);
    deepSetValue(data, 'test', item.params.test ?? 0)
  });
  return {
    method: 'POST',
    url: ENDPOINT,
    data,
    options: { contentType: 'application/json', withCredentials: true }
  }
}

function isVideoBid(bid) {
  return !!deepAccess(bid, 'mediaTypes.video');
}

function isBannerBid(bid) {
  return !!deepAccess(bid, 'mediaTypes.banner');
}

function renderOutstream(bid) {
  bid.renderer.push(() => {
    window.outstreamPlayer({ bid, codeId: bid.adUnitCode });
  });
}

const converter = ortbConverter({
  context: {
    netRevenue: DEFAULT_NET_REVENUE,
    ttl: DEFAULT_BID_TTL,
    currency: DEFAULT_CURRENCY,
  },
  bidResponse(buildBidResponse, bid, context) {
    const { bidRequest } = context;
    let bidResponse;
    if (bid.mtype === MEDIA_TYPES.Video) {
      context.mediaType = VIDEO;
      bidResponse = buildBidResponse(bid, context);
      if (bidRequest.mediaTypes.video?.context === 'outstream') {
        const renderer = Renderer.install({id: bid.bidId, url: OUTSTREAM_RENDERER_URL, adUnitCode: bid.adUnitCode});
        renderer.setRender(renderOutstream);
        bidResponse.renderer = renderer;
      }
    }
    if (bid.mtype === MEDIA_TYPES.Banner) {
      context.mediaType = BANNER;
      bidResponse = buildBidResponse(bid, context);
    }
    return bidResponse;
  },
});

export const spec = {
  code: BIDDER_CODE,
  supportedMediaTypes: [BANNER, VIDEO],

  getDeviceType: function (ua) {
    if (
      /ipad|android 3.0|xoom|sch-i800|playbook|tablet|kindle/i.test(
        ua.toLowerCase()
      )
    ) {
      return 5; // 'tablet'
    }
    if (
      /iphone|ipod|android|blackberry|opera|mini|windows\sce|palm|smartphone|iemobile/i.test(
        ua.toLowerCase()
      )
    ) {
      return 4; // 'mobile'
    }
    return 2; // 'desktop'
  },

  isBidRequestValid: function (bid) {
    return Boolean(bid.params.token);
  },

  buildRequests(bidRequests, bidderRequest) {
    const reqArr = [];
    const videoBids = bidRequests.filter((bid) => isVideoBid(bid));
    const bannerBids = bidRequests.filter((bid) => isBannerBid(bid));
    bannerBids.forEach((bid) => {
      reqArr.push(createRequest([bid], bidderRequest, BANNER));
    })
    videoBids.forEach((bid) => {
      reqArr.push(createRequest([bid], bidderRequest, VIDEO));
    });
    return reqArr;
  },

  interpretResponse(response, request) {
    const bids = converter.fromORTB({
      response: response.body,
      request: request.data,
    }).bids;
    return bids;
  },
};

registerBidder(spec);
