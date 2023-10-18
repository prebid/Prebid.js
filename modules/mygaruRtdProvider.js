/**
 * This module adds MyGaru Real Time User Sync to the User ID module
 * The {@link module:modules/realTimeData} module is required
 * @module modules/mygaruRtdProvider
 * @requires module:modules/realTimeData
 */

import * as ajax from '../src/ajax.js';
import { submodule } from '../src/hook.js';
import { deepAccess, deepSetValue } from '../src/utils.js';

const syncUrl = 'https://ident.mygaru.com/v2/id';

function buildUrl(opts) {
  const queryPairs = [];
  for (let key in opts) {
    if (opts[key] !== undefined) {
      queryPairs.push(`${key}=${encodeURIComponent(opts[key])}`);
    }
  }
  return `${syncUrl}?${queryPairs.join('&')}`;
}

/**
 * gets ID from remote address
 * @param {string} url
 * @return {Promise<string|null>}
 */
function requestRemoteIdAsync(url) {
  return new Promise((resolve) => {
    ajax.ajaxBuilder()(
      url,
      response => {
        const jsonResponse = JSON.parse(response);
        const { iuid } = jsonResponse;
        resolve(iuid);
      },
      () => {
        resolve(null);
      },
      {
        method: 'GET',
        contentType: 'application/json'
      }
    );
  });
}

/**
 * Injects MyGaru User ID to the bid request
 * @param {{adUnits:{bids:{userIdAsEids?:{}[]}}[]}} reqBidsConfigObj
 * @param {string|null} mygaruId
 */
function injectUid(reqBidsConfigObj, mygaruId) {
  if (!mygaruId) return;
  mygaruId = mygaruId.toString();
  const adUnits = deepAccess(reqBidsConfigObj, 'adUnits', [])
  adUnits.forEach(adUnit => {
    const bids = deepAccess(adUnit, 'bids', [])
    bids.forEach(bid => {
      deepSetValue(bid, 'userId.mygaruId', mygaruId)
      bid.userIdAsEids = bid.userIdAsEids || [];
      bid.userIdAsEids.push({ source: 'mygaru.com', uids: [{ id: mygaruId, atype: 1 }] })
    })
  })
}

function getMyGaruUrl(consentData) {
  const gdprApplies = consentData && typeof consentData.gdprApplies === 'boolean' && consentData.gdprApplies ? 1 : 0;
  const gdprConsentString = gdprApplies ? consentData.consentString : undefined;
  return buildUrl({
    gdprApplies,
    gdprConsentString
  });
}

/** @type {RtdSubmodule} */
export const mygaruSubmodule = {
  name: 'mygaru',
  init: () => true,
  getBidRequestData(reqBidsConfigObj, callback, moduleConfig, consentData) {
    const url = getMyGaruUrl(consentData);

    requestRemoteIdAsync(url)
      .then(mygaruId => {
        injectUid(reqBidsConfigObj, mygaruId)
      })
      .then(callback)
      .catch(callback)
  }
};

submodule('realTimeData', mygaruSubmodule);
