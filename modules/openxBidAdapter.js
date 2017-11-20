import { config } from 'src/config';
import {registerBidder} from 'src/adapters/bidderFactory';
import * as utils from 'src/utils';
import {userSync} from 'src/userSync';
import { BANNER, VIDEO } from 'src/mediaTypes';

const SUPPORTED_AD_TYPES = [BANNER, VIDEO];
const BIDDER_CODE = 'openx';
const BIDDER_CONFIG = 'hb_pb';
const BIDDER_VERSION = '2.0.0';

export const spec = {
  code: BIDDER_CODE,
  supportedMediaTypes: SUPPORTED_AD_TYPES,
  isBidRequestValid: function(bid) {
    if (bid.mediaType === VIDEO) {
      if (typeof bid.params.video !== 'object' || !bid.params.video.url) {
        return false;
      }
    }
    return !!(bid.params.unit && bid.params.delDomain);
  },
  buildRequests: function(bids) {
    let isIfr = utils.inIframe();
    let currentURL = (window.parent !== window) ? document.referrer : window.location.href;
    if (bids.length === 0) {
      return;
    }

    let requests = [];
    let bannerRequests = [];
    let videoRequests = [];
    let bannerBids = bids.filter(function(bid) { return bid.mediaType === BANNER; });
    let videoBids = bids.filter(function(bid) { return bid.mediaType === VIDEO; });

    // build banner requests
    if (bannerBids.length !== 0) {
      let delDomain = bannerBids[0].params.delDomain;
      let configuredBc = bannerBids[0].params.bc;
      let bc = configuredBc || `${BIDDER_CONFIG}_${BIDDER_VERSION}`;
      bannerRequests = [ buildOXRequest(bannerBids, {
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
      delDomain)];
    }
    // build video requests
    if (videoBids.length !== 0) {
      videoRequests = buildOXVideoRequest(videoBids);
    }

    requests = bannerRequests.concat(videoRequests);
    return requests;
  },
  interpretResponse: function({body: oxResponseObj}, bidRequest) {
    let bidResponses = [];
    let mediaType = BANNER;
    if (bidRequest && bidRequest.payload) {
      if (bidRequest.payload.bids) {
        mediaType = bidRequest.payload.bids[0].mediaType;
      } else if (bidRequest.payload.bid) {
        mediaType = bidRequest.payload.bid.mediaType;
      }
    }

    if (mediaType === VIDEO) {
      if (oxResponseObj && oxResponseObj.pixels) {
        userSync.registerSync('iframe', 'openx', oxResponseObj.pixels);
      }
      bidResponses = createVideoBidResponses(oxResponseObj, bidRequest.payload);
      return bidResponses;
    }

    let adUnits = oxResponseObj.ads.ad;
    if (oxResponseObj.ads && oxResponseObj.ads.pixels) {
      userSync.registerSync('iframe', BIDDER_CODE, oxResponseObj.ads.pixels);
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
  let shouldSendBoPixel = bids[0].params.sendBoPixel;
  if (shouldSendBoPixel === undefined) {
    // Not specified, default to turned on
    shouldSendBoPixel = true;
  }
  for (let i = 0; i < adUnits.length; i++) {
    let adUnit = adUnits[i];
    let bidResponse = {};
    if (adUnits.length == bids.length) {
      // request and response length match, directly assign the request id based on positioning
      bidResponse.requestId = bids[i].bidId;
    } else {
      for (let j = i; j < bids.length; j++) {
        let bid = bids[j];
        if (String(bid.params.unit) === String(adUnit.adunitid) && adUnitHasValidSizeFromBid(adUnit, bid) && !bid.matched) {
        // ad unit and size match, this is the correct bid response to bid
          bidResponse.requestId = bid.bidId;
          bid.matched = true;
          break;
        }
      }
    }

    if (adUnit.pub_rev) {
      bidResponse.cpm = Number(adUnit.pub_rev) / 1000;
    } else {
      // No fill, do not add the bidresponse
      continue;
    }
    let creative = adUnit.creative[0];
    if (creative) {
      bidResponse.width = creative.width;
      bidResponse.height = creative.height;
    }
    bidResponse.creativeId = creative.id;
    bidResponse.ad = adUnit.html;
    if (adUnit.deal_id) {
      bidResponse.dealId = adUnit.deal_id;
    }
    // default 5 mins
    bidResponse.ttl = 300;
    // true is net, false is gross
    bidResponse.netRevenue = true;
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
    let boUrl;
    if (shouldSendBoPixel) {
      boUrl = getBoUrl(adUnit.creative[0], beaconParams);
    }
    if (boUrl) {
      userSync.registerSync('image', BIDDER_CODE, boUrl);
    }
    bidResponses.push(bidResponse);
  }
  return bidResponses;
}

function getBoUrl(creative, params) {
  let recordPixel = creative.tracking.impression;
  let boBase = recordPixel.match(/([^?]+\/)ri\?/);

  if (boBase) {
    return `${boBase[1]}bo?${buildQueryStringFromParams(params)}`;
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

function adUnitHasValidSizeFromBid(adUnit, bid) {
  let sizes = utils.parseSizesInput(bid.sizes);
  if (!sizes) {
    return false;
  }
  let found = false;
  let creative = adUnit.creative && adUnit.creative[0];
  let creative_size = String(creative.width) + 'x' + String(creative.height);

  if (utils.isArray(sizes)) {
    for (let i = 0; i < sizes.length; i++) {
      let size = sizes[i];
      if (String(size) === String(creative_size)) {
        found = true;
        break;
      }
    }
  }
  return found;
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

function buildOXVideoRequest(bids) {
  return bids.map(function(bid) {
    let url = 'http://' + bid.params.delDomain + '/v/1.0/avjp';
    let oxVideoParams = generateVideoParameters(bid);
    return {
      method: 'GET',
      url: url,
      data: oxVideoParams,
      payload: {'bid': bid, 'startTime': new Date()}
    };
  });
}

function generateVideoParameters(bid) {
  let oxVideo = bid.params.video;
  let oxVideoParams = { auid: bid.params.unit };

  Object.keys(oxVideo).forEach(function(key) {
    if (key === 'openrtb') {
      oxVideoParams[key] = JSON.stringify(oxVideo[key]);
    } else {
      oxVideoParams[key] = oxVideo[key];
    }
  });
  oxVideoParams['be'] = 'true';
  return oxVideoParams;
}

function createVideoBidResponses(response, {bid, startTime}) {
  let bidResponses = [];

  if (response !== undefined && response.vastUrl !== '' && response.pub_rev !== '') {
    let bidResponse = {};
    bidResponse.requestId = bid.bidId;
    bidResponse.bidderCode = BIDDER_CODE;
    // default 5 mins
    bidResponse.ttl = 300;
    // true is net, false is gross
    bidResponse.netRevenue = true;
    bidResponse.currency = response.currency;
    bidResponse.cpm = Number(response.pub_rev) / 1000;
    bidResponse.width = response.width;
    bidResponse.height = response.height;
    bidResponse.creativeId = response.adid;
    bidResponse.vastUrl = response.vastUrl;
    bidResponse.mediaType = VIDEO;

    bidResponses.push(bidResponse);
  }

  return bidResponses;
}

registerBidder(spec);
