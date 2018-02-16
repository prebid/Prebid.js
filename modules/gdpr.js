import * as utils from 'src/utils';
import { config } from 'src/config';
import { hooks } from 'src/hook';

let cmp = 'iab';
let gdprId = '';

export function setConfig(config) {
  if (typeof config.cmp === 'string') {
    cmp = config.cmp;
  }
  // read other values from config here

  utils.logInfo('adding makeBidRequest hook for gdpr module', arguments);
  // hooks['makeBidRequests'].addHook(makeBidRequestsHook, 100);
  hooks['callBids'].addHook(callBidsHook, 100);
}
config.getConfig('gdpr', config => setConfig(config.gdpr));

// function makeBidRequestsHook(adUnits, auctionStart, auctionId, cbTimeout, labels, callback, fn) {
function callBidsHook(adUnits, bidRequests, addBidResponse, doneCb, fn) {
  if (cmp === 'iab') {
    // do gdpr lookup here

    // hardcoded value for now
    gdprId = 'BOJHqu8OJHwzZABABsAAABJGABgAACSI';
  }

  // adUnits.forEach(adUnit => {
  //   adUnit['gdpr'] = gdprId;
  // });
  bidRequests.forEach(bidRequest => {
    bidRequest['gdpr'] = gdprId;
  });

  fn.apply(this, arguments);
}
