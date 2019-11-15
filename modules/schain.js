import {config} from '../src/config';
import adapterManager from '../src/adapterManager';
import { isNumber, isStr, isArray, isPlainObject, hasOwn, logError, isInteger, _each, logWarn } from '../src/utils';

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
  function warnOrError(msg) {
    if (returnOnError === true) {
      logError(msg);
    } else {
      logWarn(msg);
    }
  }

  if (!isPlainObject(schainObject)) {
    warnOrError(schainErrorPrefix + `schain` + shouldBeAnObject);
    if (returnOnError) return false;
  }

  // complete: Integer
  if (!isNumber(schainObject.complete) || !isInteger(schainObject.complete)) {
    warnOrError(schainErrorPrefix + `schain.complete` + shouldBeAnInteger);
    if (returnOnError) return false;
  }

  // ver: String
  if (!isStr(schainObject.ver)) {
    warnOrError(schainErrorPrefix + `schain.ver` + shouldBeAString);
    if (returnOnError) return false;
  }

  // ext: Object [optional]
  if (hasOwn(schainObject, 'ext')) {
    if (!isPlainObject(schainObject.ext)) {
      warnOrError(schainErrorPrefix + `schain.ext` + shouldBeAnObject);
      if (returnOnError) return false;
    }
  }

  // nodes: Array of objects
  let isEachNodeIsValid = true;
  if (!isArray(schainObject.nodes)) {
    warnOrError(schainErrorPrefix + `schain.nodes` + shouldBeAnArray);
    if (returnOnError) return false;
  } else {
    schainObject.nodes.forEach(node => {
      // asi: String
      if (!isStr(node.asi)) {
        isEachNodeIsValid = isEachNodeIsValid && false;
        warnOrError(schainErrorPrefix + `schain.nodes[].asi` + shouldBeAString);
      }

      // sid: String
      if (!isStr(node.sid)) {
        isEachNodeIsValid = isEachNodeIsValid && false;
        warnOrError(schainErrorPrefix + `schain.nodes[].sid` + shouldBeAString);
      }

      // hp: Integer
      if (!isNumber(node.hp) || !isInteger(node.hp)) {
        isEachNodeIsValid = isEachNodeIsValid && false;
        warnOrError(schainErrorPrefix + `schain.nodes[].hp` + shouldBeAnInteger);
      }

      // rid: String [Optional]
      if (hasOwn(node, 'rid')) {
        if (!isStr(node.rid)) {
          isEachNodeIsValid = isEachNodeIsValid && false;
          warnOrError(schainErrorPrefix + `schain.nodes[].rid` + shouldBeAString);
        }
      }

      // name: String [Optional]
      if (hasOwn(node, 'name')) {
        if (!isStr(node.name)) {
          isEachNodeIsValid = isEachNodeIsValid && false;
          warnOrError(schainErrorPrefix + `schain.nodes[].name` + shouldBeAString);
        }
      }

      // domain: String [Optional]
      if (hasOwn(node, 'domain')) {
        if (!isStr(node.domain)) {
          isEachNodeIsValid = isEachNodeIsValid && false;
          warnOrError(schainErrorPrefix + `schain.nodes[].domain` + shouldBeAString);
        }
      }

      // ext: Object [Optional]
      if (hasOwn(node, 'ext')) {
        if (!isPlainObject(node.ext)) {
          isEachNodeIsValid = isEachNodeIsValid && false;
          warnOrError(schainErrorPrefix + `schain.nodes[].ext` + shouldBeAnObject);
        }
      }
    });
  }

  if (returnOnError && !isEachNodeIsValid) {
    return false;
  }

  return true;
}

export function isValidSchainConfig(schainObject) {
  if (schainObject === undefined) {
    return false;
  }
  if (!isPlainObject(schainObject)) {
    logError(schainErrorPrefix + 'the following schain config will not be used as schain is not an object.', schainObject);
    return false;
  }
  return true;
}

function checkSchainConfig(schainObject, bidder) {
  let mode = MODE.STRICT;

  if (isValidSchainConfig(schainObject)) {
    if (isStr(schainObject.validation) && MODES.indexOf(schainObject.validation) != -1) {
      mode = schainObject.validation;
    }
    if (mode === MODE.OFF) {
      // no need to validate
      return schainObject.config;
    } else {
      // if strict mode and config is invalid, reject config + throw error; otherwise allow config to go through
      if (isSchainObjectValid(schainObject.config, !!(mode === MODE.STRICT))) {
        return schainObject.config;
      } else {
        logError(schainErrorPrefix + `the following schain config will not be passed to bidder '${bidder}' as it is not valid.`, schainObject);
      }
    }
  }
  return null;
}

function makeBidRequestsHook(fn, bidderRequests) {
  function getSchainForBidder(bidder) {
    let bidderSchain = bidderConfigs[bidder] && bidderConfigs[bidder].schain;
    return bidderSchain || globalSchainConfig;
  }

  const globalSchainConfig = config.getConfig('schain');
  const bidderConfigs = config.getBidderConfig();

  bidderRequests.forEach(bidderRequest => {
    let bidder = bidderRequest.bidderCode;
    let schainConfig = getSchainForBidder(bidder);

    bidderRequest.bids.forEach(bid => {
      let result = checkSchainConfig(schainConfig, bidder);
      if (result) {
        bid.schain = result;
      }
    });
  });

  fn(bidderRequests);
}

export function init() {
  adapterManager.makeBidRequests.after(makeBidRequestsHook);
}

init()
