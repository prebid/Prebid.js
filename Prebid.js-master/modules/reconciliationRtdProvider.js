/**
 * This module adds reconciliation provider to the real time data module
 * The {@link module:modules/realTimeData} module is required
 * The module will add custom targetings to ad units
 * The module will listen to post messages from rendered creatives with Reconciliation Tag
 * The module will call tracking pixels to log info needed for reconciliation matching
 * @module modules/reconciliationRtdProvider
 * @requires module:modules/realTimeData
 */

/**
 * @typedef {Object} ModuleParams
 * @property {string} publisherMemberId
 * @property {?string} initUrl
 * @property {?string} impressionUrl
 * @property {?boolean} allowAccess
 */

import {submodule} from '../src/hook.js';
import {ajaxBuilder} from '../src/ajax.js';
import {generateUUID, isGptPubadsDefined, logError, timestamp} from '../src/utils.js';
import {find} from '../src/polyfill.js';

/** @type {Object} */
const MessageType = {
  IMPRESSION_REQUEST: 'rsdk:impression:req',
  IMPRESSION_RESPONSE: 'rsdk:impression:res',
};
/** @type {ModuleParams} */
const DEFAULT_PARAMS = {
  initUrl: 'https://confirm.fiduciadlt.com/init',
  impressionUrl: 'https://confirm.fiduciadlt.com/pimp',
  allowAccess: false,
};
/** @type {ModuleParams} */
let _moduleParams = {};

/**
 * Handle postMesssage from ad creative, track impression
 * and send response to reconciliation ad tag
 * @param {Event} e
 */
function handleAdMessage(e) {
  let data = {};
  let adUnitId = '';
  let adDeliveryId = '';

  try {
    data = JSON.parse(e.data);
  } catch (e) {
    return;
  }

  if (data.type === MessageType.IMPRESSION_REQUEST) {
    if (isGptPubadsDefined()) {
      // 1. Find the last iframed window before window.top where the tracker was injected
      // (the tracker could be injected in nested iframes)
      const adWin = getTopIFrameWin(e.source);
      if (adWin && adWin !== window.top) {
        // 2. Find the GPT slot for the iframed window
        const adSlot = getSlotByWin(adWin);
        // 3. Get AdUnit IDs for the selected slot
        if (adSlot) {
          adUnitId = adSlot.getAdUnitPath();
          adDeliveryId = adSlot.getTargeting('RSDK_ADID');
          adDeliveryId = adDeliveryId.length
            ? adDeliveryId[0]
            : `${timestamp()}-${generateUUID()}`;
        }
      }
    }

    // Call local impression callback
    const args = Object.assign({}, data.args, {
      publisherDomain: window.location.hostname,
      publisherMemberId: _moduleParams.publisherMemberId,
      adUnitId,
      adDeliveryId,
    });

    track.trackPost(_moduleParams.impressionUrl, args);

    // Send response back to the Advertiser tag
    let response = {
      type: MessageType.IMPRESSION_RESPONSE,
      id: data.id,
      args: Object.assign(
        {
          publisherDomain: window.location.hostname,
        },
        data.args
      ),
    };

    // If access is allowed - add ad unit id to response
    if (_moduleParams.allowAccess) {
      Object.assign(response.args, {
        adUnitId,
        adDeliveryId,
      });
    }

    e.source.postMessage(JSON.stringify(response), '*');
  }
}

/**
 * Get top iframe window for nested Window object
 * - top
 * -- iframe.window  <-- top iframe window
 * --- iframe.window
 * ---- iframe.window <-- win
 *
 * @param {Window} win nested iframe window object
 * @param {Window} topWin top window
 */
export function getTopIFrameWin(win, topWin) {
  topWin = topWin || window;

  if (!win) {
    return null;
  }

  try {
    while (win.parent !== topWin) {
      win = win.parent;
    }
    return win;
  } catch (e) {
    return null;
  }
}

/**
 * get all slots on page
 * @return {Object[]} slot GoogleTag slots
 */
function getAllSlots() {
  return isGptPubadsDefined() && window.googletag.pubads().getSlots();
}

/**
 * get GPT slot by placement id
 * @param {string} code placement id
 * @return {?Object}
 */
function getSlotByCode(code) {
  const slots = getAllSlots();
  if (!slots || !slots.length) {
    return null;
  }
  return (
    find(
      slots,
      (s) => s.getSlotElementId() === code || s.getAdUnitPath() === code
    ) || null
  );
}

/**
 * get GPT slot by iframe window
 * @param {Window} win
 * @return {?Object}
 */
export function getSlotByWin(win) {
  const slots = getAllSlots();

  if (!slots || !slots.length) {
    return null;
  }

  return (
    find(slots, (s) => {
      let slotElement = document.getElementById(s.getSlotElementId());

      if (slotElement) {
        let slotIframe = slotElement.querySelector('iframe');

        if (slotIframe && slotIframe.contentWindow === win) {
          return true;
        }
      }

      return false;
    }) || null
  );
}

/**
 * Init Reconciliation post messages listeners to handle
 * impressions messages from ad creative
 */
function initListeners() {
  window.addEventListener('message', handleAdMessage, false);
}

/**
 * Send init event to log
 * @param {Array} adUnits
 */
function trackInit(adUnits) {
  track.trackPost(
    _moduleParams.initUrl,
    {
      adUnits,
      publisherDomain: window.location.hostname,
      publisherMemberId: _moduleParams.publisherMemberId,
    }
  );
}

/**
 * Track event via POST request
 * wrap method to allow stubbing in tests
 * @param {string} url
 * @param {Object} data
 */
export const track = {
  trackPost(url, data) {
    const ajax = ajaxBuilder();

    ajax(
      url,
      function() {},
      JSON.stringify(data),
      {
        method: 'POST',
      }
    );
  }
}

/**
 * Set custom targetings for provided adUnits
 * @param {string[]} adUnitsCodes
 * @return {Object} key-value object with custom targetings
 */
function getReconciliationData(adUnitsCodes) {
  const dataToReturn = {};
  const adUnitsToTrack = [];

  adUnitsCodes.forEach((adUnitCode) => {
    if (!adUnitCode) {
      return;
    }

    const adSlot = getSlotByCode(adUnitCode);
    const adUnitId = adSlot ? adSlot.getAdUnitPath() : adUnitCode;
    const adDeliveryId = `${timestamp()}-${generateUUID()}`;

    dataToReturn[adUnitCode] = {
      RSDK_AUID: adUnitId,
      RSDK_ADID: adDeliveryId,
    };

    adUnitsToTrack.push({
      adUnitId,
      adDeliveryId
    });
  }, {});

  // Track init event
  trackInit(adUnitsToTrack);

  return dataToReturn;
}

/** @type {RtdSubmodule} */
export const reconciliationSubmodule = {
  /**
   * used to link submodule with realTimeData
   * @type {string}
   */
  name: 'reconciliation',
  /**
   * get data and send back to realTimeData module
   * @function
   * @param {string[]} adUnitsCodes
   */
  getTargetingData: getReconciliationData,
  init: init,
};

function init(moduleConfig) {
  const params = moduleConfig.params;
  if (params && params.publisherMemberId) {
    _moduleParams = Object.assign({}, DEFAULT_PARAMS, params);
    initListeners();
  } else {
    logError('missing params for Reconciliation provider');
  }
  return true;
}

submodule('realTimeData', reconciliationSubmodule);
