/**
 * This module provides comprehensive detection of security, quality, and privacy threats by Confiant Inc,
 * the industry leader in real-time detecting and blocking of bad ads
 *
 * The {@link module:modules/realTimeData} module is required
 * The module will inject a Confiant Inc. script into the page to monitor ad impressions
 * @module modules/confiantRtdProvider
 * @requires module:modules/realTimeData
 */

import { submodule } from '../src/hook.js';
import { logError, generateUUID } from '../src/utils.js';
import { loadExternalScript } from '../src/adloader.js';
import * as events from '../src/events.js';
import { EVENTS } from '../src/constants.js';

/**
 * Injects the Confiant Inc. configuration script into the page, based on proprtyId provided
 * @param {string} propertyId
 */
function injectConfigScript(propertyId) {
  const scriptSrc = `https://cdn.confiant-integrations.net/${propertyId}/gpt_and_prebid/config.js`;

  loadExternalScript(scriptSrc, 'confiant', () => {});
}

/**
 * Set up page with Confiant integration
 * @param {Object} config
 */
function setupPage(config) {
  const propertyId = config?.params?.propertyId;
  if (!propertyId) {
    logError('Confiant pbjs module: no propertyId provided');
    return false;
  }

  const confiant = window.confiant || Object.create(null);
  confiant[propertyId] = confiant[propertyId] || Object.create(null);
  confiant[propertyId].clientSettings = confiant[propertyId].clientSettings || Object.create(null);
  confiant[propertyId].clientSettings.isMGBL = true;
  confiant[propertyId].clientSettings.prebidExcludeBidders = config?.params?.prebidExcludeBidders;
  confiant[propertyId].clientSettings.prebidNameSpace = config?.params?.prebidNameSpace;

  if (config?.params?.shouldEmitBillableEvent) {
    if (window.frames['cnftComm']) {
      subscribeToConfiantCommFrame(window, propertyId);
    } else {
      setUpMutationObserver();
    }
  }

  injectConfigScript(propertyId);
  return true;
}

/**
 * Subscribe to window's message events to report Billable events
 * @param {Window} targetWindow window instance to subscribe to
 */
function subscribeToConfiantCommFrame(targetWindow, propertyId) {
  targetWindow.addEventListener('message', getEventHandlerFunction(propertyId));
}

let mutationObserver;
/**
 * Set up mutation observer to subscribe to Confiant's communication channel ASAP
 */
function setUpMutationObserver() {
  mutationObserver = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((addedNode) => {
        if (addedNode.nodeName === 'IFRAME' && addedNode.name === 'cnftComm' && !addedNode.pbjsModuleSubscribed) {
          addedNode.pbjsModuleSubscribed = true;
          mutationObserver.disconnect();
          mutationObserver = null;
          const iframeWindow = addedNode.contentWindow;
          subscribeToConfiantCommFrame(iframeWindow);
        }
      });
    });
  });
  mutationObserver.observe(document.head, { childList: true, subtree: true });
}

/**
 * Emit billable event when Confiant integration reports that it has monitored an impression
 */
function getEventHandlerFunction(propertyId) {
  return function reportBillableEvent(e) {
    if (e.data.type.indexOf('cnft:reportBillableEvent:' + propertyId) > -1) {
      events.emit(EVENTS.BILLABLE_EVENT, {
        auctionId: e.data.auctionId,
        billingId: generateUUID(),
        transactionId: e.data.transactionId,
        type: 'impression',
        vendor: 'confiant'
      });
    }
  }
}

/**
 * Confiant submodule registration
 */
function registerConfiantSubmodule() {
  submodule('realTimeData', {
    name: 'confiant',
    init: (config) => {
      try {
        return setupPage(config);
      } catch (err) {
        logError(err.message);
        if (mutationObserver) {
          mutationObserver.disconnect();
        }
        return false;
      }
    }
  });
}

registerConfiantSubmodule();

export default {
  injectConfigScript,
  setupPage,
  subscribeToConfiantCommFrame,
  setUpMutationObserver,
  registerConfiantSubmodule
};
