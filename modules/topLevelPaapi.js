import {submodule} from '../src/hook.js';
import {config} from '../src/config.js';
import {mergeDeep} from '../src/utils.js';

let getPAAPIConfig, moduleConfig;

config.getConfig('paapi', (cfg) => {
  moduleConfig = cfg.paapi?.topLevelSeller;
})

function onAuctionConfig(auctionId, aucitonConfigs) {
  if (moduleConfig) {
    Object.values(aucitonConfigs).forEach(auctionConfig => {
      mergeDeep(auctionConfig, moduleConfig?.auctionConfig || {}, auctionConfig);
    })
  }
}

export function getPAAPIBids({adUnitCode, auctionId}) {

}

export const topLevelPAAPI = {
  name: 'topLevelPAAPI',
  init(params) {
    getPAAPIConfig = params.getPAAPIConfig;
  },
  onAuctionConfig
}
submodule('paapi', topLevelPAAPI);
