import { submodule } from '../src/hook.js';
import { ajaxBuilder } from '../src/ajax.js';
import { safeJSONParse, logMessage as _logMessage } from '../src/utils.js';

export const OVERTONE_URL = 'https://prebid-1.overtone.ai/contextual';

const logMessage = (...args) => {
  _logMessage('Overtone', ...args);
};

export async function fetchContextData(url = window.location.href) {
  const pageUrl = encodeURIComponent(url);
  const requestUrl = `${OVERTONE_URL}?URL=${pageUrl}&InApp=False`;
  const request = window.ajaxBuilder || ajaxBuilder();

  return new Promise((resolve, reject) => {
    logMessage('Sending request to:', requestUrl);
    request(requestUrl, {
      success: (response) => {
        const data = safeJSONParse(response);
        logMessage('Fetched data:', data);

        if (!data || typeof data.status !== 'number') {
          reject(new Error('Invalid response format'));
          return;
        }

        switch (data.status) {
          case 1: // Success
            resolve({ categories: data.categories || [] });
            break;
          case 3: // Fail
          case 4: // Ignore
            resolve({ categories: [] });
            break;
          default:
            reject(new Error(`Unexpected response status: ${data.status}`));
        }
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
          if (!bidReqConfig.ortb2Fragments.global.site.ext) {
            bidReqConfig.ortb2Fragments.global.site.ext = {};
          }

          bidReqConfig.ortb2Fragments.global.site.ext.data = contextData;
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
