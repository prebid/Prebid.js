import * as utils from 'src/utils';
import {registerBidder} from 'src/adapters/bidderFactory';
import { VIDEO } from 'src/mediaTypes';

const BIDDER_CODE = 'conversant';
const URL = '//media.msg.dotomi.com/s2s/header/24';
const VERSION = '2.2.0';

export const spec = {
  code: BIDDER_CODE,
  aliases: ['cnvr'], // short code
  supportedMediaTypes: [VIDEO],
  /**
   * Determines whether or not the given bid request is valid.
   * 
   * @param {BidRequest}
   *          bid The bid params to validate.
   * @return boolean True if this is a valid bid, and false otherwise.
   */
  isBidRequestValid: function(bid) {
    // console.log('did we get called?', JSON.stringify(bid));
    return !!(bid.params.site_id);
  },
  /**
   * Make a server request from the list of BidRequests.
   * 
   * @param {validBidRequests[]} -
   *          an array of bids
   * @return ServerRequest Info describing the request to the server.
   */
  buildRequests: function(validBidRequests) {
    // console.log('hello world ', JSON.stringify(validBidRequests));
    const loc = utils.getTopWindowLocation();
    let siteId = '';
    let secure = 0;
    let page = loc.pathname + loc.search + loc.hash;
    let requestId = '';

    const conversantImps = validBidRequests.map(function(bid) {
      const bidfloor = utils.getBidIdParameter('bidfloor', bid.params);

      siteId = utils.getBidIdParameter('site_id', bid.params);
      secure = utils.getBidIdParameter('secure', bid.params) ? 1 : secure;
      requestId = bid.requestId;

      const format = convertSizes(bid.sizes);

      const imp = {
        id: bid.bidId,
        secure: secure,
        bidfloor: bidfloor || 0,
        displaymanager: 'Prebid.js',
        displaymanaerver: VERSION
      };

      copyOptProperty(bid.params, 'tag_id', imp, 'tagid');

      if (isVideoRequest(bid)) {
        const video = {format: format};

        copyOptProperty(bid.params, 'position', video, 'pos');
        copyOptProperty(bid.params, 'mimes', video);
        copyOptProperty(bid.params, 'maxduration', video);
        copyOptProperty(bid.params, 'protocols', video);
        copyOptProperty(bid.params, 'api', video);

        imp.video = video;
      } else {
        const banner = {format: format};

        copyOptProperty(bid.params, 'position', banner, 'pos');

        imp.banner = banner;
      }
      // console.log(JSON.stringify(imp));

      return imp;
    });

    const payload = {
      id: requestId,
      imp: conversantImps,
      site: {
        id: siteId,
        mobile: document.querySelector('meta[name="viewport"][content*="width=device-width"]') !== null ? 1 : 0,
        page: page
      },
      device: getDevice(),
      at: 1
    };
    const payloadString = JSON.stringify(payload);
    // console.log('payload', payloadString);

    return {
      method: 'POST',
      url: URL,
      data: payloadString,
      payload: payload
    };
  },
  /**
   * Unpack the response from the server into a list of bids.
   * 
   * @param {*}
   *          serverResponse A successful response from the server.
   * @return {Bid[]} An array of bids which were nested inside the server.
   */
  interpretResponse: function(serverResponse, bidRequest) {
    let bidResponses = [];
    const requestMap = {};

    bidRequest.payload.imp.forEach(imp => requestMap[imp.id] = imp);

    // console.log('response', JSON.stringify(serverResponse));
    // console.log('request', JSON.stringify(bidRequest));
    // console.log('map', JSON.stringify(requestMap));

    if (serverResponse && serverResponse.id) {
      // console.log('processing serverResponse');
      serverResponse.seatbid.forEach(bidList => bidList.bid.forEach(conversantBid => {
        const responseCPM = parseFloat(conversantBid.price);
        if (responseCPM > 0.0 && conversantBid.impid) {
          const responseAd = conversantBid.adm || '';
          const responseNurl = conversantBid.nurl || '';
          const request = requestMap[conversantBid.impid];

          const bid = {
            requestId: conversantBid.impid,
            bidderCode: BIDDER_CODE,
            currency: 'USD',
            cpm: responseCPM,
            creativeId: conversantBid.crid || ''
          };

          if (request.video) {
            bid.vastUrl = responseAd;
            // bid.descriptionUrl = responseAd;
            bid.mediaType = 'video';
          } else {
            bid.ad = responseAd + '<img src="' + responseNurl + '" />';
          }

          bid.width = conversantBid.w;
          bid.height = conversantBid.h;

          // console.log('bid', JSON.stringify(bid));
          bidResponses.push(bid);
        }
      }));
    }

    // console.log('response', JSON.stringify(bidResponses));

    return bidResponses;
  },
  getUserSyncs: function(syncOptions) {
    if (syncOptions.iframeEnabled) {
      return [{
        type: 'image',
        url: '//cmedia102.dev2.vcmedia.com/w/user.sync'
      }];
    }
  }
}

function getDNT() {
  return navigator.doNotTrack === '1' || window.doNotTrack === '1' || navigator.msDoNoTrack === '1' || navigator.doNotTrack === 'yes';
}

function getDevice() {
  const language = navigator.language ? 'language' : 'userLanguage';
  return {
    h: screen.height,
    w: screen.width,
    dnt: getDNT() ? 1 : 0,
    language: navigator[language].split('-')[0],
    make: navigator.vendor ? navigator.vendor : '',
    ua: navigator.userAgent
  };
}

function convertSizes(bidSizes) {
  let format;

  if (bidSizes.length === 2 && typeof bidSizes[0] === 'number' && typeof bidSizes[1] === 'number') {
    format = [{w: bidSizes[0], h: bidSizes[1]}];
  } else {
    format = bidSizes.map(d => { return {w: d[0], h: d[1]}; });
  }

  return format;
}

function isVideoRequest(bid) {
  return bid.mediaType === 'video' || !!utils.deepAccess(bid, 'mediaTypes.video');
}

function copyOptProperty(src, srcName, dst, dstName) {
  dstName = dstName || srcName;
  const obj = utils.getBidIdParameter(srcName, src);
  if (obj !== '') {
    dst[dstName] = obj;
  }
}

registerBidder(spec);
