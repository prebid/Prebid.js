import { ortbConverter } from '../libraries/ortbConverter/converter.js';
import { handleCookieSync, PID_STORAGE_NAME, prepareSplitImps } from '../libraries/equativUtils/equativUtils.js';
import { registerBidder } from '../src/adapters/bidderFactory.js';
import { config } from '../src/config.js';
import { BANNER, NATIVE, VIDEO } from '../src/mediaTypes.js';
import { Renderer } from '../src/Renderer.js';
import { getStorageManager } from '../src/storageManager.js';
import { deepAccess, deepSetValue, logError, logWarn, mergeDeep } from '../src/utils.js';

/**
 * @typedef {import('../src/adapters/bidderFactory.js').Bid} Bid
 * @typedef {import('../src/adapters/bidderFactory.js').ServerRequest} ServerRequest
 */

const BIDDER_CODE = 'equativ';
const DEFAULT_TTL = 300;
const LOG_PREFIX = 'Equativ:';
const OUTSTREAM_RENDERER_URL = 'https://apps.sascdn.com/diff/video-outstream/equativ-video-outstream.js';

let feedbackArray = [];
let impIdMap = {};
let networkId = 0;
let tokens = {};

/**
 * Gets value of the local variable impIdMap
 * @returns {*} Value of impIdMap
 */
export function getImpIdMap() {
  return impIdMap;
}

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

/**
 * Updates bid request with data from previous auction
 * @param {*} req A bid request object to be updated
 * @returns {*} Updated bid request object
 */
function updateFeedbackData(req) {
  if (req?.ext?.prebid?.previousauctioninfo) {
    req.ext.prebid.previousauctioninfo.forEach(info => {
      if (tokens[info?.bidId]) {
        feedbackArray.push({
          feedback_token: tokens[info.bidId],
          loss: info.bidderCpm === info.highestBidCpm ? 0 : 102,
          price: info.highestBidCpm
        });

        delete tokens[info.bidId];
      }
    });

    delete req.ext.prebid;
  }

  if (feedbackArray.length) {
    deepSetValue(req, 'ext.bid_feedback', feedbackArray[0]);
    feedbackArray.shift();
  }

  return req;
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
      const data = converter.toORTB({ bidRequests: [bid], bidderRequest });
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
  interpretResponse: (serverResponse, bidRequest) => {
    if (bidRequest.data?.imp?.length) {
      bidRequest.data.imp.forEach(imp => {
        imp.id = impIdMap[imp.id];
      });
    }

    if (serverResponse.body?.seatbid?.length) {
      serverResponse.body.seatbid
        .filter(seat => seat?.bid?.length)
        .forEach(seat =>
          seat.bid.forEach(bid => {
            bid.impid = impIdMap[bid.impid];

            if (deepAccess(bid, 'ext.feedback_token')) {
              tokens[bid.impid] = bid.ext.feedback_token;
            }

            bid.ttl = typeof bid.exp === 'number' && bid.exp > 0 ? bid.exp : DEFAULT_TTL;
          })
        );
    }

    return converter.fromORTB({
      request: bidRequest.data,
      response: serverResponse.body,
    });
  },

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
   * @param serverResponses
   * @param gdprConsent
   * @returns {{type: string, url: string}[]}
   */
  getUserSyncs: (syncOptions, serverResponses, gdprConsent) =>
    handleCookieSync(syncOptions, serverResponses, gdprConsent, networkId, storage)
};

export const converter = ortbConverter({
  context: {
    netRevenue: true,
    ttl: DEFAULT_TTL
  },

  bidResponse(buildBidResponse, bid, context) {
    const { bidRequest } = context;
    const bidResponse = buildBidResponse(bid, context);

    if (bidResponse.mediaType === VIDEO && bidRequest.mediaTypes.video.context === 'outstream') {
      const renderer = Renderer.install({
        adUnitCode: bidRequest.adUnitCode,
        id: bidRequest.bidId,
        url: OUTSTREAM_RENDERER_URL,
      });

      renderer.setRender((bid) => {
        bid.renderer.push(() => {
          window.EquativVideoOutstream.renderAd({
            slotId: bid.adUnitCode,
            vast: bid.vastUrl || bid.vastXml
          });
        });
      });

      bidResponse.renderer = renderer;
    }

    return bidResponse;
  },

  imp(buildImp, bidRequest, context) {
    const imp = buildImp(bidRequest, context);
    const { siteId, pageId, formatId } = bidRequest.params;

    delete imp.dt;

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
    const currency = config.getConfig('currency.adServerCurrency') || 'USD';
    const splitImps = prepareSplitImps(imps, bid, currency, impIdMap, 'eqtv');

    let req = buildRequest(splitImps, bidderRequest, context);

    let env = ['ortb2.site.publisher', 'ortb2.app.publisher', 'ortb2.dooh.publisher'].find(propPath => deepAccess(bid, propPath)) || 'ortb2.site.publisher';
    networkId = deepAccess(bid, env + '.id') || bid.params.networkId;
    deepSetValue(req, env.replace('ortb2.', '') + '.id', networkId);

    [
      { path: 'mediaTypes.video', props: ['mimes', 'placement'] },
      { path: 'ortb2Imp.audio', props: ['mimes'] },
      { path: 'mediaTypes.native.ortb', props: ['privacy', 'plcmttype', 'eventtrackers'] },
    ].forEach(({ path, props }) => {
      if (deepAccess(bid, path)) {
        props.forEach(prop => {
          if (!deepAccess(bid, `${path}.${prop}`)) {
            logWarn(`${LOG_PREFIX} Property "${path}.${prop}" is missing from request. Request will proceed, but the use of "${prop}" is strongly encouraged.`, bid);
          }
        });
      }
    });

    const pid = storage.getDataFromLocalStorage(PID_STORAGE_NAME);
    if (pid) {
      deepSetValue(req, 'user.buyeruid', pid);
    }
    deepSetValue(req, 'ext.equativprebidjsversion', '$prebid.version$');

    req = updateFeedbackData(req);

    return req;
  }
});

registerBidder(spec);
