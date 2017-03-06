import {parse as parseURL, format as formatURL} from './url';

var utils = require('./utils');

const XHR_DONE = 4;

/**
 * Simple IE9+ and cross-browser ajax request function
 * Note: x-domain requests in IE9 do not support the use of cookies
 *
 * @param url string url
 * @param callback {object | function} callback
 * @param data mixed data
 * @param options object
 */

export function ajax(url, callback, data, options = {}) {
  try {
    let x;
    let useXDomainRequest = false;
    let method = options.method || (data ? 'POST' : 'GET');

    let callbacks = typeof callback === "object" ? callback : {
      success: function() {
        utils.logMessage('xhr success');
      },
      error: function(e) {
        utils.logError('xhr error', null, e);
      }
    };

    if(typeof callback === "function") {
      callbacks.success = callback;
    }

    if (!window.XMLHttpRequest) {
      useXDomainRequest = true;
    } else{
      x = new window.XMLHttpRequest();
      if (x.responseType === undefined) {
        useXDomainRequest = true;
      }
    }

    if (useXDomainRequest) {
      x = new window.XDomainRequest();
      x.onload = function () {
        callbacks.success(x.responseText, x);
      };

      // http://stackoverflow.com/questions/15786966/xdomainrequest-aborts-post-on-ie-9
      x.onerror = function () {
        callbacks.error("error", x);
      };
      x.ontimeout = function () {
        callbacks.error("timeout", x);
      };
      x.onprogress = function() {
        utils.logMessage('xhr onprogress');
      };
    } else {
      x.onreadystatechange = function () {
        if (x.readyState === XHR_DONE) {
          let status = x.status;
          if(status >= 200 && status < 300 || status === 304) {
            callbacks.success(x.responseText, x);
          } else {
            callbacks.error(x.statusText, x);
          }
        }
      };
    }

    if (method === 'GET' && data) {
      let urlInfo = parseURL(url);
      Object.assign(urlInfo.search, data);
      url = formatURL(urlInfo);
    }

    x.open(method, url);

    if (!useXDomainRequest) {
      if (options.withCredentials) {
        x.withCredentials = true;
      }
      if (options.preflight) {
        x.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
      }
      x.setRequestHeader('Content-Type', options.contentType || 'text/plain');
    }
    x.send(method === 'POST' && data);
  } catch (error) {
    utils.logError('xhr construction', error);
  }
}
