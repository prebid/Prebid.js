import * as utils from './utils';
import adLoader from './adloader';
import { StorageManager, pbjsSyncsKey } from './storagemanager';

const cookie = exports;

cookie.cookieSet = function(cookieSetUrl) {
  if (!utils.isSafariBrowser()) {
    return;
  }
  adLoader.loadScript(cookieSetUrl, null, true);
};
