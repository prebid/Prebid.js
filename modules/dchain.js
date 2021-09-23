import includes from 'core-js-pure/features/array/includes.js';
import { config } from '../src/config.js';
import { getHook } from '../src/hook.js';
import { _each, isStr, isArray, isPlainObject, hasOwn, deepClone, deepAccess, logWarn, logError } from '../src/utils.js';

const shouldBeAString = ' should be a string';
const shouldBeAnObject = ' should be an object';
const shouldBeAnArray = ' should be an Array';
const MODE = {
  STRICT: 'strict',
  RELAXED: 'relaxed',
  OFF: 'off'
};
const MODES = []; // an array of modes
_each(MODE, mode => MODES.push(mode));

export function checkDchainSyntax(bid, mode) {
  let dchainObj = deepClone(bid.meta.dchain);
  let failPrefix = 'Detected something wrong in bid.meta.dchain object for bid:';
  let failMsg = '';

  function appendFailMsg(msg) {
    failMsg += '\n' + msg;
  }

  function printFailMsg() {
    if (mode === MODE.STRICT) {
      logError(failPrefix, bid, '\n', dchainObj, failMsg);
    } else {
      logWarn(failPrefix, bid, `\n`, dchainObj, failMsg);
    }
  }

  if (dchainObj.complete !== 0 && dchainObj.complete !== 1) {
    appendFailMsg(`dchain.complete should be 0 or 1`);
  }

  if (!isStr(dchainObj.ver)) {
    appendFailMsg(`dchain.ver` + shouldBeAString);
  }

  if (hasOwn(dchainObj, 'ext')) {
    if (!isPlainObject(dchainObj.ext)) {
      appendFailMsg(`dchain.ext` + shouldBeAnObject);
    }
  }

  if (!isArray(dchainObj.nodes)) {
    appendFailMsg(`dchain.nodes` + shouldBeAnArray);
    printFailMsg();
    if (mode === MODE.STRICT) return false;
  } else {
    const propList = ['asi', 'bsid', 'rid', 'name', 'domain', 'ext'];
    dchainObj.nodes.forEach((node, index) => {
      if (!isPlainObject(node)) {
        appendFailMsg(`dchain.nodes[${index}]` + shouldBeAnObject);
      } else {
        let nodeProps = Object.keys(node);
        nodeProps.forEach(prop => {
          if (!includes(propList, prop)) {
            appendFailMsg(`dchain.nodes[${index}].${prop} is not a valid dchain property.`);
          } else {
            if (prop === 'ext') {
              if (!isPlainObject(node.ext)) {
                appendFailMsg(`dchain.nodes[${index}].ext` + shouldBeAnObject);
              }
            } else {
              if (!isStr(node[prop])) {
                appendFailMsg(`dchain.nodes[${index}].${prop}` + shouldBeAString);
              }
            }
          }
        });
      }
    });
  }

  if (failMsg.length > 0) {
    printFailMsg();
    if (mode === MODE.STRICT) {
      return false;
    }
  }
  return true;
}

function isValidDchain(bid) {
  let mode = MODE.STRICT;
  const dchainConfig = config.getConfig('dchain');

  if (dchainConfig && isStr(dchainConfig.validation) && MODES.indexOf(dchainConfig.validation) != -1) {
    mode = dchainConfig.validation;
  }

  if (mode === MODE.OFF) {
    return true;
  } else {
    return checkDchainSyntax(bid, mode);
  }
}

export function addBidResponseHook(fn, adUnitCode, bid) {
  const basicDchain = {
    ver: '1.0',
    complete: 0,
    nodes: [{ name: bid.bidderCode }]
  };

  let bidDchain = deepAccess(bid, 'meta.dchain');
  if (bidDchain && isPlainObject(bidDchain)) {
    let result = isValidDchain(bid);

    if (result) {
      // extra check in-case mode is OFF and there is a setup issue
      if (isArray(bidDchain.nodes)) {
        bid.meta.dchain.nodes.push({ asi: bid.bidderCode });
      } else {
        logWarn('bid.meta.dchain.nodes did not exist or was not an array; did not append prebid dchain.', bid);
      }
    } else {
      // bid.meta.dchain = basicDchain;     // should we assign a backup dchain if bidder's dchain was invalid?
      delete bid.meta.dchain; // or delete the bad object?
    }
  } else {
    bid.meta.dchain = basicDchain;
  }

  fn(adUnitCode, bid);
}

export function init() {
  getHook('addBidResponse').before(addBidResponseHook, 35);
}

init();
