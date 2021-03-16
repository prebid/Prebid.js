
import * as utils from '../src/utils.js';

const MODULE_NAME = 'express';

/**
 * Express Module
 *
 * The express module allows the initiation of Prebid.js auctions automatically based on calls such as gpt.defineSlot.
 * It works by monkey-patching the gpt methods and overloading their functionality.  In order for this module to be
 * used gpt must be included in the page, this module must be included in the Prebid.js bundle, and a call to
 * pbjs.express() must be made.
 *
 * @param {Object[]} [adUnits = pbjs.adUnits] - an array of adUnits for express to operate on.
 */
$$PREBID_GLOBAL$$.express = function(adUnits = $$PREBID_GLOBAL$$.adUnits) {
  utils.logMessage('loading ' + MODULE_NAME);

  if (adUnits.length === 0) {
    utils.logWarn('no valid adUnits found, not loading ' + MODULE_NAME);
  }

  // store gpt slots in a more performant hash lookup by elementId (adUnit code)
  var gptSlotCache = {};
  // put adUnits in a more performant hash lookup by code.
  var adUnitsCache = adUnits.reduce(function (cache, adUnit) {
    if (adUnit.code && adUnit.bids) {
      cache[adUnit.code] = adUnit;
    } else {
      utils.logError('misconfigured adUnit', null, adUnit);
    }
    return cache;
  }, {});

  window.googletag = window.googletag || {};
  window.googletag.cmd = window.googletag.cmd || [];
  window.googletag.cmd.push(function () {
    // verify all necessary gpt functions exist
    var gpt = window.googletag;
    var pads = gpt.pubads;
    if (!gpt.display || !gpt.enableServices || typeof pads !== 'function' || !pads().refresh || !pads().disableInitialLoad || !pads().getSlots || !pads().enableSingleRequest) {
      utils.logError('could not bind to gpt googletag api');
      return;
    }
    utils.logMessage('running');

    // function to convert google tag slot sizes to [[w,h],...]
    function mapGptSlotSizes(aGPTSlotSizes) {
      var aSlotSizes = [];
      for (var i = 0; i < aGPTSlotSizes.length; i++) {
        try {
          aSlotSizes.push([aGPTSlotSizes[i].getWidth(), aGPTSlotSizes[i].getHeight()]);
        } catch (e) {
          utils.logWarn('slot size ' + aGPTSlotSizes[i].toString() + ' not supported by' + MODULE_NAME);
        }
      }
      return aSlotSizes;
    }

    // a helper function to verify slots or get slots if not present
    function defaultSlots(slots) {
      return Array.isArray(slots)
        ? slots.slice()
        // eslint-disable-next-line no-undef
        : googletag.pubads().getSlots().slice();
    }

    // maps gpt slots to adUnits, matches are copied to new array and removed from passed array.
    function pickAdUnits(gptSlots) {
      var adUnits = [];
      // traverse backwards (since gptSlots is mutated) to find adUnits in cache and remove non-mapped slots
      for (var i = gptSlots.length - 1; i > -1; i--) {
        const gptSlot = gptSlots[i];
        const elemId = gptSlot.getSlotElementId();
        const adUnit = adUnitsCache[elemId];

        if (adUnit) {
          gptSlotCache[elemId] = gptSlot; // store by elementId
          adUnit.sizes = adUnit.sizes || mapGptSlotSizes(gptSlot.getSizes());
          adUnits.push(adUnit);
          gptSlots.splice(i, 1);
        }
      }

      return adUnits;
    }

    // store original gpt functions that will be overridden
    var fGptDisplay = gpt.display;
    var fGptEnableServices = gpt.enableServices;
    var fGptRefresh = pads().refresh;
    var fGptDisableInitialLoad = pads().disableInitialLoad;
    var fGptEnableSingleRequest = pads().enableSingleRequest;

    // override googletag.enableServices()
    //  - make sure fGptDisableInitialLoad() has been called so we can
    //     better control when slots are displayed, then call original
    //     fGptEnableServices()
    gpt.enableServices = function () {
      if (!bInitialLoadDisabled) {
        fGptDisableInitialLoad.apply(pads());
      }
      return fGptEnableServices.apply(gpt, arguments);
    };

    // override googletag.display()
    //  - call the real fGptDisplay(). this won't initiate auctions because we've disabled initial load
    //  - define all corresponding rubicon slots
    //  - if disableInitialLoad() has been called by the pub, done
    //  - else run an auction and call the real fGptRefresh() to
    //       initiate the DFP request
    gpt.display = function (sElementId) {
      utils.logInfo('display:', sElementId);
      // call original gpt display() function
      fGptDisplay.apply(gpt, arguments);

      // if not SRA mode, get only the gpt slot corresponding to sEementId
      var aGptSlots;
      if (!bEnabledSRA) {
        // eslint-disable-next-line no-undef
        aGptSlots = googletag.pubads().getSlots().filter(function (oGptSlot) {
          return oGptSlot.getSlotElementId() === sElementId;
        });
      }

      aGptSlots = defaultSlots(aGptSlots).filter(function (gptSlot) {
        return !gptSlot._displayed;
      });

      aGptSlots.forEach(function (gptSlot) {
        gptSlot._displayed = true;
      });

      var adUnits = pickAdUnits(/* mutated: */ aGptSlots);

      if (!bInitialLoadDisabled) {
        if (aGptSlots.length) {
          fGptRefresh.apply(pads(), [aGptSlots]);
        }

        if (adUnits.length) {
          $$PREBID_GLOBAL$$.requestBids({
            adUnits: adUnits,
            bidsBackHandler: function () {
              $$PREBID_GLOBAL$$.setTargetingForGPTAsync();
              fGptRefresh.apply(pads(), [
                adUnits.map(function (adUnit) {
                  return gptSlotCache[adUnit.code];
                })
              ]);
            }
          });
        }
      }
    };

    // override gpt refresh() function
    // - run auctions for provided gpt slots, then initiate ad-server call
    pads().refresh = function (aGptSlots, options) {
      utils.logInfo('refresh:', aGptSlots);
      // get already displayed adUnits from aGptSlots if provided, else all defined gptSlots
      aGptSlots = defaultSlots(aGptSlots);
      var adUnits = pickAdUnits(/* mutated: */ aGptSlots).filter(function (adUnit) {
        return gptSlotCache[adUnit.code]._displayed;
      });

      if (aGptSlots.length) {
        fGptRefresh.apply(pads(), [aGptSlots, options]);
      }

      if (adUnits.length) {
        $$PREBID_GLOBAL$$.requestBids({
          adUnits: adUnits,
          bidsBackHandler: function () {
            $$PREBID_GLOBAL$$.setTargetingForGPTAsync();
            fGptRefresh.apply(pads(), [
              adUnits.map(function (adUnit) {
                return gptSlotCache[adUnit.code];
              }),
              options
            ]);
          }
        });
      }
    };

    // override gpt disableInitialLoad function
    // Register that initial load was called, meaning calls to display()
    // should not initiate an ad-server request.  Instead a call to
    // refresh() will be needed to iniate the request.
    //  We will assume the pub is using this the correct way, calling it
    //  before enableServices()
    var bInitialLoadDisabled = false;
    pads().disableInitialLoad = function () {
      bInitialLoadDisabled = true;
      return fGptDisableInitialLoad.apply(window.googletag.pubads(), arguments);
    };

    // override gpt useSingleRequest function
    // Register that SRA has been turned on
    //  We will assume the pub is using this the correct way, calling it
    //  before enableServices()
    var bEnabledSRA = false;
    pads().enableSingleRequest = function () {
      bEnabledSRA = true;
      return fGptEnableSingleRequest.apply(window.googletag.pubads(), arguments);
    };
  });
};
