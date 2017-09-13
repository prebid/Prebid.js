const bidfactory = require('src/bidfactory.js');
const bidmanager = require('src/bidmanager.js');
const adloader = require('src/adloader.js');
const utils = require('src/utils.js');
const adaptermanager = require('src/adaptermanager');
const CONSTANTS = require('src/constants.json');
const HOST = $$PREBID_GLOBAL$$.kargo_kraken_host || 'https://krk.kargo.com';

const KargoAdapter = function KargoAdapter() {
  function _handleBid(bids) {
    return function wrappedHandleBid(adUnits) {
      utils._map(bids, bid => {
        let adUnit = adUnits[bid.params.placementId];

        if (adUnit) {
          bidmanager.addBidResponse(bid.placementCode, _createBid(adUnit));

          if (adUnit.receivedTracker) {
            var el = document.createElement('img');
            el.src = adUnit.receivedTracker;
            document.body.appendChild(el);
          }
        }
      });
    };
  }

  function _createBid(adUnit) {
    let bidObject = bidfactory.createBid(CONSTANTS.STATUS.GOOD);
    bidObject.bidderCode = 'kargo';
    bidObject.cpm = Number(adUnit.cpm);
    bidObject.ad = adUnit.adm;
    bidObject.width = adUnit.width;
    bidObject.height = adUnit.height;
    return bidObject;
  }

  function _callBids(params) {
    const transformedParams = Object.assign({}, {
      timeout: params.timeout,
      currency: 'USD',
      cpmGranularity: 1,
      cpmRange: {
        floor: 0,
        ceil: 20
      },
      adSlotIds: utils._map(params.bids, bid => bid.params.placementId)
    }, _getAllMetadata());
    const encodedParams = encodeURIComponent(JSON.stringify(transformedParams));
    const callbackName = `kargo_prebid_${params.requestId.replace(/-/g, '_')}`;

    window.$$PREBID_GLOBAL$$[callbackName] = _handleBid(params.bids);

    adloader.loadScript(`${HOST}/api/v1/bid?json=${encodedParams}&cb=window.$$PREBID_GLOBAL$$.${callbackName}`);
  }

  function _readCookie(name) {
    let nameEquals = `${name}=`;
    let cookies = document.cookie.split(';');

    for (let key in cookies) {
      let cookie = cookies[key];
      while (cookie.charAt(0) === ' ') {
        cookie = cookie.substring(1, cookie.length);
      }

      if (cookie.indexOf(nameEquals) === 0) {
        return cookie.substring(nameEquals.length, cookie.length);
      }
    }

    return null;
  }

  function _getCrbIds() {
    try {
      const crb = JSON.parse(decodeURIComponent(_readCookie('krg_crb')));
      var syncIds = {};

      if (crb && crb.v) {
        var vParsed = JSON.parse(atob(crb.v));

        if (vParsed && vParsed.syncIds) {
          syncIds = vParsed.syncIds;
        }
      }

      return syncIds;
    } catch (e) {
      return {};
    }
  }

  function _getUid() {
    try {
      const uid = JSON.parse(decodeURIComponent(_readCookie('krg_uid')));
      var vData = {};

      if (uid && uid.v) {
        vData = uid.v;
      }

      return vData;
    } catch (e) {
      return {};
    }
  }

  function _getKruxUserId() {
    return _getLocalStorageSafely('kxkar_user');
  }

  function _getKruxSegments() {
    return _getLocalStorageSafely('kxkar_segs');
  }

  function _getKrux() {
    const segmentsStr = _getKruxSegments();
    var segments = [];

    if (segmentsStr) {
      segments = segmentsStr.split(',');
    }

    return {
      userID: _getKruxUserId(),
      segments: segments
    };
  }

  function _getLocalStorageSafely(key) {
    try {
      return localStorage.getItem(key);
    } catch (e) {
      return null;
    }
  }

  function _getUserIds() {
    const uid = _getUid();
    const crbIds = _getCrbIds();

    return {
      kargoID: uid.userId,
      clientID: uid.clientId,
      crbIDs: crbIds,
      optOut: uid.optOut
    };
  }

  function _getAllMetadata() {
    return {
      userIDs: _getUserIds(),
      krux: _getKrux(),
      pageURL: window.location.href
    };
  }

  // Export the callBids function, so that prebid.js can execute
  // this function when the page asks to send out bid requests.
  return {
    callBids: _callBids
  };
};

adaptermanager.registerBidAdapter(new KargoAdapter(), 'kargo');

module.exports = KargoAdapter;
