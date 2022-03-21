import { config } from './config.js';
import { logMessage, logError, parseUrl, buildUrl, _each } from './utils.js';

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
export const ajax = ajaxBuilder();

export function ajaxBuilder(timeout = 3000, {request, done} = {}) {
  return function(url, callback, data, options = {}) {
    try {
      let x;
      let method = options.method || (data ? 'POST' : 'GET');
      let parser = document.createElement('a');
      parser.href = url;

      let callbacks = typeof callback === 'object' && callback !== null ? callback : {
        success: function() {
          logMessage('xhr success');
        },
        error: function(e) {
          logError('xhr error', null, e);
        }
      };

      if (typeof callback === 'function') {
        callbacks.success = callback;
      }

      x = new window.XMLHttpRequest();

      x.onreadystatechange = function () {
        if (x.readyState === XHR_DONE) {
          if (typeof done === 'function') {
            done(parser.origin);
          }
          let status = x.status;
          if ((status >= 200 && status < 300) || status === 304) {
            callbacks.success(x.responseText, x);
          } else {
            callbacks.error(x.statusText, x);
          }
        }
      };

      // Disabled timeout temporarily to avoid xhr failed requests. https://github.com/prebid/Prebid.js/issues/2648
      if (!config.getConfig('disableAjaxTimeout')) {
        x.ontimeout = function () {
          logError('  xhr timeout after ', x.timeout, 'ms');
        };
      }

      if (method === 'GET' && data) {
        let urlInfo = parseUrl(url, options);
        Object.assign(urlInfo.search, data);
        url = buildUrl(urlInfo);
      }

      x.open(method, url, true);
      // IE needs timeout to be set after open - see #1410
      // Disabled timeout temporarily to avoid xhr failed requests. https://github.com/prebid/Prebid.js/issues/2648
      if (!config.getConfig('disableAjaxTimeout')) {
        x.timeout = timeout;
      }

      if (options.withCredentials) {
        x.withCredentials = true;
      }
      _each(options.customHeaders, (value, header) => {
        x.setRequestHeader(header, value);
      });
      if (options.preflight) {
        x.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
      }
      x.setRequestHeader('Content-Type', options.contentType || 'text/plain');

      if (typeof request === 'function') {
        request(parser.origin);
      }

      if (method === 'POST' && data) {
        x.send(data);
      } else {
        x.send();
      }
    } catch (error) {
      logError('xhr construction', error);
      typeof callback === 'object' && callback !== null && callback.error(error);
    }
  }
}
