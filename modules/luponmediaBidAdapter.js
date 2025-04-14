import { logMessage, logWarn, logError } from '../src/utils.js';
import { registerBidder } from '../src/adapters/bidderFactory.js';
import { BANNER } from '../src/mediaTypes.js';
import { ortbConverter } from '../libraries/ortbConverter/converter.js';
import { config } from '../src/config.js';
import { getStorageManager } from '../src/storageManager.js';

const BIDDER_CODE = 'luponmedia';
export const storage = getStorageManager({ bidderCode: BIDDER_CODE });

const keyIdRegex = /^uid(?:@[\w-]+)?_.*$/;

const buildServerUrl = (keyId) => {
  const match = String(keyId).match(/@([^_]+)_/);

  let host = 'rtb';

  if (match) {
    host = match[1];
  }

  return `https://${host}.adxpremium.services/openrtb2/auction`
}

function hasRtd() {
  const rtdConfigs = config.getConfig('realTimeData.dataProviders') || [];

  return Boolean(rtdConfigs.find(provider => provider.name === 'dynamicAdBoost'));
};

export const converter = ortbConverter({
  context: {
    netRevenue: false,
    ttl: 300,
    mediaType: BANNER,
  },
  imp(buildImp, bidRequest, context) {
    const imp = buildImp(bidRequest, context);

    imp.ext = imp.ext || {};

    const hasRtdEnabled = hasRtd();

    if (!hasRtdEnabled) {
      logWarn('LuponMedia: Enable the DynamicAdBoost RTD Module to optimize revenue and performance.')
    }

    imp.ext.luponmedia = imp.ext.luponmedia || {};
    imp.ext.luponmedia.placement_id = bidRequest.adUnitCode;
    imp.ext.luponmedia.keyId = bidRequest.params.keyId;
    imp.ext.luponmedia.siteId = bidRequest.params.siteId;
    imp.ext.luponmedia.rtd = hasRtdEnabled;

    return imp;
  },
  bidResponse(buildBidResponse, bid, context) {
    const bidResponse = buildBidResponse(bid, context);

    if (!bidResponse.creativeId) {
      bidResponse.creativeId = bid.crid || bid.id;
    }

    if (!bidResponse.dealId && bid.dealid) {
      bidResponse.dealId = bid.dealid;
    }

    if (context.bidRequest?.ortb2?.site?.ref) {
      bidResponse.referrer = context.bidRequest.ortb2.site.ref;
    }

    return bidResponse;
  },
});

function getCachedBids() {
  try {
    const dabstoreRaw = storage.getDataFromLocalStorage('dabStore');

    if (!dabstoreRaw) return [];

    const dabstore = JSON.parse(dabstoreRaw);
    const now = Date.now();

    const validBids = dabstore.bids.filter(bid => {
      const bidExpiry = bid.responseTimestamp + bid.ttl * 1000;

      return bidExpiry > now;
    })

    storage.setDataInLocalStorage('dabStore', JSON.stringify({ bids: validBids }));

    return validBids;
  } catch (e) {
    logWarn('Error parsing dabStore:', e);
    return [];
  }
}

function removeUsedCachedBids(usedRequestIds = []) {
  try {
    const dabstoreRaw = storage.getDataFromLocalStorage('dabStore');
    if (!dabstoreRaw) return;

    const dabstore = JSON.parse(dabstoreRaw);
    const updatedBids = (dabstore.bids || []).filter(bid => !usedRequestIds.includes(bid.requestId));

    storage.setDataInLocalStorage('dabStore', JSON.stringify({ bids: updatedBids }));
  } catch (e) {
    logWarn('Error updating dabStore after removing used bids:', e);
  }
}


function buildValidSizeMap(imps) {
  const validSizesMap = imps.reduce((map, imp) => {
    const sizes = imp.banner?.format?.map(fmt => `${fmt.w}x${fmt.h}`) || [];
    map[imp.id] = sizes;
    return map;
  }, {});

  return validSizesMap;
}

function alignBids(imps, validSizesMap, cachedBids) {
  const alignedBids = [];

  for (const imp of imps) {
    const validSizes = validSizesMap[imp.id];

    for (const cachedBid of cachedBids) {
      const bidSize = `${cachedBid.width}x${cachedBid.height}`;

      if (validSizes.includes(bidSize)) {
        alignedBids.push({
          id: imp.id,
          impid: imp.id,
          price: cachedBid.cpm,
          adm: cachedBid.ad,
          addomain: cachedBid.meta?.advertiserDomains || [],
          crid: cachedBid.creativeId || cachedBid.requestId,
          w: cachedBid.width,
          h: cachedBid.height,
          ext: {
            prebid: {
              targeting: {
                hb_bidder: BIDDER_CODE,
                hb_pb: cachedBid.cpm,
                hb_size: cachedBid.size
              },
              type: cachedBid.mediaType
            }
          }
        });

        break;
      }
    }
  }

  return alignedBids;
}

export const spec = {
  code: BIDDER_CODE,
  supportedMediaTypes: [BANNER],
  isBidRequestValid: function (bid) {
    return keyIdRegex.test(bid?.params?.keyId);
  },
  buildRequests: function (bidRequests, bidderRequest) {
    const data = converter.toORTB({ bidderRequest, bidRequests });

    const serverUrl = buildServerUrl(bidRequests[0].params.keyId);

    return {
      method: 'POST',
      url: serverUrl,
      data,
    };
  },
  interpretResponse: (response, request) => {
    if (response.status === 200) {
      const bids = converter.fromORTB({ response: response.body, request: request.data }).bids;
      return bids;
    }

    if (response.status == 204) {
      return [];
    }

    if (response.status === 206) {
      const cachedBids = getCachedBids();
      const imps = request.data.imp || [];

      const validSizesMap = buildValidSizeMap(imps);
      const alignedBids = alignBids(imps, validSizesMap, cachedBids);

      if (alignedBids.length === 0) {
        return [];
      }

      const usedRequestIds = alignedBids.map(b => b.impid);

      removeUsedCachedBids(usedRequestIds);

      const ortbResponse = {
        id: request.data.id,
        seatbid: [{
          seat: BIDDER_CODE,
          bid: alignedBids
        }],
        cur: cachedBids[0]?.currency
      };

      const bids = converter.fromORTB({ response: ortbResponse, request: request.data }).bids;

      return bids;
    }

    return [];
  },
  getUserSyncs: function (syncOptions, responses) {
    let allUserSyncs = [];
    if (hasSynced) {
      return allUserSyncs;
    }

    if (!syncOptions.iframeEnabled && !syncOptions.pixelEnabled) {
      logWarn('Luponmedia: Please enable iframe/pixel based user sync.');
      hasSynced = true;
      return allUserSyncs;
    }

    responses.forEach(csResp => {
      if (!csResp?.body?.ext?.usersyncs) {
        return;
      }

      try {
        const response = csResp.body.ext.usersyncs;
        const bidders = response.bidder_status;
        for (let synci in bidders) {
          const thisSync = bidders[synci];
          if (!thisSync.no_cookie) {
            continue;
          }

          const url = thisSync.usersync.url;
          const type = thisSync.usersync.type;

          if (!url) {
            logError(`No sync url for bidder luponmedia.`);
          } else if ((type === 'image' || type === 'redirect') && syncOptions.pixelEnabled) {
            logMessage(`Invoking image pixel user sync for luponmedia`);
            allUserSyncs.push({ type: 'image', url: url });
          } else if (type == 'iframe' && syncOptions.iframeEnabled) {
            logMessage(`Invoking iframe user sync for luponmedia`);
            allUserSyncs.push({ type: 'iframe', url: url });
          } else {
            logError(`User sync type "${type}" not supported for luponmedia`);
          }
        }
      } catch (e) {
        logError(e);
      }
    });

    hasSynced = true;

    return allUserSyncs;
  },
};

let hasSynced = false;

// we need this for tests
export function resetUserSync() {
  hasSynced = false;
}

registerBidder(spec);
