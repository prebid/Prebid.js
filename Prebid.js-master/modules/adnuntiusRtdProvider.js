
import { submodule } from '../src/hook.js'
import { logError, logInfo } from '../src/utils.js'
import { ajax } from '../src/ajax.js';

import { config as sourceConfig } from '../src/config.js';

const GVLID = 855;

function init(config, userConsent) {
  if (!config.params || !config.params.providers) return false
  logInfo(userConsent)
  return true;
}

// Make sure that ajax has a function as callback
function prepProvider(provider) {
  // Map parameter to something that adnuntius endpoint understands.
  const mappedParameters = {
    siteId: 's',
    userId: 'browserId',
    browserId: 'browserId',
    folderId: 'folderId'
  }

  const tzo = new Date().getTimezoneOffset();
  const URL = ['https://data.adnuntius.com/usr?tzo=' + tzo]
  Object.keys(provider).forEach(key => {
    URL.push(`${mappedParameters[key]}=${provider[key]}`)
  })

  return new Promise((resolve, reject) => {
    ajax(URL.join('&'), {
      success: function (res) {
        const response = JSON.parse(res)
        resolve(response)
      },
      error: function (err) { reject(err) }
    });
  });
}

function setGlobalConfig(config, segments) {
  const ortbSegments = {
    ortb2: {
      user: {
        data: [{
          name: 'adnuntius',
          segment: segments
        }]
      }
    }
  }
  if (config.params && config.params.bidders) {
    sourceConfig.mergeBidderConfig({
      bidders: config.params.bidders,
      config: ortbSegments
    })
  } else {
    sourceConfig.mergeConfig(ortbSegments)
  }
}

function alterBidRequests(reqBidsConfigObj, callback, config, userConsent) {
  const gdpr = userConsent && userConsent.gdpr;
  let allowedToRun = true
  if (gdpr) {
    if (userConsent.gdpr.gdprApplies) {
      if (gdpr.gdprApplies && !gdpr.vendorData.vendorConsents[GVLID]) allowedToRun = false;
    }
  }
  if (allowedToRun) {
    const providerRequests = config.params.providers.map(provider => prepProvider(provider))

    Promise.allSettled(providerRequests).then((values) => {
      const segments = values.reduce((segments, array) => (array.status === 'fulfilled') ? segments.concat(array.value.segments) : [], []).map(segmentId => ({ id: segmentId }))
      setGlobalConfig(config, segments)
      callback();
    })
      .catch(err => logError('ADN: err', err));
  } else callback();
}

/** @type {RtdSubmodule} */
export const adnuntiusSubmodule = {
  name: 'adnuntius',
  init: init,
  getBidRequestData: alterBidRequests,
  setGlobalConfig: setGlobalConfig,
};

export function beforeInit() {
  submodule('realTimeData', adnuntiusSubmodule);
}

beforeInit();
