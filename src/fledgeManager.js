/**
 * FledgeManager modules is responsible for register fledged auction configs and
 * run the fledge auction.
 */

import { createInvisibleIframe, insertElement, logWarn, logInfo, getGptSlotInfoForAdUnitCode } from './utils.js';

/**
 * @typedef {Object} FledgeManager
 *
 * @property {function(): void} addComponentAuction
 * @property {function(): boolean} runAdAuction
 * @property {function(): void} clearComponentAuctions
 */

const MODULE = 'FLEDGE_MANAGER'

function isGTPRan() {
  return false;
}

/**
 * @returns {FledgeManager} fledgeManagerInstance
 */
export function newFledgeManager() {
  // should be an array of {bid.adUnitCode, seller, auctionConfig}
  // where there is only one entry for each {bid.adUnitCode, seller} tuple
  // TODO do we want to keep track of entries per auctionId or just the last one ?
  const _componentAuctions = [];
  const fledgeManager = {};

  fledgeManager.addComponentAuction = function(bidRequest, fledgeAuctionConfig) {
    if (!bidRequest || !fledgeAuctionConfig) { return; }

    const seller = fledgeAuctionConfig.seller;
    const adUnitCode = bidRequest.adUnitCode;
    if (isGTPRan()) {
      const gptSlotInfo = getGptSlotInfoForAdUnitCode(adUnitCode);
      if (gptSlotInfo && gptSlotInfo.gptSlot && gptSlotInfo.gptSlot.addComponentAuction) {
        gptSlotInfo.gptSlot.addComponentAuction(seller, fledgeAuctionConfig);
      } else {
        logWarn(MODULE, `Unable to register auction config for adUnit: ${adUnitCode}.`);
      }
    } else {
      // TODO : remove duplicate {adUnitCode, seller} is already registered
      logInfo(MODULE, `adding auction config for ${adUnitCode} x ${seller}`);
      _componentAuctions.push({adUnitCode, seller, fledgeAuctionConfig});
    }
  };

  fledgeManager.getAuctionConfig = function(bid) {
    if (isGTPRan()) {
      // nothing to do since the
      return null;
    }
    logInfo(MODULE, `runAdAuction looking for bid`, bid);
    const targetAdUnitCode = bid.adUnitCode;
    const componentAuctionsForAdUnitCode = _componentAuctions.filter((componentAuction) => {
      const {adUnitCode} = componentAuction;
      return targetAdUnitCode == adUnitCode;
    });
    logInfo(MODULE, `componentAuctionsForAdUnitCode`, componentAuctionsForAdUnitCode);
    if (componentAuctionsForAdUnitCode.length == 0) {
      logInfo(MODULE, `NOT running runAdAuction for adUnitCode=${targetAdUnitCode} since there are no componentAuctions`);
      return null;
    }

    logInfo(MODULE, `runAdAuction for adUnitCode=${targetAdUnitCode}`, componentAuctionsForAdUnitCode);

    // HACK ony returning the first auctionConfig
    return componentAuctionsForAdUnitCode[0].fledgeAuctionConfig;
  };

  fledgeManager.runAdAuction = function(bid, doc, prebidRenderCallback, id, options) {
    const auctionConfig = fledgeManager.getAuctionConfig(bid);
    if (auctionConfig) {
      navigator.runAdAuction(auctionConfig).then((fledgeAdUri) => {
        if (fledgeAdUri) {
          logInfo('$$PREBID_GLOBAL$$.renderAd rendered fledge ad');
          fledgeManager.renderAd(bid, doc, fledgeAdUri);
        } else {
          logWarn(`Ad id ${bid.adId} was NOT fledged, rendering normal ad`);
          prebidRenderCallback(bid, doc, id, options);
        }
      });
    } else {
      prebidRenderCallback(bid, doc, id, options);
    }
  };

  fledgeManager.clearComponentAuctions = function() {
    _componentAuctions.length = 0;
  };

  fledgeManager.renderAd = function(bid, doc, fledgeAdUri) {
    if (bid.mediaType == 'video') {
      logWarn(MODULE, 'Video fledge ads not yet supported.');
      return;
    }

    // TODO emit fledge win event

    const {height, width} = bid;

    // TODO switch to fencedframe when available
    const frameType = 'iframe';
    logInfo(MODULE, `renderAd in ${frameType}`, fledgeAdUri, doc);
    const iframe = createInvisibleIframe();
    iframe.style.display = 'inline';
    iframe.style.overflow = 'hidden';
    iframe.height = height;
    iframe.width = width;
    iframe.src = fledgeAdUri;
    insertElement(iframe, doc, 'body');

    if (doc.defaultView && doc.defaultView.frameElement) {
      doc.defaultView.frameElement.width = width;
      doc.defaultView.frameElement.height = height;
    }

    // Do billing/ reporting stuff here?
  };

  return fledgeManager;
}

export const fledgeManager = newFledgeManager();
