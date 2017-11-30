/* eslint-disable */
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
    var sizes = JSON.parse(conf.adUnitSizes);
    var timeout = conf.timeout;
    var adUnitCode = conf.adUnitCode;
    var adUnitBids = conf.adUnitBids;
    var targetId = conf.targetId;
    var passbackTagHtml = conf.passbackTagHtml;

    var content = [%%postbid%%];
    content = content.replace(/\[%%targetId%%\]/g, targetId);
    content = content.replace(/\[%%adUnitCode%%\]/g, adUnitCode);
    content = content.replace(/\[%%timeout%%\]/g, timeout);
    content = content.replace(/\[%%adUnitBids%%\]/g, adUnitBids);
    content = content.replace(/\[%%passbackTagHtml%%\]/g, passbackTagHtml);
    content = content.replace(/\[%%sizes%%\]/g, conf.adUnitSizes);
    content = content.replace(/\[%%size0%%\]/g, sizes[0]);
    content = content.replace(/\[%%size1%%\]/g, sizes[1]);

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
/* eslint-enable */
