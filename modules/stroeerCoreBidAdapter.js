const bidmanager = require('src/bidmanager');
const bidfactory = require('src/bidfactory');
const utils = require('src/utils');
const ajax = require('src/ajax').ajax;
const url = require('src/url');
const adaptermanager = require('src/adaptermanager');
const config = require('src/config').config;

const StroeerCoreAdapter = function (win = window) {
  const defaultHost = 'dsh.adscale.de';
  const defaultPath = '/dsh';
  const defaultPort = '';
  const bidderCode = 'stroeerCore';

  const validBidRequest = bid => bid.params && utils.isStr(bid.params.sid);

  const isMainPageAccessible = () => getMostAccessibleTopWindow() === win.top;

  const getPageReferer = () => getMostAccessibleTopWindow().document.referrer || undefined;

  const isSecureWindow = () => win.location.protocol === 'https:';

  function buildUrl({host: hostname = defaultHost, port = defaultPort, securePort, path: pathname = defaultPath}) {
    const secure = isSecureWindow();

    if (securePort && secure) {
      port = securePort;
    }

    return `${url.format({protocol: secure ? 'https' : 'http', hostname, port, pathname})}`;
  }

  function getMostAccessibleTopWindow() {
    let res = win;

    try {
      while (win.top !== res && res.parent.location.href.length) {
        res = res.parent;
      }
    } catch (ignore) {}

    return res;
  }

  function find(arr, fn) {
    // not all browsers support Array.find
    let res;
    for (let i = 0; i < arr.length; i++) {
      if (fn(arr[i])) {
        res = arr[i];
        break;
      }
    }
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
    } catch (e) {
      // old browser, element not found, cross-origin etc.
    }
    return undefined;
  }

  function insertUserConnect(bids) {
    const scriptElement = win.document.createElement('script');
    const anyBidWithSlotId = find(bids, validBidRequest);
    const anyBidWithConnectJsUrl = find(bids, b => b.params && b.params.connectjsurl);

    if (anyBidWithSlotId) {
      scriptElement.setAttribute('data-container-config', JSON.stringify({slotId: anyBidWithSlotId.params.sid}));
    }

    const userConnectUrl = anyBidWithConnectJsUrl && anyBidWithConnectJsUrl.params.connectjsurl;

    scriptElement.src = userConnectUrl || ((isSecureWindow() ? 'https:' : 'http:') + '//js.adscale.de/userconnect.js');

    utils.insertElement(scriptElement);
  }

  function handleBidResponse(response, validBidRequestById) {
    response.bids.forEach(bidResponse => {
      const bidRequest = validBidRequestById[bidResponse.bidId];

      if (bidRequest) {
        const bidObject = Object.assign(bidfactory.createBid(1, bidRequest), {
          bidderCode,
          cpm: bidResponse.cpm,
          width: bidResponse.width,
          height: bidResponse.height,
          ad: bidResponse.ad,
          cpm2: bidResponse.cpm2,
          floor: bidResponse.floor,
          exchangerate: bidResponse.exchangerate,
          nurl: bidResponse.nurl
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
  }

  function parseResponse(rawResponse) {
    let response = {};

    try {
      response = JSON.parse(rawResponse);
    } catch (e) {
      utils.logError('unable to parse bid response', 'ERROR', e);
    }

    return response;
  }

  return {
    callBids: function (params) {
      const allBids = params.bids;

      var ssat = config.getConfig('ssat');
      if (ssat === undefined) {
        ssat = 2;
      }

      if ([1, 2].indexOf(ssat) === -1) {
        allBids.forEach(bid => bidmanager.addBidResponse(bid.placementCode, Object.assign(bidfactory.createBid(2, bid), {bidderCode})));
        utils.logError(`${ssat} is not a valid auction type`, 'ERROR');

        return;
      }

      const requestBody = {
        id: params.bidderRequestId,
        bids: [],
        ref: getPageReferer(),
        ssl: isSecureWindow(),
        mpa: isMainPageAccessible(),
        timeout: params.timeout - (Date.now() - params.auctionStart),
        ssat: ssat
      };

      const validBidRequestById = {};

      allBids.forEach(bidRequest => {
        if (validBidRequest(bidRequest)) {
          requestBody.bids.push({
            bid: bidRequest.bidId,

            sid: bidRequest.params.sid,
            siz: bidRequest.sizes,
            viz: elementInView(bidRequest.placementCode)
          });
          validBidRequestById[bidRequest.bidId] = bidRequest;
        } else {
          bidmanager.addBidResponse(bidRequest.placementCode, Object.assign(bidfactory.createBid(2, bidRequest), {bidderCode}));
        }
      });

      // Safeguard against the unexpected - an infinite request loop.
      let redirectCount = 0;

      function sendBidRequest(url) {
        const callback = {
          success: function (responseText /*, status code */) {
            const response = parseResponse(responseText);

            if (response.redirect && redirectCount === 0) {
              // Workaround for IE 10/11. These browsers don't send the body on the ajax post redirect.
              // Also as a workaround for Safari on iPad/iPhone. These browsers always do pre-flight CORS request when
              // it should do simple CORS request as Ajax content-type is text/plain. Therefore, like the Safari on
              // desktop when content type is json/application, they don't send the body on subsequent requests.
              redirectCount++;
              sendBidRequest(response.redirect);
            } else {
              if (response.bids) {
                handleBidResponse(response, validBidRequestById);
              } else {
                utils.logError('invalid response ' + JSON.stringify(response), 'ERROR');
                handleBidResponse({bids: []}, validBidRequestById);
              }
              insertUserConnect(allBids);
            }
          },
          error: function () {
            insertUserConnect(allBids);
          }
        };

        ajax(url, callback, JSON.stringify(requestBody), {
          withCredentials: true,
          contentType: 'text/plain'
        });
      }

      if (requestBody.bids.length > 0) {
        sendBidRequest(buildUrl(allBids[0].params));
      } else {
        insertUserConnect(allBids);
      }
    }
  };
};

adaptermanager.registerBidAdapter(new StroeerCoreAdapter(), 'stroeerCore');

module.exports = StroeerCoreAdapter;
