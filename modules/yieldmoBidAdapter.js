import * as utils from '../src/utils';
import { registerBidder } from '../src/adapters/bidderFactory';

const BIDDER_CODE = 'yieldmo';
const CURRENCY = 'USD';
const TIME_TO_LIVE = 300;
const NET_REVENUE = true;
const SYNC_ENDPOINT = 'https://static.yieldmo.com/blank.min.html?orig=';
const SERVER_ENDPOINT = 'https://ads.yieldmo.com/exchange/prebid';
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
    return !!(bid && bid.adUnitCode && bid.bidId);
  },
  /**
   * Make a server request from the list of BidRequests.
   *
   * @param {BidRequest[]} bidRequests A non-empty list of bid requests which should be sent to the Server.
   * @return ServerRequest Info describing the request to the server.
   */
  buildRequests: function(bidRequests) {
    let serverRequest = {
      p: [],
      page_url: utils.getTopWindowUrl(),
      bust: new Date().getTime().toString(),
      pr: utils.getTopWindowReferrer(),
      scrd: localWindow.devicePixelRatio || 0,
      dnt: getDNT(),
      e: getEnvironment(),
      description: getPageDescription(),
      title: localWindow.document.title || '',
      w: localWindow.innerWidth,
      h: localWindow.innerHeight
    };

    bidRequests.forEach((request) => {
      serverRequest.p.push(addPlacement(request));
      const pubcid = getId(request, 'pubcid');
      if (pubcid) {
        serverRequest.pubcid = pubcid;
      } else if (request.crumbs) {
        if (request.crumbs.pubcid) {
          serverRequest.pubcid = request.crumbs.pubcid;
        }
      }
      const tdid = getId(request, 'tdid');
      if (tdid) {
        serverRequest.tdid = tdid;
      }
    });
    serverRequest.p = '[' + serverRequest.p.toString() + ']';
    return {
      method: 'GET',
      url: SERVER_ENDPOINT,
      data: serverRequest
    }
  },
  /**
   * Makes Yieldmo Ad Server response compatible to Prebid specs
   * @param serverResponse successful response from Ad Server
   * @param bidderRequest original bidRequest
   * @return {Bid[]} an array of bids
   */
  interpretResponse: function(serverResponse) {
    let bids = [];
    let data = serverResponse.body;
    if (data.length > 0) {
      data.forEach((response) => {
        if (response.cpm && response.cpm > 0) {
          bids.push(createNewBid(response));
        }
      });
    }
    return bids;
  },
  getUserSync: function(syncOptions) {
    if (trackingEnabled(syncOptions)) {
      return [{
        type: 'iframe',
        url: SYNC_ENDPOINT + utils.getOrigin()
      }];
    } else {
      return [];
    }
  }
}
registerBidder(spec);

/***************************************
 * Helper Functions
 ***************************************/

/**
 * Adds placement information to array
 * @param request bid request
 */
function addPlacement(request) {
  const placementInfo = {
    placement_id: request.adUnitCode,
    callback_id: request.bidId,
    sizes: request.sizes
  }
  if (request.params) {
    if (request.params.placementId) {
      placementInfo.ym_placement_id = request.params.placementId;
    }
    if (request.params.bidFloor) {
      placementInfo.bidFloor = request.params.bidFloor;
    }
  }
  return JSON.stringify(placementInfo);
}

/**
  * creates a new bid with response information
  * @param response server response
  */
function createNewBid(response) {
  return {
    requestId: response['callback_id'],
    cpm: response.cpm,
    width: response.width,
    height: response.height,
    creativeId: response.creative_id,
    currency: CURRENCY,
    netRevenue: NET_REVENUE,
    ttl: TIME_TO_LIVE,
    ad: response.ad
  };
}

/**
 * Detects if tracking is allowed
 * @returns false if dnt or if not iframe/pixel enabled
 */
function trackingEnabled(options) {
  return (isIOS() && !getDNT() && options.iframeEnabled);
}

/**
  * Detects whether we're in iOS
  * @returns true if in iOS
  */
function isIOS() {
  return /iPhone|iPad|iPod/i.test(window.navigator.userAgent);
}

/**
  * Detects whether dnt is true
  * @returns true if user enabled dnt
  */
function getDNT() {
  return window.doNotTrack === '1' || window.navigator.doNotTrack === '1' || false;
}

/**
 * get page description
 */
function getPageDescription() {
  if (document.querySelector('meta[name="description"]')) {
    return document.querySelector('meta[name="description"]').getAttribute('content'); // Value of the description metadata from the publisher's page.
  } else {
    return '';
  }
}

function getTopWindow() {
  try {
    return window.top;
  } catch (e) {
    return window;
  }
}

/***************************************
 * Detect Environment Helper Functions
 ***************************************/

/**
 * Represents a method for loading Yieldmo ads.  Environments affect
 * which formats can be loaded into the page
 * Environments:
 *    CodeOnPage: 0, // div directly on publisher's page
 *    Amp: 1, // google Accelerate Mobile Pages ampproject.org
 *    Mraid = 2, // native loaded through the MRAID spec, without Yieldmo's SDK https://www.iab.net/media/file/IAB_MRAID_v2_FINAL.pdf
 *    Dfp: 4, // google doubleclick for publishers https://www.doubleclickbygoogle.com/
 *    DfpInAmp: 5, // AMP page containing a DFP iframe
 *    SafeFrame: 10,
 *    DfpSafeFrame: 11,Sandboxed: 16, // An iframe that can't get to the top window.
 *    SuperSandboxed: 89, // An iframe without allow-same-origin
 *    Unknown: 90, // A default sandboxed implementation delivered by EnvironmentDispatch when all positive environment checks fail
 */

/**
  * Detects what environment we're in
  * @returns Environment kind
  */
function getEnvironment() {
  if (isSuperSandboxedIframe()) {
    return 89;
  } else if (isDfpInAmp()) {
    return 5;
  } else if (isDfp()) {
    return 4;
  } else if (isAmp()) {
    return 1;
  } else if (isDFPSafeFrame()) {
    return 11;
  } else if (isSafeFrame()) {
    return 10;
  } else if (isMraid()) {
    return 2;
  } else if (isCodeOnPage()) {
    return 0;
  } else if (isSandboxedIframe()) {
    return 16;
  } else {
    return 90;
  }
}

/**
  * @returns true if we are running on the top window at dispatch time
  */
function isCodeOnPage() {
  return window === window.parent;
}

/**
  * @returns true if the environment is both DFP and AMP
  */
function isDfpInAmp() {
  return isDfp() && isAmp();
}

/**
  * @returns true if the window is in an iframe whose id and parent element id match DFP
  */
function isDfp() {
  try {
    const frameElement = window.frameElement;
    const parentElement = window.frameElement.parentNode;
    if (frameElement && parentElement) {
      return frameElement.id.indexOf('google_ads_iframe') > -1 && parentElement.id.indexOf('google_ads_iframe') > -1;
    }
    return false;
  } catch (e) {
    return false;
  }
}

/**
* @returns true if there is an AMP context object
*/
function isAmp() {
  try {
    const ampContext = window.context || window.parent.context;
    if (ampContext && ampContext.pageViewId) {
      return ampContext;
    }
    return false;
  } catch (e) {
    return false;
  }
}

/**
 * @returns true if the environment is a SafeFrame.
 */
function isSafeFrame() {
  return window.$sf && window.$sf.ext;
}

/**
 * @returns true if the environment is a dfp safe frame.
 */
function isDFPSafeFrame() {
  if (window.location && window.location.href) {
    const href = window.location.href;
    return isSafeFrame() && href.indexOf('google') !== -1 && href.indexOf('safeframe') !== -1;
  }
  return false;
}

/**
 * Return true if we are in an iframe and can't access the top window.
 */
function isSandboxedIframe() {
  return window.top !== window && !window.frameElement;
}

/**
 * Return true if we cannot document.write to a child iframe (this implies no allow-same-origin)
 */
function isSuperSandboxedIframe() {
  const sacrificialIframe = window.document.createElement('iframe');
  try {
    sacrificialIframe.setAttribute('style', 'display:none');
    window.document.body.appendChild(sacrificialIframe);
    sacrificialIframe.contentWindow._testVar = true;
    window.document.body.removeChild(sacrificialIframe);
    return false;
  } catch (e) {
    window.document.body.removeChild(sacrificialIframe);
    return true;
  }
}

/**
 * @returns true if the window has the attribute identifying MRAID
 */
function isMraid() {
  return !!(window.mraid);
}

/**
 * Gets an id from the userId object if it exists
 * @param {*} request
 * @param {*} idType
 * @returns an id if there is one, or undefined
 */
function getId(request, idType) {
  let id;
  if (request && request.userId && request.userId[idType] && typeof request.userId === 'object') {
    id = request.userId[idType];
  }
  return id;
}
