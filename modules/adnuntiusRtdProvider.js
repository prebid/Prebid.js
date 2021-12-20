import { getGlobal } from '../src/prebidGlobal.js';
import { submodule } from '../src/hook.js'
import { logError } from '../src/utils.js'
import { ajax } from '../src/ajax.js';

function init(config, userConsent) {
  if (!config.params) return false
  if (!config.params.providers) return false
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
  const pbjsG = getGlobal()
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
    pbjsG.setBidderConfig({
      bidders: config.params.bidders,
      config: ortbSegments
    });
  } else {
    pbjsG.setConfig(ortbSegments)
  }
}

function alterBidRequests(reqBidsConfigObj, callback, config, userConsent) {
  const providerRequests = config.params.providers.map(provider => prepProvider(provider))

  Promise.allSettled(providerRequests).then((values) => {
    const segments = values.reduce((segments, array) => (array.status === 'fulfilled') ? segments.concat(array.value.segments) : [], []).map(segmentId => ({ id: segmentId }))
    setGlobalConfig(config, segments)
    callback();
  })
    .catch(err => logError('ADN: err', err));
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
