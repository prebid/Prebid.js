import { submodule } from '../src/hook.js';
import { ajax } from '../src/ajax.js';
import { config } from '../src/config.js';
import { getStorageManager } from '../src/storageManager.js';
import { mergeDeep, deepSetValue, deepAccess } from '../src/utils.js';

var SUBMODULE_NAME = 'ftrack-rtd';
var LOCAL_STORAGE_EXP_DAYS = 30;
var FTRACK_STORAGE_NAME = 'ftrack-rtd';
var storage = getStorageManager(null, SUBMODULE_NAME);
var biddersWhiteList = ['grid'];

var submoduleMap = {
  getFtrackIds: null,
  deviceId: null,
  cacheId: null,
  hasFtrackRun: false,
  ftracker: {
    DeviceID: true,
    SingleDeviceID: true,
    callback: function(response, resolve) {
      if (response) {
        storage.setDataInLocalStorage(FTRACK_STORAGE_NAME + '_exp', (new Date(Date.now() + (1000 * 60 * 60 * 24 * LOCAL_STORAGE_EXP_DAYS))).toUTCString());
        storage.setDataInLocalStorage(FTRACK_STORAGE_NAME, JSON.stringify(response));
        submoduleMap.deviceId = response.DeviceID && response.DeviceID[0];
      }
      submoduleMap.resolveInitPromise && submoduleMap.resolveInitPromise();
      resolve(response);
    }
  },
  runFtrack: function runFtrack(resolve) {
    ajax(
      'https://e.flashtalking.com/cache',
      {
        success: function(response) {
          submoduleMap.cacheId = JSON.parse(response).cache_id || '';
          ftrack.init(submoduleMap.cacheId, resolve);
        },
        error: error => {
          ftrack.init(error, resolve);
        }
      }
    );
  },
  init: function init(resolve) {
    var data = storage.getDataFromLocalStorage(FTRACK_STORAGE_NAME);
    var parsedResponse = data && JSON.parse(data);
    if (parsedResponse && parsedResponse.DeviceID) {
      submoduleMap.deviceId = parsedResponse.DeviceID && parsedResponse.DeviceID[0];
      resolve(submoduleMap.deviceId);
    } else {
      submoduleMap.runFtrack(resolve);
    }
  }
}

/**
 * ftrack
 */
var ftrack = {
  init: function ftrackInit(val, resolve) {
    ftrack.go(submoduleMap.ftracker, ftrack.collectSignals(), resolve);
  },
  collectSignals: function collectSignals() {
    var s = {};
    var ft = ftrack.initFt(s);
    var d = new Date();
    s.D9_101 = window.screen ? window.screen.width : undefined;
    s.D9_102 = window.screen ? window.screen.height : undefined;
    s.D9_103 = window.devicePixelRatio;
    s.D9_110 = d.getTime();
    s.D9_111 = d.getTimezoneOffset();
    s.D9_120 = navigator.platform;
    s.D9_121 = navigator.language || navigator.browserLanguage;
    s.D9_122 = navigator.appCodeName;
    s.D9_123 = navigator.maxTouchPoints || 0;
    var m = ft.isM(s.D9_120, s.D9_123);
    s.D9_130 = ft.flashVersion(m);
    s.D9_131 = ft.acrobatVersion(m);
    s.D9_132 = ft.silverlightVersion(m);
    s.D9_133 = ft.getMimeTypes(m);
    s.D9_134 = ft.getPlugins(m);
    s.D9_140 = ft.encodeURIComponent(ft.location());
    s.D9_141 = ft.encodeURIComponent(ft.referrer());
    s.D9_150 = ft.bh64();
    s.D9_151 = ft.bh();
    return s;
  },
  initFt: function initFtrack(r) {
    var ft = {};

    function setResultObject(i, s) {
      if (i !== undefined && r !== undefined) {
        r['D9_'.concat(i.toString())] = s;
      }
    }

    var FtBh = function FtBh(options) {
      var nativeForEach, nativeMap;
      nativeForEach = Array.prototype.forEach;
      nativeMap = Array.prototype.map;

      this.each = function (obj, iterator, context) {
        if (obj === null) {
          return;
        }

        if (nativeForEach && obj.forEach === nativeForEach) {
          obj.forEach(iterator, context);
        } else {
          if (obj.length === +obj.length) {
            for (var i = 0, l = obj.length; i < l; i++) {
              if (iterator.call(context, obj[i], i, obj) === {}) {
                return;
              }
            }
          } else {
            for (var key in obj) {
              if (obj.hasOwnProperty(key)) {
                if (iterator.call(context, obj[key], key, obj) === {}) {
                  return;
                }
              }
            }
          }
        }
      };

      this.map = function (obj, iterator, context) {
        var results = [];

        if (obj == null) {
          return results;
        }

        if (nativeMap && obj.map === nativeMap) {
          return obj.map(iterator, context);
        }

        this.each(obj, function (value, index, list) {
          results[results.length] = iterator.call(context, value, index, list);
        });
        return results;
      };

      if (typeof options === 'object') {
        this.hasher = options.hasher;
        this.indexProperties = options.indexProperties;
      } else {
        if (typeof options === 'function') {
          this.hasher = options;
        }
      }
    };

    FtBh.prototype = {
      get: function get() {
        var ua = navigator.userAgent.toLowerCase();
        var keys = [];
        var navLang = navigator.language || navigator.browserLanguage;
        var navLangArr = navLang.split('-');

        if (typeof navLangArr[0] == 'undefined') {
          // navLang = navLang;
        } else {
          navLang = navLangArr[0];
        }

        keys.push((this.indexProperties ? 'a:' : '') + navLang);
        keys.push((this.indexProperties ? 'b:' : '') + screen.colorDepth);
        keys.push((this.indexProperties ? 'c:' : '') + new Date().getTimezoneOffset());
        keys.push((this.indexProperties ? 'd:' : '') + this.hasSessionStorage());

        if (ua.indexOf('android') == -1) {
          keys.push((this.indexProperties ? 'e:' : '') + this.hasLocalStorage());
        }

        if (navigator.platform != 'iPhone' && navigator.platform != 'iPad') {
          var hasDb;

          try {
            hasDb = !!window.indexedDB;
          } catch (e) {
            hasDb = true;
          }

          keys.push((this.indexProperties ? 'f:' : '') + hasDb);
        }

        if (document.body) {
          keys.push((this.indexProperties ? 'g:' : '') + typeof (document.body.addBehavior));
        } else {
          // keys.push((this.indexProperties ? 'g:' : '') + (true ? 'undefined' : typeof (undefined)));
          keys.push((this.indexProperties ? 'g:' : '') + 'undefined');
        }

        if (ua.indexOf('android') == -1) {
          keys.push((this.indexProperties ? 'h:' : '') + typeof (window.openDatabase));
        }

        keys.push((this.indexProperties ? 'i:' : '') + navigator.cpuClass);
        keys.push((this.indexProperties ? 'j:' : '') + navigator.platform);

        if (this.hasher) {
          return this.hasher(keys.join('###'), 31);
        } else {
          return this.murmurhash332gc(keys.join('###'), 31);
        }
      },
      murmurhash332gc: function murmurhash332gc(key, seed) {
        var remainder, bytes, h1, h1b, c1, c2, k1, i;
        remainder = key.length & 3;
        bytes = key.length - remainder;
        h1 = seed;
        c1 = 3432918353;
        c2 = 461845907;
        i = 0;

        while (i < bytes) {
          k1 = key.charCodeAt(i) & 255 | (key.charCodeAt(++i) & 255) << 8 | (key.charCodeAt(++i) & 255) << 16 | (key.charCodeAt(++i) & 255) << 24;
          ++i;
          k1 = (k1 & 65535) * c1 + (((k1 >>> 16) * c1 & 65535) << 16) & 4294967295;
          k1 = k1 << 15 | k1 >>> 17;
          k1 = (k1 & 65535) * c2 + (((k1 >>> 16) * c2 & 65535) << 16) & 4294967295;
          h1 ^= k1;
          h1 = h1 << 13 | h1 >>> 19;
          h1b = (h1 & 65535) * 5 + (((h1 >>> 16) * 5 & 65535) << 16) & 4294967295;
          h1 = (h1b & 65535) + 27492 + (((h1b >>> 16) + 58964 & 65535) << 16);
        }

        k1 = 0;

        switch (remainder) {
          case 3:
            k1 ^= (key.charCodeAt(i + 2) & 255) << 16;
            break;
          case 2:
            k1 ^= (key.charCodeAt(i + 1) & 255) << 8;
            break;
          case 1:
            k1 ^= key.charCodeAt(i) & 255;
            k1 = (k1 & 65535) * c1 + (((k1 >>> 16) * c1 & 65535) << 16) & 4294967295;
            k1 = k1 << 15 | k1 >>> 17;
            k1 = (k1 & 65535) * c2 + (((k1 >>> 16) * c2 & 65535) << 16) & 4294967295;
            h1 ^= k1;
            break;
        }

        h1 ^= key.length;
        h1 ^= h1 >>> 16;
        h1 = (h1 & 65535) * 2246822507 + (((h1 >>> 16) * 2246822507 & 65535) << 16) & 4294967295;
        h1 ^= h1 >>> 13;
        h1 = (h1 & 65535) * 3266489909 + (((h1 >>> 16) * 3266489909 & 65535) << 16) & 4294967295;
        h1 ^= h1 >>> 16;
        return h1 >>> 0;
      },
      hasLocalStorage: function hasLocalStorage() {
        try {
          return !!window.localStorage;
        } catch (e) {
          return true;
        }
      },
      hasSessionStorage: function hasSessionStorage() {
        try {
          return !!window.sessionStorage;
        } catch (e) {
          return true;
        }
      }
    };

    ft.isM = function (p, t) {
      return !!p && (p === 'iPhone' || p === 'iPad' || (p.substr(0, 7) === 'Linux a' && t > 0));
    };

    ft.bh = function () {
      return new FtBh().get();
    };

    ft.bh64 = function () {
      return new FtBh({
        indexProperties: true,
        hasher: function hasher(s) {
          return btoa(s);
        }
      }).get();
    };

    ft.encodeURIComponent = function (value) {
      if (value === undefined || value === null) {
        return value;
      }

      return encodeURIComponent(value);
    };

    ft.location = function () {
      var l = window.location.hostname;
      var rootLoc;
      var rootHost;

      if (window.location.ancestorOrigins && window.location.ancestorOrigins.length > 0) {
        rootLoc = window.location.ancestorOrigins[window.location.ancestorOrigins.length - 1];
        rootHost = ft.hostName(rootLoc);

        if (rootHost) {
          l = rootHost;
        }
      }

      if (!l) {
        l = '';
      }

      return l;
    };

    ft.referrer = function () {
      var r = ft.hostName(document.referrer);

      if (r === ft.location()) {
        r = '';
      }

      if (!r) {
        r = '';
      }

      return r;
    };

    ft.hostName = function (urlString) {
      try {
        var url = new URL(urlString);
        return url.hostname;
      } catch (e) {}
    };

    ft.flashVersion = function (m) {
      setResultObject(138, submoduleMap.cacheId);

      if (m) {
        return null;
      }

      try {
        try {
          var obj = new window.ActiveXObject('ShockwaveFlash.ShockwaveFlash.6');

          try {
            obj.AllowScriptAccess = 'always';
          } catch (e) {
            return '6.0.0';
          }
        } catch (e) {}

        return new window.ActiveXObject('ShockwaveFlash.ShockwaveFlash').GetVariable('$version').replace(/\D+/g, '.').match(/^.?(.+),?$/)[1];
      } catch (e) {
        try {
          if (navigator.mimeTypes['application/x-shockwave-flash'].enabledPlugin) {
            return (navigator.plugins['Shockwave Flash 2.0'] || navigator.plugins['Shockwave Flash']).description.replace(/\D+/g, '.').match(/^.?(.+),?$/)[1];
          }
        } catch (e) {}
      }

      return null;
    };

    ft.acrobatVersion = function (m) {
      setResultObject(139, 'd10e54cb41fb43c5945b4d01b9bde1da');

      if (m) {
        return null;
      }

      if (window.hasOwnProperty('ActiveXObject')) {
        var obj = null;

        try {
          obj = new window.ActiveXObject('AcroPDF.PDF');
        } catch (e) {
          obj = null;
        }

        if (!obj) {
          try {
            obj = new window.ActiveXObject('PDF.PdfCtrl');
          } catch (e) {
            obj = null;
            return null;
          }
        }

        if (obj !== null) {
          var version = obj.GetVersions().split(',');
          version = version[0].split('=');
          version = parseFloat(version[1]);
          return version;
        } else {
          return null;
        }
      } else {
        for (var i = 0; i < navigator.plugins.length; i++) {
          if (navigator.plugins[i].name.indexOf('Adobe Acrobat') != -1) {
            return navigator.plugins[i].description.replace(/\D+/g, '.').match(/^.?(.+),?$/)[1];
          }
        }

        return null;
      }
    };

    ft.silverlightVersion = function (m) {
      var i;
      if (m) {
        return null;
      }

      var parts = ['', '', '', ''];
      var nav = navigator.plugins['Silverlight Plug-In'];

      if (nav) {
        for (i = 0; i < 4; i++) {
          parts[i] = parseInt(nav.description.split('.')[i]).toString();
        }
      } else {
        try {
          var control = new window.ActiveXObject('AgControl.AgControl');
          var vers = [1, 0, 0, 0];
          loopMatch(control, vers, 0, 1);
          loopMatch(control, vers, 1, 1);
          loopMatch(control, vers, 2, 10000);
          loopMatch(control, vers, 2, 1000);
          loopMatch(control, vers, 2, 100);
          loopMatch(control, vers, 2, 10);
          loopMatch(control, vers, 2, 1);
          loopMatch(control, vers, 3, 1);

          for (i = 0; i < 4; i++) {
            parts[i] = vers[i].toString();
          }
        } catch (e) {
          return null;
        }
      }

      return parts.join('.');

      function loopMatch(control, vers, idx, inc) {
        while (IsSupported(control, vers)) {
          vers[idx] += inc;
        }

        vers[idx] -= inc;
      }

      function IsSupported(control, ver) {
        return control.isVersionSupported(ver[0] + '.' + ver[1] + '.' + ver[2] + '.' + ver[3]);
      }
    };

    ft.getPlugins = function (m) {
      var a = [];

      if (m) {
        return a;
      }

      try {
        for (var i = 0; i < navigator.plugins.length; i++) {
          a.push(navigator.plugins[i].name + ': ' + navigator.plugins[i].description + ' (' + navigator.plugins[i].filename + ')');
        }

        return a;
      } catch (e) {
        return null;
      }
    };

    ft.getMimeTypes = function (m) {
      var a = [];

      if (m) {
        return a;
      }

      try {
        for (var i = 0; i < navigator.mimeTypes.length; i++) {
          a.push(navigator.mimeTypes[i].type + ': ' + navigator.mimeTypes[i].description);
        }

        return a;
      } catch (e) {
        return null;
      }
    };

    return ft;
  },
  go: function go(D9r, signals, resolve) {
    var tagHost = 'd9.flashtalking.com';

    function D9request(D9Device) {
      var json = encodeURIComponent(JSON.stringify(D9Device));
      var send = '&tbx=' + encodeURIComponent(json);
      ajax(getLgcUrl(), send);
    }

    function getLgcUrl() {
      var httpProto = 'https://';
      var lgcUrl = tagHost + '/lgc';
      return httpProto + lgcUrl;
    }

    function getConnectUrl() {
      var httpProto = 'https://';
      var lgcUrl = tagHost + '/img/img.png?cnx=' + (device && device.D9_61 ? device.D9_61 : '');
      return httpProto + lgcUrl;
    }

    function ajax(url, send) {
      if (window.d9PendingXDR != undefined) {
        return;
      }

      var ar = null;

      function corsSupported() {
        try {
          return typeof XMLHttpRequest !== 'undefined' && 'withCredentials' in new XMLHttpRequest();
        } catch (e) {
          return false;
        }
      }

      if (typeof window.XDomainRequest !== 'undefined' && !corsSupported()) {
        ar = new XDomainRequest();
        ar.open('POST', url);
      } else {
        try {
          ar = new XMLHttpRequest();
        } catch (e) {
          if (window.hasOwnProperty('ActiveXObject')) {
            var ax = ['Msxml2.XMLHTTP.3.0', 'Msxml2.XMLHTTP.4.0', 'Msxml2.XMLHTTP.6.0', 'Msxml2.XMLHTTP', 'Microsoft.XMLHTTP'];
            var i = ax.length;

            while (--i) {
              try {
                ar = new window.ActiveXObject(ax[i]);
                break;
              } catch (e) {}
            }
          }
        }

        ar.open('POST', url, true);
        ar.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
        ar.withCredentials = true;
      }

      ar.onreadystatechange = function () {
        if (D9r && D9r.L > 0) {
          return;
        }

        if (D9r && D9r.callback && ar.readyState == 4) {
          if (ar.status == 200 || ar.status == 304) {
            var r = ar.responseText;
            var response;

            if (r && r.length > 0) {
              try {
                response = JSON.parse(r);
              } catch (e) {}
            }

            if (response) {
              if (response.cnx) {
                new Image().src = getConnectUrl();
                delete response.cnx;
              }

              D9r.callback(response, resolve);
            } else {
              D9r.callback(null, resolve);
            }
          }
        }
      };

      if (typeof window.XDomainRequest !== 'undefined' && !corsSupported()) {
        ar.ontimeout = ar.onerror = function (e) {
          ar.status = 400;
          ar.readyState = 4;
          ar.onreadystatechange();
        };

        ar.onload = function () {
          ar.status = 200;
          ar.readyState = 4;
          ar.onreadystatechange();
        };

        ar.onprogress = function () {};
      }

      ar.send(send);
      window.d9PendingXDR = ar;
    }

    var device = {};
    device.D9_1 = signals.D9_110;
    device.D9_6 = signals.D9_130;
    device.D9_7 = signals.D9_131;
    device.D9_8 = signals.D9_132;
    device.D9_9 = signals.D9_133;
    device.D9_10 = signals.D9_134;
    device.D9_61 = signals.D9_138;
    device.D9_67 = signals.D9_139;
    device.D9_18 = {};
    device.D9_16 = signals.D9_111;

    if (signals.D9_101 || signals.D9_111) {
      device.D9_4 = {
        width: signals.D9_101,
        height: signals.D9_102
      };
    }

    if (window.navigator) {
      device.D9_14 = signals.D9_120;
      device.D9_15 = signals.D9_121;
      device.D9_19 = signals.D9_122;
    }

    device.D9_33 = signals.D9_150;
    device.D9_34 = signals.D9_151;
    device.D9_30 = [];
    device.D9_52 = {};
    device.D9_57 = typeof D9r.callback === 'function';
    device.D9_58 = D9r;
    device.D9_59 = { CampID: 3175, CCampID: 156515 };
    device.D9_63 = signals.D9_140;
    device.D9_64 = signals.D9_103;
    device.D9_66 = signals.D9_141;
    D9request(device);
  }
};

/** @type {RtdSubmodule} */
export var ftrackSubmodule = {
  name: SUBMODULE_NAME,
  init: function init(config, userConsent) {
    // if any of the userConsent properties are not falsey, then short circuit and not run
    if (userConsent && (!!userConsent.gdpr || !!userConsent.usp || !!userConsent.coppa)) {
      return false;
    }
    submoduleMap.getFtrackIds = new Promise(function(resolve, reject) {
      return submoduleMap.init(resolve);
    });

    return true;
  },
  getBidRequestData: function getBidRequestData(reqBidsConfigObj, callback) {
    if (submoduleMap.getFtrackIds) {
      submoduleMap.getFtrackIds.then(function(data) {
        if (submoduleMap.deviceId && submoduleMap.deviceId.length) {
          const bidderConfig = config.getBidderConfig() || {};
          const name = 'flashtalking';
          const segment = [{
            name: `ft_id`,
            value: submoduleMap.deviceId
          }];
          biddersWhiteList.forEach(function(bidder) {
            const currConfig = mergeDeep({}, bidderConfig[bidder] || {});
            const userData = deepAccess(currConfig, 'ortb2.user.data') || [];
            const updatedData = userData.filter(el => el.name !== name).concat([{ name, segment }]);
            deepSetValue(currConfig, 'ortb2.user.data', updatedData);
            config.setBidderConfig({bidders: [bidder], config: currConfig});
          });
        };
        callback();
      });
    } else {
      callback();
    }
  }
};

submodule('realTimeData', ftrackSubmodule);
