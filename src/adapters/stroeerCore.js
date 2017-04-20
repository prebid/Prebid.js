const bidmanager = require('../bidmanager');
const bidfactory = require('../bidfactory');
const utils = require('../utils');
const ajax = require('../ajax').ajax;
const url = require('../url');

module.exports = function (win = window) {
  const defaultHost = "localhost";
  const defaultPath = "/dsh";
  const defaultPort = "3333";
  const bidderCode = "stroeerCore";

  const validBidRequest = bid => bid.params && utils.isStr(bid.params.sid);

  const isMainPageAccessible = () => getMostAccessibleTopWindow() === win.top;

  const getPageReferer = () => getMostAccessibleTopWindow().document.referrer || "none";

  const isSecureWindow = () => win.location.protocol === "https:";


  function buildUrl({host: hostname = defaultHost, port = defaultPort, path: pathname = defaultPath}) {
    const protocol = isSecureWindow() ? 'https' : 'http';
    const cacheBuster = new Date().getTime();
    return `${url.format({protocol, hostname, port, pathname, search: {t:cacheBuster}})}`;
  }


  function getMostAccessibleTopWindow() {
    let res = win;

    try {
      while (win.top !== res) {
        if (res.parent.location.href.length)
          res = res.parent;
      }
    }
    catch(ignore){}

    return res;
  }


  function elementInView(elementId) {
    const visibleInWindow = (el, win) => {
      const rect = el.getBoundingClientRect();
      const inView = (rect.top + rect.height >= 0) && (rect.top <= win.innerHeight);

      if (win !== win.parent) {
        return inView && visibleInWindow(win.frameElement, win.parent);
      }

      return inView;
    };

    try {
      return visibleInWindow(win.document.getElementById(elementId), win);
    }
    catch(e) {
      // old browser, element not found, cross-origin etc.
      return "unknown";
    }
  }


  function ajaxResponseFn(validBidRequestById) {
    return function(rawResponse) {
      let response;

      try {
        response = JSON.parse(rawResponse);
      }
      catch (e) {
        response = {bids:[]};
        utils.logError('unable to parse bid response', 'ERROR', e);
      }

      response.bids.forEach(bidResponse => {
        const bidRequest = validBidRequestById[bidResponse.bidId];

        if (bidRequest) {
          const bidObject = Object.assign(bidfactory.createBid(1, bidRequest), {
            bidderCode,
            cpm: bidResponse.cpm,
            width: bidResponse.width,
            height: bidResponse.height,
            ad: bidResponse.ad
          });
          bidmanager.addBidResponse(bidRequest.placementCode, bidObject);
        }
      });

      const unfulfilledBidRequests = Object.keys(validBidRequestById)
        .filter(id => response.bids.find(bid => bid.bidId === id) === undefined)
        .map(id => validBidRequestById[id]);

      unfulfilledBidRequests.forEach(bidRequest => {
        bidmanager.addBidResponse(bidRequest.placementCode, Object.assign(bidfactory.createBid(2, bidRequest), {bidderCode}));
      });
    };
  }

  return {
    callBids: function (params) {
      const requestBody = {bids:[]};
      const validBidRequestById = {};

      params.bids.forEach(bidRequest => {
        if (validBidRequest(bidRequest)) {
          requestBody.bids.push({
            bid: bidRequest.bidId,
            sid: bidRequest.params.slotId,
            siz: bidRequest.sizes,
            ref: getPageReferer(),
            ssl: isSecureWindow(),
            mpa: isMainPageAccessible(),
            viz: elementInView(bidRequest.placementCode)
          });
          validBidRequestById[bidRequest.bidId] = bidRequest;
        }
        else {
          bidmanager.addBidResponse(bidRequest.placementCode, Object.assign(bidfactory.createBid(2, bidRequest), {bidderCode}));
        }
      });

      if (requestBody.bids.length > 0) {
        ajax(buildUrl(params.bids[0].params), ajaxResponseFn(validBidRequestById), JSON.stringify(requestBody), {
          withCredentials: true,
          contentType: 'application/json'
        });
      }
    }
  };
};