/**
 * Simple cross-browser ajax request function
 * https://gist.github.com/Xeoncross/7663273

 * IE 5.5+, Firefox, Opera, Chrome, Safari XHR object
 *
 * @param url string url
 * @param callback object callback
 * @param data mixed data
 * @param x null Ajax request
 */

export const ajax = function ajax(url, callback, data, x = null) {
  try {
    if (window.XMLHttpRequest) {
      x = new window.XMLHttpRequest('MSXML2.XMLHTTP.3.0');
    }

    if (window.ActiveXObject) {
      x = new window.ActiveXObject('MSXML2.XMLHTTP.3.0');
    }

    //x = new (window.XMLHttpRequest || window.ActiveXObject)('MSXML2.XMLHTTP.3.0');
    x.open(data ? 'POST' : 'GET', url, 1);
    x.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
    x.setRequestHeader('Content-Type', 'application/json;charset=UTF-8');

    //x.setRequestHeader('Content-type', 'application/x-www-form-urlencoded');
    x.onreadystatechange = function () {
      if (x.readyState > 3 && callback) {
        callback(x.responseText, x);
      }
    };

    x.send(data);
  } catch (e) {
    console.log(e);
  }
};
