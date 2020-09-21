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

import { submodule } from '../src/hook.js';
import { config } from '../src/config.js';
import { ajaxBuilder } from '../src/ajax.js';
import * as utils from '../src/utils.js';
import find from 'core-js-pure/features/array/find.js';

/** @type {string} */
const MODULE_NAME = 'realTimeData';
/** @type {string} */
const SUBMODULE_NAME = 'reconciliation';
/** @type {Object} */
const MessageType = {
  IMPRESSION_REQUEST: 'rsdk:impression:req',
  IMPRESSION_RESPONSE: 'rsdk:impression:res',
};
/** @type {ModuleParams} */
const DEFAULT_PARAMS = {
  initUrl: 'https://confirm.fiduciadlt.com/init',
  impressionUrl: 'https://confirm.fiduciadlt.com/imp',
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
    if (utils.isGptPubadsDefined()) {
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
            : utils.generateUUID();
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

    utils.triggerPixel(`${_moduleParams.impressionUrl}?${stringify(args)}`);

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
 */
export function getTopIFrameWin(win) {
  if (!win) {
    return null;
  }

  try {
    while (win.parent !== win.top) {
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
  return utils.isGptPubadsDefined() && window.googletag.pubads().getSlots();
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
function getSlotByWin(win) {
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
 * serialize object and return query params string
 * @param {Object} data
 * @return {string}
 */
export function stringify(query) {
  const parts = [];

  for (let key in query) {
    if (query.hasOwnProperty(key)) {
      let val = query[key];
      if (typeof query[key] !== 'object') {
        parts.push(`${key}=${encodeURIComponent(val)}`);
      } else {
        parts.push(`${key}=${encodeURIComponent(stringify(val))}`);
      }
    }
  }
  return parts.join('&');
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
 * @param {Object} adUnitsDict
 */
function trackInit(adUnitsDict) {
  const adUnits = Object.keys(adUnitsDict).map((k) => {
    const adUnit = adUnitsDict[k];

    return {
      adUnitId: adUnit['RSDK_AUID'],
      adDeliveryId: adUnit['RSDK_ADID'],
    };
  });

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
 * call callback (onDone) when ready
 * @param {adUnit[]} adUnits
 * @param {function} onDone callback function
 */
function getReconciliationData(adUnits, onDone) {
  let dataToReturn = adUnits.reduce((rp, cau) => {
    const adUnitCode = cau && cau.code;

    if (!adUnitCode) {
      return rp;
    }

    const adSlot = getSlotByCode(adUnitCode);
    rp[adUnitCode] = {
      RSDK_ADID:
        cau.transactionId || utils.generateUUID(),
      RSDK_AUID: adSlot ? adSlot.getAdUnitPath() : adUnitCode,
    };

    return rp;
  }, {});

  // Track init event
  trackInit(dataToReturn);

  return onDone(dataToReturn);
}

/** @type {RtdSubmodule} */
export const reconciliationSubmodule = {
  /**
   * used to link submodule with realTimeData
   * @type {string}
   */
  name: SUBMODULE_NAME,
  /**
   * get data and send back to realTimeData module
   * @function
   * @param {adUnit[]} adUnits
   * @param {function} onDone
   */
  getData: getReconciliationData,
  init
};

function init(config, gdpr, usp) {
  return true;
}

export function beforeInit(config) {
  const confListener = config.getConfig(MODULE_NAME, ({ realTimeData }) => {
    try {
      const params =
        realTimeData.dataProviders &&
        realTimeData.dataProviders.filter(
          (pr) => pr.name && pr.name.toLowerCase() === SUBMODULE_NAME
        )[0].params;
      _moduleParams = Object.assign({}, DEFAULT_PARAMS, params);
    } catch (e) {
      _moduleParams = {};
    }

    if (_moduleParams.publisherMemberId) {
      confListener();
      initListeners();
    } else {
      utils.logError('missing params for Reconciliation provider');
    }
  });
}

submodule('realTimeData', reconciliationSubmodule);
beforeInit(config);
