/**
 * This module translates iab category to freewheel industry using translation mapping file
 * Publisher can set translation file by using setConfig method
 *
 * Example:
 * config.setConfig({
 *    'brandCategoryTranslation': {
 *      'translationFile': 'http://sample.com'
 *    }
 * });
 * If publisher has not defined translation file than prebid will use default prebid translation file provided here <TODO add url once it is uploaded on cdn>
 */

import { config } from '../src/config';
import { hooks, hook } from '../src/hook';
import { ajax } from '../src/ajax';
import { timestamp, logError, setDataInLocalStorage, getDataFromLocalStorage } from '../src/utils';

// TODO udpate url once it is uploaded on cdn
const DEFAULT_TRANSLATION_FILE_URL = 'https://api.myjson.com/bins/j5d0k';
const DEFAULT_IAB_TO_FW_MAPPING_KEY = 'iabToFwMappingkey';
const DEFAULT_IAB_TO_FW_MAPPING_KEY_PUB = 'iabToFwMappingkeyPub';
const refreshInDays = 1;

let adServerInUse;
export const registerAdserver = hook('async', function(adServer) {
  adServerInUse = adServer;
}, 'registerAdserver');

export function getAdserverCategoryHook(fn, adUnitCode, bid) {
  if (!bid) {
    return fn.call(this, adUnitCode); // if no bid, call original and let it display warnings
  }
  if (!adServerInUse) {
    registerAdserver();
  }

  if (bid.meta && !bid.meta.adServerCatId) {
    let mapping = getDataFromLocalStorage(DEFAULT_IAB_TO_FW_MAPPING_KEY);
    if (mapping) {
      try {
        mapping = JSON.parse(mapping);
      } catch (error) {
        logError('Failed to parse translation mapping file');
      }
      if (bid.meta) {
        bid.meta.adServerCatId = (bid.meta.iabSubCatId && mapping[adServerInUse] && mapping[adServerInUse]['mapping']) ? mapping[adServerInUse]['mapping'][bid.meta.iabSubCatId] : undefined;
      }
    } else {
      logError('Translation mapping data not found in local storage');
    }
  }
  fn.call(this, adUnitCode, bid);
}

export function initTranslation(...args) {
  hooks['addBidResponse'].before(getAdserverCategoryHook, 50);
  let url = DEFAULT_TRANSLATION_FILE_URL;
  let localStorageKey = DEFAULT_IAB_TO_FW_MAPPING_KEY;
  if (args && args.length > 0) {
    // use publisher defined translation file
    url = args[0];
    localStorageKey = DEFAULT_IAB_TO_FW_MAPPING_KEY_PUB;
  }

  let mappingData = getDataFromLocalStorage(localStorageKey);
  if (!mappingData || timestamp() < mappingData.lastUpdated + refreshInDays * 24 * 60 * 60 * 1000) {
    ajax(url,
      {
        success: (response) => {
          try {
            response = JSON.parse(response);
            let mapping = {
              lastUpdated: timestamp(),
              mapping: response.mapping
            }
            setDataInLocalStorage(localStorageKey, JSON.stringify(mapping));
          } catch (error) {
            logError('Failed to parse translation mapping file');
          }
        },
        error: () => {
          logError('Failed to load brand category translation file.')
        }
      },
    );
  }
}

function setConfig(config) {
  if (config.translationFile) {
    // if publisher has defined the translation file, preload that file here
    initTranslation(config.translationFile);
  }
}

initTranslation();
config.getConfig('brandCategoryTranslation', config => setConfig(config.brandCategoryTranslation));
