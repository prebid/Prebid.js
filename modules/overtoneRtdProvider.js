import { submodule } from '../src/hook.js';
import { ajaxBuilder } from '../src/ajax.js';
import { mergeDeep, safeJSONParse, logMessage } from '../src/utils.js';

export const OVERTONE_URL = 'https://prebid-1.overtone.ai/VendorService';

function log(...args) {
  logMessage('Overtone', ...args);
}

export async function fetchContextData(url = window.location.href) {
  const pageUrl = encodeURIComponent(url);
  const requestUrl = `${OVERTONE_URL}?pageUrl=${pageUrl}`;
  const request = window.ajaxBuilder || ajaxBuilder();

  return new Promise((resolve, reject) => {
    log('Sending request to:', requestUrl);
    request(requestUrl, {
      success: (response) => {
        const data = safeJSONParse(response);
        log('Fetched data:', data);

        if (!data || !data.vendor) {
          reject(new Error('Invalid response format'));
          return;
        }

        const segments = (data.sources && data.sources[0] && data.sources[0].segments)
          ? data.sources[0].segments.map(s => s.id)
          : [];

        resolve({ categories: segments });
      },
      error: (err) => {
        log('Error during request:', err);
        reject(err);
      },
    });
  });
}

function init(config) {
  log('init', config);
  return true;
}

export const overtoneRtdProvider = {
  name: 'overtone',
  init: init,
  getBidRequestData: function (bidReqConfig, callback) {
    fetchContextData()
      .then((contextData) => {
        if (contextData) {
          log('Fetched context data', contextData);
          mergeDeep(bidReqConfig.ortb2Fragments.global, {
            site: { ext: { data: { overtone: contextData } } }
          });
        }
        callback();
      })
      .catch((error) => {
        log('Error fetching context data', error);
        callback();
      });
  },
};

submodule('realTimeData', overtoneRtdProvider);

export const overtoneModule = {
  fetchContextData,
};
