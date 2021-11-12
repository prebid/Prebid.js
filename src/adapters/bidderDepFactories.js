import {getStorageManager} from '../storageManager.js';
import {config} from '../config.js';

// these are just stubs for a proof of concept
export function storageManagerFactory(bidderCode) {
  return getStorageManager;
}

export function configFactory(bidderCode) {
  return config;
}
