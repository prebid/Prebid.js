var utils = require('../utils.js');
var bidfactory = require('../bidfactory.js');
var bidmanager = require('../bidmanager.js');
var adloader = require('../adloader');

var AolAdapter = function AolAdapter() {

  // constants
  var ADTECH_BIDDER_NAME = 'aol';
  var ADTECH_PUBAPI_CONFIG = {
    pixelsDivId: 'pixelsDiv',
    defaultKey: 'aolBid',
    roundingConfig: [
      {
        from: 0,
        to: 999,
        roundFunction: 'tenCentsRound'
      }, {
        from: 1000,
        to: -1,
        roundValue: 1000
      }
    ],
    pubApiOK: _addBid,
    pubApiER: _addErrorBid
  };

  var bids;
  var bidsMap = {};
  var d = window.document;
  var h = d.getElementsByTagName('HEAD')[0];
  var dummyUnitIdCount = 0;

  /**
   * @private create a div that we'll use as the
   * location for the AOL unit; AOL will document.write
   * if the div is not present in the document.
   * @param {String} id to identify the div
   * @return {String} the id used with the div
   */
  function _dummyUnit(id) {
    var div = d.createElement('DIV');

    if (!id || !id.length) {
      id = 'ad-placeholder-' + (++dummyUnitIdCount);
    }

    div.id = id + '-head-unit';
    h.appendChild(div);
    return div.id;
  }

  /**
   * @private Add a succesful bid response for aol
   * @param {ADTECHResponse} response the response for the bid
   * @param {ADTECHContext} context the context passed from aol
   */
  function _addBid(response, context) {
    var bid = bidsMap[context.alias];
    var cpm;

    if (!bid) {
      utils.logError('mismatched bid: ' + context.placement, ADTECH_BIDDER_NAME, context);
      return;
    }

    cpm = response.getCPM();
    if (cpm === null || isNaN(cpm)) {
      return _addErrorBid(response, context);
    }

    // clean up--we no longer need to store the bid
    delete bidsMap[context.alias];

    var bidResponse = bidfactory.createBid(1);
    var ad = response.getCreative();
    if (typeof response.getPixels() !== 'undefined') {
      ad += response.getPixels();
    }
    bidResponse.bidderCode = ADTECH_BIDDER_NAME;
    bidResponse.ad = ad;
    bidResponse.cpm = cpm;
    bidResponse.width = response.getAdWidth();
    bidResponse.height = response.getAdHeight();
    bidResponse.creativeId = response.getCreativeId();

    // add it to the bid manager
    bidmanager.addBidResponse(bid.placementCode, bidResponse);
  }

  /**
   * @private Add an error bid response for aol
   * @param {ADTECHResponse} response the response for the bid
   * @param {ADTECHContext} context the context passed from aol
   */
  function _addErrorBid(response, context) {
    var bid = bidsMap[context.alias];

    if (!bid) {
      utils.logError('mismatched bid: ' + context.placement, ADTECH_BIDDER_NAME, context);
      return;
    }

    // clean up--we no longer need to store the bid
    delete bidsMap[context.alias];

    var bidResponse = bidfactory.createBid(2);
    bidResponse.bidderCode = ADTECH_BIDDER_NAME;
    bidResponse.reason = response.getNbr();
    bidResponse.raw = response.getResponse();
    bidmanager.addBidResponse(bid.placementCode, bidResponse);
  }

  /**
   * @private map a prebid bidrequest to an ADTECH/aol bid request
   * @param {Bid} bid the bid request
   * @return {Object} the bid request, formatted for the ADTECH/DAC api
   */
  function _mapUnit(bid) {
    var alias = bid.params.alias || utils.getUniqueIdentifierStr();

    // save the bid
    bidsMap[alias] = bid;

    return {
      adContainerId: _dummyUnit(bid.params.adContainerId),
      server: bid.params.server, // By default, DAC.js will use the US region endpoint (adserver.adtechus.com)
      sizeid: bid.params.sizeId || 0,
      pageid: bid.params.pageId,
      secure: false,
      serviceType: 'pubapi',
      performScreenDetection: false,
      alias: alias,
      network: bid.params.network,
      placement: parseInt(bid.params.placement),
      gpt: {
        adUnitPath: bid.params.adUnitPath || bid.placementCode,
        size: bid.params.size || (bid.sizes || [])[0]
      },
      params: {
        cors: 'yes',
        cmd: 'bid'
      },
      pubApiConfig: ADTECH_PUBAPI_CONFIG,
      placementCode: bid.placementCode
    };
  }

  /**
   * @private once ADTECH is loaded, request bids by
   * calling ADTECH.loadAd
   */
  function _reqBids() {
    if (!window.ADTECH) {
      utils.logError('window.ADTECH is not present!', ADTECH_BIDDER_NAME);
      return;
    }

    // get the bids
    utils._each(bids, function (bid) {
      var bidreq = _mapUnit(bid);
      window.ADTECH.loadAd(bidreq);
    });
  }

  /**
   * @public call the bids
   * this requests the specified bids
   * from aol marketplace
   * @param {Object} params
   * @param {Array} params.bids the bids to be requested
   */
  function _callBids(params) {
    bids = params.bids;
    if (!bids || !bids.length) return;
    _setDACPubApi();
    _reqBids();
  }

  /**
   * @private
   * Executes all the necessary logic to handle bid requests from AOL.
   * TODO: Refactor and strip out Utils module, use utils from prebid instead.
   */
  function _setDACPubApi() {

    window.ADTECH = window.ADTECH || {
      debugMode: false
    };
    window.ADTECH.config = window.ADTECH.config || { placements:{}, placementsdyn: {} };

    try {

      (function() {

        "use strict";

        var win = window;
        var global = win.ADTECH;

        // Avoid to redefine in case of multiple inclusion
        if(global.loadAd) {
          return;
        }

        /**
         * The logger module provides logging information.
         * This is implemented using classes.
         *
         * Dependencies:
         *    Utils
         *
         * @param {Object} modules  the modules container (to use dependencies)
         * @param {Object} global the global namespace
         * @param {Object} win the window object
         * @constructor
         */
        var Logger = function(modules, global, win) {
          this.enabled = !!global.debugMode;
          this.output = win.console;
          this.modules = modules;
          this.global = global;
          this.win = win;
        };

        Logger.prototype.debug = function(message) {
          if(this.enabled && !!this.output) {
            this.output.log(message);
          }
        };

        Logger.prototype.setEnabled = function(debugMode) {
          this.enabled = !!debugMode || this.global.debugMode;
        };

        Logger.prototype.isEnabled = function() {
          return this.enabled;
        };

        Logger.prototype.logObject = function(module, name, object) {
          var message = module + ':' + name + ' ';
          if(this.modules.Utils.isObject(win.JSON)) {
            message += win.JSON.stringify(object);
          } else {
            message += '{ ';
            this.modules.Utils.eachKey(object, function(key, value) {
              message += key + ':' + value + ' ';
            });
            message += '}';
          }
          this.debug(message);
        };

        /**
         *
         * @param module, the module name or the message itself when the log is called with just a string
         * @param func, the function name
         * @param message, the message
         */
        Logger.prototype.log = function(module, func, message) {
          if(func === undefined && message === undefined) {
            this.debug(module);
          }
          else {
            this.debug(module + "#" + func + " " + message);
          }
        };

        /**
         * Module containing utility functions used by other modules.
         *
         * Dependencies:
         * ResourceManager
         *
         *
         * @param namespace {Object} the namespace where to inject the module's public methods
         * @constructor
         */

        function Utils(namespace, global, win) {
          var MODULE = "Utils", doc = win.document;

          // Loop over each item in an array-like value.
          function each(arr, fn, _this) {
            var i, len = (arr && arr.length) || 0;
            for(i = 0; i < len; i++) {
              fn.call(_this, arr[i], i);
            }
          }

          // Loop over each key/value pair in a hash.
          function eachKey(obj, fn, _this) {
            if(!obj) {
              return;
            }
            var key;
            for(key in obj) {
              if(obj.hasOwnProperty(key)) {
                fn.call(_this, key, obj[key]);
              }
            }
          }

          function isObject(arg) {
            return typeof arg === "object";
          }

          function isString(arg) {
            return typeof arg === "string";
          }

          function isFunc(arg) {
            return typeof arg === "function";
          }

          function isNumber(arg) {
            return typeof arg === "number" && isFinite(arg);
          }

          function isArray(arg) {
            return typeof arg === "object" && arg.constructor === Array;
          }

          function isBoolean(arg) {
            return typeof arg === "boolean";
          }

          function isStringANumber(strNumber) {
            return /^\d*$/.test(strNumber);
          }

          function stringToObject(jsonString) {
            var obj;
            if(!!win.JSON) {
              obj = win.JSON.parse(jsonString);
            }
            else {
              throw new Error('JSON not found. Could not transform the string into an object');
            }
            return obj;
          }

          /**
           * Copies the first level properties of the source obj to the target.
           * No deep copy is performed.
           * If a custom set of properties is wanted only those properties are copied.
           * If the other parameter is set and true then all the properties not in the
           * properties array are copied.
           *
           * @param target
           * @param source
           * @param properties
           * @param isIgnoredSet, if true copy all the properties that are not in the custom properties list
           */
          function copyObject(target, source, properties, isIgnoredSet) {
            var copyFilter, sourceProperties = {};
            if(!properties) {
              copyFilter = function(key, value) {
                target[key] = value;
              };
            }
            else {
              each(properties, function(key) {
                if(source.hasOwnProperty(key)) {
                  sourceProperties[key] = true;
                }
              });
              if(!isIgnoredSet) {
                copyFilter = function(key) {
                  if(sourceProperties[key]) {
                    target[key] = source[key];
                  }
                };
              }
              else {
                copyFilter = function(key, value) {
                  if(!sourceProperties[key]) {
                    target[key] = value;
                  }
                };
              }
            }

            eachKey(source, copyFilter);
          }

          function findAdContainer(config) {
            var injectContainer = doc.getElementById(config.adContainerId);
            return injectContainer !== null && isObject(injectContainer) && injectContainer;
          }

          function createAdContainer(requestContext) {
            var config = requestContext.config, ieVersion = namespace.Environment.getIEVersion;
            if( ! findAdContainer(config)) {
              if(config.ajax && config.ajax.useajax) {
                requestContext.logger.log(MODULE, 'createAdContainer', "<div> element with ID " +
                config.adContainerId + " not found, creation skiped (Ajax call)");
                return;
              }

              if( namespace.ResourceManager.isSync(requestContext.config.legacyDACLoadType, ieVersion) ) {
                doc.write('<div id="' + config.adContainerId + '" style="padding:0;margin:0;border:0;"></div>');
                config.adContainer = doc.getElementById(config.adContainerId);
                requestContext.logger.log(MODULE, 'createAdContainer', "Created <div> element with ID " + config.adContainerId);
              } else {
                throw MODULE + "#createAdContainer Ad Container cannot be created";
              }
            }
          }

          function resolveContainer(config) {
            var injectContainer = doc.getElementById(config.adContainerId);
            if(injectContainer !== null && isObject(injectContainer)) {
              config.adContainer = injectContainer;
              if(!config.skipContainerClean) {
                config.adContainer.innerHTML = '';
              }
            } else {
              throw new Error(MODULE + "#resolveContainer Ad Container not found");
            }
          }

          function generateScriptHTML(requestContext) {
            var adtechQueueAttribute = requestContext.queueId ? ' adtechQueueId="'+requestContext.queueId+'"' : '';
            return '<scr' + 'ipt type="text/javascript" src="' + requestContext.config.adcallUrl + '"' + adtechQueueAttribute + '></scr' + 'ipt>';
          }

          function createClosure(func, logger) {
            return function() {
              try {
                func.apply(null, arguments);
              } catch(e) {
                if(logger) {
                  logger.log('Exception raised: ' + e.message);
                  if(logger.isEnabled()) {
                    throw e;
                  }
                }
              }
            };
          }

          function rnd(max) {
            return Math.round(Math.random() * max);
          }

          function objectsEquals(obj1, obj2, properties, ignore) {
            if(obj1 === undefined || obj2 === undefined) {
              return false;
            }
            if(properties) {
              properties = buildObjectsProperties([obj1, obj2], properties);
            }
            return isObjIncluded(obj1, obj2, properties, ignore) && isObjIncluded(obj2, obj1, properties, ignore);
          }

          function extractObjectProperties(objects, propertyRegEx) {
            var properties = [], flags = {};
            each(objects, function(obj) {
              eachKey(obj, function(key) {
                if(!flags[key] && propertyRegEx.test(key)) {
                  properties.push(key);
                  flags[key] = true;
                }
              });
            });
            return properties;
          }

          function buildObjectsProperties(objs, properties) {
            var propertyPool = [];
            each(properties, function(value) {
              if(value instanceof RegExp) {
                var regExProperties = extractObjectProperties(objs, value);
                if(regExProperties.length > 0) {
                  Array.prototype.push.apply(propertyPool, regExProperties);
                }
              }
              else {
                propertyPool.push(value);
              }
            });
            return propertyPool;
          }

          /**
           * Checks if the structure of obj1 exists in obj2. The obj1 properties has to exists in the
           * obj2 with the same values. If particular properties are objects then those are checked if they
           * match recursively.
           * If a property doesn't exist in both objects, the objects are considered equal for that property.
           *
           * @param {Object} obj1 the source object
           * @param {Object} obj2 the target object
           * @param {Array} properties particular properties to check from obj1 not the whole object.
           * The custom properties are checked only on the first level of the source object.
           * @param ignore true if the properties set in the properties parameter should be ignored
           * @returns {boolean} true if the structure of obj1 is present in obj2
           */
          function isObjIncluded(obj1, obj2, properties, ignore) {
            var i;

            function pass(property) {
              var bothMissing = !(obj1.hasOwnProperty(property) || obj2.hasOwnProperty(property));
              if(bothMissing) {
                return true;
              }
              if(ignore && isCustomProperty(properties, property)) {
                return true;
              }
              else return obj1.hasOwnProperty(property) &&
                  obj2.hasOwnProperty(property) &&
                  ( typeof obj1[property] === 'object' ?
                      objectEquals(obj1[property], obj2[property]) :
                  obj1[property] === obj2[property]);
            }

            if(properties && properties.constructor === Array && !ignore) {
              for(i=0; i<properties.length; i++) {
                if( !pass(properties[i]) ) {
                  return false;
                }
              }
              return true;
            } else {
              for (i in obj1) {
                if( obj1.hasOwnProperty(i) && !pass(i) ) {
                  return false;
                }
              }
              return true;
            }
          }

          function isCustomProperty(properties, property) {
            var status = false;
            each(properties, function(customProperty) {
              if(customProperty === property) {
                status = true;
              }
            });
            return status;
          }

          function cloneArray(array) {
            var clone = [];
            each(array, function(value, index) {
              clone[index] = value;
            });
            return clone;
          }

          function addEventListener(source, eventType, listener) {
            if(source.addEventListener) {
              source.addEventListener(eventType, listener, false);
            }
            else if(source.attachEvent) {
              source.attachEvent('on' + eventType, listener);
            }
            else {
              source['on' + eventType] = listener;
            }
          }

          function getViewportWidth() {
            var docElemWidth = doc.documentElement.clientWidth;
            var width = doc.compatMode === 'CSS1Compat' && docElemWidth || (doc.body && doc.body.clientWidth) || docElemWidth;
            if(!doc.body && width === 0) {
              width = doc.documentElement.scrollWidth;
            }
            return width;
          }

          function getViewportHeight() {
            var height = doc.documentElement.clientHeight;
            if(doc.compatMode !== 'CSS1Compat') {
              height = win.innerHeight || height;
            }
            return height;
          }

          /**
           * Copies a property from the source object to the target object under a different name if the property is not
           * already set on the target object.
           * @param source
           * @param target
           * @param sourcePropertyName
           * @param targetPropertyName
           */
          function copyMissingProperty(source, target, sourcePropertyName, targetPropertyName) {
            if(source[sourcePropertyName] && !target[targetPropertyName]) {
              target[targetPropertyName] = source[sourcePropertyName];
            }
          }

          /**
           * Does a deep copy of the properties of one object into a clone object.
           *
           * @param source the source object
           * @returns an independent object having the same state as the source
           */
          function cloneObject(source) {
            var clone = {};
            eachKey(source, function(key, value) {
              if(isObject(value)) {
                clone[key] = {};
                copyObject(clone[key], value);
              }
              else {
                clone[key] = value;
              }
            });
            return clone;
          }

          /**
           * Resolves the value of a variable set as string.
           * The variable is searched in the page global scope and it can be set as object path too
           * example 'myVariable'
           * example 'myPageConfig.myInnerConfig.mySizeVar' in this the case the value of mySizeVar is resolved if the parent
           * objects exists
           * @param varName the variable name
           * @returns the value of the variable or undefined
           */
          function resolveHostPageVariable(varName) {
            if(!isString(varName)) {
              return;
            }
            var objectPath = varName.split('.');
            var resolvedValue, lastObject = win;
            for(var i = 0; lastObject && i < objectPath.length; i++) {
              lastObject = lastObject[objectPath[i]];
              resolvedValue = lastObject;
            }
            return resolvedValue;
          }

          // Exports
          namespace[MODULE] = {
            each: each,
            eachKey: eachKey,
            isString: isString,
            isObject: isObject,
            isFunc: isFunc,
            isBoolean: isBoolean,
            isNumber: isNumber,
            isArray: isArray,
            isStringANumber: isStringANumber,
            copyObject: copyObject,
            resolveContainer: resolveContainer,
            findAdContainer: findAdContainer,
            generateScriptHTML: generateScriptHTML,
            stringToObject: stringToObject,
            createClosure: createClosure,
            createAdContainer: createAdContainer,
            rnd: rnd,
            objectsEquals: objectsEquals,
            buildObjectsProperties: buildObjectsProperties,
            cloneArray: cloneArray,
            addEventListener: addEventListener,
            getViewportWidth: getViewportWidth,
            getViewportHeight: getViewportHeight,
            copyMissingProperty: copyMissingProperty,
            resolveHostPageVariable: resolveHostPageVariable,
            cloneObject: cloneObject
          };
          return namespace[MODULE];
        }

        /**
         * This module supports the construction of the AdCall URL.
         * It also performs cache busting using the "misc" parameter
         *
         * Dependencies:
         *   Utils
         *
         * @param namespace {Object} the namespace where to inject the module's public methods
         * @constructor
         */

        function AdcallBuilder(namespace) {
          var SEP = "/",
              ENDING_PARAMS = {"rdclick": true, "rdview": true, "link": true};

          /**
           * Builds the ad call URL from configuration.
           */
          function buildUrl(config) {
            if(namespace.Utils.isString(config.adcallUrl)) {
              return;
            }

            if(!config.serviceType) {
              config.serviceType = 'addyn';
            }

            if(!config.serviceVersion) {
              config.serviceVersion = '3.0';
            }

            var url = config.protocol + "://" + config.server + SEP + config.serviceType +
                SEP + config.serviceVersion +
                SEP + config.network +
                SEP + (config.placement ? config.placement : 0) +
                SEP + config.pageid.toString() +
                SEP + config.sizeid.toString() +
                SEP + config.normaltarget;

            url = addUrlParams(url, config, ";");

            config.adcallUrl = url;
          }

          function addUrlParams(url, config, sep, noMisc, ignoreMap, replacements) {
            var addMisc = true, endingUrlPart = "";
            replacements = replacements || {};
            if(namespace.Utils.isObject(config.params)) {
              addMisc = config.params.misc === undefined;
              namespace.Utils.eachKey( config.params, function(k, v) {
                if(ignoreMap && ignoreMap[k]) {
                  return;
                }
                if(replacements[k]) {
                  v = replacements[k];
                  delete replacements[k];
                }
                if(ENDING_PARAMS[k]) {
                  endingUrlPart += sep + k + "=" + v;
                }
                else {
                  url += sep + k + "=" + v;
                }
              });

              namespace.Utils.eachKey(replacements, function( key, value) {
                url += sep + key + "=" + value;
              });
            }

            if(addMisc && !noMisc) {
              url += sep + "misc=" + new Date().getTime();
            }
            url += endingUrlPart;
            return url;
          }

          // Exports
          var MODULE_PUBLIC_NAME = "AdcallBuilder";
          namespace[MODULE_PUBLIC_NAME]= {
            buildUrl: buildUrl,
            addUrlParams: addUrlParams
          };
        }

        /**
         *
         * This module builds the final configuration of a loadAd call resolving different levels of configurations.
         *
         * The different levels of configurations are looked up in the ADTECH.config global object, and each
         * level can set any number of configuration properties.
         *
         * The levels of configuration are the following, starting with the most important one at the top:
         * <ul>
         *   <li>loadAd call configuration</li>
         *   <li>ADTECH.config.placementsdyn[<placementID>].important</li>
         *   <li>ADTECH.config.pagedyn.important<li>
         *   <li>ADTECH.config.networkdyn.important</li>
         *   <li>ADTECH.config.placements[<placementID>].important</li>
         *   <li>ADTECH.config.page.important</li>
         *   <li>ADTECH.config.network.important</li>
         *   <li>ADTECH.config.placementsdyn[<placementID>]</li>
         *   <li>Adtech[<param>+<placementID>] (existing DAC.js dynamic placements)</li>
         *   <li>ADTECH.config.pagedyn</li>
         *   <li>ADTECH.config.networkdyn</li>
         *   <li>ADTECH.config.placements[<placementID>]</li>
         *   <li>ADTECH.config.page</li>
         *   <li>ADTECH.config.network</li>
         * </ul>
         *
         * The ConfigResolver responsibility are:
         * <ul>
         *   <li>Build a final configuration object based on the all the levels that have data set</li>
         *   <li>Log information during the merging process</li>
         * </ul>
         *
         * How individual properties are resolved:
         * The priority hierarchy is traversed from the bottom up and
         * <ul>
         *   <li>Simple properties and functions are assigned to the resulting merged config
         *      possibly overriding lower priority properties</li>
         *   <li>Objects are merged with existing objects. Of course priority matters when merging.</li>
         * </ul>
         * Properties can be unset at any level by setting them to 'null'.
         * If an object property defined at a lower level is set to null in a higher level
         * then the whole object is discarded.
         *
         * Examples:
         * ADTECH.config.page = { sizeid: 14, important:{ network:"aaa" } };
         * ADTECH.config.placement[placementId] = { sizeid: 553, network: "bbb" };
         * result is { sizeid: 553, network: "aaa" }
         *
         * ADTECH.config.page.params = {a: '1', b: '2'};
         * ADTECH.config.placement[placementId].params = {b: '11', c: '22'}
         * result is params: {a: '1', b: '11', c: '22'}
         *
         * Dependencies:
         *   Utils
         *
         * @param namespace {Object} the namespace where to inject the module's public methods
         * @param namespace {Object} the global namespace
         * @constructor
         */

        function ConfigResolver(namespace, global, win) {
          var MODULE = "ConfigResolver";
          var UNDEFINED, utils = namespace.Utils, isObj = utils.isObject, URL_CONFIG_LEVEL = 25;

          function getBoolean(paramName, placementId, to, from) {
            to[paramName] = !! from[paramName + placementId];
          }

          function getOptional(paramName, placementId, to, from) {
            if(from[paramName + placementId]) {
              to[paramName] = from[paramName + placementId];
            }
          }

          /**
           * Builds a configuration objects based on properties found in the Adtech space.
           * There are only a small set of particular properties that are checked.
           *
           * @param {Number} placementId The placement id
           * @returns {Object} a configuration object or nothing if no configurations are found in Adtech scope.
           */
          function buildConfigFromAdtechNamespace(placementId, logger) {
            var config;
            if(win.Adtech !== UNDEFINED) {
              var dynConfig = win.Adtech;

              config = {
                network: dynConfig['networkSubnetwork' + placementId],
                protocol: dynConfig['protocol' + placementId],
                server: dynConfig['adURLHostName' + placementId],
                alias: dynConfig['placementAlias' + placementId],
                kv: dynConfig['KV' + placementId],
                fif: dynConfig['fif' + placementId],
                params: {}
              };

              getBoolean('performScreenDetection', placementId, config, dynConfig);
              getBoolean('performTimezoneDetection', placementId, config, dynConfig);
              getBoolean('performFlashDetection', placementId, config, dynConfig);
              getBoolean('performRichMediaDetection', placementId, config, dynConfig);
              getBoolean('performGeoDetection', placementId, config, dynConfig);
              getBoolean('syncIfPossible', placementId, config, dynConfig);
              getBoolean('legacyDACLoadType', placementId, config, dynConfig);

              getOptional('loc', placementId, config.params, dynConfig);
              getOptional('grp', placementId, config.params, dynConfig);

              logger.logObject(MODULE, 'AdtechConfig', config);
            }
            return config;
          }

          function getPlacementConfig(map, placement, alias, logger, level) {
            if(isObj(map)) {
              var key = alias ? (map[alias] ? alias: placement) : placement;
              logger.log(MODULE, 'getPlacementConfig',
                  'Placement look up for level ' + level + ' done using ' +
                  (key === alias ? 'alias: ' + alias : 'placement id: ' + placement));
              var config = map[key];
              if(!config) {
                config = resolveLinkedIdConfig(map, placement, alias, logger);
              }
              if(config) {
                logger.logObject(MODULE, 'getPlacementConfig', config);
              }
              return config;
            }
            return UNDEFINED;
          }

          function getImportantConfig(obj) {
            return isObj(obj) ? obj.important : UNDEFINED;
          }

          /**
           * Merges two objects, updating the properties of the first object with the values of the
           * second object.
           * If the property is the important object it is ignored.
           * If the property to merge is an object it is merged recursively but only on the first level of
           * properties.
           * If the property is not an object and it is a defined value then it
           * overrides the property of the first object
           *
           * The alias property is handled a little bit different because the alias can be set as a top level property too.
           * The more important level params alias config will override the less important level top alias property.
           *
           * @param {Object} lowPrio The object to be updated
           * @param {Object} highPrio The object that will be merged in the first object.
           * @param {Boolean} stop Flag used for merging object type properties. True only for the first level.
           * @param {Object} propertySet, Contains custom properties that represents a set to ignore or a set or proprieties
           * that should be processed and the rest to be ignored
           * @param {Object} ignore true if the propertySet represents properties to be ignored in the merge, true if only the
           * propertySet should be merge
           */
          function mergeObjs(lowPrio, highPrio, stop, propertySet, ignore) {
            var customProperties = propertySet || {}, complexProps = {ajax: true}, objMergeStop = true, isIgnoreSet = ignore !== UNDEFINED ? ignore: true;
            namespace.Utils.eachKey(highPrio, function(k,v) {
              if(k === 'important' || (isIgnoreSet && !!customProperties[k]) || (isIgnoreSet === false && !customProperties[k])) {
                return;
              }
              if(complexProps[k] === true) {
                objMergeStop = false;
              }
              if(!stop && k === 'params' && v.alias !== UNDEFINED && highPrio.alias === UNDEFINED) {
                lowPrio.alias = v.alias;
              }
              if( isObj(lowPrio[k]) && isObj(v) && !stop){
                mergeObjs(lowPrio[k], v, objMergeStop);
              } else if(lowPrio[k] === UNDEFINED && isObj(v) && !stop) {
                lowPrio[k] = {};
                mergeObjs(lowPrio[k], v, objMergeStop);
              } else if(v === null) {
                delete lowPrio[k];
              } else if(v !== UNDEFINED) {
                lowPrio[k] = v;
              }
            });
          }

          /**
           * Builds the final configuration of the loadAd call. The final configuration is a merge between
           * different levels of configuration and with the configuration supplied in the loadAd call.
           * Each level of configuration is an object set in the ADTECH.config space.
           *
           * @param  requestContext {Object} the load banner request context
           */
          function buildConfiguration(requestContext) {
            var logger = requestContext.logger, callConfiguration = requestContext.config;
            var placement = callConfiguration.placement, alias = callConfiguration.alias;

            if( ! namespace.Utils.isNumber(placement) && ! namespace.Utils.isString(alias)) {
              throw MODULE + ": Invalid ad identifier";
            }

            logger.log(MODULE, 'buildConfiguration', 'Resolving configuration for alias: ' + alias +
            ' and placement: ' + placement);

            var result = {}, i, priorities = createHierarchy(callConfiguration, logger), foundLevels = '';
            var urlTargetingResult = mergeURLTargeting(priorities);
            if(urlTargetingResult.urlTargeting && urlTargetingResult.urlTargeting.doTargeting === true) {
              priorities[URL_CONFIG_LEVEL] = {
                config: {
                  kv: namespace.URLTargeting.extractURLConfig(requestContext, urlTargetingResult.urlTargeting)
                }
              };
            }

            for(i=0; i < priorities.length; i++){
              if(priorities[i] && isObj(priorities[i].config) ){
                foundLevels += " " + i;
                priorities[i].resolvedConfig = resolveDynamicBindings(priorities[i].config, logger);
                mergeObjs(result, priorities[i].resolvedConfig, false, priorities[i].ignore);
              }
            }

            var responsive = result.responsive;
            if(responsive && responsive.bounds && responsive.bounds.length>0 && responsive.useresponsive !== false) {
              for(var j=0; j < responsive.bounds.length; j++) {
                mergeResponsiveBoundConfig(responsive.bounds[j], priorities);
              }
            }

            logger.log(MODULE, 'buildConfiguration', 'Found configuration at priorities' + foundLevels);
            return result;
          }

          function mergeResponsiveBoundConfig(boundConfig, priorities) {
            var temp = {};
            priorities[95] = {resolvedConfig: boundConfig};
            priorities[205] = {resolvedConfig: boundConfig.important};
            for(var i=0; i < priorities.length; i++){
              if(priorities[i] && isObj(priorities[i].resolvedConfig) ){
                mergeObjs(temp, priorities[i].resolvedConfig, false);
              }
            }
            utils.copyObject(boundConfig, temp, ['kv', 'params']);
          }

          function createHierarchy(callConfiguration, logger) {
            var priorities = [];
            var config = global.config, placement = callConfiguration.placement, alias = callConfiguration.alias;
            var placementLevelIgnore = {
              enableMultiAd: true,
              responsiveCheckTimeout: true
            };

            priorities[10] = {
              config: config.network
            };
            priorities[20] = {
              config: config.website
            };
            priorities[30] = {
              config: config.page
            };
            priorities[40] = {
              config: getPlacementConfig(config.placements, placement, alias, logger, 40),
              ignore: placementLevelIgnore
            };
            priorities[50] = {
              config: config.networkdyn
            };
            priorities[60] = {
              config: config.websitedyn
            };
            priorities[70] = {
              config: config.pagedyn
            };
            priorities[80] = {
              config: buildConfigFromAdtechNamespace(callConfiguration.placement, logger)
            };
            priorities[90] = {
              config: getPlacementConfig(config.placementsdyn, placement, alias, logger, 90),
              ignore: placementLevelIgnore
            };
            priorities[110] = {
              config: getImportantConfig(config.network)
            };
            priorities[120] = {
              config: getImportantConfig(config.website)
            };
            priorities[130] = {
              config: getImportantConfig(config.page)
            };
            priorities[140] = {
              config: getPlacementImportantConfig(priorities[40].config, placement, alias, logger, 140),
              ignore: placementLevelIgnore
            };
            priorities[150] = {
              config: getImportantConfig(config.networkdyn)
            };
            priorities[160] = {
              config: getImportantConfig(config.websitedyn)
            };
            priorities[170] = {
              config: getImportantConfig(config.pagedyn)
            };
            priorities[180] = {
              config: getPlacementImportantConfig(priorities[90].config, placement, alias, logger, 180),
              ignore: placementLevelIgnore
            };
            priorities[200] = {
              config: callConfiguration,
              ignore: placementLevelIgnore
            };
            return priorities;
          }

          function mergeURLTargeting(priorities) {
            var result = {};
            for(var i=0; i < priorities.length; i++){
              if(priorities[i] && isObj(priorities[i].config) ){
                mergeObjs(result, priorities[i].config, false, {urlTargeting: true}, false);
              }
            }
            return result;
          }

          /**
           * Extracts the important configuration of a placement level config.
           *
           * @param placementConfig the placement configuration level
           * @param placement the placement used in the request
           * @param alias the alias used in the request
           * @param logger the current logger
           * @param level the config level
           * @returns {*} the config object if found
           */
          function getPlacementImportantConfig(placementConfig, placement, alias, logger, level) {
            logger.log(MODULE, 'getPlacementImportantConfig',
                'Placement look up for level ' + level + ' done using ' +
                'alias: ' + alias + ', placement id: ' + placement);
            return getImportantConfig(placementConfig);
          }

          function resolveDynamicBindings(config, logger) {
            if(!config.dynamicBind) {
              return config;
            }
            var updatedConfig = utils.cloneObject(config);
            logger.logObject(MODULE, 'resolveDynamicBindings', config.dynamicBind);
            resolveDynamicBindingsValues(updatedConfig, config.dynamicBind, logger);
            delete updatedConfig.dynamicBind;
            return updatedConfig;
          }

          /**
           * Resolved the dynamic bind values for a specific configuration. It recursively processes the dynamic bind
           * object and updates the main configuration with the found values.
           * If the value is not found it is not added.
           * In case of arrays like the responsive bounds the resolved value is added to the exiting array if set.
           *
           * @param config the config with the concrete values
           * @param dynamicConfig the dynamic bind that has to be resolved and set in the config
           * @param logger the logger to use
           * @param propertyName, the current config property
           */
          function resolveDynamicBindingsValues(config, dynamicConfig, logger, propertyName) {
            utils.eachKey(dynamicConfig, function (key, value) {
              if (isObj(value)) {
                if (utils.isArray(config)) {
                  key = config.length;
                  if(propertyName == 'bounds' && value.index !== undefined) {
                    key = value.index;
                    delete value.index;
                  }
                }
                if (!config[key]) {
                  config[key] = utils.isArray(value) ? [] : {};
                }
                resolveDynamicBindingsValues(config[key], value, logger, key);
              }
              else {
                var resolvedValue = utils.resolveHostPageVariable(value);
                if (resolvedValue !== undefined) {
                  config[key] = resolvedValue;
                } else if(logger) {
                  logger.log(MODULE, 'resolveDynamicBindingsValues', "Could not find a value for " + value);
                }
              }
            });
          }

          /**
           * Resolves the links between the configurations set on related ids.
           * Example: if the config is set in the ADTECH.config.placements using the alias key with a property 'placement'
           * and the load call is executed with the placement id then the 'alias' key base config is found if there is no
           * config set using the placement key.
           * @param map the placements config can be ADTECH.config.placements or placementsdyn
           * @param placement the placement used in the request
           * @param alias the alias used in the request
           * @param logger the current logger
           * @returns {*} the matched config if found
           */
          function resolveLinkedIdConfig(map, placement, alias, logger) {
            var matchedConfig, property = placement ? 'placement' : 'alias';
            var value =  placement ? placement : alias;
            utils.eachKey(map, function(key, config) {
              var configValue = config[property];
              if(!configValue && property === 'alias' && config.params) {
                configValue = config.params.alias;
              }
              if(configValue === value) {
                matchedConfig = config;
              }
            });
            if(matchedConfig) {
              logger.logObject(MODULE, 'resolveLinkedIdConfig', "Found config on a linked id placement id:" + placement +
              ", alias: " + alias);
            }
            return matchedConfig;
          }

          // Exports
          namespace[MODULE]= {
            buildConfiguration: buildConfiguration
          };
        }

        /**
         * This module provides the following functionality:
         * - Make a conservative copy of the configuration after resolution process
         * - Validate values of the configuration to be the expected types
         * - Throw exception when mandatory parameters are missing
         * - Create missing parameter that are expected to be defined later
         * either from defaults or from simple processing of existing values
         * - Process kv into params
         * - Log the value of the final configuration
         *
         * The finalized configuration will look like this:
         * {
 *   placement: 1234567,
 *   protocol: "http", // Note that "secure" flag will be not defined in final configuration
 *   network: "1.1",
 *   server: "adserver.adtech.de",
 *   pageid: 993838,
 *   sizeid: 829,
 *   normaltarget: "ADTECH",
 *   params: { ... }, // This could be left undefined
 *   fif: {
 *     usefif: false,
 *     width: 0,
 *     height: 0,
 *     preIFrameResize: function() {...} //Can be undefined
 *   },
 *   adContainerId: "1234567",
 *   complete: function(){...}, // This could be left undefined
 *   performGeoDetection: false,
 *   performScreenDetection: true,
 *   performTimezoneDetection: false,
 *   performFlashDetection: false,
 *   performRichMediaDetection: false
 * }
         *
         * Dependencies:
         *   Utils
         *
         * @param namespace {Object} the namespace where to inject the module's public methods
         * @param namespace {Object} the global namespace
         * @param win, {Object} the window context
         * @constructor
         */

        function ConfigFinalizer(namespace, global, win) {
          var MODULE = "ConfigFinalizer", DEFAULT_RESPONSIVE_CHECK_DELAY = 150, DEFAULT_IFRAME_LOAD_RESIZE_CHECK_LIMIT = 500;
          var utils = namespace.Utils;
          var isStr = utils.isString;
          var isNum = utils.isNumber;
          var isObj = utils.isObject;
          var defaultFunc = function() {}, DEFAULT_SERVER = 'adserver.adtechus.com';

          function validNonEmptyStringOr(val, def) {
            return (isStr(val) && val !== "") ? val : def;
          }

          function validNumOr(val, def) {
            return isNum(val) ? val : def;
          }

          function getProtocol(secure) {
            return secure ? "https" : "http";
          }

          function process(config, logger) {
            var result = {}, id;

            if( ! isNum(config.placement) && ! isStr(config.alias) ) {
              throw "config.placement must be a Number or the config.alias has to be a string";
            }

            utils.each(["network"], function(value) {
              if( ! isStr(config[value]) ) {
                throw MODULE + "#process config." + value + " must be a String";
              }
            });

            result.placement = config.placement;
            result.alias = config.alias;
            result.network = config.network;
            result.server = validNonEmptyStringOr(config.server, DEFAULT_SERVER);
            result.protocol = validNonEmptyStringOr(config.protocol, getProtocol(config.secure === true));
            result.pageid = validNumOr(config.pageid, 0);
            result.sizeid = validNumOr(config.sizeid, -1);
            result.normaltarget = validNonEmptyStringOr(config.normaltarget, "ADTECH");
            result.serviceType = validNonEmptyStringOr(config.serviceType, 'addyn');
            result.serviceVersion = validNonEmptyStringOr(config.serviceVersion, '3.0');

            id = config.placement ? config.placement : config.alias;
            result.adContainerId = validNonEmptyStringOr(config.adContainerId, id.toString());
            result.adContainerPrefix = validNonEmptyStringOr(config.adContainerPrefix, "");

            if (result.adContainerId == config.placement && (config.alias || config.adContainerPrefix) && !utils.findAdContainer(result)) {
              result.adContainerId = config.alias;
              if (!utils.findAdContainer(result)) {
                result.adContainerId = result.adContainerPrefix + "" + config.placement;
              }
            }
            else if (result.adContainerId == config.alias && config.adContainerPrefix && !utils.findAdContainer(result)) {
              result.adContainerId = result.adContainerPrefix + "" + config.alias;
            }

            checkBoolean(result, config, 'enableMultiAd', false);
            checkUndefined(result, config, "responsiveCheckTimeout", DEFAULT_RESPONSIVE_CHECK_DELAY);

            if( isObj(config.fif) ) {
              result.fif = {
                usefif: config.fif.usefif !== false,
                width: validNumOr(config.fif.width, 0),
                height: validNumOr(config.fif.height, 0)
              };
              checkTrue(result.fif, config.fif, 'disableFriendlyFlag');
              checkTrue(result.fif, config.fif, 'disableLoadingResize');
              checkUndefined(result.fif, config.fif, 'shareWithAddOns', true);
              result.fif.contentStyle = utils.isString(config.fif.contentStyle) ? config.fif.contentStyle : '';
              result.fif.preResize = utils.isFunc(config.fif.preResize) ? config.fif.preResize : defaultFunc;
              result.fif.onloadResizeCheckTimeLimit = isNum(config.fif.onloadResizeCheckTimeLimit) &&
              config.fif.onloadResizeCheckTimeLimit > 0 ? config.fif.onloadResizeCheckTimeLimit : DEFAULT_IFRAME_LOAD_RESIZE_CHECK_LIMIT;
            } else {
              result.fif = { usefif: false, width: 0, height: 0, disableFriendlyFlag: false,  disableLoadingResize: false};
            }

            if(utils.isFunc(config.complete)) {
              result.complete = config.complete;
            }

            result.error = utils.isFunc(config.error) ? config.error : defaultFunc;

            result.params = {};
            if( isObj(config.params) ) {
              utils.eachKey(config.params, function(k,v) {
                if( isStr(config.params[k]) && config.params[k].length > 0){
                  result.params[k] = config.params[k];
                }
              });
            }
            if(result.alias) {
              result.params.alias = result.alias;
            }

            if( isObj(config.kv) ) {
              setKVData(result, config);
            }

            if(utils.isObject(config.responsive)) {
              result.responsive = {
                useresponsive: config.responsive.useresponsive !== false,
                allowGaps: config.responsive.allowGaps === true,
                bounds : []
              };
              if(utils.isArray(config.responsive.bounds)) {
                utils.each(config.responsive.bounds, function(bound) {
                  if(bound.id && isNum(bound.min) && isNum(bound.max) && bound.min <= bound.max) {
                    result.responsive.bounds.push(bound);
                    if(!bound.params) {
                      bound.params = {};
                    }
                    if( isObj(bound.kv) ) {
                      setKVData(bound, bound);
                      delete bound.kv;
                    }
                  }
                });
              }
              if(result.responsive.bounds.length === 0) {
                result.responsive.useresponsive = false;
              }
            }
            else {
              result.responsive = {
                useresponsive: false,
                bounds: []
              };
            }

            if (result.serviceType === 'pubapi') {
              // do some auto-resolution about CORS, callback function and Ajax config
              if (!result.params.callback && (!result.params.cors || result.params.cors !== 'yes')) {
                result.params.callback = 'ADTECH.pubApiHandler';
              }

              //in case of CORS, make sure we use AJAX
              if(result.params.cors === 'yes'){
                if(!isObj(config.ajax)) {
                  config.ajax = {};
                }

                //the complete function is set to the default handler so
                //PubAPI response 'wrapper' takes place
                if(!utils.isFunc(result.complete)){
                  result.complete = ADTECH.pubApiHandler;
                }
              }

              if(utils.isObject(config.pubApiConfig)) {
                if(config.pubApiConfig.pubApiER && !utils.isFunc(result.error)) {
                  result.error = config.pubApiConfig.pubApiER;
                }

                result.pubApiConfig = config.pubApiConfig;

                //protocol for pixel rendering
                result.pubApiConfig.protocol = result.protocol;
              }  else {
                throw "pubApiConfig#is missing in configuration.";
              }
            }

            if(isObj(config.ajax)) {
              result.ajax = {useajax: config.ajax.useajax !== false};
              result.ajax.method = validNonEmptyStringOr(config.ajax.method, 'GET');
              result.ajax.headers = isObj(config.ajax.headers) ? config.ajax.headers : {};
              result.ajax.xhr = isObj(config.ajax.xhr) ? config.ajax.xhr : {};
              result.ajax.dataType = validNonEmptyStringOr(config.ajax.dataType, 'json');

              checkBoolean(result.ajax.xhr, result.ajax.xhr, 'withCredentials', true);

            } else {
              result.ajax = {useajax: false, headers: {}, xhr: {}};
            }

            checkTrue(result, config, "syncIfPossible");
            checkTrue(result, config, "legacyDACLoadType");

            checkTrue(result, config, "performGeoDetection");
            checkBoolean(result, config, "performScreenDetection", true);
            checkTrue(result, config, "performTimezoneDetection");
            checkTrue(result, config, "performFlashDetection");
            checkTrue(result, config, "performRichMediaDetection");

            result.params.grp = result.params.grp || win.adgroupid;
            utils.each(result.responsive.bounds, function(bound) {
              bound.params.grp = bound.params.grp || win.adgroupid;
            });

            logger.logObject(MODULE, 'finalConfig', result);

            return result;
          }

          function checkTrue(dest, source, propName) {
            dest[propName] = source[propName] === true;
          }

          function checkUndefined(dest, source, propName, defaultVal) {
            dest[propName] = source[propName] !== undefined ? source[propName] : defaultVal;
          }

          function checkBoolean(dest, source, propName, defaultVal) {
            dest[propName] = utils.isBoolean(source[propName]) ? source[propName] : defaultVal;
          }

          function setKVData(result, config) {
            utils.eachKey(config.kv, function(k,v) {
              var akk = [];
              if( utils.isArray(v) ) {
                utils.each(v, function(value){
                  if( isStr(value) || isNum(value) ) {
                    akk.push(value.toString());
                  }
                });
                result.params["kv" + k] = akk.join(":");
              }
              else if( isStr(v) && v.length > 0) {
                result.params["kv" + k] = v.toString();
              }
              else if(isNum(v)) {
                result.params["kv" + k] = v.toString();
              } // else ignore it
            });
          }

          // Exports
          namespace[MODULE] = {
            process: process,
            defaultFunc: defaultFunc
          };
        }

        /**
         * Module responsible with the ajax comunications
         *
         * Dependencies:
         * Utils
         *
         * @param namespace {Object} the namespace where to inject the module's public methods
         * @param global {Object} the global namespace for this library
         * @param win {Object} is the global window object
         * @constructor
         */

        function Ajax(namespace, global, win) {
          var MODULE = "Ajax", utils = namespace.Utils, JSON_DATA_TYPE = 'json';

          function getXMLHttpRequest(requestContext) {
            var xhr, config = requestContext.config, method = config.ajax.method, url = config.adcallUrl;
            if(typeof XMLHttpRequest != "undefined") {
              xhr = new XMLHttpRequest();
            }
            if ("withCredentials" in xhr) {

              if(config.ajax.xhr.withCredentials === true) {
                xhr.withCredentials = true;
              }

              // Check if the XMLHttpRequest object has a "withCredentials" property.
              // "withCredentials" only exists on XMLHTTPRequest2 objects.
              xhr.open(method, url, true);

            } else if (typeof XDomainRequest != "undefined") {

              // Otherwise, check if XDomainRequest.
              // XDomainRequest only exists in IE, and is IE's way of making CORS requests.
              xhr = new XDomainRequest();
              xhr.open(method, url);

            } else {
              xhr = null;
              requestContext.logger.log(MODULE, "getXMLHttpRequest#CORS not supported");
            }

            if(xhr) {
              setRequestHeaders(xhr, config);
              applyCustomHeaders(xhr, config.ajax.headers);
              addCallCallbacks(xhr, requestContext);
            }

            return xhr;
          }

          function setRequestHeaders(xhr, config) {
            if(config.ajax.dataType === JSON_DATA_TYPE) {
              applyCustomHeaders(xhr, {Accept: "application/json, text/javascript, */*; q=0.01"});
            }
          }

          function applyCustomHeaders(xhr, ajaxHeaders) {
            if(!xhr.setRequestHeader) {
              return;
            }
            utils.eachKey(ajaxHeaders, function(key, value) {
              xhr.setRequestHeader(key, value);
            });
          }

          function addCallCallbacks(xhr, requestContext) {
            xhr.onload = function() {processOKResponse(xhr, requestContext);};
            xhr.onerror = function() {processErrorResponse(xhr, requestContext);};
          }

          function processOKResponse(xhr, requestContext) {
            checkQueueStatus(requestContext);
            var config = requestContext.config, response = xhr.responseText, err, status = xhr.status || 200;
            if (status >= 200 && status < 400) {
              try {
                response = processResponseContentType(response, config.ajax.dataType);
              } catch(e) {
                err = e;
                requestContext.logger.log(MODULE,"processOKResponse#" + e.message);
              }
            } else {
              err = new Error("CORS call failed status: " + status);
            }

            var responseContext = getResponseContext(requestContext);

            if(config.complete && !err) {
              config.complete(response, responseContext);
            } else if(err && config.error) {
              config.error(err, responseContext);
            }
          }

          function getResponseContext(requestContext){
            var responseContext = {};

            if(requestContext.config.placement) {
              responseContext.placement = requestContext.config.placement;
            }
            if(requestContext.config.alias) {
              responseContext.alias = requestContext.config.alias;
            }

            return responseContext;
          }
          function processErrorResponse(xhr, requestContext) {
            checkQueueStatus(requestContext);
            var err = new Error("CORS call failed status: " + xhr.status);
            if(requestContext.config.error) {
              requestContext.config.error(err);
            }
          }

          function processResponseContentType(txt, type) {
            if(type === JSON_DATA_TYPE && txt && !!JSON) {
              txt = JSON.parse(txt);
            }
            return txt;
          }

          function checkQueueStatus(requestContext) {
            if(requestContext.queueId && !requestContext.partOfMultiAd) {
              global.queueCallback(requestContext.queueId);
            }
          }

          function doCORSCall(requestContext) {
            var xhr = getXMLHttpRequest(requestContext);
            if(xhr) {
              xhr.send();
            }
          }

          // Exports
          namespace[MODULE]= {
            doCall: doCORSCall,
            getXMLHttpRequest: getXMLHttpRequest
          };

        }

        /**
         * This module supports the translation of loadAd request parameters into an internal configuration
         * object. This is due to enforce separation of concerns from what we expose to the public.
         * We support here several different input parameters configuration for the loadAd call.
         * The return object build by this module is:
         * {
     *   legacyApi: {Boolean} true when we're in legacy API mode (String, String, Object)
     *   config: {Object} see below
     * }
         *
         * In legacy API mode config contains directly the config to use.
         * In new API mode the config object is whatever passed in loadAd or { placement: <placementID> }
         *
         * Dependencies:
         *   Utils
         *
         * @param {Object} namespace  the namespace where to inject the module's public methods
         * @constructor
         */

        /**
         * ==============
         * PubApi
         * ==============
         * The PubApi module exposes some functions to help publishers to
         * handle the PUB API JSON response object more easily.
         *
         * Dependencies:
         *  Environment
         *  ResourceManager
         *  ResourceLoader
         *  Utils
         *
         * @param {Object} namespace the namespace where to inject the module's public methods
         *
         *
         * NOTE: Rounding functions available
         *  hundredRound   :  $1.10 -> $1.00 / $1.49 -> $1.00 / $1.50 -> $2.00 / $1.51 -> $2.00 / $1.55 -> $2.00 / $1.90 -> $2.00
         *  hundredFloor   :  $1.10 -> $1.00 / $1.49 -> $1.00 / $1.50 -> $1.00 / $1.51 -> $1.00 / $1.55 -> $1.00 / $1.90 -> $1.00
         *  hundredCeil    :  $1.10 -> $2.00 / $1.49 -> $2.00 / $1.50 -> $2.00 / $1.51 -> $2.00 / $1.55 -> $2.00 / $1.90 -> $2.00
         *  fiftyRound     :  $1.10 -> $1.00 / $1.49 -> $1.50 / $1.50 -> $1.50 / $1.51 -> $1.50 / $1.55 -> $1.50 / $1.90 -> $2.00
         *  fiftyFloor     :  $1.10 -> $1.00 / $1.49 -> $1.00 / $1.50 -> $1.50 / $1.51 -> $1.50 / $1.55 -> $1.50 / $1.90 -> $1.50
         *  fiftyCeil      :  $1.10 -> $1.50 / $1.49 -> $1.50 / $1.50 -> $1.50 / $1.51 -> $2.00 / $1.55 -> $2.00 / $1.90 -> $2.00
         *  twentyFiveFloor:  $1.10 -> $1.00 / $1.49 -> $1.25 / $1.50 -> $1.50 / $1.51 -> $1.50 / $1.55 -> $1.50 / $1.90 -> $1.75
         *  twentyFiveCeil :  $1.10 -> $1.25 / $1.49 -> $1.50 / $1.50 -> $1.50 / $1.51 -> $1.75 / $1.55 -> $1.75 / $1.90 -> $2.00
         *  twentyFiveRound:  $1.10 -> $1.00 / $1.49 -> $1.50 / $1.50 -> $1.50 / $1.51 -> $1.50 / $1.55 -> $1.50 / $1.90 -> $2.00
         *  tenCentsFloor  :  $1.10 -> $1.10 / $1.49 -> $1.40 / $1.50 -> $1.50 / $1.51 -> $1.50 / $1.55 -> $1.50 / $1.90 -> $1.90
         *  tenCentsCeil   :  $1.10 -> $1.10 / $1.49 -> $1.50 / $1.50 -> $1.50 / $1.51 -> $1.60 / $1.55 -> $1.60 / $1.90 -> $1.90
         *  tenCentsRound  :  $1.10 -> $1.10 / $1.49 -> $1.50 / $1.50 -> $1.50 / $1.51 -> $1.50 / $1.55 -> $1.60 / $1.90 -> $1.90
         *  fiveCentsFloor :  $1.10 -> $1.10 / $1.49 -> $1.45 / $1.50 -> $1.50 / $1.51 -> $1.50 / $1.55 -> $1.55 / $1.90 -> $1.90
         *  fiveCentsCeil  :  $1.10 -> $1.10 / $1.49 -> $1.50 / $1.50 -> $1.50 / $1.51 -> $1.55 / $1.55 -> $1.55 / $1.90 -> $1.90
         *  fiveCentsRound :  $1.10 -> $1.10 / $1.49 -> $1.50 / $1.50 -> $1.50 / $1.51 -> $1.50 / $1.55 -> $1.60 / $1.90 -> $1.90
         */

        function PubApi(namespace) {
          var MODULE = "PubApi";
          var utils = namespace.Utils;
          var isStr = utils.isString;
          var isNum = utils.isNumber;
          var isObj = utils.isObject;
          var isFunc = utils.isFunc;

          var DEFAULT_ROUNDING_FUNC = 'getCPMInCents';

          var data;
          var config;
          var currentRoundingRange;

          var context;

          var setConfig = function (conf){
            this.config = resolveConfig(conf);
          };

          var getBidObj = function() {
            return (this.data.seatbid[0] ? this.data.seatbid[0].bid[0] : undefined);
          };

          var getId = function() {
            return this.data.id;
          };

          var getNbr = function() {
            return this.data.nbr;
          };

          var getAdWidth = function(){
            var ret = Number.NaN;
            if(this.data.seatbid.length > 0) {
              ret = this.data.seatbid[0].bid[0].w;
            }
            return ret;
          };

          var getAdHeight = function (){
            var ret = Number.NaN;
            if(this.data.seatbid.length > 0) {
              ret = this.data.seatbid[0].bid[0].h;
            }
            return ret;
          };

          var getCreativeId = function (){
            var ret = Number.NaN;
            if(this.data.seatbid.length > 0) {
              ret = this.data.seatbid[0].bid[0].crid;
            }
            return ret;
          };

          var getImpId = function (){
            var ret;
            if(this.data.seatbid.length > 0) {
              ret = this.data.seatbid[0].bid[0].impid;
            }
            return ret;
          };

          var getCurrency = function (){
            return this.data.cur;
          };

          /*
           Rounds the value as following:
           - anything greater or equal to X.50 is rounded UP.
           - anything smaller than X.50 is rounded DOWN nearest hundred.

           Ex:   $1.10 -> $1.00
           $1.49 -> $1.00
           $1.50 -> $2.00
           $1.51 -> $2.00
           $1.55 -> $2.00
           $1.90 -> $2.00

           @param num value in cents
           */
          function hundredRound(num){
            return Math.round(num / 100) * 100;
          }

          /*
           Rounds the value as following:
           - anything greater than X.00 is rounded UP to (X+1).00

           Ex:   $1.10 -> $2.00
           $1.49 -> $2.00
           $1.50 -> $2.00
           $1.51 -> $2.00
           $1.55 -> $2.00
           $1.90 -> $2.00

           @param num value in cents
           */
          function hundredCeil(num){
            return Math.ceil(num / 100) * 100;
          }

          /*
           Rounds the value as following:
           - anything smaller or equal to than X.99 is rounded DOWN to X.00

           Ex:   $1.10 -> $1.00
           $1.49 -> $1.00
           $1.50 -> $1.00
           $1.51 -> $1.00
           $1.55 -> $1.00
           $1.90 -> $1.00

           @param num value in cents
           */
          function hundredFloor(num){
            return Math.floor(num / 100) * 100;
          }

          /*
           Round the value as following:
           - anything greater than X.5 is rounded up to the nearest integer.
           - anything smaller than X.5 is rounded down to the nearest integer.
           - if the number is exactly X.50 no rounding is applied.
           Ex:   $1.10 -> $1.00
           $1.49 -> $1.00
           $1.50 -> $1.50
           $1.51 -> $2.00
           $1.55 -> $2.00
           $1.90 -> $2.00

           @param num value in cents
           */
          function fiftyRound(num){
            return round(num, 50);
          }

          /*
           Round the value DOWN to the nearest X.0 or X.5.
           Ex:   $1.10 -> $1.00
           $1.49 -> $1.00
           $1.50 -> $1.50
           $1.51 -> $1.50
           $1.55 -> $1.50
           $1.90 -> $1.50

           @param num value in cents
           */
          function fiftyFloor(num){
            return floor(num, 50);
          }

          /*
           Round the value UP to the nearest X.0 or X.5.
           Ex:   $1.10 -> $1.50
           $1.49 -> $1.50
           $1.50 -> $1.50
           $1.51 -> $2.00
           $1.55 -> $2.00
           $1.90 -> $2.00

           @param num value in cents
           */
          function fiftyCeil(num){
            return ceil(num, 50);
          }

          /*
           * Twenty five rounding functions
           */
          function twentyFiveRound(num){
            return round(num, 25);
          }

          function twentyFiveFloor(num){
            return floor(num, 25);
          }

          function twentyFiveCeil(num){
            return ceil(num, 25);
          }

          /*
           Round the value DOWN to the nearest X.X0.
           Ex:  $1.10 -> $1.10
           $1.49 -> $1.40
           $1.50 -> $1.50
           $1.51 -> $1.50
           $1.55 -> $1.50
           $1.90 -> $1.90
           @param num value in cents
           */
          function tenCentsFloor(num){
            return Math.floor(num / 10) * 10;
          }

          /*
           Round the value UP to the nearest X.X0.
           Ex:   $1.10 -> $1.10
           $1.49 -> $1.50
           $1.50 -> $1.50
           $1.51 -> $1.60
           $1.55 -> $1.60
           $1.90 -> $1.90

           @param num value in cents
           */
          function tenCentsCeil(num){
            return Math.ceil(num / 10) * 10;
          }

          /*
           Round the value as following:
           - anything greater or egual to X.X5 is rounded UP to the nearest X.X0.
           - anything smaller than X.X5 is rounded DOWN to the nearest X.X0.

           Ex:  $1.10 -> $1.10
           $1.49 -> $1.50
           $1.50 -> $1.50
           $1.51 -> $1.50
           $1.55 -> $1.60
           $1.90 -> $1.90

           @param num value in cents
           */
          function tenCentsRound(num){
            return Math.round(num / 10) * 10;
          }

          /*
           * Five cents rounding functions
           */
          function fiveCentsRound(num){
            return round(num, 5);
          }

          function fiveCentsFloor(num){
            return floor(num, 5);
          }

          function fiveCentsCeil(num){
            return ceil(num, 5);
          }

          function round(num, band) {
            var mod5 = num % band;
            return (mod5 >= band/2) ? num + (band - mod5): num - mod5;
          }

          function floor(num, band){
            return num - (num % band);
          }

          function ceil(num, band){
            var mod = num % band;
            return num + (mod ? (band - mod) : 0);
          }

          var getFormattedCPM = function () {
            var roundedCPM = this.getRoundedCPM();
            var i = 0;
            var numStr = (isNaN(roundedCPM) ? "" : ""+roundedCPM);

            if(this.config.padLeftZeros && numStr) {
              for (i = numStr.length; i <  this.config.padLeftZeros; i++) {
                numStr = "0" + numStr;
              }
            }

            return numStr;
          };

          var getCreative = function () {
            var ret;
            if(this.data.seatbid.length > 0){
              ret = this.data.seatbid[0].bid[0].adm;
            }
            return ret;
          };

          var getCPM = function (){
            var ret = Number.NaN;
            if(this.data.seatbid.length > 0) {
              ret = this.data.seatbid[0].bid[0].price;
            }
            return ret;
          };

          var getCPMInCents = function (){
            return Math.round(this.getCPM() * 100);
          };

          var getBidExt = function (){
            var ret;
            var seatbid = this.data.seatbid[0];

            if (seatbid && seatbid.bid[0]) {
              ret = seatbid.bid[0].ext;
            }

            return ret;
          };

          /*
           Function to round the CPM as specified in the roundConfig object
           */
          var getRoundedCPM = function () {
            var num = this.getCPMInCents();
            var i = 0;
            var ret = -1;
            var range, cRange;
            if(this.config.roundingConfig && !isNaN(num)) {
              for(i=0; i < this.config.roundingConfig.length; i++) {
                range = this.config.roundingConfig[i];
                if (
                    (range.from == -1 && (num <= range.to || range.to == -1)) ||
                    (range.to == -1 && num >= range.from) ||
                    (num >= range.from && num <= range.to))
                {
                  cRange = range;
                  break;
                }
              }
            }

            if(cRange){
              if ('roundValue' in cRange) {
                ret = cRange.roundValue;
              } else if (cRange.roundFunction){
                if(namespace.Utils.isString(cRange.roundFunction) && this[cRange.roundFunction]) {
                  ret = this[cRange.roundFunction].call(this,num);
                } else {
                  ret = cRange.roundFunction.call(this,num);
                }
              }
              this.currentRoundingRange = cRange;
            }

            if (ret == -1) {
              ret = num;

              if(this.config.defaultRound) {
                if(namespace.Utils.isString(this.config.defaultRound)) {
                  if (this[this.config.defaultRound]){
                    ret = this[this.config.defaultRound].call(this,num);
                  }
                } else {
                  ret = this.config.defaultRound.call(this,num);
                }
                this.currentRoundingRange = {};
              }
            }

            return ret;
          };

          var getBidKeyValue = function (){
            var formattedCpm = this.getFormattedCPM();
            var ret;
            if(formattedCpm) {
              ret = ((this.currentRoundingRange && this.currentRoundingRange.key) ? this.currentRoundingRange.key : this.config.defaultKey) + '=' + formattedCpm;
            }
            return ret;
          };

          var getBidKeyValueObj = function (){
            var formattedCpm = this.getFormattedCPM();
            var bidKeyObj = {};
            var key = ((this.currentRoundingRange && this.currentRoundingRange.key) ? this.currentRoundingRange.key : this.config.defaultKey);
            if(formattedCpm) {
              bidKeyObj[key] = formattedCpm;
            }

            return bidKeyObj;
          };

          var getPixels = function (){

            if(!this.data || !this.data.ext || !this.data.ext.pixels) {
              return undefined;
            }

            return this.data.ext.pixels;
          };

          var getExt = function (){

            var ret;

            if (this.data && this.data.ext) {
              ret = this.data.ext;
            }

            return ret;

          };

          var getResponse = function (){
            return this.data;
          };

          /*
           * PUB API callback function
           */
          var handleResponse = function (bidData, context) {

            if (!this.config || !this.config.pubApiOK){
              throw new Error("No configuration or callback function available to Pub Api Plugin. Check the configuration object.");
            }
            var config = this.config;
            var pubApiHandler = {
              data: bidData,
              config: this.config,
              getId: getId,
              getBidObj: getBidObj,
              getAdWidth: getAdWidth,
              getAdHeight: getAdHeight,
              getCurrency: getCurrency,
              getCPM: getCPM,
              getCPMInCents: getCPMInCents,
              getRoundedCPM: getRoundedCPM,
              getFormattedCPM: getFormattedCPM,
              getBidKeyValue: getBidKeyValue,
              getBidKeyValueObj: getBidKeyValueObj,
              getExt: getExt,
              getBidExt: getBidExt,
              getPixels: getPixels,
              getCreative: getCreative,
              getCreativeId: getCreativeId,
              getResponse: getResponse,
              getNbr: getNbr,
              getImpId: getImpId,

              /* Rounding functions */
              hundredRound: hundredRound,
              hundredFloor: hundredFloor,
              hundredCeil: hundredCeil,
              fiftyRound: fiftyRound,
              fiftyFloor: fiftyFloor,
              fiftyCeil: fiftyCeil,
              tenCentsFloor: tenCentsFloor,
              tenCentsCeil: tenCentsCeil,
              tenCentsRound: tenCentsRound,
              fiveCentsCeil : fiveCentsCeil,
              fiveCentsRound : fiveCentsRound,
              fiveCentsFloor : fiveCentsFloor,
              twentyFiveCeil : twentyFiveCeil,
              twentyFiveRound : twentyFiveRound,
              twentyFiveFloor : twentyFiveFloor
            };

            //if there's pixels available and a container for the pixels tag is found...
            if (pubApiHandler.getPixels() && document.getElementById(config.pixelsDivId)){

              var postscribeUrl = namespace.ResourceLoader.buildUrl(this.config, 'postscribe.js');
              namespace.ResourceLoader.loadScript(postscribeUrl, 'postscribe', true, function(loadStatus) {
                if(loadStatus) {
                  global.postscribe(document.getElementById(config.pixelsDivId), pubApiHandler.getPixels());
                } else {
                  throw new Error('DACPubApiPlugin# renderPixels.  Postscribe lib failed to load');
                }
              });
            }

            this.config.pubApiOK(pubApiHandler, context);

            if(global.debugMode && console) {
              console.log('Pub API JSON response: '+ JSON.stringify(bidData, null, 2));
            }

          };

          function validNonEmptyStringOr(val, def) {
            return (isStr(val) && val !== "") ? val : def;
          }

          function resolveConfig(config){
            var DEFAULT_KEY = 'aolbid';
            var DEFAULT_FUNC = function() {};
            var DEFAULT_RANGE = {from: -1, to:-1, roundFunction: DEFAULT_ROUNDING_FUNC};
            var result = {};

            if(isObj(config)) {

              result = {
                defaultKey: validNonEmptyStringOr(config.defaultKey, DEFAULT_KEY),
                roundingConfig : []
              };

              if(utils.isArray(config.roundingConfig)) {
                utils.each(config.roundingConfig, function(range) {
                  if(isNum(range.from) && isNum(range.to) && ((isStr(range.roundFunction) ||
                      isFunc(range.roundFunction)) && !range.hasOwnProperty('roundValue')) || (isNum(range.roundValue) &&
                      !range.hasOwnProperty('roundFunction'))) {

                    result.roundingConfig.push(range);

                  }
                  else {
                    throw new Error("Pub Api Plugin config.roundingConfig is invalid.");
                  }
                });
              }

              if(result.roundingConfig.length === 0) {
                result.roundingConfig.push(DEFAULT_RANGE);
              }

              if(!config.pubApiOK || !utils.isFunc(config.pubApiOK)) {
                throw new Error("Invalid Pub Api Plugin configuration. No callback function available (pubApiOK) available!");
              }
              result.pubApiOK = config.pubApiOK;
              result.pubApiER = utils.isFunc(config.pubApiER)? config.pubApiER : DEFAULT_FUNC;

              if(utils.isFunc(config.defaultRound) || isStr(config.defaultRound)){
                result.defaultRound = config.defaultRound;
              }

              if(isNum(config.padLeftZeros) && config.padLeftZeros > 0) {
                result.padLeftZeros = config.padLeftZeros;
              }

              result.protocol = config.protocol;

              if (config.hasOwnProperty('pixelsDivId') && config.pixelsDivId) {
                result.pixelsDivId = config.pixelsDivId;
              }

            }
            else {
              throw new Error("Invalid Pub Api Plugin configuration. No config object available!");
            }

            return result;
          }

          namespace[MODULE] = {
            setConfig:setConfig,
            handleResponse:handleResponse
          };

        }

        /**
         * The RequestContext provides a container for all the request-scoped information.
         * This is implemented using classes.
         *
         * Dependencies:
         * Logger
         *
         * @param {Object} modules  the modules container (to use dependencies)
         * @param {Object} global the global namespace
         * @param {Object} win the window object
         * @constructor
         */
        var RequestContext = function(modules, global, win) {
          this.modules = modules;
          this.global = global;
          this.win = win;
          this.logger = new Logger(modules, global, win);
        };

        RequestContext.prototype.setConfig = function(config) {
          this.config = config;
          this.id = config.alias ? config.alias : config.placement;
        };

        var modules = {
          pluginClasses: {}
        };

        var utils = Utils(modules, global, win);
        Ajax(modules, global, win);
        ConfigResolver(modules, global, win);
        ConfigFinalizer(modules, global, win);
        AdcallBuilder(modules);
        PubApi(modules);

        function buildConfig(requestContext) {
          var mergedConfig = modules.ConfigResolver.buildConfiguration(requestContext);
          requestContext.config = modules.ConfigFinalizer.process(mergedConfig, requestContext.logger);
        }

        function handleNewApi(requestContext) {
          buildConfig(requestContext);
          var requestConfig = requestContext.config;
          modules.PubApi.setConfig(requestConfig.pubApiConfig);

          var config = requestContext.config;
          if(!!requestContext.responsiveId) {
            config = namespace.ResponsiveAdManager.makeResponsiveConfigClone(requestContext);
          }
          modules.AdcallBuilder.buildUrl(config);
          requestContext.config.adcallUrl = config.adcallUrl;

          if(requestContext.config.ajax.useajax) {
            modules.Ajax.doCall(requestContext);
          }
        }

        /**
         * PUB API response handler.
         */
        global.pubApiHandler = function(pubApiResponse, context) {
          modules.PubApi.handleResponse(pubApiResponse, context);
        };

        /**
         * The core of ad call exposed to ADTECH customers.
         *
         * For the input parameters please see the LoadAdParametersHandler Module.
         */
        global.loadAd = function(config) {
          var rethrow = global.debugMode;
          try {

            var requestContext = new RequestContext(modules, global, win);
            requestContext.setConfig(config);
            handleNewApi(requestContext);

          } catch (e) {
            if(rethrow) {
              throw e;
            }
          }
        };

      })();

    } catch(e) {

    }
  }

  return {
    callBids: _callBids
  };
};

module.exports = AolAdapter;
