/* prebid.js v10.19.0-pre
Updated: 2025-12-18
Modules: echoAdsModule, gumgumBidAdapter */

if (!window.pbjs || !window.pbjs.libLoaded) {
 (function(){
/******/ (() => { // webpackBootstrap
/******/ 	var __webpack_modules__ = ({

/***/ "../../node_modules/@babel/runtime/helpers/esm/defineProperty.js":
/*!***********************************************************************!*\
  !*** ../../node_modules/@babel/runtime/helpers/esm/defineProperty.js ***!
  \***********************************************************************/
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

"use strict";
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (/* binding */ _defineProperty)
/* harmony export */ });
/* harmony import */ var _toPropertyKey_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./toPropertyKey.js */ "../../node_modules/@babel/runtime/helpers/esm/toPropertyKey.js");

function _defineProperty(e, r, t) {
  return (r = (0,_toPropertyKey_js__WEBPACK_IMPORTED_MODULE_0__["default"])(r)) in e ? Object.defineProperty(e, r, {
    value: t,
    enumerable: !0,
    configurable: !0,
    writable: !0
  }) : e[r] = t, e;
}


/***/ }),

/***/ "../../node_modules/@babel/runtime/helpers/esm/toPrimitive.js":
/*!********************************************************************!*\
  !*** ../../node_modules/@babel/runtime/helpers/esm/toPrimitive.js ***!
  \********************************************************************/
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

"use strict";
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (/* binding */ toPrimitive)
/* harmony export */ });
/* harmony import */ var _typeof_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./typeof.js */ "../../node_modules/@babel/runtime/helpers/esm/typeof.js");

function toPrimitive(t, r) {
  if ("object" != (0,_typeof_js__WEBPACK_IMPORTED_MODULE_0__["default"])(t) || !t) return t;
  var e = t[Symbol.toPrimitive];
  if (void 0 !== e) {
    var i = e.call(t, r || "default");
    if ("object" != (0,_typeof_js__WEBPACK_IMPORTED_MODULE_0__["default"])(i)) return i;
    throw new TypeError("@@toPrimitive must return a primitive value.");
  }
  return ("string" === r ? String : Number)(t);
}


/***/ }),

/***/ "../../node_modules/@babel/runtime/helpers/esm/toPropertyKey.js":
/*!**********************************************************************!*\
  !*** ../../node_modules/@babel/runtime/helpers/esm/toPropertyKey.js ***!
  \**********************************************************************/
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

"use strict";
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (/* binding */ toPropertyKey)
/* harmony export */ });
/* harmony import */ var _typeof_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./typeof.js */ "../../node_modules/@babel/runtime/helpers/esm/typeof.js");
/* harmony import */ var _toPrimitive_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./toPrimitive.js */ "../../node_modules/@babel/runtime/helpers/esm/toPrimitive.js");


function toPropertyKey(t) {
  var i = (0,_toPrimitive_js__WEBPACK_IMPORTED_MODULE_1__["default"])(t, "string");
  return "symbol" == (0,_typeof_js__WEBPACK_IMPORTED_MODULE_0__["default"])(i) ? i : i + "";
}


/***/ }),

/***/ "../../node_modules/@babel/runtime/helpers/esm/typeof.js":
/*!***************************************************************!*\
  !*** ../../node_modules/@babel/runtime/helpers/esm/typeof.js ***!
  \***************************************************************/
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

"use strict";
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (/* binding */ _typeof)
/* harmony export */ });
function _typeof(o) {
  "@babel/helpers - typeof";

  return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (o) {
    return typeof o;
  } : function (o) {
    return o && "function" == typeof Symbol && o.constructor === Symbol && o !== Symbol.prototype ? "symbol" : typeof o;
  }, _typeof(o);
}


/***/ }),

/***/ "../../node_modules/dlv/index.js":
/*!***************************************!*\
  !*** ../../node_modules/dlv/index.js ***!
  \***************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (/* binding */ dlv)
/* harmony export */ });
function dlv(obj, key, def, p, undef) {
	key = key.split ? key.split('.') : key;
	for (p = 0; p < key.length; p++) {
		obj = obj ? obj[key[p]] : undef;
	}
	return obj === undef ? def : obj;
}


/***/ }),

/***/ "../../node_modules/dset/dist/index.mjs":
/*!**********************************************!*\
  !*** ../../node_modules/dset/dist/index.mjs ***!
  \**********************************************/
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

"use strict";
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   dset: () => (/* binding */ dset)
/* harmony export */ });
function dset(obj, keys, val) {
	keys.split && (keys=keys.split('.'));
	var i=0, l=keys.length, t=obj, x, k;
	while (i < l) {
		k = ''+keys[i++];
		if (k === '__proto__' || k === 'constructor' || k === 'prototype') break;
		t = t[k] = (i === l) ? val : (typeof(x=t[k])===typeof(keys)) ? x : (keys[i]*0 !== 0 || !!~(''+keys[i]).indexOf('.')) ? {} : [];
	}
}


/***/ }),

/***/ "../../node_modules/fun-hooks/no-eval/index.js":
/*!*****************************************************!*\
  !*** ../../node_modules/fun-hooks/no-eval/index.js ***!
  \*****************************************************/
/***/ ((module) => {

/*
* @license MIT
* Fun Hooks v1.1.0
* (c) @snapwich
*/
create.SYNC = 1;
create.ASYNC = 2;
create.QUEUE = 4;

var packageName = "fun-hooks";

var defaults = Object.freeze({
  ready: 0
});

var hookableMap = new WeakMap();

function rest(args, skip) {
  return Array.prototype.slice.call(args, skip);
}

function runAll(queue) {
  var queued;
  // eslint-disable-next-line no-cond-assign
  while ((queued = queue.shift())) {
    queued();
  }
}

function create(config) {
  var hooks = {};
  var postReady = [];

  config = Object.assign({}, defaults, config);

  function dispatch(arg1, arg2) {
    if (typeof arg1 === "function") {
      return hookFn.call(null, "sync", arg1, arg2);
    } else if (typeof arg1 === "string" && typeof arg2 === "function") {
      return hookFn.apply(null, arguments);
    } else if (typeof arg1 === "object") {
      return hookObj.apply(null, arguments);
    }
  }

  var ready;
  if (config.ready) {
    dispatch.ready = function() {
      ready = true;
      runAll(postReady);
    };
  } else {
    ready = true;
  }

  function hookObj(obj, props, objName) {
    var walk = true;
    if (typeof props === "undefined") {
      props = Object.getOwnPropertyNames(obj).filter(prop => !prop.match(/^_/));
      walk = false;
    }
    var objHooks = {};
    var doNotHook = ["constructor"];
    do {
      props.forEach(function(prop) {
        var parts = prop.match(/(?:(sync|async):)?(.+)/);
        var type = parts[1] || "sync";
        var name = parts[2];
        if (
          !objHooks[name] &&
          typeof obj[name] === "function" &&
          !(doNotHook.indexOf(name) !== -1)
        ) {
          var fn = obj[name];
          objHooks[name] = obj[name] = hookFn(
            type,
            fn,
            objName ? [objName, name] : undefined
          );
        }
      });
      obj = Object.getPrototypeOf(obj);
    } while (walk && obj);
    return objHooks;
  }

  /**
   * Navigates a string path to return a hookable function.  If not found, creates a placeholder for hooks.
   * @param {(Array<string> | string)} path
   */
  function get(path) {
    var parts = Array.isArray(path) ? path : path.split(".");
    return parts.reduce(function(memo, part, i) {
      var item = memo[part];
      var installed = false;
      if (item) {
        return item;
      } else if (i === parts.length - 1) {
        if (!ready) {
          postReady.push(function() {
            if (!installed) {
              // eslint-disable-next-line no-console
              console.warn(
                packageName +
                  ": referenced '" +
                  path +
                  "' but it was never created"
              );
            }
          });
        }
        return (memo[part] = newHookable(function(fn) {
          memo[part] = fn;
          installed = true;
        }));
      }
      return (memo[part] = {});
    }, hooks);
  }

  function newHookable(onInstall) {
    var before = [];
    var after = [];
    var generateTrap = function() {};

    var api = {
      before: function(hook, priority) {
        return add.call(this, before, "before", hook, priority);
      },
      after: function(hook, priority) {
        return add.call(this, after, "after", hook, priority);
      },
      getHooks: function(match) {
        var hooks = before.concat(after);
        if (typeof match === "object") {
          hooks = hooks.filter(function(entry) {
            return Object.keys(match).every(function(prop) {
              return entry[prop] === match[prop];
            });
          });
        }
        try {
          Object.assign(hooks, {
            remove: function() {
              hooks.forEach(function(entry) {
                entry.remove();
              });
              return this;
            }
          });
        } catch (e) {
          console.error(
            "error adding `remove` to array, did you modify Array.prototype?"
          );
        }
        return hooks;
      },
      removeAll: function() {
        return this.getHooks().remove();
      }
    };

    var meta = {
      install: function(type, fn, generate) {
        this.type = type;
        generateTrap = generate;
        generate(before, after);
        onInstall && onInstall(fn);
      }
    };

    // store meta data related to hookable. use `api.after` since `api` reference is not available on our proxy.
    hookableMap.set(api.after, meta);

    return api;

    function add(store, type, hook, priority) {
      var entry = {
        hook: hook,
        type: type,
        priority: priority || 10,
        remove: function() {
          var index = store.indexOf(entry);
          if (index !== -1) {
            store.splice(index, 1);
            generateTrap(before, after);
          }
        }
      };
      store.push(entry);
      store.sort(function(a, b) {
        return b.priority - a.priority;
      });
      generateTrap(before, after);
      return this;
    }
  }

  function hookFn(type, fn, name) {
    // check if function has already been wrapped
    var meta = fn.after && hookableMap.get(fn.after);
    if (meta) {
      if (meta.type !== type) {
        throw packageName + ": recreated hookable with different type";
      } else {
        return fn;
      }
    }

    var hookable = name ? get(name) : newHookable();

    var trap;

    var handlers = {
      get: function(target, prop) {
        return hookable[prop] || Reflect.get.apply(Reflect, arguments);
      }
    };

    if (!ready) {
      postReady.push(setTrap);
    }

    var hookedFn = new Proxy(fn, handlers);

    hookableMap.get(hookedFn.after).install(type, hookedFn, generateTrap);

    return hookedFn;

    // eslint-disable-next-line no-redeclare
    function generateTrap(before, after) {
      var order = [];
      var targetIndex;
      if (before.length || after.length) {
        before.forEach(addToOrder);
        // placeholder for target function wrapper
        targetIndex = order.push(undefined) - 1;
        after.forEach(addToOrder);
        trap = function(target, thisArg, args) {
          var localOrder = order.slice();
          var curr = 0;
          var result;
          var callback =
            type === "async" &&
            typeof args[args.length - 1] === "function" &&
            args.pop();
          function bail(value) {
            if (type === "sync") {
              result = value;
            } else if (callback) {
              callback.apply(null, arguments);
            }
          }
          function next(value) {
            if (localOrder[curr]) {
              var args = rest(arguments);
              next.bail = bail;
              args.unshift(next);
              return localOrder[curr++].apply(thisArg, args);
            }
            if (type === "sync") {
              result = value;
            } else if (callback) {
              callback.apply(null, arguments);
            }
          }
          localOrder[targetIndex] = function() {
            var args = rest(arguments, 1);
            if (type === "async" && callback) {
              delete next.bail;
              args.push(next);
            }
            var result = target.apply(thisArg, args);
            if (type === "sync") {
              next(result);
            }
          };
          next.apply(null, args);
          return result;
        };
      } else {
        trap = undefined;
      }
      setTrap();

      function addToOrder(entry) {
        order.push(entry.hook);
      }
    }

    function setTrap() {
      if (
        ready ||
        (type === "sync" && !(config.ready & create.SYNC)) ||
        (type === "async" && !(config.ready & create.ASYNC))
      ) {
        handlers.apply = trap;
      } else if (type === "sync" || !(config.ready & create.QUEUE)) {
        handlers.apply = function() {
          throw packageName + ": hooked function not ready";
        };
      } else {
        handlers.apply = function() {
          var args = arguments;
          postReady.push(function() {
            hookedFn.apply(args[1], args[2]);
          });
        };
      }
    }
  }

  dispatch.get = get;
  return dispatch;
}

/* global module */
module.exports = create;


/***/ }),

/***/ "../../node_modules/klona/json/index.mjs":
/*!***********************************************!*\
  !*** ../../node_modules/klona/json/index.mjs ***!
  \***********************************************/
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

"use strict";
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   klona: () => (/* binding */ klona)
/* harmony export */ });
function klona(val) {
	var k, out, tmp;

	if (Array.isArray(val)) {
		out = Array(k=val.length);
		while (k--) out[k] = (tmp=val[k]) && typeof tmp === 'object' ? klona(tmp) : tmp;
		return out;
	}

	if (Object.prototype.toString.call(val) === '[object Object]') {
		out = {}; // null
		for (k in val) {
			if (k === '__proto__') {
				Object.defineProperty(out, k, {
					value: klona(val[k]),
					configurable: true,
					enumerable: true,
					writable: true,
				});
			} else {
				out[k] = (tmp=val[k]) && typeof tmp === 'object' ? klona(tmp) : tmp;
			}
		}
		return out;
	}

	return val;
}


/***/ }),

/***/ "./buildOptions.mjs":
/*!**************************!*\
  !*** ./buildOptions.mjs ***!
  \**************************/
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

"use strict";
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = ({
  "pbGlobal": "pbjs",
  "defineGlobal": true,
  "features": {
    "NATIVE": true,
    "VIDEO": true,
    "UID2_CSTG": true,
    "GREEDY": false,
    "AUDIO": true,
    "LOG_NON_ERROR": true,
    "LOG_ERROR": true
  },
  "distUrlBase": "https://cdn.jsdelivr.net/npm/prebid.js@latest/dist/chunks/",
  "skipCalls": {}
});

/***/ })

/******/ 	});
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		__webpack_modules__[moduleId](module, module.exports, __webpack_require__);
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = __webpack_modules__;
/******/ 	
/************************************************************************/
/******/ 	/* webpack/runtime/chunk loaded */
/******/ 	(() => {
/******/ 		var deferred = [];
/******/ 		__webpack_require__.O = (result, chunkIds, fn, priority) => {
/******/ 			if(chunkIds) {
/******/ 				priority = priority || 0;
/******/ 				for(var i = deferred.length; i > 0 && deferred[i - 1][2] > priority; i--) deferred[i] = deferred[i - 1];
/******/ 				deferred[i] = [chunkIds, fn, priority];
/******/ 				return;
/******/ 			}
/******/ 			var notFulfilled = Infinity;
/******/ 			for (var i = 0; i < deferred.length; i++) {
/******/ 				var [chunkIds, fn, priority] = deferred[i];
/******/ 				var fulfilled = true;
/******/ 				for (var j = 0; j < chunkIds.length; j++) {
/******/ 					if ((priority & 1 === 0 || notFulfilled >= priority) && Object.keys(__webpack_require__.O).every((key) => (__webpack_require__.O[key](chunkIds[j])))) {
/******/ 						chunkIds.splice(j--, 1);
/******/ 					} else {
/******/ 						fulfilled = false;
/******/ 						if(priority < notFulfilled) notFulfilled = priority;
/******/ 					}
/******/ 				}
/******/ 				if(fulfilled) {
/******/ 					deferred.splice(i--, 1)
/******/ 					var r = fn();
/******/ 					if (r !== undefined) result = r;
/******/ 				}
/******/ 			}
/******/ 			return result;
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/compat get default export */
/******/ 	(() => {
/******/ 		// getDefaultExport function for compatibility with non-harmony modules
/******/ 		__webpack_require__.n = (module) => {
/******/ 			var getter = module && module.__esModule ?
/******/ 				() => (module['default']) :
/******/ 				() => (module);
/******/ 			__webpack_require__.d(getter, { a: getter });
/******/ 			return getter;
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/define property getters */
/******/ 	(() => {
/******/ 		// define getter functions for harmony exports
/******/ 		__webpack_require__.d = (exports, definition) => {
/******/ 			for(var key in definition) {
/******/ 				if(__webpack_require__.o(definition, key) && !__webpack_require__.o(exports, key)) {
/******/ 					Object.defineProperty(exports, key, { enumerable: true, get: definition[key] });
/******/ 				}
/******/ 			}
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/global */
/******/ 	(() => {
/******/ 		__webpack_require__.g = (function() {
/******/ 			if (typeof globalThis === 'object') return globalThis;
/******/ 			try {
/******/ 				return this || new Function('return this')();
/******/ 			} catch (e) {
/******/ 				if (typeof window === 'object') return window;
/******/ 			}
/******/ 		})();
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/hasOwnProperty shorthand */
/******/ 	(() => {
/******/ 		__webpack_require__.o = (obj, prop) => (Object.prototype.hasOwnProperty.call(obj, prop))
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/make namespace object */
/******/ 	(() => {
/******/ 		// define __esModule on exports
/******/ 		__webpack_require__.r = (exports) => {
/******/ 			if(typeof Symbol !== 'undefined' && Symbol.toStringTag) {
/******/ 				Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
/******/ 			}
/******/ 			Object.defineProperty(exports, '__esModule', { value: true });
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/jsonp chunk loading */
/******/ 	(() => {
/******/ 		// no baseURI
/******/ 		
/******/ 		// object to store loaded and loading chunks
/******/ 		// undefined = chunk not loaded, null = chunk preloaded/prefetched
/******/ 		// [resolve, reject, Promise] = chunk loading, 0 = chunk loaded
/******/ 		var installedChunks = {
/******/ 			"prebid-core": 0
/******/ 		};
/******/ 		
/******/ 		// no chunk on demand loading
/******/ 		
/******/ 		// no prefetching
/******/ 		
/******/ 		// no preloaded
/******/ 		
/******/ 		// no HMR
/******/ 		
/******/ 		// no HMR manifest
/******/ 		
/******/ 		__webpack_require__.O.j = (chunkId) => (installedChunks[chunkId] === 0);
/******/ 		
/******/ 		// install a JSONP callback for chunk loading
/******/ 		var webpackJsonpCallback = (parentChunkLoadingFunction, data) => {
/******/ 			var [chunkIds, moreModules, runtime] = data;
/******/ 			// add "moreModules" to the modules object,
/******/ 			// then flag all "chunkIds" as loaded and fire callback
/******/ 			var moduleId, chunkId, i = 0;
/******/ 			if(chunkIds.some((id) => (installedChunks[id] !== 0))) {
/******/ 				for(moduleId in moreModules) {
/******/ 					if(__webpack_require__.o(moreModules, moduleId)) {
/******/ 						__webpack_require__.m[moduleId] = moreModules[moduleId];
/******/ 					}
/******/ 				}
/******/ 				if(runtime) var result = runtime(__webpack_require__);
/******/ 			}
/******/ 			if(parentChunkLoadingFunction) parentChunkLoadingFunction(data);
/******/ 			for(;i < chunkIds.length; i++) {
/******/ 				chunkId = chunkIds[i];
/******/ 				if(__webpack_require__.o(installedChunks, chunkId) && installedChunks[chunkId]) {
/******/ 					installedChunks[chunkId][0]();
/******/ 				}
/******/ 				installedChunks[chunkId] = 0;
/******/ 			}
/******/ 			return __webpack_require__.O(result);
/******/ 		}
/******/ 		
/******/ 		var chunkLoadingGlobal = self["pbjsChunk"] = self["pbjsChunk"] || [];
/******/ 		chunkLoadingGlobal.forEach(webpackJsonpCallback.bind(null, 0));
/******/ 		chunkLoadingGlobal.push = webpackJsonpCallback.bind(null, chunkLoadingGlobal.push.bind(chunkLoadingGlobal));
/******/ 	})();
/******/ 	
/************************************************************************/
/******/ 	
/******/ 	// startup
/******/ 	// Load entry module and return exports
/******/ 	// This entry module depends on other loaded chunks and execution need to be delayed
/******/ 	var __webpack_exports__ = __webpack_require__.O(undefined, ["chunk-core","viewport","dnt","creative-renderer-display"], () => (__webpack_require__("./src/prebid.js")))
/******/ 	__webpack_exports__ = __webpack_require__.O(__webpack_exports__);
/******/ 	
/******/ })()
;

"use strict";
(self["pbjsChunk"] = self["pbjsChunk"] || []).push([["chunk-core"],{

/***/ "./src/Renderer.js":
/*!*************************!*\
  !*** ./src/Renderer.js ***!
  \*************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   Renderer: () => (/* binding */ Renderer),
/* harmony export */   executeRenderer: () => (/* binding */ executeRenderer),
/* harmony export */   isRendererRequired: () => (/* binding */ isRendererRequired)
/* harmony export */ });
/* harmony import */ var _adloader_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./adloader.js */ "./src/adloader.js");
/* harmony import */ var _utils_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./utils.js */ "./src/utils.js");
/* harmony import */ var _prebidGlobal_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./prebidGlobal.js */ "./src/prebidGlobal.js");
/* harmony import */ var _activities_modules_js__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ./activities/modules.js */ "./src/activities/modules.js");




const pbjsInstance = (0,_prebidGlobal_js__WEBPACK_IMPORTED_MODULE_2__.getGlobal)();
const moduleCode = 'outstream';

/**
 * @typedef {object} Renderer
 *
 * A Renderer stores some functions which are used to render a particular Bid.
 * These are used in Outstream Video Bids, returned on the Bid by the adapter, and will
 * be used to render that bid unless the Publisher overrides them.
 */

function Renderer(options) {
  const {
    url,
    config,
    id,
    callback,
    loaded,
    adUnitCode,
    renderNow
  } = options;
  this.url = url;
  this.config = config;
  this.handlers = {};
  this.id = id;
  this.renderNow = renderNow;
  this.adUnitCode = adUnitCode;

  // a renderer may push to the command queue to delay rendering until the
  // render function is loaded by loadExternalScript, at which point the the command
  // queue will be processed
  this.loaded = loaded;
  this.cmd = [];
  this.push = func => {
    if (typeof func !== 'function') {
      (0,_utils_js__WEBPACK_IMPORTED_MODULE_1__.logError)('Commands given to Renderer.push must be wrapped in a function');
      return;
    }
    this.loaded ? func.call() : this.cmd.push(func);
  };

  // bidders may override this with the `callback` property given to `install`
  this.callback = callback || (() => {
    this.loaded = true;
    this.process();
  });

  // use a function, not an arrow, in order to be able to pass "arguments" through
  this.render = function () {
    const renderArgs = arguments;
    const runRender = () => {
      if (this._render) {
        this._render.apply(this, renderArgs);
      } else {
        (0,_utils_js__WEBPACK_IMPORTED_MODULE_1__.logWarn)("No render function was provided, please use .setRender on the renderer");
      }
    };
    if (isRendererPreferredFromAdUnit(adUnitCode)) {
      (0,_utils_js__WEBPACK_IMPORTED_MODULE_1__.logWarn)("External Js not loaded by Renderer since renderer url and callback is already defined on adUnit ".concat(adUnitCode));
      runRender();
    } else if (renderNow) {
      runRender();
    } else {
      // we expect to load a renderer url once only so cache the request to load script
      this.cmd.unshift(runRender); // should render run first ?
      (0,_adloader_js__WEBPACK_IMPORTED_MODULE_0__.loadExternalScript)(url, _activities_modules_js__WEBPACK_IMPORTED_MODULE_3__.MODULE_TYPE_PREBID, moduleCode, this.callback, this.documentContext);
    }
  }.bind(this); // bind the function to this object to avoid 'this' errors
}

/**
 * @param {{}} options
 * @return {Renderer}
 */
Renderer.install = function (_ref) {
  let {
    url,
    config,
    id,
    callback,
    loaded,
    adUnitCode,
    renderNow
  } = _ref;
  return new Renderer({
    url,
    config,
    id,
    callback,
    loaded,
    adUnitCode,
    renderNow
  });
};
Renderer.prototype.getConfig = function () {
  return this.config;
};
Renderer.prototype.setRender = function (fn) {
  this._render = fn;
};
Renderer.prototype.setEventHandlers = function (handlers) {
  this.handlers = handlers;
};
Renderer.prototype.handleVideoEvent = function (_ref2) {
  let {
    id,
    eventName
  } = _ref2;
  if (typeof this.handlers[eventName] === 'function') {
    this.handlers[eventName]();
  }
  (0,_utils_js__WEBPACK_IMPORTED_MODULE_1__.logMessage)("Prebid Renderer event for id ".concat(id, " type ").concat(eventName));
};

/*
 * Calls functions that were pushed to the command queue before the
 * renderer was loaded by `loadExternalScript`
 */
Renderer.prototype.process = function () {
  while (this.cmd.length > 0) {
    try {
      this.cmd.shift().call();
    } catch (error) {
      (0,_utils_js__WEBPACK_IMPORTED_MODULE_1__.logError)("Error processing Renderer command on ad unit '".concat(this.adUnitCode, "':"), error);
    }
  }
};

/**
 * Checks whether creative rendering should be done by Renderer or not.
 * @param {Object} renderer Renderer object installed by adapter
 * @returns {Boolean}
 */
function isRendererRequired(renderer) {
  return !!(renderer && (renderer.url || renderer.renderNow));
}

/**
 * Render the bid returned by the adapter
 * @param {Object} renderer Renderer object installed by adapter
 * @param {Object} bid Bid response
 * @param {Document} doc context document of bid
 */
function executeRenderer(renderer, bid, doc) {
  let docContext = null;
  if (renderer.config && renderer.config.documentResolver) {
    docContext = renderer.config.documentResolver(bid, document, doc); // a user provided callback, which should return a Document, and expect the parameters; bid, sourceDocument, renderDocument
  }
  if (!docContext) {
    docContext = document;
  }
  renderer.documentContext = docContext;
  renderer.render(bid, renderer.documentContext);
}
function isRendererPreferredFromAdUnit(adUnitCode) {
  var _adUnit$mediaTypes;
  const adUnits = pbjsInstance.adUnits;
  const adUnit = adUnits.find(adUnit => {
    return adUnit.code === adUnitCode;
  });
  if (!adUnit) {
    return false;
  }

  // renderer defined at adUnit level
  const adUnitRenderer = adUnit === null || adUnit === void 0 ? void 0 : adUnit.renderer;
  const hasValidAdUnitRenderer = !!(adUnitRenderer && adUnitRenderer.url && adUnitRenderer.render);

  // renderer defined at adUnit.mediaTypes level
  const mediaTypeRenderer = adUnit === null || adUnit === void 0 || (_adUnit$mediaTypes = adUnit.mediaTypes) === null || _adUnit$mediaTypes === void 0 || (_adUnit$mediaTypes = _adUnit$mediaTypes.video) === null || _adUnit$mediaTypes === void 0 ? void 0 : _adUnit$mediaTypes.renderer;
  const hasValidMediaTypeRenderer = !!(mediaTypeRenderer && mediaTypeRenderer.url && mediaTypeRenderer.render);
  return !!(hasValidAdUnitRenderer && !(adUnitRenderer.backupOnly === true) || hasValidMediaTypeRenderer && !(mediaTypeRenderer.backupOnly === true));
}


/***/ }),

/***/ "./src/activities/activities.js":
/*!**************************************!*\
  !*** ./src/activities/activities.js ***!
  \**************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   ACTIVITY_ACCESS_DEVICE: () => (/* binding */ ACTIVITY_ACCESS_DEVICE),
/* harmony export */   ACTIVITY_ACCESS_REQUEST_CREDENTIALS: () => (/* binding */ ACTIVITY_ACCESS_REQUEST_CREDENTIALS),
/* harmony export */   ACTIVITY_FETCH_BIDS: () => (/* binding */ ACTIVITY_FETCH_BIDS),
/* harmony export */   ACTIVITY_REPORT_ANALYTICS: () => (/* binding */ ACTIVITY_REPORT_ANALYTICS),
/* harmony export */   ACTIVITY_SYNC_USER: () => (/* binding */ ACTIVITY_SYNC_USER),
/* harmony export */   ACTIVITY_TRANSMIT_EIDS: () => (/* binding */ ACTIVITY_TRANSMIT_EIDS),
/* harmony export */   ACTIVITY_TRANSMIT_PRECISE_GEO: () => (/* binding */ ACTIVITY_TRANSMIT_PRECISE_GEO),
/* harmony export */   ACTIVITY_TRANSMIT_TID: () => (/* binding */ ACTIVITY_TRANSMIT_TID),
/* harmony export */   ACTIVITY_TRANSMIT_UFPD: () => (/* binding */ ACTIVITY_TRANSMIT_UFPD),
/* harmony export */   LOAD_EXTERNAL_SCRIPT: () => (/* binding */ LOAD_EXTERNAL_SCRIPT)
/* harmony export */ });
/* unused harmony exports ACTIVITY_ENRICH_UFPD, ACTIVITY_ENRICH_EIDS */
/**
 * Activity (that are relevant for privacy) definitions
 *
 * ref. https://docs.google.com/document/d/1dRxFUFmhh2jGanzGZvfkK_6jtHPpHXWD7Qsi6KEugeE
 * & https://github.com/prebid/Prebid.js/issues/9546
 */

/**
 * accessDevice: some component wants to read or write to localStorage or cookies.
 */
const ACTIVITY_ACCESS_DEVICE = 'accessDevice';
/**
 * syncUser: A bid adapter wants to run a user sync.
 */
const ACTIVITY_SYNC_USER = 'syncUser';
/**
 * enrichUfpd: some component wants to add user first-party data to bid requests.
 */
const ACTIVITY_ENRICH_UFPD = 'enrichUfpd';
/**
 * enrichEids: some component wants to add user IDs to bid requests.
 */
const ACTIVITY_ENRICH_EIDS = 'enrichEids';
/**
 * fetchBid: a bidder wants to bid.
 */
const ACTIVITY_FETCH_BIDS = 'fetchBids';

/**
 * reportAnalytics: some component wants to phone home with analytics data.
 */
const ACTIVITY_REPORT_ANALYTICS = 'reportAnalytics';

/**
 * some component wants access to (and send along) user IDs
 */
const ACTIVITY_TRANSMIT_EIDS = 'transmitEids';

/**
 * transmitUfpd: some component wants access to (and send along) user FPD
 */
const ACTIVITY_TRANSMIT_UFPD = 'transmitUfpd';

/**
 * transmitPreciseGeo: some component wants access to (and send along) geolocation info
 */
const ACTIVITY_TRANSMIT_PRECISE_GEO = 'transmitPreciseGeo';

/**
 * transmit TID: some component wants access ot (and send along) transaction IDs
 */
const ACTIVITY_TRANSMIT_TID = 'transmitTid';

/**
 * loadExternalScript: adLoader.js is allowed to load external script
 */
const LOAD_EXTERNAL_SCRIPT = 'loadExternalScript';

/**
 * accessRequestCredentials: setting withCredentials flag in ajax request config
 */
const ACTIVITY_ACCESS_REQUEST_CREDENTIALS = 'accessRequestCredentials';


/***/ }),

/***/ "./src/activities/activityParams.js":
/*!******************************************!*\
  !*** ./src/activities/activityParams.js ***!
  \******************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   activityParams: () => (/* binding */ activityParams)
/* harmony export */ });
/* harmony import */ var _adapterManager_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../adapterManager.js */ "./src/adapterManager.js");
/* harmony import */ var _params_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./params.js */ "./src/activities/params.js");



/**
 * Utility function for building common activity parameters - broken out to its own
 * file to avoid circular imports.
 */
const activityParams = (0,_params_js__WEBPACK_IMPORTED_MODULE_1__.activityParamsBuilder)(alias => _adapterManager_js__WEBPACK_IMPORTED_MODULE_0__["default"].resolveAlias(alias));


/***/ }),

/***/ "./src/activities/modules.js":
/*!***********************************!*\
  !*** ./src/activities/modules.js ***!
  \***********************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   MODULE_TYPE_ANALYTICS: () => (/* binding */ MODULE_TYPE_ANALYTICS),
/* harmony export */   MODULE_TYPE_BIDDER: () => (/* binding */ MODULE_TYPE_BIDDER),
/* harmony export */   MODULE_TYPE_PREBID: () => (/* binding */ MODULE_TYPE_PREBID)
/* harmony export */ });
/* unused harmony exports MODULE_TYPE_UID, MODULE_TYPE_RTD */
const MODULE_TYPE_PREBID = 'prebid';
const MODULE_TYPE_BIDDER = 'bidder';
const MODULE_TYPE_UID = 'userId';
const MODULE_TYPE_RTD = 'rtd';
const MODULE_TYPE_ANALYTICS = 'analytics';


/***/ }),

/***/ "./src/activities/params.js":
/*!**********************************!*\
  !*** ./src/activities/params.js ***!
  \**********************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   ACTIVITY_PARAM_ADAPTER_CODE: () => (/* binding */ ACTIVITY_PARAM_ADAPTER_CODE),
/* harmony export */   ACTIVITY_PARAM_ANL_CONFIG: () => (/* binding */ ACTIVITY_PARAM_ANL_CONFIG),
/* harmony export */   ACTIVITY_PARAM_COMPONENT: () => (/* binding */ ACTIVITY_PARAM_COMPONENT),
/* harmony export */   ACTIVITY_PARAM_COMPONENT_NAME: () => (/* binding */ ACTIVITY_PARAM_COMPONENT_NAME),
/* harmony export */   ACTIVITY_PARAM_COMPONENT_TYPE: () => (/* binding */ ACTIVITY_PARAM_COMPONENT_TYPE),
/* harmony export */   ACTIVITY_PARAM_S2S_NAME: () => (/* binding */ ACTIVITY_PARAM_S2S_NAME),
/* harmony export */   ACTIVITY_PARAM_STORAGE_KEY: () => (/* binding */ ACTIVITY_PARAM_STORAGE_KEY),
/* harmony export */   ACTIVITY_PARAM_STORAGE_TYPE: () => (/* binding */ ACTIVITY_PARAM_STORAGE_TYPE),
/* harmony export */   ACTIVITY_PARAM_STORAGE_WRITE: () => (/* binding */ ACTIVITY_PARAM_STORAGE_WRITE),
/* harmony export */   ACTIVITY_PARAM_SYNC_TYPE: () => (/* binding */ ACTIVITY_PARAM_SYNC_TYPE),
/* harmony export */   ACTIVITY_PARAM_SYNC_URL: () => (/* binding */ ACTIVITY_PARAM_SYNC_URL),
/* harmony export */   activityParamsBuilder: () => (/* binding */ activityParamsBuilder)
/* harmony export */ });
/* unused harmony export buildActivityParams */
/* harmony import */ var _modules_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./modules.js */ "./src/activities/modules.js");
/* harmony import */ var _hook_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../hook.js */ "./src/hook.js");



/**
 * Component ID - who is trying to perform the activity?
 * Relevant for all activities.
 */
const ACTIVITY_PARAM_COMPONENT = 'component';
const ACTIVITY_PARAM_COMPONENT_TYPE = ACTIVITY_PARAM_COMPONENT + 'Type';
const ACTIVITY_PARAM_COMPONENT_NAME = ACTIVITY_PARAM_COMPONENT + 'Name';

/**
 * Code of the bid adapter that `componentName` is an alias of.
 * May be the same as the component name.
 *
 * relevant for all activities, but only when componentType is 'bidder'.
 */
const ACTIVITY_PARAM_ADAPTER_CODE = 'adapterCode';

/**
 * Storage type - either 'html5' or 'cookie'.
 * Relevant for: accessDevice
 */
const ACTIVITY_PARAM_STORAGE_TYPE = 'storageType';

/**
 * Storage key - cookie name or localStorage key.
 * Relevant for: accessDevice
 */
const ACTIVITY_PARAM_STORAGE_KEY = 'storageKey';

/**
 * True if attempting to write to device storage; false otherwise (e.g. when reading from or checking availability of storage).
 * Relevant for: accessDevice
 */
const ACTIVITY_PARAM_STORAGE_WRITE = 'write';

/**
 * s2sConfig[].configName, used to identify a particular s2s instance
 * relevant for: fetchBids, but only when component is 'prebid.pbsBidAdapter'
 */
const ACTIVITY_PARAM_S2S_NAME = 'configName';
/**
 * user sync type - 'iframe' or 'pixel'
 * relevant for: syncUser
 */
const ACTIVITY_PARAM_SYNC_TYPE = 'syncType';
/**
 * user sync URL
 * relevant for: syncUser
 */
const ACTIVITY_PARAM_SYNC_URL = 'syncUrl';
/**
 * Configuration options for analytics adapter - the argument passed to `enableAnalytics`.
 * Relevant for: reportAnalytics
 * @private
 * @constant
 * @type {string}
 */
const ACTIVITY_PARAM_ANL_CONFIG = '_config';
function activityParamsBuilder(resolveAlias) {
  return function activityParams(moduleType, moduleName, params) {
    const defaults = {
      [ACTIVITY_PARAM_COMPONENT_TYPE]: moduleType,
      [ACTIVITY_PARAM_COMPONENT_NAME]: moduleName,
      [ACTIVITY_PARAM_COMPONENT]: "".concat(moduleType, ".").concat(moduleName)
    };
    if (moduleType === _modules_js__WEBPACK_IMPORTED_MODULE_0__.MODULE_TYPE_BIDDER) {
      defaults[ACTIVITY_PARAM_ADAPTER_CODE] = resolveAlias(moduleName);
    }
    return buildActivityParams(Object.assign(defaults, params));
  };
}
const buildActivityParams = (0,_hook_js__WEBPACK_IMPORTED_MODULE_1__.hook)('sync', params => params);


/***/ }),

/***/ "./src/activities/redactor.js":
/*!************************************!*\
  !*** ./src/activities/redactor.js ***!
  \************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   redactor: () => (/* binding */ redactor)
/* harmony export */ });
/* unused harmony exports ORTB_UFPD_PATHS, ORTB_EIDS_PATHS, ORTB_GEO_PATHS, ORTB_IPV4_PATHS, ORTB_IPV6_PATHS, redactRule, objectTransformer, sessionedApplies, isData, appliesWhenActivityDenied, ortb2TransmitRules, redactorFactory */
/* harmony import */ var _utils_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../utils.js */ "../../node_modules/dlv/index.js");
/* harmony import */ var _config_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../config.js */ "./src/config.js");
/* harmony import */ var _rules_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./rules.js */ "./src/activities/rules.js");
/* harmony import */ var _activities_js__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ./activities.js */ "./src/activities/activities.js");
/* harmony import */ var _utils_ipUtils_js__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ../utils/ipUtils.js */ "./src/utils/ipUtils.js");





const ORTB_UFPD_PATHS = ['data', 'ext.data', 'yob', 'gender', 'keywords', 'kwarray', 'id', 'buyeruid', 'customdata'].map(f => "user.".concat(f)).concat('device.ext.cdep');
const ORTB_EIDS_PATHS = ['user.eids', 'user.ext.eids'];
const ORTB_GEO_PATHS = ['user.geo.lat', 'user.geo.lon', 'device.geo.lat', 'device.geo.lon'];
const ORTB_IPV4_PATHS = ['device.ip'];
const ORTB_IPV6_PATHS = ['device.ipv6'];

/**
 * @typedef TransformationRuleDef
 * @property {name}
 * @property {Array[string]} paths dot-separated list of paths that this rule applies to.
 * @property {function(*): boolean} applies a predicate that should return true if this rule applies
 * (and the transformation defined herein should be applied). The arguments are those passed to the transformation function.
 * @property {name} a name for the rule; used to debounce calls to `applies` (and avoid excessive logging):
 * if a rule with the same name was already found to apply (or not), this one will (or won't) as well.
 */

/**
 * @typedef RedactRuleDef A rule that removes, or replaces, values from an object (modifications are done in-place).
 * @augments TransformationRuleDef
 * @property {function(*): *} get? substitution functions for values that should be redacted;
 *  takes in the original (unredacted) value as an input, and returns a substitute to use in the redacted
 *  version. If it returns undefined, or this option is omitted, protected paths will be removed
 *  from the redacted object.
 */

/**
 * @param {RedactRuleDef} ruleDef
 * @return {TransformationRule}
 */
function redactRule(ruleDef) {
  return Object.assign({
    get() {},
    run(root, path, object, property, applies) {
      const val = object && object[property];
      if (isData(val) && applies()) {
        const repl = this.get(val);
        if (repl === undefined) {
          delete object[property];
        } else {
          object[property] = repl;
        }
      }
    }
  }, ruleDef);
}

/**
 * @typedef TransformationRule
 * @augments TransformationRuleDef
 * @property {function} run rule logic - see `redactRule` for an example.
 */

/**
 * @typedef {Function} TransformationFunction
 * @param object object to transform
 * @param ...args arguments to pass down to rule's `apply` methods.
 */

/**
 * Return a transformation function that will apply the given rules to an object.
 *
 * @param {Array[TransformationRule]} rules
 * @return {TransformationFunction}
 */
function objectTransformer(rules) {
  rules.forEach(rule => {
    rule.paths = rule.paths.map(path => {
      const parts = path.split('.');
      const tail = parts.pop();
      return [parts.length > 0 ? parts.join('.') : null, tail];
    });
  });
  return function applyTransform(session, obj) {
    const result = [];
    for (var _len = arguments.length, args = new Array(_len > 2 ? _len - 2 : 0), _key = 2; _key < _len; _key++) {
      args[_key - 2] = arguments[_key];
    }
    const applies = sessionedApplies(session, ...args);
    rules.forEach(rule => {
      if (session[rule.name] === false) return;
      for (const [head, tail] of rule.paths) {
        const parent = head == null ? obj : (0,_utils_js__WEBPACK_IMPORTED_MODULE_0__["default"])(obj, head);
        result.push(rule.run(obj, head, parent, tail, applies.bind(null, rule)));
        if (session[rule.name] === false) return;
      }
    });
    return result.filter(el => el != null);
  };
}
function sessionedApplies(session) {
  for (var _len2 = arguments.length, args = new Array(_len2 > 1 ? _len2 - 1 : 0), _key2 = 1; _key2 < _len2; _key2++) {
    args[_key2 - 1] = arguments[_key2];
  }
  return function applies(rule) {
    if (!session.hasOwnProperty(rule.name)) {
      session[rule.name] = !!rule.applies(...args);
    }
    return session[rule.name];
  };
}
function isData(val) {
  return val != null && (typeof val !== 'object' || Object.keys(val).length > 0);
}
function appliesWhenActivityDenied(activity) {
  let isAllowed = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : _rules_js__WEBPACK_IMPORTED_MODULE_2__.isActivityAllowed;
  return function applies(params) {
    return !isAllowed(activity, params);
  };
}
function bidRequestTransmitRules() {
  let isAllowed = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : _rules_js__WEBPACK_IMPORTED_MODULE_2__.isActivityAllowed;
  return [{
    name: _activities_js__WEBPACK_IMPORTED_MODULE_3__.ACTIVITY_TRANSMIT_EIDS,
    paths: ['userId', 'userIdAsEids'],
    applies: appliesWhenActivityDenied(_activities_js__WEBPACK_IMPORTED_MODULE_3__.ACTIVITY_TRANSMIT_EIDS, isAllowed)
  }, {
    name: _activities_js__WEBPACK_IMPORTED_MODULE_3__.ACTIVITY_TRANSMIT_TID,
    paths: ['ortb2Imp.ext.tid', 'ortb2Imp.ext.tidSource'],
    applies: appliesWhenActivityDenied(_activities_js__WEBPACK_IMPORTED_MODULE_3__.ACTIVITY_TRANSMIT_TID, isAllowed)
  }].map(redactRule);
}
function ortb2TransmitRules() {
  let isAllowed = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : _rules_js__WEBPACK_IMPORTED_MODULE_2__.isActivityAllowed;
  return [{
    name: _activities_js__WEBPACK_IMPORTED_MODULE_3__.ACTIVITY_TRANSMIT_UFPD,
    paths: ORTB_UFPD_PATHS,
    applies: appliesWhenActivityDenied(_activities_js__WEBPACK_IMPORTED_MODULE_3__.ACTIVITY_TRANSMIT_UFPD, isAllowed)
  }, {
    name: _activities_js__WEBPACK_IMPORTED_MODULE_3__.ACTIVITY_TRANSMIT_EIDS,
    paths: ORTB_EIDS_PATHS,
    applies: appliesWhenActivityDenied(_activities_js__WEBPACK_IMPORTED_MODULE_3__.ACTIVITY_TRANSMIT_EIDS, isAllowed)
  }, {
    name: _activities_js__WEBPACK_IMPORTED_MODULE_3__.ACTIVITY_TRANSMIT_PRECISE_GEO,
    paths: ORTB_GEO_PATHS,
    applies: appliesWhenActivityDenied(_activities_js__WEBPACK_IMPORTED_MODULE_3__.ACTIVITY_TRANSMIT_PRECISE_GEO, isAllowed),
    get(val) {
      return Math.round((val + Number.EPSILON) * 100) / 100;
    }
  }, {
    name: _activities_js__WEBPACK_IMPORTED_MODULE_3__.ACTIVITY_TRANSMIT_PRECISE_GEO,
    paths: ORTB_IPV4_PATHS,
    applies: appliesWhenActivityDenied(_activities_js__WEBPACK_IMPORTED_MODULE_3__.ACTIVITY_TRANSMIT_PRECISE_GEO, isAllowed),
    get(val) {
      return (0,_utils_ipUtils_js__WEBPACK_IMPORTED_MODULE_4__.scrubIPv4)(val);
    }
  }, {
    name: _activities_js__WEBPACK_IMPORTED_MODULE_3__.ACTIVITY_TRANSMIT_PRECISE_GEO,
    paths: ORTB_IPV6_PATHS,
    applies: appliesWhenActivityDenied(_activities_js__WEBPACK_IMPORTED_MODULE_3__.ACTIVITY_TRANSMIT_PRECISE_GEO, isAllowed),
    get(val) {
      return (0,_utils_ipUtils_js__WEBPACK_IMPORTED_MODULE_4__.scrubIPv6)(val);
    }
  }, {
    name: _activities_js__WEBPACK_IMPORTED_MODULE_3__.ACTIVITY_TRANSMIT_TID,
    paths: ['source.tid', 'source.ext.tidSource'],
    applies: appliesWhenActivityDenied(_activities_js__WEBPACK_IMPORTED_MODULE_3__.ACTIVITY_TRANSMIT_TID, isAllowed)
  }].map(redactRule);
}
function redactorFactory() {
  let isAllowed = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : _rules_js__WEBPACK_IMPORTED_MODULE_2__.isActivityAllowed;
  const redactOrtb2 = objectTransformer(ortb2TransmitRules(isAllowed));
  const redactBidRequest = objectTransformer(bidRequestTransmitRules(isAllowed));
  return function redactor(params) {
    const session = {};
    return {
      ortb2(obj) {
        redactOrtb2(session, obj, params);
        return obj;
      },
      bidRequest(obj) {
        redactBidRequest(session, obj, params);
        return obj;
      }
    };
  };
}

/**
 * Returns an object that can redact other privacy-sensitive objects according
 * to activity rules.
 *
 * @param {{}} params activity parameters to use for activity checks
 * @return {{ortb2: function({}): {}, bidRequest: function({}): {}}} methods
 *  that can redact disallowed data from ORTB2 and/or bid request objects.
 */
const redactor = redactorFactory();
// by default, TIDs are off since version 8
(0,_rules_js__WEBPACK_IMPORTED_MODULE_2__.registerActivityControl)(_activities_js__WEBPACK_IMPORTED_MODULE_3__.ACTIVITY_TRANSMIT_TID, 'enableTIDs config', () => {
  if (!_config_js__WEBPACK_IMPORTED_MODULE_1__.config.getConfig('enableTIDs')) {
    return {
      allow: false,
      reason: 'TIDs are disabled'
    };
  }
});


/***/ }),

/***/ "./src/activities/rules.js":
/*!*********************************!*\
  !*** ./src/activities/rules.js ***!
  \*********************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   isActivityAllowed: () => (/* binding */ isActivityAllowed),
/* harmony export */   registerActivityControl: () => (/* binding */ registerActivityControl)
/* harmony export */ });
/* unused harmony export ruleRegistry */
/* harmony import */ var _utils_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../utils.js */ "./src/utils.js");
/* harmony import */ var _params_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./params.js */ "./src/activities/params.js");



/**
 * @param logger
 * @return {((function(string, string, function(Object): {allow: boolean, reason?: string}, number=): function(): void)|(function(string, {}): boolean)|*)[]}
 */
function ruleRegistry() {
  let logger = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : (0,_utils_js__WEBPACK_IMPORTED_MODULE_0__.prefixLog)('Activity control:');
  const registry = {};
  function getRules(activity) {
    registry[activity] = registry[activity] || [];
    return registry[activity];
  }
  function runRule(activity, name, rule, params) {
    let res;
    try {
      res = rule(params);
    } catch (e) {
      logger.logError("Exception in rule ".concat(name, " for '").concat(activity, "'"), e);
      res = {
        allow: false,
        reason: e
      };
    }
    return res && Object.assign({
      activity,
      name,
      component: params[_params_js__WEBPACK_IMPORTED_MODULE_1__.ACTIVITY_PARAM_COMPONENT]
    }, res);
  }
  const dupes = {};
  const DEDUPE_INTERVAL = 1000;

  // eslint-disable-next-line no-restricted-syntax
  function logResult(_ref) {
    let {
      activity,
      name,
      allow,
      reason,
      component
    } = _ref;
    const msg = "".concat(name, " ").concat(allow ? 'allowed' : 'denied', " '").concat(activity, "' for '").concat(component, "'").concat(reason ? ':' : '');
    const deduping = dupes.hasOwnProperty(msg);
    if (deduping) {
      clearTimeout(dupes[msg]);
    }
    dupes[msg] = setTimeout(() => delete dupes[msg], DEDUPE_INTERVAL);
    if (!deduping) {
      const parts = [msg];
      reason && parts.push(reason);
      (allow ? logger.logInfo : logger.logWarn).apply(logger, parts);
    }
  }
  return [
  /**
   * Register an activity control rule.
   *
   * @param {string} activity - Activity name, as defined in `activities.js`.
   * @param {string} ruleName - A name for this rule, used for logging.
   * @param {function(Object): {allow: boolean, reason?: string}} rule - Rule definition function. Takes in activity
   *        parameters as a single map; MAY return an object {allow, reason}, where allow is true/false,
   *        and reason is an optional message used for logging.
   *
   *        {allow: true} will allow this activity AS LONG AS no other rules with the same or higher priority return {allow: false};
   *        {allow: false} will deny this activity AS LONG AS no other rules with higher priority return {allow: true};
   *        Returning null/undefined has no effect - the decision is left to other rules.
   *        If no rule returns an allow value, the default is to allow the activity.
   *
   * @param {number} [priority=10] - Rule priority; lower number means higher priority.
   * @returns {function(): void} - A function that unregisters the rule when called.
   */
  function registerActivityControl(activity, ruleName, rule) {
    let priority = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : 10;
    const rules = getRules(activity);
    const pos = rules.findIndex(_ref2 => {
      let [itemPriority] = _ref2;
      return priority < itemPriority;
    });
    const entry = [priority, ruleName, rule];
    rules.splice(pos < 0 ? rules.length : pos, 0, entry);
    return function () {
      const idx = rules.indexOf(entry);
      if (idx >= 0) rules.splice(idx, 1);
    };
  },
  /**
   * Test whether an activity is allowed.
   *
   * @param {string} activity activity name
   * @param {{}} params activity parameters; should be generated through the `activityParams` utility.
   * @return {boolean} true for allow, false for deny.
   */
  function isActivityAllowed(activity, params) {
    let lastPriority, foundAllow;
    for (const [priority, name, rule] of getRules(activity)) {
      if (lastPriority !== priority && foundAllow) break;
      lastPriority = priority;
      const ruleResult = runRule(activity, name, rule, params);
      if (ruleResult) {
        if (!ruleResult.allow) {
          logResult(ruleResult);
          return false;
        } else {
          foundAllow = ruleResult;
        }
      }
    }
    foundAllow && logResult(foundAllow);
    return true;
  }];
}
const [registerActivityControl, isActivityAllowed] = ruleRegistry();


/***/ }),

/***/ "./src/adRendering.js":
/*!****************************!*\
  !*** ./src/adRendering.js ***!
  \****************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   deferRendering: () => (/* binding */ deferRendering),
/* harmony export */   getBidToRender: () => (/* binding */ getBidToRender),
/* harmony export */   getRenderingData: () => (/* binding */ getRenderingData),
/* harmony export */   handleCreativeEvent: () => (/* binding */ handleCreativeEvent),
/* harmony export */   handleNativeMessage: () => (/* binding */ handleNativeMessage),
/* harmony export */   handleRender: () => (/* binding */ handleRender),
/* harmony export */   insertLocatorFrame: () => (/* binding */ insertLocatorFrame),
/* harmony export */   markBidAsRendered: () => (/* binding */ markBidAsRendered),
/* harmony export */   markWinner: () => (/* binding */ markWinner),
/* harmony export */   markWinningBid: () => (/* binding */ markWinningBid),
/* harmony export */   renderAdDirect: () => (/* binding */ renderAdDirect),
/* harmony export */   renderIfDeferred: () => (/* binding */ renderIfDeferred)
/* harmony export */ });
/* unused harmony exports emitAdRenderFail, emitAdRenderSucceeded, emitBrowserIntervention, doRender */
/* harmony import */ var _utils_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./utils.js */ "./src/utils.js");
/* harmony import */ var _events_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./events.js */ "./src/events.js");
/* harmony import */ var _constants_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./constants.js */ "./src/constants.js");
/* harmony import */ var _config_js__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ./config.js */ "./src/config.js");
/* harmony import */ var _Renderer_js__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ./Renderer.js */ "./src/Renderer.js");
/* harmony import */ var _mediaTypes_js__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! ./mediaTypes.js */ "./src/mediaTypes.js");
/* harmony import */ var _auctionManager_js__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(/*! ./auctionManager.js */ "./src/auctionManager.js");
/* harmony import */ var _creativeRenderers_js__WEBPACK_IMPORTED_MODULE_7__ = __webpack_require__(/*! ./creativeRenderers.js */ "./src/creativeRenderers.js");
/* harmony import */ var _hook_js__WEBPACK_IMPORTED_MODULE_8__ = __webpack_require__(/*! ./hook.js */ "./src/hook.js");
/* harmony import */ var _native_js__WEBPACK_IMPORTED_MODULE_9__ = __webpack_require__(/*! ./native.js */ "./src/native.js");
/* harmony import */ var _utils_promise_js__WEBPACK_IMPORTED_MODULE_10__ = __webpack_require__(/*! ./utils/promise.js */ "./src/utils/promise.js");
/* harmony import */ var _adapterManager_js__WEBPACK_IMPORTED_MODULE_11__ = __webpack_require__(/*! ./adapterManager.js */ "./src/adapterManager.js");
/* harmony import */ var _utils_perfMetrics_js__WEBPACK_IMPORTED_MODULE_12__ = __webpack_require__(/*! ./utils/perfMetrics.js */ "./src/utils/perfMetrics.js");
/* harmony import */ var _targeting_js__WEBPACK_IMPORTED_MODULE_13__ = __webpack_require__(/*! ./targeting.js */ "./src/targeting.js");
/* harmony import */ var _eventTrackers_js__WEBPACK_IMPORTED_MODULE_14__ = __webpack_require__(/*! ./eventTrackers.js */ "./src/eventTrackers.js");















const {
  AD_RENDER_FAILED,
  AD_RENDER_SUCCEEDED,
  STALE_RENDER,
  BID_WON,
  EXPIRED_RENDER
} = _constants_js__WEBPACK_IMPORTED_MODULE_2__.EVENTS;
const {
  EXCEPTION
} = _constants_js__WEBPACK_IMPORTED_MODULE_2__.AD_RENDER_FAILED_REASON;
const getBidToRender = (0,_hook_js__WEBPACK_IMPORTED_MODULE_8__.hook)('sync', function (adId) {
  let forRender = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : true;
  let override = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : _utils_promise_js__WEBPACK_IMPORTED_MODULE_10__.PbPromise.resolve();
  return override.then(bid => bid !== null && bid !== void 0 ? bid : _auctionManager_js__WEBPACK_IMPORTED_MODULE_6__.auctionManager.findBidByAdId(adId)).catch(() => {});
});
const markWinningBid = (0,_hook_js__WEBPACK_IMPORTED_MODULE_8__.hook)('sync', function (bid) {
  var _parseEventTrackers$E;
  (((_parseEventTrackers$E = (0,_eventTrackers_js__WEBPACK_IMPORTED_MODULE_14__.parseEventTrackers)(bid.eventtrackers)[_eventTrackers_js__WEBPACK_IMPORTED_MODULE_14__.EVENT_TYPE_WIN]) === null || _parseEventTrackers$E === void 0 ? void 0 : _parseEventTrackers$E[_eventTrackers_js__WEBPACK_IMPORTED_MODULE_14__.TRACKER_METHOD_IMG]) || []).forEach(url => (0,_utils_js__WEBPACK_IMPORTED_MODULE_0__.triggerPixel)(url));
  _events_js__WEBPACK_IMPORTED_MODULE_1__.emit(BID_WON, bid);
  _auctionManager_js__WEBPACK_IMPORTED_MODULE_6__.auctionManager.addWinningBid(bid);
});
/**
 * Emit the AD_RENDER_FAILED event.
 */
function emitAdRenderFail(_ref) {
  let {
    reason,
    message,
    bid,
    id
  } = _ref;
  const data = {
    reason,
    message
  };
  if (bid) {
    data.bid = bid;
    data.adId = bid.adId;
  }
  if (id) data.adId = id;
  (0,_utils_js__WEBPACK_IMPORTED_MODULE_0__.logError)("Error rendering ad (id: ".concat(id, "): ").concat(message));
  _events_js__WEBPACK_IMPORTED_MODULE_1__.emit(AD_RENDER_FAILED, data);
}
/**
 * Emit the AD_RENDER_SUCCEEDED event.
 * (Note: Invocation of this function indicates that the render function did not generate an error, it does not guarantee that tracking for this event has occurred yet.)
 */
function emitAdRenderSucceeded(_ref2) {
  let {
    doc,
    bid,
    id
  } = _ref2;
  const data = {
    doc,
    bid,
    adId: id
  };
  _adapterManager_js__WEBPACK_IMPORTED_MODULE_11__["default"].callAdRenderSucceededBidder(bid.adapterCode || bid.bidder, bid);
  _events_js__WEBPACK_IMPORTED_MODULE_1__.emit(AD_RENDER_SUCCEEDED, data);
}

/**
 * Data for the BROWSER_INTERVENTION event.
 */

/**
 * Emit the BROWSER_INTERVENTION event.
 * This event is fired when the browser blocks an ad from rendering, typically due to ad blocking software or browser security features.
 */
function emitBrowserIntervention(data) {
  const {
    bid,
    intervention
  } = data;
  _adapterManager_js__WEBPACK_IMPORTED_MODULE_11__["default"].callOnInterventionBidder(bid.adapterCode || bid.bidder, bid, intervention);
  _events_js__WEBPACK_IMPORTED_MODULE_1__.emit(_constants_js__WEBPACK_IMPORTED_MODULE_2__.EVENTS.BROWSER_INTERVENTION, data);
}
function handleCreativeEvent(data, bidResponse) {
  switch (data.event) {
    case _constants_js__WEBPACK_IMPORTED_MODULE_2__.EVENTS.AD_RENDER_FAILED:
      emitAdRenderFail({
        bid: bidResponse,
        id: bidResponse.adId,
        reason: data.info.reason,
        message: data.info.message
      });
      break;
    case _constants_js__WEBPACK_IMPORTED_MODULE_2__.EVENTS.AD_RENDER_SUCCEEDED:
      emitAdRenderSucceeded({
        doc: null,
        bid: bidResponse,
        id: bidResponse.adId
      });
      break;
    case _constants_js__WEBPACK_IMPORTED_MODULE_2__.EVENTS.BROWSER_INTERVENTION:
      emitBrowserIntervention({
        bid: bidResponse,
        adId: bidResponse.adId,
        intervention: data.intervention
      });
      break;
    default:
      (0,_utils_js__WEBPACK_IMPORTED_MODULE_0__.logError)("Received event request for unsupported event: '".concat(data.event, "' (adId: '").concat(bidResponse.adId, "')"));
  }
}
function handleNativeMessage(data, bidResponse, _ref3) {
  let {
    resizeFn,
    fireTrackers = _native_js__WEBPACK_IMPORTED_MODULE_9__.fireNativeTrackers
  } = _ref3;
  switch (data.action) {
    case 'resizeNativeHeight':
      resizeFn(data.width, data.height);
      break;
    default:
      fireTrackers(data, bidResponse);
  }
}
const HANDLERS = {
  [_constants_js__WEBPACK_IMPORTED_MODULE_2__.MESSAGES.EVENT]: handleCreativeEvent
};
if (true) {
  HANDLERS[_constants_js__WEBPACK_IMPORTED_MODULE_2__.MESSAGES.NATIVE] = handleNativeMessage;
}
function creativeMessageHandler(deps) {
  return function (type, data, bidResponse) {
    if (HANDLERS.hasOwnProperty(type)) {
      HANDLERS[type](data, bidResponse, deps);
    }
  };
}
const getRenderingData = (0,_hook_js__WEBPACK_IMPORTED_MODULE_8__.hook)('sync', function (bidResponse, options) {
  const {
    ad,
    adUrl,
    cpm,
    originalCpm,
    width,
    height,
    instl
  } = bidResponse;
  const repl = {
    AUCTION_PRICE: originalCpm || cpm,
    CLICKTHROUGH: (options === null || options === void 0 ? void 0 : options.clickUrl) || ''
  };
  return {
    ad: (0,_utils_js__WEBPACK_IMPORTED_MODULE_0__.replaceMacros)(ad, repl),
    adUrl: (0,_utils_js__WEBPACK_IMPORTED_MODULE_0__.replaceMacros)(adUrl, repl),
    width,
    height,
    instl
  };
});
const doRender = (0,_hook_js__WEBPACK_IMPORTED_MODULE_8__.hook)('sync', function (_ref4) {
  let {
    renderFn,
    resizeFn,
    bidResponse,
    options,
    doc,
    isMainDocument = doc === document && !(0,_utils_js__WEBPACK_IMPORTED_MODULE_0__.inIframe)()
  } = _ref4;
  const videoBid =  true && bidResponse.mediaType === _mediaTypes_js__WEBPACK_IMPORTED_MODULE_5__.VIDEO;
  if (isMainDocument || videoBid) {
    emitAdRenderFail({
      reason: _constants_js__WEBPACK_IMPORTED_MODULE_2__.AD_RENDER_FAILED_REASON.PREVENT_WRITING_ON_MAIN_DOCUMENT,
      message: videoBid ? 'Cannot render video ad without a renderer' : "renderAd was prevented from writing to the main document.",
      bid: bidResponse,
      id: bidResponse.adId
    });
    return;
  }
  const data = getRenderingData(bidResponse, options);
  renderFn(Object.assign({
    adId: bidResponse.adId
  }, data));
  const {
    width,
    height
  } = data;
  if ((width !== null && width !== void 0 ? width : height) != null) {
    resizeFn(width, height);
  }
});
doRender.before(function (next, args) {
  // run renderers from a high priority hook to allow the video module to insert itself between this and "normal" rendering.
  const {
    bidResponse,
    doc
  } = args;
  if ((0,_Renderer_js__WEBPACK_IMPORTED_MODULE_4__.isRendererRequired)(bidResponse.renderer)) {
    (0,_Renderer_js__WEBPACK_IMPORTED_MODULE_4__.executeRenderer)(bidResponse.renderer, bidResponse, doc);
    emitAdRenderSucceeded({
      doc,
      bid: bidResponse,
      id: bidResponse.adId
    });
    next.bail();
  } else {
    next(args);
  }
}, 100);
function handleRender(_ref5) {
  let {
    renderFn,
    resizeFn,
    adId,
    options,
    bidResponse,
    doc
  } = _ref5;
  deferRendering(bidResponse, () => {
    if (bidResponse == null) {
      emitAdRenderFail({
        reason: _constants_js__WEBPACK_IMPORTED_MODULE_2__.AD_RENDER_FAILED_REASON.CANNOT_FIND_AD,
        message: "Cannot find ad '".concat(adId, "'"),
        id: adId
      });
      return;
    }
    if (bidResponse.status === _constants_js__WEBPACK_IMPORTED_MODULE_2__.BID_STATUS.RENDERED) {
      var _config$getConfig;
      (0,_utils_js__WEBPACK_IMPORTED_MODULE_0__.logWarn)("Ad id ".concat(adId, " has been rendered before"));
      _events_js__WEBPACK_IMPORTED_MODULE_1__.emit(STALE_RENDER, bidResponse);
      if ((_config$getConfig = _config_js__WEBPACK_IMPORTED_MODULE_3__.config.getConfig('auctionOptions')) !== null && _config$getConfig !== void 0 && _config$getConfig.suppressStaleRender) {
        return;
      }
    }
    if (!_targeting_js__WEBPACK_IMPORTED_MODULE_13__.filters.isBidNotExpired(bidResponse)) {
      var _config$getConfig2;
      (0,_utils_js__WEBPACK_IMPORTED_MODULE_0__.logWarn)("Ad id ".concat(adId, " has been expired"));
      _events_js__WEBPACK_IMPORTED_MODULE_1__.emit(EXPIRED_RENDER, bidResponse);
      if ((_config$getConfig2 = _config_js__WEBPACK_IMPORTED_MODULE_3__.config.getConfig('auctionOptions')) !== null && _config$getConfig2 !== void 0 && _config$getConfig2.suppressExpiredRender) {
        return;
      }
    }
    try {
      doRender({
        renderFn,
        resizeFn,
        bidResponse,
        options,
        doc
      });
    } catch (e) {
      emitAdRenderFail({
        reason: _constants_js__WEBPACK_IMPORTED_MODULE_2__.AD_RENDER_FAILED_REASON.EXCEPTION,
        message: e.message,
        id: adId,
        bid: bidResponse
      });
    }
  });
}
function markBidAsRendered(bidResponse) {
  const metrics = (0,_utils_perfMetrics_js__WEBPACK_IMPORTED_MODULE_12__.useMetrics)(bidResponse.metrics);
  metrics.checkpoint('bidRender');
  metrics.timeBetween('bidWon', 'bidRender', 'render.deferred');
  metrics.timeBetween('auctionEnd', 'bidRender', 'render.pending');
  metrics.timeBetween('requestBids', 'bidRender', 'render.e2e');
  bidResponse.status = _constants_js__WEBPACK_IMPORTED_MODULE_2__.BID_STATUS.RENDERED;
}
const DEFERRED_RENDER = new WeakMap();
const WINNERS = new WeakSet();
function deferRendering(bidResponse, renderFn) {
  if (bidResponse == null) {
    // if the bid is missing, let renderFn deal with it now
    renderFn();
    return;
  }
  DEFERRED_RENDER.set(bidResponse, renderFn);
  if (!bidResponse.deferRendering) {
    renderIfDeferred(bidResponse);
  }
  markWinner(bidResponse);
}
function markWinner(bidResponse) {
  if (!WINNERS.has(bidResponse)) {
    WINNERS.add(bidResponse);
    markWinningBid(bidResponse);
  }
}
function renderIfDeferred(bidResponse) {
  const renderFn = DEFERRED_RENDER.get(bidResponse);
  if (renderFn) {
    renderFn();
    markBidAsRendered(bidResponse);
    DEFERRED_RENDER.delete(bidResponse);
  }
}
function renderAdDirect(doc, adId, options) {
  let bid;
  function fail(reason, message) {
    emitAdRenderFail(Object.assign({
      id: adId,
      bid
    }, {
      reason,
      message
    }));
  }
  function resizeFn(width, height) {
    var _doc$defaultView;
    const frame = (_doc$defaultView = doc.defaultView) === null || _doc$defaultView === void 0 ? void 0 : _doc$defaultView.frameElement;
    if (frame) {
      if (width) {
        frame.width = width;
        frame.style.width && (frame.style.width = "".concat(width, "px"));
      }
      if (height) {
        frame.height = height;
        frame.style.height && (frame.style.height = "".concat(height, "px"));
      }
    }
  }
  const messageHandler = creativeMessageHandler({
    resizeFn
  });
  function waitForDocumentReady(doc) {
    return new _utils_promise_js__WEBPACK_IMPORTED_MODULE_10__.PbPromise(resolve => {
      if (doc.readyState === 'loading') {
        doc.addEventListener('DOMContentLoaded', resolve);
      } else {
        resolve();
      }
    });
  }
  function renderFn(adData) {
    _utils_promise_js__WEBPACK_IMPORTED_MODULE_10__.PbPromise.all([(0,_creativeRenderers_js__WEBPACK_IMPORTED_MODULE_7__.getCreativeRenderer)(bid), waitForDocumentReady(doc)]).then(_ref6 => {
      let [render] = _ref6;
      return render(adData, {
        sendMessage: (type, data) => messageHandler(type, data, bid),
        mkFrame: _utils_js__WEBPACK_IMPORTED_MODULE_0__.createIframe
      }, doc.defaultView);
    }).then(() => emitAdRenderSucceeded({
      doc,
      bid,
      id: bid.adId
    }), e => {
      fail((e === null || e === void 0 ? void 0 : e.reason) || _constants_js__WEBPACK_IMPORTED_MODULE_2__.AD_RENDER_FAILED_REASON.EXCEPTION, e === null || e === void 0 ? void 0 : e.message);
      (e === null || e === void 0 ? void 0 : e.stack) && (0,_utils_js__WEBPACK_IMPORTED_MODULE_0__.logError)(e);
    });
    // TODO: this is almost certainly the wrong way to do this
    const creativeComment = document.createComment("Creative ".concat(bid.creativeId, " served by ").concat(bid.bidder, " Prebid.js Header Bidding"));
    (0,_utils_js__WEBPACK_IMPORTED_MODULE_0__.insertElement)(creativeComment, doc, 'html');
  }
  try {
    if (!adId || !doc) {
      fail(_constants_js__WEBPACK_IMPORTED_MODULE_2__.AD_RENDER_FAILED_REASON.MISSING_DOC_OR_ADID, "missing ".concat(adId ? 'doc' : 'adId'));
    } else {
      getBidToRender(adId).then(bidResponse => {
        bid = bidResponse;
        handleRender({
          renderFn,
          resizeFn,
          adId,
          options: {
            clickUrl: options === null || options === void 0 ? void 0 : options.clickThrough
          },
          bidResponse,
          doc
        });
      });
    }
  } catch (e) {
    fail(EXCEPTION, e.message);
  }
}

/**
 * Insert an invisible, named iframe that can be used by creatives to locate the window Prebid is running in
 * (by looking for one that has `.frames[PB_LOCATOR]` defined).
 * This is necessary because in some situations creatives may be rendered inside nested iframes - Prebid is not necessarily
 * in the immediate parent window.
 */
function insertLocatorFrame() {
  if (!window.frames[_constants_js__WEBPACK_IMPORTED_MODULE_2__.PB_LOCATOR]) {
    if (!document.body) {
      window.requestAnimationFrame(insertLocatorFrame);
    } else {
      const frame = (0,_utils_js__WEBPACK_IMPORTED_MODULE_0__.createInvisibleIframe)();
      frame.name = _constants_js__WEBPACK_IMPORTED_MODULE_2__.PB_LOCATOR;
      document.body.appendChild(frame);
    }
  }
}


/***/ }),

/***/ "./src/adUnits.js":
/*!************************!*\
  !*** ./src/adUnits.js ***!
  \************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   getAuctionsCounter: () => (/* binding */ getAuctionsCounter),
/* harmony export */   getBidderRequestsCounter: () => (/* binding */ getBidderRequestsCounter),
/* harmony export */   getBidderWinsCounter: () => (/* binding */ getBidderWinsCounter),
/* harmony export */   getRequestsCounter: () => (/* binding */ getRequestsCounter),
/* harmony export */   incrementAuctionsCounter: () => (/* binding */ incrementAuctionsCounter),
/* harmony export */   incrementBidderRequestsCounter: () => (/* binding */ incrementBidderRequestsCounter),
/* harmony export */   incrementBidderWinsCounter: () => (/* binding */ incrementBidderWinsCounter),
/* harmony export */   incrementRequestsCounter: () => (/* binding */ incrementRequestsCounter)
/* harmony export */ });
/* unused harmony export reset */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type

/**
 * Ad unit objects generated by Prebid (as opposed to the definitions provided by the publisher)
 * can have a placeholder "null" bidder to represent s2s-only stored requests.
 */

const REQUESTS = 'requests';
const WINS = 'wins';
const AUCTIONS = 'auctions';
let adUnits = {};
function reset() {
  adUnits = {};
}
function ensureAdUnit(adunit, bidderCode) {
  const adUnit = adUnits[adunit] = adUnits[adunit] || {
    bidders: {}
  };
  if (bidderCode) {
    adUnit.bidders[bidderCode] = adUnit.bidders[bidderCode] || {};
    return adUnit.bidders[bidderCode];
  }
  return adUnit;
}
function incrementer(counter, byBidder) {
  return function (adUnit, bidder) {
    var _counters$counter;
    const counters = ensureAdUnit(adUnit, byBidder && bidder);
    counters[counter] = ((_counters$counter = counters[counter]) !== null && _counters$counter !== void 0 ? _counters$counter : 0) + 1;
    return counters[counter];
  };
}
function getter(counter, byBidder) {
  return function (adUnit, bidder) {
    var _ensureAdUnit$counter;
    return (_ensureAdUnit$counter = ensureAdUnit(adUnit, byBidder && bidder)[counter]) !== null && _ensureAdUnit$counter !== void 0 ? _ensureAdUnit$counter : 0;
  };
}

/**
 * Increments and returns current Adunit counter
 */
const incrementRequestsCounter = incrementer(REQUESTS, false);

/**
 * Increments and returns current Adunit requests counter for a bidder
 */
const incrementBidderRequestsCounter = incrementer(REQUESTS, true);

/**
 * Increments and returns current Adunit wins counter for a bidder
 */
const incrementBidderWinsCounter = incrementer(WINS, true);

/**
 * Increments and returns current Adunit auctions counter
 */
const incrementAuctionsCounter = incrementer(AUCTIONS, false);

/**
 * Returns current Adunit counter
 */
const getRequestsCounter = getter(REQUESTS, false);

/**
 * Returns current Adunit requests counter for a specific bidder code
 */
const getBidderRequestsCounter = getter(REQUESTS, true);

/**
 * Returns current Adunit requests counter for a specific bidder code
 */
const getBidderWinsCounter = getter(WINS, true);

/**
 * Returns current Adunit auctions counter
 */
const getAuctionsCounter = getter(AUCTIONS, false);


/***/ }),

/***/ "./src/adapter.js":
/*!************************!*\
  !*** ./src/adapter.js ***!
  \************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (/* binding */ Adapter)
/* harmony export */ });
function Adapter(code) {
  var bidderCode = code;
  function setBidderCode(code) {
    bidderCode = code;
  }
  function getBidderCode() {
    return bidderCode;
  }
  function callBids() {}
  return {
    callBids: callBids,
    setBidderCode: setBidderCode,
    getBidderCode: getBidderCode
  };
}


/***/ }),

/***/ "./src/adapterManager.js":
/*!*******************************!*\
  !*** ./src/adapterManager.js ***!
  \*******************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__),
/* harmony export */   getS2SBidderSet: () => (/* binding */ getS2SBidderSet)
/* harmony export */ });
/* unused harmony exports PBS_ADAPTER_NAME, PARTITIONS, dep, s2sActivityParams, filterBidsForAdUnit, setupAdUnitMediaTypes, _partitionBidders, partitionBidders */
/* harmony import */ var _babel_runtime_helpers_defineProperty__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @babel/runtime/helpers/defineProperty */ "../../node_modules/@babel/runtime/helpers/esm/defineProperty.js");
/* harmony import */ var _utils_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./utils.js */ "./src/utils/objects.js");
/* harmony import */ var _utils_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./utils.js */ "./src/utils.js");
/* harmony import */ var _native_js__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ./native.js */ "./src/native.js");
/* harmony import */ var _adapters_bidderFactory_js__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ./adapters/bidderFactory.js */ "./src/adapters/bidderFactory.js");
/* harmony import */ var _ajax_js__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! ./ajax.js */ "./src/ajax.js");
/* harmony import */ var _config_js__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(/*! ./config.js */ "./src/config.js");
/* harmony import */ var _hook_js__WEBPACK_IMPORTED_MODULE_7__ = __webpack_require__(/*! ./hook.js */ "./src/hook.js");
/* harmony import */ var _adUnits_js__WEBPACK_IMPORTED_MODULE_8__ = __webpack_require__(/*! ./adUnits.js */ "./src/adUnits.js");
/* harmony import */ var _refererDetection_js__WEBPACK_IMPORTED_MODULE_9__ = __webpack_require__(/*! ./refererDetection.js */ "./src/refererDetection.js");
/* harmony import */ var _consentHandler_js__WEBPACK_IMPORTED_MODULE_10__ = __webpack_require__(/*! ./consentHandler.js */ "./src/consentHandler.js");
/* harmony import */ var _events_js__WEBPACK_IMPORTED_MODULE_11__ = __webpack_require__(/*! ./events.js */ "./src/events.js");
/* harmony import */ var _constants_js__WEBPACK_IMPORTED_MODULE_12__ = __webpack_require__(/*! ./constants.js */ "./src/constants.js");
/* harmony import */ var _utils_perfMetrics_js__WEBPACK_IMPORTED_MODULE_13__ = __webpack_require__(/*! ./utils/perfMetrics.js */ "./src/utils/perfMetrics.js");
/* harmony import */ var _auctionManager_js__WEBPACK_IMPORTED_MODULE_14__ = __webpack_require__(/*! ./auctionManager.js */ "./src/auctionManager.js");
/* harmony import */ var _activities_modules_js__WEBPACK_IMPORTED_MODULE_15__ = __webpack_require__(/*! ./activities/modules.js */ "./src/activities/modules.js");
/* harmony import */ var _activities_rules_js__WEBPACK_IMPORTED_MODULE_16__ = __webpack_require__(/*! ./activities/rules.js */ "./src/activities/rules.js");
/* harmony import */ var _activities_activities_js__WEBPACK_IMPORTED_MODULE_17__ = __webpack_require__(/*! ./activities/activities.js */ "./src/activities/activities.js");
/* harmony import */ var _activities_params_js__WEBPACK_IMPORTED_MODULE_18__ = __webpack_require__(/*! ./activities/params.js */ "./src/activities/params.js");
/* harmony import */ var _activities_redactor_js__WEBPACK_IMPORTED_MODULE_19__ = __webpack_require__(/*! ./activities/redactor.js */ "./src/activities/redactor.js");
/* harmony import */ var _eventTrackers_js__WEBPACK_IMPORTED_MODULE_20__ = __webpack_require__(/*! ./eventTrackers.js */ "./src/eventTrackers.js");
/* harmony import */ var _prebidGlobal_js__WEBPACK_IMPORTED_MODULE_21__ = __webpack_require__(/*! ./prebidGlobal.js */ "./src/prebidGlobal.js");

function ownKeys(e, r) { var t = Object.keys(e); if (Object.getOwnPropertySymbols) { var o = Object.getOwnPropertySymbols(e); r && (o = o.filter(function (r) { return Object.getOwnPropertyDescriptor(e, r).enumerable; })), t.push.apply(t, o); } return t; }
function _objectSpread(e) { for (var r = 1; r < arguments.length; r++) { var t = null != arguments[r] ? arguments[r] : {}; r % 2 ? ownKeys(Object(t), !0).forEach(function (r) { (0,_babel_runtime_helpers_defineProperty__WEBPACK_IMPORTED_MODULE_0__["default"])(e, r, t[r]); }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(e, Object.getOwnPropertyDescriptors(t)) : ownKeys(Object(t)).forEach(function (r) { Object.defineProperty(e, r, Object.getOwnPropertyDescriptor(t, r)); }); } return e; }
/** @module adaptermanger */






















const PBS_ADAPTER_NAME = 'pbsBidAdapter';
const PARTITIONS = {
  CLIENT: 'client',
  SERVER: 'server'
};
const dep = {
  isAllowed: _activities_rules_js__WEBPACK_IMPORTED_MODULE_16__.isActivityAllowed,
  redact: _activities_redactor_js__WEBPACK_IMPORTED_MODULE_19__.redactor
};
const _bidderRegistry = {};
const _aliasRegistry = {};
const _analyticsRegistry = {};
let _s2sConfigs = [];
_config_js__WEBPACK_IMPORTED_MODULE_6__.config.getConfig('s2sConfig', config => {
  if (config && config.s2sConfig) {
    _s2sConfigs = (0,_utils_js__WEBPACK_IMPORTED_MODULE_1__.isArray)(config.s2sConfig) ? config.s2sConfig : [config.s2sConfig];
  }
});
const activityParams = (0,_activities_params_js__WEBPACK_IMPORTED_MODULE_18__.activityParamsBuilder)(alias => adapterManager.resolveAlias(alias));
function getConfigName(s2sConfig) {
  var _s2sConfig$configName;
  // According to our docs, "module" bid (stored impressions)
  // have params.configName referring to s2sConfig.name,
  // but for a long while this was checking against s2sConfig.configName.
  // Keep allowing s2sConfig.configName to avoid the breaking change
  return (_s2sConfig$configName = s2sConfig.configName) !== null && _s2sConfig$configName !== void 0 ? _s2sConfig$configName : s2sConfig.name;
}
function s2sActivityParams(s2sConfig) {
  return activityParams(_activities_modules_js__WEBPACK_IMPORTED_MODULE_15__.MODULE_TYPE_PREBID, PBS_ADAPTER_NAME, {
    [_activities_params_js__WEBPACK_IMPORTED_MODULE_18__.ACTIVITY_PARAM_S2S_NAME]: getConfigName(s2sConfig)
  });
}
const ADUNIT_BID_PROPERTIES = ['nativeParams', 'nativeOrtbRequest', 'renderer'];
function getBids(_ref) {
  let {
    bidderCode,
    auctionId,
    bidderRequestId,
    adUnits,
    src,
    metrics,
    getTid
  } = _ref;
  return adUnits.reduce((result, adUnit) => {
    const bids = adUnit.bids.filter(bid => bid.bidder === bidderCode);
    if (bidderCode == null && bids.length === 0 && adUnit.s2sBid != null) {
      bids.push({
        bidder: null
      });
    }
    result.push(bids.reduce((bids, bid) => {
      var _bid$ortb2Imp$ext$tid, _bid$ortb2Imp, _adUnit$ortb2Imp, _mediaTypes$banner, _mediaTypes$video;
      const [tid, tidSource] = getTid(bid.bidder, adUnit.transactionId, (_bid$ortb2Imp$ext$tid = (_bid$ortb2Imp = bid.ortb2Imp) === null || _bid$ortb2Imp === void 0 || (_bid$ortb2Imp = _bid$ortb2Imp.ext) === null || _bid$ortb2Imp === void 0 ? void 0 : _bid$ortb2Imp.tid) !== null && _bid$ortb2Imp$ext$tid !== void 0 ? _bid$ortb2Imp$ext$tid : (_adUnit$ortb2Imp = adUnit.ortb2Imp) === null || _adUnit$ortb2Imp === void 0 || (_adUnit$ortb2Imp = _adUnit$ortb2Imp.ext) === null || _adUnit$ortb2Imp === void 0 ? void 0 : _adUnit$ortb2Imp.tid);
      bid = Object.assign({}, bid, {
        ortb2Imp: (0,_utils_js__WEBPACK_IMPORTED_MODULE_2__.mergeDeep)({}, adUnit.ortb2Imp, bid.ortb2Imp, {
          ext: {
            tid,
            tidSource
          }
        })
      }, (0,_utils_js__WEBPACK_IMPORTED_MODULE_1__.getDefinedParams)(adUnit, ADUNIT_BID_PROPERTIES));
      const mediaTypes = bid.mediaTypes == null ? adUnit.mediaTypes : bid.mediaTypes;
      if ((0,_utils_js__WEBPACK_IMPORTED_MODULE_2__.isValidMediaTypes)(mediaTypes)) {
        bid = Object.assign({}, bid, {
          mediaTypes
        });
      } else {
        (0,_utils_js__WEBPACK_IMPORTED_MODULE_2__.logError)("mediaTypes is not correctly configured for adunit ".concat(adUnit.code));
      }
      if (src === 'client') {
        (0,_adUnits_js__WEBPACK_IMPORTED_MODULE_8__.incrementBidderRequestsCounter)(adUnit.code, bidderCode);
      }
      bids.push(Object.assign({}, bid, {
        adUnitCode: adUnit.code,
        transactionId: adUnit.transactionId,
        adUnitId: adUnit.adUnitId,
        sizes: (mediaTypes === null || mediaTypes === void 0 || (_mediaTypes$banner = mediaTypes.banner) === null || _mediaTypes$banner === void 0 ? void 0 : _mediaTypes$banner.sizes) || (mediaTypes === null || mediaTypes === void 0 || (_mediaTypes$video = mediaTypes.video) === null || _mediaTypes$video === void 0 ? void 0 : _mediaTypes$video.playerSize) || [],
        bidId: bid.bid_id || (0,_utils_js__WEBPACK_IMPORTED_MODULE_2__.generateUUID)(),
        bidderRequestId,
        auctionId,
        src,
        metrics,
        auctionsCount: (0,_adUnits_js__WEBPACK_IMPORTED_MODULE_8__.getAuctionsCounter)(adUnit.code),
        bidRequestsCount: (0,_adUnits_js__WEBPACK_IMPORTED_MODULE_8__.getRequestsCounter)(adUnit.code),
        bidderRequestsCount: (0,_adUnits_js__WEBPACK_IMPORTED_MODULE_8__.getBidderRequestsCounter)(adUnit.code, bid.bidder),
        bidderWinsCount: (0,_adUnits_js__WEBPACK_IMPORTED_MODULE_8__.getBidderWinsCounter)(adUnit.code, bid.bidder),
        deferBilling: !!adUnit.deferBilling
      }));
      return bids;
    }, []));
    return result;
  }, []).reduce(_utils_js__WEBPACK_IMPORTED_MODULE_2__.flatten, []).filter(val => val !== '');
}

/**
 * Filter an adUnit's  bids for building client and/or server requests
 *
 * @param bids an array of bids as defined in an adUnit
 * @param s2sConfig null if the adUnit is being routed to a client adapter; otherwise the s2s adapter's config
 * @returns the subset of `bids` that are pertinent for the given `s2sConfig`
 */
const filterBidsForAdUnit = (0,_hook_js__WEBPACK_IMPORTED_MODULE_7__.hook)('sync', function (bids, s2sConfig) {
  let {
    getS2SBidders = getS2SBidderSet
  } = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};
  if (s2sConfig == null) {
    return bids;
  } else {
    const serverBidders = getS2SBidders(s2sConfig);
    return bids.filter(bid => {
      if (!serverBidders.has(bid.bidder)) return false;
      if (bid.s2sConfigName == null) return true;
      const configName = getConfigName(s2sConfig);
      const allowedS2SConfigs = Array.isArray(bid.s2sConfigName) ? bid.s2sConfigName : [bid.s2sConfigName];
      return allowedS2SConfigs.includes(configName);
    });
  }
}, 'filterBidsForAdUnit');
function getAdUnitCopyForPrebidServer(adUnits, s2sConfig) {
  let adUnitsCopy = (0,_utils_js__WEBPACK_IMPORTED_MODULE_1__.deepClone)(adUnits);
  let hasModuleBids = false;
  adUnitsCopy.forEach(adUnit => {
    // filter out client side bids
    const s2sBids = adUnit.bids.filter(b => {
      var _params;
      return b.module === PBS_ADAPTER_NAME && ((_params = b.params) === null || _params === void 0 ? void 0 : _params.configName) === getConfigName(s2sConfig);
    });
    if (s2sBids.length === 1) {
      adUnit.s2sBid = s2sBids[0];
      hasModuleBids = true;
      adUnit.ortb2Imp = (0,_utils_js__WEBPACK_IMPORTED_MODULE_2__.mergeDeep)({}, adUnit.s2sBid.ortb2Imp, adUnit.ortb2Imp);
    } else if (s2sBids.length > 1) {
      (0,_utils_js__WEBPACK_IMPORTED_MODULE_2__.logWarn)('Multiple "module" bids for the same s2s configuration; all will be ignored', s2sBids);
    }
    adUnit.bids = filterBidsForAdUnit(adUnit.bids, s2sConfig).map(bid => {
      bid.bid_id = (0,_utils_js__WEBPACK_IMPORTED_MODULE_2__.getUniqueIdentifierStr)();
      return bid;
    });
  });
  adUnitsCopy = adUnitsCopy.filter(adUnit => {
    if (s2sConfig.filterBidderlessCalls) {
      if (adUnit.bids.length === 1 && adUnit.bids[0].bidder == null) return false;
    }
    return adUnit.bids.length !== 0 || adUnit.s2sBid != null;
  });

  // don't send empty requests
  return {
    adUnits: adUnitsCopy,
    hasModuleBids
  };
}
function getAdUnitCopyForClientAdapters(adUnits) {
  let adUnitsClientCopy = (0,_utils_js__WEBPACK_IMPORTED_MODULE_1__.deepClone)(adUnits);
  adUnitsClientCopy.forEach(adUnit => {
    adUnit.bids = filterBidsForAdUnit(adUnit.bids, null);
  });

  // don't send empty requests
  adUnitsClientCopy = adUnitsClientCopy.filter(adUnit => {
    return adUnit.bids.length !== 0;
  });
  return adUnitsClientCopy;
}

/**
 * Filter and/or modify media types for ad units based on the given labels.
 *
 * This should return adUnits that are active for the given labels, modified to have their `mediaTypes`
 * conform to size mapping configuration. If different bids for the same adUnit should use different `mediaTypes`,
 * they should be exposed under `adUnit.bids[].mediaTypes`.
 */
const setupAdUnitMediaTypes = (0,_hook_js__WEBPACK_IMPORTED_MODULE_7__.hook)('sync', (adUnits, labels) => {
  return adUnits;
}, 'setupAdUnitMediaTypes');

/**
 * @param {{}|Array<{}>} s2sConfigs
 * @returns {Set<String>} a set of all the bidder codes that should be routed through the S2S adapter(s)
 *                        as defined in `s2sConfigs`
 */
function getS2SBidderSet(s2sConfigs) {
  if (!(0,_utils_js__WEBPACK_IMPORTED_MODULE_1__.isArray)(s2sConfigs)) s2sConfigs = [s2sConfigs];
  // `null` represents the "no bid bidder" - when an ad unit is meant only for S2S adapters, like stored impressions
  const serverBidders = new Set([null]);
  s2sConfigs.filter(s2s => s2s && s2s.enabled).flatMap(s2s => s2s.bidders).forEach(bidder => serverBidders.add(bidder));
  return serverBidders;
}

/**
 * @param {Array} adUnits - The ad units to be processed.
 * @param {Object} s2sConfigs - The server-to-server configurations.
 * @returns {Object} - An object containing arrays of bidder codes for client and server.
 * @returns {Object} return.client - Array of bidder codes that should be routed to client adapters.
 * @returns {Object} return.server - Array of bidder codes that should be routed to server adapters.
 */
function _partitionBidders(adUnits, s2sConfigs) {
  let {
    getS2SBidders = getS2SBidderSet
  } = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};
  const serverBidders = getS2SBidders(s2sConfigs);
  return (0,_utils_js__WEBPACK_IMPORTED_MODULE_2__.getBidderCodes)(adUnits).reduce((memo, bidder) => {
    const partition = serverBidders.has(bidder) ? PARTITIONS.SERVER : PARTITIONS.CLIENT;
    memo[partition].push(bidder);
    return memo;
  }, {
    [PARTITIONS.CLIENT]: [],
    [PARTITIONS.SERVER]: []
  });
}
const partitionBidders = (0,_hook_js__WEBPACK_IMPORTED_MODULE_7__.hook)('sync', _partitionBidders, 'partitionBidders');
function tidFactory() {
  const consistent = !!_config_js__WEBPACK_IMPORTED_MODULE_6__.config.getConfig('consistentTIDs');
  let tidSource, getTid;
  if (consistent) {
    tidSource = 'pbjsStable';
    getTid = saneTid => saneTid;
  } else {
    tidSource = 'pbjs';
    getTid = (() => {
      const tids = {};
      return (saneTid, bidderCode) => {
        if (!tids.hasOwnProperty(bidderCode)) {
          tids[bidderCode] = {};
        }
        if (!tids[bidderCode].hasOwnProperty(saneTid)) {
          tids[bidderCode][saneTid] = "u".concat((0,_utils_js__WEBPACK_IMPORTED_MODULE_2__.generateUUID)());
        }
        return tids[bidderCode][saneTid];
      };
    })();
  }
  return function (bidderCode, saneTid, fpdTid) {
    return [fpdTid !== null && fpdTid !== void 0 ? fpdTid : getTid(saneTid, bidderCode), fpdTid != null ? 'pub' : tidSource];
  };
}
const adapterManager = {
  bidderRegistry: _bidderRegistry,
  analyticsRegistry: _analyticsRegistry,
  /**
   * Map from alias codes to the bidder code they alias.
   */
  aliasRegistry: _aliasRegistry,
  makeBidRequests: (0,_hook_js__WEBPACK_IMPORTED_MODULE_7__.hook)('sync', function (adUnits, auctionStart, auctionId, cbTimeout, labels) {
    let ortb2Fragments = arguments.length > 5 && arguments[5] !== undefined ? arguments[5] : {};
    let auctionMetrics = arguments.length > 6 ? arguments[6] : undefined;
    auctionMetrics = (0,_utils_perfMetrics_js__WEBPACK_IMPORTED_MODULE_13__.useMetrics)(auctionMetrics);
    /**
     * emit and pass adunits for external modification
     * @see {@link https://github.com/prebid/Prebid.js/issues/4149|Issue}
     */
    _events_js__WEBPACK_IMPORTED_MODULE_11__.emit(_constants_js__WEBPACK_IMPORTED_MODULE_12__.EVENTS.BEFORE_REQUEST_BIDS, adUnits);
    if (true) {
      (0,_native_js__WEBPACK_IMPORTED_MODULE_3__.decorateAdUnitsWithNativeParams)(adUnits);
    }
    adUnits.map(adUnit => adUnit.code).filter(_utils_js__WEBPACK_IMPORTED_MODULE_2__.uniques).forEach(_adUnits_js__WEBPACK_IMPORTED_MODULE_8__.incrementAuctionsCounter);
    adUnits.forEach(au => {
      if (!(0,_utils_js__WEBPACK_IMPORTED_MODULE_1__.isPlainObject)(au.mediaTypes)) {
        au.mediaTypes = {};
      }
      // filter out bidders that cannot participate in the auction
      au.bids = au.bids.filter(bid => !bid.bidder || dep.isAllowed(_activities_activities_js__WEBPACK_IMPORTED_MODULE_17__.ACTIVITY_FETCH_BIDS, activityParams(_activities_modules_js__WEBPACK_IMPORTED_MODULE_15__.MODULE_TYPE_BIDDER, bid.bidder)));
      (0,_adUnits_js__WEBPACK_IMPORTED_MODULE_8__.incrementRequestsCounter)(au.code);
    });
    adUnits = setupAdUnitMediaTypes(adUnits, labels);
    let {
      [PARTITIONS.CLIENT]: clientBidders,
      [PARTITIONS.SERVER]: serverBidders
    } = partitionBidders(adUnits, _s2sConfigs);
    if (_config_js__WEBPACK_IMPORTED_MODULE_6__.config.getConfig('bidderSequence') === _config_js__WEBPACK_IMPORTED_MODULE_6__.RANDOM) {
      clientBidders = (0,_utils_js__WEBPACK_IMPORTED_MODULE_2__.shuffle)(clientBidders);
    }
    const refererInfo = (0,_refererDetection_js__WEBPACK_IMPORTED_MODULE_9__.getRefererInfo)();
    const bidRequests = [];
    const ortb2 = ortb2Fragments.global || {};
    const bidderOrtb2 = ortb2Fragments.bidder || {};
    const getTid = tidFactory();
    function addOrtb2(bidderRequest, s2sActivityParams) {
      var _bidderOrtb2$bidderRe, _bidderOrtb2$bidderRe2, _ortb2$source;
      const redact = dep.redact(s2sActivityParams != null ? s2sActivityParams : activityParams(_activities_modules_js__WEBPACK_IMPORTED_MODULE_15__.MODULE_TYPE_BIDDER, bidderRequest.bidderCode));
      const [tid, tidSource] = getTid(bidderRequest.bidderCode, bidderRequest.auctionId, (_bidderOrtb2$bidderRe = (_bidderOrtb2$bidderRe2 = bidderOrtb2[bidderRequest.bidderCode]) === null || _bidderOrtb2$bidderRe2 === void 0 || (_bidderOrtb2$bidderRe2 = _bidderOrtb2$bidderRe2.source) === null || _bidderOrtb2$bidderRe2 === void 0 ? void 0 : _bidderOrtb2$bidderRe2.tid) !== null && _bidderOrtb2$bidderRe !== void 0 ? _bidderOrtb2$bidderRe : (_ortb2$source = ortb2.source) === null || _ortb2$source === void 0 ? void 0 : _ortb2$source.tid);
      const fpd = Object.freeze(redact.ortb2((0,_utils_js__WEBPACK_IMPORTED_MODULE_2__.mergeDeep)({}, ortb2, bidderOrtb2[bidderRequest.bidderCode], {
        source: {
          tid,
          ext: {
            tidSource
          }
        }
      })));
      bidderRequest.ortb2 = fpd;
      bidderRequest.bids = bidderRequest.bids.map(bid => {
        bid.ortb2 = fpd;
        return redact.bidRequest(bid);
      });
      return bidderRequest;
    }
    const pbjsInstance = (0,_prebidGlobal_js__WEBPACK_IMPORTED_MODULE_21__.getGlobal)();
    function getPageViewIdForBidder(bidderCode) {
      if (!pbjsInstance.pageViewIdPerBidder.has(bidderCode)) {
        pbjsInstance.pageViewIdPerBidder.set(bidderCode, (0,_utils_js__WEBPACK_IMPORTED_MODULE_2__.generateUUID)());
      }
      return pbjsInstance.pageViewIdPerBidder.get(bidderCode);
    }
    _s2sConfigs.forEach(s2sConfig => {
      const s2sParams = s2sActivityParams(s2sConfig);
      if (s2sConfig && s2sConfig.enabled && dep.isAllowed(_activities_activities_js__WEBPACK_IMPORTED_MODULE_17__.ACTIVITY_FETCH_BIDS, s2sParams)) {
        const {
          adUnits: adUnitsS2SCopy,
          hasModuleBids
        } = getAdUnitCopyForPrebidServer(adUnits, s2sConfig);

        // uniquePbsTid is so we know which server to send which bids to during the callBids function
        const uniquePbsTid = (0,_utils_js__WEBPACK_IMPORTED_MODULE_2__.generateUUID)();
        (serverBidders.length === 0 && hasModuleBids ? [null] : serverBidders).forEach(bidderCode => {
          const bidderRequestId = (0,_utils_js__WEBPACK_IMPORTED_MODULE_2__.generateUUID)();
          const pageViewId = getPageViewIdForBidder(bidderCode);
          const metrics = auctionMetrics.fork();
          const bidderRequest = addOrtb2({
            bidderCode,
            auctionId,
            bidderRequestId,
            pageViewId,
            uniquePbsTid,
            bids: getBids({
              bidderCode,
              auctionId,
              bidderRequestId,
              'adUnits': (0,_utils_js__WEBPACK_IMPORTED_MODULE_1__.deepClone)(adUnitsS2SCopy),
              src: _constants_js__WEBPACK_IMPORTED_MODULE_12__.S2S.SRC,
              metrics,
              getTid
            }),
            auctionStart: auctionStart,
            timeout: s2sConfig.timeout,
            src: _constants_js__WEBPACK_IMPORTED_MODULE_12__.S2S.SRC,
            refererInfo,
            metrics
          }, s2sParams);
          if (bidderRequest.bids.length !== 0) {
            bidRequests.push(bidderRequest);
          }
        });

        // update the s2sAdUnits object and remove all bids that didn't pass sizeConfig/label checks from getBids()
        // this is to keep consistency and only allow bids/adunits that passed the checks to go to pbs
        adUnitsS2SCopy.forEach(adUnitCopy => {
          const validBids = adUnitCopy.bids.filter(adUnitBid => bidRequests.find(request => request.bids.find(reqBid => reqBid.bidId === adUnitBid.bid_id)));
          adUnitCopy.bids = validBids;
        });
        bidRequests.forEach(request => {
          if (request.adUnitsS2SCopy === undefined) {
            request.adUnitsS2SCopy = adUnitsS2SCopy.filter(au => au.bids.length > 0 || au.s2sBid != null);
          }
        });
      }
    });

    // client adapters
    const adUnitsClientCopy = getAdUnitCopyForClientAdapters(adUnits);
    clientBidders.forEach(bidderCode => {
      const bidderRequestId = (0,_utils_js__WEBPACK_IMPORTED_MODULE_2__.generateUUID)();
      const pageViewId = getPageViewIdForBidder(bidderCode);
      const metrics = auctionMetrics.fork();
      const bidderRequest = addOrtb2({
        bidderCode,
        auctionId,
        pageViewId,
        bidderRequestId,
        bids: getBids({
          bidderCode,
          auctionId,
          bidderRequestId,
          'adUnits': (0,_utils_js__WEBPACK_IMPORTED_MODULE_1__.deepClone)(adUnitsClientCopy),
          src: 'client',
          metrics,
          getTid
        }),
        auctionStart: auctionStart,
        timeout: cbTimeout,
        refererInfo,
        metrics
      });
      const adapter = _bidderRegistry[bidderCode];
      if (!adapter) {
        (0,_utils_js__WEBPACK_IMPORTED_MODULE_2__.logError)("Trying to make a request for bidder that does not exist: ".concat(bidderCode));
      }
      if (adapter && bidderRequest.bids && bidderRequest.bids.length !== 0) {
        bidRequests.push(bidderRequest);
      }
    });
    bidRequests.forEach(bidRequest => {
      if (_consentHandler_js__WEBPACK_IMPORTED_MODULE_10__.gdprDataHandler.getConsentData()) {
        bidRequest['gdprConsent'] = _consentHandler_js__WEBPACK_IMPORTED_MODULE_10__.gdprDataHandler.getConsentData();
      }
      if (_consentHandler_js__WEBPACK_IMPORTED_MODULE_10__.uspDataHandler.getConsentData()) {
        bidRequest['uspConsent'] = _consentHandler_js__WEBPACK_IMPORTED_MODULE_10__.uspDataHandler.getConsentData();
      }
      if (_consentHandler_js__WEBPACK_IMPORTED_MODULE_10__.gppDataHandler.getConsentData()) {
        bidRequest['gppConsent'] = _consentHandler_js__WEBPACK_IMPORTED_MODULE_10__.gppDataHandler.getConsentData();
      }
    });
    return bidRequests;
  }, 'makeBidRequests'),
  callBids(adUnits, bidRequests, addBidResponse, doneCb, requestCallbacks, requestBidsTimeout, onTimelyResponse) {
    let ortb2Fragments = arguments.length > 7 && arguments[7] !== undefined ? arguments[7] : {};
    if (!bidRequests.length) {
      (0,_utils_js__WEBPACK_IMPORTED_MODULE_2__.logWarn)('callBids executed with no bidRequests.  Were they filtered by labels or sizing?');
      return;
    }
    const [clientBidderRequests, serverBidderRequests] = bidRequests.reduce((partitions, bidRequest) => {
      partitions[Number(typeof bidRequest.src !== 'undefined' && bidRequest.src === _constants_js__WEBPACK_IMPORTED_MODULE_12__.S2S.SRC)].push(bidRequest);
      return partitions;
    }, [[], []]);
    var uniqueServerBidRequests = [];
    serverBidderRequests.forEach(serverBidRequest => {
      var index = -1;
      for (var i = 0; i < uniqueServerBidRequests.length; ++i) {
        if (serverBidRequest.uniquePbsTid === uniqueServerBidRequests[i].uniquePbsTid) {
          index = i;
          break;
        }
      }
      if (index <= -1) {
        uniqueServerBidRequests.push(serverBidRequest);
      }
    });
    let counter = 0;
    _s2sConfigs.forEach(s2sConfig => {
      if (s2sConfig && uniqueServerBidRequests[counter] && getS2SBidderSet(s2sConfig).has(uniqueServerBidRequests[counter].bidderCode)) {
        // s2s should get the same client side timeout as other client side requests.
        const s2sAjax = (0,_ajax_js__WEBPACK_IMPORTED_MODULE_5__.ajaxBuilder)(requestBidsTimeout, requestCallbacks ? {
          request: requestCallbacks.request.bind(null, 's2s'),
          done: requestCallbacks.done
        } : undefined);
        const adaptersServerSide = s2sConfig.bidders;
        const s2sAdapter = _bidderRegistry[s2sConfig.adapter];
        const uniquePbsTid = uniqueServerBidRequests[counter].uniquePbsTid;
        const adUnitsS2SCopy = uniqueServerBidRequests[counter].adUnitsS2SCopy;
        const uniqueServerRequests = serverBidderRequests.filter(serverBidRequest => serverBidRequest.uniquePbsTid === uniquePbsTid);
        if (s2sAdapter) {
          const s2sBidRequest = {
            'ad_units': adUnitsS2SCopy,
            s2sConfig,
            ortb2Fragments,
            requestBidsTimeout
          };
          if (s2sBidRequest.ad_units.length) {
            const doneCbs = uniqueServerRequests.map(bidRequest => {
              bidRequest.start = (0,_utils_js__WEBPACK_IMPORTED_MODULE_2__.timestamp)();
              return function (timedOut) {
                if (!timedOut) {
                  onTimelyResponse(bidRequest.bidderRequestId);
                }
                for (var _len = arguments.length, args = new Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
                  args[_key - 1] = arguments[_key];
                }
                doneCb.apply(bidRequest, [timedOut, ...args]);
              };
            });
            const bidders = (0,_utils_js__WEBPACK_IMPORTED_MODULE_2__.getBidderCodes)(s2sBidRequest.ad_units).filter(bidder => adaptersServerSide.includes(bidder));
            (0,_utils_js__WEBPACK_IMPORTED_MODULE_2__.logMessage)("CALLING S2S HEADER BIDDERS ==== ".concat(bidders.length > 0 ? bidders.join(', ') : 'No bidder specified, using "ortb2Imp" definition(s) only'));

            // fire BID_REQUESTED event for each s2s bidRequest
            uniqueServerRequests.forEach(bidRequest => {
              // add the new sourceTid
              _events_js__WEBPACK_IMPORTED_MODULE_11__.emit(_constants_js__WEBPACK_IMPORTED_MODULE_12__.EVENTS.BID_REQUESTED, _objectSpread(_objectSpread({}, bidRequest), {}, {
                tid: bidRequest.auctionId
              }));
            });

            // make bid requests
            s2sAdapter.callBids(s2sBidRequest, serverBidderRequests, addBidResponse, timedOut => doneCbs.forEach(done => done(timedOut)), s2sAjax);
          }
        } else {
          (0,_utils_js__WEBPACK_IMPORTED_MODULE_2__.logError)('missing ' + s2sConfig.adapter);
        }
        counter++;
      }
    });

    // handle client adapter requests
    clientBidderRequests.forEach(bidderRequest => {
      bidderRequest.start = (0,_utils_js__WEBPACK_IMPORTED_MODULE_2__.timestamp)();
      const adapter = _bidderRegistry[bidderRequest.bidderCode];
      _config_js__WEBPACK_IMPORTED_MODULE_6__.config.runWithBidder(bidderRequest.bidderCode, () => {
        (0,_utils_js__WEBPACK_IMPORTED_MODULE_2__.logMessage)("CALLING BIDDER");
        _events_js__WEBPACK_IMPORTED_MODULE_11__.emit(_constants_js__WEBPACK_IMPORTED_MODULE_12__.EVENTS.BID_REQUESTED, bidderRequest);
      });
      const ajax = (0,_ajax_js__WEBPACK_IMPORTED_MODULE_5__.ajaxBuilder)(requestBidsTimeout, requestCallbacks ? {
        request: requestCallbacks.request.bind(null, bidderRequest.bidderCode),
        done: requestCallbacks.done
      } : undefined);
      const adapterDone = doneCb.bind(bidderRequest);
      try {
        _config_js__WEBPACK_IMPORTED_MODULE_6__.config.runWithBidder(bidderRequest.bidderCode, adapter.callBids.bind(adapter, bidderRequest, addBidResponse, adapterDone, ajax, () => onTimelyResponse(bidderRequest.bidderRequestId), _config_js__WEBPACK_IMPORTED_MODULE_6__.config.callbackWithBidder(bidderRequest.bidderCode)));
      } catch (e) {
        (0,_utils_js__WEBPACK_IMPORTED_MODULE_2__.logError)("".concat(bidderRequest.bidderCode, " Bid Adapter emitted an uncaught error when parsing their bidRequest"), {
          e,
          bidRequest: bidderRequest
        });
        adapterDone();
      }
    });
  },
  videoAdapters: [],
  registerBidAdapter(bidAdapter, bidderCode) {
    let {
      supportedMediaTypes = []
    } = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};
    if (bidAdapter && bidderCode) {
      if (typeof bidAdapter.callBids === 'function') {
        var _bidAdapter$getSpec;
        _bidderRegistry[bidderCode] = bidAdapter;
        _consentHandler_js__WEBPACK_IMPORTED_MODULE_10__.GDPR_GVLIDS.register(_activities_modules_js__WEBPACK_IMPORTED_MODULE_15__.MODULE_TYPE_BIDDER, bidderCode, (_bidAdapter$getSpec = bidAdapter.getSpec) === null || _bidAdapter$getSpec === void 0 ? void 0 : _bidAdapter$getSpec.call(bidAdapter).gvlid);
        if ( true && supportedMediaTypes.includes('video')) {
          adapterManager.videoAdapters.push(bidderCode);
        }
        if ( true && supportedMediaTypes.includes('native')) {
          _native_js__WEBPACK_IMPORTED_MODULE_3__.nativeAdapters.push(bidderCode);
        }
      } else {
        (0,_utils_js__WEBPACK_IMPORTED_MODULE_2__.logError)('Bidder adaptor error for bidder code: ' + bidderCode + 'bidder must implement a callBids() function');
      }
    } else {
      (0,_utils_js__WEBPACK_IMPORTED_MODULE_2__.logError)('bidAdapter or bidderCode not specified');
    }
  },
  aliasBidAdapter(bidderCode, alias, options) {
    const existingAlias = _bidderRegistry[alias];
    if (typeof existingAlias === 'undefined') {
      const bidAdapter = _bidderRegistry[bidderCode];
      if (typeof bidAdapter === 'undefined') {
        // check if alias is part of s2sConfig and allow them to register if so (as base bidder may be s2s-only)
        const nonS2SAlias = [];
        _s2sConfigs.forEach(s2sConfig => {
          if (s2sConfig.bidders && s2sConfig.bidders.length) {
            const s2sBidders = s2sConfig && s2sConfig.bidders;
            if (!(s2sConfig && s2sBidders.includes(alias))) {
              nonS2SAlias.push(bidderCode);
            } else {
              _aliasRegistry[alias] = bidderCode;
            }
          }
        });
        nonS2SAlias.forEach(bidderCode => {
          (0,_utils_js__WEBPACK_IMPORTED_MODULE_2__.logError)('bidderCode "' + bidderCode + '" is not an existing bidder.', 'adapterManager.aliasBidAdapter');
        });
      } else {
        try {
          let newAdapter;
          const supportedMediaTypes = getSupportedMediaTypes(bidderCode);
          // Have kept old code to support backward compatibilitiy.
          // Remove this if loop when all adapters are supporting bidderFactory. i.e When Prebid.js is 1.0
          if (bidAdapter.constructor.prototype !== Object.prototype) {
            newAdapter = new bidAdapter.constructor();
            newAdapter.setBidderCode(alias);
          } else {
            const {
              useBaseGvlid = false
            } = options || {};
            const spec = bidAdapter.getSpec();
            const gvlid = useBaseGvlid ? spec.gvlid : options === null || options === void 0 ? void 0 : options.gvlid;
            if (gvlid == null && spec.gvlid != null) {
              (0,_utils_js__WEBPACK_IMPORTED_MODULE_2__.logWarn)("Alias '".concat(alias, "' will NOT re-use the GVL ID of the original adapter ('").concat(spec.code, "', gvlid: ").concat(spec.gvlid, "). Functionality that requires TCF consent may not work as expected."));
            }
            const skipPbsAliasing = options && options.skipPbsAliasing;
            newAdapter = (0,_adapters_bidderFactory_js__WEBPACK_IMPORTED_MODULE_4__.newBidder)(Object.assign({}, spec, {
              code: alias,
              gvlid,
              skipPbsAliasing
            }));
            _aliasRegistry[alias] = bidderCode;
          }
          adapterManager.registerBidAdapter(newAdapter, alias, {
            supportedMediaTypes
          });
        } catch (e) {
          (0,_utils_js__WEBPACK_IMPORTED_MODULE_2__.logError)(bidderCode + ' bidder does not currently support aliasing.', 'adapterManager.aliasBidAdapter');
        }
      }
    } else {
      (0,_utils_js__WEBPACK_IMPORTED_MODULE_2__.logMessage)('alias name "' + alias + '" has been already specified.');
    }
  },
  resolveAlias(alias) {
    let code = alias;
    let visited;
    while (_aliasRegistry[code] && (!visited || !visited.has(code))) {
      code = _aliasRegistry[code];
      (visited = visited || new Set()).add(code);
    }
    return code;
  },
  registerAnalyticsAdapter(_ref2) {
    let {
      adapter,
      code,
      gvlid
    } = _ref2;
    if (adapter && code) {
      if (typeof adapter.enableAnalytics === 'function') {
        adapter.code = code;
        _analyticsRegistry[code] = {
          adapter,
          gvlid
        };
        _consentHandler_js__WEBPACK_IMPORTED_MODULE_10__.GDPR_GVLIDS.register(_activities_modules_js__WEBPACK_IMPORTED_MODULE_15__.MODULE_TYPE_ANALYTICS, code, gvlid);
      } else {
        (0,_utils_js__WEBPACK_IMPORTED_MODULE_2__.logError)("Prebid Error: Analytics adaptor error for analytics \"".concat(code, "\"\n        analytics adapter must implement an enableAnalytics() function"));
      }
    } else {
      (0,_utils_js__WEBPACK_IMPORTED_MODULE_2__.logError)('Prebid Error: analyticsAdapter or analyticsCode not specified');
    }
  },
  enableAnalytics(config) {
    if (!(0,_utils_js__WEBPACK_IMPORTED_MODULE_1__.isArray)(config)) {
      config = [config];
    }
    config.forEach(adapterConfig => {
      const entry = _analyticsRegistry[adapterConfig.provider];
      if (entry && entry.adapter) {
        if (dep.isAllowed(_activities_activities_js__WEBPACK_IMPORTED_MODULE_17__.ACTIVITY_REPORT_ANALYTICS, activityParams(_activities_modules_js__WEBPACK_IMPORTED_MODULE_15__.MODULE_TYPE_ANALYTICS, adapterConfig.provider, {
          [_activities_params_js__WEBPACK_IMPORTED_MODULE_18__.ACTIVITY_PARAM_ANL_CONFIG]: adapterConfig
        }))) {
          entry.adapter.enableAnalytics(adapterConfig);
        }
      } else {
        (0,_utils_js__WEBPACK_IMPORTED_MODULE_2__.logError)("Prebid Error: no analytics adapter found in registry for '".concat(adapterConfig.provider, "'."));
      }
    });
  },
  getBidAdapter(bidder) {
    return _bidderRegistry[bidder];
  },
  getAnalyticsAdapter(code) {
    return _analyticsRegistry[code];
  },
  callTimedOutBidders(adUnits, timedOutBidders, cbTimeout) {
    timedOutBidders = timedOutBidders.map(timedOutBidder => {
      // Adding user configured params & timeout to timeout event data
      timedOutBidder.params = (0,_utils_js__WEBPACK_IMPORTED_MODULE_2__.getUserConfiguredParams)(adUnits, timedOutBidder.adUnitCode, timedOutBidder.bidder);
      timedOutBidder.timeout = cbTimeout;
      return timedOutBidder;
    });
    timedOutBidders = (0,_utils_js__WEBPACK_IMPORTED_MODULE_2__.groupBy)(timedOutBidders, 'bidder');
    Object.keys(timedOutBidders).forEach(bidder => {
      tryCallBidderMethod(bidder, 'onTimeout', timedOutBidders[bidder]);
    });
  },
  callBidWonBidder(bidder, bid, adUnits) {
    // Adding user configured params to bidWon event data
    bid.params = (0,_utils_js__WEBPACK_IMPORTED_MODULE_2__.getUserConfiguredParams)(adUnits, bid.adUnitCode, bid.bidder);
    (0,_adUnits_js__WEBPACK_IMPORTED_MODULE_8__.incrementBidderWinsCounter)(bid.adUnitCode, bid.bidder);
    tryCallBidderMethod(bidder, 'onBidWon', bid);
  },
  triggerBilling: (() => {
    const BILLED = new WeakSet();
    return bid => {
      if (!BILLED.has(bid)) {
        var _parseEventTrackers$E;
        BILLED.add(bid);
        (((_parseEventTrackers$E = (0,_eventTrackers_js__WEBPACK_IMPORTED_MODULE_20__.parseEventTrackers)(bid.eventtrackers)[_eventTrackers_js__WEBPACK_IMPORTED_MODULE_20__.EVENT_TYPE_IMPRESSION]) === null || _parseEventTrackers$E === void 0 ? void 0 : _parseEventTrackers$E[_eventTrackers_js__WEBPACK_IMPORTED_MODULE_20__.TRACKER_METHOD_IMG]) || []).forEach(url => _utils_js__WEBPACK_IMPORTED_MODULE_2__.internal.triggerPixel(url));
        tryCallBidderMethod(bid.bidder, 'onBidBillable', bid);
      }
    };
  })(),
  callSetTargetingBidder(bidder, bid) {
    tryCallBidderMethod(bidder, 'onSetTargeting', bid);
  },
  callBidViewableBidder(bidder, bid) {
    tryCallBidderMethod(bidder, 'onBidViewable', bid);
  },
  callBidderError(bidder, error, bidderRequest) {
    const param = {
      error,
      bidderRequest
    };
    tryCallBidderMethod(bidder, 'onBidderError', param);
  },
  callAdRenderSucceededBidder(bidder, bid) {
    tryCallBidderMethod(bidder, 'onAdRenderSucceeded', bid);
  },
  callOnInterventionBidder(bidder, bid, intervention) {
    const param = {
      bid,
      intervention
    };
    tryCallBidderMethod(bidder, 'onIntervention', param);
  },
  /**
   * Ask every adapter to delete PII.
   * See https://github.com/prebid/Prebid.js/issues/9081
   */
  callDataDeletionRequest: (0,_hook_js__WEBPACK_IMPORTED_MODULE_7__.hook)('sync', function () {
    for (var _len2 = arguments.length, args = new Array(_len2), _key2 = 0; _key2 < _len2; _key2++) {
      args[_key2] = arguments[_key2];
    }
    const method = 'onDataDeletionRequest';
    Object.keys(_bidderRegistry).filter(bidder => !_aliasRegistry.hasOwnProperty(bidder)).forEach(bidder => {
      const target = getBidderMethod(bidder, method);
      if (target != null) {
        const bidderRequests = _auctionManager_js__WEBPACK_IMPORTED_MODULE_14__.auctionManager.getBidsRequested().filter(br => resolveAlias(br.bidderCode) === bidder);
        invokeBidderMethod(bidder, method, ...target, bidderRequests, ...args);
      }
    });
    Object.entries(_analyticsRegistry).forEach(_ref3 => {
      var _entry$adapter;
      let [name, entry] = _ref3;
      const fn = entry === null || entry === void 0 || (_entry$adapter = entry.adapter) === null || _entry$adapter === void 0 ? void 0 : _entry$adapter[method];
      if (typeof fn === 'function') {
        try {
          fn.apply(entry.adapter, args);
        } catch (e) {
          (0,_utils_js__WEBPACK_IMPORTED_MODULE_2__.logError)("error calling ".concat(method, " of ").concat(name), e);
        }
      }
    });
  })
};
function getSupportedMediaTypes(bidderCode) {
  const supportedMediaTypes = [];
  if ( true && adapterManager.videoAdapters.includes(bidderCode)) supportedMediaTypes.push('video');
  if ( true && _native_js__WEBPACK_IMPORTED_MODULE_3__.nativeAdapters.includes(bidderCode)) supportedMediaTypes.push('native');
  return supportedMediaTypes;
}
function getBidderMethod(bidder, method) {
  const adapter = _bidderRegistry[bidder];
  const spec = (adapter === null || adapter === void 0 ? void 0 : adapter.getSpec) && adapter.getSpec();
  if (spec && spec[method] && typeof spec[method] === 'function') {
    return [spec, spec[method]];
  }
}
function invokeBidderMethod(bidder, method, spec, fn) {
  try {
    (0,_utils_js__WEBPACK_IMPORTED_MODULE_2__.logInfo)("Invoking ".concat(bidder, ".").concat(method));
    for (var _len3 = arguments.length, params = new Array(_len3 > 4 ? _len3 - 4 : 0), _key3 = 4; _key3 < _len3; _key3++) {
      params[_key3 - 4] = arguments[_key3];
    }
    _config_js__WEBPACK_IMPORTED_MODULE_6__.config.runWithBidder(bidder, fn.bind(spec, ...params));
  } catch (e) {
    (0,_utils_js__WEBPACK_IMPORTED_MODULE_2__.logWarn)("Error calling ".concat(method, " of ").concat(bidder));
  }
}
function tryCallBidderMethod(bidder, method, param) {
  if ((param === null || param === void 0 ? void 0 : param.source) !== _constants_js__WEBPACK_IMPORTED_MODULE_12__.S2S.SRC) {
    const target = getBidderMethod(bidder, method);
    if (target != null) {
      invokeBidderMethod(bidder, method, ...target, param);
    }
  }
}
function resolveAlias(alias) {
  const seen = new Set();
  while (_aliasRegistry.hasOwnProperty(alias) && !seen.has(alias)) {
    seen.add(alias);
    alias = _aliasRegistry[alias];
  }
  return alias;
}
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (adapterManager);


/***/ }),

/***/ "./src/adapters/bidderFactory.js":
/*!***************************************!*\
  !*** ./src/adapters/bidderFactory.js ***!
  \***************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   newBidder: () => (/* binding */ newBidder),
/* harmony export */   registerBidder: () => (/* binding */ registerBidder)
/* harmony export */ });
/* unused harmony exports guardTids, processBidderRequests, registerSyncInner, addPaapiConfig, isValid, adapterMetrics */
/* harmony import */ var _adapter_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../adapter.js */ "./src/adapter.js");
/* harmony import */ var _adapterManager_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../adapterManager.js */ "./src/adapterManager.js");
/* harmony import */ var _config_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../config.js */ "./src/config.js");
/* harmony import */ var _bidfactory_js__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ../bidfactory.js */ "./src/bidfactory.js");
/* harmony import */ var _userSync_js__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ../userSync.js */ "./src/userSync.js");
/* harmony import */ var _native_js__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! ../native.js */ "./src/native.js");
/* harmony import */ var _video_js__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(/*! ../video.js */ "./src/video.js");
/* harmony import */ var _constants_js__WEBPACK_IMPORTED_MODULE_7__ = __webpack_require__(/*! ../constants.js */ "./src/constants.js");
/* harmony import */ var _events_js__WEBPACK_IMPORTED_MODULE_8__ = __webpack_require__(/*! ../events.js */ "./src/events.js");
/* harmony import */ var _utils_js__WEBPACK_IMPORTED_MODULE_9__ = __webpack_require__(/*! ../utils.js */ "./src/utils/objects.js");
/* harmony import */ var _utils_js__WEBPACK_IMPORTED_MODULE_10__ = __webpack_require__(/*! ../utils.js */ "./src/utils.js");
/* harmony import */ var _hook_js__WEBPACK_IMPORTED_MODULE_11__ = __webpack_require__(/*! ../hook.js */ "./src/hook.js");
/* harmony import */ var _auctionManager_js__WEBPACK_IMPORTED_MODULE_12__ = __webpack_require__(/*! ../auctionManager.js */ "./src/auctionManager.js");
/* harmony import */ var _bidderSettings_js__WEBPACK_IMPORTED_MODULE_13__ = __webpack_require__(/*! ../bidderSettings.js */ "./src/bidderSettings.js");
/* harmony import */ var _utils_perfMetrics_js__WEBPACK_IMPORTED_MODULE_14__ = __webpack_require__(/*! ../utils/perfMetrics.js */ "./src/utils/perfMetrics.js");
/* harmony import */ var _activities_rules_js__WEBPACK_IMPORTED_MODULE_15__ = __webpack_require__(/*! ../activities/rules.js */ "./src/activities/rules.js");
/* harmony import */ var _activities_activityParams_js__WEBPACK_IMPORTED_MODULE_16__ = __webpack_require__(/*! ../activities/activityParams.js */ "./src/activities/activityParams.js");
/* harmony import */ var _activities_modules_js__WEBPACK_IMPORTED_MODULE_17__ = __webpack_require__(/*! ../activities/modules.js */ "./src/activities/modules.js");
/* harmony import */ var _activities_activities_js__WEBPACK_IMPORTED_MODULE_18__ = __webpack_require__(/*! ../activities/activities.js */ "./src/activities/activities.js");


















/**
 * This file aims to support Adapters during the Prebid 0.x -> 1.x transition.
 *
 * Prebid 1.x and Prebid 0.x will be in separate branches--perhaps for a long time.
 * This function defines an API for adapter construction which is compatible with both versions.
 * Adapters which use it can maintain their code in master, and only this file will need to change
 * in the 1.x branch.
 *
 * Typical usage looks something like:
 *
 * const adapter = registerBidder({
 *   code: 'myBidderCode',
 *   aliases: ['alias1', 'alias2'],
 *   supportedMediaTypes: ['video', 'native'],
 *   isBidRequestValid: function(paramsObject) { return true/false },
 *   buildRequests: function(bidRequests, bidderRequest) { return some ServerRequest(s) },
 *   interpretResponse: function(oneServerResponse) { return some Bids, or throw an error. }
 * });
 *
 * @see BidderSpec for the full API and more thorough descriptions.
 *
 */

/**
 * @typedef {object} ServerResponse
 *
 * @property {*} body The response body. If this is legal JSON, then it will be parsed. Otherwise it'll be a
 *   string with the body's content.
 * @property {{get: function(string): string}} headers The response headers.
 *   Call this like `ServerResponse.headers.get("Content-Type")`
 */

/**
 * @typedef {Object} SyncOptions
 *
 * An object containing information about usersyncs which the adapter should obey.
 *
 * @property {boolean} iframeEnabled True if iframe usersyncs are allowed, and false otherwise
 * @property {boolean} pixelEnabled True if image usersyncs are allowed, and false otherwise
 */

/**
 * TODO: Move this to the UserSync module after that PR is merged.
 *
 * @typedef {object} UserSync
 *
 * @property {('image'|'iframe')} type The type of user sync to be done.
 * @property {string} url The URL which makes the sync happen.
 */

// common params for all mediaTypes
const COMMON_BID_RESPONSE_KEYS = ['cpm', 'ttl', 'creativeId', 'netRevenue', 'currency'];
const TIDS = {
  auctionId: request => {
    var _request$ortb;
    return (_request$ortb = request.ortb2) === null || _request$ortb === void 0 || (_request$ortb = _request$ortb.source) === null || _request$ortb === void 0 ? void 0 : _request$ortb.tid;
  },
  transactionId: request => {
    var _request$ortb2Imp;
    return (_request$ortb2Imp = request.ortb2Imp) === null || _request$ortb2Imp === void 0 || (_request$ortb2Imp = _request$ortb2Imp.ext) === null || _request$ortb2Imp === void 0 ? void 0 : _request$ortb2Imp.tid;
  }
};
/**
 * Register a bidder with prebid, using the given spec.
 *
 * If possible, Adapter modules should use this function instead of adapterManager.registerBidAdapter().
 *
 * @param {BidderSpec} spec An object containing the bare-bones functions we need to make a Bidder.
 */
function registerBidder(spec) {
  const mediaTypes = Array.isArray(spec.supportedMediaTypes) ? {
    supportedMediaTypes: spec.supportedMediaTypes
  } : undefined;
  function putBidder(spec) {
    const bidder = newBidder(spec);
    _adapterManager_js__WEBPACK_IMPORTED_MODULE_1__["default"].registerBidAdapter(bidder, spec.code, mediaTypes);
  }
  putBidder(spec);
  if (Array.isArray(spec.aliases)) {
    spec.aliases.forEach(alias => {
      let aliasCode = alias;
      let gvlid;
      let skipPbsAliasing;
      if ((0,_utils_js__WEBPACK_IMPORTED_MODULE_9__.isPlainObject)(alias)) {
        aliasCode = alias.code;
        gvlid = alias.gvlid;
        skipPbsAliasing = alias.skipPbsAliasing;
      }
      _adapterManager_js__WEBPACK_IMPORTED_MODULE_1__["default"].aliasRegistry[aliasCode] = spec.code;
      putBidder(Object.assign({}, spec, {
        code: aliasCode,
        gvlid,
        skipPbsAliasing
      }));
    });
  }
}
const guardTids = (0,_utils_js__WEBPACK_IMPORTED_MODULE_10__.memoize)(_ref => {
  let {
    bidderCode
  } = _ref;
  const tidsAllowed = (0,_activities_rules_js__WEBPACK_IMPORTED_MODULE_15__.isActivityAllowed)(_activities_activities_js__WEBPACK_IMPORTED_MODULE_18__.ACTIVITY_TRANSMIT_TID, (0,_activities_activityParams_js__WEBPACK_IMPORTED_MODULE_16__.activityParams)(_activities_modules_js__WEBPACK_IMPORTED_MODULE_17__.MODULE_TYPE_BIDDER, bidderCode));
  function get(target, prop, receiver) {
    if (TIDS.hasOwnProperty(prop)) {
      return tidsAllowed ? TIDS[prop](target) : null;
    }
    return Reflect.get(target, prop, receiver);
  }
  function privateAccessProxy(target, handler) {
    const proxy = new Proxy(target, handler);
    // always allow methods (such as getFloor) private access to TIDs
    Object.entries(target).filter(_ref2 => {
      let [_, v] = _ref2;
      return typeof v === 'function';
    }).forEach(_ref3 => {
      let [prop, fn] = _ref3;
      proxy[prop] = fn.bind(target);
    });
    return proxy;
  }
  const bidRequest = (0,_utils_js__WEBPACK_IMPORTED_MODULE_10__.memoize)(br => privateAccessProxy(br, {
    get
  }), arg => arg.bidId);
  /**
   * Return a view on bidd(er) requests where auctionId/transactionId are nulled if the bidder is not allowed `transmitTid`.
   *
   * Because both auctionId and transactionId are used for Prebid's own internal bookkeeping, we cannot simply erase them
   * from request objects; and because request objects are quite complex and not easily cloneable, we hide the IDs
   * with a proxy instead. This should be used only around the adapter logic.
   */
  return {
    bidRequest,
    bidderRequest: br => privateAccessProxy(br, {
      get(target, prop, receiver) {
        if (prop === 'bids') return br.bids.map(bidRequest);
        return get(target, prop, receiver);
      }
    })
  };
});
/**
 * Make a new bidder from the given spec. This is exported mainly for testing.
 * Adapters will probably find it more convenient to use registerBidder instead.
 *
 * @param {BidderSpec} spec
 */
function newBidder(spec) {
  return Object.assign((0,_adapter_js__WEBPACK_IMPORTED_MODULE_0__["default"])(spec.code), {
    getSpec: function () {
      return Object.freeze(Object.assign({}, spec));
    },
    registerSyncs,
    callBids: function (bidderRequest, addBidResponse, done, ajax, onTimelyResponse, configEnabledCallback) {
      if (!Array.isArray(bidderRequest.bids)) {
        return;
      }
      const tidGuard = guardTids(bidderRequest);
      const adUnitCodesHandled = {};
      function addBidWithCode(adUnitCode, bid) {
        const metrics = (0,_utils_perfMetrics_js__WEBPACK_IMPORTED_MODULE_14__.useMetrics)(bid.metrics);
        metrics.checkpoint('addBidResponse');
        adUnitCodesHandled[adUnitCode] = true;
        if (metrics.measureTime('addBidResponse.validate', () => isValid(adUnitCode, bid))) {
          addBidResponse(adUnitCode, bid);
        } else {
          addBidResponse.reject(adUnitCode, bid, _constants_js__WEBPACK_IMPORTED_MODULE_7__.REJECTION_REASON.INVALID);
        }
      }

      // After all the responses have come back, call done() and
      // register any required usersync pixels.
      const responses = [];
      function afterAllResponses() {
        done();
        _config_js__WEBPACK_IMPORTED_MODULE_2__.config.runWithBidder(spec.code, () => {
          _events_js__WEBPACK_IMPORTED_MODULE_8__.emit(_constants_js__WEBPACK_IMPORTED_MODULE_7__.EVENTS.BIDDER_DONE, bidderRequest);
          registerSyncs(responses, bidderRequest.gdprConsent, bidderRequest.uspConsent, bidderRequest.gppConsent);
        });
      }
      const validBidRequests = adapterMetrics(bidderRequest).measureTime('validate', () => bidderRequest.bids.filter(br => filterAndWarn(tidGuard.bidRequest(br))));
      if (validBidRequests.length === 0) {
        afterAllResponses();
        return;
      }
      const bidRequestMap = {};
      validBidRequests.forEach(bid => {
        bidRequestMap[bid.bidId] = bid;
      });
      processBidderRequests(spec, validBidRequests, bidderRequest, ajax, configEnabledCallback, {
        onRequest: requestObject => _events_js__WEBPACK_IMPORTED_MODULE_8__.emit(_constants_js__WEBPACK_IMPORTED_MODULE_7__.EVENTS.BEFORE_BIDDER_HTTP, bidderRequest, requestObject),
        onResponse: resp => {
          onTimelyResponse(spec.code);
          responses.push(resp);
        },
        onPaapi: paapiConfig => {
          const bidRequest = bidRequestMap[paapiConfig.bidId];
          if (bidRequest) {
            addPaapiConfig(bidRequest, paapiConfig);
          } else {
            (0,_utils_js__WEBPACK_IMPORTED_MODULE_10__.logWarn)('Received fledge auction configuration for an unknown bidId', paapiConfig);
          }
        },
        // If the server responds with an error, there's not much we can do beside logging.
        onError: (errorMessage, error) => {
          if (!error.timedOut) {
            onTimelyResponse(spec.code);
          }
          _adapterManager_js__WEBPACK_IMPORTED_MODULE_1__["default"].callBidderError(spec.code, error, bidderRequest);
          _events_js__WEBPACK_IMPORTED_MODULE_8__.emit(_constants_js__WEBPACK_IMPORTED_MODULE_7__.EVENTS.BIDDER_ERROR, {
            error,
            bidderRequest
          });
          (0,_utils_js__WEBPACK_IMPORTED_MODULE_10__.logError)("Server call for ".concat(spec.code, " failed: ").concat(errorMessage, " ").concat(error.status, ". Continuing without bids."), {
            bidRequests: validBidRequests
          });
        },
        onBid: bidResponse => {
          const bidRequest = bidRequestMap[bidResponse.requestId];
          const bid = bidResponse;
          if (bidRequest) {
            var _bidResponse$deferRen;
            bid.adapterCode = bidRequest.bidder;
            if (isInvalidAlternateBidder(bidResponse.bidderCode, bidRequest.bidder)) {
              (0,_utils_js__WEBPACK_IMPORTED_MODULE_10__.logWarn)("".concat(bidResponse.bidderCode, " is not a registered partner or known bidder of ").concat(bidRequest.bidder, ", hence continuing without bid. If you wish to support this bidder, please mark allowAlternateBidderCodes as true in bidderSettings."));
              addBidResponse.reject(bidRequest.adUnitCode, bidResponse, _constants_js__WEBPACK_IMPORTED_MODULE_7__.REJECTION_REASON.BIDDER_DISALLOWED);
              return;
            }
            // creating a copy of original values as cpm and currency are modified later
            bid.originalCpm = bidResponse.cpm;
            bid.originalCurrency = bidResponse.currency;
            bid.meta = bidResponse.meta || Object.assign({}, bidResponse[bidRequest.bidder]);
            bid.deferBilling = bidRequest.deferBilling;
            bid.deferRendering = bid.deferBilling && ((_bidResponse$deferRen = bidResponse.deferRendering) !== null && _bidResponse$deferRen !== void 0 ? _bidResponse$deferRen : typeof spec.onBidBillable !== 'function');
            const prebidBid = Object.assign((0,_bidfactory_js__WEBPACK_IMPORTED_MODULE_3__.createBid)(bidRequest), bid, (0,_utils_js__WEBPACK_IMPORTED_MODULE_10__.pick)(bidRequest, Object.keys(TIDS)));
            addBidWithCode(bidRequest.adUnitCode, prebidBid);
          } else {
            (0,_utils_js__WEBPACK_IMPORTED_MODULE_10__.logWarn)("Bidder ".concat(spec.code, " made bid for unknown request ID: ").concat(bidResponse.requestId, ". Ignoring."));
            addBidResponse.reject(null, bidResponse, _constants_js__WEBPACK_IMPORTED_MODULE_7__.REJECTION_REASON.INVALID_REQUEST_ID);
          }
        },
        onCompletion: afterAllResponses
      });
    }
  });
  function isInvalidAlternateBidder(responseBidder, requestBidder) {
    const allowAlternateBidderCodes = _bidderSettings_js__WEBPACK_IMPORTED_MODULE_13__.bidderSettings.get(requestBidder, 'allowAlternateBidderCodes') || false;
    let alternateBiddersList = _bidderSettings_js__WEBPACK_IMPORTED_MODULE_13__.bidderSettings.get(requestBidder, 'allowedAlternateBidderCodes');
    if (!!responseBidder && !!requestBidder && requestBidder !== responseBidder) {
      alternateBiddersList = (0,_utils_js__WEBPACK_IMPORTED_MODULE_9__.isArray)(alternateBiddersList) ? alternateBiddersList.map(val => val.trim().toLowerCase()).filter(val => !!val).filter(_utils_js__WEBPACK_IMPORTED_MODULE_10__.uniques) : alternateBiddersList;
      if (!allowAlternateBidderCodes || (0,_utils_js__WEBPACK_IMPORTED_MODULE_9__.isArray)(alternateBiddersList) && alternateBiddersList[0] !== '*' && !alternateBiddersList.includes(responseBidder)) {
        return true;
      }
    }
    return false;
  }
  function registerSyncs(responses, gdprConsent, uspConsent, gppConsent) {
    registerSyncInner(spec, responses, gdprConsent, uspConsent, gppConsent);
  }
  function filterAndWarn(bid) {
    if (!spec.isBidRequestValid(bid)) {
      (0,_utils_js__WEBPACK_IMPORTED_MODULE_10__.logWarn)("Invalid bid sent to bidder ".concat(spec.code, ": ").concat(JSON.stringify(bid)));
      return false;
    }
    return true;
  }
}
const RESPONSE_PROPS = ['bids', 'paapi'];
/**
 * Run a set of bid requests - that entails converting them to HTTP requests, sending
 * them over the network, and parsing the responses.
 *
 * @param spec bid adapter spec
 * @param bids bid requests to run
 * @param bidderRequest the bid request object that `bids` is connected to
 * @param ajax ajax method to use
 * @param wrapCallback a function used to wrap every callback (for the purpose of `config.currentBidder`)
 */
const processBidderRequests = (0,_hook_js__WEBPACK_IMPORTED_MODULE_11__.hook)('async', function (spec, bids, bidderRequest, ajax, wrapCallback, _ref4) {
  let {
    onRequest,
    onResponse,
    onPaapi,
    onError,
    onBid,
    onCompletion
  } = _ref4;
  const metrics = adapterMetrics(bidderRequest);
  onCompletion = metrics.startTiming('total').stopBefore(onCompletion);
  const tidGuard = guardTids(bidderRequest);
  let requests = metrics.measureTime('buildRequests', () => spec.buildRequests(bids.map(tidGuard.bidRequest), tidGuard.bidderRequest(bidderRequest)));
  if (!Array.isArray(requests)) {
    requests = [requests];
  }
  if (!requests || requests.length === 0) {
    onCompletion();
    return;
  }
  const requestDone = (0,_utils_js__WEBPACK_IMPORTED_MODULE_10__.delayExecution)(onCompletion, requests.length);
  requests.forEach(request => {
    var _request$options;
    const requestMetrics = metrics.fork();
    function addBid(bid) {
      if (bid != null) bid.metrics = requestMetrics.fork().renameWith();
      onBid(bid);
    }
    // If the server responds successfully, use the adapter code to unpack the Bids from it.
    // If the adapter code fails, no bids should be added. After all the bids have been added,
    // make sure to call the `requestDone` function so that we're one step closer to calling onCompletion().
    const onSuccess = wrapCallback(function (response, responseObj) {
      networkDone();
      try {
        response = JSON.parse(response);
      } catch (e) {/* response might not be JSON... that's ok. */}

      // Make response headers available for #1742. These are lazy-loaded because most adapters won't need them.
      response = {
        body: response,
        headers: headerParser(responseObj)
      };
      onResponse(response);
      try {
        response = requestMetrics.measureTime('interpretResponse', () => spec.interpretResponse(response, request));
      } catch (err) {
        (0,_utils_js__WEBPACK_IMPORTED_MODULE_10__.logError)("Bidder ".concat(spec.code, " failed to interpret the server's response. Continuing without bids"), null, err);
        requestDone();
        return;
      }

      // adapters can reply with:
      // a single bid
      // an array of bids
      // a BidderAuctionResponse object

      let bids, paapiConfigs;
      if (response && !Object.keys(response).some(key => !RESPONSE_PROPS.includes(key))) {
        bids = response.bids;
        paapiConfigs = response.paapi;
      } else {
        bids = response;
      }
      if ((0,_utils_js__WEBPACK_IMPORTED_MODULE_9__.isArray)(paapiConfigs)) {
        paapiConfigs.forEach(onPaapi);
      }
      if (bids) {
        if ((0,_utils_js__WEBPACK_IMPORTED_MODULE_9__.isArray)(bids)) {
          bids.forEach(addBid);
        } else {
          addBid(bids);
        }
      }
      requestDone();
      function headerParser(xmlHttpResponse) {
        return {
          get: responseObj.getResponseHeader.bind(responseObj)
        };
      }
    });
    const onFailure = wrapCallback(function (errorMessage, error) {
      networkDone();
      onError(errorMessage, error);
      requestDone();
    });
    onRequest(request);
    const networkDone = requestMetrics.startTiming('net');
    const debugMode = (0,_utils_js__WEBPACK_IMPORTED_MODULE_10__.getParameterByName)(_constants_js__WEBPACK_IMPORTED_MODULE_7__.DEBUG_MODE).toUpperCase() === 'TRUE' || (0,_utils_js__WEBPACK_IMPORTED_MODULE_10__.debugTurnedOn)();
    function getOptions(defaults) {
      var _bidderSettings$get;
      const ro = request.options;
      return Object.assign(defaults, ro, {
        browsingTopics: ro !== null && ro !== void 0 && ro.hasOwnProperty('browsingTopics') && !ro.browsingTopics ? false : ((_bidderSettings$get = _bidderSettings_js__WEBPACK_IMPORTED_MODULE_13__.bidderSettings.get(spec.code, 'topicsHeader')) !== null && _bidderSettings$get !== void 0 ? _bidderSettings$get : true) && (0,_activities_rules_js__WEBPACK_IMPORTED_MODULE_15__.isActivityAllowed)(_activities_activities_js__WEBPACK_IMPORTED_MODULE_18__.ACTIVITY_TRANSMIT_UFPD, (0,_activities_activityParams_js__WEBPACK_IMPORTED_MODULE_16__.activityParams)(_activities_modules_js__WEBPACK_IMPORTED_MODULE_17__.MODULE_TYPE_BIDDER, spec.code)),
        suppressTopicsEnrollmentWarning: ro !== null && ro !== void 0 && ro.hasOwnProperty('suppressTopicsEnrollmentWarning') ? ro.suppressTopicsEnrollmentWarning : !debugMode
      });
    }
    switch (request.method) {
      case 'GET':
        ajax("".concat(request.url).concat(formatGetParameters(request.data)), {
          success: onSuccess,
          error: onFailure
        }, undefined, getOptions({
          method: 'GET',
          withCredentials: true
        }));
        break;
      case 'POST':
        const enableGZipCompression = (_request$options = request.options) === null || _request$options === void 0 ? void 0 : _request$options.endpointCompression;
        const callAjax = _ref5 => {
          let {
            url,
            payload
          } = _ref5;
          ajax(url, {
            success: onSuccess,
            error: onFailure
          }, payload, getOptions({
            method: 'POST',
            contentType: 'text/plain',
            withCredentials: true
          }));
        };
        if (enableGZipCompression && debugMode) {
          (0,_utils_js__WEBPACK_IMPORTED_MODULE_10__.logWarn)("Skipping GZIP compression for ".concat(spec.code, " as debug mode is enabled"));
        }
        if (enableGZipCompression && !debugMode && (0,_utils_js__WEBPACK_IMPORTED_MODULE_10__.isGzipCompressionSupported)()) {
          (0,_utils_js__WEBPACK_IMPORTED_MODULE_10__.compressDataWithGZip)(request.data).then(compressedPayload => {
            const url = new URL(request.url);
            if (!url.searchParams.has('gzip')) {
              url.searchParams.set('gzip', '1');
            }
            callAjax({
              url: url.href,
              payload: compressedPayload
            });
          });
        } else {
          callAjax({
            url: request.url,
            payload: typeof request.data === 'string' ? request.data : JSON.stringify(request.data)
          });
        }
        break;
      default:
        (0,_utils_js__WEBPACK_IMPORTED_MODULE_10__.logWarn)("Skipping invalid request from ".concat(spec.code, ". Request type ").concat(request.method, " must be GET or POST"));
        requestDone();
    }
    function formatGetParameters(data) {
      if (data) {
        return "?".concat(typeof data === 'object' ? (0,_utils_js__WEBPACK_IMPORTED_MODULE_10__.parseQueryStringParameters)(data) : data);
      }
      return '';
    }
  });
}, 'processBidderRequests');
const registerSyncInner = (0,_hook_js__WEBPACK_IMPORTED_MODULE_11__.hook)('async', function (spec, responses, gdprConsent, uspConsent, gppConsent) {
  const aliasSyncEnabled = _config_js__WEBPACK_IMPORTED_MODULE_2__.config.getConfig('userSync.aliasSyncEnabled');
  if (spec.getUserSyncs && (aliasSyncEnabled || !_adapterManager_js__WEBPACK_IMPORTED_MODULE_1__["default"].aliasRegistry[spec.code])) {
    let syncs = spec.getUserSyncs({
      iframeEnabled: _userSync_js__WEBPACK_IMPORTED_MODULE_4__.userSync.canBidderRegisterSync('iframe', spec.code),
      pixelEnabled: _userSync_js__WEBPACK_IMPORTED_MODULE_4__.userSync.canBidderRegisterSync('image', spec.code)
    }, responses, gdprConsent, uspConsent, gppConsent);
    if (syncs) {
      if (!Array.isArray(syncs)) {
        syncs = [syncs];
      }
      syncs.forEach(sync => {
        _userSync_js__WEBPACK_IMPORTED_MODULE_4__.userSync.registerSync(sync.type, spec.code, sync.url);
      });
      _userSync_js__WEBPACK_IMPORTED_MODULE_4__.userSync.bidderDone(spec.code);
    }
  }
}, 'registerSyncs');
const addPaapiConfig = (0,_hook_js__WEBPACK_IMPORTED_MODULE_11__.hook)('sync', (request, paapiConfig) => {}, 'addPaapiConfig');
// check that the bid has a width and height set
function validBidSize(adUnitCode, bid) {
  let {
    index = _auctionManager_js__WEBPACK_IMPORTED_MODULE_12__.auctionManager.index
  } = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};
  if ((bid.width || parseInt(bid.width, 10) === 0) && (bid.height || parseInt(bid.height, 10) === 0)) {
    bid.width = parseInt(bid.width, 10);
    bid.height = parseInt(bid.height, 10);
    return true;
  }
  if (bid.wratio != null && bid.hratio != null) {
    bid.wratio = parseInt(bid.wratio, 10);
    bid.hratio = parseInt(bid.hratio, 10);
    return true;
  }
  const bidRequest = index.getBidRequest(bid);
  const mediaTypes = index.getMediaTypes(bid);
  const sizes = bidRequest && bidRequest.sizes || mediaTypes && mediaTypes.banner && mediaTypes.banner.sizes;
  const parsedSizes = (0,_utils_js__WEBPACK_IMPORTED_MODULE_10__.parseSizesInput)(sizes);

  // if a banner impression has one valid size, we assign that size to any bid
  // response that does not explicitly set width or height
  if (parsedSizes.length === 1) {
    const [width, height] = parsedSizes[0].split('x');
    bid.width = parseInt(width, 10);
    bid.height = parseInt(height, 10);
    return true;
  }
  return false;
}

// Validate the arguments sent to us by the adapter. If this returns false, the bid should be totally ignored.
function isValid(adUnitCode, bid) {
  let {
    index = _auctionManager_js__WEBPACK_IMPORTED_MODULE_12__.auctionManager.index
  } = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};
  function hasValidKeys() {
    const bidKeys = Object.keys(bid);
    return COMMON_BID_RESPONSE_KEYS.every(key => bidKeys.includes(key) && ![undefined, null].includes(bid[key]));
  }
  function errorMessage(msg) {
    return "Invalid bid from ".concat(bid.bidderCode, ". Ignoring bid: ").concat(msg);
  }
  if (!adUnitCode) {
    (0,_utils_js__WEBPACK_IMPORTED_MODULE_10__.logWarn)('No adUnitCode was supplied to addBidResponse.');
    return false;
  }
  if (!bid) {
    (0,_utils_js__WEBPACK_IMPORTED_MODULE_10__.logWarn)("Some adapter tried to add an undefined bid for ".concat(adUnitCode, "."));
    return false;
  }
  if (!hasValidKeys()) {
    (0,_utils_js__WEBPACK_IMPORTED_MODULE_10__.logError)(errorMessage("Bidder ".concat(bid.bidderCode, " is missing required params. Check http://prebid.org/dev-docs/bidder-adapter-1.html for list of params.")));
    return false;
  }
  if ( true && bid.mediaType === 'native' && !(0,_native_js__WEBPACK_IMPORTED_MODULE_5__.nativeBidIsValid)(bid, {
    index
  })) {
    (0,_utils_js__WEBPACK_IMPORTED_MODULE_10__.logError)(errorMessage('Native bid missing some required properties.'));
    return false;
  }
  if ( true && bid.mediaType === 'video' && !(0,_video_js__WEBPACK_IMPORTED_MODULE_6__.isValidVideoBid)(bid, {
    index
  })) {
    (0,_utils_js__WEBPACK_IMPORTED_MODULE_10__.logError)(errorMessage("Video bid does not have required vastUrl or renderer property"));
    return false;
  }
  if (bid.mediaType === 'banner' && !validBidSize(adUnitCode, bid, {
    index
  })) {
    (0,_utils_js__WEBPACK_IMPORTED_MODULE_10__.logError)(errorMessage("Banner bids require a width and height"));
    return false;
  }
  return true;
}
function adapterMetrics(bidderRequest) {
  return (0,_utils_perfMetrics_js__WEBPACK_IMPORTED_MODULE_14__.useMetrics)(bidderRequest.metrics).renameWith(n => ["adapter.client.".concat(n), "adapters.client.".concat(bidderRequest.bidderCode, ".").concat(n)]);
}


/***/ }),

/***/ "./src/adloader.js":
/*!*************************!*\
  !*** ./src/adloader.js ***!
  \*************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   loadExternalScript: () => (/* binding */ loadExternalScript)
/* harmony export */ });
/* harmony import */ var _activities_activities_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./activities/activities.js */ "./src/activities/activities.js");
/* harmony import */ var _activities_activityParams_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./activities/activityParams.js */ "./src/activities/activityParams.js");
/* harmony import */ var _activities_rules_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./activities/rules.js */ "./src/activities/rules.js");
/* harmony import */ var _utils_js__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ./utils.js */ "./src/utils.js");




const _requestCache = new WeakMap();
// The below list contains modules or vendors whom Prebid allows to load external JS.
const _approvedLoadExternalJSList = [
// Prebid maintained modules:
'debugging', 'outstream',
// RTD modules:
'aaxBlockmeter', 'adagio', 'adloox', 'arcspan', 'airgrid', 'browsi', 'brandmetrics', 'clean.io', 'humansecurityMalvDefense', 'humansecurity', 'confiant', 'contxtful', 'hadron', 'mediafilter', 'medianet', 'azerionedge', 'a1Media', 'geoedge', 'qortex', 'dynamicAdBoost', '51Degrees', 'symitridap', 'wurfl', 'nodalsAi', 'anonymised', 'optable', 'oftmedia',
// UserId Submodules
'justtag', 'tncId', 'ftrackId', 'id5'];

/**
 * Loads external javascript. Can only be used if external JS is approved by Prebid. See https://github.com/prebid/prebid-js-external-js-template#policy
 * Each unique URL will be loaded at most 1 time.
 * @param {string} url the url to load
 * @param {string} moduleType moduleType of the module requesting this resource
 * @param {string} moduleCode bidderCode or module code of the module requesting this resource
 * @param {function} [callback] callback function to be called after the script is loaded
 * @param {Document} [doc] the context document, in which the script will be loaded, defaults to loaded document
 * @param {object} attributes an object of attributes to be added to the script with setAttribute by [key] and [value]; Only the attributes passed in the first request of a url will be added.
 */
function loadExternalScript(url, moduleType, moduleCode, callback, doc, attributes) {
  if (!(0,_activities_rules_js__WEBPACK_IMPORTED_MODULE_2__.isActivityAllowed)(_activities_activities_js__WEBPACK_IMPORTED_MODULE_0__.LOAD_EXTERNAL_SCRIPT, (0,_activities_activityParams_js__WEBPACK_IMPORTED_MODULE_1__.activityParams)(moduleType, moduleCode))) {
    return;
  }
  if (!moduleCode || !url) {
    (0,_utils_js__WEBPACK_IMPORTED_MODULE_3__.logError)('cannot load external script without url and moduleCode');
    return;
  }
  if (!_approvedLoadExternalJSList.includes(moduleCode)) {
    (0,_utils_js__WEBPACK_IMPORTED_MODULE_3__.logError)("".concat(moduleCode, " not whitelisted for loading external JavaScript"));
    return;
  }
  if (!doc) {
    doc = document; // provide a "valid" key for the WeakMap
  }
  // only load each asset once
  const storedCachedObject = getCacheObject(doc, url);
  if (storedCachedObject) {
    if (callback && typeof callback === 'function') {
      if (storedCachedObject.loaded) {
        // invokeCallbacks immediately
        callback();
      } else {
        // queue the callback
        storedCachedObject.callbacks.push(callback);
      }
    }
    return storedCachedObject.tag;
  }
  const cachedDocObj = _requestCache.get(doc) || {};
  const cacheObject = {
    loaded: false,
    tag: null,
    callbacks: []
  };
  cachedDocObj[url] = cacheObject;
  _requestCache.set(doc, cachedDocObj);
  if (callback && typeof callback === 'function') {
    cacheObject.callbacks.push(callback);
  }
  (0,_utils_js__WEBPACK_IMPORTED_MODULE_3__.logWarn)("module ".concat(moduleCode, " is loading external JavaScript"));
  return requestResource(url, function () {
    cacheObject.loaded = true;
    try {
      for (let i = 0; i < cacheObject.callbacks.length; i++) {
        cacheObject.callbacks[i]();
      }
    } catch (e) {
      (0,_utils_js__WEBPACK_IMPORTED_MODULE_3__.logError)('Error executing callback', 'adloader.js:loadExternalScript', e);
    }
  }, doc, attributes);
  function requestResource(tagSrc, callback, doc, attributes) {
    if (!doc) {
      doc = document;
    }
    var jptScript = doc.createElement('script');
    jptScript.type = 'text/javascript';
    jptScript.async = true;
    const cacheObject = getCacheObject(doc, url);
    if (cacheObject) {
      cacheObject.tag = jptScript;
    }
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
    jptScript.src = tagSrc;
    if (attributes) {
      (0,_utils_js__WEBPACK_IMPORTED_MODULE_3__.setScriptAttributes)(jptScript, attributes);
    }

    // add the new script tag to the page
    (0,_utils_js__WEBPACK_IMPORTED_MODULE_3__.insertElement)(jptScript, doc);
    return jptScript;
  }
  function getCacheObject(doc, url) {
    const cachedDocObj = _requestCache.get(doc);
    if (cachedDocObj && cachedDocObj[url]) {
      return cachedDocObj[url];
    }
    return null; // return new cache object?
  }
}
;


/***/ }),

/***/ "./src/ajax.js":
/*!*********************!*\
  !*** ./src/ajax.js ***!
  \*********************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   ajaxBuilder: () => (/* binding */ ajaxBuilder)
/* harmony export */ });
/* unused harmony exports dep, processRequestOptions, toFetchRequest, fetcherFactory, attachCallbacks, sendBeacon, ajax, fetch */
/* harmony import */ var _activities_activities_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./activities/activities.js */ "./src/activities/activities.js");
/* harmony import */ var _activities_activityParams_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./activities/activityParams.js */ "./src/activities/activityParams.js");
/* harmony import */ var _activities_rules_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./activities/rules.js */ "./src/activities/rules.js");
/* harmony import */ var _config_js__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ./config.js */ "./src/config.js");
/* harmony import */ var _hook_js__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ./hook.js */ "./src/hook.js");
/* harmony import */ var _utils_js__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! ./utils.js */ "./src/utils.js");






const dep = {
  fetch: window.fetch.bind(window),
  makeRequest: (r, o) => new Request(r, o),
  timeout(timeout, resource) {
    const ctl = new AbortController();
    let cancelTimer = setTimeout(() => {
      ctl.abort();
      (0,_utils_js__WEBPACK_IMPORTED_MODULE_5__.logError)("Request timeout after ".concat(timeout, "ms"), resource);
      cancelTimer = null;
    }, timeout);
    return {
      signal: ctl.signal,
      done() {
        cancelTimer && clearTimeout(cancelTimer);
      }
    };
  }
};
const GET = 'GET';
const POST = 'POST';
const CTYPE = 'Content-Type';
const processRequestOptions = (0,_hook_js__WEBPACK_IMPORTED_MODULE_4__.hook)('async', function () {
  let options = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
  let moduleType = arguments.length > 1 ? arguments[1] : undefined;
  let moduleName = arguments.length > 2 ? arguments[2] : undefined;
  if (options.withCredentials) {
    options.withCredentials = moduleType && moduleName ? (0,_activities_rules_js__WEBPACK_IMPORTED_MODULE_2__.isActivityAllowed)(_activities_activities_js__WEBPACK_IMPORTED_MODULE_0__.ACTIVITY_ACCESS_REQUEST_CREDENTIALS, (0,_activities_activityParams_js__WEBPACK_IMPORTED_MODULE_1__.activityParams)(moduleType, moduleName)) : (0,_utils_js__WEBPACK_IMPORTED_MODULE_5__.hasDeviceAccess)();
  }
  return options;
}, 'processRequestOptions');

/**
 * transform legacy `ajax` parameters into a fetch request.
 * @returns {Request}
 */
function toFetchRequest(url, data) {
  let options = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};
  const method = options.method || (data ? POST : GET);
  if (method === GET && data) {
    const urlInfo = (0,_utils_js__WEBPACK_IMPORTED_MODULE_5__.parseUrl)(url, options);
    Object.assign(urlInfo.search, data);
    url = (0,_utils_js__WEBPACK_IMPORTED_MODULE_5__.buildUrl)(urlInfo);
  }
  const headers = new Headers(options.customHeaders);
  headers.set(CTYPE, options.contentType || 'text/plain');
  const rqOpts = {
    method,
    headers
  };
  if (method !== GET && data) {
    rqOpts.body = data;
  }
  if (options.withCredentials) {
    rqOpts.credentials = 'include';
  }
  if (isSecureContext) {
    ['browsingTopics', 'adAuctionHeaders'].forEach(opt => {
      // the Request constructor will throw an exception if the browser supports topics/fledge
      // but we're not in a secure context
      if (options[opt]) {
        rqOpts[opt] = true;
      }
    });
    if (options.suppressTopicsEnrollmentWarning != null) {
      rqOpts.suppressTopicsEnrollmentWarning = options.suppressTopicsEnrollmentWarning;
    }
  }
  if (options.keepalive) {
    rqOpts.keepalive = true;
  }
  return dep.makeRequest(url, rqOpts);
}

/**
 * Return a version of `fetch` that automatically cancels requests after `timeout` milliseconds.
 *
 * If provided, `request` and `done` should be functions accepting a single argument.
 * `request` is invoked at the beginning of each request, and `done` at the end; both are passed its origin.
 *
 */
function fetcherFactory() {
  let timeout = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 3000;
  let {
    request,
    done
  } = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
  let moduleType = arguments.length > 2 ? arguments[2] : undefined;
  let moduleName = arguments.length > 3 ? arguments[3] : undefined;
  let fetcher = (resource, options) => {
    var _options, _to;
    let to;
    if (timeout != null && ((_options = options) === null || _options === void 0 ? void 0 : _options.signal) == null && !_config_js__WEBPACK_IMPORTED_MODULE_3__.config.getConfig('disableAjaxTimeout')) {
      to = dep.timeout(timeout, resource);
      options = Object.assign({
        signal: to.signal
      }, options);
    }
    processRequestOptions(options, moduleType, moduleName);
    let pm = dep.fetch(resource, options);
    if (((_to = to) === null || _to === void 0 ? void 0 : _to.done) != null) pm = pm.finally(to.done);
    return pm;
  };
  if (request != null || done != null) {
    fetcher = (fetch => function (resource, options) {
      const origin = new URL((resource === null || resource === void 0 ? void 0 : resource.url) == null ? resource : resource.url, document.location).origin;
      let req = fetch(resource, options);
      request && request(origin);
      if (done) req = req.finally(() => done(origin));
      return req;
    })(fetcher);
  }
  return fetcher;
}
function toXHR(_ref, responseText) {
  let {
    status,
    statusText = '',
    headers,
    url
  } = _ref;
  let xml;
  function getXML(onError) {
    if (xml === undefined) {
      try {
        var _headers$get;
        xml = new DOMParser().parseFromString(responseText, headers === null || headers === void 0 || (_headers$get = headers.get(CTYPE)) === null || _headers$get === void 0 || (_headers$get = _headers$get.split(';')) === null || _headers$get === void 0 ? void 0 : _headers$get[0]);
      } catch (e) {
        xml = null;
        onError && onError(e);
      }
    }
    return xml;
  }
  return {
    // eslint-disable-next-line no-restricted-globals
    readyState: XMLHttpRequest.DONE,
    status,
    statusText,
    responseText,
    response: responseText,
    responseType: '',
    responseURL: url,
    get responseXML() {
      return getXML(_utils_js__WEBPACK_IMPORTED_MODULE_5__.logError);
    },
    getResponseHeader: header => headers !== null && headers !== void 0 && headers.has(header) ? headers.get(header) : null,
    toJSON() {
      return Object.assign({
        responseXML: getXML()
      }, this);
    },
    timedOut: false
  };
}

/**
 * attach legacy `ajax` callbacks to a fetch promise.
 */
function attachCallbacks(fetchPm, callback) {
  const {
    success,
    error
  } = typeof callback === 'object' && callback != null ? callback : {
    success: typeof callback === 'function' ? callback : () => null,
    error: (e, x) => (0,_utils_js__WEBPACK_IMPORTED_MODULE_5__.logError)('Network error', e, x)
  };
  return fetchPm.then(response => response.text().then(responseText => [response, responseText])).then(_ref2 => {
    let [response, responseText] = _ref2;
    const xhr = toXHR(response, responseText);
    response.ok || response.status === 304 ? success(responseText, xhr) : error(response.statusText, xhr);
  }, reason => error('', Object.assign(toXHR({
    status: 0
  }, ''), {
    reason,
    timedOut: (reason === null || reason === void 0 ? void 0 : reason.name) === 'AbortError'
  })));
}
function ajaxBuilder() {
  let timeout = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 3000;
  let {
    request,
    done
  } = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
  let moduleType = arguments.length > 2 ? arguments[2] : undefined;
  let moduleName = arguments.length > 3 ? arguments[3] : undefined;
  const fetcher = fetcherFactory(timeout, {
    request,
    done
  }, moduleType, moduleName);
  return function (url, callback, data) {
    let options = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : {};
    attachCallbacks(fetcher(toFetchRequest(url, data, options)), callback);
  };
}

/**
 * simple wrapper around sendBeacon such that invocations of navigator.sendBeacon can be centrally maintained.
 * verifies that the navigator and sendBeacon are defined for maximum compatibility
 * @param {string} url The URL that will receive the data. Can be relative or absolute.
 * @param {*} data An ArrayBuffer, a TypedArray, a DataView, a Blob, a string literal or object, a FormData or a URLSearchParams object containing the data to send.
 * @returns {boolean} true if the user agent successfully queued the data for transfer. Otherwise, it returns false.
 */
function sendBeacon(url, data) {
  if (!window.navigator || !window.navigator.sendBeacon) {
    return false;
  }
  return window.navigator.sendBeacon(url, data);
}
const ajax = ajaxBuilder();
const fetch = fetcherFactory();


/***/ }),

/***/ "./src/auction.js":
/*!************************!*\
  !*** ./src/auction.js ***!
  \************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   AUCTION_COMPLETED: () => (/* binding */ AUCTION_COMPLETED),
/* harmony export */   addBidToAuction: () => (/* binding */ addBidToAuction),
/* harmony export */   getStandardBidderSettings: () => (/* binding */ getStandardBidderSettings),
/* harmony export */   newAuction: () => (/* binding */ newAuction)
/* harmony export */ });
/* unused harmony exports AUCTION_STARTED, AUCTION_IN_PROGRESS, resetAuctionState, beforeInitAuction, addBidResponse, responsesReady, addBidderRequests, bidsBackCallback, auctionCallbacks, callPrebidCache, getMediaTypeGranularity, getPriceGranularity, getPriceByGranularity, getCreativeId, getAdvertiserDomain, getDSP, getPrimaryCatId, getKeyValueTargetingPairs, adjustBids */
/* harmony import */ var _utils_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./utils.js */ "./src/utils.js");
/* harmony import */ var _utils_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./utils.js */ "./src/utils/objects.js");
/* harmony import */ var _cpmBucketManager_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./cpmBucketManager.js */ "./src/cpmBucketManager.js");
/* harmony import */ var _native_js__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ./native.js */ "./src/native.js");
/* harmony import */ var _videoCache_js__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ./videoCache.js */ "./src/videoCache.js");
/* harmony import */ var _Renderer_js__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! ./Renderer.js */ "./src/Renderer.js");
/* harmony import */ var _config_js__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(/*! ./config.js */ "./src/config.js");
/* harmony import */ var _userSync_js__WEBPACK_IMPORTED_MODULE_7__ = __webpack_require__(/*! ./userSync.js */ "./src/userSync.js");
/* harmony import */ var _hook_js__WEBPACK_IMPORTED_MODULE_8__ = __webpack_require__(/*! ./hook.js */ "./src/hook.js");
/* harmony import */ var _video_js__WEBPACK_IMPORTED_MODULE_9__ = __webpack_require__(/*! ./video.js */ "./src/video.js");
/* harmony import */ var _mediaTypes_js__WEBPACK_IMPORTED_MODULE_10__ = __webpack_require__(/*! ./mediaTypes.js */ "./src/mediaTypes.js");
/* harmony import */ var _auctionManager_js__WEBPACK_IMPORTED_MODULE_11__ = __webpack_require__(/*! ./auctionManager.js */ "./src/auctionManager.js");
/* harmony import */ var _bidderSettings_js__WEBPACK_IMPORTED_MODULE_12__ = __webpack_require__(/*! ./bidderSettings.js */ "./src/bidderSettings.js");
/* harmony import */ var _events_js__WEBPACK_IMPORTED_MODULE_13__ = __webpack_require__(/*! ./events.js */ "./src/events.js");
/* harmony import */ var _adapterManager_js__WEBPACK_IMPORTED_MODULE_14__ = __webpack_require__(/*! ./adapterManager.js */ "./src/adapterManager.js");
/* harmony import */ var _constants_js__WEBPACK_IMPORTED_MODULE_15__ = __webpack_require__(/*! ./constants.js */ "./src/constants.js");
/* harmony import */ var _utils_promise_js__WEBPACK_IMPORTED_MODULE_16__ = __webpack_require__(/*! ./utils/promise.js */ "./src/utils/promise.js");
/* harmony import */ var _utils_perfMetrics_js__WEBPACK_IMPORTED_MODULE_17__ = __webpack_require__(/*! ./utils/perfMetrics.js */ "./src/utils/perfMetrics.js");
/* harmony import */ var _utils_cpm_js__WEBPACK_IMPORTED_MODULE_18__ = __webpack_require__(/*! ./utils/cpm.js */ "./src/utils/cpm.js");
/* harmony import */ var _prebidGlobal_js__WEBPACK_IMPORTED_MODULE_19__ = __webpack_require__(/*! ./prebidGlobal.js */ "./src/prebidGlobal.js");
/* harmony import */ var _utils_ttlCollection_js__WEBPACK_IMPORTED_MODULE_20__ = __webpack_require__(/*! ./utils/ttlCollection.js */ "./src/utils/ttlCollection.js");
/* harmony import */ var _bidTTL_js__WEBPACK_IMPORTED_MODULE_21__ = __webpack_require__(/*! ./bidTTL.js */ "./src/bidTTL.js");





















const {
  syncUsers
} = _userSync_js__WEBPACK_IMPORTED_MODULE_7__.userSync;
const AUCTION_STARTED = 'started';
const AUCTION_IN_PROGRESS = 'inProgress';
const AUCTION_COMPLETED = 'completed';
// register event for bid adjustment
_events_js__WEBPACK_IMPORTED_MODULE_13__.on(_constants_js__WEBPACK_IMPORTED_MODULE_15__.EVENTS.BID_ADJUSTMENT, function (bid) {
  adjustBids(bid);
});
const MAX_REQUESTS_PER_ORIGIN = 4;
const outstandingRequests = {};
const sourceInfo = {};
const queuedCalls = [];
const pbjsInstance = (0,_prebidGlobal_js__WEBPACK_IMPORTED_MODULE_19__.getGlobal)();

/**
 * Clear global state for tests
 */
function resetAuctionState() {
  queuedCalls.length = 0;
  [outstandingRequests, sourceInfo].forEach(ob => Object.keys(ob).forEach(k => {
    delete ob[k];
  }));
}
const beforeInitAuction = (0,_hook_js__WEBPACK_IMPORTED_MODULE_8__.hook)('sync', auction => {});
function newAuction(_ref) {
  let {
    adUnits,
    adUnitCodes,
    callback,
    cbTimeout,
    labels,
    auctionId,
    ortb2Fragments,
    metrics
  } = _ref;
  metrics = (0,_utils_perfMetrics_js__WEBPACK_IMPORTED_MODULE_17__.useMetrics)(metrics);
  const _adUnits = adUnits;
  const _labels = labels;
  const _adUnitCodes = adUnitCodes;
  const _auctionId = auctionId || (0,_utils_js__WEBPACK_IMPORTED_MODULE_0__.generateUUID)();
  const _timeout = cbTimeout;
  const _timelyRequests = new Set();
  const done = (0,_utils_promise_js__WEBPACK_IMPORTED_MODULE_16__.defer)();
  const requestsDone = (0,_utils_promise_js__WEBPACK_IMPORTED_MODULE_16__.defer)();
  let _bidsRejected = [];
  let _callback = callback;
  let _bidderRequests = [];
  const _bidsReceived = (0,_utils_ttlCollection_js__WEBPACK_IMPORTED_MODULE_20__.ttlCollection)({
    startTime: bid => bid.responseTimestamp,
    ttl: bid => (0,_bidTTL_js__WEBPACK_IMPORTED_MODULE_21__.getMinBidCacheTTL)() == null ? null : Math.max((0,_bidTTL_js__WEBPACK_IMPORTED_MODULE_21__.getMinBidCacheTTL)(), bid.ttl) * 1000
  });
  let _noBids = [];
  let _winningBids = [];
  let _auctionStart;
  let _auctionEnd;
  let _timeoutTimer;
  let _auctionStatus;
  let _nonBids = [];
  (0,_bidTTL_js__WEBPACK_IMPORTED_MODULE_21__.onMinBidCacheTTLChange)(() => _bidsReceived.refresh());
  function addBidRequests(bidderRequests) {
    _bidderRequests = _bidderRequests.concat(bidderRequests);
  }
  function addBidReceived(bid) {
    _bidsReceived.add(bid);
  }
  function addBidRejected(bidsRejected) {
    _bidsRejected = _bidsRejected.concat(bidsRejected);
  }
  function addNoBid(noBid) {
    _noBids = _noBids.concat(noBid);
  }
  function addNonBids(seatnonbids) {
    _nonBids = _nonBids.concat(seatnonbids);
  }
  function getProperties() {
    return {
      auctionId: _auctionId,
      timestamp: _auctionStart,
      auctionEnd: _auctionEnd,
      auctionStatus: _auctionStatus,
      adUnits: _adUnits,
      adUnitCodes: _adUnitCodes,
      labels: _labels,
      bidderRequests: _bidderRequests,
      noBids: _noBids,
      bidsReceived: _bidsReceived.toArray(),
      bidsRejected: _bidsRejected,
      winningBids: _winningBids,
      timeout: _timeout,
      metrics: metrics,
      seatNonBids: _nonBids
    };
  }
  function startAuctionTimer() {
    _timeoutTimer = setTimeout(() => executeCallback(true), _timeout);
  }
  function executeCallback(timedOut) {
    if (!timedOut) {
      clearTimeout(_timeoutTimer);
    } else {
      _events_js__WEBPACK_IMPORTED_MODULE_13__.emit(_constants_js__WEBPACK_IMPORTED_MODULE_15__.EVENTS.AUCTION_TIMEOUT, getProperties());
    }
    if (_auctionEnd === undefined) {
      let timedOutRequests = [];
      if (timedOut) {
        (0,_utils_js__WEBPACK_IMPORTED_MODULE_0__.logMessage)("Auction ".concat(_auctionId, " timedOut"));
        timedOutRequests = _bidderRequests.filter(rq => !_timelyRequests.has(rq.bidderRequestId)).flatMap(br => br.bids);
        if (timedOutRequests.length) {
          _events_js__WEBPACK_IMPORTED_MODULE_13__.emit(_constants_js__WEBPACK_IMPORTED_MODULE_15__.EVENTS.BID_TIMEOUT, timedOutRequests);
        }
      }
      _auctionStatus = AUCTION_COMPLETED;
      _auctionEnd = Date.now();
      metrics.checkpoint('auctionEnd');
      metrics.timeBetween('requestBids', 'auctionEnd', 'requestBids.total');
      metrics.timeBetween('callBids', 'auctionEnd', 'requestBids.callBids');
      done.resolve();
      _events_js__WEBPACK_IMPORTED_MODULE_13__.emit(_constants_js__WEBPACK_IMPORTED_MODULE_15__.EVENTS.AUCTION_END, getProperties());
      bidsBackCallback(_adUnits, function () {
        try {
          if (_callback != null) {
            const bids = _bidsReceived.toArray().filter(bid => _adUnitCodes.includes(bid.adUnitCode)).reduce(groupByPlacement, {});
            _callback.apply(pbjsInstance, [bids, timedOut, _auctionId]);
            _callback = null;
          }
        } catch (e) {
          (0,_utils_js__WEBPACK_IMPORTED_MODULE_0__.logError)('Error executing bidsBackHandler', null, e);
        } finally {
          var _config$getConfig;
          // Calling timed out bidders
          if (timedOutRequests.length) {
            _adapterManager_js__WEBPACK_IMPORTED_MODULE_14__["default"].callTimedOutBidders(adUnits, timedOutRequests, _timeout);
          }
          // Only automatically sync if the publisher has not chosen to "enableOverride"
          const userSyncConfig = (_config$getConfig = _config_js__WEBPACK_IMPORTED_MODULE_6__.config.getConfig('userSync')) !== null && _config$getConfig !== void 0 ? _config$getConfig : {};
          if (!userSyncConfig.enableOverride) {
            // Delay the auto sync by the config delay
            syncUsers(userSyncConfig.syncDelay);
          }
        }
      });
    }
  }
  function auctionDone() {
    _config_js__WEBPACK_IMPORTED_MODULE_6__.config.resetBidder();
    // when all bidders have called done callback atleast once it means auction is complete
    (0,_utils_js__WEBPACK_IMPORTED_MODULE_0__.logInfo)("Bids Received for Auction with id: ".concat(_auctionId), _bidsReceived.toArray());
    _auctionStatus = AUCTION_COMPLETED;
    executeCallback(false);
  }
  function onTimelyResponse(bidderRequestId) {
    _timelyRequests.add(bidderRequestId);
  }
  function callBids() {
    _auctionStatus = AUCTION_STARTED;
    _auctionStart = Date.now();
    const bidRequests = metrics.measureTime('requestBids.makeRequests', () => _adapterManager_js__WEBPACK_IMPORTED_MODULE_14__["default"].makeBidRequests(_adUnits, _auctionStart, _auctionId, _timeout, _labels, ortb2Fragments, metrics));
    (0,_utils_js__WEBPACK_IMPORTED_MODULE_0__.logInfo)("Bids Requested for Auction with id: ".concat(_auctionId), bidRequests);
    metrics.checkpoint('callBids');
    if (bidRequests.length < 1) {
      (0,_utils_js__WEBPACK_IMPORTED_MODULE_0__.logWarn)('No valid bid requests returned for auction');
      auctionDone();
    } else {
      addBidderRequests.call({
        dispatch: addBidderRequestsCallback,
        context: this
      }, bidRequests);
    }
  }

  /**
   * callback executed after addBidderRequests completes
   * @param {BidRequest[]} bidRequests
   */
  function addBidderRequestsCallback(bidRequests) {
    bidRequests.forEach(bidRequest => {
      addBidRequests(bidRequest);
    });
    const requests = {};
    const call = {
      bidRequests,
      run: () => {
        beforeInitAuction(this);
        startAuctionTimer();
        _auctionStatus = AUCTION_IN_PROGRESS;
        _events_js__WEBPACK_IMPORTED_MODULE_13__.emit(_constants_js__WEBPACK_IMPORTED_MODULE_15__.EVENTS.AUCTION_INIT, getProperties());
        const callbacks = auctionCallbacks(auctionDone, this);
        _adapterManager_js__WEBPACK_IMPORTED_MODULE_14__["default"].callBids(_adUnits, bidRequests, callbacks.addBidResponse, callbacks.adapterDone, {
          request(source, origin) {
            increment(outstandingRequests, origin);
            increment(requests, source);
            if (!sourceInfo[source]) {
              sourceInfo[source] = {
                SRA: true,
                origin
              };
            }
            if (requests[source] > 1) {
              sourceInfo[source].SRA = false;
            }
          },
          done(origin) {
            outstandingRequests[origin]--;
            if (queuedCalls[0]) {
              if (runIfOriginHasCapacity(queuedCalls[0])) {
                queuedCalls.shift();
              }
            }
          }
        }, _timeout, onTimelyResponse, ortb2Fragments);
        requestsDone.resolve();
      }
    };
    if (!runIfOriginHasCapacity(call)) {
      (0,_utils_js__WEBPACK_IMPORTED_MODULE_0__.logWarn)('queueing auction due to limited endpoint capacity');
      queuedCalls.push(call);
    }
    function runIfOriginHasCapacity(call) {
      let hasCapacity = true;
      const maxRequests = _config_js__WEBPACK_IMPORTED_MODULE_6__.config.getConfig('maxRequestsPerOrigin') || MAX_REQUESTS_PER_ORIGIN;
      call.bidRequests.some(bidRequest => {
        let requests = 1;
        const source = typeof bidRequest.src !== 'undefined' && bidRequest.src === _constants_js__WEBPACK_IMPORTED_MODULE_15__.S2S.SRC ? 's2s' : bidRequest.bidderCode;
        // if we have no previous info on this source just let them through
        if (sourceInfo[source]) {
          if (sourceInfo[source].SRA === false) {
            // some bidders might use more than the MAX_REQUESTS_PER_ORIGIN in a single auction.  In those cases
            // set their request count to MAX_REQUESTS_PER_ORIGIN so the auction isn't permanently queued waiting
            // for capacity for that bidder
            requests = Math.min(bidRequest.bids.length, maxRequests);
          }
          if (outstandingRequests[sourceInfo[source].origin] + requests > maxRequests) {
            hasCapacity = false;
          }
        }
        // return only used for terminating this .some() iteration early if it is determined we don't have capacity
        return !hasCapacity;
      });
      if (hasCapacity) {
        call.run();
      }
      return hasCapacity;
    }
    function increment(obj, prop) {
      if (typeof obj[prop] === 'undefined') {
        obj[prop] = 1;
      } else {
        obj[prop]++;
      }
    }
  }
  function addWinningBid(winningBid) {
    _winningBids = _winningBids.concat(winningBid);
    _adapterManager_js__WEBPACK_IMPORTED_MODULE_14__["default"].callBidWonBidder(winningBid.adapterCode || winningBid.bidder, winningBid, adUnits);
    if (!winningBid.deferBilling) {
      _adapterManager_js__WEBPACK_IMPORTED_MODULE_14__["default"].triggerBilling(winningBid);
    }
  }
  function setBidTargeting(bid) {
    _adapterManager_js__WEBPACK_IMPORTED_MODULE_14__["default"].callSetTargetingBidder(bid.adapterCode || bid.bidder, bid);
  }
  _events_js__WEBPACK_IMPORTED_MODULE_13__.on(_constants_js__WEBPACK_IMPORTED_MODULE_15__.EVENTS.SEAT_NON_BID, event => {
    if (event.auctionId === _auctionId) {
      addNonBids(event.seatnonbid);
    }
  });
  return {
    addBidReceived,
    addBidRejected,
    addNoBid,
    callBids,
    addWinningBid,
    setBidTargeting,
    getWinningBids: () => _winningBids,
    getAuctionStart: () => _auctionStart,
    getAuctionEnd: () => _auctionEnd,
    getTimeout: () => _timeout,
    getAuctionId: () => _auctionId,
    getAuctionStatus: () => _auctionStatus,
    getAdUnits: () => _adUnits,
    getAdUnitCodes: () => _adUnitCodes,
    getBidRequests: () => _bidderRequests,
    getBidsReceived: () => _bidsReceived.toArray(),
    getNoBids: () => _noBids,
    getNonBids: () => _nonBids,
    getFPD: () => ortb2Fragments,
    getMetrics: () => metrics,
    end: done.promise,
    requestsDone: requestsDone.promise,
    getProperties
  };
}
/**
 * Hook into this to intercept bids before they are added to an auction.
 */
const addBidResponse = (0,_hook_js__WEBPACK_IMPORTED_MODULE_8__.ignoreCallbackArg)((0,_hook_js__WEBPACK_IMPORTED_MODULE_8__.hook)('async', function (adUnitCode, bid, reject) {
  if (!isValidPrice(bid)) {
    reject(_constants_js__WEBPACK_IMPORTED_MODULE_15__.REJECTION_REASON.PRICE_TOO_HIGH);
  } else {
    this.dispatch.call(null, adUnitCode, bid);
  }
}, 'addBidResponse'));

/**
 * Delay hook for adapter responses.
 *
 * `ready` is a promise; auctions wait for it to resolve before closing. Modules can hook into this
 * to delay the end of auctions while they perform initialization that does not need to delay their start.
 */
const responsesReady = (0,_hook_js__WEBPACK_IMPORTED_MODULE_8__.hook)('sync', ready => ready, 'responsesReady');
const addBidderRequests = (0,_hook_js__WEBPACK_IMPORTED_MODULE_8__.hook)('sync', function (bidderRequests) {
  this.dispatch.call(this.context, bidderRequests);
}, 'addBidderRequests');
const bidsBackCallback = (0,_hook_js__WEBPACK_IMPORTED_MODULE_8__.hook)('async', function (adUnits, callback) {
  if (callback) {
    callback();
  }
}, 'bidsBackCallback');
function auctionCallbacks(auctionDone, auctionInstance) {
  let {
    index = _auctionManager_js__WEBPACK_IMPORTED_MODULE_11__.auctionManager.index
  } = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};
  let outstandingBidsAdded = 0;
  let allAdapterCalledDone = false;
  const bidderRequestsDone = new Set();
  const bidResponseMap = {};
  function afterBidAdded() {
    outstandingBidsAdded--;
    if (allAdapterCalledDone && outstandingBidsAdded === 0) {
      auctionDone();
    }
  }
  function handleBidResponse(adUnitCode, bid, handler) {
    bidResponseMap[bid.requestId] = true;
    addCommonResponseProperties(bid, adUnitCode);
    outstandingBidsAdded++;
    return handler(afterBidAdded);
  }
  function acceptBidResponse(adUnitCode, bid) {
    handleBidResponse(adUnitCode, bid, done => {
      const bidResponse = getPreparedBidForAuction(bid);
      _events_js__WEBPACK_IMPORTED_MODULE_13__.emit(_constants_js__WEBPACK_IMPORTED_MODULE_15__.EVENTS.BID_ACCEPTED, bidResponse);
      if ( true && bidResponse.mediaType === _mediaTypes_js__WEBPACK_IMPORTED_MODULE_10__.VIDEO ||  true && bidResponse.mediaType === _mediaTypes_js__WEBPACK_IMPORTED_MODULE_10__.AUDIO) {
        tryAddVideoAudioBid(auctionInstance, bidResponse, done);
      } else {
        if ( true && (0,_native_js__WEBPACK_IMPORTED_MODULE_3__.isNativeResponse)(bidResponse)) {
          (0,_native_js__WEBPACK_IMPORTED_MODULE_3__.setNativeResponseProperties)(bidResponse, index.getAdUnit(bidResponse));
        }
        addBidToAuction(auctionInstance, bidResponse);
        done();
      }
    });
  }
  function rejectBidResponse(adUnitCode, bid, reason) {
    return handleBidResponse(adUnitCode, bid, done => {
      bid.rejectionReason = reason;
      (0,_utils_js__WEBPACK_IMPORTED_MODULE_0__.logWarn)("Bid from ".concat(bid.bidder || 'unknown bidder', " was rejected: ").concat(reason), bid);
      _events_js__WEBPACK_IMPORTED_MODULE_13__.emit(_constants_js__WEBPACK_IMPORTED_MODULE_15__.EVENTS.BID_REJECTED, bid);
      auctionInstance.addBidRejected(bid);
      done();
    });
  }
  function adapterDone() {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const bidderRequest = this;
    let bidderRequests = auctionInstance.getBidRequests();
    const auctionOptionsConfig = _config_js__WEBPACK_IMPORTED_MODULE_6__.config.getConfig('auctionOptions');
    bidderRequestsDone.add(bidderRequest);
    if (auctionOptionsConfig && !(0,_utils_js__WEBPACK_IMPORTED_MODULE_0__.isEmpty)(auctionOptionsConfig)) {
      const secondaryBidders = auctionOptionsConfig.secondaryBidders;
      if (secondaryBidders && !bidderRequests.every(bidder => secondaryBidders.includes(bidder.bidderCode))) {
        bidderRequests = bidderRequests.filter(request => !secondaryBidders.includes(request.bidderCode));
      }
    }
    allAdapterCalledDone = bidderRequests.every(bidderRequest => bidderRequestsDone.has(bidderRequest));
    bidderRequest.bids.forEach(bid => {
      if (!bidResponseMap[bid.bidId]) {
        auctionInstance.addNoBid(bid);
        _events_js__WEBPACK_IMPORTED_MODULE_13__.emit(_constants_js__WEBPACK_IMPORTED_MODULE_15__.EVENTS.NO_BID, bid);
      }
    });
    if (allAdapterCalledDone && outstandingBidsAdded === 0) {
      auctionDone();
    }
  }
  return {
    addBidResponse: function () {
      function addBid(adUnitCode, bid) {
        addBidResponse.call({
          dispatch: acceptBidResponse
        }, adUnitCode, bid, (() => {
          let rejected = false;
          return reason => {
            if (!rejected) {
              rejectBidResponse(adUnitCode, bid, reason);
              rejected = true;
            }
          };
        })());
      }
      addBid.reject = rejectBidResponse;
      return addBid;
    }(),
    adapterDone: function () {
      responsesReady(_utils_promise_js__WEBPACK_IMPORTED_MODULE_16__.PbPromise.resolve()).finally(() => adapterDone.call(this));
    }
  };
}

// Add a bid to the auction.
function addBidToAuction(auctionInstance, bidResponse) {
  setupBidTargeting(bidResponse);
  (0,_utils_perfMetrics_js__WEBPACK_IMPORTED_MODULE_17__.useMetrics)(bidResponse.metrics).timeSince('addBidResponse', 'addBidResponse.total');
  auctionInstance.addBidReceived(bidResponse);
  _events_js__WEBPACK_IMPORTED_MODULE_13__.emit(_constants_js__WEBPACK_IMPORTED_MODULE_15__.EVENTS.BID_RESPONSE, bidResponse);
}

// Video bids may fail if the cache is down, or there's trouble on the network.
function tryAddVideoAudioBid(auctionInstance, bidResponse, afterBidAdded) {
  var _index$getMediaTypes;
  let {
    index = _auctionManager_js__WEBPACK_IMPORTED_MODULE_11__.auctionManager.index
  } = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : {};
  let addBid = true;
  const videoMediaType = (_index$getMediaTypes = index.getMediaTypes({
    requestId: bidResponse.originalRequestId || bidResponse.requestId,
    adUnitId: bidResponse.adUnitId
  })) === null || _index$getMediaTypes === void 0 ? void 0 : _index$getMediaTypes.video;
  const context = videoMediaType && (videoMediaType === null || videoMediaType === void 0 ? void 0 : videoMediaType.context);
  const useCacheKey = videoMediaType && (videoMediaType === null || videoMediaType === void 0 ? void 0 : videoMediaType.useCacheKey);
  const {
    useLocal,
    url: cacheUrl,
    ignoreBidderCacheKey
  } = _config_js__WEBPACK_IMPORTED_MODULE_6__.config.getConfig('cache') || {};
  if (useLocal) {
    // stores video/audio bid vast as local blob in the browser
    (0,_videoCache_js__WEBPACK_IMPORTED_MODULE_4__.storeLocally)(bidResponse);
  } else if (cacheUrl && (useCacheKey || context !== _video_js__WEBPACK_IMPORTED_MODULE_9__.OUTSTREAM)) {
    if (!bidResponse.videoCacheKey || ignoreBidderCacheKey) {
      addBid = false;
      callPrebidCache(auctionInstance, bidResponse, afterBidAdded, videoMediaType);
    } else if (!bidResponse.vastUrl) {
      (0,_utils_js__WEBPACK_IMPORTED_MODULE_0__.logError)('videoCacheKey specified but not required vastUrl for video bid');
      addBid = false;
    }
  }
  if (addBid) {
    addBidToAuction(auctionInstance, bidResponse);
    afterBidAdded();
  }
}
const callPrebidCache = (0,_hook_js__WEBPACK_IMPORTED_MODULE_8__.hook)('async', function (auctionInstance, bidResponse, afterBidAdded, videoMediaType) {
  if (true) {
    (0,_videoCache_js__WEBPACK_IMPORTED_MODULE_4__.batchAndStore)(auctionInstance, bidResponse, afterBidAdded);
  }
}, 'callPrebidCache');
/**
 * Augment `bidResponse` with properties that are common across all bids - including rejected bids.
 */
function addCommonResponseProperties(bidResponse, adUnitCode) {
  let {
    index = _auctionManager_js__WEBPACK_IMPORTED_MODULE_11__.auctionManager.index
  } = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};
  const bidderRequest = index.getBidderRequest(bidResponse);
  const adUnit = index.getAdUnit(bidResponse);
  const start = bidderRequest && bidderRequest.start || bidResponse.requestTimestamp;
  Object.assign(bidResponse, {
    responseTimestamp: bidResponse.responseTimestamp || (0,_utils_js__WEBPACK_IMPORTED_MODULE_0__.timestamp)(),
    requestTimestamp: bidResponse.requestTimestamp || start,
    cpm: parseFloat(bidResponse.cpm) || 0,
    bidder: bidResponse.bidder || bidResponse.bidderCode,
    adUnitCode
  });
  if ((adUnit === null || adUnit === void 0 ? void 0 : adUnit.ttlBuffer) != null) {
    bidResponse.ttlBuffer = adUnit.ttlBuffer;
  }
  bidResponse.timeToRespond = bidResponse.responseTimestamp - bidResponse.requestTimestamp;
}

/**
 * Add additional bid response properties that are universal for all _accepted_ bids.
 */
function getPreparedBidForAuction(bid) {
  var _adUnit$ortb2Imp, _index$getBidRequest;
  let {
    index = _auctionManager_js__WEBPACK_IMPORTED_MODULE_11__.auctionManager.index
  } = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
  // Let listeners know that now is the time to adjust the bid, if they want to.
  //
  // CAREFUL: Publishers rely on certain bid properties to be available (like cpm),
  // but others to not be set yet (like priceStrings). See #1372 and #1389.
  _events_js__WEBPACK_IMPORTED_MODULE_13__.emit(_constants_js__WEBPACK_IMPORTED_MODULE_15__.EVENTS.BID_ADJUSTMENT, bid);
  const adUnit = index.getAdUnit(bid);
  bid.instl = (adUnit === null || adUnit === void 0 || (_adUnit$ortb2Imp = adUnit.ortb2Imp) === null || _adUnit$ortb2Imp === void 0 ? void 0 : _adUnit$ortb2Imp.instl) === 1;

  // a publisher-defined renderer can be used to render bids
  const bidRenderer = ((_index$getBidRequest = index.getBidRequest(bid)) === null || _index$getBidRequest === void 0 ? void 0 : _index$getBidRequest.renderer) || adUnit.renderer;

  // a publisher can also define a renderer for a mediaType
  const bidObjectMediaType = bid.mediaType;
  const mediaTypes = index.getMediaTypes(bid);
  const bidMediaType = mediaTypes && mediaTypes[bidObjectMediaType];
  var mediaTypeRenderer = bidMediaType && bidMediaType.renderer;
  var renderer = null;

  // the renderer for the mediaType takes precendence
  if (mediaTypeRenderer && mediaTypeRenderer.render && !(mediaTypeRenderer.backupOnly === true && bid.renderer)) {
    renderer = mediaTypeRenderer;
  } else if (bidRenderer && bidRenderer.render && !(bidRenderer.backupOnly === true && bid.renderer)) {
    renderer = bidRenderer;
  }
  if (renderer) {
    // be aware, an adapter could already have installed the bidder, in which case this overwrite's the existing adapter
    bid.renderer = _Renderer_js__WEBPACK_IMPORTED_MODULE_5__.Renderer.install({
      url: renderer.url,
      config: renderer.options,
      renderNow: renderer.url == null
    }); // rename options to config, to make it consistent?
    bid.renderer.setRender(renderer.render);
  }

  // Use the config value 'mediaTypeGranularity' if it has been defined for mediaType, else use 'customPriceBucket'
  const mediaTypeGranularity = getMediaTypeGranularity(bid.mediaType, mediaTypes, _config_js__WEBPACK_IMPORTED_MODULE_6__.config.getConfig('mediaTypePriceGranularity'));
  const priceStringsObj = (0,_cpmBucketManager_js__WEBPACK_IMPORTED_MODULE_2__.getPriceBucketString)(bid.cpm, typeof mediaTypeGranularity === 'object' ? mediaTypeGranularity : _config_js__WEBPACK_IMPORTED_MODULE_6__.config.getConfig('customPriceBucket'), _config_js__WEBPACK_IMPORTED_MODULE_6__.config.getConfig('currency.granularityMultiplier'));
  bid.pbLg = priceStringsObj.low;
  bid.pbMg = priceStringsObj.med;
  bid.pbHg = priceStringsObj.high;
  bid.pbAg = priceStringsObj.auto;
  bid.pbDg = priceStringsObj.dense;
  bid.pbCg = priceStringsObj.custom;
  return bid;
}
function setupBidTargeting(bidObject) {
  let keyValues;
  const cpmCheck = _bidderSettings_js__WEBPACK_IMPORTED_MODULE_12__.bidderSettings.get(bidObject.bidderCode, 'allowZeroCpmBids') === true ? bidObject.cpm >= 0 : bidObject.cpm > 0;
  if (bidObject.bidderCode && (cpmCheck || bidObject.dealId)) {
    keyValues = getKeyValueTargetingPairs(bidObject.bidderCode, bidObject);
  }

  // use any targeting provided as defaults, otherwise just set from getKeyValueTargetingPairs
  bidObject.adserverTargeting = Object.assign(bidObject.adserverTargeting || {}, keyValues);
}
function getMediaTypeGranularity(mediaType, mediaTypes, mediaTypePriceGranularity) {
  if (mediaType && mediaTypePriceGranularity) {
    if ( true && mediaType === _mediaTypes_js__WEBPACK_IMPORTED_MODULE_10__.VIDEO) {
      var _mediaTypes$VIDEO$con, _mediaTypes$VIDEO;
      const context = (_mediaTypes$VIDEO$con = mediaTypes === null || mediaTypes === void 0 || (_mediaTypes$VIDEO = mediaTypes[_mediaTypes_js__WEBPACK_IMPORTED_MODULE_10__.VIDEO]) === null || _mediaTypes$VIDEO === void 0 ? void 0 : _mediaTypes$VIDEO.context) !== null && _mediaTypes$VIDEO$con !== void 0 ? _mediaTypes$VIDEO$con : 'instream';
      if (mediaTypePriceGranularity["".concat(_mediaTypes_js__WEBPACK_IMPORTED_MODULE_10__.VIDEO, "-").concat(context)]) {
        return mediaTypePriceGranularity["".concat(_mediaTypes_js__WEBPACK_IMPORTED_MODULE_10__.VIDEO, "-").concat(context)];
      }
    }
    return mediaTypePriceGranularity[mediaType];
  }
}

/**
 * This function returns the price granularity defined. It can be either publisher defined or default value
 * @param {Bid} bid bid response object
 * @param {object} obj
 * @param {object} obj.index
 * @returns {string} granularity
 */
const getPriceGranularity = function (bid) {
  let {
    index = _auctionManager_js__WEBPACK_IMPORTED_MODULE_11__.auctionManager.index
  } = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
  // Use the config value 'mediaTypeGranularity' if it has been set for mediaType, else use 'priceGranularity'
  const mediaTypeGranularity = getMediaTypeGranularity(bid.mediaType, index.getMediaTypes(bid), _config_js__WEBPACK_IMPORTED_MODULE_6__.config.getConfig('mediaTypePriceGranularity'));
  const granularity = typeof bid.mediaType === 'string' && mediaTypeGranularity ? typeof mediaTypeGranularity === 'string' ? mediaTypeGranularity : 'custom' : _config_js__WEBPACK_IMPORTED_MODULE_6__.config.getConfig('priceGranularity');
  return granularity;
};

/**
 * This function returns a function to get bid price by price granularity
 * @param {string} granularity
 * @returns {function}
 */
const getPriceByGranularity = granularity => {
  return bid => {
    const bidGranularity = granularity || getPriceGranularity(bid);
    if (bidGranularity === _constants_js__WEBPACK_IMPORTED_MODULE_15__.GRANULARITY_OPTIONS.AUTO) {
      return bid.pbAg;
    } else if (bidGranularity === _constants_js__WEBPACK_IMPORTED_MODULE_15__.GRANULARITY_OPTIONS.DENSE) {
      return bid.pbDg;
    } else if (bidGranularity === _constants_js__WEBPACK_IMPORTED_MODULE_15__.GRANULARITY_OPTIONS.LOW) {
      return bid.pbLg;
    } else if (bidGranularity === _constants_js__WEBPACK_IMPORTED_MODULE_15__.GRANULARITY_OPTIONS.MEDIUM) {
      return bid.pbMg;
    } else if (bidGranularity === _constants_js__WEBPACK_IMPORTED_MODULE_15__.GRANULARITY_OPTIONS.HIGH) {
      return bid.pbHg;
    } else if (bidGranularity === _constants_js__WEBPACK_IMPORTED_MODULE_15__.GRANULARITY_OPTIONS.CUSTOM) {
      return bid.pbCg;
    }
  };
};

/**
 * This function returns a function to get crid from bid response
 * @returns {function}
 */
const getCreativeId = () => {
  return bid => {
    return bid.creativeId ? bid.creativeId : '';
  };
};

/**
 * This function returns a function to get first advertiser domain from bid response meta
 * @returns {function}
 */
const getAdvertiserDomain = () => {
  return bid => {
    return bid.meta && bid.meta.advertiserDomains && bid.meta.advertiserDomains.length > 0 ? [bid.meta.advertiserDomains].flat()[0] : '';
  };
};

/**
 * This function returns a function to get dsp name or id from bid response meta
 * @returns {function}
 */
const getDSP = () => {
  return bid => {
    var _bid$meta, _bid$meta2;
    return bid.meta && (bid.meta.networkId || bid.meta.networkName) ? (bid === null || bid === void 0 || (_bid$meta = bid.meta) === null || _bid$meta === void 0 ? void 0 : _bid$meta.networkName) || (bid === null || bid === void 0 || (_bid$meta2 = bid.meta) === null || _bid$meta2 === void 0 ? void 0 : _bid$meta2.networkId) : '';
  };
};

/**
 * This function returns a function to get the primary category id from bid response meta
 * @returns {function}
 */
const getPrimaryCatId = () => {
  return bid => {
    var _bid$meta3;
    const catId = bid === null || bid === void 0 || (_bid$meta3 = bid.meta) === null || _bid$meta3 === void 0 ? void 0 : _bid$meta3.primaryCatId;
    if (Array.isArray(catId)) {
      return catId[0] || '';
    }
    return catId || '';
  };
};
function createKeyVal(key, value) {
  return {
    key,
    val: typeof value === 'function' ? function (bidResponse, bidReq) {
      return value(bidResponse, bidReq);
    } : function (bidResponse) {
      return bidResponse[value];
    }
  };
}
function defaultAdserverTargeting() {
  return [createKeyVal(_constants_js__WEBPACK_IMPORTED_MODULE_15__.TARGETING_KEYS.BIDDER, 'bidderCode'), createKeyVal(_constants_js__WEBPACK_IMPORTED_MODULE_15__.TARGETING_KEYS.AD_ID, 'adId'), createKeyVal(_constants_js__WEBPACK_IMPORTED_MODULE_15__.TARGETING_KEYS.PRICE_BUCKET, getPriceByGranularity()), createKeyVal(_constants_js__WEBPACK_IMPORTED_MODULE_15__.TARGETING_KEYS.SIZE, 'size'), createKeyVal(_constants_js__WEBPACK_IMPORTED_MODULE_15__.TARGETING_KEYS.DEAL, 'dealId'), createKeyVal(_constants_js__WEBPACK_IMPORTED_MODULE_15__.TARGETING_KEYS.SOURCE, 'source'), createKeyVal(_constants_js__WEBPACK_IMPORTED_MODULE_15__.TARGETING_KEYS.FORMAT, 'mediaType'), createKeyVal(_constants_js__WEBPACK_IMPORTED_MODULE_15__.TARGETING_KEYS.ADOMAIN, getAdvertiserDomain()), createKeyVal(_constants_js__WEBPACK_IMPORTED_MODULE_15__.TARGETING_KEYS.ACAT, getPrimaryCatId()), createKeyVal(_constants_js__WEBPACK_IMPORTED_MODULE_15__.TARGETING_KEYS.DSP, getDSP()), createKeyVal(_constants_js__WEBPACK_IMPORTED_MODULE_15__.TARGETING_KEYS.CRID, getCreativeId())];
}

/**
 * @param {string} mediaType
 * @param {string} bidderCode
 * @returns {*}
 */
function getStandardBidderSettings(mediaType, bidderCode) {
  const standardSettings = Object.assign({}, _bidderSettings_js__WEBPACK_IMPORTED_MODULE_12__.bidderSettings.settingsFor(null));
  if (!standardSettings[_constants_js__WEBPACK_IMPORTED_MODULE_15__.JSON_MAPPING.ADSERVER_TARGETING]) {
    standardSettings[_constants_js__WEBPACK_IMPORTED_MODULE_15__.JSON_MAPPING.ADSERVER_TARGETING] = defaultAdserverTargeting();
  }
  if ( true && mediaType === 'video') {
    const adserverTargeting = standardSettings[_constants_js__WEBPACK_IMPORTED_MODULE_15__.JSON_MAPPING.ADSERVER_TARGETING].slice();
    standardSettings[_constants_js__WEBPACK_IMPORTED_MODULE_15__.JSON_MAPPING.ADSERVER_TARGETING] = adserverTargeting;

    // Adding hb_uuid + hb_cache_id
    [_constants_js__WEBPACK_IMPORTED_MODULE_15__.TARGETING_KEYS.UUID, _constants_js__WEBPACK_IMPORTED_MODULE_15__.TARGETING_KEYS.CACHE_ID].forEach(targetingKeyVal => {
      if (typeof adserverTargeting.find(kvPair => kvPair.key === targetingKeyVal) === 'undefined') {
        adserverTargeting.push(createKeyVal(targetingKeyVal, 'videoCacheKey'));
      }
    });

    // Adding hb_cache_host
    if (_config_js__WEBPACK_IMPORTED_MODULE_6__.config.getConfig('cache.url') && (!bidderCode || _bidderSettings_js__WEBPACK_IMPORTED_MODULE_12__.bidderSettings.get(bidderCode, 'sendStandardTargeting') !== false)) {
      const urlInfo = (0,_utils_js__WEBPACK_IMPORTED_MODULE_0__.parseUrl)(_config_js__WEBPACK_IMPORTED_MODULE_6__.config.getConfig('cache.url'));
      if (typeof adserverTargeting.find(targetingKeyVal => targetingKeyVal.key === _constants_js__WEBPACK_IMPORTED_MODULE_15__.TARGETING_KEYS.CACHE_HOST) === 'undefined') {
        adserverTargeting.push(createKeyVal(_constants_js__WEBPACK_IMPORTED_MODULE_15__.TARGETING_KEYS.CACHE_HOST, function (bidResponse) {
          var _bidResponse$adserver;
          return (bidResponse === null || bidResponse === void 0 || (_bidResponse$adserver = bidResponse.adserverTargeting) === null || _bidResponse$adserver === void 0 ? void 0 : _bidResponse$adserver[_constants_js__WEBPACK_IMPORTED_MODULE_15__.TARGETING_KEYS.CACHE_HOST]) || urlInfo.hostname;
        }));
      }
    }
  }
  return standardSettings;
}
function getKeyValueTargetingPairs(bidderCode, custBidObj) {
  let {
    index = _auctionManager_js__WEBPACK_IMPORTED_MODULE_11__.auctionManager.index
  } = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};
  if (!custBidObj) {
    return {};
  }
  const bidRequest = index.getBidRequest(custBidObj);
  var keyValues = {};

  // 1) set the keys from "standard" setting or from prebid defaults
  // initialize default if not set
  const standardSettings = getStandardBidderSettings(custBidObj.mediaType, bidderCode);
  setKeys(keyValues, standardSettings, custBidObj, bidRequest);

  // 2) set keys from specific bidder setting override if they exist
  if (bidderCode && _bidderSettings_js__WEBPACK_IMPORTED_MODULE_12__.bidderSettings.getOwn(bidderCode, _constants_js__WEBPACK_IMPORTED_MODULE_15__.JSON_MAPPING.ADSERVER_TARGETING)) {
    setKeys(keyValues, _bidderSettings_js__WEBPACK_IMPORTED_MODULE_12__.bidderSettings.ownSettingsFor(bidderCode), custBidObj, bidRequest);
    custBidObj.sendStandardTargeting = _bidderSettings_js__WEBPACK_IMPORTED_MODULE_12__.bidderSettings.get(bidderCode, 'sendStandardTargeting');
  }
  return keyValues;
}
function setKeys(keyValues, bidderSettings, custBidObj, bidReq) {
  var targeting = bidderSettings[_constants_js__WEBPACK_IMPORTED_MODULE_15__.JSON_MAPPING.ADSERVER_TARGETING];
  custBidObj.size = custBidObj.getSize();
  (targeting || []).forEach(function (kvPair) {
    var key = kvPair.key;
    var value = kvPair.val;
    if (keyValues[key]) {
      (0,_utils_js__WEBPACK_IMPORTED_MODULE_0__.logWarn)('The key: ' + key + ' is being overwritten');
    }
    if ((0,_utils_js__WEBPACK_IMPORTED_MODULE_1__.isFn)(value)) {
      try {
        value = value(custBidObj, bidReq);
      } catch (e) {
        (0,_utils_js__WEBPACK_IMPORTED_MODULE_0__.logError)('bidmanager', 'ERROR', e);
      }
    }
    if ((typeof bidderSettings.suppressEmptyKeys !== 'undefined' && bidderSettings.suppressEmptyKeys === true || key === _constants_js__WEBPACK_IMPORTED_MODULE_15__.TARGETING_KEYS.DEAL || key === _constants_js__WEBPACK_IMPORTED_MODULE_15__.TARGETING_KEYS.ACAT || key === _constants_js__WEBPACK_IMPORTED_MODULE_15__.TARGETING_KEYS.DSP || key === _constants_js__WEBPACK_IMPORTED_MODULE_15__.TARGETING_KEYS.CRID) && (
    // hb_deal & hb_acat are suppressed automatically if not set

    (0,_utils_js__WEBPACK_IMPORTED_MODULE_0__.isEmptyStr)(value) || value === null || value === undefined)) {
      (0,_utils_js__WEBPACK_IMPORTED_MODULE_0__.logInfo)("suppressing empty key '" + key + "' from adserver targeting");
    } else {
      keyValues[key] = value;
    }
  });
  return keyValues;
}
function adjustBids(bid) {
  const bidPriceAdjusted = (0,_utils_cpm_js__WEBPACK_IMPORTED_MODULE_18__.adjustCpm)(bid.cpm, bid);
  if (bidPriceAdjusted >= 0) {
    bid.cpm = bidPriceAdjusted;
  }
}

/**
 * groupByPlacement is a reduce function that converts an array of Bid objects
 * to an object with placement codes as keys, with each key representing an object
 * with an array of `Bid` objects for that placement
 * @returns {*} as { [adUnitCode]: { bids: [Bid, Bid, Bid] } }
 */
function groupByPlacement(bidsByPlacement, bid) {
  if (!bidsByPlacement[bid.adUnitCode]) {
    bidsByPlacement[bid.adUnitCode] = {
      bids: []
    };
  }
  bidsByPlacement[bid.adUnitCode].bids.push(bid);
  return bidsByPlacement;
}

/**
 * isValidPrice is price validation function
 * which checks if price from bid response
 * is not higher than top limit set in config
 * @type {Function}
 * @param bid
 * @returns {boolean}
 */
function isValidPrice(bid) {
  const maxBidValue = _config_js__WEBPACK_IMPORTED_MODULE_6__.config.getConfig('maxBid');
  if (!maxBidValue || !bid.cpm) return true;
  return maxBidValue >= Number(bid.cpm);
}


/***/ }),

/***/ "./src/auctionIndex.js":
/*!*****************************!*\
  !*** ./src/auctionIndex.js ***!
  \*****************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   AuctionIndex: () => (/* binding */ AuctionIndex)
/* harmony export */ });
/**
 * @typedef {Object} AuctionIndex
 *
 * @property {function({ auctionId?: * }): *} getAuction Returns auction instance for `auctionId`
 * @property {function({ adUnitId?: * }): *} getAdUnit Returns `adUnit` object for `transactionId`.
 * You should prefer `getMediaTypes` for looking up bid media types.
 * @property {function({ adUnitId?: *, requestId?: * }): *} getMediaTypes Returns mediaTypes object from bidRequest (through `requestId`) falling back to the adUnit (through `transactionId`).
 * The bidRequest is given precedence because its mediaTypes can differ from the adUnit's (if bidder-specific labels are in use).
 * Bids that have no associated request do not have labels either, and use the adUnit's mediaTypes.
 * @property {function({ requestId?: *, bidderRequestId?: * }): *} getBidderRequest Returns bidderRequest that matches both requestId and bidderRequestId (if either or both are provided).
 * Bid responses are not guaranteed to have a corresponding request.
 * @property {function({ requestId?: string }): *} getBidRequest Returns bidRequest object for requestId.
 * Bid responses are not guaranteed to have a corresponding request.
 */

/**
 * Retrieves request-related bid data.
 * All methods are designed to work with Bid (response) objects returned by bid adapters.
 */
function AuctionIndex(getAuctions) {
  Object.assign(this, {
    getAuction(_ref) {
      let {
        auctionId
      } = _ref;
      if (auctionId != null) {
        return getAuctions().find(auction => auction.getAuctionId() === auctionId);
      }
    },
    getAdUnit(_ref2) {
      let {
        adUnitId
      } = _ref2;
      if (adUnitId != null) {
        return getAuctions().flatMap(a => a.getAdUnits()).find(au => au.adUnitId === adUnitId);
      }
    },
    getMediaTypes(_ref3) {
      let {
        adUnitId,
        requestId
      } = _ref3;
      if (requestId != null) {
        const req = this.getBidRequest({
          requestId
        });
        if (req != null && (adUnitId == null || req.adUnitId === adUnitId)) {
          return req.mediaTypes;
        }
      } else if (adUnitId != null) {
        const au = this.getAdUnit({
          adUnitId
        });
        if (au != null) {
          return au.mediaTypes;
        }
      }
    },
    getBidderRequest(_ref4) {
      let {
        requestId,
        bidderRequestId
      } = _ref4;
      if (requestId != null || bidderRequestId != null) {
        let bers = getAuctions().flatMap(a => a.getBidRequests());
        if (bidderRequestId != null) {
          bers = bers.filter(ber => ber.bidderRequestId === bidderRequestId);
        }
        if (requestId == null) {
          return bers[0];
        } else {
          return bers.find(ber => ber.bids && ber.bids.find(br => br.bidId === requestId) != null);
        }
      }
    },
    getBidRequest(_ref5) {
      let {
        requestId
      } = _ref5;
      if (requestId != null) {
        return getAuctions().flatMap(a => a.getBidRequests()).flatMap(ber => ber.bids).find(br => br && br.bidId === requestId);
      }
    },
    getOrtb2(bid) {
      var _this$getBidderReques, _this$getAuction;
      return ((_this$getBidderReques = this.getBidderRequest(bid)) === null || _this$getBidderReques === void 0 ? void 0 : _this$getBidderReques.ortb2) || ((_this$getAuction = this.getAuction(bid)) === null || _this$getAuction === void 0 || (_this$getAuction = _this$getAuction.getFPD()) === null || _this$getAuction === void 0 || (_this$getAuction = _this$getAuction.global) === null || _this$getAuction === void 0 ? void 0 : _this$getAuction.ortb2);
    }
  });
}


/***/ }),

/***/ "./src/auctionManager.js":
/*!*******************************!*\
  !*** ./src/auctionManager.js ***!
  \*******************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   auctionManager: () => (/* binding */ auctionManager)
/* harmony export */ });
/* unused harmony export newAuctionManager */
/* harmony import */ var _utils_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./utils.js */ "./src/utils.js");
/* harmony import */ var _auction_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./auction.js */ "./src/auction.js");
/* harmony import */ var _auctionIndex_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./auctionIndex.js */ "./src/auctionIndex.js");
/* harmony import */ var _constants_js__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ./constants.js */ "./src/constants.js");
/* harmony import */ var _utils_perfMetrics_js__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ./utils/perfMetrics.js */ "./src/utils/perfMetrics.js");
/* harmony import */ var _utils_ttlCollection_js__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! ./utils/ttlCollection.js */ "./src/utils/ttlCollection.js");
/* harmony import */ var _bidTTL_js__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(/*! ./bidTTL.js */ "./src/bidTTL.js");
/**
 * AuctionManager modules is responsible for creating auction instances.
 * This module is the gateway for Prebid core to access auctions.
 * It stores all created instances of auction and can be used to get consolidated values from auction.
 */

/**
 * @typedef {Object} AuctionManager
 *
 * @property {function(): Array} getBidsRequested - returns consolidated bid requests
 * @property {function(): Array} getBidsReceived - returns consolidated bid received
 * @property {function(string): Array} getAllBidsForAdUnitCode - returns consolidated bid received for a given adUnit
 * @property {function(): Array} getAllWinningBids - returns all winning bids
 * @property {function(): Array} getAdUnits - returns consolidated adUnits
 * @property {function(): Array} getAdUnitCodes - returns consolidated adUnitCodes
 * @property {function(): Array} getNoBids - returns consolidated adUnitCodes
 * @property {function(string, string): void} setStatusForBids - set status for bids
 * @property {function(): string} getLastAuctionId - returns last auctionId
 * @property {function(Object): Object} createAuction - creates auction instance and stores it for future reference
 * @property {function(string): Object} findBidByAdId - find bid received by adId. This function will be called by $$PREBID_GLOBAL$$.renderAd
 * @property {function(): Object} getStandardBidderAdServerTargeting - returns standard bidder targeting for all the adapters. Refer http://prebid.org/dev-docs/publisher-api-reference.html#module_pbjs.bidderSettings for more details
 * @property {function(Object): void} addWinningBid - add a winning bid to an auction based on auctionId
 * @property {function(): void} clearAllAuctions - clear all auctions for testing
 * @property {function(*): *} onExpiry
 * @property {AuctionIndex} index
 */









/**
 * Creates new instance of auctionManager. There will only be one instance of auctionManager but
 * a factory is created to assist in testing.
 *
 * @returns {AuctionManager} auctionManagerInstance
 */
function newAuctionManager() {
  const _auctions = (0,_utils_ttlCollection_js__WEBPACK_IMPORTED_MODULE_5__.ttlCollection)({
    startTime: au => au.end.then(() => au.getAuctionEnd()),
    ttl: au => (0,_bidTTL_js__WEBPACK_IMPORTED_MODULE_6__.getMinBidCacheTTL)() == null ? null : au.end.then(() => {
      return Math.max((0,_bidTTL_js__WEBPACK_IMPORTED_MODULE_6__.getMinBidCacheTTL)(), ...au.getBidsReceived().map(bid => bid.ttl)) * 1000;
    })
  });
  (0,_bidTTL_js__WEBPACK_IMPORTED_MODULE_6__.onMinBidCacheTTLChange)(() => _auctions.refresh());
  const auctionManager = {
    onExpiry: _auctions.onExpiry
  };
  function getAuction(auctionId) {
    for (const auction of _auctions) {
      if (auction.getAuctionId() === auctionId) return auction;
    }
  }
  auctionManager.addWinningBid = function (bid) {
    const metrics = (0,_utils_perfMetrics_js__WEBPACK_IMPORTED_MODULE_4__.useMetrics)(bid.metrics);
    metrics.checkpoint('bidWon');
    metrics.timeBetween('auctionEnd', 'bidWon', 'adserver.pending');
    metrics.timeBetween('requestBids', 'bidWon', 'adserver.e2e');
    const auction = getAuction(bid.auctionId);
    if (auction) {
      auction.addWinningBid(bid);
    } else {
      (0,_utils_js__WEBPACK_IMPORTED_MODULE_0__.logWarn)("Auction not found when adding winning bid");
    }
  };
  Object.entries({
    getAllWinningBids: {
      name: 'getWinningBids'
    },
    getBidsRequested: {
      name: 'getBidRequests'
    },
    getNoBids: {},
    getAdUnits: {},
    getBidsReceived: {
      pre(auction) {
        return auction.getAuctionStatus() === _auction_js__WEBPACK_IMPORTED_MODULE_1__.AUCTION_COMPLETED;
      }
    },
    getAdUnitCodes: {
      post: _utils_js__WEBPACK_IMPORTED_MODULE_0__.uniques
    }
  }).forEach(_ref => {
    let [mgrMethod, {
      name = mgrMethod,
      pre,
      post
    }] = _ref;
    const mapper = pre == null ? auction => auction[name]() : auction => pre(auction) ? auction[name]() : [];
    const filter = post == null ? items => items : items => items.filter(post);
    auctionManager[mgrMethod] = () => {
      return filter(_auctions.toArray().flatMap(mapper));
    };
  });
  function allBidsReceived() {
    return _auctions.toArray().flatMap(au => au.getBidsReceived());
  }
  auctionManager.getAllBidsForAdUnitCode = function (adUnitCode) {
    return allBidsReceived().filter(bid => bid && bid.adUnitCode === adUnitCode);
  };
  auctionManager.createAuction = function (opts) {
    const auction = (0,_auction_js__WEBPACK_IMPORTED_MODULE_1__.newAuction)(opts);
    _addAuction(auction);
    return auction;
  };
  auctionManager.findBidByAdId = function (adId) {
    return allBidsReceived().find(bid => bid.adId === adId);
  };
  auctionManager.getStandardBidderAdServerTargeting = function () {
    return (0,_auction_js__WEBPACK_IMPORTED_MODULE_1__.getStandardBidderSettings)()[_constants_js__WEBPACK_IMPORTED_MODULE_3__.JSON_MAPPING.ADSERVER_TARGETING];
  };
  auctionManager.setStatusForBids = function (adId, status) {
    const bid = auctionManager.findBidByAdId(adId);
    if (bid) bid.status = status;
    if (bid && status === _constants_js__WEBPACK_IMPORTED_MODULE_3__.BID_STATUS.BID_TARGETING_SET) {
      const auction = getAuction(bid.auctionId);
      if (auction) auction.setBidTargeting(bid);
    }
  };
  auctionManager.getLastAuctionId = function () {
    const auctions = _auctions.toArray();
    return auctions.length && auctions[auctions.length - 1].getAuctionId();
  };
  auctionManager.clearAllAuctions = function () {
    _auctions.clear();
  };
  function _addAuction(auction) {
    _auctions.add(auction);
  }
  auctionManager.index = new _auctionIndex_js__WEBPACK_IMPORTED_MODULE_2__.AuctionIndex(() => _auctions.toArray());
  return auctionManager;
}
const auctionManager = newAuctionManager();


/***/ }),

/***/ "./src/audio.js":
/*!**********************!*\
  !*** ./src/audio.js ***!
  \**********************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   ORTB_AUDIO_PARAMS: () => (/* binding */ ORTB_AUDIO_PARAMS),
/* harmony export */   fillAudioDefaults: () => (/* binding */ fillAudioDefaults)
/* harmony export */ });
/* unused harmony exports OUTSTREAM, INSTREAM, isValidAudioBid, checkAudioBidSetup */
/* harmony import */ var _utils_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./utils.js */ "./src/utils/objects.js");
/* harmony import */ var _utils_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./utils.js */ "./src/utils.js");
/* harmony import */ var _config_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./config.js */ "./src/config.js");
/* harmony import */ var _hook_js__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ./hook.js */ "./src/hook.js");
/* harmony import */ var _auctionManager_js__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ./auctionManager.js */ "./src/auctionManager.js");
/* harmony import */ var _buildOptions_js__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! ./buildOptions.js */ "./src/buildOptions.js");





const OUTSTREAM = 'outstream';
const INSTREAM = 'instream';
const ORTB_PARAMS = [['mimes', value => Array.isArray(value) && value.length > 0 && value.every(v => typeof v === 'string')], ['minduration', _utils_js__WEBPACK_IMPORTED_MODULE_0__.isInteger], ['maxduration', _utils_js__WEBPACK_IMPORTED_MODULE_0__.isInteger], ['startdelay', _utils_js__WEBPACK_IMPORTED_MODULE_0__.isInteger], ['maxseq', _utils_js__WEBPACK_IMPORTED_MODULE_0__.isInteger], ['poddur', _utils_js__WEBPACK_IMPORTED_MODULE_0__.isInteger], ['protocols', _utils_js__WEBPACK_IMPORTED_MODULE_0__.isArrayOfNums], ['battr', _utils_js__WEBPACK_IMPORTED_MODULE_0__.isArrayOfNums], ['maxextended', _utils_js__WEBPACK_IMPORTED_MODULE_0__.isInteger], ['minbitrate', _utils_js__WEBPACK_IMPORTED_MODULE_0__.isInteger], ['maxbitrate', _utils_js__WEBPACK_IMPORTED_MODULE_0__.isInteger], ['delivery', _utils_js__WEBPACK_IMPORTED_MODULE_0__.isArrayOfNums], ['api', _utils_js__WEBPACK_IMPORTED_MODULE_0__.isArrayOfNums], ['companiontype', _utils_js__WEBPACK_IMPORTED_MODULE_0__.isArrayOfNums], ['feed', _utils_js__WEBPACK_IMPORTED_MODULE_0__.isInteger], ['stitched', _utils_js__WEBPACK_IMPORTED_MODULE_0__.isInteger], ['nvol', _utils_js__WEBPACK_IMPORTED_MODULE_0__.isInteger]];

/**
 * List of OpenRTB 2.x audio object properties with simple validators.
 * Not included: `companionad`, `durfloors`, `ext`
 * reference: https://github.com/InteractiveAdvertisingBureau/openrtb2.x/blob/main/2.6.md
 */
const ORTB_AUDIO_PARAMS = new Map(ORTB_PARAMS);
function fillAudioDefaults(adUnit) {}

/**
 * Validate that the assets required for audio context are present on the bid
 */
function isValidAudioBid(bid) {
  var _index$getMediaTypes;
  let {
    index = _auctionManager_js__WEBPACK_IMPORTED_MODULE_4__.auctionManager.index
  } = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
  const audioMediaType = (_index$getMediaTypes = index.getMediaTypes(bid)) === null || _index$getMediaTypes === void 0 ? void 0 : _index$getMediaTypes.audio;
  const context = audioMediaType && (audioMediaType === null || audioMediaType === void 0 ? void 0 : audioMediaType.context);
  const useCacheKey = audioMediaType && (audioMediaType === null || audioMediaType === void 0 ? void 0 : audioMediaType.useCacheKey);
  const adUnit = index.getAdUnit(bid);

  // if context not defined assume default 'instream' for audio bids
  // instream bids require a vast url or vast xml content
  return checkAudioBidSetup(bid, adUnit, audioMediaType, context, useCacheKey);
}
const checkAudioBidSetup = (0,_hook_js__WEBPACK_IMPORTED_MODULE_3__.hook)('sync', function (bid, adUnit, audioMediaType, context, useCacheKey) {
  if (audioMediaType && (useCacheKey || context !== OUTSTREAM)) {
    // xml-only audio bids require a prebid cache url
    const {
      url,
      useLocal
    } = _config_js__WEBPACK_IMPORTED_MODULE_2__.config.getConfig('cache') || {};
    if (!url && !useLocal && bid.vastXml && !bid.vastUrl) {
      (0,_utils_js__WEBPACK_IMPORTED_MODULE_1__.logError)("\n        This bid contains only vastXml and will not work when a prebid cache url is not specified.\n        Try enabling either prebid cache with ".concat((0,_buildOptions_js__WEBPACK_IMPORTED_MODULE_5__.getGlobalVarName)(), ".setConfig({ cache: {url: \"...\"} });\n        or local cache with ").concat((0,_buildOptions_js__WEBPACK_IMPORTED_MODULE_5__.getGlobalVarName)(), ".setConfig({ cache: { useLocal: true }});\n      "));
      return false;
    }
    return !!(bid.vastUrl || bid.vastXml);
  }

  // outstream bids require a renderer on the bid or pub-defined on adunit
  if (context === OUTSTREAM && !useCacheKey) {
    return !!(bid.renderer || adUnit && adUnit.renderer || audioMediaType.renderer);
  }
  return true;
}, 'checkAudioBidSetup');


/***/ }),

/***/ "./src/banner.js":
/*!***********************!*\
  !*** ./src/banner.js ***!
  \***********************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   ORTB_BANNER_PARAMS: () => (/* binding */ ORTB_BANNER_PARAMS)
/* harmony export */ });
/* harmony import */ var _utils_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./utils.js */ "./src/utils/objects.js");

const ORTB_PARAMS = [['format', value => Array.isArray(value) && value.length > 0 && value.every(v => typeof v === 'object')], ['w', _utils_js__WEBPACK_IMPORTED_MODULE_0__.isInteger], ['h', _utils_js__WEBPACK_IMPORTED_MODULE_0__.isInteger], ['btype', _utils_js__WEBPACK_IMPORTED_MODULE_0__.isArrayOfNums], ['battr', _utils_js__WEBPACK_IMPORTED_MODULE_0__.isArrayOfNums], ['pos', _utils_js__WEBPACK_IMPORTED_MODULE_0__.isInteger], ['mimes', value => Array.isArray(value) && value.length > 0 && value.every(v => typeof v === 'string')], ['topframe', value => [1, 0].includes(value)], ['expdir', _utils_js__WEBPACK_IMPORTED_MODULE_0__.isArrayOfNums], ['api', _utils_js__WEBPACK_IMPORTED_MODULE_0__.isArrayOfNums], ['id', _utils_js__WEBPACK_IMPORTED_MODULE_0__.isStr], ['vcm', value => [1, 0].includes(value)]];

/**
 * List of OpenRTB 2.x banner object properties with simple validators.
 * Not included: `ext`
 * reference: https://github.com/InteractiveAdvertisingBureau/openrtb2.x/blob/main/2.6.md
 */
const ORTB_BANNER_PARAMS = new Map(ORTB_PARAMS);


/***/ }),

/***/ "./src/bidTTL.js":
/*!***********************!*\
  !*** ./src/bidTTL.js ***!
  \***********************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   getBufferedTTL: () => (/* binding */ getBufferedTTL),
/* harmony export */   getMinBidCacheTTL: () => (/* binding */ getMinBidCacheTTL),
/* harmony export */   onMinBidCacheTTLChange: () => (/* binding */ onMinBidCacheTTLChange)
/* harmony export */ });
/* harmony import */ var _config_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./config.js */ "./src/config.js");
/* harmony import */ var _utils_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./utils.js */ "./src/utils.js");


const CACHE_TTL_SETTING = 'minBidCacheTTL';
let TTL_BUFFER = 1;
let minCacheTTL = null;
const listeners = [];
_config_js__WEBPACK_IMPORTED_MODULE_0__.config.getConfig('ttlBuffer', cfg => {
  if (typeof cfg.ttlBuffer === 'number') {
    TTL_BUFFER = cfg.ttlBuffer;
  } else {
    (0,_utils_js__WEBPACK_IMPORTED_MODULE_1__.logError)('Invalid value for ttlBuffer', cfg.ttlBuffer);
  }
});
function getBufferedTTL(bid) {
  return bid.ttl - (bid.hasOwnProperty('ttlBuffer') ? bid.ttlBuffer : TTL_BUFFER);
}
function getMinBidCacheTTL() {
  return minCacheTTL;
}
_config_js__WEBPACK_IMPORTED_MODULE_0__.config.getConfig(CACHE_TTL_SETTING, cfg => {
  const prev = minCacheTTL;
  minCacheTTL = cfg === null || cfg === void 0 ? void 0 : cfg[CACHE_TTL_SETTING];
  minCacheTTL = typeof minCacheTTL === 'number' ? minCacheTTL : null;
  if (prev !== minCacheTTL) {
    listeners.forEach(l => l(minCacheTTL));
  }
});
function onMinBidCacheTTLChange(listener) {
  listeners.push(listener);
}


/***/ }),

/***/ "./src/bidderSettings.js":
/*!*******************************!*\
  !*** ./src/bidderSettings.js ***!
  \*******************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   bidderSettings: () => (/* binding */ bidderSettings)
/* harmony export */ });
/* unused harmony export ScopedSettings */
/* harmony import */ var _babel_runtime_helpers_defineProperty__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @babel/runtime/helpers/defineProperty */ "../../node_modules/@babel/runtime/helpers/esm/defineProperty.js");
/* harmony import */ var _utils_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./utils.js */ "../../node_modules/dlv/index.js");
/* harmony import */ var _utils_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./utils.js */ "./src/utils.js");
/* harmony import */ var _prebidGlobal_js__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ./prebidGlobal.js */ "./src/prebidGlobal.js");
/* harmony import */ var _constants_js__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ./constants.js */ "./src/constants.js");

function _classPrivateMethodInitSpec(e, a) { _checkPrivateRedeclaration(e, a), a.add(e); }
function _checkPrivateRedeclaration(e, t) { if (t.has(e)) throw new TypeError("Cannot initialize the same private elements twice on an object"); }
function _assertClassBrand(e, t, n) { if ("function" == typeof e ? e === t : e.has(t)) return arguments.length < 3 ? t : n; throw new TypeError("Private element is not present on this object"); }




// eslint-disable-next-line @typescript-eslint/no-unused-vars
var _ScopedSettings_brand = /*#__PURE__*/new WeakSet();
class ScopedSettings {
  constructor(getSettings, defaultScope) {
    _classPrivateMethodInitSpec(this, _ScopedSettings_brand);
    (0,_babel_runtime_helpers_defineProperty__WEBPACK_IMPORTED_MODULE_0__["default"])(this, "getSettings", void 0);
    (0,_babel_runtime_helpers_defineProperty__WEBPACK_IMPORTED_MODULE_0__["default"])(this, "defaultScope", void 0);
    this.getSettings = getSettings;
    this.defaultScope = defaultScope;
  }

  /**
   * Get setting value at `path` under the given scope, falling back to the default scope if needed.
   * If `scope` is `null`, get the setting's default value.
   */
  get(scope, path) {
    let value = this.getOwn(scope, path);
    if (typeof value === 'undefined') {
      value = this.getOwn(null, path);
    }
    return value;
  }

  /**
   * Get the setting value at `path` *without* falling back to the default value.
   */
  getOwn(scope, path) {
    scope = _assertClassBrand(_ScopedSettings_brand, this, _resolveScope).call(this, scope);
    return (0,_utils_js__WEBPACK_IMPORTED_MODULE_1__["default"])(this.getSettings(), "".concat(scope, ".").concat(path));
  }

  /**
   * @returns all existing scopes except the default one.
   */
  getScopes() {
    return Object.keys(this.getSettings()).filter(scope => scope !== this.defaultScope);
  }

  /**
   * @returns all settings in the given scope, merged with the settings for the default scope.
   */
  settingsFor(scope) {
    return (0,_utils_js__WEBPACK_IMPORTED_MODULE_2__.mergeDeep)({}, this.ownSettingsFor(null), this.ownSettingsFor(scope));
  }

  /**
   * @returns all settings in the given scope, *without* any of the default settings.
   */
  ownSettingsFor(scope) {
    scope = _assertClassBrand(_ScopedSettings_brand, this, _resolveScope).call(this, scope);
    return this.getSettings()[scope] || {};
  }
}
function _resolveScope(scope) {
  if (scope == null) {
    return this.defaultScope;
  } else {
    return scope;
  }
}
const bidderSettings = new ScopedSettings(() => (0,_prebidGlobal_js__WEBPACK_IMPORTED_MODULE_3__.getGlobal)().bidderSettings || {}, _constants_js__WEBPACK_IMPORTED_MODULE_4__.JSON_MAPPING.BD_SETTING_STANDARD);


/***/ }),

/***/ "./src/bidfactory.js":
/*!***************************!*\
  !*** ./src/bidfactory.js ***!
  \***************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   createBid: () => (/* binding */ createBid)
/* harmony export */ });
/* harmony import */ var _utils_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./utils.js */ "./src/utils.js");


/**
 * Bid metadata.
 */

/**
 * Bid responses as provided by adapters; core then transforms these into `Bid`s
 */

// <format>BidResponesProperties - adapter interpretResponse properties specific to the format.
// they are included in both BidResponse and Bid types.
// Here we have only "naked" declarations, extended in banner/video/native.ts as well as modules.

// <format>BidProperties - format specific properties of Bid objects generated by Prebid, but not in
// (or different from) adapter responses. Again,these are just naked declarations, extended in their place of
// use.

// the following adds `property?: undefined` declarations for each property
// that is in some other format, to avoid requiring type casts
// every time that property is used

// eslint-disable-next-line @typescript-eslint/no-redeclare
function Bid() {
  let {
    src = 'client',
    bidder = '',
    bidId,
    transactionId,
    adUnitId,
    auctionId
  } = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
  var _bidSrc = src;
  Object.assign(this, {
    bidderCode: bidder,
    width: 0,
    height: 0,
    adId: (0,_utils_js__WEBPACK_IMPORTED_MODULE_0__.getUniqueIdentifierStr)(),
    requestId: bidId,
    transactionId,
    adUnitId,
    auctionId,
    mediaType: 'banner',
    source: _bidSrc
  });

  // returns the size of the bid creative. Concatenation of width and height by ‘x’.
  this.getSize = function () {
    return this.width + 'x' + this.height;
  };
}
function createBid(identifiers) {
  return new Bid(identifiers);
}


/***/ }),

/***/ "./src/buildOptions.js":
/*!*****************************!*\
  !*** ./src/buildOptions.js ***!
  \*****************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   getDistUrlBase: () => (/* binding */ getDistUrlBase),
/* harmony export */   getGlobalVarName: () => (/* binding */ getGlobalVarName),
/* harmony export */   shouldDefineGlobal: () => (/* binding */ shouldDefineGlobal)
/* harmony export */ });
/* harmony import */ var _buildOptions_mjs__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../buildOptions.mjs */ "./buildOptions.mjs");
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-expect-error
// eslint-disable-next-line prebid/validate-imports
 // autogenerated during precompilation

function getGlobalVarName() {
  return _buildOptions_mjs__WEBPACK_IMPORTED_MODULE_0__["default"].pbGlobal;
}
function shouldDefineGlobal() {
  return _buildOptions_mjs__WEBPACK_IMPORTED_MODULE_0__["default"].defineGlobal;
}
function getDistUrlBase() {
  return _buildOptions_mjs__WEBPACK_IMPORTED_MODULE_0__["default"].distUrlBase;
}


/***/ }),

/***/ "./src/config.js":
/*!***********************!*\
  !*** ./src/config.js ***!
  \***********************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   RANDOM: () => (/* binding */ RANDOM),
/* harmony export */   config: () => (/* binding */ config)
/* harmony export */ });
/* unused harmony export newConfig */
/* harmony import */ var _babel_runtime_helpers_defineProperty__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @babel/runtime/helpers/defineProperty */ "../../node_modules/@babel/runtime/helpers/esm/defineProperty.js");
/* harmony import */ var _cpmBucketManager_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./cpmBucketManager.js */ "./src/cpmBucketManager.js");
/* harmony import */ var _utils_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./utils.js */ "./src/utils.js");
/* harmony import */ var _utils_js__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ./utils.js */ "./src/utils/objects.js");
/* harmony import */ var _utils_js__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ./utils.js */ "../../node_modules/dlv/index.js");
/* harmony import */ var _constants_js__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! ./constants.js */ "./src/constants.js");

function ownKeys(e, r) { var t = Object.keys(e); if (Object.getOwnPropertySymbols) { var o = Object.getOwnPropertySymbols(e); r && (o = o.filter(function (r) { return Object.getOwnPropertyDescriptor(e, r).enumerable; })), t.push.apply(t, o); } return t; }
function _objectSpread(e) { for (var r = 1; r < arguments.length; r++) { var t = null != arguments[r] ? arguments[r] : {}; r % 2 ? ownKeys(Object(t), !0).forEach(function (r) { (0,_babel_runtime_helpers_defineProperty__WEBPACK_IMPORTED_MODULE_0__["default"])(e, r, t[r]); }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(e, Object.getOwnPropertyDescriptors(t)) : ownKeys(Object(t)).forEach(function (r) { Object.defineProperty(e, r, Object.getOwnPropertyDescriptor(t, r)); }); } return e; }
/*
 * Module for getting and setting Prebid configuration.
*/




const DEFAULT_DEBUG = (0,_utils_js__WEBPACK_IMPORTED_MODULE_2__.getParameterByName)(_constants_js__WEBPACK_IMPORTED_MODULE_5__.DEBUG_MODE).toUpperCase() === 'TRUE';
const DEFAULT_BIDDER_TIMEOUT = 3000;
const DEFAULT_ENABLE_SEND_ALL_BIDS = true;
const DEFAULT_DISABLE_AJAX_TIMEOUT = false;
const DEFAULT_BID_CACHE = false;
const DEFAULT_DEVICE_ACCESS = true;
const DEFAULT_MAX_NESTED_IFRAMES = 10;
const DEFAULT_MAXBID_VALUE = 5000;
const DEFAULT_IFRAMES_CONFIG = {};
const RANDOM = 'random';
const FIXED = 'fixed';
const VALID_ORDERS = {};
VALID_ORDERS[RANDOM] = true;
VALID_ORDERS[FIXED] = true;
const DEFAULT_BIDDER_SEQUENCE = RANDOM;
const GRANULARITY_OPTIONS = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  AUTO: 'auto',
  DENSE: 'dense',
  CUSTOM: 'custom'
};
const ALL_TOPICS = '*';
function attachProperties(config) {
  let useDefaultValues = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : true;
  const values = useDefaultValues ? {
    priceGranularity: GRANULARITY_OPTIONS.MEDIUM,
    customPriceBucket: {},
    mediaTypePriceGranularity: {},
    bidderSequence: DEFAULT_BIDDER_SEQUENCE,
    auctionOptions: {}
  } : {};
  function getProp(name) {
    return values[name];
  }
  function setProp(name, val) {
    if (!values.hasOwnProperty(name)) {
      Object.defineProperty(config, name, {
        enumerable: true
      });
    }
    values[name] = val;
  }
  const props = {
    publisherDomain: {
      set(val) {
        if (val != null) {
          (0,_utils_js__WEBPACK_IMPORTED_MODULE_2__.logWarn)('publisherDomain is deprecated and has no effect since v7 - use pageUrl instead');
        }
        setProp('publisherDomain', val);
      }
    },
    priceGranularity: {
      set(val) {
        if (validatePriceGranularity(val)) {
          if (typeof val === 'string') {
            setProp('priceGranularity', hasGranularity(val) ? val : GRANULARITY_OPTIONS.MEDIUM);
          } else if ((0,_utils_js__WEBPACK_IMPORTED_MODULE_3__.isPlainObject)(val)) {
            setProp('customPriceBucket', val);
            setProp('priceGranularity', GRANULARITY_OPTIONS.CUSTOM);
            (0,_utils_js__WEBPACK_IMPORTED_MODULE_2__.logMessage)('Using custom price granularity');
          }
        }
      }
    },
    customPriceBucket: {},
    mediaTypePriceGranularity: {
      set(val) {
        val != null && setProp('mediaTypePriceGranularity', Object.keys(val).reduce((aggregate, item) => {
          if (validatePriceGranularity(val[item])) {
            if (typeof val === 'string') {
              aggregate[item] = hasGranularity(val[item]) ? val[item] : getProp('priceGranularity');
            } else if ((0,_utils_js__WEBPACK_IMPORTED_MODULE_3__.isPlainObject)(val)) {
              aggregate[item] = val[item];
              (0,_utils_js__WEBPACK_IMPORTED_MODULE_2__.logMessage)("Using custom price granularity for ".concat(item));
            }
          } else {
            (0,_utils_js__WEBPACK_IMPORTED_MODULE_2__.logWarn)("Invalid price granularity for media type: ".concat(item));
          }
          return aggregate;
        }, {}));
      }
    },
    bidderSequence: {
      set(val) {
        if (VALID_ORDERS[val]) {
          setProp('bidderSequence', val);
        } else {
          (0,_utils_js__WEBPACK_IMPORTED_MODULE_2__.logWarn)("Invalid order: ".concat(val, ". Bidder Sequence was not set."));
        }
      }
    },
    auctionOptions: {
      set(val) {
        if (validateauctionOptions(val)) {
          setProp('auctionOptions', val);
        }
      }
    }
  };
  Object.defineProperties(config, Object.fromEntries(Object.entries(props).map(_ref => {
    let [k, def] = _ref;
    return [k, Object.assign({
      get: getProp.bind(null, k),
      set: setProp.bind(null, k),
      enumerable: values.hasOwnProperty(k),
      configurable: !values.hasOwnProperty(k)
    }, def)];
  })));
  return config;
  function hasGranularity(val) {
    return Object.keys(GRANULARITY_OPTIONS).find(option => val === GRANULARITY_OPTIONS[option]);
  }
  function validatePriceGranularity(val) {
    if (!val) {
      (0,_utils_js__WEBPACK_IMPORTED_MODULE_2__.logError)('Prebid Error: no value passed to `setPriceGranularity()`');
      return false;
    }
    if (typeof val === 'string') {
      if (!hasGranularity(val)) {
        (0,_utils_js__WEBPACK_IMPORTED_MODULE_2__.logWarn)('Prebid Warning: setPriceGranularity was called with invalid setting, using `medium` as default.');
      }
    } else if ((0,_utils_js__WEBPACK_IMPORTED_MODULE_3__.isPlainObject)(val)) {
      if (!(0,_cpmBucketManager_js__WEBPACK_IMPORTED_MODULE_1__.isValidPriceConfig)(val)) {
        (0,_utils_js__WEBPACK_IMPORTED_MODULE_2__.logError)('Invalid custom price value passed to `setPriceGranularity()`');
        return false;
      }
    }
    return true;
  }
  function validateauctionOptions(val) {
    if (!(0,_utils_js__WEBPACK_IMPORTED_MODULE_3__.isPlainObject)(val)) {
      (0,_utils_js__WEBPACK_IMPORTED_MODULE_2__.logWarn)('Auction Options must be an object');
      return false;
    }
    for (const k of Object.keys(val)) {
      if (k !== 'secondaryBidders' && k !== 'suppressStaleRender' && k !== 'suppressExpiredRender') {
        (0,_utils_js__WEBPACK_IMPORTED_MODULE_2__.logWarn)("Auction Options given an incorrect param: ".concat(k));
        return false;
      }
      if (k === 'secondaryBidders') {
        if (!(0,_utils_js__WEBPACK_IMPORTED_MODULE_3__.isArray)(val[k])) {
          (0,_utils_js__WEBPACK_IMPORTED_MODULE_2__.logWarn)("Auction Options ".concat(k, " must be of type Array"));
          return false;
        } else if (!val[k].every(_utils_js__WEBPACK_IMPORTED_MODULE_3__.isStr)) {
          (0,_utils_js__WEBPACK_IMPORTED_MODULE_2__.logWarn)("Auction Options ".concat(k, " must be only string"));
          return false;
        }
      } else if (k === 'suppressStaleRender' || k === 'suppressExpiredRender') {
        if (!(0,_utils_js__WEBPACK_IMPORTED_MODULE_3__.isBoolean)(val[k])) {
          (0,_utils_js__WEBPACK_IMPORTED_MODULE_2__.logWarn)("Auction Options ".concat(k, " must be of type boolean"));
          return false;
        }
      }
    }
    return true;
  }
}
function newConfig() {
  const listeners = [];
  let defaults;
  let config;
  let bidderConfig;
  let currBidder = null;
  function resetConfig() {
    defaults = {};
    const newConfig = attachProperties({
      // `debug` is equivalent to legacy `pbjs.logging` property
      debug: DEFAULT_DEBUG,
      bidderTimeout: DEFAULT_BIDDER_TIMEOUT,
      enableSendAllBids: DEFAULT_ENABLE_SEND_ALL_BIDS,
      useBidCache: DEFAULT_BID_CACHE,
      /**
       * deviceAccess set to false will disable setCookie, getCookie, hasLocalStorage
       * @type {boolean}
       */
      deviceAccess: DEFAULT_DEVICE_ACCESS,
      disableAjaxTimeout: DEFAULT_DISABLE_AJAX_TIMEOUT,
      // default max nested iframes for referer detection
      maxNestedIframes: DEFAULT_MAX_NESTED_IFRAMES,
      // default max bid
      maxBid: DEFAULT_MAXBID_VALUE,
      userSync: {
        topics: DEFAULT_IFRAMES_CONFIG
      }
    });
    if (config) {
      callSubscribers(Object.keys(config).reduce((memo, topic) => {
        if (config[topic] !== newConfig[topic]) {
          memo[topic] = newConfig[topic] || {};
        }
        return memo;
      }, {}));
    }
    config = newConfig;
    bidderConfig = {};
  }

  /**
   * Returns base config with bidder overrides (if there is currently a bidder)
   * @private
   */
  function _getConfig() {
    if (currBidder && bidderConfig && (0,_utils_js__WEBPACK_IMPORTED_MODULE_3__.isPlainObject)(bidderConfig[currBidder])) {
      const curr = bidderConfig[currBidder];
      const topics = new Set([...Object.keys(config), ...Object.keys(curr)]);
      const merged = {};
      for (const topic of topics) {
        const base = config[topic];
        const override = curr[topic];
        merged[topic] = override === undefined ? base : base === undefined ? override : (0,_utils_js__WEBPACK_IMPORTED_MODULE_3__.isPlainObject)(override) ? (0,_utils_js__WEBPACK_IMPORTED_MODULE_2__.mergeDeep)({}, base, override) : override;
      }
      return merged;
    }
    return _objectSpread({}, config);
  }
  function _getRestrictedConfig() {
    // This causes reading 'ortb2' to throw an error; with prebid 7, that will almost
    // always be the incorrect way to access FPD configuration (https://github.com/prebid/Prebid.js/issues/7651)
    // code that needs the ortb2 config should explicitly use `getAnyConfig`
    // TODO: this is meant as a temporary tripwire to catch inadvertent use of `getConfig('ortb')` as we transition.
    // It should be removed once the risk of that happening is low enough.
    const conf = _getConfig();
    Object.defineProperty(conf, 'ortb2', {
      get: function () {
        throw new Error('invalid access to \'orbt2\' config - use request parameters instead');
      }
    });
    return conf;
  }
  const [getAnyConfig, getConfig] = [_getConfig, _getRestrictedConfig].map(accessor => {
    /*
     * Returns configuration object if called without parameters,
     * or single configuration property if given a string matching a configuration
     * property name.  Allows deep access e.g. getConfig('currency.adServerCurrency')
     *
     * If called with callback parameter, or a string and a callback parameter,
     * subscribes to configuration updates. See `subscribe` function for usage.
     */
    return function getConfig() {
      if (arguments.length <= 1 && typeof (arguments.length <= 0 ? undefined : arguments[0]) !== 'function') {
        const option = arguments.length <= 0 ? undefined : arguments[0];
        return option ? (0,_utils_js__WEBPACK_IMPORTED_MODULE_4__["default"])(accessor(), option) : _getConfig();
      }
      return subscribe(...arguments);
    };
  });
  const [readConfig, readAnyConfig] = [getConfig, getAnyConfig].map(wrapee => {
    /*
     * Like getConfig, except that it returns a deepClone of the result.
     */
    return function readConfig() {
      let res = wrapee(...arguments);
      if (res && typeof res === 'object') {
        res = (0,_utils_js__WEBPACK_IMPORTED_MODULE_3__.deepClone)(res);
      }
      return res;
    };
  });

  /**
   * Internal API for modules (such as prebid-server) that might need access to all bidder config
   */
  function getBidderConfig() {
    return bidderConfig;
  }

  /*
   * Set configuration.
   */
  function setConfig(options) {
    if (!(0,_utils_js__WEBPACK_IMPORTED_MODULE_3__.isPlainObject)(options)) {
      (0,_utils_js__WEBPACK_IMPORTED_MODULE_2__.logError)('setConfig options must be an object');
      return;
    }
    const topics = Object.keys(options);
    const topicalConfig = {};
    topics.forEach(topic => {
      let option = options[topic];
      if ((0,_utils_js__WEBPACK_IMPORTED_MODULE_3__.isPlainObject)(defaults[topic]) && (0,_utils_js__WEBPACK_IMPORTED_MODULE_3__.isPlainObject)(option)) {
        option = Object.assign({}, defaults[topic], option);
      }
      try {
        topicalConfig[topic] = config[topic] = option;
      } catch (e) {
        (0,_utils_js__WEBPACK_IMPORTED_MODULE_2__.logWarn)("Cannot set config for property ".concat(topic, " : "), e);
      }
    });
    callSubscribers(topicalConfig);
  }

  /**
   * Sets configuration defaults which setConfig values can be applied on top of
   * @param {object} options
   */
  function setDefaults(options) {
    if (!(0,_utils_js__WEBPACK_IMPORTED_MODULE_3__.isPlainObject)(defaults)) {
      (0,_utils_js__WEBPACK_IMPORTED_MODULE_2__.logError)('defaults must be an object');
      return;
    }
    Object.assign(defaults, options);
    // Add default values to config as well
    Object.assign(config, options);
  }

  /*
   * Adds a function to a set of listeners that are invoked whenever `setConfig`
   * is called. The subscribed function will be passed the options object that
   * was used in the `setConfig` call. Topics can be subscribed to to only get
   * updates when specific properties are updated by passing a topic string as
   * the first parameter.
   *
   * If `options.init` is true, the listener will be immediately called with the current options.
   *
   * Returns an `unsubscribe` function for removing the subscriber from the
   * set of listeners
   *
   * Example use:
   * // subscribe to all configuration changes
   * subscribe((config) => console.log('config set:', config));
   *
   * // subscribe to only 'logging' changes
   * subscribe('logging', (config) => console.log('logging set:', config));
   *
   * // unsubscribe
   * const unsubscribe = subscribe(...);
   * unsubscribe(); // no longer listening
   *
   */

  function subscribe(topic, listener) {
    let options = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};
    let callback = listener;
    if (typeof topic !== 'string') {
      // first param should be callback function in this case,
      // meaning it gets called for any config change
      callback = topic;
      topic = ALL_TOPICS;
      options = listener || {};
    }
    if (typeof callback !== 'function') {
      (0,_utils_js__WEBPACK_IMPORTED_MODULE_2__.logError)('listener must be a function');
      return;
    }
    const nl = {
      topic,
      callback
    };
    listeners.push(nl);
    if (options.init) {
      if (topic === ALL_TOPICS) {
        callback(getConfig());
      } else {
        callback({
          [topic]: getConfig(topic)
        });
      }
    }

    // save and call this function to remove the listener
    return function unsubscribe() {
      listeners.splice(listeners.indexOf(nl), 1);
    };
  }

  /*
   * Calls listeners that were added by the `subscribe` function
   */
  function callSubscribers(options) {
    const TOPICS = Object.keys(options);

    // call subscribers of a specific topic, passing only that configuration
    listeners.filter(listener => TOPICS.includes(listener.topic)).forEach(listener => {
      listener.callback({
        [listener.topic]: options[listener.topic]
      });
    });

    // call subscribers that didn't give a topic, passing everything that was set
    listeners.filter(listener => listener.topic === ALL_TOPICS).forEach(listener => listener.callback(options));
  }
  function setBidderConfig(config) {
    let mergeFlag = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : false;
    try {
      check(config);
      config.bidders.forEach(bidder => {
        if (!bidderConfig[bidder]) {
          bidderConfig[bidder] = attachProperties({}, false);
        }
        Object.keys(config.config).forEach(topic => {
          const option = config.config[topic];
          const currentConfig = bidderConfig[bidder][topic];
          if ((0,_utils_js__WEBPACK_IMPORTED_MODULE_3__.isPlainObject)(option) && (currentConfig == null || (0,_utils_js__WEBPACK_IMPORTED_MODULE_3__.isPlainObject)(currentConfig))) {
            const func = mergeFlag ? _utils_js__WEBPACK_IMPORTED_MODULE_2__.mergeDeep : Object.assign;
            bidderConfig[bidder][topic] = func({}, currentConfig || {}, option);
          } else {
            bidderConfig[bidder][topic] = option;
          }
        });
      });
    } catch (e) {
      (0,_utils_js__WEBPACK_IMPORTED_MODULE_2__.logError)(e);
    }
    function check(obj) {
      if (!(0,_utils_js__WEBPACK_IMPORTED_MODULE_3__.isPlainObject)(obj)) {
        throw new Error('setBidderConfig bidder options must be an object');
      }
      if (!(Array.isArray(obj.bidders) && obj.bidders.length)) {
        throw new Error('setBidderConfig bidder options must contain a bidders list with at least 1 bidder');
      }
      if (!(0,_utils_js__WEBPACK_IMPORTED_MODULE_3__.isPlainObject)(obj.config)) {
        throw new Error('setBidderConfig bidder options must contain a config object');
      }
    }
  }
  function mergeConfig(config) {
    if (!(0,_utils_js__WEBPACK_IMPORTED_MODULE_3__.isPlainObject)(config)) {
      (0,_utils_js__WEBPACK_IMPORTED_MODULE_2__.logError)('mergeConfig input must be an object');
      return;
    }
    const mergedConfig = (0,_utils_js__WEBPACK_IMPORTED_MODULE_2__.mergeDeep)(_getConfig(), config);
    setConfig(_objectSpread({}, mergedConfig));
    return mergedConfig;
  }
  function mergeBidderConfig(config) {
    return setBidderConfig(config, true);
  }

  /**
   * Internal functions for core to execute some synchronous code while having an active bidder set.
   */
  function runWithBidder(bidder, fn) {
    currBidder = bidder;
    try {
      return fn();
    } finally {
      resetBidder();
    }
  }
  function callbackWithBidder(bidder) {
    return function (cb) {
      return function () {
        if (typeof cb === 'function') {
          for (var _len = arguments.length, args = new Array(_len), _key = 0; _key < _len; _key++) {
            args[_key] = arguments[_key];
          }
          return runWithBidder(bidder, cb.bind(this, ...args));
        } else {
          (0,_utils_js__WEBPACK_IMPORTED_MODULE_2__.logWarn)('config.callbackWithBidder callback is not a function');
        }
      };
    };
  }
  function getCurrentBidder() {
    return currBidder;
  }
  function resetBidder() {
    currBidder = null;
  }
  resetConfig();
  return {
    getCurrentBidder,
    resetBidder,
    getConfig,
    getAnyConfig,
    readConfig,
    readAnyConfig,
    setConfig,
    mergeConfig,
    setDefaults,
    resetConfig,
    runWithBidder,
    callbackWithBidder,
    setBidderConfig,
    getBidderConfig,
    mergeBidderConfig
  };
}

/**
 * Set a `cache.url` if we should use prebid-cache to store video bids before adding bids to the auction.
 * This must be set if you want to use the gamAdServerVideo module.
 */
const config = newConfig();


/***/ }),

/***/ "./src/consentHandler.js":
/*!*******************************!*\
  !*** ./src/consentHandler.js ***!
  \*******************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   GDPR_GVLIDS: () => (/* binding */ GDPR_GVLIDS),
/* harmony export */   allConsent: () => (/* binding */ allConsent),
/* harmony export */   gdprDataHandler: () => (/* binding */ gdprDataHandler),
/* harmony export */   gppDataHandler: () => (/* binding */ gppDataHandler),
/* harmony export */   uspDataHandler: () => (/* binding */ uspDataHandler)
/* harmony export */ });
/* unused harmony exports VENDORLESS_GVLID, CONSENT_GDPR, CONSENT_GPP, CONSENT_USP, CONSENT_COPPA, ConsentHandler, gvlidRegistry, coppaDataHandler, multiHandler */
/* harmony import */ var _babel_runtime_helpers_defineProperty__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @babel/runtime/helpers/defineProperty */ "../../node_modules/@babel/runtime/helpers/esm/defineProperty.js");
/* harmony import */ var _utils_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./utils.js */ "./src/utils.js");
/* harmony import */ var _utils_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./utils.js */ "./src/utils/objects.js");
/* harmony import */ var _utils_promise_js__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ./utils/promise.js */ "./src/utils/promise.js");
/* harmony import */ var _config_js__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ./config.js */ "./src/config.js");

function _classPrivateMethodInitSpec(e, a) { _checkPrivateRedeclaration(e, a), a.add(e); }
function _classPrivateFieldInitSpec(e, t, a) { _checkPrivateRedeclaration(e, t), t.set(e, a); }
function _checkPrivateRedeclaration(e, t) { if (t.has(e)) throw new TypeError("Cannot initialize the same private elements twice on an object"); }
function _classPrivateFieldGet(s, a) { return s.get(_assertClassBrand(s, a)); }
function _classPrivateFieldSet(s, a, r) { return s.set(_assertClassBrand(s, a), r), r; }
function _assertClassBrand(e, t, n) { if ("function" == typeof e ? e === t : e.has(t)) return arguments.length < 3 ? t : n; throw new TypeError("Private element is not present on this object"); }



/**
 * Placeholder gvlid for when vendor consent is not required. When this value is used as gvlid, the gdpr
 * enforcement module will take it to mean "vendor consent was given".
 *
 * see https://github.com/prebid/Prebid.js/issues/8161
 */
const VENDORLESS_GVLID = Object.freeze({});
const CONSENT_GDPR = 'gdpr';
const CONSENT_GPP = 'gpp';
const CONSENT_USP = 'usp';
const CONSENT_COPPA = 'coppa';

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
var _enabled = /*#__PURE__*/new WeakMap();
var _data = /*#__PURE__*/new WeakMap();
var _defer = /*#__PURE__*/new WeakMap();
var _ready = /*#__PURE__*/new WeakMap();
var _dirty = /*#__PURE__*/new WeakMap();
var _hash = /*#__PURE__*/new WeakMap();
var _ConsentHandler_brand = /*#__PURE__*/new WeakSet();
class ConsentHandler {
  constructor() {
    _classPrivateMethodInitSpec(this, _ConsentHandler_brand);
    _classPrivateFieldInitSpec(this, _enabled, void 0);
    _classPrivateFieldInitSpec(this, _data, void 0);
    _classPrivateFieldInitSpec(this, _defer, void 0);
    _classPrivateFieldInitSpec(this, _ready, void 0);
    _classPrivateFieldInitSpec(this, _dirty, true);
    _classPrivateFieldInitSpec(this, _hash, void 0);
    (0,_babel_runtime_helpers_defineProperty__WEBPACK_IMPORTED_MODULE_0__["default"])(this, "generatedTime", void 0);
    (0,_babel_runtime_helpers_defineProperty__WEBPACK_IMPORTED_MODULE_0__["default"])(this, "hashFields", void 0);
    this.reset();
  }
  /**
   * reset this handler (mainly for tests)
   */
  reset() {
    _classPrivateFieldSet(_defer, this, (0,_utils_promise_js__WEBPACK_IMPORTED_MODULE_3__.defer)());
    _classPrivateFieldSet(_enabled, this, false);
    _classPrivateFieldSet(_data, this, null);
    _classPrivateFieldSet(_ready, this, false);
    this.generatedTime = null;
  }

  /**
   * Enable this consent handler. This should be called by the relevant consent management module
   * on initialization.
   */
  enable() {
    _classPrivateFieldSet(_enabled, this, true);
  }

  /**
   * @returns {boolean} true if the related consent management module is enabled.
   */
  get enabled() {
    return _classPrivateFieldGet(_enabled, this);
  }

  /**
   * @returns {boolean} true if consent data has been resolved (it may be `null` if the resolution failed).
   */
  get ready() {
    return _classPrivateFieldGet(_ready, this);
  }

  /**
   * @returns a promise than resolves to the consent data, or null if no consent data is available
   */
  get promise() {
    if (_classPrivateFieldGet(_ready, this)) {
      return _utils_promise_js__WEBPACK_IMPORTED_MODULE_3__.PbPromise.resolve(_classPrivateFieldGet(_data, this));
    }
    if (!_classPrivateFieldGet(_enabled, this)) {
      _assertClassBrand(_ConsentHandler_brand, this, _resolve).call(this, null);
    }
    return _classPrivateFieldGet(_defer, this).promise;
  }
  setConsentData(data) {
    let time = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : (0,_utils_js__WEBPACK_IMPORTED_MODULE_1__.timestamp)();
    this.generatedTime = time;
    _classPrivateFieldSet(_dirty, this, true);
    _assertClassBrand(_ConsentHandler_brand, this, _resolve).call(this, data);
  }
  getConsentData() {
    if (_classPrivateFieldGet(_enabled, this)) {
      return _classPrivateFieldGet(_data, this);
    }
    return null;
  }
  get hash() {
    if (_classPrivateFieldGet(_dirty, this)) {
      _classPrivateFieldSet(_hash, this, (0,_utils_js__WEBPACK_IMPORTED_MODULE_1__.cyrb53Hash)(JSON.stringify(_classPrivateFieldGet(_data, this) && this.hashFields ? this.hashFields.map(f => _classPrivateFieldGet(_data, this)[f]) : _classPrivateFieldGet(_data, this))));
      _classPrivateFieldSet(_dirty, this, false);
    }
    return _classPrivateFieldGet(_hash, this);
  }
}
function _resolve(data) {
  _classPrivateFieldSet(_ready, this, true);
  _classPrivateFieldSet(_data, this, data);
  _classPrivateFieldGet(_defer, this).resolve(data);
}
class UspConsentHandler extends ConsentHandler {
  getConsentMeta() {
    const consentData = this.getConsentData();
    if (consentData && this.generatedTime) {
      return {
        generatedAt: this.generatedTime
      };
    }
  }
}
class GdprConsentHandler extends ConsentHandler {
  constructor() {
    super(...arguments);
    (0,_babel_runtime_helpers_defineProperty__WEBPACK_IMPORTED_MODULE_0__["default"])(this, "hashFields", ["gdprApplies", "consentString"]);
  }
  getConsentMeta() {
    const consentData = this.getConsentData();
    if (consentData && consentData.vendorData && this.generatedTime) {
      return {
        gdprApplies: consentData.gdprApplies,
        consentStringSize: (0,_utils_js__WEBPACK_IMPORTED_MODULE_2__.isStr)(consentData.vendorData.tcString) ? consentData.vendorData.tcString.length : 0,
        generatedAt: this.generatedTime,
        apiVersion: consentData.apiVersion
      };
    }
  }
}
class GppConsentHandler extends ConsentHandler {
  constructor() {
    super(...arguments);
    (0,_babel_runtime_helpers_defineProperty__WEBPACK_IMPORTED_MODULE_0__["default"])(this, "hashFields", ['applicableSections', 'gppString']);
  }
  getConsentMeta() {
    const consentData = this.getConsentData();
    if (consentData && this.generatedTime) {
      return {
        generatedAt: this.generatedTime
      };
    }
  }
}
function gvlidRegistry() {
  const registry = {};
  const flat = {};
  const none = {};
  return {
    /**
     * Register a module's GVL ID.
     * @param moduleType defined in `activities/modules.js`
     * @param moduleName
     * @param gvlid
     */
    register(moduleType, moduleName, gvlid) {
      if (gvlid) {
        (registry[moduleName] = registry[moduleName] || {})[moduleType] = gvlid;
        if (flat.hasOwnProperty(moduleName)) {
          if (flat[moduleName] !== gvlid) flat[moduleName] = none;
        } else {
          flat[moduleName] = gvlid;
        }
      }
    },
    /**
     * Get a module's GVL ID(s).
     *
     * @param moduleName - The name of the module.
     * @return An object where:
     *   `modules` is a map from module type to that module's GVL ID;
     *   `gvlid` is the single GVL ID for this family of modules (only defined if all modules with this name declare the same ID).
     */
    get(moduleName) {
      const result = {
        modules: registry[moduleName] || {}
      };
      if (flat.hasOwnProperty(moduleName) && flat[moduleName] !== none) {
        result.gvlid = flat[moduleName];
      }
      return result;
    }
  };
}
const gdprDataHandler = new GdprConsentHandler();
const uspDataHandler = new UspConsentHandler();
const gppDataHandler = new GppConsentHandler();
const coppaDataHandler = (() => {
  function getCoppa() {
    return !!_config_js__WEBPACK_IMPORTED_MODULE_4__.config.getConfig('coppa');
  }
  return {
    getCoppa,
    getConsentData: getCoppa,
    getConsentMeta: getCoppa,
    reset() {},
    get promise() {
      return _utils_promise_js__WEBPACK_IMPORTED_MODULE_3__.PbPromise.resolve(getCoppa());
    },
    get hash() {
      return getCoppa() ? '1' : '0';
    }
  };
})();
const GDPR_GVLIDS = gvlidRegistry();
const ALL_HANDLERS = {
  [CONSENT_GDPR]: gdprDataHandler,
  [CONSENT_USP]: uspDataHandler,
  [CONSENT_GPP]: gppDataHandler,
  [CONSENT_COPPA]: coppaDataHandler
};
function multiHandler() {
  let handlers = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : ALL_HANDLERS;
  const entries = Object.entries(handlers);
  function collector(method) {
    return function () {
      return Object.fromEntries(entries.map(_ref => {
        let [name, handler] = _ref;
        return [name, handler[method]()];
      }));
    };
  }
  return Object.assign({
    get promise() {
      return _utils_promise_js__WEBPACK_IMPORTED_MODULE_3__.PbPromise.all(entries.map(_ref2 => {
        let [name, handler] = _ref2;
        return handler.promise.then(val => [name, val]);
      })).then(entries => Object.fromEntries(entries));
    },
    get hash() {
      return (0,_utils_js__WEBPACK_IMPORTED_MODULE_1__.cyrb53Hash)(entries.map(_ref3 => {
        let [_, handler] = _ref3;
        return handler.hash;
      }).join(':'));
    }
  }, Object.fromEntries(['getConsentData', 'getConsentMeta', 'reset'].map(n => [n, collector(n)])));
}
const allConsent = multiHandler();


/***/ }),

/***/ "./src/constants.js":
/*!**************************!*\
  !*** ./src/constants.js ***!
  \**************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   AD_RENDER_FAILED_REASON: () => (/* binding */ AD_RENDER_FAILED_REASON),
/* harmony export */   BID_STATUS: () => (/* binding */ BID_STATUS),
/* harmony export */   DEBUG_MODE: () => (/* binding */ DEBUG_MODE),
/* harmony export */   DEFAULT_TARGETING_KEYS: () => (/* binding */ DEFAULT_TARGETING_KEYS),
/* harmony export */   EVENTS: () => (/* binding */ EVENTS),
/* harmony export */   EVENT_ID_PATHS: () => (/* binding */ EVENT_ID_PATHS),
/* harmony export */   GRANULARITY_OPTIONS: () => (/* binding */ GRANULARITY_OPTIONS),
/* harmony export */   JSON_MAPPING: () => (/* binding */ JSON_MAPPING),
/* harmony export */   MESSAGES: () => (/* binding */ MESSAGES),
/* harmony export */   NATIVE_ASSET_TYPES: () => (/* binding */ NATIVE_ASSET_TYPES),
/* harmony export */   NATIVE_IMAGE_TYPES: () => (/* binding */ NATIVE_IMAGE_TYPES),
/* harmony export */   NATIVE_KEYS: () => (/* binding */ NATIVE_KEYS),
/* harmony export */   NATIVE_KEYS_THAT_ARE_NOT_ASSETS: () => (/* binding */ NATIVE_KEYS_THAT_ARE_NOT_ASSETS),
/* harmony export */   PB_LOCATOR: () => (/* binding */ PB_LOCATOR),
/* harmony export */   PREBID_NATIVE_DATA_KEYS_TO_ORTB: () => (/* binding */ PREBID_NATIVE_DATA_KEYS_TO_ORTB),
/* harmony export */   REJECTION_REASON: () => (/* binding */ REJECTION_REASON),
/* harmony export */   S2S: () => (/* binding */ S2S),
/* harmony export */   TARGETING_KEYS: () => (/* binding */ TARGETING_KEYS)
/* harmony export */ });
/* unused harmony export STATUS */
const JSON_MAPPING = {
  PL_CODE: 'code',
  PL_SIZE: 'sizes',
  PL_BIDS: 'bids',
  BD_BIDDER: 'bidder',
  BD_ID: 'paramsd',
  BD_PL_ID: 'placementId',
  ADSERVER_TARGETING: 'adserverTargeting',
  BD_SETTING_STANDARD: 'standard'
};
const DEBUG_MODE = 'pbjs_debug';
const STATUS = {
  GOOD: 1
};
const EVENTS = {
  AUCTION_INIT: 'auctionInit',
  AUCTION_TIMEOUT: 'auctionTimeout',
  AUCTION_END: 'auctionEnd',
  BID_ADJUSTMENT: 'bidAdjustment',
  BID_TIMEOUT: 'bidTimeout',
  BID_REQUESTED: 'bidRequested',
  BID_RESPONSE: 'bidResponse',
  BID_REJECTED: 'bidRejected',
  NO_BID: 'noBid',
  SEAT_NON_BID: 'seatNonBid',
  BID_WON: 'bidWon',
  BIDDER_DONE: 'bidderDone',
  BIDDER_ERROR: 'bidderError',
  SET_TARGETING: 'setTargeting',
  BEFORE_REQUEST_BIDS: 'beforeRequestBids',
  BEFORE_BIDDER_HTTP: 'beforeBidderHttp',
  REQUEST_BIDS: 'requestBids',
  ADD_AD_UNITS: 'addAdUnits',
  AD_RENDER_FAILED: 'adRenderFailed',
  AD_RENDER_SUCCEEDED: 'adRenderSucceeded',
  TCF2_ENFORCEMENT: 'tcf2Enforcement',
  AUCTION_DEBUG: 'auctionDebug',
  BID_VIEWABLE: 'bidViewable',
  STALE_RENDER: 'staleRender',
  EXPIRED_RENDER: 'expiredRender',
  BILLABLE_EVENT: 'billableEvent',
  BID_ACCEPTED: 'bidAccepted',
  RUN_PAAPI_AUCTION: 'paapiRunAuction',
  PBS_ANALYTICS: 'pbsAnalytics',
  PAAPI_BID: 'paapiBid',
  PAAPI_NO_BID: 'paapiNoBid',
  PAAPI_ERROR: 'paapiError',
  BEFORE_PBS_HTTP: 'beforePBSHttp',
  BROWSI_INIT: 'browsiInit',
  BROWSI_DATA: 'browsiData',
  BROWSER_INTERVENTION: 'browserIntervention'
};
const AD_RENDER_FAILED_REASON = {
  PREVENT_WRITING_ON_MAIN_DOCUMENT: 'preventWritingOnMainDocument',
  NO_AD: 'noAd',
  EXCEPTION: 'exception',
  CANNOT_FIND_AD: 'cannotFindAd',
  MISSING_DOC_OR_ADID: 'missingDocOrAdid'
};
const EVENT_ID_PATHS = {
  bidWon: 'adUnitCode'
};
const GRANULARITY_OPTIONS = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  AUTO: 'auto',
  DENSE: 'dense',
  CUSTOM: 'custom'
};
const TARGETING_KEYS = {
  BIDDER: 'hb_bidder',
  AD_ID: 'hb_adid',
  PRICE_BUCKET: 'hb_pb',
  SIZE: 'hb_size',
  DEAL: 'hb_deal',
  SOURCE: 'hb_source',
  FORMAT: 'hb_format',
  UUID: 'hb_uuid',
  CACHE_ID: 'hb_cache_id',
  CACHE_HOST: 'hb_cache_host',
  ADOMAIN: 'hb_adomain',
  ACAT: 'hb_acat',
  CRID: 'hb_crid',
  DSP: 'hb_dsp',
  VERSION: 'hb_ver'
};
const DEFAULT_TARGETING_KEYS = {
  BIDDER: 'hb_bidder',
  AD_ID: 'hb_adid',
  PRICE_BUCKET: 'hb_pb',
  SIZE: 'hb_size',
  DEAL: 'hb_deal',
  FORMAT: 'hb_format',
  UUID: 'hb_uuid',
  CACHE_HOST: 'hb_cache_host',
  VERSION: 'hb_ver'
};
const NATIVE_KEYS = {
  title: 'hb_native_title',
  body: 'hb_native_body',
  body2: 'hb_native_body2',
  privacyLink: 'hb_native_privacy',
  privacyIcon: 'hb_native_privicon',
  sponsoredBy: 'hb_native_brand',
  image: 'hb_native_image',
  icon: 'hb_native_icon',
  clickUrl: 'hb_native_linkurl',
  displayUrl: 'hb_native_displayurl',
  cta: 'hb_native_cta',
  rating: 'hb_native_rating',
  address: 'hb_native_address',
  downloads: 'hb_native_downloads',
  likes: 'hb_native_likes',
  phone: 'hb_native_phone',
  price: 'hb_native_price',
  salePrice: 'hb_native_saleprice',
  rendererUrl: 'hb_renderer_url',
  adTemplate: 'hb_adTemplate'
};
const S2S = {
  SRC: 's2s',
  DEFAULT_ENDPOINT: 'https://prebid.adnxs.com/pbs/v1/openrtb2/auction',
  SYNCED_BIDDERS_KEY: 'pbjsSyncs'
};
const BID_STATUS = {
  BID_TARGETING_SET: 'targetingSet',
  RENDERED: 'rendered',
  BID_REJECTED: 'bidRejected'
};
const REJECTION_REASON = {
  INVALID: 'Bid has missing or invalid properties',
  INVALID_REQUEST_ID: 'Invalid request ID',
  BIDDER_DISALLOWED: 'Bidder code is not allowed by allowedAlternateBidderCodes / allowUnknownBidderCodes',
  FLOOR_NOT_MET: 'Bid does not meet price floor',
  CANNOT_CONVERT_CURRENCY: 'Unable to convert currency',
  DSA_REQUIRED: 'Bid does not provide required DSA transparency info',
  DSA_MISMATCH: 'Bid indicates inappropriate DSA rendering method',
  PRICE_TOO_HIGH: 'Bid price exceeds maximum value'
};
const PREBID_NATIVE_DATA_KEYS_TO_ORTB = {
  body: 'desc',
  body2: 'desc2',
  sponsoredBy: 'sponsored',
  cta: 'ctatext',
  rating: 'rating',
  address: 'address',
  downloads: 'downloads',
  likes: 'likes',
  phone: 'phone',
  price: 'price',
  salePrice: 'saleprice',
  displayUrl: 'displayurl'
};
const NATIVE_ASSET_TYPES = {
  sponsored: 1,
  desc: 2,
  rating: 3,
  likes: 4,
  downloads: 5,
  price: 6,
  saleprice: 7,
  phone: 8,
  address: 9,
  desc2: 10,
  displayurl: 11,
  ctatext: 12
};
const NATIVE_IMAGE_TYPES = {
  ICON: 1,
  MAIN: 3
};
const NATIVE_KEYS_THAT_ARE_NOT_ASSETS = ['privacyIcon', 'clickUrl', 'adTemplate', 'rendererUrl', 'type'];
const MESSAGES = {
  REQUEST: 'Prebid Request',
  RESPONSE: 'Prebid Response',
  NATIVE: 'Prebid Native',
  EVENT: 'Prebid Event',
  INTERVENTION: 'Prebid Intervention'
};
const PB_LOCATOR = '__pb_locator__';


/***/ }),

/***/ "./src/cpmBucketManager.js":
/*!*********************************!*\
  !*** ./src/cpmBucketManager.js ***!
  \*********************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   getPriceBucketString: () => (/* binding */ getPriceBucketString),
/* harmony export */   isValidPriceConfig: () => (/* binding */ isValidPriceConfig)
/* harmony export */ });
/* harmony import */ var _utils_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./utils.js */ "./src/utils.js");
/* harmony import */ var _config_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./config.js */ "./src/config.js");
/* eslint-disable array-callback-return */


const _defaultPrecision = 2;
const _lgPriceConfig = {
  'buckets': [{
    'max': 5,
    'increment': 0.5
  }]
};
const _mgPriceConfig = {
  'buckets': [{
    'max': 20,
    'increment': 0.1
  }]
};
const _hgPriceConfig = {
  'buckets': [{
    'max': 20,
    'increment': 0.01
  }]
};
const _densePriceConfig = {
  'buckets': [{
    'max': 3,
    'increment': 0.01
  }, {
    'max': 8,
    'increment': 0.05
  }, {
    'max': 20,
    'increment': 0.5
  }]
};
const _autoPriceConfig = {
  'buckets': [{
    'max': 5,
    'increment': 0.05
  }, {
    'max': 10,
    'increment': 0.1
  }, {
    'max': 20,
    'increment': 0.5
  }]
};
function getPriceBucketString(cpm, customConfig) {
  let granularityMultiplier = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 1;
  let cpmFloat = parseFloat(cpm);
  if (isNaN(cpmFloat)) {
    cpmFloat = '';
  }
  return {
    low: cpmFloat === '' ? '' : getCpmStringValue(cpm, _lgPriceConfig, granularityMultiplier),
    med: cpmFloat === '' ? '' : getCpmStringValue(cpm, _mgPriceConfig, granularityMultiplier),
    high: cpmFloat === '' ? '' : getCpmStringValue(cpm, _hgPriceConfig, granularityMultiplier),
    auto: cpmFloat === '' ? '' : getCpmStringValue(cpm, _autoPriceConfig, granularityMultiplier),
    dense: cpmFloat === '' ? '' : getCpmStringValue(cpm, _densePriceConfig, granularityMultiplier),
    custom: cpmFloat === '' ? '' : getCpmStringValue(cpm, customConfig, granularityMultiplier)
  };
}
function getCpmStringValue(cpm, config, granularityMultiplier) {
  let cpmStr = '';
  if (!isValidPriceConfig(config)) {
    return cpmStr;
  }
  const cap = config.buckets.reduce((prev, curr) => {
    if (prev.max > curr.max) {
      return prev;
    }
    return curr;
  }, {
    'max': 0
  });
  let bucketFloor = 0;
  const bucket = config.buckets.find(bucket => {
    if (cpm > cap.max * granularityMultiplier) {
      // cpm exceeds cap, just return the cap.
      let precision = bucket.precision;
      if (typeof precision === 'undefined') {
        precision = _defaultPrecision;
      }
      cpmStr = (bucket.max * granularityMultiplier).toFixed(precision);
    } else if (cpm <= bucket.max * granularityMultiplier && cpm >= bucketFloor * granularityMultiplier) {
      bucket.min = bucketFloor;
      return bucket;
    } else {
      bucketFloor = bucket.max;
    }
  });
  if (bucket) {
    cpmStr = getCpmTarget(cpm, bucket, granularityMultiplier);
  }
  return cpmStr;
}
function isValidPriceConfig(config) {
  if ((0,_utils_js__WEBPACK_IMPORTED_MODULE_0__.isEmpty)(config) || !config.buckets || !Array.isArray(config.buckets)) {
    return false;
  }
  let isValid = true;
  config.buckets.forEach(bucket => {
    if (!bucket.max || !bucket.increment) {
      isValid = false;
    }
  });
  return isValid;
}
function getCpmTarget(cpm, bucket, granularityMultiplier) {
  const precision = typeof bucket.precision !== 'undefined' ? bucket.precision : _defaultPrecision;
  const increment = bucket.increment * granularityMultiplier;
  const bucketMin = bucket.min * granularityMultiplier;
  let roundingFunction = Math.floor;
  const customRoundingFunction = _config_js__WEBPACK_IMPORTED_MODULE_1__.config.getConfig('cpmRoundingFunction');
  if (typeof customRoundingFunction === 'function') {
    roundingFunction = customRoundingFunction;
  }

  // start increments at the bucket min and then add bucket min back to arrive at the correct rounding
  // note - we're padding the values to avoid using decimals in the math prior to flooring
  // this is done as JS can return values slightly below the expected mark which would skew the price bucket target
  //   (eg 4.01 / 0.01 = 400.99999999999994)
  // min precison should be 2 to move decimal place over.
  const pow = Math.pow(10, precision + 2);
  const cpmToRound = (cpm * pow - bucketMin * pow) / (increment * pow);
  let cpmTarget;
  let invalidRounding;
  // It is likely that we will be passed {cpmRoundingFunction: roundingFunction()}
  // rather than the expected {cpmRoundingFunction: roundingFunction}. Default back to floor in that case
  try {
    cpmTarget = roundingFunction(cpmToRound) * increment + bucketMin;
  } catch (err) {
    invalidRounding = true;
  }
  if (invalidRounding || typeof cpmTarget !== 'number') {
    (0,_utils_js__WEBPACK_IMPORTED_MODULE_0__.logWarn)('Invalid rounding function passed in config');
    cpmTarget = Math.floor(cpmToRound) * increment + bucketMin;
  }
  // force to 10 decimal places to deal with imprecise decimal/binary conversions
  //    (for example 0.1 * 3 = 0.30000000000000004)

  cpmTarget = Number(cpmTarget.toFixed(10));
  return cpmTarget.toFixed(precision);
}



/***/ }),

/***/ "./src/creativeRenderers.js":
/*!**********************************!*\
  !*** ./src/creativeRenderers.js ***!
  \**********************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   PUC_MIN_VERSION: () => (/* binding */ PUC_MIN_VERSION),
/* harmony export */   getCreativeRenderer: () => (/* binding */ getCreativeRenderer),
/* harmony export */   getCreativeRendererSource: () => (/* binding */ getCreativeRendererSource)
/* harmony export */ });
/* harmony import */ var _utils_promise_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./utils/promise.js */ "./src/utils/promise.js");
/* harmony import */ var _utils_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./utils.js */ "./src/utils.js");
/* harmony import */ var _creative_renderers_display_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../creative-renderers/display.js */ "./creative-renderers/display.js");
/* harmony import */ var _hook_js__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ./hook.js */ "./src/hook.js");


// eslint-disable-next-line prebid/validate-imports
 // autogenerated during precompilation


// the minimum rendererVersion that will be used by PUC
const PUC_MIN_VERSION = 3;
const getCreativeRendererSource = (0,_hook_js__WEBPACK_IMPORTED_MODULE_3__.hook)('sync', function (bidResponse) {
  return _creative_renderers_display_js__WEBPACK_IMPORTED_MODULE_2__.RENDERER;
});
const getCreativeRenderer = function () {
  const renderers = {};
  return function (bidResponse) {
    const src = getCreativeRendererSource(bidResponse);
    if (!renderers.hasOwnProperty(src)) {
      renderers[src] = new _utils_promise_js__WEBPACK_IMPORTED_MODULE_0__.PbPromise(resolve => {
        const iframe = (0,_utils_js__WEBPACK_IMPORTED_MODULE_1__.createInvisibleIframe)();
        iframe.srcdoc = "<script>".concat(src, "</script>");
        iframe.onload = () => resolve(iframe.contentWindow.render);
        document.body.appendChild(iframe);
      });
    }
    return renderers[src];
  };
}();


/***/ }),

/***/ "./src/debugging.js":
/*!**************************!*\
  !*** ./src/debugging.js ***!
  \**************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   loadSession: () => (/* binding */ loadSession)
/* harmony export */ });
/* unused harmony exports DEBUG_KEY, debuggingModuleLoader, debuggingControls, reset */
/* harmony import */ var _config_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./config.js */ "./src/config.js");
/* harmony import */ var _hook_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./hook.js */ "./src/hook.js");
/* harmony import */ var _prebidGlobal_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./prebidGlobal.js */ "./src/prebidGlobal.js");
/* harmony import */ var _utils_js__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ./utils.js */ "./src/utils.js");
/* harmony import */ var _bidfactory_js__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ./bidfactory.js */ "./src/bidfactory.js");
/* harmony import */ var _adloader_js__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! ./adloader.js */ "./src/adloader.js");
/* harmony import */ var _utils_promise_js__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(/*! ./utils/promise.js */ "./src/utils/promise.js");
/* harmony import */ var _activities_modules_js__WEBPACK_IMPORTED_MODULE_7__ = __webpack_require__(/*! ./activities/modules.js */ "./src/activities/modules.js");
/* harmony import */ var _mediaTypes_js__WEBPACK_IMPORTED_MODULE_8__ = __webpack_require__(/*! ./mediaTypes.js */ "./src/mediaTypes.js");
/* harmony import */ var _Renderer_js__WEBPACK_IMPORTED_MODULE_9__ = __webpack_require__(/*! ./Renderer.js */ "./src/Renderer.js");
/* harmony import */ var _buildOptions_js__WEBPACK_IMPORTED_MODULE_10__ = __webpack_require__(/*! ./buildOptions.js */ "./src/buildOptions.js");












const DEBUG_KEY = "__".concat((0,_buildOptions_js__WEBPACK_IMPORTED_MODULE_10__.getGlobalVarName)(), "_debugging__");
function isDebuggingInstalled() {
  return (0,_prebidGlobal_js__WEBPACK_IMPORTED_MODULE_2__.getGlobal)().installedModules.includes('debugging');
}
function loadScript(url) {
  return new _utils_promise_js__WEBPACK_IMPORTED_MODULE_6__.PbPromise(resolve => {
    (0,_adloader_js__WEBPACK_IMPORTED_MODULE_5__.loadExternalScript)(url, _activities_modules_js__WEBPACK_IMPORTED_MODULE_7__.MODULE_TYPE_PREBID, 'debugging', resolve);
  });
}
function debuggingModuleLoader() {
  let {
    alreadyInstalled = isDebuggingInstalled,
    script = loadScript
  } = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
  let loading = null;
  return function () {
    if (loading == null) {
      loading = new _utils_promise_js__WEBPACK_IMPORTED_MODULE_6__.PbPromise((resolve, reject) => {
        // run this in a 0-delay timeout to give installedModules time to be populated
        setTimeout(() => {
          if (alreadyInstalled()) {
            resolve();
          } else {
            const url = "".concat((0,_buildOptions_js__WEBPACK_IMPORTED_MODULE_10__.getDistUrlBase)(), "debugging-standalone.js");
            (0,_utils_js__WEBPACK_IMPORTED_MODULE_3__.logMessage)("Debugging module not installed, loading it from \"".concat(url, "\"..."));
            (0,_prebidGlobal_js__WEBPACK_IMPORTED_MODULE_2__.getGlobal)()._installDebugging = true;
            script(url).then(() => {
              (0,_prebidGlobal_js__WEBPACK_IMPORTED_MODULE_2__.getGlobal)()._installDebugging({
                DEBUG_KEY,
                hook: _hook_js__WEBPACK_IMPORTED_MODULE_1__.hook,
                config: _config_js__WEBPACK_IMPORTED_MODULE_0__.config,
                createBid: _bidfactory_js__WEBPACK_IMPORTED_MODULE_4__.createBid,
                logger: (0,_utils_js__WEBPACK_IMPORTED_MODULE_3__.prefixLog)('DEBUG:'),
                utils: _utils_js__WEBPACK_IMPORTED_MODULE_3__,
                BANNER: _mediaTypes_js__WEBPACK_IMPORTED_MODULE_8__.BANNER,
                NATIVE: _mediaTypes_js__WEBPACK_IMPORTED_MODULE_8__.NATIVE,
                VIDEO: _mediaTypes_js__WEBPACK_IMPORTED_MODULE_8__.VIDEO,
                Renderer: _Renderer_js__WEBPACK_IMPORTED_MODULE_9__.Renderer
              });
            }).then(resolve, reject);
          }
        });
      });
    }
    return loading;
  };
}
function debuggingControls() {
  let {
    load = debuggingModuleLoader(),
    hook = (0,_hook_js__WEBPACK_IMPORTED_MODULE_1__.getHook)('requestBids')
  } = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
  let promise = null;
  let enabled = false;
  function waitForDebugging(next) {
    for (var _len = arguments.length, args = new Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
      args[_key - 1] = arguments[_key];
    }
    return (promise || _utils_promise_js__WEBPACK_IMPORTED_MODULE_6__.PbPromise.resolve()).then(() => next.apply(this, args));
  }
  function enable() {
    if (!enabled) {
      promise = load();
      // set debugging to high priority so that it has the opportunity to mess with most things
      hook.before(waitForDebugging, 99);
      enabled = true;
    }
  }
  function disable() {
    hook.getHooks({
      hook: waitForDebugging
    }).remove();
    enabled = false;
  }
  function reset() {
    promise = null;
    disable();
  }
  return {
    enable,
    disable,
    reset
  };
}
const ctl = debuggingControls();
const reset = ctl.reset;
function loadSession() {
  let storage = null;
  try {
    // eslint-disable-next-line no-restricted-properties
    storage = window.sessionStorage;
  } catch (e) {}
  if (storage !== null) {
    const debugging = ctl;
    let config = null;
    try {
      config = storage.getItem(DEBUG_KEY);
    } catch (e) {}
    if (config !== null) {
      // just make sure the module runs; it will take care of parsing the config (and disabling itself if necessary)
      debugging.enable();
    }
  }
}
_config_js__WEBPACK_IMPORTED_MODULE_0__.config.getConfig('debugging', function (_ref) {
  let {
    debugging
  } = _ref;
  debugging !== null && debugging !== void 0 && debugging.enabled ? ctl.enable() : ctl.disable();
});


/***/ }),

/***/ "./src/eventTrackers.js":
/*!******************************!*\
  !*** ./src/eventTrackers.js ***!
  \******************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   EVENT_TYPE_IMPRESSION: () => (/* binding */ EVENT_TYPE_IMPRESSION),
/* harmony export */   EVENT_TYPE_WIN: () => (/* binding */ EVENT_TYPE_WIN),
/* harmony export */   TRACKER_METHOD_IMG: () => (/* binding */ TRACKER_METHOD_IMG),
/* harmony export */   TRACKER_METHOD_JS: () => (/* binding */ TRACKER_METHOD_JS),
/* harmony export */   parseEventTrackers: () => (/* binding */ parseEventTrackers)
/* harmony export */ });
const TRACKER_METHOD_IMG = 1;
const TRACKER_METHOD_JS = 2;
const EVENT_TYPE_IMPRESSION = 1;
const EVENT_TYPE_WIN = 500;

/**
 * Returns a map from event type (EVENT_TYPE_*)
 * to a map from tracker method (TRACKER_METHOD_*)
 * to an array of tracking URLs
 *
 * @param {{}[]} eventTrackers an array of "Event Tracker Response Object" as defined
 *  in the ORTB native 1.2 spec (https://www.iab.com/wp-content/uploads/2018/03/OpenRTB-Native-Ads-Specification-Final-1.2.pdf, section 5.8)
 * @returns {{[type: string]: {[method: string]: string[]}}}
 */
function parseEventTrackers(eventTrackers) {
  return (eventTrackers !== null && eventTrackers !== void 0 ? eventTrackers : []).reduce((tally, _ref) => {
    var _tally$event, _trackersForType$meth;
    let {
      event,
      method,
      url
    } = _ref;
    const trackersForType = tally[event] = (_tally$event = tally[event]) !== null && _tally$event !== void 0 ? _tally$event : {};
    const trackersForMethod = trackersForType[method] = (_trackersForType$meth = trackersForType[method]) !== null && _trackersForType$meth !== void 0 ? _trackersForType$meth : [];
    trackersForMethod.push(url);
    return tally;
  }, {});
}


/***/ }),

/***/ "./src/events.js":
/*!***********************!*\
  !*** ./src/events.js ***!
  \***********************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   emit: () => (/* binding */ emit),
/* harmony export */   getEvents: () => (/* binding */ getEvents),
/* harmony export */   off: () => (/* binding */ off),
/* harmony export */   on: () => (/* binding */ on)
/* harmony export */ });
/* unused harmony exports get, addEvents, has, clearEvents */
/* harmony import */ var _utils_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./utils.js */ "./src/utils.js");
/* harmony import */ var _constants_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./constants.js */ "./src/constants.js");
/* harmony import */ var _utils_ttlCollection_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./utils/ttlCollection.js */ "./src/utils/ttlCollection.js");
/* harmony import */ var _config_js__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ./config.js */ "./src/config.js");
/**
 * events.js
 */





// hide video events (unless the video module is included) with this one weird trick

// eslint-disable-next-line @typescript-eslint/no-empty-object-type

const TTL_CONFIG = 'eventHistoryTTL';
let eventTTL = null;

// keep a record of all events fired
const eventsFired = (0,_utils_ttlCollection_js__WEBPACK_IMPORTED_MODULE_2__.ttlCollection)({
  monotonic: true,
  ttl: () => eventTTL
});
_config_js__WEBPACK_IMPORTED_MODULE_3__.config.getConfig(TTL_CONFIG, cfg => {
  const previous = eventTTL;
  const val = cfg === null || cfg === void 0 ? void 0 : cfg[TTL_CONFIG];
  eventTTL = typeof val === 'number' ? val * 1000 : null;
  if (previous !== eventTTL) {
    eventsFired.refresh();
  }
});

// define entire events
let allEvents = Object.values(_constants_js__WEBPACK_IMPORTED_MODULE_1__.EVENTS);
const idPaths = _constants_js__WEBPACK_IMPORTED_MODULE_1__.EVENT_ID_PATHS;
const _public = function () {
  const _handlers = {};
  function _dispatch(eventName, args) {
    _utils_js__WEBPACK_IMPORTED_MODULE_0__.logMessage('Emitting event for: ' + eventName);
    const eventPayload = args[0] || {};
    const idPath = idPaths[eventName];
    const key = eventPayload[idPath];
    const event = _handlers[eventName] || {
      que: []
    };
    var eventKeys = Object.keys(event);
    const callbacks = [];

    // record the event:
    eventsFired.add({
      eventType: eventName,
      args: eventPayload,
      id: key,
      elapsedTime: _utils_js__WEBPACK_IMPORTED_MODULE_0__.getPerformanceNow()
    });

    /**
     * Push each specific callback to the `callbacks` array.
     * If the `event` map has a key that matches the value of the
     * event payload id path, e.g. `eventPayload[idPath]`, then apply
     * each function in the `que` array as an argument to push to the
     * `callbacks` array
     */
    if (key && eventKeys.includes(key)) {
      callbacks.push(...event[key].que);
    }

    /** Push each general callback to the `callbacks` array. */
    callbacks.push(...event.que);

    /** call each of the callbacks */
    (callbacks || []).forEach(function (fn) {
      if (!fn) return;
      try {
        fn(...args);
      } catch (e) {
        _utils_js__WEBPACK_IMPORTED_MODULE_0__.logError('Error executing handler:', 'events.js', e, eventName);
      }
    });
  }
  function _checkAvailableEvent(event) {
    return allEvents.includes(event);
  }
  return {
    has: _checkAvailableEvent,
    on: function (eventName, handler, id) {
      // check whether available event or not
      if (_checkAvailableEvent(eventName)) {
        const event = _handlers[eventName] || {
          que: []
        };
        if (id) {
          event[id] = event[id] || {
            que: []
          };
          event[id].que.push(handler);
        } else {
          event.que.push(handler);
        }
        _handlers[eventName] = event;
      } else {
        _utils_js__WEBPACK_IMPORTED_MODULE_0__.logError('Wrong event name : ' + eventName + ' Valid event names :' + allEvents);
      }
    },
    emit: function (eventName) {
      for (var _len = arguments.length, args = new Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
        args[_key - 1] = arguments[_key];
      }
      _dispatch(eventName, args);
    },
    off: function (eventName, handler, id) {
      const event = _handlers[eventName];
      if (_utils_js__WEBPACK_IMPORTED_MODULE_0__.isEmpty(event) || _utils_js__WEBPACK_IMPORTED_MODULE_0__.isEmpty(event.que) && _utils_js__WEBPACK_IMPORTED_MODULE_0__.isEmpty(event[id])) {
        return;
      }
      if (id && (_utils_js__WEBPACK_IMPORTED_MODULE_0__.isEmpty(event[id]) || _utils_js__WEBPACK_IMPORTED_MODULE_0__.isEmpty(event[id].que))) {
        return;
      }
      if (id) {
        (event[id].que || []).forEach(function (_handler) {
          const que = event[id].que;
          if (_handler === handler) {
            que.splice(que.indexOf(_handler), 1);
          }
        });
      } else {
        (event.que || []).forEach(function (_handler) {
          const que = event.que;
          if (_handler === handler) {
            que.splice(que.indexOf(_handler), 1);
          }
        });
      }
      _handlers[eventName] = event;
    },
    get: function () {
      return _handlers;
    },
    addEvents: function (events) {
      allEvents = allEvents.concat(events);
    },
    /**
     * Return a copy of all events fired
     */
    getEvents: function () {
      return eventsFired.toArray().map(val => Object.assign({}, val));
    }
  };
}();
_utils_js__WEBPACK_IMPORTED_MODULE_0__._setEventEmitter(_public.emit.bind(_public));
const {
  on,
  off,
  get,
  getEvents,
  emit,
  addEvents,
  has
} = _public;
function clearEvents() {
  eventsFired.clear();
}


/***/ }),

/***/ "./src/fpd/enrichment.js":
/*!*******************************!*\
  !*** ./src/fpd/enrichment.js ***!
  \*******************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   enrichFPD: () => (/* binding */ enrichFPD)
/* harmony export */ });
/* unused harmony export dep */
/* harmony import */ var _hook_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../hook.js */ "./src/hook.js");
/* harmony import */ var _refererDetection_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../refererDetection.js */ "./src/refererDetection.js");
/* harmony import */ var _rootDomain_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./rootDomain.js */ "./src/fpd/rootDomain.js");
/* harmony import */ var _utils_js__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ../utils.js */ "./src/utils.js");
/* harmony import */ var _utils_js__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ../utils.js */ "../../node_modules/dlv/index.js");
/* harmony import */ var _utils_js__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! ../utils.js */ "../../node_modules/dset/dist/index.mjs");
/* harmony import */ var _utils_js__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(/*! ../utils.js */ "./src/utils/objects.js");
/* harmony import */ var _utils_js__WEBPACK_IMPORTED_MODULE_7__ = __webpack_require__(/*! ../utils.js */ "./src/utils/winDimensions.js");
/* harmony import */ var _libraries_dnt_index_js__WEBPACK_IMPORTED_MODULE_8__ = __webpack_require__(/*! ../../libraries/dnt/index.js */ "./libraries/dnt/index.js");
/* harmony import */ var _config_js__WEBPACK_IMPORTED_MODULE_9__ = __webpack_require__(/*! ../config.js */ "./src/config.js");
/* harmony import */ var _sua_js__WEBPACK_IMPORTED_MODULE_10__ = __webpack_require__(/*! ./sua.js */ "./src/fpd/sua.js");
/* harmony import */ var _utils_promise_js__WEBPACK_IMPORTED_MODULE_11__ = __webpack_require__(/*! ../utils/promise.js */ "./src/utils/promise.js");
/* harmony import */ var _oneClient_js__WEBPACK_IMPORTED_MODULE_12__ = __webpack_require__(/*! ./oneClient.js */ "./src/fpd/oneClient.js");
/* harmony import */ var _activities_rules_js__WEBPACK_IMPORTED_MODULE_13__ = __webpack_require__(/*! ../activities/rules.js */ "./src/activities/rules.js");
/* harmony import */ var _activities_activityParams_js__WEBPACK_IMPORTED_MODULE_14__ = __webpack_require__(/*! ../activities/activityParams.js */ "./src/activities/activityParams.js");
/* harmony import */ var _activities_activities_js__WEBPACK_IMPORTED_MODULE_15__ = __webpack_require__(/*! ../activities/activities.js */ "./src/activities/activities.js");
/* harmony import */ var _activities_modules_js__WEBPACK_IMPORTED_MODULE_16__ = __webpack_require__(/*! ../activities/modules.js */ "./src/activities/modules.js");
/* harmony import */ var _libraries_viewport_viewport_js__WEBPACK_IMPORTED_MODULE_17__ = __webpack_require__(/*! ../../libraries/viewport/viewport.js */ "./libraries/viewport/viewport.js");














const dep = {
  getRefererInfo: _refererDetection_js__WEBPACK_IMPORTED_MODULE_1__.getRefererInfo,
  findRootDomain: _rootDomain_js__WEBPACK_IMPORTED_MODULE_2__.findRootDomain,
  getWindowTop: _utils_js__WEBPACK_IMPORTED_MODULE_3__.getWindowTop,
  getWindowSelf: _utils_js__WEBPACK_IMPORTED_MODULE_3__.getWindowSelf,
  getHighEntropySUA: _sua_js__WEBPACK_IMPORTED_MODULE_10__.getHighEntropySUA,
  getLowEntropySUA: _sua_js__WEBPACK_IMPORTED_MODULE_10__.getLowEntropySUA,
  getDocument: _utils_js__WEBPACK_IMPORTED_MODULE_3__.getDocument
};
const oneClient = (0,_oneClient_js__WEBPACK_IMPORTED_MODULE_12__.clientSectionChecker)('FPD');
/**
 * Enrich an ortb2 object with first-party data.
 * @param {Promise<Object>} fpd - A promise that resolves to an ortb2 object.
 * @returns {Promise<Object>} - A promise that resolves to an enriched ortb2 object.
 */
const enrichFPD = (0,_hook_js__WEBPACK_IMPORTED_MODULE_0__.hook)('sync', fpd => {
  const promArr = [fpd, getSUA().catch(() => null), tryToGetCdepLabel().catch(() => null)];
  return _utils_promise_js__WEBPACK_IMPORTED_MODULE_11__.PbPromise.all(promArr).then(_ref => {
    let [ortb2, sua, cdep] = _ref;
    const ri = dep.getRefererInfo();
    Object.entries(ENRICHMENTS).forEach(_ref2 => {
      let [section, getEnrichments] = _ref2;
      const data = getEnrichments(ortb2, ri);
      if (data && Object.keys(data).length > 0) {
        ortb2[section] = (0,_utils_js__WEBPACK_IMPORTED_MODULE_3__.mergeDeep)({}, data, ortb2[section]);
      }
    });
    if (sua) {
      (0,_utils_js__WEBPACK_IMPORTED_MODULE_5__.dset)(ortb2, 'device.sua', Object.assign({}, sua, ortb2.device.sua));
    }
    if (cdep) {
      const ext = {
        cdep
      };
      (0,_utils_js__WEBPACK_IMPORTED_MODULE_5__.dset)(ortb2, 'device.ext', Object.assign({}, ext, ortb2.device.ext));
    }
    const documentLang = dep.getDocument().documentElement.lang;
    if (documentLang) {
      (0,_utils_js__WEBPACK_IMPORTED_MODULE_5__.dset)(ortb2, 'site.ext.data.documentLang', documentLang);
      if (!(0,_utils_js__WEBPACK_IMPORTED_MODULE_4__["default"])(ortb2, 'site.content.language')) {
        const langCode = documentLang.split('-')[0];
        (0,_utils_js__WEBPACK_IMPORTED_MODULE_5__.dset)(ortb2, 'site.content.language', langCode);
      }
    }
    ortb2 = oneClient(ortb2);
    for (const section of _oneClient_js__WEBPACK_IMPORTED_MODULE_12__.CLIENT_SECTIONS) {
      if ((0,_oneClient_js__WEBPACK_IMPORTED_MODULE_12__.hasSection)(ortb2, section)) {
        ortb2[section] = (0,_utils_js__WEBPACK_IMPORTED_MODULE_3__.mergeDeep)({}, clientEnrichment(ortb2, ri), ortb2[section]);
        break;
      }
    }
    return ortb2;
  });
});
function winFallback(fn) {
  try {
    return fn(dep.getWindowTop());
  } catch (e) {
    return fn(dep.getWindowSelf());
  }
}
function getSUA() {
  const hints = _config_js__WEBPACK_IMPORTED_MODULE_9__.config.getConfig('firstPartyData.uaHints');
  return !Array.isArray(hints) || hints.length === 0 ? _utils_promise_js__WEBPACK_IMPORTED_MODULE_11__.PbPromise.resolve(dep.getLowEntropySUA()) : dep.getHighEntropySUA(hints);
}
function removeUndef(obj) {
  return (0,_utils_js__WEBPACK_IMPORTED_MODULE_6__.getDefinedParams)(obj, Object.keys(obj));
}
function tryToGetCdepLabel() {
  return _utils_promise_js__WEBPACK_IMPORTED_MODULE_11__.PbPromise.resolve('cookieDeprecationLabel' in navigator && (0,_activities_rules_js__WEBPACK_IMPORTED_MODULE_13__.isActivityAllowed)(_activities_activities_js__WEBPACK_IMPORTED_MODULE_15__.ACTIVITY_ACCESS_DEVICE, (0,_activities_activityParams_js__WEBPACK_IMPORTED_MODULE_14__.activityParams)(_activities_modules_js__WEBPACK_IMPORTED_MODULE_16__.MODULE_TYPE_PREBID, 'cdep')) && navigator.cookieDeprecationLabel.getValue());
}
const ENRICHMENTS = {
  site(ortb2, ri) {
    if (_oneClient_js__WEBPACK_IMPORTED_MODULE_12__.CLIENT_SECTIONS.filter(p => p !== 'site').some(_oneClient_js__WEBPACK_IMPORTED_MODULE_12__.hasSection.bind(null, ortb2))) {
      // do not enrich site if dooh or app are set
      return;
    }
    return removeUndef({
      page: ri.page,
      ref: ri.ref
    });
  },
  device() {
    return winFallback(win => {
      // screen.width and screen.height are the physical dimensions of the screen
      const w = (0,_utils_js__WEBPACK_IMPORTED_MODULE_7__.getWinDimensions)().screen.width;
      const h = (0,_utils_js__WEBPACK_IMPORTED_MODULE_7__.getWinDimensions)().screen.height;

      // vpw and vph are the viewport dimensions of the browser window
      const {
        width: vpw,
        height: vph
      } = (0,_libraries_viewport_viewport_js__WEBPACK_IMPORTED_MODULE_17__.getViewportSize)();
      const device = {
        w,
        h,
        dnt: (0,_libraries_dnt_index_js__WEBPACK_IMPORTED_MODULE_8__.getDNT)() ? 1 : 0,
        ua: win.navigator.userAgent,
        language: win.navigator.language.split('-').shift(),
        ext: {
          vpw,
          vph
        }
      };
      return device;
    });
  },
  regs() {
    const regs = {};
    if (winFallback(win => win.navigator.globalPrivacyControl)) {
      (0,_utils_js__WEBPACK_IMPORTED_MODULE_5__.dset)(regs, 'ext.gpc', '1');
    }
    const coppa = _config_js__WEBPACK_IMPORTED_MODULE_9__.config.getConfig('coppa');
    if (typeof coppa === 'boolean') {
      regs.coppa = coppa ? 1 : 0;
    }
    return regs;
  }
};

// Enrichment of properties common across dooh, app and site - will be dropped into whatever
// section is appropriate
function clientEnrichment(ortb2, ri) {
  var _winFallback, _winFallback$replace;
  const domain = (0,_refererDetection_js__WEBPACK_IMPORTED_MODULE_1__.parseDomain)(ri.page, {
    noLeadingWww: true
  });
  const keywords = (_winFallback = winFallback(win => win.document.querySelector('meta[name=\'keywords\']'))) === null || _winFallback === void 0 || (_winFallback = _winFallback.content) === null || _winFallback === void 0 || (_winFallback$replace = _winFallback.replace) === null || _winFallback$replace === void 0 ? void 0 : _winFallback$replace.call(_winFallback, /\s/g, '');
  return removeUndef({
    domain,
    keywords,
    publisher: removeUndef({
      domain: dep.findRootDomain(domain)
    })
  });
}


/***/ }),

/***/ "./src/fpd/normalize.js":
/*!******************************!*\
  !*** ./src/fpd/normalize.js ***!
  \******************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   normalizeFPD: () => (/* binding */ normalizeFPD)
/* harmony export */ });
/* unused harmony exports normalizeEIDs, normalizeSchain */
/* harmony import */ var _utils_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../utils.js */ "./src/utils.js");
/* harmony import */ var _utils_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../utils.js */ "../../node_modules/dset/dist/index.mjs");
/* harmony import */ var _hook_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../hook.js */ "./src/hook.js");


const normalizeFPD = (0,_hook_js__WEBPACK_IMPORTED_MODULE_2__.hook)('sync', function (ortb2Fragments) {
  [normalizeEIDs, normalizeSchain].forEach(normalizer => applyNormalizer(normalizer, ortb2Fragments));
  return ortb2Fragments;
});
function applyNormalizer(normalizer, ortb2Fragments) {
  ortb2Fragments.global = normalizer(ortb2Fragments.global, 'global FPD');
  Object.entries(ortb2Fragments.bidder).forEach(_ref => {
    let [bidder, ortb2] = _ref;
    ortb2Fragments.bidder[bidder] = normalizer(ortb2, "bidder '".concat(bidder, "' FPD"));
  });
}
function normalizeEIDs(target, context) {
  var _target$user$eids, _target$user, _target$user$ext$eids, _target$user2, _target$user3;
  if (!target) return target;
  const seen = [];
  const eids = [...((_target$user$eids = target === null || target === void 0 || (_target$user = target.user) === null || _target$user === void 0 ? void 0 : _target$user.eids) !== null && _target$user$eids !== void 0 ? _target$user$eids : []).map(eid => [0, eid]), ...((_target$user$ext$eids = target === null || target === void 0 || (_target$user2 = target.user) === null || _target$user2 === void 0 || (_target$user2 = _target$user2.ext) === null || _target$user2 === void 0 ? void 0 : _target$user2.eids) !== null && _target$user$ext$eids !== void 0 ? _target$user$ext$eids : []).map(eid => [1, eid])].filter(_ref2 => {
    let [source, eid] = _ref2;
    if (seen.findIndex(_ref3 => {
      let [candidateSource, candidateEid] = _ref3;
      return source !== candidateSource && (0,_utils_js__WEBPACK_IMPORTED_MODULE_0__.deepEqual)(candidateEid, eid);
    }) > -1) {
      (0,_utils_js__WEBPACK_IMPORTED_MODULE_0__.logWarn)("Found duplicate EID in user.eids and user.ext.eids (".concat(context, ")"), eid);
      return false;
    } else {
      seen.push([source, eid]);
      return true;
    }
  });
  if (eids.length > 0) {
    (0,_utils_js__WEBPACK_IMPORTED_MODULE_1__.dset)(target, 'user.ext.eids', eids.map(_ref4 => {
      let [_, eid] = _ref4;
      return eid;
    }));
  }
  target === null || target === void 0 || (_target$user3 = target.user) === null || _target$user3 === void 0 || delete _target$user3.eids;
  return target;
}
function normalizeSchain(target, context) {
  var _target$source, _target$source2, _target$source3;
  if (!target) return target;
  const schain = (_target$source = target.source) === null || _target$source === void 0 ? void 0 : _target$source.schain;
  const extSchain = (_target$source2 = target.source) === null || _target$source2 === void 0 || (_target$source2 = _target$source2.ext) === null || _target$source2 === void 0 ? void 0 : _target$source2.schain;
  if (schain != null && extSchain != null && !(0,_utils_js__WEBPACK_IMPORTED_MODULE_0__.deepEqual)(schain, extSchain)) {
    (0,_utils_js__WEBPACK_IMPORTED_MODULE_0__.logWarn)("Conflicting source.schain and source.ext.schain (".concat(context, "), preferring source.schain"), {
      'source.schain': schain,
      'source.ext.schain': extSchain
    });
  }
  if ((schain !== null && schain !== void 0 ? schain : extSchain) != null) {
    (0,_utils_js__WEBPACK_IMPORTED_MODULE_1__.dset)(target, 'source.ext.schain', schain !== null && schain !== void 0 ? schain : extSchain);
  }
  (_target$source3 = target.source) === null || _target$source3 === void 0 || delete _target$source3.schain;
  return target;
}


/***/ }),

/***/ "./src/fpd/oneClient.js":
/*!******************************!*\
  !*** ./src/fpd/oneClient.js ***!
  \******************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   CLIENT_SECTIONS: () => (/* binding */ CLIENT_SECTIONS),
/* harmony export */   clientSectionChecker: () => (/* binding */ clientSectionChecker),
/* harmony export */   hasSection: () => (/* binding */ hasSection)
/* harmony export */ });
/* harmony import */ var _utils_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../utils.js */ "./src/utils.js");


// mutually exclusive ORTB sections in order of priority - 'dooh' beats 'app' & 'site' and 'app' beats 'site';
// if one is set, the others will be removed
const CLIENT_SECTIONS = ['dooh', 'app', 'site'];
function clientSectionChecker(logPrefix) {
  return function onlyOneClientSection(ortb2) {
    CLIENT_SECTIONS.reduce((found, section) => {
      if (hasSection(ortb2, section)) {
        if (found != null) {
          (0,_utils_js__WEBPACK_IMPORTED_MODULE_0__.logWarn)("".concat(logPrefix, " specifies both '").concat(found, "' and '").concat(section, "'; dropping the latter."));
          delete ortb2[section];
        } else {
          found = section;
        }
      }
      return found;
    }, null);
    return ortb2;
  };
}
function hasSection(ortb2, section) {
  return ortb2[section] != null && Object.keys(ortb2[section]).length > 0;
}


/***/ }),

/***/ "./src/fpd/rootDomain.js":
/*!*******************************!*\
  !*** ./src/fpd/rootDomain.js ***!
  \*******************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   findRootDomain: () => (/* binding */ findRootDomain)
/* harmony export */ });
/* unused harmony export coreStorage */
/* harmony import */ var _utils_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../utils.js */ "./src/utils.js");
/* harmony import */ var _storageManager_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../storageManager.js */ "./src/storageManager.js");


const coreStorage = (0,_storageManager_js__WEBPACK_IMPORTED_MODULE_1__.getCoreStorageManager)('fpdEnrichment');

/**
 * Find the root domain by testing for the topmost domain that will allow setting cookies.
 */

const findRootDomain = (0,_utils_js__WEBPACK_IMPORTED_MODULE_0__.memoize)(function findRootDomain() {
  let fullDomain = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : window.location.host;
  if (!coreStorage.cookiesAreEnabled()) {
    return fullDomain;
  }
  const domainParts = fullDomain.split('.');
  if (domainParts.length === 2) {
    return fullDomain;
  }
  let rootDomain;
  let continueSearching;
  let startIndex = -2;
  do {
    rootDomain = domainParts.slice(startIndex).join('.');
    if ((0,_storageManager_js__WEBPACK_IMPORTED_MODULE_1__.canSetCookie)(rootDomain, coreStorage)) {
      continueSearching = false;
    } else {
      startIndex += -1;
      continueSearching = Math.abs(startIndex) <= domainParts.length;
    }
  } while (continueSearching);
  return rootDomain;
});


/***/ }),

/***/ "./src/fpd/sua.js":
/*!************************!*\
  !*** ./src/fpd/sua.js ***!
  \************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   getHighEntropySUA: () => (/* binding */ getHighEntropySUA),
/* harmony export */   getLowEntropySUA: () => (/* binding */ getLowEntropySUA)
/* harmony export */ });
/* unused harmony exports SUA_SOURCE_UNKNOWN, SUA_SOURCE_LOW_ENTROPY, SUA_SOURCE_HIGH_ENTROPY, SUA_SOURCE_UA_HEADER, HIGH_ENTROPY_HINTS, LOW_ENTROPY_HINTS, lowEntropySUAAccessor, highEntropySUAAccessor, uaDataToSUA */
/* harmony import */ var _utils_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../utils.js */ "./src/utils.js");
/* harmony import */ var _utils_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../utils.js */ "./src/utils/objects.js");
/* harmony import */ var _utils_promise_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../utils/promise.js */ "./src/utils/promise.js");


const SUA_SOURCE_UNKNOWN = 0;
const SUA_SOURCE_LOW_ENTROPY = 1;
const SUA_SOURCE_HIGH_ENTROPY = 2;
const SUA_SOURCE_UA_HEADER = 3;

// "high entropy" (i.e. privacy-sensitive) fields that can be requested from the navigator.
const HIGH_ENTROPY_HINTS = ['architecture', 'bitness', 'model', 'platformVersion', 'fullVersionList'];
const LOW_ENTROPY_HINTS = ['brands', 'mobile', 'platform'];

/**
 * Returns low entropy UA client hints encoded as an ortb2.6 device.sua object; or null if no UA client hints are available.
 */
const getLowEntropySUA = lowEntropySUAAccessor();

/**
 * Returns a promise to high entropy UA client hints encoded as an ortb2.6 device.sua object, or null if no UA client hints are available.
 *
 * Note that the return value is a promise because the underlying browser API returns a promise; this
 * seems to plan for additional controls (such as alerts / permission request prompts to the user); it's unclear
 * at the moment if this means that asking for more hints would result in slower / more expensive calls.
 *
 * @param {Array[String]} hints hints to request, defaults to all (HIGH_ENTROPY_HINTS).
 */
const getHighEntropySUA = highEntropySUAAccessor();
function lowEntropySUAAccessor() {
  var _window$navigator;
  let uaData = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : (_window$navigator = window.navigator) === null || _window$navigator === void 0 ? void 0 : _window$navigator.userAgentData;
  const sua = uaData && LOW_ENTROPY_HINTS.some(h => typeof uaData[h] !== 'undefined') ? Object.freeze(uaDataToSUA(SUA_SOURCE_LOW_ENTROPY, uaData)) : null;
  return function () {
    return sua;
  };
}
function highEntropySUAAccessor() {
  var _window$navigator2;
  let uaData = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : (_window$navigator2 = window.navigator) === null || _window$navigator2 === void 0 ? void 0 : _window$navigator2.userAgentData;
  const cache = {};
  const keys = new WeakMap();
  return function () {
    let hints = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : HIGH_ENTROPY_HINTS;
    if (!keys.has(hints)) {
      const sorted = Array.from(hints);
      sorted.sort();
      keys.set(hints, sorted.join('|'));
    }
    const key = keys.get(hints);
    if (!cache.hasOwnProperty(key)) {
      try {
        cache[key] = uaData.getHighEntropyValues(hints).then(result => {
          return (0,_utils_js__WEBPACK_IMPORTED_MODULE_0__.isEmpty)(result) ? null : Object.freeze(uaDataToSUA(SUA_SOURCE_HIGH_ENTROPY, result));
        }).catch(() => null);
      } catch (e) {
        cache[key] = _utils_promise_js__WEBPACK_IMPORTED_MODULE_2__.PbPromise.resolve(null);
      }
    }
    return cache[key];
  };
}

/**
 * Convert a User Agent client hints object to an ORTB 2.6 device.sua fragment
 * https://iabtechlab.com/wp-content/uploads/2022/04/OpenRTB-2-6_FINAL.pdf
 *
 * @param source source of the UAData object (0 to 3)
 * @param uaData https://developer.mozilla.org/en-US/docs/Web/API/NavigatorUAData/
 * @return {{}}
 */
function uaDataToSUA(source, uaData) {
  function toBrandVersion(brand, version) {
    const bv = {
      brand
    };
    if ((0,_utils_js__WEBPACK_IMPORTED_MODULE_1__.isStr)(version) && !(0,_utils_js__WEBPACK_IMPORTED_MODULE_0__.isEmptyStr)(version)) {
      bv.version = version.split('.');
    }
    return bv;
  }
  const sua = {
    source
  };
  if (uaData.platform) {
    sua.platform = toBrandVersion(uaData.platform, uaData.platformVersion);
  }
  if (uaData.fullVersionList || uaData.brands) {
    sua.browsers = (uaData.fullVersionList || uaData.brands).map(_ref => {
      let {
        brand,
        version
      } = _ref;
      return toBrandVersion(brand, version);
    });
  }
  if (typeof uaData['mobile'] !== 'undefined') {
    sua.mobile = uaData.mobile ? 1 : 0;
  }
  ['model', 'bitness', 'architecture'].forEach(prop => {
    const value = uaData[prop];
    if ((0,_utils_js__WEBPACK_IMPORTED_MODULE_1__.isStr)(value)) {
      sua[prop] = value;
    }
  });
  return sua;
}


/***/ }),

/***/ "./src/hook.js":
/*!*********************!*\
  !*** ./src/hook.js ***!
  \*********************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   getHook: () => (/* binding */ getHook),
/* harmony export */   hook: () => (/* binding */ hook),
/* harmony export */   ignoreCallbackArg: () => (/* binding */ ignoreCallbackArg),
/* harmony export */   wrapHook: () => (/* binding */ wrapHook)
/* harmony export */ });
/* unused harmony exports ready, setupBeforeHookFnOnce, module, submodule */
/* harmony import */ var fun_hooks_no_eval_index_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! fun-hooks/no-eval/index.js */ "../../node_modules/fun-hooks/no-eval/index.js");
/* harmony import */ var fun_hooks_no_eval_index_js__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(fun_hooks_no_eval_index_js__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _utils_promise_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./utils/promise.js */ "./src/utils/promise.js");


/**
 * NOTE: you must not call `next` asynchronously from 'sync' hooks
 * see https://github.com/snapwich/fun-hooks/issues/42
 */

const hook = fun_hooks_no_eval_index_js__WEBPACK_IMPORTED_MODULE_0___default()({
  ready: (fun_hooks_no_eval_index_js__WEBPACK_IMPORTED_MODULE_0___default().SYNC) | (fun_hooks_no_eval_index_js__WEBPACK_IMPORTED_MODULE_0___default().ASYNC) | (fun_hooks_no_eval_index_js__WEBPACK_IMPORTED_MODULE_0___default().QUEUE)
});
const readyCtl = (0,_utils_promise_js__WEBPACK_IMPORTED_MODULE_1__.defer)();
hook.ready = (() => {
  const ready = hook.ready;
  return function () {
    try {
      return ready.apply(hook);
    } finally {
      readyCtl.resolve();
    }
  };
})();

/**
 * A promise that resolves when hooks are ready.
 * @type {Promise}
 */
const ready = readyCtl.promise;
const getHook = hook.get;
function setupBeforeHookFnOnce(baseFn, hookFn) {
  let priority = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 15;
  const result = baseFn.getHooks({
    hook: hookFn
  });
  if (result.length === 0) {
    baseFn.before(hookFn, priority);
  }
}
const submoduleInstallMap = {};
function module(name, install) {
  let {
    postInstallAllowed = false
  } = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};
  hook('async', function (submodules) {
    submodules.forEach(args => install(...args));
    if (postInstallAllowed) submoduleInstallMap[name] = install;
  }, name)([]); // will be queued until hook.ready() called in pbjs.processQueue();
}
function submodule(name) {
  for (var _len = arguments.length, args = new Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
    args[_key - 1] = arguments[_key];
  }
  const install = submoduleInstallMap[name];
  if (install) return install(...args);
  getHook(name).before((next, modules) => {
    modules.push(args);
    next(modules);
  });
}

/**
 * Copy hook methods (.before, .after, etc) from a given hook to a given wrapper object.
 */
function wrapHook(hook, wrapper) {
  Object.defineProperties(wrapper, Object.fromEntries(['before', 'after', 'getHooks', 'removeAll'].map(m => [m, {
    get: () => hook[m]
  }])));
  return wrapper;
}

/**
 * 'async' hooks expect the last argument to be a callback, and have special treatment for it if it's a function;
 * which prevents it from being used as a normal argument in 'before' hooks - and presents a modified version of it
 * to the hooked function.
 *
 * This returns a wrapper around a given 'async' hook that works around this, for when the last argument
 * should be treated as a normal argument.
 */
function ignoreCallbackArg(hook) {
  return wrapHook(hook, function () {
    for (var _len2 = arguments.length, args = new Array(_len2), _key2 = 0; _key2 < _len2; _key2++) {
      args[_key2] = arguments[_key2];
    }
    args.push(function () {});
    return hook.apply(this, args);
  });
}


/***/ }),

/***/ "./src/mediaTypes.js":
/*!***************************!*\
  !*** ./src/mediaTypes.js ***!
  \***************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   ADPOD: () => (/* binding */ ADPOD),
/* harmony export */   AUDIO: () => (/* binding */ AUDIO),
/* harmony export */   BANNER: () => (/* binding */ BANNER),
/* harmony export */   NATIVE: () => (/* binding */ NATIVE),
/* harmony export */   VIDEO: () => (/* binding */ VIDEO)
/* harmony export */ });
/* unused harmony export ALL_MEDIATYPES */
/**
 * This file contains the valid Media Types in Prebid.
 *
 * All adapters are assumed to support banner ads. Other media types are specified by Adapters when they
 * register themselves with prebid-core.
 */

const NATIVE = 'native';
const VIDEO = 'video';
const BANNER = 'banner';
const ADPOD = 'adpod';
const AUDIO = 'audio';
const ALL_MEDIATYPES = [NATIVE, VIDEO, BANNER, AUDIO];


/***/ }),

/***/ "./src/native.js":
/*!***********************!*\
  !*** ./src/native.js ***!
  \***********************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   decorateAdUnitsWithNativeParams: () => (/* binding */ decorateAdUnitsWithNativeParams),
/* harmony export */   fireNativeTrackers: () => (/* binding */ fireNativeTrackers),
/* harmony export */   getAllAssetsMessage: () => (/* binding */ getAllAssetsMessage),
/* harmony export */   getAssetMessage: () => (/* binding */ getAssetMessage),
/* harmony export */   isNativeResponse: () => (/* binding */ isNativeResponse),
/* harmony export */   nativeAdapters: () => (/* binding */ nativeAdapters),
/* harmony export */   nativeBidIsValid: () => (/* binding */ nativeBidIsValid),
/* harmony export */   setNativeResponseProperties: () => (/* binding */ setNativeResponseProperties)
/* harmony export */ });
/* unused harmony exports IMAGE, processNativeAdUnitParams, isOpenRTBBidRequestValid, nativeAdUnit, nativeBidder, hasNonNativeBidder, isNativeOpenRTBBidValid, fireImpressionTrackers, fireClickTrackers, getNativeRenderingData, toOrtbNativeRequest, fromOrtbNativeRequest, convertOrtbRequestToProprietaryNative, legacyPropertiesToOrtbNative, toOrtbNativeResponse, toLegacyResponse */
/* harmony import */ var _babel_runtime_helpers_defineProperty__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @babel/runtime/helpers/defineProperty */ "../../node_modules/@babel/runtime/helpers/esm/defineProperty.js");
/* harmony import */ var _utils_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./utils.js */ "./src/utils.js");
/* harmony import */ var _utils_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./utils.js */ "./src/utils/objects.js");
/* harmony import */ var _auctionManager_js__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ./auctionManager.js */ "./src/auctionManager.js");
/* harmony import */ var _constants_js__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ./constants.js */ "./src/constants.js");
/* harmony import */ var _mediaTypes_js__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! ./mediaTypes.js */ "./src/mediaTypes.js");
/* harmony import */ var _adRendering_js__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(/*! ./adRendering.js */ "./src/adRendering.js");
/* harmony import */ var _creativeRenderers_js__WEBPACK_IMPORTED_MODULE_7__ = __webpack_require__(/*! ./creativeRenderers.js */ "./src/creativeRenderers.js");
/* harmony import */ var _eventTrackers_js__WEBPACK_IMPORTED_MODULE_8__ = __webpack_require__(/*! ./eventTrackers.js */ "./src/eventTrackers.js");

function ownKeys(e, r) { var t = Object.keys(e); if (Object.getOwnPropertySymbols) { var o = Object.getOwnPropertySymbols(e); r && (o = o.filter(function (r) { return Object.getOwnPropertyDescriptor(e, r).enumerable; })), t.push.apply(t, o); } return t; }
function _objectSpread(e) { for (var r = 1; r < arguments.length; r++) { var t = null != arguments[r] ? arguments[r] : {}; r % 2 ? ownKeys(Object(t), !0).forEach(function (r) { (0,_babel_runtime_helpers_defineProperty__WEBPACK_IMPORTED_MODULE_0__["default"])(e, r, t[r]); }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(e, Object.getOwnPropertyDescriptors(t)) : ownKeys(Object(t)).forEach(function (r) { Object.defineProperty(e, r, Object.getOwnPropertyDescriptor(t, r)); }); } return e; }







const nativeAdapters = [];
const IMAGE = {
  ortb: {
    ver: '1.2',
    assets: [{
      required: 1,
      id: 1,
      img: {
        type: 3,
        wmin: 100,
        hmin: 100
      }
    }, {
      required: 1,
      id: 2,
      title: {
        len: 140
      }
    }, {
      required: 1,
      id: 3,
      data: {
        type: 1
      }
    }, {
      required: 0,
      id: 4,
      data: {
        type: 2
      }
    }, {
      required: 0,
      id: 5,
      img: {
        type: 1,
        wmin: 20,
        hmin: 20
      }
    }]
  },
  image: {
    required: true
  },
  title: {
    required: true
  },
  sponsoredBy: {
    required: true
  },
  clickUrl: {
    required: true
  },
  body: {
    required: false
  },
  icon: {
    required: false
  }
};
const SUPPORTED_TYPES = {
  image: IMAGE
};

// inverse native maps useful for converting to legacy
const PREBID_NATIVE_DATA_KEYS_TO_ORTB_INVERSE = inverse(_constants_js__WEBPACK_IMPORTED_MODULE_4__.PREBID_NATIVE_DATA_KEYS_TO_ORTB);
const NATIVE_ASSET_TYPES_INVERSE = inverse(_constants_js__WEBPACK_IMPORTED_MODULE_4__.NATIVE_ASSET_TYPES);
function isNativeResponse(bidResponse) {
  // check for native data and not mediaType; it's possible
  // to treat banner responses as native
  return bidResponse.native != null && typeof bidResponse.native === 'object';
}

/**
 * Recieves nativeParams from an adUnit. If the params were not of type 'type',
 * passes them on directly. If they were of type 'type', translate
 * them into the predefined specific asset requests for that type of native ad.
 */
function processNativeAdUnitParams(params) {
  if (params && params.type && typeIsSupported(params.type)) {
    params = SUPPORTED_TYPES[params.type];
  }
  if (params && params.ortb && !isOpenRTBBidRequestValid(params.ortb)) {
    return;
  }
  return params;
}
function decorateAdUnitsWithNativeParams(adUnits) {
  adUnits.forEach(adUnit => {
    var _adUnit$mediaTypes;
    const nativeParams = adUnit.nativeParams || (adUnit === null || adUnit === void 0 || (_adUnit$mediaTypes = adUnit.mediaTypes) === null || _adUnit$mediaTypes === void 0 ? void 0 : _adUnit$mediaTypes.native);
    if (nativeParams) {
      adUnit.nativeParams = processNativeAdUnitParams(nativeParams);
    }
    if (adUnit.nativeParams) {
      adUnit.nativeOrtbRequest = adUnit.nativeParams.ortb || toOrtbNativeRequest(adUnit.nativeParams);
    }
  });
}
function isOpenRTBBidRequestValid(ortb) {
  const assets = ortb.assets;
  if (!Array.isArray(assets) || assets.length === 0) {
    (0,_utils_js__WEBPACK_IMPORTED_MODULE_1__.logError)("assets in mediaTypes.native.ortb is not an array, or it's empty. Assets: ", assets);
    return false;
  }

  // validate that ids exist, that they are unique and that they are numbers
  const ids = assets.map(asset => asset.id);
  if (assets.length !== new Set(ids).size || ids.some(id => id !== parseInt(id, 10))) {
    (0,_utils_js__WEBPACK_IMPORTED_MODULE_1__.logError)("each asset object must have 'id' property, it must be unique and it must be an integer");
    return false;
  }
  if (ortb.hasOwnProperty('eventtrackers') && !Array.isArray(ortb.eventtrackers)) {
    (0,_utils_js__WEBPACK_IMPORTED_MODULE_1__.logError)('ortb.eventtrackers is not an array. Eventtrackers: ', ortb.eventtrackers);
    return false;
  }
  return assets.every(asset => isOpenRTBAssetValid(asset));
}
function isOpenRTBAssetValid(asset) {
  if (!(0,_utils_js__WEBPACK_IMPORTED_MODULE_2__.isPlainObject)(asset)) {
    (0,_utils_js__WEBPACK_IMPORTED_MODULE_1__.logError)("asset must be an object. Provided asset: ", asset);
    return false;
  }
  if (asset.img) {
    if (!(0,_utils_js__WEBPACK_IMPORTED_MODULE_2__.isNumber)(asset.img.w) && !(0,_utils_js__WEBPACK_IMPORTED_MODULE_2__.isNumber)(asset.img.wmin)) {
      (0,_utils_js__WEBPACK_IMPORTED_MODULE_1__.logError)("for img asset there must be 'w' or 'wmin' property");
      return false;
    }
    if (!(0,_utils_js__WEBPACK_IMPORTED_MODULE_2__.isNumber)(asset.img.h) && !(0,_utils_js__WEBPACK_IMPORTED_MODULE_2__.isNumber)(asset.img.hmin)) {
      (0,_utils_js__WEBPACK_IMPORTED_MODULE_1__.logError)("for img asset there must be 'h' or 'hmin' property");
      return false;
    }
  } else if (asset.title) {
    if (!(0,_utils_js__WEBPACK_IMPORTED_MODULE_2__.isNumber)(asset.title.len)) {
      (0,_utils_js__WEBPACK_IMPORTED_MODULE_1__.logError)("for title asset there must be 'len' property defined");
      return false;
    }
  } else if (asset.data) {
    if (!(0,_utils_js__WEBPACK_IMPORTED_MODULE_2__.isNumber)(asset.data.type)) {
      (0,_utils_js__WEBPACK_IMPORTED_MODULE_1__.logError)("for data asset 'type' property must be a number");
      return false;
    }
  } else if (asset.video) {
    if (!Array.isArray(asset.video.mimes) || !Array.isArray(asset.video.protocols) || !(0,_utils_js__WEBPACK_IMPORTED_MODULE_2__.isNumber)(asset.video.minduration) || !(0,_utils_js__WEBPACK_IMPORTED_MODULE_2__.isNumber)(asset.video.maxduration)) {
      (0,_utils_js__WEBPACK_IMPORTED_MODULE_1__.logError)('video asset is not properly configured');
      return false;
    }
  }
  return true;
}

/**
 * Check if the native type specified in the adUnit is supported by Prebid.
 */
function typeIsSupported(type) {
  if (!(type && Object.keys(SUPPORTED_TYPES).includes(type))) {
    (0,_utils_js__WEBPACK_IMPORTED_MODULE_1__.logError)("".concat(type, " nativeParam is not supported"));
    return false;
  }
  return true;
}

/**
 * Helper functions for working with native-enabled adUnits
 * TODO: abstract this and the video helper functions into general
 * adunit validation helper functions
 */
const nativeAdUnit = adUnit => {
  var _adUnit$mediaTypes2;
  const mediaType = adUnit.mediaType === 'native';
  const mediaTypes = adUnit === null || adUnit === void 0 || (_adUnit$mediaTypes2 = adUnit.mediaTypes) === null || _adUnit$mediaTypes2 === void 0 ? void 0 : _adUnit$mediaTypes2.native;
  return mediaType || mediaTypes;
};
const nativeBidder = bid => nativeAdapters.includes(bid.bidder);
const hasNonNativeBidder = adUnit => adUnit.bids.filter(bid => !nativeBidder(bid)).length;

/**
 * Validate that the native assets on this bid contain all assets that were
 * marked as required in the adUnit configuration.
 * bid Native bid to validate
 * @return {Boolean} If object is valid
 */
function nativeBidIsValid(bid) {
  var _bid$native;
  let {
    index = _auctionManager_js__WEBPACK_IMPORTED_MODULE_3__.auctionManager.index
  } = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
  const adUnit = index.getAdUnit(bid);
  if (!adUnit) {
    return false;
  }
  const ortbRequest = adUnit.nativeOrtbRequest;
  const ortbResponse = ((_bid$native = bid.native) === null || _bid$native === void 0 ? void 0 : _bid$native.ortb) || toOrtbNativeResponse(bid.native, ortbRequest);
  return isNativeOpenRTBBidValid(ortbResponse, ortbRequest);
}
function isNativeOpenRTBBidValid(bidORTB, bidRequestORTB) {
  var _bidORTB$link;
  if (!(bidORTB !== null && bidORTB !== void 0 && (_bidORTB$link = bidORTB.link) !== null && _bidORTB$link !== void 0 && _bidORTB$link.url)) {
    (0,_utils_js__WEBPACK_IMPORTED_MODULE_1__.logError)("native response doesn't have 'link' property. Ortb response: ", bidORTB);
    return false;
  }
  const requiredAssetIds = bidRequestORTB.assets.filter(asset => asset.required === 1).map(a => a.id);
  const returnedAssetIds = bidORTB.assets.map(asset => asset.id);
  const match = requiredAssetIds.every(assetId => returnedAssetIds.includes(assetId));
  if (!match) {
    (0,_utils_js__WEBPACK_IMPORTED_MODULE_1__.logError)("didn't receive a bid with all required assets. Required ids: ".concat(requiredAssetIds, ", but received ids in response: ").concat(returnedAssetIds));
  }
  return match;
}

/*
 * Native responses may have associated impression or click trackers.
 * This retrieves the appropriate tracker urls for the given ad object and
 * fires them. As a native creatives may be in a cross-origin frame, it may be
 * necessary to invoke this function via postMessage. secureCreatives is
 * configured to fire this function when it receives a `message` of 'Prebid Native'
 * and an `adId` with the value of the `bid.adId`. When a message is posted with
 * these parameters, impression trackers are fired. To fire click trackers, the
 * message should contain an `action` set to 'click'.
 *
 * // Native creative template example usage
 * <a href="%%CLICK_URL_UNESC%%%%PATTERN:hb_native_linkurl%%"
 *    target="_blank"
 *    onclick="fireTrackers('click')">
 *    %%PATTERN:hb_native_title%%
 * </a>
 *
 * <script>
 *   function fireTrackers(action) {
 *     var message = {message: 'Prebid Native', adId: '%%PATTERN:hb_adid%%'};
 *     if (action === 'click') {message.action = 'click';} // fires click trackers
 *     window.parent.postMessage(JSON.stringify(message), '*');
 *   }
 *   fireTrackers(); // fires impressions when creative is loaded
 * </script>
 */
function fireNativeTrackers(message, bidResponse) {
  const nativeResponse = bidResponse.native.ortb || legacyPropertiesToOrtbNative(bidResponse.native);
  if (message.action === 'click') {
    fireClickTrackers(nativeResponse, message === null || message === void 0 ? void 0 : message.assetId);
  } else {
    fireImpressionTrackers(nativeResponse);
  }
  return message.action;
}
function fireImpressionTrackers(nativeResponse) {
  let {
    runMarkup = mkup => (0,_utils_js__WEBPACK_IMPORTED_MODULE_1__.insertHtmlIntoIframe)(mkup),
    fetchURL = _utils_js__WEBPACK_IMPORTED_MODULE_1__.triggerPixel
  } = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
  let {
    [_eventTrackers_js__WEBPACK_IMPORTED_MODULE_8__.TRACKER_METHOD_IMG]: img = [],
    [_eventTrackers_js__WEBPACK_IMPORTED_MODULE_8__.TRACKER_METHOD_JS]: js = []
  } = (0,_eventTrackers_js__WEBPACK_IMPORTED_MODULE_8__.parseEventTrackers)(nativeResponse.eventtrackers || [])[_eventTrackers_js__WEBPACK_IMPORTED_MODULE_8__.EVENT_TYPE_IMPRESSION] || {};
  if (nativeResponse.imptrackers) {
    img = img.concat(nativeResponse.imptrackers);
  }
  img.forEach(url => fetchURL(url));
  js = js.map(url => "<script async src=\"".concat(url, "\"></script>"));
  if (nativeResponse.jstracker) {
    // jstracker is already HTML markup
    js = js.concat([nativeResponse.jstracker]);
  }
  if (js.length) {
    runMarkup(js.join('\n'));
  }
}
function fireClickTrackers(nativeResponse) {
  let assetId = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : null;
  let {
    fetchURL = _utils_js__WEBPACK_IMPORTED_MODULE_1__.triggerPixel
  } = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};
  // legacy click tracker
  if (!assetId) {
    var _nativeResponse$link;
    (((_nativeResponse$link = nativeResponse.link) === null || _nativeResponse$link === void 0 ? void 0 : _nativeResponse$link.clicktrackers) || []).forEach(url => fetchURL(url));
  } else {
    var _nativeResponse$link2;
    // ortb click tracker. This will try to call the clicktracker associated with the asset;
    // will fallback to the link if none is found.
    const assetIdLinkMap = (nativeResponse.assets || []).filter(a => a.link).reduce((map, asset) => {
      map[asset.id] = asset.link;
      return map;
    }, {});
    const masterClickTrackers = ((_nativeResponse$link2 = nativeResponse.link) === null || _nativeResponse$link2 === void 0 ? void 0 : _nativeResponse$link2.clicktrackers) || [];
    const assetLink = assetIdLinkMap[assetId];
    let clickTrackers = masterClickTrackers;
    if (assetLink) {
      clickTrackers = assetLink.clicktrackers || [];
    }
    clickTrackers.forEach(url => fetchURL(url));
  }
}
function setNativeResponseProperties(bid, adUnit) {
  var _bid$native2;
  const nativeOrtbRequest = adUnit === null || adUnit === void 0 ? void 0 : adUnit.nativeOrtbRequest;
  const nativeOrtbResponse = (_bid$native2 = bid.native) === null || _bid$native2 === void 0 ? void 0 : _bid$native2.ortb;
  if (nativeOrtbRequest && nativeOrtbResponse) {
    const legacyResponse = toLegacyResponse(nativeOrtbResponse, nativeOrtbRequest);
    Object.assign(bid.native, legacyResponse);
  }
  ['rendererUrl', 'adTemplate'].forEach(prop => {
    var _adUnit$nativeParams;
    const val = adUnit === null || adUnit === void 0 || (_adUnit$nativeParams = adUnit.nativeParams) === null || _adUnit$nativeParams === void 0 ? void 0 : _adUnit$nativeParams[prop];
    if (val) {
      bid.native[prop] = getAssetValue(val);
    }
  });
}
function getNativeAssets(nativeProps, keys) {
  let ext = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : false;
  const assets = [];
  Object.entries(nativeProps).filter(_ref => {
    let [k, v] = _ref;
    return v && (ext === false && k === 'ext' || keys == null || keys.includes(k));
  }).forEach(_ref2 => {
    let [key, value] = _ref2;
    if (ext === false && key === 'ext') {
      assets.push(...getNativeAssets(value, keys, true));
    } else if (ext || _constants_js__WEBPACK_IMPORTED_MODULE_4__.NATIVE_KEYS.hasOwnProperty(key)) {
      assets.push({
        key,
        value: getAssetValue(value)
      });
    }
  });
  return assets;
}
function getNativeRenderingData(bid, adUnit, keys) {
  var _adUnit$mediaTypes3;
  const data = _objectSpread(_objectSpread({}, (0,_utils_js__WEBPACK_IMPORTED_MODULE_2__.getDefinedParams)(bid.native, ['rendererUrl', 'adTemplate'])), {}, {
    assets: getNativeAssets(bid.native, keys),
    nativeKeys: _constants_js__WEBPACK_IMPORTED_MODULE_4__.NATIVE_KEYS
  });
  if (bid.native.ortb) {
    data.ortb = bid.native.ortb;
  } else if ((_adUnit$mediaTypes3 = adUnit.mediaTypes) !== null && _adUnit$mediaTypes3 !== void 0 && (_adUnit$mediaTypes3 = _adUnit$mediaTypes3.native) !== null && _adUnit$mediaTypes3 !== void 0 && _adUnit$mediaTypes3.ortb) {
    data.ortb = toOrtbNativeResponse(bid.native, adUnit.nativeOrtbRequest);
  }
  return data;
}
function assetsMessage(data, adObject, keys) {
  let {
    index = _auctionManager_js__WEBPACK_IMPORTED_MODULE_3__.auctionManager.index
  } = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : {};
  const msg = {
    message: 'assetResponse',
    adId: data.adId
  };
  let renderData = (0,_adRendering_js__WEBPACK_IMPORTED_MODULE_6__.getRenderingData)(adObject).native;
  if (renderData) {
    // if we have native rendering data (set up by the nativeRendering module)
    // include it in full ("all assets") together with the renderer.
    // this is to allow PUC to use dynamic renderers without requiring changes in creative setup
    msg.native = Object.assign({}, renderData);
    msg.renderer = (0,_creativeRenderers_js__WEBPACK_IMPORTED_MODULE_7__.getCreativeRendererSource)(adObject);
    msg.rendererVersion = _creativeRenderers_js__WEBPACK_IMPORTED_MODULE_7__.PUC_MIN_VERSION;
    if (keys != null) {
      renderData.assets = renderData.assets.filter(_ref3 => {
        let {
          key
        } = _ref3;
        return keys.includes(key);
      });
    }
  } else {
    renderData = getNativeRenderingData(adObject, index.getAdUnit(adObject), keys);
  }
  return Object.assign(msg, renderData);
}
const NATIVE_KEYS_INVERTED = Object.fromEntries(Object.entries(_constants_js__WEBPACK_IMPORTED_MODULE_4__.NATIVE_KEYS).map(_ref4 => {
  let [k, v] = _ref4;
  return [v, k];
}));

/**
 * Constructs a message object containing asset values for each of the
 * requested data keys.
 */
function getAssetMessage(data, adObject) {
  const keys = data.assets.map(k => NATIVE_KEYS_INVERTED[k]);
  return assetsMessage(data, adObject, keys);
}
function getAllAssetsMessage(data, adObject) {
  return assetsMessage(data, adObject, null);
}

/**
 * Native assets can be a string or an object with a url prop. Returns the value
 * appropriate for sending in adserver targeting or placeholder replacement.
 */
function getAssetValue(value) {
  return (value === null || value === void 0 ? void 0 : value.url) || value;
}
/**
 * converts Prebid legacy native assets request to OpenRTB format
 * @param {object} legacyNativeAssets an object that describes a native bid request in Prebid proprietary format
 * @returns an OpenRTB format of the same bid request
 */
function toOrtbNativeRequest(legacyNativeAssets) {
  if (!legacyNativeAssets && !(0,_utils_js__WEBPACK_IMPORTED_MODULE_2__.isPlainObject)(legacyNativeAssets)) {
    (0,_utils_js__WEBPACK_IMPORTED_MODULE_1__.logError)('Native assets object is empty or not an object: ', legacyNativeAssets);
    return;
  }
  const ortb = {
    ver: '1.2',
    assets: []
  };
  for (const key in legacyNativeAssets) {
    // skip conversion for non-asset keys
    if (_constants_js__WEBPACK_IMPORTED_MODULE_4__.NATIVE_KEYS_THAT_ARE_NOT_ASSETS.includes(key)) continue;
    if (!_constants_js__WEBPACK_IMPORTED_MODULE_4__.NATIVE_KEYS.hasOwnProperty(key)) {
      (0,_utils_js__WEBPACK_IMPORTED_MODULE_1__.logError)("Unrecognized native asset code: ".concat(key, ". Asset will be ignored."));
      continue;
    }
    if (key === 'privacyLink') {
      ortb.privacy = 1;
      continue;
    }
    const asset = legacyNativeAssets[key];
    let required = 0;
    if (asset.required && (0,_utils_js__WEBPACK_IMPORTED_MODULE_2__.isBoolean)(asset.required)) {
      required = Number(asset.required);
    }
    const ortbAsset = {
      id: ortb.assets.length,
      required
    };
    // data cases
    if (key in _constants_js__WEBPACK_IMPORTED_MODULE_4__.PREBID_NATIVE_DATA_KEYS_TO_ORTB) {
      ortbAsset.data = {
        type: _constants_js__WEBPACK_IMPORTED_MODULE_4__.NATIVE_ASSET_TYPES[_constants_js__WEBPACK_IMPORTED_MODULE_4__.PREBID_NATIVE_DATA_KEYS_TO_ORTB[key]]
      };
      if (asset.len) {
        ortbAsset.data.len = asset.len;
      }
      // icon or image case
    } else if (key === 'icon' || key === 'image') {
      ortbAsset.img = {
        type: key === 'icon' ? _constants_js__WEBPACK_IMPORTED_MODULE_4__.NATIVE_IMAGE_TYPES.ICON : _constants_js__WEBPACK_IMPORTED_MODULE_4__.NATIVE_IMAGE_TYPES.MAIN
      };
      // if min_width and min_height are defined in aspect_ratio, they are preferred
      if (asset.aspect_ratios) {
        if (!(0,_utils_js__WEBPACK_IMPORTED_MODULE_2__.isArray)(asset.aspect_ratios)) {
          (0,_utils_js__WEBPACK_IMPORTED_MODULE_1__.logError)("image.aspect_ratios was passed, but it's not a an array:", asset.aspect_ratios);
        } else if (!asset.aspect_ratios.length) {
          (0,_utils_js__WEBPACK_IMPORTED_MODULE_1__.logError)("image.aspect_ratios was passed, but it's empty:", asset.aspect_ratios);
        } else {
          const {
            min_width: minWidth,
            min_height: minHeight
          } = asset.aspect_ratios[0];
          if (!(0,_utils_js__WEBPACK_IMPORTED_MODULE_2__.isInteger)(minWidth) || !(0,_utils_js__WEBPACK_IMPORTED_MODULE_2__.isInteger)(minHeight)) {
            (0,_utils_js__WEBPACK_IMPORTED_MODULE_1__.logError)('image.aspect_ratios min_width or min_height are invalid: ', minWidth, minHeight);
          } else {
            ortbAsset.img.wmin = minWidth;
            ortbAsset.img.hmin = minHeight;
          }
          const aspectRatios = asset.aspect_ratios.filter(ar => ar.ratio_width && ar.ratio_height).map(ratio => "".concat(ratio.ratio_width, ":").concat(ratio.ratio_height));
          if (aspectRatios.length > 0) {
            ortbAsset.img.ext = {
              aspectratios: aspectRatios
            };
          }
        }
      }

      // if asset.sizes exist, by OpenRTB spec we should remove wmin and hmin
      if (asset.sizes) {
        if (asset.sizes.length !== 2 || !(0,_utils_js__WEBPACK_IMPORTED_MODULE_2__.isInteger)(asset.sizes[0]) || !(0,_utils_js__WEBPACK_IMPORTED_MODULE_2__.isInteger)(asset.sizes[1])) {
          (0,_utils_js__WEBPACK_IMPORTED_MODULE_1__.logError)('image.sizes was passed, but its value is not an array of integers:', asset.sizes);
        } else {
          ortbAsset.img.w = asset.sizes[0];
          ortbAsset.img.h = asset.sizes[1];
          delete ortbAsset.img.hmin;
          delete ortbAsset.img.wmin;
        }
      }
      // title case
    } else if (key === 'title') {
      ortbAsset.title = {
        // in openRTB, len is required for titles, while in legacy prebid was not.
        // for this reason, if len is missing in legacy prebid, we're adding a default value of 140.
        len: asset.len || 140
      };
      // all extensions to the native bid request are passed as is
    } else if (key === 'ext') {
      ortbAsset.ext = asset;
      // in `ext` case, required field is not needed
      delete ortbAsset.required;
    }
    ortb.assets.push(ortbAsset);
  }
  return ortb;
}

/**
 * Greatest common divisor between two positive integers
 * https://en.wikipedia.org/wiki/Euclidean_algorithm
 */
function gcd(a, b) {
  while (a && b && a !== b) {
    if (a > b) {
      a = a - b;
    } else {
      b = b - a;
    }
  }
  return a || b;
}

/**
 * This function converts an OpenRTB native request object to Prebid proprietary
 * format. The purpose of this function is to help adapters to handle the
 * transition phase where publishers may be using OpenRTB objects but the
 *  bidder does not yet support it.
 * @param {object} openRTBRequest an OpenRTB v1.2 request object
 * @returns a Prebid legacy native format request
 */
function fromOrtbNativeRequest(openRTBRequest) {
  if (!isOpenRTBBidRequestValid(openRTBRequest)) {
    return;
  }
  const oldNativeObject = {};
  for (const asset of openRTBRequest.assets) {
    if (asset.title) {
      const title = {
        required: asset.required ? Boolean(asset.required) : false,
        len: asset.title.len
      };
      oldNativeObject.title = title;
    } else if (asset.img) {
      const image = {
        required: asset.required ? Boolean(asset.required) : false
      };
      if (asset.img.w && asset.img.h) {
        image.sizes = [asset.img.w, asset.img.h];
      } else if (asset.img.wmin && asset.img.hmin) {
        const scale = gcd(asset.img.wmin, asset.img.hmin);
        image.aspect_ratios = [{
          min_width: asset.img.wmin,
          min_height: asset.img.hmin,
          ratio_width: asset.img.wmin / scale,
          ratio_height: asset.img.hmin / scale
        }];
      }
      if (asset.img.type === _constants_js__WEBPACK_IMPORTED_MODULE_4__.NATIVE_IMAGE_TYPES.MAIN) {
        oldNativeObject.image = image;
      } else {
        oldNativeObject.icon = image;
      }
    } else if (asset.data) {
      const assetType = Object.keys(_constants_js__WEBPACK_IMPORTED_MODULE_4__.NATIVE_ASSET_TYPES).find(k => _constants_js__WEBPACK_IMPORTED_MODULE_4__.NATIVE_ASSET_TYPES[k] === asset.data.type);
      const prebidAssetName = Object.keys(_constants_js__WEBPACK_IMPORTED_MODULE_4__.PREBID_NATIVE_DATA_KEYS_TO_ORTB).find(k => _constants_js__WEBPACK_IMPORTED_MODULE_4__.PREBID_NATIVE_DATA_KEYS_TO_ORTB[k] === assetType);
      oldNativeObject[prebidAssetName] = {
        required: asset.required ? Boolean(asset.required) : false
      };
      if (asset.data.len) {
        oldNativeObject[prebidAssetName].len = asset.data.len;
      }
    }
    if (openRTBRequest.privacy) {
      oldNativeObject.privacyLink = {
        required: false
      };
    }
    // video was not supported by old prebid assets
  }
  return oldNativeObject;
}

/**
 * Converts an OpenRTB request to a proprietary Prebid.js format.
 * The proprietary Prebid format has many limitations and will be dropped in
 * the future; adapters are encouraged to stop using it in favour of OpenRTB format.
 * IMPLEMENTATION DETAILS: This function returns the same exact object if no
 * conversion is needed. If a conversion is needed (meaning, at least one
 * bidRequest contains a native.ortb definition), it will return a copy.
 *
 * @param bidRequests an array of valid bid requests
 * @returns an array of valid bid requests where the openRTB bids are converted to proprietary format.
 */
function convertOrtbRequestToProprietaryNative(bidRequests) {
  if (true) {
    if (!bidRequests || !(0,_utils_js__WEBPACK_IMPORTED_MODULE_2__.isArray)(bidRequests)) return bidRequests;
    // check if a conversion is needed
    if (!bidRequests.some(bidRequest => {
      var _NATIVE;
      return (_NATIVE = ((bidRequest === null || bidRequest === void 0 ? void 0 : bidRequest.mediaTypes) || {})[_mediaTypes_js__WEBPACK_IMPORTED_MODULE_5__.NATIVE]) === null || _NATIVE === void 0 ? void 0 : _NATIVE.ortb;
    })) {
      return bidRequests;
    }
    const bidRequestsCopy = (0,_utils_js__WEBPACK_IMPORTED_MODULE_2__.deepClone)(bidRequests);
    // convert Native ORTB definition to old-style prebid native definition
    for (const bidRequest of bidRequestsCopy) {
      if (bidRequest.mediaTypes && bidRequest.mediaTypes[_mediaTypes_js__WEBPACK_IMPORTED_MODULE_5__.NATIVE] && bidRequest.mediaTypes[_mediaTypes_js__WEBPACK_IMPORTED_MODULE_5__.NATIVE].ortb) {
        bidRequest.mediaTypes[_mediaTypes_js__WEBPACK_IMPORTED_MODULE_5__.NATIVE] = Object.assign((0,_utils_js__WEBPACK_IMPORTED_MODULE_1__.pick)(bidRequest.mediaTypes[_mediaTypes_js__WEBPACK_IMPORTED_MODULE_5__.NATIVE], _constants_js__WEBPACK_IMPORTED_MODULE_4__.NATIVE_KEYS_THAT_ARE_NOT_ASSETS), fromOrtbNativeRequest(bidRequest.mediaTypes[_mediaTypes_js__WEBPACK_IMPORTED_MODULE_5__.NATIVE].ortb));
        bidRequest.nativeParams = processNativeAdUnitParams(bidRequest.mediaTypes[_mediaTypes_js__WEBPACK_IMPORTED_MODULE_5__.NATIVE]);
      }
    }
    return bidRequestsCopy;
  }
  // removed by dead control flow

}

/**
 * convert PBJS proprietary native properties that are *not* assets to the ORTB native format.
 *
 * @param legacyNative `bidResponse.native` object as returned by adapters
 */
function legacyPropertiesToOrtbNative(legacyNative) {
  const response = {
    link: {},
    eventtrackers: []
  };
  Object.entries(legacyNative).forEach(_ref5 => {
    let [key, value] = _ref5;
    switch (key) {
      case 'clickUrl':
        response.link.url = value;
        break;
      case 'clickTrackers':
        response.link.clicktrackers = Array.isArray(value) ? value : [value];
        break;
      case 'impressionTrackers':
        (Array.isArray(value) ? value : [value]).forEach(url => {
          response.eventtrackers.push({
            event: _eventTrackers_js__WEBPACK_IMPORTED_MODULE_8__.EVENT_TYPE_IMPRESSION,
            method: _eventTrackers_js__WEBPACK_IMPORTED_MODULE_8__.TRACKER_METHOD_IMG,
            url
          });
        });
        break;
      case 'javascriptTrackers':
        // jstracker is deprecated, but we need to use it here since 'javascriptTrackers' is markup, not an url
        // TODO: at the time of writing this, core expected javascriptTrackers to be a string (despite the name),
        // but many adapters are passing an array. It's possible that some of them are, in fact, passing URLs and not markup
        // in general, native trackers seem to be neglected and/or broken
        response.jstracker = Array.isArray(value) ? value.join('') : value;
        break;
      case 'privacyLink':
        response.privacy = value;
        break;
    }
  });
  return response;
}
function toOrtbNativeResponse(legacyResponse, ortbRequest) {
  const ortbResponse = _objectSpread(_objectSpread({}, legacyPropertiesToOrtbNative(legacyResponse)), {}, {
    assets: []
  });
  function useRequestAsset(predicate, fn) {
    let asset = ortbRequest.assets.find(predicate);
    if (asset != null) {
      asset = (0,_utils_js__WEBPACK_IMPORTED_MODULE_2__.deepClone)(asset);
      fn(asset);
      ortbResponse.assets.push(asset);
    }
  }
  Object.keys(legacyResponse).filter(key => !!legacyResponse[key]).forEach(key => {
    const value = getAssetValue(legacyResponse[key]);
    switch (key) {
      // process titles
      case 'title':
        useRequestAsset(asset => asset.title != null, titleAsset => {
          titleAsset.title = {
            text: value
          };
        });
        break;
      case 'image':
      case 'icon':
        const imageType = key === 'image' ? _constants_js__WEBPACK_IMPORTED_MODULE_4__.NATIVE_IMAGE_TYPES.MAIN : _constants_js__WEBPACK_IMPORTED_MODULE_4__.NATIVE_IMAGE_TYPES.ICON;
        useRequestAsset(asset => asset.img != null && asset.img.type === imageType, imageAsset => {
          imageAsset.img = {
            url: value
          };
        });
        break;
      default:
        if (key in _constants_js__WEBPACK_IMPORTED_MODULE_4__.PREBID_NATIVE_DATA_KEYS_TO_ORTB) {
          useRequestAsset(asset => asset.data != null && asset.data.type === _constants_js__WEBPACK_IMPORTED_MODULE_4__.NATIVE_ASSET_TYPES[_constants_js__WEBPACK_IMPORTED_MODULE_4__.PREBID_NATIVE_DATA_KEYS_TO_ORTB[key]], dataAsset => {
            dataAsset.data = {
              value
            };
          });
        }
        break;
    }
  });
  return ortbResponse;
}

/**
 * Generates a legacy response from an ortb response. Useful during the transition period.
 * @param {*} ortbResponse a standard ortb response object
 * @param {*} ortbRequest the ortb request, useful to match ids.
 * @returns an object containing the response in legacy native format: { title: "this is a title", image: ... }
 */
function toLegacyResponse(ortbResponse, ortbRequest) {
  var _ortbResponse$link;
  const legacyResponse = {};
  const requestAssets = (ortbRequest === null || ortbRequest === void 0 ? void 0 : ortbRequest.assets) || [];
  legacyResponse.clickUrl = (_ortbResponse$link = ortbResponse.link) === null || _ortbResponse$link === void 0 ? void 0 : _ortbResponse$link.url;
  legacyResponse.privacyLink = ortbResponse.privacy;
  for (const asset of (ortbResponse === null || ortbResponse === void 0 ? void 0 : ortbResponse.assets) || []) {
    const requestAsset = requestAssets.find(reqAsset => asset.id === reqAsset.id);
    if (asset.title) {
      legacyResponse.title = asset.title.text;
    } else if (asset.img) {
      var _requestAsset$img;
      legacyResponse[(requestAsset === null || requestAsset === void 0 || (_requestAsset$img = requestAsset.img) === null || _requestAsset$img === void 0 ? void 0 : _requestAsset$img.type) === _constants_js__WEBPACK_IMPORTED_MODULE_4__.NATIVE_IMAGE_TYPES.MAIN ? 'image' : 'icon'] = {
        url: asset.img.url,
        width: asset.img.w,
        height: asset.img.h
      };
    } else if (asset.data) {
      var _requestAsset$data;
      legacyResponse[PREBID_NATIVE_DATA_KEYS_TO_ORTB_INVERSE[NATIVE_ASSET_TYPES_INVERSE[requestAsset === null || requestAsset === void 0 || (_requestAsset$data = requestAsset.data) === null || _requestAsset$data === void 0 ? void 0 : _requestAsset$data.type]]] = asset.data.value;
    }
  }

  // Handle trackers
  legacyResponse.impressionTrackers = [];
  let jsTrackers = [];
  if (ortbResponse.imptrackers) {
    legacyResponse.impressionTrackers.push(...ortbResponse.imptrackers);
  }
  for (const eventTracker of (ortbResponse === null || ortbResponse === void 0 ? void 0 : ortbResponse.eventtrackers) || []) {
    if (eventTracker.event === _eventTrackers_js__WEBPACK_IMPORTED_MODULE_8__.EVENT_TYPE_IMPRESSION && eventTracker.method === _eventTrackers_js__WEBPACK_IMPORTED_MODULE_8__.TRACKER_METHOD_IMG) {
      legacyResponse.impressionTrackers.push(eventTracker.url);
    }
    if (eventTracker.event === _eventTrackers_js__WEBPACK_IMPORTED_MODULE_8__.EVENT_TYPE_IMPRESSION && eventTracker.method === _eventTrackers_js__WEBPACK_IMPORTED_MODULE_8__.TRACKER_METHOD_JS) {
      jsTrackers.push(eventTracker.url);
    }
  }
  jsTrackers = jsTrackers.map(url => "<script async src=\"".concat(url, "\"></script>"));
  if (ortbResponse !== null && ortbResponse !== void 0 && ortbResponse.jstracker) {
    jsTrackers.push(ortbResponse.jstracker);
  }
  if (jsTrackers.length) {
    legacyResponse.javascriptTrackers = jsTrackers.join('\n');
  }
  return legacyResponse;
}

/**
 * Inverts key-values of an object.
 */
function inverse(obj) {
  var retobj = {};
  for (var key in obj) {
    retobj[obj[key]] = key;
  }
  return retobj;
}


/***/ }),

/***/ "./src/prebid.js":
/*!***********************!*\
  !*** ./src/prebid.js ***!
  \***********************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

/* unused harmony exports syncOrtb2, validateOrtbFields, adUnitSetupChecks, checkAdUnitSetup, addApiMethod, requestBids, startAuction, executeCallbacks, resetQueSetup */
/* harmony import */ var _prebidGlobal_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./prebidGlobal.js */ "./src/prebidGlobal.js");
/* harmony import */ var _utils_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./utils.js */ "./src/utils.js");
/* harmony import */ var _utils_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./utils.js */ "../../node_modules/dlv/index.js");
/* harmony import */ var _utils_js__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ./utils.js */ "../../node_modules/dset/dist/index.mjs");
/* harmony import */ var _utils_js__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ./utils.js */ "./src/utils/objects.js");
/* harmony import */ var _secureCreatives_js__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! ./secureCreatives.js */ "./src/secureCreatives.js");
/* harmony import */ var _userSync_js__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(/*! ./userSync.js */ "./src/userSync.js");
/* harmony import */ var _config_js__WEBPACK_IMPORTED_MODULE_7__ = __webpack_require__(/*! ./config.js */ "./src/config.js");
/* harmony import */ var _auctionManager_js__WEBPACK_IMPORTED_MODULE_8__ = __webpack_require__(/*! ./auctionManager.js */ "./src/auctionManager.js");
/* harmony import */ var _targeting_js__WEBPACK_IMPORTED_MODULE_9__ = __webpack_require__(/*! ./targeting.js */ "./src/targeting.js");
/* harmony import */ var _hook_js__WEBPACK_IMPORTED_MODULE_10__ = __webpack_require__(/*! ./hook.js */ "./src/hook.js");
/* harmony import */ var _debugging_js__WEBPACK_IMPORTED_MODULE_11__ = __webpack_require__(/*! ./debugging.js */ "./src/debugging.js");
/* harmony import */ var _storageManager_js__WEBPACK_IMPORTED_MODULE_12__ = __webpack_require__(/*! ./storageManager.js */ "./src/storageManager.js");
/* harmony import */ var _adapterManager_js__WEBPACK_IMPORTED_MODULE_13__ = __webpack_require__(/*! ./adapterManager.js */ "./src/adapterManager.js");
/* harmony import */ var _constants_js__WEBPACK_IMPORTED_MODULE_14__ = __webpack_require__(/*! ./constants.js */ "./src/constants.js");
/* harmony import */ var _events_js__WEBPACK_IMPORTED_MODULE_15__ = __webpack_require__(/*! ./events.js */ "./src/events.js");
/* harmony import */ var _utils_perfMetrics_js__WEBPACK_IMPORTED_MODULE_16__ = __webpack_require__(/*! ./utils/perfMetrics.js */ "./src/utils/perfMetrics.js");
/* harmony import */ var _utils_promise_js__WEBPACK_IMPORTED_MODULE_17__ = __webpack_require__(/*! ./utils/promise.js */ "./src/utils/promise.js");
/* harmony import */ var _utils_yield_js__WEBPACK_IMPORTED_MODULE_18__ = __webpack_require__(/*! ./utils/yield.js */ "./src/utils/yield.js");
/* harmony import */ var _fpd_enrichment_js__WEBPACK_IMPORTED_MODULE_19__ = __webpack_require__(/*! ./fpd/enrichment.js */ "./src/fpd/enrichment.js");
/* harmony import */ var _consentHandler_js__WEBPACK_IMPORTED_MODULE_20__ = __webpack_require__(/*! ./consentHandler.js */ "./src/consentHandler.js");
/* harmony import */ var _adRendering_js__WEBPACK_IMPORTED_MODULE_21__ = __webpack_require__(/*! ./adRendering.js */ "./src/adRendering.js");
/* harmony import */ var _utils_reducers_js__WEBPACK_IMPORTED_MODULE_22__ = __webpack_require__(/*! ./utils/reducers.js */ "./src/utils/reducers.js");
/* harmony import */ var _video_js__WEBPACK_IMPORTED_MODULE_23__ = __webpack_require__(/*! ./video.js */ "./src/video.js");
/* harmony import */ var _banner_js__WEBPACK_IMPORTED_MODULE_24__ = __webpack_require__(/*! ./banner.js */ "./src/banner.js");
/* harmony import */ var _mediaTypes_js__WEBPACK_IMPORTED_MODULE_25__ = __webpack_require__(/*! ./mediaTypes.js */ "./src/mediaTypes.js");
/* harmony import */ var _utils_prerendering_js__WEBPACK_IMPORTED_MODULE_26__ = __webpack_require__(/*! ./utils/prerendering.js */ "./src/utils/prerendering.js");
/* harmony import */ var _adapters_bidderFactory_js__WEBPACK_IMPORTED_MODULE_27__ = __webpack_require__(/*! ./adapters/bidderFactory.js */ "./src/adapters/bidderFactory.js");
/* harmony import */ var _fpd_normalize_js__WEBPACK_IMPORTED_MODULE_28__ = __webpack_require__(/*! ./fpd/normalize.js */ "./src/fpd/normalize.js");
/* harmony import */ var _audio_js__WEBPACK_IMPORTED_MODULE_29__ = __webpack_require__(/*! ./audio.js */ "./src/audio.js");
/* harmony import */ var _buildOptions_js__WEBPACK_IMPORTED_MODULE_30__ = __webpack_require__(/*! ./buildOptions.js */ "./src/buildOptions.js");
/** @module pbjs */





























const pbjsInstance = (0,_prebidGlobal_js__WEBPACK_IMPORTED_MODULE_0__.getGlobal)();
const {
  triggerUserSyncs
} = _userSync_js__WEBPACK_IMPORTED_MODULE_6__.userSync;

/* private variables */
const {
  ADD_AD_UNITS,
  REQUEST_BIDS,
  SET_TARGETING
} = _constants_js__WEBPACK_IMPORTED_MODULE_14__.EVENTS;

// initialize existing debugging sessions if present
(0,_debugging_js__WEBPACK_IMPORTED_MODULE_11__.loadSession)();
pbjsInstance.bidderSettings = pbjsInstance.bidderSettings || {};
pbjsInstance.libLoaded = true;
// version auto generated from build
pbjsInstance.version = "v10.19.0-pre";
(0,_utils_js__WEBPACK_IMPORTED_MODULE_1__.logInfo)("Prebid.js v10.19.0-pre loaded");

// create adUnit array
pbjsInstance.adUnits = pbjsInstance.adUnits || [];
pbjsInstance.pageViewIdPerBidder = pbjsInstance.pageViewIdPerBidder || new Map();
function validateSizes(sizes, targLength) {
  let cleanSizes = [];
  if ((0,_utils_js__WEBPACK_IMPORTED_MODULE_4__.isArray)(sizes) && (targLength ? sizes.length === targLength : sizes.length > 0)) {
    // check if an array of arrays or array of numbers
    if (sizes.every(sz => (0,_utils_js__WEBPACK_IMPORTED_MODULE_4__.isArrayOfNums)(sz, 2))) {
      cleanSizes = sizes;
    } else if ((0,_utils_js__WEBPACK_IMPORTED_MODULE_4__.isArrayOfNums)(sizes, 2)) {
      cleanSizes.push(sizes);
    }
  }
  return cleanSizes;
}

// synchronize fields between mediaTypes[mediaType] and ortb2Imp[mediaType]
function syncOrtb2(adUnit, mediaType) {
  const ortb2Imp = (0,_utils_js__WEBPACK_IMPORTED_MODULE_2__["default"])(adUnit, "ortb2Imp.".concat(mediaType));
  const mediaTypes = (0,_utils_js__WEBPACK_IMPORTED_MODULE_2__["default"])(adUnit, "mediaTypes.".concat(mediaType));
  if (!ortb2Imp && !mediaTypes) {
    // omitting sync due to not present mediaType
    return;
  }
  const fields = {
    [_mediaTypes_js__WEBPACK_IMPORTED_MODULE_25__.VIDEO]:  true && _video_js__WEBPACK_IMPORTED_MODULE_23__.ORTB_VIDEO_PARAMS,
    [_mediaTypes_js__WEBPACK_IMPORTED_MODULE_25__.BANNER]: _banner_js__WEBPACK_IMPORTED_MODULE_24__.ORTB_BANNER_PARAMS
  }[mediaType];
  if (!fields) {
    return;
  }
  [...fields].forEach(_ref => {
    let [key, validator] = _ref;
    const mediaTypesFieldValue = (0,_utils_js__WEBPACK_IMPORTED_MODULE_2__["default"])(adUnit, "mediaTypes.".concat(mediaType, ".").concat(key));
    const ortbFieldValue = (0,_utils_js__WEBPACK_IMPORTED_MODULE_2__["default"])(adUnit, "ortb2Imp.".concat(mediaType, ".").concat(key));
    if (mediaTypesFieldValue === undefined && ortbFieldValue === undefined) {
      // omitting the params if it's not defined on either of sides
    } else if (mediaTypesFieldValue === undefined) {
      (0,_utils_js__WEBPACK_IMPORTED_MODULE_3__.dset)(adUnit, "mediaTypes.".concat(mediaType, ".").concat(key), ortbFieldValue);
    } else if (ortbFieldValue === undefined) {
      (0,_utils_js__WEBPACK_IMPORTED_MODULE_3__.dset)(adUnit, "ortb2Imp.".concat(mediaType, ".").concat(key), mediaTypesFieldValue);
    } else if (!(0,_utils_js__WEBPACK_IMPORTED_MODULE_1__.deepEqual)(mediaTypesFieldValue, ortbFieldValue)) {
      (0,_utils_js__WEBPACK_IMPORTED_MODULE_1__.logWarn)("adUnit ".concat(adUnit.code, ": specifies conflicting ortb2Imp.").concat(mediaType, ".").concat(key, " and mediaTypes.").concat(mediaType, ".").concat(key, ", the latter will be ignored"), adUnit);
      (0,_utils_js__WEBPACK_IMPORTED_MODULE_3__.dset)(adUnit, "mediaTypes.".concat(mediaType, ".").concat(key), ortbFieldValue);
    }
  });
}
function validateBannerMediaType(adUnit) {
  var _adUnit$ortb2Imp$bann, _adUnit$ortb2Imp, _ref4, _adUnit$ortb2Imp$bann2, _adUnit$ortb2Imp2;
  const validatedAdUnit = (0,_utils_js__WEBPACK_IMPORTED_MODULE_4__.deepClone)(adUnit);
  const banner = validatedAdUnit.mediaTypes.banner;
  const bannerSizes = banner.sizes == null ? null : validateSizes(banner.sizes);
  const format = (_adUnit$ortb2Imp$bann = (_adUnit$ortb2Imp = adUnit.ortb2Imp) === null || _adUnit$ortb2Imp === void 0 || (_adUnit$ortb2Imp = _adUnit$ortb2Imp.banner) === null || _adUnit$ortb2Imp === void 0 ? void 0 : _adUnit$ortb2Imp.format) !== null && _adUnit$ortb2Imp$bann !== void 0 ? _adUnit$ortb2Imp$bann : banner === null || banner === void 0 ? void 0 : banner.format;
  let formatSizes;
  if (format != null) {
    (0,_utils_js__WEBPACK_IMPORTED_MODULE_3__.dset)(validatedAdUnit, 'ortb2Imp.banner.format', format);
    banner.format = format;
    try {
      formatSizes = format.filter(_ref2 => {
        let {
          w,
          h,
          wratio,
          hratio
        } = _ref2;
        if ((w !== null && w !== void 0 ? w : h) != null && (wratio !== null && wratio !== void 0 ? wratio : hratio) != null) {
          (0,_utils_js__WEBPACK_IMPORTED_MODULE_1__.logWarn)("Ad unit banner.format specifies both w/h and wratio/hratio", adUnit);
          return false;
        }
        return w != null && h != null || wratio != null && hratio != null;
      }).map(_ref3 => {
        let {
          w,
          h,
          wratio,
          hratio
        } = _ref3;
        return [w !== null && w !== void 0 ? w : wratio, h !== null && h !== void 0 ? h : hratio];
      });
    } catch (e) {
      (0,_utils_js__WEBPACK_IMPORTED_MODULE_1__.logError)("Invalid format definition on ad unit ".concat(adUnit.code), format);
    }
    if (formatSizes != null && bannerSizes != null && !(0,_utils_js__WEBPACK_IMPORTED_MODULE_1__.deepEqual)(bannerSizes, formatSizes)) {
      (0,_utils_js__WEBPACK_IMPORTED_MODULE_1__.logWarn)("Ad unit ".concat(adUnit.code, " has conflicting sizes and format definitions"), adUnit);
    }
  }
  const sizes = (_ref4 = formatSizes !== null && formatSizes !== void 0 ? formatSizes : bannerSizes) !== null && _ref4 !== void 0 ? _ref4 : [];
  const expdir = (_adUnit$ortb2Imp$bann2 = (_adUnit$ortb2Imp2 = adUnit.ortb2Imp) === null || _adUnit$ortb2Imp2 === void 0 || (_adUnit$ortb2Imp2 = _adUnit$ortb2Imp2.banner) === null || _adUnit$ortb2Imp2 === void 0 ? void 0 : _adUnit$ortb2Imp2.expdir) !== null && _adUnit$ortb2Imp$bann2 !== void 0 ? _adUnit$ortb2Imp$bann2 : banner.expdir;
  if (expdir != null) {
    banner.expdir = expdir;
    (0,_utils_js__WEBPACK_IMPORTED_MODULE_3__.dset)(validatedAdUnit, 'ortb2Imp.banner.expdir', expdir);
  }
  if (sizes.length > 0) {
    banner.sizes = sizes;
    // Deprecation Warning: This property will be deprecated in next release in favor of adUnit.mediaTypes.banner.sizes
    validatedAdUnit.sizes = sizes;
  } else {
    (0,_utils_js__WEBPACK_IMPORTED_MODULE_1__.logError)('Detected a mediaTypes.banner object without a proper sizes field.  Please ensure the sizes are listed like: [[300, 250], ...].  Removing invalid mediaTypes.banner object from request.');
    delete validatedAdUnit.mediaTypes.banner;
  }
  validateOrtbFields(validatedAdUnit, 'banner');
  syncOrtb2(validatedAdUnit, 'banner');
  return validatedAdUnit;
}
function validateAudioMediaType(adUnit) {
  const validatedAdUnit = (0,_utils_js__WEBPACK_IMPORTED_MODULE_4__.deepClone)(adUnit);
  validateOrtbFields(validatedAdUnit, 'audio');
  syncOrtb2(validatedAdUnit, 'audio');
  return validatedAdUnit;
}
function validateVideoMediaType(adUnit) {
  const validatedAdUnit = (0,_utils_js__WEBPACK_IMPORTED_MODULE_4__.deepClone)(adUnit);
  const video = validatedAdUnit.mediaTypes.video;
  if (video.playerSize) {
    const tarPlayerSizeLen = typeof video.playerSize[0] === 'number' ? 2 : 1;
    const videoSizes = validateSizes(video.playerSize, tarPlayerSizeLen);
    if (videoSizes.length > 0) {
      if (tarPlayerSizeLen === 2) {
        (0,_utils_js__WEBPACK_IMPORTED_MODULE_1__.logInfo)('Transforming video.playerSize from [640,480] to [[640,480]] so it\'s in the proper format.');
      }
      video.playerSize = videoSizes;
      // Deprecation Warning: This property will be deprecated in next release in favor of adUnit.mediaTypes.video.playerSize
      validatedAdUnit.sizes = videoSizes;
    } else {
      (0,_utils_js__WEBPACK_IMPORTED_MODULE_1__.logError)('Detected incorrect configuration of mediaTypes.video.playerSize.  Please specify only one set of dimensions in a format like: [[640, 480]]. Removing invalid mediaTypes.video.playerSize property from request.');
      delete validatedAdUnit.mediaTypes.video.playerSize;
    }
  }
  validateOrtbFields(validatedAdUnit, 'video');
  syncOrtb2(validatedAdUnit, 'video');
  return validatedAdUnit;
}
function validateOrtbFields(adUnit, type, onInvalidParam) {
  const mediaTypes = (adUnit === null || adUnit === void 0 ? void 0 : adUnit.mediaTypes) || {};
  const params = mediaTypes[type];
  const ORTB_PARAMS = {
    banner: _banner_js__WEBPACK_IMPORTED_MODULE_24__.ORTB_BANNER_PARAMS,
    audio: _audio_js__WEBPACK_IMPORTED_MODULE_29__.ORTB_AUDIO_PARAMS,
    video: _video_js__WEBPACK_IMPORTED_MODULE_23__.ORTB_VIDEO_PARAMS
  }[type];
  if (!(0,_utils_js__WEBPACK_IMPORTED_MODULE_4__.isPlainObject)(params)) {
    (0,_utils_js__WEBPACK_IMPORTED_MODULE_1__.logWarn)("validateOrtb".concat(type, "Fields: ").concat(type, "Params must be an object."));
    return;
  }
  if (params != null) {
    Object.entries(params).forEach(_ref5 => {
      let [key, value] = _ref5;
      if (!ORTB_PARAMS.has(key)) {
        return;
      }
      const isValid = ORTB_PARAMS.get(key)(value);
      if (!isValid) {
        if (typeof onInvalidParam === 'function') {
          onInvalidParam(key, value, adUnit);
        } else {
          delete params[key];
          (0,_utils_js__WEBPACK_IMPORTED_MODULE_1__.logWarn)("Invalid prop in adUnit \"".concat(adUnit.code, "\": Invalid value for mediaTypes.").concat(type, ".").concat(key, " ORTB property. The property has been removed."));
        }
      }
    });
  }
}
function validateNativeMediaType(adUnit) {
  function err(msg) {
    (0,_utils_js__WEBPACK_IMPORTED_MODULE_1__.logError)("Error in adUnit \"".concat(adUnit.code, "\": ").concat(msg, ". Removing native request from ad unit"), adUnit);
    delete validatedAdUnit.mediaTypes.native;
    return validatedAdUnit;
  }
  function checkDeprecated(onDeprecated) {
    for (const key of ['types']) {
      if (native.hasOwnProperty(key)) {
        const res = onDeprecated(key);
        if (res) return res;
      }
    }
  }
  const validatedAdUnit = (0,_utils_js__WEBPACK_IMPORTED_MODULE_4__.deepClone)(adUnit);
  const native = validatedAdUnit.mediaTypes.native;
  // if native assets are specified in OpenRTB format, remove legacy assets and print a warn.
  if (native.ortb) {
    var _native$ortb$assets;
    if ((_native$ortb$assets = native.ortb.assets) !== null && _native$ortb$assets !== void 0 && _native$ortb$assets.some(asset => !(0,_utils_js__WEBPACK_IMPORTED_MODULE_4__.isNumber)(asset.id) || asset.id < 0 || asset.id % 1 !== 0)) {
      return err('native asset ID must be a nonnegative integer');
    }
    if (checkDeprecated(key => err("ORTB native requests cannot specify \"".concat(key, "\"")))) {
      return validatedAdUnit;
    }
    const legacyNativeKeys = Object.keys(_constants_js__WEBPACK_IMPORTED_MODULE_14__.NATIVE_KEYS).filter(key => _constants_js__WEBPACK_IMPORTED_MODULE_14__.NATIVE_KEYS[key].includes('hb_native_'));
    const nativeKeys = Object.keys(native);
    const intersection = nativeKeys.filter(nativeKey => legacyNativeKeys.includes(nativeKey));
    if (intersection.length > 0) {
      (0,_utils_js__WEBPACK_IMPORTED_MODULE_1__.logError)("when using native OpenRTB format, you cannot use legacy native properties. Deleting ".concat(intersection, " keys from request."));
      intersection.forEach(legacyKey => delete validatedAdUnit.mediaTypes.native[legacyKey]);
    }
  } else {
    checkDeprecated(key => (0,_utils_js__WEBPACK_IMPORTED_MODULE_1__.logWarn)("mediaTypes.native.".concat(key, " is deprecated, consider using native ORTB instead"), adUnit));
  }
  if (native.image && native.image.sizes && !Array.isArray(native.image.sizes)) {
    (0,_utils_js__WEBPACK_IMPORTED_MODULE_1__.logError)('Please use an array of sizes for native.image.sizes field.  Removing invalid mediaTypes.native.image.sizes property from request.');
    delete validatedAdUnit.mediaTypes.native.image.sizes;
  }
  if (native.image && native.image.aspect_ratios && !Array.isArray(native.image.aspect_ratios)) {
    (0,_utils_js__WEBPACK_IMPORTED_MODULE_1__.logError)('Please use an array of sizes for native.image.aspect_ratios field.  Removing invalid mediaTypes.native.image.aspect_ratios property from request.');
    delete validatedAdUnit.mediaTypes.native.image.aspect_ratios;
  }
  if (native.icon && native.icon.sizes && !Array.isArray(native.icon.sizes)) {
    (0,_utils_js__WEBPACK_IMPORTED_MODULE_1__.logError)('Please use an array of sizes for native.icon.sizes field.  Removing invalid mediaTypes.native.icon.sizes property from request.');
    delete validatedAdUnit.mediaTypes.native.icon.sizes;
  }
  return validatedAdUnit;
}
function validateAdUnitPos(adUnit, mediaType) {
  var _adUnit$mediaTypes;
  const pos = adUnit === null || adUnit === void 0 || (_adUnit$mediaTypes = adUnit.mediaTypes) === null || _adUnit$mediaTypes === void 0 || (_adUnit$mediaTypes = _adUnit$mediaTypes[mediaType]) === null || _adUnit$mediaTypes === void 0 ? void 0 : _adUnit$mediaTypes.pos;
  if (!(0,_utils_js__WEBPACK_IMPORTED_MODULE_4__.isNumber)(pos) || isNaN(pos) || !isFinite(pos)) {
    const warning = "Value of property 'pos' on ad unit ".concat(adUnit.code, " should be of type: Number");
    (0,_utils_js__WEBPACK_IMPORTED_MODULE_1__.logWarn)(warning);
    delete adUnit.mediaTypes[mediaType].pos;
  }
  return adUnit;
}
function validateAdUnit(adUnitDef) {
  const msg = msg => "adUnit.code '".concat(adUnit.code, "' ").concat(msg);
  const adUnit = adUnitDef;
  const mediaTypes = adUnit.mediaTypes;
  const bids = adUnit.bids;
  if (bids != null && !(0,_utils_js__WEBPACK_IMPORTED_MODULE_4__.isArray)(bids)) {
    (0,_utils_js__WEBPACK_IMPORTED_MODULE_1__.logError)(msg("defines 'adUnit.bids' that is not an array. Removing adUnit from auction"));
    return null;
  }
  if (bids == null && adUnit.ortb2Imp == null) {
    (0,_utils_js__WEBPACK_IMPORTED_MODULE_1__.logError)(msg("has no 'adUnit.bids' and no 'adUnit.ortb2Imp'. Removing adUnit from auction"));
    return null;
  }
  if (!mediaTypes || Object.keys(mediaTypes).length === 0) {
    (0,_utils_js__WEBPACK_IMPORTED_MODULE_1__.logError)(msg("does not define a 'mediaTypes' object.  This is a required field for the auction, so this adUnit has been removed."));
    return null;
  }
  if (adUnit.ortb2Imp != null && (bids == null || bids.length === 0)) {
    adUnit.bids = [{
      bidder: null
    }]; // the 'null' bidder is treated as an s2s-only placeholder by adapterManager
    (0,_utils_js__WEBPACK_IMPORTED_MODULE_1__.logMessage)(msg("defines 'adUnit.ortb2Imp' with no 'adUnit.bids'; it will be seen only by S2S adapters"));
  }
  return adUnit;
}
const adUnitSetupChecks = {
  validateAdUnit,
  validateBannerMediaType,
  validateSizes
};
if (true) {
  Object.assign(adUnitSetupChecks, {
    validateNativeMediaType
  });
}
if (true) {
  Object.assign(adUnitSetupChecks, {
    validateVideoMediaType
  });
}
if (true) {
  Object.assign(adUnitSetupChecks, {
    validateAudioMediaType
  });
}
const checkAdUnitSetup = (0,_hook_js__WEBPACK_IMPORTED_MODULE_10__.hook)('sync', function (adUnits) {
  const validatedAdUnits = [];
  adUnits.forEach(adUnitDef => {
    const adUnit = validateAdUnit(adUnitDef);
    if (adUnit == null) return;
    const mediaTypes = adUnit.mediaTypes;
    let validatedBanner, validatedVideo, validatedNative, validatedAudio;
    if (mediaTypes.banner) {
      validatedBanner = validateBannerMediaType(adUnit);
      if (mediaTypes.banner.hasOwnProperty('pos')) validatedBanner = validateAdUnitPos(validatedBanner, 'banner');
    }
    if ( true && mediaTypes.video) {
      validatedVideo = validatedBanner ? validateVideoMediaType(validatedBanner) : validateVideoMediaType(adUnit);
      if (mediaTypes.video.hasOwnProperty('pos')) validatedVideo = validateAdUnitPos(validatedVideo, 'video');
    }
    if ( true && mediaTypes.native) {
      validatedNative = validatedVideo ? validateNativeMediaType(validatedVideo) : validatedBanner ? validateNativeMediaType(validatedBanner) : validateNativeMediaType(adUnit);
    }
    if ( true && mediaTypes.audio) {
      validatedAudio = validatedNative ? validateAudioMediaType(validatedNative) : validateAudioMediaType(adUnit);
    }
    const validatedAdUnit = Object.assign({}, validatedBanner, validatedVideo, validatedNative, validatedAudio);
    validatedAdUnits.push(validatedAdUnit);
  });
  return validatedAdUnits;
}, 'checkAdUnitSetup');
function fillAdUnitDefaults(adUnits) {
  if (true) {
    adUnits.forEach(au => (0,_video_js__WEBPACK_IMPORTED_MODULE_23__.fillVideoDefaults)(au));
  }
  if (true) {
    adUnits.forEach(au => (0,_audio_js__WEBPACK_IMPORTED_MODULE_29__.fillAudioDefaults)(au));
  }
}
function logInvocation(name, fn) {
  return function () {
    for (var _len = arguments.length, args = new Array(_len), _key = 0; _key < _len; _key++) {
      args[_key] = arguments[_key];
    }
    (0,_utils_js__WEBPACK_IMPORTED_MODULE_1__.logInfo)("Invoking ".concat((0,_buildOptions_js__WEBPACK_IMPORTED_MODULE_30__.getGlobalVarName)(), ".").concat(name), args);
    return fn.apply(this, args);
  };
}
function addApiMethod(name, method) {
  let log = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : true;
  (0,_prebidGlobal_js__WEBPACK_IMPORTED_MODULE_0__.getGlobal)()[name] = log ? logInvocation(name, method) : method;
}

/// ///////////////////////////////
//                              //
//    Start Public APIs         //
//                              //
/// ///////////////////////////////

// Allow publishers who enable user sync override to trigger their sync
addApiMethod('triggerUserSyncs', triggerUserSyncs);

/**
 * Return a query string with all available targeting parameters for the given ad unit.
 *
 * @param adUnitCode ad unit code to target
 */
function getAdserverTargetingForAdUnitCodeStr(adUnitCode) {
  if (adUnitCode) {
    const res = getAdserverTargetingForAdUnitCode(adUnitCode);
    return (0,_utils_js__WEBPACK_IMPORTED_MODULE_1__.transformAdServerTargetingObj)(res);
  } else {
    (0,_utils_js__WEBPACK_IMPORTED_MODULE_1__.logMessage)('Need to call getAdserverTargetingForAdUnitCodeStr with adunitCode');
  }
}
addApiMethod('getAdserverTargetingForAdUnitCodeStr', getAdserverTargetingForAdUnitCodeStr);

/**
 * Return the highest cpm, unused bid for the given ad unit.
 * @param adUnitCode
 */
function getHighestUnusedBidResponseForAdUnitCode(adUnitCode) {
  if (adUnitCode) {
    const bid = _auctionManager_js__WEBPACK_IMPORTED_MODULE_8__.auctionManager.getAllBidsForAdUnitCode(adUnitCode).filter(_targeting_js__WEBPACK_IMPORTED_MODULE_9__.isBidUsable);
    return bid.length ? bid.reduce(_utils_reducers_js__WEBPACK_IMPORTED_MODULE_22__.getHighestCpm) : null;
  } else {
    (0,_utils_js__WEBPACK_IMPORTED_MODULE_1__.logMessage)('Need to call getHighestUnusedBidResponseForAdUnitCode with adunitCode');
  }
}
addApiMethod('getHighestUnusedBidResponseForAdUnitCode', getHighestUnusedBidResponseForAdUnitCode);

/**
 * Returns targeting key-value pairs available at this moment for a given ad unit.
 * @param adUnitCode adUnitCode to get the bid responses for
 */
function getAdserverTargetingForAdUnitCode(adUnitCode) {
  return getAdserverTargeting(adUnitCode)[adUnitCode];
}
addApiMethod('getAdserverTargetingForAdUnitCode', getAdserverTargetingForAdUnitCode);

/**
 * returns all ad server targeting, optionally scoped to the given ad unit(s).
 * @return Map of adUnitCodes to targeting key-value pairs
 */
function getAdserverTargeting(adUnitCode) {
  return _targeting_js__WEBPACK_IMPORTED_MODULE_9__.targeting.getAllTargeting(adUnitCode);
}
addApiMethod('getAdserverTargeting', getAdserverTargeting);
function getConsentMetadata() {
  return _consentHandler_js__WEBPACK_IMPORTED_MODULE_20__.allConsent.getConsentMeta();
}
addApiMethod('getConsentMetadata', getConsentMetadata);
function wrapInBids(arr) {
  arr = arr.slice();
  arr.bids = arr;
  return arr;
}
function getBids(type) {
  const responses = _auctionManager_js__WEBPACK_IMPORTED_MODULE_8__.auctionManager[type]().filter(bid => _auctionManager_js__WEBPACK_IMPORTED_MODULE_8__.auctionManager.getAdUnitCodes().includes(bid.adUnitCode));

  // find the last auction id to get responses for most recent auction only
  const currentAuctionId = _auctionManager_js__WEBPACK_IMPORTED_MODULE_8__.auctionManager.getLastAuctionId();
  return responses.map(bid => bid.adUnitCode).filter(_utils_js__WEBPACK_IMPORTED_MODULE_1__.uniques).map(adUnitCode => responses.filter(bid => bid.auctionId === currentAuctionId && bid.adUnitCode === adUnitCode)).filter(bids => bids && bids[0] && bids[0].adUnitCode).map(bids => {
    return {
      [bids[0].adUnitCode]: wrapInBids(bids)
    };
  }).reduce((a, b) => Object.assign(a, b), {});
}

/**
 * @returns the bids requests involved in an auction but not bid on
 */
function getNoBids() {
  return getBids('getNoBids');
}
addApiMethod('getNoBids', getNoBids);

/**
 * @returns the bids requests involved in an auction but not bid on or the specified adUnitCode
 */
function getNoBidsForAdUnitCode(adUnitCode) {
  const bids = _auctionManager_js__WEBPACK_IMPORTED_MODULE_8__.auctionManager.getNoBids().filter(bid => bid.adUnitCode === adUnitCode);
  return wrapInBids(bids);
}
addApiMethod('getNoBidsForAdUnitCode', getNoBidsForAdUnitCode);

/**
 * @return a map from ad unit code to all bids received for that ad unit code.
 */
function getBidResponses() {
  return getBids('getBidsReceived');
}
addApiMethod('getBidResponses', getBidResponses);

/**
 * Returns bids received for the specified ad unit.
 * @param adUnitCode ad unit code
 */
function getBidResponsesForAdUnitCode(adUnitCode) {
  const bids = _auctionManager_js__WEBPACK_IMPORTED_MODULE_8__.auctionManager.getBidsReceived().filter(bid => bid.adUnitCode === adUnitCode);
  return wrapInBids(bids);
}
addApiMethod('getBidResponsesForAdUnitCode', getBidResponsesForAdUnitCode);

/**
 * Set query string targeting on one or more GPT ad units.
 * @param adUnit a single `adUnit.code` or multiple.
 * @param customSlotMatching gets a GoogleTag slot and returns a filter function for adUnitCode, so you can decide to match on either eg. return slot => { return adUnitCode => { return slot.getSlotElementId() === 'myFavoriteDivId'; } };
 */
function setTargetingForGPTAsync(adUnit, customSlotMatching) {
  if (!(0,_utils_js__WEBPACK_IMPORTED_MODULE_1__.isGptPubadsDefined)()) {
    (0,_utils_js__WEBPACK_IMPORTED_MODULE_1__.logError)('window.googletag is not defined on the page');
    return;
  }
  _targeting_js__WEBPACK_IMPORTED_MODULE_9__.targeting.setTargetingForGPT(adUnit, customSlotMatching);
}
addApiMethod('setTargetingForGPTAsync', setTargetingForGPTAsync);

/**
 * Set query string targeting on all AST (AppNexus Seller Tag) ad units. Note that this function has to be called after all ad units on page are defined. For working example code, see [Using Prebid.js with AppNexus Publisher Ad Server](http://prebid.org/dev-docs/examples/use-prebid-with-appnexus-ad-server.html).
 * @param adUnitCodes adUnitCode or array of adUnitCodes
 */
function setTargetingForAst(adUnitCodes) {
  if (!_targeting_js__WEBPACK_IMPORTED_MODULE_9__.targeting.isApntagDefined()) {
    (0,_utils_js__WEBPACK_IMPORTED_MODULE_1__.logError)('window.apntag is not defined on the page');
    return;
  }
  _targeting_js__WEBPACK_IMPORTED_MODULE_9__.targeting.setTargetingForAst(adUnitCodes);
  _events_js__WEBPACK_IMPORTED_MODULE_15__.emit(SET_TARGETING, _targeting_js__WEBPACK_IMPORTED_MODULE_9__.targeting.getAllTargeting());
}
addApiMethod('setTargetingForAst', setTargetingForAst);
/**
 * This function will render the ad (based on params) in the given iframe document passed through.
 * Note that doc SHOULD NOT be the parent document page as we can't doc.write() asynchronously
 * @param  doc document
 * @param  id adId of the bid to render
 * @param options
 */
async function renderAd(doc, id, options) {
  await (0,_utils_yield_js__WEBPACK_IMPORTED_MODULE_18__.pbYield)();
  (0,_adRendering_js__WEBPACK_IMPORTED_MODULE_21__.renderAdDirect)(doc, id, options);
}
addApiMethod('renderAd', renderAd);

/**
 * Remove adUnit from the $$PREBID_GLOBAL$$ configuration, if there are no addUnitCode(s) it will remove all
 * @param adUnitCode the adUnitCode(s) to remove
 * @alias module:pbjs.removeAdUnit
 */
function removeAdUnit(adUnitCode) {
  if (!adUnitCode) {
    pbjsInstance.adUnits = [];
    return;
  }
  let adUnitCodes;
  if ((0,_utils_js__WEBPACK_IMPORTED_MODULE_4__.isArray)(adUnitCode)) {
    adUnitCodes = adUnitCode;
  } else {
    adUnitCodes = [adUnitCode];
  }
  adUnitCodes.forEach(adUnitCode => {
    for (let i = pbjsInstance.adUnits.length - 1; i >= 0; i--) {
      if (pbjsInstance.adUnits[i].code === adUnitCode) {
        pbjsInstance.adUnits.splice(i, 1);
      }
    }
  });
}
addApiMethod('removeAdUnit', removeAdUnit);
const requestBids = function () {
  const delegate = (0,_hook_js__WEBPACK_IMPORTED_MODULE_10__.hook)('async', function (reqBidOptions) {
    let {
      bidsBackHandler,
      timeout,
      adUnits,
      adUnitCodes,
      labels,
      auctionId,
      ttlBuffer,
      ortb2,
      metrics,
      defer
    } = reqBidOptions !== null && reqBidOptions !== void 0 ? reqBidOptions : {};
    _events_js__WEBPACK_IMPORTED_MODULE_15__.emit(REQUEST_BIDS);
    const cbTimeout = timeout || _config_js__WEBPACK_IMPORTED_MODULE_7__.config.getConfig('bidderTimeout');
    if (adUnitCodes != null && !Array.isArray(adUnitCodes)) {
      adUnitCodes = [adUnitCodes];
    }
    if (adUnitCodes && adUnitCodes.length) {
      // if specific adUnitCodes supplied filter adUnits for those codes
      adUnits = adUnits.filter(unit => adUnitCodes.includes(unit.code));
    } else {
      // otherwise derive adUnitCodes from adUnits
      adUnitCodes = adUnits && adUnits.map(unit => unit.code);
    }
    adUnitCodes = adUnitCodes.filter(_utils_js__WEBPACK_IMPORTED_MODULE_1__.uniques);
    let ortb2Fragments = {
      global: (0,_utils_js__WEBPACK_IMPORTED_MODULE_1__.mergeDeep)({}, _config_js__WEBPACK_IMPORTED_MODULE_7__.config.getAnyConfig('ortb2') || {}, ortb2 || {}),
      bidder: Object.fromEntries(Object.entries(_config_js__WEBPACK_IMPORTED_MODULE_7__.config.getBidderConfig()).map(_ref6 => {
        let [bidder, cfg] = _ref6;
        return [bidder, (0,_utils_js__WEBPACK_IMPORTED_MODULE_4__.deepClone)(cfg.ortb2)];
      }).filter(_ref7 => {
        let [_, ortb2] = _ref7;
        return ortb2 != null;
      }))
    };
    ortb2Fragments = (0,_fpd_normalize_js__WEBPACK_IMPORTED_MODULE_28__.normalizeFPD)(ortb2Fragments);
    (0,_fpd_enrichment_js__WEBPACK_IMPORTED_MODULE_19__.enrichFPD)(_utils_promise_js__WEBPACK_IMPORTED_MODULE_17__.PbPromise.resolve(ortb2Fragments.global)).then(global => {
      ortb2Fragments.global = global;
      return startAuction({
        bidsBackHandler,
        timeout: cbTimeout,
        adUnits,
        adUnitCodes,
        labels,
        auctionId,
        ttlBuffer,
        ortb2Fragments,
        metrics,
        defer
      });
    });
  }, 'requestBids');
  return (0,_hook_js__WEBPACK_IMPORTED_MODULE_10__.wrapHook)(delegate, logInvocation('requestBids', (0,_utils_prerendering_js__WEBPACK_IMPORTED_MODULE_26__.delayIfPrerendering)(() => !_config_js__WEBPACK_IMPORTED_MODULE_7__.config.getConfig('allowPrerendering'), function requestBids() {
    let options = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
    // unlike the main body of `delegate`, this runs before any other hook has a chance to;
    // it's also not restricted in its return value in the way `async` hooks are.

    // if the request does not specify adUnits, clone the global adUnit array;
    // otherwise, if the caller goes on to use addAdUnits/removeAdUnits, any asynchronous logic
    // in any hook might see their effects.
    const req = options;
    const adUnits = req.adUnits || pbjsInstance.adUnits;
    req.adUnits = Array.isArray(adUnits) ? adUnits.slice() : [adUnits];
    req.metrics = (0,_utils_perfMetrics_js__WEBPACK_IMPORTED_MODULE_16__.newMetrics)();
    req.metrics.checkpoint('requestBids');
    req.defer = (0,_utils_promise_js__WEBPACK_IMPORTED_MODULE_17__.defer)({
      promiseFactory: r => new Promise(r)
    });
    delegate.call(this, req);
    return req.defer.promise;
  })));
}();
addApiMethod('requestBids', requestBids, false);
const startAuction = (0,_hook_js__WEBPACK_IMPORTED_MODULE_10__.hook)('async', function () {
  let {
    bidsBackHandler,
    timeout: cbTimeout,
    adUnits: adUnitDefs,
    ttlBuffer,
    adUnitCodes,
    labels,
    auctionId,
    ortb2Fragments,
    metrics,
    defer
  } = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
  const s2sBidders = (0,_adapterManager_js__WEBPACK_IMPORTED_MODULE_13__.getS2SBidderSet)(_config_js__WEBPACK_IMPORTED_MODULE_7__.config.getConfig('s2sConfig') || []);
  fillAdUnitDefaults(adUnitDefs);
  const adUnits = (0,_utils_perfMetrics_js__WEBPACK_IMPORTED_MODULE_16__.useMetrics)(metrics).measureTime('requestBids.validate', () => checkAdUnitSetup(adUnitDefs));
  function auctionDone(bids, timedOut, auctionId) {
    if (typeof bidsBackHandler === 'function') {
      try {
        bidsBackHandler(bids, timedOut, auctionId);
      } catch (e) {
        (0,_utils_js__WEBPACK_IMPORTED_MODULE_1__.logError)('Error executing bidsBackHandler', null, e);
      }
    }
    defer.resolve({
      bids,
      timedOut,
      auctionId
    });
  }
  const tids = {};
  /*
   * for a given adunit which supports a set of mediaTypes
   * and a given bidder which supports a set of mediaTypes
   * a bidder is eligible to participate on the adunit
   * if it supports at least one of the mediaTypes on the adunit
   */
  adUnits.forEach(adUnit => {
    var _adUnit$ortb2Imp3;
    // get the adunit's mediaTypes, defaulting to banner if mediaTypes isn't present
    const adUnitMediaTypes = Object.keys(adUnit.mediaTypes || {
      'banner': 'banner'
    });

    // get the bidder's mediaTypes
    const allBidders = adUnit.bids.map(bid => bid.bidder).filter(Boolean);
    const bidderRegistry = _adapterManager_js__WEBPACK_IMPORTED_MODULE_13__["default"].bidderRegistry;
    const bidders = allBidders.filter(bidder => !s2sBidders.has(bidder));
    adUnit.adUnitId = (0,_utils_js__WEBPACK_IMPORTED_MODULE_1__.generateUUID)();
    const tid = (_adUnit$ortb2Imp3 = adUnit.ortb2Imp) === null || _adUnit$ortb2Imp3 === void 0 || (_adUnit$ortb2Imp3 = _adUnit$ortb2Imp3.ext) === null || _adUnit$ortb2Imp3 === void 0 ? void 0 : _adUnit$ortb2Imp3.tid;
    if (tid) {
      if (tids.hasOwnProperty(adUnit.code)) {
        (0,_utils_js__WEBPACK_IMPORTED_MODULE_1__.logWarn)("Multiple distinct ortb2Imp.ext.tid were provided for twin ad units '".concat(adUnit.code, "'"));
      } else {
        tids[adUnit.code] = tid;
      }
    }
    if (ttlBuffer != null && !adUnit.hasOwnProperty('ttlBuffer')) {
      adUnit.ttlBuffer = ttlBuffer;
    }
    bidders.forEach(bidder => {
      const adapter = bidderRegistry[bidder];
      const spec = adapter && adapter.getSpec && adapter.getSpec();
      // banner is default if not specified in spec
      const bidderMediaTypes = spec && spec.supportedMediaTypes || ['banner'];

      // check if the bidder's mediaTypes are not in the adUnit's mediaTypes
      const bidderEligible = adUnitMediaTypes.some(type => bidderMediaTypes.includes(type));
      if (!bidderEligible) {
        // drop the bidder from the ad unit if it's not compatible
        (0,_utils_js__WEBPACK_IMPORTED_MODULE_1__.logWarn)((0,_utils_js__WEBPACK_IMPORTED_MODULE_1__.unsupportedBidderMessage)(adUnit, bidder));
        adUnit.bids = adUnit.bids.filter(bid => bid.bidder !== bidder);
      }
    });
  });
  if (!adUnits || adUnits.length === 0) {
    (0,_utils_js__WEBPACK_IMPORTED_MODULE_1__.logMessage)('No adUnits configured. No bids requested.');
    auctionDone();
  } else {
    adUnits.forEach(au => {
      var _au$ortb2Imp;
      const tid = ((_au$ortb2Imp = au.ortb2Imp) === null || _au$ortb2Imp === void 0 || (_au$ortb2Imp = _au$ortb2Imp.ext) === null || _au$ortb2Imp === void 0 ? void 0 : _au$ortb2Imp.tid) || tids[au.code] || (0,_utils_js__WEBPACK_IMPORTED_MODULE_1__.generateUUID)();
      if (!tids.hasOwnProperty(au.code)) {
        tids[au.code] = tid;
      }
      au.transactionId = tid;
    });
    const auction = _auctionManager_js__WEBPACK_IMPORTED_MODULE_8__.auctionManager.createAuction({
      adUnits,
      adUnitCodes,
      callback: auctionDone,
      cbTimeout,
      labels,
      auctionId,
      ortb2Fragments,
      metrics
    });
    const adUnitsLen = adUnits.length;
    if (adUnitsLen > 15) {
      (0,_utils_js__WEBPACK_IMPORTED_MODULE_1__.logInfo)("Current auction ".concat(auction.getAuctionId(), " contains ").concat(adUnitsLen, " adUnits."), adUnits);
    }
    adUnitCodes.forEach(code => _targeting_js__WEBPACK_IMPORTED_MODULE_9__.targeting.setLatestAuctionForAdUnit(code, auction.getAuctionId()));
    auction.callBids();
  }
}, 'startAuction');
function executeCallbacks(fn, reqBidsConfigObj) {
  runAll(_storageManager_js__WEBPACK_IMPORTED_MODULE_12__.storageCallbacks);
  runAll(enableAnalyticsCallbacks);
  fn.call(this, reqBidsConfigObj);
  function runAll(queue) {
    let queued;
    while (queued = queue.shift()) {
      queued();
    }
  }
}

// This hook will execute all storage callbacks which were registered before gdpr enforcement hook was added. Some bidders, user id modules use storage functions when module is parsed but gdpr enforcement hook is not added at that stage as setConfig callbacks are yet to be called. Hence for such calls we execute all the stored callbacks just before requestBids. At this hook point we will know for sure that tcfControl module is added or not
requestBids.before(executeCallbacks, 49);
/**
 * Add ad unit(s)
 * @param adUnits
 */
function addAdUnits(adUnits) {
  pbjsInstance.adUnits.push(...(Array.isArray(adUnits) ? adUnits : [adUnits]));
  _events_js__WEBPACK_IMPORTED_MODULE_15__.emit(ADD_AD_UNITS);
}
addApiMethod('addAdUnits', addAdUnits);
const eventIdValidators = {
  bidWon(id) {
    const adUnitCodes = _auctionManager_js__WEBPACK_IMPORTED_MODULE_8__.auctionManager.getBidsRequested().map(bidSet => bidSet.bids.map(bid => bid.adUnitCode)).reduce(_utils_js__WEBPACK_IMPORTED_MODULE_1__.flatten).filter(_utils_js__WEBPACK_IMPORTED_MODULE_1__.uniques);
    if (!adUnitCodes.includes(id)) {
      (0,_utils_js__WEBPACK_IMPORTED_MODULE_1__.logError)('The "' + id + '" placement is not defined.');
      return;
    }
    return true;
  }
};
function validateEventId(event, id) {
  return eventIdValidators.hasOwnProperty(event) && eventIdValidators[event](id);
}

/**
 * @param event the name of the event
 * @param handler a callback to set on event
 * @param id an identifier in the context of the event
 *
 * This API call allows you to register a callback to handle a Prebid.js event.
 * An optional `id` parameter provides more finely-grained event callback registration.
 * This makes it possible to register callback events for a specific item in the
 * event context. For example, `bidWon` events will accept an `id` for ad unit code.
 * `bidWon` callbacks registered with an ad unit code id will be called when a bid
 * for that ad unit code wins the auction. Without an `id` this method registers the
 * callback for every `bidWon` event.
 *
 * Currently `bidWon` is the only event that accepts an `id` parameter.
 */
function onEvent(event, handler, id) {
  if (!(0,_utils_js__WEBPACK_IMPORTED_MODULE_4__.isFn)(handler)) {
    (0,_utils_js__WEBPACK_IMPORTED_MODULE_1__.logError)('The event handler provided is not a function and was not set on event "' + event + '".');
    return;
  }
  if (id && !validateEventId(event, id)) {
    (0,_utils_js__WEBPACK_IMPORTED_MODULE_1__.logError)('The id provided is not valid for event "' + event + '" and no handler was set.');
    return;
  }
  _events_js__WEBPACK_IMPORTED_MODULE_15__.on(event, handler, id);
}
addApiMethod('onEvent', onEvent);

/**
 * @param event the name of the event
 * @param handler a callback to remove from the event
 * @param id an identifier in the context of the event (see `$$PREBID_GLOBAL$$.onEvent`)
 */
function offEvent(event, handler, id) {
  if (id && !validateEventId(event, id)) {
    return;
  }
  _events_js__WEBPACK_IMPORTED_MODULE_15__.off(event, handler, id);
}
addApiMethod('offEvent', offEvent);

/**
 * Return a copy of all events emitted
 */
function getEvents() {
  return _events_js__WEBPACK_IMPORTED_MODULE_15__.getEvents();
}
addApiMethod('getEvents', getEvents);
function registerBidAdapter(bidderAdaptor, bidderCode, spec) {
  try {
    const bidder = spec ? (0,_adapters_bidderFactory_js__WEBPACK_IMPORTED_MODULE_27__.newBidder)(spec) : bidderAdaptor();
    _adapterManager_js__WEBPACK_IMPORTED_MODULE_13__["default"].registerBidAdapter(bidder, bidderCode);
  } catch (e) {
    (0,_utils_js__WEBPACK_IMPORTED_MODULE_1__.logError)('Error registering bidder adapter : ' + e.message);
  }
}
addApiMethod('registerBidAdapter', registerBidAdapter);
function registerAnalyticsAdapter(options) {
  try {
    _adapterManager_js__WEBPACK_IMPORTED_MODULE_13__["default"].registerAnalyticsAdapter(options);
  } catch (e) {
    (0,_utils_js__WEBPACK_IMPORTED_MODULE_1__.logError)('Error registering analytics adapter : ' + e.message);
  }
}
addApiMethod('registerAnalyticsAdapter', registerAnalyticsAdapter);
const enableAnalyticsCallbacks = [];
const enableAnalyticsCb = (0,_hook_js__WEBPACK_IMPORTED_MODULE_10__.hook)('async', function (config) {
  if (config && !(0,_utils_js__WEBPACK_IMPORTED_MODULE_1__.isEmpty)(config)) {
    _adapterManager_js__WEBPACK_IMPORTED_MODULE_13__["default"].enableAnalytics(config);
  } else {
    (0,_utils_js__WEBPACK_IMPORTED_MODULE_1__.logError)("".concat((0,_buildOptions_js__WEBPACK_IMPORTED_MODULE_30__.getGlobalVarName)(), ".enableAnalytics should be called with option {}"));
  }
}, 'enableAnalyticsCb');
function enableAnalytics(config) {
  enableAnalyticsCallbacks.push(enableAnalyticsCb.bind(this, config));
}
addApiMethod('enableAnalytics', enableAnalytics);

/**
 * Define an alias for a bid adapter.
 */
function aliasBidder(bidderCode, alias, options) {
  if (bidderCode && alias) {
    _adapterManager_js__WEBPACK_IMPORTED_MODULE_13__["default"].aliasBidAdapter(bidderCode, alias, options);
  } else {
    (0,_utils_js__WEBPACK_IMPORTED_MODULE_1__.logError)('bidderCode and alias must be passed as arguments', "".concat((0,_buildOptions_js__WEBPACK_IMPORTED_MODULE_30__.getGlobalVarName)(), ".aliasBidder"));
  }
}
addApiMethod('aliasBidder', aliasBidder);
pbjsInstance.aliasRegistry = _adapterManager_js__WEBPACK_IMPORTED_MODULE_13__["default"].aliasRegistry;
_config_js__WEBPACK_IMPORTED_MODULE_7__.config.getConfig('aliasRegistry', config => {
  if (config.aliasRegistry === 'private') delete pbjsInstance.aliasRegistry;
});

/**
 * @return All bids that have been rendered. Useful for [troubleshooting your integration](http://prebid.org/dev-docs/prebid-troubleshooting-guide.html).
 */
function getAllWinningBids() {
  return _auctionManager_js__WEBPACK_IMPORTED_MODULE_8__.auctionManager.getAllWinningBids();
}
addApiMethod('getAllWinningBids', getAllWinningBids);

/**
 * @return Bids that have won their respective auctions but have not been rendered yet.
 */
function getAllPrebidWinningBids() {
  (0,_utils_js__WEBPACK_IMPORTED_MODULE_1__.logWarn)('getAllPrebidWinningBids may be removed or renamed in a future version. This function returns bids that have won in prebid and have had targeting set but have not (yet?) won in the ad server. It excludes bids that have been rendered.');
  return _auctionManager_js__WEBPACK_IMPORTED_MODULE_8__.auctionManager.getBidsReceived().filter(bid => bid.status === _constants_js__WEBPACK_IMPORTED_MODULE_14__.BID_STATUS.BID_TARGETING_SET);
}
addApiMethod('getAllPrebidWinningBids', getAllPrebidWinningBids);

/**
 * Get highest cpm bids for all adUnits, or highest cpm bid object for the given adUnit
 * @param adUnitCode - ad unit code
 */
function getHighestCpmBids(adUnitCode) {
  return _targeting_js__WEBPACK_IMPORTED_MODULE_9__.targeting.getWinningBids(adUnitCode);
}
addApiMethod('getHighestCpmBids', getHighestCpmBids);

/**
 * Clear all auctions (and their bids) from the bid cache.
 */
function clearAllAuctions() {
  _auctionManager_js__WEBPACK_IMPORTED_MODULE_8__.auctionManager.clearAllAuctions();
}
addApiMethod('clearAllAuctions', clearAllAuctions);
/**
 * Mark the winning bid as used, should only be used in conjunction with video
 */
function markWinningBidAsUsed(_ref8) {
  let {
    adId,
    adUnitCode,
    analytics = false,
    events = false
  } = _ref8;
  let bids;
  if (adUnitCode && adId == null) {
    bids = _targeting_js__WEBPACK_IMPORTED_MODULE_9__.targeting.getWinningBids(adUnitCode);
  } else if (adId) {
    bids = _auctionManager_js__WEBPACK_IMPORTED_MODULE_8__.auctionManager.getBidsReceived().filter(bid => bid.adId === adId);
  } else {
    (0,_utils_js__WEBPACK_IMPORTED_MODULE_1__.logWarn)('Improper use of markWinningBidAsUsed. It needs an adUnitCode or an adId to function.');
  }
  if (bids.length > 0) {
    if (analytics || events) {
      (0,_adRendering_js__WEBPACK_IMPORTED_MODULE_21__.markWinningBid)(bids[0]);
    } else {
      _auctionManager_js__WEBPACK_IMPORTED_MODULE_8__.auctionManager.addWinningBid(bids[0]);
    }
    (0,_adRendering_js__WEBPACK_IMPORTED_MODULE_21__.markBidAsRendered)(bids[0]);
  }
}
if (true) {
  addApiMethod('markWinningBidAsUsed', markWinningBidAsUsed);
}
addApiMethod('getConfig', _config_js__WEBPACK_IMPORTED_MODULE_7__.config.getAnyConfig);
addApiMethod('readConfig', _config_js__WEBPACK_IMPORTED_MODULE_7__.config.readAnyConfig);
addApiMethod('mergeConfig', _config_js__WEBPACK_IMPORTED_MODULE_7__.config.mergeConfig);
addApiMethod('mergeBidderConfig', _config_js__WEBPACK_IMPORTED_MODULE_7__.config.mergeBidderConfig);
addApiMethod('setConfig', _config_js__WEBPACK_IMPORTED_MODULE_7__.config.setConfig);
addApiMethod('setBidderConfig', _config_js__WEBPACK_IMPORTED_MODULE_7__.config.setBidderConfig);
pbjsInstance.que.push(() => (0,_secureCreatives_js__WEBPACK_IMPORTED_MODULE_5__.listenMessagesFromCreative)());
let queSetupComplete;
function resetQueSetup() {
  queSetupComplete = (0,_utils_promise_js__WEBPACK_IMPORTED_MODULE_17__.defer)();
}
resetQueSetup();

/**
 * This queue lets users load Prebid asynchronously, but run functions the same way regardless of whether it gets loaded
 * before or after their script executes. For example, given the code:
 *
 * <script src="url/to/Prebid.js" async></script>
 * <script>
 *   var pbjs = pbjs || {};
 *   pbjs.cmd = pbjs.cmd || [];
 *   pbjs.cmd.push(functionToExecuteOncePrebidLoads);
 * </script>
 *
 * If the page's script runs before prebid loads, then their function gets added to the queue, and executed
 * by prebid once it's done loading. If it runs after prebid loads, then this monkey-patch causes their
 * function to execute immediately.
 *
 * @param  {function} command A function which takes no arguments. This is guaranteed to run exactly once, and only after
 *                            the Prebid script has been fully loaded.
 * @alias module:pbjs.cmd.push
 * @alias module:pbjs.que.push
 */
function quePush(command) {
  queSetupComplete.promise.then(() => {
    if (typeof command === 'function') {
      try {
        command.call();
      } catch (e) {
        (0,_utils_js__WEBPACK_IMPORTED_MODULE_1__.logError)('Error processing command :', e.message, e.stack);
      }
    } else {
      (0,_utils_js__WEBPACK_IMPORTED_MODULE_1__.logError)("Commands written into ".concat((0,_buildOptions_js__WEBPACK_IMPORTED_MODULE_30__.getGlobalVarName)(), ".cmd.push must be wrapped in a function"));
    }
  });
}
async function _processQueue(queue) {
  for (const cmd of queue) {
    if (typeof cmd.called === 'undefined') {
      try {
        cmd.call();
        cmd.called = true;
      } catch (e) {
        (0,_utils_js__WEBPACK_IMPORTED_MODULE_1__.logError)('Error processing command :', 'prebid.js', e);
      }
    }
    await (0,_utils_yield_js__WEBPACK_IMPORTED_MODULE_18__.pbYield)();
  }
}

/**
 * Process the command queue, effectively booting up Prebid.
 * Bundles generated by the build automatically include a call to this; NPM consumers
 * should call this after loading all modules and before using other APIs.
 */
const processQueue = (0,_utils_prerendering_js__WEBPACK_IMPORTED_MODULE_26__.delayIfPrerendering)(() => pbjsInstance.delayPrerendering, async function () {
  pbjsInstance.que.push = pbjsInstance.cmd.push = quePush;
  (0,_adRendering_js__WEBPACK_IMPORTED_MODULE_21__.insertLocatorFrame)();
  _hook_js__WEBPACK_IMPORTED_MODULE_10__.hook.ready();
  try {
    await _processQueue(pbjsInstance.que);
    await _processQueue(pbjsInstance.cmd);
  } finally {
    queSetupComplete.resolve();
  }
});
addApiMethod('processQueue', processQueue, false);

/**
 * Manually trigger billing for a winning bid, idendified either by ad ID or ad unit code.
 * Used in conjunction with `adUnit.deferBilling`.
 */
function triggerBilling(_ref9) {
  let {
    adId,
    adUnitCode
  } = _ref9;
  _auctionManager_js__WEBPACK_IMPORTED_MODULE_8__.auctionManager.getAllWinningBids().filter(bid => bid.adId === adId || adId == null && bid.adUnitCode === adUnitCode).forEach(bid => {
    _adapterManager_js__WEBPACK_IMPORTED_MODULE_13__["default"].triggerBilling(bid);
    (0,_adRendering_js__WEBPACK_IMPORTED_MODULE_21__.renderIfDeferred)(bid);
  });
}
addApiMethod('triggerBilling', triggerBilling);

/**
 * Refreshes the previously generated page view ID. Can be used to instruct bidders
 * that use page view ID to consider future auctions as part of a new page load.
 */
function refreshPageViewId() {
  for (const key of pbjsInstance.pageViewIdPerBidder.keys()) {
    pbjsInstance.pageViewIdPerBidder.set(key, (0,_utils_js__WEBPACK_IMPORTED_MODULE_1__.generateUUID)());
  }
}
addApiMethod('refreshPageViewId', refreshPageViewId);
/* unused harmony default export */ var __WEBPACK_DEFAULT_EXPORT__ = (pbjsInstance);


/***/ }),

/***/ "./src/prebidGlobal.js":
/*!*****************************!*\
  !*** ./src/prebidGlobal.js ***!
  \*****************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   getGlobal: () => (/* binding */ getGlobal),
/* harmony export */   registerModule: () => (/* binding */ registerModule)
/* harmony export */ });
/* harmony import */ var _buildOptions_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./buildOptions.js */ "./src/buildOptions.js");

// if the global already exists in global document scope, use it, if not, create the object
const scope = !(0,_buildOptions_js__WEBPACK_IMPORTED_MODULE_0__.shouldDefineGlobal)() ? {} : window;
const global = scope[(0,_buildOptions_js__WEBPACK_IMPORTED_MODULE_0__.getGlobalVarName)()] = scope[(0,_buildOptions_js__WEBPACK_IMPORTED_MODULE_0__.getGlobalVarName)()] || {};
global.cmd = global.cmd || [];
global.que = global.que || [];
global.installedModules = global.installedModules || [];

// create a pbjs global pointer
if (scope === window) {
  scope._pbjsGlobals = scope._pbjsGlobals || [];
  scope._pbjsGlobals.push((0,_buildOptions_js__WEBPACK_IMPORTED_MODULE_0__.getGlobalVarName)());
}
function getGlobal() {
  return global;
}
function registerModule(name) {
  global.installedModules.push(name);
}


/***/ }),

/***/ "./src/refererDetection.js":
/*!*********************************!*\
  !*** ./src/refererDetection.js ***!
  \*********************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   getRefererInfo: () => (/* binding */ getRefererInfo),
/* harmony export */   parseDomain: () => (/* binding */ parseDomain)
/* harmony export */ });
/* unused harmony exports ensureProtocol, detectReferer, cacheWithLocation */
/* harmony import */ var _config_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./config.js */ "./src/config.js");
/* harmony import */ var _utils_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./utils.js */ "./src/utils.js");
/**
 * The referer detection module attempts to gather referer information from the current page that prebid.js resides in.
 * The information that it tries to collect includes:
 * The detected top url in the nav bar,
 * Whether it was able to reach the top most window (if for example it was embedded in several iframes),
 * The number of iframes it was embedded in if applicable (by default max ten iframes),
 * A list of the domains of each embedded window if applicable.
 * Canonical URL which refers to an HTML link element, with the attribute of rel="canonical", found in the <head> element of your webpage
 */




/**
 * Prepend a URL with the page's protocol (http/https), if necessary.
 */
function ensureProtocol(url) {
  let win = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : window;
  if (!url) return url;
  if (/\w+:\/\//.exec(url)) {
    // url already has protocol
    return url;
  }
  let windowProto = win.location.protocol;
  try {
    windowProto = win.top.location.protocol;
  } catch (e) {}
  if (/^\/\//.exec(url)) {
    // url uses relative protocol ("//example.com")
    return windowProto + url;
  } else {
    return "".concat(windowProto, "//").concat(url);
  }
}

/**
 * Extract the domain portion from a URL.
 * @param url - The URL to extract the domain from.
 * @param options - Options for parsing the domain.
 * @param options.noLeadingWww - If true, remove 'www.' appearing at the beginning of the domain.
 * @param options.noPort - If true, do not include the ':[port]' portion.
 * @return The extracted domain or undefined if the URL is invalid.
 */
function parseDomain(url) {
  let {
    noLeadingWww = false,
    noPort = false
  } = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
  let target;
  try {
    target = new URL(ensureProtocol(url));
  } catch (e) {
    return;
  }
  target = noPort ? target.hostname : target.host;
  if (noLeadingWww && target.startsWith('www.')) {
    target = target.substring(4);
  }
  return target;
}

/**
 * This function returns canonical URL which refers to an HTML link element, with the attribute of rel="canonical", found in the <head> element of your webpage
 *
 * @param {Object} doc document
 * @returns {string|null}
 */
function getCanonicalUrl(doc) {
  try {
    const element = doc.querySelector("link[rel='canonical']");
    if (element !== null) {
      return element.href;
    }
  } catch (e) {
    // Ignore error
  }
  return null;
}
/**
 * @param {Window} win Window
 * @returns {Function}
 */
function detectReferer(win) {
  /**
   * This function would return a read-only array of hostnames for all the parent frames.
   * win.location.ancestorOrigins is only supported in webkit browsers. For non-webkit browsers it will return undefined.
   *
   * @param {Window} win Window object
   * @returns {(undefined|Array)} Ancestor origins or undefined
   */
  function getAncestorOrigins(win) {
    try {
      if (!win.location.ancestorOrigins) {
        return;
      }
      return win.location.ancestorOrigins;
    } catch (e) {
      // Ignore error
    }
  }

  // TODO: the meaning of "reachedTop" seems to be intentionally ambiguous - best to leave them out of
  // the typedef for now. (for example, unit tests enforce that "reachedTop" should be false in some situations where we
  // happily provide a location for the top).

  /**
   * Walk up the windows to get the origin stack and best available referrer, canonical URL, etc.
   *
   * @returns An object containing referer information.
   */
  function refererInfo() {
    const stack = [];
    const ancestors = getAncestorOrigins(win);
    const maxNestedIframes = _config_js__WEBPACK_IMPORTED_MODULE_0__.config.getConfig('maxNestedIframes');
    let currentWindow;
    let bestLocation;
    let bestCanonicalUrl;
    let reachedTop = false;
    let level = 0;
    let valuesFromAmp = false;
    let inAmpFrame = false;
    let hasTopLocation = false;
    do {
      const previousWindow = currentWindow;
      const wasInAmpFrame = inAmpFrame;
      let currentLocation;
      let crossOrigin = false;
      let foundLocation = null;
      inAmpFrame = false;
      currentWindow = currentWindow ? currentWindow.parent : win;
      try {
        currentLocation = currentWindow.location.href || null;
      } catch (e) {
        crossOrigin = true;
      }
      if (crossOrigin) {
        if (wasInAmpFrame) {
          const context = previousWindow.context;
          try {
            foundLocation = context.sourceUrl;
            bestLocation = foundLocation;
            hasTopLocation = true;
            valuesFromAmp = true;
            if (currentWindow === win.top) {
              reachedTop = true;
            }
            if (context.canonicalUrl) {
              bestCanonicalUrl = context.canonicalUrl;
            }
          } catch (e) {/* Do nothing */}
        } else {
          (0,_utils_js__WEBPACK_IMPORTED_MODULE_1__.logWarn)('Trying to access cross domain iframe. Continuing without referrer and location');
          try {
            // the referrer to an iframe is the parent window
            const referrer = previousWindow.document.referrer;
            if (referrer) {
              foundLocation = referrer;
              if (currentWindow === win.top) {
                reachedTop = true;
              }
            }
          } catch (e) {/* Do nothing */}
          if (!foundLocation && ancestors && ancestors[level - 1]) {
            foundLocation = ancestors[level - 1];
            if (currentWindow === win.top) {
              hasTopLocation = true;
            }
          }
          if (foundLocation && !valuesFromAmp) {
            bestLocation = foundLocation;
          }
        }
      } else {
        if (currentLocation) {
          foundLocation = currentLocation;
          bestLocation = foundLocation;
          valuesFromAmp = false;
          if (currentWindow === win.top) {
            reachedTop = true;
            const canonicalUrl = getCanonicalUrl(currentWindow.document);
            if (canonicalUrl) {
              bestCanonicalUrl = canonicalUrl;
            }
          }
        }
        if (currentWindow.context && currentWindow.context.sourceUrl) {
          inAmpFrame = true;
        }
      }
      stack.push(foundLocation);
      level++;
    } while (currentWindow !== win.top && level < maxNestedIframes);
    stack.reverse();
    let ref;
    try {
      ref = win.top.document.referrer;
    } catch (e) {}
    const location = reachedTop || hasTopLocation ? bestLocation : null;
    const canonicalUrl = _config_js__WEBPACK_IMPORTED_MODULE_0__.config.getConfig('pageUrl') || bestCanonicalUrl || null;
    let page = _config_js__WEBPACK_IMPORTED_MODULE_0__.config.getConfig('pageUrl') || location || ensureProtocol(canonicalUrl, win);
    if (location && location.indexOf('?') > -1 && page.indexOf('?') === -1) {
      page = "".concat(page).concat(location.substring(location.indexOf('?')));
    }
    return {
      /**
       * True if the top window is accessible.
       */
      reachedTop,
      isAmp: valuesFromAmp,
      /**
       * number of steps between window.self and window.top
       */
      numIframes: level - 1,
      /**
       * our best guess at the location for each frame, in the direction top -> self.
       */
      stack,
      /**
       * of the top-most frame for which we could guess the location. Outside of cross-origin scenarios, this is equivalent to `location`.
       */
      topmostLocation: bestLocation || null,
      /**
       * the browser's location, or null if not available (due to cross-origin restrictions)
       */
      location,
      /**
       * the site's canonical URL as set by the publisher, through setConfig({pageUrl}) or <link rel="canonical" />
       */
      canonicalUrl,
      /**
       * the best candidate for the current page URL: `canonicalUrl`, falling back to `location`
       */
      page,
      /**
       * the domain portion of `page`
       */
      domain: parseDomain(page) || null,
      /**
       * the referrer (document.referrer) to the current page, or null if not available (due to cross-origin restrictions)
       */
      ref: ref || null,
      // TODO: the "legacy" refererInfo object is provided here, for now, to accommodate
      // adapters that decided to just send it verbatim to their backend.
      legacy: {
        reachedTop,
        isAmp: valuesFromAmp,
        numIframes: level - 1,
        stack,
        referer: bestLocation || null,
        canonicalUrl
      }
    };
  }
  return refererInfo;
}

// cache result of fn (= referer info) as long as:
// - we are the top window
// - canonical URL tag and window location have not changed
function cacheWithLocation(fn) {
  let win = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : window;
  if (win.top !== win) return fn;
  let canonical, href, value;
  return function () {
    const newCanonical = getCanonicalUrl(win.document);
    const newHref = win.location.href;
    if (canonical !== newCanonical || newHref !== href) {
      canonical = newCanonical;
      href = newHref;
      value = fn();
    }
    return value;
  };
}
const getRefererInfo = cacheWithLocation(detectReferer(window));


/***/ }),

/***/ "./src/secureCreatives.js":
/*!********************************!*\
  !*** ./src/secureCreatives.js ***!
  \********************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   listenMessagesFromCreative: () => (/* binding */ listenMessagesFromCreative)
/* harmony export */ });
/* unused harmony exports getReplier, receiveMessage, resizeAnchor, resizeRemoteCreative */
/* harmony import */ var _babel_runtime_helpers_defineProperty__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @babel/runtime/helpers/defineProperty */ "../../node_modules/@babel/runtime/helpers/esm/defineProperty.js");
/* harmony import */ var _native_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./native.js */ "./src/native.js");
/* harmony import */ var _constants_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./constants.js */ "./src/constants.js");
/* harmony import */ var _utils_js__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ./utils.js */ "./src/utils.js");
/* harmony import */ var _adRendering_js__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ./adRendering.js */ "./src/adRendering.js");
/* harmony import */ var _creativeRenderers_js__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! ./creativeRenderers.js */ "./src/creativeRenderers.js");
/* harmony import */ var _utils_promise_js__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(/*! ./utils/promise.js */ "./src/utils/promise.js");

function ownKeys(e, r) { var t = Object.keys(e); if (Object.getOwnPropertySymbols) { var o = Object.getOwnPropertySymbols(e); r && (o = o.filter(function (r) { return Object.getOwnPropertyDescriptor(e, r).enumerable; })), t.push.apply(t, o); } return t; }
function _objectSpread(e) { for (var r = 1; r < arguments.length; r++) { var t = null != arguments[r] ? arguments[r] : {}; r % 2 ? ownKeys(Object(t), !0).forEach(function (r) { (0,_babel_runtime_helpers_defineProperty__WEBPACK_IMPORTED_MODULE_0__["default"])(e, r, t[r]); }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(e, Object.getOwnPropertyDescriptors(t)) : ownKeys(Object(t)).forEach(function (r) { Object.defineProperty(e, r, Object.getOwnPropertyDescriptor(t, r)); }); } return e; }
/* Secure Creatives
  Provides support for rendering creatives into cross domain iframes such as SafeFrame to prevent
   access to a publisher page from creative payloads.
 */







const {
  REQUEST,
  RESPONSE,
  NATIVE,
  EVENT
} = _constants_js__WEBPACK_IMPORTED_MODULE_2__.MESSAGES;
const HANDLER_MAP = {
  [REQUEST]: handleRenderRequest,
  [EVENT]: handleEventRequest
};
if (true) {
  Object.assign(HANDLER_MAP, {
    [NATIVE]: handleNativeRequest
  });
}
function listenMessagesFromCreative() {
  window.addEventListener('message', function (ev) {
    receiveMessage(ev);
  }, false);
}
function getReplier(ev) {
  if (ev.origin == null && ev.ports.length === 0) {
    return function () {
      const msg = 'Cannot post message to a frame with null origin. Please update creatives to use MessageChannel, see https://github.com/prebid/Prebid.js/issues/7870';
      (0,_utils_js__WEBPACK_IMPORTED_MODULE_3__.logError)(msg);
      throw new Error(msg);
    };
  } else if (ev.ports.length > 0) {
    return function (message) {
      ev.ports[0].postMessage(JSON.stringify(message));
    };
  } else {
    return function (message) {
      ev.source.postMessage(JSON.stringify(message), ev.origin);
    };
  }
}
function ensureAdId(adId, reply) {
  return function (data) {
    for (var _len = arguments.length, args = new Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
      args[_key - 1] = arguments[_key];
    }
    return reply(Object.assign({}, data, {
      adId
    }), ...args);
  };
}
function receiveMessage(ev) {
  var key = ev.message ? 'message' : 'data';
  var data = {};
  try {
    data = JSON.parse(ev[key]);
  } catch (e) {
    return;
  }
  if (data && data.adId && data.message && HANDLER_MAP.hasOwnProperty(data.message)) {
    return (0,_adRendering_js__WEBPACK_IMPORTED_MODULE_4__.getBidToRender)(data.adId, data.message === _constants_js__WEBPACK_IMPORTED_MODULE_2__.MESSAGES.REQUEST).then(adObject => {
      HANDLER_MAP[data.message](ensureAdId(data.adId, getReplier(ev)), data, adObject);
    });
  }
}
function getResizer(adId, bidResponse) {
  // in some situations adId !== bidResponse.adId
  // the first is the one that was requested and is tied to the element
  // the second is the one that is being rendered (sometimes different, e.g. in some paapi setups)
  return function (width, height) {
    resizeRemoteCreative(_objectSpread(_objectSpread({}, bidResponse), {}, {
      width,
      height,
      adId
    }));
  };
}
function handleRenderRequest(reply, message, bidResponse) {
  (0,_adRendering_js__WEBPACK_IMPORTED_MODULE_4__.handleRender)({
    renderFn(adData) {
      reply(Object.assign({
        message: RESPONSE,
        renderer: (0,_creativeRenderers_js__WEBPACK_IMPORTED_MODULE_5__.getCreativeRendererSource)(bidResponse),
        rendererVersion: _creativeRenderers_js__WEBPACK_IMPORTED_MODULE_5__.PUC_MIN_VERSION
      }, adData));
    },
    resizeFn: getResizer(message.adId, bidResponse),
    options: message.options,
    adId: message.adId,
    bidResponse
  });
}
function handleNativeRequest(reply, data, adObject) {
  // handle this script from native template in an ad server
  // window.parent.postMessage(JSON.stringify({
  //   message: 'Prebid Native',
  //   adId: '%%PATTERN:hb_adid%%'
  // }), '*');
  if (adObject == null) {
    (0,_utils_js__WEBPACK_IMPORTED_MODULE_3__.logError)("Cannot find ad for x-origin event request: '".concat(data.adId, "'"));
    return;
  }
  switch (data.action) {
    case 'assetRequest':
      (0,_adRendering_js__WEBPACK_IMPORTED_MODULE_4__.deferRendering)(adObject, () => reply((0,_native_js__WEBPACK_IMPORTED_MODULE_1__.getAssetMessage)(data, adObject)));
      break;
    case 'allAssetRequest':
      (0,_adRendering_js__WEBPACK_IMPORTED_MODULE_4__.deferRendering)(adObject, () => reply((0,_native_js__WEBPACK_IMPORTED_MODULE_1__.getAllAssetsMessage)(data, adObject)));
      break;
    default:
      (0,_adRendering_js__WEBPACK_IMPORTED_MODULE_4__.handleNativeMessage)(data, adObject, {
        resizeFn: getResizer(data.adId, adObject)
      });
      (0,_adRendering_js__WEBPACK_IMPORTED_MODULE_4__.markWinner)(adObject);
  }
}
function handleEventRequest(reply, data, adObject) {
  if (adObject == null) {
    (0,_utils_js__WEBPACK_IMPORTED_MODULE_3__.logError)("Cannot find ad '".concat(data.adId, "' for x-origin event request"));
    return;
  }
  if (adObject.status !== _constants_js__WEBPACK_IMPORTED_MODULE_2__.BID_STATUS.RENDERED) {
    (0,_utils_js__WEBPACK_IMPORTED_MODULE_3__.logWarn)("Received x-origin event request without corresponding render request for ad '".concat(adObject.adId, "'"));
    return;
  }
  return (0,_adRendering_js__WEBPACK_IMPORTED_MODULE_4__.handleCreativeEvent)(data, adObject);
}
function getDimension(value) {
  return value ? value + 'px' : '100%';
}
function resizeAnchor(ins, width, height) {
  /**
   * Special handling for google anchor ads
   * For anchors, the element to resize is an <ins> element that is an ancestor of the creative iframe
   * On desktop this is sized to the creative dimensions;
   * on mobile one dimension is fixed to 100%.
   */
  return new _utils_promise_js__WEBPACK_IMPORTED_MODULE_6__.PbPromise((resolve, reject) => {
    let tryCounter = 10;
    // wait until GPT has set dimensions on the ins, otherwise our changes will be overridden
    const resizer = setInterval(() => {
      let done = false;
      Object.entries({
        width,
        height
      }).forEach(_ref => {
        let [dimension, newValue] = _ref;
        if (/\d+px/.test(ins.style[dimension])) {
          ins.style[dimension] = getDimension(newValue);
          done = true;
        }
      });
      if (done || tryCounter-- === 0) {
        clearInterval(resizer);
        done ? resolve() : reject(new Error('Could not resize anchor'));
      }
    }, 50);
  });
}
function resizeRemoteCreative(_ref2) {
  let {
    instl,
    adId,
    adUnitCode,
    width,
    height
  } = _ref2;
  // do not resize interstitials - the creative frame takes the full screen and sizing of the ad should
  // be handled within it.
  if (instl) return;
  function resize(element) {
    if (element) {
      const elementStyle = element.style;
      elementStyle.width = getDimension(width);
      elementStyle.height = getDimension(height);
    } else {
      (0,_utils_js__WEBPACK_IMPORTED_MODULE_3__.logError)("Unable to locate matching page element for adUnitCode ".concat(adUnitCode, ".  Can't resize it to ad's dimensions.  Please review setup."));
    }
  }

  // not select element that gets removed after dfp render
  const iframe = getElementByAdUnit('iframe:not([style*="display: none"])');
  resize(iframe);
  const anchorIns = iframe === null || iframe === void 0 ? void 0 : iframe.closest('ins[data-anchor-status]');
  anchorIns ? resizeAnchor(anchorIns, width, height) : resize(iframe === null || iframe === void 0 ? void 0 : iframe.parentElement);
  function getElementByAdUnit(elmType) {
    const id = getElementIdBasedOnAdServer(adId, adUnitCode);
    const parentDivEle = document.getElementById(id);
    return parentDivEle && parentDivEle.querySelector(elmType);
  }
  function getElementIdBasedOnAdServer(adId, adUnitCode) {
    if ((0,_utils_js__WEBPACK_IMPORTED_MODULE_3__.isGptPubadsDefined)()) {
      const dfpId = getDfpElementId(adId);
      if (dfpId) {
        return dfpId;
      }
    }
    if ((0,_utils_js__WEBPACK_IMPORTED_MODULE_3__.isApnGetTagDefined)()) {
      const apnId = getAstElementId(adUnitCode);
      if (apnId) {
        return apnId;
      }
    }
    return adUnitCode;
  }
  function getDfpElementId(adId) {
    const slot = window.googletag.pubads().getSlots().find(slot => {
      return slot.getTargetingKeys().find(key => {
        return slot.getTargeting(key).includes(adId);
      });
    });
    return slot ? slot.getSlotElementId() : null;
  }
  function getAstElementId(adUnitCode) {
    const astTag = window.apntag.getTag(adUnitCode);
    return astTag && astTag.targetId;
  }
}


/***/ }),

/***/ "./src/storageManager.js":
/*!*******************************!*\
  !*** ./src/storageManager.js ***!
  \*******************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   canSetCookie: () => (/* binding */ canSetCookie),
/* harmony export */   getCoreStorageManager: () => (/* binding */ getCoreStorageManager),
/* harmony export */   getStorageManager: () => (/* binding */ getStorageManager),
/* harmony export */   storageCallbacks: () => (/* binding */ storageCallbacks)
/* harmony export */ });
/* unused harmony exports STORAGE_TYPE_LOCALSTORAGE, STORAGE_TYPE_COOKIES, newStorageManager, deviceAccessRule, storageAllowedRule, resetData, discloseStorageUse */
/* harmony import */ var _babel_runtime_helpers_defineProperty__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @babel/runtime/helpers/defineProperty */ "../../node_modules/@babel/runtime/helpers/esm/defineProperty.js");
/* harmony import */ var _utils_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./utils.js */ "./src/utils.js");
/* harmony import */ var _bidderSettings_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./bidderSettings.js */ "./src/bidderSettings.js");
/* harmony import */ var _activities_modules_js__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ./activities/modules.js */ "./src/activities/modules.js");
/* harmony import */ var _activities_rules_js__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ./activities/rules.js */ "./src/activities/rules.js");
/* harmony import */ var _activities_params_js__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! ./activities/params.js */ "./src/activities/params.js");
/* harmony import */ var _activities_activities_js__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(/*! ./activities/activities.js */ "./src/activities/activities.js");
/* harmony import */ var _config_js__WEBPACK_IMPORTED_MODULE_7__ = __webpack_require__(/*! ./config.js */ "./src/config.js");
/* harmony import */ var _hook_js__WEBPACK_IMPORTED_MODULE_8__ = __webpack_require__(/*! ./hook.js */ "./src/hook.js");
/* harmony import */ var _adapterManager_js__WEBPACK_IMPORTED_MODULE_9__ = __webpack_require__(/*! ./adapterManager.js */ "./src/adapterManager.js");
/* harmony import */ var _activities_activityParams_js__WEBPACK_IMPORTED_MODULE_10__ = __webpack_require__(/*! ./activities/activityParams.js */ "./src/activities/activityParams.js");

function ownKeys(e, r) { var t = Object.keys(e); if (Object.getOwnPropertySymbols) { var o = Object.getOwnPropertySymbols(e); r && (o = o.filter(function (r) { return Object.getOwnPropertyDescriptor(e, r).enumerable; })), t.push.apply(t, o); } return t; }
function _objectSpread(e) { for (var r = 1; r < arguments.length; r++) { var t = null != arguments[r] ? arguments[r] : {}; r % 2 ? ownKeys(Object(t), !0).forEach(function (r) { (0,_babel_runtime_helpers_defineProperty__WEBPACK_IMPORTED_MODULE_0__["default"])(e, r, t[r]); }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(e, Object.getOwnPropertyDescriptors(t)) : ownKeys(Object(t)).forEach(function (r) { Object.defineProperty(e, r, Object.getOwnPropertyDescriptor(t, r)); }); } return e; }










const STORAGE_TYPE_LOCALSTORAGE = 'html5';
const STORAGE_TYPE_COOKIES = 'cookie';
let storageCallbacks = [];

/* eslint-disable no-restricted-properties */

/*
 *  Storage manager constructor. Consumers should prefer one of `getStorageManager` or `getCoreStorageManager`.
 */
function newStorageManager() {
  let {
    moduleName,
    moduleType,
    advertiseKeys = true
  } = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
  let {
    isAllowed = _activities_rules_js__WEBPACK_IMPORTED_MODULE_4__.isActivityAllowed
  } = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
  function isValid(cb, storageType, storageKey, isWrite) {
    let mod = moduleName;
    const curBidder = _config_js__WEBPACK_IMPORTED_MODULE_7__.config.getCurrentBidder();
    if (curBidder && moduleType === _activities_modules_js__WEBPACK_IMPORTED_MODULE_3__.MODULE_TYPE_BIDDER && _adapterManager_js__WEBPACK_IMPORTED_MODULE_9__["default"].aliasRegistry[curBidder] === moduleName) {
      mod = curBidder;
    }
    const params = {
      [_activities_params_js__WEBPACK_IMPORTED_MODULE_5__.ACTIVITY_PARAM_STORAGE_TYPE]: storageType,
      [_activities_params_js__WEBPACK_IMPORTED_MODULE_5__.ACTIVITY_PARAM_STORAGE_WRITE]: isWrite
    };
    if (advertiseKeys && storageKey != null) {
      params[_activities_params_js__WEBPACK_IMPORTED_MODULE_5__.ACTIVITY_PARAM_STORAGE_KEY] = storageKey;
    }
    const result = {
      valid: isAllowed(_activities_activities_js__WEBPACK_IMPORTED_MODULE_6__.ACTIVITY_ACCESS_DEVICE, (0,_activities_activityParams_js__WEBPACK_IMPORTED_MODULE_10__.activityParams)(moduleType, mod, params))
    };
    return cb(result);
  }
  function schedule(operation, storageType, storageKey, isWrite, done) {
    if (done && typeof done === 'function') {
      storageCallbacks.push(function () {
        let result = isValid(operation, storageType, storageKey, isWrite);
        done(result);
      });
    } else {
      return isValid(operation, storageType, storageKey, isWrite);
    }
  }

  /**
   * @param {string} key
   * @param {string} value
   * @param {string} [expires='']
   * @param {string} [sameSite='/']
   * @param {string} [domain] domain (e.g., 'example.com' or 'subdomain.example.com').
   * If not specified, defaults to the host portion of the current document location.
   * If a domain is specified, subdomains are always included.
   * Domain must match the domain of the JavaScript origin. Setting cookies to foreign domains will be silently ignored.
   * @param {function} [done]
   */
  const setCookie = function (key, value, expires, sameSite, domain, done) {
    let cb = function (result) {
      if (result && result.valid) {
        const domainPortion = domain && domain !== '' ? " ;domain=".concat(encodeURIComponent(domain)) : '';
        const expiresPortion = expires && expires !== '' ? " ;expires=".concat(expires) : '';
        const isNone = (sameSite === null || sameSite === void 0 ? void 0 : sameSite.toLowerCase()) === 'none';
        const secure = isNone ? '; Secure' : '';
        document.cookie = "".concat(key, "=").concat(encodeURIComponent(value)).concat(expiresPortion, "; path=/").concat(domainPortion).concat(sameSite ? "; SameSite=".concat(sameSite) : '').concat(secure);
      }
    };
    return schedule(cb, STORAGE_TYPE_COOKIES, key, true, done);
  };

  /**
   * @param {string} name
   * @param {function} [done]
   * @returns {(string|null)}
   */
  const getCookie = function (name, done) {
    let cb = function (result) {
      if (result && result.valid) {
        let m = window.document.cookie.match('(^|;)\\s*' + name + '\\s*=\\s*([^;]*)\\s*(;|$)');
        return m ? decodeURIComponent(m[2]) : null;
      }
      return null;
    };
    return schedule(cb, STORAGE_TYPE_COOKIES, name, false, done);
  };

  /**
   * @param {function} [done]
   * @returns {boolean}
   */
  const cookiesAreEnabled = function (done) {
    let cb = function (result) {
      if (result && result.valid) {
        return (0,_utils_js__WEBPACK_IMPORTED_MODULE_1__.checkCookieSupport)() && canSetCookie();
      }
      return false;
    };
    return schedule(cb, STORAGE_TYPE_COOKIES, null, false, done);
  };
  function storageMethods(name) {
    const capName = name.charAt(0).toUpperCase() + name.substring(1);
    const backend = () => window[name];
    const hasStorage = function (done) {
      let cb = function (result) {
        if (result && result.valid) {
          try {
            return !!backend();
          } catch (e) {
            (0,_utils_js__WEBPACK_IMPORTED_MODULE_1__.logError)("".concat(name, " api disabled"));
          }
        }
        return false;
      };
      return schedule(cb, STORAGE_TYPE_LOCALSTORAGE, null, false, done);
    };
    return {
      ["has".concat(capName)]: hasStorage,
      ["".concat(name, "IsEnabled")](done) {
        let cb = function (result) {
          if (result && result.valid) {
            try {
              backend().setItem('prebid.cookieTest', '1');
              return backend().getItem('prebid.cookieTest') === '1';
            } catch (error) {} finally {
              try {
                backend().removeItem('prebid.cookieTest');
              } catch (error) {}
            }
          }
          return false;
        };
        return schedule(cb, STORAGE_TYPE_LOCALSTORAGE, null, false, done);
      },
      ["setDataIn".concat(capName)](key, value, done) {
        let cb = function (result) {
          if (result && result.valid && hasStorage()) {
            backend().setItem(key, value);
          }
        };
        return schedule(cb, STORAGE_TYPE_LOCALSTORAGE, key, true, done);
      },
      ["getDataFrom".concat(capName)](key, done) {
        let cb = function (result) {
          if (result && result.valid && hasStorage()) {
            return backend().getItem(key);
          }
          return null;
        };
        return schedule(cb, STORAGE_TYPE_LOCALSTORAGE, key, false, done);
      },
      ["removeDataFrom".concat(capName)](key, done) {
        let cb = function (result) {
          if (result && result.valid && hasStorage()) {
            backend().removeItem(key);
          }
        };
        return schedule(cb, STORAGE_TYPE_LOCALSTORAGE, key, true, done);
      }
    };
  }

  /**
   * Returns all cookie values from the jar whose names contain the `keyLike`
   * Needs to exist in `utils.js` as it follows the StorageHandler interface defined in live-connect-js. If that module were to be removed, this function can go as well.
   * @param {string} keyLike
   * @param {function} [done]
   * @returns {string[]}
   */
  const findSimilarCookies = function (keyLike, done) {
    let cb = function (result) {
      if (result && result.valid) {
        const all = [];
        if ((0,_utils_js__WEBPACK_IMPORTED_MODULE_1__.hasDeviceAccess)()) {
          const cookies = document.cookie.split(';');
          while (cookies.length) {
            const cookie = cookies.pop();
            let separatorIndex = cookie.indexOf('=');
            separatorIndex = separatorIndex < 0 ? cookie.length : separatorIndex;
            const cookieName = decodeURIComponent(cookie.slice(0, separatorIndex).replace(/^\s+/, ''));
            if (cookieName.indexOf(keyLike) >= 0) {
              all.push(decodeURIComponent(cookie.slice(separatorIndex + 1)));
            }
          }
        }
        return all;
      }
    };
    return schedule(cb, STORAGE_TYPE_COOKIES, keyLike, false, done);
  };
  return _objectSpread(_objectSpread(_objectSpread({
    setCookie,
    getCookie,
    cookiesAreEnabled
  }, storageMethods('localStorage')), storageMethods('sessionStorage')), {}, {
    findSimilarCookies
  });
}

/**
 * Get a storage manager for a particular module.
 *
 * Either bidderCode or a combination of moduleType + moduleName must be provided. The former is a shorthand
 *  for `{moduleType: 'bidder', moduleName: bidderCode}`.
 *
 */
function getStorageManager() {
  let {
    moduleType,
    moduleName,
    bidderCode
  } = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
  function err() {
    throw new Error("Invalid invocation for getStorageManager: must set either bidderCode, or moduleType + moduleName");
  }
  if (bidderCode) {
    if (moduleType && moduleType !== _activities_modules_js__WEBPACK_IMPORTED_MODULE_3__.MODULE_TYPE_BIDDER || moduleName) err();
    moduleType = _activities_modules_js__WEBPACK_IMPORTED_MODULE_3__.MODULE_TYPE_BIDDER;
    moduleName = bidderCode;
  } else if (!moduleName || !moduleType) {
    err();
  }
  return newStorageManager({
    moduleType,
    moduleName
  });
}

/**
 * Get a storage manager for "core" (vendorless, or first-party) modules. Shorthand for `getStorageManager({moduleName, moduleType: 'core'})`.
 *
 * @param {string} moduleName Module name
 */
function getCoreStorageManager(moduleName) {
  return newStorageManager({
    moduleName: moduleName,
    moduleType: _activities_modules_js__WEBPACK_IMPORTED_MODULE_3__.MODULE_TYPE_PREBID
  });
}
const canSetCookie = (() => {
  const testStorageMgr = getCoreStorageManager('storage');
  return (0,_utils_js__WEBPACK_IMPORTED_MODULE_1__.memoize)(function (domain) {
    let storageMgr = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : testStorageMgr;
    const expirationDate = new Date((0,_utils_js__WEBPACK_IMPORTED_MODULE_1__.timestamp)() + 10 * 1000).toUTCString();
    const cookieName = "_rdc".concat(Date.now());
    const cookieValue = 'writeable';
    storageMgr.setCookie(cookieName, cookieValue, expirationDate, 'Lax', domain);
    const value = storageMgr.getCookie(cookieName);
    if (value === cookieValue) {
      storageMgr.setCookie(cookieName, '', 'Thu, 01 Jan 1970 00:00:01 GMT', undefined, domain);
      return true;
    } else {
      return false;
    }
  });
})();

/**
 * Block all access to storage when deviceAccess = false
 */
function deviceAccessRule() {
  if (!(0,_utils_js__WEBPACK_IMPORTED_MODULE_1__.hasDeviceAccess)()) {
    return {
      allow: false
    };
  }
}
(0,_activities_rules_js__WEBPACK_IMPORTED_MODULE_4__.registerActivityControl)(_activities_activities_js__WEBPACK_IMPORTED_MODULE_6__.ACTIVITY_ACCESS_DEVICE, 'deviceAccess config', deviceAccessRule);

/**
 * Block all access to request credentials when deviceAccess = false
 */
(0,_activities_rules_js__WEBPACK_IMPORTED_MODULE_4__.registerActivityControl)(_activities_activities_js__WEBPACK_IMPORTED_MODULE_6__.ACTIVITY_ACCESS_REQUEST_CREDENTIALS, 'deviceAccess config', deviceAccessRule);

/**
 * By default, deny bidders accessDevice unless they enable it through bidderSettings
 *
 * // TODO: for backwards compat, the check is done on the adapter - rather than bidder's code.
 */
function storageAllowedRule(params) {
  let bs = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : _bidderSettings_js__WEBPACK_IMPORTED_MODULE_2__.bidderSettings;
  if (params[_activities_params_js__WEBPACK_IMPORTED_MODULE_5__.ACTIVITY_PARAM_COMPONENT_TYPE] !== _activities_modules_js__WEBPACK_IMPORTED_MODULE_3__.MODULE_TYPE_BIDDER) return;
  let allow = bs.get(params[_activities_params_js__WEBPACK_IMPORTED_MODULE_5__.ACTIVITY_PARAM_ADAPTER_CODE], 'storageAllowed');
  if (!allow || allow === true) {
    allow = !!allow;
  } else {
    const storageType = params[_activities_params_js__WEBPACK_IMPORTED_MODULE_5__.ACTIVITY_PARAM_STORAGE_TYPE];
    allow = Array.isArray(allow) ? allow.some(e => e === storageType) : allow === storageType;
  }
  if (!allow) {
    return {
      allow
    };
  }
}
(0,_activities_rules_js__WEBPACK_IMPORTED_MODULE_4__.registerActivityControl)(_activities_activities_js__WEBPACK_IMPORTED_MODULE_6__.ACTIVITY_ACCESS_DEVICE, 'bidderSettings.*.storageAllowed', storageAllowedRule);
function resetData() {
  storageCallbacks = [];
}

/**
 * First party storage use disclosure. Follows the same format as
 * https://github.com/InteractiveAdvertisingBureau/GDPR-Transparency-and-Consent-Framework/blob/master/TCFv2/Vendor%20Device%20Storage%20%26%20Operational%20Disclosures.md
 * except that `domain` is omitted.
 */

/**
 * Disclose first party storage use.
 */
const discloseStorageUse = (0,_hook_js__WEBPACK_IMPORTED_MODULE_8__.hook)('sync', (moduleName, disclosure) => {});


/***/ }),

/***/ "./src/targeting.js":
/*!**************************!*\
  !*** ./src/targeting.js ***!
  \**************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   filters: () => (/* binding */ filters),
/* harmony export */   isBidUsable: () => (/* binding */ isBidUsable),
/* harmony export */   targeting: () => (/* binding */ targeting)
/* harmony export */ });
/* unused harmony exports TARGETING_KEYS_ARR, getHighestCpmBidsFromBidPool, sortByDealAndPriceBucketOrCpm, getGPTSlotsForAdUnits, getAdUnitBidLimitMap, newTargeting */
/* harmony import */ var _auctionManager_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./auctionManager.js */ "./src/auctionManager.js");
/* harmony import */ var _bidTTL_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./bidTTL.js */ "./src/bidTTL.js");
/* harmony import */ var _bidderSettings_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./bidderSettings.js */ "./src/bidderSettings.js");
/* harmony import */ var _config_js__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ./config.js */ "./src/config.js");
/* harmony import */ var _constants_js__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ./constants.js */ "./src/constants.js");
/* harmony import */ var _events_js__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! ./events.js */ "./src/events.js");
/* harmony import */ var _hook_js__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(/*! ./hook.js */ "./src/hook.js");
/* harmony import */ var _mediaTypes_js__WEBPACK_IMPORTED_MODULE_7__ = __webpack_require__(/*! ./mediaTypes.js */ "./src/mediaTypes.js");
/* harmony import */ var _utils_js__WEBPACK_IMPORTED_MODULE_8__ = __webpack_require__(/*! ./utils.js */ "./src/utils.js");
/* harmony import */ var _utils_js__WEBPACK_IMPORTED_MODULE_9__ = __webpack_require__(/*! ./utils.js */ "./src/utils/objects.js");
/* harmony import */ var _utils_js__WEBPACK_IMPORTED_MODULE_10__ = __webpack_require__(/*! ./utils.js */ "../../node_modules/dlv/index.js");
/* harmony import */ var _utils_reducers_js__WEBPACK_IMPORTED_MODULE_11__ = __webpack_require__(/*! ./utils/reducers.js */ "./src/utils/reducers.js");
/* harmony import */ var _targeting_lock_js__WEBPACK_IMPORTED_MODULE_12__ = __webpack_require__(/*! ./targeting/lock.js */ "./src/targeting/lock.js");











var pbTargetingKeys = [];
const MAX_DFP_KEYLENGTH = 20;
const CFG_ALLOW_TARGETING_KEYS = "targetingControls.allowTargetingKeys";
const CFG_ADD_TARGETING_KEYS = "targetingControls.addTargetingKeys";
const TARGETING_KEY_CONFIGURATION_ERROR_MSG = "Only one of \"".concat(CFG_ALLOW_TARGETING_KEYS, "\" or \"").concat(CFG_ADD_TARGETING_KEYS, "\" can be set");
const TARGETING_KEYS_ARR = Object.keys(_constants_js__WEBPACK_IMPORTED_MODULE_4__.TARGETING_KEYS).map(key => _constants_js__WEBPACK_IMPORTED_MODULE_4__.TARGETING_KEYS[key]);

// return unexpired bids
const isBidNotExpired = bid => bid.responseTimestamp + (0,_bidTTL_js__WEBPACK_IMPORTED_MODULE_1__.getBufferedTTL)(bid) * 1000 > (0,_utils_js__WEBPACK_IMPORTED_MODULE_8__.timestamp)();

// return bids whose status is not set. Winning bids can only have a status of `rendered`.
const isUnusedBid = bid => bid && (bid.status && ![_constants_js__WEBPACK_IMPORTED_MODULE_4__.BID_STATUS.RENDERED].includes(bid.status) || !bid.status);
const isBidNotLocked = bid => !_targeting_lock_js__WEBPACK_IMPORTED_MODULE_12__.lock.isLocked(bid.adserverTargeting);
const filters = {
  isBidNotExpired,
  isUnusedBid,
  isBidNotLocked
};
function isBidUsable(bid) {
  return !Object.values(filters).some(predicate => !predicate(bid));
}

// If two bids are found for same adUnitCode, we will use the highest one to take part in auction
// This can happen in case of concurrent auctions
// If adUnitBidLimit is set above 0 return top N number of bids
const getHighestCpmBidsFromBidPool = (0,_hook_js__WEBPACK_IMPORTED_MODULE_6__.hook)('sync', function (bidsReceived, winReducer) {
  let adUnitBidLimit = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 0;
  let hasModified = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : false;
  let winSorter = arguments.length > 4 && arguments[4] !== undefined ? arguments[4] : _utils_js__WEBPACK_IMPORTED_MODULE_8__.sortByHighestCpm;
  if (!hasModified) {
    const bids = [];
    const dealPrioritization = _config_js__WEBPACK_IMPORTED_MODULE_3__.config.getConfig('sendBidsControl.dealPrioritization');
    // bucket by adUnitcode
    const buckets = (0,_utils_js__WEBPACK_IMPORTED_MODULE_8__.groupBy)(bidsReceived, 'adUnitCode');
    // filter top bid for each bucket by bidder
    Object.keys(buckets).forEach(bucketKey => {
      let bucketBids = [];
      const bidsByBidder = (0,_utils_js__WEBPACK_IMPORTED_MODULE_8__.groupBy)(buckets[bucketKey], 'bidderCode');
      Object.keys(bidsByBidder).forEach(key => {
        bucketBids.push(bidsByBidder[key].reduce(winReducer));
      });
      // if adUnitBidLimit is set, pass top N number bids
      const bidLimit = typeof adUnitBidLimit === 'object' ? adUnitBidLimit[bucketKey] : adUnitBidLimit;
      if (bidLimit) {
        bucketBids = dealPrioritization ? bucketBids.sort(sortByDealAndPriceBucketOrCpm(true)) : bucketBids.sort((a, b) => b.cpm - a.cpm);
        bids.push(...bucketBids.slice(0, bidLimit));
      } else {
        bucketBids = bucketBids.sort(winSorter);
        bids.push(...bucketBids);
      }
    });
    return bids;
  }
  return bidsReceived;
});

/**
 * A descending sort function that will sort the list of objects based on the following two dimensions:
 *  - bids with a deal are sorted before bids w/o a deal
 *  - then sort bids in each grouping based on the hb_pb value
 * eg: the following list of bids would be sorted like:
 *  [{
 *    "hb_adid": "vwx",
 *    "hb_pb": "28",
 *    "hb_deal": "7747"
 *  }, {
 *    "hb_adid": "jkl",
 *    "hb_pb": "10",
 *    "hb_deal": "9234"
 *  }, {
 *    "hb_adid": "stu",
 *    "hb_pb": "50"
 *  }, {
 *    "hb_adid": "def",
 *    "hb_pb": "2"
 *  }]
 */
function sortByDealAndPriceBucketOrCpm() {
  let useCpm = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : false;
  return function (a, b) {
    if (a.adserverTargeting.hb_deal !== undefined && b.adserverTargeting.hb_deal === undefined) {
      return -1;
    }
    if (a.adserverTargeting.hb_deal === undefined && b.adserverTargeting.hb_deal !== undefined) {
      return 1;
    }

    // assuming both values either have a deal or don't have a deal - sort by the hb_pb param
    if (useCpm) {
      return b.cpm - a.cpm;
    }
    return b.adserverTargeting.hb_pb - a.adserverTargeting.hb_pb;
  };
}

/**
 * Return a map where each code in `adUnitCodes` maps to a list of GPT slots that match it.
 *
 * @param adUnitCodes
 * @param customSlotMatching
 * @param getSlots
 */
function getGPTSlotsForAdUnits(adUnitCodes, customSlotMatching) {
  let getSlots = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : () => window.googletag.pubads().getSlots();
  return getSlots().reduce((auToSlots, slot) => {
    const customMatch = (0,_utils_js__WEBPACK_IMPORTED_MODULE_9__.isFn)(customSlotMatching) && customSlotMatching(slot);
    Object.keys(auToSlots).filter((0,_utils_js__WEBPACK_IMPORTED_MODULE_9__.isFn)(customMatch) ? customMatch : (0,_utils_js__WEBPACK_IMPORTED_MODULE_8__.isAdUnitCodeMatchingSlot)(slot)).forEach(au => auToSlots[au].push(slot));
    return auToSlots;
  }, Object.fromEntries(adUnitCodes.map(au => [au, []])));
}
/* *
  * Returns a map of adUnitCodes to their bid limits. If sendAllBids is disabled, all adUnits will have a bid limit of 0.
  * If sendAllBids is enabled, the bid limit for each adUnit will be determined by the following precedence:
  * 1. The bidLimit property of the adUnit object
  * 2. The bidLimit parameter passed to this function
  * 3. The global sendBidsControl.bidLimit config property
  *
  * @param adUnitCodes
  * @param bidLimit
  */
function getAdUnitBidLimitMap(adUnitCodes, bidLimit) {
  if (!_config_js__WEBPACK_IMPORTED_MODULE_3__.config.getConfig('enableSendAllBids')) return 0;
  const bidLimitConfigValue = _config_js__WEBPACK_IMPORTED_MODULE_3__.config.getConfig('sendBidsControl.bidLimit');
  const adUnitCodesSet = new Set(adUnitCodes);
  const result = {};
  for (const au of _auctionManager_js__WEBPACK_IMPORTED_MODULE_0__.auctionManager.getAdUnits()) {
    if (adUnitCodesSet.has(au.code)) {
      result[au.code] = (au === null || au === void 0 ? void 0 : au.bidLimit) || bidLimit || bidLimitConfigValue;
    }
  }
  return result;
}
const DEFAULT_HB_VER = '1.17.2';
function newTargeting(auctionManager) {
  const latestAuctionForAdUnit = {};
  const targeting = {
    setLatestAuctionForAdUnit(adUnitCode, auctionId) {
      latestAuctionForAdUnit[adUnitCode] = auctionId;
    },
    resetPresetTargetingAST(adUnitCode) {
      const adUnitCodes = getAdUnitCodes(adUnitCode);
      adUnitCodes.forEach(function (unit) {
        const astTag = window.apntag.getTag(unit);
        if (astTag && astTag.keywords) {
          const currentKeywords = Object.keys(astTag.keywords);
          const newKeywords = {};
          currentKeywords.forEach(key => {
            if (!pbTargetingKeys.includes(key.toLowerCase())) {
              newKeywords[key] = astTag.keywords[key];
            }
          });
          window.apntag.modifyTag(unit, {
            keywords: newKeywords
          });
        }
      });
    },
    /**
     * Returns all ad server targeting for all ad units.
     * @param adUnitCode
     * @param bidLimit
     * @param bidsReceived - The received bids, defaulting to the result of getBidsReceived().
     * @param [winReducer = getHighestCpm] - reducer method
     * @param [winSorter = sortByHighestCpm] - sorter method
     * @return targeting
     */
    getAllTargeting(adUnitCode, bidLimit, bidsReceived) {
      let winReducer = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : _utils_reducers_js__WEBPACK_IMPORTED_MODULE_11__.getHighestCpm;
      let winSorter = arguments.length > 4 && arguments[4] !== undefined ? arguments[4] : _utils_js__WEBPACK_IMPORTED_MODULE_8__.sortByHighestCpm;
      bidsReceived || (bidsReceived = getBidsReceived(winReducer, winSorter));
      const adUnitCodes = getAdUnitCodes(adUnitCode);
      const adUnitBidLimit = getAdUnitBidLimitMap(adUnitCodes, bidLimit);
      const {
        customKeysByUnit,
        filteredBids
      } = getfilteredBidsAndCustomKeys(adUnitCodes, bidsReceived);
      const bidsSorted = getHighestCpmBidsFromBidPool(filteredBids, winReducer, adUnitBidLimit, undefined, winSorter);
      let targeting = getTargetingLevels(bidsSorted, customKeysByUnit, adUnitCodes);
      const defaultKeys = Object.keys(Object.assign({}, _constants_js__WEBPACK_IMPORTED_MODULE_4__.DEFAULT_TARGETING_KEYS));
      let allowedKeys = _config_js__WEBPACK_IMPORTED_MODULE_3__.config.getConfig(CFG_ALLOW_TARGETING_KEYS);
      const addedKeys = _config_js__WEBPACK_IMPORTED_MODULE_3__.config.getConfig(CFG_ADD_TARGETING_KEYS);
      if (addedKeys != null && allowedKeys != null) {
        throw new Error(TARGETING_KEY_CONFIGURATION_ERROR_MSG);
      } else if (addedKeys != null) {
        allowedKeys = defaultKeys.concat(addedKeys);
      } else {
        allowedKeys = allowedKeys || defaultKeys;
      }
      if (Array.isArray(allowedKeys) && allowedKeys.length > 0) {
        targeting = getAllowedTargetingKeyValues(targeting, allowedKeys);
      }
      let flatTargeting = flattenTargeting(targeting);
      const auctionKeysThreshold = _config_js__WEBPACK_IMPORTED_MODULE_3__.config.getConfig('targetingControls.auctionKeyMaxChars');
      if (auctionKeysThreshold) {
        (0,_utils_js__WEBPACK_IMPORTED_MODULE_8__.logInfo)("Detected 'targetingControls.auctionKeyMaxChars' was active for this auction; set with a limit of ".concat(auctionKeysThreshold, " characters.  Running checks on auction keys..."));
        flatTargeting = filterTargetingKeys(flatTargeting, auctionKeysThreshold);
      }
      adUnitCodes.forEach(code => {
        // make sure at least there is a entry per adUnit code in the targetingSet so receivers of SET_TARGETING call's can know what ad units are being invoked
        if (!flatTargeting[code]) {
          flatTargeting[code] = {};
        }
        // do not send just "hb_ver"
        if (Object.keys(flatTargeting[code]).length === 1 && flatTargeting[code][_constants_js__WEBPACK_IMPORTED_MODULE_4__.TARGETING_KEYS.VERSION] != null) {
          delete flatTargeting[code][_constants_js__WEBPACK_IMPORTED_MODULE_4__.TARGETING_KEYS.VERSION];
        }
      });
      return flatTargeting;
    },
    setTargetingForGPT: (0,_hook_js__WEBPACK_IMPORTED_MODULE_6__.hook)('sync', function (adUnit, customSlotMatching) {
      // get our ad unit codes
      const targetingSet = targeting.getAllTargeting(adUnit);
      const resetMap = Object.fromEntries(pbTargetingKeys.map(key => [key, null]));
      Object.entries(getGPTSlotsForAdUnits(Object.keys(targetingSet), customSlotMatching)).forEach(_ref => {
        let [targetId, slots] = _ref;
        slots.forEach(slot => {
          // now set new targeting keys
          Object.keys(targetingSet[targetId]).forEach(key => {
            let value = targetingSet[targetId][key];
            if (typeof value === 'string' && value.indexOf(',') !== -1) {
              // due to the check the array will be formed only if string has ',' else plain string will be assigned as value
              value = value.split(',');
            }
            targetingSet[targetId][key] = value;
          });
          (0,_utils_js__WEBPACK_IMPORTED_MODULE_8__.logMessage)("Attempting to set targeting-map for slot: ".concat(slot.getSlotElementId(), " with targeting-map:"), targetingSet[targetId]);
          slot.updateTargetingFromMap(Object.assign({}, resetMap, targetingSet[targetId]));
          _targeting_lock_js__WEBPACK_IMPORTED_MODULE_12__.lock.lock(targetingSet[targetId]);
        });
      });
      Object.keys(targetingSet).forEach(adUnitCode => {
        Object.keys(targetingSet[adUnitCode]).forEach(targetingKey => {
          if (targetingKey === 'hb_adid') {
            auctionManager.setStatusForBids(targetingSet[adUnitCode][targetingKey], _constants_js__WEBPACK_IMPORTED_MODULE_4__.BID_STATUS.BID_TARGETING_SET);
          }
        });
      });
      targeting.targetingDone(targetingSet);

      // emit event
      _events_js__WEBPACK_IMPORTED_MODULE_5__.emit(_constants_js__WEBPACK_IMPORTED_MODULE_4__.EVENTS.SET_TARGETING, targetingSet);
    }, 'setTargetingForGPT'),
    targetingDone: (0,_hook_js__WEBPACK_IMPORTED_MODULE_6__.hook)('sync', function (targetingSet) {
      return targetingSet;
    }, 'targetingDone'),
    /**
     * Returns top bids for a given adUnit or set of adUnits.
     * @param  adUnitCode adUnitCode or array of adUnitCodes
     * @param  bids - The received bids, defaulting to the result of getBidsReceived().
     * @param  [winReducer = getHighestCpm] - reducer method
     * @param  [winSorter = sortByHighestCpm] - sorter method
     * @return An array of winning bids.
     */
    getWinningBids(adUnitCode, bids) {
      let winReducer = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : _utils_reducers_js__WEBPACK_IMPORTED_MODULE_11__.getHighestCpm;
      let winSorter = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : _utils_js__WEBPACK_IMPORTED_MODULE_8__.sortByHighestCpm;
      const bidsReceived = bids || getBidsReceived(winReducer, winSorter);
      const adUnitCodes = getAdUnitCodes(adUnitCode);
      return bidsReceived.filter(bid => adUnitCodes.includes(bid.adUnitCode)).filter(bid => _bidderSettings_js__WEBPACK_IMPORTED_MODULE_2__.bidderSettings.get(bid.bidderCode, 'allowZeroCpmBids') === true ? bid.cpm >= 0 : bid.cpm > 0).map(bid => bid.adUnitCode).filter(_utils_js__WEBPACK_IMPORTED_MODULE_8__.uniques).map(adUnitCode => bidsReceived.filter(bid => bid.adUnitCode === adUnitCode ? bid : null).reduce(_utils_reducers_js__WEBPACK_IMPORTED_MODULE_11__.getHighestCpm));
    },
    /**
     * @param  adUnitCodes adUnitCode or array of adUnitCodes
     * Sets targeting for AST
     */
    setTargetingForAst(adUnitCodes) {
      const astTargeting = targeting.getAllTargeting(adUnitCodes);
      try {
        targeting.resetPresetTargetingAST(adUnitCodes);
      } catch (e) {
        (0,_utils_js__WEBPACK_IMPORTED_MODULE_8__.logError)('unable to reset targeting for AST' + e);
      }
      Object.keys(astTargeting).forEach(targetId => {
        _targeting_lock_js__WEBPACK_IMPORTED_MODULE_12__.lock.lock(astTargeting[targetId]);
        Object.keys(astTargeting[targetId]).forEach(key => {
          (0,_utils_js__WEBPACK_IMPORTED_MODULE_8__.logMessage)("Attempting to set targeting for targetId: ".concat(targetId, " key: ").concat(key, " value: ").concat(astTargeting[targetId][key]));
          // setKeywords supports string and array as value
          if ((0,_utils_js__WEBPACK_IMPORTED_MODULE_9__.isStr)(astTargeting[targetId][key]) || (0,_utils_js__WEBPACK_IMPORTED_MODULE_9__.isArray)(astTargeting[targetId][key])) {
            const keywordsObj = {};
            const regex = /pt[0-9]/;
            if (key.search(regex) < 0) {
              keywordsObj[key.toUpperCase()] = astTargeting[targetId][key];
            } else {
              // pt${n} keys should not be uppercased
              keywordsObj[key] = astTargeting[targetId][key];
            }
            window.apntag.setKeywords(targetId, keywordsObj, {
              overrideKeyValue: true
            });
          }
        });
      });
    },
    isApntagDefined() {
      if (window.apntag && (0,_utils_js__WEBPACK_IMPORTED_MODULE_9__.isFn)(window.apntag.setKeywords)) {
        return true;
      }
    }
  };
  function addBidToTargeting(bids) {
    let enableSendAllBids = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : false;
    let deals = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : false;
    const standardKeys = TARGETING_KEYS_ARR.slice();
    const allowSendAllBidsTargetingKeys = _config_js__WEBPACK_IMPORTED_MODULE_3__.config.getConfig('targetingControls.allowSendAllBidsTargetingKeys');
    const allowedSendAllBidTargeting = allowSendAllBidsTargetingKeys ? allowSendAllBidsTargetingKeys.map(key => _constants_js__WEBPACK_IMPORTED_MODULE_4__.TARGETING_KEYS[key]) : standardKeys;
    return bids.reduce((result, bid) => {
      if (enableSendAllBids || deals && bid.dealId) {
        const targetingValue = getTargetingMap(bid, standardKeys.filter(key => typeof bid.adserverTargeting[key] !== 'undefined' && (deals || allowedSendAllBidTargeting.indexOf(key) !== -1)));
        if (targetingValue) {
          result.push({
            [bid.adUnitCode]: targetingValue
          });
        }
      }
      return result;
    }, []);
  }
  function getBidderTargeting(bids) {
    const alwaysIncludeDeals = _config_js__WEBPACK_IMPORTED_MODULE_3__.config.getConfig('targetingControls.alwaysIncludeDeals');
    const enableSendAllBids = _config_js__WEBPACK_IMPORTED_MODULE_3__.config.getConfig('enableSendAllBids');
    return addBidToTargeting(bids, enableSendAllBids, alwaysIncludeDeals);
  }

  /**
   * Returns filtered ad server targeting for custom and allowed keys.
   * @param targeting
   * @param allowedKeys
   * @return filtered targeting
   */
  function getAllowedTargetingKeyValues(targeting, allowedKeys) {
    const defaultKeyring = Object.assign({}, _constants_js__WEBPACK_IMPORTED_MODULE_4__.TARGETING_KEYS);
    const defaultKeys = Object.keys(_constants_js__WEBPACK_IMPORTED_MODULE_4__.TARGETING_KEYS);
    const keyDispositions = {};
    (0,_utils_js__WEBPACK_IMPORTED_MODULE_8__.logInfo)("allowTargetingKeys - allowed keys [ ".concat(allowedKeys.map(k => defaultKeyring[k]).join(', '), " ]"));
    targeting.forEach(adUnit => {
      const adUnitCode = Object.keys(adUnit)[0];
      const keyring = adUnit[adUnitCode];
      const keys = keyring.filter(kvPair => {
        const key = Object.keys(kvPair)[0];
        // check if key is in default keys, if not, it's custom, we won't remove it.
        const isCustom = defaultKeys.filter(defaultKey => key.indexOf(defaultKeyring[defaultKey]) === 0).length === 0;
        // check if key explicitly allowed, if not, we'll remove it.
        const found = isCustom || allowedKeys.find(allowedKey => {
          const allowedKeyName = defaultKeyring[allowedKey];
          // we're looking to see if the key exactly starts with one of our default keys.
          // (which hopefully means it's not custom)
          const found = key.indexOf(allowedKeyName) === 0;
          return found;
        });
        keyDispositions[key] = !found;
        return found;
      });
      adUnit[adUnitCode] = keys;
    });
    const removedKeys = Object.keys(keyDispositions).filter(d => keyDispositions[d]);
    (0,_utils_js__WEBPACK_IMPORTED_MODULE_8__.logInfo)("allowTargetingKeys - removed keys [ ".concat(removedKeys.join(', '), " ]"));
    // remove any empty targeting objects, as they're unnecessary.
    const filteredTargeting = targeting.filter(adUnit => {
      const adUnitCode = Object.keys(adUnit)[0];
      const keyring = adUnit[adUnitCode];
      return keyring.length > 0;
    });
    return filteredTargeting;
  }
  function updatePBTargetingKeys(adUnitCode) {
    Object.keys(adUnitCode).forEach(key => {
      adUnitCode[key].forEach(targetKey => {
        const targetKeys = Object.keys(targetKey);
        if (pbTargetingKeys.indexOf(targetKeys[0]) === -1) {
          pbTargetingKeys = targetKeys.concat(pbTargetingKeys);
        }
      });
    });
  }
  function getTargetingLevels(bidsSorted, customKeysByUnit, adUnitCodes) {
    const useAllBidsCustomTargeting = _config_js__WEBPACK_IMPORTED_MODULE_3__.config.getConfig('targetingControls.allBidsCustomTargeting') === true;
    const targeting = getWinningBidTargeting(bidsSorted, adUnitCodes).concat(getBidderTargeting(bidsSorted)).concat(getAdUnitTargeting(adUnitCodes)).concat(getVersionTargeting(adUnitCodes));
    if (useAllBidsCustomTargeting) {
      targeting.push(...getCustomBidTargeting(bidsSorted, customKeysByUnit));
    }
    targeting.forEach(adUnitCode => {
      updatePBTargetingKeys(adUnitCode);
    });
    return targeting;
  }
  function getfilteredBidsAndCustomKeys(adUnitCodes, bidsReceived) {
    const filteredBids = [];
    const customKeysByUnit = {};
    const alwaysIncludeDeals = _config_js__WEBPACK_IMPORTED_MODULE_3__.config.getConfig('targetingControls.alwaysIncludeDeals');
    bidsReceived.forEach(bid => {
      const adUnitIsEligible = adUnitCodes.includes(bid.adUnitCode);
      const cpmAllowed = _bidderSettings_js__WEBPACK_IMPORTED_MODULE_2__.bidderSettings.get(bid.bidderCode, 'allowZeroCpmBids') === true ? bid.cpm >= 0 : bid.cpm > 0;
      const isPreferredDeal = alwaysIncludeDeals && bid.dealId;
      if (adUnitIsEligible && (isPreferredDeal || cpmAllowed)) {
        filteredBids.push(bid);
        Object.keys(bid.adserverTargeting).filter(getCustomKeys()).forEach(key => {
          const truncKey = key.substring(0, MAX_DFP_KEYLENGTH);
          const data = customKeysByUnit[bid.adUnitCode] || {};
          const value = [bid.adserverTargeting[key]];
          if (data[truncKey]) {
            data[truncKey] = data[truncKey].concat(value).filter(_utils_js__WEBPACK_IMPORTED_MODULE_8__.uniques);
          } else {
            data[truncKey] = value;
          }
          customKeysByUnit[bid.adUnitCode] = data;
        });
      }
    });
    return {
      filteredBids,
      customKeysByUnit
    };
  }

  // warn about conflicting configuration
  _config_js__WEBPACK_IMPORTED_MODULE_3__.config.getConfig('targetingControls', function (config) {
    if ((0,_utils_js__WEBPACK_IMPORTED_MODULE_10__["default"])(config, CFG_ALLOW_TARGETING_KEYS) != null && (0,_utils_js__WEBPACK_IMPORTED_MODULE_10__["default"])(config, CFG_ADD_TARGETING_KEYS) != null) {
      (0,_utils_js__WEBPACK_IMPORTED_MODULE_8__.logError)(TARGETING_KEY_CONFIGURATION_ERROR_MSG);
    }
  });

  // create an encoded string variant based on the keypairs of the provided object
  //  - note this will encode the characters between the keys (ie = and &)
  function convertKeysToQueryForm(keyMap) {
    return Object.keys(keyMap).reduce(function (queryString, key) {
      const encodedKeyPair = "".concat(key, "%3d").concat(encodeURIComponent(keyMap[key]), "%26");
      queryString += encodedKeyPair;
      return queryString;
    }, '');
  }
  function filterTargetingKeys(targeting, auctionKeysThreshold) {
    // read each targeting.adUnit object and sort the adUnits into a list of adUnitCodes based on priorization setting (eg CPM)
    const targetingCopy = (0,_utils_js__WEBPACK_IMPORTED_MODULE_9__.deepClone)(targeting);
    const targetingMap = Object.keys(targetingCopy).map(adUnitCode => {
      return {
        adUnitCode,
        adserverTargeting: targetingCopy[adUnitCode]
      };
    }).sort(sortByDealAndPriceBucketOrCpm());

    // iterate through the targeting based on above list and transform the keys into the query-equivalent and count characters
    return targetingMap.reduce(function (accMap, currMap, index, arr) {
      let adUnitQueryString = convertKeysToQueryForm(currMap.adserverTargeting);

      // for the last adUnit - trim last encoded ampersand from the converted query string
      if (index + 1 === arr.length) {
        adUnitQueryString = adUnitQueryString.slice(0, -3);
      }

      // if under running threshold add to result
      const code = currMap.adUnitCode;
      const querySize = adUnitQueryString.length;
      if (querySize <= auctionKeysThreshold) {
        auctionKeysThreshold -= querySize;
        (0,_utils_js__WEBPACK_IMPORTED_MODULE_8__.logInfo)("AdUnit '".concat(code, "' auction keys comprised of ").concat(querySize, " characters.  Deducted from running threshold; new limit is ").concat(auctionKeysThreshold), targetingCopy[code]);
        accMap[code] = targetingCopy[code];
      } else {
        (0,_utils_js__WEBPACK_IMPORTED_MODULE_8__.logWarn)("The following keys for adUnitCode '".concat(code, "' exceeded the current limit of the 'auctionKeyMaxChars' setting.\nThe key-set size was ").concat(querySize, ", the current allotted amount was ").concat(auctionKeysThreshold, ".\n"), targetingCopy[code]);
      }
      if (index + 1 === arr.length && Object.keys(accMap).length === 0) {
        (0,_utils_js__WEBPACK_IMPORTED_MODULE_8__.logError)('No auction targeting keys were permitted due to the setting in setConfig(targetingControls.auctionKeyMaxChars).  Please review setup and consider adjusting.');
      }
      return accMap;
    }, {});
  }

  /**
   * Converts targeting array and flattens to make it easily iteratable
   * e.g: Sample input to this function
   * ```
   * [
   *    {
   *      "div-gpt-ad-1460505748561-0": [{"hb_bidder": ["appnexusAst"]}]
   *    },
   *    {
   *      "div-gpt-ad-1460505748561-0": [{"hb_bidder_appnexusAs": ["appnexusAst", "other"]}]
   *    }
   * ]
   * ```
   * Resulting array
   * ```
   * {
   *  "div-gpt-ad-1460505748561-0": {
   *    "hb_bidder": "appnexusAst",
   *    "hb_bidder_appnexusAs": "appnexusAst,other"
   *  }
   * }
   * ```
   *
   * @param targeting
   * @return targeting
   */
  function flattenTargeting(targeting) {
    return targeting.map(targeting => {
      return {
        [Object.keys(targeting)[0]]: targeting[Object.keys(targeting)[0]].map(target => {
          return {
            [Object.keys(target)[0]]: target[Object.keys(target)[0]].join(',')
          };
        }).reduce((p, c) => Object.assign(c, p), {})
      };
    }).reduce(function (accumulator, targeting) {
      var key = Object.keys(targeting)[0];
      accumulator[key] = Object.assign({}, accumulator[key], targeting[key]);
      return accumulator;
    }, {});
  }

  /**
   * normlizes input to a `adUnit.code` array
   * @param  adUnitCode
   * @return AdUnit code array
   */
  function getAdUnitCodes(adUnitCode) {
    if (typeof adUnitCode === 'string') {
      return [adUnitCode];
    } else if ((0,_utils_js__WEBPACK_IMPORTED_MODULE_9__.isArray)(adUnitCode)) {
      return adUnitCode;
    }
    return auctionManager.getAdUnitCodes() || [];
  }
  function getBidsReceived() {
    let winReducer = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : _utils_reducers_js__WEBPACK_IMPORTED_MODULE_11__.getOldestHighestCpmBid;
    let winSorter = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : undefined;
    const bidsReceived = auctionManager.getBidsReceived().reduce((bids, bid) => {
      var _bid$video;
      const bidCacheEnabled = _config_js__WEBPACK_IMPORTED_MODULE_3__.config.getConfig('useBidCache');
      const filterFunction = _config_js__WEBPACK_IMPORTED_MODULE_3__.config.getConfig('bidCacheFilterFunction');
      const isBidFromLastAuction = latestAuctionForAdUnit[bid.adUnitCode] === bid.auctionId;
      const filterFunctionResult = bidCacheEnabled && !isBidFromLastAuction && typeof filterFunction === 'function' ? !!filterFunction(bid) : true;
      const cacheFilter = bidCacheEnabled || isBidFromLastAuction;
      const bidFilter = cacheFilter && filterFunctionResult;
      if (bidFilter && (bid === null || bid === void 0 || (_bid$video = bid.video) === null || _bid$video === void 0 ? void 0 : _bid$video.context) !== _mediaTypes_js__WEBPACK_IMPORTED_MODULE_7__.ADPOD && isBidUsable(bid)) {
        bid.latestTargetedAuctionId = latestAuctionForAdUnit[bid.adUnitCode];
        bids.push(bid);
      }
      return bids;
    }, []);
    return getHighestCpmBidsFromBidPool(bidsReceived, winReducer, undefined, undefined, winSorter);
  }

  /**
   * Get targeting key value pairs for winning bid.
   * @param bidsReceived code array
   * @param adUnitCodes code array
   * @return winning bids targeting
   */
  function getWinningBidTargeting(bidsReceived, adUnitCodes) {
    const winners = targeting.getWinningBids(adUnitCodes, bidsReceived);
    const standardKeys = getStandardKeys();
    return winners.map(winner => {
      return {
        [winner.adUnitCode]: Object.keys(winner.adserverTargeting).filter(key => typeof winner.sendStandardTargeting === 'undefined' || winner.sendStandardTargeting || standardKeys.indexOf(key) === -1).reduce((acc, key) => {
          const targetingValue = [winner.adserverTargeting[key]];
          const targeting = {
            [key.substring(0, MAX_DFP_KEYLENGTH)]: targetingValue
          };
          if (key === _constants_js__WEBPACK_IMPORTED_MODULE_4__.TARGETING_KEYS.DEAL) {
            const bidderCodeTargetingKey = "".concat(key, "_").concat(winner.bidderCode).substring(0, MAX_DFP_KEYLENGTH);
            const bidderCodeTargeting = {
              [bidderCodeTargetingKey]: targetingValue
            };
            return [...acc, targeting, bidderCodeTargeting];
          }
          return [...acc, targeting];
        }, [])
      };
    });
  }
  function getStandardKeys() {
    return auctionManager.getStandardBidderAdServerTargeting() // in case using a custom standard key set
    .map(targeting => targeting.key).concat(TARGETING_KEYS_ARR).filter(_utils_js__WEBPACK_IMPORTED_MODULE_8__.uniques); // standard keys defined in the library.
  }
  function getCustomKeys() {
    const standardKeys = getStandardKeys();
    return function (key) {
      return standardKeys.indexOf(key) === -1;
    };
  }

  /**
   * Get custom targeting key value pairs for bids.
   * @param {Array<Object>} bidsSorted code array
   * @param {Object} customKeysByUnit code array
   * @return bids with custom targeting defined in bidderSettings
   */
  function getCustomBidTargeting(bidsSorted, customKeysByUnit) {
    return bidsSorted.reduce((acc, bid) => {
      const newBid = Object.assign({}, bid);
      const customKeysForUnit = customKeysByUnit[newBid.adUnitCode];
      const targeting = [];
      if (customKeysForUnit) {
        Object.keys(customKeysForUnit).forEach(key => {
          if (key && customKeysForUnit[key]) targeting.push({
            [key]: customKeysForUnit[key]
          });
        });
      }
      acc.push({
        [newBid.adUnitCode]: targeting
      });
      return acc;
    }, []);
  }
  function getTargetingMap(bid, keys) {
    return keys.reduce((targeting, key) => {
      const value = bid.adserverTargeting[key];
      if (value) {
        targeting.push({
          ["".concat(key, "_").concat(bid.bidderCode).substring(0, MAX_DFP_KEYLENGTH)]: [bid.adserverTargeting[key]]
        });
      }
      return targeting;
    }, []);
  }
  function getVersionTargeting(adUnitCodes) {
    let version = _config_js__WEBPACK_IMPORTED_MODULE_3__.config.getConfig('targetingControls.version');
    if (version === false) return [];
    return adUnitCodes.map(au => ({
      [au]: [{
        [_constants_js__WEBPACK_IMPORTED_MODULE_4__.TARGETING_KEYS.VERSION]: [version !== null && version !== void 0 ? version : DEFAULT_HB_VER]
      }]
    }));
  }
  function getAdUnitTargeting(adUnitCodes) {
    function getTargetingObj(adUnit) {
      return adUnit === null || adUnit === void 0 ? void 0 : adUnit[_constants_js__WEBPACK_IMPORTED_MODULE_4__.JSON_MAPPING.ADSERVER_TARGETING];
    }
    function getTargetingValues(adUnit) {
      const aut = getTargetingObj(adUnit);
      return Object.keys(aut).map(function (key) {
        if ((0,_utils_js__WEBPACK_IMPORTED_MODULE_9__.isStr)(aut[key])) aut[key] = aut[key].split(',').map(s => s.trim());
        if (!(0,_utils_js__WEBPACK_IMPORTED_MODULE_9__.isArray)(aut[key])) aut[key] = [aut[key]];
        return {
          [key]: aut[key]
        };
      });
    }
    return auctionManager.getAdUnits().filter(adUnit => adUnitCodes.includes(adUnit.code) && getTargetingObj(adUnit)).reduce((result, adUnit) => {
      const targetingValues = getTargetingValues(adUnit);
      if (targetingValues) result.push({
        [adUnit.code]: targetingValues
      });
      return result;
    }, []);
  }
  return targeting;
}
const targeting = newTargeting(_auctionManager_js__WEBPACK_IMPORTED_MODULE_0__.auctionManager);


/***/ }),

/***/ "./src/targeting/lock.js":
/*!*******************************!*\
  !*** ./src/targeting/lock.js ***!
  \*******************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   lock: () => (/* binding */ lock)
/* harmony export */ });
/* unused harmony export targetingLock */
/* harmony import */ var _config_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../config.js */ "./src/config.js");
/* harmony import */ var _utils_ttlCollection_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../utils/ttlCollection.js */ "./src/utils/ttlCollection.js");
/* harmony import */ var _utils_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../utils.js */ "./src/utils.js");



const DEFAULT_LOCK_TIMEOUT = 3000;
function targetingLock() {
  let timeout, keys;
  let locked = (0,_utils_ttlCollection_js__WEBPACK_IMPORTED_MODULE_1__.ttlCollection)({
    monotonic: true,
    ttl: () => timeout,
    slack: 0
  });
  _config_js__WEBPACK_IMPORTED_MODULE_0__.config.getConfig('targetingControls', cfg => {
    var _cfg$targetingControl;
    ({
      lock: keys,
      lockTimeout: timeout = DEFAULT_LOCK_TIMEOUT
    } = (_cfg$targetingControl = cfg.targetingControls) !== null && _cfg$targetingControl !== void 0 ? _cfg$targetingControl : {});
    if (keys != null && !Array.isArray(keys)) {
      keys = [keys];
    } else if (keys == null) {
      tearDownGpt();
    }
    locked.clear();
  });
  const [setupGpt, tearDownGpt] = (() => {
    let enabled = false;
    function onGptRender(_ref) {
      var _keys;
      let {
        slot
      } = _ref;
      (_keys = keys) === null || _keys === void 0 || _keys.forEach(key => {
        var _slot$getTargeting;
        return (_slot$getTargeting = slot.getTargeting(key)) === null || _slot$getTargeting === void 0 ? void 0 : _slot$getTargeting.forEach(locked.delete);
      });
    }
    return [() => {
      if (keys != null && !enabled && (0,_utils_js__WEBPACK_IMPORTED_MODULE_2__.isGptPubadsDefined)()) {
        var _googletag$pubads$add, _googletag$pubads;
        (_googletag$pubads$add = (_googletag$pubads = googletag.pubads()).addEventListener) === null || _googletag$pubads$add === void 0 || _googletag$pubads$add.call(_googletag$pubads, 'slotRenderEnded', onGptRender);
        enabled = true;
      }
    }, () => {
      if (enabled && (0,_utils_js__WEBPACK_IMPORTED_MODULE_2__.isGptPubadsDefined)()) {
        var _googletag$pubads$rem, _googletag$pubads2;
        (_googletag$pubads$rem = (_googletag$pubads2 = googletag.pubads()).removeEventListener) === null || _googletag$pubads$rem === void 0 || _googletag$pubads$rem.call(_googletag$pubads2, 'slotRenderEnded', onGptRender);
        enabled = false;
      }
    }];
  })();
  return {
    isLocked(targeting) {
      var _keys$some, _keys2;
      return (_keys$some = (_keys2 = keys) === null || _keys2 === void 0 ? void 0 : _keys2.some(key => targeting[key] != null && locked.has(targeting[key]))) !== null && _keys$some !== void 0 ? _keys$some : false;
    },
    lock(targeting) {
      var _keys3;
      setupGpt();
      (_keys3 = keys) === null || _keys3 === void 0 || _keys3.forEach(key => targeting[key] != null && locked.add(targeting[key]));
    }
  };
}
const lock = targetingLock();


/***/ }),

/***/ "./src/userSync.js":
/*!*************************!*\
  !*** ./src/userSync.js ***!
  \*************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   userSync: () => (/* binding */ userSync)
/* harmony export */ });
/* unused harmony exports USERSYNC_DEFAULT_CONFIG, newUserSync */
/* harmony import */ var _utils_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./utils.js */ "./src/utils/objects.js");
/* harmony import */ var _utils_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./utils.js */ "./src/utils.js");
/* harmony import */ var _config_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./config.js */ "./src/config.js");
/* harmony import */ var _storageManager_js__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ./storageManager.js */ "./src/storageManager.js");
/* harmony import */ var _activities_rules_js__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ./activities/rules.js */ "./src/activities/rules.js");
/* harmony import */ var _activities_activities_js__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! ./activities/activities.js */ "./src/activities/activities.js");
/* harmony import */ var _activities_params_js__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(/*! ./activities/params.js */ "./src/activities/params.js");
/* harmony import */ var _activities_modules_js__WEBPACK_IMPORTED_MODULE_7__ = __webpack_require__(/*! ./activities/modules.js */ "./src/activities/modules.js");
/* harmony import */ var _activities_activityParams_js__WEBPACK_IMPORTED_MODULE_8__ = __webpack_require__(/*! ./activities/activityParams.js */ "./src/activities/activityParams.js");








const USERSYNC_DEFAULT_CONFIG = {
  syncEnabled: true,
  filterSettings: {
    image: {
      bidders: '*',
      filter: 'include'
    }
  },
  syncsPerBidder: 5,
  syncDelay: 3000,
  auctionDelay: 500
};

// Set userSync default values
_config_js__WEBPACK_IMPORTED_MODULE_2__.config.setDefaults({
  'userSync': (0,_utils_js__WEBPACK_IMPORTED_MODULE_0__.deepClone)(USERSYNC_DEFAULT_CONFIG)
});
const storage = (0,_storageManager_js__WEBPACK_IMPORTED_MODULE_3__.getCoreStorageManager)('usersync');

/**
 * Factory function which creates a new UserSyncPool.
 *
 * @param {} deps Configuration options and dependencies which the
 *   UserSync object needs in order to behave properly.
 */
function newUserSync(deps) {
  const publicApi = {};
  // A queue of user syncs for each adapter
  // Let getDefaultQueue() set the defaults
  let queue = getDefaultQueue();

  // Whether or not user syncs have been trigger on this page load for a specific bidder
  const hasFiredBidder = new Set();
  // How many bids for each adapter
  let numAdapterBids = {};

  // for now - default both to false in case filterSettings config is absent/misconfigured
  const permittedPixels = {
    image: true,
    iframe: false
  };

  // Use what is in config by default
  let usConfig = deps.config;
  // Update if it's (re)set
  _config_js__WEBPACK_IMPORTED_MODULE_2__.config.getConfig('userSync', conf => {
    // Added this logic for https://github.com/prebid/Prebid.js/issues/4864
    // if userSync.filterSettings does not contain image/all configs, merge in default image config to ensure image pixels are fired
    if (conf.userSync) {
      const fs = conf.userSync.filterSettings;
      if ((0,_utils_js__WEBPACK_IMPORTED_MODULE_0__.isPlainObject)(fs)) {
        if (!fs.image && !fs.all) {
          conf.userSync.filterSettings.image = {
            bidders: '*',
            filter: 'include'
          };
        }
      }
    }
    usConfig = Object.assign(usConfig, conf.userSync);
  });
  deps.regRule(_activities_activities_js__WEBPACK_IMPORTED_MODULE_5__.ACTIVITY_SYNC_USER, 'userSync config', params => {
    if (!usConfig.syncEnabled) {
      return {
        allow: false,
        reason: 'syncs are disabled'
      };
    }
    if (params[_activities_params_js__WEBPACK_IMPORTED_MODULE_6__.ACTIVITY_PARAM_COMPONENT_TYPE] === _activities_modules_js__WEBPACK_IMPORTED_MODULE_7__.MODULE_TYPE_BIDDER) {
      const syncType = params[_activities_params_js__WEBPACK_IMPORTED_MODULE_6__.ACTIVITY_PARAM_SYNC_TYPE];
      const bidder = params[_activities_params_js__WEBPACK_IMPORTED_MODULE_6__.ACTIVITY_PARAM_COMPONENT_NAME];
      if (!publicApi.canBidderRegisterSync(syncType, bidder)) {
        return {
          allow: false,
          reason: "".concat(syncType, " syncs are not enabled for ").concat(bidder)
        };
      }
    }
  });

  /**
   * @function getDefaultQueue
   * @summary Returns the default empty queue
   * @private
   * @return {object} A queue with no syncs
   */
  function getDefaultQueue() {
    return {
      image: [],
      iframe: []
    };
  }

  /**
   * @function fireSyncs
   * @summary Trigger all user syncs in the queue
   * @private
   */
  function fireSyncs() {
    if (!usConfig.syncEnabled || !deps.browserSupportsCookies) {
      return;
    }
    try {
      // Iframe syncs
      loadIframes();
      // Image pixels
      fireImagePixels();
    } catch (e) {
      return (0,_utils_js__WEBPACK_IMPORTED_MODULE_1__.logError)('Error firing user syncs', e);
    }
    // Reset the user sync queue
    queue = getDefaultQueue();
  }
  function forEachFire(queue, fn) {
    // Randomize the order of the pixels before firing
    // This is to avoid giving any bidder who has registered multiple syncs
    // any preferential treatment and balancing them out
    (0,_utils_js__WEBPACK_IMPORTED_MODULE_1__.shuffle)(queue).forEach(fn);
  }

  /**
   * @function fireImagePixels
   * @summary Loops through user sync pixels and fires each one
   * @private
   */
  function fireImagePixels() {
    if (!permittedPixels.image) {
      return;
    }
    forEachFire(queue.image, sync => {
      const [bidderName, trackingPixelUrl] = sync;
      (0,_utils_js__WEBPACK_IMPORTED_MODULE_1__.logMessage)("Invoking image pixel user sync for bidder: ".concat(bidderName));
      // Create image object and add the src url
      (0,_utils_js__WEBPACK_IMPORTED_MODULE_1__.triggerPixel)(trackingPixelUrl);
    });
  }

  /**
   * @function loadIframes
   * @summary Loops through iframe syncs and loads an iframe element into the page
   * @private
   */
  function loadIframes() {
    if (!permittedPixels.iframe) {
      return;
    }
    forEachFire(queue.iframe, sync => {
      const [bidderName, iframeUrl] = sync;
      (0,_utils_js__WEBPACK_IMPORTED_MODULE_1__.logMessage)("Invoking iframe user sync for bidder: ".concat(bidderName));
      // Insert iframe into DOM
      (0,_utils_js__WEBPACK_IMPORTED_MODULE_1__.insertUserSyncIframe)(iframeUrl);
      // for a bidder, if iframe sync is present then remove image pixel
      removeImagePixelsForBidder(queue, bidderName);
    });
  }
  function removeImagePixelsForBidder(queue, iframeSyncBidderName) {
    queue.image = queue.image.filter(imageSync => {
      const imageSyncBidderName = imageSync[0];
      return imageSyncBidderName !== iframeSyncBidderName;
    });
  }

  /**
   * @function incrementAdapterBids
   * @summary Increment the count of user syncs queue for the adapter
   * @private
   * @param {object} numAdapterBids The object contain counts for all adapters
   * @param {string} bidder The name of the bidder adding a sync
   * @returns {object} The updated version of numAdapterBids
   */
  function incrementAdapterBids(numAdapterBids, bidder) {
    if (!numAdapterBids[bidder]) {
      numAdapterBids[bidder] = 1;
    } else {
      numAdapterBids[bidder] += 1;
    }
    return numAdapterBids;
  }

  /**
   * @function registerSync
   * @summary Add sync for this bidder to a queue to be fired later
   * @public
   * @param {string} type The type of the sync including image, iframe
   * @param {string} bidder The name of the adapter. e.g. "rubicon"
   * @param {string} url Either the pixel url or iframe url depending on the type
   * @example <caption>Using Image Sync</caption>
   * // registerSync(type, adapter, pixelUrl)
   * userSync.registerSync('image', 'rubicon', 'http://example.com/pixel')
   */
  publicApi.registerSync = (type, bidder, url) => {
    if (hasFiredBidder.has(bidder)) {
      return (0,_utils_js__WEBPACK_IMPORTED_MODULE_1__.logMessage)("already fired syncs for \"".concat(bidder, "\", ignoring registerSync call"));
    }
    if (!usConfig.syncEnabled || !(0,_utils_js__WEBPACK_IMPORTED_MODULE_0__.isArray)(queue[type])) {
      return (0,_utils_js__WEBPACK_IMPORTED_MODULE_1__.logWarn)("User sync type \"".concat(type, "\" not supported"));
    }
    if (!bidder) {
      return (0,_utils_js__WEBPACK_IMPORTED_MODULE_1__.logWarn)("Bidder is required for registering sync");
    }
    if (usConfig.syncsPerBidder !== 0 && Number(numAdapterBids[bidder]) >= usConfig.syncsPerBidder) {
      return (0,_utils_js__WEBPACK_IMPORTED_MODULE_1__.logWarn)("Number of user syncs exceeded for \"".concat(bidder, "\""));
    }
    if (deps.isAllowed(_activities_activities_js__WEBPACK_IMPORTED_MODULE_5__.ACTIVITY_SYNC_USER, (0,_activities_activityParams_js__WEBPACK_IMPORTED_MODULE_8__.activityParams)(_activities_modules_js__WEBPACK_IMPORTED_MODULE_7__.MODULE_TYPE_BIDDER, bidder, {
      [_activities_params_js__WEBPACK_IMPORTED_MODULE_6__.ACTIVITY_PARAM_SYNC_TYPE]: type,
      [_activities_params_js__WEBPACK_IMPORTED_MODULE_6__.ACTIVITY_PARAM_SYNC_URL]: url
    }))) {
      // the bidder's pixel has passed all checks and is allowed to register
      queue[type].push([bidder, url]);
      numAdapterBids = incrementAdapterBids(numAdapterBids, bidder);
    }
  };

  /**
   * Mark a bidder as done with its user syncs - no more will be accepted from them in this session.
   * @param {string} bidderCode
   */
  publicApi.bidderDone = hasFiredBidder.add.bind(hasFiredBidder);

  /**
   * @function shouldBidderBeBlocked
   * @summary Check filterSettings logic to determine if the bidder should be prevented from registering their userSync tracker
   * @private
   * @param {string} type The type of the sync; either image or iframe
   * @param {string} bidder The name of the adapter. e.g. "rubicon"
   * @returns {boolean} true => bidder is not allowed to register; false => bidder can register
   */
  function shouldBidderBeBlocked(type, bidder) {
    const filterConfig = usConfig.filterSettings;

    // apply the filter check if the config object is there (eg filterSettings.iframe exists) and if the config object is properly setup
    if (isFilterConfigValid(filterConfig, type)) {
      permittedPixels[type] = true;
      const activeConfig = filterConfig.all ? filterConfig.all : filterConfig[type];
      const biddersToFilter = activeConfig.bidders === '*' ? [bidder] : activeConfig.bidders;
      const filterType = activeConfig.filter || 'include'; // set default if undefined

      // return true if the bidder is either: not part of the include (ie outside the whitelist) or part of the exclude (ie inside the blacklist)
      const checkForFiltering = {
        'include': (bidders, bidder) => !bidders.includes(bidder),
        'exclude': (bidders, bidder) => bidders.includes(bidder)
      };
      return checkForFiltering[filterType](biddersToFilter, bidder);
    }
    return !permittedPixels[type];
  }

  /**
   * @function isFilterConfigValid
   * @summary Check if the filterSettings object in the userSync config is setup properly
   * @private
   * @param {object} filterConfig sub-config object taken from filterSettings
   * @param {string} type The type of the sync; either image or iframe
   * @returns {boolean} true => config is setup correctly, false => setup incorrectly or filterConfig[type] is not present
   */
  function isFilterConfigValid(filterConfig, type) {
    if (filterConfig.all && filterConfig[type]) {
      (0,_utils_js__WEBPACK_IMPORTED_MODULE_1__.logWarn)("Detected presence of the \"filterSettings.all\" and \"filterSettings.".concat(type, "\" in userSync config.  You cannot mix \"all\" with \"iframe/image\" configs; they are mutually exclusive."));
      return false;
    }
    const activeConfig = filterConfig.all ? filterConfig.all : filterConfig[type];
    const activeConfigName = filterConfig.all ? 'all' : type;

    // if current pixel type isn't part of the config's logic, skip rest of the config checks...
    // we return false to skip subsequent filter checks in shouldBidderBeBlocked() function
    if (!activeConfig) {
      return false;
    }
    const filterField = activeConfig.filter;
    const biddersField = activeConfig.bidders;
    if (filterField && filterField !== 'include' && filterField !== 'exclude') {
      (0,_utils_js__WEBPACK_IMPORTED_MODULE_1__.logWarn)("UserSync \"filterSettings.".concat(activeConfigName, ".filter\" setting '").concat(filterField, "' is not a valid option; use either 'include' or 'exclude'."));
      return false;
    }
    if (biddersField !== '*' && !(Array.isArray(biddersField) && biddersField.length > 0 && biddersField.every(bidderInList => (0,_utils_js__WEBPACK_IMPORTED_MODULE_0__.isStr)(bidderInList) && bidderInList !== '*'))) {
      (0,_utils_js__WEBPACK_IMPORTED_MODULE_1__.logWarn)("Detected an invalid setup in userSync \"filterSettings.".concat(activeConfigName, ".bidders\"; use either '*' (to represent all bidders) or an array of bidders."));
      return false;
    }
    return true;
  }

  /**
   * @function syncUsers
   * @summary Trigger all the user syncs based on publisher-defined timeout
   * @public
   * @param {number} timeout The delay in ms before syncing data - default 0
   */
  publicApi.syncUsers = function () {
    let timeout = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 0;
    if (timeout) {
      return setTimeout(fireSyncs, Number(timeout));
    }
    fireSyncs();
  };

  /**
   * @function triggerUserSyncs
   * @summary A `syncUsers` wrapper for determining if enableOverride has been turned on
   * @public
   */
  publicApi.triggerUserSyncs = () => {
    if (usConfig.enableOverride) {
      publicApi.syncUsers();
    }
  };
  publicApi.canBidderRegisterSync = (type, bidder) => {
    if (usConfig.filterSettings) {
      if (shouldBidderBeBlocked(type, bidder)) {
        return false;
      }
    }
    return true;
  };
  return publicApi;
}
const userSync = newUserSync(Object.defineProperties({
  config: _config_js__WEBPACK_IMPORTED_MODULE_2__.config.getConfig('userSync'),
  isAllowed: _activities_rules_js__WEBPACK_IMPORTED_MODULE_4__.isActivityAllowed,
  regRule: _activities_rules_js__WEBPACK_IMPORTED_MODULE_4__.registerActivityControl
}, {
  browserSupportsCookies: {
    get: function () {
      // call storage lazily to give time for consent data to be available
      return !(0,_utils_js__WEBPACK_IMPORTED_MODULE_1__.isSafariBrowser)() && storage.cookiesAreEnabled();
    }
  }
}));

/**
 * @typedef {Object} UserSyncConfig
 *
 * @property {boolean} enableOverride
 * @property {boolean} syncEnabled
 * @property {number} syncsPerBidder
 * @property {string[]} enabledBidders
 * @property {Object} filterSettings
 */


/***/ }),

/***/ "./src/utils.js":
/*!**********************!*\
  !*** ./src/utils.js ***!
  \**********************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   _each: () => (/* binding */ _each),
/* harmony export */   _map: () => (/* binding */ _map),
/* harmony export */   _setEventEmitter: () => (/* binding */ _setEventEmitter),
/* harmony export */   binarySearch: () => (/* binding */ binarySearch),
/* harmony export */   buildUrl: () => (/* binding */ buildUrl),
/* harmony export */   canAccessWindowTop: () => (/* binding */ canAccessWindowTop),
/* harmony export */   checkCookieSupport: () => (/* binding */ checkCookieSupport),
/* harmony export */   cleanObj: () => (/* binding */ cleanObj),
/* harmony export */   compareCodeAndSlot: () => (/* binding */ compareCodeAndSlot),
/* harmony export */   compressDataWithGZip: () => (/* binding */ compressDataWithGZip),
/* harmony export */   contains: () => (/* binding */ contains),
/* harmony export */   convertObjectToArray: () => (/* binding */ convertObjectToArray),
/* harmony export */   createIframe: () => (/* binding */ createIframe),
/* harmony export */   createInvisibleIframe: () => (/* binding */ createInvisibleIframe),
/* harmony export */   createTrackPixelHtml: () => (/* binding */ createTrackPixelHtml),
/* harmony export */   createTrackPixelIframeHtml: () => (/* binding */ createTrackPixelIframeHtml),
/* harmony export */   cyrb53Hash: () => (/* binding */ cyrb53Hash),
/* harmony export */   debugTurnedOn: () => (/* binding */ debugTurnedOn),
/* harmony export */   deepAccess: () => (/* reexport safe */ dlv_index_js__WEBPACK_IMPORTED_MODULE_3__["default"]),
/* harmony export */   deepClone: () => (/* reexport safe */ _utils_objects_js__WEBPACK_IMPORTED_MODULE_4__.deepClone),
/* harmony export */   deepEqual: () => (/* binding */ deepEqual),
/* harmony export */   deepSetValue: () => (/* reexport safe */ dset__WEBPACK_IMPORTED_MODULE_5__.dset),
/* harmony export */   delayExecution: () => (/* binding */ delayExecution),
/* harmony export */   encodeMacroURI: () => (/* binding */ encodeMacroURI),
/* harmony export */   extractDomainFromHost: () => (/* binding */ extractDomainFromHost),
/* harmony export */   flatten: () => (/* binding */ flatten),
/* harmony export */   formatQS: () => (/* binding */ formatQS),
/* harmony export */   generateUUID: () => (/* binding */ generateUUID),
/* harmony export */   getBidIdParameter: () => (/* binding */ getBidIdParameter),
/* harmony export */   getBidRequest: () => (/* binding */ getBidRequest),
/* harmony export */   getBidderCodes: () => (/* binding */ getBidderCodes),
/* harmony export */   getDefinedParams: () => (/* reexport safe */ _utils_objects_js__WEBPACK_IMPORTED_MODULE_4__.getDefinedParams),
/* harmony export */   getDocument: () => (/* binding */ getDocument),
/* harmony export */   getDomLoadingDuration: () => (/* binding */ getDomLoadingDuration),
/* harmony export */   getParameterByName: () => (/* binding */ getParameterByName),
/* harmony export */   getPerformanceNow: () => (/* binding */ getPerformanceNow),
/* harmony export */   getPrebidInternal: () => (/* binding */ getPrebidInternal),
/* harmony export */   getSafeframeGeometry: () => (/* binding */ getSafeframeGeometry),
/* harmony export */   getScreenOrientation: () => (/* reexport safe */ _utils_winDimensions_js__WEBPACK_IMPORTED_MODULE_6__.getScreenOrientation),
/* harmony export */   getUniqueIdentifierStr: () => (/* binding */ getUniqueIdentifierStr),
/* harmony export */   getUnixTimestampFromNow: () => (/* binding */ getUnixTimestampFromNow),
/* harmony export */   getUserConfiguredParams: () => (/* binding */ getUserConfiguredParams),
/* harmony export */   getValue: () => (/* binding */ getValue),
/* harmony export */   getWinDimensions: () => (/* reexport safe */ _utils_winDimensions_js__WEBPACK_IMPORTED_MODULE_6__.getWinDimensions),
/* harmony export */   getWindowLocation: () => (/* binding */ getWindowLocation),
/* harmony export */   getWindowSelf: () => (/* binding */ getWindowSelf),
/* harmony export */   getWindowTop: () => (/* binding */ getWindowTop),
/* harmony export */   groupBy: () => (/* binding */ groupBy),
/* harmony export */   hasConsoleLogger: () => (/* binding */ hasConsoleLogger),
/* harmony export */   hasDeviceAccess: () => (/* binding */ hasDeviceAccess),
/* harmony export */   hasNonSerializableProperty: () => (/* binding */ hasNonSerializableProperty),
/* harmony export */   inIframe: () => (/* binding */ inIframe),
/* harmony export */   insertElement: () => (/* binding */ insertElement),
/* harmony export */   insertHtmlIntoIframe: () => (/* binding */ insertHtmlIntoIframe),
/* harmony export */   insertUserSyncIframe: () => (/* binding */ insertUserSyncIframe),
/* harmony export */   internal: () => (/* binding */ internal),
/* harmony export */   isA: () => (/* reexport safe */ _utils_objects_js__WEBPACK_IMPORTED_MODULE_4__.isA),
/* harmony export */   isAdUnitCodeMatchingSlot: () => (/* binding */ isAdUnitCodeMatchingSlot),
/* harmony export */   isApnGetTagDefined: () => (/* binding */ isApnGetTagDefined),
/* harmony export */   isArray: () => (/* reexport safe */ _utils_objects_js__WEBPACK_IMPORTED_MODULE_4__.isArray),
/* harmony export */   isArrayOfNums: () => (/* reexport safe */ _utils_objects_js__WEBPACK_IMPORTED_MODULE_4__.isArrayOfNums),
/* harmony export */   isBoolean: () => (/* reexport safe */ _utils_objects_js__WEBPACK_IMPORTED_MODULE_4__.isBoolean),
/* harmony export */   isEmpty: () => (/* binding */ isEmpty),
/* harmony export */   isEmptyStr: () => (/* binding */ isEmptyStr),
/* harmony export */   isFn: () => (/* reexport safe */ _utils_objects_js__WEBPACK_IMPORTED_MODULE_4__.isFn),
/* harmony export */   isGptPubadsDefined: () => (/* binding */ isGptPubadsDefined),
/* harmony export */   isGzipCompressionSupported: () => (/* binding */ isGzipCompressionSupported),
/* harmony export */   isInteger: () => (/* reexport safe */ _utils_objects_js__WEBPACK_IMPORTED_MODULE_4__.isInteger),
/* harmony export */   isNumber: () => (/* reexport safe */ _utils_objects_js__WEBPACK_IMPORTED_MODULE_4__.isNumber),
/* harmony export */   isPlainObject: () => (/* reexport safe */ _utils_objects_js__WEBPACK_IMPORTED_MODULE_4__.isPlainObject),
/* harmony export */   isSafariBrowser: () => (/* binding */ isSafariBrowser),
/* harmony export */   isSafeFrameWindow: () => (/* binding */ isSafeFrameWindow),
/* harmony export */   isStr: () => (/* reexport safe */ _utils_objects_js__WEBPACK_IMPORTED_MODULE_4__.isStr),
/* harmony export */   isValidMediaTypes: () => (/* binding */ isValidMediaTypes),
/* harmony export */   logError: () => (/* binding */ logError),
/* harmony export */   logInfo: () => (/* binding */ logInfo),
/* harmony export */   logMessage: () => (/* binding */ logMessage),
/* harmony export */   logWarn: () => (/* binding */ logWarn),
/* harmony export */   memoize: () => (/* binding */ memoize),
/* harmony export */   mergeDeep: () => (/* binding */ mergeDeep),
/* harmony export */   parseGPTSingleSizeArray: () => (/* binding */ parseGPTSingleSizeArray),
/* harmony export */   parseGPTSingleSizeArrayToRtbSize: () => (/* binding */ parseGPTSingleSizeArrayToRtbSize),
/* harmony export */   parseQS: () => (/* binding */ parseQS),
/* harmony export */   parseQueryStringParameters: () => (/* binding */ parseQueryStringParameters),
/* harmony export */   parseSizesInput: () => (/* binding */ parseSizesInput),
/* harmony export */   parseUrl: () => (/* binding */ parseUrl),
/* harmony export */   pick: () => (/* binding */ pick),
/* harmony export */   prefixLog: () => (/* binding */ prefixLog),
/* harmony export */   replaceAuctionPrice: () => (/* binding */ replaceAuctionPrice),
/* harmony export */   replaceClickThrough: () => (/* binding */ replaceClickThrough),
/* harmony export */   replaceMacros: () => (/* binding */ replaceMacros),
/* harmony export */   resetWinDimensions: () => (/* reexport safe */ _utils_winDimensions_js__WEBPACK_IMPORTED_MODULE_6__.resetWinDimensions),
/* harmony export */   safeJSONEncode: () => (/* binding */ safeJSONEncode),
/* harmony export */   safeJSONParse: () => (/* binding */ safeJSONParse),
/* harmony export */   setOnAny: () => (/* binding */ setOnAny),
/* harmony export */   setScriptAttributes: () => (/* binding */ setScriptAttributes),
/* harmony export */   shuffle: () => (/* binding */ shuffle),
/* harmony export */   sizeTupleToRtbSize: () => (/* binding */ sizeTupleToRtbSize),
/* harmony export */   sizeTupleToSizeString: () => (/* binding */ sizeTupleToSizeString),
/* harmony export */   sizesToSizeTuples: () => (/* binding */ sizesToSizeTuples),
/* harmony export */   sortByHighestCpm: () => (/* binding */ sortByHighestCpm),
/* harmony export */   timestamp: () => (/* binding */ timestamp),
/* harmony export */   transformAdServerTargetingObj: () => (/* binding */ transformAdServerTargetingObj),
/* harmony export */   triggerNurlWithCpm: () => (/* binding */ triggerNurlWithCpm),
/* harmony export */   triggerPixel: () => (/* binding */ triggerPixel),
/* harmony export */   uniques: () => (/* binding */ uniques),
/* harmony export */   unsupportedBidderMessage: () => (/* binding */ unsupportedBidderMessage),
/* harmony export */   waitForElementToLoad: () => (/* binding */ waitForElementToLoad)
/* harmony export */ });
/* harmony import */ var _config_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./config.js */ "./src/config.js");
/* harmony import */ var _constants_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./constants.js */ "./src/constants.js");
/* harmony import */ var _utils_promise_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./utils/promise.js */ "./src/utils/promise.js");
/* harmony import */ var dlv_index_js__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! dlv/index.js */ "../../node_modules/dlv/index.js");
/* harmony import */ var _utils_objects_js__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ./utils/objects.js */ "./src/utils/objects.js");
/* harmony import */ var dset__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! dset */ "../../node_modules/dset/dist/index.mjs");
/* harmony import */ var _utils_winDimensions_js__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(/*! ./utils/winDimensions.js */ "./src/utils/winDimensions.js");









const consoleExists = Boolean(window.console);
const consoleLogExists = Boolean(consoleExists && window.console.log);
const consoleInfoExists = Boolean(consoleExists && window.console.info);
const consoleWarnExists = Boolean(consoleExists && window.console.warn);
const consoleErrorExists = Boolean(consoleExists && window.console.error);
let eventEmitter;
function _setEventEmitter(emitFn) {
  // called from events.js - this hoop is to avoid circular imports
  eventEmitter = emitFn;
}
function emitEvent() {
  if (eventEmitter != null) {
    eventEmitter(...arguments);
  }
}

// this allows stubbing of utility functions that are used internally by other utility functions
const internal = {
  checkCookieSupport,
  createTrackPixelIframeHtml,
  getWindowSelf,
  getWindowTop,
  canAccessWindowTop,
  getWindowLocation,
  insertUserSyncIframe,
  insertElement,
  isFn: _utils_objects_js__WEBPACK_IMPORTED_MODULE_4__.isFn,
  triggerPixel,
  logError,
  logWarn,
  logMessage,
  logInfo,
  parseQS,
  formatQS,
  deepEqual
};
const prebidInternal = {};
/**
 * Returns object that is used as internal prebid namespace
 */
function getPrebidInternal() {
  return prebidInternal;
}

/* utility method to get incremental integer starting from 1 */
var getIncrementalInteger = function () {
  var count = 0;
  return function () {
    count++;
    return count;
  };
}();

// generate a random string (to be used as a dynamic JSONP callback)
function getUniqueIdentifierStr() {
  return getIncrementalInteger() + Math.random().toString(16).substr(2);
}

/**
 * Returns a random v4 UUID of the form xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx,
 * where each x is replaced with a random hexadecimal digit from 0 to f,
 * and y is replaced with a random hexadecimal digit from 8 to b.
 * https://gist.github.com/jed/982883 via node-uuid
 */
function generateUUID(placeholder) {
  return placeholder ? (placeholder ^ _getRandomData() >> placeholder / 4).toString(16) : ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, generateUUID);
}

/**
 * Returns random data using the Crypto API if available and Math.random if not
 * Method is from https://gist.github.com/jed/982883 like generateUUID, direct link https://gist.github.com/jed/982883#gistcomment-45104
 */
function _getRandomData() {
  if (window && window.crypto && window.crypto.getRandomValues) {
    return crypto.getRandomValues(new Uint8Array(1))[0] % 16;
  } else {
    return Math.random() * 16;
  }
}
function getBidIdParameter(key, paramsObj) {
  return (paramsObj === null || paramsObj === void 0 ? void 0 : paramsObj[key]) || '';
}

// parse a query string object passed in bid params
// bid params should be an object such as {key: "value", key1 : "value1"}
// aliases to formatQS
function parseQueryStringParameters(queryObj) {
  let result = '';
  for (var k in queryObj) {
    if (queryObj.hasOwnProperty(k)) {
      result += k + '=' + encodeURIComponent(queryObj[k]) + '&';
    }
  }
  result = result.replace(/&$/, '');
  return result;
}

// transform an AdServer targeting bids into a query string to send to the adserver
function transformAdServerTargetingObj(targeting) {
  // we expect to receive targeting for a single slot at a time
  if (targeting && Object.getOwnPropertyNames(targeting).length > 0) {
    return Object.keys(targeting).map(key => "".concat(key, "=").concat(encodeURIComponent(targeting[key]))).join('&');
  } else {
    return '';
  }
}

/**
 * Parse a GPT-Style general size Array like `[[300, 250]]` or `"300x250,970x90"` into an array of width, height tuples `[[300, 250]]` or '[[300,250], [970,90]]'
 */
function sizesToSizeTuples(sizes) {
  if (typeof sizes === 'string') {
    // multiple sizes will be comma-separated
    return sizes.split(/\s*,\s*/).map(sz => sz.match(/^(\d+)x(\d+)$/i)).filter(match => match).map(_ref => {
      let [_, w, h] = _ref;
      return [parseInt(w, 10), parseInt(h, 10)];
    });
  } else if (Array.isArray(sizes)) {
    if (isValidGPTSingleSize(sizes)) {
      return [sizes];
    }
    return sizes.filter(isValidGPTSingleSize);
  }
  return [];
}

/**
 * Parse a GPT-Style general size Array like `[[300, 250]]` or `"300x250,970x90"` into an array of sizes `["300x250"]` or '['300x250', '970x90']'
 * @param  {(Array.<number[]>|Array.<number>)} sizeObj Input array or double array [300,250] or [[300,250], [728,90]]
 * @return {Array.<string>}  Array of strings like `["300x250"]` or `["300x250", "728x90"]`
 */
function parseSizesInput(sizeObj) {
  return sizesToSizeTuples(sizeObj).map(sizeTupleToSizeString);
}
function sizeTupleToSizeString(size) {
  return size[0] + 'x' + size[1];
}

// Parse a GPT style single size array, (i.e [300, 250])
// into an AppNexus style string, (i.e. 300x250)
function parseGPTSingleSizeArray(singleSize) {
  if (isValidGPTSingleSize(singleSize)) {
    return sizeTupleToSizeString(singleSize);
  }
}
function sizeTupleToRtbSize(size) {
  return {
    w: size[0],
    h: size[1]
  };
}

// Parse a GPT style single size array, (i.e [300, 250])
// into OpenRTB-compatible (imp.banner.w/h, imp.banner.format.w/h, imp.video.w/h) object(i.e. {w:300, h:250})
function parseGPTSingleSizeArrayToRtbSize(singleSize) {
  if (isValidGPTSingleSize(singleSize)) {
    return sizeTupleToRtbSize(singleSize);
  }
}
function isValidGPTSingleSize(singleSize) {
  // if we aren't exactly 2 items in this array, it is invalid
  return (0,_utils_objects_js__WEBPACK_IMPORTED_MODULE_4__.isArray)(singleSize) && singleSize.length === 2 && !isNaN(singleSize[0]) && !isNaN(singleSize[1]);
}
function getWindowTop() {
  return window.top;
}
function getWindowSelf() {
  return window.self;
}
function getWindowLocation() {
  return window.location;
}
function getDocument() {
  return document;
}
function canAccessWindowTop() {
  try {
    if (internal.getWindowTop().location.href) {
      return true;
    }
  } catch (e) {
    return false;
  }
}

/**
 * Wrappers to console.(log | info | warn | error). Takes N arguments, the same as the native methods
 */
// eslint-disable-next-line no-restricted-syntax
function logMessage() {
  if (debugTurnedOn() && consoleLogExists) {
    // eslint-disable-next-line no-console
    console.log.apply(console, decorateLog(arguments, 'MESSAGE:'));
  }
}

// eslint-disable-next-line no-restricted-syntax
function logInfo() {
  if (debugTurnedOn() && consoleInfoExists) {
    // eslint-disable-next-line no-console
    console.info.apply(console, decorateLog(arguments, 'INFO:'));
  }
}

// eslint-disable-next-line no-restricted-syntax
function logWarn() {
  if (debugTurnedOn() && consoleWarnExists) {
    // eslint-disable-next-line no-console
    console.warn.apply(console, decorateLog(arguments, 'WARNING:'));
  }
  emitEvent(_constants_js__WEBPACK_IMPORTED_MODULE_1__.EVENTS.AUCTION_DEBUG, {
    type: 'WARNING',
    arguments: arguments
  });
}

// eslint-disable-next-line no-restricted-syntax
function logError() {
  if (debugTurnedOn() && consoleErrorExists) {
    // eslint-disable-next-line no-console
    console.error.apply(console, decorateLog(arguments, 'ERROR:'));
  }
  emitEvent(_constants_js__WEBPACK_IMPORTED_MODULE_1__.EVENTS.AUCTION_DEBUG, {
    type: 'ERROR',
    arguments: arguments
  });
}
function prefixLog(prefix) {
  function decorate(fn) {
    return function () {
      for (var _len = arguments.length, args = new Array(_len), _key = 0; _key < _len; _key++) {
        args[_key] = arguments[_key];
      }
      fn(prefix, ...args);
    };
  }
  return {
    logError: decorate(logError),
    logWarn: decorate(logWarn),
    logMessage: decorate(logMessage),
    logInfo: decorate(logInfo)
  };
}
function decorateLog(args, prefix) {
  args = [].slice.call(args);
  const bidder = _config_js__WEBPACK_IMPORTED_MODULE_0__.config.getCurrentBidder();
  prefix && args.unshift(prefix);
  if (bidder) {
    args.unshift(label('#aaa'));
  }
  args.unshift(label('#3b88c3'));
  args.unshift('%cPrebid' + (bidder ? "%c".concat(bidder) : ''));
  return args;
  function label(color) {
    return "display: inline-block; color: #fff; background: ".concat(color, "; padding: 1px 4px; border-radius: 3px;");
  }
}
function hasConsoleLogger() {
  return consoleLogExists;
}
function debugTurnedOn() {
  return !!_config_js__WEBPACK_IMPORTED_MODULE_0__.config.getConfig('debug');
}
const createIframe = (() => {
  const DEFAULTS = {
    border: '0px',
    hspace: '0',
    vspace: '0',
    marginWidth: '0',
    marginHeight: '0',
    scrolling: 'no',
    frameBorder: '0',
    allowtransparency: 'true'
  };
  return function (doc, attrs) {
    let style = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};
    const f = doc.createElement('iframe');
    Object.assign(f, Object.assign({}, DEFAULTS, attrs));
    Object.assign(f.style, style);
    return f;
  };
})();
function createInvisibleIframe() {
  return createIframe(document, {
    id: getUniqueIdentifierStr(),
    width: 0,
    height: 0,
    src: 'about:blank'
  }, {
    display: 'none',
    height: '0px',
    width: '0px',
    border: '0px'
  });
}

/*
 *   Check if a given parameter name exists in query string
 *   and if it does return the value
 */
function getParameterByName(name) {
  return parseQS(getWindowLocation().search)[name] || '';
}

/**
 * Return if the object is "empty";
 * this includes falsey, no keys, or no items at indices
 * @param {*} object object to test
 * @return {Boolean} if object is empty
 */
function isEmpty(object) {
  if (!object) return true;
  if ((0,_utils_objects_js__WEBPACK_IMPORTED_MODULE_4__.isArray)(object) || (0,_utils_objects_js__WEBPACK_IMPORTED_MODULE_4__.isStr)(object)) {
    return !(object.length > 0);
  }
  return Object.keys(object).length <= 0;
}

/**
 * Return if string is empty, null, or undefined
 * @param str string to test
 * @returns {boolean} if string is empty
 */
function isEmptyStr(str) {
  return (0,_utils_objects_js__WEBPACK_IMPORTED_MODULE_4__.isStr)(str) && (!str || str.length === 0);
}

/**
 * Iterate object with the function
 * falls back to es5 `forEach`
 * @param {Array|Object} object
 * @param {Function} fn - The function to execute for each element. It receives three arguments: value, key, and the original object.
 * @returns {void}
 */
function _each(object, fn) {
  if ((0,_utils_objects_js__WEBPACK_IMPORTED_MODULE_4__.isFn)(object === null || object === void 0 ? void 0 : object.forEach)) return object.forEach(fn, this);
  Object.entries(object || {}).forEach(_ref2 => {
    let [k, v] = _ref2;
    return fn.call(this, v, k);
  });
}
function contains(a, obj) {
  return (0,_utils_objects_js__WEBPACK_IMPORTED_MODULE_4__.isFn)(a === null || a === void 0 ? void 0 : a.includes) && a.includes(obj);
}

/**
 * Map an array or object into another array
 * given a function
 * @param {Array|Object} object
 * @param {Function} callback - The function to execute for each element. It receives three arguments: value, key, and the original object.
 * @return {Array}
 */
function _map(object, callback) {
  if ((0,_utils_objects_js__WEBPACK_IMPORTED_MODULE_4__.isFn)(object === null || object === void 0 ? void 0 : object.map)) return object.map(callback);
  return Object.entries(object || {}).map(_ref3 => {
    let [k, v] = _ref3;
    return callback(v, k, object);
  });
}

/*
* Inserts an element(elm) as targets child, by default as first child
* @param {HTMLElement} elm
* @param {HTMLElement} [doc]
* @param {HTMLElement} [target]
* @param {Boolean} [asLastChildChild]
* @return {HTML Element}
*/
function insertElement(elm, doc, target, asLastChildChild) {
  doc = doc || document;
  let parentEl;
  if (target) {
    parentEl = doc.getElementsByTagName(target);
  } else {
    parentEl = doc.getElementsByTagName('head');
  }
  try {
    parentEl = parentEl.length ? parentEl : doc.getElementsByTagName('body');
    if (parentEl.length) {
      parentEl = parentEl[0];
      const insertBeforeEl = asLastChildChild ? null : parentEl.firstChild;
      return parentEl.insertBefore(elm, insertBeforeEl);
    }
  } catch (e) {}
}

/**
 * Returns a promise that completes when the given element triggers a 'load' or 'error' DOM event, or when
 * `timeout` milliseconds have elapsed.
 *
 * @param {HTMLElement} element
 * @param {Number} [timeout]
 * @returns {Promise}
 */
function waitForElementToLoad(element, timeout) {
  let timer = null;
  return new _utils_promise_js__WEBPACK_IMPORTED_MODULE_2__.PbPromise(resolve => {
    const onLoad = function () {
      element.removeEventListener('load', onLoad);
      element.removeEventListener('error', onLoad);
      if (timer != null) {
        window.clearTimeout(timer);
      }
      resolve();
    };
    element.addEventListener('load', onLoad);
    element.addEventListener('error', onLoad);
    if (timeout != null) {
      timer = window.setTimeout(onLoad, timeout);
    }
  });
}

/**
 * Inserts an image pixel with the specified `url` for cookie sync
 * @param {string} url URL string of the image pixel to load
 * @param  {function} [done] an optional exit callback, used when this usersync pixel is added during an async process
 * @param  {Number} [timeout] an optional timeout in milliseconds for the image to load before calling `done`
 */
function triggerPixel(url, done, timeout) {
  const img = new Image();
  if (done && internal.isFn(done)) {
    waitForElementToLoad(img, timeout).then(done);
  }
  img.src = url;
}

/**
 * Inserts an empty iframe with the specified `html`, primarily used for tracking purposes
 * (though could be for other purposes)
 * @param {string} htmlCode snippet of HTML code used for tracking purposes
 */
function insertHtmlIntoIframe(htmlCode) {
  if (!htmlCode) {
    return;
  }
  const iframe = createInvisibleIframe();
  internal.insertElement(iframe, document, 'body');
  (doc => {
    doc.open();
    doc.write(htmlCode);
    doc.close();
  })(iframe.contentWindow.document);
}

/**
 * Inserts empty iframe with the specified `url` for cookie sync
 * @param  {string} url URL to be requested
 * @param  {function} [done] an optional exit callback, used when this usersync pixel is added during an async process
 * @param  {Number} [timeout] an optional timeout in milliseconds for the iframe to load before calling `done`
 */
function insertUserSyncIframe(url, done, timeout) {
  const iframeHtml = internal.createTrackPixelIframeHtml(url, false, 'allow-scripts allow-same-origin');
  const div = document.createElement('div');
  div.innerHTML = iframeHtml;
  const iframe = div.firstChild;
  if (done && internal.isFn(done)) {
    waitForElementToLoad(iframe, timeout).then(done);
  }
  internal.insertElement(iframe, document, 'html', true);
}

/**
 * Creates a snippet of HTML that retrieves the specified `url`
 * @param  {string} url URL to be requested
 * @param encode
 * @return {string}     HTML snippet that contains the img src = set to `url`
 */
function createTrackPixelHtml(url) {
  let encode = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : encodeURI;
  if (!url) {
    return '';
  }
  const escapedUrl = encode(url);
  let img = '<div style="position:absolute;left:0px;top:0px;visibility:hidden;">';
  img += '<img src="' + escapedUrl + '"></div>';
  return img;
}
;

/**
 * encodeURI, but preserves macros of the form '${MACRO}' (e.g. '${AUCTION_PRICE}')
 * @param url
 * @return {string}
 */
function encodeMacroURI(url) {
  const macros = Array.from(url.matchAll(/\$({[^}]+})/g)).map(match => match[1]);
  return macros.reduce((str, macro) => {
    return str.replace('$' + encodeURIComponent(macro), '$' + macro);
  }, encodeURI(url));
}

/**
 * Creates a snippet of Iframe HTML that retrieves the specified `url`
 * @param  {string} url plain URL to be requested
 * @param  {string} encodeUri boolean if URL should be encoded before inserted. Defaults to true
 * @param  {string} sandbox string if provided the sandbox attribute will be included with the given value
 * @return {string}     HTML snippet that contains the iframe src = set to `url`
 */
function createTrackPixelIframeHtml(url) {
  let encodeUri = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : true;
  let sandbox = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : '';
  if (!url) {
    return '';
  }
  if (encodeUri) {
    url = encodeURI(url);
  }
  if (sandbox) {
    sandbox = "sandbox=\"".concat(sandbox, "\"");
  }
  return "<iframe ".concat(sandbox, " id=\"").concat(getUniqueIdentifierStr(), "\"\n      frameborder=\"0\"\n      allowtransparency=\"true\"\n      marginheight=\"0\" marginwidth=\"0\"\n      width=\"0\" hspace=\"0\" vspace=\"0\" height=\"0\"\n      style=\"height:0px;width:0px;display:none;\"\n      scrolling=\"no\"\n      src=\"").concat(url, "\">\n    </iframe>");
}
function uniques(value, index, arry) {
  return arry.indexOf(value) === index;
}
function flatten(a, b) {
  return a.concat(b);
}
function getBidRequest(id, bidderRequests) {
  if (!id) {
    return;
  }
  return bidderRequests.flatMap(br => br.bids).find(bid => ['bidId', 'adId', 'bid_id'].some(prop => bid[prop] === id));
}
function getValue(obj, key) {
  return obj[key];
}
function getBidderCodes(adUnits) {
  // this could memoize adUnits
  return adUnits.map(unit => unit.bids.map(bid => bid.bidder).reduce(flatten, [])).reduce(flatten, []).filter(bidder => typeof bidder !== 'undefined').filter(uniques);
}
function isGptPubadsDefined() {
  if (window.googletag && (0,_utils_objects_js__WEBPACK_IMPORTED_MODULE_4__.isFn)(window.googletag.pubads) && (0,_utils_objects_js__WEBPACK_IMPORTED_MODULE_4__.isFn)(window.googletag.pubads().getSlots)) {
    return true;
  }
}
function isApnGetTagDefined() {
  if (window.apntag && (0,_utils_objects_js__WEBPACK_IMPORTED_MODULE_4__.isFn)(window.apntag.getTag)) {
    return true;
  }
}
const sortByHighestCpm = (a, b) => {
  return b.cpm - a.cpm;
};

/**
 * Fisher–Yates shuffle
 * http://stackoverflow.com/a/6274398
 * https://bost.ocks.org/mike/shuffle/
 * istanbul ignore next
 */
function shuffle(array) {
  let counter = array.length;

  // while there are elements in the array
  while (counter > 0) {
    // pick a random index
    const index = Math.floor(Math.random() * counter);

    // decrease counter by 1
    counter--;

    // and swap the last element with it
    const temp = array[counter];
    array[counter] = array[index];
    array[index] = temp;
  }
  return array;
}
function inIframe() {
  try {
    return internal.getWindowSelf() !== internal.getWindowTop();
  } catch (e) {
    return true;
  }
}

/**
 * https://iabtechlab.com/wp-content/uploads/2016/03/SafeFrames_v1.1_final.pdf
 */
function isSafeFrameWindow() {
  if (!inIframe()) {
    return false;
  }
  const ws = internal.getWindowSelf();
  return !!(ws.$sf && ws.$sf.ext);
}

/**
 * Returns the result of calling the function $sf.ext.geom() if it exists
 * @see https://iabtechlab.com/wp-content/uploads/2016/03/SafeFrames_v1.1_final.pdf — 5.4 Function $sf.ext.geom
 * @returns {Object | undefined} geometric information about the container
 */
function getSafeframeGeometry() {
  try {
    const ws = getWindowSelf();
    return typeof ws.$sf.ext.geom === 'function' ? ws.$sf.ext.geom() : undefined;
  } catch (e) {
    logError('Error getting SafeFrame geometry', e);
    return undefined;
  }
}
function isSafariBrowser() {
  return /^((?!chrome|android|crios|fxios).)*safari/i.test(navigator.userAgent);
}
function replaceMacros(str, subs) {
  if (!str) return;
  return Object.entries(subs).reduce((str, _ref4) => {
    let [key, val] = _ref4;
    return str.replace(new RegExp('\\$\\{' + key + '\\}', 'g'), val || '');
  }, str);
}
function replaceAuctionPrice(str, cpm) {
  return replaceMacros(str, {
    AUCTION_PRICE: cpm
  });
}
function replaceClickThrough(str, clicktag) {
  if (!str || !clicktag || typeof clicktag !== 'string') return;
  return str.replace(/\${CLICKTHROUGH}/g, clicktag);
}
function timestamp() {
  return new Date().getTime();
}

/**
 * The returned value represents the time elapsed since the time origin. @see https://developer.mozilla.org/en-US/docs/Web/API/Performance/now
 * @returns {number}
 */
function getPerformanceNow() {
  return window.performance && window.performance.now && window.performance.now() || 0;
}

/**
 * Retuns the difference between `timing.domLoading` and `timing.navigationStart`.
 * This function uses the deprecated `Performance.timing` API and should be removed in future.
 * It has not been updated yet because it is still used in some modules.
 * @deprecated
 * @param {Window} w The window object used to perform the api call. default to window.self
 * @returns {number}
 */
function getDomLoadingDuration(w) {
  var _w$performance;
  let domLoadingDuration = -1;
  w = w || getWindowSelf();
  const performance = w.performance;
  if ((_w$performance = w.performance) !== null && _w$performance !== void 0 && _w$performance.timing) {
    if (w.performance.timing.navigationStart > 0) {
      const val = performance.timing.domLoading - performance.timing.navigationStart;
      if (val > 0) {
        domLoadingDuration = val;
      }
    }
  }
  return domLoadingDuration;
}

/**
 * When the deviceAccess flag config option is false, no cookies should be read or set
 * @returns {boolean}
 */
function hasDeviceAccess() {
  return _config_js__WEBPACK_IMPORTED_MODULE_0__.config.getConfig('deviceAccess') !== false;
}

/**
 * @returns {(boolean|undefined)}
 */
function checkCookieSupport() {
  // eslint-disable-next-line no-restricted-properties
  if (window.navigator.cookieEnabled || !!document.cookie.length) {
    return true;
  }
}

/**
 * Given a function, return a function which only executes the original after
 * it's been called numRequiredCalls times.
 *
 * Note that the arguments from the previous calls will *not* be forwarded to the original function.
 * Only the final call's arguments matter.
 *
 * @param {function} func The function which should be executed, once the returned function has been executed
 *   numRequiredCalls times.
 * @param {number} numRequiredCalls The number of times which the returned function needs to be called before
 *   func is.
 */
function delayExecution(func, numRequiredCalls) {
  if (numRequiredCalls < 1) {
    throw new Error("numRequiredCalls must be a positive number. Got ".concat(numRequiredCalls));
  }
  let numCalls = 0;
  return function () {
    numCalls++;
    if (numCalls === numRequiredCalls) {
      func.apply(this, arguments);
    }
  };
}

/**
 * https://stackoverflow.com/a/34890276/428704
 * @param {Array} xs
 * @param {string} key
 * @returns {Object} {${key_value}: ${groupByArray}, key_value: {groupByArray}}
 */
function groupBy(xs, key) {
  return xs.reduce(function (rv, x) {
    (rv[x[key]] = rv[x[key]] || []).push(x);
    return rv;
  }, {});
}

/**
 * Validates an adunit's `mediaTypes` parameter
 * @param mediaTypes mediaTypes parameter to validate
 * @return If object is valid
 */
function isValidMediaTypes(mediaTypes) {
  const SUPPORTED_MEDIA_TYPES = ['banner', 'native', 'video', 'audio'];
  const SUPPORTED_STREAM_TYPES = ['instream', 'outstream', 'adpod'];
  const types = Object.keys(mediaTypes);
  if (!types.every(type => SUPPORTED_MEDIA_TYPES.includes(type))) {
    return false;
  }
  if ( true && mediaTypes.video && mediaTypes.video.context) {
    return SUPPORTED_STREAM_TYPES.includes(mediaTypes.video.context);
  }
  return true;
}

/**
 * Returns user configured bidder params from adunit
 * @param {Object} adUnits
 * @param {string} adUnitCode code
 * @param {string} bidder code
 * @return {Array} user configured param for the given bidder adunit configuration
 */
function getUserConfiguredParams(adUnits, adUnitCode, bidder) {
  return adUnits.filter(adUnit => adUnit.code === adUnitCode).flatMap(adUnit => adUnit.bids).filter(bidderData => bidderData.bidder === bidder).map(bidderData => bidderData.params || {});
}
const compareCodeAndSlot = (slot, adUnitCode) => slot.getAdUnitPath() === adUnitCode || slot.getSlotElementId() === adUnitCode;

/**
 * Returns filter function to match adUnitCode in slot
 * @param slot GoogleTag slot
 * @return filter function
 */
function isAdUnitCodeMatchingSlot(slot) {
  return adUnitCode => compareCodeAndSlot(slot, adUnitCode);
}

/**
 * Constructs warning message for when unsupported bidders are dropped from an adunit
 * @param {Object} adUnit ad unit from which the bidder is being dropped
 * @param {string} bidder bidder code that is not compatible with the adUnit
 * @return {string} warning message to display when condition is met
 */
function unsupportedBidderMessage(adUnit, bidder) {
  const mediaType = Object.keys(adUnit.mediaTypes || {
    'banner': 'banner'
  }).join(', ');
  return "\n    ".concat(adUnit.code, " is a ").concat(mediaType, " ad unit\n    containing bidders that don't support ").concat(mediaType, ": ").concat(bidder, ".\n    This bidder won't fetch demand.\n  ");
}

/**
 * Returns a new object with undefined properties removed from given object
 * @param obj the object to clean
 */
function cleanObj(obj) {
  return Object.fromEntries(Object.entries(obj).filter(_ref5 => {
    let [_, v] = _ref5;
    return typeof v !== 'undefined';
  }));
}

/**
 * Create a new object with selected properties.  Also allows property renaming and transform functions.
 * @param obj the original object
 * @param properties An array of desired properties
 */
function pick(obj, properties) {
  if (typeof obj !== 'object') {
    return {};
  }
  return properties.reduce((newObj, prop, i) => {
    if (typeof prop === 'function') {
      return newObj;
    }
    let newProp = prop;
    const match = prop.match(/^(.+?)\sas\s(.+?)$/i);
    if (match) {
      prop = match[1];
      newProp = match[2];
    }
    let value = obj[prop];
    if (typeof properties[i + 1] === 'function') {
      value = properties[i + 1](value, newObj);
    }
    if (typeof value !== 'undefined') {
      newObj[newProp] = value;
    }
    return newObj;
  }, {});
}
function parseQS(query) {
  return !query ? {} : query.replace(/^\?/, '').split('&').reduce((acc, criteria) => {
    let [k, v] = criteria.split('=');
    if (/\[\]$/.test(k)) {
      k = k.replace('[]', '');
      acc[k] = acc[k] || [];
      acc[k].push(v);
    } else {
      acc[k] = v || '';
    }
    return acc;
  }, {});
}
function formatQS(query) {
  return Object.keys(query).map(k => Array.isArray(query[k]) ? query[k].map(v => "".concat(k, "[]=").concat(v)).join('&') : "".concat(k, "=").concat(query[k])).join('&');
}
function parseUrl(url, options) {
  const parsed = document.createElement('a');
  if (options && 'noDecodeWholeURL' in options && options.noDecodeWholeURL) {
    parsed.href = url;
  } else {
    parsed.href = decodeURIComponent(url);
  }
  // in window.location 'search' is string, not object
  const qsAsString = options && 'decodeSearchAsString' in options && options.decodeSearchAsString;
  return {
    href: parsed.href,
    protocol: (parsed.protocol || '').replace(/:$/, ''),
    hostname: parsed.hostname,
    port: +parsed.port,
    pathname: parsed.pathname.replace(/^(?!\/)/, '/'),
    search: qsAsString ? parsed.search : internal.parseQS(parsed.search || ''),
    hash: (parsed.hash || '').replace(/^#/, ''),
    host: parsed.host || window.location.host
  };
}
function buildUrl(obj) {
  return (obj.protocol || 'http') + '://' + (obj.host || obj.hostname + (obj.port ? ":".concat(obj.port) : '')) + (obj.pathname || '') + (obj.search ? "?".concat(internal.formatQS(obj.search || '')) : '') + (obj.hash ? "#".concat(obj.hash) : '');
}

/**
 * This function deeply compares two objects checking for their equivalence.
 * @param {Object} obj1
 * @param {Object} obj2
 * @param {Object} [options] - Options for comparison.
 * @param {boolean} [options.checkTypes=false] - If set, two objects with identical properties but different constructors will *not* be considered equivalent.
 * @returns {boolean} - Returns `true` if the objects are equivalent, `false` otherwise.
 */
function deepEqual(obj1, obj2) {
  let {
    checkTypes = false
  } = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};
  // Quick reference check
  if (obj1 === obj2) return true;

  // If either is null or not an object, do a direct equality check
  if (typeof obj1 !== 'object' || obj1 === null || typeof obj2 !== 'object' || obj2 === null) {
    return false;
  }
  // Cache the Array checks
  const isArr1 = Array.isArray(obj1);
  const isArr2 = Array.isArray(obj2);
  // Special case: both are arrays
  if (isArr1 && isArr2) {
    if (obj1.length !== obj2.length) return false;
    for (let i = 0; i < obj1.length; i++) {
      if (!deepEqual(obj1[i], obj2[i], {
        checkTypes
      })) {
        return false;
      }
    }
    return true;
  } else if (isArr1 || isArr2) {
    return false;
  }

  // If we’re checking types, compare constructors (e.g., plain object vs. Date)
  if (checkTypes && obj1.constructor !== obj2.constructor) {
    return false;
  }

  // Compare object keys. Cache keys for both to avoid repeated calls.
  const keys1 = Object.keys(obj1);
  const keys2 = Object.keys(obj2);
  if (keys1.length !== keys2.length) return false;
  for (const key of keys1) {
    // If `obj2` doesn't have this key or sub-values aren't equal, bail out.
    if (!Object.prototype.hasOwnProperty.call(obj2, key)) {
      return false;
    }
    if (!deepEqual(obj1[key], obj2[key], {
      checkTypes
    })) {
      return false;
    }
  }
  return true;
}
function mergeDeep(target) {
  for (let i = 0; i < (arguments.length <= 1 ? 0 : arguments.length - 1); i++) {
    const source = i + 1 < 1 || arguments.length <= i + 1 ? undefined : arguments[i + 1];
    if (!(0,_utils_objects_js__WEBPACK_IMPORTED_MODULE_4__.isPlainObject)(source)) {
      continue;
    }
    mergeDeepHelper(target, source);
  }
  return target;
}
function mergeDeepHelper(target, source) {
  // quick check
  if (!(0,_utils_objects_js__WEBPACK_IMPORTED_MODULE_4__.isPlainObject)(target) || !(0,_utils_objects_js__WEBPACK_IMPORTED_MODULE_4__.isPlainObject)(source)) {
    return;
  }
  const keys = Object.keys(source);
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    if (key === '__proto__' || key === 'constructor') {
      continue;
    }
    const val = source[key];
    if ((0,_utils_objects_js__WEBPACK_IMPORTED_MODULE_4__.isPlainObject)(val)) {
      if (!target[key]) {
        target[key] = {};
      }
      mergeDeepHelper(target[key], val);
    } else if (Array.isArray(val)) {
      if (!Array.isArray(target[key])) {
        target[key] = [...val];
      } else {
        // deduplicate
        val.forEach(obj => {
          if (!target[key].some(item => deepEqual(item, obj))) {
            target[key].push(obj);
          }
        });
      }
    } else {
      // direct assignment
      target[key] = val;
    }
  }
}

/**
 * returns a hash of a string using a fast algorithm
 * source: https://stackoverflow.com/a/52171480/845390
 * @param str
 * @param seed (optional)
 * @returns {string}
 */
function cyrb53Hash(str) {
  let seed = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 0;
  // IE doesn't support imul
  // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/imul#Polyfill
  const imul = function (opA, opB) {
    if ((0,_utils_objects_js__WEBPACK_IMPORTED_MODULE_4__.isFn)(Math.imul)) {
      return Math.imul(opA, opB);
    } else {
      opB |= 0; // ensure that opB is an integer. opA will automatically be coerced.
      // floating points give us 53 bits of precision to work with plus 1 sign bit
      // automatically handled for our convienence:
      // 1. 0x003fffff /*opA & 0x000fffff*/ * 0x7fffffff /*opB*/ = 0x1fffff7fc00001
      //    0x1fffff7fc00001 < Number.MAX_SAFE_INTEGER /*0x1fffffffffffff*/
      var result = (opA & 0x003fffff) * opB;
      // 2. We can remove an integer coersion from the statement above because:
      //    0x1fffff7fc00001 + 0xffc00000 = 0x1fffffff800001
      //    0x1fffffff800001 < Number.MAX_SAFE_INTEGER /*0x1fffffffffffff*/
      if (opA & 0xffc00000) result += (opA & 0xffc00000) * opB | 0;
      return result | 0;
    }
  };
  let h1 = 0xdeadbeef ^ seed;
  let h2 = 0x41c6ce57 ^ seed;
  for (let i = 0, ch; i < str.length; i++) {
    ch = str.charCodeAt(i);
    h1 = imul(h1 ^ ch, 2654435761);
    h2 = imul(h2 ^ ch, 1597334677);
  }
  h1 = imul(h1 ^ h1 >>> 16, 2246822507) ^ imul(h2 ^ h2 >>> 13, 3266489909);
  h2 = imul(h2 ^ h2 >>> 16, 2246822507) ^ imul(h1 ^ h1 >>> 13, 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString();
}

/**
 * returns the result of `JSON.parse(data)`, or undefined if that throws an error.
 * @param data
 * @returns {any}
 */
function safeJSONParse(data) {
  try {
    return JSON.parse(data);
  } catch (e) {}
}
function safeJSONEncode(data) {
  try {
    return JSON.stringify(data);
  } catch (e) {
    return '';
  }
}

/**
 * Returns a memoized version of `fn`.
 *
 * @param fn
 * @param key cache key generator, invoked with the same arguments passed to `fn`.
 *        By default, the first argument is used as key.
 * @return {*}
 */
function memoize(fn) {
  let key = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : function (arg) {
    return arg;
  };
  const cache = new Map();
  const memoized = function () {
    const cacheKey = key.apply(this, arguments);
    if (!cache.has(cacheKey)) {
      cache.set(cacheKey, fn.apply(this, arguments));
    }
    return cache.get(cacheKey);
  };
  memoized.clear = cache.clear.bind(cache);
  return memoized;
}

/**
 * Returns a Unix timestamp for given time value and unit.
 * @param {number} timeValue numeric value, defaults to 0 (which means now)
 * @param {string} timeUnit defaults to days (or 'd'), use 'm' for minutes. Any parameter that isn't 'd' or 'm' will return Date.now().
 * @returns {number}
 */
function getUnixTimestampFromNow() {
  let timeValue = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 0;
  let timeUnit = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 'd';
  const acceptableUnits = ['m', 'd'];
  if (acceptableUnits.indexOf(timeUnit) < 0) {
    return Date.now();
  }
  const multiplication = timeValue / (timeUnit === 'm' ? 1440 : 1);
  return Date.now() + (timeValue && timeValue > 0 ? 1000 * 60 * 60 * 24 * multiplication : 0);
}

/**
 * Converts given object into an array, so {key: 1, anotherKey: 'fred', third: ['fred']} is turned
 * into [{key: 1}, {anotherKey: 'fred'}, {third: ['fred']}]
 * @param {Object} obj the object
 * @returns {Array}
 */
function convertObjectToArray(obj) {
  return Object.keys(obj).map(key => {
    return {
      [key]: obj[key]
    };
  });
}

/**
 * Sets dataset attributes on a script
 * @param {HTMLScriptElement} script
 * @param {object} attributes
 */
function setScriptAttributes(script, attributes) {
  Object.entries(attributes).forEach(_ref6 => {
    let [k, v] = _ref6;
    return script.setAttribute(k, v);
  });
}

/**
 * Perform a binary search for `el` on an ordered array `arr`.
 *
 * @returns the lowest nonnegative integer I that satisfies:
 *   key(arr[i]) >= key(el) for each i between I and arr.length
 *
 *   (if one or more matches are found for `el`, returns the index of the first;
 *   if the element is not found, return the index of the first element that's greater;
 *   if no greater element exists, return `arr.length`)
 */
function binarySearch(arr, el) {
  let key = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : el => el;
  let left = 0;
  let right = arr.length && arr.length - 1;
  const target = key(el);
  while (right - left > 1) {
    const middle = left + Math.round((right - left) / 2);
    if (target > key(arr[middle])) {
      left = middle;
    } else {
      right = middle;
    }
  }
  while (arr.length > left && target > key(arr[left])) {
    left++;
  }
  return left;
}

/**
 * Checks if an object has non-serializable properties.
 * Non-serializable properties are functions and RegExp objects.
 *
 * @param {Object} obj - The object to check.
 * @param {Set} checkedObjects - A set of properties that have already been checked.
 * @returns {boolean} - Returns true if the object has non-serializable properties, false otherwise.
 */
function hasNonSerializableProperty(obj) {
  let checkedObjects = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : new Set();
  for (const key in obj) {
    const value = obj[key];
    const type = typeof value;
    if (value === undefined || type === 'function' || type === 'symbol' || value instanceof RegExp || value instanceof Map || value instanceof Set || value instanceof Date || value !== null && type === 'object' && value.hasOwnProperty('toJSON')) {
      return true;
    }
    if (value !== null && type === 'object' && value.constructor === Object) {
      if (checkedObjects.has(value)) {
        // circular reference, means we have a non-serializable property
        return true;
      }
      checkedObjects.add(value);
      if (hasNonSerializableProperty(value, checkedObjects)) {
        return true;
      }
    }
  }
  return false;
}

/**
 * Returns the value of a nested property in an array of objects.
 *
 * @param {Array} collection - Array of objects.
 * @param {String} key - Key of nested property.
 * @returns {any|undefined} - Value of nested property.
 */
function setOnAny(collection, key) {
  for (let i = 0, result; i < collection.length; i++) {
    result = (0,dlv_index_js__WEBPACK_IMPORTED_MODULE_3__["default"])(collection[i], key);
    if (result) {
      return result;
    }
  }
  return undefined;
}
function extractDomainFromHost(pageHost) {
  let domain = null;
  try {
    const domains = /[-\w]+\.([-\w]+|[-\w]{3,}|[-\w]{1,3}\.[-\w]{2})$/i.exec(pageHost);
    if (domains != null && domains.length > 0) {
      domain = domains[0];
      for (let i = 1; i < domains.length; i++) {
        if (domains[i].length > domain.length) {
          domain = domains[i];
        }
      }
    }
  } catch (e) {
    domain = null;
  }
  return domain;
}
function triggerNurlWithCpm(bid, cpm) {
  if ((0,_utils_objects_js__WEBPACK_IMPORTED_MODULE_4__.isStr)(bid.nurl) && bid.nurl !== '') {
    bid.nurl = bid.nurl.replace(/\${AUCTION_PRICE}/, cpm);
    triggerPixel(bid.nurl);
  }
}

// To ensure that isGzipCompressionSupported() doesn’t become an overhead, we have used memoization to cache the result after the first execution.
// This way, even if the function is called multiple times, it will only perform the actual check once and return the cached result in subsequent calls.
const isGzipCompressionSupported = function () {
  let cachedResult; // Store the result

  return function () {
    if (cachedResult !== undefined) {
      return cachedResult; // Return cached result if already computed
    }
    try {
      if (typeof window.CompressionStream === 'undefined') {
        cachedResult = false;
      } else {
        (() => new window.CompressionStream('gzip'))();
        cachedResult = true;
      }
    } catch (error) {
      cachedResult = false;
    }
    return cachedResult;
  };
}();

// Make sure to use isGzipCompressionSupported before calling this function
async function compressDataWithGZip(data) {
  if (typeof data !== 'string') {
    // TextEncoder (below) expects a string
    data = JSON.stringify(data);
  }
  const encoder = new TextEncoder();
  const encodedData = encoder.encode(data);
  const compressedStream = new Blob([encodedData]).stream().pipeThrough(new window.CompressionStream('gzip'));
  const compressedBlob = await new Response(compressedStream).blob();
  const compressedArrayBuffer = await compressedBlob.arrayBuffer();
  return new Uint8Array(compressedArrayBuffer);
}


/***/ }),

/***/ "./src/utils/cachedApiWrapper.js":
/*!***************************************!*\
  !*** ./src/utils/cachedApiWrapper.js ***!
  \***************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   CachedApiWrapper: () => (/* binding */ CachedApiWrapper)
/* harmony export */ });
function CachedApiWrapper(getTarget, props) {
  const wrapper = {};
  let data = {};
  const children = [];
  Object.entries(props).forEach(_ref => {
    let [key, value] = _ref;
    if (value != null && typeof value === 'object') {
      const child = new CachedApiWrapper(() => {
        var _getTarget;
        return (_getTarget = getTarget()) === null || _getTarget === void 0 ? void 0 : _getTarget[key];
      }, value);
      wrapper[key] = child.obj;
      children.push(child.reset);
    } else if (value === true) {
      Object.defineProperty(wrapper, key, {
        get() {
          if (!data.hasOwnProperty(key)) {
            var _getTarget2;
            data[key] = (_getTarget2 = getTarget()) === null || _getTarget2 === void 0 ? void 0 : _getTarget2[key];
          }
          return data[key];
        }
      });
    }
  });
  this.obj = wrapper;
  this.reset = function () {
    children.forEach(reset => reset());
    data = {};
  };
}


/***/ }),

/***/ "./src/utils/cpm.js":
/*!**************************!*\
  !*** ./src/utils/cpm.js ***!
  \**************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   adjustCpm: () => (/* binding */ adjustCpm)
/* harmony export */ });
/* harmony import */ var _auctionManager_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../auctionManager.js */ "./src/auctionManager.js");
/* harmony import */ var _bidderSettings_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../bidderSettings.js */ "./src/bidderSettings.js");
/* harmony import */ var _utils_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../utils.js */ "./src/utils.js");



function adjustCpm(cpm, bidResponse, bidRequest) {
  var _bidRequest;
  let {
    index = _auctionManager_js__WEBPACK_IMPORTED_MODULE_0__.auctionManager.index,
    bs = _bidderSettings_js__WEBPACK_IMPORTED_MODULE_1__.bidderSettings
  } = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : {};
  bidRequest = bidRequest || index.getBidRequest(bidResponse);
  const adapterCode = bidResponse === null || bidResponse === void 0 ? void 0 : bidResponse.adapterCode;
  const bidderCode = (bidResponse === null || bidResponse === void 0 ? void 0 : bidResponse.bidderCode) || ((_bidRequest = bidRequest) === null || _bidRequest === void 0 ? void 0 : _bidRequest.bidder);
  const adjustAlternateBids = bs.get(bidResponse === null || bidResponse === void 0 ? void 0 : bidResponse.adapterCode, 'adjustAlternateBids');
  const bidCpmAdjustment = bs.getOwn(bidderCode, 'bidCpmAdjustment') || bs.get(adjustAlternateBids ? adapterCode : bidderCode, 'bidCpmAdjustment');
  if (bidCpmAdjustment && typeof bidCpmAdjustment === 'function') {
    try {
      return bidCpmAdjustment(cpm, Object.assign({}, bidResponse), bidRequest);
    } catch (e) {
      (0,_utils_js__WEBPACK_IMPORTED_MODULE_2__.logError)('Error during bid adjustment', e);
    }
  }
  return cpm;
}


/***/ }),

/***/ "./src/utils/focusTimeout.js":
/*!***********************************!*\
  !*** ./src/utils/focusTimeout.js ***!
  \***********************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   setFocusTimeout: () => (/* binding */ setFocusTimeout)
/* harmony export */ });
/* unused harmony export reset */
let outOfFocusStart = null; // enforce null otherwise it could be undefined and the callback wouldn't execute
let timeOutOfFocus = 0;
let suspendedTimeouts = [];
function trackTimeOutOfFocus() {
  if (document.hidden) {
    outOfFocusStart = Date.now();
  } else {
    timeOutOfFocus += Date.now() - (outOfFocusStart !== null && outOfFocusStart !== void 0 ? outOfFocusStart : 0); // when the page is loaded in hidden state outOfFocusStart is undefined, which results in timeoutOffset being NaN
    outOfFocusStart = null;
    suspendedTimeouts.forEach(_ref => {
      let {
        callback,
        startTime,
        setTimerId
      } = _ref;
      return setTimerId(setFocusTimeout(callback, timeOutOfFocus - startTime)());
    });
    suspendedTimeouts = [];
  }
}
document.addEventListener('visibilitychange', trackTimeOutOfFocus);
function reset() {
  outOfFocusStart = null;
  timeOutOfFocus = 0;
  suspendedTimeouts = [];
  document.removeEventListener('visibilitychange', trackTimeOutOfFocus);
  document.addEventListener('visibilitychange', trackTimeOutOfFocus);
}

/**
 * Wraps native setTimeout function in order to count time only when page is focused
 *
 * @param {function(void): void} [callback] - A function that will be invoked after passed time
 * @param {number} [milliseconds] - Minimum duration (in milliseconds) that the callback will be executed after
 * @returns {function(): number} - Getter function for current timer id
 */
function setFocusTimeout(callback, milliseconds) {
  const startTime = timeOutOfFocus;
  let timerId = setTimeout(() => {
    if (timeOutOfFocus === startTime && outOfFocusStart == null) {
      callback();
    } else if (outOfFocusStart != null) {
      // case when timeout ended during page is out of focus
      suspendedTimeouts.push({
        callback,
        startTime,
        setTimerId(newId) {
          timerId = newId;
        }
      });
    } else {
      timerId = setFocusTimeout(callback, timeOutOfFocus - startTime)();
    }
  }, milliseconds);
  return () => timerId;
}


/***/ }),

/***/ "./src/utils/ipUtils.js":
/*!******************************!*\
  !*** ./src/utils/ipUtils.js ***!
  \******************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   scrubIPv4: () => (/* binding */ scrubIPv4),
/* harmony export */   scrubIPv6: () => (/* binding */ scrubIPv6)
/* harmony export */ });
function scrubIPv4(ip) {
  if (!ip) {
    return null;
  }
  const ones = 24;
  const ipParts = ip.split('.').map(Number);
  if (ipParts.length !== 4) {
    return null;
  }
  const mask = [];
  for (let i = 0; i < 4; i++) {
    const n = Math.max(0, Math.min(8, ones - i * 8));
    mask.push(0xff << 8 - n & 0xff);
  }
  const maskedIP = ipParts.map((part, i) => part & mask[i]);
  return maskedIP.join('.');
}
function scrubIPv6(ip) {
  if (!ip) {
    return null;
  }
  const ones = 64;
  let ipParts = ip.split(':').map(part => parseInt(part, 16));
  ipParts = ipParts.map(part => isNaN(part) ? 0 : part);
  while (ipParts.length < 8) {
    ipParts.push(0);
  }
  if (ipParts.length !== 8) {
    return null;
  }
  const mask = [];
  for (let i = 0; i < 8; i++) {
    const n = Math.max(0, Math.min(16, ones - i * 16));
    mask.push(0xffff << 16 - n & 0xffff);
  }
  const maskedIP = ipParts.map((part, i) => part & mask[i]);
  return maskedIP.map(part => part.toString(16)).join(':');
}


/***/ }),

/***/ "./src/utils/objects.js":
/*!******************************!*\
  !*** ./src/utils/objects.js ***!
  \******************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   deepClone: () => (/* binding */ deepClone),
/* harmony export */   getDefinedParams: () => (/* binding */ getDefinedParams),
/* harmony export */   isA: () => (/* binding */ isA),
/* harmony export */   isArray: () => (/* binding */ isArray),
/* harmony export */   isArrayOfNums: () => (/* binding */ isArrayOfNums),
/* harmony export */   isBoolean: () => (/* binding */ isBoolean),
/* harmony export */   isFn: () => (/* binding */ isFn),
/* harmony export */   isInteger: () => (/* binding */ isInteger),
/* harmony export */   isNumber: () => (/* binding */ isNumber),
/* harmony export */   isPlainObject: () => (/* binding */ isPlainObject),
/* harmony export */   isStr: () => (/* binding */ isStr)
/* harmony export */ });
/* harmony import */ var klona_json__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! klona/json */ "../../node_modules/klona/json/index.mjs");

function deepClone(obj) {
  return (0,klona_json__WEBPACK_IMPORTED_MODULE_0__.klona)(obj) || {};
}

/**
 * Build an object consisting of only defined parameters to avoid creating an
 * object with defined keys and undefined values.
 * @param object The object to pick defined params out of
 * @param params An array of strings representing properties to look for in the object
 * @returns An object containing all the specified values that are defined
 */
function getDefinedParams(object, params) {
  return params.filter(param => object[param]).reduce((bid, param) => Object.assign(bid, {
    [param]: object[param]
  }), {});
}
const tStr = 'String';
const tFn = 'Function';
const tNumb = 'Number';
const tObject = 'Object';
const tBoolean = 'Boolean';
const toString = Object.prototype.toString;

/**
 * Return if the object is of the
 * given type.
 * @param {*} object to test
 * @param {String} _t type string (e.g., Array)
 * @return {Boolean} if object is of type _t
 */
function isA(object, _t) {
  return toString.call(object) === '[object ' + _t + ']';
}
function isFn(object) {
  return isA(object, tFn);
}
function isStr(object) {
  return isA(object, tStr);
}
const isArray = Array.isArray.bind(Array);
function isNumber(object) {
  return isA(object, tNumb);
}
function isPlainObject(object) {
  return isA(object, tObject);
}
function isBoolean(object) {
  return isA(object, tBoolean);
}

/**
 * Checks input is integer or not
 * https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Number/isInteger
 */
const isInteger = Number.isInteger.bind(Number);
function isArrayOfNums(val, size) {
  return isArray(val) && (size ? val.length === size : true) && val.every(v => isInteger(v));
}


/***/ }),

/***/ "./src/utils/perfMetrics.js":
/*!**********************************!*\
  !*** ./src/utils/perfMetrics.js ***!
  \**********************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   newMetrics: () => (/* binding */ newMetrics),
/* harmony export */   useMetrics: () => (/* binding */ useMetrics)
/* harmony export */ });
/* unused harmony exports CONFIG_TOGGLE, metricsFactory, hookTimer, timedAuctionHook, timedBidResponseHook */
/* harmony import */ var _config_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../config.js */ "./src/config.js");

const CONFIG_TOGGLE = 'performanceMetrics';
const getTime = window.performance && window.performance.now ? () => window.performance.now() : () => Date.now();
const NODES = new WeakMap();

/**
 * A function that, when called, stops a time measure and saves it as a metric.
 */

function wrapFn(fn, before, after) {
  return function () {
    before && before();
    try {
      for (var _len = arguments.length, args = new Array(_len), _key = 0; _key < _len; _key++) {
        args[_key] = arguments[_key];
      }
      return fn.apply(this, args);
    } finally {
      after && after();
    }
  };
}
function metricsFactory() {
  let {
    now = getTime,
    mkNode = makeNode,
    mkTimer = makeTimer,
    mkRenamer = rename => rename,
    nodes = NODES
  } = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
  return function newMetrics() {
    function makeMetrics(self) {
      let rename = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : n => ({
        forEach(fn) {
          fn(n);
        }
      });
      rename = mkRenamer(rename);
      function accessor(slot) {
        return function (name) {
          return self.dfWalk({
            visit(edge, node) {
              const obj = node[slot];
              if (obj.hasOwnProperty(name)) {
                return obj[name];
              }
            }
          });
        };
      }
      const getTimestamp = accessor('timestamps');

      /**
       * Register a metric.
       *
       * @param name metric name
       * @param value metric valiue
       */
      function setMetric(name, value) {
        const names = rename(name);
        self.dfWalk({
          follow(inEdge, outEdge) {
            return outEdge.propagate && (!inEdge || !inEdge.stopPropagation);
          },
          visit(edge, node) {
            names.forEach(name => {
              if (edge == null) {
                node.metrics[name] = value;
              } else {
                if (!node.groups.hasOwnProperty(name)) {
                  node.groups[name] = [];
                }
                node.groups[name].push(value);
              }
            });
          }
        });
      }

      /**
       * Mark the current time as a checkpoint with the given name, to be referenced later
       * by `timeSince` or `timeBetween`.
       *
       * @param name checkpoint name
       */
      function checkpoint(name) {
        self.timestamps[name] = now();
      }

      /**
       * Get the tame passed since `checkpoint`, and optionally save it as a metric.
       *
       * @param checkpoint checkpoint name
       * @param metric The name of the metric to save. Optional.
       * @return The time in milliseconds between now and the checkpoint, or `null` if the checkpoint is not found.
       */
      function timeSince(checkpoint, metric) {
        const ts = getTimestamp(checkpoint);
        const elapsed = ts != null ? now() - ts : null;
        if (metric != null) {
          setMetric(metric, elapsed);
        }
        return elapsed;
      }

      /**
       * Get the time passed between `startCheckpoint` and `endCheckpoint`, optionally saving it as a metric.
       *
       * @param startCheckpoint - The name of the starting checkpoint.
       * @param endCheckpoint - The name of the ending checkpoint.
       * @param metric - The name of the metric to save.
       * @return The time in milliseconds between `startCheckpoint` and `endCheckpoint`, or `null` if either checkpoint is not found.
       */
      function timeBetween(startCheckpoint, endCheckpoint, metric) {
        const start = getTimestamp(startCheckpoint);
        const end = getTimestamp(endCheckpoint);
        const elapsed = start != null && end != null ? end - start : null;
        if (metric != null) {
          setMetric(metric, elapsed);
        }
        return elapsed;
      }

      /**
       * Start measuring a time metric with the given name.
       *
       * @param name metric name
       */
      function startTiming(name) {
        return mkTimer(now, val => setMetric(name, val));
      }

      /**
       * Run fn and measure the time spent in it.
       *
       * @param name the name to use for the measured time metric
       * @param fn the function to run
       * @return the return value of `fn`
       */
      function measureTime(name, fn) {
        return startTiming(name).stopAfter(fn)();
      }

      /**
       * Convenience method for measuring time spent in a `.before` or `.after` hook.
       *
       * @param name - The metric name.
       * @param next - The hook's `next` (first) argument.
       * @param fn   - A function that will be run immediately; it takes `next`, where both `next` and
       *               `next.bail` automatically call `stopTiming` before continuing with the original hook.
       * @return The return value of `fn`.
       */
      function measureHookTime(name, next, fn) {
        const stopTiming = startTiming(name);
        return fn(function (orig) {
          const next = stopTiming.stopBefore(orig);
          next.bail = orig.bail && stopTiming.stopBefore(orig.bail);
          next.stopTiming = stopTiming;
          next.untimed = orig;
          return next;
        }(next));
      }

      /**
       * Get all registered metrics.
       */
      function getMetrics() {
        let result = {};
        self.dfWalk({
          visit(edge, node) {
            result = Object.assign({}, !edge || edge.includeGroups ? node.groups : null, node.metrics, result);
          }
        });
        return result;
      }
      /**
       * Create and return a new metrics object that starts as a view on all metrics registered here,
       * and - by default - also propagates all new metrics here.
       *
       * Propagated metrics are grouped together, and intended for repeated operations. For example, with the following:
       *
       * ```
       * const metrics = newMetrics();
       * const requests = metrics.measureTime('buildRequests', buildRequests)
       * requests.forEach((req) => {
       *   const requestMetrics = metrics.fork();
       *   requestMetrics.measureTime('processRequest', () => processRequest(req);
       * })
       * ```
       *
       * if `buildRequests` takes 10ms and returns 3 objects, which respectively take 100, 200, and 300ms in `processRequest`, then
       * the final `metrics.getMetrics()` would be:
       *
       * ```
       * {
       *    buildRequests: 10,
       *    processRequest: [100, 200, 300]
       * }
       * ```
       *
       * while the inner `requestMetrics.getMetrics()` would be:
       *
       * ```
       * {
       *   buildRequests: 10,
       *   processRequest: 100 // or 200 for the 2nd loop, etc
       * }
       * ```
       */
      function fork() {
        let {
          propagate = true,
          stopPropagation = false,
          includeGroups = false
        } = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
        return makeMetrics(mkNode([[self, {
          propagate,
          stopPropagation,
          includeGroups
        }]]), rename);
      }

      /**
       * Join `otherMetrics` with these; all metrics from `otherMetrics` will (by default) be propagated here,
       * and all metrics from here will be included in `otherMetrics`.
       */
      function join(otherMetrics) {
        let {
          propagate = true,
          stopPropagation = false,
          includeGroups = false
        } = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
        const other = nodes.get(otherMetrics);
        if (other != null) {
          other.addParent(self, {
            propagate,
            stopPropagation,
            includeGroups
          });
        }
      }

      /**
       * @return a version of these metrics with the same propagation rules, but:
       *  - all metrics are renamed according to `renameFn`, or
       *  - without these metrics' rename rule (if `renameFn` is omitted).
       */
      function renameWith(renameFn) {
        return makeMetrics(self, renameFn);
      }

      /**
       * @return a new metrics object that uses the same propagation and renaming rules as this one.
       */
      function newMetrics() {
        return makeMetrics(self.newSibling(), rename);
      }
      const metrics = {
        startTiming,
        measureTime,
        measureHookTime,
        checkpoint,
        timeSince,
        timeBetween,
        setMetric,
        getMetrics,
        fork,
        join,
        newMetrics,
        renameWith,
        toJSON() {
          return getMetrics();
        }
      };
      nodes.set(metrics, self);
      return metrics;
    }
    return makeMetrics(mkNode([]));
  };
}
function makeTimer(now, cb) {
  const start = now();
  let done = false;
  function stopTiming() {
    if (!done) {
      cb(now() - start);
      done = true;
    }
  }
  stopTiming.stopBefore = fn => wrapFn(fn, stopTiming);
  stopTiming.stopAfter = fn => wrapFn(fn, null, stopTiming);
  return stopTiming;
}
function makeNode(parents) {
  return {
    metrics: {},
    timestamps: {},
    groups: {},
    addParent(node, edge) {
      parents.push([node, edge]);
    },
    newSibling() {
      return makeNode(parents.slice());
    },
    dfWalk() {
      let {
        visit,
        follow = () => true,
        visited = new Set(),
        inEdge
      } = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
      let res;
      if (!visited.has(this)) {
        visited.add(this);
        res = visit(inEdge, this);
        if (res != null) return res;
        for (const [parent, outEdge] of parents) {
          if (follow(inEdge, outEdge)) {
            res = parent.dfWalk({
              visit,
              follow,
              visited,
              inEdge: outEdge
            });
            if (res != null) return res;
          }
        }
      }
    }
  };
}
const nullMetrics = (() => {
  const nop = function () {};
  const empty = () => ({});
  const none = {
    forEach: nop
  };
  const nullTimer = () => null;
  nullTimer.stopBefore = fn => fn;
  nullTimer.stopAfter = fn => fn;
  const nullNode = Object.defineProperties({
    dfWalk: nop,
    newSibling: () => nullNode,
    addParent: nop
  }, Object.fromEntries(['metrics', 'timestamps', 'groups'].map(prop => [prop, {
    get: empty
  }])));
  return metricsFactory({
    now: () => 0,
    mkNode: () => nullNode,
    mkRenamer: () => () => none,
    mkTimer: () => nullTimer,
    nodes: {
      get: nop,
      set: nop
    }
  })();
})();
let enabled = true;
_config_js__WEBPACK_IMPORTED_MODULE_0__.config.getConfig(CONFIG_TOGGLE, cfg => {
  enabled = !!cfg[CONFIG_TOGGLE];
});

/**
 * convenience fallback function for metrics that may be undefined, especially during tests.
 */
function useMetrics(metrics) {
  return enabled && metrics || nullMetrics;
}
const newMetrics = (() => {
  const makeMetrics = metricsFactory();
  return function () {
    return enabled ? makeMetrics() : nullMetrics;
  };
})();
function hookTimer(prefix, getMetrics) {
  return function (name, hookFn) {
    var _this = this;
    return function (next) {
      for (var _len2 = arguments.length, args = new Array(_len2 > 1 ? _len2 - 1 : 0), _key2 = 1; _key2 < _len2; _key2++) {
        args[_key2 - 1] = arguments[_key2];
      }
      return useMetrics(getMetrics.apply(_this, args)).measureHookTime(prefix + name, next, next => {
        return hookFn.call(_this, next, ...args);
      });
    };
  };
}
const timedAuctionHook = hookTimer('requestBids.', req => req.metrics);
const timedBidResponseHook = hookTimer('addBidResponse.', (_, bid) => bid.metrics);


/***/ }),

/***/ "./src/utils/prerendering.js":
/*!***********************************!*\
  !*** ./src/utils/prerendering.js ***!
  \***********************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   delayIfPrerendering: () => (/* binding */ delayIfPrerendering)
/* harmony export */ });
/* harmony import */ var _utils_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../utils.js */ "./src/utils.js");

/**
 * Returns a wrapper around fn that delays execution until the page if activated, if it was prerendered and isDelayEnabled returns true.
 * https://developer.chrome.com/docs/web-platform/prerender-pages
 */
function delayIfPrerendering(isDelayEnabled, fn) {
  var _this = this;
  return function () {
    for (var _len = arguments.length, args = new Array(_len), _key = 0; _key < _len; _key++) {
      args[_key] = arguments[_key];
    }
    if (document.prerendering && isDelayEnabled()) {
      return new Promise(resolve => {
        document.addEventListener('prerenderingchange', () => {
          (0,_utils_js__WEBPACK_IMPORTED_MODULE_0__.logInfo)("Auctions were suspended while page was prerendering");
          resolve(fn.apply(_this, args));
        }, {
          once: true
        });
      });
    } else {
      return Promise.resolve(fn.apply(_this, args));
    }
  };
}


/***/ }),

/***/ "./src/utils/promise.js":
/*!******************************!*\
  !*** ./src/utils/promise.js ***!
  \******************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   PbPromise: () => (/* binding */ PbPromise),
/* harmony export */   defer: () => (/* binding */ defer)
/* harmony export */ });
/* unused harmony exports pbSetTimeout, delay */
/* harmony import */ var _prebidGlobal_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../prebidGlobal.js */ "./src/prebidGlobal.js");
var _getGlobal$setTimeout, _getGlobal$Promise;


const pbSetTimeout = (_getGlobal$setTimeout = (0,_prebidGlobal_js__WEBPACK_IMPORTED_MODULE_0__.getGlobal)().setTimeout) !== null && _getGlobal$setTimeout !== void 0 ? _getGlobal$setTimeout :  false ? 0 : setTimeout;
const PbPromise = (_getGlobal$Promise = (0,_prebidGlobal_js__WEBPACK_IMPORTED_MODULE_0__.getGlobal)().Promise) !== null && _getGlobal$Promise !== void 0 ? _getGlobal$Promise :  false ? 0 : Promise;
function delay() {
  let delayMs = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 0;
  return new PbPromise(resolve => {
    pbSetTimeout(resolve, delayMs);
  });
}
/**
 * @returns a {promise, resolve, reject} trio where `promise` is resolved by calling `resolve` or `reject`.
 */
function defer() {
  let {
    promiseFactory = resolver => new PbPromise(resolver)
  } = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
  function invoker(delegate) {
    return val => delegate(val);
  }
  let resolveFn, rejectFn;
  return {
    promise: promiseFactory((resolve, reject) => {
      resolveFn = resolve;
      rejectFn = reject;
    }),
    resolve: invoker(resolveFn),
    reject: invoker(rejectFn)
  };
}


/***/ }),

/***/ "./src/utils/reducers.js":
/*!*******************************!*\
  !*** ./src/utils/reducers.js ***!
  \*******************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   getHighestCpm: () => (/* binding */ getHighestCpm),
/* harmony export */   getOldestHighestCpmBid: () => (/* binding */ getOldestHighestCpmBid)
/* harmony export */ });
/* unused harmony exports simpleCompare, keyCompare, reverseCompare, tiebreakCompare, minimum, maximum, getLatestHighestCpmBid */
function simpleCompare(a, b) {
  if (a === b) return 0;
  return a < b ? -1 : 1;
}
function keyCompare() {
  let key = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : item => item;
  return (a, b) => simpleCompare(key(a), key(b));
}
function reverseCompare() {
  let compare = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : simpleCompare;
  return (a, b) => -compare(a, b) || 0;
}
function tiebreakCompare() {
  for (var _len = arguments.length, compares = new Array(_len), _key = 0; _key < _len; _key++) {
    compares[_key] = arguments[_key];
  }
  return function (a, b) {
    for (const cmp of compares) {
      const val = cmp(a, b);
      if (val !== 0) return val;
    }
    return 0;
  };
}
function minimum() {
  let compare = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : simpleCompare;
  return (min, item) => compare(item, min) < 0 ? item : min;
}
function maximum() {
  let compare = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : simpleCompare;
  return minimum(reverseCompare(compare));
}
const cpmCompare = keyCompare(bid => bid.cpm);
const timestampCompare = keyCompare(bid => bid.responseTimestamp);

// This function will get highest cpm value bid, in case of tie it will return the bid with lowest timeToRespond
const getHighestCpm = maximum(tiebreakCompare(cpmCompare, reverseCompare(keyCompare(bid => bid.timeToRespond))));

// This function will get the oldest hightest cpm value bid, in case of tie it will return the bid which came in first
// Use case for tie: https://github.com/prebid/Prebid.js/issues/2448
const getOldestHighestCpmBid = maximum(tiebreakCompare(cpmCompare, reverseCompare(timestampCompare)));

// This function will get the latest hightest cpm value bid, in case of tie it will return the bid which came in last
// Use case for tie: https://github.com/prebid/Prebid.js/issues/2539
const getLatestHighestCpmBid = maximum(tiebreakCompare(cpmCompare, timestampCompare));


/***/ }),

/***/ "./src/utils/ttlCollection.js":
/*!************************************!*\
  !*** ./src/utils/ttlCollection.js ***!
  \************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   ttlCollection: () => (/* binding */ ttlCollection)
/* harmony export */ });
/* harmony import */ var _promise_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./promise.js */ "./src/utils/promise.js");
/* harmony import */ var _utils_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../utils.js */ "./src/utils.js");
/* harmony import */ var _focusTimeout_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./focusTimeout.js */ "./src/utils/focusTimeout.js");



/**
 * Create a set-like collection that automatically forgets items after a certain time.
 */
function ttlCollection() {
  let {
    startTime = _utils_js__WEBPACK_IMPORTED_MODULE_1__.timestamp,
    ttl = () => null,
    monotonic = false,
    slack = 5000
  } = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
  const items = new Map();
  const callbacks = [];
  const pendingPurge = [];
  const markForPurge = monotonic ? entry => pendingPurge.push(entry) : entry => pendingPurge.splice((0,_utils_js__WEBPACK_IMPORTED_MODULE_1__.binarySearch)(pendingPurge, entry, el => el.expiry), 0, entry);
  let nextPurge, task;
  function reschedulePurge() {
    task && clearTimeout(task);
    if (pendingPurge.length > 0) {
      const now = (0,_utils_js__WEBPACK_IMPORTED_MODULE_1__.timestamp)();
      nextPurge = Math.max(now, pendingPurge[0].expiry + slack);
      task = (0,_focusTimeout_js__WEBPACK_IMPORTED_MODULE_2__.setFocusTimeout)(() => {
        const now = (0,_utils_js__WEBPACK_IMPORTED_MODULE_1__.timestamp)();
        let cnt = 0;
        for (const entry of pendingPurge) {
          if (entry.expiry > now) break;
          callbacks.forEach(cb => {
            try {
              cb(entry.item);
            } catch (e) {
              (0,_utils_js__WEBPACK_IMPORTED_MODULE_1__.logError)(e);
            }
          });
          items.delete(entry.item);
          cnt++;
        }
        pendingPurge.splice(0, cnt);
        task = null;
        reschedulePurge();
      }, nextPurge - now);
    } else {
      task = null;
    }
  }
  function mkEntry(item) {
    const values = {};
    const thisCohort = currentCohort;
    let expiry;
    function update() {
      if (thisCohort === currentCohort && values.start != null && values.delta != null) {
        expiry = values.start + values.delta;
        markForPurge(entry);
        if (task == null || nextPurge > expiry + slack) {
          reschedulePurge();
        }
      }
    }
    const [init, refresh] = Object.entries({
      start: startTime,
      delta: ttl
    }).map(_ref => {
      let [field, getter] = _ref;
      let currentCall;
      return function () {
        const thisCall = currentCall = {};
        _promise_js__WEBPACK_IMPORTED_MODULE_0__.PbPromise.resolve(getter(item)).then(val => {
          if (thisCall === currentCall) {
            values[field] = val;
            update();
          }
        });
      };
    });
    const entry = {
      item,
      refresh,
      get expiry() {
        return expiry;
      }
    };
    init();
    refresh();
    return entry;
  }
  let currentCohort = {};
  return {
    [Symbol.iterator]: () => items.keys(),
    /**
     * Add an item to this collection.
     * @param item
     */
    add(item) {
      !items.has(item) && items.set(item, mkEntry(item));
    },
    has(item) {
      return items.has(item);
    },
    delete(item) {
      const toBeDeleted = items.get(item);
      if (toBeDeleted) {
        for (let i = 0; i < pendingPurge.length && pendingPurge[i].expiry <= toBeDeleted.expiry; i++) {
          if (pendingPurge[i] === toBeDeleted) {
            pendingPurge.splice(i, 1);
            break;
          }
        }
      }
      return items.delete(item);
    },
    /**
     * Clear this collection.
     */
    clear() {
      pendingPurge.length = 0;
      reschedulePurge();
      items.clear();
      currentCohort = {};
    },
    /**
     * @returns {[]} all the items in this collection, in insertion order.
     */
    toArray() {
      return Array.from(items.keys());
    },
    /**
     * Refresh the TTL for each item in this collection.
     */
    refresh() {
      pendingPurge.length = 0;
      reschedulePurge();
      for (const entry of items.values()) {
        entry.refresh();
      }
    },
    /**
     * Register a callback to be run when an item has expired and is about to be
     * removed the from the collection.
     * @param cb a callback that takes the expired item as argument
     * @return an unregistration function.
     */
    onExpiry(cb) {
      callbacks.push(cb);
      return () => {
        const idx = callbacks.indexOf(cb);
        if (idx >= 0) {
          callbacks.splice(idx, 1);
        }
      };
    }
  };
}


/***/ }),

/***/ "./src/utils/winDimensions.js":
/*!************************************!*\
  !*** ./src/utils/winDimensions.js ***!
  \************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   getScreenOrientation: () => (/* binding */ getScreenOrientation),
/* harmony export */   getWinDimensions: () => (/* binding */ getWinDimensions),
/* harmony export */   resetWinDimensions: () => (/* binding */ resetWinDimensions)
/* harmony export */ });
/* unused harmony export internal */
/* harmony import */ var _utils_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../utils.js */ "./src/utils.js");
/* harmony import */ var _cachedApiWrapper_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./cachedApiWrapper.js */ "./src/utils/cachedApiWrapper.js");


const CHECK_INTERVAL_MS = 20;
const winDimensions = new _cachedApiWrapper_js__WEBPACK_IMPORTED_MODULE_1__.CachedApiWrapper(() => (0,_utils_js__WEBPACK_IMPORTED_MODULE_0__.canAccessWindowTop)() ? _utils_js__WEBPACK_IMPORTED_MODULE_0__.internal.getWindowTop() : _utils_js__WEBPACK_IMPORTED_MODULE_0__.internal.getWindowSelf(), {
  innerHeight: true,
  innerWidth: true,
  screen: {
    width: true,
    height: true
  },
  visualViewport: {
    width: true,
    height: true
  },
  document: {
    documentElement: {
      clientWidth: true,
      clientHeight: true,
      scrollTop: true,
      scrollLeft: true
    },
    body: {
      scrollTop: true,
      scrollLeft: true,
      clientWidth: true,
      clientHeight: true
    }
  }
});
const internal = {
  reset: winDimensions.reset
};
const getWinDimensions = (() => {
  let lastCheckTimestamp;
  return function () {
    if (!lastCheckTimestamp || Date.now() - lastCheckTimestamp > CHECK_INTERVAL_MS) {
      internal.reset();
      lastCheckTimestamp = Date.now();
    }
    return winDimensions.obj;
  };
})();
function resetWinDimensions() {
  internal.reset();
}
function getScreenOrientation(win) {
  var _ref, _fallbackWin$screen, _utilsInternals$getWi, _window;
  const fallbackWin = win !== null && win !== void 0 ? win : (0,_utils_js__WEBPACK_IMPORTED_MODULE_0__.canAccessWindowTop)() ? _utils_js__WEBPACK_IMPORTED_MODULE_0__.internal.getWindowTop() : _utils_js__WEBPACK_IMPORTED_MODULE_0__.internal.getWindowSelf();
  const screenData = (_ref = (_fallbackWin$screen = fallbackWin === null || fallbackWin === void 0 ? void 0 : fallbackWin.screen) !== null && _fallbackWin$screen !== void 0 ? _fallbackWin$screen : (_utilsInternals$getWi = _utils_js__WEBPACK_IMPORTED_MODULE_0__.internal.getWindowSelf()) === null || _utilsInternals$getWi === void 0 ? void 0 : _utilsInternals$getWi.screen) !== null && _ref !== void 0 ? _ref : (_window = window) === null || _window === void 0 ? void 0 : _window.screen;
  const width = Number(screenData === null || screenData === void 0 ? void 0 : screenData.width);
  const height = Number(screenData === null || screenData === void 0 ? void 0 : screenData.height);
  if (!Number.isFinite(width) || !Number.isFinite(height)) {
    return;
  }
  return height >= width ? 'portrait' : 'landscape';
}


/***/ }),

/***/ "./src/utils/yield.js":
/*!****************************!*\
  !*** ./src/utils/yield.js ***!
  \****************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   pbYield: () => (/* binding */ pbYield)
/* harmony export */ });
/* harmony import */ var _prebidGlobal_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../prebidGlobal.js */ "./src/prebidGlobal.js");
/* harmony import */ var _promise_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./promise.js */ "./src/utils/promise.js");


function pbYield() {
  var _getGlobal$scheduler;
  const scheduler = (_getGlobal$scheduler = (0,_prebidGlobal_js__WEBPACK_IMPORTED_MODULE_0__.getGlobal)().scheduler) !== null && _getGlobal$scheduler !== void 0 ? _getGlobal$scheduler : window.scheduler;
  return scheduler !== null && scheduler !== void 0 && scheduler.yield ? scheduler.yield() : _promise_js__WEBPACK_IMPORTED_MODULE_1__.PbPromise.resolve();
}


/***/ }),

/***/ "./src/video.js":
/*!**********************!*\
  !*** ./src/video.js ***!
  \**********************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   ORTB_VIDEO_PARAMS: () => (/* binding */ ORTB_VIDEO_PARAMS),
/* harmony export */   OUTSTREAM: () => (/* binding */ OUTSTREAM),
/* harmony export */   fillVideoDefaults: () => (/* binding */ fillVideoDefaults),
/* harmony export */   isValidVideoBid: () => (/* binding */ isValidVideoBid)
/* harmony export */ });
/* unused harmony exports INSTREAM, checkVideoBidSetup */
/* harmony import */ var _utils_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./utils.js */ "./src/utils/objects.js");
/* harmony import */ var _utils_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./utils.js */ "./src/utils.js");
/* harmony import */ var _config_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./config.js */ "./src/config.js");
/* harmony import */ var _hook_js__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ./hook.js */ "./src/hook.js");
/* harmony import */ var _auctionManager_js__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ./auctionManager.js */ "./src/auctionManager.js");
/* harmony import */ var _buildOptions_js__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! ./buildOptions.js */ "./src/buildOptions.js");





const OUTSTREAM = 'outstream';
const INSTREAM = 'instream';
const ORTB_PARAMS = [['mimes', value => Array.isArray(value) && value.length > 0 && value.every(v => typeof v === 'string')], ['minduration', _utils_js__WEBPACK_IMPORTED_MODULE_0__.isInteger], ['maxduration', _utils_js__WEBPACK_IMPORTED_MODULE_0__.isInteger], ['startdelay', _utils_js__WEBPACK_IMPORTED_MODULE_0__.isInteger], ['maxseq', _utils_js__WEBPACK_IMPORTED_MODULE_0__.isInteger], ['poddur', _utils_js__WEBPACK_IMPORTED_MODULE_0__.isInteger], ['protocols', _utils_js__WEBPACK_IMPORTED_MODULE_0__.isArrayOfNums], ['w', _utils_js__WEBPACK_IMPORTED_MODULE_0__.isInteger], ['h', _utils_js__WEBPACK_IMPORTED_MODULE_0__.isInteger], ['podid', _utils_js__WEBPACK_IMPORTED_MODULE_0__.isStr], ['podseq', _utils_js__WEBPACK_IMPORTED_MODULE_0__.isInteger], ['rqddurs', _utils_js__WEBPACK_IMPORTED_MODULE_0__.isArrayOfNums], ['placement', _utils_js__WEBPACK_IMPORTED_MODULE_0__.isInteger],
// deprecated, see plcmt
['plcmt', _utils_js__WEBPACK_IMPORTED_MODULE_0__.isInteger], ['linearity', _utils_js__WEBPACK_IMPORTED_MODULE_0__.isInteger], ['skip', value => [1, 0].includes(value)], ['skipmin', _utils_js__WEBPACK_IMPORTED_MODULE_0__.isInteger], ['skipafter', _utils_js__WEBPACK_IMPORTED_MODULE_0__.isInteger], ['sequence', _utils_js__WEBPACK_IMPORTED_MODULE_0__.isInteger],
// deprecated
['slotinpod', _utils_js__WEBPACK_IMPORTED_MODULE_0__.isInteger], ['mincpmpersec', _utils_js__WEBPACK_IMPORTED_MODULE_0__.isNumber], ['battr', _utils_js__WEBPACK_IMPORTED_MODULE_0__.isArrayOfNums], ['maxextended', _utils_js__WEBPACK_IMPORTED_MODULE_0__.isInteger], ['minbitrate', _utils_js__WEBPACK_IMPORTED_MODULE_0__.isInteger], ['maxbitrate', _utils_js__WEBPACK_IMPORTED_MODULE_0__.isInteger], ['boxingallowed', _utils_js__WEBPACK_IMPORTED_MODULE_0__.isInteger], ['playbackmethod', _utils_js__WEBPACK_IMPORTED_MODULE_0__.isArrayOfNums], ['playbackend', _utils_js__WEBPACK_IMPORTED_MODULE_0__.isInteger], ['delivery', _utils_js__WEBPACK_IMPORTED_MODULE_0__.isArrayOfNums], ['pos', _utils_js__WEBPACK_IMPORTED_MODULE_0__.isInteger], ['api', _utils_js__WEBPACK_IMPORTED_MODULE_0__.isArrayOfNums], ['companiontype', _utils_js__WEBPACK_IMPORTED_MODULE_0__.isArrayOfNums], ['poddedupe', _utils_js__WEBPACK_IMPORTED_MODULE_0__.isArrayOfNums]];

/**
 * List of OpenRTB 2.x video object properties with simple validators.
 * Not included: `companionad`, `durfloors`, `ext`
 * reference: https://github.com/InteractiveAdvertisingBureau/openrtb2.x/blob/main/2.6.md
 */
const ORTB_VIDEO_PARAMS = new Map(ORTB_PARAMS);
function fillVideoDefaults(adUnit) {
  var _adUnit$mediaTypes;
  const video = adUnit === null || adUnit === void 0 || (_adUnit$mediaTypes = adUnit.mediaTypes) === null || _adUnit$mediaTypes === void 0 ? void 0 : _adUnit$mediaTypes.video;
  if (video != null) {
    if (video.plcmt == null) {
      var _video$playbackmethod, _video$playbackmethod2;
      if (video.context === OUTSTREAM || [2, 3, 4].includes(video.placement)) {
        video.plcmt = 4;
      } else if ((_video$playbackmethod = video.playbackmethod) !== null && _video$playbackmethod !== void 0 && (_video$playbackmethod2 = _video$playbackmethod.some) !== null && _video$playbackmethod2 !== void 0 && _video$playbackmethod2.call(_video$playbackmethod, method => [2, 6].includes(method))) {
        video.plcmt = 2;
      }
    }
    const playerSize = (0,_utils_js__WEBPACK_IMPORTED_MODULE_0__.isArrayOfNums)(video.playerSize, 2) ? video.playerSize : Array.isArray(video.playerSize) && (0,_utils_js__WEBPACK_IMPORTED_MODULE_0__.isArrayOfNums)(video.playerSize[0]) ? video.playerSize[0] : null;
    const size = (0,_utils_js__WEBPACK_IMPORTED_MODULE_0__.isNumber)(video.w) && (0,_utils_js__WEBPACK_IMPORTED_MODULE_0__.isNumber)(video.h) ? [video.w, video.h] : null;
    let conflict = false;
    if (playerSize == null) {
      if (size != null) {
        if (video.playerSize != null) {
          conflict = true;
        } else {
          video.playerSize = [size];
        }
      }
    } else {
      ['w', 'h'].forEach((prop, i) => {
        if (video[prop] != null && video[prop] !== playerSize[i]) {
          conflict = true;
        } else {
          video[prop] = playerSize[i];
        }
      });
    }
    if (conflict) {
      (0,_utils_js__WEBPACK_IMPORTED_MODULE_1__.logWarn)("Ad unit \"".concat(adUnit.code, " has conflicting playerSize and w/h"), adUnit);
    }
  }
}

/**
 * Validate that the assets required for video context are present on the bid
 */
function isValidVideoBid(bid) {
  var _index$getMediaTypes;
  let {
    index = _auctionManager_js__WEBPACK_IMPORTED_MODULE_4__.auctionManager.index
  } = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
  const videoMediaType = (_index$getMediaTypes = index.getMediaTypes(bid)) === null || _index$getMediaTypes === void 0 ? void 0 : _index$getMediaTypes.video;
  const context = videoMediaType && (videoMediaType === null || videoMediaType === void 0 ? void 0 : videoMediaType.context);
  const useCacheKey = videoMediaType && (videoMediaType === null || videoMediaType === void 0 ? void 0 : videoMediaType.useCacheKey);
  const adUnit = index.getAdUnit(bid);

  // if context not defined assume default 'instream' for video bids
  // instream bids require a vast url or vast xml content
  return checkVideoBidSetup(bid, adUnit, videoMediaType, context, useCacheKey);
}
const checkVideoBidSetup = (0,_hook_js__WEBPACK_IMPORTED_MODULE_3__.hook)('sync', function (bid, adUnit, videoMediaType, context, useCacheKey) {
  if (videoMediaType && (useCacheKey || context !== OUTSTREAM)) {
    // xml-only video bids require a prebid cache url
    const {
      url,
      useLocal
    } = _config_js__WEBPACK_IMPORTED_MODULE_2__.config.getConfig('cache') || {};
    if (!url && !useLocal && bid.vastXml && !bid.vastUrl) {
      (0,_utils_js__WEBPACK_IMPORTED_MODULE_1__.logError)("\n        This bid contains only vastXml and will not work when a prebid cache url is not specified.\n        Try enabling either prebid cache with ".concat((0,_buildOptions_js__WEBPACK_IMPORTED_MODULE_5__.getGlobalVarName)(), ".setConfig({ cache: {url: \"...\"} });\n        or local cache with ").concat((0,_buildOptions_js__WEBPACK_IMPORTED_MODULE_5__.getGlobalVarName)(), ".setConfig({ cache: { useLocal: true }});\n      "));
      return false;
    }
    return !!(bid.vastUrl || bid.vastXml);
  }

  // outstream bids require a renderer on the bid or pub-defined on adunit
  if (context === OUTSTREAM && !useCacheKey) {
    return !!(bid.renderer || adUnit && adUnit.renderer || videoMediaType.renderer);
  }
  return true;
}, 'checkVideoBidSetup');


/***/ }),

/***/ "./src/videoCache.js":
/*!***************************!*\
  !*** ./src/videoCache.js ***!
  \***************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   batchAndStore: () => (/* binding */ batchAndStore),
/* harmony export */   storeLocally: () => (/* binding */ storeLocally)
/* harmony export */ });
/* unused harmony exports vastLocalCache, store, getCacheUrl, _internal, storeBatch, batchingCache */
/* harmony import */ var _ajax_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./ajax.js */ "./src/ajax.js");
/* harmony import */ var _config_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./config.js */ "./src/config.js");
/* harmony import */ var _auctionManager_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./auctionManager.js */ "./src/auctionManager.js");
/* harmony import */ var _utils_js__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ./utils.js */ "./src/utils.js");
/* harmony import */ var _auction_js__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ./auction.js */ "./src/auction.js");
/**
 * This module interacts with the server used to cache video ad content to be restored later.
 * At a high level, the expected workflow goes like this:
 *
 *   - Request video ads from Bidders
 *   - Generate IDs for each valid bid, and cache the key/value pair on the server.
 *   - Return these IDs so that publishers can use them to fetch the bids later.
 *
 * This trickery helps integrate with ad servers, which set character limits on request params.
 */






/**
 * Might be useful to be configurable in the future
 * Depending on publisher needs
 */
// TODO: we have a `ttlBuffer` setting
const ttlBufferInSeconds = 15;
const vastLocalCache = new Map();

/**
 * Function which wraps a URI that serves VAST XML, so that it can be loaded.
 *
 * @param uri The URI where the VAST content can be found.
 * @param impTrackerURLs An impression tracker URL for the delivery of the video ad
 * @return A VAST URL which loads XML from the given URI.
 */
function wrapURI(uri, impTrackerURLs) {
  impTrackerURLs = impTrackerURLs && (Array.isArray(impTrackerURLs) ? impTrackerURLs : [impTrackerURLs]);
  // Technically, this is vulnerable to cross-script injection by sketchy vastUrl bids.
  // We could make sure it's a valid URI... but since we're loading VAST XML from the
  // URL they provide anyway, that's probably not a big deal.
  const impressions = impTrackerURLs ? impTrackerURLs.map(trk => "<Impression><![CDATA[".concat(trk, "]]></Impression>")).join('') : '';
  return "<VAST version=\"3.0\">\n    <Ad>\n      <Wrapper>\n        <AdSystem>prebid.org wrapper</AdSystem>\n        <VASTAdTagURI><![CDATA[".concat(uri, "]]></VASTAdTagURI>\n        ").concat(impressions, "\n        <Creatives></Creatives>\n      </Wrapper>\n    </Ad>\n  </VAST>");
}
/**
 * Wraps a bid in the format expected by the prebid-server endpoints, or returns null if
 * the bid can't be converted cleanly.
 *
 * @return {Object|null} - The payload to be sent to the prebid-server endpoints, or null if the bid can't be converted cleanly.
 */
function toStorageRequest(bid) {
  let {
    index = _auctionManager_js__WEBPACK_IMPORTED_MODULE_2__.auctionManager.index
  } = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
  const vastValue = getVastXml(bid);
  const auction = index.getAuction(bid);
  const ttlWithBuffer = Number(bid.ttl) + ttlBufferInSeconds;
  const payload = {
    type: 'xml',
    value: vastValue,
    ttlseconds: ttlWithBuffer
  };
  if (_config_js__WEBPACK_IMPORTED_MODULE_1__.config.getConfig('cache.vasttrack')) {
    payload.bidder = bid.bidder;
    payload.bidid = bid.requestId;
    payload.aid = bid.auctionId;
  }
  if (auction != null) {
    payload.timestamp = auction.getAuctionStart();
  }
  if (typeof bid.customCacheKey === 'string' && bid.customCacheKey !== '') {
    payload.key = bid.customCacheKey;
  }
  return payload;
}
/**
 * A function which bridges the APIs between the videoCacheStoreCallback and our ajax function's API.
 *
 * @param done A callback to the "store" function.
 */
function shimStorageCallback(done) {
  return {
    success: function (responseBody) {
      let ids;
      try {
        ids = JSON.parse(responseBody).responses;
      } catch (e) {
        done(e, []);
        return;
      }
      if (ids) {
        done(null, ids);
      } else {
        done(new Error("The cache server didn't respond with a responses property."), []);
      }
    },
    error: function (statusText, responseBody) {
      done(new Error("Error storing video ad in the cache: ".concat(statusText, ": ").concat(JSON.stringify(responseBody))), []);
    }
  };
}
function getVastXml(bid) {
  return bid.vastXml ? bid.vastXml : wrapURI(bid.vastUrl, bid.vastImpUrl);
}
;

/**
 * If the given bid is for a Video ad, generate a unique ID and cache it somewhere server-side.
 *
 * @param bids A list of bid objects which should be cached.
 * @param done An optional callback which should be executed after
 * @param getAjax
 * the data has been stored in the cache.
 */
function store(bids, done) {
  let getAjax = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : _ajax_js__WEBPACK_IMPORTED_MODULE_0__.ajaxBuilder;
  const requestData = {
    puts: bids.map(bid => toStorageRequest(bid))
  };
  const ajax = getAjax(_config_js__WEBPACK_IMPORTED_MODULE_1__.config.getConfig('cache.timeout'));
  ajax(_config_js__WEBPACK_IMPORTED_MODULE_1__.config.getConfig('cache.url'), shimStorageCallback(done), JSON.stringify(requestData), {
    contentType: 'text/plain',
    withCredentials: true
  });
}
function getCacheUrl(id) {
  return "".concat(_config_js__WEBPACK_IMPORTED_MODULE_1__.config.getConfig('cache.url'), "?uuid=").concat(id);
}
const storeLocally = bid => {
  const vastXml = getVastXml(bid);
  const bidVastUrl = URL.createObjectURL(new Blob([vastXml], {
    type: 'text/xml'
  }));
  assignVastUrlAndCacheId(bid, bidVastUrl);
  vastLocalCache.set(bid.videoCacheKey, bidVastUrl);
};
const assignVastUrlAndCacheId = (bid, vastUrl, videoCacheKey) => {
  bid.videoCacheKey = videoCacheKey || (0,_utils_js__WEBPACK_IMPORTED_MODULE_3__.generateUUID)();
  if (!bid.vastUrl) {
    bid.vastUrl = vastUrl;
  }
};
const _internal = {
  store
};
function storeBatch(batch) {
  const bids = batch.map(entry => entry.bidResponse);
  function err(msg) {
    (0,_utils_js__WEBPACK_IMPORTED_MODULE_3__.logError)("Failed to save to the video cache: ".concat(msg, ". Video bids will be discarded:"), bids);
  }
  _internal.store(bids, function (error, cacheIds) {
    if (error) {
      err(error);
    } else if (batch.length !== cacheIds.length) {
      (0,_utils_js__WEBPACK_IMPORTED_MODULE_3__.logError)("expected ".concat(batch.length, " cache IDs, got ").concat(cacheIds.length, " instead"));
    } else {
      cacheIds.forEach((cacheId, i) => {
        const {
          auctionInstance,
          bidResponse,
          afterBidAdded
        } = batch[i];
        if (cacheId.uuid === '') {
          (0,_utils_js__WEBPACK_IMPORTED_MODULE_3__.logWarn)("Supplied video cache key was already in use by Prebid Cache; caching attempt was rejected. Video bid must be discarded.");
        } else {
          assignVastUrlAndCacheId(bidResponse, getCacheUrl(cacheId.uuid), cacheId.uuid);
          (0,_auction_js__WEBPACK_IMPORTED_MODULE_4__.addBidToAuction)(auctionInstance, bidResponse);
          afterBidAdded();
        }
      });
    }
  });
}
;
let batchSize, batchTimeout, cleanupHandler;
if (true) {
  _config_js__WEBPACK_IMPORTED_MODULE_1__.config.getConfig('cache', _ref => {
    let {
      cache
    } = _ref;
    batchSize = typeof cache.batchSize === 'number' && cache.batchSize > 0 ? cache.batchSize : 1;
    batchTimeout = typeof cache.batchTimeout === 'number' && cache.batchTimeout > 0 ? cache.batchTimeout : 0;

    // removing blobs that are not going to be used
    if (cache.useLocal && !cleanupHandler) {
      cleanupHandler = _auctionManager_js__WEBPACK_IMPORTED_MODULE_2__.auctionManager.onExpiry(auction => {
        auction.getBidsReceived().forEach(bid => {
          const vastUrl = vastLocalCache.get(bid.videoCacheKey);
          if (vastUrl && vastUrl.startsWith('blob')) {
            URL.revokeObjectURL(vastUrl);
          }
          vastLocalCache.delete(bid.videoCacheKey);
        });
      });
    }
  });
}
const batchingCache = function () {
  let timeout = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : setTimeout;
  let cache = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : storeBatch;
  let batches = [[]];
  let debouncing = false;
  const noTimeout = cb => cb();
  return function (auctionInstance, bidResponse, afterBidAdded) {
    const batchFunc = batchTimeout > 0 ? timeout : noTimeout;
    if (batches[batches.length - 1].length >= batchSize) {
      batches.push([]);
    }
    batches[batches.length - 1].push({
      auctionInstance,
      bidResponse,
      afterBidAdded
    });
    if (!debouncing) {
      debouncing = true;
      batchFunc(() => {
        batches.forEach(cache);
        batches = [[]];
        debouncing = false;
      }, batchTimeout);
    }
  };
};
const batchAndStore = batchingCache();


/***/ })

}]);

"use strict";
(self["pbjsChunk"] = self["pbjsChunk"] || []).push([["viewport"],{

/***/ "./libraries/viewport/viewport.js":
/*!****************************************!*\
  !*** ./libraries/viewport/viewport.js ***!
  \****************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   getViewportSize: () => (/* binding */ getViewportSize)
/* harmony export */ });
/* unused harmony export getViewportCoordinates */
/* harmony import */ var _src_utils_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../../src/utils.js */ "./src/utils.js");
/* harmony import */ var _src_utils_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../../src/utils.js */ "./src/utils/winDimensions.js");

function getViewportCoordinates() {
  try {
    const win = (0,_src_utils_js__WEBPACK_IMPORTED_MODULE_0__.getWindowTop)();
    const {
      scrollY: top,
      scrollX: left
    } = win;
    const {
      height: innerHeight,
      width: innerWidth
    } = getViewportSize();
    return {
      top,
      right: left + innerWidth,
      bottom: top + innerHeight,
      left
    };
  } catch (e) {
    return {};
  }
}
function getViewportSize() {
  const windowDimensions = (0,_src_utils_js__WEBPACK_IMPORTED_MODULE_1__.getWinDimensions)();
  try {
    const innerHeight = windowDimensions.innerHeight || windowDimensions.document.documentElement.clientHeight || windowDimensions.document.body.clientHeight || 0;
    const innerWidth = windowDimensions.innerWidth || windowDimensions.document.documentElement.clientWidth || windowDimensions.document.body.clientWidth || 0;
    return {
      width: innerWidth,
      height: innerHeight
    };
  } catch (e) {
    return {};
  }
}


/***/ })

}]);

"use strict";
(self["pbjsChunk"] = self["pbjsChunk"] || []).push([["dnt"],{

/***/ "./libraries/dnt/index.js":
/*!********************************!*\
  !*** ./libraries/dnt/index.js ***!
  \********************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   getDNT: () => (/* binding */ getDNT)
/* harmony export */ });
function _getDNT(win) {
  var _win$navigator$doNotT, _win$navigator$doNotT2;
  return win.navigator.doNotTrack === '1' || win.doNotTrack === '1' || win.navigator.msDoNotTrack === '1' || ((_win$navigator$doNotT = win.navigator.doNotTrack) === null || _win$navigator$doNotT === void 0 || (_win$navigator$doNotT2 = _win$navigator$doNotT.toLowerCase) === null || _win$navigator$doNotT2 === void 0 ? void 0 : _win$navigator$doNotT2.call(_win$navigator$doNotT)) === 'yes';
}
function getDNT() {
  let win = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : window;
  try {
    return _getDNT(win) || win !== win.top && _getDNT(win.top);
  } catch (e) {
    return false;
  }
}


/***/ })

}]);

"use strict";
(self["pbjsChunk"] = self["pbjsChunk"] || []).push([["creative-renderer-display"],{

/***/ "./creative-renderers/display.js":
/*!***************************************!*\
  !*** ./creative-renderers/display.js ***!
  \***************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   RENDERER: () => (/* binding */ RENDERER)
/* harmony export */ });
// this file is autogenerated, see creative/README.md
const RENDERER = "/******/ (() => { // webpackBootstrap\n/******/ \t\"use strict\";\n/******/ \tvar __webpack_modules__ = ({\n\n/***/ \"./creative/constants.js\":\n/*!*******************************!*\\\n  !*** ./creative/constants.js ***!\n  \\*******************************/\n/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {\n\n__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   BROWSER_INTERVENTION: () => (/* binding */ BROWSER_INTERVENTION),\n/* harmony export */   ERROR_EXCEPTION: () => (/* binding */ ERROR_EXCEPTION),\n/* harmony export */   EVENT_AD_RENDER_FAILED: () => (/* binding */ EVENT_AD_RENDER_FAILED),\n/* harmony export */   EVENT_AD_RENDER_SUCCEEDED: () => (/* binding */ EVENT_AD_RENDER_SUCCEEDED),\n/* harmony export */   MESSAGE_EVENT: () => (/* binding */ MESSAGE_EVENT),\n/* harmony export */   MESSAGE_REQUEST: () => (/* binding */ MESSAGE_REQUEST),\n/* harmony export */   MESSAGE_RESPONSE: () => (/* binding */ MESSAGE_RESPONSE),\n/* harmony export */   PB_LOCATOR: () => (/* reexport safe */ _src_constants_js__WEBPACK_IMPORTED_MODULE_0__.PB_LOCATOR)\n/* harmony export */ });\n/* harmony import */ var _src_constants_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../src/constants.js */ \"./src/constants.js\");\n// eslint-disable-next-line prebid/validate-imports\n\n\n// eslint-disable-next-line prebid/validate-imports\n\nconst MESSAGE_REQUEST = _src_constants_js__WEBPACK_IMPORTED_MODULE_0__.MESSAGES.REQUEST;\nconst MESSAGE_RESPONSE = _src_constants_js__WEBPACK_IMPORTED_MODULE_0__.MESSAGES.RESPONSE;\nconst MESSAGE_EVENT = _src_constants_js__WEBPACK_IMPORTED_MODULE_0__.MESSAGES.EVENT;\nconst EVENT_AD_RENDER_FAILED = _src_constants_js__WEBPACK_IMPORTED_MODULE_0__.EVENTS.AD_RENDER_FAILED;\nconst EVENT_AD_RENDER_SUCCEEDED = _src_constants_js__WEBPACK_IMPORTED_MODULE_0__.EVENTS.AD_RENDER_SUCCEEDED;\nconst ERROR_EXCEPTION = _src_constants_js__WEBPACK_IMPORTED_MODULE_0__.AD_RENDER_FAILED_REASON.EXCEPTION;\nconst BROWSER_INTERVENTION = _src_constants_js__WEBPACK_IMPORTED_MODULE_0__.EVENTS.BROWSER_INTERVENTION;\n\n\n/***/ }),\n\n/***/ \"./creative/renderers/display/constants.js\":\n/*!*************************************************!*\\\n  !*** ./creative/renderers/display/constants.js ***!\n  \\*************************************************/\n/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {\n\n__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   ERROR_NO_AD: () => (/* binding */ ERROR_NO_AD)\n/* harmony export */ });\n/* harmony import */ var _src_constants_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../../../src/constants.js */ \"./src/constants.js\");\n// eslint-disable-next-line prebid/validate-imports\n\nconst ERROR_NO_AD = _src_constants_js__WEBPACK_IMPORTED_MODULE_0__.AD_RENDER_FAILED_REASON.NO_AD;\n\n\n/***/ }),\n\n/***/ \"./creative/reporting.js\":\n/*!*******************************!*\\\n  !*** ./creative/reporting.js ***!\n  \\*******************************/\n/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {\n\n__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   registerReportingObserver: () => (/* binding */ registerReportingObserver)\n/* harmony export */ });\nfunction registerReportingObserver(callback, types, document) {\n  const view = (document === null || document === void 0 ? void 0 : document.defaultView) || window;\n  if ('ReportingObserver' in view) {\n    try {\n      const observer = new view.ReportingObserver(reports => {\n        callback(reports[0]);\n      }, {\n        buffered: true,\n        types\n      });\n      observer.observe();\n    } catch (e) {}\n  }\n}\n\n\n/***/ }),\n\n/***/ \"./src/constants.js\":\n/*!**************************!*\\\n  !*** ./src/constants.js ***!\n  \\**************************/\n/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {\n\n__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   AD_RENDER_FAILED_REASON: () => (/* binding */ AD_RENDER_FAILED_REASON),\n/* harmony export */   BID_STATUS: () => (/* binding */ BID_STATUS),\n/* harmony export */   DEBUG_MODE: () => (/* binding */ DEBUG_MODE),\n/* harmony export */   DEFAULT_TARGETING_KEYS: () => (/* binding */ DEFAULT_TARGETING_KEYS),\n/* harmony export */   EVENTS: () => (/* binding */ EVENTS),\n/* harmony export */   EVENT_ID_PATHS: () => (/* binding */ EVENT_ID_PATHS),\n/* harmony export */   GRANULARITY_OPTIONS: () => (/* binding */ GRANULARITY_OPTIONS),\n/* harmony export */   JSON_MAPPING: () => (/* binding */ JSON_MAPPING),\n/* harmony export */   MESSAGES: () => (/* binding */ MESSAGES),\n/* harmony export */   NATIVE_ASSET_TYPES: () => (/* binding */ NATIVE_ASSET_TYPES),\n/* harmony export */   NATIVE_IMAGE_TYPES: () => (/* binding */ NATIVE_IMAGE_TYPES),\n/* harmony export */   NATIVE_KEYS: () => (/* binding */ NATIVE_KEYS),\n/* harmony export */   NATIVE_KEYS_THAT_ARE_NOT_ASSETS: () => (/* binding */ NATIVE_KEYS_THAT_ARE_NOT_ASSETS),\n/* harmony export */   PB_LOCATOR: () => (/* binding */ PB_LOCATOR),\n/* harmony export */   PREBID_NATIVE_DATA_KEYS_TO_ORTB: () => (/* binding */ PREBID_NATIVE_DATA_KEYS_TO_ORTB),\n/* harmony export */   REJECTION_REASON: () => (/* binding */ REJECTION_REASON),\n/* harmony export */   S2S: () => (/* binding */ S2S),\n/* harmony export */   STATUS: () => (/* binding */ STATUS),\n/* harmony export */   TARGETING_KEYS: () => (/* binding */ TARGETING_KEYS)\n/* harmony export */ });\nconst JSON_MAPPING = {\n  PL_CODE: 'code',\n  PL_SIZE: 'sizes',\n  PL_BIDS: 'bids',\n  BD_BIDDER: 'bidder',\n  BD_ID: 'paramsd',\n  BD_PL_ID: 'placementId',\n  ADSERVER_TARGETING: 'adserverTargeting',\n  BD_SETTING_STANDARD: 'standard'\n};\nconst DEBUG_MODE = 'pbjs_debug';\nconst STATUS = {\n  GOOD: 1\n};\nconst EVENTS = {\n  AUCTION_INIT: 'auctionInit',\n  AUCTION_TIMEOUT: 'auctionTimeout',\n  AUCTION_END: 'auctionEnd',\n  BID_ADJUSTMENT: 'bidAdjustment',\n  BID_TIMEOUT: 'bidTimeout',\n  BID_REQUESTED: 'bidRequested',\n  BID_RESPONSE: 'bidResponse',\n  BID_REJECTED: 'bidRejected',\n  NO_BID: 'noBid',\n  SEAT_NON_BID: 'seatNonBid',\n  BID_WON: 'bidWon',\n  BIDDER_DONE: 'bidderDone',\n  BIDDER_ERROR: 'bidderError',\n  SET_TARGETING: 'setTargeting',\n  BEFORE_REQUEST_BIDS: 'beforeRequestBids',\n  BEFORE_BIDDER_HTTP: 'beforeBidderHttp',\n  REQUEST_BIDS: 'requestBids',\n  ADD_AD_UNITS: 'addAdUnits',\n  AD_RENDER_FAILED: 'adRenderFailed',\n  AD_RENDER_SUCCEEDED: 'adRenderSucceeded',\n  TCF2_ENFORCEMENT: 'tcf2Enforcement',\n  AUCTION_DEBUG: 'auctionDebug',\n  BID_VIEWABLE: 'bidViewable',\n  STALE_RENDER: 'staleRender',\n  EXPIRED_RENDER: 'expiredRender',\n  BILLABLE_EVENT: 'billableEvent',\n  BID_ACCEPTED: 'bidAccepted',\n  RUN_PAAPI_AUCTION: 'paapiRunAuction',\n  PBS_ANALYTICS: 'pbsAnalytics',\n  PAAPI_BID: 'paapiBid',\n  PAAPI_NO_BID: 'paapiNoBid',\n  PAAPI_ERROR: 'paapiError',\n  BEFORE_PBS_HTTP: 'beforePBSHttp',\n  BROWSI_INIT: 'browsiInit',\n  BROWSI_DATA: 'browsiData',\n  BROWSER_INTERVENTION: 'browserIntervention'\n};\nconst AD_RENDER_FAILED_REASON = {\n  PREVENT_WRITING_ON_MAIN_DOCUMENT: 'preventWritingOnMainDocument',\n  NO_AD: 'noAd',\n  EXCEPTION: 'exception',\n  CANNOT_FIND_AD: 'cannotFindAd',\n  MISSING_DOC_OR_ADID: 'missingDocOrAdid'\n};\nconst EVENT_ID_PATHS = {\n  bidWon: 'adUnitCode'\n};\nconst GRANULARITY_OPTIONS = {\n  LOW: 'low',\n  MEDIUM: 'medium',\n  HIGH: 'high',\n  AUTO: 'auto',\n  DENSE: 'dense',\n  CUSTOM: 'custom'\n};\nconst TARGETING_KEYS = {\n  BIDDER: 'hb_bidder',\n  AD_ID: 'hb_adid',\n  PRICE_BUCKET: 'hb_pb',\n  SIZE: 'hb_size',\n  DEAL: 'hb_deal',\n  SOURCE: 'hb_source',\n  FORMAT: 'hb_format',\n  UUID: 'hb_uuid',\n  CACHE_ID: 'hb_cache_id',\n  CACHE_HOST: 'hb_cache_host',\n  ADOMAIN: 'hb_adomain',\n  ACAT: 'hb_acat',\n  CRID: 'hb_crid',\n  DSP: 'hb_dsp',\n  VERSION: 'hb_ver'\n};\nconst DEFAULT_TARGETING_KEYS = {\n  BIDDER: 'hb_bidder',\n  AD_ID: 'hb_adid',\n  PRICE_BUCKET: 'hb_pb',\n  SIZE: 'hb_size',\n  DEAL: 'hb_deal',\n  FORMAT: 'hb_format',\n  UUID: 'hb_uuid',\n  CACHE_HOST: 'hb_cache_host',\n  VERSION: 'hb_ver'\n};\nconst NATIVE_KEYS = {\n  title: 'hb_native_title',\n  body: 'hb_native_body',\n  body2: 'hb_native_body2',\n  privacyLink: 'hb_native_privacy',\n  privacyIcon: 'hb_native_privicon',\n  sponsoredBy: 'hb_native_brand',\n  image: 'hb_native_image',\n  icon: 'hb_native_icon',\n  clickUrl: 'hb_native_linkurl',\n  displayUrl: 'hb_native_displayurl',\n  cta: 'hb_native_cta',\n  rating: 'hb_native_rating',\n  address: 'hb_native_address',\n  downloads: 'hb_native_downloads',\n  likes: 'hb_native_likes',\n  phone: 'hb_native_phone',\n  price: 'hb_native_price',\n  salePrice: 'hb_native_saleprice',\n  rendererUrl: 'hb_renderer_url',\n  adTemplate: 'hb_adTemplate'\n};\nconst S2S = {\n  SRC: 's2s',\n  DEFAULT_ENDPOINT: 'https://prebid.adnxs.com/pbs/v1/openrtb2/auction',\n  SYNCED_BIDDERS_KEY: 'pbjsSyncs'\n};\nconst BID_STATUS = {\n  BID_TARGETING_SET: 'targetingSet',\n  RENDERED: 'rendered',\n  BID_REJECTED: 'bidRejected'\n};\nconst REJECTION_REASON = {\n  INVALID: 'Bid has missing or invalid properties',\n  INVALID_REQUEST_ID: 'Invalid request ID',\n  BIDDER_DISALLOWED: 'Bidder code is not allowed by allowedAlternateBidderCodes / allowUnknownBidderCodes',\n  FLOOR_NOT_MET: 'Bid does not meet price floor',\n  CANNOT_CONVERT_CURRENCY: 'Unable to convert currency',\n  DSA_REQUIRED: 'Bid does not provide required DSA transparency info',\n  DSA_MISMATCH: 'Bid indicates inappropriate DSA rendering method',\n  PRICE_TOO_HIGH: 'Bid price exceeds maximum value'\n};\nconst PREBID_NATIVE_DATA_KEYS_TO_ORTB = {\n  body: 'desc',\n  body2: 'desc2',\n  sponsoredBy: 'sponsored',\n  cta: 'ctatext',\n  rating: 'rating',\n  address: 'address',\n  downloads: 'downloads',\n  likes: 'likes',\n  phone: 'phone',\n  price: 'price',\n  salePrice: 'saleprice',\n  displayUrl: 'displayurl'\n};\nconst NATIVE_ASSET_TYPES = {\n  sponsored: 1,\n  desc: 2,\n  rating: 3,\n  likes: 4,\n  downloads: 5,\n  price: 6,\n  saleprice: 7,\n  phone: 8,\n  address: 9,\n  desc2: 10,\n  displayurl: 11,\n  ctatext: 12\n};\nconst NATIVE_IMAGE_TYPES = {\n  ICON: 1,\n  MAIN: 3\n};\nconst NATIVE_KEYS_THAT_ARE_NOT_ASSETS = ['privacyIcon', 'clickUrl', 'adTemplate', 'rendererUrl', 'type'];\nconst MESSAGES = {\n  REQUEST: 'Prebid Request',\n  RESPONSE: 'Prebid Response',\n  NATIVE: 'Prebid Native',\n  EVENT: 'Prebid Event',\n  INTERVENTION: 'Prebid Intervention'\n};\nconst PB_LOCATOR = '__pb_locator__';\n\n\n/***/ })\n\n/******/ \t});\n/************************************************************************/\n/******/ \t// The module cache\n/******/ \tvar __webpack_module_cache__ = {};\n/******/ \t\n/******/ \t// The require function\n/******/ \tfunction __webpack_require__(moduleId) {\n/******/ \t\t// Check if module is in cache\n/******/ \t\tvar cachedModule = __webpack_module_cache__[moduleId];\n/******/ \t\tif (cachedModule !== undefined) {\n/******/ \t\t\treturn cachedModule.exports;\n/******/ \t\t}\n/******/ \t\t// Create a new module (and put it into the cache)\n/******/ \t\tvar module = __webpack_module_cache__[moduleId] = {\n/******/ \t\t\t// no module.id needed\n/******/ \t\t\t// no module.loaded needed\n/******/ \t\t\texports: {}\n/******/ \t\t};\n/******/ \t\n/******/ \t\t// Execute the module function\n/******/ \t\t__webpack_modules__[moduleId](module, module.exports, __webpack_require__);\n/******/ \t\n/******/ \t\t// Return the exports of the module\n/******/ \t\treturn module.exports;\n/******/ \t}\n/******/ \t\n/************************************************************************/\n/******/ \t/* webpack/runtime/define property getters */\n/******/ \t(() => {\n/******/ \t\t// define getter functions for harmony exports\n/******/ \t\t__webpack_require__.d = (exports, definition) => {\n/******/ \t\t\tfor(var key in definition) {\n/******/ \t\t\t\tif(__webpack_require__.o(definition, key) && !__webpack_require__.o(exports, key)) {\n/******/ \t\t\t\t\tObject.defineProperty(exports, key, { enumerable: true, get: definition[key] });\n/******/ \t\t\t\t}\n/******/ \t\t\t}\n/******/ \t\t};\n/******/ \t})();\n/******/ \t\n/******/ \t/* webpack/runtime/hasOwnProperty shorthand */\n/******/ \t(() => {\n/******/ \t\t__webpack_require__.o = (obj, prop) => (Object.prototype.hasOwnProperty.call(obj, prop))\n/******/ \t})();\n/******/ \t\n/******/ \t/* webpack/runtime/make namespace object */\n/******/ \t(() => {\n/******/ \t\t// define __esModule on exports\n/******/ \t\t__webpack_require__.r = (exports) => {\n/******/ \t\t\tif(typeof Symbol !== 'undefined' && Symbol.toStringTag) {\n/******/ \t\t\t\tObject.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });\n/******/ \t\t\t}\n/******/ \t\t\tObject.defineProperty(exports, '__esModule', { value: true });\n/******/ \t\t};\n/******/ \t})();\n/******/ \t\n/************************************************************************/\nvar __webpack_exports__ = {};\n// This entry needs to be wrapped in an IIFE because it needs to be isolated against other modules in the chunk.\n(() => {\n/*!************************************************!*\\\n  !*** ./creative/renderers/display/renderer.js ***!\n  \\************************************************/\n__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   render: () => (/* binding */ render)\n/* harmony export */ });\n/* harmony import */ var _reporting_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../../reporting.js */ \"./creative/reporting.js\");\n/* harmony import */ var _constants_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../../constants.js */ \"./creative/constants.js\");\n/* harmony import */ var _constants_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./constants.js */ \"./creative/renderers/display/constants.js\");\n\n\n\nfunction render(_ref, _ref2, win) {\n  let {\n    ad,\n    adUrl,\n    width,\n    height,\n    instl\n  } = _ref;\n  let {\n    mkFrame,\n    sendMessage\n  } = _ref2;\n  (0,_reporting_js__WEBPACK_IMPORTED_MODULE_0__.registerReportingObserver)(report => {\n    sendMessage(_constants_js__WEBPACK_IMPORTED_MODULE_1__.MESSAGE_EVENT, {\n      event: _constants_js__WEBPACK_IMPORTED_MODULE_1__.BROWSER_INTERVENTION,\n      intervention: report\n    });\n  }, ['intervention']);\n  if (!ad && !adUrl) {\n    const err = new Error('Missing ad markup or URL');\n    err.reason = _constants_js__WEBPACK_IMPORTED_MODULE_2__.ERROR_NO_AD;\n    throw err;\n  } else {\n    if (height == null) {\n      var _win$document;\n      const body = (_win$document = win.document) === null || _win$document === void 0 ? void 0 : _win$document.body;\n      [body, body === null || body === void 0 ? void 0 : body.parentElement].filter(elm => (elm === null || elm === void 0 ? void 0 : elm.style) != null).forEach(elm => {\n        elm.style.height = '100%';\n      });\n    }\n    const doc = win.document;\n    const attrs = {\n      width: width !== null && width !== void 0 ? width : '100%',\n      height: height !== null && height !== void 0 ? height : '100%'\n    };\n    if (adUrl && !ad) {\n      attrs.src = adUrl;\n    } else {\n      attrs.srcdoc = ad;\n    }\n    doc.body.appendChild(mkFrame(doc, attrs));\n    if (instl && win.frameElement) {\n      // interstitials are rendered in a nested iframe that needs to be sized\n      const style = win.frameElement.style;\n      style.width = width ? \"\".concat(width, \"px\") : '100vw';\n      style.height = height ? \"\".concat(height, \"px\") : '100vh';\n    }\n  }\n}\nwindow.render = render;\n\n})();\n\n/******/ })()\n;"

/***/ })

}]);

"use strict";
(self["pbjsChunk"] = self["pbjsChunk"] || []).push([["echoAdsModule"],{

/***/ "./modules/echoAdsModule/index.js":
/*!****************************************!*\
  !*** ./modules/echoAdsModule/index.js ***!
  \****************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

/* unused harmony exports init, triggerEchoAd, reset */
/* harmony import */ var _src_prebidGlobal_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../../src/prebidGlobal.js */ "./src/prebidGlobal.js");
/* harmony import */ var _src_config_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../../src/config.js */ "./src/config.js");
/* harmony import */ var _src_utils_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../../src/utils.js */ "./src/utils.js");
/* harmony import */ var _src_events_js__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ../../src/events.js */ "./src/events.js");
/* harmony import */ var _src_constants_js__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ../../src/constants.js */ "./src/constants.js");
/* harmony import */ var _src_utils_winDimensions_js__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! ../../src/utils/winDimensions.js */ "./src/utils/winDimensions.js");
/* harmony import */ var _src_storageManager_js__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(/*! ../../src/storageManager.js */ "./src/storageManager.js");

/**
 * Echo Ads Module
 *
 * This module enables publisher-controlled ad units that appear when users
 * reach the end of content consumption. Supports:
 * - Configurable triggers (scroll depth, time on page, custom functions)
 * - Bid pre-fetching for reduced latency
 * - Overlay/interstitial rendering
 * - Frequency capping
 *
 * @module modules/echoAdsModule
 */








const MODULE_NAME = 'echoAds';
const VERSION = '1.0.0';

// Storage manager
const storage = (0,_src_storageManager_js__WEBPACK_IMPORTED_MODULE_6__.getStorageManager)({
  moduleType: 'core',
  moduleName: MODULE_NAME
});

// Module state
let moduleConfig = null;
let isInitialized = false;
let triggerMonitorActive = false;
let cachedBid = null;
let auctionInProgress = false;
let hasBeenTriggered = false;

// Storage keys for frequency capping
const STORAGE_KEY_SESSION = 'echoAds_session_count';
const STORAGE_KEY_DAILY = 'echoAds_daily_count';
const STORAGE_KEY_LAST_SHOWN = 'echoAds_last_shown';

/**
 * Initialize the Echo Ads module
 */
function init(pbjs) {
  if (isInitialized) {
    (0,_src_utils_js__WEBPACK_IMPORTED_MODULE_2__.logWarn)("".concat(MODULE_NAME, ": Module already initialized"));
    return;
  }
  const confListener = _src_config_js__WEBPACK_IMPORTED_MODULE_1__.config.getConfig(MODULE_NAME, _ref => {
    let {
      echoAds
    } = _ref;
    if (!echoAds) {
      (0,_src_utils_js__WEBPACK_IMPORTED_MODULE_2__.logError)("".concat(MODULE_NAME, ": Missing configuration"));
      return;
    }
    if (!echoAds.adUnit) {
      (0,_src_utils_js__WEBPACK_IMPORTED_MODULE_2__.logError)("".concat(MODULE_NAME, ": Missing adUnit configuration"));
      return;
    }
    moduleConfig = echoAds;
    confListener(); // unsubscribe

    (0,_src_utils_js__WEBPACK_IMPORTED_MODULE_2__.logInfo)("".concat(MODULE_NAME, ": Initialized v").concat(VERSION));
    isInitialized = true;

    // Setup event listeners
    setupEventListeners();

    // Start monitoring triggers
    startTriggerMonitoring();

    // Handle pre-fetch strategy
    handlePrefetchStrategy();
  });
}

/**
 * Setup event listeners for Prebid events
 */
function setupEventListeners() {
  _src_events_js__WEBPACK_IMPORTED_MODULE_3__.on(_src_constants_js__WEBPACK_IMPORTED_MODULE_4__.EVENTS.AUCTION_END, onAuctionEnd);
  _src_events_js__WEBPACK_IMPORTED_MODULE_3__.on(_src_constants_js__WEBPACK_IMPORTED_MODULE_4__.EVENTS.BID_WON, onBidWon);
  _src_events_js__WEBPACK_IMPORTED_MODULE_3__.on(_src_constants_js__WEBPACK_IMPORTED_MODULE_4__.EVENTS.AD_RENDER_FAILED, onAdRenderFailed);
}

/**
 * Handle auction end event - cache the winning bid
 */
function onAuctionEnd(auctionData) {
  var _auctionData$adUnits, _auctionData$bidsRece;
  if (!moduleConfig || !auctionInProgress) return;

  // Find our Echo Ads ad unit
  const echoAdUnit = (_auctionData$adUnits = auctionData.adUnits) === null || _auctionData$adUnits === void 0 ? void 0 : _auctionData$adUnits.find(unit => unit.code === moduleConfig.adUnit.code);
  if (!echoAdUnit) return;

  // Get the winning bid for this ad unit
  const bids = (_auctionData$bidsRece = auctionData.bidsReceived) === null || _auctionData$bidsRece === void 0 ? void 0 : _auctionData$bidsRece.filter(bid => bid.adUnitCode === moduleConfig.adUnit.code);
  if (bids && bids.length > 0) {
    // Sort by CPM and get highest
    bids.sort((a, b) => b.cpm - a.cpm);
    cachedBid = bids[0];
    (0,_src_utils_js__WEBPACK_IMPORTED_MODULE_2__.logInfo)("".concat(MODULE_NAME, ": Cached winning bid from ").concat(cachedBid.bidder, " with CPM ").concat(cachedBid.cpm));

    // Call onBidCached callback if provided
    if (moduleConfig.onBidCached && typeof moduleConfig.onBidCached === 'function') {
      moduleConfig.onBidCached({
        bidder: cachedBid.bidder,
        cpm: cachedBid.cpm,
        size: "".concat(cachedBid.width, "x").concat(cachedBid.height)
      });
    }
  } else {
    (0,_src_utils_js__WEBPACK_IMPORTED_MODULE_2__.logWarn)("".concat(MODULE_NAME, ": No bids received for Echo Ad unit"));
    cachedBid = null;
  }
  auctionInProgress = false;
}

/**
 * Handle bid won event
 */
function onBidWon(bid) {
  var _moduleConfig;
  if (bid.adUnitCode === ((_moduleConfig = moduleConfig) === null || _moduleConfig === void 0 || (_moduleConfig = _moduleConfig.adUnit) === null || _moduleConfig === void 0 ? void 0 : _moduleConfig.code)) {
    (0,_src_utils_js__WEBPACK_IMPORTED_MODULE_2__.logInfo)("".concat(MODULE_NAME, ": Bid won from ").concat(bid.bidder));
  }
}

/**
 * Handle ad render failure
 */
function onAdRenderFailed(data) {
  var _moduleConfig2;
  if (data.adUnitCode === ((_moduleConfig2 = moduleConfig) === null || _moduleConfig2 === void 0 || (_moduleConfig2 = _moduleConfig2.adUnit) === null || _moduleConfig2 === void 0 ? void 0 : _moduleConfig2.code)) {
    (0,_src_utils_js__WEBPACK_IMPORTED_MODULE_2__.logError)("".concat(MODULE_NAME, ": Ad render failed"), data);
  }
}

/**
 * Handle pre-fetch strategy (eager or lazy)
 */
function handlePrefetchStrategy() {
  if (!moduleConfig.prefetch) return;
  const mode = moduleConfig.prefetch.mode || 'lazy';
  if (mode === 'eager') {
    // Start auction immediately on page load
    (0,_src_utils_js__WEBPACK_IMPORTED_MODULE_2__.logInfo)("".concat(MODULE_NAME, ": Eager prefetch - starting auction immediately"));
    startAuction();
  } else if (mode === 'lazy' && moduleConfig.prefetch.lazyTriggerPoint) {
    // Monitor for lazy trigger point
    const triggerPoint = moduleConfig.prefetch.lazyTriggerPoint;
    if (triggerPoint.scroll) {
      setupScrollMonitor(triggerPoint.scroll.depth, () => {
        if (!auctionInProgress && !cachedBid) {
          (0,_src_utils_js__WEBPACK_IMPORTED_MODULE_2__.logInfo)("".concat(MODULE_NAME, ": Lazy prefetch trigger reached - starting auction"));
          startAuction();
        }
      });
    }
  }
}

/**
 * Start the ad auction for Echo Ads unit
 */
function startAuction() {
  if (auctionInProgress) {
    (0,_src_utils_js__WEBPACK_IMPORTED_MODULE_2__.logWarn)("".concat(MODULE_NAME, ": Auction already in progress"));
    return;
  }
  const pbjs = (0,_src_prebidGlobal_js__WEBPACK_IMPORTED_MODULE_0__.getGlobal)();

  // Add the ad unit
  pbjs.addAdUnits([moduleConfig.adUnit]);
  auctionInProgress = true;

  // Request bids
  pbjs.requestBids({
    adUnitCodes: [moduleConfig.adUnit.code],
    bidsBackHandler: function (bids) {
      (0,_src_utils_js__WEBPACK_IMPORTED_MODULE_2__.logInfo)("".concat(MODULE_NAME, ": Bids returned"), bids);
    }
  });
}

/**
 * Start monitoring for trigger conditions
 */
function startTriggerMonitoring() {
  if (triggerMonitorActive) return;
  const trigger = moduleConfig.trigger;
  if (!trigger) {
    (0,_src_utils_js__WEBPACK_IMPORTED_MODULE_2__.logWarn)("".concat(MODULE_NAME, ": No trigger configuration provided"));
    return;
  }
  triggerMonitorActive = true;

  // Setup scroll depth trigger
  if (trigger.scroll) {
    setupScrollMonitor(trigger.scroll.depth, onTriggerActivated);
  }

  // Setup time on page trigger
  if (trigger.timeOnPage) {
    setupTimeMonitor(trigger.timeOnPage, onTriggerActivated);
  }

  // Setup exit intent trigger
  if (trigger.exitIntent) {
    setupExitIntentMonitor(onTriggerActivated);
  }

  // Setup custom trigger
  if (typeof trigger.custom === 'function') {
    setupCustomTriggerMonitor(trigger.custom, onTriggerActivated);
  }
  (0,_src_utils_js__WEBPACK_IMPORTED_MODULE_2__.logInfo)("".concat(MODULE_NAME, ": Trigger monitoring started"));
}

/**
 * Setup scroll depth monitoring
 */
let scrollMonitorCallbacks = [];
function setupScrollMonitor(targetDepth, callback) {
  if (scrollMonitorCallbacks.length === 0) {
    // Only attach listener once
    window.addEventListener('scroll', handleScroll, {
      passive: true
    });
  }
  scrollMonitorCallbacks.push({
    targetDepth,
    callback,
    triggered: false
  });
}
function handleScroll() {
  const scrollDepth = calculateScrollDepth();
  scrollMonitorCallbacks.forEach(monitor => {
    if (!monitor.triggered && scrollDepth >= monitor.targetDepth) {
      monitor.triggered = true;
      monitor.callback();
    }
  });
}
function calculateScrollDepth() {
  const {
    height: windowHeight
  } = (0,_src_utils_winDimensions_js__WEBPACK_IMPORTED_MODULE_5__.getWindowDimensions)();
  const documentHeight = Math.max(document.body.scrollHeight, document.documentElement.scrollHeight);
  const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
  const scrollableHeight = documentHeight - windowHeight;

  // 0% at top, 100% when scrolled to bottom
  if (scrollableHeight <= 0) return 0;
  return scrollTop / scrollableHeight * 100;
}

/**
 * Setup time on page monitoring
 */
function setupTimeMonitor(milliseconds, callback) {
  setTimeout(() => {
    callback();
  }, milliseconds);
}

/**
 * Setup exit intent monitoring
 */
function setupExitIntentMonitor(callback) {
  document.addEventListener('mouseout', e => {
    if (e.clientY <= 0) {
      callback();
    }
  });
}

/**
 * Setup custom trigger monitoring
 */
function setupCustomTriggerMonitor(customFn, callback) {
  // Poll the custom function
  const interval = setInterval(() => {
    try {
      if (customFn()) {
        clearInterval(interval);
        callback();
      }
    } catch (e) {
      (0,_src_utils_js__WEBPACK_IMPORTED_MODULE_2__.logError)("".concat(MODULE_NAME, ": Error in custom trigger function"), e);
    }
  }, 1000); // Check every second
}

/**
 * Called when trigger conditions are met
 */
function onTriggerActivated() {
  if (hasBeenTriggered) {
    (0,_src_utils_js__WEBPACK_IMPORTED_MODULE_2__.logInfo)("".concat(MODULE_NAME, ": Trigger already activated"));
    return;
  }

  // Set flag immediately to prevent other automatic triggers from firing
  hasBeenTriggered = true;

  // Check frequency cap
  if (!checkFrequencyCap()) {
    (0,_src_utils_js__WEBPACK_IMPORTED_MODULE_2__.logInfo)("".concat(MODULE_NAME, ": Not showing ad - frequency cap limit reached"));

    // Call onFrequencyCapReached callback if provided
    if (moduleConfig.onFrequencyCapReached && typeof moduleConfig.onFrequencyCapReached === 'function') {
      moduleConfig.onFrequencyCapReached();
    }
    return;
  }
  (0,_src_utils_js__WEBPACK_IMPORTED_MODULE_2__.logInfo)("".concat(MODULE_NAME, ": Trigger activated!"));

  // Call onTrigger callback if provided
  if (moduleConfig.onTrigger && typeof moduleConfig.onTrigger === 'function') {
    moduleConfig.onTrigger();
  }

  // If we don't have a cached bid yet, start auction
  if (!cachedBid && !auctionInProgress) {
    (0,_src_utils_js__WEBPACK_IMPORTED_MODULE_2__.logInfo)("".concat(MODULE_NAME, ": No cached bid, starting auction..."));
    startAuction();
    // Wait for auction to complete, then show ad
    let attempts = 0;
    const maxAttempts = 50; // 5 seconds max
    const checkInterval = setInterval(() => {
      attempts++;
      if (cachedBid) {
        clearInterval(checkInterval);
        (0,_src_utils_js__WEBPACK_IMPORTED_MODULE_2__.logInfo)("".concat(MODULE_NAME, ": Bid received, showing ad"));
        showEchoAd();
      } else if (attempts >= maxAttempts) {
        clearInterval(checkInterval);
        (0,_src_utils_js__WEBPACK_IMPORTED_MODULE_2__.logWarn)("".concat(MODULE_NAME, ": Timeout waiting for bids, no ad to show"));
      }
    }, 100);
  } else if (cachedBid) {
    // Show ad immediately
    (0,_src_utils_js__WEBPACK_IMPORTED_MODULE_2__.logInfo)("".concat(MODULE_NAME, ": Using cached bid"));
    showEchoAd();
  } else if (auctionInProgress) {
    (0,_src_utils_js__WEBPACK_IMPORTED_MODULE_2__.logInfo)("".concat(MODULE_NAME, ": Auction in progress, waiting for completion..."));
    // Wait for auction to complete
    let attempts = 0;
    const maxAttempts = 50;
    const checkInterval = setInterval(() => {
      attempts++;
      if (cachedBid) {
        clearInterval(checkInterval);
        (0,_src_utils_js__WEBPACK_IMPORTED_MODULE_2__.logInfo)("".concat(MODULE_NAME, ": Bid received, showing ad"));
        showEchoAd();
      } else if (attempts >= maxAttempts) {
        clearInterval(checkInterval);
        (0,_src_utils_js__WEBPACK_IMPORTED_MODULE_2__.logWarn)("".concat(MODULE_NAME, ": Timeout waiting for bids, no ad to show"));
      }
    }, 100);
  }
}

/**
 * Check frequency capping
 */
function checkFrequencyCap() {
  if (!moduleConfig.display || !moduleConfig.display.frequency) {
    return true; // No frequency cap configured
  }
  const freq = moduleConfig.display.frequency;
  try {
    // Check session cap
    if (freq.maxPerSession) {
      const sessionCount = parseInt(storage.getDataFromSessionStorage(STORAGE_KEY_SESSION) || '0');
      if (sessionCount >= freq.maxPerSession) {
        (0,_src_utils_js__WEBPACK_IMPORTED_MODULE_2__.logWarn)("".concat(MODULE_NAME, ": Session frequency cap reached (").concat(sessionCount, "/").concat(freq.maxPerSession, ")"));
        return false;
      }
    }

    // Check daily cap
    if (freq.maxPerDay) {
      const dailyData = storage.getDataFromLocalStorage(STORAGE_KEY_DAILY);
      if (dailyData) {
        const {
          date,
          count
        } = JSON.parse(dailyData);
        const today = new Date().toDateString();
        if (date === today && count >= freq.maxPerDay) {
          (0,_src_utils_js__WEBPACK_IMPORTED_MODULE_2__.logWarn)("".concat(MODULE_NAME, ": Daily frequency cap reached (").concat(count, "/").concat(freq.maxPerDay, ")"));
          return false;
        }
      }
    }
    return true;
  } catch (e) {
    (0,_src_utils_js__WEBPACK_IMPORTED_MODULE_2__.logError)("".concat(MODULE_NAME, ": Error checking frequency cap"), e);
    return true; // Allow ad on error
  }
}

/**
 * Update frequency cap counters
 */
function updateFrequencyCap() {
  if (!moduleConfig.display || !moduleConfig.display.frequency) {
    return;
  }
  const freq = moduleConfig.display.frequency;
  try {
    // Update session count
    if (freq.maxPerSession) {
      const sessionCount = parseInt(storage.getDataFromSessionStorage(STORAGE_KEY_SESSION) || '0');
      storage.setDataInSessionStorage(STORAGE_KEY_SESSION, (sessionCount + 1).toString());
    }

    // Update daily count
    if (freq.maxPerDay) {
      const today = new Date().toDateString();
      const dailyData = storage.getDataFromLocalStorage(STORAGE_KEY_DAILY);
      let count = 1;
      if (dailyData) {
        const {
          date,
          count: prevCount
        } = JSON.parse(dailyData);
        if (date === today) {
          count = prevCount + 1;
        }
      }
      storage.setDataInLocalStorage(STORAGE_KEY_DAILY, JSON.stringify({
        date: today,
        count
      }));
    }

    // Update last shown timestamp
    storage.setDataInLocalStorage(STORAGE_KEY_LAST_SHOWN, Date.now().toString());
  } catch (e) {
    (0,_src_utils_js__WEBPACK_IMPORTED_MODULE_2__.logError)("".concat(MODULE_NAME, ": Error updating frequency cap"), e);
  }
}

/**
 * Show the Echo Ad
 */
function showEchoAd() {
  if (!cachedBid) {
    (0,_src_utils_js__WEBPACK_IMPORTED_MODULE_2__.logWarn)("".concat(MODULE_NAME, ": No cached bid to display"));
    return;
  }
  (0,_src_utils_js__WEBPACK_IMPORTED_MODULE_2__.logInfo)("".concat(MODULE_NAME, ": Displaying Echo Ad"), cachedBid);
  const displayConfig = moduleConfig.display || {};
  const displayType = displayConfig.type || 'overlay';
  if (displayType === 'overlay') {
    showOverlay();
  } else if (displayType === 'interstitial') {
    showInterstitial();
  }

  // Clear cached bid immediately - each bid can only be used once
  cachedBid = null;

  // Update frequency cap
  updateFrequencyCap();

  // Call onAdRender callback
  if (moduleConfig.onAdRender && typeof moduleConfig.onAdRender === 'function') {
    moduleConfig.onAdRender();
  }
}

/**
 * Show overlay ad
 */
function showOverlay() {
  const displayConfig = moduleConfig.display || {};

  // Create overlay container
  const overlay = document.createElement('div');
  overlay.id = 'echo-ads-overlay';
  overlay.style.cssText = "\n    position: fixed;\n    top: 0;\n    left: 0;\n    width: 100%;\n    height: 100%;\n    background: rgba(0, 0, 0, 0.8);\n    z-index: 999999;\n    display: flex;\n    align-items: center;\n    justify-content: center;\n  ";

  // Create ad container
  const adContainer = document.createElement('div');
  adContainer.id = moduleConfig.adUnit.code;

  // Set min dimensions based on bid size to prevent collapse with third-party tags
  const minWidth = cachedBid.width || 300;
  const minHeight = cachedBid.height || 250;
  adContainer.style.cssText = "\n    position: relative;\n    background: white;\n    padding: 20px;\n    border-radius: 8px;\n    box-shadow: 0 4px 20px rgba(0,0,0,0.3);\n    min-width: ".concat(minWidth, "px;\n    min-height: ").concat(minHeight, "px;\n  ");

  // Render the ad first - insert HTML directly
  if (cachedBid.ad) {
    adContainer.innerHTML = cachedBid.ad;
  } else {
    (0,_src_utils_js__WEBPACK_IMPORTED_MODULE_2__.logError)("".concat(MODULE_NAME, ": Cached bid has no ad creative"));
  }

  // Create close button AFTER ad content (so it's not overwritten)
  if (displayConfig.closeButton !== false) {
    const closeButton = document.createElement('button');
    closeButton.innerHTML = '&times;';
    closeButton.style.cssText = "\n      position: absolute;\n      top: -12px;\n      right: -12px;\n      background: #000;\n      color: #fff;\n      border: none;\n      border-radius: 50%;\n      width: 28px;\n      height: 28px;\n      font-size: 20px;\n      font-weight: normal;\n      line-height: 28px;\n      text-align: center;\n      cursor: pointer;\n      z-index: 2147483647;\n      box-shadow: 0 2px 6px rgba(0,0,0,0.4);\n      padding: 0;\n      display: flex;\n      align-items: center;\n      justify-content: center;\n      pointer-events: auto;\n    ";

    // Add hover effect
    closeButton.onmouseenter = function () {
      if (!this.disabled) {
        this.style.background = '#333';
      }
    };
    closeButton.onmouseleave = function () {
      if (!this.disabled) {
        this.style.background = '#000';
      }
    };

    // Handle close delay with countdown
    const closeDelay = displayConfig.closeDelay || 0;
    if (closeDelay > 0) {
      closeButton.disabled = true;
      closeButton.style.opacity = '0.7';
      closeButton.style.cursor = 'not-allowed';
      let remainingSeconds = Math.ceil(closeDelay / 1000);
      closeButton.innerHTML = remainingSeconds;
      closeButton.style.fontSize = '14px';
      closeButton.style.fontWeight = 'bold';
      const countdownInterval = setInterval(() => {
        remainingSeconds--;
        if (remainingSeconds > 0) {
          closeButton.innerHTML = remainingSeconds;
        } else {
          clearInterval(countdownInterval);
          closeButton.innerHTML = '&times;';
          closeButton.style.fontSize = '20px';
          closeButton.style.fontWeight = 'normal';
          closeButton.disabled = false;
          closeButton.style.opacity = '1';
          closeButton.style.cursor = 'pointer';
        }
      }, 1000);
    }
    closeButton.onclick = () => {
      closeEchoAd();
    };
    adContainer.appendChild(closeButton);
  }
  overlay.appendChild(adContainer);
  document.body.appendChild(overlay);
}

/**
 * Show interstitial ad (similar to overlay but full screen)
 */
function showInterstitial() {
  // For now, use same implementation as overlay
  // Can be customized later for different styling
  showOverlay();
}

/**
 * Close the Echo Ad
 */
function closeEchoAd() {
  const overlay = document.getElementById('echo-ads-overlay');
  if (overlay) {
    overlay.remove();
  }

  // Do NOT reset hasBeenTriggered - automatic triggers should only fire once per session
  // Manual triggers bypass this flag entirely
  // Cached bid is already cleared when ad is shown

  // Call onAdClose callback
  if (moduleConfig.onAdClose && typeof moduleConfig.onAdClose === 'function') {
    moduleConfig.onAdClose();
  }
  (0,_src_utils_js__WEBPACK_IMPORTED_MODULE_2__.logInfo)("".concat(MODULE_NAME, ": Echo Ad closed"));
}

/**
 * Manual trigger function (exposed to publishers)
 * Unlike automatic triggers, manual triggers can be called multiple times per session
 */
function triggerEchoAd() {
  if (!isInitialized) {
    (0,_src_utils_js__WEBPACK_IMPORTED_MODULE_2__.logWarn)("".concat(MODULE_NAME, ": Module not initialized"));
    return;
  }

  // Manual triggers bypass the hasBeenTriggered check
  // but still respect frequency caps
  if (!checkFrequencyCap()) {
    (0,_src_utils_js__WEBPACK_IMPORTED_MODULE_2__.logInfo)("".concat(MODULE_NAME, ": Not showing ad - frequency cap limit reached"));

    // Call onFrequencyCapReached callback if provided
    if (moduleConfig.onFrequencyCapReached && typeof moduleConfig.onFrequencyCapReached === 'function') {
      moduleConfig.onFrequencyCapReached();
    }
    return;
  }
  (0,_src_utils_js__WEBPACK_IMPORTED_MODULE_2__.logInfo)("".concat(MODULE_NAME, ": Manual trigger activated!"));

  // Call onTrigger callback if provided
  if (moduleConfig.onTrigger && typeof moduleConfig.onTrigger === 'function') {
    moduleConfig.onTrigger();
  }

  // If we don't have a cached bid yet, start auction
  if (!cachedBid && !auctionInProgress) {
    (0,_src_utils_js__WEBPACK_IMPORTED_MODULE_2__.logInfo)("".concat(MODULE_NAME, ": No cached bid, starting auction..."));
    startAuction();
    // Wait for auction to complete, then show ad
    let attempts = 0;
    const maxAttempts = 50; // 5 seconds max
    const checkInterval = setInterval(() => {
      attempts++;
      if (cachedBid) {
        clearInterval(checkInterval);
        (0,_src_utils_js__WEBPACK_IMPORTED_MODULE_2__.logInfo)("".concat(MODULE_NAME, ": Bid received, showing ad"));
        showEchoAd();
      } else if (attempts >= maxAttempts) {
        clearInterval(checkInterval);
        (0,_src_utils_js__WEBPACK_IMPORTED_MODULE_2__.logWarn)("".concat(MODULE_NAME, ": Timeout waiting for bids, no ad to show"));
      }
    }, 100);
  } else if (cachedBid) {
    // Show ad immediately
    (0,_src_utils_js__WEBPACK_IMPORTED_MODULE_2__.logInfo)("".concat(MODULE_NAME, ": Using cached bid"));
    showEchoAd();
  } else if (auctionInProgress) {
    (0,_src_utils_js__WEBPACK_IMPORTED_MODULE_2__.logInfo)("".concat(MODULE_NAME, ": Auction in progress, waiting for completion..."));
    // Wait for auction to complete
    let attempts = 0;
    const maxAttempts = 50;
    const checkInterval = setInterval(() => {
      attempts++;
      if (cachedBid) {
        clearInterval(checkInterval);
        (0,_src_utils_js__WEBPACK_IMPORTED_MODULE_2__.logInfo)("".concat(MODULE_NAME, ": Bid received, showing ad"));
        showEchoAd();
      } else if (attempts >= maxAttempts) {
        clearInterval(checkInterval);
        (0,_src_utils_js__WEBPACK_IMPORTED_MODULE_2__.logWarn)("".concat(MODULE_NAME, ": Timeout waiting for bids, no ad to show"));
      }
    }, 100);
  }
}

/**
 * Reset module state (useful for testing)
 */
function reset() {
  hasBeenTriggered = false;
  cachedBid = null;
  auctionInProgress = false;
  triggerMonitorActive = false;
  isInitialized = false;
  moduleConfig = null;
  scrollMonitorCallbacks = [];
}

/**
 * Module registration
 */
const pbjs = (0,_src_prebidGlobal_js__WEBPACK_IMPORTED_MODULE_0__.getGlobal)();
init(pbjs);

// Expose API on pbjs global
pbjs.echoAds = {
  trigger: triggerEchoAd,
  reset: reset,
  version: VERSION
};
(0,_src_utils_js__WEBPACK_IMPORTED_MODULE_2__.logInfo)("".concat(MODULE_NAME, ": Module loaded v").concat(VERSION));
(0,_src_prebidGlobal_js__WEBPACK_IMPORTED_MODULE_0__.registerModule)('echoAdsModule');


/***/ })

},
/******/ __webpack_require__ => { // webpackRuntimeModules
/******/ var __webpack_exec__ = (moduleId) => (__webpack_require__(__webpack_require__.s = moduleId))
/******/ __webpack_require__.O(0, ["chunk-core","viewport","dnt","creative-renderer-display"], () => (__webpack_exec__("./modules/echoAdsModule/index.js")));
/******/ var __webpack_exports__ = __webpack_require__.O();
/******/ }
]);

"use strict";
(self["pbjsChunk"] = self["pbjsChunk"] || []).push([["gumgumBidAdapter"],{

/***/ "./modules/gumgumBidAdapter.js":
/*!*************************************!*\
  !*** ./modules/gumgumBidAdapter.js ***!
  \*************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

/* unused harmony exports getCids, setIrisId, spec */
/* harmony import */ var _babel_runtime_helpers_defineProperty__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @babel/runtime/helpers/defineProperty */ "../../node_modules/@babel/runtime/helpers/esm/defineProperty.js");
/* harmony import */ var _src_prebidGlobal_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../src/prebidGlobal.js */ "./src/prebidGlobal.js");
/* harmony import */ var _src_mediaTypes_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../src/mediaTypes.js */ "./src/mediaTypes.js");
/* harmony import */ var _src_utils_js__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ../src/utils.js */ "./src/utils.js");
/* harmony import */ var _src_utils_js__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ../src/utils.js */ "./src/utils/winDimensions.js");
/* harmony import */ var _src_utils_js__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! ../src/utils.js */ "../../node_modules/dlv/index.js");
/* harmony import */ var _src_config_js__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(/*! ../src/config.js */ "./src/config.js");
/* harmony import */ var _src_storageManager_js__WEBPACK_IMPORTED_MODULE_7__ = __webpack_require__(/*! ../src/storageManager.js */ "./src/storageManager.js");
/* harmony import */ var _src_adapters_bidderFactory_js__WEBPACK_IMPORTED_MODULE_8__ = __webpack_require__(/*! ../src/adapters/bidderFactory.js */ "./src/adapters/bidderFactory.js");

function ownKeys(e, r) { var t = Object.keys(e); if (Object.getOwnPropertySymbols) { var o = Object.getOwnPropertySymbols(e); r && (o = o.filter(function (r) { return Object.getOwnPropertyDescriptor(e, r).enumerable; })), t.push.apply(t, o); } return t; }
function _objectSpread(e) { for (var r = 1; r < arguments.length; r++) { var t = null != arguments[r] ? arguments[r] : {}; r % 2 ? ownKeys(Object(t), !0).forEach(function (r) { (0,_babel_runtime_helpers_defineProperty__WEBPACK_IMPORTED_MODULE_0__["default"])(e, r, t[r]); }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(e, Object.getOwnPropertyDescriptors(t)) : ownKeys(Object(t)).forEach(function (r) { Object.defineProperty(e, r, Object.getOwnPropertyDescriptor(t, r)); }); } return e; }







/**
 * @typedef {import('../src/adapters/bidderFactory.js').BidRequest} BidRequest
 * @typedef {import('../src/adapters/bidderFactory.js').Bid} Bid
 * @typedef {import('../src/adapters/bidderFactory.js').ServerResponse} ServerResponse
 * @typedef {import('../src/adapters/bidderFactory.js').SyncOptions} SyncOptions
 * @typedef {import('../src/adapters/bidderFactory.js').UserSync} UserSync
 * @typedef {import('../src/adapters/bidderFactory.js').validBidRequests} validBidRequests
 */

const BIDDER_CODE = 'gumgum';
const storage = (0,_src_storageManager_js__WEBPACK_IMPORTED_MODULE_7__.getStorageManager)({
  bidderCode: BIDDER_CODE
});
const ALIAS_BIDDER_CODE = ['gg'];
const BID_ENDPOINT = "https://g2.gumgum.com/hbid/imp";
const JCSI = {
  t: 0,
  rq: 8,
  pbv: "10.19.0-pre"
};
const SUPPORTED_MEDIA_TYPES = [_src_mediaTypes_js__WEBPACK_IMPORTED_MODULE_2__.BANNER, _src_mediaTypes_js__WEBPACK_IMPORTED_MODULE_2__.VIDEO];
const TIME_TO_LIVE = 60;
const DELAY_REQUEST_TIME = 1800000; // setting to 30 mins
const pubProvidedIdSources = ['dac.co.jp', 'audigent.com', 'id5-sync.com', 'liveramp.com', 'intentiq.com', 'liveintent.com', 'crwdcntrl.net', 'quantcast.com', 'adserver.org', 'yahoo.com'];
const invalidRequestIds = {};
let pageViewId = null;

// TODO: potential 0 values for browserParams sent to ad server
function _getBrowserParams(topWindowUrl, mosttopLocation) {
  const paramRegex = paramName => new RegExp("[?#&](".concat(paramName, "=(.*?))($|&)"), 'i');
  let browserParams = {};
  let topWindow;
  let topScreen;
  let topUrl;
  let mosttopURL;
  let ggad;
  let ggdeal;
  let ns;
  function getNetworkSpeed() {
    const connection = window.navigator && (window.navigator.connection || window.navigator.mozConnection || window.navigator.webkitConnection);
    const Mbps = connection && (connection.downlink || connection.bandwidth);
    return Mbps ? Math.round(Mbps * 1024) : null;
  }
  function getOgURL() {
    let ogURL = '';
    const ogURLSelector = "meta[property='og:url']";
    const head = document && document.getElementsByTagName('head')[0];
    const ogURLElement = head.querySelector(ogURLSelector);
    ogURL = ogURLElement ? ogURLElement.content : null;
    return ogURL;
  }
  function stripGGParams(url) {
    const params = ['ggad', 'ggdeal'];
    return params.reduce((result, param) => {
      const matches = url.match(paramRegex(param));
      if (!matches) return result;
      matches[1] && (result = result.replace(matches[1], ''));
      matches[3] && (result = result.replace(matches[3], ''));
      return result;
    }, url);
  }
  try {
    topWindow = __webpack_require__.g.top;
    topScreen = topWindow.screen;
    topUrl = topWindowUrl || '';
    mosttopURL = mosttopLocation || '';
  } catch (error) {
    (0,_src_utils_js__WEBPACK_IMPORTED_MODULE_3__.logError)(error);
    return browserParams;
  }
  browserParams = {
    vw: (0,_src_utils_js__WEBPACK_IMPORTED_MODULE_4__.getWinDimensions)().innerWidth,
    vh: (0,_src_utils_js__WEBPACK_IMPORTED_MODULE_4__.getWinDimensions)().innerHeight,
    sw: topScreen.width,
    sh: topScreen.height,
    pu: stripGGParams(topUrl),
    tpl: mosttopURL,
    ce: storage.cookiesAreEnabled(),
    dpr: topWindow.devicePixelRatio || 1,
    jcsi: JSON.stringify(JCSI),
    ogu: getOgURL()
  };
  ns = getNetworkSpeed();
  if (ns) {
    browserParams.ns = ns;
  }
  ggad = (topUrl.match(paramRegex('ggad')) || [0, 0, 0])[2];
  if (ggad) browserParams[isNaN(ggad) ? 'eAdBuyId' : 'adBuyId'] = ggad;
  ggdeal = (topUrl.match(paramRegex('ggdeal')) || [0, 0, 0])[2];
  if (ggdeal) browserParams.ggdeal = ggdeal;
  return browserParams;
}
function getWrapperCode(wrapper, data) {
  return wrapper.replace('AD_JSON', window.btoa(JSON.stringify(data)));
}

/**
 * Serializes the supply chain object according to IAB standards
 * @see https://github.com/InteractiveAdvertisingBureau/openrtb/blob/master/supplychainobject.md
 * @param {Object} schainObj supply chain object
 * @returns {string}
 */
function _serializeSupplyChainObj(schainObj) {
  let serializedSchain = "".concat(schainObj.ver, ",").concat(schainObj.complete);

  // order of properties: asi,sid,hp,rid,name,domain
  schainObj.nodes.forEach(node => {
    serializedSchain += "!".concat(encodeURIComponent(node['asi'] || ''), ",");
    serializedSchain += "".concat(encodeURIComponent(node['sid'] || ''), ",");
    serializedSchain += "".concat(encodeURIComponent(node['hp'] || ''), ",");
    serializedSchain += "".concat(encodeURIComponent(node['rid'] || ''), ",");
    serializedSchain += "".concat(encodeURIComponent(node['name'] || ''), ",");
    serializedSchain += "".concat(encodeURIComponent(node['domain'] || ''));
  });
  return serializedSchain;
}

/**
 * Determines whether or not the given bid request is valid.
 *
 * @param {BidRequest} bid The bid params to validate.
 * @return boolean True if this is a valid bid, and false otherwise.
 */
function isBidRequestValid(bid) {
  const {
    params,
    adUnitCode
  } = bid;
  const legacyParamID = params.inScreen || params.inScreenPubID || params.inSlot || params.ICV || params.video || params.inVideo;
  const id = legacyParamID || params.slot || params.native || params.zone || params.pubID;
  if (invalidRequestIds[id]) {
    (0,_src_utils_js__WEBPACK_IMPORTED_MODULE_3__.logWarn)("[GumGum] Please check the implementation for ".concat(id, " for the placement ").concat(adUnitCode));
    return false;
  }
  switch (true) {
    case !!params.zone:
      break;
    case !!params.pubId:
      break;
    case !!params.inScreen:
      break;
    case !!params.inScreenPubID:
      break;
    case !!params.inSlot:
      break;
    case !!params.ICV:
      break;
    case !!params.video:
      break;
    case !!params.inVideo:
      break;
    case !!params.videoPubID:
      break;
    default:
      (0,_src_utils_js__WEBPACK_IMPORTED_MODULE_3__.logWarn)("[GumGum] No product selected for the placement ".concat(adUnitCode, ", please check your implementation."));
      return false;
  }
  if (params.bidfloor && !(typeof params.bidfloor === 'number' && isFinite(params.bidfloor))) {
    (0,_src_utils_js__WEBPACK_IMPORTED_MODULE_3__.logWarn)('[GumGum] bidfloor must be a Number');
    return false;
  }
  return true;
}

/**
 * Renames vid params from mediatypes.video keys
 * @param {Object} attributes
 * @returns {Object}
 */
function _getVidParams(attributes) {
  const {
    minduration: mind,
    maxduration: maxd,
    linearity: li,
    startdelay: sd,
    placement: pt,
    plcmt,
    protocols = [],
    playerSize = [],
    skip,
    api,
    mimes,
    playbackmethod,
    playbackend: pbe
  } = attributes;
  const sizes = (0,_src_utils_js__WEBPACK_IMPORTED_MODULE_3__.parseSizesInput)(playerSize);
  const [viw, vih] = sizes[0] && sizes[0].split('x');
  let pr = '';
  if (protocols.length) {
    pr = protocols.join(',');
  }
  const result = {
    mind,
    maxd,
    li,
    sd,
    pt,
    pr,
    viw,
    vih,
    skip,
    pbe
  };
  if (plcmt !== undefined && plcmt !== null) {
    result.vplcmt = plcmt;
  }
  if (api && api.length) {
    result.api = api.join(',');
  }
  if (mimes && mimes.length) {
    result.mimes = mimes.join(',');
  }
  if (playbackmethod && playbackmethod.length) {
    result.pbm = playbackmethod.join(',');
  }
  return result;
}

/**
 * Retrieves the bid floor value, which is the minimum acceptable bid for an ad unit.
 * This function calculates the bid floor based on the given media types and other bidding parameters.
 * @param {Object} mediaTypes - The media types specified for the bid, which might influence floor calculations.
 * @param {number} staticBidFloor - The default or static bid floor set for the bid.
 * @param {Object} bid - The bid object which may contain a method to get dynamic floor values.
 * @returns {Object} An object containing the calculated bid floor and its currency.
 */
function _getFloor(mediaTypes, staticBidFloor, bid) {
  const curMediaType = Object.keys(mediaTypes)[0] || 'banner';
  const bidFloor = {
    floor: 0,
    currency: 'USD'
  };
  if (typeof bid.getFloor === 'function') {
    const {
      currency,
      floor
    } = bid.getFloor({
      mediaType: curMediaType,
      size: '*'
    }) || {};
    floor && (bidFloor.floor = floor);
    currency && (bidFloor.currency = currency);
    if (staticBidFloor && floor && currency === 'USD') {
      bidFloor.floor = Math.max(staticBidFloor, parseFloat(floor));
    }
  } else if (staticBidFloor) {
    bidFloor.floor = staticBidFloor;
  }
  return bidFloor;
}

/**
 * Retrieves the device data from the ORTB2 object
 * @param {Object} ortb2Data ORTB2 object
 * @returns {Object} Device data
 */
function _getDeviceData(ortb2Data) {
  var _device$ext;
  const _device = (0,_src_utils_js__WEBPACK_IMPORTED_MODULE_5__["default"])(ortb2Data, 'device') || {};

  // set device data params from ortb2
  const _deviceRequestParams = {
    ip: _device.ip,
    ipv6: _device.ipv6,
    ua: _device.ua,
    sua: _device.sua ? JSON.stringify(_device.sua) : undefined,
    dnt: _device.dnt,
    os: _device.os,
    osv: _device.osv,
    dt: _device.devicetype,
    lang: _device.language,
    make: _device.make,
    model: _device.model,
    ppi: _device.ppi,
    pxratio: _device.pxratio,
    foddid: _device === null || _device === void 0 || (_device$ext = _device.ext) === null || _device$ext === void 0 ? void 0 : _device$ext.fiftyonedegrees_deviceId
  };

  // return device data params with only non-empty values
  return Object.keys(_deviceRequestParams).reduce((r, key) => {
    if (_deviceRequestParams[key] !== undefined) {
      r[key] = _deviceRequestParams[key];
    }
    return r;
  }, {});
}

/**
 * loops through bannerSizes array to get greatest slot dimensions
 * @param {number[][]} sizes
 * @returns {number[]}
 */
function getGreatestDimensions(sizes) {
  let maxw = 0;
  let maxh = 0;
  let greatestVal = 0;
  sizes.forEach(bannerSize => {
    const [width, height] = bannerSize;
    const greaterSide = width > height ? width : height;
    if (greaterSide > greatestVal || greaterSide === greatestVal && width >= maxw && height >= maxh) {
      greatestVal = greaterSide;
      maxw = width;
      maxh = height;
    }
  });
  return [maxw, maxh];
}
function getEids(userId) {
  const idProperties = ['uid', 'eid', 'lipbid', 'envelope', 'id'];
  return Object.keys(userId).reduce(function (eids, provider) {
    const eid = userId[provider];
    switch (typeof eid) {
      case 'string':
        eids[provider] = eid;
        break;
      case 'object':
        const idProp = idProperties.filter(prop => eid.hasOwnProperty(prop));
        idProp.length && (eids[provider] = eid[idProp[0]]);
        break;
    }
    return eids;
  }, {});
}

/**
 * Builds requests for bids.
 * @param {validBidRequests[]} validBidRequests - An array of valid bid requests.
 * @param {Object} bidderRequest - The bidder's request information.
 * @returns {Object[]} An array of server requests.
 */
function buildRequests(validBidRequests, bidderRequest) {
  const bids = [];
  const gdprConsent = bidderRequest && bidderRequest.gdprConsent;
  const uspConsent = bidderRequest && bidderRequest.uspConsent;
  const gppConsent = bidderRequest && bidderRequest.gppConsent;
  const timeout = bidderRequest && bidderRequest.timeout;
  const coppa = _src_config_js__WEBPACK_IMPORTED_MODULE_6__.config.getConfig('coppa') === true ? 1 : 0;
  const topWindowUrl = bidderRequest && bidderRequest.refererInfo && bidderRequest.refererInfo.page;
  const mosttopLocation = bidderRequest && bidderRequest.refererInfo && bidderRequest.refererInfo.topmostLocation;
  (0,_src_utils_js__WEBPACK_IMPORTED_MODULE_3__._each)(validBidRequests, bidRequest => {
    var _bidderRequest$ortb, _bidRequest$ortb;
    const {
      bidId,
      mediaTypes = {},
      params = {},
      userId = {},
      ortb2Imp,
      adUnitCode = ''
    } = bidRequest;
    const {
      currency,
      floor
    } = _getFloor(mediaTypes, params.bidfloor, bidRequest);
    const eids = getEids(userId);
    const gpid = (0,_src_utils_js__WEBPACK_IMPORTED_MODULE_5__["default"])(ortb2Imp, 'ext.gpid');
    const paapiEligible = (0,_src_utils_js__WEBPACK_IMPORTED_MODULE_5__["default"])(ortb2Imp, 'ext.ae') === 1;
    let sizes = [1, 1];
    let data = {};
    data.displaymanager = 'Prebid.js - gumgum';
    data.displaymanagerver = "10.19.0-pre";
    const date = new Date();
    const lt = date.getTime();
    const to = date.getTimezoneOffset();

    // ADTS-174 Removed unnecessary checks to fix failing test
    data.lt = lt;
    data.to = to;
    function jsoStringifynWithMaxLength(data, maxLength) {
      let jsonString = JSON.stringify(data);
      if (jsonString.length <= maxLength) {
        return jsonString;
      } else {
        const truncatedData = data.slice(0, Math.floor(data.length * (maxLength / jsonString.length)));
        jsonString = JSON.stringify(truncatedData);
        return jsonString;
      }
    }
    // Send filtered pubProvidedId's
    if (userId && userId.pubProvidedId) {
      const filteredData = userId.pubProvidedId.filter(item => pubProvidedIdSources.includes(item.source));
      const maxLength = 1800; // replace this with your desired maximum length
      const truncatedJsonString = jsoStringifynWithMaxLength(filteredData, maxLength);
      data.pubProvidedId = truncatedJsonString;
    }
    // ADJS-1286 Read id5 id linktype field
    if (userId && userId.id5id && userId.id5id.uid && userId.id5id.ext) {
      data.id5Id = userId.id5id.uid || null;
      data.id5IdLinkType = userId.id5id.ext.linkType || null;
    }
    // ADTS-169 add adUnitCode to requests
    if (adUnitCode) data.aun = adUnitCode;

    // ADTS-134 Retrieve ID envelopes
    for (const eid in eids) data[eid] = eids[eid];
    if (mediaTypes.banner) {
      sizes = mediaTypes.banner.sizes;
    } else if (mediaTypes.video) {
      sizes = mediaTypes.video.playerSize;
      data = _getVidParams(mediaTypes.video);
    }

    // ADJS-1024 & ADSS-1297 & ADTS-175
    gpid && (data.gpid = gpid);
    if (pageViewId) {
      data.pv = pageViewId;
    }
    if (floor) {
      data.fp = floor;
      data.fpc = currency;
    }
    if (bidderRequest && bidderRequest.ortb2 && bidderRequest.ortb2.site) {
      var _bidderRequest$ortb2$;
      setIrisId(data, bidderRequest.ortb2.site, params);
      const curl = (_bidderRequest$ortb2$ = bidderRequest.ortb2.site.content) === null || _bidderRequest$ortb2$ === void 0 ? void 0 : _bidderRequest$ortb2$.url;
      if (curl) data.curl = curl;
    }
    if (params.iriscat && typeof params.iriscat === 'string') {
      data.iriscat = params.iriscat;
    }
    if (params.zone || params.pubId) {
      params.zone ? data.t = params.zone : data.pubId = params.pubId;
      data.pi = 2; // inscreen
      // override pi if the following is found
      if (params.slot) {
        const [maxw, maxh] = getGreatestDimensions(sizes);
        data.maxw = maxw;
        data.maxh = maxh;
        data.si = params.slot;
        data.pi = 3;
        data.bf = sizes.reduce((acc, curSlotDim) => "".concat(acc).concat(acc && ',').concat(curSlotDim[0], "x").concat(curSlotDim[1]), '');
      } else if (params.native) {
        data.ni = params.native;
        data.pi = 5;
      } else if (mediaTypes.video) {
        data.pi = mediaTypes.video.linearity === 2 ? 6 : 7; // invideo : video
      } else if (params.product && params.product.toLowerCase() === 'skins') {
        data.pi = 8;
      }
    } else {
      // legacy params
      data = _objectSpread(_objectSpread({}, data), handleLegacyParams(params, sizes));
    }
    if (paapiEligible) {
      data.ae = paapiEligible;
    }
    if (gdprConsent) {
      data.gdprApplies = gdprConsent.gdprApplies ? 1 : 0;
    }
    if (data.gdprApplies) {
      data.gdprConsent = gdprConsent.consentString;
    }
    if (uspConsent) {
      data.uspConsent = uspConsent;
    }
    if (gppConsent) {
      data.gppString = bidderRequest.gppConsent.gppString ? bidderRequest.gppConsent.gppString : '';
      data.gppSid = Array.isArray(bidderRequest.gppConsent.applicableSections) ? bidderRequest.gppConsent.applicableSections.join(',') : '';
    } else if (!gppConsent && bidderRequest !== null && bidderRequest !== void 0 && (_bidderRequest$ortb = bidderRequest.ortb2) !== null && _bidderRequest$ortb !== void 0 && (_bidderRequest$ortb = _bidderRequest$ortb.regs) !== null && _bidderRequest$ortb !== void 0 && _bidderRequest$ortb.gpp) {
      data.gppString = bidderRequest.ortb2.regs.gpp;
      data.gppSid = Array.isArray(bidderRequest.ortb2.regs.gpp_sid) ? bidderRequest.ortb2.regs.gpp_sid.join(',') : '';
    }
    const dsa = (0,_src_utils_js__WEBPACK_IMPORTED_MODULE_5__["default"])(bidderRequest, 'ortb2.regs.ext.dsa');
    if (dsa) {
      data.dsa = JSON.stringify(dsa);
    }
    if (coppa) {
      data.coppa = coppa;
    }
    const schain = bidRequest === null || bidRequest === void 0 || (_bidRequest$ortb = bidRequest.ortb2) === null || _bidRequest$ortb === void 0 || (_bidRequest$ortb = _bidRequest$ortb.source) === null || _bidRequest$ortb === void 0 || (_bidRequest$ortb = _bidRequest$ortb.ext) === null || _bidRequest$ortb === void 0 ? void 0 : _bidRequest$ortb.schain;
    if (schain && schain.nodes) {
      data.schain = _serializeSupplyChainObj(schain);
    }
    const tId = (0,_src_utils_js__WEBPACK_IMPORTED_MODULE_5__["default"])(ortb2Imp, 'ext.tid') || (0,_src_utils_js__WEBPACK_IMPORTED_MODULE_5__["default"])(bidderRequest, 'ortb2.source.tid') || '';
    data.tId = tId;
    Object.assign(data, _getBrowserParams(topWindowUrl, mosttopLocation), _getDeviceData(bidderRequest === null || bidderRequest === void 0 ? void 0 : bidderRequest.ortb2));
    bids.push({
      id: bidId,
      tmax: timeout,
      tId: tId,
      pi: data.pi,
      selector: params.selector,
      sizes,
      url: BID_ENDPOINT,
      method: 'GET',
      data
    });
  });
  return bids;
}
function getCids(site) {
  if (site.content && Array.isArray(site.content.data)) {
    for (const dataItem of site.content.data) {
      if (typeof (dataItem === null || dataItem === void 0 ? void 0 : dataItem.name) === 'string' && (dataItem.name.includes('iris.com') || dataItem.name.includes('iris.tv'))) {
        var _dataItem$ext;
        return Array.isArray((_dataItem$ext = dataItem.ext) === null || _dataItem$ext === void 0 ? void 0 : _dataItem$ext.cids) ? dataItem.ext.cids.join(',') : '';
      }
    }
  }
  return null;
}
function setIrisId(data, site, params) {
  const irisID = getCids(site);
  if (irisID) {
    data.irisid = irisID;
  } else {
    // Just adding this chechk for safty and if needed  we can remove
    if (params.irisid && typeof params.irisid === 'string') {
      data.irisid = params.irisid;
    }
  }
}
function handleLegacyParams(params, sizes) {
  const data = {};
  if (params.inScreenPubID) {
    data.pubId = params.inScreenPubID;
    data.pi = 2;
  }
  if (params.inScreen) {
    data.t = params.inScreen;
    data.pi = 2;
  }
  if (params.inSlot) {
    const [maxw, maxh] = getGreatestDimensions(sizes);
    data.maxw = maxw;
    data.maxh = maxh;
    data.si = params.inSlot;
    data.pi = 3;
    data.bf = sizes.reduce((acc, curSlotDim) => "".concat(acc).concat(acc && ',').concat(curSlotDim[0], "x").concat(curSlotDim[1]), '');
  }
  if (params.ICV) {
    data.ni = params.ICV;
    data.pi = 5;
  }
  if (params.videoPubID) {
    data.pubId = params.videoPubID;
    data.pi = 7;
  }
  if (params.video) {
    data.t = params.video;
    data.pi = 7;
  }
  if (params.inVideo) {
    data.t = params.inVideo;
    data.pi = 6;
  }
  return data;
}

/**
 * Unpack the response from the server into a list of bids.
 *
 * @param {*} serverResponse A successful response from the server.
 * @return {Bid[]} An array of bids which were nested inside the server.
 */
function interpretResponse(serverResponse, bidRequest) {
  const bidResponses = [];
  const serverResponseBody = serverResponse.body;

  // DEMO/TEST: Return selected test creative for Echo Ads demo
  // TODO: Remove this hardcoded response in production
  const isDemoMode = typeof window !== 'undefined' && window.selectedTestCreative;
  if (isDemoMode) {
    // Check if a test creative has been selected from the demo UI
    const selectedCreative = window.selectedTestCreative;
    if (selectedCreative) {
      (0,_src_utils_js__WEBPACK_IMPORTED_MODULE_3__.logWarn)('[GumGum] DEMO MODE: Returning test bid for Echo Ads demo (' + selectedCreative.name + ')');
      return [{
        ad: selectedCreative.creative,
        mediaType: _src_mediaTypes_js__WEBPACK_IMPORTED_MODULE_2__.BANNER,
        cpm: 2.50,
        creativeId: selectedCreative.id,
        currency: 'USD',
        height: selectedCreative.height,
        width: selectedCreative.width,
        netRevenue: true,
        requestId: bidRequest.id,
        ttl: TIME_TO_LIVE,
        meta: {
          advertiserDomains: ['example.com'],
          mediaType: _src_mediaTypes_js__WEBPACK_IMPORTED_MODULE_2__.BANNER
        }
      }];
    } else {
      // Fallback to default ACME creative if no creative is selected
      (0,_src_utils_js__WEBPACK_IMPORTED_MODULE_3__.logWarn)('[GumGum] DEMO MODE: Returning default test bid for Echo Ads demo (ACME 300x250)');
      return [{
        ad: '<a href="https://example.com" target="_blank"><img src="https://gumgum.github.io/echoads/creatives/acme.png" width="300" height="250" border="0" alt="ACME Products" style="display:block;"/></a>',
        mediaType: _src_mediaTypes_js__WEBPACK_IMPORTED_MODULE_2__.BANNER,
        cpm: 2.50,
        creativeId: 'acme-echo-demo',
        currency: 'USD',
        height: 250,
        width: 300,
        netRevenue: true,
        requestId: bidRequest.id,
        ttl: TIME_TO_LIVE,
        meta: {
          advertiserDomains: ['example.com'],
          mediaType: _src_mediaTypes_js__WEBPACK_IMPORTED_MODULE_2__.BANNER
        }
      }];
    }
  }
  if (!serverResponseBody || serverResponseBody.err) {
    const data = bidRequest.data || {};
    const id = data.si || data.ni || data.t || data.pubId;
    const delayTime = serverResponseBody ? serverResponseBody.err.drt : DELAY_REQUEST_TIME;
    invalidRequestIds[id] = {
      productId: data.pi,
      timestamp: new Date().getTime()
    };
    setTimeout(() => {
      !!invalidRequestIds[id] && delete invalidRequestIds[id];
    }, delayTime);
    (0,_src_utils_js__WEBPACK_IMPORTED_MODULE_3__.logWarn)("[GumGum] Please check the implementation for ".concat(id));
  }
  const defaultResponse = {
    ad: {
      price: 0,
      id: 0,
      markup: '',
      width: 0,
      height: 0
    },
    pag: {
      pvid: 0
    },
    meta: {
      adomain: [],
      mediaType: ''
    }
  };
  const {
    ad: {
      price: cpm,
      id: creativeId,
      markup,
      cur,
      width: responseWidth,
      height: responseHeight,
      maxw,
      maxh
    },
    cw: wrapper,
    pag: {
      pvid
    },
    jcsi,
    meta: {
      adomain: advertiserDomains,
      mediaType: type
    }
  } = Object.assign(defaultResponse, serverResponseBody);
  const data = bidRequest.data || {};
  const product = data.pi;
  const mediaType = product === 6 || product === 7 ? _src_mediaTypes_js__WEBPACK_IMPORTED_MODULE_2__.VIDEO : _src_mediaTypes_js__WEBPACK_IMPORTED_MODULE_2__.BANNER;
  const isTestUnit = product === 3 && data.si === 9;
  const metaData = {
    advertiserDomains: advertiserDomains || [],
    mediaType: type || mediaType
  };
  let sizes = (0,_src_utils_js__WEBPACK_IMPORTED_MODULE_3__.parseSizesInput)(bidRequest.sizes);
  if (maxw && maxh) {
    sizes = ["".concat(maxw, "x").concat(maxh)];
  } else if (product === 5 && sizes.includes('1x1')) {
    sizes = ['1x1'];
    // added logic for in-slot multi-szie
  } else if (product === 2 && sizes.includes('1x1') || product === 3) {
    const requestSizesThatMatchResponse = bidRequest.sizes && bidRequest.sizes.reduce((result, current) => {
      const [width, height] = current;
      if (responseWidth === width && responseHeight === height) result.push(current.join('x'));
      return result;
    }, []) || [];
    sizes = requestSizesThatMatchResponse.length ? requestSizesThatMatchResponse : (0,_src_utils_js__WEBPACK_IMPORTED_MODULE_3__.parseSizesInput)(bidRequest.sizes);
  }
  const [width, height] = sizes[0].split('x');
  if (jcsi) {
    serverResponseBody.jcsi = JCSI;
  }

  // update Page View ID from server response
  pageViewId = pvid;
  if (creativeId) {
    bidResponses.push(_objectSpread(_objectSpread({
      // dealId: DEAL_ID,
      // referrer: REFERER,
      ad: wrapper ? getWrapperCode(wrapper, Object.assign({}, serverResponseBody, {
        bidRequest
      })) : markup
    }, mediaType === _src_mediaTypes_js__WEBPACK_IMPORTED_MODULE_2__.VIDEO && {
      ad: markup,
      vastXml: markup
    }), {}, {
      mediaType,
      cpm: isTestUnit ? 0.1 : cpm,
      creativeId,
      currency: cur || 'USD',
      height,
      netRevenue: true,
      requestId: bidRequest.id,
      ttl: TIME_TO_LIVE,
      width,
      meta: metaData
    }));
  }
  return bidResponses;
}

/**
 * Register the user sync pixels which should be dropped after the auction.
 *
 * @param {SyncOptions} syncOptions Which user syncs are allowed?
 * @param {ServerResponse[]} serverResponses List of server's responses.
 * @return {UserSync[]} The user syncs which should be dropped.
 */
function getUserSyncs(syncOptions, serverResponses) {
  const responses = serverResponses.map(response => {
    return response.body && response.body.pxs && response.body.pxs.scr || [];
  });
  const userSyncs = responses.reduce(function (usersyncs, response) {
    return usersyncs.concat(response);
  }, []);
  const syncs = userSyncs.map(sync => {
    return {
      type: sync.t === 'f' ? 'iframe' : 'image',
      url: sync.u
    };
  });
  return syncs;
}
const spec = {
  code: BIDDER_CODE,
  gvlid: 61,
  aliases: ALIAS_BIDDER_CODE,
  isBidRequestValid,
  buildRequests,
  interpretResponse,
  getUserSyncs,
  supportedMediaTypes: SUPPORTED_MEDIA_TYPES
};
(0,_src_adapters_bidderFactory_js__WEBPACK_IMPORTED_MODULE_8__.registerBidder)(spec);
(0,_src_prebidGlobal_js__WEBPACK_IMPORTED_MODULE_1__.registerModule)('gumgumBidAdapter');


/***/ })

},
/******/ __webpack_require__ => { // webpackRuntimeModules
/******/ var __webpack_exec__ = (moduleId) => (__webpack_require__(__webpack_require__.s = moduleId))
/******/ __webpack_require__.O(0, ["chunk-core","viewport","dnt","creative-renderer-display"], () => (__webpack_exec__("./modules/gumgumBidAdapter.js")));
/******/ var __webpack_exports__ = __webpack_require__.O();
/******/ }
]);

})()
 
   pbjs.processQueue();
 
} else {
 try {
  if(window.pbjs.getConfig('debug')) {
    console.warn('Attempted to load a copy of Prebid.js that clashes with the existing \'pbjs\' instance. Load aborted.');
  }
 } catch (e) {}
}

//# sourceMappingURL=prebid.js.map
