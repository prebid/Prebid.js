import { BANNER } from '../src/mediaTypes.js';
import { getBidFloor } from '../libraries/equativUtils/equativUtils.js'
import { ortbConverter } from '../libraries/ortbConverter/converter.js';
import { registerBidder } from '../src/adapters/bidderFactory.js';
import { getStorageManager } from '../src/storageManager.js';
import { deepAccess, deepSetValue, mergeDeep } from '../src/utils.js';

/**
 * @typedef {import('../src/adapters/bidderFactory.js').Bid} Bid
 * @typedef {import('../src/adapters/bidderFactory.js').ServerRequest} ServerRequest
 */

const BIDDER_CODE = 'equativ';
const COOKIE_SYNC_ORIGIN = 'https://apps.smartadserver.com';
const COOKIE_SYNC_URL = `${COOKIE_SYNC_ORIGIN}/diff/templates/asset/csync.html`;
const PID_COOKIE_NAME = 'eqt_pid';

export const storage = getStorageManager({ bidderCode: BIDDER_CODE });

export const spec = {
  code: BIDDER_CODE,
  gvlid: 45,
  supportedMediaTypes: [BANNER],

  /**
   * @param bidRequests
   * @param bidderRequest
   * @returns {ServerRequest[]}
   */
  buildRequests: (bidRequests, bidderRequest) => {
    return {
      data: converter.toORTB({ bidderRequest, bidRequests }),
      method: 'POST',
      url: 'https://ssb-global.smartadserver.com/api/bid?callerId=169'
    };
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
    const { siteId, pageId, formatId } = bidRequest.params;

    delete imp.dt;

    imp.bidfloor = imp.bidfloor || getBidFloor(bidRequest);
    imp.secure = bidRequest.ortb2Imp?.secure ?? 1;
    imp.tagid = bidRequest.adUnitCode;

    if (siteId || pageId || formatId) {
      const bidder = {};

      if (siteId) {
        bidder.siteId = siteId;
      }

      if (pageId) {
        bidder.pageId = pageId;
      }

      if (formatId) {
        bidder.formatId = formatId;
      }

      mergeDeep(imp, {
        ext: { bidder },
      });
    }

    return imp;
  },

  request(buildRequest, imps, bidderRequest, context) {
    const bid = context.bidRequests[0];
    const req = buildRequest(imps, bidderRequest, context);

    if (deepAccess(bid, 'ortb2.site.publisher')) {
      deepSetValue(req, 'site.publisher.id', bid.ortb2.site.publisher.id || bid.params.networkId);
    } else if (deepAccess(bid, 'ortb2.app.publisher')) {
      deepSetValue(req, 'app.publisher.id', bid.ortb2.app.publisher.id || bid.params.networkId);
    } else if (deepAccess(bid, 'ortb2.dooh.publisher')) {
      deepSetValue(req, 'dooh.publisher.id', bid.ortb2.dooh.publisher.id || bid.params.networkId);
    } else {
      deepSetValue(req, 'site.publisher.id', bid.params.networkId);
    }

    const pid = storage.getCookie(PID_COOKIE_NAME);
    if (pid) {
      deepSetValue(req, 'user.buyeruid', pid);
    }

    return req;
  },
});

registerBidder(spec);
