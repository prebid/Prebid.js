/**
 * This module adds the LiveIntent provider to the Real Time Data module (rtdModule).
 */
import { submodule } from '../src/hook.js';
import { deepAccess, mergeDeep } from '../src/utils.js';

const SUBMODULE_NAME = 'liveintent';
const GVLID = 148;
const LI_DOMAIN = 'liveintent.com';

const init = () => true;

function getSegmentsFromFragment(ortb2) {
  const eids = deepAccess(ortb2, 'user.ext.eids', []);
  const liveIntentEid = eids.find(eid => eid?.source === LI_DOMAIN);
  const segments = liveIntentEid?.ext?.segments;
  return Array.isArray(segments) ? segments : [];
}

function addSegmentsToFragment(ortb2) {
  const segments = getSegmentsFromFragment(ortb2);
  if (segments.length === 0) {
    return;
  }
  mergeDeep(ortb2, {
    user: {
      data: [{
        name: LI_DOMAIN,
        segment: segments.map(id => ({ id }))
      }]
    }
  });
}

function getBidRequestData(reqBidsConfigObj, callback) {
  const { global, bidder } = reqBidsConfigObj.ortb2Fragments || {};
  if (global) {
    addSegmentsToFragment(global);
  }
  Object.values(bidder || {}).forEach(addSegmentsToFragment);
  callback();
}

export const liveIntentRtdSubmodule = {
  name: SUBMODULE_NAME,
  gvlid: GVLID,
  init,
  getBidRequestData
};

submodule('realTimeData', liveIntentRtdSubmodule);
