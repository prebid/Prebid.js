import * as utils from 'src/utils';
import {config} from 'src/config';
import {registerBidder} from 'src/adapters/bidderFactory';
const BIDDER_CODE = 'kargo';
const HOST = 'https://krk.kargo.com';
export const spec = {
  code: BIDDER_CODE,
  isBidRequestValid: function(bid) {
    if (!bid || !bid.params) {
      return false;
    }
    return !!bid.params.placementId;
  },
  buildRequests: function(validBidRequests, bidderRequest) {
    const currency = config.getConfig('currency');
    const transformedParams = Object.assign({}, {
      timeout: bidderRequest.timeout,
      currency: currency,
      cpmGranularity: 1,
      cpmRange: {
        floor: 0,
        ceil: 20
      },
      adSlotIds: utils._map(validBidRequests, bid => bid.params.placementId)
    }, spec._getAllMetadata());
    const encodedParams = encodeURIComponent(JSON.stringify(transformedParams));
    return Object.assign({}, bidderRequest, {
      method: 'GET',
      url: `${HOST}/api/v1/bid`,
      data: `json=${encodedParams}`,
      currency: currency
    });
  },
  interpretResponse: function(response, bidRequest) {
    let adUnits = response.body;
    let bids = {};
    utils._each(bidRequest.bids, bid => bids[bid.params.placementId] = bid);
    const bidResponses = [];
    for (let adUnitId in adUnits) {
      let adUnit = adUnits[adUnitId];
      bidResponses.push({
        requestId: bids[adUnitId].bidId,
        cpm: Number(adUnit.cpm),
        width: adUnit.width,
        height: adUnit.height,
        ad: adUnit.adm,
        ttl: 300,
        creativeId: adUnitId,
        netRevenue: true,
        currency: bidRequest.currency
      });
    }
    return bidResponses;
  },

  // PRIVATE
  _readCookie(name) {
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
  },

  _getCrbIds() {
    try {
      const crb = JSON.parse(decodeURIComponent(spec._readCookie('krg_crb')));
      let syncIds = {};

      if (crb && crb.v) {
        let vParsed = JSON.parse(atob(crb.v));

        if (vParsed && vParsed.syncIds) {
          syncIds = vParsed.syncIds;
        }
      }

      return syncIds;
    } catch (e) {
      return {};
    }
  },

  _getUid() {
    try {
      const uid = JSON.parse(decodeURIComponent(spec._readCookie('krg_uid')));
      let vData = {};

      if (uid && uid.v) {
        vData = uid.v;
      }

      return vData;
    } catch (e) {
      return {};
    }
  },

  _getKruxUserId() {
    return spec._getLocalStorageSafely('kxkar_user');
  },

  _getKruxSegments() {
    return spec._getLocalStorageSafely('kxkar_segs');
  },

  _getKrux() {
    const segmentsStr = spec._getKruxSegments();
    let segments = [];

    if (segmentsStr) {
      segments = segmentsStr.split(',');
    }

    return {
      userID: spec._getKruxUserId(),
      segments: segments
    };
  },

  _getLocalStorageSafely(key) {
    try {
      return localStorage.getItem(key);
    } catch (e) {
      return null;
    }
  },

  _getUserIds() {
    const uid = spec._getUid();
    const crbIds = spec._getCrbIds();

    return {
      kargoID: uid.userId,
      clientID: uid.clientId,
      crbIDs: crbIds,
      optOut: uid.optOut
    };
  },

  _getAllMetadata() {
    return {
      userIDs: spec._getUserIds(),
      krux: spec._getKrux(),
      pageURL: window.location.href,
      rawCRB: spec._readCookie('krg_crb')
    };
  }
};
registerBidder(spec);
