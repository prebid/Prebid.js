import * as utils from '../src/utils';
import {registerBidder} from '../src/adapters/bidderFactory';
import {config} from '../src/config';

const BIDDER_CODE = 'orbitsoft';
let styleParamsMap = {
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
export const spec = {
  code: BIDDER_CODE,
  aliases: ['oas', 'mediafuseLift'], // short code and customer aliases
  isBidRequestValid: function (bid) {
    switch (true) {
      case !('params' in bid):
        utils.logError(bid.bidder + ': No required params');
        return false;
      case !(bid.params.placementId):
        utils.logError(bid.bidder + ': No required param placementId');
        return false;
      case !(bid.params.requestUrl):
        utils.logError(bid.bidder + ': No required param requestUrl');
        return false;
    }
    return true;
  },
  buildRequests: function (validBidRequests) {
    let bidRequest;
    let serverRequests = [];
    for (let i = 0; i < validBidRequests.length; i++) {
      bidRequest = validBidRequests[i];
      let bidRequestParams = bidRequest.params;
      let callbackId = utils.getUniqueIdentifierStr();
      let placementId = utils.getBidIdParameter('placementId', bidRequestParams);
      let requestUrl = utils.getBidIdParameter('requestUrl', bidRequestParams);
      let referrer = utils.getBidIdParameter('ref', bidRequestParams);
      let location = utils.getBidIdParameter('loc', bidRequestParams);
      // Append location & referrer
      if (location === '') {
        location = utils.getTopWindowUrl();
      }
      if (referrer === '') {
        referrer = utils.getTopWindowReferrer();
      }

      // Styles params
      let stylesParams = utils.getBidIdParameter('style', bidRequestParams);
      let stylesParamsArray = {};
      for (let currentValue in stylesParams) {
        if (stylesParams.hasOwnProperty(currentValue)) {
          let currentStyle = stylesParams[currentValue];
          for (let field in currentStyle) {
            if (currentStyle.hasOwnProperty(field)) {
              let styleField = styleParamsMap[currentValue + '.' + field];
              if (typeof styleField !== 'undefined') {
                stylesParamsArray[styleField] = currentStyle[field];
              }
            }
          }
        }
      }
      // Custom params
      let customParams = utils.getBidIdParameter('customParams', bidRequestParams);
      let customParamsArray = {};
      for (let customField in customParams) {
        if (customParams.hasOwnProperty(customField)) {
          customParamsArray['c.' + customField] = customParams[customField];
        }
      }

      // Sizes params (not supports by server, for future features)
      let sizesParams = bidRequest.sizes;
      let parsedSizes = utils.parseSizesInput(sizesParams);

      serverRequests.push({
        method: 'GET',
        url: requestUrl,
        data: Object.assign({
          'scid': placementId,
          'callback_uid': callbackId,
          'loc': location,
          'ref': referrer,
          'size': parsedSizes
        }, stylesParamsArray, customParamsArray),
        options: {withCredentials: false},
        bidRequest: bidRequest
      });
    }
    return serverRequests;
  },
  interpretResponse: function (serverResponse, request) {
    let bidResponses = [];
    if (!serverResponse || serverResponse.error) {
      utils.logError(BIDDER_CODE + ': Server response error');
      return bidResponses;
    }

    const serverBody = serverResponse.body;
    if (!serverBody) {
      utils.logError(BIDDER_CODE + ': Empty bid response');
      return bidResponses;
    }

    const CPM = serverBody.cpm;
    const WIDTH = serverBody.width;
    const HEIGHT = serverBody.height;
    const CREATIVE = serverBody.content_url;
    const CALLBACK_UID = serverBody.callback_uid;
    const TIME_TO_LIVE = config.getConfig('_bidderTimeout');
    const REFERER = utils.getTopWindowUrl();
    let bidRequest = request.bidRequest;
    if (CPM > 0 && WIDTH > 0 && HEIGHT > 0) {
      let bidResponse = {
        requestId: bidRequest.bidId,
        cpm: CPM,
        width: WIDTH,
        height: HEIGHT,
        creativeId: CALLBACK_UID,
        ttl: TIME_TO_LIVE,
        referrer: REFERER,
        currency: 'USD',
        netRevenue: true,
        adUrl: CREATIVE
      };
      bidResponses.push(bidResponse);
    }

    return bidResponses;
  }
};
registerBidder(spec);
