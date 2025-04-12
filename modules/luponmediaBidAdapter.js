import { logMessage, logWarn, logError } from '../src/utils.js';
import { registerBidder } from '../src/adapters/bidderFactory.js';
import { BANNER } from '../src/mediaTypes.js';
import { ortbConverter } from '../libraries/ortbConverter/converter.js';
import { config } from '../src/config.js';
import { getStorageManager } from '../src/storageManager.js';

const BIDDER_CODE = 'luponmedia';
const storage = getStorageManager({ bidderCode: BIDDER_CODE });

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

function getLocalFallbackBids() {
  try {
    const dabstoreRaw = storage.getDataFromLocalStorage('dabStore');

    if (!dabstoreRaw) return [];

    const dabstore = JSON.parse(dabstoreRaw);
    const now = Date.now();

    return dabstore.bids.filter(bid => {
      const bidExpiry = bid.timestamp + bid.ttl * 1000;

      return bidExpiry > now;
    });
  } catch (e) {
    logWarn('Error parsing dabStore:', e);
    return [];
  }
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
    let ortbResponse;

    if (response.status === 200) {
      ortbResponse = response.body;
    }

    if (response.status == 204) {
      return [];
    }

    if (response.status === 206) {
      const localBids = getLocalFallbackBids();

      ortbResponse = {
        id: request.data.id,
        seatbid: [{
          seat: BIDDER_CODE,
          bid: localBids.map(bid => ({
            id: bid.requestId,
            impid: bid.requestId,
            price: bid.cpm,
            adm: bid.ad,
            crid: bid.creativeId,
            w: bid.width,
            h: bid.height,
            exp: bid.ttl,
            ext: {
              prebid: {
                type: bid.mediaType
              }
            }
          }))
        }],
        cur: localBids[0]?.currency
      }
    }

    const bids = converter.fromORTB({ response: ortbResponse, request: request.data }).bids;

    return bids;
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
