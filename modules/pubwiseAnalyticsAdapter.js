import {ajax} from '../src/ajax.js';
import adapter from '../src/AnalyticsAdapter.js';
import adapterManager from '../src/adapterManager.js';
import CONSTANTS from '../src/constants.json';
import { getStorageManager } from '../src/storageManager.js';
const utils = require('../src/utils.js');

const storage = getStorageManager();

/****
 * PubWise.io Analytics
 * Contact: support@pubwise.io
 * Developer: Stephen Johnston
 *
 * For testing:
 *
 pbjs.enableAnalytics({
  provider: 'pubwise',
  options: {
    site: 'test-test-test-test',
    endpoint: 'https://api.pubwise.io/api/v4/event/add/',
  }
 });
 */

const analyticsType = 'endpoint';
const analyticsName = 'PubWise Analytics: ';
let defaultUrl = 'https://api.pubwise.io/api/v4/event/default/';
let pubwiseVersion = '3.0';
let pubwiseSchema = 'AVOCET';
let configOptions = {site: '', endpoint: 'https://api.pubwise.io/api/v4/event/default/', debug: ''};
let pwAnalyticsEnabled = false;
let utmKeys = {utm_source: '', utm_medium: '', utm_campaign: '', utm_term: '', utm_content: ''};

function markEnabled() {
  utils.logInfo(`${analyticsName}Enabled`, configOptions);
  pwAnalyticsEnabled = true;
}

function enrichWithMetrics(dataBag) {
  try {
    dataBag['pw_version'] = pubwiseVersion;
    dataBag['pbjs_version'] = $$PREBID_GLOBAL$$.version;
    dataBag['debug'] = configOptions.debug;
  } catch (e) {
    dataBag['error_metric'] = 1;
  }

  return dataBag;
}

function enrichWithUTM(dataBag) {
  let newUtm = false;
  try {
    for (let prop in utmKeys) {
      utmKeys[prop] = utils.getParameterByName(prop);
      if (utmKeys[prop] != '') {
        newUtm = true;
        dataBag[prop] = utmKeys[prop];
      }
    }

    if (newUtm === false) {
      for (let prop in utmKeys) {
        let itemValue = storage.getDataFromLocalStorage(`pw-${prop}`);
        if (itemValue.length !== 0) {
          dataBag[prop] = itemValue;
        }
      }
    } else {
      for (let prop in utmKeys) {
        storage.setDataInLocalStorage(`pw-${prop}`, utmKeys[prop]);
      }
    }
  } catch (e) {
    utils.logInfo(`${analyticsName}Error`, e);
    dataBag['error_utm'] = 1;
  }
  return dataBag;
}

function sendEvent(eventType, data) {
  utils.logInfo(`${analyticsName}Event ${eventType} ${pwAnalyticsEnabled}`, data);

  // put the typical items in the data bag
  let dataBag = {
    eventType: eventType,
    args: data,
    target_site: configOptions.site,
    pubwiseSchema: pubwiseSchema,
    debug: configOptions.debug ? 1 : 0,
  };

  dataBag = enrichWithMetrics(dataBag);
  // for certain events, track additional info
  if (eventType == CONSTANTS.EVENTS.AUCTION_INIT) {
    dataBag = enrichWithUTM(dataBag);
  }

  ajax(configOptions.endpoint, (result) => utils.logInfo(`${analyticsName}Result`, result), JSON.stringify(dataBag));
}

let pubwiseAnalytics = Object.assign(adapter(
  {
    defaultUrl,
    analyticsType
  }),
{
  // Override AnalyticsAdapter functions by supplying custom methods
  track({eventType, args}) {
    sendEvent(eventType, args);
  }
});

pubwiseAnalytics.adapterEnableAnalytics = pubwiseAnalytics.enableAnalytics;

pubwiseAnalytics.enableAnalytics = function (config) {
  if (config.options.debug === undefined) {
    config.options.debug = utils.debugTurnedOn();
  }
  configOptions = config.options;
  markEnabled();
  pubwiseAnalytics.adapterEnableAnalytics(config);
};

adapterManager.registerAnalyticsAdapter({
  adapter: pubwiseAnalytics,
  code: 'pubwise'
});

export default pubwiseAnalytics;
