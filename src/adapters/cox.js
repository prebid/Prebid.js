var bidfactory = require('../bidfactory.js');
var bidmanager = require('../bidmanager.js');
var adLoader = require('../adloader.js');

var CoxAdapter = function CoxAdapter() {
  var adZoneAttributeKeys = ['id', 'size', 'thirdPartyClickUrl'],
      otherKeys = ['siteId', 'wrapper', 'referrerUrl'],
      placementMap = {},
      W = window;

  var COX_BIDDER_CODE = 'cox';

  function _callBids(params) {
    var env = '';

    // Create global cdsTag and COX object
    if (!W.cdsTag) W.cdsTag = {};
    if (!W.COX) W.COX = _getCoxLite();

    // Populate the tag with the info from prebid
    var bids = params.bids || [],
        tag = W.cdsTag,
        i,
        j;
    for (i = 0; i < bids.length; i++) {
      var bid = bids[i],
          cfg = bid.params || {};

      if (cfg.id) {
        tag.zones = tag.zones || {};
        var zone = {};

        for (j = 0; j < adZoneAttributeKeys.length; j++) {
          if (cfg[adZoneAttributeKeys[j]]) zone[adZoneAttributeKeys[j]] = cfg[adZoneAttributeKeys[j]];
        }
        for (j = 0; j < otherKeys.length; j++) {
          if (cfg[otherKeys[j]]) tag[otherKeys[j]] = cfg[otherKeys[j]];
        }
        var adZoneKey = 'as' + cfg.id;
        tag.zones[adZoneKey] = zone;

        // Check for an environment setting
        if (cfg.env) env = cfg.env;

        // Update the placement map
        var xy = (cfg.size || '0x0').split('x');
        placementMap[adZoneKey] = {
          p: bid.placementCode,
          w: xy[0],
          h: xy[1]
        };
      }
    }

    if (bids.length > 0) {
      tag.__callback__ = function (r) {
        tag.response = r;
        _notify();
      };
      adLoader.loadScript(W.COX.Service.buildSrc(tag, env));
    }
  }

  function _notify() {
    for (var adZoneKey in placementMap) {
      var bid = W.COX.Service.getBidTrue(adZoneKey),
          bidObj,
          data = placementMap[adZoneKey];

      if (bid > 0) {
        bidObj = bidfactory.createBid(1);
        bidObj.cpm = bid;
        bidObj.ad = W.COX.Service.getAd(adZoneKey);
        bidObj.width = data.w;
        bidObj.height = data.h;
      } else {
        bidObj = bidfactory.createBid(2);
      }
      bidObj.bidderCode = COX_BIDDER_CODE;

      W.$$PREBID_GLOBAL$$.addCallback('adUnitBidsBack', _finalizeAds);
      bidmanager.addBidResponse(data.p, bidObj);
    }
  }

  function _finalizeAds(units) {
    // Find all the cox bids and detokenize their ads
    for (var placementCode in units) {
      var unit = units[placementCode];

      for (var x = 0; x < unit.bids.length; x++) {
        var bid = unit.bids[x];

        if (bid.bidderCode === COX_BIDDER_CODE && bid.ad) {
          bid.ad = W.COX.Service.setAuctionPrice(bid.ad, bid.cpm);
        }
      }
    }
  }

  function _getCoxLite() {
    var COX = {};

    COX.Util = (function () {

      return {

        getRand: function () {
          return Math.round(Math.random() * 100000000);
        },

        encodeUriObject: function (obj) {
          return encodeURIComponent(JSON.stringify(obj));
        },

        extractUrlInfo: function () {
          function f2(callback) {
            try {
              if (!W.location.ancestorOrigins) return;
              for (var i = 0, len = W.location.ancestorOrigins.length; len > i; i++) callback.call(null, W.location.ancestorOrigins[i], i);
            } catch (ignore) { }
            return [];
          }

          function f1(callback) {
            var oneWindow, infoArray = [];
            do {
              try {
                oneWindow = oneWindow ? oneWindow.parent : W;
                callback.call(null, oneWindow, infoArray);
              } catch (t) {
                return infoArray.push({
                  referrer: null,
                  location: null,
                  isTop: !1
                }), infoArray;
              }
            }
            while (oneWindow !== W.top);
            return infoArray;
          }
          var allInfo = f1(
            function (oneWindow, infoArray) {
              try {
                infoArray.push({referrer: oneWindow.document.referrer || null, location: oneWindow.location.href || null, isTop: oneWindow === W.top});
              } catch (e) {
                infoArray.push({referrer: null, location: null, isTop: oneWindow === W.top});
              }
            }
          );
          f2(
            function (n, r) {
              allInfo[r].ancestor = n;
            }
          );
          for (var t = "", e = !1, i = allInfo.length - 1, l = allInfo.length - 1; l >= 0; l--)
            if (t = allInfo[l].location, !t && l > 0 && (t = allInfo[l - 1].referrer, t || (t = allInfo[l - 1].ancestor)), t) {
              e = W.location.ancestorOrigins ? !0 : l === allInfo.length - 1 && allInfo[allInfo.length - 1].isTop;
              break;
            }
          return { url: t, isTop: e, depth: i };
        },

        srTestCapabilities: function () {
          function srControlVersion() {
            function newActiveXObject(ver) {
              return new W.ActiveXObject('ShockwaveFlash.ShockwaveFlash' + ver);
            }

            var version;
            var axo;

            function partialTest(ver) {
              if (!version) {
                try {
                  axo = newActiveXObject(ver);
                  version = axo.GetVariable('$version');
                }
                catch (ignore) { }
              }
            }
            function partialTest2(ver, verLong) {
              if (!version) {
                try {
                  axo = newActiveXObject(ver);
                  version = verLong;
                }
                catch (ignore) { }
              }
            }
            // NOTE : new ActiveXObject(strFoo) throws an exception if strFoo isn't in the registry
            partialTest('.7');

            if (!version) {
              try {
                axo = newActiveXObject('.6');
                version = 'WIN 6,0,21,0';
                axo.AllowScriptAccess = 'always';
                version = axo.GetVariable('$version');

              }
              catch (ignore) { }
            }
            partialTest('.3');
            partialTest2('.3', 'WIN 3,0,18,0');
            partialTest2('', 'WIN 2,0,0,11');

            if (!version)
              version = -1;

            return version;
          }

          // JavaScript helper required to detect Flash Player PlugIn version information
          function srGetSwfVer() {
            var plugins = navigator.plugins,
              flashVer = -1,
              sf = 'Shockwave Flash';

            if (plugins && plugins.length > 0) {
              if (plugins[sf + ' 2.0'] || plugins[sf]) {
                var swVer2 = plugins[sf + ' 2.0'] ? ' 2.0' : '';
                var flashDescription = plugins[sf + swVer2].description;
                flashVer = flashDescription.split(' ')[2].split('.')[0];
              }
            }
            else if (navigator.userAgent.indexOf("MSIE") !== -1 && navigator.appVersion.indexOf("Win") !== -1) {
              flashVer = srControlVersion();
              if (flashVer !== -1)
                flashVer = flashVer.split(' ')[1].split(',')[0];
            }
            return flashVer;
          }

          var flashVer = srGetSwfVer();
          if (flashVer > 4)
            return 15;
          else
            return 7;
        },

      };
    })();

    // Ad calling functionality
    COX.Service = (function () {

      // Closure variables shared by the service functions
      var U = COX.Util;

      return {

        buildSrc: function (tag, env) {
          var src = (document.location.protocol === 'https:' ? 'https://' : 'http://') +
            (!env || env === 'PRD' ? '' : env === 'PPE' ? 'ppe-' : env === 'STG' ? 'staging-' : '') +
            'ad.afy11.net/ad' +
            '?mode=11' +
            '&ct=' + U.srTestCapabilities() +
            '&nif=0' +
            '&sf=0' +
            '&sfd=0' +
            '&ynw=0' +
            '&rand=' + U.getRand() +
            '&hb=1' +
            '&rk1=' + U.getRand() +
            '&rk2=' + ((new Date()).valueOf() / 1000);

          // Make sure we don't have a response object...
          delete tag.response;

          // Extracted url info...
          var urlInfo = U.extractUrlInfo();
          tag.pageUrl = urlInfo.url;
          tag.puTop = urlInfo.isTop;

          // Attach the serialized tag to our string
          src += '&ab=' + U.encodeUriObject(tag);

          return src;
        },

        // The 2nd parameter is optional
        getAd: function (zoneKey, zoneResponseData) {
          if (!zoneKey) return;

          var tag = W.cdsTag,
            response = (tag && tag.response) ? tag.response : {};
          zoneResponseData = zoneResponseData || (response.zones ? response.zones[zoneKey] : {});

          return zoneResponseData.ad + (response.tpCookieSync || ''); // ...also append cookie sync if present
        },

        setAuctionPrice: function (ad, bid) {
          return ad ? ad.replace('${AUCTION_PRICE}', bid) : ad;
        },

        getBidTrue: function (key) {
          var tag = W.cdsTag,
            zoneData = tag ? tag.response ? tag.response.zones ? tag.response.zones[key] : '' : '' : '',
            responseBid = (zoneData ? parseFloat(zoneData.price) || 0 : 0);

          return responseBid;
        },
      };
    })();

    return COX;
  }

  // Export the callBids function, so that prebid.js can execute this function
  // when the page asks to send out bid requests.
  return {
    callBids: _callBids
  };
};

module.exports = CoxAdapter;