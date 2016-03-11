var utils = require('./utils');
let _requestCache = {};

//add a script tag to the page, used to add /jpt call to page
exports.loadScript = function (tagSrc, callback, cacheRequest) {
  if (!tagSrc) {
    utils.logError('Error attempting to request empty URL', 'adloader.js:loadScript');
    return;
  }

  if (cacheRequest) {
    if (_requestCache[tagSrc]) {
      if (_requestCache[tagSrc].loaded) {
        //invokeCallbacks immediately
        callback();
      } else {
        //queue the callback
        _requestCache[tagSrc].callbacks.push(callback);
      }
    } else {
      _requestCache[tagSrc] = {
        loaded:false,
        callbacks:[]
      };
      _requestCache[tagSrc].callbacks.push(callback);
      requestResource(tagSrc, function() {
        _requestCache[tagSrc].loaded = true;
        try {
          for (let i = 0; i < _requestCache[tagSrc].callbacks.length; i++) {
            _requestCache[tagSrc].callbacks[i]();
          }
        }
        catch (e) {
          utils.logError('Error executing callback', 'adloader.js:loadScript', e);
        }
      });
    }
  }

  //trigger one time request
  else {
    requestResource(tagSrc, callback);
  }

};

function requestResource(tagSrc, callback) {
  var jptScript = document.createElement('script');
  jptScript.type = 'text/javascript';
  jptScript.async = true;

  // Execute a callback if necessary
  if (callback && typeof callback === 'function') {
    if (jptScript.readyState) {
      jptScript.onreadystatechange = function () {
        if (jptScript.readyState === 'loaded' || jptScript.readyState === 'complete') {
          jptScript.onreadystatechange = null;
          callback();
        }
      };
    } else {
      jptScript.onload = function () {
        callback();
      };
    }
  }

  jptScript.src = tagSrc;

  //add the new script tag to the page
  var elToAppend = document.getElementsByTagName('head');
  elToAppend = elToAppend.length ? elToAppend : document.getElementsByTagName('body');
  if (elToAppend.length) {
    elToAppend = elToAppend[0];
    elToAppend.insertBefore(jptScript, elToAppend.firstChild);
  }
}

//track a impbus tracking pixel
//TODO: Decide if tracking via AJAX is sufficent, or do we need to
//run impression trackers via page pixels?
exports.trackPixel = function (pixelUrl) {
  let delimiter;
  let trackingPixel;

  if (!pixelUrl || typeof (pixelUrl) !== 'string') {
    utils.logMessage('Missing or invalid pixelUrl.');
    return;
  }

  delimiter = pixelUrl.indexOf('?') > 0 ? '&' : '?';

  //add a cachebuster so we don't end up dropping any impressions
  trackingPixel = pixelUrl + delimiter + 'rnd=' + Math.floor(Math.random() * 1E7);
  (new Image()).src = trackingPixel;
  return trackingPixel;
};
