'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

function _typeof(obj) {
  "@babel/helpers - typeof";

  return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (obj) {
    return typeof obj;
  } : function (obj) {
    return obj && "function" == typeof Symbol && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj;
  }, _typeof(obj);
}

function unwrapExports (x) {
	return x && x.__esModule && Object.prototype.hasOwnProperty.call(x, 'default') ? x['default'] : x;
}

function createCommonjsModule(fn, module) {
	return module = { exports: {} }, fn(module, module.exports), module.exports;
}

var dist = createCommonjsModule(function (module, exports) {

  Object.defineProperty(exports, '__esModule', {
    value: true
  });
  var UUID = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}';
  var uuidRegex = new RegExp("^".concat(UUID, "$"), 'i');
  var hasTrim = !!String.prototype.trim;
  function safeToString(value) {
    return _typeof(value) === 'object' ? JSON.stringify(value) : '' + value;
  }
  function nonNull(value) {
    return value != null;
  }
  function isNonEmpty(value) {
    return nonNull(value) && trim(value).length > 0;
  }
  function isUUID(value) {
    return !!value && uuidRegex.test(trim(value));
  }
  function isArray(arr) {
    return Object.prototype.toString.call(arr) === '[object Array]';
  }
  function trim(value) {
    return hasTrim ? ('' + value).trim() : ('' + value).replace(/^[\s\uFEFF\xA0]+|[\s\uFEFF\xA0]+$/g, '');
  }
  function isString(str) {
    return typeof str === 'string';
  }
  function strEqualsIgnoreCase(fistStr, secondStr) {
    return isString(fistStr) && isString(secondStr) && trim(fistStr.toLowerCase()) === trim(secondStr.toLowerCase());
  }
  function isObject(obj) {
    return !!obj && _typeof(obj) === 'object' && !isArray(obj);
  }
  function isRecord(obj) {
    return isObject(obj);
  }
  function isFunction(fun) {
    return !!fun && typeof fun === 'function';
  }
  function _expiresIn(expires, number) {
    return new Date(new Date().getTime() + expires * number);
  }
  function expiresInDays(expires) {
    return _expiresIn(expires, 864e5);
  }
  function expiresInHours(expires) {
    return _expiresIn(expires, 36e5);
  }
  function wrapError(name, e, message) {
    if (isObject(e)) {
      var error = void 0;
      if ('message' in e && typeof e.message === 'string') {
        error = new Error(message || e.message);
      } else {
        error = new Error(message);
      }
      error.name = name;
      if ('stack' in e && typeof e.stack === 'string') {
        error.stack = e.stack;
      }
      if ('lineNumber' in e && typeof e.lineNumber === 'number') {
        error.lineNumber = e.lineNumber;
      }
      if ('columnNumber' in e && typeof e.columnNumber === 'number') {
        error.columnNumber = e.columnNumber;
      }
      return error;
    } else {
      var error = Error(message);
      error.name = name;
      return error;
    }
  }
  var ERRORS_CHANNEL = 'li_errors';
  var ReplayEmitter = /** @class */function () {
    function ReplayEmitter(replaySize) {
      this.size = 5;
      if (typeof replaySize === 'number') {
        this.size = replaySize;
      } else if (typeof replaySize === 'string') {
        this.size = parseInt(replaySize) || this.size;
      }
      this.h = {};
      this.q = {};
    }
    ReplayEmitter.prototype.on = function (name, callback, ctx) {
      var handler = {
        callback: callback.bind(ctx),
        unbound: callback
      };
      (this.h[name] || (this.h[name] = [])).push(handler);
      var eventQueueLen = (this.q[name] || []).length;
      for (var i = 0; i < eventQueueLen; i++) {
        callback.call(ctx, this.q[name][i]);
      }
      return this;
    };
    ReplayEmitter.prototype.once = function (name, callback, ctx) {
      var _this = this;
      var eventQueue = this.q[name] || [];
      if (eventQueue.length > 0) {
        callback.call(ctx, eventQueue[0]);
        return this;
      } else {
        var listener_1 = function listener_1(args) {
          _this.off(name, listener_1);
          callback.call(ctx, args);
        };
        listener_1._ = callback;
        return this.on(name, listener_1, ctx);
      }
    };
    ReplayEmitter.prototype.emit = function (name, event) {
      var evtArr = (this.h[name] || []).slice();
      var i = 0;
      var len = evtArr.length;
      for (i; i < len; i++) {
        evtArr[i].callback(event);
      }
      var eventQueue = this.q[name] || (this.q[name] = []);
      if (eventQueue.length >= this.size) {
        eventQueue.shift();
      }
      eventQueue.push(event);
      return this;
    };
    ReplayEmitter.prototype.off = function (name, callback) {
      var handlers = this.h[name];
      var liveEvents = [];
      if (handlers && callback) {
        for (var i = 0, len = handlers.length; i < len; i++) {
          if (handlers[i].unbound !== callback) {
            liveEvents.push(handlers[i]);
          }
        }
      }
      liveEvents.length ? this.h[name] = liveEvents : delete this.h[name];
      return this;
    };
    ReplayEmitter.prototype.emitErrorWithMessage = function (name, message, exception) {
      var wrappedError = wrapError(name, exception, message);
      return this.emit(ERRORS_CHANNEL, wrappedError);
    };
    ReplayEmitter.prototype.emitError = function (name, exception) {
      var wrappedError = wrapError(name, exception);
      return this.emit(ERRORS_CHANNEL, wrappedError);
    };
    return ReplayEmitter;
  }();
  exports.ERRORS_CHANNEL = ERRORS_CHANNEL;
  exports.ReplayEmitter = ReplayEmitter;
  exports.UUID = UUID;
  exports.expiresInDays = expiresInDays;
  exports.expiresInHours = expiresInHours;
  exports.isArray = isArray;
  exports.isFunction = isFunction;
  exports.isNonEmpty = isNonEmpty;
  exports.isObject = isObject;
  exports.isRecord = isRecord;
  exports.isString = isString;
  exports.isUUID = isUUID;
  exports.nonNull = nonNull;
  exports.safeToString = safeToString;
  exports.strEqualsIgnoreCase = strEqualsIgnoreCase;
  exports.trim = trim;
  exports.wrapError = wrapError;
});
var cjs = unwrapExports(dist);
dist.ERRORS_CHANNEL;
dist.ReplayEmitter;
dist.UUID;
dist.expiresInDays;
dist.expiresInHours;
dist.isArray;
dist.isFunction;
dist.isNonEmpty;
dist.isObject;
dist.isRecord;
dist.isString;
dist.isUUID;
dist.nonNull;
dist.safeToString;
dist.strEqualsIgnoreCase;
dist.trim;
dist.wrapError;

// Generated by rollup-plugin-mjs-entry
var ERRORS_CHANNEL = cjs.ERRORS_CHANNEL;
var ReplayEmitter = cjs.ReplayEmitter;
cjs.UUID;
var expiresInDays = cjs.expiresInDays;
var expiresInHours = cjs.expiresInHours;
var isArray = cjs.isArray;
var isFunction = cjs.isFunction;
var isNonEmpty = cjs.isNonEmpty;
var isObject = cjs.isObject;
var isRecord = cjs.isRecord;
var isString = cjs.isString;
var isUUID = cjs.isUUID;
var nonNull = cjs.nonNull;
var safeToString = cjs.safeToString;
var strEqualsIgnoreCase = cjs.strEqualsIgnoreCase;
var trim = cjs.trim;
var wrapError = cjs.wrapError;

function asParamOrEmpty(param, value, transform) {
    return isNonEmpty(value) ? [[param, transform(value)]] : [];
}
function asStringParam(param, value) {
    return asParamOrEmpty(param, value, function (s) { return encodeURIComponent(s); });
}
function asStringParamTransform(param, value, transform) {
    return asParamOrEmpty(param, value, function (s) { return encodeURIComponent(transform(s)); });
}
function asStringParamWhen(param, value, predicate) {
    return (isNonEmpty(value) && isFunction(predicate) && predicate(value)) ? [[param, encodeURIComponent(value)]] : [];
}
function mapAsParams(paramsMap) {
    if (paramsMap && isObject(paramsMap)) {
        var array_1 = [];
        Object.keys(paramsMap).forEach(function (key) {
            var value = paramsMap[key];
            if (value && !isObject(value) && value.length) {
                if (isArray(value)) {
                    value.forEach(function (entry) { return array_1.push([encodeURIComponent(key), encodeURIComponent(entry)]); });
                }
                else {
                    array_1.push([encodeURIComponent(key), encodeURIComponent(value)]);
                }
            }
        });
        return array_1;
    }
    else {
        return [];
    }
}

var DEFAULT_AJAX_TIMEOUT = 0;
var PixelSender = /** @class */ (function () {
    function PixelSender(liveConnectConfig, calls, eventBus, onload, presend) {
        this.url = (liveConnectConfig && liveConnectConfig.collectorUrl) || 'https://rp.liadm.com';
        this.calls = calls;
        this.eventBus = eventBus;
        this.onload = onload;
        this.presend = presend;
    }
    PixelSender.prototype.callBakers = function (bakersJson) {
        try {
            var bakers = JSON.parse(bakersJson).bakers;
            if (isArray(bakers)) {
                for (var i = 0; i < bakers.length; i++)
                    this.calls.pixelGet("".concat(bakers[i], "?dtstmp=").concat(Date.now()));
            }
        }
        catch (e) {
            this.eventBus.emitErrorWithMessage('CallBakers', "Error while calling bakers with ".concat(bakersJson), e);
        }
    };
    PixelSender.prototype.sendState = function (state, endpoint, makeCall) {
        var _a;
        if (state.sendsPixel()) {
            if (isFunction(this.presend)) {
                this.presend();
            }
            var dtstmpTuple = asStringParam('dtstmp', Date.now());
            var query = (_a = state.asQuery()).prependParams.apply(_a, dtstmpTuple);
            var queryString = query.toQueryString();
            var uri = "".concat(this.url, "/").concat(endpoint).concat(queryString);
            makeCall(uri);
        }
    };
    PixelSender.prototype.sendAjax = function (state) {
        var _this = this;
        this.sendState(state, 'j', function (uri) {
            _this.calls.ajaxGet(uri, function (bakersJson) {
                if (isFunction(_this.onload))
                    _this.onload();
                _this.callBakers(bakersJson);
            }, function (e) {
                _this.sendPixel(state);
                _this.eventBus.emitError('AjaxFailed', e);
            }, DEFAULT_AJAX_TIMEOUT);
        });
    };
    PixelSender.prototype.sendPixel = function (state) {
        var _this = this;
        this.sendState(state, 'p', function (uri) { return _this.calls.pixelGet(uri, _this.onload); });
    };
    return PixelSender;
}());

// btoa() as defined by the HTML and Infra specs, which mostly just references RFC 4648.
function btoa(s) {
    // String conversion as required by Web IDL.
    s = "".concat(s);
    // "The btoa() method must throw an "InvalidCharacterError" DOMException if
    // data contains any character whose code point is greater than U+00FF."
    for (var i = 0; i < s.length; i++) {
        if (s.charCodeAt(i) > 255) {
            return null;
        }
    }
    var out = '';
    for (var i = 0; i < s.length; i += 3) {
        var groupsOfSix = [undefined, undefined, undefined, undefined];
        groupsOfSix[0] = s.charCodeAt(i) >> 2;
        groupsOfSix[1] = (s.charCodeAt(i) & 0x03) << 4;
        if (s.length > i + 2) {
            groupsOfSix[1] |= s.charCodeAt(i + 1) >> 4;
            groupsOfSix[2] = (s.charCodeAt(i + 1) & 0x0f) << 2;
            groupsOfSix[2] |= s.charCodeAt(i + 2) >> 6;
            groupsOfSix[3] = s.charCodeAt(i + 2) & 0x3f;
        }
        else if (s.length > i + 1) {
            groupsOfSix[1] |= s.charCodeAt(i + 1) >> 4;
            groupsOfSix[2] = (s.charCodeAt(i + 1) & 0x0f) << 2;
        }
        for (var j = 0; j < groupsOfSix.length; j++) {
            var element = groupsOfSix[j];
            if (typeof element === 'undefined') {
                out += '=';
            }
            else {
                out += btoaLookup(element);
            }
        }
    }
    return out;
}
// Lookup table for btoa(), which converts a six-bit number into the corresponding ASCII character.
var keystr = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
function btoaLookup(index) {
    return (index >= 0 && index < 64) ? keystr[index] : undefined;
}

function _safeBtoa(s) {
    var res = btoa(s);
    return res || '';
}
var _base64encodeRegex = /[+/]|=+$/g;
var _base64ToUrlEncodedChars = {
    '+': '-',
    '/': '_'
};
function _replaceBase64Chars(x) {
    return _base64ToUrlEncodedChars[x] || '';
}
function base64UrlEncode(s) {
    var btoa = null;
    // First we escape the string using encodeURIComponent to get the UTF-8 encoding of the characters,
    // then we convert the percent encodings into raw bytes, and finally feed it to btoa() function.
    var utf8Bytes = encodeURIComponent(s).replace(/%([0-9A-F]{2})/g, function (match, p1) { return String.fromCharCode(parseInt('0x' + p1, 16)); });
    try {
        btoa = (window && isFunction(window.btoa)) ? window.btoa : _safeBtoa;
    }
    catch (e) {
        btoa = _safeBtoa;
    }
    return btoa(utf8Bytes).replace(_base64encodeRegex, _replaceBase64Chars);
}

for (var r$1 = [], o$1 = 0; o$1 < 64;) {
  r$1[o$1] = 0 | 4294967296 * Math.sin(++o$1 % Math.PI);
}
var md5 = function md5(e) {
  var t,
    n,
    f,
    a = [t = 1732584193, n = 4023233417, ~t, ~n],
    c = [],
    h = unescape(encodeURI(e)) + "",
    u = h.length;
  for (e = --u / 4 + 2 | 15, c[--e] = 8 * u; ~u;) {
    c[u >> 2] |= h.charCodeAt(u) << 8 * u--;
  }
  for (o$1 = h = 0; o$1 < e; o$1 += 16) {
    for (u = a; h < 64; u = [f = u[3], t + ((f = u[0] + [t & n | ~t & f, f & t | ~f & n, t ^ n ^ f, n ^ (t | ~f)][u = h >> 4] + r$1[h] + ~~c[o$1 | 15 & [h, 5 * h + 1, 3 * h + 5, 7 * h][u]]) << (u = [7, 12, 17, 22, 5, 9, 14, 20, 4, 11, 16, 23, 6, 10, 15, 21][4 * u + h++ % 4]) | f >>> -u), t, n]) {
      t = 0 | u[1], n = u[2];
    }
    for (h = 4; h;) {
      a[--h] += u[h];
    }
  }
  for (e = ""; h < 32;) {
    e += (a[h >> 3] >> 4 * (1 ^ h++) & 15).toString(16);
  }
  return e;
};

var sha1 = function sha1(o) {
  var r,
    e,
    n,
    t,
    f,
    c = [],
    u = [e = 1732584193, n = 4023233417, ~e, ~n, 3285377520],
    a = [],
    d = unescape(encodeURI(o)) + "",
    g = d.length;
  for (a[o = --g / 4 + 2 | 15] = 8 * g; ~g;) {
    a[g >> 2] |= d.charCodeAt(g) << 8 * ~g--;
  }
  for (r = g = 0; r < o; r += 16) {
    for (e = u; g < 80; e = [e[4] + (c[g] = g < 16 ? ~~a[r + g] : 2 * d | d < 0) + 1518500249 + [n & t | ~n & f, d = 341275144 + (n ^ t ^ f), 882459459 + (n & t | n & f | t & f), d + 1535694389][g++ / 5 >> 2] + ((d = e[0]) << 5 | d >>> 27), d, n << 30 | n >>> 2, t, f]) {
      d = c[g - 3] ^ c[g - 8] ^ c[g - 14] ^ c[g - 16], n = e[1], t = e[2], f = e[3];
    }
    for (g = 5; g;) {
      u[--g] += e[g];
    }
  }
  for (d = ""; g < 40;) {
    d += (u[g >> 3] >> 4 * (7 - g++) & 15).toString(16);
  }
  return d;
};

for (var r, o = 18, n = [], e = []; o > 1; o--) {
  for (r = o; r < 320;) {
    n[r += o] = 1;
  }
}
function t(r, o) {
  return 4294967296 * Math.pow(r, 1 / o) | 0;
}
for (r = 0; r < 64;) {
  n[++o] || (e[r] = t(o, 2), n[r++] = t(o, 3));
}
function f(r, o) {
  return r >>> o | r << -o;
}
var sha256 = function sha256(u) {
  var c = e.slice(o = r = 0, 8),
    i = [],
    a = unescape(encodeURI(u)) + "",
    p = a.length;
  for (i[u = --p / 4 + 2 | 15] = 8 * p; ~p;) {
    i[p >> 2] |= a.charCodeAt(p) << 8 * ~p--;
  }
  for (p = []; o < u; o += 16) {
    for (t = c.slice(); r < 64; t.unshift(a + (f(a = t[0], 2) ^ f(a, 13) ^ f(a, 22)) + (a & t[1] ^ t[1] & t[2] ^ t[2] & a))) {
      t[3] += a = 0 | (p[r] = r < 16 ? ~~i[r + o] : (f(a = p[r - 2], 17) ^ f(a, 19) ^ a >>> 10) + p[r - 7] + (f(a = p[r - 15], 7) ^ f(a, 18) ^ a >>> 3) + p[r - 16]) + t.pop() + (f(a = t[4], 6) ^ f(a, 11) ^ f(a, 25)) + (a & t[5] ^ ~a & t[6]) + n[r++];
    }
    for (r = 8; r;) {
      c[--r] += t[r];
    }
  }
  for (a = ""; r < 64;) {
    a += (c[r >> 3] >> 4 * (7 - r++) & 15).toString(16);
  }
  return a;
};

var hashLikeRegex = function () { return /(\s+)?[a-f0-9]{32,64}(\s+)?/gi; };
var lengthToHashType = new Map([[32, 'md5'], [40, 'sha1'], [64, 'sha256']]);
function isHash(hash) {
    var extractedHash = extractHashValue(hash);
    return !!extractedHash && lengthToHashType.has(extractedHash.length);
}
function extractHashValue(s) {
    var result = s.match(hashLikeRegex());
    return result && result.map(trim)[0];
}
function hashEmail(email) {
    var lowerCasedEmail = email.toLowerCase();
    return {
        md5: md5(lowerCasedEmail),
        sha1: sha1(lowerCasedEmail),
        sha256: sha256(lowerCasedEmail)
    };
}
function domainHash(domain, limit) {
    if (limit === void 0) { limit = 12; }
    return sha1(domain.replace(/^\./, '')).substring(0, limit);
}

var emailRegex = function () { return /\S+(@|%40)\S+\.\S+/; };
function isEmail(s) {
    return emailRegex().test(s);
}
function containsEmailField(s) {
    return emailRegex().test(s);
}
function extractEmail(s) {
    var result = s.match(emailRegex());
    return result && result.map(trim)[0];
}
function listEmailsInString(s) {
    var result = [];
    // eslint-disable-next-line
    var emailLikeRegex = "([\\w\\d.+-]+(@|%40)[\\w\\d-]+.[\\w\\d.-]+)";
    var multipleEmailLikeRegex = new RegExp(emailLikeRegex, 'g');
    var current = multipleEmailLikeRegex.exec(s);
    while (current) {
        result.push(trim(current[1]));
        current = multipleEmailLikeRegex.exec(s);
    }
    return result;
}
function replaceEmailsWithHashes(originalString) {
    var emailsInString = listEmailsInString(originalString);
    var hashes = [];
    var convertedString = originalString;
    for (var i = 0; i < emailsInString.length; i++) {
        var email = emailsInString[i];
        var emailHashes = hashEmail(email);
        convertedString = convertedString.replace(email, emailHashes.md5);
        hashes.push(emailHashes);
    }
    return {
        stringWithoutRawEmails: convertedString,
        hashesFromOriginalString: hashes
    };
}

var MASK = '*********';
function replacer(key, value) {
    return (typeof value === 'string' && isEmail(trim(value))) ? MASK : value;
}

var toParams = function (tuples) {
    var acc = '';
    tuples.forEach(function (tuple) {
        var operator = acc.length === 0 ? '?' : '&';
        if (tuple && tuple.length && tuple.length === 2 && tuple[0] && tuple[1]) {
            acc = "".concat(acc).concat(operator).concat(tuple[0], "=").concat(tuple[1]);
        }
    });
    return acc;
};
function _isNum(v) {
    return isNaN(+v) ? v : +v;
}
function _isNull(v) {
    return v === 'null' || v === 'undefined' ? null : v;
}
function _isBoolean(v) {
    return v === 'false' ? false : (v === 'true' ? true : v);
}
function _convert(v) {
    return _isBoolean(_isNull(_isNum(v)));
}
function _parseParam(params, key) {
    if (key in params) {
        var value = params[key];
        if (isArray(value)) {
            return value.map(function (v) { return _convert(decodeValue(v)); });
        }
        else {
            return _convert(decodeValue(value));
        }
    }
}
function _allParams(url) {
    var questionMarkIndex, queryParams, historyIndex;
    var obj = {};
    if (!url || (questionMarkIndex = url.indexOf('?')) === -1 || !(queryParams = url.slice(questionMarkIndex + 1))) {
        return obj;
    }
    if ((historyIndex = queryParams.indexOf('#')) !== -1 && !(queryParams = queryParams.slice(0, historyIndex))) {
        return obj;
    }
    queryParams.split('&').forEach(function (raw) {
        if (raw) {
            var key = void 0;
            var split = raw.split('=');
            key = split[0];
            var value = split.length === 2 ? split[1] : 'true';
            if (key.slice(-2) === '[]') {
                key = key.slice(0, -2);
            }
            if (key in obj) {
                var previous = obj[key];
                if (isArray(previous)) {
                    previous.push(value);
                }
                else {
                    obj[key] = [previous, value];
                }
            }
            else {
                obj[key] = value;
            }
        }
    });
    return obj;
}
function decodeValue(v) {
    return v.replace(/(%[\dA-F]{2})+/gi, decodeURIComponent);
}
function getQueryParameter(url, name) {
    var params = _allParams(url);
    return _parseParam(params, name);
}

var MAX_ITEMS = 10;
var LIMITING_KEYS = ['items', 'itemids'];
var HASH_BEARERS = ['email', 'emailhash', 'hash', 'hashedemail'];
function _provided(state) {
    var eventSource = state.eventSource || {};
    var objectKeys = Object.keys(eventSource);
    for (var _i = 0, objectKeys_1 = objectKeys; _i < objectKeys_1.length; _i++) {
        var key = objectKeys_1[_i];
        var lowerCased = key.toLowerCase();
        if (HASH_BEARERS.indexOf(lowerCased) > -1) {
            var value = trim(safeToString(eventSource[key]));
            var extractedEmail = extractEmail(value);
            var extractedHash = extractHashValue(value);
            if (extractedEmail) {
                var hashes = hashEmail(decodeValue(extractedEmail));
                return mergeObjects({ hashedEmail: [hashes.md5, hashes.sha1, hashes.sha256] }, state);
            }
            else if (extractedHash && isHash(extractedHash)) {
                return mergeObjects({ hashedEmail: [extractedHash.toLowerCase()] }, state);
            }
        }
    }
    return state;
}
function _itemsLimiter(state) {
    var event = state.eventSource || {};
    Object.keys(event).forEach(function (key) {
        var lowerCased = key.toLowerCase();
        var value = event[key];
        if (LIMITING_KEYS.indexOf(lowerCased) > -1 && isArray(value) && value.length > MAX_ITEMS) {
            value.length = MAX_ITEMS;
        }
    });
    return {};
}
var fiddlers = [_provided, _itemsLimiter];
function fiddle(state) {
    var reducer = function (accumulator, func) {
        return mergeObjects(accumulator, func(accumulator));
    };
    if (isObject(state.eventSource)) {
        return fiddlers.reduce(reducer, state);
    }
    else {
        return state;
    }
}
function mergeObjects(obj1, obj2) {
    var res = {};
    function clean(obj) {
        return isObject(obj) ? obj : {};
    }
    function keys(obj) {
        return Object.keys(obj);
    }
    var first = clean(obj1);
    var second = clean(obj2);
    keys(first).forEach(function (key) {
        res[key] = first[key];
    });
    keys(second).forEach(function (key) {
        res[key] = second[key];
    });
    return res;
}

var noOpEvents = ['setemail', 'setemailhash', 'sethashedemail'];
function ifDefined(key, fun) {
    return function (state) {
        var value = state[key];
        if (nonNull(value)) {
            return fun(value);
        }
        else {
            return [];
        }
    };
}
var paramExtractors = [
    ifDefined('appId', function (aid) { return asStringParam('aid', aid); }),
    ifDefined('distributorId', function (did) { return asStringParam('did', did); }),
    ifDefined('eventSource', function (source) { return asParamOrEmpty('se', source, function (s) { return base64UrlEncode(JSON.stringify(s, replacer)); }); }),
    ifDefined('liveConnectId', function (fpc) { return asStringParam('duid', fpc); }),
    ifDefined('trackerName', function (tn) { return asStringParam('tna', tn); }),
    ifDefined('pageUrl', function (purl) { return asStringParam('pu', purl); }),
    ifDefined('errorDetails', function (ed) { return asParamOrEmpty('ae', ed, function (s) { return base64UrlEncode(JSON.stringify(s)); }); }),
    ifDefined('retrievedIdentifiers', function (identifiers) {
        var identifierParams = [];
        if (isArray(identifiers)) {
            identifiers.forEach(function (i) { return identifierParams.push.apply(identifierParams, asStringParam("ext_".concat(i.name), i.value)); });
        }
        return identifierParams;
    }),
    ifDefined('hashesFromIdentifiers', function (hashes) {
        var hashParams = [];
        if (isArray(hashes)) {
            hashes.forEach(function (h) { return hashParams.push.apply(hashParams, asStringParam('scre', "".concat(h.md5, ",").concat(h.sha1, ",").concat(h.sha256))); });
        }
        return hashParams;
    }),
    ifDefined('decisionIds', function (dids) { return asStringParamTransform('li_did', dids, function (s) { return s.join(','); }); }),
    ifDefined('hashedEmail', function (he) { return asStringParamTransform('e', he, function (s) { return s.join(','); }); }),
    ifDefined('usPrivacyString', function (usps) { return asStringParam('us_privacy', usps); }),
    ifDefined('wrapperName', function (wrapper) { return asStringParam('wpn', wrapper); }),
    ifDefined('gdprApplies', function (gdprApplies) { return asStringParamTransform('gdpr', gdprApplies, function (s) { return s ? 1 : 0; }); }),
    ifDefined('privacyMode', function (privacyMode) { return asStringParamWhen('n3pc', privacyMode ? 1 : 0, function (v) { return v === 1; }); }),
    ifDefined('privacyMode', function (privacyMode) { return asStringParamWhen('n3pct', privacyMode ? 1 : 0, function (v) { return v === 1; }); }),
    ifDefined('privacyMode', function (privacyMode) { return asStringParamWhen('nb', privacyMode ? 1 : 0, function (v) { return v === 1; }); }),
    ifDefined('gdprConsent', function (gdprConsentString) { return asStringParam('gdpr_consent', gdprConsentString); }),
    ifDefined('referrer', function (referrer) { return asStringParam('refr', referrer); }),
    ifDefined('contextElements', function (contextElements) { return asStringParam('c', contextElements); })
];
var Query = /** @class */ (function () {
    function Query(tuples) {
        this.tuples = tuples;
    }
    Query.prototype.prependParams = function () {
        var params = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            params[_i] = arguments[_i];
        }
        var _tuples = this.tuples;
        _tuples.unshift.apply(_tuples, params);
        return new Query(_tuples);
    };
    Query.prototype.toQueryString = function () {
        return toParams(this.tuples);
    };
    return Query;
}());
var StateWrapper = /** @class */ (function () {
    function StateWrapper(state, eventBus) {
        this.data = StateWrapper.safeFiddle(state, eventBus);
        this.eventBus = eventBus;
    }
    StateWrapper.safeFiddle = function (newInfo, eventBus) {
        try {
            return fiddle(JSON.parse(JSON.stringify(newInfo)));
        }
        catch (e) {
            console.error(e);
            eventBus.emitErrorWithMessage('StateCombineWith', 'Error while extracting event data', e);
            return {};
        }
    };
    StateWrapper.prototype.combineWith = function (newInfo) {
        return new StateWrapper(mergeObjects(this.data, newInfo), this.eventBus);
    };
    StateWrapper.prototype.sendsPixel = function () {
        var source = isObject(this.data.eventSource) ? this.data.eventSource : {};
        var eventKeys = Object.keys(source)
            .filter(function (objKey) { return objKey.toLowerCase() === 'eventname' || objKey.toLowerCase() === 'event'; });
        var eventKey = eventKeys && eventKeys.length >= 1 && eventKeys[0];
        var eventName = eventKey && trim(source[eventKey]);
        return !eventName || noOpEvents.indexOf(eventName.toLowerCase()) === -1;
    };
    StateWrapper.prototype.asTuples = function () {
        var _this = this;
        var acc = [];
        paramExtractors.forEach(function (extractor) {
            var params = extractor(_this.data);
            if (params && isArray(params)) {
                acc.push.apply(acc, params);
            }
        });
        return acc;
    };
    StateWrapper.prototype.asQuery = function () {
        return new Query(this.asTuples());
    };
    return StateWrapper;
}());

function loadedDomain() {
    return (document.domain || (document.location && document.location.host)) || (window && window.location && window.location.host) || 'localhost';
}
function getReferrer(win) {
    if (win === void 0) { win = window; }
    return _safeGet(function () { return win.top.document.referrer; });
}
function getPage(win) {
    if (win === void 0) { win = window; }
    var ancestorOrigins = _safeGet(function () { return win.location.ancestorOrigins; }) || [];
    var windows = [];
    var currentWindow = win;
    while (currentWindow !== top) {
        windows.push(currentWindow);
        currentWindow = currentWindow.parent;
    }
    windows.push(currentWindow);
    var detectedPageUrl;
    var _loop_1 = function (i) {
        detectedPageUrl = _safeGet(function () { return windows[i].location.href; });
        if (i !== 0) {
            if (!detectedPageUrl)
                detectedPageUrl = _safeGet(function () { return windows[i - 1].document.referrer; });
            if (!detectedPageUrl)
                detectedPageUrl = ancestorOrigins[i - 1];
        }
    };
    for (var i = windows.length - 1; i >= 0 && !detectedPageUrl; i--) {
        _loop_1(i);
    }
    return detectedPageUrl;
}
function getContextElements(privacyMode, contextSelectors, contextElementsLength) {
    if (privacyMode || !contextSelectors || contextSelectors === '' || !contextElementsLength) {
        return '';
    }
    else {
        var collectedElements = _collectElementsText(contextSelectors, contextElementsLength);
        return base64UrlEncode(collectedElements);
    }
}
function _collectElementsText(contextSelectors, contextElementsLength) {
    var collectedElements = window.document.querySelectorAll(contextSelectors);
    var collectedString = '';
    for (var i = 0; i < collectedElements.length; i++) {
        var nextElement = replaceEmailsWithHashes(collectedElements[i].outerHTML).stringWithoutRawEmails;
        var maybeCollectedString = collectedString + nextElement;
        if (encodedByteCount(maybeCollectedString) <= contextElementsLength)
            collectedString = maybeCollectedString;
        else
            return collectedString;
    }
    return collectedString;
}
function encodedByteCount(s) {
    // From: https://stackoverflow.com/questions/2219526/how-many-bytes-in-a-javascript-string
    var utf8Bytelength = encodeURI(s).split(/%..|./).length - 1;
    var base64EncodedLength = 4 * Math.ceil(utf8Bytelength / 3.0);
    return base64EncodedLength;
}
function _safeGet(getter) {
    try {
        return getter();
    }
    catch (e) {
        return undefined;
    }
}

var _currentPage = null;
function enrich$4(state) {
    if (_currentPage) {
        return _currentPage;
    }
    else {
        var result = {
            pageUrl: getPage(),
            referrer: getReferrer(),
            contextElements: getContextElements(state.privacyMode, state.contextSelectors, state.contextElementsLength)
        };
        _currentPage = result;
        return result;
    }
}

var MAX_ERROR_FIELD_LENGTH = 120;
var _defaultReturn = {
    errorDetails: {
        message: 'Unknown message',
        name: 'Unknown name'
    }
};
function _asInt(field) {
    try {
        var intValue = field * 1;
        return isNaN(intValue) ? undefined : intValue;
    }
    catch (_a) {
    }
}
function _truncate(value) {
    try {
        if (isString(value) && value.length && value.length > MAX_ERROR_FIELD_LENGTH) {
            return "".concat(value.substr(0, MAX_ERROR_FIELD_LENGTH), "...");
        }
        else {
            return "".concat(value);
        }
    }
    catch (_a) {
    }
}
function asErrorDetails(e) {
    if (isRecord(e)) {
        return {
            errorDetails: {
                message: _truncate(e.message) || '',
                name: _truncate(e.name) || '',
                stackTrace: _truncate(e.stack),
                lineNumber: _asInt(e.lineNumber),
                columnNumber: _asInt(e.columnNumber),
                fileName: _truncate(e.fileName)
            }
        };
    }
    else {
        return _defaultReturn;
    }
}
function register(state, callHandler, eventBus) {
    try {
        var pixelSender_1 = new PixelSender(state, callHandler, eventBus);
        eventBus.on(ERRORS_CHANNEL, function (error) {
            pixelSender_1.sendPixel(new StateWrapper(asErrorDetails(error), eventBus).combineWith(state || {}).combineWith(enrich$4({})));
        });
    }
    catch (e) {
        console.error('handlers.error.register', e);
    }
}

var EVENT_BUS_NAMESPACE = '__li__evt_bus';
// reexport for backwards compat
var ERRORS_PREFIX = ERRORS_CHANNEL;
var PIXEL_SENT_PREFIX = 'lips';
var PRELOAD_PIXEL = 'pre_lips';
var PEOPLE_VERIFIED_LS_ENTRY = '_li_duid';
var DEFAULT_IDEX_EXPIRATION_HOURS = 1;
var DEFAULT_IDEX_AJAX_TIMEOUT = 5000;
var DEFAULT_IDEX_URL = 'https://idx.liadm.com/idex';
var DEFAULT_REQUESTED_ATTRIBUTES = []; // legacy behaviour; resolves nonId as unifiedId

var consts = /*#__PURE__*/Object.freeze({
  __proto__: null,
  EVENT_BUS_NAMESPACE: EVENT_BUS_NAMESPACE,
  ERRORS_PREFIX: ERRORS_PREFIX,
  PIXEL_SENT_PREFIX: PIXEL_SENT_PREFIX,
  PRELOAD_PIXEL: PRELOAD_PIXEL,
  PEOPLE_VERIFIED_LS_ENTRY: PEOPLE_VERIFIED_LS_ENTRY,
  DEFAULT_IDEX_EXPIRATION_HOURS: DEFAULT_IDEX_EXPIRATION_HOURS,
  DEFAULT_IDEX_AJAX_TIMEOUT: DEFAULT_IDEX_AJAX_TIMEOUT,
  DEFAULT_IDEX_URL: DEFAULT_IDEX_URL,
  DEFAULT_REQUESTED_ATTRIBUTES: DEFAULT_REQUESTED_ATTRIBUTES
});

// Borrowed from https://github.com/Kiosked/ulid
var ENCODING = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
var ENCODING_LEN = ENCODING.length;
var TIME_MAX = Math.pow(2, 48) - 1;
var TIME_LEN = 10;
var RANDOM_LEN = 16;
var prng = detectPrng();
function createError(message) {
    var err = new Error(message);
    err.source = 'Ulid';
    return err;
}
function detectPrng() {
    var root = typeof window !== 'undefined' ? window : null;
    var browserCrypto = root && (root.crypto || root.msCrypto);
    if (browserCrypto) {
        return function () {
            var buffer = new Uint8Array(1);
            browserCrypto.getRandomValues(buffer);
            return buffer[0] / 0xff;
        };
    }
    return function () { return Math.random(); };
}
function encodeTime(now, len) {
    if (now > TIME_MAX) {
        throw createError('cannot encode time greater than ' + TIME_MAX);
    }
    var mod;
    var str = '';
    for (; len > 0; len--) {
        mod = now % ENCODING_LEN;
        str = ENCODING.charAt(mod) + str;
        now = (now - mod) / ENCODING_LEN;
    }
    return str;
}
function encodeRandom(len) {
    var str = '';
    for (; len > 0; len--) {
        str = randomChar() + str;
    }
    return str;
}
function randomChar() {
    var rand = Math.floor(prng() * ENCODING_LEN);
    if (rand === ENCODING_LEN) {
        rand = ENCODING_LEN - 1;
    }
    return ENCODING.charAt(rand);
}
// the factory to generate unique identifier based on time and current pseudorandom number
function ulid() {
    return encodeTime(Date.now(), TIME_LEN) + encodeRandom(RANDOM_LEN);
}

var NEXT_GEN_FP_NAME = '_lc2_fpi';
var TLD_CACHE_KEY = '_li_dcdm_c';
var DEFAULT_EXPIRATION_DAYS = 730;
function resolve$1(state, storageHandler, eventBus) {
    try {
        var determineTld = function () {
            var cachedDomain = storageHandler.getCookie(TLD_CACHE_KEY);
            if (cachedDomain) {
                return cachedDomain;
            }
            var domain = loadedDomain();
            var arr = domain.split('.');
            for (var i = arr.length; i > 0; i--) {
                var newD = ".".concat(arr.slice(i - 1, arr.length).join('.'));
                storageHandler.setCookie(TLD_CACHE_KEY, newD, undefined, 'Lax', newD);
                if (storageHandler.getCookie(TLD_CACHE_KEY)) {
                    return newD;
                }
            }
            return ".".concat(domain);
        };
        var getOrAddWithExpiration = function (key, value) {
            try {
                var oldValue = storageHandler.get(key);
                var expiry_1 = expiresInDays(storageOptions_1.expires);
                if (oldValue) {
                    storageHandler.set(key, oldValue, expiry_1, storageOptions_1.domain);
                }
                else {
                    storageHandler.set(key, value, expiry_1, storageOptions_1.domain);
                }
                return storageHandler.get(key);
            }
            catch (e) {
                eventBus.emitErrorWithMessage('CookieLsGetOrAdd', 'Failed manipulating cookie jar or ls', e);
                return null;
            }
        };
        var generateCookie = function (apexDomain) {
            var cookie = "".concat(domainHash(apexDomain), "--").concat(ulid());
            return cookie.toLocaleLowerCase();
        };
        var expiry = state.expirationDays || DEFAULT_EXPIRATION_DAYS;
        var cookieDomain = determineTld();
        var storageOptions_1 = {
            expires: expiry,
            domain: cookieDomain
        };
        var liveConnectIdentifier = getOrAddWithExpiration(NEXT_GEN_FP_NAME, generateCookie(cookieDomain)) || undefined;
        if (liveConnectIdentifier) {
            storageHandler.setDataInLocalStorage(PEOPLE_VERIFIED_LS_ENTRY, liveConnectIdentifier);
        }
        return {
            domain: cookieDomain,
            liveConnectId: liveConnectIdentifier,
            peopleVerifiedId: liveConnectIdentifier
        };
    }
    catch (e) {
        eventBus.emitErrorWithMessage('IdentifiersResolve', 'Error while managing identifiers', e);
        return {};
    }
}

var DEFAULT_DECISION_ID_COOKIE_EXPIRES = expiresInDays(30);
var DECISION_ID_QUERY_PARAM_NAME = 'li_did';
var DECISION_ID_COOKIE_NAMESPACE = 'lidids.';
var _onlyUnique = function (value, index, self) { return self.indexOf(value) === index; };
var _nonEmpty = function (value) { return value && trim(value).length > 0; };
function resolve(state, storageHandler, eventBus) {
    var ret = {};
    function _addDecisionId(key, cookieDomain) {
        if (key) {
            storageHandler.setCookie("".concat(DECISION_ID_COOKIE_NAMESPACE).concat(key), key, DEFAULT_DECISION_ID_COOKIE_EXPIRES, 'Lax', cookieDomain);
        }
    }
    try {
        var freshDecisions = [].concat((state.pageUrl && getQueryParameter(state.pageUrl, DECISION_ID_QUERY_PARAM_NAME)) || []);
        var storedDecisions = storageHandler.findSimilarCookies(DECISION_ID_COOKIE_NAMESPACE);
        freshDecisions
            .map(trim)
            .filter(_nonEmpty)
            .filter(isUUID)
            .filter(_onlyUnique)
            .forEach(function (decision) { return _addDecisionId(decision, state.domain); });
        var allDecisions = freshDecisions
            .concat(storedDecisions)
            .map(trim)
            .filter(_nonEmpty)
            .filter(isUUID)
            .filter(_onlyUnique);
        ret = { decisionIds: allDecisions };
    }
    catch (e) {
        eventBus.emitErrorWithMessage('DecisionsResolve', 'Error while managing decision ids', e);
    }
    return ret;
}

function enrich$3(state, storageHandler, eventBus) {
    try {
        return _getIdentifiers(_parseIdentifiersToResolve$1(state), storageHandler);
    }
    catch (e) {
        if (eventBus) {
            eventBus.emitError('IdentifiersEnricher', e);
        }
        return {};
    }
}
function _parseIdentifiersToResolve$1(state) {
    var cookieNames = [];
    if (state.identifiersToResolve) {
        if (isArray(state.identifiersToResolve)) {
            cookieNames = state.identifiersToResolve;
        }
        else if (isString(state.identifiersToResolve)) {
            cookieNames = state.identifiersToResolve.split(',');
        }
    }
    for (var i = 0; i < cookieNames.length; i++) {
        cookieNames[i] = cookieNames[i].trim();
    }
    return cookieNames;
}
function _getIdentifiers(cookieNames, storageHandler) {
    var identifiers = [];
    var hashes = [];
    for (var i = 0; i < cookieNames.length; i++) {
        var identifierName = cookieNames[i];
        var identifierValue = storageHandler.getCookie(identifierName) || storageHandler.getDataFromLocalStorage(identifierName);
        if (identifierValue) {
            var cookieAndHashes = replaceEmailsWithHashes(safeToString(identifierValue));
            identifiers.push({
                name: identifierName,
                value: cookieAndHashes.stringWithoutRawEmails
            });
            hashes = hashes.concat(cookieAndHashes.hashesFromOriginalString);
        }
    }
    return {
        retrievedIdentifiers: identifiers,
        hashesFromIdentifiers: _deduplicateHashes(hashes)
    };
}
function _deduplicateHashes(hashes) {
    var seen = new Set();
    var result = [];
    for (var i = 0; i < hashes.length; i++) {
        if (!seen.has(hashes[i].md5)) {
            result.push(hashes[i]);
            seen.add(hashes[i].md5);
        }
    }
    return result;
}

function enrich$2(state) {
    if (isNonEmpty(state) && isNonEmpty(state.gdprApplies)) {
        var privacyMode = !!state.gdprApplies;
        return {
            privacyMode: privacyMode
        };
    }
    else
        return {};
}

function removeInvalidPairs(config, eventBus) {
    if (config && config.appId && config.distributorId) {
        var distributorId = config.distributorId;
        delete config.distributorId;
        eventBus.emitError('AppIdAndDistributorIdPresent', new Error("Event contains both appId: ".concat(config.appId, " and distributorId: ").concat(distributorId, ". Ignoring distributorId")));
    }
    return config;
}

function storageHandlerBackedCache(defaultExpirationHours, domain, storageHandler, eventBus) {
    var IDEX_STORAGE_KEY = '__li_idex_cache';
    function _cacheKey(rawKey) {
        if (rawKey) {
            var suffix = base64UrlEncode(JSON.stringify(rawKey));
            return "".concat(IDEX_STORAGE_KEY, "_").concat(suffix);
        }
        else {
            return IDEX_STORAGE_KEY;
        }
    }
    return {
        get: function (key) {
            var cachedValue = storageHandler.get(_cacheKey(key));
            if (cachedValue) {
                return JSON.parse(cachedValue);
            }
            else {
                return cachedValue;
            }
        },
        set: function (key, value, expiresAt) {
            try {
                storageHandler.set(_cacheKey(key), JSON.stringify(value), expiresAt || expiresInHours(defaultExpirationHours), domain);
            }
            catch (ex) {
                eventBus.emitError('IdentityResolverStorage', ex);
            }
        }
    };
}
var noopCache = {
    get: function () { return null; },
    set: function () { return undefined; }
};
var IdentityResolver = /** @class */ (function () {
    function IdentityResolver(config, calls, cache, eventBus) {
        var _a, _b, _c, _d, _e, _f;
        var _this = this;
        this.eventBus = eventBus;
        this.calls = calls;
        this.cache = cache;
        this.idexConfig = config.identityResolutionConfig || {};
        this.externalIds = config.retrievedIdentifiers || [];
        this.source = this.idexConfig.source || 'unknown';
        this.publisherId = this.idexConfig.publisherId || 'any';
        this.url = this.idexConfig.url || DEFAULT_IDEX_URL;
        this.timeout = this.idexConfig.ajaxTimeout || DEFAULT_IDEX_AJAX_TIMEOUT;
        this.requestedAttributes = this.idexConfig.requestedAttributes || DEFAULT_REQUESTED_ATTRIBUTES;
        this.tuples = [];
        (_a = this.tuples).push.apply(_a, asStringParam('duid', config.peopleVerifiedId));
        (_b = this.tuples).push.apply(_b, asStringParam('us_privacy', config.usPrivacyString));
        (_c = this.tuples).push.apply(_c, asParamOrEmpty('gdpr', config.gdprApplies, function (v) { return encodeURIComponent(v ? 1 : 0); }));
        (_d = this.tuples).push.apply(_d, asStringParamWhen('n3pc', config.privacyMode ? '1' : '0', function (v) { return v === '1'; }));
        (_e = this.tuples).push.apply(_e, asStringParam('gdpr_consent', config.gdprConsent));
        (_f = this.tuples).push.apply(_f, asStringParam('did', config.distributorId));
        this.externalIds.forEach(function (retrievedIdentifier) {
            var _a;
            (_a = _this.tuples).push.apply(_a, asStringParam(retrievedIdentifier.name, retrievedIdentifier.value));
        });
        var attributeResolutionAllowed = function (attribute) {
            if (attribute === 'uid2') {
                return !config.privacyMode;
            }
            else {
                return true;
            }
        };
        this.requestedAttributes.filter(attributeResolutionAllowed).forEach(function (requestedAttribute) {
            var _a;
            (_a = _this.tuples).push.apply(_a, asStringParam('resolve', requestedAttribute));
        });
    }
    IdentityResolver.make = function (config, storageHandler, calls, eventBus) {
        var nonNullConfig = config || {};
        var idexConfig = nonNullConfig.identityResolutionConfig || {};
        var expirationHours = idexConfig.expirationHours || DEFAULT_IDEX_EXPIRATION_HOURS;
        var domain = nonNullConfig.domain;
        var cache = storageHandlerBackedCache(expirationHours, domain, storageHandler, eventBus);
        return new IdentityResolver(nonNullConfig, calls, cache, eventBus);
    };
    IdentityResolver.makeNoCache = function (config, calls, eventBus) {
        return new IdentityResolver(config || {}, calls, noopCache, eventBus);
    };
    IdentityResolver.prototype.responseReceived = function (additionalParams, successCallback) {
        var _this = this;
        return function (responseText, response) {
            var responseObj = {};
            if (responseText) {
                try {
                    responseObj = JSON.parse(responseText);
                }
                catch (ex) {
                    console.error('Error parsing response', ex);
                    _this.eventBus.emitError('IdentityResolverParser', ex);
                }
            }
            var expiresAt = responseExpires(response);
            _this.cache.set(additionalParams, responseObj, expiresAt);
            successCallback(responseObj);
        };
    };
    IdentityResolver.prototype.unsafeResolve = function (successCallback, errorCallback, additionalParams) {
        var cachedValue = this.cache.get(additionalParams);
        if (cachedValue) {
            successCallback(cachedValue);
        }
        else {
            this.calls.ajaxGet(this.getUrl(additionalParams), this.responseReceived(additionalParams, successCallback), errorCallback, this.timeout);
        }
    };
    IdentityResolver.prototype.getUrl = function (additionalParams) {
        var originalParams = this.tuples.slice().concat(mapAsParams(additionalParams));
        var params = toParams(originalParams);
        return "".concat(this.url, "/").concat(this.source, "/").concat(this.publisherId).concat(params);
    };
    IdentityResolver.prototype.resolve = function (successCallback, errorCallback, additionalParams) {
        try {
            this.unsafeResolve(successCallback, errorCallback, additionalParams || {});
        }
        catch (e) {
            console.error('IdentityResolve', e);
            errorCallback();
            if (this.eventBus) {
                this.eventBus.emitError('IdentityResolve', e);
            }
        }
    };
    return IdentityResolver;
}());
function responseExpires(response) {
    if (isObject(response) && 'getResponseHeader' in response && isFunction(response.getResponseHeader)) {
        var expiresHeader = response.getResponseHeader('expires');
        if (expiresHeader) {
            return new Date(expiresHeader);
        }
    }
}

/******************************************************************************
Copyright (c) Microsoft Corporation.

Permission to use, copy, modify, and/or distribute this software for any
purpose with or without fee is hereby granted.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY
AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM
LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR
OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR
PERFORMANCE OF THIS SOFTWARE.
***************************************************************************** */
/* global Reflect, Promise */

var _extendStatics = function extendStatics(d, b) {
  _extendStatics = Object.setPrototypeOf || {
    __proto__: []
  } instanceof Array && function (d, b) {
    d.__proto__ = b;
  } || function (d, b) {
    for (var p in b) {
      if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p];
    }
  };
  return _extendStatics(d, b);
};
function __extends(d, b) {
  if (typeof b !== "function" && b !== null) throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
  _extendStatics(d, b);
  function __() {
    this.constructor = d;
  }
  d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
}

var StorageStrategies = {
    cookie: 'cookie',
    localStorage: 'ls',
    none: 'none',
    disabled: 'disabled'
};

var noop$1 = function () { return undefined; };
var WrappingContext = /** @class */ (function () {
    function WrappingContext(obj, name, eventBus) {
        this.obj = obj;
        this.name = name;
        this.errors = [];
        this.eventBus = eventBus;
    }
    WrappingContext.prototype.wrap = function (functionName) {
        if (isObject(this.obj)) {
            var member = this.obj[functionName];
            if (isFunction(member)) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                return member.bind(this.obj);
            }
        }
        this.errors.push(functionName);
        return noop$1;
    };
    WrappingContext.prototype.reportErrors = function () {
        if (this.errors.length > 0) {
            this.eventBus.emitErrorWithMessage(this.name, "The functions '".concat(JSON.stringify(this.errors), "' were not provided"));
        }
    };
    return WrappingContext;
}());

var noop = function () { return undefined; };
function wrapRead(wrapper, storageStrategy, functionName) {
    return strEqualsIgnoreCase(storageStrategy, StorageStrategies.disabled) ? noop : wrapper.wrap(functionName);
}
function wrapWrite(wrapper, storageStrategy, functionName) {
    return strEqualsIgnoreCase(storageStrategy, StorageStrategies.none) ? noop : wrapRead(wrapper, storageStrategy, functionName);
}
var WrappedReadOnlyStorageHandler = /** @class */ (function () {
    function WrappedReadOnlyStorageHandler(storageStrategy, wrapper) {
        this.minimalFunctions = {
            getCookie: wrapRead(wrapper, storageStrategy, 'getCookie'),
            getDataFromLocalStorage: wrapRead(wrapper, storageStrategy, 'getDataFromLocalStorage'),
            localStorageIsEnabled: wrapWrite(wrapper, storageStrategy, 'localStorageIsEnabled')
        };
    }
    WrappedReadOnlyStorageHandler.make = function (storageStrategy, externalStorageHandler, eventBus) {
        var wrapper = new WrappingContext(externalStorageHandler, 'ReadOnlyStorageHandler', eventBus);
        var handler = new WrappedReadOnlyStorageHandler(storageStrategy, wrapper);
        wrapper.reportErrors();
        return handler;
    };
    WrappedReadOnlyStorageHandler.prototype.localStorageIsEnabled = function () {
        return !!this.minimalFunctions.localStorageIsEnabled();
    };
    WrappedReadOnlyStorageHandler.prototype.getCookie = function (key) {
        return this.minimalFunctions.getCookie(key) || null;
    };
    WrappedReadOnlyStorageHandler.prototype.getDataFromLocalStorage = function (key) {
        return this.minimalFunctions.getDataFromLocalStorage(key) || null;
    };
    return WrappedReadOnlyStorageHandler;
}());
var WrappedStorageHandler = /** @class */ (function (_super) {
    __extends(WrappedStorageHandler, _super);
    function WrappedStorageHandler(storageStrategy, wrapper) {
        var _this = _super.call(this, storageStrategy, wrapper) || this;
        _this.storageStrategy = storageStrategy;
        _this.functions = {
            setCookie: wrapWrite(wrapper, storageStrategy, 'setCookie'),
            removeDataFromLocalStorage: wrapWrite(wrapper, storageStrategy, 'removeDataFromLocalStorage'),
            setDataInLocalStorage: wrapWrite(wrapper, storageStrategy, 'setDataInLocalStorage'),
            findSimilarCookies: wrapRead(wrapper, storageStrategy, 'findSimilarCookies')
        };
        return _this;
    }
    WrappedStorageHandler.make = function (storageStrategy, externalStorageHandler, eventBus) {
        var wrapper = new WrappingContext(externalStorageHandler, 'StorageHandler', eventBus);
        var handler = new WrappedStorageHandler(storageStrategy, wrapper);
        wrapper.reportErrors();
        return handler;
    };
    WrappedStorageHandler.prototype.get = function (key) {
        if (strEqualsIgnoreCase(this.storageStrategy, StorageStrategies.none) || strEqualsIgnoreCase(this.storageStrategy, StorageStrategies.disabled)) {
            return null;
        }
        else if (strEqualsIgnoreCase(this.storageStrategy, StorageStrategies.localStorage)) {
            if (this.localStorageIsEnabled()) {
                var expirationKey = "".concat(key, "_exp");
                var oldLsExpirationEntry = this.getDataFromLocalStorage(expirationKey);
                if (oldLsExpirationEntry && Date.parse(oldLsExpirationEntry) <= new Date().getTime()) {
                    this.removeDataFromLocalStorage(key);
                }
                return this.getDataFromLocalStorage(key);
            }
            else {
                return null;
            }
        }
        else {
            return this.getCookie(key);
        }
    };
    WrappedStorageHandler.prototype.set = function (key, value, expires, domain) {
        if (strEqualsIgnoreCase(this.storageStrategy, StorageStrategies.none) || strEqualsIgnoreCase(this.storageStrategy, StorageStrategies.disabled)) ;
        else if (strEqualsIgnoreCase(this.storageStrategy, StorageStrategies.localStorage)) {
            if (this.localStorageIsEnabled()) {
                var expirationKey = "".concat(key, "_exp");
                this.setDataInLocalStorage(key, value);
                this.setDataInLocalStorage(expirationKey, "".concat(expires));
            }
        }
        else {
            this.setCookie(key, value, expires, 'Lax', domain);
        }
    };
    WrappedStorageHandler.prototype.setCookie = function (key, value, expires, sameSite, domain) {
        this.functions.setCookie(key, value, expires, sameSite, domain);
    };
    WrappedStorageHandler.prototype.setDataInLocalStorage = function (key, value) {
        this.functions.setDataInLocalStorage(key, value);
    };
    WrappedStorageHandler.prototype.removeDataFromLocalStorage = function (key) {
        this.functions.removeDataFromLocalStorage(key);
    };
    WrappedStorageHandler.prototype.findSimilarCookies = function (substring) {
        return this.functions.findSimilarCookies(substring) || [];
    };
    return WrappedStorageHandler;
}(WrappedReadOnlyStorageHandler));

var WrappedCallHandler = /** @class */ (function () {
    function WrappedCallHandler(externalCallHandler, eventBus) {
        var wrapper = new WrappingContext(externalCallHandler, 'CallHandler', eventBus);
        this.functions = {
            ajaxGet: wrapper.wrap('ajaxGet'),
            pixelGet: wrapper.wrap('pixelGet')
        };
        wrapper.reportErrors();
    }
    WrappedCallHandler.prototype.ajaxGet = function (url, onSuccess, onError, timeout) {
        this.functions.ajaxGet(url, onSuccess, onError, timeout);
    };
    WrappedCallHandler.prototype.pixelGet = function (url, onLoad) {
        this.functions.pixelGet(url, onLoad);
    };
    return WrappedCallHandler;
}());

// @ts-nocheck
function initBus(size) {
    if (typeof size === 'number' && size >= 0) {
        return new ReplayEmitter(size);
    }
    else {
        return new ReplayEmitter(5);
    }
}
function extendBusIfNeeded(bus) {
    if (isFunction(bus.emitErrorWithMessage) && isFunction(bus.emitError)) {
        return;
    }
    bus.emitErrorWithMessage = function (name, message, e) {
        if (e === void 0) { e = {}; }
        var wrappedError = wrapError(name, message, e);
        return bus.emit(ERRORS_CHANNEL, wrappedError);
    };
    bus.emitError = function (name, exception) {
        return bus.emitErrorWithMessage(name, exception.message, exception);
    };
}
function LocalEventBus(size) {
    if (size === void 0) { size = 5; }
    return initBus(size);
}
function GlobalEventBus(name, size, errorCallback) {
    try {
        if (!window) {
            errorCallback(new Error('Bus can only be attached to the window, which is not present'));
        }
        if (window && !window[name]) {
            window[name] = initBus(size);
        }
        extendBusIfNeeded(window[name]);
        return window[name];
    }
    catch (e) {
        console.error('events.bus.init', e);
        errorCallback(e);
    }
}
function getAvailableBus(name) {
    var eventBus = window[name].eventBus || window[EVENT_BUS_NAMESPACE];
    extendBusIfNeeded(eventBus);
    return eventBus;
}

var eventBus = /*#__PURE__*/Object.freeze({
  __proto__: null,
  LocalEventBus: LocalEventBus,
  GlobalEventBus: GlobalEventBus,
  getAvailableBus: getAvailableBus
});

// @ts-nocheck
var hemStore = {};
function _pushSingleEvent(event, pixelClient, enrichedState, eventBus) {
    if (!event || !isObject(event)) {
        eventBus.emitErrorWithMessage('EventNotAnObject', 'Received event was not an object', new Error(event));
    }
    else if ('config' in event) {
        eventBus.emitErrorWithMessage('StrayConfig', 'Received a config after LC has already been initialised', new Error(JSON.stringify(event)));
    }
    else {
        var combined = enrichedState.combineWith({ eventSource: event });
        hemStore.hashedEmail = hemStore.hashedEmail || combined.data.hashedEmail;
        var withHemStore = mergeObjects({ eventSource: event }, hemStore);
        pixelClient.sendAjax(enrichedState.combineWith(withHemStore));
    }
}
function _configMatcher(previousConfig, newConfig) {
    var equalConfigs = previousConfig.appId === newConfig.appId &&
        previousConfig.wrapperName === newConfig.wrapperName &&
        previousConfig.collectorUrl === newConfig.collectorUrl;
    if (!equalConfigs) {
        return {
            appId: [previousConfig.appId, newConfig.appId],
            wrapperName: [previousConfig.wrapperName, newConfig.wrapperName],
            collectorUrl: [previousConfig.collectorUrl, newConfig.collectorUrl]
        };
    }
}
function _processArgs(args, pixelClient, enrichedState, eventBus) {
    try {
        args.forEach(function (arg) {
            var event = arg;
            if (isArray(event)) {
                event.forEach(function (e) { return _pushSingleEvent(e, pixelClient, enrichedState, eventBus); });
            }
            else {
                _pushSingleEvent(event, pixelClient, enrichedState, eventBus);
            }
        });
    }
    catch (e) {
        console.error('Error sending events', e);
        eventBus.emitErrorWithMessage('LCPush', 'Failed sending an event', e);
    }
}
function _getInitializedLiveConnect(liveConnectConfig) {
    try {
        if (window && window[liveConnectConfig.globalVarName] && window[liveConnectConfig.globalVarName].ready) {
            var mismatchedConfig = window[liveConnectConfig.globalVarName].config && _configMatcher(window[liveConnectConfig.globalVarName].config, liveConnectConfig);
            if (mismatchedConfig) {
                var error = new Error();
                error.name = 'ConfigSent';
                error.message = 'Additional configuration received';
                var eventBus = getAvailableBus(liveConnectConfig.globalVarName);
                window[liveConnectConfig.globalVarName].eventBus = eventBus;
                eventBus.emitErrorWithMessage('LCDuplication', JSON.stringify(mismatchedConfig), error);
            }
            return window[liveConnectConfig.globalVarName];
        }
    }
    catch (e) {
        console.error('Could not initialize error bus');
    }
}
function _standardInitialization(liveConnectConfig, externalStorageHandler, externalCallHandler, eventBus) {
    try {
        var callHandler = new WrappedCallHandler(externalCallHandler, eventBus);
        var validLiveConnectConfig = removeInvalidPairs(liveConnectConfig, eventBus);
        var configWithPrivacy = mergeObjects(validLiveConnectConfig, enrich$2(validLiveConnectConfig));
        register(configWithPrivacy, callHandler, eventBus);
        var storageStrategy = configWithPrivacy.privacyMode ? StorageStrategies.disabled : configWithPrivacy.storageStrategy;
        var storageHandler_1 = WrappedStorageHandler.make(storageStrategy, externalStorageHandler, eventBus);
        var reducer = function (accumulator, func) { return accumulator.combineWith(func(accumulator.data, storageHandler_1, eventBus)); };
        var enrichers = [enrich$4, enrich$3];
        var managers = [resolve$1, resolve];
        var enrichedState = enrichers.reduce(reducer, new StateWrapper(configWithPrivacy, eventBus));
        var postManagedState_1 = managers.reduce(reducer, enrichedState);
        var syncContainerData_1 = mergeObjects(configWithPrivacy, { peopleVerifiedId: postManagedState_1.data.peopleVerifiedId });
        var onPixelLoad = function () { return eventBus.emit(PIXEL_SENT_PREFIX, syncContainerData_1); };
        var onPixelPreload = function () { return eventBus.emit(PRELOAD_PIXEL, '0'); };
        var pixelClient_1 = new PixelSender(configWithPrivacy, callHandler, eventBus, onPixelLoad, onPixelPreload);
        var resolver = IdentityResolver.make(postManagedState_1.data, storageHandler_1, callHandler, eventBus);
        var _push_1 = function () {
            var args = [];
            for (var _i = 0; _i < arguments.length; _i++) {
                args[_i] = arguments[_i];
            }
            return _processArgs(args, pixelClient_1, postManagedState_1, eventBus);
        };
        return {
            push: _push_1,
            fire: function () { return _push_1({}); },
            peopleVerifiedId: postManagedState_1.data.peopleVerifiedId,
            ready: true,
            resolve: resolver.resolve.bind(resolver),
            resolutionCallUrl: resolver.getUrl.bind(resolver),
            config: validLiveConnectConfig,
            eventBus: eventBus
        };
    }
    catch (x) {
        console.error(x);
        eventBus.emitErrorWithMessage('LCConstruction', 'Failed to build LC', x);
    }
}
function _initializeWithoutGlobalName(liveConnectConfig, externalStorageHandler, externalCallHandler, eventBus) {
    return _standardInitialization(liveConnectConfig, externalStorageHandler, externalCallHandler, eventBus);
}
function _initializeWithGlobalName(liveConnectConfig, externalStorageHandler, externalCallHandler, eventBus) {
    var queue = window[liveConnectConfig.globalVarName] || [];
    var lc = _getInitializedLiveConnect(liveConnectConfig) || _standardInitialization(liveConnectConfig, externalStorageHandler, externalCallHandler, eventBus) || queue;
    if (isArray(queue)) {
        for (var i = 0; i < queue.length; i++) {
            lc.push(queue[i]);
        }
    }
    window[liveConnectConfig.globalVarName] = lc;
    return lc;
}
function StandardLiveConnect(liveConnectConfig, externalStorageHandler, externalCallHandler, externalEventBus) {
    var configuration = (isObject(liveConnectConfig) && liveConnectConfig) || {};
    var eventBus = externalEventBus || LocalEventBus();
    try {
        var lc = configuration.globalVarName ?
            _initializeWithGlobalName(liveConnectConfig, externalStorageHandler, externalCallHandler, eventBus) :
            _initializeWithoutGlobalName(liveConnectConfig, externalStorageHandler, externalCallHandler, eventBus);
        window.liQ_instances = window.liQ_instances || [];
        if (configuration.globalVarName) {
            if (window.liQ_instances.filter(function (i) { return i.config.globalVarName === configuration.globalVarName; }).length === 0) {
                window.liQ_instances.push(lc);
            }
        }
        else {
            window.liQ_instances.push(lc);
        }
        return lc;
    }
    catch (e) {
        console.error(e);
        eventBus.emitErrorWithMessage('LCConstruction', 'Failed to build LC', e);
    }
    return configuration.globalVarName ? window[configuration.globalVarName] : undefined;
}

function enrich$1(state, storageHandler, eventBus) {
    try {
        return { peopleVerifiedId: state.peopleVerifiedId || storageHandler.getDataFromLocalStorage(PEOPLE_VERIFIED_LS_ENTRY) || undefined };
    }
    catch (e) {
        eventBus.emitError('PeopleVerifiedEnrich', e);
        return {};
    }
}

function enrich(state, storageHandler, eventBus) {
    try {
        return _parseIdentifiersToResolve(state, storageHandler);
    }
    catch (e) {
        eventBus.emitError('IdentifiersEnrich', e);
        return {};
    }
}
function _parseIdentifiersToResolve(state, storageHandler) {
    state.identifiersToResolve = state.identifiersToResolve || [];
    var cookieNames = isArray(state.identifiersToResolve) ? state.identifiersToResolve : safeToString(state.identifiersToResolve).split(',');
    var identifiers = [];
    for (var i = 0; i < cookieNames.length; i++) {
        var identifierName = trim(cookieNames[i]);
        var identifierValue = storageHandler.getCookie(identifierName) || storageHandler.getDataFromLocalStorage(identifierName);
        if (identifierValue && !containsEmailField(safeToString(identifierValue)) && !isEmail(safeToString(identifierValue))) {
            identifiers.push({
                name: identifierName,
                value: safeToString(identifierValue)
            });
        }
    }
    return {
        retrievedIdentifiers: identifiers
    };
}

// @ts-nocheck
function _minimalInitialization(liveConnectConfig, externalStorageHandler, externalCallHandler, eventBus) {
    try {
        var callHandler = new WrappedCallHandler(externalCallHandler, eventBus);
        var validLiveConnectConfig_1 = removeInvalidPairs(liveConnectConfig, eventBus);
        var configWithPrivacy = mergeObjects(validLiveConnectConfig_1, enrich$2(validLiveConnectConfig_1));
        var storageStrategy = configWithPrivacy.privacyMode ? StorageStrategies.disabled : configWithPrivacy.storageStrategy;
        var storageHandler = WrappedReadOnlyStorageHandler.make(storageStrategy, externalStorageHandler, eventBus);
        var peopleVerifiedData = mergeObjects(configWithPrivacy, enrich$1(configWithPrivacy, storageHandler, eventBus));
        var peopleVerifiedDataWithAdditionalIds = mergeObjects(peopleVerifiedData, enrich(peopleVerifiedData, storageHandler, eventBus));
        var resolver = IdentityResolver.makeNoCache(peopleVerifiedDataWithAdditionalIds, callHandler, eventBus);
        return {
            push: function (arg) { return window[validLiveConnectConfig_1.globalVarName].push(arg); },
            fire: function () { return window[validLiveConnectConfig_1.globalVarName].push({}); },
            peopleVerifiedId: peopleVerifiedDataWithAdditionalIds.peopleVerifiedId,
            ready: true,
            resolve: resolver.resolve.bind(resolver),
            resolutionCallUrl: resolver.getUrl.bind(resolver),
            config: validLiveConnectConfig_1,
            eventBus: eventBus
        };
    }
    catch (x) {
        console.error(x);
    }
}
function MinimalLiveConnect(liveConnectConfig, externalStorageHandler, externalCallHandler, externalEventBus) {
    try {
        var configuration_1 = (isObject(liveConnectConfig) && liveConnectConfig) || {};
        configuration_1.globalVarName = configuration_1.globalVarName || 'liQ';
        if (window) {
            window[configuration_1.globalVarName] = window[configuration_1.globalVarName] || [];
        }
        var eventBus = externalEventBus || LocalEventBus();
        var lc = _minimalInitialization(configuration_1, externalStorageHandler, externalCallHandler, eventBus);
        window.liQ_instances = window.liQ_instances || [];
        if (window.liQ_instances.filter(function (i) { return i.config.globalVarName === configuration_1.globalVarName; }).length === 0) {
            window.liQ_instances.push(lc);
        }
        return lc;
    }
    catch (x) {
        console.error(x);
    }
    return {};
}

function LiveConnect(liveConnectConfig, externalStorageHandler, externalCallHandler, mode, externalEventBus) {
    var minimalMode = mode === 'minimal' || process.env.LiveConnectMode === 'minimal';
    var bus = externalEventBus || LocalEventBus();
    var configuration = (isObject(liveConnectConfig) && liveConnectConfig) || {};
    var initializationFunction = minimalMode ? MinimalLiveConnect : StandardLiveConnect;
    return initializationFunction(configuration, externalStorageHandler, externalCallHandler, bus);
}

exports.LiveConnect = LiveConnect;
exports.MinimalLiveConnect = MinimalLiveConnect;
exports.StandardLiveConnect = StandardLiveConnect;
exports.consts = consts;
exports.eventBus = eventBus;
