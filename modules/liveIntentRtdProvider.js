/**
 * This module adds the LiveIntent provider to the Real Time Data module (rtdModule).
 */
import { submodule } from '../src/hook.js';
import { deepAccess, mergeDeep } from '../src/utils.js';
import { getGlobal } from '../src/prebidGlobal.js';

const SUBMODULE_NAME = 'liveintent';
const GVLID = 148;
const LI_DOMAIN = 'liveintent.com';

const init = () => true;

function getLiveIntentSegments() {
  const userIds = typeof getGlobal().getUserIds === 'function'
    ? getGlobal().getUserIds()
    : {};
  return deepAccess(userIds, 'lipb.segments', []);
}

function getBidRequestData(reqBidsConfigObj, callback) {
  const segments = getLiveIntentSegments();
  if (segments.length > 0) {
    mergeDeep(reqBidsConfigObj.ortb2Fragments.global, {
      user: {
        data: [{
          name: LI_DOMAIN,
          segment: segments.map(id => ({ id }))
        }]
      }
    });
  }
  callback();
}

export const liveIntentRtdSubmodule = {
  name: SUBMODULE_NAME,
  gvlid: GVLID,
  init,
  getBidRequestData
};

submodule('realTimeData', liveIntentRtdSubmodule);
