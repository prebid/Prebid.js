import {config} from '../src/config';
import {getGlobal} from '../src/prebidGlobal';
import { isStr, isPlainObject, isBoolean, isFn, hasOwn, logInfo } from '../src/utils';

const MODULE_NAME = 'shareUserIds';
const DFP = 'DFP';
const DFP_KEYS_CONFIG = 'DFP_KEYS';

export function shareUserIds(userIds, config){
	
	if(! isPlainObject(config)){
		logInfo(MODULE_NAME + ': Invalid config found, not sharing userIds externally.');
		return;
	}

	const DFP_KEYS = isPlainObject(config[DFP_KEYS_CONFIG]) ? config[DFP_KEYS_CONFIG] : {};
	let SHARE_WITH_DFP = isBoolean(config[DFP]) ? config[DFP] : false;	
	let DFP_API;

	if(!SHARE_WITH_DFP){
		logInfo(MODULE_NAME + ': Not enabled for ' + DFP);
	}

	// add validation for googletag.pubads().setTargeting
	if(googletag && isFn(googletag.pubads) && hasOwn(googletag.pubads(), 'setTargeting') && isFn(googletag.pubads().setTargeting)){
		DFP_API = googletag.pubads().setTargeting;
	} else {
		// for invalid case unset SHARE_WITH_DFP and log failure
		SHARE_WITH_DFP = false;
		logInfo(MODULE_NAME + ': Could not find googletag.pubads().setTargeting API. Not adding User Ids in targeting.')
		return;
	}

    Object.keys(userIds).forEach(function(key){
    	// check may be incorrect if a userId is an object
    	if(isStr(userIds[key])){
    		// DFP_KEYS[key] = '' means publisher do not want to send this uid
    		if(SHARE_WITH_DFP && DFP_KEYS[key] !== ''){
    			DFP_API( 
    				(hasOwn(DFP_KEYS, key) ? DFP_KEYS[key] : key), 
    				[ userIds[key] ]
    			);
    		}
    	}
    });
}

export function init(config) {
  getGlobal().requestBids.before(function(fn, reqBidsConfigObj) {
  	// using setTimeout to avoid delay
  	setTimeout(shareUserIds, 0, (getGlobal()).getUserIds(), config.getConfig(MODULE_NAME));
    // calling fn allows prebid to continue processing
    return fn.call(this, reqBidsConfigObj);
  }, 40);
}

init(config)