import { config } from '../src/config';
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
  let failPrefix = 'Detected something wrong within an schain config:'
  let failMsg = '';

  function appendFailMsg(msg) {
    failMsg += '\n' + msg;
  }

  function printFailMsg() {
    if (returnOnError === true) {
      logError(failPrefix, schainObject, failMsg);
    } else {
      logWarn(failPrefix, schainObject, failMsg);
    }
  }

  if (!isPlainObject(schainObject)) {
    appendFailMsg(`schain.config` + shouldBeAnObject);
    printFailMsg();
    if (returnOnError) return false;
  }

  // complete: Integer
  if (!isNumber(schainObject.complete) || !isInteger(schainObject.complete)) {
    appendFailMsg(`schain.config.complete` + shouldBeAnInteger);
  }

  // ver: String
  if (!isStr(schainObject.ver)) {
    appendFailMsg(`schain.config.ver` + shouldBeAString);
  }

  // ext: Object [optional]
  if (hasOwn(schainObject, 'ext')) {
    if (!isPlainObject(schainObject.ext)) {
      appendFailMsg(`schain.config.ext` + shouldBeAnObject);
    }
  }

  // nodes: Array of objects
  if (!isArray(schainObject.nodes)) {
    appendFailMsg(`schain.config.nodes` + shouldBeAnArray);
    printFailMsg();
    if (returnOnError) return false;
  } else {
    schainObject.nodes.forEach((node, index) => {
      // asi: String
      if (!isStr(node.asi)) {
        appendFailMsg(`schain.config.nodes[${index}].asi` + shouldBeAString);
      }

      // sid: String
      if (!isStr(node.sid)) {
        appendFailMsg(`schain.config.nodes[${index}].sid` + shouldBeAString);
      }

      // hp: Integer
      if (!isNumber(node.hp) || !isInteger(node.hp)) {
        appendFailMsg(`schain.config.nodes[${index}].hp` + shouldBeAnInteger);
      }

      // rid: String [Optional]
      if (hasOwn(node, 'rid')) {
        if (!isStr(node.rid)) {
          appendFailMsg(`schain.config.nodes[${index}].rid` + shouldBeAString);
        }
      }

      // name: String [Optional]
      if (hasOwn(node, 'name')) {
        if (!isStr(node.name)) {
          appendFailMsg(`schain.config.nodes[${index}].name` + shouldBeAString);
        }
      }

      // domain: String [Optional]
      if (hasOwn(node, 'domain')) {
        if (!isStr(node.domain)) {
          appendFailMsg(`schain.config.nodes[${index}].domain` + shouldBeAString);
        }
      }

      // ext: Object [Optional]
      if (hasOwn(node, 'ext')) {
        if (!isPlainObject(node.ext)) {
          appendFailMsg(`schain.config.nodes[${index}].ext` + shouldBeAnObject);
        }
      }
    });
  }

  if (failMsg.length > 0) {
    printFailMsg();
    if (returnOnError) {
      return false;
    }
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

function resolveSchainConfig(schainObject, bidder) {
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
        logError(schainErrorPrefix + `due to the 'strict' validation setting, this schain config will not be passed to bidder '${bidder}'.  See above error for details.`);
      }
    }
  }
  return null;
}

export function makeBidRequestsHook(fn, bidderRequests) {
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
      let result = resolveSchainConfig(schainConfig, bidder);
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
