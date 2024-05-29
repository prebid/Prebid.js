import { registerBidder } from '../src/adapters/bidderFactory.js';
import { BANNER, VIDEO } from '../src/mediaTypes.js';
import { isStr, deepAccess } from '../src/utils.js';
import { config } from '../src/config.js';
import { getStorageManager } from '../src/storageManager.js';

const BIDDER_CODE = 'adnuntius';
const BIDDER_CODE_DEAL_ALIAS_BASE = 'adndeal';
const BIDDER_CODE_DEAL_ALIASES = [1, 2, 3, 4, 5].map(num => {
  return BIDDER_CODE_DEAL_ALIAS_BASE + num;
});
const ENDPOINT_URL = 'https://ads.adnuntius.delivery/i';
const ENDPOINT_URL_EUROPE = 'https://europe.delivery.adnuntius.com/i';
const GVLID = 855;
const DEFAULT_VAST_VERSION = 'vast4'
const MAXIMUM_DEALS_LIMIT = 5;
const VALID_BID_TYPES = ['netBid', 'grossBid'];
const METADATA_KEY = 'adn.metaData';
const METADATA_KEY_SEPARATOR = '@@@';

export const misc = {
  getUnixTimestamp: function (addDays, asMinutes) {
    const multiplication = addDays / (asMinutes ? 1440 : 1);
    return Date.now() + (addDays && addDays > 0 ? (1000 * 60 * 60 * 24 * multiplication) : 0);
  }
};

const storageTool = (function () {
  const storage = getStorageManager({ bidderCode: BIDDER_CODE });
  let metaInternal;

  const getMetaDataFromLocalStorage = function (pNetwork) {
    if (!storage.localStorageIsEnabled()) {
      return [];
    }

    let parsedJson;
    try {
      parsedJson = JSON.parse(storage.getDataFromLocalStorage(METADATA_KEY));
    } catch (e) {
      return [];
    }

    let network = pNetwork;
    if (Array.isArray(pNetwork)) {
      network = (pNetwork.find((p) => p.network) || {}).network;
    }

    let filteredEntries = parsedJson ? parsedJson.filter((datum) => {
      if (datum.key === 'voidAuIds' && Array.isArray(datum.value)) {
        return true;
      }
      return datum.key && datum.value && datum.exp && datum.exp > misc.getUnixTimestamp() && (!network || network === datum.network);
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

  const setMetaInternal = function (apiRespMetadata, network) {
    if (!storage.localStorageIsEnabled()) {
      return;
    }

    const updateVoidAuIds = function (currentVoidAuIds, auIdsAsString) {
      const newAuIds = isStr(auIdsAsString) ? auIdsAsString.split(';') : [];
      const notNewExistingAuIds = currentVoidAuIds.filter(auIdObj => {
        return newAuIds.indexOf(auIdObj.value) < -1;
      }) || [];
      const oneDayFromNow = misc.getUnixTimestamp(1);
      const apiIdsArray = newAuIds.map(auId => {
        return { exp: oneDayFromNow, auId: auId };
      }) || [];
      return notNewExistingAuIds.concat(apiIdsArray) || [];
    }

    // use the metadata key separator to distinguish the same key for different networks.
    const metaAsObj = getMetaDataFromLocalStorage().reduce((a, entry) => ({ ...a, [entry.key + METADATA_KEY_SEPARATOR + (entry.network ? entry.network : '')]: { value: entry.value, exp: entry.exp, network: entry.network } }), {});
    for (const key in apiRespMetadata) {
      if (key !== 'voidAuIds') {
        metaAsObj[key + METADATA_KEY_SEPARATOR + network] = {
          value: apiRespMetadata[key],
          exp: misc.getUnixTimestamp(100),
          network: network
        }
      }
    }
    const currentAuIds = updateVoidAuIds(metaAsObj.voidAuIds || [], apiRespMetadata.voidAuIds);
    if (currentAuIds.length > 0) {
      metaAsObj.voidAuIds = { value: currentAuIds };
    }
    const metaDataForSaving = Object.entries(metaAsObj).map((entrySet) => {
      if (entrySet.length !== 2) {
        return {};
      }
      const key = entrySet[0].split(METADATA_KEY_SEPARATOR)[0];
      if (key === 'voidAuIds') {
        return {
          key: key,
          value: entrySet[1].value
        };
      }
      return {
        key: key,
        value: entrySet[1].value,
        exp: entrySet[1].exp,
        network: entrySet[1].network
      }
    }).filter(entry => entry.key);
    storage.setDataInLocalStorage(METADATA_KEY, JSON.stringify(metaDataForSaving));
  };

  const getUsi = function (meta, ortb2, bidParams) {
    // Fetch user id from parameters.
    for (let i = 0; i < bidParams.length; i++) {
      const bidParam = bidParams[i];
      if (bidParam.userId) {
        return bidParam.userId;
      }
    }
    if (ortb2 && ortb2.user && ortb2.user.id) {
      return ortb2.user.id
    }
    return (meta && meta.usi) ? meta.usi : false
  }

  return {
    refreshStorage: function (bidderRequest) {
      const ortb2 = bidderRequest.ortb2 || {};
      const bidParams = (bidderRequest.bids || []).map((b) => {
        return b.params ? b.params : {};
      });
      metaInternal = getMetaDataFromLocalStorage(bidParams).reduce((a, entry) => ({ ...a, [entry.key]: entry.value }), {});
      metaInternal.usi = getUsi(metaInternal, ortb2, bidParams);
      if (!metaInternal.usi) {
        delete metaInternal.usi;
      }
      if (metaInternal.voidAuIds) {
        metaInternal.voidAuIdsArray = metaInternal.voidAuIds.map((voidAuId) => {
          return voidAuId.auId;
        });
      }
    },
    saveToStorage: function (serverData, network) {
      setMetaInternal(serverData, network);
    },
    getUrlRelatedData: function () {
      // getting the URL information is theoretically not network-specific
      const { usi, voidAuIdsArray } = metaInternal;
      return { usi, voidAuIdsArray };
    },
    getPayloadRelatedData: function (network) {
      // getting the payload data should be network-specific
      const { segments, usi, userId, voidAuIdsArray, voidAuIds, ...payloadRelatedData } = getMetaDataFromLocalStorage(network).reduce((a, entry) => ({ ...a, [entry.key]: entry.value }), {});
      return payloadRelatedData;
    }
  };
})();

const targetingTool = (function() {
  const getSegmentsFromOrtb = function(bidderRequest) {
    const userData = deepAccess(bidderRequest.ortb2 || {}, 'user.data');
    let segments = [];
    if (userData) {
      userData.forEach(userdat => {
        if (userdat.segment) {
          segments.push(...userdat.segment.map((segment) => {
            if (isStr(segment)) return segment;
            if (isStr(segment.id)) return segment.id;
          }).filter((seg) => !!seg));
        }
      });
    }
    return segments
  };

  const getKvsFromOrtb = function(bidderRequest) {
    return deepAccess(bidderRequest.ortb2 || {}, 'site.ext.data');
  };

  return {
    addSegmentsToUrlData: function (validBids, bidderRequest, existingUrlRelatedData) {
      let segments = getSegmentsFromOrtb(bidderRequest || {});

      for (let i = 0; i < validBids.length; i++) {
        const bid = validBids[i];
        const targeting = bid.params.targeting || {};
        if (Array.isArray(targeting.segments)) {
          segments = segments.concat(targeting.segments);
          delete bid.params.targeting.segments;
        }
      }

      existingUrlRelatedData.segments = segments;
    },
    mergeKvsFromOrtb: function(bidTargeting, bidderRequest) {
      const kv = getKvsFromOrtb(bidderRequest || {});
      if (!kv) {
        return;
      }
      bidTargeting.kv = {...kv, ...bidTargeting.kv};
    }
  }
})();

const validateBidType = function (bidTypeOption) {
  return VALID_BID_TYPES.indexOf(bidTypeOption || '') > -1 ? bidTypeOption : 'bid';
}

const AU_ID_REGEX = new RegExp('^[0-9A-Fa-f]{1,20}$');

export const spec = {
  code: BIDDER_CODE,
  aliases: BIDDER_CODE_DEAL_ALIASES,
  gvlid: GVLID,
  supportedMediaTypes: [BANNER, VIDEO],
  isBidRequestValid: function (bid) {
    // The auId MUST be a hexadecimal string
    const validAuId = AU_ID_REGEX.test(bid.params.auId);
    return !!(validAuId && (bid.bidId || (bid.params.member && bid.params.invCode)));
  },

  buildRequests: function (validBidRequests, bidderRequest) {
    const queryParamsAndValues = [];
    queryParamsAndValues.push('tzo=' + new Date().getTimezoneOffset())
    queryParamsAndValues.push('format=prebid')
    const gdprApplies = deepAccess(bidderRequest, 'gdprConsent.gdprApplies');
    const consentString = deepAccess(bidderRequest, 'gdprConsent.consentString');
    if (gdprApplies !== undefined) {
      const flag = gdprApplies ? '1' : '0'
      queryParamsAndValues.push('consentString=' + consentString);
      queryParamsAndValues.push('gdpr=' + flag);
    }

    const searchParams = new URLSearchParams(window.location.search);
    if (searchParams.has('script-override')) {
      queryParamsAndValues.push('so=' + searchParams.get('script-override'));
    }

    storageTool.refreshStorage(bidderRequest);

    const urlRelatedMetaData = storageTool.getUrlRelatedData();
    targetingTool.addSegmentsToUrlData(validBidRequests, bidderRequest, urlRelatedMetaData);
    if (urlRelatedMetaData.segments.length > 0) queryParamsAndValues.push('segments=' + urlRelatedMetaData.segments.join(','));
    if (urlRelatedMetaData.usi) queryParamsAndValues.push('userId=' + urlRelatedMetaData.usi);

    const bidderConfig = config.getConfig();
    if (bidderConfig.useCookie === false) queryParamsAndValues.push('noCookies=true');
    if (bidderConfig.maxDeals > 0) queryParamsAndValues.push('ds=' + Math.min(bidderConfig.maxDeals, MAXIMUM_DEALS_LIMIT));

    const bidRequests = {};
    const networks = {};

    for (let i = 0; i < validBidRequests.length; i++) {
      const bid = validBidRequests[i];
      if ((urlRelatedMetaData.voidAuIdsArray && (urlRelatedMetaData.voidAuIdsArray.indexOf(bid.params.auId) > -1 || urlRelatedMetaData.voidAuIdsArray.indexOf(bid.params.auId.padStart(16, '0')) > -1))) {
        // This auId is void. Do NOT waste time and energy sending a request to the server
        continue;
      }

      let network = bid.params.network || 'network';
      if (bid.mediaTypes && bid.mediaTypes.video && bid.mediaTypes.video.context !== 'outstream') {
        network += '_video'
      }

      bidRequests[network] = bidRequests[network] || [];
      bidRequests[network].push(bid);

      networks[network] = networks[network] || {};
      networks[network].adUnits = networks[network].adUnits || [];
      if (bidderRequest && bidderRequest.refererInfo) networks[network].context = bidderRequest.refererInfo.page;

      const payloadRelatedData = storageTool.getPayloadRelatedData(bid.params.network);
      if (Object.keys(payloadRelatedData).length > 0) {
        networks[network].metaData = payloadRelatedData;
      }

      const bidTargeting = {...bid.params.targeting || {}};
      targetingTool.mergeKvsFromOrtb(bidTargeting, bidderRequest);
      const adUnit = { ...bidTargeting, auId: bid.params.auId, targetId: bid.params.targetId || bid.bidId };
      const maxDeals = Math.max(0, Math.min(bid.params.maxDeals || 0, MAXIMUM_DEALS_LIMIT));
      if (maxDeals > 0) {
        adUnit.maxDeals = maxDeals;
      }
      if (bid.mediaTypes && bid.mediaTypes.banner && bid.mediaTypes.banner.sizes) adUnit.dimensions = bid.mediaTypes.banner.sizes
      networks[network].adUnits.push(adUnit);
    }

    const requests = [];
    const networkKeys = Object.keys(networks);
    for (let j = 0; j < networkKeys.length; j++) {
      const network = networkKeys[j];
      if (network.indexOf('_video') > -1) { queryParamsAndValues.push('tt=' + DEFAULT_VAST_VERSION) }
      const requestURL = gdprApplies ? ENDPOINT_URL_EUROPE : ENDPOINT_URL
      requests.push({
        method: 'POST',
        url: requestURL + '?' + queryParamsAndValues.join('&'),
        data: JSON.stringify(networks[network]),
        bid: bidRequests[network]
      });
    }

    return requests;
  },

  interpretResponse: function (serverResponse, bidRequest) {
    if (serverResponse.body.metaData) {
      storageTool.saveToStorage(serverResponse.body.metaData, serverResponse.body.network);
    }
    const adUnits = serverResponse.body.adUnits;

    let validatedBidType = validateBidType(config.getConfig().bidType);
    if (bidRequest.bid) {
      bidRequest.bid.forEach(b => {
        if (b.params && b.params.bidType) {
          validatedBidType = validateBidType(b.params.bidType);
        }
      });
    }

    function buildAdResponse(bidderCode, ad, adUnit, dealCount) {
      const destinationUrls = ad.destinationUrls || {};
      const advertiserDomains = [];
      for (const value of Object.values(destinationUrls)) {
        advertiserDomains.push(value.split('/')[2])
      }
      const adResponse = {
        bidderCode: bidderCode,
        requestId: adUnit.targetId,
        cpm: ad[validatedBidType] ? ad[validatedBidType].amount * 1000 : 0,
        width: Number(ad.creativeWidth),
        height: Number(ad.creativeHeight),
        creativeId: ad.creativeId,
        currency: (ad.bid) ? ad.bid.currency : 'EUR',
        dealId: ad.dealId || '',
        dealCount: dealCount,
        meta: {
          advertiserDomains: advertiserDomains
        },
        netRevenue: false,
        ttl: 360,
      };
      // Deal bids provide the rendered ad content along with the
      // bid; whereas regular bids have it stored on the ad-unit.
      const isDeal = dealCount > 0;
      const renderSource = isDeal ? ad : adUnit;
      if (renderSource.vastXml) {
        adResponse.vastXml = renderSource.vastXml
        adResponse.mediaType = VIDEO
      } else {
        adResponse.ad = renderSource.html
      }
      return adResponse;
    }

    const bidsById = bidRequest.bid.reduce((response, bid) => {
      return {
        ...response,
        [bid.bidId]: bid
      };
    }, {});

    const hasBidAdUnits = adUnits.filter((au) => {
      const bid = bidsById[au.targetId];
      if (bid && bid.bidder && BIDDER_CODE_DEAL_ALIASES.indexOf(bid.bidder) < 0) {
        return au.matchedAdCount > 0;
      } else {
        // We do NOT accept bids when using this adaptor via one of the
        // "deals" aliases; those requests are for ONLY getting deals from Adnuntius
        return false;
      }
    });
    const hasDealsAdUnits = adUnits.filter((au) => {
      return au.deals && au.deals.length > 0;
    });

    const dealAdResponses = hasDealsAdUnits.reduce((response, au) => {
      const bid = bidsById[au.targetId];
      if (bid) {
        (au.deals || []).forEach((deal, i) => {
          response.push(buildAdResponse(bid.bidder, deal, au, i + 1));
        });
      }
      return response;
    }, []);

    const bidAdResponses = hasBidAdUnits.reduce((response, au) => {
      const bid = bidsById[au.targetId];
      if (bid) {
        response.push(buildAdResponse(bid.bidder, au.ads[0], au, 0));
      }
      return response;
    }, []);

    return [...dealAdResponses, ...bidAdResponses];
  }
}
registerBidder(spec);
