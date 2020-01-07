import {config} from '../src/config';
import {getGlobal} from '../src/prebidGlobal';
import { isNumber, isStr, isArray, isPlainObject, hasOwn, logError, isInteger, _each } from '../src/utils';

// https://github.com/InteractiveAdvertisingBureau/openrtb/blob/master/supplychainobject.md

const schainErrorPrefix = 'Invalid schain object found: ';
const shouldBeAString = ' should be a string';
const shouldBeAnInteger = ' should be an Integer';
const shouldBeAnObject = ' should be an object';
const shouldBeAnArray = ' should be an Array';
const MODE = {
  STRICT: 'strict',
  RELAXED: 'relaxed',
  OFF: 'off'
};
const MODES = []; // an array of modes
_each(MODE, mode => MODES.push(mode));

// validate the supply chain object
export function isSchainObjectValid(schainObject, returnOnError) {
  if (!isPlainObject(schainObject)) {
    logError(schainErrorPrefix + `schain` + shouldBeAnObject);
    if (returnOnError) return false;
  }

  // complete: Integer
  if (!isNumber(schainObject.complete) || !isInteger(schainObject.complete)) {
    logError(schainErrorPrefix + `schain.complete` + shouldBeAnInteger);
    if (returnOnError) return false;
  }

  // ver: String
  if (!isStr(schainObject.ver)) {
    logError(schainErrorPrefix + `schain.ver` + shouldBeAString);
    if (returnOnError) return false;
  }

  // ext: Object [optional]
  if (hasOwn(schainObject, 'ext')) {
    if (!isPlainObject(schainObject.ext)) {
      logError(schainErrorPrefix + `schain.ext` + shouldBeAnObject);
      if (returnOnError) return false;
    }
  }

  // nodes: Array of objects
  let isEachNodeIsValid = true;
  if (!isArray(schainObject.nodes)) {
    logError(schainErrorPrefix + `schain.nodes` + shouldBeAnArray);
    if (returnOnError) return false;
  } else {
    schainObject.nodes.forEach(node => {
      // asi: String
      if (!isStr(node.asi)) {
        isEachNodeIsValid = isEachNodeIsValid && false;
        logError(schainErrorPrefix + `schain.nodes[].asi` + shouldBeAString);
      }

      // sid: String
      if (!isStr(node.sid)) {
        isEachNodeIsValid = isEachNodeIsValid && false;
        logError(schainErrorPrefix + `schain.nodes[].sid` + shouldBeAString);
      }

      // hp: Integer
      if (!isNumber(node.hp) || !isInteger(node.hp)) {
        isEachNodeIsValid = isEachNodeIsValid && false;
        logError(schainErrorPrefix + `schain.nodes[].hp` + shouldBeAnInteger);
      }

      // rid: String [Optional]
      if (hasOwn(node, 'rid')) {
        if (!isStr(node.rid)) {
          isEachNodeIsValid = isEachNodeIsValid && false;
          logError(schainErrorPrefix + `schain.nodes[].rid` + shouldBeAString);
        }
      }

      // name: String [Optional]
      if (hasOwn(node, 'name')) {
        if (!isStr(node.name)) {
          isEachNodeIsValid = isEachNodeIsValid && false;
          logError(schainErrorPrefix + `schain.nodes[].name` + shouldBeAString);
        }
      }

      // domain: String [Optional]
      if (hasOwn(node, 'domain')) {
        if (!isStr(node.domain)) {
          isEachNodeIsValid = isEachNodeIsValid && false;
          logError(schainErrorPrefix + `schain.nodes[].domain` + shouldBeAString);
        }
      }

      // ext: Object [Optional]
      if (hasOwn(node, 'ext')) {
        if (!isPlainObject(node.ext)) {
          isEachNodeIsValid = isEachNodeIsValid && false;
          logError(schainErrorPrefix + `schain.nodes[].ext` + shouldBeAnObject);
        }
      }
    });
  }

  if (returnOnError && !isEachNodeIsValid) {
    return false;
  }

  return true;
}

export function copySchainObjectInAdunits(adUnits, schainObject) {
  // copy schain object in all adUnits as adUnits[].bid.schain
  adUnits.forEach(adUnit => {
    adUnit.bids.forEach(bid => {
      bid.schain = schainObject;
    });
  });
}

export function isValidSchainConfig(schainObject) {
  if (schainObject === undefined) {
    return false;
  }
  if (!isPlainObject(schainObject)) {
    logError(schainErrorPrefix + 'schain config will not be passed to bidders as schain is not an object.');
    return false;
  }
  return true;
}

export function init(config) {
  let mode = MODE.STRICT;
  getGlobal().requestBids.before(function(fn, reqBidsConfigObj) {
    let schainObject = config.getConfig('schain');
    if (isValidSchainConfig(schainObject)) {
      if (isStr(schainObject.validation) && MODES.indexOf(schainObject.validation) != -1) {
        mode = schainObject.validation;
      }
      if (mode === MODE.OFF) {
        // no need to validate
        copySchainObjectInAdunits(reqBidsConfigObj.adUnits || getGlobal().adUnits, schainObject.config);
      } else {
        if (isSchainObjectValid(schainObject.config, mode === MODE.STRICT)) {
          copySchainObjectInAdunits(reqBidsConfigObj.adUnits || getGlobal().adUnits, schainObject.config);
        } else {
          logError(schainErrorPrefix + 'schain config will not be passed to bidders as it is not valid.');
        }
      }
    }
    // calling fn allows prebid to continue processing
    return fn.call(this, reqBidsConfigObj);
  }, 40);
}

init(config)
