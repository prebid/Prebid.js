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
 * If publisher has not defined translation file than prebid will use default prebid translation file provided here //cdn.jsdelivr.net/gh/prebid/category-mapping-file@1/freewheel-mapping.json
 */

import { config } from '../src/config.js';
import { setupBeforeHookFnOnce, hook } from '../src/hook.js';
import { ajax } from '../src/ajax.js';
import { timestamp, logError } from '../src/utils.js';
import { addBidResponse } from '../src/auction.js';
import { getCoreStorageManager } from '../src/storageManager.js';

export const storage = getCoreStorageManager('categoryTranslation');
const DEFAULT_TRANSLATION_FILE_URL = 'https://cdn.jsdelivr.net/gh/prebid/category-mapping-file@1/freewheel-mapping.json';
const DEFAULT_IAB_TO_FW_MAPPING_KEY = 'iabToFwMappingkey';
const DEFAULT_IAB_TO_FW_MAPPING_KEY_PUB = 'iabToFwMappingkeyPub';
const refreshInDays = 1;

export const registerAdserver = hook('async', function(adServer) {
  let url;
  if (adServer === 'freewheel') {
    url = DEFAULT_TRANSLATION_FILE_URL;
    initTranslation(url, DEFAULT_IAB_TO_FW_MAPPING_KEY);
  }
}, 'registerAdserver');
registerAdserver();

export function getAdserverCategoryHook(fn, adUnitCode, bid) {
  if (!bid) {
    return fn.call(this, adUnitCode); // if no bid, call original and let it display warnings
  }

  if (!config.getConfig('adpod.brandCategoryExclusion')) {
    return fn.call(this, adUnitCode, bid);
  }

  let localStorageKey = (config.getConfig('brandCategoryTranslation.translationFile')) ? DEFAULT_IAB_TO_FW_MAPPING_KEY_PUB : DEFAULT_IAB_TO_FW_MAPPING_KEY;

  if (bid.meta && !bid.meta.adServerCatId) {
    let mapping = storage.getDataFromLocalStorage(localStorageKey);
    if (mapping) {
      try {
        mapping = JSON.parse(mapping);
      } catch (error) {
        logError('Failed to parse translation mapping file');
      }
      if (bid.meta.iabSubCatId && mapping['mapping'] && mapping['mapping'][bid.meta.iabSubCatId]) {
        bid.meta.adServerCatId = mapping['mapping'][bid.meta.iabSubCatId]['id'];
      } else {
        // This bid will be automatically ignored by adpod module as adServerCatId was not found
        bid.meta.adServerCatId = undefined;
      }
    } else {
      logError('Translation mapping data not found in local storage');
    }
  }
  fn.call(this, adUnitCode, bid);
}

export function initTranslation(url, localStorageKey) {
  setupBeforeHookFnOnce(addBidResponse, getAdserverCategoryHook, 50);
  let mappingData = storage.getDataFromLocalStorage(localStorageKey);
  if (!mappingData || timestamp() < mappingData.lastUpdated + refreshInDays * 24 * 60 * 60 * 1000) {
    ajax(url,
      {
        success: (response) => {
          try {
            response = JSON.parse(response);
            response['lastUpdated'] = timestamp();
            storage.setDataInLocalStorage(localStorageKey, JSON.stringify(response));
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
    initTranslation(config.translationFile, DEFAULT_IAB_TO_FW_MAPPING_KEY_PUB);
  }
}

config.getConfig('brandCategoryTranslation', config => setConfig(config.brandCategoryTranslation));
