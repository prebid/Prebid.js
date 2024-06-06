import {submodule} from '../src/hook.js';
import {config} from '../src/config.js';
import {logError, logInfo, logWarn, mergeDeep} from '../src/utils.js';
import {auctionStore} from '../libraries/weakStore/weakStore.js';
import {getGlobal} from '../src/prebidGlobal.js';
import {emit} from '../src/events.js';
import {BID_STATUS, EVENTS} from '../src/constants.js';
import {GreedyPromise} from '../src/utils/promise.js';
import {getBidToRender, getRenderingData, markWinningBid} from '../src/adRendering.js';

let getPAAPIConfig, expandFilters, moduleConfig;

const paapiBids = auctionStore();
const MODULE_NAME = 'topLevelPaapi';

config.getConfig('paapi', (cfg) => {
  moduleConfig = cfg.paapi?.topLevelSeller;
  if (moduleConfig) {
    getBidToRender.before(renderPaapiHook);
    getBidToRender.after(renderOverrideHook);
    getRenderingData.before(getRenderingDataHook);
    markWinningBid.before(markWinningBidHook);
  } else {
    getBidToRender.getHooks({hook: renderPaapiHook}).remove();
    getBidToRender.getHooks({hook: renderOverrideHook}).remove();
    getRenderingData.getHooks({hook: getRenderingDataHook}).remove();
    markWinningBid.getHooks({hook: markWinningBidHook}).remove();
  }
});

function isPaapiBid(bid) {
  return bid?.source === 'paapi';
}

function bidIfRenderable(bid) {
  if (bid && !bid.urn) {
    logWarn(MODULE_NAME, 'rendering in fenced frames is not supported. Consider using resolveToConfig: false', bid);
    return;
  }
  return bid;
}

const forRenderStack = [];

function renderPaapiHook(next, adId, forRender = true, override = GreedyPromise.resolve()) {
  forRenderStack.push(forRender);
  const ids = parsePaapiAdId(adId);
  if (ids) {
    override = override.then((bid) => {
      if (bid) return bid;
      const [auctionId, adUnitCode] = ids;
      return paapiBids(auctionId)?.[adUnitCode]?.then(bid => {
        if (!bid) {
          logWarn(MODULE_NAME, `No PAAPI bid found for auctionId: "${auctionId}", adUnit: "${adUnitCode}"`);
        }
        return bidIfRenderable(bid);
      });
    });
  }
  next(adId, forRender, override);
}

function renderOverrideHook(next, bidPm) {
  const forRender = forRenderStack.pop();
  if (moduleConfig?.overrideWinner) {
    bidPm = bidPm.then((bid) => {
      if (isPaapiBid(bid) || bid?.status === BID_STATUS.RENDERED) return bid;
      return getPAAPIBids({adUnitCode: bid.adUnitCode}).then(res => {
        let paapiBid = bidIfRenderable(res[bid.adUnitCode]);
        if (paapiBid) {
          if (!forRender) return paapiBid;
          if (forRender && paapiBid.status !== BID_STATUS.RENDERED) {
            paapiBid.overriddenAdId = bid.adId;
            logInfo(MODULE_NAME, 'overriding contextual bid with PAAPI bid', bid, paapiBid)
            return paapiBid;
          }
        }
        return bid;
      });
    });
  }
  next(bidPm);
}

export function getRenderingDataHook(next, bid, options) {
  if (isPaapiBid(bid)) {
    next.bail({
      width: bid.width,
      height: bid.height,
      adUrl: bid.urn
    });
  } else {
    next(bid, options);
  }
}

export function markWinningBidHook(next, bid) {
  if (isPaapiBid(bid)) {
    bid.status = BID_STATUS.RENDERED;
    emit(EVENTS.BID_WON, bid);
    next.bail();
  } else {
    next(bid);
  }
}

function getBaseAuctionConfig() {
  if (moduleConfig?.auctionConfig) {
    return Object.assign({
      resolveToConfig: false
    }, moduleConfig.auctionConfig);
  }
}

function onAuctionConfig(auctionId, auctionConfigs) {
  const base = getBaseAuctionConfig();
  if (base) {
    Object.entries(auctionConfigs).forEach(([adUnitCode, auctionConfig]) => {
      mergeDeep(auctionConfig, base);
      if (moduleConfig.autorun ?? true) {
        getPAAPIBids({adUnitCode, auctionId});
      }
    });
  }
}

export function parsePaapiSize(size) {
  /* From https://github.com/WICG/turtledove/blob/main/FLEDGE.md#12-interest-group-attributes:
   *  Each size has the format {width: widthVal, height: heightVal},
   *  where the values can have either pixel units (e.g. 100 or '100px') or screen dimension coordinates (e.g. 100sw or 100sh).
   */
  if (typeof size === 'number') return size;
  if (typeof size === 'string') {
    const px = /^(\d+)(px)?$/.exec(size)?.[1];
    if (px) {
      return parseInt(px, 10);
    }
  }
  return null;
}

export function getPaapiAdId(auctionId, adUnitCode) {
  return `paapi:/${auctionId.replace(/:/g, '::')}/:/${adUnitCode.replace(/:/g, '::')}`;
}

export function parsePaapiAdId(adId) {
  const match = /^paapi:\/(.*)\/:\/(.*)$/.exec(adId);
  if (match) {
    return [match[1], match[2]].map(s => s.replace(/::/g, ':'));
  }
}

/**
 * Returns the PAAPI runAdAuction result for the given filters, as a map from ad unit code to auction result
 * (an object with `width`, `height`, and one of `urn` or `frameConfig`).
 *
 * @param filters
 * @param raa
 * @return {Promise<{[p: string]: any}>}
 */
export function getPAAPIBids(filters, raa = (...args) => navigator.runAdAuction(...args)) {
  return Promise.all(
    Object.entries(expandFilters(filters))
      .map(([adUnitCode, auctionId]) => {
        const bids = paapiBids(auctionId);
        if (bids && !bids.hasOwnProperty(adUnitCode)) {
          const auctionConfig = getPAAPIConfig({adUnitCode, auctionId})[adUnitCode];
          if (auctionConfig) {
            emit(EVENTS.RUN_PAAPI_AUCTION, {
              auctionId,
              adUnitCode,
              auctionConfig
            });
            bids[adUnitCode] = new Promise((resolve, reject) => raa(auctionConfig).then(resolve, reject))
              .then(result => {
                if (result) {
                  const bid = {
                    source: 'paapi',
                    adId: getPaapiAdId(auctionId, adUnitCode),
                    width: parsePaapiSize(auctionConfig.requestedSize?.width),
                    height: parsePaapiSize(auctionConfig.requestedSize?.height),
                    adUnitCode,
                    auctionId,
                    [typeof result === 'string' ? 'urn' : 'frameConfig']: result,
                    auctionConfig,
                  };
                  emit(EVENTS.PAAPI_BID, bid);
                  return bid;
                } else {
                  emit(EVENTS.PAAPI_NO_BID, {auctionId, adUnitCode, auctionConfig});
                  return null;
                }
              }).catch(error => {
                logError(MODULE_NAME, `error (auction "${auctionId}", adUnit "${adUnitCode}"):`, error);
                emit(EVENTS.PAAPI_ERROR, {auctionId, adUnitCode, error, auctionConfig});
                return null;
              });
          }
        }
        return bids?.[adUnitCode]?.then(res => [adUnitCode, res]);
      }).filter(e => e)
  ).then(result => Object.fromEntries(result));
}

getGlobal().getPAAPIBids = (filters) => getPAAPIBids(filters);

export const topLevelPAAPI = {
  name: MODULE_NAME,
  init(params) {
    getPAAPIConfig = params.getPAAPIConfig;
    expandFilters = params.expandFilters;
  },
  onAuctionConfig
};
submodule('paapi', topLevelPAAPI);
