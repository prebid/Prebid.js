import { logMessage, logWarn, logError } from '../src/utils.js';
import { registerBidder } from '../src/adapters/bidderFactory.js';
import { BANNER } from '../src/mediaTypes.js';
import { ortbConverter } from '../libraries/ortbConverter/converter.js';
import {pbsExtensions} from '../libraries/pbsExtensions/pbsExtensions.js'
import { config } from '../src/config.js';

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
};

export const converter = ortbConverter({
  processors: pbsExtensions,
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
  }
});

export const spec = {
  code: BIDDER_CODE,
  supportedMediaTypes: [BANNER],
  isBidRequestValid: function (bid) {
    return keyIdRegex.test(bid.params.keyId);
  },
  buildRequests: function (bidRequests, bidderRequest) {
    const data = converter.toORTB({ bidderRequest, bidRequests })

    const serverUrl = buildServerUrl(bidRequests[0].params.keyId);

    return {
      method: 'POST',
      url: serverUrl,
      data: data,
    };
  },
  interpretResponse: (response, request) => {
    const bids = converter.fromORTB({response: response.body, request: request.data}).bids;

    return bids;
  },
  getUserSyncs: function (syncOptions, responses) {
    let allUserSyncs = [];

    if (syncOptions.iframeEnabled || syncOptions.pixelEnabled) {
      if (!hasSynced) {
        responses.forEach(csResp => {
          if (csResp.body && csResp.body.ext && csResp.body.ext.usersyncs) {
            try {
              let response = csResp.body.ext.usersyncs;
              let bidders = response.bidder_status;
              for (let synci in bidders) {
                let thisSync = bidders[synci];
                if (thisSync.no_cookie) {
                  let url = thisSync.usersync.url;
                  let type = thisSync.usersync.type;

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
              }
            } catch (e) {
              logError(e);
            }
          }
        });
      }
    } else {
      logWarn('Luponmedia: Please enable iframe/pixel based user sync.');
    }

    hasSynced = true;

    return allUserSyncs;
  },
};

var hasSynced = false;

// we need this for tests
export function resetUserSync() {
  hasSynced = false;
}

registerBidder(spec);
