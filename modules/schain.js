import {config} from '../src/config.js';
import adapterManager from '../src/adapterManager.js';
import {
  deepAccess,
  deepClone,
  deepSetValue,
  isArray,
  isInteger,
  isNumber,
  isPlainObject,
  isStr,
  logError,
  logWarn
} from '../src/utils.js';
import {registerOrtbProcessor, REQUEST} from '../src/pbjsORTB.js';

// https://github.com/InteractiveAdvertisingBureau/openrtb/blob/master/supplychainobject.md

const schainErrorPrefix = 'Invalid schain object found: ';
const shouldBeAString = ' should be a string';
const shouldBeAnInteger = ' should be an Integer';
const shouldBeAnObject = ' should be an object';
const shouldBeAnArray = ' should be an Array';
let skipValidation = true; // Default to true (skip validation )


// validate the supply chain object
export function isSchainObjectValid(schainObject, returnOnError) {
  let failPrefix = 'Detected something wrong within an schain config:';
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
  if (schainObject.hasOwnProperty('ext')) {
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
      if (node.hasOwnProperty('rid')) {
        if (!isStr(node.rid)) {
          appendFailMsg(`schain.config.nodes[${index}].rid` + shouldBeAString);
        }
      }

      // name: String [Optional]
      if (node.hasOwnProperty('name')) {
        if (!isStr(node.name)) {
          appendFailMsg(`schain.config.nodes[${index}].name` + shouldBeAString);
        }
      }

      // domain: String [Optional]
      if (node.hasOwnProperty('domain')) {
        if (!isStr(node.domain)) {
          appendFailMsg(`schain.config.nodes[${index}].domain` + shouldBeAString);
        }
      }

      // ext: Object [Optional]
      if (node.hasOwnProperty('ext')) {
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

function handleSetConfigFlag(config) {
  // Calculate skipValidation from the FPD config
  if (config && typeof config === 'object') {
    skipValidation = config.skipValidations !== false;
  }
}

function resolveSchainConfig(schainObject, bidder) {
  if (isValidSchainConfig(schainObject)) {
    if (skipValidation) {
      // Skip validation if skipValidations is true (default)
      return schainObject.config;
    } else {
      // Perform strict validation if skipValidations is false
      if (isSchainObjectValid(schainObject.config, true)) {
        return schainObject.config;
      } else {
        logError(schainErrorPrefix + `due to validation failure, this schain config will not be passed to bidder '${bidder}'.  See above error for details.`);
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
        // Initialize ortb2 object if it doesn't exist
        if (!bid.ortb2) {
          bid.ortb2 = {};
        }
        // Initialize source object if it doesn't exist
        if (!bid.ortb2.source) {
          bid.ortb2.source = {};
        }
        // Set the schain in ortb2.source.schain
        bid.ortb2.source.schain = deepClone(result);
      }
    });
  });

  fn(bidderRequests);
}

export function init() {
  adapterManager.makeBidRequests.after(makeBidRequestsHook);
}

init()

export function setOrtbSourceExtSchain(ortbRequest, bidderRequest, context) {
  if (!deepAccess(ortbRequest, 'source.ext.schain')) {
    // Look for schain in the new location: ortb2.source.schain
    const schain = deepAccess(context, 'bidRequests.0.ortb2.source.schain');
    if (schain) {
      deepSetValue(ortbRequest, 'source.ext.schain', schain);
    }
  }
}

registerOrtbProcessor({type: REQUEST, name: 'sourceExtSchain', fn: setOrtbSourceExtSchain});

// handler to read the skipValidation flag
config.getConfig('firstPartyData', config => handleSetConfigFlag(config.firstPartyData));
