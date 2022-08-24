/**
 * Fledge modules is responsible for registering fledged auction configs and
 * run the fledge auction.
 */
import { auctionManager } from '../src/auctionManager.js';
import { config } from '../src/config.js';
import { getHook } from '../src/hook.js';
import { createInvisibleIframe, insertElement, logInfo, logWarn, logError } from '../src/utils.js';

const MODULE = 'fledge'

// should be an array of {bid.adUnitCode, seller, auctionConfig}
// where there is only one entry for each {bid.adUnitCode, seller} tuple
// TODO do we want to keep track of entries per auctionId or just the last one ?
let _componentAuctions = [];

config.getConfig('fledge', config => init(config.fledge));

/**
  * Module init.
  */
export function init(fledgeCfg) {
  if (!fledgeCfg || fledgeCfg.enabled !== false) {
    getHook('addComponentAuction').before(addComponentAuctionHook);
    getHook('renderAd').before(renderAdHook);
    getHook('secureRenderRequest').before(secureRenderRequestHook);
    logInfo(MODULE, `isEnabled`, fledgeCfg);
  } else {
    logInfo(MODULE, `isDisabled`, fledgeCfg);
  }
}

export function addComponentAuctionHook(next, bidRequest, fledgeAuctionConfig) {
  if (!bidRequest || !fledgeAuctionConfig) { return; }

  const seller = fledgeAuctionConfig.seller;
  const adUnitCode = bidRequest.adUnitCode;

  // TODO : remove duplicate {adUnitCode, seller} is already registered
  logInfo(MODULE, `adding auction config for ${adUnitCode} x ${seller}`);
  _componentAuctions.push({adUnitCode, seller, fledgeAuctionConfig});

  next(bidRequest, fledgeAuctionConfig);
}

export function getAuctionConfig(bid) {
  const targetAdUnitCode = bid.adUnitCode;
  const componentAuctionsForAdUnitCode = _componentAuctions.filter((componentAuction) => {
    const {adUnitCode} = componentAuction;
    return targetAdUnitCode == adUnitCode;
  });
  if (componentAuctionsForAdUnitCode.length == 0) {
    logInfo(MODULE, `NOT running runAdAuction for adUnitCode=${targetAdUnitCode} since there are no componentAuctions`);
    return null;
  }

  logInfo(MODULE, `runAdAuction for adUnitCode=${targetAdUnitCode}`, componentAuctionsForAdUnitCode);

  const seller = config.getConfig('fledge.seller');
  const decisionLogicUrl = config.getConfig('fledge.decisionLogicUrl');
  if (seller && decisionLogicUrl) {
    // multiple-ssp with top level support
    return {
      seller,
      decisionLogicUrl,
      componentAuctions: componentAuctionsForAdUnitCode.map((auction) => auction.fledgeAuctionConfig)
    }
  }

  // fallback if there is no top-level seller defined
  const randomIdx = Math.floor(Math.random() * componentAuctionsForAdUnitCode.length);
  return componentAuctionsForAdUnitCode[randomIdx].fledgeAuctionConfig;
}

export function renderAdHook(next, doc, id, options) {
  logInfo(MODULE, 'renderAd hook', arguments);
  if (doc && id) {
    try {
      const bid = auctionManager.findBidByAdId(id);

      if (bid) {
        logInfo(MODULE, 'renderAd hook found bid', bid);
        if (runAdAuction(bid, next, doc, id, options)) {
          return;
        }
      }
    } catch (e) {
      logError(MODULE, 'fail running fledge', id, e);
    }
  }
  next(doc, id, options);
}

export function runAdAuction(bid, next, doc, id, options) {
  if (bid.mediaType == 'video') {
    logWarn(MODULE, 'Video fledge ads not yet supported.');
    // need to fallback to default renderAd
    return false;
  }

  const auctionConfig = getAuctionConfig(bid);
  if (auctionConfig) {
    navigator.runAdAuction(auctionConfig).then((fledgeAdUri) => {
      if (fledgeAdUri) {
        renderFledgeAd(bid, doc, fledgeAdUri);
      } else {
        // need to fallback to default renderAd when there was no fledge ad
        next(doc, id, options);
      }
    });
    return true;
  } else {
    // need to fallback to default renderAd when there was no fledge auction config
    return false;
  }
};

export function renderFledgeAd(bid, doc, fledgeAdUri) {
  logInfo(MODULE, `renderAd rendering fledge ad=${fledgeAdUri}`);

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
  logInfo(MODULE, 'renderAd rendering fledge ad');
}

function secureRenderRequestHook(next, reply, data, adObject, options) {
  logWarn('Fledge rendering using secureCreative');
  const MODULE = 'fledge secure';
  const fledgeAuctionConfig = getAuctionConfig(adObject);
  if (fledgeAuctionConfig) {
    logWarn(MODULE, `Ad id ${adObject.adId} is being fledged`, fledgeAuctionConfig);
    navigator.runAdAuction(fledgeAuctionConfig).then((fledgeAdUri) => {
      if (fledgeAdUri) {
        logWarn(MODULE, `Ad id ${adObject.adId} has been fledged by ${fledgeAdUri}`);
        adObject.ad = '';
        adObject.adUrl = fledgeAdUri;
      } else {
        logWarn(MODULE, `Ad id ${adObject.adId} was NOT fledged, rendering normal ad`);
      }
      // we use the default secure rendering
      next(reply, data, adObject, {isFledge: true});
    });
  } else {
    next(reply, data, adObject, options);
  }
}

export function clearComponentAuctions() {
  _componentAuctions = []
}
