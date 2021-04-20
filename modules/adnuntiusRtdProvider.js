import { getGlobal } from '../src/prebidGlobal.js';
import { submodule } from '../src/hook.js'
import { logMessage } from '../src/utils.js'
import { ajax } from '../src/ajax.js';

const tzo = new Date().getTimezoneOffset();
let SEGMENT_LIST = []
const ADN_USER_ID = JSON.parse(window.localStorage.getItem('adn.data')).browserId
const ADN_URL = 'https://data.adnuntius.com/usr?tzo=' + tzo + '&browserId=' + ADN_USER_ID + '&folderId=';
function init(config, userConsent) {
  return true;
}

const providers = {
  adnuntius: {
    url: 'https://data.adnuntius.com/usr?tzo=' + tzo + '&browserId=' + ADN_USER_ID + '&folderId=',
    function: function (res) {
      logMessage(res)
      return res
    },
  },
  novatiq: {
    url: 'https://novatiq.consumor.io/segments/v1/novademo/45340f6d-d9ee-4ee9-b785-36f3e30ff1599999',
    function: function (res) {
      logMessage(res)
      return res
    },
  }
}

function prepProvider(provider) {
  return new Promise((resolve, reject) => {
    ajax(providers[provider].url, {
      success: function (res) { resolve(providers[provider].function(res)) },
      error: function (err) { reject(err) }
    })
  });
}

function alterBidRequests(reqBidsConfigObj, callback, config, userConsent) {
  const pbjsG = getGlobal()
  const params = config.params
  const affectedBidders = (params.bidders) ? Object.keys(params.bidders).filter(function (bidder) {
    return params.bidders[bidder] == true
  }) : []
  const affectedProviders = (params.providers) ? Object.keys(params.providers).filter(function (provider) {
    return params.providers[provider]
  }) : []

  logMessage('ADN: UID', pbjsG.getUserIds())
  logMessage('ADN: CONF:', config)
  logMessage('ADN: CONF: reqbidconf', reqBidsConfigObj)
  logMessage('ADN: Providers:', affectedProviders)

  Promise.all([prepProvider('novatiq')]).then((values) => {
    logMessage('ADN: PROMISE', values);
  });

  ajax(ADN_URL + config.params.folderId, {
    success: function (response, req) {
      const segments = JSON.parse(response).segments
      SEGMENT_LIST = [...SEGMENT_LIST, ...segments]
      pbjsG.setBidderConfig({
        bidders: affectedBidders,
        config: {
          segments: SEGMENT_LIST
        }
      });
      callback();
    }
  });
}

/** @type {RtdSubmodule} */
export const adnuntiusSubmodule = {
  name: 'adnuntius',
  init: init,
  getBidRequestData: alterBidRequests,
};

export function beforeInit() {
  submodule('realTimeData', adnuntiusSubmodule);
}

beforeInit();
