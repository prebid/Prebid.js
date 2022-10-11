import {ortbConverter} from '../../libraries/ortbConverter/converter.js';
import {
  deepAccess,
  deepSetValue,
  getBidRequest,
  getDefinedParams,
  isArray,
  logError,
  logWarn,
  mergeDeep,
  timestamp
} from '../../src/utils.js';
import {config} from '../../src/config.js';
import CONSTANTS from '../../src/constants.json';
import {createBid} from '../../src/bidfactory.js';
import {pbsExtensions} from '../../libraries/pbsExtensions/pbsExtensions.js';
import {setImpBidParams} from '../../libraries/pbsExtensions/processors/params.js';
import {SUPPORTED_MEDIA_TYPES} from '../../libraries/pbsExtensions/processors/mediaType.js';
import {IMP, REQUEST, RESPONSE} from '../../src/pbjsORTB.js';
import {beConvertCurrency} from '../../src/utils/currency.js';

const DEFAULT_S2S_TTL = 60;
const DEFAULT_S2S_CURRENCY = 'USD';
const DEFAULT_S2S_NETREVENUE = true;
const BIDDER_SPECIFIC_REQUEST_PROPS = new Set(['bidderCode', 'bidderRequestId', 'uniquePbsTid', 'bids', 'timeout']);

const PBS_CONVERTER = ortbConverter({
  processors: pbsExtensions,
  context: {
    netRevenue: DEFAULT_S2S_NETREVENUE,
  },
  imp(buildImp, proxyBidRequest, context) {
    Object.assign(context, proxyBidRequest.pbsData);
    const imp = buildImp(proxyBidRequest, context);
    if (Object.values(SUPPORTED_MEDIA_TYPES).some(mtype => imp[mtype])) {
      imp.secure = context.s2sBidRequest.s2sConfig.secure;
      return imp;
    }
  },
  request(buildRequest, imps, proxyBidderRequest, context) {
    if (!imps.length) {
      logError('Request to Prebid Server rejected due to invalid media type(s) in adUnit.');
    } else {
      let {s2sBidRequest, requestedBidders, eidPermissions} = context;
      const request = buildRequest(imps, proxyBidderRequest, context);

      request.tmax = s2sBidRequest.s2sConfig.timeout;
      deepSetValue(request, 'source.tid', proxyBidderRequest.auctionId);

      [request.app, request.site].forEach(section => {
        if (section && !section.publisher?.id) {
          deepSetValue(section, 'publisher.id', s2sBidRequest.s2sConfig.accountId);
        }
      })

      if (isArray(eidPermissions) && eidPermissions.length > 0) {
        if (requestedBidders && isArray(requestedBidders)) {
          eidPermissions = eidPermissions.map(p => ({
            ...p,
            bidders: p.bidders.filter(bidder => requestedBidders.includes(bidder))
          }))
        }
        deepSetValue(request, 'ext.prebid.data.eidpermissions', eidPermissions);
      }

      return request;
    }
  },
  bidResponse(buildBidResponse, bid, context) {
    // before sending the response throgh "stock" ortb conversion, here we need to:
    // - filter out ones that come from an "unknown" bidder (if allowUnknownBidderCode is not set)
    // - overwrite context.bidRequest with the actual bid request for this seat / imp combination

    let bidRequest = context.actualBidRequests.get(context.seatbid.seat);
    if (bidRequest == null) {
      // for stored impressions, a request was made with bidder code `null`. Pick it up here so that NO_BID, BID_WON, etc events
      // can work as expected (otherwise, the original request will always result in NO_BID).
      bidRequest = context.actualBidRequests.get(null);
    }

    if (bidRequest) {
      Object.assign(context, {
        bidRequest,
        bidderRequest: context.actualBidderRequests.find(req => req.bidderCode === bidRequest.bidder)
      })
    }

    const bidResponse = buildBidResponse(bid, context);
    bidResponse.requestBidder = bidRequest?.bidder;

    if (bidResponse.native?.ortb) {
      // TODO: do we need to set bidResponse.adm here?
      // Any consumers can now get the same object from bidResponse.native.ortb;
      // I could not find any, which raises the question - who is looking for this?
      bidResponse.adm = bidResponse.native.ortb;
    }

    // because core has special treatment for PBS adapter responses, we need some additional processing
    bidResponse.requestTimestamp = context.requestTimestamp;
    const status = bid.price !== 0 ? CONSTANTS.STATUS.GOOD : CONSTANTS.STATUS.NO_BID;
    return {
      bid: Object.assign(createBid(status, {
        src: CONSTANTS.S2S.SRC,
        bidId: bidRequest ? (bidRequest.bidId || bidRequest.bid_Id) : null,
        transactionId: context.adUnit.transactionId,
        auctionId: context.bidderRequest.auctionId,
      }), bidResponse),
      adUnit: context.adUnit.code
    };
  },
  overrides: {
    [IMP]: {
      id(orig, imp, proxyBidRequest, context) {
        imp.id = context.impId;
      },
      params(orig, imp, proxyBidRequest, context) {
        // override params processing to do it for each bidRequest in this imp;
        // also, take overrides from s2sConfig.adapterOptions
        const adapterOptions = context.s2sBidRequest.s2sConfig.adapterOptions;
        for (const req of context.actualBidRequests.values()) {
          setImpBidParams(imp, req, context, context);
          if (adapterOptions && adapterOptions[req.bidder]) {
            Object.assign(imp.ext.prebid.bidder[req.bidder], adapterOptions[req.bidder]);
          }
        }
      },
      bidfloor(orig, imp, proxyBidRequest, context) {
        // for bid floors, we pass each bidRequest associated with this imp through normal bidfloor processing,
        // and aggregate all of them into a single, minimum floor to put in the request
        let min;
        for (const req of context.actualBidRequests.values()) {
          const floor = {};
          orig(floor, req, context);
          // if any bid does not have a valid floor, do not attempt to send any to PBS
          if (floor.bidfloorcur == null || floor.bidfloor == null) {
            min = null;
            break;
          } else if (min == null) {
            min = floor;
          } else {
            const value = beConvertCurrency(floor.bidfloor, floor.bidfloorcur, min.bidfloorcur);
            if (value != null && value < min.bidfloor) {
              min = floor;
            }
          }
        }
        if (min != null) {
          Object.assign(imp, min);
        }
      }
    },
    [REQUEST]: {
      fpd(orig, ortbRequest, proxyBidderRequest, context) {
        // FPD is handled different for PBS - the base request will only contain global FPD;
        // bidder-specific values are set in ext.prebid.bidderconfig

        mergeDeep(ortbRequest, context.s2sBidRequest.ortb2Fragments?.global);

        // also merge in s2sConfig.extPrebid
        if (context.s2sBidRequest.s2sConfig.extPrebid && typeof context.s2sBidRequest.s2sConfig.extPrebid === 'object') {
          deepSetValue(ortbRequest, 'ext.prebid', mergeDeep(ortbRequest.ext?.prebid || {}, context.s2sBidRequest.s2sConfig.extPrebid));
        }

        const fpdConfigs = Object.entries(context.s2sBidRequest.ortb2Fragments?.bidder || {}).map(([bidder, ortb2]) => ({
          bidders: [bidder],
          config: {ortb2}
        }));
        if (fpdConfigs.length) {
          deepSetValue(ortbRequest, 'ext.prebid.bidderconfig', fpdConfigs);
        }
      },
      extPrebidAliases(orig, ortbRequest, proxyBidderRequest, context) {
        // override alias processing to do it for each bidder in the request
        context.actualBidderRequests.forEach(req => orig(ortbRequest, req, context));
      },
      sourceExtSchain(orig, ortbRequest, proxyBidderRequest, context) {
        // pass schains in ext.prebid.schains, with the most commonly used one in source.ext.schain
        let mainChain;

        let chains = (deepAccess(ortbRequest, 'ext.prebid.schains') || []);
        const chainBidders = new Set(chains.flatMap((item) => item.bidders));

        chains = Object.values(
          chains
            .concat(context.actualBidderRequests
              .filter((req) => !chainBidders.has(req.bidderCode)) // schain defined in s2sConfig.extPrebid takes precedence
              .map((req) => ({
                bidders: [req.bidderCode],
                schain: deepAccess(req, 'bids.0.schain')
              })))
            .filter(({bidders, schain}) => bidders?.length > 0 && schain)
            .reduce((chains, {bidders, schain}) => {
              const key = JSON.stringify(schain);
              if (!chains.hasOwnProperty(key)) {
                chains[key] = {bidders: new Set(), schain};
              }
              bidders.forEach((bidder) => chains[key].bidders.add(bidder));
              if (mainChain == null || chains[key].bidders.size > mainChain.bidders.size) {
                mainChain = chains[key]
              }
              return chains;
            }, {})
        ).map(({bidders, schain}) => ({bidders: Array.from(bidders), schain}));

        if (mainChain != null) {
          deepSetValue(ortbRequest, 'source.ext.schain', mainChain.schain);
        }

        if (chains.length) {
          deepSetValue(ortbRequest, 'ext.prebid.schains', chains);
        }
      }
    },
    [RESPONSE]: {
      serverSideStats(orig, response, ortbResponse, context) {
        // override to process each request
        context.actualBidderRequests.forEach(req => orig(response, ortbResponse, {...context, bidderRequest: req, bidRequests: req.bids}));
      }
    }
  },
});

export function buildPBSRequest(s2sBidRequest, bidderRequests, adUnits, requestedBidders, eidPermissions) {
  const requestTimestamp = timestamp();
  const impIds = new Set();
  const proxyBidRequests = [];

  adUnits.forEach(adUnit => {
    const actualBidRequests = new Map();

    adUnit.bids.forEach((bid) => {
      if (bid.mediaTypes != null) {
        // TODO: support labels / conditional bids
        // for now, just warn about them
        logWarn(`Prebid Server adapter does not (yet) support bidder-specific mediaTypes for the same adUnit. Size mapping configuration will be ignored for adUnit: ${adUnit.code}, bidder: ${bid.bidder}`);
      }
      actualBidRequests.set(bid.bidder, getBidRequest(bid.bid_id, bidderRequests));
    });

    let impId = adUnit.code;
    let i = 1;
    while (impIds.has(impId)) {
      i++;
      impId = `${adUnit.code}-${i}`;
    }
    impIds.add(impId)
    proxyBidRequests.push({
      ...adUnit,
      ...getDefinedParams(actualBidRequests.values().next().value || {}, ['userId', 'userIdAsEids', 'schain']),
      pbsData: {impId, actualBidRequests, adUnit}
    });
  });

  const proxyBidderRequest = Object.fromEntries(Object.entries(bidderRequests[0]).filter(([k]) => !BIDDER_SPECIFIC_REQUEST_PROPS.has(k)))

  return PBS_CONVERTER.toORTB({
    bidderRequest: proxyBidderRequest,
    bidRequests: proxyBidRequests,
    context: {
      currency: config.getConfig('currency.adServerCurrency') || DEFAULT_S2S_CURRENCY,
      ttl: s2sBidRequest.s2sConfig.defaultTtl || DEFAULT_S2S_TTL,
      requestTimestamp,
      s2sBidRequest,
      requestedBidders,
      actualBidderRequests: bidderRequests,
      eidPermissions,
      nativeRequest: s2sBidRequest.s2sConfig.ortbNative,
    }
  });
}

export function interpretPBSResponse(response, request) {
  return PBS_CONVERTER.fromORTB({response, request});
}
