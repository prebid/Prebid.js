/**
* This module adds the carbon provider to the Real Time Data module (rtdModule)
* The {@link module:modules/realTimeData} module is required
* The module will add contextual and audience targeting data to bid requests
* @module modules/carbonRtdProvider
* @requires module:modules/realTimeData
*/
import { submodule } from '../src/hook.js';
import { ajax } from '../src/ajax.js';
import {getGlobal} from '../src/prebidGlobal.js';
import { logError, isGptPubadsDefined, generateUUID } from '../src/utils.js';
import { getStorageManager } from '../src/storageManager.js';
import { MODULE_TYPE_RTD } from '../src/activities/modules.js';

const CARBON_GVL_ID = 493;
const MODULE_NAME = 'carbon'
const MODULE_VERSION = 'v1.0'
const STORAGE_KEY = 'carbon_data'
const PROFILE_ID_KEY = 'carbon_ccuid'

let rtdHost = '';
let parentId = '';
let targetingData = null;
let features = {};

export const storage = getStorageManager({moduleType: MODULE_TYPE_RTD, moduleName: MODULE_NAME, gvlid: CARBON_GVL_ID});

export function setLocalStorage(carbonData) {
  if (storage.localStorageIsEnabled()) {
    let data = JSON.stringify(carbonData);
    storage.setDataInLocalStorage(STORAGE_KEY, data);
  }
}

export function updateProfileId(carbonData) {
  let identity = carbonData?.profile?.identity;
  if (identity?.update && identity?.id != '' && storage.localStorageIsEnabled()) {
    storage.setDataInLocalStorage(PROFILE_ID_KEY, identity.id);
  }
}

export function matchCustomTaxonomyRule(rule) {
  const contentText = window.top.document.body.innerText;
  if (rule.MatchType == 'any') {
    let words = Object.keys(rule.WordWeights).join('|');

    let regex = RegExp('\\b' + words + '\\b', 'i');
    let result = contentText.match(regex);

    if (result) {
      return true
    }
  } else if (rule.MatchType == 'minmatch') {
    let score = 0;
    let words = Object.keys(rule.WordWeights).join('|');

    let regex = RegExp('\\b' + words + '\\b', 'gi');
    let result = contentText.match(regex);

    if (result?.length) {
      for (let match of result) {
        let point = rule.WordWeights[match];
        if (!isNaN(point)) {
          score += point;
        }

        if (score >= rule.MatchValue) {
          return true;
        }
      }
    }
  }

  return false;
}

export function matchCustomTaxonomy(rules) {
  let matchedRules = rules.filter(matchCustomTaxonomyRule);
  return matchedRules.map(x => x.Id);
}

export function prepareGPTTargeting(carbonData) {
  if (isGptPubadsDefined()) {
    setGPTTargeting(carbonData)
  } else {
    window.googletag = window.googletag || {};
    window.googletag.cmd = window.googletag.cmd || [];
    window.googletag.cmd.push(() => setGPTTargeting(carbonData));
  }
}

export function setGPTTargeting(carbonData) {
  if (Array.isArray(carbonData?.profile?.audiences) && features?.audience?.pushGpt) {
    window.googletag.pubads().setTargeting('carbon_segment', carbonData.profile.audiences);
  }

  if (Array.isArray(carbonData?.context?.pageContext?.contextualclassifications) && features?.context?.pushGpt) {
    let contextSegments = carbonData.context.pageContext.contextualclassifications.map(x => {
      if (x.type && x.type == 'iab_intent' && x.id) {
        return x.id;
      }
    }).filter(x => x != undefined);
    window.googletag.pubads().setTargeting('cc-iab-class-id', contextSegments);
  }

  if (Array.isArray(carbonData?.context?.customTaxonomy) && features?.customTaxonomy?.pushGpt) {
    let customTaxonomyResults = matchCustomTaxonomy(carbonData.context.customTaxonomy);
    window.googletag.pubads().setTargeting('cc-custom-taxonomy', customTaxonomyResults);
  }
}

export function fetchRealTimeData() {
  let doc = window.top.document;
  let pageUrl = `${doc.location.protocol}//${doc.location.host}${doc.location.pathname}`;

  // generate an arbitrary ID if storage is blocked so that contextual data can still be retrieved
  let profileId = storage.getDataFromLocalStorage(PROFILE_ID_KEY) || generateUUID();

  let reqUrl = new URL(`${rtdHost}/${MODULE_VERSION}/realtime/${parentId}`);
  reqUrl.searchParams.append('profile_id', profileId);
  reqUrl.searchParams.append('url', encodeURIComponent(pageUrl));

  if (getGlobal().getUserIdsAsEids && typeof getGlobal().getUserIdsAsEids == 'function') {
    let eids = getGlobal().getUserIdsAsEids();

    if (eids && eids.length) {
      eids.forEach(eid => {
        if (eid?.uids?.length) {
          eid.uids.forEach(uid => {
            reqUrl.searchParams.append('eid', `${eid.source}:${uid.id}`)
          });
        }
      });
    }
  }

  reqUrl.searchParams.append('context', (typeof features?.context?.active === 'undefined') ? true : features.context.active);
  if (features?.context?.limit && features.context.limit > 0) {
    reqUrl.searchParams.append('contextLimit', features.context.limit);
  }

  reqUrl.searchParams.append('audience', (typeof features?.audience?.active === 'undefined') ? true : features.audience.active);
  if (features?.audience?.limit && features.audience.limit > 0) {
    reqUrl.searchParams.append('audienceLimit', features.audience.limit);
  }

  reqUrl.searchParams.append('deal_ids', (typeof features?.dealId?.active === 'undefined') ? true : features.dealId.active);
  if (features?.dealId?.limit && features.dealId.limit > 0) {
    reqUrl.searchParams.append('dealIdLimit', features.dealId.limit);
  }

  reqUrl.searchParams.append('custom_taxonomy', (typeof features?.customTaxonomy?.active === 'undefined') ? true : features.customTaxonomy.active);
  if (features?.customTaxonomy?.limit && features.customTaxonomy.limit > 0) {
    reqUrl.searchParams.append('customTaxonomyLimit', features.customTaxonomy.limit);
  }

  ajax(reqUrl, {
    success: function (response, req) {
      let carbonData = {};
      if (req.status === 200) {
        try {
          carbonData = JSON.parse(response);
        } catch (e) {
          logError('unable to parse API response');
        }

        targetingData = carbonData;
        setLocalStorage(carbonData);
      }
    },
    error: function () {
      logError('failed to retrieve targeting information');
    }
  },
  null, {
    method: 'GET',
    withCredentials: true,
    crossOrigin: true
  });
}

export function bidRequestHandler(bidReqConfig, callback, config, userConsent) {
  try {
    let carbonData = targetingData || JSON.parse(storage.getDataFromLocalStorage(STORAGE_KEY) || '{}');

    if (carbonData) {
      prepareGPTTargeting(carbonData);
    }

    callback();
  } catch (err) {
    logError(err);
  }
}

function init(moduleConfig, userConsent) {
  if (moduleConfig?.params?.parentId) {
    parentId = moduleConfig.params.parentId;
  } else {
    logError('required config value "parentId" not provided');
    return false;
  }

  if (moduleConfig?.params?.endpoint) {
    rtdHost = moduleConfig.params.endpoint;
  } else {
    logError('required config value "endpoint" not provided');
    return false;
  }

  features = moduleConfig?.params?.features || features;
  fetchRealTimeData();

  return true;
}

/** @type {RtdSubmodule} */
export const carbonSubmodule = {
  name: MODULE_NAME,
  getBidRequestData: bidRequestHandler,
  init: init
};

submodule('realTimeData', carbonSubmodule);
