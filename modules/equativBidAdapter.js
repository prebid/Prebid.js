import { BANNER } from '../src/mediaTypes.js';
import { ortbConverter } from '../libraries/ortbConverter/converter.js';
import { registerBidder } from '../src/adapters/bidderFactory.js';
import { deepAccess, deepSetValue, mergeDeep } from '../src/utils.js';

/**
 * @typedef {import('../src/adapters/bidderFactory.js').Bid} Bid
 * @typedef {import('../src/adapters/bidderFactory.js').ServerRequest} ServerRequest
 */

export const spec = {
  code: 'equativ',
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
      url: 'https://ssb-global.smartadserver.com/api/bid?callerId=169',
    };
  },

  /**
   * @param serverResponse
   * @param bidRequest
   * @return {Bid[]}
   */
  interpretResponse: (serverResponse, bidRequest) =>
    converter.fromORTB({
      request: bidRequest.data,
      response: serverResponse.body,
    }),

  /**
   * @param bidRequest
   * @return {boolean}
   */
  isBidRequestValid: (bidRequest) => {
    return !!(
      deepAccess(bidRequest, 'params.networkId') ||
      deepAccess(bidRequest, 'ortb2Imp.site.publisher.id') ||
      deepAccess(bidRequest, 'ortb2Imp.app.publisher.id') ||
      deepAccess(bidRequest, 'ortb2Imp.dooh.publisher.id')
    );
  },

  /**
   * @param syncOptions
   * @param serverResponse
   * @return {{type: string, url: string}[]}
   */
  getUserSyncs: (syncOptions, serverResponse) => {
    // if (syncOptions.iframeEnabled && serverResponses[0]?.body.cSyncUrl) {
    //   return [
    //     {
    //       type: 'iframe',
    //       url: serverResponses[0].body.cSyncUrl,
    //     },
    //   ];
    // }
    return (syncOptions.pixelEnabled && serverResponse.body.dspPixels)
      ? serverResponse.body.dspPixels.map((pixel) => ({
        type: 'image',
        url: pixel,
      })) : [];
  },
};

export const converter = ortbConverter({
  context: {
    netRevenue: true,
    ttl: 300,
  },

  imp(buildImp, bidRequest, context) {
    const imp = buildImp(bidRequest, context);
    const { siteId, pageId, formatId } = bidRequest.params;

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

    if (bid.params.networkId) {
      deepSetValue(req, 'site.publisher.id', bid.params.networkId);
    }

    return req;
  },
});

registerBidder(spec);
