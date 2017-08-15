import * as utils from './utils';
import adLoader from './adloader';

cookie.cookieSet = function(cookieSetUrl) {
  if (!utils.isSafariBrowser()) {
    return;
  }
  adLoader.loadScript(cookieSetUrl, null, true);
};
