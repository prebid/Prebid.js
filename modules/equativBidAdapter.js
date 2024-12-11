
import { getBidFloor } from '../libraries/equativUtils/equativUtils.js';
import { ortbConverter } from '../libraries/ortbConverter/converter.js';
import { registerBidder } from '../src/adapters/bidderFactory.js';
import { config } from '../src/config.js';
import { BANNER, NATIVE, VIDEO } from '../src/mediaTypes.js';
import { getStorageManager } from '../src/storageManager.js';
import { deepAccess, deepSetValue, logError, logWarn, mergeDeep } from '../src/utils.js';

/**
 * @typedef {import('../src/adapters/bidderFactory.js').Bid} Bid
 * @typedef {import('../src/adapters/bidderFactory.js').ServerRequest} ServerRequest
 */

const BIDDER_CODE = 'equativ';
const COOKIE_SYNC_ORIGIN = 'https://apps.smartadserver.com';
const COOKIE_SYNC_URL = `${COOKIE_SYNC_ORIGIN}/diff/templates/asset/csync.html`;
const LOG_PREFIX = 'Equativ:';
const PID_COOKIE_NAME = 'eqt_pid';

/**
 * Evaluates impressions for validity.  The entry evaluated is considered valid if NEITHER of these conditions are met:
 * 1) it has a `video` property defined for `mediaTypes.video` which is an empty object
 * 2) it has a `native` property defined for `mediaTypes.native` which is an empty object
 * @param {*} bidReq A bid request object to evaluate
 * @returns boolean
 */
function isValid(bidReq) {
  return !(bidReq.mediaTypes.video && JSON.stringify(bidReq.mediaTypes.video) === '{}') && !(bidReq.mediaTypes.native && JSON.stringify(bidReq.mediaTypes.native) === '{}');
}

export const storage = getStorageManager({ bidderCode: BIDDER_CODE });

export const spec = {
  code: BIDDER_CODE,
  gvlid: 45,
  supportedMediaTypes: [BANNER, VIDEO, NATIVE],

  /**
   * @param bidRequests
   * @param bidderRequest
   * @returns {ServerRequest[]}
   */
  buildRequests: (bidRequests, bidderRequest) => {
    if (bidRequests.filter(isValid).length === 0) {
      logError(`${LOG_PREFIX} No useful bid requests to process. No requests will be sent.`, bidRequests);
      return undefined;
    }

    const requests = [];

    bidRequests.forEach(bid => {
      const data = converter.toORTB({bidRequests: [bid], bidderRequest});
      requests.push({
        data,
        method: 'POST',
        url: 'https://ssb-global.smartadserver.com/api/bid?callerId=169',
      })
    });

    return requests;
  },

  /**
   * @param serverResponse
   * @param bidRequest
   * @returns {Bid[]}
   */
  interpretResponse: (serverResponse, bidRequest) =>
    converter.fromORTB({
      request: bidRequest.data,
      response: serverResponse.body,
    }),

  /**
   * @param bidRequest
   * @returns {boolean}
   */
  isBidRequestValid: (bidRequest) => {
    return !!(
      deepAccess(bidRequest, 'params.networkId') ||
      deepAccess(bidRequest, 'ortb2.site.publisher.id') ||
      deepAccess(bidRequest, 'ortb2.app.publisher.id') ||
      deepAccess(bidRequest, 'ortb2.dooh.publisher.id')
    );
  },

  /**
   * @param syncOptions
   * @returns {{type: string, url: string}[]}
   */
  getUserSyncs: (syncOptions) => {
    if (syncOptions.iframeEnabled) {
      window.addEventListener('message', function handler(event) {
        if (event.origin === COOKIE_SYNC_ORIGIN && event.data.pid) {
          const exp = new Date();
          exp.setTime(Date.now() + 31536000000); // in a year
          storage.setCookie(PID_COOKIE_NAME, event.data.pid, exp.toUTCString());
          this.removeEventListener('message', handler);
        }
      });

      return [{ type: 'iframe', url: COOKIE_SYNC_URL }];
    }

    return [];
  }
};

export const converter = ortbConverter({
  context: {
    netRevenue: true,
    ttl: 300,
  },

  imp(buildImp, bidRequest, context) {
    const imp = buildImp(bidRequest, context);
    const mediaType = deepAccess(bidRequest, 'mediaTypes.video') ? VIDEO : BANNER;
    const { siteId, pageId, formatId } = bidRequest.params;

    delete imp.dt;

    imp.bidfloor = imp.bidfloor || getBidFloor(bidRequest, config.getConfig('currency.adServerCurrency'), mediaType);
    imp.secure = 1;
    imp.tagid = bidRequest.adUnitCode;

    if (!deepAccess(bidRequest, 'ortb2Imp.rwdd') && deepAccess(bidRequest, 'mediaTypes.video.ext.rewarded')) {
      mergeDeep(imp, { rwdd: bidRequest.mediaTypes.video.ext.rewarded });
    }

    const bidder = { ...(siteId && { siteId }), ...(pageId && { pageId }), ...(formatId && { formatId }) };
    if (Object.keys(bidder).length) {
      mergeDeep(imp.ext, { bidder });
    }

    return imp;
  },

  request(buildRequest, imps, bidderRequest, context) {
    const bid = context.bidRequests[0];
    const req = buildRequest(imps, bidderRequest, context);

    let env = ['ortb2.site.publisher', 'ortb2.app.publisher', 'ortb2.dooh.publisher'].find(propPath => deepAccess(bid, propPath)) || 'ortb2.site.publisher';
    deepSetValue(req, env.replace('ortb2.', '') + '.id', deepAccess(bid, env + '.id') || bid.params.networkId);

    if (deepAccess(bid, 'mediaTypes.video')) {
      ['mimes', 'placement'].forEach(prop => {
        if (!bid.mediaTypes.video[prop]) {
          logWarn(`${LOG_PREFIX} Property "${prop}" is missing from request`, bid);
        }
      });
    }

    // "assets" is not included as a property to check here because the
    // ortbConverter library checks for it already and will skip processing
    // the request if it is missing
    if (deepAccess(bid, 'mediaTypes.native')) {
      ['privacy', 'plcmttype', 'eventtrackers'].forEach(prop => {
        if (!bid.mediaTypes.native.ortb[prop]) {
          logWarn(`${LOG_PREFIX} Property "${prop}" is missing from request.  Request will proceed, but the use of ${prop} for native requests is strongly encouraged.`, bid);
        }
      });
    }

    const pid = storage.getCookie(PID_COOKIE_NAME);
    if (pid) {
      deepSetValue(req, 'user.buyeruid', pid);
    }

    return req;
  }
});

registerBidder(spec);
