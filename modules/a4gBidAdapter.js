const bidfactory = require('src/bidfactory.js'),
  bidmanager = require('src/bidmanager.js'),
  constants = require('src/constants.json'),
  adloader = require('src/adloader'),
  utils = require('src/utils.js');

const A4G_BIDDER_CODE = 'a4g';
const A4G_DEFAULT_BID_URL = '//ads.ad4game.com/v1/bid';

const IFRAME_NESTING_PARAM_NAME = 'if';
const LOCATION_PARAM_NAME = 'siteurl';
const ID_PARAM_NAME = 'id';
const ZONE_ID_PARAM_NAME = 'zoneId';
const SIZE_PARAM_NAME = 'size';

const A4G_SUPPORTED_PARAMS = [
  IFRAME_NESTING_PARAM_NAME,
  LOCATION_PARAM_NAME,
  ID_PARAM_NAME,
  ZONE_ID_PARAM_NAME,
  SIZE_PARAM_NAME
];

const ARRAY_PARAM_SEPARATOR = ';';
const ARRAY_SIZE_SEPARATOR = ',';
const SIZE_SEPARATOR = 'x';

const JSONP_PARAM_NAME = 'jsonp';

function appendUrlParam(url, paramName, paramValue) {
  const isQueryParams = url.indexOf('?') !== -1,
    separator = isQueryParams ? '&' : '?';
  return url + separator + encodeURIComponent(paramName) + '=' + encodeURIComponent(paramValue);
}

function isInIframe(windowObj) {
  return windowObj !== windowObj.parent;
}

function getIframeInfo(window) {
  let currentWindow = window,
    iframeNestingLevel = 0,
    hasExternalMeet = false,
    hostHref = window.location.href;

  while (isInIframe(currentWindow)) {
    currentWindow = currentWindow.parent;

    try {
      if (hasExternalMeet) {
        iframeNestingLevel = 1;
      } else {
        iframeNestingLevel++;
      }

      hostHref = currentWindow.document.referrer || currentWindow.location.href;
    } catch (e) {
      hasExternalMeet = true;
    }
  }

  return {
    nestingLevel: iframeNestingLevel,
    hostHref: hostHref
  };
}

function isValidStatus(status) {
  return status === 200;
}

function bidParamsToQuery(params) {
  return A4G_SUPPORTED_PARAMS
    .reduce((url, paramName) => paramName in params
        ? appendUrlParam(url, paramName, params[paramName])
        : url,
      '');
}

function buildBidRequestUrl(bidDeliveryUrl, params) {
  return bidDeliveryUrl + bidParamsToQuery(params);
}

function createBidRequest(bidRequest) {
  return (status) => bidfactory.createBid(status, bidRequest);
}

function mapBidToPrebidFormat(bidRequest, bid) {
  const bidResponse = bidRequest(constants.STATUS.GOOD);

  bidResponse.bidderCode = A4G_BIDDER_CODE;
  bidResponse.cpm = bid.cpm;
  bidResponse.ad = bid.ad;
  bidResponse.width = bid.width;
  bidResponse.height = bid.height;

  return bidResponse;
}

function mapBidErrorToPrebid(bidRequest) {
  return bidRequest(constants.STATUS.NO_BID);
}

function extractBidParams(bids) {
  const idParams = [];
  const sizeParams = [];
  const zoneIds = [];

  let deliveryUrl = '';

  for (let i = 0; i < bids.length; i++) {
    const bid = bids[i];
    if (!deliveryUrl && typeof bid.params.deliveryUrl === 'string') {
      deliveryUrl = bid.params.deliveryUrl;
    }
    idParams.push(bid.placementCode);
    sizeParams.push(bid.sizes.map(size => size.join(SIZE_SEPARATOR)).join(ARRAY_SIZE_SEPARATOR));
    zoneIds.push(bid.params.zoneId);
  }

  return [deliveryUrl, {
    [ID_PARAM_NAME]: idParams.join(ARRAY_PARAM_SEPARATOR),
    [ZONE_ID_PARAM_NAME]: zoneIds.join(ARRAY_PARAM_SEPARATOR),
    [SIZE_PARAM_NAME]: sizeParams.join(ARRAY_PARAM_SEPARATOR)
  }];
}

function a4gBidFactory() {

  function generateJsonpCallbackName() {
    return '__A4G' + Date.now();
  }

  function jsonp(url, callback) {
    const callbackName = generateJsonpCallbackName(),
      jsnopUrl = appendUrlParam(url, JSONP_PARAM_NAME, callbackName);

    window[callbackName] = ({ status, response }) => {
      !isValidStatus(status)
        ? callback(new Error(`Failed fetching ad with status ${status}`), response)
        : callback(null, response);
      delete window[callbackName];
    };

    adloader.loadScript(jsnopUrl);
  }

  return {
    callBids({ bids }) {
      const bidRequests = bids.map(bid => createBidRequest(utils.getBidRequest(bid.bidId)));
      const [ deliveryUrl, bidParams ] = extractBidParams(bids);
      const { nestingLevel, hostHref } = getIframeInfo(window);
      const envParams = { [IFRAME_NESTING_PARAM_NAME]: nestingLevel, [LOCATION_PARAM_NAME]: hostHref };
      const bidsRequestUrl = buildBidRequestUrl(deliveryUrl || A4G_DEFAULT_BID_URL, Object.assign({}, bidParams, envParams));

      jsonp(bidsRequestUrl, (error, bidsResponse) => {
        for (let i = 0; i < bidRequests.length; i++) {
          const bidRequest = bidRequests[i],
            placementCode = bids[i].placementCode;

          bidmanager.addBidResponse(placementCode,
            error
              ? mapBidErrorToPrebid(bidRequest)
              : mapBidToPrebidFormat(bidRequest, bidsResponse[i]));
        }});
    }
  };
}

module.exports = a4gBidFactory;
