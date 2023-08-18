import {includes} from '../src/polyfill.js';
import {config} from '../src/config.js';
import {getHook} from '../src/hook.js';
import {_each, deepAccess, deepClone, hasOwn, isArray, isPlainObject, isStr, logError, logWarn} from '../src/utils.js';

const shouldBeAString = ' should be a string';
const shouldBeAnObject = ' should be an object';
const shouldBeAnArray = ' should be an Array';
const shouldBeValid = ' is not a valid dchain property';
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
  const dchainPropList = ['ver', 'complete', 'nodes', 'ext'];

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

  let dchainProps = Object.keys(dchainObj);
  dchainProps.forEach(prop => {
    if (!includes(dchainPropList, prop)) {
      appendFailMsg(`dchain.${prop}` + shouldBeValid);
    }
  });

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
    const nodesPropList = ['asi', 'bsid', 'rid', 'name', 'domain', 'ext'];
    dchainObj.nodes.forEach((node, index) => {
      if (!isPlainObject(node)) {
        appendFailMsg(`dchain.nodes[${index}]` + shouldBeAnObject);
      } else {
        let nodeProps = Object.keys(node);
        nodeProps.forEach(prop => {
          if (!includes(nodesPropList, prop)) {
            appendFailMsg(`dchain.nodes[${index}].${prop}` + shouldBeValid);
          }

          if (prop === 'ext') {
            if (!isPlainObject(node.ext)) {
              appendFailMsg(`dchain.nodes[${index}].ext` + shouldBeAnObject);
            }
          } else {
            if (!isStr(node[prop])) {
              appendFailMsg(`dchain.nodes[${index}].${prop}` + shouldBeAString);
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
    nodes: []
  };

  if (deepAccess(bid, 'meta.networkId') && deepAccess(bid, 'meta.networkName')) {
    basicDchain.nodes.push({ name: bid.meta.networkName, bsid: bid.meta.networkId.toString() });
  }
  basicDchain.nodes.push({ name: bid.bidderCode });

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
      // remove invalid dchain
      delete bid.meta.dchain;
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
