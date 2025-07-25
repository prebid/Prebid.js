/**
 * This module adds the LiveIntent provider to the Real Time Data module (rtdModule).
 */
import { submodule } from '../src/hook.js';
import {deepAccess, deepSetValue} from '../src/utils.js'

/**
 * @typedef {import('../modules/rtdModule/index.js').RtdSubmodule} RtdSubmodule
 * @typedef {import('../modules/rtdModule/index.js').SubmoduleConfig} SubmoduleConfig
 * @typedef {import('../modules/rtdModule/index.js').UserConsentData} UserConsentData
 */

const SUBMODULE_NAME = 'liveintent';
const GVLID = 148;

/**
 * Init
 * @param {Object} config Module configuration
 * @param {UserConsentData} userConsent User consent
 * @returns true
 */
const init = (config, userConsent) => {
  return true;
}

/**
 * onBidRequest is called for each bidder during an auction and contains the bids for that bidder.
 *
 * @param {Object} bidRequest
 * @param {SubmoduleConfig} config
 * @param {UserConsentData} userConsent
 */

function onBidRequest(bidRequest, config, userConsent) {
  bidRequest.bids.forEach(bid => {
    const providedSegmentsFromUserId = deepAccess(bid, 'userId.lipb.segments', [])
    if (providedSegmentsFromUserId.length > 0) {
      const providedSegments = { name: 'liveintent.com', segment: providedSegmentsFromUserId.map(id => ({ id })) }
      const existingData = deepAccess(bid, 'ortb2.user.data', [])
      deepSetValue(bid, 'ortb2.user.data', existingData.concat(providedSegments))
    }
  })
}

export const liveIntentRtdSubmodule = {
  name: SUBMODULE_NAME,
  gvlid: GVLID,
  init: init,
  onBidRequestEvent: onBidRequest
};

submodule('realTimeData', liveIntentRtdSubmodule);
