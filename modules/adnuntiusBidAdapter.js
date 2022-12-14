import { registerBidder } from '../src/adapters/bidderFactory.js';
import { BANNER, VIDEO } from '../src/mediaTypes.js';
import { isStr, deepAccess } from '../src/utils.js';
import { config } from '../src/config.js';
import { getStorageManager } from '../src/storageManager.js';

const BIDDER_CODE = 'adnuntius';
const ENDPOINT_URL = 'https://ads.adnuntius.delivery/i';
const ENDPOINT_URL_EUROPE = 'https://europe.delivery.adnuntius.com/i';
const GVLID = 855;
const DEFAULT_VAST_VERSION = 'vast4'
const META_DATA_KEY = 'adn.meta';

const checkSegment = function(segment) {
  if (isStr(segment)) return segment;
  if (segment.id) return segment.id
}

const getSegmentsFromOrtb = function(ortb2) {
  const userData = deepAccess(ortb2, 'user.data');
  let segments = [];
  if (userData) {
    userData.forEach(userdat => {
      if (userdat.segment) {
        segments.push(...userdat.segment.filter(checkSegment).map(checkSegment));
      }
    });
  }
  return segments
}

export const misc = {
  getUnixTimestamp: function(addDays, asMinutes) {
    const multiplication = addDays / (asMinutes ? 1440 : 1);
    return Date.now() + (addDays && addDays > 0 ? (1000 * 60 * 60 * 24 * multiplication) : 0);
  }
};

const storageTool = (function() {
  const storage = getStorageManager({gvlid: GVLID, bidderCode: BIDDER_CODE});

  const getMetaInternal = function() {
    if (!storage.localStorageIsEnabled()) {
      return {};
    }

    let parsedJson;
    try {
      parsedJson = JSON.parse(storage.getDataFromLocalStorage(META_DATA_KEY));
    } catch (e) {
      return {};
    }

    let filteredEntries = parsedJson ? parsedJson.filter((datum) => {
      if (datum.key === 'voidAuIds' && Array.isArray(datum.value)) {
        return true;
      }
      return datum.key && datum.exp && datum.value && datum.exp > misc.getUnixTimestamp();
    }) : [];
    const voidAuIdsEntry = filteredEntries.find(entry => entry.key === 'voidAuIds');
    if (voidAuIdsEntry) {
      const now = misc.getUnixTimestamp();
      voidAuIdsEntry.value = voidAuIdsEntry.value.filter(voidAuId => voidAuId.auId && voidAuId.exp > now);
      if (!voidAuIdsEntry.value.length) {
        filteredEntries = filteredEntries.filter(entry => entry.key !== 'voidAuIds');
      }
    }
    return filteredEntries;
  };

  const setMetaInternal = function(apiResponse) {
    if (!storage.localStorageIsEnabled()) {
      return;
    }

    const updateVoidAuIds = function(currentVoidAuIds, auIdsAsString) {
      const newAuIds = auIdsAsString ? auIdsAsString.split(';') : [];
      const notNewExistingAuIds = currentVoidAuIds.filter(auIdObj => {
        return newAuIds.indexOf(auIdObj.value) < -1;
      }) || [];
      const oneDayFromNow = misc.getUnixTimestamp(1);
      const apiIdsArray = newAuIds.map(auId => {
        return {exp: oneDayFromNow, auId: auId};
      }) || [];
      return notNewExistingAuIds.concat(apiIdsArray) || [];
    }

    const metaAsObj = getMetaInternal().reduce((a, entry) => ({...a, [entry.key]: {value: entry.value, exp: entry.exp}}), {});
    for (const key in apiResponse) {
      if (key !== 'voidAuIds') {
        metaAsObj[key] = {
          value: apiResponse[key],
          exp: misc.getUnixTimestamp(100)
        }
      }
    }
    const currentAuIds = updateVoidAuIds(metaAsObj.voidAuIds || [], apiResponse.voidAuIds || []);
    if (currentAuIds.length > 0) {
      metaAsObj.voidAuIds = {value: currentAuIds};
    }
    const metaDataForSaving = Object.entries(metaAsObj).map((entrySet) => {
      if (entrySet[0] === 'voidAuIds') {
        return {
          key: entrySet[0],
          value: entrySet[1].value
        };
      }
      return {
        key: entrySet[0],
        value: entrySet[1].value,
        exp: entrySet[1].exp
      }
    });
    storage.setDataInLocalStorage(META_DATA_KEY, JSON.stringify(metaDataForSaving));
  };

  const getUsi = function(meta, ortb2) {
    let usi = (meta && meta.usi) ? meta.usi : false;
    if (ortb2 && ortb2.user && ortb2.user.id) {
      usi = ortb2.user.id
    }
    return usi;
  }

  return {
    getMeta: function(ortb2) {
      const metaInternal = getMetaInternal().reduce((a, entry) => ({...a, [entry.key]: entry.value}), {});
      metaInternal.usi = getUsi(metaInternal, ortb2);
      if (!metaInternal.usi) {
        delete metaInternal.usi;
      }
      if (metaInternal.voidAuIds) {
        metaInternal.voidAuIdsArray = metaInternal.voidAuIds.map((voidAuId) => {
          return voidAuId.auId;
        })
      }
      return metaInternal;
    },
    setMeta: function(serverData) {
      setMetaInternal(serverData);
    }
  };
})();

export const spec = {
  code: BIDDER_CODE,
  gvlid: GVLID,
  supportedMediaTypes: [BANNER, VIDEO],
  isBidRequestValid: function (bid) {
    return !!(bid.bidId || (bid.params.member && bid.params.invCode));
  },

  buildRequests: function(validBidRequests, bidderRequest) {
    const networks = {};
    const bidRequests = {};
    const requests = [];
    const request = [];
    const ortb2 = bidderRequest.ortb2 || {};
    const bidderConfig = config.getConfig();

    const adnMeta = storageTool.getMeta(ortb2);
    const segments = getSegmentsFromOrtb(ortb2);
    const tzo = new Date().getTimezoneOffset();
    const gdprApplies = deepAccess(bidderRequest, 'gdprConsent.gdprApplies');
    const consentString = deepAccess(bidderRequest, 'gdprConsent.consentString');

    request.push('tzo=' + tzo)
    request.push('format=json')

    if (gdprApplies !== undefined) request.push('consentString=' + consentString);
    if (segments.length > 0) request.push('segments=' + segments.join(','));
    if (adnMeta.usi) request.push('userId=' + adnMeta.usi);
    if (bidderConfig.useCookie === false) request.push('noCookies=true')
    for (let i = 0; i < validBidRequests.length; i++) {
      const bid = validBidRequests[i]
      if (adnMeta.voidAuIdsArray && adnMeta.voidAuIdsArray.indexOf(bid.params.auId) > -1) {
        // This auId is void. Do NOT waste time and energy sending a request to the server
        continue
      }
      let network = bid.params.network || 'network';
      const targeting = bid.params.targeting || {};

      if (bid.mediaTypes && bid.mediaTypes.video && bid.mediaTypes.video.context !== 'outstream') {
        network += '_video'
      }

      bidRequests[network] = bidRequests[network] || [];
      bidRequests[network].push(bid);

      networks[network] = networks[network] || {};
      networks[network].adUnits = networks[network].adUnits || [];
      if (bidderRequest && bidderRequest.refererInfo) networks[network].context = bidderRequest.refererInfo.page;
      if (Object.keys(adnMeta).length > 0) {
        const adnMetaClone = {...adnMeta};
        delete adnMetaClone.voidAuIds;
        delete adnMetaClone.voidAuIdsArray;
        if (Object.keys(adnMetaClone).length > 0) {
          networks[network].metaData = adnMetaClone;
        }
      }
      const adUnit = {...targeting, auId: bid.params.auId, targetId: bid.bidId}
      if (bid.mediaTypes && bid.mediaTypes.banner && bid.mediaTypes.banner.sizes) adUnit.dimensions = bid.mediaTypes.banner.sizes
      networks[network].adUnits.push(adUnit);
    }

    const networkKeys = Object.keys(networks)
    for (let j = 0; j < networkKeys.length; j++) {
      const network = networkKeys[j];
      const networkRequest = [...request]
      if (network.indexOf('_video') > -1) { networkRequest.push('tt=' + DEFAULT_VAST_VERSION) }
      const requestURL = gdprApplies ? ENDPOINT_URL_EUROPE : ENDPOINT_URL
      // if (network.indexOf('_native') > -1) { networkRequest.push('tt=' + DEFAULT_NATIVE) }
      requests.push({
        method: 'POST',
        url: requestURL + '?' + networkRequest.join('&'),
        data: JSON.stringify(networks[network]),
        bid: bidRequests[network]
      });
    }

    return requests;
  },

  interpretResponse: function(serverResponse, bidRequest) {
    if (serverResponse.body.metaData) {
      storageTool.setMeta(serverResponse.body.metaData);
    }
    const adUnits = serverResponse.body.adUnits;
    const bidResponsesById = adUnits.reduce((response, adUnit) => {
      if (adUnit.matchedAdCount >= 1) {
        const ad = adUnit.ads[0];
        const effectiveCpm = (ad.bid) ? ad.bid.amount * 1000 : 0;
        const adResponse = {
          ...response,
          [adUnit.targetId]: {
            requestId: adUnit.targetId,
            cpm: effectiveCpm,
            width: Number(ad.creativeWidth),
            height: Number(ad.creativeHeight),
            creativeId: ad.creativeId,
            currency: (ad.bid) ? ad.bid.currency : 'EUR',
            dealId: ad.dealId || '',
            meta: {
              advertiserDomains: (ad.destinationUrls.destination) ? [ad.destinationUrls.destination.split('/')[2]] : []

            },
            netRevenue: false,
            ttl: 360,
          }
        }

        if (adUnit.vastXml) {
          adResponse[adUnit.targetId].vastXml = adUnit.vastXml
          adResponse[adUnit.targetId].mediaType = VIDEO
        } else {
          adResponse[adUnit.targetId].ad = adUnit.html
        }

        return adResponse
      } else {
        return response
      }
    }, {});

    return bidRequest.bid.map(bid => bid.bidId).reduce((request, adunitId) => {
      if (bidResponsesById[adunitId]) {
        request.push(bidResponsesById[adunitId])
      }
      return request
    }, [])
  },

}
registerBidder(spec);
