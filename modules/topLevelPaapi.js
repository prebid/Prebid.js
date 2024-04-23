import {submodule} from '../src/hook.js';
import {config} from '../src/config.js';
import {mergeDeep} from '../src/utils.js';
import {auctionStore} from '../libraries/weakStore/weakStore.js';
import {getGlobal} from '../src/prebidGlobal.js';
import {emit} from '../src/events.js';
import {EVENTS} from '../src/constants.js';

let getPAAPIConfig, expandFilters, moduleConfig;

const paapiBids = auctionStore();

config.getConfig('paapi', (cfg) => {
  moduleConfig = cfg.paapi?.topLevelSeller;
});

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
    Object.values(auctionConfigs).forEach(auctionConfig => {
      mergeDeep(auctionConfig, base);
    });
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
            bids[adUnitCode] = raa(auctionConfig).then(result => {
              if (result) {
                const bid = {
                  ...(auctionConfig.requestedSize || {}),
                  adUnitCode,
                  auctionId,
                  [typeof result === 'string' ? 'urn' : 'frameConfig']: result,
                }
                emit(EVENTS.PAAPI_BID, bid);
                return bid;
              } else {
                emit(EVENTS.PAAPI_NO_BID, {auctionId, adUnitCode});
                return null;
              }
            });
          }
        }
        return bids?.[adUnitCode] ? bids[adUnitCode].then(result => [adUnitCode, result]) : null;
      }).filter(e => e)
  ).then(result => Object.fromEntries(result));
}

getGlobal().getPAAPIBids = (filters) => getPAAPIBids(filters);

export const topLevelPAAPI = {
  name: 'topLevelPAAPI',
  init(params) {
    getPAAPIConfig = params.getPAAPIConfig;
    expandFilters = params.expandFilters;
  },
  onAuctionConfig
};
submodule('paapi', topLevelPAAPI);
