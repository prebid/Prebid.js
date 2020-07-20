import {registerBidder} from '../src/adapters/bidderFactory.js';
import { getStorageManager } from '../src/storageManager.js';

const storage = getStorageManager();

function inIframe() {
  try {
    return window.self !== window.top && !window.mantis_link;
  } catch (e) {
    return true;
  }
}
function pixel(url, parent) {
  var img = document.createElement('img');
  img.src = url;
  img.style.cssText = 'display:none !important;';
  (parent || document.body).appendChild(img);
}
export function onVisible(win, element, doOnVisible, time, pct) {
  var started = null;
  var notified = false;
  var onNotVisible = null;
  var whenNotVisible = function () {
    if (notified && onNotVisible) {
      onNotVisible();
    }
    notified = false;
  };
  var interval;
  var listener;
  var doCheck = function (winWidth, winHeight, rect) {
    var hidden = typeof document.hidden !== 'undefined' && document.hidden;
    if (rect.width == 0 || rect.height == 0 || hidden) {
      return whenNotVisible();
    }
    var minHeight = (rect.height * pct);
    var minWidth = (rect.width * pct);
    var inView = (
      (
        (rect.top < 0 && rect.bottom >= minHeight) ||
        (rect.top > 0 && (winHeight - rect.top) >= minHeight)
      ) &&
      (
        (rect.left < 0 && rect.right >= minWidth) ||
        (rect.left > 0 && (winWidth - rect.left) >= minWidth)
      )
    );
    if (!inView) {
      return whenNotVisible();
    }
    if (!started && time) {
      started = Date.now();
      return whenNotVisible();
    }
    if (time && Date.now() - started < time) {
      return whenNotVisible();
    }
    if (notified) {
      return;
    }
    doOnVisible(function (ack) {
      if (ack) {
        notified = true;
      } else {
        interval && clearInterval(interval);
        listener && listener();
      }
    }, function (onHidden) {
      onNotVisible = onHidden;
    });
  };
  if (isAmp()) {
    listener = win.context.observeIntersection(function (changes) {
      changes.forEach(function (change) {
        doCheck(change.rootBounds.width, change.rootBounds.height, change.boundingClientRect);
      });
    });
  }
  interval = setInterval(function () {
    var winHeight = (win.innerHeight || document.documentElement.clientHeight);
    var winWidth = (win.innerWidth || document.documentElement.clientWidth);
    doCheck(winWidth, winHeight, element.getBoundingClientRect());
  }, 100);
}
function storeUuid(uuid) {
  if (window.mantis_uuid) {
    return false;
  }
  window.mantis_uuid = uuid;
  if (storage.hasLocalStorage()) {
    try {
      storage.setDataInLocalStorage('mantis:uuid', uuid);
    } catch (ex) {
    }
  }
}

function onMessage(type, callback) {
  window.addEventListener('message', function (event) {
    if (event.data.mantis && event.data.type == type) {
      callback(event.data.data);
    }
  }, false);
}
function isSendable(val) {
  if (val === null || val === undefined) {
    return false;
  }
  if (typeof val === 'string') {
    return !(!val || /^\s*$/.test(val));
  }
  if (typeof val === 'number') {
    return !isNaN(val);
  }
  return true;
}
function isObject(value) {
  return Object.prototype.toString.call(value) === '[object Object]';
}
function isAmp() {
  return typeof window.context === 'object' && (window.context.tagName === 'AMP-AD' || window.context.tagName === 'AMP-EMBED');
}
function isSecure() {
  return document.location.protocol === 'https:';
}
function isArray(value) {
  return Object.prototype.toString.call(value) === '[object Array]';
}

function jsonToQuery(data, chain, form) {
  var parts = form || [];
  for (var key in data) {
    var queryKey = key;
    if (chain) {
      queryKey = chain + '[' + key + ']';
    }
    var val = data[key];
    if (isArray(val)) {
      for (var index = 0; index < val.length; index++) {
        var akey = queryKey + '[' + index + ']';
        var aval = val[index];
        if (isObject(aval)) {
          jsonToQuery(aval, akey, parts);
        }
      }
    } else if (isObject(val) && val != data) {
      jsonToQuery(val, queryKey, parts);
    } else if (isSendable(val)) {
      parts.push(queryKey + '=' + encodeURIComponent(val));
    }
  }
  return parts.join('&');
}

function buildMantisUrl(path, data, domain) {
  var params = {
    referrer: document.referrer,
    tz: new Date().getTimezoneOffset(),
    buster: new Date().getTime(),
    secure: isSecure(),
    version: 9
  };

  if (window.mantis_uuid) {
    params.uuid = window.mantis_uuid;
  } else if (storage.hasLocalStorage()) {
    var localUuid = storage.getDataFromLocalStorage('mantis:uuid');
    if (localUuid) {
      params.uuid = localUuid;
    }
  }
  if (!inIframe()) {
    try {
      params.title = window.top.document.title;
      params.referrer = window.top.document.referrer;
      params.url = window.top.document.location.href;
    } catch (ex) {
    }
  } else {
    params.iframe = true;
  }
  if (isAmp()) {
    params.amp = true;
    if (!params.url && window.context.canonicalUrl) {
      params.url = window.context.canonicalUrl;
    }
    if (!params.url && window.context.location) {
      params.url = window.context.location.href;
    }
    if (!params.referrer && window.context.referrer) {
      params.referrer = window.context.referrer;
    }
  }
  Object.keys(data).forEach(function (key) {
    params[key] = data[key];
  });
  var query = jsonToQuery(params);
  return (window.mantis_domain === undefined ? domain || 'https://mantodea.mantisadnetwork.com' : window.mantis_domain) + path + '?' + query;
}

export const spec = {
  code: 'mantis',
  supportedMediaTypes: ['banner'],
  isBidRequestValid: function (bid) {
    return !!(bid.params.property && (bid.params.code || bid.params.zoneId || bid.params.zone));
  },
  buildRequests: function (validBidRequests, bidderRequest) {
    var property = null;
    validBidRequests.some(function (bid) {
      if (bid.params.property) {
        property = bid.params.property;
        return true;
      }
    });
    const query = {
      measurable: true,
      usp: bidderRequest && bidderRequest.uspConsent,
      bids: validBidRequests.map(function (bid) {
        return {
          bidId: bid.bidId,
          config: bid.params,
          sizes: bid.sizes.map(function (size) {
            return {width: size[0], height: size[1]};
          })
        };
      }),
      property: property
    };

    if (bidderRequest && bidderRequest.gdprConsent && bidderRequest.gdprConsent.gdprApplies) {
      // we purposefully do not track data for users in the EU
      query.consent = false;
    }

    return {
      method: 'GET',
      url: buildMantisUrl('/prebid/display', query) + '&foo',
      data: ''
    };
  },
  interpretResponse: function (serverResponse) {
    storeUuid(serverResponse.body.uuid);
    return serverResponse.body.ads.map(function (ad) {
      return {
        requestId: ad.bid,
        cpm: ad.cpm,
        width: ad.width,
        height: ad.height,
        ad: ad.html,
        ttl: ad.ttl || serverResponse.body.ttl || 86400,
        creativeId: ad.view,
        netRevenue: true,
        currency: 'USD'
      };
    });
  },
  getUserSyncs: function (syncOptions, serverResponses, gdprConsent, uspConsent) {
    if (syncOptions.iframeEnabled) {
      return [{
        type: 'iframe',
        url: buildMantisUrl('/prebid/iframe', {gdpr: gdprConsent, uspConsent: uspConsent})
      }];
    }
    if (syncOptions.pixelEnabled) {
      return [{
        type: 'image',
        url: buildMantisUrl('/prebid/pixel', {gdpr: gdprConsent, uspConsent: uspConsent})
      }];
    }
  }
};

export function sfPostMessage ($sf, width, height, callback) {
  var viewed = false;
  // eslint-disable-next-line no-undef
  $sf.ext.register(width, height, function () {
    // eslint-disable-next-line no-undef
    if ($sf.ext.inViewPercentage() < 50 || viewed) {
      return;
    }
    viewed = true;
    callback();
  });
};

export function iframePostMessage (win, name, callback) {
  var frames = document.getElementsByTagName('iframe');
  for (var i = 0; i < frames.length; i++) {
    var frame = frames[i];
    if (frame.name == name) {
      onVisible(win, frame, function (stop) {
        callback();
        stop();
      }, 1000, 0.50);
    }
  }
}

onMessage('iframe', function (data) {
  if (window.$sf) {
    sfPostMessage(window.$sf, data.width, data.height, () => pixel(data.pixel));
  } else {
    iframePostMessage(window, data.frame, () => pixel(data.pixel));
  }
});

registerBidder(spec);
