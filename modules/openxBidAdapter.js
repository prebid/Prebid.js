const bidfactory = require('src/bidfactory.js');
const bidmanager = require('src/bidmanager.js');
const adloader = require('src/adloader');
const CONSTANTS = require('src/constants.json');
const utils = require('src/utils.js');
const adaptermanager = require('src/adaptermanager');

const OpenxAdapter = function OpenxAdapter() {
  const BIDDER_CODE = 'openx';
  const BIDDER_CONFIG = 'hb_pb';
  let startTime;

  let pdNode = null;

  $$PREBID_GLOBAL$$.oxARJResponse = function (oxResponseObj) {
    let adUnits = oxResponseObj.ads.ad;
    if (oxResponseObj.ads && oxResponseObj.ads.pixels) {
      makePDCall(oxResponseObj.ads.pixels);
    }

    if (!adUnits) {
      adUnits = [];
    }

    let bids = $$PREBID_GLOBAL$$._bidsRequested.find(bidSet => bidSet.bidderCode === 'openx').bids;
    for (let i = 0; i < bids.length; i++) {
      let bid = bids[i];
      let auid = null;
      let adUnit = null;
      // find the adunit in the response
      for (let j = 0; j < adUnits.length; j++) {
        adUnit = adUnits[j];
        if (String(bid.params.unit) === String(adUnit.adunitid) && adUnitHasValidSizeFromBid(adUnit, bid) && !adUnit.used) {
          auid = adUnit.adunitid;
          break;
        }
      }

      let beaconParams = {
        bd: +(new Date()) - startTime,
        br: '0', // maybe 0, t, or p
        bt: $$PREBID_GLOBAL$$.cbTimeout || $$PREBID_GLOBAL$$.bidderTimeout, // For the timeout per bid request
        bs: window.location.hostname
      };

      // no fill :(
      if (!auid || !adUnit.pub_rev) {
        addBidResponse(null, bid);
        continue;
      }
      adUnit.used = true;

      beaconParams.br = beaconParams.bt < beaconParams.bd ? 't' : 'p';
      beaconParams.bp = adUnit.pub_rev;
      beaconParams.ts = adUnit.ts;
      addBidResponse(adUnit, bid);
      buildBoPixel(adUnit.creative[0], beaconParams);
    }
  };

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

  function makePDCall(pixelsUrl) {
    let pdFrame = utils.createInvisibleIframe();
    let name = 'openx-pd';
    pdFrame.setAttribute('id', name);
    pdFrame.setAttribute('name', name);
    let rootNode = document.body;

    if (!rootNode) {
      return;
    }

    pdFrame.src = pixelsUrl;

    if (pdNode) {
      pdNode.parentNode.replaceChild(pdFrame, pdNode);
      pdNode = pdFrame;
    } else {
      pdNode = rootNode.appendChild(pdFrame);
    }
  }

  function addBidResponse(adUnit, bid) {
    let bidResponse = bidfactory.createBid(adUnit ? CONSTANTS.STATUS.GOOD : CONSTANTS.STATUS.NO_BID, bid);
    bidResponse.bidderCode = BIDDER_CODE;

    if (adUnit) {
      let creative = adUnit.creative[0];
      bidResponse.ad = adUnit.html;
      bidResponse.cpm = Number(adUnit.pub_rev) / 1000;
      bidResponse.ad_id = adUnit.adid;
      if (adUnit.deal_id) {
        bidResponse.dealId = adUnit.deal_id;
      }
      if (creative) {
        bidResponse.width = creative.width;
        bidResponse.height = creative.height;
      }
    }
    bidmanager.addBidResponse(bid.placementCode, bidResponse);
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

  function buildBoPixel(creative, params) {
    let img = new Image();
    let recordPixel = creative.tracking.impression;
    let boBase = recordPixel.match(/([^?]+\/)ri\?/);

    if (boBase) {
      img.src = `${boBase[1]}bo?${buildQueryStringFromParams(params)}`;
    }
  }

  function adUnitHasValidSizeFromBid(adUnit, bid) {
    let sizes = utils.parseSizesInput(bid.sizes);
    let sizeLength = (sizes && sizes.length) || 0;
    let found = false;
    let creative = adUnit.creative && adUnit.creative[0];
    let creative_size = String(creative.width) + 'x' + String(creative.height);

    if (utils.isArray(sizes)) {
      for (let i = 0; i < sizeLength; i++) {
        let size = sizes[i];
        if (String(size) === String(creative_size)) {
          found = true;
          break;
        }
      }
    }
    return found;
  }

  function buildRequest(bids, params, delDomain) {
    if (!utils.isArray(bids)) {
      return;
    }

    params.auid = utils._map(bids, bid => bid.params.unit).join('%2C');
    params.aus = utils._map(bids, bid => {
      return utils.parseSizesInput(bid.sizes).join(',');
    }).join('|');

    bids.forEach(function (bid) {
      for (let customParam in bid.params.customParams) {
        if (bid.params.customParams.hasOwnProperty(customParam)) {
          params['c.' + customParam] = bid.params.customParams[customParam];
        }
      }
    });

    params.callback = 'window.$$PREBID_GLOBAL$$.oxARJResponse';
    let queryString = buildQueryStringFromParams(params);

    adloader.loadScript(`//${delDomain}/w/1.0/arj?${queryString}`);
  }

  function callBids(params) {
    let isIfr;
    const bids = params.bids || [];
    let currentURL = (window.parent !== window) ? document.referrer : window.location.href;
    currentURL = currentURL && encodeURIComponent(currentURL);
    try {
      isIfr = window.self !== window.top;
    } catch (e) {
      isIfr = false;
    }
    if (bids.length === 0) {
      return;
    }

    let delDomain = bids[0].params.delDomain;

    startTime = new Date(params.start);

    buildRequest(bids, {
      ju: currentURL,
      jr: currentURL,
      ch: document.charSet || document.characterSet,
      res: `${screen.width}x${screen.height}x${screen.colorDepth}`,
      ifr: isIfr,
      tz: startTime.getTimezoneOffset(),
      tws: getViewportDimensions(isIfr),
      ef: 'bt%2Cdb',
      be: 1,
      bc: BIDDER_CONFIG
    },
    delDomain);
  }

  return {
    callBids: callBids
  };
};

adaptermanager.registerBidAdapter(new OpenxAdapter(), 'openx');

module.exports = OpenxAdapter;
