import {config} from '../src/config';
import {getGlobal} from '../src/prebidGlobal';
import { isStr, isPlainObject, isBoolean, isFn, hasOwn, logInfo } from '../src/utils';

const MODULE_NAME = 'userIdTargeting';
const GAM = 'GAM';
const GAM_KEYS_CONFIG = 'GAM_KEYS';

export function userIdTargeting(userIds, config) {
  if (!isPlainObject(config)) {
    logInfo(MODULE_NAME + ': Invalid config found, not sharing userIds externally.');
    return;
  }

  const PUB_GAM_KEYS = isPlainObject(config[GAM_KEYS_CONFIG]) ? config[GAM_KEYS_CONFIG] : {};
  let SHARE_WITH_GAM = isBoolean(config[GAM]) ? config[GAM] : false;
  let GAM_API;

  if (!SHARE_WITH_GAM) {
    logInfo(MODULE_NAME + ': Not enabled for ' + GAM);
  }

  if (window.googletag && isFn(window.googletag.pubads) && hasOwn(window.googletag.pubads(), 'setTargeting') && isFn(window.googletag.pubads().setTargeting)) {
    GAM_API = window.googletag.pubads().setTargeting;
  } else {
    SHARE_WITH_GAM = false;
    logInfo(MODULE_NAME + ': Could not find googletag.pubads().setTargeting API. Not adding User Ids in targeting.')
    return;
  }

  Object.keys(userIds).forEach(function(key) {
    if (isStr(userIds[key])) {
      // PUB_GAM_KEYS[key] = '' means publisher does not want to send this uid
      if (SHARE_WITH_GAM && PUB_GAM_KEYS[key] !== '') {
        GAM_API(
          (hasOwn(PUB_GAM_KEYS, key) ? PUB_GAM_KEYS[key] : key),
          [ userIds[key] ]
        );
      }
    }
  });
}

export function init(config) {
  getGlobal().requestBids.before(function(fn, reqBidsConfigObj) {
    // using setTimeout to avoid delay
    setTimeout(userIdTargeting, 0, (getGlobal()).getUserIds(), config.getConfig(MODULE_NAME));
    // calling fn allows prebid to continue processing
    return fn.call(this, reqBidsConfigObj);
  }, 40);
}

init(config)
