import {registerBidder} from '../src/adapters/bidderFactory.js';
import {config} from '../src/config.js';
import {VIDEO} from '../src/mediaTypes.js';
import {logError, logInfo, isArray, isStr} from '../src/utils.js';

/**
 * @typedef {import('../src/adapters/bidderFactory.js').Bid} Bid
 * @typedef {import('../src/adapters/bidderFactory.js').UserSync} UserSync
 */

const BIDDER_CODE = 'browsi';
const DATA = 'brwvidtag';
const ADAPTER = '__bad';
const USP_TO_REPLACE = '__USP__';
const GDPR_STR_TO_REPLACE = '__GDPR_STR__';
const GDPR_TO_REPLACE = '__GDPR__';
export const ENDPOINT = 'https://rtb.avantisvideo.com/api/v2/auction/getbid';

export const spec = {
  code: BIDDER_CODE,
  gvlid: 329,
  supportedMediaTypes: [VIDEO],
  /**
   * Determines whether or not the given bid request is valid.
   * @param bid
   * @returns {boolean}
   */
  isBidRequestValid: function (bid) {
    if (!bid.params) {
      return false;
    }
    const {pubId, tagId} = bid.params
    const {mediaTypes} = bid;
    return !!(validateBrowsiIds(pubId, tagId) && mediaTypes?.[VIDEO]);
  },
  /**
   * Make a server request from the list of BidRequests
   * @param validBidRequests
   * @param bidderRequest
   * @returns ServerRequest Info describing the request to the server.
   */
  buildRequests: function (validBidRequests, bidderRequest) {
    const requests = [];
    const {refererInfo, bidderRequestId, gdprConsent, uspConsent} = bidderRequest;
    validBidRequests.forEach(bidRequest => {
      const {bidId, adUnitCode, auctionId, ortb2Imp, schain, params} = bidRequest;
      const video = getVideoMediaType(bidRequest);

      const request = {
        method: 'POST',
        url: params.endpoint || ENDPOINT,
        data: {
          requestId: bidderRequestId,
          bidId: bidId,
          timeout: getTimeout(bidderRequest),
          baData: getData(),
          referer: refererInfo.page || refererInfo,
          gdpr: gdprConsent,
          ccpa: uspConsent,
          sizes: video.playerSize,
          video: video,
          aUCode: adUnitCode,
          // TODO: fix auctionId leak: https://github.com/prebid/Prebid.js/issues/9781
          aID: auctionId,
          tID: ortb2Imp?.ext?.tid,
          schain: schain,
          params: params
        }
      };
      requests.push(request);
    })
    return requests;
  },
  /**
   * Unpack the response from the server into a list of bids.
   * @param serverResponse A successful response from the server.
   * @param request
   * @returns {Bid[]} An array of bids which were nested inside the server.
   */
  interpretResponse: function (serverResponse, request) {
    const bidResponses = [];
    const response = serverResponse?.body;
    if (!response) { return bidResponses; }
    const {
      bidId,
      w,
      h,
      vXml,
      vUrl,
      cpm,
      cur,
      ttl,
      ...extraParams
    } = response;
    delete extraParams.userSyncs;
    const bidResponse = {
      requestId: request.data.bidId,
      bidId,
      vastXml: vXml,
      vastUrl: vUrl,
      cpm,
      ttl,
      mediaType: VIDEO,
      width: w,
      height: h,
      currency: cur,
      ...extraParams
    };
    bidResponses.push(bidResponse);
    return bidResponses;
  },
  /**
   * Extracts user-syncs information from server response
   * @param syncOptions {SyncOptions}
   * @param serverResponses {ServerResponse[]}
   * @param gdprConsent
   * @param uspConsent
   * @returns {UserSync[]}
   */
  getUserSyncs: function (syncOptions, serverResponses, gdprConsent, uspConsent) {
    const serverResponse = isArray(serverResponses) ? serverResponses[0] : serverResponses;
    const syncParams = serverResponse?.body?.userSyncs;
    const userSyncs = [];
    const allowedTypes = [];
    syncOptions.iframeEnabled && allowedTypes.push('iframe');
    syncOptions.pixelEnabled && allowedTypes.push('image');
    if (syncParams && allowedTypes.length) {
      syncParams.forEach(syncParam => {
        let { url, type } = syncParam;
        if (!allowedTypes.includes(type)) { return; }
        url = getValidUrl(url, gdprConsent, uspConsent);
        userSyncs.push({
          type,
          url
        });
      })
    }
    return userSyncs;
  },
  onTimeout(timeoutData) {
    logInfo(`${BIDDER_CODE} bidder timed out`, timeoutData);
  },
  onBidderError: function ({error}) {
    logError(`${BIDDER_CODE} bidder error`, error);
  }
}
/**
 * Replaces GdprConsent and uspConsent params in url
 * @param url {String}
 * @param gdprConsent
 * @param uspConsent
 * @returns {string}
 */
const getValidUrl = function (url, gdprConsent, uspConsent) {
  let validUrl = url.replace(GDPR_TO_REPLACE, gdprConsent?.gdprApplies || '')
    .replace(GDPR_STR_TO_REPLACE, encodeURIComponent(gdprConsent?.consentString || ''))
    .replace(USP_TO_REPLACE, encodeURIComponent(uspConsent?.consentString || ''));
  if (validUrl.indexOf('http') < 0) {
    validUrl = 'http://' + validUrl;
  }
  return validUrl;
}

const validateBrowsiIds = function (pubId, tagId) {
  return pubId && tagId && isStr(pubId) && isStr(tagId);
}
const getData = function () {
  return window[DATA]?.[ADAPTER];
}
const getTimeout = function (bidderRequest) {
  return bidderRequest.timeout || config.getConfig('bidderTimeout');
}
const getVideoMediaType = function (bidRequest) {
  return bidRequest.mediaTypes?.[VIDEO];
}
registerBidder(spec);
