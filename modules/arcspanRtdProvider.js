import { submodule } from '../src/hook.js';
import { mergeDeep } from '../src/utils.js';
import {loadExternalScript} from '../src/adloader.js';
import { MODULE_TYPE_RTD } from '../src/activities/modules.js';

/**
 * @typedef {import('../modules/rtdModule/index.js').RtdSubmodule} RtdSubmodule
 */

/** @type {string} */
const MODULE_NAME = 'realTimeData';
const SUBMODULE_NAME = 'arcspan';

/** @type {RtdSubmodule} */
export const arcspanSubmodule = {
  name: SUBMODULE_NAME,
  init: init,
  getBidRequestData: alterBidRequests,
};

function init(config, userConsent) {
  if (typeof config.params.silo === 'undefined') {
    return false;
  }
  if (typeof window.arcobj2 === 'undefined') {
    var scriptUrl;
    if (config.params.silo === 'test') {
      scriptUrl = 'https://localhost:8080/as.js';
    } else {
      scriptUrl = 'https://silo' + config.params.silo + '.p7cloud.net/as.js';
    }
    loadExternalScript(scriptUrl, MODULE_TYPE_RTD, SUBMODULE_NAME);
  }
  return true;
}

function alterBidRequests(reqBidsConfigObj, callback, config, userConsent) {
  var _v1 = [];
  var _v1s = [];
  var _v2 = [];
  var arcobj1 = window.arcobj1;
  if (typeof arcobj1 !== 'undefined') {
    if (typeof arcobj1.page_iab_codes.text !== 'undefined') { _v1 = _v1.concat(arcobj1.page_iab_codes.text); }
    if (typeof arcobj1.page_iab_codes.images !== 'undefined') { _v1 = _v1.concat(arcobj1.page_iab_codes.images); }
    if (typeof arcobj1.page_iab.text !== 'undefined') { _v1s = _v1s.concat(arcobj1.page_iab.text); }
    if (typeof arcobj1.page_iab.images !== 'undefined') { _v1s = _v1s.concat(arcobj1.page_iab.images); }
    if (typeof arcobj1.page_iab_newcodes.text !== 'undefined') { _v2 = [...new Set([..._v2, ...arcobj1.page_iab_newcodes.text])]; }
    if (typeof arcobj1.page_iab_newcodes.images !== 'undefined') { _v2 = [...new Set([..._v2, ...arcobj1.page_iab_newcodes.images])]; }

    var _content = {};
    _content.data = [];
    var p = {};
    p.name = 'arcspan';
    p.segment = [];
    p.ext = { segtax: 6 };
    _v2.forEach(function (e) {
      p.segment = p.segment.concat({ id: e });
    });
    _content.data = _content.data.concat(p);
    var _ortb2 = {
      site: {
        name: 'arcspan',
        domain: new URL(location.href).hostname,
        cat: _v1,
        sectioncat: _v1,
        pagecat: _v1,
        page: location.href,
        ref: document.referrer,
        keywords: _v1s.toString(),
        content: _content,
      },
    };
    mergeDeep(reqBidsConfigObj.ortb2Fragments.global, _ortb2);
  }
  callback();
}

submodule(MODULE_NAME, arcspanSubmodule);
