import {logError, logMessage, logWarn, deepSetValue} from '../src/utils.js';
import {registerBidder} from '../src/adapters/bidderFactory.js';
import {BANNER} from '../src/mediaTypes.js';
import {ortbConverter} from '../libraries/ortbConverter/converter.js';
import {config} from '../src/config.js';

const BIDDER_CODE = 'luponmedia';
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
}

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
export const spec = {
  code: BIDDER_CODE,
  supportedMediaTypes: [BANNER],
  isBidRequestValid: function (bid) {
    return keyIdRegex.test(bid?.params?.keyId);
  },
  buildRequests: function (bidRequests, bidderRequest) {
    const data = converter.toORTB({ bidderRequest, bidRequests });

    if (bidderRequest.gdprConsent) {
      let gdprApplies;

      if (typeof bidderRequest.gdprConsent.gdprApplies === 'boolean') {
        gdprApplies = bidderRequest.gdprConsent.gdprApplies ? 1 : 0;
      }

      deepSetValue(data, 'regs.ext.gdpr', gdprApplies);
      deepSetValue(data, 'user.ext.consent', bidderRequest.gdprConsent.consentString);
    }

    if (bidderRequest.uspConsent) {
      deepSetValue(data, 'regs.ext.us_privacy', bidderRequest.uspConsent);
    }

    const serverUrl = buildServerUrl(bidRequests[0].params.keyId);

    return {
      method: 'POST',
      url: serverUrl,
      data,
    };
  },
  interpretResponse: (response, request) => {
    return converter.fromORTB({response: response.body, request: request.data}).bids;
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
          } else if (type === 'iframe' && syncOptions.iframeEnabled) {
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
