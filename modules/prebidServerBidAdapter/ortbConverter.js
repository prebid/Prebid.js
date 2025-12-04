import {ortbConverter} from '../../libraries/ortbConverter/converter.js';
import {deepClone, deepSetValue, getBidRequest, logError, logWarn, mergeDeep, timestamp} from '../../src/utils.js';
import {config} from '../../src/config.js';
import {S2S} from '../../src/constants.js';
import {createBid} from '../../src/bidfactory.js';
import {pbsExtensions} from '../../libraries/pbsExtensions/pbsExtensions.js';
import {setImpBidParams} from '../../libraries/pbsExtensions/processors/params.js';
import {SUPPORTED_MEDIA_TYPES} from '../../libraries/pbsExtensions/processors/mediaType.js';
import {IMP, REQUEST, RESPONSE} from '../../src/pbjsORTB.js';
import {redactor} from '../../src/activities/redactor.js';
import {s2sActivityParams} from '../../src/adapterManager.js';
import {activityParams} from '../../src/activities/activityParams.js';
import {MODULE_TYPE_BIDDER} from '../../src/activities/modules.js';
import {isActivityAllowed} from '../../src/activities/rules.js';
import {ACTIVITY_TRANSMIT_TID} from '../../src/activities/activities.js';
import {currencyCompare} from '../../libraries/currencyUtils/currency.js';
import {minimum} from '../../src/utils/reducers.js';
import {s2sDefaultConfig} from './index.js';
import {premergeFpd} from './bidderConfig.js';
import {ALL_MEDIATYPES, BANNER} from '../../src/mediaTypes.js';

const DEFAULT_S2S_TTL = 60;
const DEFAULT_S2S_CURRENCY = 'USD';
const DEFAULT_S2S_NETREVENUE = true;
const BIDDER_SPECIFIC_REQUEST_PROPS = new Set(['bidderCode', 'bidderRequestId', 'uniquePbsTid', 'bids', 'timeout']);

const getMinimumFloor = (() => {
  const getMin = minimum(currencyCompare(floor => [floor.bidfloor, floor.bidfloorcur]));
  return function(candidates) {
    let min = null;
    for (const candidate of candidates) {
      if (candidate?.bidfloorcur == null || candidate?.bidfloor == null) return null;
      min = min === null ? candidate : getMin(min, candidate);
    }
    return min;
  }
})();

const PBS_CONVERTER = ortbConverter({
  processors: pbsExtensions,
  context: {
    netRevenue: DEFAULT_S2S_NETREVENUE,
  },
  imp(buildImp, proxyBidRequest, context) {
    Object.assign(context, proxyBidRequest.pbsData);
    const imp = buildImp(proxyBidRequest, context);
    (proxyBidRequest.bids || []).forEach(bid => {
      if (bid.ortb2Imp && Object.keys(bid.ortb2Imp).length > 0) {
        // set bidder-level imp attributes; see https://github.com/prebid/prebid-server/issues/2335
        deepSetValue(imp, `ext.prebid.imp.${bid.bidder}`, bid.ortb2Imp);
      }
    });
    if (Object.values(SUPPORTED_MEDIA_TYPES).some(mtype => imp[mtype])) {
      imp.secure = proxyBidRequest.ortb2Imp?.secure ?? 1;
      return imp;
    }
  },
  request(buildRequest, imps, proxyBidderRequest, context) {
    if (!imps.length) {
      logError('Request to Prebid Server rejected due to invalid media type(s) in adUnit.');
    } else {
      const {s2sBidRequest} = context;
      const request = buildRequest(imps, proxyBidderRequest, context);

      request.tmax = Math.floor(s2sBidRequest.s2sConfig.timeout ?? Math.min(s2sBidRequest.requestBidsTimeout * 0.75, s2sBidRequest.s2sConfig.maxTimeout ?? s2sDefaultConfig.maxTimeout));
      request.ext.tmaxmax = request.ext.tmaxmax || s2sBidRequest.requestBidsTimeout;

      [request.app, request.dooh, request.site].forEach(section => {
        if (section && !section.publisher?.id) {
          deepSetValue(section, 'publisher.id', s2sBidRequest.s2sConfig.accountId);
        }
      })

      if (!context.transmitTids) {
        deepSetValue(request, 'ext.prebid.createtids', false);
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
    return {
      bid: Object.assign(createBid({
        src: S2S.SRC,
        bidId: bidRequest ? (bidRequest.bidId || bidRequest.bid_Id) : null,
        transactionId: context.adUnit.transactionId,
        adUnitId: context.adUnit.adUnitId,
        auctionId: context.bidderRequest.auctionId,
      }), bidResponse, {
        deferRendering: !!context.adUnit.deferBilling,
        deferBilling: !!context.adUnit.deferBilling
      }),
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
          setImpBidParams(imp, req);
          if (adapterOptions && adapterOptions[req.bidder]) {
            Object.assign(imp.ext.prebid.bidder[req.bidder], adapterOptions[req.bidder]);
          }
        }
      },
      // for bid floors, we pass each bidRequest associated with this imp through normal bidfloor/extBidfloor processing,
      // and aggregate all of them into a single, minimum floor to put in the request
      bidfloor(orig, imp, proxyBidRequest, context) {
        const min = getMinimumFloor((function * () {
          for (const req of context.actualBidRequests.values()) {
            const floor = {};
            orig(floor, req, context);
            yield floor;
          }
        })())
        if (min != null) {
          Object.assign(imp, min);
        }
      },
      extBidfloor(orig, imp, proxyBidRequest, context) {
        function setExtFloor(target, minFloor) {
          if (minFloor != null) {
            deepSetValue(target, 'ext.bidfloor', minFloor.bidfloor);
            deepSetValue(target, 'ext.bidfloorcur', minFloor.bidfloorcur);
          }
        }
        const imps = Array.from(context.actualBidRequests.values())
          .map(request => {
            const requestImp = deepClone(imp);
            orig(requestImp, request, context);
            return requestImp;
          });
        Object.values(ALL_MEDIATYPES).forEach(mediaType => {
          setExtFloor(imp[mediaType], getMinimumFloor(imps.map(imp => imp[mediaType]?.ext)))
        });
        (imp[BANNER]?.format || []).forEach((format, i) => {
          setExtFloor(format, getMinimumFloor(imps.map(imp => imp[BANNER].format[i]?.ext)))
        })
      }
    },
    [REQUEST]: {
      fpd(orig, ortbRequest, proxyBidderRequest, context) {
        // FPD is handled different for PBS - the base request will only contain global FPD;
        // bidder-specific values are set in ext.prebid.bidderconfig

        if (context.transmitTids) {
          deepSetValue(ortbRequest, 'source.tid', proxyBidderRequest.auctionId);
        }

        mergeDeep(ortbRequest, context.s2sBidRequest.ortb2Fragments?.global);

        // also merge in s2sConfig.extPrebid
        if (context.s2sBidRequest.s2sConfig.extPrebid && typeof context.s2sBidRequest.s2sConfig.extPrebid === 'object') {
          deepSetValue(ortbRequest, 'ext.prebid', mergeDeep(ortbRequest.ext?.prebid || {}, context.s2sBidRequest.s2sConfig.extPrebid));
        }

        // for global FPD, check allowed activities against "prebid.pbsBidAdapter"...
        context.getRedactor().ortb2(ortbRequest);

        const fpdConfigs = Object.entries(context.s2sBidRequest.ortb2Fragments?.bidder || {}).filter(([bidder]) => {
          const bidders = context.s2sBidRequest.s2sConfig.bidders;
          const allowUnknownBidderCodes = context.s2sBidRequest.s2sConfig.allowUnknownBidderCodes;
          return allowUnknownBidderCodes || (bidders && bidders.includes(bidder));
        }).map(([bidder, ortb2]) => ({
          // ... but for bidder specific FPD we can use the actual bidder
          bidders: [bidder],
          config: {ortb2: context.getRedactor(bidder).ortb2(ortb2)}
        }));
        if (fpdConfigs.length) {
          deepSetValue(ortbRequest, 'ext.prebid.bidderconfig', fpdConfigs);
        }

        // Handle schain information after FPD processing
        // Collect schains from bidder requests and organize into ext.prebid.schains
        let chains = ortbRequest?.ext?.prebid?.schains || [];
        const chainBidders = new Set(chains.flatMap((item) => item.bidders));

        chains = Object.values(
          chains
            .concat(context.actualBidderRequests
              .filter((req) => !chainBidders.has(req.bidderCode)) // schain defined in s2sConfig.extPrebid takes precedence
              .map((req) => ({
                bidders: [req.bidderCode],
                schain: req?.bids?.[0]?.ortb2?.source?.ext?.schain
              })))
            .filter(({bidders, schain}) => bidders?.length > 0 && schain)
            .reduce((chains, {bidders, schain}) => {
              const key = JSON.stringify(schain);
              if (!chains.hasOwnProperty(key)) {
                chains[key] = {bidders: new Set(), schain};
              }
              bidders.forEach((bidder) => chains[key].bidders.add(bidder));
              return chains;
            }, {})
        ).map(({bidders, schain}) => ({bidders: Array.from(bidders), schain}));

        if (chains.length) {
          deepSetValue(ortbRequest, 'ext.prebid.schains', chains);
        }
      },
      extPrebidAliases(orig, ortbRequest, proxyBidderRequest, context) {
        // override alias processing to do it for each bidder in the request
        context.actualBidderRequests.forEach(req => orig(ortbRequest, req, context));
      },
      extPrebidPageViewIds(orig, ortbRequest, proxyBidderRequest, context) {
        // override page view ID processing to do it for each bidder in the request
        context.actualBidderRequests.forEach(req => orig(ortbRequest, req, context));
      }
    },
    [RESPONSE]: {
      serverSideStats(orig, response, ortbResponse, context) {
        // override to process each request
        context.actualBidderRequests.forEach(req => orig(response, ortbResponse, {...context, bidderRequest: req, bidRequests: req.bids}));
      },
      paapiConfigs(orig, response, ortbResponse, context) {
        const configs = Object.values(context.impContext)
          .flatMap((impCtx) => (impCtx.paapiConfigs || []).map(cfg => {
            const bidderReq = impCtx.actualBidderRequests.find(br => br.bidderCode === cfg.bidder);
            const bidReq = impCtx.actualBidRequests.get(cfg.bidder);
            return {
              adUnitCode: impCtx.adUnit.code,
              ortb2: bidderReq?.ortb2,
              ortb2Imp: bidReq?.ortb2Imp,
              bidder: cfg.bidder,
              config: cfg.config
            };
          }));
        if (configs.length > 0) {
          response.paapi = configs;
        }
      }
    }
  },
});

export function buildPBSRequest(s2sBidRequest, bidderRequests, adUnits, requestedBidders) {
  const requestTimestamp = timestamp();
  const impIds = new Set();
  const proxyBidRequests = [];
  const s2sParams = s2sActivityParams(s2sBidRequest.s2sConfig);

  const getRedactor = (() => {
    const global = redactor(s2sParams);
    const bidders = {};
    return (bidder) => {
      if (bidder == null) return global;
      if (!bidders.hasOwnProperty(bidder)) {
        bidders[bidder] = redactor(activityParams(MODULE_TYPE_BIDDER, bidder));
      }
      return bidders[bidder]
    }
  })();

  adUnits = adUnits.map((au) => getRedactor().bidRequest(au))

  adUnits.forEach(adUnit => {
    const actualBidRequests = new Map();
    adUnits.bids = adUnit.bids.map(br => getRedactor(br.bidder).bidRequest(br));
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
      adUnitCode: adUnit.code,
      pbsData: {impId, actualBidRequests, adUnit},
    });
  });

  const proxyBidderRequest = {
    ...Object.fromEntries(Object.entries(bidderRequests[0]).filter(([k]) => !BIDDER_SPECIFIC_REQUEST_PROPS.has(k))),
    paapi: {
      enabled: bidderRequests.some(br => br.paapi?.enabled)
    }
  }

  return PBS_CONVERTER.toORTB({
    bidderRequest: proxyBidderRequest,
    bidRequests: proxyBidRequests,
    context: {
      currency: config.getConfig('currency.adServerCurrency') || DEFAULT_S2S_CURRENCY,
      ttl: s2sBidRequest.s2sConfig.defaultTtl || DEFAULT_S2S_TTL,
      requestTimestamp,
      s2sBidRequest: {
        ...s2sBidRequest,
        ortb2Fragments: premergeFpd(s2sBidRequest.ortb2Fragments, requestedBidders)
      },
      requestedBidders,
      actualBidderRequests: bidderRequests,
      nativeRequest: s2sBidRequest.s2sConfig.ortbNative,
      getRedactor,
      transmitTids: isActivityAllowed(ACTIVITY_TRANSMIT_TID, s2sParams),
    }
  });
}

export function interpretPBSResponse(response, request) {
  return PBS_CONVERTER.fromORTB({response, request});
}
