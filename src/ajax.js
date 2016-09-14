import {parse as parseURL, format as formatURL} from './url';

/**
 * Simple cross-browser ajax request function
 * https://gist.github.com/Xeoncross/7663273

 * IE 5.5+, Firefox, Opera, Chrome, Safari XHR object
 *
 * @param url string url
 * @param callback object callback
 * @param data mixed data
 * @param options object
 */

export const ajax = function ajax(url, callback, data, options = {}) {
  let x;

  try {
    if (window.XMLHttpRequest) {
      x = new window.XMLHttpRequest('MSXML2.XMLHTTP.3.0');
    }

    if (window.ActiveXObject) {
      x = new window.ActiveXObject('MSXML2.XMLHTTP.3.0');
    }

    const method = options.method || (data ? 'POST' : 'GET');

    if (method === 'GET' && data) {
      let urlInfo = parseURL(url);
      Object.assign(urlInfo.search, data);
      url = formatURL(urlInfo);
    }

    //x = new (window.XMLHttpRequest || window.ActiveXObject)('MSXML2.XMLHTTP.3.0');
    x.open(method, url, 1);

    if (options.withCredentials) {
      x.withCredentials = true;
    } else {
      x.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
      x.setRequestHeader('Content-Type', 'application/json;charset=UTF-8');
    }

    //x.setRequestHeader('Content-type', 'application/x-www-form-urlencoded');
    x.onreadystatechange = function () {
      if (x.readyState > 3 && callback) {
        callback(x.responseText, x);
      }
    };

    x.send(method === 'POST' && data);
  } catch (e) {
    console.log(e);
  }
};
