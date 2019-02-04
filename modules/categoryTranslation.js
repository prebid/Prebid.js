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
import { hooks } from '../src/hook';
import { ajax } from '../src/ajax';
import { timestamp, logError, setDataInLocalStorage, getDataFromLocalStorage } from '../src/utils';

// TODO udpate url once it is uploaded on cdn
const DEFAULT_TRANSLATION_FILE_URL = 'https://api.myjson.com/bins/j5d0k';
const DEFAULT_IAB_TO_FW_MAPPING_KEY = 'iabToFwMappingkey';
const refreshInDays = 1;

export function getFreeWheelCategoryHook(fn, adUnitCode, bid) {
  if (!bid) {
    return fn.call(this, adUnitCode); // if no bid, call original and let it display warnings
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
        bid.meta.adServerCatId = (bid.meta.iabSubCatId) ? mapping.mapping[bid.meta.iabSubCatId] : undefined;
      }
    } else {
      logError('Translation mapping data not found in local storage');
    }
  }
  return fn.call(this, adUnitCode, bid);
}

export function initTranslation() {
  hooks['addBidResponse'].before(getFreeWheelCategoryHook, 50);
  let pubTranslationFile = config.getConfig('brandCategoryTranslation.translationFile');
  let url = (typeof pubTranslationFile !== 'undefined') ? pubTranslationFile : DEFAULT_TRANSLATION_FILE_URL;

  let mappingData = getDataFromLocalStorage(DEFAULT_IAB_TO_FW_MAPPING_KEY);
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
            setDataInLocalStorage(DEFAULT_IAB_TO_FW_MAPPING_KEY, JSON.stringify(mapping));
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

initTranslation();
