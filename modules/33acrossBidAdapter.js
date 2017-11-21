const { registerBidder } = require('../src/adapters/bidderFactory');
const utils = require('../src/utils');

const BIDDER_CODE = '33across';
const END_POINT = 'https://ssc.33across.com/api/v1/hb';
const SYNC_ENDPOINT = 'https://de.tynt.com/deb/v2?m=xch';

// All this assumes that only one bid is ever returned by ttx
function _createBidResponse(response) {
  return {
    requestId: response.id,
    bidderCode: BIDDER_CODE,
    cpm: response.seatbid[0].bid[0].price,
    width: response.seatbid[0].bid[0].w,
    height: response.seatbid[0].bid[0].h,
    ad: response.seatbid[0].bid[0].adm,
    ttl: response.seatbid[0].bid[0].ttl || 60,
    creativeId: response.seatbid[0].bid[0].ext.rp.advid,
    currency: response.cur,
    netRevenue: true
  }
}

// infer the necessary data from valid bid for a minimal ttxRequest and create HTTP request
function _createServerRequest(bidRequest) {
  const ttxRequest = {};
  const params = bidRequest.params;

  ttxRequest.imp = [];
  ttxRequest.imp[0] = {
    banner: {
      format: bidRequest.sizes.map(_getFormatSize)
    },
    ext: {
      ttx: {
        prod: params.productId
      }
    }
  }

  // Allowing site to be a test configuration object or just the id (former required for testing,
  // latter when used by publishers)
  ttxRequest.site = params.site || { id: params.siteId };

  // Go ahead send the bidId in request to 33exchange so it's kept track of in the bid response and
  // therefore in ad targetting process
  ttxRequest.id = bidRequest.bidId;

  const options = {
    contentType: 'application/json',
    withCredentials: false
  };

  if (bidRequest.params.customHeaders) {
    options.customHeaders = bidRequest.params.customHeaders;
  }

  return {
    'method': 'POST',
    'url': bidRequest.params.url || END_POINT,
    'data': JSON.stringify(ttxRequest),
    'options': options
  }
}

// Sync object will always be of type iframe for ttx
function _createSync(bid) {
  const syncUrl = bid.params.syncUrl || SYNC_ENDPOINT;

  return {
    type: 'iframe',
    url: `${syncUrl}&id=${bid.params.siteId || bid.params.site.id}`
  }
}

function _getFormatSize(sizeArr) {
  return {
    w: sizeArr[0],
    h: sizeArr[1],
    ext: {}
  }
}

function isBidRequestValid(bid) {
  if (bid.bidder !== BIDDER_CODE || typeof bid.params === 'undefined') {
    return false;
  }

  if ((typeof bid.params.site === 'undefined' || typeof bid.params.site.id === 'undefined') &&
  (typeof bid.params.siteId === 'undefined')) {
    return false;
  }

  if (typeof bid.params.productId === 'undefined') {
    return false;
  }

  return true;
}

// NOTE: At this point, 33exchange only accepts request for a single impression
function buildRequests(bidRequests) {
  return bidRequests.map(_createServerRequest);
}

// NOTE: At this point, the response from 33exchange will only ever contain one bid i.e. the highest bid
function interpretResponse(serverResponse) {
  const bidResponses = [];

  // If there are bids, look at the first bid of the first seatbid (see NOTE above for assumption about ttx)
  if (serverResponse.body.seatbid.length > 0 && serverResponse.body.seatbid[0].bid.length > 0) {
    bidResponses.push(_createBidResponse(serverResponse.body));
  }

  return bidResponses;
}

// Register one sync per bid since each ad unit may potenitally be linked to a uniqe guid
function getUserSyncs(syncOptions) {
  let syncs = [];
  const ttxBidRequests = utils.getBidderRequestAllAdUnits(BIDDER_CODE).bids;

  if (syncOptions.iframeEnabled) {
    syncs = ttxBidRequests.map(_createSync);
  }

  return syncs;
}

const spec = {
  code: BIDDER_CODE,
  isBidRequestValid,
  buildRequests,
  interpretResponse,
  getUserSyncs
}

registerBidder(spec);

module.exports = spec;
