import {compose} from './lib/composer.js';
import {deepClone, logError, memoize} from '../../src/utils.js';
import {DEFAULT_PROCESSORS} from './processors/default.js';
import {BID_RESPONSE, DEFAULT, getProcessors, IMP, REQUEST, RESPONSE} from '../../src/pbjsORTB.js';
import {mergeProcessors} from './lib/mergeProcessors.js';

export function ortbConverter({
  context: defaultContext = {},
  processors = defaultProcessors,
  overrides = {},
  imp,
  request,
  bidResponse,
  response,
} = {}) {
  const REQ_CTX = new WeakMap();

  function builder(slot, wrapperFn, builderFn, errorHandler) {
    let build;
    return function () {
      if (build == null) {
        build = (function () {
          let delegate = builderFn.bind(this, compose(processors()[slot] || {}, overrides[slot] || {}));
          if (wrapperFn) {
            delegate = wrapperFn.bind(this, delegate);
          }
          return function () {
            try {
              return delegate.apply(this, arguments);
            } catch (e) {
              errorHandler.call(this, e, ...arguments);
            }
          }
        })();
      }
      return build.apply(this, arguments);
    }
  }

  const buildImp = builder(IMP, imp,
    function (process, bidRequest, context) {
      const imp = {};
      process(imp, bidRequest, context);
      return imp;
    },
    function (error, bidRequest, context) {
      logError('Error while converting bidRequest to ORTB imp; request skipped.', {error, bidRequest, context});
    }
  );

  const buildRequest = builder(REQUEST, request,
    function (process, imps, bidderRequest, context) {
      const ortbRequest = {imp: imps};
      process(ortbRequest, bidderRequest, context);
      return ortbRequest;
    },
    function (error, imps, bidderRequest, context) {
      logError('Error while converting to ORTB request', {error, imps, bidderRequest, context});
      throw error;
    }
  );

  const buildBidResponse = builder(BID_RESPONSE, bidResponse,
    function (process, bid, context) {
      const bidResponse = {};
      process(bidResponse, bid, context);
      return bidResponse;
    },
    function (error, bid, context) {
      logError('Error while converting ORTB seatbid.bid to bidResponse; bid skipped.', {error, bid, context});
    }
  );

  const buildResponse = builder(RESPONSE, response,
    function (process, bidResponses, ortbResponse, context) {
      const response = {bids: bidResponses};
      process(response, ortbResponse, context);
      return response;
    },
    function (error, bidResponses, ortbResponse, context) {
      logError('Error while converting from ORTB response', {error, bidResponses, ortbResponse, context});
      throw error;
    }
  );

  return {
    toORTB({bidderRequest, bidRequests, context = {}}) {
      bidRequests = bidRequests || bidderRequest.bids;
      const ctx = {
        req: Object.assign({bidRequests}, defaultContext, context),
        imp: {}
      }
      const imps = bidRequests.map(bidRequest => {
        const impContext = Object.assign({bidderRequest, reqContext: ctx.req}, defaultContext, context);
        const result = buildImp(bidRequest, impContext);
        let resultCopy = deepClone(result);

        if (resultCopy?.ext?.prebid?.bidder) {
          for (let bidderCode in resultCopy.ext.prebid.bidder) {
            let bid = resultCopy.ext.prebid.bidder[bidderCode];
            delete bid?.kgpv;
          }
        }
        if (resultCopy != null) {
          if (resultCopy.hasOwnProperty('id')) {
            impContext.bidRequest = bidRequest;
            ctx.imp[resultCopy.id] = impContext;
            return resultCopy;
          }
          logError('Converted ORTB imp does not specify an id, ignoring bid request', bidRequest, resultCopy);
        }
      }).filter(Boolean);

      const request = buildRequest(imps, bidderRequest, ctx.req);
      ctx.req.bidderRequest = bidderRequest;
      if (request != null) {
        REQ_CTX.set(request, ctx);
      }
      return request;
    },
    fromORTB({request, response}) {
      const ctx = REQ_CTX.get(request);
      if (ctx == null) {
        throw new Error('ortbRequest passed to `fromORTB` must be the same object returned by `toORTB`')
      }
      function augmentContext(ctx, extraParams = {}) {
        return Object.assign({ortbRequest: request}, extraParams, ctx);
      }
      const impsById = Object.fromEntries((request.imp || []).map(imp => [imp.id, imp]));
      const bidResponses = (response.seatbid || []).flatMap(seatbid =>
        (seatbid.bid || []).map((bid) => {
          if (impsById.hasOwnProperty(bid.impid) && ctx.imp.hasOwnProperty(bid.impid)) {
            return buildBidResponse(bid, augmentContext(ctx.imp[bid.impid], {imp: impsById[bid.impid], seatbid, ortbResponse: response}));
          }
          logError('ORTB response seatbid[].bid[].impid does not match any imp in request; ignoring bid', bid);
        })
      ).filter(Boolean);
      return buildResponse(bidResponses, response, augmentContext(ctx.req));
    }
  }
}

export const defaultProcessors = memoize(() => mergeProcessors(DEFAULT_PROCESSORS, getProcessors(DEFAULT)));
