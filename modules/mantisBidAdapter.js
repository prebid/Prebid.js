import {registerBidder} from 'src/adapters/bidderFactory';

function inIframe() {
  try {
    return window.self !== window.top && !window.mantis_link;
  } catch (e) {
    return true;
  }
}

function isDesktop(ignoreTouch) {
  var supportsTouch = !ignoreTouch && ('ontouchstart' in window || navigator.msMaxTouchPoints);
  if (inIframe()) {
    return !supportsTouch;
  }
  var width = window.innerWidth || window.document.documentElement.clientWidth || window.document.body.clientWidth;
  return !supportsTouch && (!width || width >= (window.mantis_breakpoint || 768));
}

function storeUuid(uuid) {
  if (window.mantis_uuid) {
    return false;
  }
  window.mantis_uuid = uuid;
  if (window.localStorage) {
    try {
      window.localStorage.setItem('mantis:uuid', uuid);
    } catch (ex) {
    }
  }
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
  if (!data) {
    return null;
  }
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
        } else if (isSendable(aval)) {
          parts.push(akey + '=' + encodeURIComponent(aval));
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
    secure: isSecure()
  };
  if (!inIframe() || isAmp()) {
    params.mobile = !isAmp() && isDesktop(true) ? 'false' : 'true';
  }
  if (window.mantis_uuid) {
    params.uuid = window.mantis_uuid;
  } else if (window.localStorage) {
    var localUuid = window.localStorage.getItem('mantis:uuid');
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
  Object.keys(data || {}).forEach(function (key) {
    params[key] = data[key];
  });
  var query = jsonToQuery(params);
  return (window.mantis_domain === undefined ? domain || 'https://mantodea.mantisadnetwork.com' : window.mantis_domain) + path + '?' + query;
}

const spec = {
  code: 'mantis',
  supportedMediaTypes: ['banner', 'video', 'native'],
  isBidRequestValid: function (bid) {
    return !!(bid.params.property && (bid.params.code || bid.params.zoneId || bid.params.zone));
  },
  buildRequests: function (validBidRequests) {
    var property = null;
    validBidRequests.some(function (bid) {
      if (bid.params.property) {
        property = bid.params.property;
        return true;
      }
    });
    const query = {
      bids: validBidRequests.map(function (bid) {
        return {
          bidId: bid.bidId,
          config: bid.params,
          sizes: bid.sizes.map(function (size) {
            return {width: size[0], height: size[1]};
          })
        };
      }),
      property: property,
      version: 2
    };
    return {
      method: 'GET',
      url: buildMantisUrl('/prebid/display', query) + '&foo',
      data: ''
    };
  },
  interpretResponse: function (serverResponse) {
    storeUuid(serverResponse.uuid);
    return serverResponse.body.ads.map(function (ad) {
      return {
        requestId: ad.bid,
        cpm: ad.cpm,
        width: ad.width,
        height: ad.height,
        ad: ad.html,
        ttl: 86400,
        creativeId: ad.view,
        netRevenue: true,
        currency: 'USD'
      };
    });
  },
  getUserSyncs: function (syncOptions) {
    if (syncOptions.iframeEnabled) {
      return [{
        type: 'iframe',
        url: buildMantisUrl('/prebid/iframe')
      }];
    }
    if (syncOptions.pixelEnabled) {
      return [{
        type: 'image',
        url: buildMantisUrl('/prebid/pixel')
      }];
    }
  }
};

export {spec};

registerBidder(spec);
