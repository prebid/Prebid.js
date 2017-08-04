var bidfactory = require('src/bidfactory.js');
var bidmanager = require('src/bidmanager.js');
var adloader = require('src/adloader');
var constants = require('src/constants.json');
var adaptermanager = require('src/adaptermanager');

function MantisAdapter () {
  function inIframe() {
    try {
      return window.self !== window.top && !window.mantis_link;
    } catch (e) {
      return true;
    }
  }

  function isDesktop(ignoreTouch) {
    var scope = function (win) {
      var width = win.innerWidth || win.document.documentElement.clientWidth || win.document.body.clientWidth;
      var supportsTouch = !ignoreTouch && ('ontouchstart' in window || navigator.msMaxTouchPoints);

      return !supportsTouch && (!width || width >= (window.mantis_breakpoint || 768));
    };

    if (inIframe()) {
      try {
        return scope(window.top);
      } catch (ex) {
      }
    }

    return scope(window);
  }

  function isSendable(val) {
    if (val === null || val === undefined) {
      return false;
    }

    if (typeof val === 'string') {
      return !(!val || /^\s*$/.test(val));
    }

    if (typeof val === 'number') {
      return !isNaN(val);
    }

    return true;
  }

  function isObject(value) {
    return Object.prototype.toString.call(value) === '[object Object]';
  }

  function isAmp() {
    return typeof window.context === 'object' && (window.context.tagName === 'AMP-AD' || window.context.tagName === 'AMP-EMBED');
  }

  function isSecure() {
    return document.location.protocol === 'https:';
  }

  function isArray(value) {
    return Object.prototype.toString.call(value) === '[object Array]';
  }

  function jsonp(callback) {
    if (!window.mantis_jsonp) {
      window.mantis_jsonp = [];
    }

    window.mantis_jsonp.push(callback);

    return 'mantis_jsonp[' + (window.mantis_jsonp.length - 1) + ']';
  }

  function jsonToQuery(data, chain, form) {
    if (!data) {
      return null;
    }

    var parts = form || [];

    for (var key in data) {
      var queryKey = key;

      if (chain) {
        queryKey = chain + '[' + key + ']';
      }

      var val = data[key];

      if (isArray(val)) {
        for (var index = 0; index < val.length; index++) {
          var akey = queryKey + '[' + index + ']';
          var aval = val[index];

          if (isObject(aval)) {
            jsonToQuery(aval, akey, parts);
          } else if (isSendable(aval)) {
            parts.push(akey + '=' + encodeURIComponent(aval));
          }
        }
      } else if (isObject(val)) {
        jsonToQuery(val, queryKey, parts);
      } else if (isSendable(val)) {
        parts.push(queryKey + '=' + encodeURIComponent(val));
      }
    }

    return parts.join('&');
  }

  function buildMantisUrl(path, data, domain) {
    var params = {
      referrer: document.referrer,
      tz: new Date().getTimezoneOffset(),
      buster: new Date().getTime(),
      secure: isSecure()
    };

    if (!inIframe() || isAmp()) {
      params.mobile = !isAmp() && isDesktop(true) ? 'false' : 'true';
    }

    if (window.mantis_uuid) {
      params.uuid = window.mantis_uuid;
    } else if (window.localStorage) {
      var localUuid = window.localStorage.getItem('mantis:uuid');

      if (localUuid) {
        params.uuid = localUuid;
      }
    }

    if (!inIframe()) {
      try {
        params.title = window.top.document.title;
        params.referrer = window.top.document.referrer;
        params.url = window.top.document.location.href;
      } catch (ex) {

      }
    } else {
      params.iframe = true;
    }

    if (isAmp()) {
      if (!params.url && window.context.canonicalUrl) {
        params.url = window.context.canonicalUrl;
      }

      if (!params.url && window.context.location) {
        params.url = window.context.location.href;
      }

      if (!params.referrer && window.context.referrer) {
        params.referrer = window.context.referrer;
      }
    }

    Object.keys(data || {}).forEach(function (key) {
      params[key] = data[key];
    });

    var query = jsonToQuery(params);

    return (window.mantis_domain === undefined ? domain || 'https://mantodea.mantisadnetwork.com' : window.mantis_domain) + path + '?' + query;
  }

  var Prebid = function (bidfactory, bidmanager, adloader, constants) {
    return {
      callBids: function (params) {
        var property = null;

        params.bids.some(function (bid) {
          if (bid.params.property) {
            property = bid.params.property;

            return true;
          }
        });

        var url = {
          jsonp: jsonp(function (resp) {
            params.bids.forEach(function (bid) {
              var ad = resp.ads[bid.bidId];

              var bidObject;

              if (ad) {
                bidObject = bidfactory.createBid(constants.STATUS.GOOD);
                bidObject.bidderCode = 'mantis';
                bidObject.cpm = ad.cpm;
                bidObject.ad = ad.html;
                bidObject.width = ad.width;
                bidObject.height = ad.height;
              } else {
                bidObject = bidfactory.createBid(constants.STATUS.NO_BID);
                bidObject.bidderCode = 'mantis';
              }

              bidmanager.addBidResponse(bid.placementCode, bidObject);
            });
          }),
          property: property,
          bids: params.bids.map(function (bid) {
            return {
              bidId: bid.bidId,
              config: bid.params,
              sizes: bid.sizes.map(function (size) {
                return {width: size[0], height: size[1]};
              })
            };
          }),
          version: 1
        };

        adloader.loadScript(buildMantisUrl('/website/prebid', url));
      }
    };
  };

  return new Prebid(bidfactory, bidmanager, adloader, constants);
}

adaptermanager.registerBidAdapter(new MantisAdapter(), 'mantis');

module.exports = MantisAdapter;
