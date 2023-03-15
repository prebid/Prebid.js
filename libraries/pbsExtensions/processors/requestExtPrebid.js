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
          // earlier ext.prebid.targeting used to replace with s2sconfig prebid object but since 6.x extPrebid is mergeing with
          // s2sConfig extPrebid which restrict bidder specific targeting keys in response. And as OW needs these keys in dfp calls
          // we need to overwrite includebidderkeys to true as mentioned in UOE-7693
          includebidderkeys: true
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
