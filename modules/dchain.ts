import {config} from '../src/config.js';
import {getHook} from '../src/hook.js';
import {_each, deepAccess, deepClone, isArray, isPlainObject, isStr, logError, logWarn} from '../src/utils.js';
import {timedBidResponseHook} from '../src/utils/perfMetrics.js';
import type {DemandChain} from "../src/types/ortb/ext/dchain.d.ts";

const shouldBeAString = ' should be a string';
const shouldBeAnObject = ' should be an object';
const shouldBeAnArray = ' should be an Array';
const shouldBeValid = ' is not a valid dchain property';
const MODE = {
  STRICT: 'strict',
  RELAXED: 'relaxed',
  OFF: 'off'
} as const;
const MODES = []; // an array of modes
_each(MODE, mode => MODES.push(mode));

export function checkDchainSyntax(bid, mode) {
  const dchainObj = deepClone(bid.meta.dchain);
  const failPrefix = 'Detected something wrong in bid.meta.dchain object for bid:';
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

  const dchainProps = Object.keys(dchainObj);
  dchainProps.forEach(prop => {
    if (!dchainPropList.includes(prop)) {
      appendFailMsg(`dchain.${prop}` + shouldBeValid);
    }
  });

  if (dchainObj.complete !== 0 && dchainObj.complete !== 1) {
    appendFailMsg(`dchain.complete should be 0 or 1`);
  }

  if (!isStr(dchainObj.ver)) {
    appendFailMsg(`dchain.ver` + shouldBeAString);
  }

  if (dchainObj.hasOwnProperty('ext')) {
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
        const nodeProps = Object.keys(node);
        nodeProps.forEach(prop => {
          if (!nodesPropList.includes(prop)) {
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

export interface DchainConfig {
  validation?: typeof MODES[keyof typeof MODES];
}

declare module '../src/config' {
  interface Config {
    dchain?: DchainConfig;
  }
}

function isValidDchain(bid) {
  let mode: string = MODE.STRICT;
  const dchainConfig = config.getConfig('dchain');

  if (dchainConfig && isStr(dchainConfig.validation) && MODES.indexOf(dchainConfig.validation) !== -1) {
    mode = dchainConfig.validation;
  }

  if (mode === MODE.OFF) {
    return true;
  } else {
    return checkDchainSyntax(bid, mode);
  }
}

export const addBidResponseHook = timedBidResponseHook('dchain', function addBidResponseHook(fn, adUnitCode, bid, reject) {
  const basicDchain: DemandChain = {
    ver: '1.0',
    complete: 0,
    nodes: []
  };

  if (deepAccess(bid, 'meta.networkId') && deepAccess(bid, 'meta.networkName')) {
    basicDchain.nodes.push({ name: bid.meta.networkName, bsid: bid.meta.networkId.toString() });
  }
  basicDchain.nodes.push({ name: bid.bidderCode });

  const bidDchain = deepAccess(bid, 'meta.dchain');
  if (bidDchain && isPlainObject(bidDchain)) {
    const result = isValidDchain(bid);

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

  fn(adUnitCode, bid, reject);
});

export function init() {
  getHook('addBidResponse').before(addBidResponseHook, 35);
}

init();
