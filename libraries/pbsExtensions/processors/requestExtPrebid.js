import {deepSetValue, mergeDeep} from '../../../src/utils.js';
import {config} from '../../../src/config.js';
import {getGlobal} from '../../../src/prebidGlobal.js';

export function setRequestExtPrebid(ortbRequest, bidderRequest) {
  deepSetValue(
    ortbRequest,
    'ext.prebid',
    mergeDeep(
      {
        auctiontimestamp: bidderRequest.auctionStart,
        targeting: {
          includewinners: true,
          includebidderkeys: false
        }
      },
      ortbRequest.ext?.prebid,
    )
  );
  if (config.getConfig('debug')) {
    ortbRequest.ext.prebid.debug = true;
  }
}

export function setRequestExtPrebidChannel(ortbRequest) {
  deepSetValue(ortbRequest, 'ext.prebid.channel', Object.assign({
    name: 'pbjs',
    version: getGlobal().version
  }, ortbRequest.ext?.prebid?.channel));
}
