import { ortbConverter } from '../libraries/ortbConverter/converter.js';
import { registerBidder } from '../src/adapters/bidderFactory.js';
import { BANNER, VIDEO } from '../src/mediaTypes.js';
import { deepAccess, deepSetValue, isFn, logError, logWarn, mergeDeep } from '../src/utils.js';

const LOG_PREFIX = 'Equativ:';

/**
 * Evaluates a bid request for validity.  Returns false if the 
 * request contains a video media type with no properties, true
 * otherwise.
 * @param {*} bidReq - A bid request object to evaluate
 * @returns boolean 
 */
function isValid(bidReq){
  if (bidReq.mediaTypes.video && JSON.stringify(bidReq.mediaTypes.video) === '{}') {
    return false;
  } else {
    return true;
  }
}

/**
 * @typedef {import('../src/adapters/bidderFactory.js').Bid} Bid
 * @typedef {import('../src/adapters/bidderFactory.js').ServerRequest} ServerRequest
 */

export const spec = {
  code: 'equativ',
  gvlid: 45,
  supportedMediaTypes: [BANNER, VIDEO],

  /**
   * @param bidRequests
   * @param bidderRequest
   * @returns {ServerRequest[]}
   */
  buildRequests: (bidRequests, bidderRequest) => {
    if (bidRequests.filter(isValid).length === 0) {
      logError(`${LOG_PREFIX} No useful bid requests to process. No request will be sent.`, bidRequests);
      return undefined
    }
    return {
      data: converter.toORTB({ bidderRequest, bidRequests }),
      method: 'POST',
      url: 'https://ssb-engine-argocd-dev.internal.smartadserver.com/api/bid?callerId=169' // TODO: SADR-6484: temporary URL for testing
      // url: 'https://ssb-global.smartadserver.com/api/bid?callerId=169' // TODO: SADR-6484: original URL to be used after testing
    };
  },

  /**
   * @param bidRequest
   * @returns {number}
   */
  getMinFloor: (bidRequest) => {
    const floors = [];

    if (isFn(bidRequest.getFloor)) {
      (deepAccess(bidRequest, 'mediaTypes.banner.sizes') || []).forEach(size => {
        const floor = bidRequest.getFloor({ size }).floor;
        if (!isNaN(floor)) {
          floors.push(floor);
        } else {
          floors.push(0.0);
        }
      });
    }

    return floors.length ? Math.min(...floors) : 0.0;
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
   * @param serverResponse
   * @returns {{type: string, url: string}[]}
   */
  // getUserSyncs: (syncOptions, serverResponse) => {
  //   if (syncOptions.iframeEnabled && serverResponses[0]?.body.cSyncUrl) {
  //     return [
  //       {
  //         type: 'iframe',
  //         url: serverResponses[0].body.cSyncUrl,
  //       },
  //     ];
  //   }
  //   return (syncOptions.pixelEnabled && serverResponse.body?.dspPixels)
  //     ? serverResponse.body.dspPixels.map((pixel) => ({
  //       type: 'image',
  //       url: pixel,
  //     })) : [];
  // },
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

    imp.bidfloor = imp.bidfloor || spec.getMinFloor(bidRequest);
    imp.secure = Number(window.location.protocol === 'https:');
    imp.tagid = bidRequest.adUnitCode;

    if (bidRequest.mediaTypes.video && !!bidRequest.mediaTypes.video.ext.rewarded) {
      mergeDeep(imp.video, {
        ext: { rewarded: bidRequest.mediaTypes.video.ext.rewarded },
      })  
    }

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

    if (bid.mediaTypes.video && !bid.mediaTypes.video.mimes) {
      logWarn(`${LOG_PREFIX} Property "mimes" is missing from request`, bid); // TODO: SADR-6484: message OK?  Should it say something else?
    }
    if (bid.mediaTypes.video && !bid.mediaTypes.video.placement) {
      logWarn(`${LOG_PREFIX} Property "placement" is missing from request`, bid); // TODO: SADR-6484: message OK?  Should it say something else?
    }

    return req;
  },
});

registerBidder(spec);
