import * as utils from 'src/utils';
// import {config} from 'src/config';
import {registerBidder} from 'src/adapters/bidderFactory';
import {BANNER, NATIVE} from 'src/mediaTypes';
const ADG_BIDDER_CODE = 'adgeneration';

export const spec = {
  code: ADG_BIDDER_CODE,
  aliases: ['adg'], // short code
  supportedMediaTypes: [BANNER, NATIVE],
  /**
   * Determines whether or not the given bid request is valid.
   *
   * @param {BidRequest} bid The bid params to validate.
   * @return boolean True if this is a valid bid, and false otherwise.
   */
  isBidRequestValid: function (bid) {
    return !!(bid.params.id);
  },
  /**
   * Make a server request from the list of BidRequests.
   *
   * @param {validBidRequests[]} - an array of bids
   * @return ServerRequest Info describing the request to the server.
   */
  buildRequests: function (validBidRequests) {
    let serverRequests = [];
    for (let i = 0, len = validBidRequests.length; i < len; i++) {
      const validReq = validBidRequests[i];
      const DEBUG_URL = 'http://api-test.scaleout.jp/adsv/v1';
      const URL = 'https://d.socdm.com/adsv/v1';
      const url = validReq.params.debug ? DEBUG_URL : URL;
      let data = ``;
      data = utils.tryAppendQueryString(data, 'posall', 'SSPLOC');
      const id = utils.getBidIdParameter('id', validReq.params);
      data = utils.tryAppendQueryString(data, 'id', id);
      data = utils.tryAppendQueryString(data, 'sdktype', '0');
      data = utils.tryAppendQueryString(data, 'hb', 'true');
      data = utils.tryAppendQueryString(data, 't', 'json3');
      data = utils.tryAppendQueryString(data, 'transactionid', validReq.transactionId);

      // native以外にvideo等の対応が入った場合は要修正
      if (!validReq.mediaTypes || !validReq.mediaTypes.native) {
        data = utils.tryAppendQueryString(data, 'imark', '1');
      }

      // remove the trailing "&"
      if (data.lastIndexOf('&') === data.length - 1) {
        data = data.substring(0, data.length - 1);
      }
      serverRequests.push({
        method: 'GET',
        url: url,
        data: data,
        bidRequest: validBidRequests[i]
      });
    }
    return serverRequests;
  },
  /**
   * Unpack the response from the server into a list of bids.
   *
   * @param {ServerResponse} serverResponse A successful response from the server.
   * @param {BidRequest} bidRequests
   * @return {Bid[]} An array of bids which were nested inside the server.
   */
  interpretResponse: function (serverResponse, bidRequests) {
    const body = serverResponse.body;
    if (!body.results || body.results.length < 1) {
      return [];
    }
    const bidRequest = bidRequests.bidRequest;
    if (!bidRequest.mediaTypes || bidRequest.mediaTypes.banner) {
      if (!body.w || !body.h) {
        return [];
      }
    }
    const bidResponse = {
      requestId: bidRequest.bidId,
      cpm: body.cpm || 0,
      width: body.w ? body.w : 1,
      height: body.h ? body.h : 1,
      creativeId: body.creativeid || '',
      dealId: body.dealid || '',
      currency: 'JPY',
      netRevenue: true,
      ttl: body.ttl || 10,
      referrer: utils.getTopWindowUrl(),
    };
    if (bidRequest.mediaTypes && bidRequest.mediaTypes.native) {
      bidResponse.native = createNativeAd(body);
      bidResponse.mediaType = NATIVE;
    } else {
      // banner
      bidResponse.ad = createAd(body, bidRequest);
    }
    return [bidResponse];
  },

  /**
   * Register the user sync pixels which should be dropped after the auction.
   *
   * @param {SyncOptions} syncOptions Which user syncs are allowed?
   * @param {ServerResponse[]} serverResponses List of server's responses.
   * @return {UserSync[]} The user syncs which should be dropped.
   */
  getUserSyncs: function (syncOptions, serverResponses) {
    const syncs = [];
    return syncs;
  }
};

function createAd(body, bidRequest) {
  let ad = body.ad;
  if (body.vastxml && body.vastxml.length > 0) {
    ad = `<body><div id="apvad-${bidRequest.bidId}"></div>${createAPVTag()}${insertVASTMethod(bidRequest.bidId, body.vastxml)}</body>`;
  }
  ad = appendChildToBody(ad, body.beacon);
  if (removeWrapper(ad)) return removeWrapper(ad);
  return ad;
}

function createNativeAd(body) {
  let native = {};
  if (body.native_ad && body.native_ad.assets.length > 0) {
    const assets = body.native_ad.assets;
    for (let i = 0, len = assets.length; i < len; i++) {
      switch (assets[i].id) {
        case 1:
          native.title = assets[i].title.text;
          break;
        case 2:
          native.image = {
            url: assets[i].img.url,
            height: assets[i].img.h,
            width: assets[i].img.w,
          };
          break;
        case 3:
          native.icon = {
            url: assets[i].img.url,
            height: assets[i].img.h,
            width: assets[i].img.w,
          };
          break;
        case 4:
          native.sponsoredBy = assets[i].data.value;
          break;
        case 5:
          native.body = assets[i].data.value;
          break;
        case 6:
          native.cta = assets[i].data.value;
          break;
      }
    }
    native.clickUrl = body.native_ad.link.url;
    native.clickTrackers = body.native_ad.link.clicktrackers || [];
    native.impressionTrackers = body.native_ad.imptrackers || [];
    if (body.beaconurl && body.beaconurl != '') {
      native.impressionTrackers.push(body.beaconurl)
    }
  }
  return native;
}

function appendChildToBody(ad, data) {
  return ad.replace(/<\/\s?body>/, `${data}</body>`);
}

function createAPVTag() {
  const APVURL = 'https://cdn.apvdr.com/js/VideoAd.min.js';
  let apvScript = document.createElement('script');
  apvScript.type = 'text/javascript';
  apvScript.id = 'apv';
  apvScript.src = APVURL;
  return apvScript.outerHTML;
}

function insertVASTMethod(targetId, vastXml) {
  let apvVideoAdParam = {
    s: targetId
  };
  let script = document.createElement(`script`);
  script.type = 'text/javascript';
  script.innerHTML = `(function(){ new APV.VideoAd(${JSON.stringify(apvVideoAdParam)}).load('${vastXml.replace(/\r?\n/g, '')}'); })();`;
  return script.outerHTML;
}

/**
 *
 * @param ad
 */
function removeWrapper(ad) {
  const bodyIndex = ad.indexOf('<body>');
  const lastBodyIndex = ad.lastIndexOf('</body>');
  if (bodyIndex === -1 || lastBodyIndex === -1) return false;
  return ad.substr(bodyIndex, lastBodyIndex).replace('<body>', '').replace('</body>', '');
}

registerBidder(spec);
