import { registerBidder } from 'src/adapters/bidderFactory';

const BIDDER_CODE = 'getintent';
const BID_HOST = 'px.adhigh.net';
const BID_BANNER_PATH = '/rtb/direct_banner';
const BID_VIDEO_PATH = '/rtb/direct_vast';
const VIDEO_PROPERTIES = [
  'protocols', 'mimes', 'min_dur', 'max_dur', 'min_btr', 'max_btr', 'vi_format', 'api', 'skippable'
];
const OPTIONAL_PROPERTIES = [
  'cur', 'floor'
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
   * @param {object} serverResponse A response from the server.
   * @param {BidRequest} bidRequest
   * @return {Bid[]} An array of bids which were nested inside the server.
   */
  interpretResponse: function(serverResponse, bidRequest) {
    const bids = [];
    if (serverResponse && serverResponse.no_bid !== 1) {
      let size = parseSize(serverResponse.size);
      let bid = {
        requestId: bidRequest.bidId,
        bidderCode: spec.code,
        cpm: serverResponse.cpm,
        width: size[0],
        height: size[1],
        mediaType: bidRequest.mediaType || 'banner'
      };
      if (bidRequest.creative_id) bid.creativeId = bidRequest.creative_id;
      if (bidRequest.mediaType === 'video') {
        bid.vastUrl = serverResponse.vast_url;
        bid.descriptionUrl = serverResponse.vast_url;
      } else {
        bid.ad = serverResponse.ad;
      }
      bids.push(bid);
    }
    return bids;
  }

}

function buildUrl(bid) {
  return '//' + BID_HOST + (bid.is_video ? BID_VIDEO_PATH : BID_BANNER_PATH);
}

/**
 * Builds GI bid request from BidRequest.
 *
 * @param {BidRequest} bidRequest.
 * @return {object} GI bid request.
 * */
function buildGiBidRequest(bidRequest) {
  let giBidRequest = {
    pid: bidRequest.params.pid, // required
    tid: bidRequest.params.tid, // required
    known: bidRequest.params.known || 1,
    is_video: bidRequest.mediaType === 'video',
    resp_type: 'JSON'
  };
  if (bidRequest.sizes) {
    // TODO: add support for multiple sizes
    giBidRequest.size = bidRequest.sizes[0].join('x');
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

function parseSize(s) {
  return s.split('x').map(Number);
}

registerBidder(spec);
