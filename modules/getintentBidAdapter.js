import { registerBidder } from '../src/adapters/bidderFactory.js';
import { isInteger } from '../src/utils.js';

const BIDDER_CODE = 'getintent';
const IS_NET_REVENUE = true;
const BID_HOST = 'px.adhigh.net';
const BID_BANNER_PATH = '/rtb/direct_banner';
const BID_VIDEO_PATH = '/rtb/direct_vast';
const BID_RESPONSE_TTL_SEC = 360;
const VIDEO_PROPERTIES = [
  'protocols', 'mimes', 'min_dur', 'max_dur', 'min_btr', 'max_btr', 'vi_format', 'api', 'skippable'
];
const OPTIONAL_PROPERTIES = [
  'cur', 'floor', 'sid'
];

export const spec = {
  code: BIDDER_CODE,
  aliases: ['getintentAdapter'],
  supportedMediaTypes: ['video', 'banner'],

  /**
   * Determines whether or not the given bid request is valid.
   *
   * @param {BidRequest} bid The bid to validate.
   * @return {boolean} True if this is a valid bid, and false otherwise.
   * */
  isBidRequestValid: function(bid) {
    return !!(bid && bid.params && bid.params.pid && bid.params.tid);
  },

  /**
   * Make a server request from the list of BidRequests.
   *
   * @param {BidRequest[]} bidRequests - an array of bids.
   * @return ServerRequest[]
   */
  buildRequests: function(bidRequests) {
    return bidRequests.map(bidRequest => {
      let giBidRequest = buildGiBidRequest(bidRequest);
      return {
        method: 'GET',
        url: buildUrl(giBidRequest),
        data: giBidRequest,
      };
    });
  },

  /**
   * Callback for bids, after the call to DSP completes.
   * Parse the response from the server into a list of bids.
   *
   * @param {object} serverResponse A response from the GetIntent's server.
   * @return {Bid[]} An array of bids which were nested inside the server.
   */
  interpretResponse: function(serverResponse) {
    let responseBody = serverResponse.body;
    const bids = [];
    if (responseBody && responseBody.no_bid !== 1) {
      let size = parseSize(responseBody.size);
      let bid = {
        requestId: responseBody.bid_id,
        ttl: BID_RESPONSE_TTL_SEC,
        netRevenue: IS_NET_REVENUE,
        currency: responseBody.currency,
        creativeId: responseBody.creative_id,
        cpm: responseBody.cpm,
        width: size[0],
        height: size[1]
      };
      if (responseBody.vast_url) {
        bid.mediaType = 'video';
        bid.vastUrl = responseBody.vast_url;
      } else {
        bid.mediaType = 'banner';
        bid.ad = responseBody.ad;
      }
      bids.push(bid);
    }
    return bids;
  }

}

function buildUrl(bid) {
  return 'https://' + BID_HOST + (bid.is_video ? BID_VIDEO_PATH : BID_BANNER_PATH);
}

/**
 * Builds GI bid request from BidRequest.
 *
 * @param {BidRequest} bidRequest.
 * @return {object} GI bid request.
 * */
function buildGiBidRequest(bidRequest) {
  let giBidRequest = {
    bid_id: bidRequest.bidId,
    pid: bidRequest.params.pid, // required
    tid: bidRequest.params.tid, // required
    known: bidRequest.params.known || 1,
    is_video: bidRequest.mediaType === 'video',
    resp_type: 'JSON',
    provider: 'direct.prebidjs'
  };
  if (bidRequest.sizes) {
    giBidRequest.size = produceSize(bidRequest.sizes);
  }
  addVideo(bidRequest.params.video, giBidRequest);
  addOptional(bidRequest.params, giBidRequest, OPTIONAL_PROPERTIES);
  return giBidRequest;
}

function addVideo(video, giBidRequest) {
  if (giBidRequest.is_video && video) {
    for (let i = 0, l = VIDEO_PROPERTIES.length; i < l; i++) {
      let key = VIDEO_PROPERTIES[i];
      if (video.hasOwnProperty(key)) {
        giBidRequest[key] = Array.isArray(video[key]) ? video[key].join(',') : video[key];
      }
    }
  }
}

function addOptional(params, request, props) {
  for (let i = 0; i < props.length; i++) {
    if (params.hasOwnProperty(props[i])) {
      request[props[i]] = params[props[i]];
    }
  }
}

/**
 * @param {String} s The string representing a size (e.g. "300x250").
 * @return {Number[]} An array with two elements: [width, height] (e.g.: [300, 250]).
 * */
function parseSize(s) {
  return s.split('x').map(Number);
}

/**
 * @param {Array} sizes An array of sizes/numbers to be joined into single string.
 *                      May be an array (e.g. [300, 250]) or array of arrays (e.g. [[300, 250], [640, 480]].
 * @return {String} The string with sizes, e.g. array of sizes [[50, 50], [80, 80]] becomes "50x50,80x80" string.
 * */
function produceSize (sizes) {
  function sizeToStr(s) {
    if (Array.isArray(s) && s.length === 2 && isInteger(s[0]) && isInteger(s[1])) {
      return s.join('x');
    } else {
      throw "Malformed parameter 'sizes'";
    }
  }
  if (Array.isArray(sizes) && Array.isArray(sizes[0])) {
    return sizes.map(sizeToStr).join(',');
  } else {
    return sizeToStr(sizes);
  }
}

registerBidder(spec);
