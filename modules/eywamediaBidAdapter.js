import * as utils from '../src/utils';
import { registerBidder } from '../src/adapters/bidderFactory';

const BIDDER_CODE = 'eywamedia';
const CURRENCY = 'USD';
const VERSION = '1.0.0';
const TIME_TO_LIVE = 360;
const NET_REVENUE = true;
const COOKIE_NAME = 'emaduuid';
const UUID_LEN = 36;
const SERVER_ENDPOINT = 'https://adtarbostg.eywamedia.com/auctions/prebidjs/3000';
const localWindow = getTopWindow();

export const spec = {
  code: BIDDER_CODE,
  supportedMediaTypes: ['banner'],
  /**
    * Determines whether or not the given bid request is valid.
    * @param {object} bid, bid to validate
    * @return boolean, true if valid, otherwise false
    */
  isBidRequestValid: function(bid) {
    return !!(bid.params.publisherId);
  },
  /**
   * Make a server request from the list of BidRequests.
   *
   * @param {BidRequest[]} bidRequests A non-empty list of bid requests which should be sent to the Server.
   * @return requestPayload Info describing the request to the server.
   */
  buildRequests: function(bidRequests, bidRequest) {
    const device = getDeviceInfo();
    const site = getSiteInfo();
    const user = getUserInfo();

    let requestPayload = {
      id: utils.generateUUID(),
      publisherId: bidRequests[0].params.publisherId,
      device: device,
      site: site,
      user: user,
      bidPayload: bidRequests,
      cacheBust: new Date().getTime().toString(),
      adapterVersion: VERSION,
      tmax: bidRequest.timeout
    };

    return {
      method: 'POST',
      url: SERVER_ENDPOINT,
      options: {
        contentType: 'application/json'
      },
      data: requestPayload
    }
  },

  /**
   * Makes Eywamedia Ad Server response compatible to Prebid specs
   * @param serverResponse successful response from Ad Server
   * @param bidderRequest original bidRequest
   * @return {Bid[]} an array of bids
   */
  interpretResponse: function (serverResponse, bidRequest) {
    var bidObject, response;
    var bidRespones = [];
    var responses = serverResponse.body;
    for (var i = 0; i < responses.length; i++) {
      response = responses[i];
      bidObject = {
        requestId: response.bidId,
        cpm: response.cpm,
        width: parseInt(response.width),
        height: parseInt(response.height),
        creativeId: response.bidId,
        currency: CURRENCY,
        netRevenue: NET_REVENUE,
        ttl: TIME_TO_LIVE,
        ad: response.ad,
        bidderCode: BIDDER_CODE,
        transactionId: response.transactionId,
        mediaType: response.respType,
      };
      bidRespones.push(bidObject);
    }
    return bidRespones;
  }
}
registerBidder(spec);

/***************************************
 * Helper Functions
 ***************************************/

/**
 * get device type
 */
function getDeviceType() {
  let ua = navigator.userAgent;
  // Tablets must be checked before phones.
  if ((/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i).test(ua)) {
    return 5; // "Tablet"
  }
  if ((/Mobile|iP(hone|od|ad)|Android|BlackBerry|IEMobile|Kindle|NetFront|Silk-Accelerated|(hpw|web)OS|Fennec|Minimo|Opera M(obi|ini)|Blazer|Dolfin|Dolphin|Skyfire|Zune/).test(ua)) {
    return 4; // "Phone"
  }
  return 2; // Personal Computers
};

/**
 * get device info
 */
function getDeviceInfo() {
  const language = navigator.language;
  return {
    ua: navigator.userAgent,
    language: navigator[language],
    devicetype: getDeviceType(),
    dnt: utils.getDNT(),
    geo: {},
    js: 1
  };
};

/**
 * get site info
 */
function getSiteInfo() {
  const topLocation = utils.getTopWindowLocation();
  return {
    domain: topLocation.hostname,
    page: topLocation.href,
    referrer: utils.getTopWindowReferrer(),
    desc: getPageDescription(),
    title: localWindow.document.title,
  };
};

/**
 * get user info
 */
function getUserInfo() {
  return {
    id: getUserID(),
  };
};

/**
 * get user Id
 */
const getUserID = () => {
  const i = document.cookie.indexOf(COOKIE_NAME);

  if (i === -1) {
    const uuid = utils.generateUUID();
    document.cookie = `${COOKIE_NAME}=${uuid}; path=/`;
    return uuid;
  }

  const j = i + COOKIE_NAME.length + 1;
  return document.cookie.substring(j, j + UUID_LEN);
};

/**
 * get page description
 */
function getPageDescription() {
  if (document.querySelector('meta[name="description"]')) {
    return document.querySelector('meta[name="description"]').getAttribute('content'); // Value of the description metadata from the publisher's page.
  } else {
    return '';
  }
};

function getTopWindow() {
  try {
    return window.top;
  } catch (e) {
    return window;
  }
};
