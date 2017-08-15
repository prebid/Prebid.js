import * as utils from './utils';
import adLoader from './adloader';

const cookie = exports;

cookie.cookieSet = function(cookieSetUrl) {
  if (!utils.isSafariBrowser()) {
    return;
  }
  adLoader.loadScript(cookieSetUrl, null, true);
};
