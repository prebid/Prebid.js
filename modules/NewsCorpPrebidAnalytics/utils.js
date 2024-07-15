/**
 * Returns a function, that, as long as it continues to be invoked, will not
 * be triggered. The function will be called after it stops being called for
 * N milliseconds. If `immediate` is passed, trigger the function on the
 * leading edge, instead of the trailing.
 */
export function debounce(func, wait, immediate) {
  var timeout;

  return function () {
    var context = this,
      args = arguments;

    var later = function () {
      timeout = null;
      if (!immediate) func.apply(context, args);
    };

    var callNow = immediate && !timeout;
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);

    if (callNow) func.apply(context, args);
  };
}

/**
 * Sends data to url using xhr
 */
export function ajax(url, data, callback) {
  try {
    let xhr;

    if (window.XMLHttpRequest) {
      xhr = new window.XMLHttpRequest();
    } else if (window.ActiveXObject) {
      xhr = new window.ActiveXObject("MSXML2.XMLHTTP.3.0");
    }

    xhr.open(data ? "POST" : "GET", url, true);
    xhr.setRequestHeader("Content-Type", "text/plain;charset=utf8");

    xhr.onreadystatechange = () => {
      if (xhr.readyState > 3 && callback) {
        callback(xhr);
      }
    };

    xhr.send(data);
  } catch (e) {
    console.log(e);
  }
}