import {parse as parseURL, format as formatURL} from './url';

const XHR_DONE = 4;

/**
 * Simple IE9+ and cross-browser ajax request function
 *
 * @param url string url
 * @param callback object callback
 * @param data mixed data
 * @param options object
 */

export function ajax(url, callback, data, options = {}) {

  let x,
      method = options.method || (data ? 'POST' : 'GET'),
      // For IE9 support use XDomainRequest instead of XMLHttpRequest.
      useXDomainRequest = window.XDomainRequest &&
        (window.XMLHttpRequest && new window.XMLHttpRequest().responseType === undefined);

  if (useXDomainRequest) {
    x = new window.XDomainRequest();
    x.onload = handler;
  } else {
    x = new window.XMLHttpRequest();
    x.onreadystatechange = handler;
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
    } else {
      x.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
      x.setRequestHeader('Content-Type', 'application/json;charset=UTF-8');
    }
  }

  x.send(method === 'POST' && data);

  function handler() {
    if (x.readyState === XHR_DONE && callback) {
      callback(x.responseText, x);
    }
  }

}
