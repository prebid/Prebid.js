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
  return Object.assign({
    resolveToConfig: false
  }, moduleConfig.auctionConfig);
}

function onAuctionConfig(auctionId, auctionConfigs) {
  if (moduleConfig) {
    const base = getBaseAuctionConfig();
    Object.values(auctionConfigs).forEach(auctionConfig => {
      mergeDeep(auctionConfig, base, auctionConfig);
    });
  }
}

/**
 * Returns the PAAPI runAdAuction result for the given filters, as a map from ad unit code to auction result
 * (either a URN or a FencedFrameConfig, depending on the configured auction config).
 *
 * @param filters
 * @param raa
 * @return {Promise<{[p: string]: any}>}
 */
export function getPAAPIBids(filters, raa = (...args) => navigator.runAdAuction(...args)) {
  return Promise.all(
    Object.entries(expandFilters(filters))
      .map(([adUnitCode, auctionId]) => [adUnitCode, auctionId, paapiBids(auctionId)])
      .filter(([_1, _2, bids]) => bids)
      .map(([adUnitCode, auctionId, bids]) => {
        if (!bids.hasOwnProperty(adUnitCode)) {
          const auctionConfig = getPAAPIConfig({adUnitCode, auctionId})[adUnitCode];
          if (auctionConfig) {
            emit(EVENTS.RUN_PAAPI_AUCTION, {
              auctionId,
              adUnitCode,
              auctionConfig
            });
            bids[adUnitCode] = raa(auctionConfig).then(bid => {
              const evt = {auctionId, adUnitCode};
              if (bid) Object.assign(evt, {bid})
              emit(bid ? EVENTS.PAAPI_BID : EVENTS.PAAPI_NO_BID, evt);
              return bid;
            });
          }
        }
        return bids[adUnitCode] ? bids[adUnitCode].then(result => [adUnitCode, result]) : Promise.resolve();
      })
  ).then(result => Object.fromEntries(result.filter(r => r)));
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
