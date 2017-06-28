var bidfactory = require('src/bidfactory.js');
var bidmanager = require('src/bidmanager.js');
var adLoader = require('src/adloader.js');
var adaptermanager = require('src/adaptermanager');

function CoxAdapter() {
  var adZoneAttributeKeys = ['id', 'size', 'thirdPartyClickUrl'],
    otherKeys = ['siteId', 'wrapper', 'referrerUrl'],
    placementMap = {},
    W = window;

  var COX_BIDDER_CODE = 'cox';

  function _callBids(params) {
    var env = '';

    // Create global cdsTag and CMT object (for the latter, only if needed )
    W.cdsTag = {};
    if (!W.CMT) W.CMT = _getCoxLite();

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
    if (tag.zones && Object.keys(tag.zones).length > 0) {
      tag.__callback__ = function (r) {
        tag.response = r;
        _notify();
      };
      adLoader.loadScript(W.CMT.Service.buildSrc(tag, env));
    }
  }

  function _notify() {
    // Will execute in the context of a bid
    // function finalizeAd(price) {
    //   this.ad = W.CMT.Service.setAuctionPrice(this.ad, price);
    //   return this;
    // }

    for (var adZoneKey in placementMap) {
      var bid = W.CMT.Service.getBidTrue(adZoneKey),
        bidObj,
        data = placementMap[adZoneKey];

      if (bid > 0) {
        bidObj = bidfactory.createBid(1);
        bidObj.cpm = bid;
        bidObj.ad = W.CMT.Service.getAd(adZoneKey);
        bidObj.width = data.w;
        bidObj.height = data.h;
        // bidObj.floor = W.CMT.Service.getSecondPrice(adZoneKey);
        // bidObj.finalizeAd = finalizeAd;
      } else {
        bidObj = bidfactory.createBid(2);
      }
      bidObj.bidderCode = COX_BIDDER_CODE;
      bidmanager.addBidResponse(data.p, bidObj);
    }
  }

  function _getCoxLite() {
    var CMT = {};

    CMT.Util = (function () {
      return {

        getRand: function getRand() {
          return Math.round(Math.random() * 100000000);
        },

        encodeUriObject: function encodeUriObject(obj) {
          return encodeURIComponent(JSON.stringify(obj));
        },

        extractUrlInfo: function extractUrlInfo() {
          function f2(callback) {
            try {
              if (!W.location.ancestorOrigins) return;
              for (var i = 0, len = W.location.ancestorOrigins.length; len > i; i++) {
                callback.call(null, W.location.ancestorOrigins[i], i);
              }
            } catch (ignore) { }
            return [];
          }

          function f1(callback) {
            var oneWindow,
              infoArray = [];
            do {
              try {
                oneWindow = oneWindow ? oneWindow.parent : W;
                callback.call(null, oneWindow, infoArray);
              } catch (t) {
                infoArray.push({
                  referrer: null,
                  location: null,
                  isTop: !1
                });
                return infoArray;
              }
            } while (oneWindow !== W.top);
            return infoArray;
          }
          var allInfo = f1(function (oneWindow, infoArray) {
            try {
              infoArray.push({ referrer: oneWindow.document.referrer || null, location: oneWindow.location.href || null, isTop: oneWindow === W.top });
            } catch (e) {
              infoArray.push({ referrer: null, location: null, isTop: oneWindow === W.top });
            }
          });
          f2(function (n, r) {
            allInfo[r].ancestor = n;
          });
          for (var t = '', e = !1, i = allInfo.length - 1, l = allInfo.length - 1; l >= 0; l--) {
            t = allInfo[l].location;
            if (!t && l > 0) {
              t = allInfo[l - 1].referrer;
              if (!t) t = allInfo[l - 1].ancestor;
              if (t) {
                e = W.location.ancestorOrigins ? !0 : l === allInfo.length - 1 && allInfo[allInfo.length - 1].isTop;
                break;
              }
            }
          } return { url: t, isTop: e, depth: i };
        },

        srTestCapabilities: function srTestCapabilities() {
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
          if (flashVer > 4) return 15; else return 7;
        }

      };
    }());

    // Ad calling functionality
    CMT.Service = (function () {
      // Closure variables shared by the service functions
      var U = CMT.Util;

      return {

        buildSrc: function buildSrc(tag, env) {
          var src = (document.location.protocol === 'https:' ? 'https://' : 'http://') + (!env || env === 'PRD' ? '' : env === 'PPE' ? 'ppe-' : env === 'STG' ? 'staging-' : '') + 'ad.afy11.net/ad' + '?mode=11' + '&ct=' + U.srTestCapabilities() + '&nif=0' + '&sf=0' + '&sfd=0' + '&ynw=0' + '&rand=' + U.getRand() + '&hb=1' + '&rk1=' + U.getRand() + '&rk2=' + new Date().valueOf() / 1000;

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

        getAd: function (zoneKey) {
          if (!zoneKey) return;

          return this._getData(zoneKey, 'ad') + (this._getResponse().tpCookieSync || ''); // ...also append cookie sync if present
        },

        // getSecondPrice: function getSecondPrice(zoneKey) {
        //  if (zoneKey.substring(0, 2) !== 'as') zoneKey = 'as' + zoneKey;
        //  var bid = this.getBidTrue(zoneKey),
        //    floor = this._getData(zoneKey, 'floor');

        //  // If no floor, just set it to 80% of the bid
        //  if (!floor) floor = bid * 0.80;

        //  // Adjust the floor if it's too high...it needs to always be lower
        //  if (floor >= bid) {
        //    floor = floor * 0.80; // Take off 20% to account for possible non-adjusted 2nd highest bid

        //    // If it's still too high, just take 80% to 90% of the bid
        //    if (floor >= bid) floor = bid * ((Math.random() * 10) + 80) / 100;
        //  }
        //  return Math.round(floor * 100) / 100;
        // },

        // setAuctionPrice: function setAuctionPrice(ad, bid) {
        //  return ad ? ad.replace('${AUCTION_PRICE}', bid) : ad;
        // },

        getBidTrue: function getBidTrue(zoneKey) {
          return Math.round(this._getData(zoneKey, 'price') * 100) / 100;
        },

        _getData: function (zoneKey, field) {
          var response = this._getResponse(),
            zoneResponseData = response.zones ? response.zones[zoneKey] : {};

          return (zoneResponseData || {})[field] || null;
        },

        _getResponse: function () {
          var tag = W.cdsTag;
          return (tag && tag.response) ? tag.response : {};
        },
      };
    }());

    return CMT;
  }

  // Export the callBids function, so that prebid.js can execute this function
  // when the page asks to send out bid requests.
  return {
    callBids: _callBids,
  };
}

adaptermanager.registerBidAdapter(new CoxAdapter, 'cox');

module.exports = CoxAdapter;
