import fs from 'fs';
import {getGvl, isValidGvlId} from './gvl.mjs';

const LOCAL_DISCLOSURE_PATTERN = /^local:\/\//;
const LOCAL_DISCLOSURE_PATH = './metadata/disclosures/'
const LOCAL_DISCLOSURES_URL = 'https://cdn.jsdelivr.net/gh/prebid/Prebid.js/metadata/disclosures/';

const PARSE_ERROR_LINES = 20;


export async function getDisclosureUrl(gvlId, gvl = getGvl) {
  if (await isValidGvlId(gvlId, gvl)) {
    return (await gvl()).vendors[gvlId]?.deviceStorageDisclosureUrl;
  }
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

function retryOn5xx(url, intervals = [500, 2000], retry = -1) {
  return fetch(url)
    .then(resp => resp.status >= 500 ? new TemporaryFailure(resp) : resp)
    .catch(err => new TemporaryFailure(err))
    .then(response => {
      if (response instanceof TemporaryFailure) {
        retry += 1;
        if (intervals.length === retry) {
          console.error(`Could not fetch "${url}" (max retries exceeded)`, response.response);
          return Promise.reject(response.response);
        } else {
          console.warn(`Could not fetch "${url}", retrying in ${intervals[retry]}ms...`, response.response)
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

const errors = [];

export function logErrorSummary() {
  if (errors.length > 0) {
    console.error('Some disclosures could not be determined:\n')
  }
  errors.forEach(({error, type, metadata}) => {
    console.error(` - ${type} failed for "${metadata.componentType}.${metadata.componentName}" (gvl id: ${metadata.gvlid}, disclosureURL: "${metadata.disclosureURL}"), error: `, error);
    console.error('');
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
            disclosure = JSON.stringify(disclosure, null, 2).split('\n');
            console.error(
              `Could not parse disclosure for ${metadata.componentName}:`,
              disclosure
                .slice(0, PARSE_ERROR_LINES)
                .concat(disclosure.length > PARSE_ERROR_LINES ? [`[ ... ${disclosure.length - PARSE_ERROR_LINES} lines omitted ... ]`] : [])
                .join('\n')
            );
            errors.push({
              metadata,
              error: e,
              type: 'parse'
            })
            return null;
          }
        })
        .catch((err) => {
          errors.push({
            error: err,
            metadata,
            type: 'fetch'
          })
          console.error(`Could not fetch disclosure for "${metadata.componentName}"`, err);
          return null;
        })
    }
    return disclosures[url];
  }

})();
