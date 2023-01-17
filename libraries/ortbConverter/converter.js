import {compose} from './lib/composer.js';
import {deepClone, logError, memoize, timestamp} from '../../src/utils.js';
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
  let impressionReqIdMap = {};
  let firstBidRequest;
  window.partnersWithoutErrorAndBids = {};
  window.matchedimpressions = {};
  
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

  function createLatencyMap(impressionID, id) {
    impressionReqIdMap[id] = impressionID;
    window.pbsLatency[impressionID] = {
      'startTime': timestamp()
    };
  }
  
  // Get list of all errored partners
  function getErroredPartners(responseExt) {
    if (responseExt && responseExt.errors) {
      return Object.keys(responseExt.errors);
    }
  }

  function findPartnersWithoutErrorsAndBids(erroredPartners, listofPartnersWithmi, responseExt, impValue) {
    window.partnersWithoutErrorAndBids[impValue] = listofPartnersWithmi.filter(partner => !erroredPartners.includes(partner));
    erroredPartners.forEach(partner => {
      if (responseExt.errors[partner] && responseExt.errors[partner][0].code == 1) {
        window.partnersWithoutErrorAndBids[impValue].push(partner);
      }
    })
  }

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

      firstBidRequest = ctx.req?.actualBidderRequests?.[0];
      // check if isPrebidPubMaticAnalyticsEnabled in s2sConfig and if it is then get auctionId from adUnit
      const s2sConfig = ctx.req?.s2sBidRequest?.s2sConfig;
      let isAnalyticsEnabled = s2sConfig?.extPrebid?.isPrebidPubMaticAnalyticsEnabled;
	  if(firstBidRequest) {
		const iidValue = isAnalyticsEnabled ? firstBidRequest.auctionId : firstBidRequest.bids[0].params.wiid;
      	createLatencyMap(iidValue, firstBidRequest.auctionId);
	  }
      return request;
    },
    fromORTB({request, response}) {
      // Get impressionID from impressionReqIdMap to check response belongs to same request
      let impValue = impressionReqIdMap[response.id];
      if (impValue && window.pbsLatency[impValue]) {
        window.pbsLatency[impValue]['endTime'] = timestamp();
      }

      const ctx = REQ_CTX.get(request);
      if (ctx == null) {
        throw new Error('ortbRequest passed to `fromORTB` must be the same object returned by `toORTB`')
      }
      function augmentContext(ctx, extraParams = {}) {
        return Object.assign({ortbRequest: request}, extraParams, ctx);
      }
      const impsById = Object.fromEntries((request.imp || []).map(imp => [imp.id, imp]));
      let impForSlots, partnerBidsForslots;
      if (firstBidRequest && firstBidRequest.hasOwnProperty('adUnitsS2SCopy')) {
        impForSlots = firstBidRequest.adUnitsS2SCopy.length;
      }

      let extObj = response.ext || {};
      let miObj = extObj.matchedimpression || {};
      window.matchedimpressions = {...window.matchedimpressions, ...miObj};

      const listofPartnersWithmi = window.partnersWithoutErrorAndBids[impValue] = Object.keys(miObj);
      const erroredPartners = getErroredPartners(extObj);
      if (erroredPartners) {
        findPartnersWithoutErrorsAndBids(erroredPartners, listofPartnersWithmi, extObj, impValue);
      }

      const bidResponses = (response.seatbid || []).flatMap(seatbid => {
          if (seatbid.hasOwnProperty('bid')) {
            partnerBidsForslots = seatbid.bid.length;
          }
          window.partnersWithoutErrorAndBids[impValue] = window.partnersWithoutErrorAndBids[impValue].filter((partner) => {
            return ((partner !== seatbid.seat) || (impForSlots !== partnerBidsForslots));
          });

          return (seatbid.bid || []).map((bid) => {
            if (impsById.hasOwnProperty(bid.impid) && ctx.imp.hasOwnProperty(bid.impid)) {
              return buildBidResponse(bid, augmentContext(ctx.imp[bid.impid], {imp: impsById[bid.impid], seatbid, ortbResponse: response}));
            }
            logError('ORTB response seatbid[].bid[].impid does not match any imp in request; ignoring bid', bid);
          })
        }
      ).filter(Boolean);
      return buildResponse(bidResponses, response, augmentContext(ctx.req));
    }
  }
}

export const defaultProcessors = memoize(() => mergeProcessors(DEFAULT_PROCESSORS, getProcessors(DEFAULT)));
