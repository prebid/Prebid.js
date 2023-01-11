import adapterManager from '../../../src/adapterManager.js';
import {deepAccess, timestamp, isEmpty, isPlainObject, getParameterByName, logWarn} from '../../../src/utils.js';
import {processNativeAdUnitParams} from '../../../src/native.js';

let impressionReqIdMap = {};
window.partnersWithoutErrorAndBids = {};
window.matchedimpressions = {};
let defaultAliases = {
  adg: 'adgeneration',
  districtm: 'appnexus',
  districtmDMX: 'dmx',
  pubmatic2: 'pubmatic'
}
// let isPrebidKeys = false;

let iidValue;
let firstBidRequest;

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

/**
 * Checks if window.location.search(i.e. string of query params on the page URL)
 * has specified query param with a values.
 * ex. pubmaticTest=true
 * @param {*} paramName regexp for which param lokking for ex. pubmaticTest
 * @param {*} values Values for the same ex. [1, true]
 * @returns boolean
 */
function hasQueryParam(paramName, values) {
  if (!paramName || !values || !values?.length) { return false; }
  let paramValue = getParameterByName(paramName);
  if (!paramValue) { return false; }
  return values?.some(value => value?.toString()?.toLowerCase() == paramValue?.toString()?.toLowerCase());
}

export function setReqParams(ortbRequest, bidderRequest, context, {am = adapterManager} = {}) {
  let { s2sConfig } = context.s2sBidRequest;
  let owAliases;
  //   isPrebidKeys = s2sConfig.extPrebid && s2sConfig.extPrebid.isUsePrebidKeysEnabled;
  // Check if sonobi partner is present in requestedbidders array.
  // let isSonobiPresent = context.requestedBidders.includes('sonobi');
  window.pbsLatency = window.pbsLatency || {};
  firstBidRequest = context.actualBidderRequests[0];
  // check if isPrebidPubMaticAnalyticsEnabled in s2sConfig and if it is then get auctionId from adUnit
  let isAnalyticsEnabled = s2sConfig.extPrebid && s2sConfig.extPrebid.isPrebidPubMaticAnalyticsEnabled;
  iidValue = isAnalyticsEnabled ? firstBidRequest.auctionId : firstBidRequest.bids[0].params.wiid;
  if (typeof s2sConfig.extPrebid === 'object') {
    owAliases = s2sConfig.extPrebid.aliases;
  }

  // Replace aliases with parent alias e.g. pubmatic2 should replace with pubmatic
  for (var bidder in ortbRequest.ext.prebid.aliases) {
    var defaultAlias = defaultAliases[ortbRequest.ext.prebid.aliases[bidder]];
    if (defaultAlias) {
      ortbRequest.ext.prebid.aliases[bidder] = defaultAlias;
    }
  }
  // Updating request.ext.prebid.bidderparams wiid if present
  if (s2sConfig.extPrebid && typeof s2sConfig.extPrebid.bidderparams === 'object') {
    var listOfPubMaticBidders = Object.keys(s2sConfig.extPrebid.bidderparams);
    listOfPubMaticBidders.forEach(function(bidder) {
      if (ortbRequest.ext.prebid.bidderparams[bidder]) {
        ortbRequest.ext.prebid.bidderparams[bidder]['wiid'] = iidValue;
      }
    })
  }

  // delete isPrebidPubMaticAnalyticsEnabled from extPrebid object as it not required in request.
  // it is only used to decide impressionId for wiid parameter in logger and tracker calls.
  delete ortbRequest.ext.prebid.isPrebidPubMaticAnalyticsEnabled;
  delete ortbRequest.ext.prebid.isUsePrebidKeysEnabled;

  ortbRequest.imp.forEach(imp => {
    let bidders = imp.ext.prebid.bidder;
    for (bidder in bidders) {
      let bid = imp.ext.prebid.bidder[bidder];
      // If bid params contains kgpv then delete it as we do not want to pass it in request.
      delete bid.kgpv;
      if ((bidder !== 'pubmatic') && !(owAliases && owAliases[bidder] && owAliases[bidder].includes('pubmatic'))) {
        delete bid.wiid;
      } else {
        if (isAnalyticsEnabled && bid.wiid == undefined) {
          bid.wiid = iidValue;
        }
      }
    }
  });
  context.s2sBidRequest.ad_units.forEach(adUnit => {
    const videoParams = deepAccess(adUnit, 'mediaTypes.video');
    const bannerParams = deepAccess(adUnit, 'mediaTypes.banner');
    const nativeParams = processNativeAdUnitParams(deepAccess(adUnit, 'mediaTypes.native'));
    if (nativeParams) {
      logWarn('OW server side dose not support native media types');
    }

    if (bannerParams && bannerParams.sizes) {
      // when profile is for banner delete macros from extPrebid object.
      if (ortbRequest?.ext?.prebid && ortbRequest?.ext?.prebid.macros && !videoParams) {
        delete ortbRequest?.ext?.prebid?.macros;
      }
    }

    if (!isEmpty(videoParams)) {
      // adding [UNIX_TIMESTAMP] & [WRAPPER_IMPRESSION_ID] in macros as it is required for tracking events.
      if (ortbRequest?.ext?.prebid && ortbRequest?.ext?.prebid.macros) {
        ortbRequest.ext.prebid.macros['[UNIX_TIMESTAMP]'] = timestamp().toString();
        ortbRequest.ext.prebid.macros['[WRAPPER_IMPRESSION_ID]'] = iidValue.toString();
      }
    }
  });

  createLatencyMap(iidValue, firstBidRequest.auctionId);
  //  TEST BID: Check if location URL has a query param pubmaticTest=true then set test=1
  //  else we don't need to send test: 0 to request payload.
  if (hasQueryParam('pubmaticTest', [true])) { ortbRequest.test = 1; }
}

export function setResponseParams(bidResponse, bid, context) {
  let dealChannelValues = {
    1: 'PMP',
    5: 'PREF',
    6: 'PMPG'
  };

  // Get impressionID from impressionReqIdMap to check response belongs to same request
  let impValue = impressionReqIdMap[context?.ortbResponse.id];
  if (impValue && window.pbsLatency[impValue]) {
    window.pbsLatency[impValue]['endTime'] = timestamp();
  }

  let extObj = context?.ortbResponse?.ext || {};
  let miObj = extObj.matchedimpression || {};
  window.matchedimpressions = {...window.matchedimpressions, ...miObj};
  const listofPartnersWithmi = window.partnersWithoutErrorAndBids[impValue] = Object.keys(miObj);
  const erroredPartners = getErroredPartners(context?.ortbResponse?.ext);
  if (erroredPartners) {
    findPartnersWithoutErrorsAndBids(erroredPartners, listofPartnersWithmi, context?.ortbResponse?.ext, impValue);
  }

  if (context?.ortbResponse?.seatbid) {
    let impForSlots, partnerBidsForslots;
    if (firstBidRequest.hasOwnProperty('adUnitsS2SCopy')) {
      impForSlots = firstBidRequest.adUnitsS2SCopy.length;
    }
    context?.ortbResponse?.seatbid.forEach(seatbid => {
      if (seatbid.hasOwnProperty('bid')) {
        partnerBidsForslots = seatbid.bid.length;
      }
      window.partnersWithoutErrorAndBids[impValue] = window.partnersWithoutErrorAndBids[impValue].filter((partner) => {
        return ((partner !== seatbid.seat) || (impForSlots !== partnerBidsForslots));
      });

      (seatbid.bid || []).forEach(bid => {
        bidResponse.adserverTargeting = {};
        let extPrebidTargeting = deepAccess(bid, 'ext.prebid.targeting');
        if (isPlainObject(extPrebidTargeting)) {
          if (extPrebidTargeting.hasOwnProperty('hb_buyid_pubmatic')) {
                    context?.s2sBidRequest?.s2sConfig?.extPrebid?.isUsePrebidKeysEnabled
                      ? bidResponse.adserverTargeting['hb_buyid_pubmatic'] = extPrebidTargeting['hb_buyid_pubmatic']
                      : bidResponse.adserverTargeting['pwtbuyid_pubmatic'] = extPrebidTargeting['hb_buyid_pubmatic'];
          }
        }

        bidResponse.width = bid.w || 0;
        bidResponse.height = bid.h || 0;

        // Add mi value to bidResponse as it will be required in wrapper logger call
        // Also we need to get serverSideResponseTime as it required to calculate l1 for wrapper logger call
        let partnerResponseTimeObj = extObj.responsetimemillis || {};
        bidResponse.mi = miObj.hasOwnProperty(seatbid.seat) ? miObj[seatbid.seat] : undefined;
        bidResponse.serverSideResponseTime = partnerResponseTimeObj.hasOwnProperty(seatbid.seat)
          ? partnerResponseTimeObj[seatbid.seat] : 0;

        // We need to add originalCpm & originalCurrency to bidResponse as these are required for wrapper logger and tracker calls
        // to calculates values for properties like ocpm, ocry & eg respectively.
        bidResponse.originalCpm = bid?.ext?.origbidcpm || bidResponse.cpm;
        bidResponse.originalCurrency = bid?.ext?.origbidcur || bidResponse.currency;

        // Add bid.id to sspID & partnerImpId as these are used in tracker and logger call
        if (seatbid.seat == 'pubmatic') {
          bidResponse.partnerImpId = bidResponse.sspID = bid.id || '';
          if (bid.dealid) {
            bidResponse.dealChannel = 'PMP';
          }
        }

        // check if bid ext contains deal_channel if present get value from dealChannelValues object
        if (bid.ext && bid.ext.deal_channel) {
          bidResponse.dealChannel = dealChannelValues[bid.ext.deal_channel];
        }
      });
    });
  }
}
