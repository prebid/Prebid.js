import * as utils from 'src/utils';
import { config } from 'src/config';
import { hooks } from 'src/hook';

// let makeBidRequestsQueue = [];
let cmp = 'iab';
let gdprId = '';

export function setConfig(config) {
  if (typeof config.cmp === 'string') {
    cmp = config.cmp;
  }
  // read other values from config here

  hooks['foobar'].addHook(foobarHook, 100);
  utils.logInfo('adding makeBidRequest hook for gdpr module', arguments);
  hooks['makeBidRequests'].addHook(makeBidRequestsHook, 100);
}
config.getConfig('gdpr', config => setConfig(config.gdpr));

function makeBidRequestsHook(adUnits, auctionStart, auctionId, cbTimeout, labels, callback, fn) {
  if (cmp === 'iab') {
    // do gdpr lookup here

    // hardcoded value for now
    gdprId = 'BOJHqu8OJHwzZABABsAAABJGABgAACSI';
  }

  adUnits.forEach(adUnit => {
    adUnit['gdpr'] = gdprId;
  });

  fn.apply(this, arguments);
}

function foobarHook(input, callback, fn) {
  // do something async.
  // when done:
  input.param2 = 'value2';
  // we don't call callback - because the original function will
  // call original function fn
  fn.apply(this, arguments);
}

// function makeBidRequestsHook(adUnits, auctionStart, auctionId, cbTimeout, labels, callback, fn) {
//   // do logic checks here?

//   makeBidRequestsQueue.push(wrapFunction(fn, this, arguments));
//   processMakeBidRequestsQueue();

//   // note this is wrong - it's meant to return bidRequests not adUnits
//   return arguments[0];
// }

// function processMakeBidRequestsQueue() {
//   while (makeBidRequestsQueue.length > 0) {
//     (makeBidRequestsQueue.shift())();
//   }
// }

// function wrapFunction(fn, context, params) {
//   return function() {
//     // injecting new value into the adUnits object
//     let adUnits = params[0];
//     adUnits.forEach(adUnit => {
//       adUnit['gdpr'] = gdprId;
//     });

//     return fn.apply(context, params);
//   };
// }
