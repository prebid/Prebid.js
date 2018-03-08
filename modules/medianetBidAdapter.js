import { registerBidder } from 'src/adapters/bidderFactory';
import * as utils from 'src/utils';
import events from 'src/events';
import CONSTANTS from 'src/constants.json';
import { config } from 'src/config';
import * as url from 'src/url';

const BIDDER_CODE = 'medianet';
const BID_URL = 'https://prebid.media.net/rtb/prebid';
const EVENT_PIXEL_URL = 'lg1.media.net/log';
const { BID_TIMEOUT } = CONSTANTS.EVENTS;
const TIMEOUT_EVENT_NAME = 'client_timeout';

let bidParams = {};

events.on(BID_TIMEOUT, function (timedOutBidders) {
  if (timedOutBidders.indexOf(BIDDER_CODE) !== -1) {
    let eventData = {
      name: TIMEOUT_EVENT_NAME,
      value: config.getConfig('bidderTimeout')
    };
    logEvent(eventData).trigger();
  }
});

function logEvent (event) {
  function generateUrl(data) {
    let getParams = {
      protocol: 'https',
      hostname: EVENT_PIXEL_URL,
      search: getLoggingData(data)
    };

    return url.format(getParams);
  }

  function getLoggingData(data) {
    let params = {};

    params.logid = 'kfk';
    params.evtid = 'projectevents';
    params.project = 'prebid';
    params.cid = bidParams.cid || '';
    params.dn = utils.getTopWindowLocation().host || '';
    params.requrl = utils.getTopWindowUrl() || '';
    params.event = event.name;
    params.value = event.value || '';
    params.pbver = $$PREBID_GLOBAL$$.version;

    return params;
  }

  function trigger(data) {
    utils.triggerPixel(generateUrl(data));
  }

  return {
    trigger: trigger
  }
}

function siteDetails(site) {
  site = site || {};

  return {
    domain: site.domain || utils.getTopWindowLocation().host,
    page: site.page || utils.getTopWindowUrl(),
    ref: site.ref || utils.getTopWindowReferrer()
  }
}

function filterUrlsByType(urls, type) {
  return urls.filter(url => url.type === type);
}

function transformSizes(sizes) {
  if (utils.isArray(sizes) && sizes.length === 2 && !utils.isArray(sizes[0])) {
    return [getSize(sizes)];
  }

  return sizes.map(size => getSize(size))
}

function getSize(size) {
  return {
    w: parseInt(size[0], 10),
    h: parseInt(size[1], 10)
  }
}

function configuredParams(params) {
  return {
    customer_id: params.cid,
    prebid_version: $$PREBID_GLOBAL$$.version
  }
}

function slotParams(bidRequest) {
  // check with Media.net Account manager for  bid floor and crid parameters
  let params = {
    id: bidRequest.bidId,
    ext: {
      dfp_id: bidRequest.adUnitCode
    },
    banner: transformSizes(bidRequest.sizes),
    all: bidRequest.params
  };

  if (bidRequest.params.crid) {
    params.tagid = bidRequest.params.crid.toString();
  }

  let bidFloor = parseFloat(bidRequest.params.bidfloor);
  if (bidFloor) {
    params.bidfloor = bidFloor;
  }
  return params;
}

function generatePayload(bidRequests) {
  bidParams = bidRequests[0].params;
  return {
    site: siteDetails(bidRequests[0].params.site),
    ext: configuredParams(bidRequests[0].params),
    id: bidRequests[0].bidderRequestId,
    imp: bidRequests.map(request => slotParams(request)),
    tmax: config.getConfig('bidderTimeout')
  }
}

function isValidBid(bid) {
  return bid.no_bid === false && parseFloat(bid.cpm) > 0.0;
}

function fetchCookieSyncUrls(response) {
  if (!utils.isEmpty(response) && response[0].body &&
    response[0].body.ext && utils.isArray(response[0].body.ext.csUrl)) {
    return response[0].body.ext.csUrl;
  }

  return [];
}

export const spec = {

  code: BIDDER_CODE,

  /**
   * Determines whether or not the given bid request is valid.
   *
   * @param {object} bid The bid to validate.
   * @return boolean True if this is a valid bid (if cid is present), and false otherwise.
   */
  isBidRequestValid: function(bid) {
    if (!bid.params) {
      utils.logError(`${BIDDER_CODE} : Missing bid parameters`);
      return false;
    }

    if (!bid.params.cid || !utils.isStr(bid.params.cid) || utils.isEmptyStr(bid.params.cid)) {
      utils.logError(`${BIDDER_CODE} : cid should be a string`);
      return false;
    }

    return true;
  },

  /**
   * Make a server request from the list of BidRequests.
   *
   * @param {BidRequest[]} bidRequests A non-empty list of bid requests which should be sent to the Server.
   * @return ServerRequest Info describing the request to the server.
   */
  buildRequests: function(bidRequests) {
    let payload = generatePayload(bidRequests);

    return {
      method: 'POST',
      url: BID_URL,
      data: JSON.stringify(payload)
    };
  },

  /**
   * Unpack the response from the server into a list of bids.
   *
   * @param {*} serverResponse A successful response from the server.
   * @return {Bid[]} An array of bids which were nested inside the server.
   */
  interpretResponse: function(serverResponse, request) {
    let validBids = [];

    if (!serverResponse || !serverResponse.body) {
      utils.logInfo(`${BIDDER_CODE} : response is empty`);
      return validBids;
    }

    if (serverResponse.body.ext && serverResponse.body.ext.nbr) {
      let eventData = {
        name: serverResponse.body.ext.nbr,
      };
      logEvent(eventData).trigger();
    }

    let bids = serverResponse.body.bidList;
    if (!utils.isArray(bids) || bids.length === 0) {
      utils.logInfo(`${BIDDER_CODE} : no bids`);
      return validBids;
    }
    validBids = bids.filter(bid => isValidBid(bid));

    return validBids;
  },

  getUserSyncs: function(syncOptions, serverResponses) {
    let cookieSyncUrls = fetchCookieSyncUrls(serverResponses);

    if (syncOptions.iframeEnabled) {
      return filterUrlsByType(cookieSyncUrls, 'iframe');
    }

    if (syncOptions.pixelEnabled) {
      return filterUrlsByType(cookieSyncUrls, 'image');
    }
  }
};
registerBidder(spec);
