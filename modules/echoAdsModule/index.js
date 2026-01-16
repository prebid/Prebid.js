/**
 * Echo Ads Module
 *
 * This module enables publisher-controlled ad units that appear when users
 * reach the end of content consumption. Supports:
 * - Configurable triggers (scroll depth, time on page, custom functions)
 * - Bid pre-fetching for reduced latency
 * - Overlay/interstitial rendering
 * - Frequency capping
 *
 * @module modules/echoAdsModule
 */

import { config } from '../../src/config.js';
import { logInfo, logWarn, logError } from '../../src/utils.js';
import { getGlobal } from '../../src/prebidGlobal.js';
import * as events from '../../src/events.js';
import { EVENTS } from '../../src/constants.js';
import { getWindowDimensions } from '../../src/utils/winDimensions.js';
import { getStorageManager } from '../../src/storageManager.js';

const MODULE_NAME = 'echoAds';
const VERSION = '1.0.0';

// Storage manager
const storage = getStorageManager({ moduleType: 'core', moduleName: MODULE_NAME });

// Module state
let moduleConfig = null;
let isInitialized = false;
let triggerMonitorActive = false;
let cachedBid = null;
let auctionInProgress = false;
let hasBeenTriggered = false;

// Storage keys for frequency capping
const STORAGE_KEY_SESSION = 'echoAds_session_count';
const STORAGE_KEY_DAILY = 'echoAds_daily_count';
const STORAGE_KEY_LAST_SHOWN = 'echoAds_last_shown';

/**
 * Initialize the Echo Ads module
 */
export function init(pbjs) {
  if (isInitialized) {
    logWarn(`${MODULE_NAME}: Module already initialized`);
    return;
  }

  const confListener = config.getConfig(MODULE_NAME, ({ echoAds }) => {
    if (!echoAds) {
      logError(`${MODULE_NAME}: Missing configuration`);
      return;
    }

    if (!echoAds.adUnit) {
      logError(`${MODULE_NAME}: Missing adUnit configuration`);
      return;
    }

    moduleConfig = echoAds;
    confListener(); // unsubscribe

    logInfo(`${MODULE_NAME}: Initialized v${VERSION}`);
    isInitialized = true;

    // Setup event listeners
    setupEventListeners();

    // Start monitoring triggers
    startTriggerMonitoring();

    // Handle pre-fetch strategy
    handlePrefetchStrategy();
  });
}

/**
 * Setup event listeners for Prebid events
 */
function setupEventListeners() {
  events.on(EVENTS.AUCTION_END, onAuctionEnd);
  events.on(EVENTS.BID_WON, onBidWon);
  events.on(EVENTS.AD_RENDER_FAILED, onAdRenderFailed);
}

/**
 * Handle auction end event - cache the winning bid
 */
function onAuctionEnd(auctionData) {
  if (!moduleConfig || !auctionInProgress) return;

  // Find our Echo Ads ad unit
  const echoAdUnit = auctionData.adUnits?.find(
    unit => unit.code === moduleConfig.adUnit.code
  );

  if (!echoAdUnit) return;

  // Get the winning bid for this ad unit
  const bids = auctionData.bidsReceived?.filter(
    bid => bid.adUnitCode === moduleConfig.adUnit.code
  );

  if (bids && bids.length > 0) {
    // Sort by CPM and get highest
    bids.sort((a, b) => b.cpm - a.cpm);
    cachedBid = bids[0];
    logInfo(`${MODULE_NAME}: Cached winning bid from ${cachedBid.bidder} with CPM ${cachedBid.cpm}`);

    // Call onBidCached callback if provided
    if (moduleConfig.onBidCached && typeof moduleConfig.onBidCached === 'function') {
      moduleConfig.onBidCached({
        bidder: cachedBid.bidder,
        cpm: cachedBid.cpm,
        size: `${cachedBid.width}x${cachedBid.height}`
      });
    }
  } else {
    logWarn(`${MODULE_NAME}: No bids received for Echo Ad unit`);
    cachedBid = null;
  }

  auctionInProgress = false;
}

/**
 * Handle bid won event
 */
function onBidWon(bid) {
  if (bid.adUnitCode === moduleConfig?.adUnit?.code) {
    logInfo(`${MODULE_NAME}: Bid won from ${bid.bidder}`);
  }
}

/**
 * Handle ad render failure
 */
function onAdRenderFailed(data) {
  if (data.adUnitCode === moduleConfig?.adUnit?.code) {
    logError(`${MODULE_NAME}: Ad render failed`, data);
  }
}

/**
 * Handle pre-fetch strategy (eager or lazy)
 */
function handlePrefetchStrategy() {
  if (!moduleConfig.prefetch) return;

  const mode = moduleConfig.prefetch.mode || 'lazy';

  if (mode === 'eager') {
    // Start auction immediately on page load
    logInfo(`${MODULE_NAME}: Eager prefetch - starting auction immediately`);
    startAuction();
  } else if (mode === 'lazy' && moduleConfig.prefetch.lazyTriggerPoint) {
    // Monitor for lazy trigger point
    const triggerPoint = moduleConfig.prefetch.lazyTriggerPoint;

    if (triggerPoint.scroll) {
      setupScrollMonitor(triggerPoint.scroll.depth, () => {
        if (!auctionInProgress && !cachedBid) {
          logInfo(`${MODULE_NAME}: Lazy prefetch trigger reached - starting auction`);
          startAuction();
        }
      });
    }
  }
}

/**
 * Start the ad auction for Echo Ads unit
 */
function startAuction() {
  if (auctionInProgress) {
    logWarn(`${MODULE_NAME}: Auction already in progress`);
    return;
  }

  const pbjs = getGlobal();

  // Add the ad unit
  pbjs.addAdUnits([moduleConfig.adUnit]);

  auctionInProgress = true;

  // Request bids
  pbjs.requestBids({
    adUnitCodes: [moduleConfig.adUnit.code],
    bidsBackHandler: function(bids) {
      logInfo(`${MODULE_NAME}: Bids returned`, bids);
    }
  });
}

/**
 * Start monitoring for trigger conditions
 */
function startTriggerMonitoring() {
  if (triggerMonitorActive) return;

  const trigger = moduleConfig.trigger;
  if (!trigger) {
    logWarn(`${MODULE_NAME}: No trigger configuration provided`);
    return;
  }

  triggerMonitorActive = true;

  // Setup scroll depth trigger
  if (trigger.scroll) {
    setupScrollMonitor(trigger.scroll.depth, onTriggerActivated);
  }

  // Setup time on page trigger
  if (trigger.timeOnPage) {
    setupTimeMonitor(trigger.timeOnPage, onTriggerActivated);
  }

  // Setup exit intent trigger
  if (trigger.exitIntent) {
    setupExitIntentMonitor(onTriggerActivated);
  }

  // Setup custom trigger
  if (typeof trigger.custom === 'function') {
    setupCustomTriggerMonitor(trigger.custom, onTriggerActivated);
  }

  logInfo(`${MODULE_NAME}: Trigger monitoring started`);
}

/**
 * Setup scroll depth monitoring
 */
let scrollMonitorCallbacks = [];
function setupScrollMonitor(targetDepth, callback) {
  if (scrollMonitorCallbacks.length === 0) {
    // Only attach listener once
    window.addEventListener('scroll', handleScroll, { passive: true });
  }

  scrollMonitorCallbacks.push({ targetDepth, callback, triggered: false });
}

function handleScroll() {
  const scrollDepth = calculateScrollDepth();

  scrollMonitorCallbacks.forEach(monitor => {
    if (!monitor.triggered && scrollDepth >= monitor.targetDepth) {
      monitor.triggered = true;
      monitor.callback();
    }
  });
}

function calculateScrollDepth() {
  const { height: windowHeight } = getWindowDimensions();
  const documentHeight = Math.max(
    document.body.scrollHeight,
    document.documentElement.scrollHeight
  );
  const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
  const scrollableHeight = documentHeight - windowHeight;

  // 0% at top, 100% when scrolled to bottom
  if (scrollableHeight <= 0) return 0;
  return (scrollTop / scrollableHeight) * 100;
}

/**
 * Setup time on page monitoring
 */
function setupTimeMonitor(milliseconds, callback) {
  setTimeout(() => {
    callback();
  }, milliseconds);
}

/**
 * Setup exit intent monitoring
 */
function setupExitIntentMonitor(callback) {
  document.addEventListener('mouseout', (e) => {
    if (e.clientY <= 0) {
      callback();
    }
  });
}

/**
 * Setup custom trigger monitoring
 */
function setupCustomTriggerMonitor(customFn, callback) {
  // Poll the custom function
  const interval = setInterval(() => {
    try {
      if (customFn()) {
        clearInterval(interval);
        callback();
      }
    } catch (e) {
      logError(`${MODULE_NAME}: Error in custom trigger function`, e);
    }
  }, 1000); // Check every second
}

/**
 * Called when trigger conditions are met
 */
function onTriggerActivated() {
  if (hasBeenTriggered) {
    logInfo(`${MODULE_NAME}: Trigger already activated`);
    return;
  }

  // Set flag immediately to prevent other automatic triggers from firing
  hasBeenTriggered = true;

  // Check frequency cap
  if (!checkFrequencyCap()) {
    logInfo(`${MODULE_NAME}: Not showing ad - frequency cap limit reached`);

    // Call onFrequencyCapReached callback if provided
    if (moduleConfig.onFrequencyCapReached && typeof moduleConfig.onFrequencyCapReached === 'function') {
      moduleConfig.onFrequencyCapReached();
    }

    return;
  }

  logInfo(`${MODULE_NAME}: Trigger activated!`);

  // Call onTrigger callback if provided
  if (moduleConfig.onTrigger && typeof moduleConfig.onTrigger === 'function') {
    moduleConfig.onTrigger();
  }

  // If we don't have a cached bid yet, start auction
  if (!cachedBid && !auctionInProgress) {
    logInfo(`${MODULE_NAME}: No cached bid, starting auction...`);
    startAuction();
    // Wait for auction to complete, then show ad
    let attempts = 0;
    const maxAttempts = 50; // 5 seconds max
    const checkInterval = setInterval(() => {
      attempts++;
      if (cachedBid) {
        clearInterval(checkInterval);
        logInfo(`${MODULE_NAME}: Bid received, showing ad`);
        showEchoAd();
      } else if (attempts >= maxAttempts) {
        clearInterval(checkInterval);
        logWarn(`${MODULE_NAME}: Timeout waiting for bids, no ad to show`);
      }
    }, 100);
  } else if (cachedBid) {
    // Show ad immediately
    logInfo(`${MODULE_NAME}: Using cached bid`);
    showEchoAd();
  } else if (auctionInProgress) {
    logInfo(`${MODULE_NAME}: Auction in progress, waiting for completion...`);
    // Wait for auction to complete
    let attempts = 0;
    const maxAttempts = 50;
    const checkInterval = setInterval(() => {
      attempts++;
      if (cachedBid) {
        clearInterval(checkInterval);
        logInfo(`${MODULE_NAME}: Bid received, showing ad`);
        showEchoAd();
      } else if (attempts >= maxAttempts) {
        clearInterval(checkInterval);
        logWarn(`${MODULE_NAME}: Timeout waiting for bids, no ad to show`);
      }
    }, 100);
  }
}

/**
 * Check frequency capping
 */
function checkFrequencyCap() {
  if (!moduleConfig.display || !moduleConfig.display.frequency) {
    return true; // No frequency cap configured
  }

  const freq = moduleConfig.display.frequency;

  try {
    // Check session cap
    if (freq.maxPerSession) {
      const sessionCount = parseInt(storage.getDataFromSessionStorage(STORAGE_KEY_SESSION) || '0');
      if (sessionCount >= freq.maxPerSession) {
        logWarn(`${MODULE_NAME}: Session frequency cap reached (${sessionCount}/${freq.maxPerSession})`);
        return false;
      }
    }

    // Check daily cap
    if (freq.maxPerDay) {
      const dailyData = storage.getDataFromLocalStorage(STORAGE_KEY_DAILY);
      if (dailyData) {
        const { date, count } = JSON.parse(dailyData);
        const today = new Date().toDateString();
        if (date === today && count >= freq.maxPerDay) {
          logWarn(`${MODULE_NAME}: Daily frequency cap reached (${count}/${freq.maxPerDay})`);
          return false;
        }
      }
    }

    return true;
  } catch (e) {
    logError(`${MODULE_NAME}: Error checking frequency cap`, e);
    return true; // Allow ad on error
  }
}

/**
 * Update frequency cap counters
 */
function updateFrequencyCap() {
  if (!moduleConfig.display || !moduleConfig.display.frequency) {
    return;
  }

  const freq = moduleConfig.display.frequency;

  try {
    // Update session count
    if (freq.maxPerSession) {
      const sessionCount = parseInt(storage.getDataFromSessionStorage(STORAGE_KEY_SESSION) || '0');
      storage.setDataInSessionStorage(STORAGE_KEY_SESSION, (sessionCount + 1).toString());
    }

    // Update daily count
    if (freq.maxPerDay) {
      const today = new Date().toDateString();
      const dailyData = storage.getDataFromLocalStorage(STORAGE_KEY_DAILY);
      let count = 1;

      if (dailyData) {
        const { date, count: prevCount } = JSON.parse(dailyData);
        if (date === today) {
          count = prevCount + 1;
        }
      }

      storage.setDataInLocalStorage(STORAGE_KEY_DAILY, JSON.stringify({ date: today, count }));
    }

    // Update last shown timestamp
    storage.setDataInLocalStorage(STORAGE_KEY_LAST_SHOWN, Date.now().toString());
  } catch (e) {
    logError(`${MODULE_NAME}: Error updating frequency cap`, e);
  }
}

/**
 * Show the Echo Ad
 */
function showEchoAd() {
  if (!cachedBid) {
    logWarn(`${MODULE_NAME}: No cached bid to display`);
    return;
  }

  logInfo(`${MODULE_NAME}: Displaying Echo Ad`, cachedBid);

  const displayConfig = moduleConfig.display || {};
  const displayType = displayConfig.type || 'overlay';

  if (displayType === 'overlay') {
    showOverlay();
  } else if (displayType === 'interstitial') {
    showInterstitial();
  }

  // Clear cached bid immediately - each bid can only be used once
  cachedBid = null;

  // Update frequency cap
  updateFrequencyCap();

  // Call onAdRender callback
  if (moduleConfig.onAdRender && typeof moduleConfig.onAdRender === 'function') {
    moduleConfig.onAdRender();
  }
}

/**
 * Show overlay ad
 */
function showOverlay() {
  const displayConfig = moduleConfig.display || {};

  // Create overlay container
  const overlay = document.createElement('div');
  overlay.id = 'echo-ads-overlay';
  overlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.8);
    z-index: 999999;
    display: flex;
    align-items: center;
    justify-content: center;
  `;

  // Create ad container
  const adContainer = document.createElement('div');
  adContainer.id = moduleConfig.adUnit.code;

  // Set min dimensions based on bid size to prevent collapse with third-party tags
  const minWidth = cachedBid.width || 300;
  const minHeight = cachedBid.height || 250;

  adContainer.style.cssText = `
    position: relative;
    background: white;
    padding: 20px;
    border-radius: 8px;
    box-shadow: 0 4px 20px rgba(0,0,0,0.3);
    min-width: ${minWidth}px;
    min-height: ${minHeight}px;
  `;

  // Render the ad first - insert HTML directly
  if (cachedBid.ad) {
    adContainer.innerHTML = cachedBid.ad;
  } else {
    logError(`${MODULE_NAME}: Cached bid has no ad creative`);
  }

  // Create close button AFTER ad content (so it's not overwritten)
  if (displayConfig.closeButton !== false) {
    const closeButton = document.createElement('button');
    closeButton.innerHTML = '&times;';
    closeButton.style.cssText = `
      position: absolute;
      top: -12px;
      right: -12px;
      background: #000;
      color: #fff;
      border: none;
      border-radius: 50%;
      width: 28px;
      height: 28px;
      font-size: 20px;
      font-weight: normal;
      line-height: 28px;
      text-align: center;
      cursor: pointer;
      z-index: 2147483647;
      box-shadow: 0 2px 6px rgba(0,0,0,0.4);
      padding: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      pointer-events: auto;
    `;

    // Add hover effect
    closeButton.onmouseenter = function() {
      if (!this.disabled) {
        this.style.background = '#333';
      }
    };
    closeButton.onmouseleave = function() {
      if (!this.disabled) {
        this.style.background = '#000';
      }
    };

    // Handle close delay with countdown
    const closeDelay = displayConfig.closeDelay || 0;
    if (closeDelay > 0) {
      closeButton.disabled = true;
      closeButton.style.opacity = '0.7';
      closeButton.style.cursor = 'not-allowed';

      let remainingSeconds = Math.ceil(closeDelay / 1000);
      closeButton.innerHTML = remainingSeconds;
      closeButton.style.fontSize = '14px';
      closeButton.style.fontWeight = 'bold';

      const countdownInterval = setInterval(() => {
        remainingSeconds--;
        if (remainingSeconds > 0) {
          closeButton.innerHTML = remainingSeconds;
        } else {
          clearInterval(countdownInterval);
          closeButton.innerHTML = '&times;';
          closeButton.style.fontSize = '20px';
          closeButton.style.fontWeight = 'normal';
          closeButton.disabled = false;
          closeButton.style.opacity = '1';
          closeButton.style.cursor = 'pointer';
        }
      }, 1000);
    }

    closeButton.onclick = () => {
      closeEchoAd();
    };

    adContainer.appendChild(closeButton);
  }

  overlay.appendChild(adContainer);
  document.body.appendChild(overlay);
}

/**
 * Show interstitial ad (similar to overlay but full screen)
 */
function showInterstitial() {
  // For now, use same implementation as overlay
  // Can be customized later for different styling
  showOverlay();
}

/**
 * Close the Echo Ad
 */
function closeEchoAd() {
  const overlay = document.getElementById('echo-ads-overlay');
  if (overlay) {
    overlay.remove();
  }

  // Do NOT reset hasBeenTriggered - automatic triggers should only fire once per session
  // Manual triggers bypass this flag entirely
  // Cached bid is already cleared when ad is shown

  // Call onAdClose callback
  if (moduleConfig.onAdClose && typeof moduleConfig.onAdClose === 'function') {
    moduleConfig.onAdClose();
  }

  logInfo(`${MODULE_NAME}: Echo Ad closed`);
}

/**
 * Manual trigger function (exposed to publishers)
 * Unlike automatic triggers, manual triggers can be called multiple times per session
 */
export function triggerEchoAd() {
  if (!isInitialized) {
    logWarn(`${MODULE_NAME}: Module not initialized`);
    return;
  }

  // Manual triggers bypass the hasBeenTriggered check
  // but still respect frequency caps
  if (!checkFrequencyCap()) {
    logInfo(`${MODULE_NAME}: Not showing ad - frequency cap limit reached`);

    // Call onFrequencyCapReached callback if provided
    if (moduleConfig.onFrequencyCapReached && typeof moduleConfig.onFrequencyCapReached === 'function') {
      moduleConfig.onFrequencyCapReached();
    }

    return;
  }

  logInfo(`${MODULE_NAME}: Manual trigger activated!`);

  // Call onTrigger callback if provided
  if (moduleConfig.onTrigger && typeof moduleConfig.onTrigger === 'function') {
    moduleConfig.onTrigger();
  }

  // If we don't have a cached bid yet, start auction
  if (!cachedBid && !auctionInProgress) {
    logInfo(`${MODULE_NAME}: No cached bid, starting auction...`);
    startAuction();
    // Wait for auction to complete, then show ad
    let attempts = 0;
    const maxAttempts = 50; // 5 seconds max
    const checkInterval = setInterval(() => {
      attempts++;
      if (cachedBid) {
        clearInterval(checkInterval);
        logInfo(`${MODULE_NAME}: Bid received, showing ad`);
        showEchoAd();
      } else if (attempts >= maxAttempts) {
        clearInterval(checkInterval);
        logWarn(`${MODULE_NAME}: Timeout waiting for bids, no ad to show`);
      }
    }, 100);
  } else if (cachedBid) {
    // Show ad immediately
    logInfo(`${MODULE_NAME}: Using cached bid`);
    showEchoAd();
  } else if (auctionInProgress) {
    logInfo(`${MODULE_NAME}: Auction in progress, waiting for completion...`);
    // Wait for auction to complete
    let attempts = 0;
    const maxAttempts = 50;
    const checkInterval = setInterval(() => {
      attempts++;
      if (cachedBid) {
        clearInterval(checkInterval);
        logInfo(`${MODULE_NAME}: Bid received, showing ad`);
        showEchoAd();
      } else if (attempts >= maxAttempts) {
        clearInterval(checkInterval);
        logWarn(`${MODULE_NAME}: Timeout waiting for bids, no ad to show`);
      }
    }, 100);
  }
}

/**
 * Reset module state (useful for testing)
 */
export function reset() {
  hasBeenTriggered = false;
  cachedBid = null;
  auctionInProgress = false;
  triggerMonitorActive = false;
  isInitialized = false;
  moduleConfig = null;
  scrollMonitorCallbacks = [];
}

/**
 * Module registration
 */
const pbjs = getGlobal();
init(pbjs);

// Expose API on pbjs global
pbjs.echoAds = {
  trigger: triggerEchoAd,
  reset: reset,
  version: VERSION
};

logInfo(`${MODULE_NAME}: Module loaded v${VERSION}`);
