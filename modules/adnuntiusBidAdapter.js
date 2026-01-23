import {registerBidder} from '../src/adapters/bidderFactory.js';
import {BANNER, NATIVE, VIDEO} from '../src/mediaTypes.js';
import {
  convertObjectToArray,
  deepAccess,
  deepClone,
  getUnixTimestampFromNow,
  getWinDimensions,
  isArray,
  isEmpty,
  isStr
} from '../src/utils.js';
import {config} from '../src/config.js';
import {getStorageManager} from '../src/storageManager.js';
import {toLegacyResponse, toOrtbNativeRequest} from '../src/native.js';
import {getGlobal} from '../src/prebidGlobal.js';

const BIDDER_CODE = 'adnuntius';
const BIDDER_CODE_DEAL_ALIAS_BASE = 'adndeal';
const BIDDER_CODE_DEAL_ALIASES = [1, 2, 3, 4, 5].map(num => {
  return BIDDER_CODE_DEAL_ALIAS_BASE + num;
});
const GVLID = 855;
const SUPPORTED_MEDIA_TYPES = [BANNER, VIDEO, NATIVE];
const MAXIMUM_DEALS_LIMIT = 5;
const VALID_BID_TYPES = ['netBid', 'grossBid'];
const METADATA_KEY = 'adn.metaData';
const METADATA_KEY_SEPARATOR = '@@@';

const ENVS = {
  localhost: {
    id: 'localhost',
    as: 'localhost:8078'
  },
  lcl: {
    id: 'lcl',
    as: 'adserver.dev.lcl.test'
  },
  andemu: {
    id: 'andemu',
    as: '10.0.2.2:8078'
  },
  dev: {
    id: 'dev',
    as: 'adserver.dev.adnuntius.com'
  },
  staging: {
    id: 'staging',
    as: 'adserver.staging.adnuntius.com'
  },
  production: {
    id: 'production',
    as: 'ads.adnuntius.delivery',
    asEu: 'europe.delivery.adnuntius.com'
  },
  cloudflare: {
    id: 'cloudflare',
    as: 'ads.adnuntius.delivery'
  },
  limited: {
    id: 'limited',
    as: 'limited.delivery.adnuntius.com'
  }
};

export const misc = {
  findHighestPrice: function(arr, bidType) {
    return arr.reduce((highest, cur) => {
      const currentBid = cur[bidType];
      const highestBid = highest[bidType]
      return currentBid.currency === highestBid.currency && currentBid.amount > highestBid.amount ? cur : highest;
    }, arr[0]);
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
      return datum.key && datum.value && datum.exp && datum.exp > getUnixTimestampFromNow() && (!network || network === datum.network);
    }) : [];
    const voidAuIdsEntry = filteredEntries.find(entry => entry.key === 'voidAuIds');
    if (voidAuIdsEntry) {
      const now = getUnixTimestampFromNow();
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
      const oneDayFromNow = getUnixTimestampFromNow(1);
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
          exp: getUnixTimestampFromNow(100),
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

  const getFirstValidValueFromArray = function(arr, param) {
    const example = (arr || []).find((b) => {
      return deepAccess(b, param);
    });
    return example ? deepAccess(example, param) : undefined;
  };

  return {
    refreshStorage: function (validBidRequests, bidderRequest) {
      const bidParams = (bidderRequest.bids || []).map((b) => {
        return b.params ? b.params : {};
      });
      metaInternal = getMetaDataFromLocalStorage(bidParams).reduce((a, entry) => ({ ...a, [entry.key]: entry.value }), {});
      const bidParamUserId = getFirstValidValueFromArray(bidParams, 'userId');
      const ortb2 = bidderRequest.ortb2 || {};

      if (isStr(bidParamUserId)) {
        metaInternal.usi = bidParamUserId;
      } else if (isStr(ortb2?.user?.id)) {
        metaInternal.usi = ortb2.user.id;
      }

      const unvettedOrtb2Eids = getFirstValidValueFromArray(bidParams, 'userIdAsEids') || deepAccess(ortb2, 'user.ext.eids');
      const vettedOrtb2Eids = isArray(unvettedOrtb2Eids) && unvettedOrtb2Eids.length > 0 ? unvettedOrtb2Eids : false;
      if (vettedOrtb2Eids) {
        metaInternal.eids = vettedOrtb2Eids;
      }

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
      const { usi, voidAuIdsArray, eids } = metaInternal;
      return { usi, voidAuIdsArray, eids };
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
    const segments = [];
    if (userData && Array.isArray(userData)) {
      userData.forEach(userdat => {
        if (userdat.segment) {
          segments.push(...userdat.segment.map((segment) => {
            if (isStr(segment)) return segment;
            if (isStr(segment.id)) return segment.id;
            return undefined;
          }).filter((seg) => !!seg));
        }
      });
    }
    return segments
  };

  const getKvsFromOrtb = function(bidderRequest, path) {
    return deepAccess(bidderRequest.ortb2 || {}, path);
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
      const siteKvs = getKvsFromOrtb(bidderRequest || {}, 'site.ext.data');
      const userKvs = getKvsFromOrtb(bidderRequest || {}, 'user.ext.data');
      if (isEmpty(siteKvs) && isEmpty(userKvs)) {
        return;
      }
      if (bidTargeting.kv && !Array.isArray(bidTargeting.kv)) {
        bidTargeting.kv = convertObjectToArray(bidTargeting.kv);
      }
      bidTargeting.kv = bidTargeting.kv || [];
      if (!isEmpty(siteKvs)) {
        bidTargeting.kv = bidTargeting.kv.concat(convertObjectToArray(siteKvs));
      }
      if (!isEmpty(userKvs)) {
        bidTargeting.kv = bidTargeting.kv.concat(convertObjectToArray(userKvs));
      }
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
  supportedMediaTypes: SUPPORTED_MEDIA_TYPES,
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
    queryParamsAndValues.push('pbv=' + getGlobal().version);
    if (gdprApplies !== undefined) {
      const flag = gdprApplies ? '1' : '0'
      queryParamsAndValues.push('consentString=' + consentString);
      queryParamsAndValues.push('gdpr=' + flag);
    }

    const { innerWidth, innerHeight } = getWinDimensions();

    if (innerWidth) {
      queryParamsAndValues.push('viewport=' + innerWidth + 'x' + innerHeight);
    }

    const searchParams = new URLSearchParams(window.location.search);
    if (searchParams.has('script-override')) {
      queryParamsAndValues.push('so=' + searchParams.get('script-override'));
    }

    storageTool.refreshStorage(validBidRequests, bidderRequest);

    const urlRelatedMetaData = storageTool.getUrlRelatedData();
    targetingTool.addSegmentsToUrlData(validBidRequests, bidderRequest, urlRelatedMetaData);
    if (urlRelatedMetaData.segments.length > 0) queryParamsAndValues.push('segments=' + urlRelatedMetaData.segments.join(','));
    if (urlRelatedMetaData.usi) queryParamsAndValues.push('userId=' + urlRelatedMetaData.usi);
    if (isArray(urlRelatedMetaData.eids) && urlRelatedMetaData.eids.length > 0) queryParamsAndValues.push('eids=' + encodeURIComponent(JSON.stringify(urlRelatedMetaData.eids)));

    const bidderConfig = config.getConfig();
    if (bidderConfig.useCookie === false) queryParamsAndValues.push('noCookies=true');
    if (bidderConfig.advertiserTransparency === true) queryParamsAndValues.push('advertiserTransparency=true');
    if (bidderConfig.maxDeals > 0) queryParamsAndValues.push('ds=' + Math.min(bidderConfig.maxDeals, MAXIMUM_DEALS_LIMIT));

    const bidRequests = {};
    const networks = {};

    for (let i = 0; i < validBidRequests.length; i++) {
      const bid = validBidRequests[i];
      if ((urlRelatedMetaData.voidAuIdsArray && (urlRelatedMetaData.voidAuIdsArray.indexOf(bid.params.auId) > -1 || urlRelatedMetaData.voidAuIdsArray.indexOf(bid.params.auId.padStart(16, '0')) > -1))) {
        // This auId is void. Do NOT waste time and energy sending a request to the server
        continue;
      }

      const network = bid.params.network || 'network';
      bidRequests[network] = bidRequests[network] || [];
      bidRequests[network].push(bid);

      networks[network] = networks[network] || {};
      networks[network].adUnits = networks[network].adUnits || [];

      const refererInfo = bidderRequest && bidderRequest.refererInfo ? bidderRequest.refererInfo : {};
      if (refererInfo.page) {
        networks[network].context = bidderRequest.refererInfo.page;
      }
      if (refererInfo.canonicalUrl) {
        networks[network].canonical = bidderRequest.refererInfo.canonicalUrl;
      }

      const payloadRelatedData = storageTool.getPayloadRelatedData(bid.params.network);
      if (Object.keys(payloadRelatedData).length > 0) {
        networks[network].metaData = payloadRelatedData;
      }

      const bidTargeting = {...bid.params.targeting || {}};
      targetingTool.mergeKvsFromOrtb(bidTargeting, bidderRequest);
      const mediaTypes = bid.mediaTypes || {};
      const validMediaTypes = SUPPORTED_MEDIA_TYPES.filter(mt => {
        return mediaTypes[mt];
      }) || [];
      if (validMediaTypes.length === 0) {
        // banner ads by default if nothing specified, dimensions to be derived from the ad unit within adnuntius system
        validMediaTypes.push(BANNER);
      }
      const isSingleFormat = validMediaTypes.length === 1;
      validMediaTypes.forEach(mediaType => {
        const mediaTypeData = mediaTypes[mediaType];
        if (mediaType === VIDEO && mediaTypeData && mediaTypeData.context === 'outstream') {
          return;
        }
        const targetId = (bid.params.targetId || bid.bidId) + (isSingleFormat || mediaType === BANNER ? '' : ('-' + mediaType));
        const adUnit = {...bidTargeting, auId: bid.params.auId, targetId: targetId};
        if (mediaType === VIDEO) {
          adUnit.adType = 'VAST';
        } else if (mediaType === NATIVE) {
          adUnit.adType = 'NATIVE';
          if (!mediaTypeData.ortb) {
            // assume it's using old format if ortb not specified
            const legacyStyleNativeRequest = deepClone(mediaTypeData);
            const nativeOrtb = toOrtbNativeRequest(legacyStyleNativeRequest);
            // add explicit event tracker requests for impressions and viewable impressions, which do not exist in legacy format
            nativeOrtb.eventtrackers = [
              {
                'event': 1,
                'methods': [1]
              },
              {
                'event': 2,
                'methods': [1]
              }
            ];
            adUnit.nativeRequest = {ortb: nativeOrtb}
          } else {
            adUnit.nativeRequest = {ortb: mediaTypeData.ortb};
          }
        }
        const dealId = deepAccess(bid, 'params.dealId') || deepAccess(bid, 'params.inventory.pmp.deals');
        if (dealId) {
          // dealId at adserver accepts single string dealID and array
          adUnit.dealId = dealId;
        }
        const maxDeals = Math.max(0, Math.min(bid.params.maxDeals || 0, MAXIMUM_DEALS_LIMIT));
        if (maxDeals > 0) {
          adUnit.maxDeals = maxDeals;
        }
        if (mediaType !== VIDEO && mediaTypeData && mediaTypeData.sizes) {
          adUnit.dimensions = mediaTypeData.sizes;
        }
        networks[network].adUnits.push(adUnit);
      });
    }

    const requests = [];
    const networkKeys = Object.keys(networks);
    for (let j = 0; j < networkKeys.length; j++) {
      const network = networkKeys[j];
      let requestURL = gdprApplies ? ENVS.production.asEu : ENVS.production.as;
      if (bidderConfig.env && ENVS[bidderConfig.env]) {
        requestURL = ENVS[bidderConfig.env][bidderConfig.endPointType || 'as'];
      }
      requestURL = (bidderConfig.protocol || 'https') + '://' + requestURL + '/i';
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
    const responseAdUnits = serverResponse.body.adUnits;

    let validatedBidType = validateBidType(config.getConfig().bidType);
    if (bidRequest.bid) {
      bidRequest.bid.forEach(b => {
        if (b.params && b.params.bidType) {
          validatedBidType = validateBidType(b.params.bidType);
        }
      });
    }

    function buildAdResponse(bidderCode, ad, adUnit, dealCount, bidOnRequest) {
      const advertiserDomains = ad.advertiserDomains || [];
      if (advertiserDomains.length === 0) {
        const destinationUrls = ad.destinationUrls || {};
        for (const value of Object.values(destinationUrls)) {
          advertiserDomains.push(value.split('/')[2])
        }
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
        adResponse.vastXml = renderSource.vastXml;
        adResponse.mediaType = VIDEO;
      } else if (renderSource.nativeJson) {
        adResponse.mediaType = NATIVE;
        if (bidOnRequest.mediaTypes?.native && !bidOnRequest.mediaTypes?.native?.ortb) {
          adResponse.native = toLegacyResponse(renderSource.nativeJson.ortb, toOrtbNativeRequest(bidOnRequest.mediaTypes.native));
        } else {
          adResponse.native = renderSource.nativeJson;
        }
      } else {
        adResponse.ad = renderSource.html;
      }
      return adResponse;
    }

    const highestYieldingAdUnits = [];
    if (responseAdUnits.length === 1) {
      highestYieldingAdUnits.push(responseAdUnits[0]);
    } else if (responseAdUnits.length > 1) {
      bidRequest.bid.forEach((resp) => {
        const multiFormatAdUnits = [];
        SUPPORTED_MEDIA_TYPES.forEach((mediaType) => {
          const suffix = mediaType === BANNER ? '' : '-' + mediaType;
          const targetId = (resp?.params?.targetId || resp.bidId) + suffix;

          const au = responseAdUnits.find((rAu) => {
            return rAu.targetId === targetId && rAu.matchedAdCount > 0;
          });
          if (au) {
            multiFormatAdUnits.push(au);
          }
        });
        if (multiFormatAdUnits.length > 0) {
          const highestYield = multiFormatAdUnits.length === 1 ? multiFormatAdUnits[0] : multiFormatAdUnits.reduce((highest, cur) => {
            const highestBid = misc.findHighestPrice(highest.ads, validatedBidType)[validatedBidType];
            const curBid = misc.findHighestPrice(cur.ads, validatedBidType)[validatedBidType];
            return curBid.currency === highestBid.currency && curBid.amount > highestBid.amount ? cur : highest;
          }, multiFormatAdUnits[0]);
          highestYield.targetId = resp.bidId;
          highestYieldingAdUnits.push(highestYield);
        }
      });
    }

    const bidRequestsById = bidRequest.bid.reduce((response, bid) => {
      return {
        ...response,
        [bid.bidId]: bid
      };
    }, {});

    const hasBidAdUnits = highestYieldingAdUnits.filter((au) => {
      const bid = bidRequestsById[au.targetId];
      if (bid && bid.bidder && BIDDER_CODE_DEAL_ALIASES.indexOf(bid.bidder) < 0) {
        return au.matchedAdCount > 0;
      } else {
        // We do NOT accept bids when using this adaptor via one of the
        // "deals" aliases; those requests are for ONLY getting deals from Adnuntius
        return false;
      }
    });
    const hasDealsAdUnits = highestYieldingAdUnits.filter((au) => {
      return au.deals && au.deals.length > 0;
    });

    const dealAdResponses = hasDealsAdUnits.reduce((response, au) => {
      const selBidRequest = bidRequestsById[au.targetId];
      if (selBidRequest) {
        (au.deals || []).forEach((deal, i) => {
          response.push(buildAdResponse(selBidRequest.bidder, deal, au, i + 1, selBidRequest));
        });
      }
      return response;
    }, []);

    const bidAdResponses = hasBidAdUnits.reduce((response, au) => {
      const selBidRequest = bidRequestsById[au.targetId];
      if (selBidRequest) {
        response.push(buildAdResponse(selBidRequest.bidder, au.ads[0], au, 0, selBidRequest));
      }
      return response;
    }, []);

    return [...dealAdResponses, ...bidAdResponses];
  }
}
registerBidder(spec);
