import { config } from 'src/config';
import {registerBidder} from 'src/adapters/bidderFactory';
import * as utils from 'src/utils';
import {userSync} from 'src/userSync';

const SUPPORTED_AD_TYPES = ['banner'];
const BIDDER_CODE = 'openx';
const BIDDER_CONFIG = 'hb_pb';
const BIDDER_VERSION = '2.0.0';

export const spec = {
  code: BIDDER_CODE,
  supportedMediaTypes: SUPPORTED_AD_TYPES,
  isBidRequestValid: function(bid) {
    return !!(bid.params.unit || bid.params.delDomain);
  },
  buildRequests: function(bids) {
    let isIfr;
    let currentURL = (window.parent !== window) ? document.referrer : window.location.href;
    try {
      isIfr = window.self !== window.top;
    } catch (e) {
      isIfr = false;
    }
    if (bids.length === 0) {
      return;
    }

    let delDomain = bids[0].params.delDomain;
    let configuredBc = bids[0].params.bc;
    let bc = configuredBc || `${BIDDER_CONFIG}_${BIDDER_VERSION}`;

    return buildOXRequest(bids, {
      ju: currentURL,
      jr: currentURL,
      ch: document.charSet || document.characterSet,
      res: `${screen.width}x${screen.height}x${screen.colorDepth}`,
      ifr: isIfr,
      tz: new Date().getTimezoneOffset(),
      tws: getViewportDimensions(isIfr),
      ef: 'bt%2Cdb',
      be: 1,
      bc: bc,
      nocache: new Date().getTime()
    },
    delDomain);
  },
  interpretResponse: function(oxResponseObj, bidRequest) {
    let bidResponses = [];
    let adUnits = oxResponseObj.ads.ad;
    if (oxResponseObj.ads && oxResponseObj.ads.pixels) {
      userSync.registerSync('iframe', 'openx', oxResponseObj.ads.pixels);
    }
    if (!adUnits) {
      adUnits = [];
    }
    bidResponses = createBidResponses(adUnits, bidRequest.payload);
    return bidResponses;
  }
};

function createBidResponses(adUnits, {bids, startTime}) {
  let bidResponses = [];
  for (let i = 0; i < adUnits.length; i++) {
    let adUnit = adUnits[i];
    let bidResponse = {};
    bidResponse.requestId = bids[i].bidId;
    bidResponse.bidderCode = BIDDER_CODE;
    let shouldSendBoPixel = bids.some((bid, index, arr) => { return bid.params.sendBoPixel; });

    if (adUnit.pub_rev) {
      bidResponse.cpm = Number(adUnit.pub_rev) / 1000;
    } else {
      bidResponse.cpm = 0;
    }
    let creative = adUnit.creative[0];
    if (creative) {
      bidResponse.width = creative.width;
      bidResponse.height = creative.height;
    }
    // need to wait for this to be exposed as well
    bidResponse.creativeId = creative.id;
    bidResponse.ad = adUnit.html;
    if (adUnit.deal_id) {
      bidResponse.dealId = adUnit.deal_id;
    }
    // default 5 mins 
    bidResponse.ttl = 300;
    // true is net, false is gross 
    bidResponse.netRevenue = true;
    // waiting for this to be exposed 
    bidResponse.currency = adUnit.currency;

    // additional fields to add 
    if (adUnit.tbd) {
      bidResponse.tbd = adUnit.tbd;
    }
    bidResponse.ts = adUnit.ts;

    let bt = config.getConfig('bidderTimeout');
    if (window.PREBID_TIMEOUT) {
      bt = Math.min(window.PREBID_TIMEOUT, bt);
    }
    let beaconParams = {
      bd: +(new Date()) - startTime,
      br: '0', // may be 0, t, or p
      bt: bt,
      bs: window.location.hostname
    };

    beaconParams.br = beaconParams.bt < beaconParams.bd ? 't' : 'p';
    beaconParams.bp = adUnit.pub_rev;
    beaconParams.ts = adUnit.ts;
    if (shouldSendBoPixel) {
      buildBoPixel(adUnit.creative[0], beaconParams);
    }
    bidResponses.push(bidResponse);
  }
  return bidResponses;
}

function buildBoPixel(creative, params) {
  let img = new Image();
  let recordPixel = creative.tracking.impression;
  let boBase = recordPixel.match(/([^?]+\/)ri\?/);

  if (boBase) {
    img.src = `${boBase[1]}bo?${buildQueryStringFromParams(params)}`;
  }
}

function buildQueryStringFromParams(params) {
  for (let key in params) {
    if (params.hasOwnProperty(key)) {
      if (!params[key]) {
        delete params[key];
      }
    }
  }
  return utils._map(Object.keys(params), key => `${key}=${params[key]}`)
    .join('&');
}

function getViewportDimensions(isIfr) {
  let width;
  let height;
  let tWin = window;
  let tDoc = document;
  let docEl = tDoc.documentElement;
  let body;

  if (isIfr) {
    try {
      tWin = window.top;
      tDoc = window.top.document;
    } catch (e) {
      return;
    }
    docEl = tDoc.documentElement;
    body = tDoc.body;

    width = tWin.innerWidth || docEl.clientWidth || body.clientWidth;
    height = tWin.innerHeight || docEl.clientHeight || body.clientHeight;
  } else {
    docEl = tDoc.documentElement;
    width = tWin.innerWidth || docEl.clientWidth;
    height = tWin.innerHeight || docEl.clientHeight;
  }

  return `${width}x${height}`;
}

function formatCustomParms(customKey, customParams) {
  let value = customParams[customKey];
  if (utils.isArray(value)) {
    // if value is an array, join them with commas first
    value = value.join(',');
  }
  // return customKey=customValue format, escaping + to . and / to _ 
  return (customKey.toLowerCase() + '=' + value.toLowerCase()).replace('+', '.').replace('/', '_')
}

function buildOXRequest(bids, oxParams, delDomain) {
  if (!utils.isArray(bids)) {
    return;
  }

  oxParams.auid = utils._map(bids, bid => bid.params.unit).join(',');
  oxParams.dddid = utils._map(bids, bid => bid.transactionId).join(',');
  oxParams.aus = utils._map(bids, bid => {
    return utils.parseSizesInput(bid.sizes).join(',');
  }).join('|');

  let customParamsForAllBids = [];
  let hasCustomParam = false;
  bids.forEach(function (bid) {
    if (bid.params.customParams) {
      let customParamsForBid = utils._map(Object.keys(bid.params.customParams), customKey => formatCustomParms(customKey, bid.params.customParams));
      let formattedCustomParams = window.btoa(customParamsForBid.join('&'));
      hasCustomParam = true;
      customParamsForAllBids.push(formattedCustomParams);
    } else {
      customParamsForAllBids.push('');
    }
  });
  if (hasCustomParam) {
    oxParams.tps = customParamsForAllBids.join(',');
  }

  let customFloorsForAllBids = [];
  let hasCustomFloor = false;
  bids.forEach(function (bid) {
    if (bid.params.customFloor) {
      customFloorsForAllBids.push(bid.params.customFloor * 1000);
      hasCustomFloor = true;
    } else {
      customFloorsForAllBids.push(0);
    }
  });
  if (hasCustomFloor) {
    oxParams.aumfs = customFloorsForAllBids.join(',');
  }

  let url = `//${delDomain}/w/1.0/arj`;
  return {
    method: 'GET',
    url: url,
    data: oxParams,
    payload: {'bids': bids, 'startTime': new Date()}
  };
}

registerBidder(spec);
