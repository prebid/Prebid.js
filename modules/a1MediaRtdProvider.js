import { MODULE_TYPE_RTD } from '../src/activities/modules.js';
import { loadExternalScript } from '../src/adloader.js';
import { submodule } from '../src/hook.js';
import { getStorageManager } from '../src/storageManager.js';
import { isEmptyStr, mergeDeep } from '../src/utils.js';

/**
 * @typedef {import('../modules/rtdModule/index.js').RtdSubmodule} RtdSubmodule
 */

const REAL_TIME_MODULE = 'realTimeData';
const MODULE_NAME = 'a1Media';
const SCRIPT_URL = 'https://linkback.contentsfeed.com/src';
export const A1_SEG_KEY = '__a1tg';
export const A1_AUD_KEY = 'a1_gid';

export const storage = getStorageManager({moduleType: MODULE_TYPE_RTD, moduleName: MODULE_NAME});

/** @type {RtdSubmodule} */
export const subModuleObj = {
  name: MODULE_NAME,
  init: init,
  getBidRequestData: alterBidRequests,
};

export function getStorageData(key) {
  let storageValue = '';
  if (storage.getDataFromLocalStorage(key)) {
    storageValue = storage.getDataFromLocalStorage(key);
  } else if (storage.getCookie(key)) {
    storageValue = storage.getCookie(key);
  }
  return storageValue;
}

function loadLbScript(tagname) {
  const linkback = window.linkback = window.linkback || {};
  if (!linkback.l) {
    linkback.l = true;

    const scriptUrl = `${SCRIPT_URL}/${tagname}`;
    loadExternalScript(scriptUrl, MODULE_NAME);
  }
}

function init(config, userConsent) {
  const tagId = config.params.tagId;
  if (tagId && !isEmptyStr(tagId)) {
    loadLbScript(config.params.tagId);
    return true;
  }
  if (!isEmptyStr(getStorageData(A1_SEG_KEY))) {
    return true;
  }
  return false;
}

function alterBidRequests(reqBidsConfigObj, callback, config, userConsent) {
  const a1seg = getStorageData(A1_SEG_KEY);
  const a1gid = getStorageData(A1_AUD_KEY);

  const a1UserSegData = {
    name: 'a1mediagroup.com',
    ext: {
      segtax: 900
    },
    segment: a1seg.split(',').map(x => ({id: x}))
  };

  const a1UserEid = {
    source: 'a1mediagroup.com',
    uids: [
      {
        id: a1gid,
        atype: 1
      }
    ]
  };

  const a1Ortb2 = {
    user: {
      data: [
        a1UserSegData
      ],
      ext: {
        eids: [
          a1UserEid
        ]
      }
    }
  };
  mergeDeep(reqBidsConfigObj.ortb2Fragments.global, a1Ortb2);
  callback();
}

submodule(REAL_TIME_MODULE, subModuleObj);
