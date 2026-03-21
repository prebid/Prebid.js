import { submodule } from '../src/hook.js';
import { ajaxBuilder } from '../src/ajax.js';
import { safeJSONParse, logMessage as _logMessage } from '../src/utils.js';

export const OVERTONE_URL = 'https://prebid-1.overtone.ai/VendorService';

const logMessage = (...args) => {
  _logMessage('Overtone', ...args);
};

export async function fetchContextData(url = window.location.href) {
  const pageUrl = encodeURIComponent(url);
  const requestUrl = `${OVERTONE_URL}?pageUrl=${pageUrl}`;
  const request = window.ajaxBuilder || ajaxBuilder();

  return new Promise((resolve, reject) => {
    logMessage('Sending request to:', requestUrl);
    request(requestUrl, {
      success: (response) => {
        const data = safeJSONParse(response);
        logMessage('Fetched data:', data);

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
        logMessage('Error during request:', err);
        reject(err);
      },
    });
  });
}

function init(config) {
  logMessage('init', config);
  return true;
}

export const overtoneRtdProvider = {
  name: 'overtone',
  init: init,
  getBidRequestData: function (bidReqConfig, callback) {
    fetchContextData()
      .then((contextData) => {
        if (contextData) {
          logMessage('Fetched context data', contextData);
          bidReqConfig.ortb2Fragments.global.site.ext = {
            ...bidReqConfig.ortb2Fragments.global.site.ext,
            data: contextData,
          };
        }
        callback();
      })
      .catch((error) => {
        logMessage('Error fetching context data', error);
        callback();
      });
  },
};

submodule('realTimeData', overtoneRtdProvider);

export const overtoneModule = {
  fetchContextData,
};
