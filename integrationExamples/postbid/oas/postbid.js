(function(window){
  var postbid = {};
  postbid.que = [];

  var processQue = function(conf) {
    for (var i = 0; i < postbid.que.length; i++) {
      if (typeof postbid.que[i].called === 'undefined') {
        try {
          postbid.que[i].call(null, conf);
          postbid.que[i].called = true;
        }
        catch (e) {

        }
      }
    }
  }

  function getIframeContentDoc(iframe) {
    var doc;
    try {
      if (iframe.contentWindow) {
        doc = iframe.contentWindow.document;
      } else if (iframe.contentDocument.document) {
        doc = iframe.contentDocument.document;
      } else {
        doc = iframe.contentDocument;
      }
    } catch (e) {
    }
    return doc;
  }

  function createIframe(id) {
    var iframe = document.createElement('iframe');
    iframe.id = id;
    iframe.width = '100%';
    iframe.height = '100%';
    iframe.frameBorder = "0";
    iframe.marginWidth = "0";
    iframe.marginHeight = "0";
    iframe.scrolling = "no";
    iframe.setAttribute('border', '0');
    iframe.setAttribute('allowtransparency', "true");

    return iframe;
  }

  function loadIframe(iframe, content) {
    var iframeDoc = getIframeContentDoc(iframe);
    iframeDoc.open('text/html', 'replace');
    iframeDoc.write(content);
    iframeDoc.close();
  }

  function loadIeIframe(iframe, content) {
    iframe.contentWindow.contents = content;
    var base = document.getElementsByTagName('base');
    if(base.length) base[0].target = '_self';
    iframe.src = 'javascript:window["contents"];';
    if(base.length) base[0].target = '_blank';
  }

  function getBrowserType() {
    var ua = navigator.userAgent.toLowerCase();

    var match = /(webkit)[ \/]([\w.]+)/.exec(ua) ||
        /(opera)(?:.*version|)[ \/]([\w.]+)/.exec(ua) ||
        /(msie) ([\w.]+)/.exec(ua) ||
        /(trident)(\/\d.0);/.exec(ua) ||
        (/trident\/7.0;/.test(ua)) ? ['msie'] : false ||
        ua.indexOf('compatible') < 0 && /(mozilla)(?:.*? rv:([\w.]+)|)/.exec(ua) || [];

    return match[1];
  }

  if (!Array.prototype.find) {
    Object.defineProperty(Array.prototype, 'find', {
      value: function(predicate) {
        if (this == null) {
          throw new TypeError('"this" is null or not defined');
        }
        var o = Object(this);
        var len = o.length >>> 0;
        if (typeof predicate !== 'function') {
          throw new TypeError('predicate must be a function');
        }
        var thisArg = arguments[1];
        var k = 0;
        while (k < len) {
          var kValue = o[k];
          if (predicate.call(thisArg, kValue, k, o)) {
            return kValue;
          }
          k++;
        }
        return undefined;
      }
    });
  }

  postbid.que.push(function(conf) {
    var content = "\n      <script type=\"text/javascript\">\n      if (!Array.prototype.find) {\n        Object.defineProperty(Array.prototype, 'find', {\n          value: function(predicate) {\n            if (this == null) {\n              throw new TypeError('\"this\" is null or not defined');\n            }\n            var o = Object(this);\n            var len = o.length >>> 0;\n            if (typeof predicate !== 'function') {\n              throw new TypeError('predicate must be a function');\n            }\n            var thisArg = arguments[1];\n            var k = 0;\n            while (k < len) {\n              var kValue = o[k];\n              if (predicate.call(thisArg, kValue, k, o)) {\n                return kValue;\n              }\n              k++;\n            }\n            return undefined;\n          }\n        });\n      }\n\n      var pbjs = pbjs || {};\n      pbjs.que = pbjs.que || [];\n\n      (function() {\n          var pbjsEl = document.createElement(\"script\"); pbjsEl.type = \"text/javascript\";\n          pbjsEl.async = true; var isHttps = 'https:' === document.location.protocol;\n          pbjsEl.src = (isHttps ? \"https\" : \"http\") + \"://acdn.adnxs.com/prebid/not-for-prod/prebid.js\";\n          var pbjsTargetEl = document.getElementsByTagName(\"head\")[0];\n          pbjsTargetEl.insertBefore(pbjsEl, pbjsTargetEl.firstChild);\n      })();\n\n      pbjs.que.push(function() {\n          var adUnits = [{\n              code: '" + conf.adUnitCode + "',\n              sizes: " + conf.adUnitSizes + ",\n              bids: " + conf.adUnitBids + "\n          }];\n\n          pbjs.addAdUnits(adUnits);\n\n          pbjs.requestBids({\n              timeout: " + conf.timout + ",\n              bidsBackHandler: function() {\n                  var iframe = document.getElementById('postbid_if_3');\n\n                  var iframeDoc = iframe.contentWindow.document;\n\n                  var params = pbjs.getAdserverTargetingForAdUnitCode('" + conf.adUnitCode + "');\n\n                  // If any bidders return any creatives\n                  var bid;\n                  if(params && params['hb_adid']){\n                      bid = pbjs._bidsReceived.find(function(bid) {\n                        return bid.adId === params['hb_adid'];\n                      });\n                      pbjs.renderAd(iframeDoc, params['hb_adid']);\n                    } else {\n                      // If no bidder return any creatives,\n                      // Passback 3rd party tag in Javascript\n\n                      iframe.width = '" + conf.adUnitSizes[0] + "';\n                      iframe.height = '" + conf.adUnitSizes[1] + "';\n\n                      iframeDoc.write('" + conf.passbackTagHtml + "');\n                  }\n\n                  var iframeResize = window.parent.document.getElementById('" + conf.targetId + "');\n                  iframeResize.height = (bid.height) ? bid.height+'px' : '" + conf.adUnitSizes[1] + "px';\n                  iframeResize.width = (bid.width) ? bid.width+'px' : '" + conf.adUnitSizes[0] + "px';\n                }\n          });\n      });\n      <"+ '' +"/script>\n      <iframe id='postbid_if_3' FRAMEBORDER=\"0\" SCROLLING=\"no\" MARGINHEIGHT=\"0\" MARGINWIDTH=\"0\" TOPMARGIN=\"0\" LEFTMARGIN=\"0\" ALLOWTRANSPARENCY=\"true\" WIDTH=\"0\" HEIGHT=\"0\"></iframe>";

    var iframe = createIframe(conf.targetId);
    var div = document.getElementById(conf.divId);
    div.appendChild(iframe);
    var browser = getBrowserType();
    if(browser === 'msie') {
      loadIeIframe(iframe, content);
    } else {
      loadIframe(iframe, content);
    }
  });

  window.processQue = processQue;

})(window);
