//const adloader = require('../adloader');
const bidmanager = require('../bidmanager');
const bidfactory = require('../bidfactory');
const utils = require('../utils.js');


module.exports = function (win = window) {

  const colourFn = function (count) {
    const colours = ["#cbc8ed", "#fbc9e3", "#cae5d7", "#cfdcf1", "#fdfd96", "#ff7e87"];
    return colours[count % colours.length];
  };

  const createDummyAdTag = (width, height, divBody, color) =>
  `<div style="width:${width-4}px;height:${height-4}px;margin:0;padding:0;border:2px solid #f4fc0a;background-color:${color}">\n` +
  divBody +
  '\n</div>';

  const validBid = bid => bid.params && utils.isStr(bid.params.sid);

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


  function isMainPageAccessible() {
    return getMostAccessibleTopWindow() === win.top;
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


  function getPageContext(placementCode) {
    const getPageReferer = () => getMostAccessibleTopWindow().document.referrer || "none";
    const isSecureWindow = () => win.location.protocol === "https:";

    return {
      "page referer": getPageReferer(),
      "secure window": isSecureWindow(),
      "in viewport": elementInView(placementCode),
      "main page accessible": isMainPageAccessible()
    };
  }

  let callBidCount = 0;

  return {
    callBids: function (params) {
      const cpm = 4.0;
      const bidderCode = "stroeerCore";

      params.bids.forEach(bid => {
        const [width, height] = bid.sizes[0];

        const pageContext = Object.entries(getPageContext(bid.placementCode)).map(([key, val]) => key + ": " + val).sort().join(", ");

        let bidObject;
        if (validBid(bid)) {
          bidObject = Object.assign(bidfactory.createBid(1, bid), {
            cpm,
            bidderCode,
            width,
            height,
            ad: createDummyAdTag(width, height, `Hello, I'm an advert. ${pageContext}`, colourFn(callBidCount))
          });
        }
        else {
          bidObject = Object.assign(bidfactory.createBid(2, bid), {bidderCode});
        }

        bidmanager.addBidResponse(bid.placementCode, bidObject);
      });

      callBidCount++;
    }
  };
};