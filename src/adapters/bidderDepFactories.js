import {getStorageManager} from '../storageManager.js';
import {config} from '../config.js';

// these are just stubs for a proof of concept
export function storageManagerFactory(bidderCode) {
  ensureBidderCode(bidderCode);
  return getStorageManager;
}

export function configFactory(bidderCode) {
  ensureBidderCode(bidderCode);
  return config;
}

function ensureBidderCode(code) {
  if (!code) {
    throw new Error('No bidder code');
  }
}
