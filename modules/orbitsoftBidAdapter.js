import { getBidRequest } from 'src/utils';

let CONSTANTS = require('src/constants');
let bidmanager = require('src/bidmanager');
let bidfactory = require('src/bidfactory');
let adloader = require('src/adloader');
let utils = require('src/utils');
let adaptermanager = require('src/adaptermanager');
let Adapter = require('src/adapter').default;

let ORBITSOFT_BIDDERCODE = 'orbitsoft';
let styleParamsToFieldsMap = {
  'title.family': 'f1', // headerFont
  'title.size': 'fs1', // headerFontSize
  'title.weight': 'w1', // headerWeight
  'title.style': 's1', // headerStyle
  'title.color': 'c3', // headerColor
  'description.family': 'f2', // descriptionFont
  'description.size': 'fs2', // descriptionFontSize
  'description.weight': 'w2', // descriptionWeight
  'description.style': 's2', // descriptionStyle
  'description.color': 'c4', // descriptionColor
  'url.family': 'f3', // urlFont
  'url.size': 'fs3', // urlFontSize
  'url.weight': 'w3', // urlWeight
  'url.style': 's3', // urlStyle
  'url.color': 'c5', // urlColor
  'colors.background': 'c2', // borderColor
  'colors.border': 'c1', // borderColor
  'colors.link': 'c6', // lnkColor
};

let OrbitsoftAdapter = function OrbitsoftAdapter() {
  let baseAdapter = new Adapter(ORBITSOFT_BIDDERCODE);

  baseAdapter.callBids = function(params) {
    let bids = params.bids || [];

    for (let i = 0; i < bids.length; i++) {
      let bidRequest = bids[i];
      let callbackId = bidRequest.bidId;
      let jptCall = buildJPTCall(bidRequest, callbackId);

      if (jptCall) {
        adloader.loadScript(jptCall);
      } else {
        // indicate that there is no bid for this placement
        let bid = bidfactory.createBid(CONSTANTS.STATUS.NO_BID, bidRequest);
        bid.bidderCode = params.bidderCode;
        bidmanager.addBidResponse(bidRequest.placementCode, bid);
      }
    }
  }

  function buildJPTCall(bid, callbackId) {
    // Determine tag params
    let placementId = utils.getBidIdParameter('placementId', bid.params);

    let referrer = utils.getBidIdParameter('ref', bid.params);
    let location = utils.getBidIdParameter('loc', bid.params);
    let jptCall = utils.getBidIdParameter('requestUrl', bid.params);
    if (jptCall.length === 0) {
      // No param requestUrl
      // @if NODE_ENV='debug'
      utils.logMessage('No param requestUrl');
      // @endif
      return null;
    } else {
      jptCall += '?';
    }

    jptCall = utils.tryAppendQueryString(jptCall, 'callback', '$$PREBID_GLOBAL$$.handleOASCB');
    jptCall = utils.tryAppendQueryString(jptCall, 'callback_uid', callbackId);
    jptCall = utils.tryAppendQueryString(jptCall, 'scid', placementId);

    // Sizes takes a bit more logic
    let sizeQueryString;
    let parsedSizes = utils.parseSizesInput(bid.sizes);

    // Combine string into proper query string
    let parsedSizesLength = parsedSizes.length;
    if (parsedSizesLength > 0) {
      // First value should be "size"
      sizeQueryString = 'size=' + parsedSizes[0];
      jptCall += sizeQueryString + '&';
    }

    // Append custom attributes:
    let paramsCopy = Object.assign({}, bid.params);

    // Delete attributes already used
    delete paramsCopy.placementId;
    delete paramsCopy.referrer;
    delete paramsCopy.style;
    delete paramsCopy.customParams;

    // Get the reminder
    jptCall += utils.parseQueryStringParameters(paramsCopy);

    // Append location & referrer
    if (location === '') {
      location = utils.getTopWindowUrl();
    }
    if (referrer === '') {
      referrer = window.top.document.referrer;
    }
    jptCall = utils.tryAppendQueryString(jptCall, 'loc', location);
    jptCall = utils.tryAppendQueryString(jptCall, 'ref', referrer);

    // Remove the trailing "&"
    jptCall = removeTrailingAmp(jptCall);

    // @if NODE_ENV='debug'
    utils.logMessage('jpt request built: ' + jptCall);
    // @endif

    // Append a timer here to track latency
    bid.startTime = new Date().getTime();

    return jptCall;
  }

  // Remove the trailing "&"
  function removeTrailingAmp(url) {
    if (url.lastIndexOf('&') === url.length - 1) {
      url = url.substring(0, url.length - 1);
    }
    return url;
  }

  // Expose the callback to the global object
  $$PREBID_GLOBAL$$.handleOASCB = function (jptResponseObj) {
    let bidCode;

    if (jptResponseObj && jptResponseObj.callback_uid) {
      let responseCPM;
      let id = jptResponseObj.callback_uid;
      let placementCode = '';
      let bidObj = getBidRequest(id);
      if (bidObj) {
        bidCode = bidObj.bidder;

        placementCode = bidObj.placementCode;

        // Set the status
        bidObj.status = CONSTANTS.STATUS.GOOD;
      }

      // @if NODE_ENV='debug'
      utils.logMessage('JSONP callback function called for ad ID: ' + id);
      // @endif

      let bid = [];
      if (jptResponseObj.cpm && jptResponseObj.cpm !== 0) {
        // Store bid response
        responseCPM = jptResponseObj.cpm;
        // Bid status is good (indicating 1)
        bid = bidfactory.createBid(CONSTANTS.STATUS.GOOD, bidObj);
        bid.bidderCode = bidCode;
        bid.cpm = responseCPM;
        bid.adUrl = jptResponseObj.content_url;
        bid.width = jptResponseObj.width;
        bid.height = jptResponseObj.height;

        // Styles params
        let styles = utils.getBidIdParameter('style', bidObj.params);
        let stylesParams = {};
        for (let currentValue in styles) {
          if (styles.hasOwnProperty(currentValue)) {
            let currentStyle = styles[currentValue];
            for (let field in currentStyle) {
              if (currentStyle.hasOwnProperty(field)) {
                let styleField = styleParamsToFieldsMap[currentValue + '.' + field];
                if (styleField !== undefined) {
                  stylesParams[styleField] = currentStyle[field];
                }
              }
            }
          }
        }
        bid.adUrl += '&' + utils.parseQueryStringParameters(stylesParams);

        // Custom params
        let customParams = utils.getBidIdParameter('customParams', bidObj.params);
        let customParamsArray = {};
        for (let customField in customParams) {
          if (customParams.hasOwnProperty(customField)) {
            customParamsArray['c.' + customField] = customParams[customField];
          }
        }
        let customParamsLink = utils.parseQueryStringParameters(customParamsArray);
        if (customParamsLink) {
          // Don't append a "&" here, we have already done it in parseQueryStringParameters
          bid.adUrl += customParamsLink;
        }

        // Remove the trailing "&"
        bid.adUrl = removeTrailingAmp(bid.adUrl);

        bidmanager.addBidResponse(placementCode, bid);
      } else {
        // No response data
        // @if NODE_ENV='debug'
        utils.logMessage('No prebid response from Orbitsoft for placement code ' + placementCode);
        // @endif
        // indicate that there is no bid for this placement
        bid = bidfactory.createBid(CONSTANTS.STATUS.NO_BID, bidObj);
        bid.bidderCode = bidCode;
        bidmanager.addBidResponse(placementCode, bid);
      }
    } else {
      // No response data
      // @if NODE_ENV='debug'
      utils.logMessage('No prebid response for placement');
      // @endif
    }
  };

  return Object.assign(this, {
    callBids: baseAdapter.callBids,
    setBidderCode: baseAdapter.setBidderCode,
    buildJPTCall: buildJPTCall
  });
};

adaptermanager.registerBidAdapter(new OrbitsoftAdapter(), ORBITSOFT_BIDDERCODE);

module.exports = OrbitsoftAdapter;
