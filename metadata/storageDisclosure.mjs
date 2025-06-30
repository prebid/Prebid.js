import fs from 'fs';

const GVL_URL = 'https://vendor-list.consensu.org/v3/vendor-list.json';
const LOCAL_DISCLOSURE_PATTERN = /^local:\/\//;
const LOCAL_DISCLOSURE_PATH = './metadata/disclosures/'
const LOCAL_DISCLOSURES_URL = 'https://cdn.jsdelivr.net/gh/prebid/Prebid.js/metadata/disclosures/';

export const getGvl = (() => {
  let gvl;
  return function () {
    if (gvl == null) {
      gvl = fetch(GVL_URL)
        .then(resp => resp.json())
        .catch((err) => {
          gvl = null;
          return Promise.reject(err);
        });
    }
    return gvl;
  };
})();

export function getDisclosureUrl(gvlId) {
  return getGvl().then(gvl => {
    return gvl.vendors[gvlId]?.deviceStorageDisclosureUrl;
  });
}

function parseDisclosure(payload) {
  // filter out all disclosures except those pertaining the 1st party (domain: '*')
  return payload.disclosures.filter((disclosure) => {
    const {domain, domains} = disclosure;
    if (domain === '*' || domains?.includes('*')) {
      delete disclosure.domain;
      delete disclosure.domains;
      return ['web', 'cookie'].includes(disclosure.type) && disclosure.identifier && /[^*]/.test(disclosure.identifier);
    }
  });
}

class TemporaryFailure {
  constructor(reponse) {
    this.response = reponse;
  }
}

/**
 *
 * @param url
 * @param intervals
 * @param retry
 */
function retryOn5xx(url, intervals = [500, 2000], retry = -1) {
  return fetch(url)
    .then(resp => resp.status >= 500 ? new TemporaryFailure(resp) : resp)
    .catch(err => new TemporaryFailure(err))
    .then(response => {
      if (response instanceof TemporaryFailure) {
        retry += 1;
        if (intervals.length === retry) {
          console.error(`Could not fetch "${url}"`, response.response);
          return Promise.reject(response.response);
        } else {
          return new Promise((resolve) => setTimeout(resolve, intervals[retry]))
            .then(() => retryOn5xx(url, intervals, retry));
        }
      } else {
        return response;
      }
    });
}

function fetchUrl(url) {
  return retryOn5xx(url)
    .then(resp => {
      if (!resp.ok) {
        return Promise.reject(resp);
      }
      return resp.json();
    })
}

function readFile(fileName) {
  return new Promise((resolve, reject) => {
    fs.readFile(fileName, (error, data) => {
      if (error) {
        reject(error);
      } else {
        resolve(JSON.parse(data.toString()));
      }
    })
  })
}

export const fetchDisclosure = (() => {
  const disclosures = {};
  return function (metadata) {
    const url = metadata.disclosureURL;
    const isLocal = LOCAL_DISCLOSURE_PATTERN.test(url);
    if (isLocal) {
      metadata.disclosureURL = url.replace(LOCAL_DISCLOSURE_PATTERN, LOCAL_DISCLOSURES_URL);
    }
    if (!disclosures.hasOwnProperty(url)) {
      console.info(`Fetching disclosure for "${metadata.componentType}.${metadata.componentName}" (gvl ID: ${metadata.gvlid}) from "${url}"...`);
      let disclosure;
      if (isLocal) {
        const fileName = url.replace(LOCAL_DISCLOSURE_PATTERN, LOCAL_DISCLOSURE_PATH)
        disclosure = readFile(fileName);
      } else {
        disclosure = fetchUrl(url);
      }
      disclosures[url] = disclosure
        .then(disclosure => {
          try {
            return parseDisclosure(disclosure);
          } catch (e) {
            console.error(`Could not parse disclosure for ${metadata.componentName}`, disclosure);
          }
        }).catch((err) => {
          console.error(`Could not fetch disclosure for "${metadata.componentName}"`, err);
          return null;
        });
    }
    return disclosures[url];
  }

})();
