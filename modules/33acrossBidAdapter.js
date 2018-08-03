import { uniques } from 'src/utils';
const { registerBidder } = require('../src/adapters/bidderFactory');
const { config } = require('../src/config');
const BIDDER_CODE = '33across';
const END_POINT = 'https://ssc.33across.com/api/v1/hb';
const SYNC_ENDPOINT = 'https://de.tynt.com/deb/v2?m=xch&rt=html';

const adapterState = {};

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
    creativeId: response.seatbid[0].bid[0].crid,
    currency: response.cur,
    netRevenue: true
  }
}

// infer the necessary data from valid bid for a minimal ttxRequest and create HTTP request
function _createServerRequest(bidRequest, gdprConsent) {
  const ttxRequest = {};
  const params = bidRequest.params;

  /*
   * Infer data for the request payload
   */
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
  ttxRequest.site = { id: params.siteId };

  // Go ahead send the bidId in request to 33exchange so it's kept track of in the bid response and
  // therefore in ad targetting process
  ttxRequest.id = bidRequest.bidId;

  // Set GDPR related fields
  ttxRequest.user = {
    ext: {
      consent: gdprConsent.consentString
    }
  }
  ttxRequest.regs = {
    ext: {
      gdpr: (gdprConsent.gdprApplies === true) ? 1 : 0
    }
  }

  // Finally, set the openRTB 'test' param if this is to be a test bid
  if (params.test === 1) {
    ttxRequest.test = 1;
  }


  /*
   * Now construct the full server request
   */
  const options = {
    contentType: 'text/plain',
    withCredentials: true
  };
  // Allow the ability to configure the HB endpoint for testing purposes.
  const ttxSettings = config.getConfig('ttxSettings');
  const url = (ttxSettings && ttxSettings.url) || END_POINT;

  // Return the server request
  return {
    'method': 'POST',
    'url': url,
    'data': JSON.stringify(ttxRequest),
    'options': options
  }
}

// Sync object will always be of type iframe for TTX
function _createSync(siteId) {
  const ttxSettings = config.getConfig('ttxSettings');
  const syncUrl = (ttxSettings && ttxSettings.syncUrl) || SYNC_ENDPOINT;

  return {
    type: 'iframe',
    url: `${syncUrl}&id=${siteId}`
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

  if (typeof bid.params.siteId === 'undefined' || typeof bid.params.productId === 'undefined') {
    return false;
  }

  return true;
}

// NOTE: At this point, TTX only accepts request for a single impression
function buildRequests(bidRequests, bidderRequest) {
  const gdprConsent = Object.assign({ consentString: undefined, gdprApplies: false }, bidderRequest && bidderRequest.gdprConsent)

  adapterState.uniqueSiteIds = bidRequests.map(req => req.params.siteId).filter(uniques);

  return bidRequests.map((req) => {
    return _createServerRequest(req, gdprConsent);
  });
}

// NOTE: At this point, the response from 33exchange will only ever contain one bid i.e. the highest bid
function interpretResponse(serverResponse, bidRequest) {
  const bidResponses = [];

  // If there are bids, look at the first bid of the first seatbid (see NOTE above for assumption about ttx)
  if (serverResponse.body.seatbid.length > 0 && serverResponse.body.seatbid[0].bid.length > 0) {
    bidResponses.push(_createBidResponse(serverResponse.body));
  }

  return bidResponses;
}

// Register one sync per unique guid
function getUserSyncs(syncOptions) {
  return (syncOptions.iframeEnabled) ? adapterState.uniqueSiteIds.map(_createSync) : ([]);
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
