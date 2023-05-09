import { logError } from '../src/utils.js';
import { ajax } from '../src/ajax.js';
import { submodule } from '../src/hook.js';

const MODULE_NAME = 'greenbidsRtdProvider';
const MODULE_VERSION = '1.0.0';
const ENDPOINT = 'https://europe-west1-greenbids-357713.cloudfunctions.net/partner-selection';

const auctionInfo = {};
const rtdOptions = {};

function init(moduleConfig) {
  let params = moduleConfig?.params;
  if (!params?.pbuid) {
    logError('Greenbids pbuid is not set!');
    return false;
  } else {
    rtdOptions.pbuid = params?.pbuid;
    rtdOptions.targetTPR = params?.targetTPR || 0.99;
    rtdOptions.timeout = params?.timeout || 200;
    return true;
  }
}

function onAuctionInitEvent(auctionDetails) {
  auctionInfo.auctionId = auctionDetails.auctionId;
}

function getBidRequestData(reqBidsConfigObj, callback, config, userConsent) {
  let promise = createPromise(reqBidsConfigObj);
  promise.then(callback);
}

function createPromise(reqBidsConfigObj) {
  return new Promise((resolve) => {
    const timeoutId = setTimeout(() => {
      resolve(reqBidsConfigObj);
    }, rtdOptions.timeout);
    ajax(
      ENDPOINT,
      {
        success: (response) => {
          processSuccessResponse(response, timeoutId, reqBidsConfigObj);
          resolve(reqBidsConfigObj);
        },
        error: () => {
          clearTimeout(timeoutId);
          resolve(reqBidsConfigObj);
        },
      },
      createPayload(reqBidsConfigObj),
      { contentType: 'application/json' }
    );
  });
}

function processSuccessResponse(response, timeoutId, reqBidsConfigObj) {
  clearTimeout(timeoutId);
  const responseAdUnits = JSON.parse(response);

  updateAdUnitsBasedOnResponse(reqBidsConfigObj.adUnits, responseAdUnits);
}

function updateAdUnitsBasedOnResponse(adUnits, responseAdUnits) {
  adUnits.forEach((adUnit) => {
    const matchingAdUnit = findMatchingAdUnit(responseAdUnits, adUnit.code);
    if (matchingAdUnit) {
      removeFalseBidders(adUnit, matchingAdUnit);
    }
  });
}

function findMatchingAdUnit(responseAdUnits, adUnitCode) {
  return responseAdUnits.find((responseAdUnit) => responseAdUnit.code === adUnitCode);
}

function removeFalseBidders(adUnit, matchingAdUnit) {
  const falseBidders = getFalseBidders(matchingAdUnit.bidders);
  adUnit.bids = adUnit.bids.filter((bidRequest) => !falseBidders.includes(bidRequest.bidder));
}

function getFalseBidders(bidders) {
  return Object.entries(bidders)
    .filter(([bidder, shouldKeep]) => !shouldKeep)
    .map(([bidder]) => bidder);
}

function createPayload(reqBidsConfigObj) {
  return JSON.stringify({
    auctionId: auctionInfo.auctionId,
    version: MODULE_VERSION,
    referrer: window.location.href,
    prebid: '$prebid.version$',
    rtdOptions: rtdOptions,
    adUnits: reqBidsConfigObj.adUnits,
  });
}

export const greenbidsSubmodule = {
  name: MODULE_NAME,
  init: init,
  onAuctionInitEvent: onAuctionInitEvent,
  getBidRequestData: getBidRequestData,
  updateAdUnitsBasedOnResponse: updateAdUnitsBasedOnResponse,
  findMatchingAdUnit: findMatchingAdUnit,
  removeFalseBidders: removeFalseBidders,
  getFalseBidders: getFalseBidders,
};

submodule('realTimeData', greenbidsSubmodule);
