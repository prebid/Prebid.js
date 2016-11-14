// jscs:disable
// jscs:disable
/* Generated from hbw: 1.7.0 */
var pbjs = window.pbjs || {};
pbjs.que = pbjs.que || [];
var googletag = window.googletag || {};
googletag.cmd = googletag.cmd || [];
var PREBID_TIMEOUT = 1500;

(function() {
  var retries = 0;
  var MAX_RETRIES = 40;
  var data = [
  {
    "group": "list",
    "url": [
      "staging102.weheartit.com"
    ],
    "events": [
      {
        "type": "click",
        "trigger": "a.js-entry-detail-link",
        "target": "ad-placeholder ad",
        "targetGroup": "detail"
      },
      {
        "type": "onload",
        "trigger": "ad",
        "target": "ad",
        "targetGroup": "detail"
      }
    ],
    "adUnits": [
      {
        "code": "grid-ad-atf",
        "bids": [
          {
            "bidder": "appnexus",
            "params": {
              "placementId": "9738223"
            }
          }
        ],
        "sizes": [
          [
            "300",
            "250"
          ]
        ]
      },
      {
        "code": "grid-ad-0",
        "bids": [
          {
            "bidder": "appnexus",
            "params": {
              "placementId": "9738224"
            }
          }
        ],
        "sizes": [
          [
            "300",
            "250"
          ]
        ]
      },
      {
        "code": "grid-ad-1",
        "bids": [
          {
            "bidder": "appnexus",
            "params": {
              "placementId": "9738224"
            }
          }
        ],
        "sizes": [
          [
            "300",
            "250"
          ]
        ]
      },
      {
        "code": "grid-ad-2",
        "bids": [
          {
            "bidder": "appnexus",
            "params": {
              "placementId": "9738224"
            }
          }
        ],
        "sizes": [
          [
            "300",
            "250"
          ]
        ]
      },
      {
        "code": "grid-ad-3",
        "bids": [
          {
            "bidder": "appnexus",
            "params": {
              "placementId": "9738224"
            }
          }
        ],
        "sizes": [
          [
            "300",
            "250"
          ]
        ]
      },
      {
        "code": "grid-ad-4",
        "bids": [
          {
            "bidder": "appnexus",
            "params": {
              "placementId": "9738224"
            }
          }
        ],
        "sizes": [
          [
            "300",
            "250"
          ]
        ]
      },
      {
        "code": "grid-ad-5",
        "bids": [
          {
            "bidder": "appnexus",
            "params": {
              "placementId": "9738224"
            }
          }
        ],
        "sizes": [
          [
            "300",
            "250"
          ]
        ]
      },
      {
        "code": "grid-ad-6",
        "bids": [
          {
            "bidder": "appnexus",
            "params": {
              "placementId": "9738224"
            }
          }
        ],
        "sizes": [
          [
            "300",
            "250"
          ]
        ]
      },
      {
        "code": "grid-ad-7",
        "bids": [
          {
            "bidder": "appnexus",
            "params": {
              "placementId": "9738224"
            }
          }
        ],
        "sizes": [
          [
            "300",
            "250"
          ]
        ]
      },
      {
        "code": "grid-ad-8",
        "bids": [
          {
            "bidder": "appnexus",
            "params": {
              "placementId": "9738224"
            }
          }
        ],
        "sizes": [
          [
            "300",
            "250"
          ]
        ]
      },
      {
        "code": "grid-ad-9",
        "bids": [
          {
            "bidder": "appnexus",
            "params": {
              "placementId": "9738224"
            }
          }
        ],
        "sizes": [
          [
            "300",
            "250"
          ]
        ]
      },
      {
        "code": "grid-ad-10",
        "bids": [
          {
            "bidder": "appnexus",
            "params": {
              "placementId": "9738224"
            }
          }
        ],
        "sizes": [
          [
            "300",
            "250"
          ]
        ]
      },
      {
        "code": "grid-ad-11",
        "bids": [
          {
            "bidder": "appnexus",
            "params": {
              "placementId": "9738224"
            }
          }
        ],
        "sizes": [
          [
            "300",
            "250"
          ]
        ]
      },
      {
        "code": "grid-ad-12",
        "bids": [
          {
            "bidder": "appnexus",
            "params": {
              "placementId": "9738224"
            }
          }
        ],
        "sizes": [
          [
            "300",
            "250"
          ]
        ]
      },
      {
        "code": "grid-ad-13",
        "bids": [
          {
            "bidder": "appnexus",
            "params": {
              "placementId": "9738224"
            }
          }
        ],
        "sizes": [
          [
            "300",
            "250"
          ]
        ]
      },
      {
        "code": "grid-ad-14",
        "bids": [
          {
            "bidder": "appnexus",
            "params": {
              "placementId": "9738224"
            }
          }
        ],
        "sizes": [
          [
            "300",
            "250"
          ]
        ]
      },
      {
        "code": "grid-ad-15",
        "bids": [
          {
            "bidder": "appnexus",
            "params": {
              "placementId": "9738224"
            }
          }
        ],
        "sizes": [
          [
            "300",
            "250"
          ]
        ]
      },
      {
        "code": "grid-ad-16",
        "bids": [
          {
            "bidder": "appnexus",
            "params": {
              "placementId": "9738224"
            }
          }
        ],
        "sizes": [
          [
            "300",
            "250"
          ]
        ]
      },
      {
        "code": "grid-ad-17",
        "bids": [
          {
            "bidder": "appnexus",
            "params": {
              "placementId": "9738224"
            }
          }
        ],
        "sizes": [
          [
            "300",
            "250"
          ]
        ]
      },
      {
        "code": "grid-ad-18",
        "bids": [
          {
            "bidder": "appnexus",
            "params": {
              "placementId": "9738224"
            }
          }
        ],
        "sizes": [
          [
            "300",
            "250"
          ]
        ]
      },
      {
        "code": "grid-ad-19",
        "bids": [
          {
            "bidder": "appnexus",
            "params": {
              "placementId": "9738224"
            }
          }
        ],
        "sizes": [
          [
            "300",
            "250"
          ]
        ]
      },
      {
        "code": "entry-sidebar-right",
        "bids": [
          {
            "bidder": "appnexus",
            "params": {
              "placementId": "9738225"
            }
          }
        ],
        "sizes": [
          [
            "160",
            "600"
          ]
        ]
      },
      {
        "code": "entry-mid-large",
        "bids": [
          {
            "bidder": "appnexus",
            "params": {
              "placementId": "9738226"
            }
          }
        ],
        "sizes": [
          [
            "970",
            "250"
          ],
          [
            "728",
            "90"
          ],
          [
            "970",
            "90"
          ]
        ]
      }
    ]
  },
  {
    "group": "list-mobile",
    "on_page_var": {
      "name": "window.whiConfig.mobile_site",
      "value": [
        "true"
      ]
    },
    "url": [
      "staging102.weheartit.com"
    ],
    "adUnits": [
      {
        "code": "mobile-grid-ad-0",
        "bids": [
          {
            "bidder": "appnexus",
            "params": {
              "placementId": "9738236"
            }
          }
        ],
        "sizes": [
          [
            "300",
            "250"
          ]
        ]
      },
      {
        "code": "mobile-grid-ad-1",
        "bids": [
          {
            "bidder": "appnexus",
            "params": {
              "placementId": "9738236"
            }
          }
        ],
        "sizes": [
          [
            "300",
            "250"
          ]
        ]
      },
      {
        "code": "mobile-grid-ad-2",
        "bids": [
          {
            "bidder": "appnexus",
            "params": {
              "placementId": "9738236"
            }
          }
        ],
        "sizes": [
          [
            "300",
            "250"
          ]
        ]
      },
      {
        "code": "mobile-grid-ad-3",
        "bids": [
          {
            "bidder": "appnexus",
            "params": {
              "placementId": "9738236"
            }
          }
        ],
        "sizes": [
          [
            "300",
            "250"
          ]
        ]
      },
      {
        "code": "mobile-grid-ad-4",
        "bids": [
          {
            "bidder": "appnexus",
            "params": {
              "placementId": "9738236"
            }
          }
        ],
        "sizes": [
          [
            "300",
            "250"
          ]
        ]
      },
      {
        "code": "mobile-grid-ad-5",
        "bids": [
          {
            "bidder": "appnexus",
            "params": {
              "placementId": "9738236"
            }
          }
        ],
        "sizes": [
          [
            "300",
            "250"
          ]
        ]
      },
      {
        "code": "mobile-grid-ad-6",
        "bids": [
          {
            "bidder": "appnexus",
            "params": {
              "placementId": "9738236"
            }
          }
        ],
        "sizes": [
          [
            "300",
            "250"
          ]
        ]
      },
      {
        "code": "mobile-grid-ad-7",
        "bids": [
          {
            "bidder": "appnexus",
            "params": {
              "placementId": "9738236"
            }
          }
        ],
        "sizes": [
          [
            "300",
            "250"
          ]
        ]
      },
      {
        "code": "mobile-grid-ad-8",
        "bids": [
          {
            "bidder": "appnexus",
            "params": {
              "placementId": "9738236"
            }
          }
        ],
        "sizes": [
          [
            "300",
            "250"
          ]
        ]
      },
      {
        "code": "mobile-grid-ad-9",
        "bids": [
          {
            "bidder": "appnexus",
            "params": {
              "placementId": "9738236"
            }
          }
        ],
        "sizes": [
          [
            "300",
            "250"
          ]
        ]
      }
    ]
  },
  {
    "group": "detail",
    "url": [
      "staging102.weheartit.com/entry"
    ],
    "adUnits": [
      {
        "code": "entry-sidebar-right",
        "bids": [
          {
            "bidder": "appnexus",
            "params": {
              "placementId": "9738225"
            }
          }
        ],
        "sizes": [
          [
            "160",
            "600"
          ]
        ]
      },
      {
        "code": "entry-mid-large",
        "bids": [
          {
            "bidder": "appnexus",
            "params": {
              "placementId": "9738226"
            }
          }
        ],
        "sizes": [
          [
            "970",
            "250"
          ],
          [
            "728",
            "90"
          ],
          [
            "970",
            "90"
          ]
        ]
      }
    ]
  }
];

  var siteData;

  //1) check on page var matching first
  data.forEach(function(config){
    if(config.on_page_var) {
        try {
          if(getVarConfig(config)) {
            siteData = config;
          }
        }catch(e){}
      }
  });

  function getVarConfig(config) {
      var matched = false;
      var pieces = config.on_page_var.name.split('.');
      config.on_page_var.value.forEach(function(value){
        var current = window;
        for (var i=0; i<= pieces.length; i++){
          if(current[pieces[i]]){
            if(current[pieces[i]] === value) {
              logMatch('var', config.on_page_var.name, value);
              matched = true;
            }
            //move to next object to check
            current = current[pieces[i]];
          }
        }
      });
      return matched;
  }

  //2) Check page URL matching 2nd.
  if(!siteData) {
    siteData = getConfig(data);
  }

  if(!siteData) {
    console.error('No valid configuration found for site');
    //invoke refresh call immediately and return
    initAdserver();
    return;
  }

  pbjs.que.push(function() {
    pbjs.enableAnalytics([
          {
            provider: 'appnexus',
            options: {
              memberId: 7105
            }
          }
        ]);
    pbjs.logging = true;
    pbjs.setPriceGranularity("dense");
    pbjs.enableSendAllBids();
    pbjs.addAdUnits(siteData.adUnits);
    window.addEventListener('load', function() {
      pbjs.registerEnterpriseEvents(siteData, data);
    });
    pbjs.requestBids({
      bidsBackHandler: function(bidResponses) {
        initAdserver();
      }
    });
    //TODO: Bidder configuration settings
    /*
    pbjs.bidderSettings =
      {
          standard: {
              adserverTargeting: [
                  {
                      key: "hb_bidder",
                      val: function (bidResponse) {
                          return bidResponse.bidderCode;
                      }
                  }, {
                      key: "hb_adid",
                      val: function (bidResponse) {
                          return bidResponse.adId;
                      }
                  }, {
                      key: "hb_pb",
                      val: function (bidResponse) {
                          //change default here
                          return '10.00';
                      }
                  }, {
                      key: "hb_size",
                      val: function (bidResponse) {
                          return bidResponse.size;

                      }
                  }
              ]

          }
      };
     */
  });



  /**
   * UTIL FUNCTIONS
   **/

  function initAdserver() {
    if (pbjs.initAdserverSet) {
      return;
    }
    if(!googletag.pubadsReady && retries <= MAX_RETRIES) {
      setTimeout(initAdserver, 75); //poll is hardcoded for now
      retries++;
      return;
    }
    googletag.cmd.push(function() {
      pbjs.que.push(function() {
        pbjs.setTargetingForGPTAsync();
      });
      googletag.pubads().refresh();
    });
    pbjs.initAdserverSet = true;
  }

  function logMatch(type, key, value) {
    if(type === 'url') {
      console.log('configuration matched for type: "url" Matched key: ' + key );
    }
    else{
      console.log('configuration matched for type: "var" Matched var name: ' + key + ' matched value: ' + value );
    }
  }

  function getConfig(data) {
    if (!data) return;

    var url = getHref();
    var keys = getKey(url);
    var config;
    keys.some(function(key) {
      return data.some(function(configObj){
        if(!configObj || !configObj.url) return;
        configObj.url.forEach(function(url){
          if (url === key) {
            config = configObj;
            logMatch('url', key);
          }
        });

        return !!config;
      });

    });
    return config;
  }

  function getHref() {
    var val = '';
    try {
      val = window.location.host + window.location.pathname;
    } catch (e) {
      console.log(e);
    }
    return val;
  }

  function getKey(str) {
    var parts = str.split('\/');
    var arr = [];
    for (var i = 0; i < parts.length; i++) {
      var url = '';
      for (var k = 0; k < parts.length - i; k++) {
        url += '/' + parts[k];
      }
      url = url.substr(1, url.length);
      arr.push(url);
      //match trailing slash in config (RAD-1018)
      arr.push(url + '/');
    }
    return arr;
  }

  setTimeout(initAdserver, PREBID_TIMEOUT);

})(); //end closure
/******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};
/******/
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/
/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId])
/******/ 			return installedModules[moduleId].exports;
/******/
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			exports: {},
/******/ 			id: moduleId,
/******/ 			loaded: false
/******/ 		};
/******/
/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/
/******/ 		// Flag the module as loaded
/******/ 		module.loaded = true;
/******/
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/
/******/
/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;
/******/
/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;
/******/
/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";
/******/
/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(0);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/***/ function(module, exports, __webpack_require__) {

	__webpack_require__(1);
	module.exports = __webpack_require__(12);


/***/ },
/* 1 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	var _protobufLightMin = __webpack_require__(2);

	var _protobufLightMin2 = _interopRequireDefault(_protobufLightMin);

	var _utils = __webpack_require__(10);

	function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

	var protoSpec = __webpack_require__(11);


	var Builder = _protobufLightMin2.default.loadJson(protoSpec);
	var Analytics = Builder.build('LogPrebidEvents');
	var Auction = Analytics.Auction;
	var url = 'https://rb.adnxs.com/pack?log=log_prebid_events&format=protobuf';
	// const url = 'http://httpbin.org/post';
	var LIMIT = 100;
	var sendBatch = (0, _utils.debounce)(send, LIMIT);

	var _topLevel = {};
	var _queue = [];
	var _sent = [];

	/**
	 * Global function to handle events emitted from Prebid.js AnalyticsAdapter
	 */
	window.AppNexusPrebidAnalytics = function (handler, eventType, data) {
	  logEvent({ eventType: eventType, data: data });
	  sendBatch();
	};

	/**
	 * Construct analytics payload and send to endpoint
	 */
	function send() {
	  console.log('Q:', _queue);

	  var analytics = Object.assign({}, _topLevel, {
	    timestamp: Math.floor(Date.now() / 1000),
	    auctions: _queue.map(function (log) {
	      return new Auction(log);
	    })
	  });

	  var payload = new Analytics(analytics).toArrayBuffer();

	  (0, _utils.ajax)(url, payload, function (result) {
	    return console.log('Sent Prebid Analytics:', result);
	  });

	  // TODO: reconcile _sent queue with results from ajax request
	  _sent = _sent.concat(_queue);
	  _queue = [];
	}

	/**
	 * Dispatch event to correct handler
	 */
	function logEvent(_ref) {
	  var eventType = _ref.eventType;

	  switch (eventType) {
	    case 'auctionInit':
	      auctionInit.apply(undefined, arguments);
	      break;

	    case 'bidRequested':
	      bidRequested.apply(undefined, arguments);
	      break;

	    case 'bidResponse':
	      bidResponse.apply(undefined, arguments);
	      break;

	    case 'bidWon':
	      bidWon.apply(undefined, arguments);
	      break;

	    case 'bidTimeout':
	      bidTimeout.apply(undefined, arguments);
	      break;
	  }
	}

	function auctionInit(_ref2) {
	  var data = _ref2.data;

	  _topLevel = {
	    referer_url: document.referrer,
	    seller_member_id: data.config ? data.config.memberId : undefined
	  };

	  _queue.push({
	    prebid_auction_id: data.requestId,
	    configured_timeout_ms: data.timeout
	  });
	}

	function bidRequested(_ref3) {
	  var data = _ref3.data;

	  _queue.push({
	    prebid_auction_id: data.requestId,
	    ad_units: data.bids.map(function (bid) {
	      return {
	        ad_unit_code: bid.placementCode,
	        bids: [{
	          bid_id: bid.bidId,
	          bidder_code: bid.bidder,
	          request_timestamp: data.start
	        }]
	      };
	    })
	  });
	}

	function bidResponse(_ref4) {
	  var data = _ref4.data;

	  _queue.push({
	    prebid_auction_id: data.requestId,
	    ad_units: [{
	      ad_unit_code: data.adUnitCode,
	      bids: [{
	        bid_id: data.adId,
	        bidder_code: data.bidder,
	        price: data.cpm,
	        bidder_ad_unit_id: data.adSlot, // not sure about this
	        request_timestamp: data.requestTimestamp,
	        response_timestamp: data.responseTimestamp,
	        creative: {
	          creative_id: data.creative_id && String(data.creative_id),
	          height: +data.height,
	          width: +data.width,
	          brand: data.brand // we don't currently support this
	        }
	      }]
	    }]
	  });
	}

	function bidWon(_ref5) {
	  var data = _ref5.data;

	  // log "bid won" for the winning bid of a placement
	  _queue.push({
	    prebid_auction_id: data.requestId,
	    ad_units: [{
	      ad_unit_code: data.adUnitCode,
	      bids: [{
	        bid_id: data.adId,
	        bidder_code: data.bidder,
	        price: data.cpm,
	        status_code: 10 // Bid won auction
	      }]
	    }]
	  });

	  // get other bids in the auction for the placement and log "bid lost" status code
	  _queue = _queue.concat(pbjs._bidsReceived.filter(function (bid) {
	    return bid !== data && bid.adUnitCode === data.adUnitCode;
	  }).map(function (bid) {
	    return {
	      prebid_auction_id: bid.requestId,
	      ad_units: [{
	        ad_unit_code: bid.adUnitCode,
	        bids: [{
	          bid_id: bid.adId,
	          bidder_code: bid.bidder,
	          status_code: 11 // Bid lost auction
	        }]
	      }]
	    };
	  }));
	}

	function bidTimeout(_ref6) {
	  var data = _ref6.data;

	  _queue = _queue.concat(pbjs._bidsReceived.filter(function (bid) {
	    return data.indexOf(bid.bidder) > -1;
	  }).map(function (bid) {
	    return {
	      prebid_auction_id: bid.requestId,
	      ad_units: [{
	        ad_unit_code: bid.adUnitCode,
	        bids: [{
	          bid_id: bid.adId,
	          bidder_code: bid.bidder,
	          status_code: 13 // Bid received after timeout reached
	        }]
	      }]
	    };
	  }));
	}

/***/ },
/* 2 */
/***/ function(module, exports, __webpack_require__) {

	var __WEBPACK_AMD_DEFINE_FACTORY__, __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;/* WEBPACK VAR INJECTION */(function(process) {/*
	 protobuf.js (c) 2013 Daniel Wirtz <dcode@dcode.io>
	 Released under the Apache License, Version 2.0
	 see: https://github.com/dcodeIO/protobuf.js for details
	*/
	(function(h,y){ true?!(__WEBPACK_AMD_DEFINE_ARRAY__ = [__webpack_require__(4)], __WEBPACK_AMD_DEFINE_FACTORY__ = (y), __WEBPACK_AMD_DEFINE_RESULT__ = (typeof __WEBPACK_AMD_DEFINE_FACTORY__ === 'function' ? (__WEBPACK_AMD_DEFINE_FACTORY__.apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__)) : __WEBPACK_AMD_DEFINE_FACTORY__), __WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__)):"function"===typeof require&&"object"===typeof module&&module&&module.exports?module.exports=y(require("bytebuffer"),!0):(h.dcodeIO=h.dcodeIO||{}).ProtoBuf=y(h.dcodeIO.ByteBuffer)})(this,function(h,y){var c={};c.ByteBuffer=h;c.Long=h.Long||null;c.VERSION="5.0.1";c.WIRE_TYPES={};c.WIRE_TYPES.VARINT=0;c.WIRE_TYPES.BITS64=1;c.WIRE_TYPES.LDELIM=2;c.WIRE_TYPES.STARTGROUP=3;c.WIRE_TYPES.ENDGROUP=4;c.WIRE_TYPES.BITS32=5;c.PACKABLE_WIRE_TYPES=
	[c.WIRE_TYPES.VARINT,c.WIRE_TYPES.BITS64,c.WIRE_TYPES.BITS32];c.TYPES={int32:{name:"int32",wireType:c.WIRE_TYPES.VARINT,defaultValue:0},uint32:{name:"uint32",wireType:c.WIRE_TYPES.VARINT,defaultValue:0},sint32:{name:"sint32",wireType:c.WIRE_TYPES.VARINT,defaultValue:0},int64:{name:"int64",wireType:c.WIRE_TYPES.VARINT,defaultValue:c.Long?c.Long.ZERO:void 0},uint64:{name:"uint64",wireType:c.WIRE_TYPES.VARINT,defaultValue:c.Long?c.Long.UZERO:void 0},sint64:{name:"sint64",wireType:c.WIRE_TYPES.VARINT,
	defaultValue:c.Long?c.Long.ZERO:void 0},bool:{name:"bool",wireType:c.WIRE_TYPES.VARINT,defaultValue:!1},"double":{name:"double",wireType:c.WIRE_TYPES.BITS64,defaultValue:0},string:{name:"string",wireType:c.WIRE_TYPES.LDELIM,defaultValue:""},bytes:{name:"bytes",wireType:c.WIRE_TYPES.LDELIM,defaultValue:null},fixed32:{name:"fixed32",wireType:c.WIRE_TYPES.BITS32,defaultValue:0},sfixed32:{name:"sfixed32",wireType:c.WIRE_TYPES.BITS32,defaultValue:0},fixed64:{name:"fixed64",wireType:c.WIRE_TYPES.BITS64,
	defaultValue:c.Long?c.Long.UZERO:void 0},sfixed64:{name:"sfixed64",wireType:c.WIRE_TYPES.BITS64,defaultValue:c.Long?c.Long.ZERO:void 0},"float":{name:"float",wireType:c.WIRE_TYPES.BITS32,defaultValue:0},"enum":{name:"enum",wireType:c.WIRE_TYPES.VARINT,defaultValue:0},message:{name:"message",wireType:c.WIRE_TYPES.LDELIM,defaultValue:null},group:{name:"group",wireType:c.WIRE_TYPES.STARTGROUP,defaultValue:null}};c.MAP_KEY_TYPES=[c.TYPES.int32,c.TYPES.sint32,c.TYPES.sfixed32,c.TYPES.uint32,c.TYPES.fixed32,
	c.TYPES.int64,c.TYPES.sint64,c.TYPES.sfixed64,c.TYPES.uint64,c.TYPES.fixed64,c.TYPES.bool,c.TYPES.string,c.TYPES.bytes];c.ID_MIN=1;c.ID_MAX=536870911;c.convertFieldsToCamelCase=!1;c.populateAccessors=!0;c.populateDefaults=!0;c.Util=function(){var b={};b.IS_NODE=!("object"!==typeof process||"[object process]"!==process+""||process.browser);b.XHR=function(){for(var b=[function(){return new XMLHttpRequest},function(){return new ActiveXObject("Msxml2.XMLHTTP")},function(){return new ActiveXObject("Msxml3.XMLHTTP")},
	function(){return new ActiveXObject("Microsoft.XMLHTTP")}],c=null,h=0;h<b.length;h++){try{c=b[h]()}catch(l){continue}break}if(!c)throw Error("XMLHttpRequest is not supported");return c};b.fetch=function(c,h){h&&"function"!=typeof h&&(h=null);if(b.IS_NODE){var n=__webpack_require__(8);if(h)n.readFile(c,function(b,c){b?h(null):h(""+c)});else try{return n.readFileSync(c)}catch(l){return null}}else{var g=b.XHR();g.open("GET",c,h?!0:!1);g.setRequestHeader("Accept","text/plain");"function"===typeof g.overrideMimeType&&
	g.overrideMimeType("text/plain");if(h)g.onreadystatechange=function(){4==g.readyState&&(200==g.status||0==g.status&&"string"===typeof g.responseText?h(g.responseText):h(null))},4!=g.readyState&&g.send(null);else return g.send(null),200==g.status||0==g.status&&"string"===typeof g.responseText?g.responseText:null}};b.toCamelCase=function(b){return b.replace(/_([a-zA-Z])/g,function(b,c){return c.toUpperCase()})};return b}();c.Lang={DELIM:/[\s\{\}=;:\[\],'"\(\)<>]/g,RULE:/^(?:required|optional|repeated|map)$/,
	TYPE:/^(?:double|float|int32|uint32|sint32|int64|uint64|sint64|fixed32|sfixed32|fixed64|sfixed64|bool|string|bytes)$/,NAME:/^[a-zA-Z_][a-zA-Z_0-9]*$/,TYPEDEF:/^[a-zA-Z][a-zA-Z_0-9]*$/,TYPEREF:/^(?:\.?[a-zA-Z_][a-zA-Z_0-9]*)+$/,FQTYPEREF:/^(?:\.[a-zA-Z][a-zA-Z_0-9]*)+$/,NUMBER:/^-?(?:[1-9][0-9]*|0|0[xX][0-9a-fA-F]+|0[0-7]+|([0-9]*(\.[0-9]*)?([Ee][+-]?[0-9]+)?)|inf|nan)$/,NUMBER_DEC:/^(?:[1-9][0-9]*|0)$/,NUMBER_HEX:/^0[xX][0-9a-fA-F]+$/,NUMBER_OCT:/^0[0-7]+$/,NUMBER_FLT:/^([0-9]*(\.[0-9]*)?([Ee][+-]?[0-9]+)?|inf|nan)$/,
	BOOL:/^(?:true|false)$/i,ID:/^(?:[1-9][0-9]*|0|0[xX][0-9a-fA-F]+|0[0-7]+)$/,NEGID:/^\-?(?:[1-9][0-9]*|0|0[xX][0-9a-fA-F]+|0[0-7]+)$/,WHITESPACE:/\s/,STRING:/(?:"([^"\\]*(?:\\.[^"\\]*)*)")|(?:'([^'\\]*(?:\\.[^'\\]*)*)')/g,STRING_DQ:/(?:"([^"\\]*(?:\\.[^"\\]*)*)")/g,STRING_SQ:/(?:'([^'\\]*(?:\\.[^'\\]*)*)')/g};c.Reflect=function(b){function c(a,e){if(a&&"number"===typeof a.low&&"number"===typeof a.high&&"boolean"===typeof a.unsigned&&a.low===a.low&&a.high===a.high)return new b.Long(a.low,a.high,"undefined"===
	typeof e?a.unsigned:e);if("string"===typeof a)return b.Long.fromString(a,e||!1,10);if("number"===typeof a)return b.Long.fromNumber(a,e||!1);throw Error("not convertible to Long");}function s(a,e){var m=e.readVarint32(),d=m&7,m=m>>>3;switch(d){case b.WIRE_TYPES.VARINT:do m=e.readUint8();while(128===(m&128));break;case b.WIRE_TYPES.BITS64:e.offset+=8;break;case b.WIRE_TYPES.LDELIM:m=e.readVarint32();e.offset+=m;break;case b.WIRE_TYPES.STARTGROUP:s(m,e);break;case b.WIRE_TYPES.ENDGROUP:if(m===a)return!1;
	throw Error("Illegal GROUPEND after unknown group: "+m+" ("+a+" expected)");case b.WIRE_TYPES.BITS32:e.offset+=4;break;default:throw Error("Illegal wire type in unknown group "+a+": "+d);}return!0}var n={},l=function(a,e,b){this.builder=a;this.parent=e;this.name=b},g=l.prototype;g.fqn=function(){var a=this.name,e=this;do{e=e.parent;if(null==e)break;a=e.name+"."+a}while(1);return a};g.toString=function(a){return(a?this.className+" ":"")+this.fqn()};g.build=function(){throw Error(this.toString(!0)+
	" cannot be built directly");};n.T=l;var d=function(a,e,b,d,r){l.call(this,a,e,b);this.className="Namespace";this.children=[];this.options=d||{};this.syntax=r||"proto2"},g=d.prototype=Object.create(l.prototype);g.getChildren=function(a){a=a||null;if(null==a)return this.children.slice();for(var e=[],b=0,d=this.children.length;b<d;++b)this.children[b]instanceof a&&e.push(this.children[b]);return e};g.addChild=function(a){var e;if(e=this.getChild(a.name))if(e instanceof t.Field&&e.name!==e.originalName&&
	null===this.getChild(e.originalName))e.name=e.originalName;else if(a instanceof t.Field&&a.name!==a.originalName&&null===this.getChild(a.originalName))a.name=a.originalName;else throw Error("Duplicate name in namespace "+this.toString(!0)+": "+a.name);this.children.push(a)};g.getChild=function(a){for(var e="number"===typeof a?"id":"name",b=0,d=this.children.length;b<d;++b)if(this.children[b][e]===a)return this.children[b];return null};g.resolve=function(a,e){var b="string"===typeof a?a.split("."):
	a,d=this,r=0;if(""===b[r]){for(;null!==d.parent;)d=d.parent;r++}do{do{if(!(d instanceof n.Namespace)){d=null;break}d=d.getChild(b[r]);if(!(d&&d instanceof n.T)||e&&!(d instanceof n.Namespace)){d=null;break}r++}while(r<b.length);if(null!=d)break;if(null!==this.parent)return this.parent.resolve(a,e)}while(null!=d);return d};g.qn=function(a){var e=[],b=a;do e.unshift(b.name),b=b.parent;while(null!==b);for(b=1;b<=e.length;b++){var d=e.slice(e.length-b);if(a===this.resolve(d,a instanceof n.Namespace))return d.join(".")}return a.fqn()};
	g.build=function(){for(var a={},b=this.children,m=0,c=b.length,r;m<c;++m)r=b[m],r instanceof d&&(a[r.name]=r.build());Object.defineProperty&&Object.defineProperty(a,"$options",{value:this.buildOpt()});return a};g.buildOpt=function(){for(var a={},b=Object.keys(this.options),d=0,c=b.length;d<c;++d)a[b[d]]=this.options[b[d]];return a};g.getOption=function(a){return"undefined"===typeof a?this.options:"undefined"!==typeof this.options[a]?this.options[a]:null};n.Namespace=d;var k=function(a,e,d,c){this.type=
	a;this.resolvedType=e;this.isMapKey=d;this.syntax=c;if(d&&0>b.MAP_KEY_TYPES.indexOf(a))throw Error("Invalid map key type: "+a.name);},f=k.prototype;k.defaultFieldValue=function(a){"string"===typeof a&&(a=b.TYPES[a]);if("undefined"===typeof a.defaultValue)throw Error("default value for type "+a.name+" is not supported");return a==b.TYPES.bytes?new h(0):a.defaultValue};f.verifyValue=function(a){function e(a,b){throw Error("Illegal value for "+d.toString(!0)+" of type "+d.type.name+": "+a+" ("+b+")");
	}var d=this;switch(this.type){case b.TYPES.int32:case b.TYPES.sint32:case b.TYPES.sfixed32:return("number"!==typeof a||a===a&&0!==a%1)&&e(typeof a,"not an integer"),4294967295<a?a|0:a;case b.TYPES.uint32:case b.TYPES.fixed32:return("number"!==typeof a||a===a&&0!==a%1)&&e(typeof a,"not an integer"),0>a?a>>>0:a;case b.TYPES.int64:case b.TYPES.sint64:case b.TYPES.sfixed64:if(b.Long)try{return c(a,!1)}catch(f){e(typeof a,f.message)}else e(typeof a,"requires Long.js");case b.TYPES.uint64:case b.TYPES.fixed64:if(b.Long)try{return c(a,
	!0)}catch(r){e(typeof a,r.message)}else e(typeof a,"requires Long.js");case b.TYPES.bool:return"boolean"!==typeof a&&e(typeof a,"not a boolean"),a;case b.TYPES["float"]:case b.TYPES["double"]:return"number"!==typeof a&&e(typeof a,"not a number"),a;case b.TYPES.string:return"string"===typeof a||a&&a instanceof String||e(typeof a,"not a string"),""+a;case b.TYPES.bytes:return h.isByteBuffer(a)?a:h.wrap(a,"base64");case b.TYPES["enum"]:for(var v=this.resolvedType.getChildren(b.Reflect.Enum.Value),g=
	0;g<v.length;g++)if(v[g].name==a||v[g].id==a)return v[g].id;if("proto3"===this.syntax)return("number"!==typeof a||a===a&&0!==a%1)&&e(typeof a,"not an integer"),(4294967295<a||0>a)&&e(typeof a,"not in range for uint32"),a;e(a,"not a valid enum value");case b.TYPES.group:case b.TYPES.message:a&&"object"===typeof a||e(typeof a,"object expected");if(a instanceof this.resolvedType.clazz)return a;if(a instanceof b.Builder.Message){var v={},g;for(g in a)a.hasOwnProperty(g)&&(v[g]=a[g]);a=v}return new this.resolvedType.clazz(a)}throw Error("[INTERNAL] Illegal value for "+
	this.toString(!0)+": "+a+" (undefined type "+this.type+")");};f.calculateLength=function(a,e){if(null===e)return 0;var d;switch(this.type){case b.TYPES.int32:return 0>e?h.calculateVarint64(e):h.calculateVarint32(e);case b.TYPES.uint32:return h.calculateVarint32(e);case b.TYPES.sint32:return h.calculateVarint32(h.zigZagEncode32(e));case b.TYPES.fixed32:case b.TYPES.sfixed32:case b.TYPES["float"]:return 4;case b.TYPES.int64:case b.TYPES.uint64:return h.calculateVarint64(e);case b.TYPES.sint64:return h.calculateVarint64(h.zigZagEncode64(e));
	case b.TYPES.fixed64:case b.TYPES.sfixed64:return 8;case b.TYPES.bool:return 1;case b.TYPES["enum"]:return h.calculateVarint32(e);case b.TYPES["double"]:return 8;case b.TYPES.string:return d=h.calculateUTF8Bytes(e),h.calculateVarint32(d)+d;case b.TYPES.bytes:if(0>e.remaining())throw Error("Illegal value for "+this.toString(!0)+": "+e.remaining()+" bytes remaining");return h.calculateVarint32(e.remaining())+e.remaining();case b.TYPES.message:return d=this.resolvedType.calculate(e),h.calculateVarint32(d)+
	d;case b.TYPES.group:return d=this.resolvedType.calculate(e),d+h.calculateVarint32(a<<3|b.WIRE_TYPES.ENDGROUP)}throw Error("[INTERNAL] Illegal value to encode in "+this.toString(!0)+": "+e+" (unknown type)");};f.encodeValue=function(a,e,d){if(null===e)return d;switch(this.type){case b.TYPES.int32:0>e?d.writeVarint64(e):d.writeVarint32(e);break;case b.TYPES.uint32:d.writeVarint32(e);break;case b.TYPES.sint32:d.writeVarint32ZigZag(e);break;case b.TYPES.fixed32:d.writeUint32(e);break;case b.TYPES.sfixed32:d.writeInt32(e);
	break;case b.TYPES.int64:case b.TYPES.uint64:d.writeVarint64(e);break;case b.TYPES.sint64:d.writeVarint64ZigZag(e);break;case b.TYPES.fixed64:d.writeUint64(e);break;case b.TYPES.sfixed64:d.writeInt64(e);break;case b.TYPES.bool:"string"===typeof e?d.writeVarint32("false"===e.toLowerCase()?0:!!e):d.writeVarint32(e?1:0);break;case b.TYPES["enum"]:d.writeVarint32(e);break;case b.TYPES["float"]:d.writeFloat32(e);break;case b.TYPES["double"]:d.writeFloat64(e);break;case b.TYPES.string:d.writeVString(e);
	break;case b.TYPES.bytes:if(0>e.remaining())throw Error("Illegal value for "+this.toString(!0)+": "+e.remaining()+" bytes remaining");a=e.offset;d.writeVarint32(e.remaining());d.append(e);e.offset=a;break;case b.TYPES.message:a=(new h).LE();this.resolvedType.encode(e,a);d.writeVarint32(a.offset);d.append(a.flip());break;case b.TYPES.group:this.resolvedType.encode(e,d);d.writeVarint32(a<<3|b.WIRE_TYPES.ENDGROUP);break;default:throw Error("[INTERNAL] Illegal value to encode in "+this.toString(!0)+": "+
	e+" (unknown type)");}return d};f.decode=function(a,e,d){if(e!=this.type.wireType)throw Error("Unexpected wire type for element");switch(this.type){case b.TYPES.int32:return a.readVarint32()|0;case b.TYPES.uint32:return a.readVarint32()>>>0;case b.TYPES.sint32:return a.readVarint32ZigZag()|0;case b.TYPES.fixed32:return a.readUint32()>>>0;case b.TYPES.sfixed32:return a.readInt32()|0;case b.TYPES.int64:return a.readVarint64();case b.TYPES.uint64:return a.readVarint64().toUnsigned();case b.TYPES.sint64:return a.readVarint64ZigZag();
	case b.TYPES.fixed64:return a.readUint64();case b.TYPES.sfixed64:return a.readInt64();case b.TYPES.bool:return!!a.readVarint32();case b.TYPES["enum"]:return a.readVarint32();case b.TYPES["float"]:return a.readFloat();case b.TYPES["double"]:return a.readDouble();case b.TYPES.string:return a.readVString();case b.TYPES.bytes:d=a.readVarint32();if(a.remaining()<d)throw Error("Illegal number of bytes for "+this.toString(!0)+": "+d+" required but got only "+a.remaining());e=a.clone();e.limit=e.offset+d;
	a.offset+=d;return e;case b.TYPES.message:return d=a.readVarint32(),this.resolvedType.decode(a,d);case b.TYPES.group:return this.resolvedType.decode(a,-1,d)}throw Error("[INTERNAL] Illegal decode type");};f.valueFromString=function(a){if(!this.isMapKey)throw Error("valueFromString() called on non-map-key element");switch(this.type){case b.TYPES.int32:case b.TYPES.sint32:case b.TYPES.sfixed32:case b.TYPES.uint32:case b.TYPES.fixed32:return this.verifyValue(parseInt(a));case b.TYPES.int64:case b.TYPES.sint64:case b.TYPES.sfixed64:case b.TYPES.uint64:case b.TYPES.fixed64:return this.verifyValue(a);
	case b.TYPES.bool:return"true"===a;case b.TYPES.string:return this.verifyValue(a);case b.TYPES.bytes:return h.fromBinary(a)}};f.valueToString=function(a){if(!this.isMapKey)throw Error("valueToString() called on non-map-key element");return this.type===b.TYPES.bytes?a.toString("binary"):a.toString()};n.Element=k;var t=function(a,b,c,f,r,g){d.call(this,a,b,c,f,g);this.className="Message";this.extensions=void 0;this.clazz=null;this.isGroup=!!r;this._fieldsByName=this._fieldsById=this._fields=null},f=
	t.prototype=Object.create(d.prototype);f.build=function(a){if(this.clazz&&!a)return this.clazz;a=function(a,b){function e(b,d,c,f){if(null===b||"object"!==typeof b){if(f&&f instanceof a.Reflect.Enum){var m=a.Reflect.Enum.getName(f.object,b);if(null!==m)return m}return b}if(h.isByteBuffer(b))return d?b.toBase64():b.toBuffer();if(a.Long.isLong(b))return c?b.toString():a.Long.fromValue(b);var g;if(Array.isArray(b))return g=[],b.forEach(function(a,b){g[b]=e(a,d,c,f)}),g;g={};if(b instanceof a.Map){for(var m=
	b.entries(),k=m.next();!k.done;k=m.next())g[b.keyElem.valueToString(k.value[0])]=e(k.value[1],d,c,b.valueElem.resolvedType);return g}var m=b.$type,k=void 0,q;for(q in b)b.hasOwnProperty(q)&&(m&&(k=m.getChild(q))?g[q]=e(b[q],d,c,k.resolvedType):g[q]=e(b[q],d,c));return g}var d=b.getChildren(a.Reflect.Message.Field),c=b.getChildren(a.Reflect.Message.OneOf),m=function(e,f){a.Builder.Message.call(this);for(var g=0,k=c.length;g<k;++g)this[c[g].name]=null;g=0;for(k=d.length;g<k;++g){var q=d[g];this[q.name]=
	q.repeated?[]:q.map?new a.Map(q):null;!q.required&&"proto3"!==b.syntax||null===q.defaultValue||(this[q.name]=q.defaultValue)}if(0<arguments.length)if(1!==arguments.length||null===e||"object"!==typeof e||!("function"!==typeof e.encode||e instanceof m)||Array.isArray(e)||e instanceof a.Map||h.isByteBuffer(e)||e instanceof ArrayBuffer||a.Long&&e instanceof a.Long)for(g=0,k=arguments.length;g<k;++g)"undefined"!==typeof(q=arguments[g])&&this.$set(d[g].name,q);else this.$set(e)},f=m.prototype=Object.create(a.Builder.Message.prototype);
	f.add=function(e,d,c){var f=b._fieldsByName[e];if(!c){if(!f)throw Error(this+"#"+e+" is undefined");if(!(f instanceof a.Reflect.Message.Field))throw Error(this+"#"+e+" is not a field: "+f.toString(!0));if(!f.repeated)throw Error(this+"#"+e+" is not a repeated field");d=f.verifyValue(d,!0)}null===this[e]&&(this[e]=[]);this[e].push(d);return this};f.$add=f.add;f.set=function(e,d,f){if(e&&"object"===typeof e){f=d;for(var c in e)e.hasOwnProperty(c)&&"undefined"!==typeof(d=e[c])&&this.$set(c,d,f);return this}c=
	b._fieldsByName[e];if(f)this[e]=d;else{if(!c)throw Error(this+"#"+e+" is not a field: undefined");if(!(c instanceof a.Reflect.Message.Field))throw Error(this+"#"+e+" is not a field: "+c.toString(!0));this[c.name]=d=c.verifyValue(d)}c&&c.oneof&&(f=this[c.oneof.name],null!==d?(null!==f&&f!==c.name&&(this[f]=null),this[c.oneof.name]=c.name):f===e&&(this[c.oneof.name]=null));return this};f.$set=f.set;f.get=function(e,d){if(d)return this[e];var c=b._fieldsByName[e];if(!(c&&c instanceof a.Reflect.Message.Field))throw Error(this+
	"#"+e+" is not a field: undefined");if(!(c instanceof a.Reflect.Message.Field))throw Error(this+"#"+e+" is not a field: "+c.toString(!0));return this[c.name]};f.$get=f.get;for(var g=0;g<d.length;g++){var k=d[g];k instanceof a.Reflect.Message.ExtensionField||b.builder.options.populateAccessors&&function(a){var e=a.originalName.replace(/(_[a-zA-Z])/g,function(a){return a.toUpperCase().replace("_","")}),e=e.substring(0,1).toUpperCase()+e.substring(1),d=a.originalName.replace(/([A-Z])/g,function(a){return"_"+
	a}),c=function(b,e){this[a.name]=e?b:a.verifyValue(b);return this},m=function(){return this[a.name]};null===b.getChild("set"+e)&&(f["set"+e]=c);null===b.getChild("set_"+d)&&(f["set_"+d]=c);null===b.getChild("get"+e)&&(f["get"+e]=m);null===b.getChild("get_"+d)&&(f["get_"+d]=m)}(k)}f.encode=function(a,e){"boolean"===typeof a&&(e=a,a=void 0);var d=!1;a||(a=new h,d=!0);var c=a.littleEndian;try{return b.encode(this,a.LE(),e),(d?a.flip():a).LE(c)}catch(f){throw a.LE(c),f;}};m.encode=function(a,b,e){return(new m(a)).encode(b,
	e)};f.calculate=function(){return b.calculate(this)};f.encodeDelimited=function(a,e){var d=!1;a||(a=new h,d=!0);var c=(new h).LE();b.encode(this,c,e).flip();a.writeVarint32(c.remaining());a.append(c);return d?a.flip():a};f.encodeAB=function(){try{return this.encode().toArrayBuffer()}catch(a){throw a.encoded&&(a.encoded=a.encoded.toArrayBuffer()),a;}};f.toArrayBuffer=f.encodeAB;f.encodeNB=function(){try{return this.encode().toBuffer()}catch(a){throw a.encoded&&(a.encoded=a.encoded.toBuffer()),a;}};
	f.toBuffer=f.encodeNB;f.encode64=function(){try{return this.encode().toBase64()}catch(a){throw a.encoded&&(a.encoded=a.encoded.toBase64()),a;}};f.toBase64=f.encode64;f.encodeHex=function(){try{return this.encode().toHex()}catch(a){throw a.encoded&&(a.encoded=a.encoded.toHex()),a;}};f.toHex=f.encodeHex;f.toRaw=function(a,b){return e(this,!!a,!!b,this.$type)};f.encodeJSON=function(){return JSON.stringify(e(this,!0,!0,this.$type))};m.decode=function(a,e,d){"string"===typeof e&&(d=e);"string"===typeof a&&
	(a=h.wrap(a,d?d:"base64"));a=h.isByteBuffer(a)?a:h.wrap(a);e=a.littleEndian;try{var c=b.decode(a.LE());a.LE(e);return c}catch(f){throw a.LE(e),f;}};m.decodeDelimited=function(a,e){"string"===typeof a&&(a=h.wrap(a,e?e:"base64"));a=h.isByteBuffer(a)?a:h.wrap(a);if(1>a.remaining())return null;var d=a.offset,c=a.readVarint32();if(a.remaining()<c)return a.offset=d,null;try{var f=b.decode(a.slice(a.offset,a.offset+c).LE());a.offset+=c;return f}catch(m){throw a.offset+=c,m;}};m.decode64=function(a){return m.decode(a,
	"base64")};m.decodeHex=function(a){return m.decode(a,"hex")};m.decodeJSON=function(a){return new m(JSON.parse(a))};f.toString=function(){return b.toString()};Object.defineProperty&&(Object.defineProperty(m,"$options",{value:b.buildOpt()}),Object.defineProperty(f,"$options",{value:m.$options}),Object.defineProperty(m,"$type",{value:b}),Object.defineProperty(f,"$type",{value:b}));return m}(b,this);this._fields=[];this._fieldsById={};this._fieldsByName={};for(var e=0,d=this.children.length,c;e<d;e++)if(c=
	this.children[e],c instanceof x||c instanceof t||c instanceof A){if(a.hasOwnProperty(c.name))throw Error("Illegal reflect child of "+this.toString(!0)+": "+c.toString(!0)+" cannot override static property '"+c.name+"'");a[c.name]=c.build()}else if(c instanceof t.Field)c.build(),this._fields.push(c),this._fieldsById[c.id]=c,this._fieldsByName[c.name]=c;else if(!(c instanceof t.OneOf||c instanceof w))throw Error("Illegal reflect child of "+this.toString(!0)+": "+this.children[e].toString(!0));return this.clazz=
	a};f.encode=function(a,b,d){for(var c=null,f,g=0,k=this._fields.length,h;g<k;++g)f=this._fields[g],h=a[f.name],f.required&&null===h?null===c&&(c=f):f.encode(d?h:f.verifyValue(h),b,a);if(null!==c)throw a=Error("Missing at least one required field for "+this.toString(!0)+": "+c),a.encoded=b,a;return b};f.calculate=function(a){for(var b=0,d=0,c=this._fields.length,f,g;d<c;++d){f=this._fields[d];g=a[f.name];if(f.required&&null===g)throw Error("Missing at least one required field for "+this.toString(!0)+
	": "+f);b+=f.calculate(g,a)}return b};f.decode=function(a,e,d){e="number"===typeof e?e:-1;for(var c=a.offset,f=new this.clazz,g,k,h;a.offset<c+e||-1===e&&0<a.remaining();){g=a.readVarint32();k=g&7;h=g>>>3;if(k===b.WIRE_TYPES.ENDGROUP){if(h!==d)throw Error("Illegal group end indicator for "+this.toString(!0)+": "+h+" ("+(d?d+" expected":"not a group")+")");break}if(g=this._fieldsById[h])g.repeated&&!g.options.packed?f[g.name].push(g.decode(k,a)):g.map?(k=g.decode(k,a),f[g.name].set(k[0],k[1])):(f[g.name]=
	g.decode(k,a),g.oneof&&(k=f[g.oneof.name],null!==k&&k!==g.name&&(f[k]=null),f[g.oneof.name]=g.name));else switch(k){case b.WIRE_TYPES.VARINT:a.readVarint32();break;case b.WIRE_TYPES.BITS32:a.offset+=4;break;case b.WIRE_TYPES.BITS64:a.offset+=8;break;case b.WIRE_TYPES.LDELIM:g=a.readVarint32();a.offset+=g;break;case b.WIRE_TYPES.STARTGROUP:for(;s(h,a););break;default:throw Error("Illegal wire type for unknown field "+h+" in "+this.toString(!0)+"#decode: "+k);}}a=0;for(e=this._fields.length;a<e;++a)if(g=
	this._fields[a],null===f[g.name])if("proto3"===this.syntax)f[g.name]=g.defaultValue;else{if(g.required)throw a=Error("Missing at least one required field for "+this.toString(!0)+": "+g.name),a.decoded=f,a;b.populateDefaults&&null!==g.defaultValue&&(f[g.name]=g.defaultValue)}return f};n.Message=t;var z=function(a,e,d,c,f,g,k,h,w,p){l.call(this,a,e,g);this.className="Message.Field";this.required="required"===d;this.repeated="repeated"===d;this.map="map"===d;this.keyType=c||null;this.type=f;this.resolvedType=
	null;this.id=k;this.options=h||{};this.defaultValue=null;this.oneof=w||null;this.syntax=p||"proto2";this.originalName=this.name;this.keyElement=this.element=null;!this.builder.options.convertFieldsToCamelCase||this instanceof t.ExtensionField||(this.name=b.Util.toCamelCase(this.name))},f=z.prototype=Object.create(l.prototype);f.build=function(){this.element=new k(this.type,this.resolvedType,!1,this.syntax);this.map&&(this.keyElement=new k(this.keyType,void 0,!0,this.syntax));"proto3"!==this.syntax||
	this.repeated||this.map?"undefined"!==typeof this.options["default"]&&(this.defaultValue=this.verifyValue(this.options["default"])):this.defaultValue=k.defaultFieldValue(this.type)};f.verifyValue=function(a,e){function d(a,b){throw Error("Illegal value for "+c.toString(!0)+" of type "+c.type.name+": "+a+" ("+b+")");}e=e||!1;var c=this;if(null===a)return this.required&&d(typeof a,"required"),"proto3"===this.syntax&&this.type!==b.TYPES.message&&d(typeof a,"proto3 field without field presence cannot be null"),
	null;var f;if(this.repeated&&!e){Array.isArray(a)||(a=[a]);var g=[];for(f=0;f<a.length;f++)g.push(this.element.verifyValue(a[f]));return g}if(this.map&&!e){if(a instanceof b.Map)return a;a instanceof Object||d(typeof a,"expected ProtoBuf.Map or raw object for map field");return new b.Map(this,a)}!this.repeated&&Array.isArray(a)&&d(typeof a,"no array expected");return this.element.verifyValue(a)};f.hasWirePresence=function(a,e){if("proto3"!==this.syntax)return null!==a;if(this.oneof&&e[this.oneof.name]===
	this.name)return!0;switch(this.type){case b.TYPES.int32:case b.TYPES.sint32:case b.TYPES.sfixed32:case b.TYPES.uint32:case b.TYPES.fixed32:return 0!==a;case b.TYPES.int64:case b.TYPES.sint64:case b.TYPES.sfixed64:case b.TYPES.uint64:case b.TYPES.fixed64:return 0!==a.low||0!==a.high;case b.TYPES.bool:return a;case b.TYPES["float"]:case b.TYPES["double"]:return 0!==a;case b.TYPES.string:return 0<a.length;case b.TYPES.bytes:return 0<a.remaining();case b.TYPES["enum"]:return 0!==a;case b.TYPES.message:return null!==
	a;default:return!0}};f.encode=function(a,e,d){if(null===this.type||"object"!==typeof this.type)throw Error("[INTERNAL] Unresolved type in "+this.toString(!0)+": "+this.type);if(null===a||this.repeated&&0==a.length)return e;try{if(this.repeated){var c;if(this.options.packed&&0<=b.PACKABLE_WIRE_TYPES.indexOf(this.type.wireType)){e.writeVarint32(this.id<<3|b.WIRE_TYPES.LDELIM);e.ensureCapacity(e.offset+=1);var f=e.offset;for(c=0;c<a.length;c++)this.element.encodeValue(this.id,a[c],e);var g=e.offset-
	f,k=h.calculateVarint32(g);if(1<k){var w=e.slice(f,e.offset),f=f+(k-1);e.offset=f;e.append(w)}e.writeVarint32(g,f-k)}else for(c=0;c<a.length;c++)e.writeVarint32(this.id<<3|this.type.wireType),this.element.encodeValue(this.id,a[c],e)}else this.map?a.forEach(function(a,d,c){c=h.calculateVarint32(8|this.keyType.wireType)+this.keyElement.calculateLength(1,d)+h.calculateVarint32(16|this.type.wireType)+this.element.calculateLength(2,a);e.writeVarint32(this.id<<3|b.WIRE_TYPES.LDELIM);e.writeVarint32(c);
	e.writeVarint32(8|this.keyType.wireType);this.keyElement.encodeValue(1,d,e);e.writeVarint32(16|this.type.wireType);this.element.encodeValue(2,a,e)},this):this.hasWirePresence(a,d)&&(e.writeVarint32(this.id<<3|this.type.wireType),this.element.encodeValue(this.id,a,e))}catch(t){throw Error("Illegal value for "+this.toString(!0)+": "+a+" ("+t+")");}return e};f.calculate=function(a,d){a=this.verifyValue(a);if(null===this.type||"object"!==typeof this.type)throw Error("[INTERNAL] Unresolved type in "+this.toString(!0)+
	": "+this.type);if(null===a||this.repeated&&0==a.length)return 0;var c=0;try{if(this.repeated){var f,g;if(this.options.packed&&0<=b.PACKABLE_WIRE_TYPES.indexOf(this.type.wireType)){c+=h.calculateVarint32(this.id<<3|b.WIRE_TYPES.LDELIM);for(f=g=0;f<a.length;f++)g+=this.element.calculateLength(this.id,a[f]);c+=h.calculateVarint32(g);c+=g}else for(f=0;f<a.length;f++)c+=h.calculateVarint32(this.id<<3|this.type.wireType),c+=this.element.calculateLength(this.id,a[f])}else this.map?a.forEach(function(a,
	d,e){a=h.calculateVarint32(8|this.keyType.wireType)+this.keyElement.calculateLength(1,d)+h.calculateVarint32(16|this.type.wireType)+this.element.calculateLength(2,a);c+=h.calculateVarint32(this.id<<3|b.WIRE_TYPES.LDELIM);c+=h.calculateVarint32(a);c+=a},this):this.hasWirePresence(a,d)&&(c+=h.calculateVarint32(this.id<<3|this.type.wireType),c+=this.element.calculateLength(this.id,a))}catch(k){throw Error("Illegal value for "+this.toString(!0)+": "+a+" ("+k+")");}return c};f.decode=function(a,d,c){if(!(!this.map&&
	a==this.type.wireType||!c&&this.repeated&&this.options.packed&&a==b.WIRE_TYPES.LDELIM||this.map&&a==b.WIRE_TYPES.LDELIM))throw Error("Illegal wire type for field "+this.toString(!0)+": "+a+" ("+this.type.wireType+" expected)");if(a==b.WIRE_TYPES.LDELIM&&this.repeated&&this.options.packed&&0<=b.PACKABLE_WIRE_TYPES.indexOf(this.type.wireType)&&!c){a=d.readVarint32();a=d.offset+a;for(c=[];d.offset<a;)c.push(this.decode(this.type.wireType,d,!0));return c}if(this.map){var f=k.defaultFieldValue(this.keyType);
	c=k.defaultFieldValue(this.type);a=d.readVarint32();if(d.remaining()<a)throw Error("Illegal number of bytes for "+this.toString(!0)+": "+a+" required but got only "+d.remaining());var g=d.clone();g.limit=g.offset+a;for(d.offset+=a;0<g.remaining();)if(d=g.readVarint32(),a=d&7,d>>>=3,1===d)f=this.keyElement.decode(g,a,d);else if(2===d)c=this.element.decode(g,a,d);else throw Error("Unexpected tag in map field key/value submessage");return[f,c]}return this.element.decode(d,a,this.id)};n.Message.Field=
	z;f=function(a,d,b,c,f,g,k){z.call(this,a,d,b,null,c,f,g,k)};f.prototype=Object.create(z.prototype);n.Message.ExtensionField=f;n.Message.OneOf=function(a,d,b){l.call(this,a,d,b);this.fields=[]};var x=function(a,b,c,f,g){d.call(this,a,b,c,f,g);this.className="Enum";this.object=null};x.getName=function(a,d){for(var b=Object.keys(a),c=0,f;c<b.length;++c)if(a[f=b[c]]===d)return f;return null};(x.prototype=Object.create(d.prototype)).build=function(a){if(this.object&&!a)return this.object;a=new b.Builder.Enum;
	for(var d=this.getChildren(x.Value),c=0,f=d.length;c<f;++c)a[d[c].name]=d[c].id;Object.defineProperty&&Object.defineProperty(a,"$options",{value:this.buildOpt(),enumerable:!1});return this.object=a};n.Enum=x;f=function(a,d,b,c){l.call(this,a,d,b);this.className="Enum.Value";this.id=c};f.prototype=Object.create(l.prototype);n.Enum.Value=f;var w=function(a,d,b,c){l.call(this,a,d,b);this.field=c};w.prototype=Object.create(l.prototype);n.Extension=w;var A=function(a,b,c,f){d.call(this,a,b,c,f);this.className=
	"Service";this.clazz=null};(A.prototype=Object.create(d.prototype)).build=function(a){return this.clazz&&!a?this.clazz:this.clazz=function(a,d){for(var b=function(b){a.Builder.Service.call(this);this.rpcImpl=b||function(a,b,d){setTimeout(d.bind(this,Error("Not implemented, see: https://github.com/dcodeIO/ProtoBuf.js/wiki/Services")),0)}},c=b.prototype=Object.create(a.Builder.Service.prototype),f=d.getChildren(a.Reflect.Service.RPCMethod),g=0;g<f.length;g++)(function(a){c[a.name]=function(b,c){try{try{b=
	a.resolvedRequestType.clazz.decode(h.wrap(b))}catch(e){if(!(e instanceof TypeError))throw e;}if(null===b||"object"!==typeof b)throw Error("Illegal arguments");b instanceof a.resolvedRequestType.clazz||(b=new a.resolvedRequestType.clazz(b));this.rpcImpl(a.fqn(),b,function(b,e){if(b)c(b);else{null===e&&(e="");try{e=a.resolvedResponseType.clazz.decode(e)}catch(f){}e&&e instanceof a.resolvedResponseType.clazz?c(null,e):c(Error("Illegal response type received in service method "+d.name+"#"+a.name))}})}catch(f){setTimeout(c.bind(this,
	f),0)}};b[a.name]=function(d,c,e){(new b(d))[a.name](c,e)};Object.defineProperty&&(Object.defineProperty(b[a.name],"$options",{value:a.buildOpt()}),Object.defineProperty(c[a.name],"$options",{value:b[a.name].$options}))})(f[g]);Object.defineProperty&&(Object.defineProperty(b,"$options",{value:d.buildOpt()}),Object.defineProperty(c,"$options",{value:b.$options}),Object.defineProperty(b,"$type",{value:d}),Object.defineProperty(c,"$type",{value:d}));return b}(b,this)};n.Service=A;var u=function(a,b,
	d,c){l.call(this,a,b,d);this.className="Service.Method";this.options=c||{}};(u.prototype=Object.create(l.prototype)).buildOpt=g.buildOpt;n.Service.Method=u;g=function(a,b,d,c,f,g,k,h){u.call(this,a,b,d,h);this.className="Service.RPCMethod";this.requestName=c;this.responseName=f;this.requestStream=g;this.responseStream=k;this.resolvedResponseType=this.resolvedRequestType=null};g.prototype=Object.create(u.prototype);n.Service.RPCMethod=g;return n}(c);c.Builder=function(b,c,h){function n(b){b.messages&&
	b.messages.forEach(function(c){c.syntax=b.syntax;n(c)});b.enums&&b.enums.forEach(function(c){c.syntax=b.syntax})}var l=function(b){this.ptr=this.ns=new h.Namespace(this,null,"");this.resolved=!1;this.result=null;this.files={};this.importRoot=null;this.options=b||{}},g=l.prototype;l.isMessage=function(b){return"string"!==typeof b.name||"undefined"!==typeof b.values||"undefined"!==typeof b.rpc?!1:!0};l.isMessageField=function(b){return"string"!==typeof b.rule||"string"!==typeof b.name||"string"!==typeof b.type||
	"undefined"===typeof b.id?!1:!0};l.isEnum=function(b){return"string"===typeof b.name&&"undefined"!==typeof b.values&&Array.isArray(b.values)&&0!==b.values.length?!0:!1};l.isService=function(b){return"string"===typeof b.name&&"object"===typeof b.rpc&&b.rpc?!0:!1};l.isExtend=function(b){return"string"!==typeof b.ref?!1:!0};g.reset=function(){this.ptr=this.ns;return this};g.define=function(b){if("string"!==typeof b||!c.TYPEREF.test(b))throw Error("illegal namespace: "+b);b.split(".").forEach(function(b){var d=
	this.ptr.getChild(b);null===d&&this.ptr.addChild(d=new h.Namespace(this,this.ptr,b));this.ptr=d},this);return this};g.create=function(d){if(!d)return this;if(Array.isArray(d)){if(0===d.length)return this;d=d.slice()}else d=[d];for(var c=[d];0<c.length;){d=c.pop();if(!Array.isArray(d))throw Error("not a valid namespace: "+JSON.stringify(d));for(;0<d.length;){var f=d.shift();if(l.isMessage(f)){var g=new h.Message(this,this.ptr,f.name,f.options,f.isGroup,f.syntax),n={};f.oneofs&&Object.keys(f.oneofs).forEach(function(b){g.addChild(n[b]=
	new h.Message.OneOf(this,g,b))},this);f.fields&&f.fields.forEach(function(b){if(null!==g.getChild(b.id|0))throw Error("duplicate or invalid field id in "+g.name+": "+b.id);if(b.options&&"object"!==typeof b.options)throw Error("illegal field options in "+g.name+"#"+b.name);var d=null;if("string"===typeof b.oneof&&!(d=n[b.oneof]))throw Error("illegal oneof in "+g.name+"#"+b.name+": "+b.oneof);b=new h.Message.Field(this,g,b.rule,b.keytype,b.type,b.name,b.id,b.options,d,f.syntax);d&&d.fields.push(b);
	g.addChild(b)},this);var p=[];f.enums&&f.enums.forEach(function(b){p.push(b)});f.messages&&f.messages.forEach(function(b){p.push(b)});f.services&&f.services.forEach(function(b){p.push(b)});f.extensions&&(g.extensions="number"===typeof f.extensions[0]?[f.extensions]:f.extensions);this.ptr.addChild(g);if(0<p.length){c.push(d);d=p;p=null;this.ptr=g;g=null;continue}p=null}else if(l.isEnum(f))g=new h.Enum(this,this.ptr,f.name,f.options,f.syntax),f.values.forEach(function(b){g.addChild(new h.Enum.Value(this,
	g,b.name,b.id))},this),this.ptr.addChild(g);else if(l.isService(f))g=new h.Service(this,this.ptr,f.name,f.options),Object.keys(f.rpc).forEach(function(b){var d=f.rpc[b];g.addChild(new h.Service.RPCMethod(this,g,b,d.request,d.response,!!d.request_stream,!!d.response_stream,d.options))},this),this.ptr.addChild(g);else if(l.isExtend(f))if(g=this.ptr.resolve(f.ref,!0))f.fields.forEach(function(d){if(null!==g.getChild(d.id|0))throw Error("duplicate extended field id in "+g.name+": "+d.id);if(g.extensions){var c=
	!1;g.extensions.forEach(function(a){d.id>=a[0]&&d.id<=a[1]&&(c=!0)});if(!c)throw Error("illegal extended field id in "+g.name+": "+d.id+" (not within valid ranges)");}var f=d.name;this.options.convertFieldsToCamelCase&&(f=b.Util.toCamelCase(f));var f=new h.Message.ExtensionField(this,g,d.rule,d.type,this.ptr.fqn()+"."+f,d.id,d.options),a=new h.Extension(this,this.ptr,d.name,f);f.extension=a;this.ptr.addChild(a);g.addChild(f)},this);else{if(!/\.?google\.protobuf\./.test(f.ref))throw Error("extended message "+
	f.ref+" is not defined");}else throw Error("not a valid definition: "+JSON.stringify(f));g=f=null}d=null;this.ptr=this.ptr.parent}this.resolved=!1;this.result=null;return this};g["import"]=function(d,c){var f="/";if("string"===typeof c){b.Util.IS_NODE&&(c=__webpack_require__(9).resolve(c));if(!0===this.files[c])return this.reset();this.files[c]=!0}else if("object"===typeof c){var g=c.root;b.Util.IS_NODE&&(g=__webpack_require__(9).resolve(g));if(0<=g.indexOf("\\")||0<=c.file.indexOf("\\"))f="\\";g=g+f+c.file;if(!0===
	this.files[g])return this.reset();this.files[g]=!0}if(d.imports&&0<d.imports.length){var h=!1;if("object"===typeof c){if(this.importRoot=c.root,h=!0,g=this.importRoot,c=c.file,0<=g.indexOf("\\")||0<=c.indexOf("\\"))f="\\"}else"string"===typeof c?this.importRoot?g=this.importRoot:0<=c.indexOf("/")?(g=c.replace(/\/[^\/]*$/,""),""===g&&(g="/")):0<=c.indexOf("\\")?(g=c.replace(/\\[^\\]*$/,""),f="\\"):g=".":g=null;for(var l=0;l<d.imports.length;l++)if("string"===typeof d.imports[l]){if(!g)throw Error("cannot determine import root");
	var p=d.imports[l];if("google/protobuf/descriptor.proto"!==p&&(p=g+f+p,!0!==this.files[p])){/\.proto$/i.test(p)&&!b.DotProto&&(p=p.replace(/\.proto$/,".json"));var s=b.Util.fetch(p);if(null===s)throw Error("failed to import '"+p+"' in '"+c+"': file not found");if(/\.json$/i.test(p))this["import"](JSON.parse(s+""),p);else this["import"](b.DotProto.Parser.parse(s),p)}}else if(c)if(/\.(\w+)$/.test(c))this["import"](d.imports[l],c.replace(/^(.+)\.(\w+)$/,function(a,b,d){return b+"_import"+l+"."+d}));
	else this["import"](d.imports[l],c+"_import"+l);else this["import"](d.imports[l]);h&&(this.importRoot=null)}d["package"]&&this.define(d["package"]);d.syntax&&n(d);var u=this.ptr;d.options&&Object.keys(d.options).forEach(function(a){u.options[a]=d.options[a]});d.messages&&(this.create(d.messages),this.ptr=u);d.enums&&(this.create(d.enums),this.ptr=u);d.services&&(this.create(d.services),this.ptr=u);d["extends"]&&this.create(d["extends"]);return this.reset()};g.resolveAll=function(){var d;if(null==
	this.ptr||"object"===typeof this.ptr.type)return this;if(this.ptr instanceof h.Namespace)this.ptr.children.forEach(function(b){this.ptr=b;this.resolveAll()},this);else if(this.ptr instanceof h.Message.Field){if(c.TYPE.test(this.ptr.type))this.ptr.type=b.TYPES[this.ptr.type];else{if(!c.TYPEREF.test(this.ptr.type))throw Error("illegal type reference in "+this.ptr.toString(!0)+": "+this.ptr.type);d=(this.ptr instanceof h.Message.ExtensionField?this.ptr.extension.parent:this.ptr.parent).resolve(this.ptr.type,
	!0);if(!d)throw Error("unresolvable type reference in "+this.ptr.toString(!0)+": "+this.ptr.type);this.ptr.resolvedType=d;if(d instanceof h.Enum){if(this.ptr.type=b.TYPES["enum"],"proto3"===this.ptr.syntax&&"proto3"!==d.syntax)throw Error("proto3 message cannot reference proto2 enum");}else if(d instanceof h.Message)this.ptr.type=d.isGroup?b.TYPES.group:b.TYPES.message;else throw Error("illegal type reference in "+this.ptr.toString(!0)+": "+this.ptr.type);}if(this.ptr.map){if(!c.TYPE.test(this.ptr.keyType))throw Error("illegal key type for map field in "+
	this.ptr.toString(!0)+": "+this.ptr.keyType);this.ptr.keyType=b.TYPES[this.ptr.keyType]}}else if(this.ptr instanceof b.Reflect.Service.Method)if(this.ptr instanceof b.Reflect.Service.RPCMethod){d=this.ptr.parent.resolve(this.ptr.requestName,!0);if(!(d&&d instanceof b.Reflect.Message))throw Error("Illegal type reference in "+this.ptr.toString(!0)+": "+this.ptr.requestName);this.ptr.resolvedRequestType=d;d=this.ptr.parent.resolve(this.ptr.responseName,!0);if(!(d&&d instanceof b.Reflect.Message))throw Error("Illegal type reference in "+
	this.ptr.toString(!0)+": "+this.ptr.responseName);this.ptr.resolvedResponseType=d}else throw Error("illegal service type in "+this.ptr.toString(!0));else if(!(this.ptr instanceof b.Reflect.Message.OneOf||this.ptr instanceof b.Reflect.Extension||this.ptr instanceof b.Reflect.Enum.Value))throw Error("illegal object in namespace: "+typeof this.ptr+": "+this.ptr);return this.reset()};g.build=function(b){this.reset();this.resolved||(this.resolveAll(),this.resolved=!0,this.result=null);null===this.result&&
	(this.result=this.ns.build());if(!b)return this.result;b="string"===typeof b?b.split("."):b;for(var c=this.result,g=0;g<b.length;g++)if(c[b[g]])c=c[b[g]];else{c=null;break}return c};g.lookup=function(b,c){return b?this.ns.resolve(b,c):this.ns};g.toString=function(){return"Builder"};l.Message=function(){};l.Enum=function(){};l.Service=function(){};return l}(c,c.Lang,c.Reflect);c.Map=function(b,c){function h(b){var c=0;return{next:function(){return c<b.length?{done:!1,value:b[c++]}:{done:!0}}}}var n=
	function(b,d){if(!b.map)throw Error("field is not a map");this.field=b;this.keyElem=new c.Element(b.keyType,null,!0,b.syntax);this.valueElem=new c.Element(b.type,b.resolvedType,!1,b.syntax);this.map={};Object.defineProperty(this,"size",{get:function(){return Object.keys(this.map).length}});if(d)for(var h=Object.keys(d),f=0;f<h.length;f++){var l=this.keyElem.valueFromString(h[f]),n=this.valueElem.verifyValue(d[h[f]]);this.map[this.keyElem.valueToString(l)]={key:l,value:n}}},l=n.prototype;l.clear=function(){this.map=
	{}};l["delete"]=function(b){b=this.keyElem.valueToString(this.keyElem.verifyValue(b));var c=b in this.map;delete this.map[b];return c};l.entries=function(){for(var b=[],c=Object.keys(this.map),k=0,f;k<c.length;k++)b.push([(f=this.map[c[k]]).key,f.value]);return h(b)};l.keys=function(){for(var b=[],c=Object.keys(this.map),k=0;k<c.length;k++)b.push(this.map[c[k]].key);return h(b)};l.values=function(){for(var b=[],c=Object.keys(this.map),k=0;k<c.length;k++)b.push(this.map[c[k]].value);return h(b)};l.forEach=
	function(b,c){for(var h=Object.keys(this.map),f=0,l;f<h.length;f++)b.call(c,(l=this.map[h[f]]).value,l.key,this)};l.set=function(b,c){var h=this.keyElem.verifyValue(b),f=this.valueElem.verifyValue(c);this.map[this.keyElem.valueToString(h)]={key:h,value:f};return this};l.get=function(b){b=this.keyElem.valueToString(this.keyElem.verifyValue(b));return b in this.map?this.map[b].value:void 0};l.has=function(b){return this.keyElem.valueToString(this.keyElem.verifyValue(b))in this.map};return n}(c,c.Reflect);
	c.newBuilder=function(b){b=b||{};"undefined"===typeof b.convertFieldsToCamelCase&&(b.convertFieldsToCamelCase=c.convertFieldsToCamelCase);"undefined"===typeof b.populateAccessors&&(b.populateAccessors=c.populateAccessors);return new c.Builder(b)};c.loadJson=function(b,h,s){if("string"===typeof h||h&&"string"===typeof h.file&&"string"===typeof h.root)s=h,h=null;h&&"object"===typeof h||(h=c.newBuilder());"string"===typeof b&&(b=JSON.parse(b));h["import"](b,s);h.resolveAll();return h};c.loadJsonFile=
	function(b,h,s){h&&"object"===typeof h?(s=h,h=null):h&&"function"===typeof h||(h=null);if(h)return c.Util.fetch("string"===typeof b?b:b.root+"/"+b.file,function(l){if(null===l)h(Error("Failed to fetch file"));else try{h(null,c.loadJson(JSON.parse(l),s,b))}catch(g){h(g)}});var n=c.Util.fetch("object"===typeof b?b.root+"/"+b.file:b);return null===n?null:c.loadJson(JSON.parse(n),s,b)};return c});

	/* WEBPACK VAR INJECTION */}.call(exports, __webpack_require__(3)))

/***/ },
/* 3 */
/***/ function(module, exports) {

	// shim for using process in browser
	var process = module.exports = {};

	// cached from whatever global is present so that test runners that stub it
	// don't break things.  But we need to wrap it in a try catch in case it is
	// wrapped in strict mode code which doesn't define any globals.  It's inside a
	// function because try/catches deoptimize in certain engines.

	var cachedSetTimeout;
	var cachedClearTimeout;

	function defaultSetTimout() {
	    throw new Error('setTimeout has not been defined');
	}
	function defaultClearTimeout () {
	    throw new Error('clearTimeout has not been defined');
	}
	(function () {
	    try {
	        if (typeof setTimeout === 'function') {
	            cachedSetTimeout = setTimeout;
	        } else {
	            cachedSetTimeout = defaultSetTimout;
	        }
	    } catch (e) {
	        cachedSetTimeout = defaultSetTimout;
	    }
	    try {
	        if (typeof clearTimeout === 'function') {
	            cachedClearTimeout = clearTimeout;
	        } else {
	            cachedClearTimeout = defaultClearTimeout;
	        }
	    } catch (e) {
	        cachedClearTimeout = defaultClearTimeout;
	    }
	} ())
	function runTimeout(fun) {
	    if (cachedSetTimeout === setTimeout) {
	        //normal enviroments in sane situations
	        return setTimeout(fun, 0);
	    }
	    // if setTimeout wasn't available but was latter defined
	    if ((cachedSetTimeout === defaultSetTimout || !cachedSetTimeout) && setTimeout) {
	        cachedSetTimeout = setTimeout;
	        return setTimeout(fun, 0);
	    }
	    try {
	        // when when somebody has screwed with setTimeout but no I.E. maddness
	        return cachedSetTimeout(fun, 0);
	    } catch(e){
	        try {
	            // When we are in I.E. but the script has been evaled so I.E. doesn't trust the global object when called normally
	            return cachedSetTimeout.call(null, fun, 0);
	        } catch(e){
	            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error
	            return cachedSetTimeout.call(this, fun, 0);
	        }
	    }


	}
	function runClearTimeout(marker) {
	    if (cachedClearTimeout === clearTimeout) {
	        //normal enviroments in sane situations
	        return clearTimeout(marker);
	    }
	    // if clearTimeout wasn't available but was latter defined
	    if ((cachedClearTimeout === defaultClearTimeout || !cachedClearTimeout) && clearTimeout) {
	        cachedClearTimeout = clearTimeout;
	        return clearTimeout(marker);
	    }
	    try {
	        // when when somebody has screwed with setTimeout but no I.E. maddness
	        return cachedClearTimeout(marker);
	    } catch (e){
	        try {
	            // When we are in I.E. but the script has been evaled so I.E. doesn't  trust the global object when called normally
	            return cachedClearTimeout.call(null, marker);
	        } catch (e){
	            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error.
	            // Some versions of I.E. have different rules for clearTimeout vs setTimeout
	            return cachedClearTimeout.call(this, marker);
	        }
	    }



	}
	var queue = [];
	var draining = false;
	var currentQueue;
	var queueIndex = -1;

	function cleanUpNextTick() {
	    if (!draining || !currentQueue) {
	        return;
	    }
	    draining = false;
	    if (currentQueue.length) {
	        queue = currentQueue.concat(queue);
	    } else {
	        queueIndex = -1;
	    }
	    if (queue.length) {
	        drainQueue();
	    }
	}

	function drainQueue() {
	    if (draining) {
	        return;
	    }
	    var timeout = runTimeout(cleanUpNextTick);
	    draining = true;

	    var len = queue.length;
	    while(len) {
	        currentQueue = queue;
	        queue = [];
	        while (++queueIndex < len) {
	            if (currentQueue) {
	                currentQueue[queueIndex].run();
	            }
	        }
	        queueIndex = -1;
	        len = queue.length;
	    }
	    currentQueue = null;
	    draining = false;
	    runClearTimeout(timeout);
	}

	process.nextTick = function (fun) {
	    var args = new Array(arguments.length - 1);
	    if (arguments.length > 1) {
	        for (var i = 1; i < arguments.length; i++) {
	            args[i - 1] = arguments[i];
	        }
	    }
	    queue.push(new Item(fun, args));
	    if (queue.length === 1 && !draining) {
	        runTimeout(drainQueue);
	    }
	};

	// v8 likes predictible objects
	function Item(fun, array) {
	    this.fun = fun;
	    this.array = array;
	}
	Item.prototype.run = function () {
	    this.fun.apply(null, this.array);
	};
	process.title = 'browser';
	process.browser = true;
	process.env = {};
	process.argv = [];
	process.version = ''; // empty string to avoid regexp issues
	process.versions = {};

	function noop() {}

	process.on = noop;
	process.addListener = noop;
	process.once = noop;
	process.off = noop;
	process.removeListener = noop;
	process.removeAllListeners = noop;
	process.emit = noop;

	process.binding = function (name) {
	    throw new Error('process.binding is not supported');
	};

	process.cwd = function () { return '/' };
	process.chdir = function (dir) {
	    throw new Error('process.chdir is not supported');
	};
	process.umask = function() { return 0; };


/***/ },
/* 4 */
/***/ function(module, exports, __webpack_require__) {

	var __WEBPACK_AMD_DEFINE_FACTORY__, __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;/* WEBPACK VAR INJECTION */(function(module) {/*
	 Copyright 2013-2014 Daniel Wirtz <dcode@dcode.io>

	 Licensed under the Apache License, Version 2.0 (the "License");
	 you may not use this file except in compliance with the License.
	 You may obtain a copy of the License at

	 http://www.apache.org/licenses/LICENSE-2.0

	 Unless required by applicable law or agreed to in writing, software
	 distributed under the License is distributed on an "AS IS" BASIS,
	 WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
	 See the License for the specific language governing permissions and
	 limitations under the License.
	 */

	/**
	 * @license bytebuffer.js (c) 2015 Daniel Wirtz <dcode@dcode.io>
	 * Backing buffer: ArrayBuffer, Accessor: Uint8Array
	 * Released under the Apache License, Version 2.0
	 * see: https://github.com/dcodeIO/bytebuffer.js for details
	 */
	(function(global, factory) {

	    /* AMD */ if ("function" === 'function' && __webpack_require__(6)["amd"])
	        !(__WEBPACK_AMD_DEFINE_ARRAY__ = [__webpack_require__(7)], __WEBPACK_AMD_DEFINE_FACTORY__ = (factory), __WEBPACK_AMD_DEFINE_RESULT__ = (typeof __WEBPACK_AMD_DEFINE_FACTORY__ === 'function' ? (__WEBPACK_AMD_DEFINE_FACTORY__.apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__)) : __WEBPACK_AMD_DEFINE_FACTORY__), __WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));
	    /* CommonJS */ else if ("function" === 'function' && typeof module === "object" && module && module["exports"])
	        module['exports'] = (function() {
	            var Long; try { Long = __webpack_require__(7); } catch (e) {}
	            return factory(Long);
	        })();
	    /* Global */ else
	        (global["dcodeIO"] = global["dcodeIO"] || {})["ByteBuffer"] = factory(global["dcodeIO"]["Long"]);

	})(this, function(Long) {
	    "use strict";

	    /**
	     * Constructs a new ByteBuffer.
	     * @class The swiss army knife for binary data in JavaScript.
	     * @exports ByteBuffer
	     * @constructor
	     * @param {number=} capacity Initial capacity. Defaults to {@link ByteBuffer.DEFAULT_CAPACITY}.
	     * @param {boolean=} littleEndian Whether to use little or big endian byte order. Defaults to
	     *  {@link ByteBuffer.DEFAULT_ENDIAN}.
	     * @param {boolean=} noAssert Whether to skip assertions of offsets and values. Defaults to
	     *  {@link ByteBuffer.DEFAULT_NOASSERT}.
	     * @expose
	     */
	    var ByteBuffer = function(capacity, littleEndian, noAssert) {
	        if (typeof capacity === 'undefined')
	            capacity = ByteBuffer.DEFAULT_CAPACITY;
	        if (typeof littleEndian === 'undefined')
	            littleEndian = ByteBuffer.DEFAULT_ENDIAN;
	        if (typeof noAssert === 'undefined')
	            noAssert = ByteBuffer.DEFAULT_NOASSERT;
	        if (!noAssert) {
	            capacity = capacity | 0;
	            if (capacity < 0)
	                throw RangeError("Illegal capacity");
	            littleEndian = !!littleEndian;
	            noAssert = !!noAssert;
	        }

	        /**
	         * Backing ArrayBuffer.
	         * @type {!ArrayBuffer}
	         * @expose
	         */
	        this.buffer = capacity === 0 ? EMPTY_BUFFER : new ArrayBuffer(capacity);

	        /**
	         * Uint8Array utilized to manipulate the backing buffer. Becomes `null` if the backing buffer has a capacity of `0`.
	         * @type {?Uint8Array}
	         * @expose
	         */
	        this.view = capacity === 0 ? null : new Uint8Array(this.buffer);

	        /**
	         * Absolute read/write offset.
	         * @type {number}
	         * @expose
	         * @see ByteBuffer#flip
	         * @see ByteBuffer#clear
	         */
	        this.offset = 0;

	        /**
	         * Marked offset.
	         * @type {number}
	         * @expose
	         * @see ByteBuffer#mark
	         * @see ByteBuffer#reset
	         */
	        this.markedOffset = -1;

	        /**
	         * Absolute limit of the contained data. Set to the backing buffer's capacity upon allocation.
	         * @type {number}
	         * @expose
	         * @see ByteBuffer#flip
	         * @see ByteBuffer#clear
	         */
	        this.limit = capacity;

	        /**
	         * Whether to use little endian byte order, defaults to `false` for big endian.
	         * @type {boolean}
	         * @expose
	         */
	        this.littleEndian = littleEndian;

	        /**
	         * Whether to skip assertions of offsets and values, defaults to `false`.
	         * @type {boolean}
	         * @expose
	         */
	        this.noAssert = noAssert;
	    };

	    /**
	     * ByteBuffer version.
	     * @type {string}
	     * @const
	     * @expose
	     */
	    ByteBuffer.VERSION = "5.0.1";

	    /**
	     * Little endian constant that can be used instead of its boolean value. Evaluates to `true`.
	     * @type {boolean}
	     * @const
	     * @expose
	     */
	    ByteBuffer.LITTLE_ENDIAN = true;

	    /**
	     * Big endian constant that can be used instead of its boolean value. Evaluates to `false`.
	     * @type {boolean}
	     * @const
	     * @expose
	     */
	    ByteBuffer.BIG_ENDIAN = false;

	    /**
	     * Default initial capacity of `16`.
	     * @type {number}
	     * @expose
	     */
	    ByteBuffer.DEFAULT_CAPACITY = 16;

	    /**
	     * Default endianess of `false` for big endian.
	     * @type {boolean}
	     * @expose
	     */
	    ByteBuffer.DEFAULT_ENDIAN = ByteBuffer.BIG_ENDIAN;

	    /**
	     * Default no assertions flag of `false`.
	     * @type {boolean}
	     * @expose
	     */
	    ByteBuffer.DEFAULT_NOASSERT = false;

	    /**
	     * A `Long` class for representing a 64-bit two's-complement integer value. May be `null` if Long.js has not been loaded
	     *  and int64 support is not available.
	     * @type {?Long}
	     * @const
	     * @see https://github.com/dcodeIO/long.js
	     * @expose
	     */
	    ByteBuffer.Long = Long || null;

	    /**
	     * @alias ByteBuffer.prototype
	     * @inner
	     */
	    var ByteBufferPrototype = ByteBuffer.prototype;

	    /**
	     * An indicator used to reliably determine if an object is a ByteBuffer or not.
	     * @type {boolean}
	     * @const
	     * @expose
	     * @private
	     */
	    ByteBufferPrototype.__isByteBuffer__;

	    Object.defineProperty(ByteBufferPrototype, "__isByteBuffer__", {
	        value: true,
	        enumerable: false,
	        configurable: false
	    });

	    // helpers

	    /**
	     * @type {!ArrayBuffer}
	     * @inner
	     */
	    var EMPTY_BUFFER = new ArrayBuffer(0);

	    /**
	     * String.fromCharCode reference for compile-time renaming.
	     * @type {function(...number):string}
	     * @inner
	     */
	    var stringFromCharCode = String.fromCharCode;

	    /**
	     * Creates a source function for a string.
	     * @param {string} s String to read from
	     * @returns {function():number|null} Source function returning the next char code respectively `null` if there are
	     *  no more characters left.
	     * @throws {TypeError} If the argument is invalid
	     * @inner
	     */
	    function stringSource(s) {
	        var i=0; return function() {
	            return i < s.length ? s.charCodeAt(i++) : null;
	        };
	    }

	    /**
	     * Creates a destination function for a string.
	     * @returns {function(number=):undefined|string} Destination function successively called with the next char code.
	     *  Returns the final string when called without arguments.
	     * @inner
	     */
	    function stringDestination() {
	        var cs = [], ps = []; return function() {
	            if (arguments.length === 0)
	                return ps.join('')+stringFromCharCode.apply(String, cs);
	            if (cs.length + arguments.length > 1024)
	                ps.push(stringFromCharCode.apply(String, cs)),
	                    cs.length = 0;
	            Array.prototype.push.apply(cs, arguments);
	        };
	    }

	    /**
	     * Gets the accessor type.
	     * @returns {Function} `Buffer` under node.js, `Uint8Array` respectively `DataView` in the browser (classes)
	     * @expose
	     */
	    ByteBuffer.accessor = function() {
	        return Uint8Array;
	    };
	    /**
	     * Allocates a new ByteBuffer backed by a buffer of the specified capacity.
	     * @param {number=} capacity Initial capacity. Defaults to {@link ByteBuffer.DEFAULT_CAPACITY}.
	     * @param {boolean=} littleEndian Whether to use little or big endian byte order. Defaults to
	     *  {@link ByteBuffer.DEFAULT_ENDIAN}.
	     * @param {boolean=} noAssert Whether to skip assertions of offsets and values. Defaults to
	     *  {@link ByteBuffer.DEFAULT_NOASSERT}.
	     * @returns {!ByteBuffer}
	     * @expose
	     */
	    ByteBuffer.allocate = function(capacity, littleEndian, noAssert) {
	        return new ByteBuffer(capacity, littleEndian, noAssert);
	    };

	    /**
	     * Concatenates multiple ByteBuffers into one.
	     * @param {!Array.<!ByteBuffer|!ArrayBuffer|!Uint8Array|string>} buffers Buffers to concatenate
	     * @param {(string|boolean)=} encoding String encoding if `buffers` contains a string ("base64", "hex", "binary",
	     *  defaults to "utf8")
	     * @param {boolean=} littleEndian Whether to use little or big endian byte order for the resulting ByteBuffer. Defaults
	     *  to {@link ByteBuffer.DEFAULT_ENDIAN}.
	     * @param {boolean=} noAssert Whether to skip assertions of offsets and values for the resulting ByteBuffer. Defaults to
	     *  {@link ByteBuffer.DEFAULT_NOASSERT}.
	     * @returns {!ByteBuffer} Concatenated ByteBuffer
	     * @expose
	     */
	    ByteBuffer.concat = function(buffers, encoding, littleEndian, noAssert) {
	        if (typeof encoding === 'boolean' || typeof encoding !== 'string') {
	            noAssert = littleEndian;
	            littleEndian = encoding;
	            encoding = undefined;
	        }
	        var capacity = 0;
	        for (var i=0, k=buffers.length, length; i<k; ++i) {
	            if (!ByteBuffer.isByteBuffer(buffers[i]))
	                buffers[i] = ByteBuffer.wrap(buffers[i], encoding);
	            length = buffers[i].limit - buffers[i].offset;
	            if (length > 0) capacity += length;
	        }
	        if (capacity === 0)
	            return new ByteBuffer(0, littleEndian, noAssert);
	        var bb = new ByteBuffer(capacity, littleEndian, noAssert),
	            bi;
	        i=0; while (i<k) {
	            bi = buffers[i++];
	            length = bi.limit - bi.offset;
	            if (length <= 0) continue;
	            bb.view.set(bi.view.subarray(bi.offset, bi.limit), bb.offset);
	            bb.offset += length;
	        }
	        bb.limit = bb.offset;
	        bb.offset = 0;
	        return bb;
	    };

	    /**
	     * Tests if the specified type is a ByteBuffer.
	     * @param {*} bb ByteBuffer to test
	     * @returns {boolean} `true` if it is a ByteBuffer, otherwise `false`
	     * @expose
	     */
	    ByteBuffer.isByteBuffer = function(bb) {
	        return (bb && bb["__isByteBuffer__"]) === true;
	    };
	    /**
	     * Gets the backing buffer type.
	     * @returns {Function} `Buffer` under node.js, `ArrayBuffer` in the browser (classes)
	     * @expose
	     */
	    ByteBuffer.type = function() {
	        return ArrayBuffer;
	    };
	    /**
	     * Wraps a buffer or a string. Sets the allocated ByteBuffer's {@link ByteBuffer#offset} to `0` and its
	     *  {@link ByteBuffer#limit} to the length of the wrapped data.
	     * @param {!ByteBuffer|!ArrayBuffer|!Uint8Array|string|!Array.<number>} buffer Anything that can be wrapped
	     * @param {(string|boolean)=} encoding String encoding if `buffer` is a string ("base64", "hex", "binary", defaults to
	     *  "utf8")
	     * @param {boolean=} littleEndian Whether to use little or big endian byte order. Defaults to
	     *  {@link ByteBuffer.DEFAULT_ENDIAN}.
	     * @param {boolean=} noAssert Whether to skip assertions of offsets and values. Defaults to
	     *  {@link ByteBuffer.DEFAULT_NOASSERT}.
	     * @returns {!ByteBuffer} A ByteBuffer wrapping `buffer`
	     * @expose
	     */
	    ByteBuffer.wrap = function(buffer, encoding, littleEndian, noAssert) {
	        if (typeof encoding !== 'string') {
	            noAssert = littleEndian;
	            littleEndian = encoding;
	            encoding = undefined;
	        }
	        if (typeof buffer === 'string') {
	            if (typeof encoding === 'undefined')
	                encoding = "utf8";
	            switch (encoding) {
	                case "base64":
	                    return ByteBuffer.fromBase64(buffer, littleEndian);
	                case "hex":
	                    return ByteBuffer.fromHex(buffer, littleEndian);
	                case "binary":
	                    return ByteBuffer.fromBinary(buffer, littleEndian);
	                case "utf8":
	                    return ByteBuffer.fromUTF8(buffer, littleEndian);
	                case "debug":
	                    return ByteBuffer.fromDebug(buffer, littleEndian);
	                default:
	                    throw Error("Unsupported encoding: "+encoding);
	            }
	        }
	        if (buffer === null || typeof buffer !== 'object')
	            throw TypeError("Illegal buffer");
	        var bb;
	        if (ByteBuffer.isByteBuffer(buffer)) {
	            bb = ByteBufferPrototype.clone.call(buffer);
	            bb.markedOffset = -1;
	            return bb;
	        }
	        if (buffer instanceof Uint8Array) { // Extract ArrayBuffer from Uint8Array
	            bb = new ByteBuffer(0, littleEndian, noAssert);
	            if (buffer.length > 0) { // Avoid references to more than one EMPTY_BUFFER
	                bb.buffer = buffer.buffer;
	                bb.offset = buffer.byteOffset;
	                bb.limit = buffer.byteOffset + buffer.byteLength;
	                bb.view = new Uint8Array(buffer.buffer);
	            }
	        } else if (buffer instanceof ArrayBuffer) { // Reuse ArrayBuffer
	            bb = new ByteBuffer(0, littleEndian, noAssert);
	            if (buffer.byteLength > 0) {
	                bb.buffer = buffer;
	                bb.offset = 0;
	                bb.limit = buffer.byteLength;
	                bb.view = buffer.byteLength > 0 ? new Uint8Array(buffer) : null;
	            }
	        } else if (Object.prototype.toString.call(buffer) === "[object Array]") { // Create from octets
	            bb = new ByteBuffer(buffer.length, littleEndian, noAssert);
	            bb.limit = buffer.length;
	            for (var i=0; i<buffer.length; ++i)
	                bb.view[i] = buffer[i];
	        } else
	            throw TypeError("Illegal buffer"); // Otherwise fail
	        return bb;
	    };

	    /**
	     * Writes the array as a bitset.
	     * @param {Array<boolean>} value Array of booleans to write
	     * @param {number=} offset Offset to read from. Will use and increase {@link ByteBuffer#offset} by `length` if omitted.
	     * @returns {!ByteBuffer}
	     * @expose
	     */
	    ByteBufferPrototype.writeBitSet = function(value, offset) {
	      var relative = typeof offset === 'undefined';
	      if (relative) offset = this.offset;
	      if (!this.noAssert) {
	        if (!(value instanceof Array))
	          throw TypeError("Illegal BitSet: Not an array");
	        if (typeof offset !== 'number' || offset % 1 !== 0)
	            throw TypeError("Illegal offset: "+offset+" (not an integer)");
	        offset >>>= 0;
	        if (offset < 0 || offset + 0 > this.buffer.byteLength)
	            throw RangeError("Illegal offset: 0 <= "+offset+" (+"+0+") <= "+this.buffer.byteLength);
	      }

	      var start = offset,
	          bits = value.length,
	          bytes = (bits >> 3),
	          bit = 0,
	          k;

	      offset += this.writeVarint32(bits,offset);

	      while(bytes--) {
	        k = (!!value[bit++] & 1) |
	            ((!!value[bit++] & 1) << 1) |
	            ((!!value[bit++] & 1) << 2) |
	            ((!!value[bit++] & 1) << 3) |
	            ((!!value[bit++] & 1) << 4) |
	            ((!!value[bit++] & 1) << 5) |
	            ((!!value[bit++] & 1) << 6) |
	            ((!!value[bit++] & 1) << 7);
	        this.writeByte(k,offset++);
	      }

	      if(bit < bits) {
	        var m = 0; k = 0;
	        while(bit < bits) k = k | ((!!value[bit++] & 1) << (m++));
	        this.writeByte(k,offset++);
	      }

	      if (relative) {
	        this.offset = offset;
	        return this;
	      }
	      return offset - start;
	    }

	    /**
	     * Reads a BitSet as an array of booleans.
	     * @param {number=} offset Offset to read from. Will use and increase {@link ByteBuffer#offset} by `length` if omitted.
	     * @returns {Array<boolean>
	     * @expose
	     */
	    ByteBufferPrototype.readBitSet = function(offset) {
	      var relative = typeof offset === 'undefined';
	      if (relative) offset = this.offset;

	      var ret = this.readVarint32(offset),
	          bits = ret.value,
	          bytes = (bits >> 3),
	          bit = 0,
	          value = [],
	          k;

	      offset += ret.length;

	      while(bytes--) {
	        k = this.readByte(offset++);
	        value[bit++] = !!(k & 0x01);
	        value[bit++] = !!(k & 0x02);
	        value[bit++] = !!(k & 0x04);
	        value[bit++] = !!(k & 0x08);
	        value[bit++] = !!(k & 0x10);
	        value[bit++] = !!(k & 0x20);
	        value[bit++] = !!(k & 0x40);
	        value[bit++] = !!(k & 0x80);
	      }

	      if(bit < bits) {
	        var m = 0;
	        k = this.readByte(offset++);
	        while(bit < bits) value[bit++] = !!((k >> (m++)) & 1);
	      }

	      if (relative) {
	        this.offset = offset;
	      }
	      return value;
	    }
	    /**
	     * Reads the specified number of bytes.
	     * @param {number} length Number of bytes to read
	     * @param {number=} offset Offset to read from. Will use and increase {@link ByteBuffer#offset} by `length` if omitted.
	     * @returns {!ByteBuffer}
	     * @expose
	     */
	    ByteBufferPrototype.readBytes = function(length, offset) {
	        var relative = typeof offset === 'undefined';
	        if (relative) offset = this.offset;
	        if (!this.noAssert) {
	            if (typeof offset !== 'number' || offset % 1 !== 0)
	                throw TypeError("Illegal offset: "+offset+" (not an integer)");
	            offset >>>= 0;
	            if (offset < 0 || offset + length > this.buffer.byteLength)
	                throw RangeError("Illegal offset: 0 <= "+offset+" (+"+length+") <= "+this.buffer.byteLength);
	        }
	        var slice = this.slice(offset, offset + length);
	        if (relative) this.offset += length;
	        return slice;
	    };

	    /**
	     * Writes a payload of bytes. This is an alias of {@link ByteBuffer#append}.
	     * @function
	     * @param {!ByteBuffer|!ArrayBuffer|!Uint8Array|string} source Data to write. If `source` is a ByteBuffer, its offsets
	     *  will be modified according to the performed read operation.
	     * @param {(string|number)=} encoding Encoding if `data` is a string ("base64", "hex", "binary", defaults to "utf8")
	     * @param {number=} offset Offset to write to. Will use and increase {@link ByteBuffer#offset} by the number of bytes
	     *  written if omitted.
	     * @returns {!ByteBuffer} this
	     * @expose
	     */
	    ByteBufferPrototype.writeBytes = ByteBufferPrototype.append;

	    // types/ints/int8

	    /**
	     * Writes an 8bit signed integer.
	     * @param {number} value Value to write
	     * @param {number=} offset Offset to write to. Will use and advance {@link ByteBuffer#offset} by `1` if omitted.
	     * @returns {!ByteBuffer} this
	     * @expose
	     */
	    ByteBufferPrototype.writeInt8 = function(value, offset) {
	        var relative = typeof offset === 'undefined';
	        if (relative) offset = this.offset;
	        if (!this.noAssert) {
	            if (typeof value !== 'number' || value % 1 !== 0)
	                throw TypeError("Illegal value: "+value+" (not an integer)");
	            value |= 0;
	            if (typeof offset !== 'number' || offset % 1 !== 0)
	                throw TypeError("Illegal offset: "+offset+" (not an integer)");
	            offset >>>= 0;
	            if (offset < 0 || offset + 0 > this.buffer.byteLength)
	                throw RangeError("Illegal offset: 0 <= "+offset+" (+"+0+") <= "+this.buffer.byteLength);
	        }
	        offset += 1;
	        var capacity0 = this.buffer.byteLength;
	        if (offset > capacity0)
	            this.resize((capacity0 *= 2) > offset ? capacity0 : offset);
	        offset -= 1;
	        this.view[offset] = value;
	        if (relative) this.offset += 1;
	        return this;
	    };

	    /**
	     * Writes an 8bit signed integer. This is an alias of {@link ByteBuffer#writeInt8}.
	     * @function
	     * @param {number} value Value to write
	     * @param {number=} offset Offset to write to. Will use and advance {@link ByteBuffer#offset} by `1` if omitted.
	     * @returns {!ByteBuffer} this
	     * @expose
	     */
	    ByteBufferPrototype.writeByte = ByteBufferPrototype.writeInt8;

	    /**
	     * Reads an 8bit signed integer.
	     * @param {number=} offset Offset to read from. Will use and advance {@link ByteBuffer#offset} by `1` if omitted.
	     * @returns {number} Value read
	     * @expose
	     */
	    ByteBufferPrototype.readInt8 = function(offset) {
	        var relative = typeof offset === 'undefined';
	        if (relative) offset = this.offset;
	        if (!this.noAssert) {
	            if (typeof offset !== 'number' || offset % 1 !== 0)
	                throw TypeError("Illegal offset: "+offset+" (not an integer)");
	            offset >>>= 0;
	            if (offset < 0 || offset + 1 > this.buffer.byteLength)
	                throw RangeError("Illegal offset: 0 <= "+offset+" (+"+1+") <= "+this.buffer.byteLength);
	        }
	        var value = this.view[offset];
	        if ((value & 0x80) === 0x80) value = -(0xFF - value + 1); // Cast to signed
	        if (relative) this.offset += 1;
	        return value;
	    };

	    /**
	     * Reads an 8bit signed integer. This is an alias of {@link ByteBuffer#readInt8}.
	     * @function
	     * @param {number=} offset Offset to read from. Will use and advance {@link ByteBuffer#offset} by `1` if omitted.
	     * @returns {number} Value read
	     * @expose
	     */
	    ByteBufferPrototype.readByte = ByteBufferPrototype.readInt8;

	    /**
	     * Writes an 8bit unsigned integer.
	     * @param {number} value Value to write
	     * @param {number=} offset Offset to write to. Will use and advance {@link ByteBuffer#offset} by `1` if omitted.
	     * @returns {!ByteBuffer} this
	     * @expose
	     */
	    ByteBufferPrototype.writeUint8 = function(value, offset) {
	        var relative = typeof offset === 'undefined';
	        if (relative) offset = this.offset;
	        if (!this.noAssert) {
	            if (typeof value !== 'number' || value % 1 !== 0)
	                throw TypeError("Illegal value: "+value+" (not an integer)");
	            value >>>= 0;
	            if (typeof offset !== 'number' || offset % 1 !== 0)
	                throw TypeError("Illegal offset: "+offset+" (not an integer)");
	            offset >>>= 0;
	            if (offset < 0 || offset + 0 > this.buffer.byteLength)
	                throw RangeError("Illegal offset: 0 <= "+offset+" (+"+0+") <= "+this.buffer.byteLength);
	        }
	        offset += 1;
	        var capacity1 = this.buffer.byteLength;
	        if (offset > capacity1)
	            this.resize((capacity1 *= 2) > offset ? capacity1 : offset);
	        offset -= 1;
	        this.view[offset] = value;
	        if (relative) this.offset += 1;
	        return this;
	    };

	    /**
	     * Writes an 8bit unsigned integer. This is an alias of {@link ByteBuffer#writeUint8}.
	     * @function
	     * @param {number} value Value to write
	     * @param {number=} offset Offset to write to. Will use and advance {@link ByteBuffer#offset} by `1` if omitted.
	     * @returns {!ByteBuffer} this
	     * @expose
	     */
	    ByteBufferPrototype.writeUInt8 = ByteBufferPrototype.writeUint8;

	    /**
	     * Reads an 8bit unsigned integer.
	     * @param {number=} offset Offset to read from. Will use and advance {@link ByteBuffer#offset} by `1` if omitted.
	     * @returns {number} Value read
	     * @expose
	     */
	    ByteBufferPrototype.readUint8 = function(offset) {
	        var relative = typeof offset === 'undefined';
	        if (relative) offset = this.offset;
	        if (!this.noAssert) {
	            if (typeof offset !== 'number' || offset % 1 !== 0)
	                throw TypeError("Illegal offset: "+offset+" (not an integer)");
	            offset >>>= 0;
	            if (offset < 0 || offset + 1 > this.buffer.byteLength)
	                throw RangeError("Illegal offset: 0 <= "+offset+" (+"+1+") <= "+this.buffer.byteLength);
	        }
	        var value = this.view[offset];
	        if (relative) this.offset += 1;
	        return value;
	    };

	    /**
	     * Reads an 8bit unsigned integer. This is an alias of {@link ByteBuffer#readUint8}.
	     * @function
	     * @param {number=} offset Offset to read from. Will use and advance {@link ByteBuffer#offset} by `1` if omitted.
	     * @returns {number} Value read
	     * @expose
	     */
	    ByteBufferPrototype.readUInt8 = ByteBufferPrototype.readUint8;

	    // types/ints/int16

	    /**
	     * Writes a 16bit signed integer.
	     * @param {number} value Value to write
	     * @param {number=} offset Offset to write to. Will use and advance {@link ByteBuffer#offset} by `2` if omitted.
	     * @throws {TypeError} If `offset` or `value` is not a valid number
	     * @throws {RangeError} If `offset` is out of bounds
	     * @expose
	     */
	    ByteBufferPrototype.writeInt16 = function(value, offset) {
	        var relative = typeof offset === 'undefined';
	        if (relative) offset = this.offset;
	        if (!this.noAssert) {
	            if (typeof value !== 'number' || value % 1 !== 0)
	                throw TypeError("Illegal value: "+value+" (not an integer)");
	            value |= 0;
	            if (typeof offset !== 'number' || offset % 1 !== 0)
	                throw TypeError("Illegal offset: "+offset+" (not an integer)");
	            offset >>>= 0;
	            if (offset < 0 || offset + 0 > this.buffer.byteLength)
	                throw RangeError("Illegal offset: 0 <= "+offset+" (+"+0+") <= "+this.buffer.byteLength);
	        }
	        offset += 2;
	        var capacity2 = this.buffer.byteLength;
	        if (offset > capacity2)
	            this.resize((capacity2 *= 2) > offset ? capacity2 : offset);
	        offset -= 2;
	        if (this.littleEndian) {
	            this.view[offset+1] = (value & 0xFF00) >>> 8;
	            this.view[offset  ] =  value & 0x00FF;
	        } else {
	            this.view[offset]   = (value & 0xFF00) >>> 8;
	            this.view[offset+1] =  value & 0x00FF;
	        }
	        if (relative) this.offset += 2;
	        return this;
	    };

	    /**
	     * Writes a 16bit signed integer. This is an alias of {@link ByteBuffer#writeInt16}.
	     * @function
	     * @param {number} value Value to write
	     * @param {number=} offset Offset to write to. Will use and advance {@link ByteBuffer#offset} by `2` if omitted.
	     * @throws {TypeError} If `offset` or `value` is not a valid number
	     * @throws {RangeError} If `offset` is out of bounds
	     * @expose
	     */
	    ByteBufferPrototype.writeShort = ByteBufferPrototype.writeInt16;

	    /**
	     * Reads a 16bit signed integer.
	     * @param {number=} offset Offset to read from. Will use and advance {@link ByteBuffer#offset} by `2` if omitted.
	     * @returns {number} Value read
	     * @throws {TypeError} If `offset` is not a valid number
	     * @throws {RangeError} If `offset` is out of bounds
	     * @expose
	     */
	    ByteBufferPrototype.readInt16 = function(offset) {
	        var relative = typeof offset === 'undefined';
	        if (relative) offset = this.offset;
	        if (!this.noAssert) {
	            if (typeof offset !== 'number' || offset % 1 !== 0)
	                throw TypeError("Illegal offset: "+offset+" (not an integer)");
	            offset >>>= 0;
	            if (offset < 0 || offset + 2 > this.buffer.byteLength)
	                throw RangeError("Illegal offset: 0 <= "+offset+" (+"+2+") <= "+this.buffer.byteLength);
	        }
	        var value = 0;
	        if (this.littleEndian) {
	            value  = this.view[offset  ];
	            value |= this.view[offset+1] << 8;
	        } else {
	            value  = this.view[offset  ] << 8;
	            value |= this.view[offset+1];
	        }
	        if ((value & 0x8000) === 0x8000) value = -(0xFFFF - value + 1); // Cast to signed
	        if (relative) this.offset += 2;
	        return value;
	    };

	    /**
	     * Reads a 16bit signed integer. This is an alias of {@link ByteBuffer#readInt16}.
	     * @function
	     * @param {number=} offset Offset to read from. Will use and advance {@link ByteBuffer#offset} by `2` if omitted.
	     * @returns {number} Value read
	     * @throws {TypeError} If `offset` is not a valid number
	     * @throws {RangeError} If `offset` is out of bounds
	     * @expose
	     */
	    ByteBufferPrototype.readShort = ByteBufferPrototype.readInt16;

	    /**
	     * Writes a 16bit unsigned integer.
	     * @param {number} value Value to write
	     * @param {number=} offset Offset to write to. Will use and advance {@link ByteBuffer#offset} by `2` if omitted.
	     * @throws {TypeError} If `offset` or `value` is not a valid number
	     * @throws {RangeError} If `offset` is out of bounds
	     * @expose
	     */
	    ByteBufferPrototype.writeUint16 = function(value, offset) {
	        var relative = typeof offset === 'undefined';
	        if (relative) offset = this.offset;
	        if (!this.noAssert) {
	            if (typeof value !== 'number' || value % 1 !== 0)
	                throw TypeError("Illegal value: "+value+" (not an integer)");
	            value >>>= 0;
	            if (typeof offset !== 'number' || offset % 1 !== 0)
	                throw TypeError("Illegal offset: "+offset+" (not an integer)");
	            offset >>>= 0;
	            if (offset < 0 || offset + 0 > this.buffer.byteLength)
	                throw RangeError("Illegal offset: 0 <= "+offset+" (+"+0+") <= "+this.buffer.byteLength);
	        }
	        offset += 2;
	        var capacity3 = this.buffer.byteLength;
	        if (offset > capacity3)
	            this.resize((capacity3 *= 2) > offset ? capacity3 : offset);
	        offset -= 2;
	        if (this.littleEndian) {
	            this.view[offset+1] = (value & 0xFF00) >>> 8;
	            this.view[offset  ] =  value & 0x00FF;
	        } else {
	            this.view[offset]   = (value & 0xFF00) >>> 8;
	            this.view[offset+1] =  value & 0x00FF;
	        }
	        if (relative) this.offset += 2;
	        return this;
	    };

	    /**
	     * Writes a 16bit unsigned integer. This is an alias of {@link ByteBuffer#writeUint16}.
	     * @function
	     * @param {number} value Value to write
	     * @param {number=} offset Offset to write to. Will use and advance {@link ByteBuffer#offset} by `2` if omitted.
	     * @throws {TypeError} If `offset` or `value` is not a valid number
	     * @throws {RangeError} If `offset` is out of bounds
	     * @expose
	     */
	    ByteBufferPrototype.writeUInt16 = ByteBufferPrototype.writeUint16;

	    /**
	     * Reads a 16bit unsigned integer.
	     * @param {number=} offset Offset to read from. Will use and advance {@link ByteBuffer#offset} by `2` if omitted.
	     * @returns {number} Value read
	     * @throws {TypeError} If `offset` is not a valid number
	     * @throws {RangeError} If `offset` is out of bounds
	     * @expose
	     */
	    ByteBufferPrototype.readUint16 = function(offset) {
	        var relative = typeof offset === 'undefined';
	        if (relative) offset = this.offset;
	        if (!this.noAssert) {
	            if (typeof offset !== 'number' || offset % 1 !== 0)
	                throw TypeError("Illegal offset: "+offset+" (not an integer)");
	            offset >>>= 0;
	            if (offset < 0 || offset + 2 > this.buffer.byteLength)
	                throw RangeError("Illegal offset: 0 <= "+offset+" (+"+2+") <= "+this.buffer.byteLength);
	        }
	        var value = 0;
	        if (this.littleEndian) {
	            value  = this.view[offset  ];
	            value |= this.view[offset+1] << 8;
	        } else {
	            value  = this.view[offset  ] << 8;
	            value |= this.view[offset+1];
	        }
	        if (relative) this.offset += 2;
	        return value;
	    };

	    /**
	     * Reads a 16bit unsigned integer. This is an alias of {@link ByteBuffer#readUint16}.
	     * @function
	     * @param {number=} offset Offset to read from. Will use and advance {@link ByteBuffer#offset} by `2` if omitted.
	     * @returns {number} Value read
	     * @throws {TypeError} If `offset` is not a valid number
	     * @throws {RangeError} If `offset` is out of bounds
	     * @expose
	     */
	    ByteBufferPrototype.readUInt16 = ByteBufferPrototype.readUint16;

	    // types/ints/int32

	    /**
	     * Writes a 32bit signed integer.
	     * @param {number} value Value to write
	     * @param {number=} offset Offset to write to. Will use and increase {@link ByteBuffer#offset} by `4` if omitted.
	     * @expose
	     */
	    ByteBufferPrototype.writeInt32 = function(value, offset) {
	        var relative = typeof offset === 'undefined';
	        if (relative) offset = this.offset;
	        if (!this.noAssert) {
	            if (typeof value !== 'number' || value % 1 !== 0)
	                throw TypeError("Illegal value: "+value+" (not an integer)");
	            value |= 0;
	            if (typeof offset !== 'number' || offset % 1 !== 0)
	                throw TypeError("Illegal offset: "+offset+" (not an integer)");
	            offset >>>= 0;
	            if (offset < 0 || offset + 0 > this.buffer.byteLength)
	                throw RangeError("Illegal offset: 0 <= "+offset+" (+"+0+") <= "+this.buffer.byteLength);
	        }
	        offset += 4;
	        var capacity4 = this.buffer.byteLength;
	        if (offset > capacity4)
	            this.resize((capacity4 *= 2) > offset ? capacity4 : offset);
	        offset -= 4;
	        if (this.littleEndian) {
	            this.view[offset+3] = (value >>> 24) & 0xFF;
	            this.view[offset+2] = (value >>> 16) & 0xFF;
	            this.view[offset+1] = (value >>>  8) & 0xFF;
	            this.view[offset  ] =  value         & 0xFF;
	        } else {
	            this.view[offset  ] = (value >>> 24) & 0xFF;
	            this.view[offset+1] = (value >>> 16) & 0xFF;
	            this.view[offset+2] = (value >>>  8) & 0xFF;
	            this.view[offset+3] =  value         & 0xFF;
	        }
	        if (relative) this.offset += 4;
	        return this;
	    };

	    /**
	     * Writes a 32bit signed integer. This is an alias of {@link ByteBuffer#writeInt32}.
	     * @param {number} value Value to write
	     * @param {number=} offset Offset to write to. Will use and increase {@link ByteBuffer#offset} by `4` if omitted.
	     * @expose
	     */
	    ByteBufferPrototype.writeInt = ByteBufferPrototype.writeInt32;

	    /**
	     * Reads a 32bit signed integer.
	     * @param {number=} offset Offset to read from. Will use and increase {@link ByteBuffer#offset} by `4` if omitted.
	     * @returns {number} Value read
	     * @expose
	     */
	    ByteBufferPrototype.readInt32 = function(offset) {
	        var relative = typeof offset === 'undefined';
	        if (relative) offset = this.offset;
	        if (!this.noAssert) {
	            if (typeof offset !== 'number' || offset % 1 !== 0)
	                throw TypeError("Illegal offset: "+offset+" (not an integer)");
	            offset >>>= 0;
	            if (offset < 0 || offset + 4 > this.buffer.byteLength)
	                throw RangeError("Illegal offset: 0 <= "+offset+" (+"+4+") <= "+this.buffer.byteLength);
	        }
	        var value = 0;
	        if (this.littleEndian) {
	            value  = this.view[offset+2] << 16;
	            value |= this.view[offset+1] <<  8;
	            value |= this.view[offset  ];
	            value += this.view[offset+3] << 24 >>> 0;
	        } else {
	            value  = this.view[offset+1] << 16;
	            value |= this.view[offset+2] <<  8;
	            value |= this.view[offset+3];
	            value += this.view[offset  ] << 24 >>> 0;
	        }
	        value |= 0; // Cast to signed
	        if (relative) this.offset += 4;
	        return value;
	    };

	    /**
	     * Reads a 32bit signed integer. This is an alias of {@link ByteBuffer#readInt32}.
	     * @param {number=} offset Offset to read from. Will use and advance {@link ByteBuffer#offset} by `4` if omitted.
	     * @returns {number} Value read
	     * @expose
	     */
	    ByteBufferPrototype.readInt = ByteBufferPrototype.readInt32;

	    /**
	     * Writes a 32bit unsigned integer.
	     * @param {number} value Value to write
	     * @param {number=} offset Offset to write to. Will use and increase {@link ByteBuffer#offset} by `4` if omitted.
	     * @expose
	     */
	    ByteBufferPrototype.writeUint32 = function(value, offset) {
	        var relative = typeof offset === 'undefined';
	        if (relative) offset = this.offset;
	        if (!this.noAssert) {
	            if (typeof value !== 'number' || value % 1 !== 0)
	                throw TypeError("Illegal value: "+value+" (not an integer)");
	            value >>>= 0;
	            if (typeof offset !== 'number' || offset % 1 !== 0)
	                throw TypeError("Illegal offset: "+offset+" (not an integer)");
	            offset >>>= 0;
	            if (offset < 0 || offset + 0 > this.buffer.byteLength)
	                throw RangeError("Illegal offset: 0 <= "+offset+" (+"+0+") <= "+this.buffer.byteLength);
	        }
	        offset += 4;
	        var capacity5 = this.buffer.byteLength;
	        if (offset > capacity5)
	            this.resize((capacity5 *= 2) > offset ? capacity5 : offset);
	        offset -= 4;
	        if (this.littleEndian) {
	            this.view[offset+3] = (value >>> 24) & 0xFF;
	            this.view[offset+2] = (value >>> 16) & 0xFF;
	            this.view[offset+1] = (value >>>  8) & 0xFF;
	            this.view[offset  ] =  value         & 0xFF;
	        } else {
	            this.view[offset  ] = (value >>> 24) & 0xFF;
	            this.view[offset+1] = (value >>> 16) & 0xFF;
	            this.view[offset+2] = (value >>>  8) & 0xFF;
	            this.view[offset+3] =  value         & 0xFF;
	        }
	        if (relative) this.offset += 4;
	        return this;
	    };

	    /**
	     * Writes a 32bit unsigned integer. This is an alias of {@link ByteBuffer#writeUint32}.
	     * @function
	     * @param {number} value Value to write
	     * @param {number=} offset Offset to write to. Will use and increase {@link ByteBuffer#offset} by `4` if omitted.
	     * @expose
	     */
	    ByteBufferPrototype.writeUInt32 = ByteBufferPrototype.writeUint32;

	    /**
	     * Reads a 32bit unsigned integer.
	     * @param {number=} offset Offset to read from. Will use and increase {@link ByteBuffer#offset} by `4` if omitted.
	     * @returns {number} Value read
	     * @expose
	     */
	    ByteBufferPrototype.readUint32 = function(offset) {
	        var relative = typeof offset === 'undefined';
	        if (relative) offset = this.offset;
	        if (!this.noAssert) {
	            if (typeof offset !== 'number' || offset % 1 !== 0)
	                throw TypeError("Illegal offset: "+offset+" (not an integer)");
	            offset >>>= 0;
	            if (offset < 0 || offset + 4 > this.buffer.byteLength)
	                throw RangeError("Illegal offset: 0 <= "+offset+" (+"+4+") <= "+this.buffer.byteLength);
	        }
	        var value = 0;
	        if (this.littleEndian) {
	            value  = this.view[offset+2] << 16;
	            value |= this.view[offset+1] <<  8;
	            value |= this.view[offset  ];
	            value += this.view[offset+3] << 24 >>> 0;
	        } else {
	            value  = this.view[offset+1] << 16;
	            value |= this.view[offset+2] <<  8;
	            value |= this.view[offset+3];
	            value += this.view[offset  ] << 24 >>> 0;
	        }
	        if (relative) this.offset += 4;
	        return value;
	    };

	    /**
	     * Reads a 32bit unsigned integer. This is an alias of {@link ByteBuffer#readUint32}.
	     * @function
	     * @param {number=} offset Offset to read from. Will use and increase {@link ByteBuffer#offset} by `4` if omitted.
	     * @returns {number} Value read
	     * @expose
	     */
	    ByteBufferPrototype.readUInt32 = ByteBufferPrototype.readUint32;

	    // types/ints/int64

	    if (Long) {

	        /**
	         * Writes a 64bit signed integer.
	         * @param {number|!Long} value Value to write
	         * @param {number=} offset Offset to write to. Will use and increase {@link ByteBuffer#offset} by `8` if omitted.
	         * @returns {!ByteBuffer} this
	         * @expose
	         */
	        ByteBufferPrototype.writeInt64 = function(value, offset) {
	            var relative = typeof offset === 'undefined';
	            if (relative) offset = this.offset;
	            if (!this.noAssert) {
	                if (typeof value === 'number')
	                    value = Long.fromNumber(value);
	                else if (typeof value === 'string')
	                    value = Long.fromString(value);
	                else if (!(value && value instanceof Long))
	                    throw TypeError("Illegal value: "+value+" (not an integer or Long)");
	                if (typeof offset !== 'number' || offset % 1 !== 0)
	                    throw TypeError("Illegal offset: "+offset+" (not an integer)");
	                offset >>>= 0;
	                if (offset < 0 || offset + 0 > this.buffer.byteLength)
	                    throw RangeError("Illegal offset: 0 <= "+offset+" (+"+0+") <= "+this.buffer.byteLength);
	            }
	            if (typeof value === 'number')
	                value = Long.fromNumber(value);
	            else if (typeof value === 'string')
	                value = Long.fromString(value);
	            offset += 8;
	            var capacity6 = this.buffer.byteLength;
	            if (offset > capacity6)
	                this.resize((capacity6 *= 2) > offset ? capacity6 : offset);
	            offset -= 8;
	            var lo = value.low,
	                hi = value.high;
	            if (this.littleEndian) {
	                this.view[offset+3] = (lo >>> 24) & 0xFF;
	                this.view[offset+2] = (lo >>> 16) & 0xFF;
	                this.view[offset+1] = (lo >>>  8) & 0xFF;
	                this.view[offset  ] =  lo         & 0xFF;
	                offset += 4;
	                this.view[offset+3] = (hi >>> 24) & 0xFF;
	                this.view[offset+2] = (hi >>> 16) & 0xFF;
	                this.view[offset+1] = (hi >>>  8) & 0xFF;
	                this.view[offset  ] =  hi         & 0xFF;
	            } else {
	                this.view[offset  ] = (hi >>> 24) & 0xFF;
	                this.view[offset+1] = (hi >>> 16) & 0xFF;
	                this.view[offset+2] = (hi >>>  8) & 0xFF;
	                this.view[offset+3] =  hi         & 0xFF;
	                offset += 4;
	                this.view[offset  ] = (lo >>> 24) & 0xFF;
	                this.view[offset+1] = (lo >>> 16) & 0xFF;
	                this.view[offset+2] = (lo >>>  8) & 0xFF;
	                this.view[offset+3] =  lo         & 0xFF;
	            }
	            if (relative) this.offset += 8;
	            return this;
	        };

	        /**
	         * Writes a 64bit signed integer. This is an alias of {@link ByteBuffer#writeInt64}.
	         * @param {number|!Long} value Value to write
	         * @param {number=} offset Offset to write to. Will use and increase {@link ByteBuffer#offset} by `8` if omitted.
	         * @returns {!ByteBuffer} this
	         * @expose
	         */
	        ByteBufferPrototype.writeLong = ByteBufferPrototype.writeInt64;

	        /**
	         * Reads a 64bit signed integer.
	         * @param {number=} offset Offset to read from. Will use and increase {@link ByteBuffer#offset} by `8` if omitted.
	         * @returns {!Long}
	         * @expose
	         */
	        ByteBufferPrototype.readInt64 = function(offset) {
	            var relative = typeof offset === 'undefined';
	            if (relative) offset = this.offset;
	            if (!this.noAssert) {
	                if (typeof offset !== 'number' || offset % 1 !== 0)
	                    throw TypeError("Illegal offset: "+offset+" (not an integer)");
	                offset >>>= 0;
	                if (offset < 0 || offset + 8 > this.buffer.byteLength)
	                    throw RangeError("Illegal offset: 0 <= "+offset+" (+"+8+") <= "+this.buffer.byteLength);
	            }
	            var lo = 0,
	                hi = 0;
	            if (this.littleEndian) {
	                lo  = this.view[offset+2] << 16;
	                lo |= this.view[offset+1] <<  8;
	                lo |= this.view[offset  ];
	                lo += this.view[offset+3] << 24 >>> 0;
	                offset += 4;
	                hi  = this.view[offset+2] << 16;
	                hi |= this.view[offset+1] <<  8;
	                hi |= this.view[offset  ];
	                hi += this.view[offset+3] << 24 >>> 0;
	            } else {
	                hi  = this.view[offset+1] << 16;
	                hi |= this.view[offset+2] <<  8;
	                hi |= this.view[offset+3];
	                hi += this.view[offset  ] << 24 >>> 0;
	                offset += 4;
	                lo  = this.view[offset+1] << 16;
	                lo |= this.view[offset+2] <<  8;
	                lo |= this.view[offset+3];
	                lo += this.view[offset  ] << 24 >>> 0;
	            }
	            var value = new Long(lo, hi, false);
	            if (relative) this.offset += 8;
	            return value;
	        };

	        /**
	         * Reads a 64bit signed integer. This is an alias of {@link ByteBuffer#readInt64}.
	         * @param {number=} offset Offset to read from. Will use and increase {@link ByteBuffer#offset} by `8` if omitted.
	         * @returns {!Long}
	         * @expose
	         */
	        ByteBufferPrototype.readLong = ByteBufferPrototype.readInt64;

	        /**
	         * Writes a 64bit unsigned integer.
	         * @param {number|!Long} value Value to write
	         * @param {number=} offset Offset to write to. Will use and increase {@link ByteBuffer#offset} by `8` if omitted.
	         * @returns {!ByteBuffer} this
	         * @expose
	         */
	        ByteBufferPrototype.writeUint64 = function(value, offset) {
	            var relative = typeof offset === 'undefined';
	            if (relative) offset = this.offset;
	            if (!this.noAssert) {
	                if (typeof value === 'number')
	                    value = Long.fromNumber(value);
	                else if (typeof value === 'string')
	                    value = Long.fromString(value);
	                else if (!(value && value instanceof Long))
	                    throw TypeError("Illegal value: "+value+" (not an integer or Long)");
	                if (typeof offset !== 'number' || offset % 1 !== 0)
	                    throw TypeError("Illegal offset: "+offset+" (not an integer)");
	                offset >>>= 0;
	                if (offset < 0 || offset + 0 > this.buffer.byteLength)
	                    throw RangeError("Illegal offset: 0 <= "+offset+" (+"+0+") <= "+this.buffer.byteLength);
	            }
	            if (typeof value === 'number')
	                value = Long.fromNumber(value);
	            else if (typeof value === 'string')
	                value = Long.fromString(value);
	            offset += 8;
	            var capacity7 = this.buffer.byteLength;
	            if (offset > capacity7)
	                this.resize((capacity7 *= 2) > offset ? capacity7 : offset);
	            offset -= 8;
	            var lo = value.low,
	                hi = value.high;
	            if (this.littleEndian) {
	                this.view[offset+3] = (lo >>> 24) & 0xFF;
	                this.view[offset+2] = (lo >>> 16) & 0xFF;
	                this.view[offset+1] = (lo >>>  8) & 0xFF;
	                this.view[offset  ] =  lo         & 0xFF;
	                offset += 4;
	                this.view[offset+3] = (hi >>> 24) & 0xFF;
	                this.view[offset+2] = (hi >>> 16) & 0xFF;
	                this.view[offset+1] = (hi >>>  8) & 0xFF;
	                this.view[offset  ] =  hi         & 0xFF;
	            } else {
	                this.view[offset  ] = (hi >>> 24) & 0xFF;
	                this.view[offset+1] = (hi >>> 16) & 0xFF;
	                this.view[offset+2] = (hi >>>  8) & 0xFF;
	                this.view[offset+3] =  hi         & 0xFF;
	                offset += 4;
	                this.view[offset  ] = (lo >>> 24) & 0xFF;
	                this.view[offset+1] = (lo >>> 16) & 0xFF;
	                this.view[offset+2] = (lo >>>  8) & 0xFF;
	                this.view[offset+3] =  lo         & 0xFF;
	            }
	            if (relative) this.offset += 8;
	            return this;
	        };

	        /**
	         * Writes a 64bit unsigned integer. This is an alias of {@link ByteBuffer#writeUint64}.
	         * @function
	         * @param {number|!Long} value Value to write
	         * @param {number=} offset Offset to write to. Will use and increase {@link ByteBuffer#offset} by `8` if omitted.
	         * @returns {!ByteBuffer} this
	         * @expose
	         */
	        ByteBufferPrototype.writeUInt64 = ByteBufferPrototype.writeUint64;

	        /**
	         * Reads a 64bit unsigned integer.
	         * @param {number=} offset Offset to read from. Will use and increase {@link ByteBuffer#offset} by `8` if omitted.
	         * @returns {!Long}
	         * @expose
	         */
	        ByteBufferPrototype.readUint64 = function(offset) {
	            var relative = typeof offset === 'undefined';
	            if (relative) offset = this.offset;
	            if (!this.noAssert) {
	                if (typeof offset !== 'number' || offset % 1 !== 0)
	                    throw TypeError("Illegal offset: "+offset+" (not an integer)");
	                offset >>>= 0;
	                if (offset < 0 || offset + 8 > this.buffer.byteLength)
	                    throw RangeError("Illegal offset: 0 <= "+offset+" (+"+8+") <= "+this.buffer.byteLength);
	            }
	            var lo = 0,
	                hi = 0;
	            if (this.littleEndian) {
	                lo  = this.view[offset+2] << 16;
	                lo |= this.view[offset+1] <<  8;
	                lo |= this.view[offset  ];
	                lo += this.view[offset+3] << 24 >>> 0;
	                offset += 4;
	                hi  = this.view[offset+2] << 16;
	                hi |= this.view[offset+1] <<  8;
	                hi |= this.view[offset  ];
	                hi += this.view[offset+3] << 24 >>> 0;
	            } else {
	                hi  = this.view[offset+1] << 16;
	                hi |= this.view[offset+2] <<  8;
	                hi |= this.view[offset+3];
	                hi += this.view[offset  ] << 24 >>> 0;
	                offset += 4;
	                lo  = this.view[offset+1] << 16;
	                lo |= this.view[offset+2] <<  8;
	                lo |= this.view[offset+3];
	                lo += this.view[offset  ] << 24 >>> 0;
	            }
	            var value = new Long(lo, hi, true);
	            if (relative) this.offset += 8;
	            return value;
	        };

	        /**
	         * Reads a 64bit unsigned integer. This is an alias of {@link ByteBuffer#readUint64}.
	         * @function
	         * @param {number=} offset Offset to read from. Will use and increase {@link ByteBuffer#offset} by `8` if omitted.
	         * @returns {!Long}
	         * @expose
	         */
	        ByteBufferPrototype.readUInt64 = ByteBufferPrototype.readUint64;

	    } // Long


	    // types/floats/float32

	    /*
	     ieee754 - https://github.com/feross/ieee754

	     The MIT License (MIT)

	     Copyright (c) Feross Aboukhadijeh

	     Permission is hereby granted, free of charge, to any person obtaining a copy
	     of this software and associated documentation files (the "Software"), to deal
	     in the Software without restriction, including without limitation the rights
	     to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
	     copies of the Software, and to permit persons to whom the Software is
	     furnished to do so, subject to the following conditions:

	     The above copyright notice and this permission notice shall be included in
	     all copies or substantial portions of the Software.

	     THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
	     IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
	     FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
	     AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
	     LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
	     OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
	     THE SOFTWARE.
	    */

	    /**
	     * Reads an IEEE754 float from a byte array.
	     * @param {!Array} buffer
	     * @param {number} offset
	     * @param {boolean} isLE
	     * @param {number} mLen
	     * @param {number} nBytes
	     * @returns {number}
	     * @inner
	     */
	    function ieee754_read(buffer, offset, isLE, mLen, nBytes) {
	        var e, m,
	            eLen = nBytes * 8 - mLen - 1,
	            eMax = (1 << eLen) - 1,
	            eBias = eMax >> 1,
	            nBits = -7,
	            i = isLE ? (nBytes - 1) : 0,
	            d = isLE ? -1 : 1,
	            s = buffer[offset + i];

	        i += d;

	        e = s & ((1 << (-nBits)) - 1);
	        s >>= (-nBits);
	        nBits += eLen;
	        for (; nBits > 0; e = e * 256 + buffer[offset + i], i += d, nBits -= 8) {}

	        m = e & ((1 << (-nBits)) - 1);
	        e >>= (-nBits);
	        nBits += mLen;
	        for (; nBits > 0; m = m * 256 + buffer[offset + i], i += d, nBits -= 8) {}

	        if (e === 0) {
	            e = 1 - eBias;
	        } else if (e === eMax) {
	            return m ? NaN : ((s ? -1 : 1) * Infinity);
	        } else {
	            m = m + Math.pow(2, mLen);
	            e = e - eBias;
	        }
	        return (s ? -1 : 1) * m * Math.pow(2, e - mLen);
	    }

	    /**
	     * Writes an IEEE754 float to a byte array.
	     * @param {!Array} buffer
	     * @param {number} value
	     * @param {number} offset
	     * @param {boolean} isLE
	     * @param {number} mLen
	     * @param {number} nBytes
	     * @inner
	     */
	    function ieee754_write(buffer, value, offset, isLE, mLen, nBytes) {
	        var e, m, c,
	            eLen = nBytes * 8 - mLen - 1,
	            eMax = (1 << eLen) - 1,
	            eBias = eMax >> 1,
	            rt = (mLen === 23 ? Math.pow(2, -24) - Math.pow(2, -77) : 0),
	            i = isLE ? 0 : (nBytes - 1),
	            d = isLE ? 1 : -1,
	            s = value < 0 || (value === 0 && 1 / value < 0) ? 1 : 0;

	        value = Math.abs(value);

	        if (isNaN(value) || value === Infinity) {
	            m = isNaN(value) ? 1 : 0;
	            e = eMax;
	        } else {
	            e = Math.floor(Math.log(value) / Math.LN2);
	            if (value * (c = Math.pow(2, -e)) < 1) {
	                e--;
	                c *= 2;
	            }
	            if (e + eBias >= 1) {
	                value += rt / c;
	            } else {
	                value += rt * Math.pow(2, 1 - eBias);
	            }
	            if (value * c >= 2) {
	                e++;
	                c /= 2;
	            }

	            if (e + eBias >= eMax) {
	                m = 0;
	                e = eMax;
	            } else if (e + eBias >= 1) {
	                m = (value * c - 1) * Math.pow(2, mLen);
	                e = e + eBias;
	            } else {
	                m = value * Math.pow(2, eBias - 1) * Math.pow(2, mLen);
	                e = 0;
	            }
	        }

	        for (; mLen >= 8; buffer[offset + i] = m & 0xff, i += d, m /= 256, mLen -= 8) {}

	        e = (e << mLen) | m;
	        eLen += mLen;
	        for (; eLen > 0; buffer[offset + i] = e & 0xff, i += d, e /= 256, eLen -= 8) {}

	        buffer[offset + i - d] |= s * 128;
	    }

	    /**
	     * Writes a 32bit float.
	     * @param {number} value Value to write
	     * @param {number=} offset Offset to write to. Will use and increase {@link ByteBuffer#offset} by `4` if omitted.
	     * @returns {!ByteBuffer} this
	     * @expose
	     */
	    ByteBufferPrototype.writeFloat32 = function(value, offset) {
	        var relative = typeof offset === 'undefined';
	        if (relative) offset = this.offset;
	        if (!this.noAssert) {
	            if (typeof value !== 'number')
	                throw TypeError("Illegal value: "+value+" (not a number)");
	            if (typeof offset !== 'number' || offset % 1 !== 0)
	                throw TypeError("Illegal offset: "+offset+" (not an integer)");
	            offset >>>= 0;
	            if (offset < 0 || offset + 0 > this.buffer.byteLength)
	                throw RangeError("Illegal offset: 0 <= "+offset+" (+"+0+") <= "+this.buffer.byteLength);
	        }
	        offset += 4;
	        var capacity8 = this.buffer.byteLength;
	        if (offset > capacity8)
	            this.resize((capacity8 *= 2) > offset ? capacity8 : offset);
	        offset -= 4;
	        ieee754_write(this.view, value, offset, this.littleEndian, 23, 4);
	        if (relative) this.offset += 4;
	        return this;
	    };

	    /**
	     * Writes a 32bit float. This is an alias of {@link ByteBuffer#writeFloat32}.
	     * @function
	     * @param {number} value Value to write
	     * @param {number=} offset Offset to write to. Will use and increase {@link ByteBuffer#offset} by `4` if omitted.
	     * @returns {!ByteBuffer} this
	     * @expose
	     */
	    ByteBufferPrototype.writeFloat = ByteBufferPrototype.writeFloat32;

	    /**
	     * Reads a 32bit float.
	     * @param {number=} offset Offset to read from. Will use and increase {@link ByteBuffer#offset} by `4` if omitted.
	     * @returns {number}
	     * @expose
	     */
	    ByteBufferPrototype.readFloat32 = function(offset) {
	        var relative = typeof offset === 'undefined';
	        if (relative) offset = this.offset;
	        if (!this.noAssert) {
	            if (typeof offset !== 'number' || offset % 1 !== 0)
	                throw TypeError("Illegal offset: "+offset+" (not an integer)");
	            offset >>>= 0;
	            if (offset < 0 || offset + 4 > this.buffer.byteLength)
	                throw RangeError("Illegal offset: 0 <= "+offset+" (+"+4+") <= "+this.buffer.byteLength);
	        }
	        var value = ieee754_read(this.view, offset, this.littleEndian, 23, 4);
	        if (relative) this.offset += 4;
	        return value;
	    };

	    /**
	     * Reads a 32bit float. This is an alias of {@link ByteBuffer#readFloat32}.
	     * @function
	     * @param {number=} offset Offset to read from. Will use and increase {@link ByteBuffer#offset} by `4` if omitted.
	     * @returns {number}
	     * @expose
	     */
	    ByteBufferPrototype.readFloat = ByteBufferPrototype.readFloat32;

	    // types/floats/float64

	    /**
	     * Writes a 64bit float.
	     * @param {number} value Value to write
	     * @param {number=} offset Offset to write to. Will use and increase {@link ByteBuffer#offset} by `8` if omitted.
	     * @returns {!ByteBuffer} this
	     * @expose
	     */
	    ByteBufferPrototype.writeFloat64 = function(value, offset) {
	        var relative = typeof offset === 'undefined';
	        if (relative) offset = this.offset;
	        if (!this.noAssert) {
	            if (typeof value !== 'number')
	                throw TypeError("Illegal value: "+value+" (not a number)");
	            if (typeof offset !== 'number' || offset % 1 !== 0)
	                throw TypeError("Illegal offset: "+offset+" (not an integer)");
	            offset >>>= 0;
	            if (offset < 0 || offset + 0 > this.buffer.byteLength)
	                throw RangeError("Illegal offset: 0 <= "+offset+" (+"+0+") <= "+this.buffer.byteLength);
	        }
	        offset += 8;
	        var capacity9 = this.buffer.byteLength;
	        if (offset > capacity9)
	            this.resize((capacity9 *= 2) > offset ? capacity9 : offset);
	        offset -= 8;
	        ieee754_write(this.view, value, offset, this.littleEndian, 52, 8);
	        if (relative) this.offset += 8;
	        return this;
	    };

	    /**
	     * Writes a 64bit float. This is an alias of {@link ByteBuffer#writeFloat64}.
	     * @function
	     * @param {number} value Value to write
	     * @param {number=} offset Offset to write to. Will use and increase {@link ByteBuffer#offset} by `8` if omitted.
	     * @returns {!ByteBuffer} this
	     * @expose
	     */
	    ByteBufferPrototype.writeDouble = ByteBufferPrototype.writeFloat64;

	    /**
	     * Reads a 64bit float.
	     * @param {number=} offset Offset to read from. Will use and increase {@link ByteBuffer#offset} by `8` if omitted.
	     * @returns {number}
	     * @expose
	     */
	    ByteBufferPrototype.readFloat64 = function(offset) {
	        var relative = typeof offset === 'undefined';
	        if (relative) offset = this.offset;
	        if (!this.noAssert) {
	            if (typeof offset !== 'number' || offset % 1 !== 0)
	                throw TypeError("Illegal offset: "+offset+" (not an integer)");
	            offset >>>= 0;
	            if (offset < 0 || offset + 8 > this.buffer.byteLength)
	                throw RangeError("Illegal offset: 0 <= "+offset+" (+"+8+") <= "+this.buffer.byteLength);
	        }
	        var value = ieee754_read(this.view, offset, this.littleEndian, 52, 8);
	        if (relative) this.offset += 8;
	        return value;
	    };

	    /**
	     * Reads a 64bit float. This is an alias of {@link ByteBuffer#readFloat64}.
	     * @function
	     * @param {number=} offset Offset to read from. Will use and increase {@link ByteBuffer#offset} by `8` if omitted.
	     * @returns {number}
	     * @expose
	     */
	    ByteBufferPrototype.readDouble = ByteBufferPrototype.readFloat64;


	    // types/varints/varint32

	    /**
	     * Maximum number of bytes required to store a 32bit base 128 variable-length integer.
	     * @type {number}
	     * @const
	     * @expose
	     */
	    ByteBuffer.MAX_VARINT32_BYTES = 5;

	    /**
	     * Calculates the actual number of bytes required to store a 32bit base 128 variable-length integer.
	     * @param {number} value Value to encode
	     * @returns {number} Number of bytes required. Capped to {@link ByteBuffer.MAX_VARINT32_BYTES}
	     * @expose
	     */
	    ByteBuffer.calculateVarint32 = function(value) {
	        // ref: src/google/protobuf/io/coded_stream.cc
	        value = value >>> 0;
	             if (value < 1 << 7 ) return 1;
	        else if (value < 1 << 14) return 2;
	        else if (value < 1 << 21) return 3;
	        else if (value < 1 << 28) return 4;
	        else                      return 5;
	    };

	    /**
	     * Zigzag encodes a signed 32bit integer so that it can be effectively used with varint encoding.
	     * @param {number} n Signed 32bit integer
	     * @returns {number} Unsigned zigzag encoded 32bit integer
	     * @expose
	     */
	    ByteBuffer.zigZagEncode32 = function(n) {
	        return (((n |= 0) << 1) ^ (n >> 31)) >>> 0; // ref: src/google/protobuf/wire_format_lite.h
	    };

	    /**
	     * Decodes a zigzag encoded signed 32bit integer.
	     * @param {number} n Unsigned zigzag encoded 32bit integer
	     * @returns {number} Signed 32bit integer
	     * @expose
	     */
	    ByteBuffer.zigZagDecode32 = function(n) {
	        return ((n >>> 1) ^ -(n & 1)) | 0; // // ref: src/google/protobuf/wire_format_lite.h
	    };

	    /**
	     * Writes a 32bit base 128 variable-length integer.
	     * @param {number} value Value to write
	     * @param {number=} offset Offset to write to. Will use and increase {@link ByteBuffer#offset} by the number of bytes
	     *  written if omitted.
	     * @returns {!ByteBuffer|number} this if `offset` is omitted, else the actual number of bytes written
	     * @expose
	     */
	    ByteBufferPrototype.writeVarint32 = function(value, offset) {
	        var relative = typeof offset === 'undefined';
	        if (relative) offset = this.offset;
	        if (!this.noAssert) {
	            if (typeof value !== 'number' || value % 1 !== 0)
	                throw TypeError("Illegal value: "+value+" (not an integer)");
	            value |= 0;
	            if (typeof offset !== 'number' || offset % 1 !== 0)
	                throw TypeError("Illegal offset: "+offset+" (not an integer)");
	            offset >>>= 0;
	            if (offset < 0 || offset + 0 > this.buffer.byteLength)
	                throw RangeError("Illegal offset: 0 <= "+offset+" (+"+0+") <= "+this.buffer.byteLength);
	        }
	        var size = ByteBuffer.calculateVarint32(value),
	            b;
	        offset += size;
	        var capacity10 = this.buffer.byteLength;
	        if (offset > capacity10)
	            this.resize((capacity10 *= 2) > offset ? capacity10 : offset);
	        offset -= size;
	        value >>>= 0;
	        while (value >= 0x80) {
	            b = (value & 0x7f) | 0x80;
	            this.view[offset++] = b;
	            value >>>= 7;
	        }
	        this.view[offset++] = value;
	        if (relative) {
	            this.offset = offset;
	            return this;
	        }
	        return size;
	    };

	    /**
	     * Writes a zig-zag encoded (signed) 32bit base 128 variable-length integer.
	     * @param {number} value Value to write
	     * @param {number=} offset Offset to write to. Will use and increase {@link ByteBuffer#offset} by the number of bytes
	     *  written if omitted.
	     * @returns {!ByteBuffer|number} this if `offset` is omitted, else the actual number of bytes written
	     * @expose
	     */
	    ByteBufferPrototype.writeVarint32ZigZag = function(value, offset) {
	        return this.writeVarint32(ByteBuffer.zigZagEncode32(value), offset);
	    };

	    /**
	     * Reads a 32bit base 128 variable-length integer.
	     * @param {number=} offset Offset to read from. Will use and increase {@link ByteBuffer#offset} by the number of bytes
	     *  written if omitted.
	     * @returns {number|!{value: number, length: number}} The value read if offset is omitted, else the value read
	     *  and the actual number of bytes read.
	     * @throws {Error} If it's not a valid varint. Has a property `truncated = true` if there is not enough data available
	     *  to fully decode the varint.
	     * @expose
	     */
	    ByteBufferPrototype.readVarint32 = function(offset) {
	        var relative = typeof offset === 'undefined';
	        if (relative) offset = this.offset;
	        if (!this.noAssert) {
	            if (typeof offset !== 'number' || offset % 1 !== 0)
	                throw TypeError("Illegal offset: "+offset+" (not an integer)");
	            offset >>>= 0;
	            if (offset < 0 || offset + 1 > this.buffer.byteLength)
	                throw RangeError("Illegal offset: 0 <= "+offset+" (+"+1+") <= "+this.buffer.byteLength);
	        }
	        var c = 0,
	            value = 0 >>> 0,
	            b;
	        do {
	            if (!this.noAssert && offset > this.limit) {
	                var err = Error("Truncated");
	                err['truncated'] = true;
	                throw err;
	            }
	            b = this.view[offset++];
	            if (c < 5)
	                value |= (b & 0x7f) << (7*c);
	            ++c;
	        } while ((b & 0x80) !== 0);
	        value |= 0;
	        if (relative) {
	            this.offset = offset;
	            return value;
	        }
	        return {
	            "value": value,
	            "length": c
	        };
	    };

	    /**
	     * Reads a zig-zag encoded (signed) 32bit base 128 variable-length integer.
	     * @param {number=} offset Offset to read from. Will use and increase {@link ByteBuffer#offset} by the number of bytes
	     *  written if omitted.
	     * @returns {number|!{value: number, length: number}} The value read if offset is omitted, else the value read
	     *  and the actual number of bytes read.
	     * @throws {Error} If it's not a valid varint
	     * @expose
	     */
	    ByteBufferPrototype.readVarint32ZigZag = function(offset) {
	        var val = this.readVarint32(offset);
	        if (typeof val === 'object')
	            val["value"] = ByteBuffer.zigZagDecode32(val["value"]);
	        else
	            val = ByteBuffer.zigZagDecode32(val);
	        return val;
	    };

	    // types/varints/varint64

	    if (Long) {

	        /**
	         * Maximum number of bytes required to store a 64bit base 128 variable-length integer.
	         * @type {number}
	         * @const
	         * @expose
	         */
	        ByteBuffer.MAX_VARINT64_BYTES = 10;

	        /**
	         * Calculates the actual number of bytes required to store a 64bit base 128 variable-length integer.
	         * @param {number|!Long} value Value to encode
	         * @returns {number} Number of bytes required. Capped to {@link ByteBuffer.MAX_VARINT64_BYTES}
	         * @expose
	         */
	        ByteBuffer.calculateVarint64 = function(value) {
	            if (typeof value === 'number')
	                value = Long.fromNumber(value);
	            else if (typeof value === 'string')
	                value = Long.fromString(value);
	            // ref: src/google/protobuf/io/coded_stream.cc
	            var part0 = value.toInt() >>> 0,
	                part1 = value.shiftRightUnsigned(28).toInt() >>> 0,
	                part2 = value.shiftRightUnsigned(56).toInt() >>> 0;
	            if (part2 == 0) {
	                if (part1 == 0) {
	                    if (part0 < 1 << 14)
	                        return part0 < 1 << 7 ? 1 : 2;
	                    else
	                        return part0 < 1 << 21 ? 3 : 4;
	                } else {
	                    if (part1 < 1 << 14)
	                        return part1 < 1 << 7 ? 5 : 6;
	                    else
	                        return part1 < 1 << 21 ? 7 : 8;
	                }
	            } else
	                return part2 < 1 << 7 ? 9 : 10;
	        };

	        /**
	         * Zigzag encodes a signed 64bit integer so that it can be effectively used with varint encoding.
	         * @param {number|!Long} value Signed long
	         * @returns {!Long} Unsigned zigzag encoded long
	         * @expose
	         */
	        ByteBuffer.zigZagEncode64 = function(value) {
	            if (typeof value === 'number')
	                value = Long.fromNumber(value, false);
	            else if (typeof value === 'string')
	                value = Long.fromString(value, false);
	            else if (value.unsigned !== false) value = value.toSigned();
	            // ref: src/google/protobuf/wire_format_lite.h
	            return value.shiftLeft(1).xor(value.shiftRight(63)).toUnsigned();
	        };

	        /**
	         * Decodes a zigzag encoded signed 64bit integer.
	         * @param {!Long|number} value Unsigned zigzag encoded long or JavaScript number
	         * @returns {!Long} Signed long
	         * @expose
	         */
	        ByteBuffer.zigZagDecode64 = function(value) {
	            if (typeof value === 'number')
	                value = Long.fromNumber(value, false);
	            else if (typeof value === 'string')
	                value = Long.fromString(value, false);
	            else if (value.unsigned !== false) value = value.toSigned();
	            // ref: src/google/protobuf/wire_format_lite.h
	            return value.shiftRightUnsigned(1).xor(value.and(Long.ONE).toSigned().negate()).toSigned();
	        };

	        /**
	         * Writes a 64bit base 128 variable-length integer.
	         * @param {number|Long} value Value to write
	         * @param {number=} offset Offset to write to. Will use and increase {@link ByteBuffer#offset} by the number of bytes
	         *  written if omitted.
	         * @returns {!ByteBuffer|number} `this` if offset is omitted, else the actual number of bytes written.
	         * @expose
	         */
	        ByteBufferPrototype.writeVarint64 = function(value, offset) {
	            var relative = typeof offset === 'undefined';
	            if (relative) offset = this.offset;
	            if (!this.noAssert) {
	                if (typeof value === 'number')
	                    value = Long.fromNumber(value);
	                else if (typeof value === 'string')
	                    value = Long.fromString(value);
	                else if (!(value && value instanceof Long))
	                    throw TypeError("Illegal value: "+value+" (not an integer or Long)");
	                if (typeof offset !== 'number' || offset % 1 !== 0)
	                    throw TypeError("Illegal offset: "+offset+" (not an integer)");
	                offset >>>= 0;
	                if (offset < 0 || offset + 0 > this.buffer.byteLength)
	                    throw RangeError("Illegal offset: 0 <= "+offset+" (+"+0+") <= "+this.buffer.byteLength);
	            }
	            if (typeof value === 'number')
	                value = Long.fromNumber(value, false);
	            else if (typeof value === 'string')
	                value = Long.fromString(value, false);
	            else if (value.unsigned !== false) value = value.toSigned();
	            var size = ByteBuffer.calculateVarint64(value),
	                part0 = value.toInt() >>> 0,
	                part1 = value.shiftRightUnsigned(28).toInt() >>> 0,
	                part2 = value.shiftRightUnsigned(56).toInt() >>> 0;
	            offset += size;
	            var capacity11 = this.buffer.byteLength;
	            if (offset > capacity11)
	                this.resize((capacity11 *= 2) > offset ? capacity11 : offset);
	            offset -= size;
	            switch (size) {
	                case 10: this.view[offset+9] = (part2 >>>  7) & 0x01;
	                case 9 : this.view[offset+8] = size !== 9 ? (part2       ) | 0x80 : (part2       ) & 0x7F;
	                case 8 : this.view[offset+7] = size !== 8 ? (part1 >>> 21) | 0x80 : (part1 >>> 21) & 0x7F;
	                case 7 : this.view[offset+6] = size !== 7 ? (part1 >>> 14) | 0x80 : (part1 >>> 14) & 0x7F;
	                case 6 : this.view[offset+5] = size !== 6 ? (part1 >>>  7) | 0x80 : (part1 >>>  7) & 0x7F;
	                case 5 : this.view[offset+4] = size !== 5 ? (part1       ) | 0x80 : (part1       ) & 0x7F;
	                case 4 : this.view[offset+3] = size !== 4 ? (part0 >>> 21) | 0x80 : (part0 >>> 21) & 0x7F;
	                case 3 : this.view[offset+2] = size !== 3 ? (part0 >>> 14) | 0x80 : (part0 >>> 14) & 0x7F;
	                case 2 : this.view[offset+1] = size !== 2 ? (part0 >>>  7) | 0x80 : (part0 >>>  7) & 0x7F;
	                case 1 : this.view[offset  ] = size !== 1 ? (part0       ) | 0x80 : (part0       ) & 0x7F;
	            }
	            if (relative) {
	                this.offset += size;
	                return this;
	            } else {
	                return size;
	            }
	        };

	        /**
	         * Writes a zig-zag encoded 64bit base 128 variable-length integer.
	         * @param {number|Long} value Value to write
	         * @param {number=} offset Offset to write to. Will use and increase {@link ByteBuffer#offset} by the number of bytes
	         *  written if omitted.
	         * @returns {!ByteBuffer|number} `this` if offset is omitted, else the actual number of bytes written.
	         * @expose
	         */
	        ByteBufferPrototype.writeVarint64ZigZag = function(value, offset) {
	            return this.writeVarint64(ByteBuffer.zigZagEncode64(value), offset);
	        };

	        /**
	         * Reads a 64bit base 128 variable-length integer. Requires Long.js.
	         * @param {number=} offset Offset to read from. Will use and increase {@link ByteBuffer#offset} by the number of bytes
	         *  read if omitted.
	         * @returns {!Long|!{value: Long, length: number}} The value read if offset is omitted, else the value read and
	         *  the actual number of bytes read.
	         * @throws {Error} If it's not a valid varint
	         * @expose
	         */
	        ByteBufferPrototype.readVarint64 = function(offset) {
	            var relative = typeof offset === 'undefined';
	            if (relative) offset = this.offset;
	            if (!this.noAssert) {
	                if (typeof offset !== 'number' || offset % 1 !== 0)
	                    throw TypeError("Illegal offset: "+offset+" (not an integer)");
	                offset >>>= 0;
	                if (offset < 0 || offset + 1 > this.buffer.byteLength)
	                    throw RangeError("Illegal offset: 0 <= "+offset+" (+"+1+") <= "+this.buffer.byteLength);
	            }
	            // ref: src/google/protobuf/io/coded_stream.cc
	            var start = offset,
	                part0 = 0,
	                part1 = 0,
	                part2 = 0,
	                b  = 0;
	            b = this.view[offset++]; part0  = (b & 0x7F)      ; if ( b & 0x80                                                   ) {
	            b = this.view[offset++]; part0 |= (b & 0x7F) <<  7; if ((b & 0x80) || (this.noAssert && typeof b === 'undefined')) {
	            b = this.view[offset++]; part0 |= (b & 0x7F) << 14; if ((b & 0x80) || (this.noAssert && typeof b === 'undefined')) {
	            b = this.view[offset++]; part0 |= (b & 0x7F) << 21; if ((b & 0x80) || (this.noAssert && typeof b === 'undefined')) {
	            b = this.view[offset++]; part1  = (b & 0x7F)      ; if ((b & 0x80) || (this.noAssert && typeof b === 'undefined')) {
	            b = this.view[offset++]; part1 |= (b & 0x7F) <<  7; if ((b & 0x80) || (this.noAssert && typeof b === 'undefined')) {
	            b = this.view[offset++]; part1 |= (b & 0x7F) << 14; if ((b & 0x80) || (this.noAssert && typeof b === 'undefined')) {
	            b = this.view[offset++]; part1 |= (b & 0x7F) << 21; if ((b & 0x80) || (this.noAssert && typeof b === 'undefined')) {
	            b = this.view[offset++]; part2  = (b & 0x7F)      ; if ((b & 0x80) || (this.noAssert && typeof b === 'undefined')) {
	            b = this.view[offset++]; part2 |= (b & 0x7F) <<  7; if ((b & 0x80) || (this.noAssert && typeof b === 'undefined')) {
	            throw Error("Buffer overrun"); }}}}}}}}}}
	            var value = Long.fromBits(part0 | (part1 << 28), (part1 >>> 4) | (part2) << 24, false);
	            if (relative) {
	                this.offset = offset;
	                return value;
	            } else {
	                return {
	                    'value': value,
	                    'length': offset-start
	                };
	            }
	        };

	        /**
	         * Reads a zig-zag encoded 64bit base 128 variable-length integer. Requires Long.js.
	         * @param {number=} offset Offset to read from. Will use and increase {@link ByteBuffer#offset} by the number of bytes
	         *  read if omitted.
	         * @returns {!Long|!{value: Long, length: number}} The value read if offset is omitted, else the value read and
	         *  the actual number of bytes read.
	         * @throws {Error} If it's not a valid varint
	         * @expose
	         */
	        ByteBufferPrototype.readVarint64ZigZag = function(offset) {
	            var val = this.readVarint64(offset);
	            if (val && val['value'] instanceof Long)
	                val["value"] = ByteBuffer.zigZagDecode64(val["value"]);
	            else
	                val = ByteBuffer.zigZagDecode64(val);
	            return val;
	        };

	    } // Long


	    // types/strings/cstring

	    /**
	     * Writes a NULL-terminated UTF8 encoded string. For this to work the specified string must not contain any NULL
	     *  characters itself.
	     * @param {string} str String to write
	     * @param {number=} offset Offset to write to. Will use and increase {@link ByteBuffer#offset} by the number of bytes
	     *  contained in `str` + 1 if omitted.
	     * @returns {!ByteBuffer|number} this if offset is omitted, else the actual number of bytes written
	     * @expose
	     */
	    ByteBufferPrototype.writeCString = function(str, offset) {
	        var relative = typeof offset === 'undefined';
	        if (relative) offset = this.offset;
	        var i,
	            k = str.length;
	        if (!this.noAssert) {
	            if (typeof str !== 'string')
	                throw TypeError("Illegal str: Not a string");
	            for (i=0; i<k; ++i) {
	                if (str.charCodeAt(i) === 0)
	                    throw RangeError("Illegal str: Contains NULL-characters");
	            }
	            if (typeof offset !== 'number' || offset % 1 !== 0)
	                throw TypeError("Illegal offset: "+offset+" (not an integer)");
	            offset >>>= 0;
	            if (offset < 0 || offset + 0 > this.buffer.byteLength)
	                throw RangeError("Illegal offset: 0 <= "+offset+" (+"+0+") <= "+this.buffer.byteLength);
	        }
	        // UTF8 strings do not contain zero bytes in between except for the zero character, so:
	        k = utfx.calculateUTF16asUTF8(stringSource(str))[1];
	        offset += k+1;
	        var capacity12 = this.buffer.byteLength;
	        if (offset > capacity12)
	            this.resize((capacity12 *= 2) > offset ? capacity12 : offset);
	        offset -= k+1;
	        utfx.encodeUTF16toUTF8(stringSource(str), function(b) {
	            this.view[offset++] = b;
	        }.bind(this));
	        this.view[offset++] = 0;
	        if (relative) {
	            this.offset = offset;
	            return this;
	        }
	        return k;
	    };

	    /**
	     * Reads a NULL-terminated UTF8 encoded string. For this to work the string read must not contain any NULL characters
	     *  itself.
	     * @param {number=} offset Offset to read from. Will use and increase {@link ByteBuffer#offset} by the number of bytes
	     *  read if omitted.
	     * @returns {string|!{string: string, length: number}} The string read if offset is omitted, else the string
	     *  read and the actual number of bytes read.
	     * @expose
	     */
	    ByteBufferPrototype.readCString = function(offset) {
	        var relative = typeof offset === 'undefined';
	        if (relative) offset = this.offset;
	        if (!this.noAssert) {
	            if (typeof offset !== 'number' || offset % 1 !== 0)
	                throw TypeError("Illegal offset: "+offset+" (not an integer)");
	            offset >>>= 0;
	            if (offset < 0 || offset + 1 > this.buffer.byteLength)
	                throw RangeError("Illegal offset: 0 <= "+offset+" (+"+1+") <= "+this.buffer.byteLength);
	        }
	        var start = offset,
	            temp;
	        // UTF8 strings do not contain zero bytes in between except for the zero character itself, so:
	        var sd, b = -1;
	        utfx.decodeUTF8toUTF16(function() {
	            if (b === 0) return null;
	            if (offset >= this.limit)
	                throw RangeError("Illegal range: Truncated data, "+offset+" < "+this.limit);
	            b = this.view[offset++];
	            return b === 0 ? null : b;
	        }.bind(this), sd = stringDestination(), true);
	        if (relative) {
	            this.offset = offset;
	            return sd();
	        } else {
	            return {
	                "string": sd(),
	                "length": offset - start
	            };
	        }
	    };

	    // types/strings/istring

	    /**
	     * Writes a length as uint32 prefixed UTF8 encoded string.
	     * @param {string} str String to write
	     * @param {number=} offset Offset to write to. Will use and increase {@link ByteBuffer#offset} by the number of bytes
	     *  written if omitted.
	     * @returns {!ByteBuffer|number} `this` if `offset` is omitted, else the actual number of bytes written
	     * @expose
	     * @see ByteBuffer#writeVarint32
	     */
	    ByteBufferPrototype.writeIString = function(str, offset) {
	        var relative = typeof offset === 'undefined';
	        if (relative) offset = this.offset;
	        if (!this.noAssert) {
	            if (typeof str !== 'string')
	                throw TypeError("Illegal str: Not a string");
	            if (typeof offset !== 'number' || offset % 1 !== 0)
	                throw TypeError("Illegal offset: "+offset+" (not an integer)");
	            offset >>>= 0;
	            if (offset < 0 || offset + 0 > this.buffer.byteLength)
	                throw RangeError("Illegal offset: 0 <= "+offset+" (+"+0+") <= "+this.buffer.byteLength);
	        }
	        var start = offset,
	            k;
	        k = utfx.calculateUTF16asUTF8(stringSource(str), this.noAssert)[1];
	        offset += 4+k;
	        var capacity13 = this.buffer.byteLength;
	        if (offset > capacity13)
	            this.resize((capacity13 *= 2) > offset ? capacity13 : offset);
	        offset -= 4+k;
	        if (this.littleEndian) {
	            this.view[offset+3] = (k >>> 24) & 0xFF;
	            this.view[offset+2] = (k >>> 16) & 0xFF;
	            this.view[offset+1] = (k >>>  8) & 0xFF;
	            this.view[offset  ] =  k         & 0xFF;
	        } else {
	            this.view[offset  ] = (k >>> 24) & 0xFF;
	            this.view[offset+1] = (k >>> 16) & 0xFF;
	            this.view[offset+2] = (k >>>  8) & 0xFF;
	            this.view[offset+3] =  k         & 0xFF;
	        }
	        offset += 4;
	        utfx.encodeUTF16toUTF8(stringSource(str), function(b) {
	            this.view[offset++] = b;
	        }.bind(this));
	        if (offset !== start + 4 + k)
	            throw RangeError("Illegal range: Truncated data, "+offset+" == "+(offset+4+k));
	        if (relative) {
	            this.offset = offset;
	            return this;
	        }
	        return offset - start;
	    };

	    /**
	     * Reads a length as uint32 prefixed UTF8 encoded string.
	     * @param {number=} offset Offset to read from. Will use and increase {@link ByteBuffer#offset} by the number of bytes
	     *  read if omitted.
	     * @returns {string|!{string: string, length: number}} The string read if offset is omitted, else the string
	     *  read and the actual number of bytes read.
	     * @expose
	     * @see ByteBuffer#readVarint32
	     */
	    ByteBufferPrototype.readIString = function(offset) {
	        var relative = typeof offset === 'undefined';
	        if (relative) offset = this.offset;
	        if (!this.noAssert) {
	            if (typeof offset !== 'number' || offset % 1 !== 0)
	                throw TypeError("Illegal offset: "+offset+" (not an integer)");
	            offset >>>= 0;
	            if (offset < 0 || offset + 4 > this.buffer.byteLength)
	                throw RangeError("Illegal offset: 0 <= "+offset+" (+"+4+") <= "+this.buffer.byteLength);
	        }
	        var start = offset;
	        var len = this.readUint32(offset);
	        var str = this.readUTF8String(len, ByteBuffer.METRICS_BYTES, offset += 4);
	        offset += str['length'];
	        if (relative) {
	            this.offset = offset;
	            return str['string'];
	        } else {
	            return {
	                'string': str['string'],
	                'length': offset - start
	            };
	        }
	    };

	    // types/strings/utf8string

	    /**
	     * Metrics representing number of UTF8 characters. Evaluates to `c`.
	     * @type {string}
	     * @const
	     * @expose
	     */
	    ByteBuffer.METRICS_CHARS = 'c';

	    /**
	     * Metrics representing number of bytes. Evaluates to `b`.
	     * @type {string}
	     * @const
	     * @expose
	     */
	    ByteBuffer.METRICS_BYTES = 'b';

	    /**
	     * Writes an UTF8 encoded string.
	     * @param {string} str String to write
	     * @param {number=} offset Offset to write to. Will use and increase {@link ByteBuffer#offset} if omitted.
	     * @returns {!ByteBuffer|number} this if offset is omitted, else the actual number of bytes written.
	     * @expose
	     */
	    ByteBufferPrototype.writeUTF8String = function(str, offset) {
	        var relative = typeof offset === 'undefined';
	        if (relative) offset = this.offset;
	        if (!this.noAssert) {
	            if (typeof offset !== 'number' || offset % 1 !== 0)
	                throw TypeError("Illegal offset: "+offset+" (not an integer)");
	            offset >>>= 0;
	            if (offset < 0 || offset + 0 > this.buffer.byteLength)
	                throw RangeError("Illegal offset: 0 <= "+offset+" (+"+0+") <= "+this.buffer.byteLength);
	        }
	        var k;
	        var start = offset;
	        k = utfx.calculateUTF16asUTF8(stringSource(str))[1];
	        offset += k;
	        var capacity14 = this.buffer.byteLength;
	        if (offset > capacity14)
	            this.resize((capacity14 *= 2) > offset ? capacity14 : offset);
	        offset -= k;
	        utfx.encodeUTF16toUTF8(stringSource(str), function(b) {
	            this.view[offset++] = b;
	        }.bind(this));
	        if (relative) {
	            this.offset = offset;
	            return this;
	        }
	        return offset - start;
	    };

	    /**
	     * Writes an UTF8 encoded string. This is an alias of {@link ByteBuffer#writeUTF8String}.
	     * @function
	     * @param {string} str String to write
	     * @param {number=} offset Offset to write to. Will use and increase {@link ByteBuffer#offset} if omitted.
	     * @returns {!ByteBuffer|number} this if offset is omitted, else the actual number of bytes written.
	     * @expose
	     */
	    ByteBufferPrototype.writeString = ByteBufferPrototype.writeUTF8String;

	    /**
	     * Calculates the number of UTF8 characters of a string. JavaScript itself uses UTF-16, so that a string's
	     *  `length` property does not reflect its actual UTF8 size if it contains code points larger than 0xFFFF.
	     * @param {string} str String to calculate
	     * @returns {number} Number of UTF8 characters
	     * @expose
	     */
	    ByteBuffer.calculateUTF8Chars = function(str) {
	        return utfx.calculateUTF16asUTF8(stringSource(str))[0];
	    };

	    /**
	     * Calculates the number of UTF8 bytes of a string.
	     * @param {string} str String to calculate
	     * @returns {number} Number of UTF8 bytes
	     * @expose
	     */
	    ByteBuffer.calculateUTF8Bytes = function(str) {
	        return utfx.calculateUTF16asUTF8(stringSource(str))[1];
	    };

	    /**
	     * Calculates the number of UTF8 bytes of a string. This is an alias of {@link ByteBuffer.calculateUTF8Bytes}.
	     * @function
	     * @param {string} str String to calculate
	     * @returns {number} Number of UTF8 bytes
	     * @expose
	     */
	    ByteBuffer.calculateString = ByteBuffer.calculateUTF8Bytes;

	    /**
	     * Reads an UTF8 encoded string.
	     * @param {number} length Number of characters or bytes to read.
	     * @param {string=} metrics Metrics specifying what `length` is meant to count. Defaults to
	     *  {@link ByteBuffer.METRICS_CHARS}.
	     * @param {number=} offset Offset to read from. Will use and increase {@link ByteBuffer#offset} by the number of bytes
	     *  read if omitted.
	     * @returns {string|!{string: string, length: number}} The string read if offset is omitted, else the string
	     *  read and the actual number of bytes read.
	     * @expose
	     */
	    ByteBufferPrototype.readUTF8String = function(length, metrics, offset) {
	        if (typeof metrics === 'number') {
	            offset = metrics;
	            metrics = undefined;
	        }
	        var relative = typeof offset === 'undefined';
	        if (relative) offset = this.offset;
	        if (typeof metrics === 'undefined') metrics = ByteBuffer.METRICS_CHARS;
	        if (!this.noAssert) {
	            if (typeof length !== 'number' || length % 1 !== 0)
	                throw TypeError("Illegal length: "+length+" (not an integer)");
	            length |= 0;
	            if (typeof offset !== 'number' || offset % 1 !== 0)
	                throw TypeError("Illegal offset: "+offset+" (not an integer)");
	            offset >>>= 0;
	            if (offset < 0 || offset + 0 > this.buffer.byteLength)
	                throw RangeError("Illegal offset: 0 <= "+offset+" (+"+0+") <= "+this.buffer.byteLength);
	        }
	        var i = 0,
	            start = offset,
	            sd;
	        if (metrics === ByteBuffer.METRICS_CHARS) { // The same for node and the browser
	            sd = stringDestination();
	            utfx.decodeUTF8(function() {
	                return i < length && offset < this.limit ? this.view[offset++] : null;
	            }.bind(this), function(cp) {
	                ++i; utfx.UTF8toUTF16(cp, sd);
	            });
	            if (i !== length)
	                throw RangeError("Illegal range: Truncated data, "+i+" == "+length);
	            if (relative) {
	                this.offset = offset;
	                return sd();
	            } else {
	                return {
	                    "string": sd(),
	                    "length": offset - start
	                };
	            }
	        } else if (metrics === ByteBuffer.METRICS_BYTES) {
	            if (!this.noAssert) {
	                if (typeof offset !== 'number' || offset % 1 !== 0)
	                    throw TypeError("Illegal offset: "+offset+" (not an integer)");
	                offset >>>= 0;
	                if (offset < 0 || offset + length > this.buffer.byteLength)
	                    throw RangeError("Illegal offset: 0 <= "+offset+" (+"+length+") <= "+this.buffer.byteLength);
	            }
	            var k = offset + length;
	            utfx.decodeUTF8toUTF16(function() {
	                return offset < k ? this.view[offset++] : null;
	            }.bind(this), sd = stringDestination(), this.noAssert);
	            if (offset !== k)
	                throw RangeError("Illegal range: Truncated data, "+offset+" == "+k);
	            if (relative) {
	                this.offset = offset;
	                return sd();
	            } else {
	                return {
	                    'string': sd(),
	                    'length': offset - start
	                };
	            }
	        } else
	            throw TypeError("Unsupported metrics: "+metrics);
	    };

	    /**
	     * Reads an UTF8 encoded string. This is an alias of {@link ByteBuffer#readUTF8String}.
	     * @function
	     * @param {number} length Number of characters or bytes to read
	     * @param {number=} metrics Metrics specifying what `n` is meant to count. Defaults to
	     *  {@link ByteBuffer.METRICS_CHARS}.
	     * @param {number=} offset Offset to read from. Will use and increase {@link ByteBuffer#offset} by the number of bytes
	     *  read if omitted.
	     * @returns {string|!{string: string, length: number}} The string read if offset is omitted, else the string
	     *  read and the actual number of bytes read.
	     * @expose
	     */
	    ByteBufferPrototype.readString = ByteBufferPrototype.readUTF8String;

	    // types/strings/vstring

	    /**
	     * Writes a length as varint32 prefixed UTF8 encoded string.
	     * @param {string} str String to write
	     * @param {number=} offset Offset to write to. Will use and increase {@link ByteBuffer#offset} by the number of bytes
	     *  written if omitted.
	     * @returns {!ByteBuffer|number} `this` if `offset` is omitted, else the actual number of bytes written
	     * @expose
	     * @see ByteBuffer#writeVarint32
	     */
	    ByteBufferPrototype.writeVString = function(str, offset) {
	        var relative = typeof offset === 'undefined';
	        if (relative) offset = this.offset;
	        if (!this.noAssert) {
	            if (typeof str !== 'string')
	                throw TypeError("Illegal str: Not a string");
	            if (typeof offset !== 'number' || offset % 1 !== 0)
	                throw TypeError("Illegal offset: "+offset+" (not an integer)");
	            offset >>>= 0;
	            if (offset < 0 || offset + 0 > this.buffer.byteLength)
	                throw RangeError("Illegal offset: 0 <= "+offset+" (+"+0+") <= "+this.buffer.byteLength);
	        }
	        var start = offset,
	            k, l;
	        k = utfx.calculateUTF16asUTF8(stringSource(str), this.noAssert)[1];
	        l = ByteBuffer.calculateVarint32(k);
	        offset += l+k;
	        var capacity15 = this.buffer.byteLength;
	        if (offset > capacity15)
	            this.resize((capacity15 *= 2) > offset ? capacity15 : offset);
	        offset -= l+k;
	        offset += this.writeVarint32(k, offset);
	        utfx.encodeUTF16toUTF8(stringSource(str), function(b) {
	            this.view[offset++] = b;
	        }.bind(this));
	        if (offset !== start+k+l)
	            throw RangeError("Illegal range: Truncated data, "+offset+" == "+(offset+k+l));
	        if (relative) {
	            this.offset = offset;
	            return this;
	        }
	        return offset - start;
	    };

	    /**
	     * Reads a length as varint32 prefixed UTF8 encoded string.
	     * @param {number=} offset Offset to read from. Will use and increase {@link ByteBuffer#offset} by the number of bytes
	     *  read if omitted.
	     * @returns {string|!{string: string, length: number}} The string read if offset is omitted, else the string
	     *  read and the actual number of bytes read.
	     * @expose
	     * @see ByteBuffer#readVarint32
	     */
	    ByteBufferPrototype.readVString = function(offset) {
	        var relative = typeof offset === 'undefined';
	        if (relative) offset = this.offset;
	        if (!this.noAssert) {
	            if (typeof offset !== 'number' || offset % 1 !== 0)
	                throw TypeError("Illegal offset: "+offset+" (not an integer)");
	            offset >>>= 0;
	            if (offset < 0 || offset + 1 > this.buffer.byteLength)
	                throw RangeError("Illegal offset: 0 <= "+offset+" (+"+1+") <= "+this.buffer.byteLength);
	        }
	        var start = offset;
	        var len = this.readVarint32(offset);
	        var str = this.readUTF8String(len['value'], ByteBuffer.METRICS_BYTES, offset += len['length']);
	        offset += str['length'];
	        if (relative) {
	            this.offset = offset;
	            return str['string'];
	        } else {
	            return {
	                'string': str['string'],
	                'length': offset - start
	            };
	        }
	    };


	    /**
	     * Appends some data to this ByteBuffer. This will overwrite any contents behind the specified offset up to the appended
	     *  data's length.
	     * @param {!ByteBuffer|!ArrayBuffer|!Uint8Array|string} source Data to append. If `source` is a ByteBuffer, its offsets
	     *  will be modified according to the performed read operation.
	     * @param {(string|number)=} encoding Encoding if `data` is a string ("base64", "hex", "binary", defaults to "utf8")
	     * @param {number=} offset Offset to append at. Will use and increase {@link ByteBuffer#offset} by the number of bytes
	     *  written if omitted.
	     * @returns {!ByteBuffer} this
	     * @expose
	     * @example A relative `<01 02>03.append(<04 05>)` will result in `<01 02 04 05>, 04 05|`
	     * @example An absolute `<01 02>03.append(04 05>, 1)` will result in `<01 04>05, 04 05|`
	     */
	    ByteBufferPrototype.append = function(source, encoding, offset) {
	        if (typeof encoding === 'number' || typeof encoding !== 'string') {
	            offset = encoding;
	            encoding = undefined;
	        }
	        var relative = typeof offset === 'undefined';
	        if (relative) offset = this.offset;
	        if (!this.noAssert) {
	            if (typeof offset !== 'number' || offset % 1 !== 0)
	                throw TypeError("Illegal offset: "+offset+" (not an integer)");
	            offset >>>= 0;
	            if (offset < 0 || offset + 0 > this.buffer.byteLength)
	                throw RangeError("Illegal offset: 0 <= "+offset+" (+"+0+") <= "+this.buffer.byteLength);
	        }
	        if (!(source instanceof ByteBuffer))
	            source = ByteBuffer.wrap(source, encoding);
	        var length = source.limit - source.offset;
	        if (length <= 0) return this; // Nothing to append
	        offset += length;
	        var capacity16 = this.buffer.byteLength;
	        if (offset > capacity16)
	            this.resize((capacity16 *= 2) > offset ? capacity16 : offset);
	        offset -= length;
	        this.view.set(source.view.subarray(source.offset, source.limit), offset);
	        source.offset += length;
	        if (relative) this.offset += length;
	        return this;
	    };

	    /**
	     * Appends this ByteBuffer's contents to another ByteBuffer. This will overwrite any contents at and after the
	        specified offset up to the length of this ByteBuffer's data.
	     * @param {!ByteBuffer} target Target ByteBuffer
	     * @param {number=} offset Offset to append to. Will use and increase {@link ByteBuffer#offset} by the number of bytes
	     *  read if omitted.
	     * @returns {!ByteBuffer} this
	     * @expose
	     * @see ByteBuffer#append
	     */
	    ByteBufferPrototype.appendTo = function(target, offset) {
	        target.append(this, offset);
	        return this;
	    };

	    /**
	     * Enables or disables assertions of argument types and offsets. Assertions are enabled by default but you can opt to
	     *  disable them if your code already makes sure that everything is valid.
	     * @param {boolean} assert `true` to enable assertions, otherwise `false`
	     * @returns {!ByteBuffer} this
	     * @expose
	     */
	    ByteBufferPrototype.assert = function(assert) {
	        this.noAssert = !assert;
	        return this;
	    };

	    /**
	     * Gets the capacity of this ByteBuffer's backing buffer.
	     * @returns {number} Capacity of the backing buffer
	     * @expose
	     */
	    ByteBufferPrototype.capacity = function() {
	        return this.buffer.byteLength;
	    };
	    /**
	     * Clears this ByteBuffer's offsets by setting {@link ByteBuffer#offset} to `0` and {@link ByteBuffer#limit} to the
	     *  backing buffer's capacity. Discards {@link ByteBuffer#markedOffset}.
	     * @returns {!ByteBuffer} this
	     * @expose
	     */
	    ByteBufferPrototype.clear = function() {
	        this.offset = 0;
	        this.limit = this.buffer.byteLength;
	        this.markedOffset = -1;
	        return this;
	    };

	    /**
	     * Creates a cloned instance of this ByteBuffer, preset with this ByteBuffer's values for {@link ByteBuffer#offset},
	     *  {@link ByteBuffer#markedOffset} and {@link ByteBuffer#limit}.
	     * @param {boolean=} copy Whether to copy the backing buffer or to return another view on the same, defaults to `false`
	     * @returns {!ByteBuffer} Cloned instance
	     * @expose
	     */
	    ByteBufferPrototype.clone = function(copy) {
	        var bb = new ByteBuffer(0, this.littleEndian, this.noAssert);
	        if (copy) {
	            bb.buffer = new ArrayBuffer(this.buffer.byteLength);
	            bb.view = new Uint8Array(bb.buffer);
	        } else {
	            bb.buffer = this.buffer;
	            bb.view = this.view;
	        }
	        bb.offset = this.offset;
	        bb.markedOffset = this.markedOffset;
	        bb.limit = this.limit;
	        return bb;
	    };

	    /**
	     * Compacts this ByteBuffer to be backed by a {@link ByteBuffer#buffer} of its contents' length. Contents are the bytes
	     *  between {@link ByteBuffer#offset} and {@link ByteBuffer#limit}. Will set `offset = 0` and `limit = capacity` and
	     *  adapt {@link ByteBuffer#markedOffset} to the same relative position if set.
	     * @param {number=} begin Offset to start at, defaults to {@link ByteBuffer#offset}
	     * @param {number=} end Offset to end at, defaults to {@link ByteBuffer#limit}
	     * @returns {!ByteBuffer} this
	     * @expose
	     */
	    ByteBufferPrototype.compact = function(begin, end) {
	        if (typeof begin === 'undefined') begin = this.offset;
	        if (typeof end === 'undefined') end = this.limit;
	        if (!this.noAssert) {
	            if (typeof begin !== 'number' || begin % 1 !== 0)
	                throw TypeError("Illegal begin: Not an integer");
	            begin >>>= 0;
	            if (typeof end !== 'number' || end % 1 !== 0)
	                throw TypeError("Illegal end: Not an integer");
	            end >>>= 0;
	            if (begin < 0 || begin > end || end > this.buffer.byteLength)
	                throw RangeError("Illegal range: 0 <= "+begin+" <= "+end+" <= "+this.buffer.byteLength);
	        }
	        if (begin === 0 && end === this.buffer.byteLength)
	            return this; // Already compacted
	        var len = end - begin;
	        if (len === 0) {
	            this.buffer = EMPTY_BUFFER;
	            this.view = null;
	            if (this.markedOffset >= 0) this.markedOffset -= begin;
	            this.offset = 0;
	            this.limit = 0;
	            return this;
	        }
	        var buffer = new ArrayBuffer(len);
	        var view = new Uint8Array(buffer);
	        view.set(this.view.subarray(begin, end));
	        this.buffer = buffer;
	        this.view = view;
	        if (this.markedOffset >= 0) this.markedOffset -= begin;
	        this.offset = 0;
	        this.limit = len;
	        return this;
	    };

	    /**
	     * Creates a copy of this ByteBuffer's contents. Contents are the bytes between {@link ByteBuffer#offset} and
	     *  {@link ByteBuffer#limit}.
	     * @param {number=} begin Begin offset, defaults to {@link ByteBuffer#offset}.
	     * @param {number=} end End offset, defaults to {@link ByteBuffer#limit}.
	     * @returns {!ByteBuffer} Copy
	     * @expose
	     */
	    ByteBufferPrototype.copy = function(begin, end) {
	        if (typeof begin === 'undefined') begin = this.offset;
	        if (typeof end === 'undefined') end = this.limit;
	        if (!this.noAssert) {
	            if (typeof begin !== 'number' || begin % 1 !== 0)
	                throw TypeError("Illegal begin: Not an integer");
	            begin >>>= 0;
	            if (typeof end !== 'number' || end % 1 !== 0)
	                throw TypeError("Illegal end: Not an integer");
	            end >>>= 0;
	            if (begin < 0 || begin > end || end > this.buffer.byteLength)
	                throw RangeError("Illegal range: 0 <= "+begin+" <= "+end+" <= "+this.buffer.byteLength);
	        }
	        if (begin === end)
	            return new ByteBuffer(0, this.littleEndian, this.noAssert);
	        var capacity = end - begin,
	            bb = new ByteBuffer(capacity, this.littleEndian, this.noAssert);
	        bb.offset = 0;
	        bb.limit = capacity;
	        if (bb.markedOffset >= 0) bb.markedOffset -= begin;
	        this.copyTo(bb, 0, begin, end);
	        return bb;
	    };

	    /**
	     * Copies this ByteBuffer's contents to another ByteBuffer. Contents are the bytes between {@link ByteBuffer#offset} and
	     *  {@link ByteBuffer#limit}.
	     * @param {!ByteBuffer} target Target ByteBuffer
	     * @param {number=} targetOffset Offset to copy to. Will use and increase the target's {@link ByteBuffer#offset}
	     *  by the number of bytes copied if omitted.
	     * @param {number=} sourceOffset Offset to start copying from. Will use and increase {@link ByteBuffer#offset} by the
	     *  number of bytes copied if omitted.
	     * @param {number=} sourceLimit Offset to end copying from, defaults to {@link ByteBuffer#limit}
	     * @returns {!ByteBuffer} this
	     * @expose
	     */
	    ByteBufferPrototype.copyTo = function(target, targetOffset, sourceOffset, sourceLimit) {
	        var relative,
	            targetRelative;
	        if (!this.noAssert) {
	            if (!ByteBuffer.isByteBuffer(target))
	                throw TypeError("Illegal target: Not a ByteBuffer");
	        }
	        targetOffset = (targetRelative = typeof targetOffset === 'undefined') ? target.offset : targetOffset | 0;
	        sourceOffset = (relative = typeof sourceOffset === 'undefined') ? this.offset : sourceOffset | 0;
	        sourceLimit = typeof sourceLimit === 'undefined' ? this.limit : sourceLimit | 0;

	        if (targetOffset < 0 || targetOffset > target.buffer.byteLength)
	            throw RangeError("Illegal target range: 0 <= "+targetOffset+" <= "+target.buffer.byteLength);
	        if (sourceOffset < 0 || sourceLimit > this.buffer.byteLength)
	            throw RangeError("Illegal source range: 0 <= "+sourceOffset+" <= "+this.buffer.byteLength);

	        var len = sourceLimit - sourceOffset;
	        if (len === 0)
	            return target; // Nothing to copy

	        target.ensureCapacity(targetOffset + len);

	        target.view.set(this.view.subarray(sourceOffset, sourceLimit), targetOffset);

	        if (relative) this.offset += len;
	        if (targetRelative) target.offset += len;

	        return this;
	    };

	    /**
	     * Makes sure that this ByteBuffer is backed by a {@link ByteBuffer#buffer} of at least the specified capacity. If the
	     *  current capacity is exceeded, it will be doubled. If double the current capacity is less than the required capacity,
	     *  the required capacity will be used instead.
	     * @param {number} capacity Required capacity
	     * @returns {!ByteBuffer} this
	     * @expose
	     */
	    ByteBufferPrototype.ensureCapacity = function(capacity) {
	        var current = this.buffer.byteLength;
	        if (current < capacity)
	            return this.resize((current *= 2) > capacity ? current : capacity);
	        return this;
	    };

	    /**
	     * Overwrites this ByteBuffer's contents with the specified value. Contents are the bytes between
	     *  {@link ByteBuffer#offset} and {@link ByteBuffer#limit}.
	     * @param {number|string} value Byte value to fill with. If given as a string, the first character is used.
	     * @param {number=} begin Begin offset. Will use and increase {@link ByteBuffer#offset} by the number of bytes
	     *  written if omitted. defaults to {@link ByteBuffer#offset}.
	     * @param {number=} end End offset, defaults to {@link ByteBuffer#limit}.
	     * @returns {!ByteBuffer} this
	     * @expose
	     * @example `someByteBuffer.clear().fill(0)` fills the entire backing buffer with zeroes
	     */
	    ByteBufferPrototype.fill = function(value, begin, end) {
	        var relative = typeof begin === 'undefined';
	        if (relative) begin = this.offset;
	        if (typeof value === 'string' && value.length > 0)
	            value = value.charCodeAt(0);
	        if (typeof begin === 'undefined') begin = this.offset;
	        if (typeof end === 'undefined') end = this.limit;
	        if (!this.noAssert) {
	            if (typeof value !== 'number' || value % 1 !== 0)
	                throw TypeError("Illegal value: "+value+" (not an integer)");
	            value |= 0;
	            if (typeof begin !== 'number' || begin % 1 !== 0)
	                throw TypeError("Illegal begin: Not an integer");
	            begin >>>= 0;
	            if (typeof end !== 'number' || end % 1 !== 0)
	                throw TypeError("Illegal end: Not an integer");
	            end >>>= 0;
	            if (begin < 0 || begin > end || end > this.buffer.byteLength)
	                throw RangeError("Illegal range: 0 <= "+begin+" <= "+end+" <= "+this.buffer.byteLength);
	        }
	        if (begin >= end)
	            return this; // Nothing to fill
	        while (begin < end) this.view[begin++] = value;
	        if (relative) this.offset = begin;
	        return this;
	    };

	    /**
	     * Makes this ByteBuffer ready for a new sequence of write or relative read operations. Sets `limit = offset` and
	     *  `offset = 0`. Make sure always to flip a ByteBuffer when all relative read or write operations are complete.
	     * @returns {!ByteBuffer} this
	     * @expose
	     */
	    ByteBufferPrototype.flip = function() {
	        this.limit = this.offset;
	        this.offset = 0;
	        return this;
	    };
	    /**
	     * Marks an offset on this ByteBuffer to be used later.
	     * @param {number=} offset Offset to mark. Defaults to {@link ByteBuffer#offset}.
	     * @returns {!ByteBuffer} this
	     * @throws {TypeError} If `offset` is not a valid number
	     * @throws {RangeError} If `offset` is out of bounds
	     * @see ByteBuffer#reset
	     * @expose
	     */
	    ByteBufferPrototype.mark = function(offset) {
	        offset = typeof offset === 'undefined' ? this.offset : offset;
	        if (!this.noAssert) {
	            if (typeof offset !== 'number' || offset % 1 !== 0)
	                throw TypeError("Illegal offset: "+offset+" (not an integer)");
	            offset >>>= 0;
	            if (offset < 0 || offset + 0 > this.buffer.byteLength)
	                throw RangeError("Illegal offset: 0 <= "+offset+" (+"+0+") <= "+this.buffer.byteLength);
	        }
	        this.markedOffset = offset;
	        return this;
	    };
	    /**
	     * Sets the byte order.
	     * @param {boolean} littleEndian `true` for little endian byte order, `false` for big endian
	     * @returns {!ByteBuffer} this
	     * @expose
	     */
	    ByteBufferPrototype.order = function(littleEndian) {
	        if (!this.noAssert) {
	            if (typeof littleEndian !== 'boolean')
	                throw TypeError("Illegal littleEndian: Not a boolean");
	        }
	        this.littleEndian = !!littleEndian;
	        return this;
	    };

	    /**
	     * Switches (to) little endian byte order.
	     * @param {boolean=} littleEndian Defaults to `true`, otherwise uses big endian
	     * @returns {!ByteBuffer} this
	     * @expose
	     */
	    ByteBufferPrototype.LE = function(littleEndian) {
	        this.littleEndian = typeof littleEndian !== 'undefined' ? !!littleEndian : true;
	        return this;
	    };

	    /**
	     * Switches (to) big endian byte order.
	     * @param {boolean=} bigEndian Defaults to `true`, otherwise uses little endian
	     * @returns {!ByteBuffer} this
	     * @expose
	     */
	    ByteBufferPrototype.BE = function(bigEndian) {
	        this.littleEndian = typeof bigEndian !== 'undefined' ? !bigEndian : false;
	        return this;
	    };
	    /**
	     * Prepends some data to this ByteBuffer. This will overwrite any contents before the specified offset up to the
	     *  prepended data's length. If there is not enough space available before the specified `offset`, the backing buffer
	     *  will be resized and its contents moved accordingly.
	     * @param {!ByteBuffer|string|!ArrayBuffer} source Data to prepend. If `source` is a ByteBuffer, its offset will be
	     *  modified according to the performed read operation.
	     * @param {(string|number)=} encoding Encoding if `data` is a string ("base64", "hex", "binary", defaults to "utf8")
	     * @param {number=} offset Offset to prepend at. Will use and decrease {@link ByteBuffer#offset} by the number of bytes
	     *  prepended if omitted.
	     * @returns {!ByteBuffer} this
	     * @expose
	     * @example A relative `00<01 02 03>.prepend(<04 05>)` results in `<04 05 01 02 03>, 04 05|`
	     * @example An absolute `00<01 02 03>.prepend(<04 05>, 2)` results in `04<05 02 03>, 04 05|`
	     */
	    ByteBufferPrototype.prepend = function(source, encoding, offset) {
	        if (typeof encoding === 'number' || typeof encoding !== 'string') {
	            offset = encoding;
	            encoding = undefined;
	        }
	        var relative = typeof offset === 'undefined';
	        if (relative) offset = this.offset;
	        if (!this.noAssert) {
	            if (typeof offset !== 'number' || offset % 1 !== 0)
	                throw TypeError("Illegal offset: "+offset+" (not an integer)");
	            offset >>>= 0;
	            if (offset < 0 || offset + 0 > this.buffer.byteLength)
	                throw RangeError("Illegal offset: 0 <= "+offset+" (+"+0+") <= "+this.buffer.byteLength);
	        }
	        if (!(source instanceof ByteBuffer))
	            source = ByteBuffer.wrap(source, encoding);
	        var len = source.limit - source.offset;
	        if (len <= 0) return this; // Nothing to prepend
	        var diff = len - offset;
	        if (diff > 0) { // Not enough space before offset, so resize + move
	            var buffer = new ArrayBuffer(this.buffer.byteLength + diff);
	            var view = new Uint8Array(buffer);
	            view.set(this.view.subarray(offset, this.buffer.byteLength), len);
	            this.buffer = buffer;
	            this.view = view;
	            this.offset += diff;
	            if (this.markedOffset >= 0) this.markedOffset += diff;
	            this.limit += diff;
	            offset += diff;
	        } else {
	            var arrayView = new Uint8Array(this.buffer);
	        }
	        this.view.set(source.view.subarray(source.offset, source.limit), offset - len);

	        source.offset = source.limit;
	        if (relative)
	            this.offset -= len;
	        return this;
	    };

	    /**
	     * Prepends this ByteBuffer to another ByteBuffer. This will overwrite any contents before the specified offset up to the
	     *  prepended data's length. If there is not enough space available before the specified `offset`, the backing buffer
	     *  will be resized and its contents moved accordingly.
	     * @param {!ByteBuffer} target Target ByteBuffer
	     * @param {number=} offset Offset to prepend at. Will use and decrease {@link ByteBuffer#offset} by the number of bytes
	     *  prepended if omitted.
	     * @returns {!ByteBuffer} this
	     * @expose
	     * @see ByteBuffer#prepend
	     */
	    ByteBufferPrototype.prependTo = function(target, offset) {
	        target.prepend(this, offset);
	        return this;
	    };
	    /**
	     * Prints debug information about this ByteBuffer's contents.
	     * @param {function(string)=} out Output function to call, defaults to console.log
	     * @expose
	     */
	    ByteBufferPrototype.printDebug = function(out) {
	        if (typeof out !== 'function') out = console.log.bind(console);
	        out(
	            this.toString()+"\n"+
	            "-------------------------------------------------------------------\n"+
	            this.toDebug(/* columns */ true)
	        );
	    };

	    /**
	     * Gets the number of remaining readable bytes. Contents are the bytes between {@link ByteBuffer#offset} and
	     *  {@link ByteBuffer#limit}, so this returns `limit - offset`.
	     * @returns {number} Remaining readable bytes. May be negative if `offset > limit`.
	     * @expose
	     */
	    ByteBufferPrototype.remaining = function() {
	        return this.limit - this.offset;
	    };
	    /**
	     * Resets this ByteBuffer's {@link ByteBuffer#offset}. If an offset has been marked through {@link ByteBuffer#mark}
	     *  before, `offset` will be set to {@link ByteBuffer#markedOffset}, which will then be discarded. If no offset has been
	     *  marked, sets `offset = 0`.
	     * @returns {!ByteBuffer} this
	     * @see ByteBuffer#mark
	     * @expose
	     */
	    ByteBufferPrototype.reset = function() {
	        if (this.markedOffset >= 0) {
	            this.offset = this.markedOffset;
	            this.markedOffset = -1;
	        } else {
	            this.offset = 0;
	        }
	        return this;
	    };
	    /**
	     * Resizes this ByteBuffer to be backed by a buffer of at least the given capacity. Will do nothing if already that
	     *  large or larger.
	     * @param {number} capacity Capacity required
	     * @returns {!ByteBuffer} this
	     * @throws {TypeError} If `capacity` is not a number
	     * @throws {RangeError} If `capacity < 0`
	     * @expose
	     */
	    ByteBufferPrototype.resize = function(capacity) {
	        if (!this.noAssert) {
	            if (typeof capacity !== 'number' || capacity % 1 !== 0)
	                throw TypeError("Illegal capacity: "+capacity+" (not an integer)");
	            capacity |= 0;
	            if (capacity < 0)
	                throw RangeError("Illegal capacity: 0 <= "+capacity);
	        }
	        if (this.buffer.byteLength < capacity) {
	            var buffer = new ArrayBuffer(capacity);
	            var view = new Uint8Array(buffer);
	            view.set(this.view);
	            this.buffer = buffer;
	            this.view = view;
	        }
	        return this;
	    };
	    /**
	     * Reverses this ByteBuffer's contents.
	     * @param {number=} begin Offset to start at, defaults to {@link ByteBuffer#offset}
	     * @param {number=} end Offset to end at, defaults to {@link ByteBuffer#limit}
	     * @returns {!ByteBuffer} this
	     * @expose
	     */
	    ByteBufferPrototype.reverse = function(begin, end) {
	        if (typeof begin === 'undefined') begin = this.offset;
	        if (typeof end === 'undefined') end = this.limit;
	        if (!this.noAssert) {
	            if (typeof begin !== 'number' || begin % 1 !== 0)
	                throw TypeError("Illegal begin: Not an integer");
	            begin >>>= 0;
	            if (typeof end !== 'number' || end % 1 !== 0)
	                throw TypeError("Illegal end: Not an integer");
	            end >>>= 0;
	            if (begin < 0 || begin > end || end > this.buffer.byteLength)
	                throw RangeError("Illegal range: 0 <= "+begin+" <= "+end+" <= "+this.buffer.byteLength);
	        }
	        if (begin === end)
	            return this; // Nothing to reverse
	        Array.prototype.reverse.call(this.view.subarray(begin, end));
	        return this;
	    };
	    /**
	     * Skips the next `length` bytes. This will just advance
	     * @param {number} length Number of bytes to skip. May also be negative to move the offset back.
	     * @returns {!ByteBuffer} this
	     * @expose
	     */
	    ByteBufferPrototype.skip = function(length) {
	        if (!this.noAssert) {
	            if (typeof length !== 'number' || length % 1 !== 0)
	                throw TypeError("Illegal length: "+length+" (not an integer)");
	            length |= 0;
	        }
	        var offset = this.offset + length;
	        if (!this.noAssert) {
	            if (offset < 0 || offset > this.buffer.byteLength)
	                throw RangeError("Illegal length: 0 <= "+this.offset+" + "+length+" <= "+this.buffer.byteLength);
	        }
	        this.offset = offset;
	        return this;
	    };

	    /**
	     * Slices this ByteBuffer by creating a cloned instance with `offset = begin` and `limit = end`.
	     * @param {number=} begin Begin offset, defaults to {@link ByteBuffer#offset}.
	     * @param {number=} end End offset, defaults to {@link ByteBuffer#limit}.
	     * @returns {!ByteBuffer} Clone of this ByteBuffer with slicing applied, backed by the same {@link ByteBuffer#buffer}
	     * @expose
	     */
	    ByteBufferPrototype.slice = function(begin, end) {
	        if (typeof begin === 'undefined') begin = this.offset;
	        if (typeof end === 'undefined') end = this.limit;
	        if (!this.noAssert) {
	            if (typeof begin !== 'number' || begin % 1 !== 0)
	                throw TypeError("Illegal begin: Not an integer");
	            begin >>>= 0;
	            if (typeof end !== 'number' || end % 1 !== 0)
	                throw TypeError("Illegal end: Not an integer");
	            end >>>= 0;
	            if (begin < 0 || begin > end || end > this.buffer.byteLength)
	                throw RangeError("Illegal range: 0 <= "+begin+" <= "+end+" <= "+this.buffer.byteLength);
	        }
	        var bb = this.clone();
	        bb.offset = begin;
	        bb.limit = end;
	        return bb;
	    };
	    /**
	     * Returns a copy of the backing buffer that contains this ByteBuffer's contents. Contents are the bytes between
	     *  {@link ByteBuffer#offset} and {@link ByteBuffer#limit}.
	     * @param {boolean=} forceCopy If `true` returns a copy, otherwise returns a view referencing the same memory if
	     *  possible. Defaults to `false`
	     * @returns {!ArrayBuffer} Contents as an ArrayBuffer
	     * @expose
	     */
	    ByteBufferPrototype.toBuffer = function(forceCopy) {
	        var offset = this.offset,
	            limit = this.limit;
	        if (!this.noAssert) {
	            if (typeof offset !== 'number' || offset % 1 !== 0)
	                throw TypeError("Illegal offset: Not an integer");
	            offset >>>= 0;
	            if (typeof limit !== 'number' || limit % 1 !== 0)
	                throw TypeError("Illegal limit: Not an integer");
	            limit >>>= 0;
	            if (offset < 0 || offset > limit || limit > this.buffer.byteLength)
	                throw RangeError("Illegal range: 0 <= "+offset+" <= "+limit+" <= "+this.buffer.byteLength);
	        }
	        // NOTE: It's not possible to have another ArrayBuffer reference the same memory as the backing buffer. This is
	        // possible with Uint8Array#subarray only, but we have to return an ArrayBuffer by contract. So:
	        if (!forceCopy && offset === 0 && limit === this.buffer.byteLength)
	            return this.buffer;
	        if (offset === limit)
	            return EMPTY_BUFFER;
	        var buffer = new ArrayBuffer(limit - offset);
	        new Uint8Array(buffer).set(new Uint8Array(this.buffer).subarray(offset, limit), 0);
	        return buffer;
	    };

	    /**
	     * Returns a raw buffer compacted to contain this ByteBuffer's contents. Contents are the bytes between
	     *  {@link ByteBuffer#offset} and {@link ByteBuffer#limit}. This is an alias of {@link ByteBuffer#toBuffer}.
	     * @function
	     * @param {boolean=} forceCopy If `true` returns a copy, otherwise returns a view referencing the same memory.
	     *  Defaults to `false`
	     * @returns {!ArrayBuffer} Contents as an ArrayBuffer
	     * @expose
	     */
	    ByteBufferPrototype.toArrayBuffer = ByteBufferPrototype.toBuffer;

	    /**
	     * Converts the ByteBuffer's contents to a string.
	     * @param {string=} encoding Output encoding. Returns an informative string representation if omitted but also allows
	     *  direct conversion to "utf8", "hex", "base64" and "binary" encoding. "debug" returns a hex representation with
	     *  highlighted offsets.
	     * @param {number=} begin Offset to begin at, defaults to {@link ByteBuffer#offset}
	     * @param {number=} end Offset to end at, defaults to {@link ByteBuffer#limit}
	     * @returns {string} String representation
	     * @throws {Error} If `encoding` is invalid
	     * @expose
	     */
	    ByteBufferPrototype.toString = function(encoding, begin, end) {
	        if (typeof encoding === 'undefined')
	            return "ByteBufferAB(offset="+this.offset+",markedOffset="+this.markedOffset+",limit="+this.limit+",capacity="+this.capacity()+")";
	        if (typeof encoding === 'number')
	            encoding = "utf8",
	            begin = encoding,
	            end = begin;
	        switch (encoding) {
	            case "utf8":
	                return this.toUTF8(begin, end);
	            case "base64":
	                return this.toBase64(begin, end);
	            case "hex":
	                return this.toHex(begin, end);
	            case "binary":
	                return this.toBinary(begin, end);
	            case "debug":
	                return this.toDebug();
	            case "columns":
	                return this.toColumns();
	            default:
	                throw Error("Unsupported encoding: "+encoding);
	        }
	    };

	    // lxiv-embeddable

	    /**
	     * lxiv-embeddable (c) 2014 Daniel Wirtz <dcode@dcode.io>
	     * Released under the Apache License, Version 2.0
	     * see: https://github.com/dcodeIO/lxiv for details
	     */
	    var lxiv = function() {
	        "use strict";

	        /**
	         * lxiv namespace.
	         * @type {!Object.<string,*>}
	         * @exports lxiv
	         */
	        var lxiv = {};

	        /**
	         * Character codes for output.
	         * @type {!Array.<number>}
	         * @inner
	         */
	        var aout = [
	            65, 66, 67, 68, 69, 70, 71, 72, 73, 74, 75, 76, 77, 78, 79, 80,
	            81, 82, 83, 84, 85, 86, 87, 88, 89, 90, 97, 98, 99, 100, 101, 102,
	            103, 104, 105, 106, 107, 108, 109, 110, 111, 112, 113, 114, 115, 116, 117, 118,
	            119, 120, 121, 122, 48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 43, 47
	        ];

	        /**
	         * Character codes for input.
	         * @type {!Array.<number>}
	         * @inner
	         */
	        var ain = [];
	        for (var i=0, k=aout.length; i<k; ++i)
	            ain[aout[i]] = i;

	        /**
	         * Encodes bytes to base64 char codes.
	         * @param {!function():number|null} src Bytes source as a function returning the next byte respectively `null` if
	         *  there are no more bytes left.
	         * @param {!function(number)} dst Characters destination as a function successively called with each encoded char
	         *  code.
	         */
	        lxiv.encode = function(src, dst) {
	            var b, t;
	            while ((b = src()) !== null) {
	                dst(aout[(b>>2)&0x3f]);
	                t = (b&0x3)<<4;
	                if ((b = src()) !== null) {
	                    t |= (b>>4)&0xf;
	                    dst(aout[(t|((b>>4)&0xf))&0x3f]);
	                    t = (b&0xf)<<2;
	                    if ((b = src()) !== null)
	                        dst(aout[(t|((b>>6)&0x3))&0x3f]),
	                        dst(aout[b&0x3f]);
	                    else
	                        dst(aout[t&0x3f]),
	                        dst(61);
	                } else
	                    dst(aout[t&0x3f]),
	                    dst(61),
	                    dst(61);
	            }
	        };

	        /**
	         * Decodes base64 char codes to bytes.
	         * @param {!function():number|null} src Characters source as a function returning the next char code respectively
	         *  `null` if there are no more characters left.
	         * @param {!function(number)} dst Bytes destination as a function successively called with the next byte.
	         * @throws {Error} If a character code is invalid
	         */
	        lxiv.decode = function(src, dst) {
	            var c, t1, t2;
	            function fail(c) {
	                throw Error("Illegal character code: "+c);
	            }
	            while ((c = src()) !== null) {
	                t1 = ain[c];
	                if (typeof t1 === 'undefined') fail(c);
	                if ((c = src()) !== null) {
	                    t2 = ain[c];
	                    if (typeof t2 === 'undefined') fail(c);
	                    dst((t1<<2)>>>0|(t2&0x30)>>4);
	                    if ((c = src()) !== null) {
	                        t1 = ain[c];
	                        if (typeof t1 === 'undefined')
	                            if (c === 61) break; else fail(c);
	                        dst(((t2&0xf)<<4)>>>0|(t1&0x3c)>>2);
	                        if ((c = src()) !== null) {
	                            t2 = ain[c];
	                            if (typeof t2 === 'undefined')
	                                if (c === 61) break; else fail(c);
	                            dst(((t1&0x3)<<6)>>>0|t2);
	                        }
	                    }
	                }
	            }
	        };

	        /**
	         * Tests if a string is valid base64.
	         * @param {string} str String to test
	         * @returns {boolean} `true` if valid, otherwise `false`
	         */
	        lxiv.test = function(str) {
	            return /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(str);
	        };

	        return lxiv;
	    }();

	    // encodings/base64

	    /**
	     * Encodes this ByteBuffer's contents to a base64 encoded string.
	     * @param {number=} begin Offset to begin at, defaults to {@link ByteBuffer#offset}.
	     * @param {number=} end Offset to end at, defaults to {@link ByteBuffer#limit}.
	     * @returns {string} Base64 encoded string
	     * @throws {RangeError} If `begin` or `end` is out of bounds
	     * @expose
	     */
	    ByteBufferPrototype.toBase64 = function(begin, end) {
	        if (typeof begin === 'undefined')
	            begin = this.offset;
	        if (typeof end === 'undefined')
	            end = this.limit;
	        begin = begin | 0; end = end | 0;
	        if (begin < 0 || end > this.capacity || begin > end)
	            throw RangeError("begin, end");
	        var sd; lxiv.encode(function() {
	            return begin < end ? this.view[begin++] : null;
	        }.bind(this), sd = stringDestination());
	        return sd();
	    };

	    /**
	     * Decodes a base64 encoded string to a ByteBuffer.
	     * @param {string} str String to decode
	     * @param {boolean=} littleEndian Whether to use little or big endian byte order. Defaults to
	     *  {@link ByteBuffer.DEFAULT_ENDIAN}.
	     * @returns {!ByteBuffer} ByteBuffer
	     * @expose
	     */
	    ByteBuffer.fromBase64 = function(str, littleEndian) {
	        if (typeof str !== 'string')
	            throw TypeError("str");
	        var bb = new ByteBuffer(str.length/4*3, littleEndian),
	            i = 0;
	        lxiv.decode(stringSource(str), function(b) {
	            bb.view[i++] = b;
	        });
	        bb.limit = i;
	        return bb;
	    };

	    /**
	     * Encodes a binary string to base64 like `window.btoa` does.
	     * @param {string} str Binary string
	     * @returns {string} Base64 encoded string
	     * @see https://developer.mozilla.org/en-US/docs/Web/API/Window.btoa
	     * @expose
	     */
	    ByteBuffer.btoa = function(str) {
	        return ByteBuffer.fromBinary(str).toBase64();
	    };

	    /**
	     * Decodes a base64 encoded string to binary like `window.atob` does.
	     * @param {string} b64 Base64 encoded string
	     * @returns {string} Binary string
	     * @see https://developer.mozilla.org/en-US/docs/Web/API/Window.atob
	     * @expose
	     */
	    ByteBuffer.atob = function(b64) {
	        return ByteBuffer.fromBase64(b64).toBinary();
	    };

	    // encodings/binary

	    /**
	     * Encodes this ByteBuffer to a binary encoded string, that is using only characters 0x00-0xFF as bytes.
	     * @param {number=} begin Offset to begin at. Defaults to {@link ByteBuffer#offset}.
	     * @param {number=} end Offset to end at. Defaults to {@link ByteBuffer#limit}.
	     * @returns {string} Binary encoded string
	     * @throws {RangeError} If `offset > limit`
	     * @expose
	     */
	    ByteBufferPrototype.toBinary = function(begin, end) {
	        if (typeof begin === 'undefined')
	            begin = this.offset;
	        if (typeof end === 'undefined')
	            end = this.limit;
	        begin |= 0; end |= 0;
	        if (begin < 0 || end > this.capacity() || begin > end)
	            throw RangeError("begin, end");
	        if (begin === end)
	            return "";
	        var chars = [],
	            parts = [];
	        while (begin < end) {
	            chars.push(this.view[begin++]);
	            if (chars.length >= 1024)
	                parts.push(String.fromCharCode.apply(String, chars)),
	                chars = [];
	        }
	        return parts.join('') + String.fromCharCode.apply(String, chars);
	    };

	    /**
	     * Decodes a binary encoded string, that is using only characters 0x00-0xFF as bytes, to a ByteBuffer.
	     * @param {string} str String to decode
	     * @param {boolean=} littleEndian Whether to use little or big endian byte order. Defaults to
	     *  {@link ByteBuffer.DEFAULT_ENDIAN}.
	     * @returns {!ByteBuffer} ByteBuffer
	     * @expose
	     */
	    ByteBuffer.fromBinary = function(str, littleEndian) {
	        if (typeof str !== 'string')
	            throw TypeError("str");
	        var i = 0,
	            k = str.length,
	            charCode,
	            bb = new ByteBuffer(k, littleEndian);
	        while (i<k) {
	            charCode = str.charCodeAt(i);
	            if (charCode > 0xff)
	                throw RangeError("illegal char code: "+charCode);
	            bb.view[i++] = charCode;
	        }
	        bb.limit = k;
	        return bb;
	    };

	    // encodings/debug

	    /**
	     * Encodes this ByteBuffer to a hex encoded string with marked offsets. Offset symbols are:
	     * * `<` : offset,
	     * * `'` : markedOffset,
	     * * `>` : limit,
	     * * `|` : offset and limit,
	     * * `[` : offset and markedOffset,
	     * * `]` : markedOffset and limit,
	     * * `!` : offset, markedOffset and limit
	     * @param {boolean=} columns If `true` returns two columns hex + ascii, defaults to `false`
	     * @returns {string|!Array.<string>} Debug string or array of lines if `asArray = true`
	     * @expose
	     * @example `>00'01 02<03` contains four bytes with `limit=0, markedOffset=1, offset=3`
	     * @example `00[01 02 03>` contains four bytes with `offset=markedOffset=1, limit=4`
	     * @example `00|01 02 03` contains four bytes with `offset=limit=1, markedOffset=-1`
	     * @example `|` contains zero bytes with `offset=limit=0, markedOffset=-1`
	     */
	    ByteBufferPrototype.toDebug = function(columns) {
	        var i = -1,
	            k = this.buffer.byteLength,
	            b,
	            hex = "",
	            asc = "",
	            out = "";
	        while (i<k) {
	            if (i !== -1) {
	                b = this.view[i];
	                if (b < 0x10) hex += "0"+b.toString(16).toUpperCase();
	                else hex += b.toString(16).toUpperCase();
	                if (columns)
	                    asc += b > 32 && b < 127 ? String.fromCharCode(b) : '.';
	            }
	            ++i;
	            if (columns) {
	                if (i > 0 && i % 16 === 0 && i !== k) {
	                    while (hex.length < 3*16+3) hex += " ";
	                    out += hex+asc+"\n";
	                    hex = asc = "";
	                }
	            }
	            if (i === this.offset && i === this.limit)
	                hex += i === this.markedOffset ? "!" : "|";
	            else if (i === this.offset)
	                hex += i === this.markedOffset ? "[" : "<";
	            else if (i === this.limit)
	                hex += i === this.markedOffset ? "]" : ">";
	            else
	                hex += i === this.markedOffset ? "'" : (columns || (i !== 0 && i !== k) ? " " : "");
	        }
	        if (columns && hex !== " ") {
	            while (hex.length < 3*16+3)
	                hex += " ";
	            out += hex + asc + "\n";
	        }
	        return columns ? out : hex;
	    };

	    /**
	     * Decodes a hex encoded string with marked offsets to a ByteBuffer.
	     * @param {string} str Debug string to decode (not be generated with `columns = true`)
	     * @param {boolean=} littleEndian Whether to use little or big endian byte order. Defaults to
	     *  {@link ByteBuffer.DEFAULT_ENDIAN}.
	     * @param {boolean=} noAssert Whether to skip assertions of offsets and values. Defaults to
	     *  {@link ByteBuffer.DEFAULT_NOASSERT}.
	     * @returns {!ByteBuffer} ByteBuffer
	     * @expose
	     * @see ByteBuffer#toDebug
	     */
	    ByteBuffer.fromDebug = function(str, littleEndian, noAssert) {
	        var k = str.length,
	            bb = new ByteBuffer(((k+1)/3)|0, littleEndian, noAssert);
	        var i = 0, j = 0, ch, b,
	            rs = false, // Require symbol next
	            ho = false, hm = false, hl = false, // Already has offset (ho), markedOffset (hm), limit (hl)?
	            fail = false;
	        while (i<k) {
	            switch (ch = str.charAt(i++)) {
	                case '!':
	                    if (!noAssert) {
	                        if (ho || hm || hl) {
	                            fail = true;
	                            break;
	                        }
	                        ho = hm = hl = true;
	                    }
	                    bb.offset = bb.markedOffset = bb.limit = j;
	                    rs = false;
	                    break;
	                case '|':
	                    if (!noAssert) {
	                        if (ho || hl) {
	                            fail = true;
	                            break;
	                        }
	                        ho = hl = true;
	                    }
	                    bb.offset = bb.limit = j;
	                    rs = false;
	                    break;
	                case '[':
	                    if (!noAssert) {
	                        if (ho || hm) {
	                            fail = true;
	                            break;
	                        }
	                        ho = hm = true;
	                    }
	                    bb.offset = bb.markedOffset = j;
	                    rs = false;
	                    break;
	                case '<':
	                    if (!noAssert) {
	                        if (ho) {
	                            fail = true;
	                            break;
	                        }
	                        ho = true;
	                    }
	                    bb.offset = j;
	                    rs = false;
	                    break;
	                case ']':
	                    if (!noAssert) {
	                        if (hl || hm) {
	                            fail = true;
	                            break;
	                        }
	                        hl = hm = true;
	                    }
	                    bb.limit = bb.markedOffset = j;
	                    rs = false;
	                    break;
	                case '>':
	                    if (!noAssert) {
	                        if (hl) {
	                            fail = true;
	                            break;
	                        }
	                        hl = true;
	                    }
	                    bb.limit = j;
	                    rs = false;
	                    break;
	                case "'":
	                    if (!noAssert) {
	                        if (hm) {
	                            fail = true;
	                            break;
	                        }
	                        hm = true;
	                    }
	                    bb.markedOffset = j;
	                    rs = false;
	                    break;
	                case ' ':
	                    rs = false;
	                    break;
	                default:
	                    if (!noAssert) {
	                        if (rs) {
	                            fail = true;
	                            break;
	                        }
	                    }
	                    b = parseInt(ch+str.charAt(i++), 16);
	                    if (!noAssert) {
	                        if (isNaN(b) || b < 0 || b > 255)
	                            throw TypeError("Illegal str: Not a debug encoded string");
	                    }
	                    bb.view[j++] = b;
	                    rs = true;
	            }
	            if (fail)
	                throw TypeError("Illegal str: Invalid symbol at "+i);
	        }
	        if (!noAssert) {
	            if (!ho || !hl)
	                throw TypeError("Illegal str: Missing offset or limit");
	            if (j<bb.buffer.byteLength)
	                throw TypeError("Illegal str: Not a debug encoded string (is it hex?) "+j+" < "+k);
	        }
	        return bb;
	    };

	    // encodings/hex

	    /**
	     * Encodes this ByteBuffer's contents to a hex encoded string.
	     * @param {number=} begin Offset to begin at. Defaults to {@link ByteBuffer#offset}.
	     * @param {number=} end Offset to end at. Defaults to {@link ByteBuffer#limit}.
	     * @returns {string} Hex encoded string
	     * @expose
	     */
	    ByteBufferPrototype.toHex = function(begin, end) {
	        begin = typeof begin === 'undefined' ? this.offset : begin;
	        end = typeof end === 'undefined' ? this.limit : end;
	        if (!this.noAssert) {
	            if (typeof begin !== 'number' || begin % 1 !== 0)
	                throw TypeError("Illegal begin: Not an integer");
	            begin >>>= 0;
	            if (typeof end !== 'number' || end % 1 !== 0)
	                throw TypeError("Illegal end: Not an integer");
	            end >>>= 0;
	            if (begin < 0 || begin > end || end > this.buffer.byteLength)
	                throw RangeError("Illegal range: 0 <= "+begin+" <= "+end+" <= "+this.buffer.byteLength);
	        }
	        var out = new Array(end - begin),
	            b;
	        while (begin < end) {
	            b = this.view[begin++];
	            if (b < 0x10)
	                out.push("0", b.toString(16));
	            else out.push(b.toString(16));
	        }
	        return out.join('');
	    };

	    /**
	     * Decodes a hex encoded string to a ByteBuffer.
	     * @param {string} str String to decode
	     * @param {boolean=} littleEndian Whether to use little or big endian byte order. Defaults to
	     *  {@link ByteBuffer.DEFAULT_ENDIAN}.
	     * @param {boolean=} noAssert Whether to skip assertions of offsets and values. Defaults to
	     *  {@link ByteBuffer.DEFAULT_NOASSERT}.
	     * @returns {!ByteBuffer} ByteBuffer
	     * @expose
	     */
	    ByteBuffer.fromHex = function(str, littleEndian, noAssert) {
	        if (!noAssert) {
	            if (typeof str !== 'string')
	                throw TypeError("Illegal str: Not a string");
	            if (str.length % 2 !== 0)
	                throw TypeError("Illegal str: Length not a multiple of 2");
	        }
	        var k = str.length,
	            bb = new ByteBuffer((k / 2) | 0, littleEndian),
	            b;
	        for (var i=0, j=0; i<k; i+=2) {
	            b = parseInt(str.substring(i, i+2), 16);
	            if (!noAssert)
	                if (!isFinite(b) || b < 0 || b > 255)
	                    throw TypeError("Illegal str: Contains non-hex characters");
	            bb.view[j++] = b;
	        }
	        bb.limit = j;
	        return bb;
	    };

	    // utfx-embeddable

	    /**
	     * utfx-embeddable (c) 2014 Daniel Wirtz <dcode@dcode.io>
	     * Released under the Apache License, Version 2.0
	     * see: https://github.com/dcodeIO/utfx for details
	     */
	    var utfx = function() {
	        "use strict";

	        /**
	         * utfx namespace.
	         * @inner
	         * @type {!Object.<string,*>}
	         */
	        var utfx = {};

	        /**
	         * Maximum valid code point.
	         * @type {number}
	         * @const
	         */
	        utfx.MAX_CODEPOINT = 0x10FFFF;

	        /**
	         * Encodes UTF8 code points to UTF8 bytes.
	         * @param {(!function():number|null) | number} src Code points source, either as a function returning the next code point
	         *  respectively `null` if there are no more code points left or a single numeric code point.
	         * @param {!function(number)} dst Bytes destination as a function successively called with the next byte
	         */
	        utfx.encodeUTF8 = function(src, dst) {
	            var cp = null;
	            if (typeof src === 'number')
	                cp = src,
	                src = function() { return null; };
	            while (cp !== null || (cp = src()) !== null) {
	                if (cp < 0x80)
	                    dst(cp&0x7F);
	                else if (cp < 0x800)
	                    dst(((cp>>6)&0x1F)|0xC0),
	                    dst((cp&0x3F)|0x80);
	                else if (cp < 0x10000)
	                    dst(((cp>>12)&0x0F)|0xE0),
	                    dst(((cp>>6)&0x3F)|0x80),
	                    dst((cp&0x3F)|0x80);
	                else
	                    dst(((cp>>18)&0x07)|0xF0),
	                    dst(((cp>>12)&0x3F)|0x80),
	                    dst(((cp>>6)&0x3F)|0x80),
	                    dst((cp&0x3F)|0x80);
	                cp = null;
	            }
	        };

	        /**
	         * Decodes UTF8 bytes to UTF8 code points.
	         * @param {!function():number|null} src Bytes source as a function returning the next byte respectively `null` if there
	         *  are no more bytes left.
	         * @param {!function(number)} dst Code points destination as a function successively called with each decoded code point.
	         * @throws {RangeError} If a starting byte is invalid in UTF8
	         * @throws {Error} If the last sequence is truncated. Has an array property `bytes` holding the
	         *  remaining bytes.
	         */
	        utfx.decodeUTF8 = function(src, dst) {
	            var a, b, c, d, fail = function(b) {
	                b = b.slice(0, b.indexOf(null));
	                var err = Error(b.toString());
	                err.name = "TruncatedError";
	                err['bytes'] = b;
	                throw err;
	            };
	            while ((a = src()) !== null) {
	                if ((a&0x80) === 0)
	                    dst(a);
	                else if ((a&0xE0) === 0xC0)
	                    ((b = src()) === null) && fail([a, b]),
	                    dst(((a&0x1F)<<6) | (b&0x3F));
	                else if ((a&0xF0) === 0xE0)
	                    ((b=src()) === null || (c=src()) === null) && fail([a, b, c]),
	                    dst(((a&0x0F)<<12) | ((b&0x3F)<<6) | (c&0x3F));
	                else if ((a&0xF8) === 0xF0)
	                    ((b=src()) === null || (c=src()) === null || (d=src()) === null) && fail([a, b, c ,d]),
	                    dst(((a&0x07)<<18) | ((b&0x3F)<<12) | ((c&0x3F)<<6) | (d&0x3F));
	                else throw RangeError("Illegal starting byte: "+a);
	            }
	        };

	        /**
	         * Converts UTF16 characters to UTF8 code points.
	         * @param {!function():number|null} src Characters source as a function returning the next char code respectively
	         *  `null` if there are no more characters left.
	         * @param {!function(number)} dst Code points destination as a function successively called with each converted code
	         *  point.
	         */
	        utfx.UTF16toUTF8 = function(src, dst) {
	            var c1, c2 = null;
	            while (true) {
	                if ((c1 = c2 !== null ? c2 : src()) === null)
	                    break;
	                if (c1 >= 0xD800 && c1 <= 0xDFFF) {
	                    if ((c2 = src()) !== null) {
	                        if (c2 >= 0xDC00 && c2 <= 0xDFFF) {
	                            dst((c1-0xD800)*0x400+c2-0xDC00+0x10000);
	                            c2 = null; continue;
	                        }
	                    }
	                }
	                dst(c1);
	            }
	            if (c2 !== null) dst(c2);
	        };

	        /**
	         * Converts UTF8 code points to UTF16 characters.
	         * @param {(!function():number|null) | number} src Code points source, either as a function returning the next code point
	         *  respectively `null` if there are no more code points left or a single numeric code point.
	         * @param {!function(number)} dst Characters destination as a function successively called with each converted char code.
	         * @throws {RangeError} If a code point is out of range
	         */
	        utfx.UTF8toUTF16 = function(src, dst) {
	            var cp = null;
	            if (typeof src === 'number')
	                cp = src, src = function() { return null; };
	            while (cp !== null || (cp = src()) !== null) {
	                if (cp <= 0xFFFF)
	                    dst(cp);
	                else
	                    cp -= 0x10000,
	                    dst((cp>>10)+0xD800),
	                    dst((cp%0x400)+0xDC00);
	                cp = null;
	            }
	        };

	        /**
	         * Converts and encodes UTF16 characters to UTF8 bytes.
	         * @param {!function():number|null} src Characters source as a function returning the next char code respectively `null`
	         *  if there are no more characters left.
	         * @param {!function(number)} dst Bytes destination as a function successively called with the next byte.
	         */
	        utfx.encodeUTF16toUTF8 = function(src, dst) {
	            utfx.UTF16toUTF8(src, function(cp) {
	                utfx.encodeUTF8(cp, dst);
	            });
	        };

	        /**
	         * Decodes and converts UTF8 bytes to UTF16 characters.
	         * @param {!function():number|null} src Bytes source as a function returning the next byte respectively `null` if there
	         *  are no more bytes left.
	         * @param {!function(number)} dst Characters destination as a function successively called with each converted char code.
	         * @throws {RangeError} If a starting byte is invalid in UTF8
	         * @throws {Error} If the last sequence is truncated. Has an array property `bytes` holding the remaining bytes.
	         */
	        utfx.decodeUTF8toUTF16 = function(src, dst) {
	            utfx.decodeUTF8(src, function(cp) {
	                utfx.UTF8toUTF16(cp, dst);
	            });
	        };

	        /**
	         * Calculates the byte length of an UTF8 code point.
	         * @param {number} cp UTF8 code point
	         * @returns {number} Byte length
	         */
	        utfx.calculateCodePoint = function(cp) {
	            return (cp < 0x80) ? 1 : (cp < 0x800) ? 2 : (cp < 0x10000) ? 3 : 4;
	        };

	        /**
	         * Calculates the number of UTF8 bytes required to store UTF8 code points.
	         * @param {(!function():number|null)} src Code points source as a function returning the next code point respectively
	         *  `null` if there are no more code points left.
	         * @returns {number} The number of UTF8 bytes required
	         */
	        utfx.calculateUTF8 = function(src) {
	            var cp, l=0;
	            while ((cp = src()) !== null)
	                l += (cp < 0x80) ? 1 : (cp < 0x800) ? 2 : (cp < 0x10000) ? 3 : 4;
	            return l;
	        };

	        /**
	         * Calculates the number of UTF8 code points respectively UTF8 bytes required to store UTF16 char codes.
	         * @param {(!function():number|null)} src Characters source as a function returning the next char code respectively
	         *  `null` if there are no more characters left.
	         * @returns {!Array.<number>} The number of UTF8 code points at index 0 and the number of UTF8 bytes required at index 1.
	         */
	        utfx.calculateUTF16asUTF8 = function(src) {
	            var n=0, l=0;
	            utfx.UTF16toUTF8(src, function(cp) {
	                ++n; l += (cp < 0x80) ? 1 : (cp < 0x800) ? 2 : (cp < 0x10000) ? 3 : 4;
	            });
	            return [n,l];
	        };

	        return utfx;
	    }();

	    // encodings/utf8

	    /**
	     * Encodes this ByteBuffer's contents between {@link ByteBuffer#offset} and {@link ByteBuffer#limit} to an UTF8 encoded
	     *  string.
	     * @returns {string} Hex encoded string
	     * @throws {RangeError} If `offset > limit`
	     * @expose
	     */
	    ByteBufferPrototype.toUTF8 = function(begin, end) {
	        if (typeof begin === 'undefined') begin = this.offset;
	        if (typeof end === 'undefined') end = this.limit;
	        if (!this.noAssert) {
	            if (typeof begin !== 'number' || begin % 1 !== 0)
	                throw TypeError("Illegal begin: Not an integer");
	            begin >>>= 0;
	            if (typeof end !== 'number' || end % 1 !== 0)
	                throw TypeError("Illegal end: Not an integer");
	            end >>>= 0;
	            if (begin < 0 || begin > end || end > this.buffer.byteLength)
	                throw RangeError("Illegal range: 0 <= "+begin+" <= "+end+" <= "+this.buffer.byteLength);
	        }
	        var sd; try {
	            utfx.decodeUTF8toUTF16(function() {
	                return begin < end ? this.view[begin++] : null;
	            }.bind(this), sd = stringDestination());
	        } catch (e) {
	            if (begin !== end)
	                throw RangeError("Illegal range: Truncated data, "+begin+" != "+end);
	        }
	        return sd();
	    };

	    /**
	     * Decodes an UTF8 encoded string to a ByteBuffer.
	     * @param {string} str String to decode
	     * @param {boolean=} littleEndian Whether to use little or big endian byte order. Defaults to
	     *  {@link ByteBuffer.DEFAULT_ENDIAN}.
	     * @param {boolean=} noAssert Whether to skip assertions of offsets and values. Defaults to
	     *  {@link ByteBuffer.DEFAULT_NOASSERT}.
	     * @returns {!ByteBuffer} ByteBuffer
	     * @expose
	     */
	    ByteBuffer.fromUTF8 = function(str, littleEndian, noAssert) {
	        if (!noAssert)
	            if (typeof str !== 'string')
	                throw TypeError("Illegal str: Not a string");
	        var bb = new ByteBuffer(utfx.calculateUTF16asUTF8(stringSource(str), true)[1], littleEndian, noAssert),
	            i = 0;
	        utfx.encodeUTF16toUTF8(stringSource(str), function(b) {
	            bb.view[i++] = b;
	        });
	        bb.limit = i;
	        return bb;
	    };

	    return ByteBuffer;
	});

	/* WEBPACK VAR INJECTION */}.call(exports, __webpack_require__(5)(module)))

/***/ },
/* 5 */
/***/ function(module, exports) {

	module.exports = function(module) {
		if(!module.webpackPolyfill) {
			module.deprecate = function() {};
			module.paths = [];
			// module.parent = undefined by default
			module.children = [];
			module.webpackPolyfill = 1;
		}
		return module;
	}


/***/ },
/* 6 */
/***/ function(module, exports) {

	module.exports = function() { throw new Error("define cannot be used indirect"); };


/***/ },
/* 7 */
/***/ function(module, exports, __webpack_require__) {

	var __WEBPACK_AMD_DEFINE_FACTORY__, __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;/* WEBPACK VAR INJECTION */(function(module) {/*
	 Copyright 2013 Daniel Wirtz <dcode@dcode.io>
	 Copyright 2009 The Closure Library Authors. All Rights Reserved.

	 Licensed under the Apache License, Version 2.0 (the "License");
	 you may not use this file except in compliance with the License.
	 You may obtain a copy of the License at

	 http://www.apache.org/licenses/LICENSE-2.0

	 Unless required by applicable law or agreed to in writing, software
	 distributed under the License is distributed on an "AS-IS" BASIS,
	 WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
	 See the License for the specific language governing permissions and
	 limitations under the License.
	 */

	/**
	 * @license long.js (c) 2013 Daniel Wirtz <dcode@dcode.io>
	 * Released under the Apache License, Version 2.0
	 * see: https://github.com/dcodeIO/long.js for details
	 */
	(function(global, factory) {

	    /* AMD */ if ("function" === 'function' && __webpack_require__(6)["amd"])
	        !(__WEBPACK_AMD_DEFINE_ARRAY__ = [], __WEBPACK_AMD_DEFINE_FACTORY__ = (factory), __WEBPACK_AMD_DEFINE_RESULT__ = (typeof __WEBPACK_AMD_DEFINE_FACTORY__ === 'function' ? (__WEBPACK_AMD_DEFINE_FACTORY__.apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__)) : __WEBPACK_AMD_DEFINE_FACTORY__), __WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));
	    /* CommonJS */ else if ("function" === 'function' && typeof module === "object" && module && module["exports"])
	        module["exports"] = factory();
	    /* Global */ else
	        (global["dcodeIO"] = global["dcodeIO"] || {})["Long"] = factory();

	})(this, function() {
	    "use strict";

	    /**
	     * Constructs a 64 bit two's-complement integer, given its low and high 32 bit values as *signed* integers.
	     *  See the from* functions below for more convenient ways of constructing Longs.
	     * @exports Long
	     * @class A Long class for representing a 64 bit two's-complement integer value.
	     * @param {number} low The low (signed) 32 bits of the long
	     * @param {number} high The high (signed) 32 bits of the long
	     * @param {boolean=} unsigned Whether unsigned or not, defaults to `false` for signed
	     * @constructor
	     */
	    function Long(low, high, unsigned) {

	        /**
	         * The low 32 bits as a signed value.
	         * @type {number}
	         */
	        this.low = low | 0;

	        /**
	         * The high 32 bits as a signed value.
	         * @type {number}
	         */
	        this.high = high | 0;

	        /**
	         * Whether unsigned or not.
	         * @type {boolean}
	         */
	        this.unsigned = !!unsigned;
	    }

	    // The internal representation of a long is the two given signed, 32-bit values.
	    // We use 32-bit pieces because these are the size of integers on which
	    // Javascript performs bit-operations.  For operations like addition and
	    // multiplication, we split each number into 16 bit pieces, which can easily be
	    // multiplied within Javascript's floating-point representation without overflow
	    // or change in sign.
	    //
	    // In the algorithms below, we frequently reduce the negative case to the
	    // positive case by negating the input(s) and then post-processing the result.
	    // Note that we must ALWAYS check specially whether those values are MIN_VALUE
	    // (-2^63) because -MIN_VALUE == MIN_VALUE (since 2^63 cannot be represented as
	    // a positive number, it overflows back into a negative).  Not handling this
	    // case would often result in infinite recursion.
	    //
	    // Common constant values ZERO, ONE, NEG_ONE, etc. are defined below the from*
	    // methods on which they depend.

	    /**
	     * An indicator used to reliably determine if an object is a Long or not.
	     * @type {boolean}
	     * @const
	     * @private
	     */
	    Long.prototype.__isLong__;

	    Object.defineProperty(Long.prototype, "__isLong__", {
	        value: true,
	        enumerable: false,
	        configurable: false
	    });

	    /**
	     * @function
	     * @param {*} obj Object
	     * @returns {boolean}
	     * @inner
	     */
	    function isLong(obj) {
	        return (obj && obj["__isLong__"]) === true;
	    }

	    /**
	     * Tests if the specified object is a Long.
	     * @function
	     * @param {*} obj Object
	     * @returns {boolean}
	     */
	    Long.isLong = isLong;

	    /**
	     * A cache of the Long representations of small integer values.
	     * @type {!Object}
	     * @inner
	     */
	    var INT_CACHE = {};

	    /**
	     * A cache of the Long representations of small unsigned integer values.
	     * @type {!Object}
	     * @inner
	     */
	    var UINT_CACHE = {};

	    /**
	     * @param {number} value
	     * @param {boolean=} unsigned
	     * @returns {!Long}
	     * @inner
	     */
	    function fromInt(value, unsigned) {
	        var obj, cachedObj, cache;
	        if (unsigned) {
	            value >>>= 0;
	            if (cache = (0 <= value && value < 256)) {
	                cachedObj = UINT_CACHE[value];
	                if (cachedObj)
	                    return cachedObj;
	            }
	            obj = fromBits(value, (value | 0) < 0 ? -1 : 0, true);
	            if (cache)
	                UINT_CACHE[value] = obj;
	            return obj;
	        } else {
	            value |= 0;
	            if (cache = (-128 <= value && value < 128)) {
	                cachedObj = INT_CACHE[value];
	                if (cachedObj)
	                    return cachedObj;
	            }
	            obj = fromBits(value, value < 0 ? -1 : 0, false);
	            if (cache)
	                INT_CACHE[value] = obj;
	            return obj;
	        }
	    }

	    /**
	     * Returns a Long representing the given 32 bit integer value.
	     * @function
	     * @param {number} value The 32 bit integer in question
	     * @param {boolean=} unsigned Whether unsigned or not, defaults to `false` for signed
	     * @returns {!Long} The corresponding Long value
	     */
	    Long.fromInt = fromInt;

	    /**
	     * @param {number} value
	     * @param {boolean=} unsigned
	     * @returns {!Long}
	     * @inner
	     */
	    function fromNumber(value, unsigned) {
	        if (isNaN(value) || !isFinite(value))
	            return unsigned ? UZERO : ZERO;
	        if (unsigned) {
	            if (value < 0)
	                return UZERO;
	            if (value >= TWO_PWR_64_DBL)
	                return MAX_UNSIGNED_VALUE;
	        } else {
	            if (value <= -TWO_PWR_63_DBL)
	                return MIN_VALUE;
	            if (value + 1 >= TWO_PWR_63_DBL)
	                return MAX_VALUE;
	        }
	        if (value < 0)
	            return fromNumber(-value, unsigned).neg();
	        return fromBits((value % TWO_PWR_32_DBL) | 0, (value / TWO_PWR_32_DBL) | 0, unsigned);
	    }

	    /**
	     * Returns a Long representing the given value, provided that it is a finite number. Otherwise, zero is returned.
	     * @function
	     * @param {number} value The number in question
	     * @param {boolean=} unsigned Whether unsigned or not, defaults to `false` for signed
	     * @returns {!Long} The corresponding Long value
	     */
	    Long.fromNumber = fromNumber;

	    /**
	     * @param {number} lowBits
	     * @param {number} highBits
	     * @param {boolean=} unsigned
	     * @returns {!Long}
	     * @inner
	     */
	    function fromBits(lowBits, highBits, unsigned) {
	        return new Long(lowBits, highBits, unsigned);
	    }

	    /**
	     * Returns a Long representing the 64 bit integer that comes by concatenating the given low and high bits. Each is
	     *  assumed to use 32 bits.
	     * @function
	     * @param {number} lowBits The low 32 bits
	     * @param {number} highBits The high 32 bits
	     * @param {boolean=} unsigned Whether unsigned or not, defaults to `false` for signed
	     * @returns {!Long} The corresponding Long value
	     */
	    Long.fromBits = fromBits;

	    /**
	     * @function
	     * @param {number} base
	     * @param {number} exponent
	     * @returns {number}
	     * @inner
	     */
	    var pow_dbl = Math.pow; // Used 4 times (4*8 to 15+4)

	    /**
	     * @param {string} str
	     * @param {(boolean|number)=} unsigned
	     * @param {number=} radix
	     * @returns {!Long}
	     * @inner
	     */
	    function fromString(str, unsigned, radix) {
	        if (str.length === 0)
	            throw Error('empty string');
	        if (str === "NaN" || str === "Infinity" || str === "+Infinity" || str === "-Infinity")
	            return ZERO;
	        if (typeof unsigned === 'number') {
	            // For goog.math.long compatibility
	            radix = unsigned,
	            unsigned = false;
	        } else {
	            unsigned = !! unsigned;
	        }
	        radix = radix || 10;
	        if (radix < 2 || 36 < radix)
	            throw RangeError('radix');

	        var p;
	        if ((p = str.indexOf('-')) > 0)
	            throw Error('interior hyphen');
	        else if (p === 0) {
	            return fromString(str.substring(1), unsigned, radix).neg();
	        }

	        // Do several (8) digits each time through the loop, so as to
	        // minimize the calls to the very expensive emulated div.
	        var radixToPower = fromNumber(pow_dbl(radix, 8));

	        var result = ZERO;
	        for (var i = 0; i < str.length; i += 8) {
	            var size = Math.min(8, str.length - i),
	                value = parseInt(str.substring(i, i + size), radix);
	            if (size < 8) {
	                var power = fromNumber(pow_dbl(radix, size));
	                result = result.mul(power).add(fromNumber(value));
	            } else {
	                result = result.mul(radixToPower);
	                result = result.add(fromNumber(value));
	            }
	        }
	        result.unsigned = unsigned;
	        return result;
	    }

	    /**
	     * Returns a Long representation of the given string, written using the specified radix.
	     * @function
	     * @param {string} str The textual representation of the Long
	     * @param {(boolean|number)=} unsigned Whether unsigned or not, defaults to `false` for signed
	     * @param {number=} radix The radix in which the text is written (2-36), defaults to 10
	     * @returns {!Long} The corresponding Long value
	     */
	    Long.fromString = fromString;

	    /**
	     * @function
	     * @param {!Long|number|string|!{low: number, high: number, unsigned: boolean}} val
	     * @returns {!Long}
	     * @inner
	     */
	    function fromValue(val) {
	        if (val /* is compatible */ instanceof Long)
	            return val;
	        if (typeof val === 'number')
	            return fromNumber(val);
	        if (typeof val === 'string')
	            return fromString(val);
	        // Throws for non-objects, converts non-instanceof Long:
	        return fromBits(val.low, val.high, val.unsigned);
	    }

	    /**
	     * Converts the specified value to a Long.
	     * @function
	     * @param {!Long|number|string|!{low: number, high: number, unsigned: boolean}} val Value
	     * @returns {!Long}
	     */
	    Long.fromValue = fromValue;

	    // NOTE: the compiler should inline these constant values below and then remove these variables, so there should be
	    // no runtime penalty for these.

	    /**
	     * @type {number}
	     * @const
	     * @inner
	     */
	    var TWO_PWR_16_DBL = 1 << 16;

	    /**
	     * @type {number}
	     * @const
	     * @inner
	     */
	    var TWO_PWR_24_DBL = 1 << 24;

	    /**
	     * @type {number}
	     * @const
	     * @inner
	     */
	    var TWO_PWR_32_DBL = TWO_PWR_16_DBL * TWO_PWR_16_DBL;

	    /**
	     * @type {number}
	     * @const
	     * @inner
	     */
	    var TWO_PWR_64_DBL = TWO_PWR_32_DBL * TWO_PWR_32_DBL;

	    /**
	     * @type {number}
	     * @const
	     * @inner
	     */
	    var TWO_PWR_63_DBL = TWO_PWR_64_DBL / 2;

	    /**
	     * @type {!Long}
	     * @const
	     * @inner
	     */
	    var TWO_PWR_24 = fromInt(TWO_PWR_24_DBL);

	    /**
	     * @type {!Long}
	     * @inner
	     */
	    var ZERO = fromInt(0);

	    /**
	     * Signed zero.
	     * @type {!Long}
	     */
	    Long.ZERO = ZERO;

	    /**
	     * @type {!Long}
	     * @inner
	     */
	    var UZERO = fromInt(0, true);

	    /**
	     * Unsigned zero.
	     * @type {!Long}
	     */
	    Long.UZERO = UZERO;

	    /**
	     * @type {!Long}
	     * @inner
	     */
	    var ONE = fromInt(1);

	    /**
	     * Signed one.
	     * @type {!Long}
	     */
	    Long.ONE = ONE;

	    /**
	     * @type {!Long}
	     * @inner
	     */
	    var UONE = fromInt(1, true);

	    /**
	     * Unsigned one.
	     * @type {!Long}
	     */
	    Long.UONE = UONE;

	    /**
	     * @type {!Long}
	     * @inner
	     */
	    var NEG_ONE = fromInt(-1);

	    /**
	     * Signed negative one.
	     * @type {!Long}
	     */
	    Long.NEG_ONE = NEG_ONE;

	    /**
	     * @type {!Long}
	     * @inner
	     */
	    var MAX_VALUE = fromBits(0xFFFFFFFF|0, 0x7FFFFFFF|0, false);

	    /**
	     * Maximum signed value.
	     * @type {!Long}
	     */
	    Long.MAX_VALUE = MAX_VALUE;

	    /**
	     * @type {!Long}
	     * @inner
	     */
	    var MAX_UNSIGNED_VALUE = fromBits(0xFFFFFFFF|0, 0xFFFFFFFF|0, true);

	    /**
	     * Maximum unsigned value.
	     * @type {!Long}
	     */
	    Long.MAX_UNSIGNED_VALUE = MAX_UNSIGNED_VALUE;

	    /**
	     * @type {!Long}
	     * @inner
	     */
	    var MIN_VALUE = fromBits(0, 0x80000000|0, false);

	    /**
	     * Minimum signed value.
	     * @type {!Long}
	     */
	    Long.MIN_VALUE = MIN_VALUE;

	    /**
	     * @alias Long.prototype
	     * @inner
	     */
	    var LongPrototype = Long.prototype;

	    /**
	     * Converts the Long to a 32 bit integer, assuming it is a 32 bit integer.
	     * @returns {number}
	     */
	    LongPrototype.toInt = function toInt() {
	        return this.unsigned ? this.low >>> 0 : this.low;
	    };

	    /**
	     * Converts the Long to a the nearest floating-point representation of this value (double, 53 bit mantissa).
	     * @returns {number}
	     */
	    LongPrototype.toNumber = function toNumber() {
	        if (this.unsigned)
	            return ((this.high >>> 0) * TWO_PWR_32_DBL) + (this.low >>> 0);
	        return this.high * TWO_PWR_32_DBL + (this.low >>> 0);
	    };

	    /**
	     * Converts the Long to a string written in the specified radix.
	     * @param {number=} radix Radix (2-36), defaults to 10
	     * @returns {string}
	     * @override
	     * @throws {RangeError} If `radix` is out of range
	     */
	    LongPrototype.toString = function toString(radix) {
	        radix = radix || 10;
	        if (radix < 2 || 36 < radix)
	            throw RangeError('radix');
	        if (this.isZero())
	            return '0';
	        if (this.isNegative()) { // Unsigned Longs are never negative
	            if (this.eq(MIN_VALUE)) {
	                // We need to change the Long value before it can be negated, so we remove
	                // the bottom-most digit in this base and then recurse to do the rest.
	                var radixLong = fromNumber(radix),
	                    div = this.div(radixLong),
	                    rem1 = div.mul(radixLong).sub(this);
	                return div.toString(radix) + rem1.toInt().toString(radix);
	            } else
	                return '-' + this.neg().toString(radix);
	        }

	        // Do several (6) digits each time through the loop, so as to
	        // minimize the calls to the very expensive emulated div.
	        var radixToPower = fromNumber(pow_dbl(radix, 6), this.unsigned),
	            rem = this;
	        var result = '';
	        while (true) {
	            var remDiv = rem.div(radixToPower),
	                intval = rem.sub(remDiv.mul(radixToPower)).toInt() >>> 0,
	                digits = intval.toString(radix);
	            rem = remDiv;
	            if (rem.isZero())
	                return digits + result;
	            else {
	                while (digits.length < 6)
	                    digits = '0' + digits;
	                result = '' + digits + result;
	            }
	        }
	    };

	    /**
	     * Gets the high 32 bits as a signed integer.
	     * @returns {number} Signed high bits
	     */
	    LongPrototype.getHighBits = function getHighBits() {
	        return this.high;
	    };

	    /**
	     * Gets the high 32 bits as an unsigned integer.
	     * @returns {number} Unsigned high bits
	     */
	    LongPrototype.getHighBitsUnsigned = function getHighBitsUnsigned() {
	        return this.high >>> 0;
	    };

	    /**
	     * Gets the low 32 bits as a signed integer.
	     * @returns {number} Signed low bits
	     */
	    LongPrototype.getLowBits = function getLowBits() {
	        return this.low;
	    };

	    /**
	     * Gets the low 32 bits as an unsigned integer.
	     * @returns {number} Unsigned low bits
	     */
	    LongPrototype.getLowBitsUnsigned = function getLowBitsUnsigned() {
	        return this.low >>> 0;
	    };

	    /**
	     * Gets the number of bits needed to represent the absolute value of this Long.
	     * @returns {number}
	     */
	    LongPrototype.getNumBitsAbs = function getNumBitsAbs() {
	        if (this.isNegative()) // Unsigned Longs are never negative
	            return this.eq(MIN_VALUE) ? 64 : this.neg().getNumBitsAbs();
	        var val = this.high != 0 ? this.high : this.low;
	        for (var bit = 31; bit > 0; bit--)
	            if ((val & (1 << bit)) != 0)
	                break;
	        return this.high != 0 ? bit + 33 : bit + 1;
	    };

	    /**
	     * Tests if this Long's value equals zero.
	     * @returns {boolean}
	     */
	    LongPrototype.isZero = function isZero() {
	        return this.high === 0 && this.low === 0;
	    };

	    /**
	     * Tests if this Long's value is negative.
	     * @returns {boolean}
	     */
	    LongPrototype.isNegative = function isNegative() {
	        return !this.unsigned && this.high < 0;
	    };

	    /**
	     * Tests if this Long's value is positive.
	     * @returns {boolean}
	     */
	    LongPrototype.isPositive = function isPositive() {
	        return this.unsigned || this.high >= 0;
	    };

	    /**
	     * Tests if this Long's value is odd.
	     * @returns {boolean}
	     */
	    LongPrototype.isOdd = function isOdd() {
	        return (this.low & 1) === 1;
	    };

	    /**
	     * Tests if this Long's value is even.
	     * @returns {boolean}
	     */
	    LongPrototype.isEven = function isEven() {
	        return (this.low & 1) === 0;
	    };

	    /**
	     * Tests if this Long's value equals the specified's.
	     * @param {!Long|number|string} other Other value
	     * @returns {boolean}
	     */
	    LongPrototype.equals = function equals(other) {
	        if (!isLong(other))
	            other = fromValue(other);
	        if (this.unsigned !== other.unsigned && (this.high >>> 31) === 1 && (other.high >>> 31) === 1)
	            return false;
	        return this.high === other.high && this.low === other.low;
	    };

	    /**
	     * Tests if this Long's value equals the specified's. This is an alias of {@link Long#equals}.
	     * @function
	     * @param {!Long|number|string} other Other value
	     * @returns {boolean}
	     */
	    LongPrototype.eq = LongPrototype.equals;

	    /**
	     * Tests if this Long's value differs from the specified's.
	     * @param {!Long|number|string} other Other value
	     * @returns {boolean}
	     */
	    LongPrototype.notEquals = function notEquals(other) {
	        return !this.eq(/* validates */ other);
	    };

	    /**
	     * Tests if this Long's value differs from the specified's. This is an alias of {@link Long#notEquals}.
	     * @function
	     * @param {!Long|number|string} other Other value
	     * @returns {boolean}
	     */
	    LongPrototype.neq = LongPrototype.notEquals;

	    /**
	     * Tests if this Long's value is less than the specified's.
	     * @param {!Long|number|string} other Other value
	     * @returns {boolean}
	     */
	    LongPrototype.lessThan = function lessThan(other) {
	        return this.comp(/* validates */ other) < 0;
	    };

	    /**
	     * Tests if this Long's value is less than the specified's. This is an alias of {@link Long#lessThan}.
	     * @function
	     * @param {!Long|number|string} other Other value
	     * @returns {boolean}
	     */
	    LongPrototype.lt = LongPrototype.lessThan;

	    /**
	     * Tests if this Long's value is less than or equal the specified's.
	     * @param {!Long|number|string} other Other value
	     * @returns {boolean}
	     */
	    LongPrototype.lessThanOrEqual = function lessThanOrEqual(other) {
	        return this.comp(/* validates */ other) <= 0;
	    };

	    /**
	     * Tests if this Long's value is less than or equal the specified's. This is an alias of {@link Long#lessThanOrEqual}.
	     * @function
	     * @param {!Long|number|string} other Other value
	     * @returns {boolean}
	     */
	    LongPrototype.lte = LongPrototype.lessThanOrEqual;

	    /**
	     * Tests if this Long's value is greater than the specified's.
	     * @param {!Long|number|string} other Other value
	     * @returns {boolean}
	     */
	    LongPrototype.greaterThan = function greaterThan(other) {
	        return this.comp(/* validates */ other) > 0;
	    };

	    /**
	     * Tests if this Long's value is greater than the specified's. This is an alias of {@link Long#greaterThan}.
	     * @function
	     * @param {!Long|number|string} other Other value
	     * @returns {boolean}
	     */
	    LongPrototype.gt = LongPrototype.greaterThan;

	    /**
	     * Tests if this Long's value is greater than or equal the specified's.
	     * @param {!Long|number|string} other Other value
	     * @returns {boolean}
	     */
	    LongPrototype.greaterThanOrEqual = function greaterThanOrEqual(other) {
	        return this.comp(/* validates */ other) >= 0;
	    };

	    /**
	     * Tests if this Long's value is greater than or equal the specified's. This is an alias of {@link Long#greaterThanOrEqual}.
	     * @function
	     * @param {!Long|number|string} other Other value
	     * @returns {boolean}
	     */
	    LongPrototype.gte = LongPrototype.greaterThanOrEqual;

	    /**
	     * Compares this Long's value with the specified's.
	     * @param {!Long|number|string} other Other value
	     * @returns {number} 0 if they are the same, 1 if the this is greater and -1
	     *  if the given one is greater
	     */
	    LongPrototype.compare = function compare(other) {
	        if (!isLong(other))
	            other = fromValue(other);
	        if (this.eq(other))
	            return 0;
	        var thisNeg = this.isNegative(),
	            otherNeg = other.isNegative();
	        if (thisNeg && !otherNeg)
	            return -1;
	        if (!thisNeg && otherNeg)
	            return 1;
	        // At this point the sign bits are the same
	        if (!this.unsigned)
	            return this.sub(other).isNegative() ? -1 : 1;
	        // Both are positive if at least one is unsigned
	        return (other.high >>> 0) > (this.high >>> 0) || (other.high === this.high && (other.low >>> 0) > (this.low >>> 0)) ? -1 : 1;
	    };

	    /**
	     * Compares this Long's value with the specified's. This is an alias of {@link Long#compare}.
	     * @function
	     * @param {!Long|number|string} other Other value
	     * @returns {number} 0 if they are the same, 1 if the this is greater and -1
	     *  if the given one is greater
	     */
	    LongPrototype.comp = LongPrototype.compare;

	    /**
	     * Negates this Long's value.
	     * @returns {!Long} Negated Long
	     */
	    LongPrototype.negate = function negate() {
	        if (!this.unsigned && this.eq(MIN_VALUE))
	            return MIN_VALUE;
	        return this.not().add(ONE);
	    };

	    /**
	     * Negates this Long's value. This is an alias of {@link Long#negate}.
	     * @function
	     * @returns {!Long} Negated Long
	     */
	    LongPrototype.neg = LongPrototype.negate;

	    /**
	     * Returns the sum of this and the specified Long.
	     * @param {!Long|number|string} addend Addend
	     * @returns {!Long} Sum
	     */
	    LongPrototype.add = function add(addend) {
	        if (!isLong(addend))
	            addend = fromValue(addend);

	        // Divide each number into 4 chunks of 16 bits, and then sum the chunks.

	        var a48 = this.high >>> 16;
	        var a32 = this.high & 0xFFFF;
	        var a16 = this.low >>> 16;
	        var a00 = this.low & 0xFFFF;

	        var b48 = addend.high >>> 16;
	        var b32 = addend.high & 0xFFFF;
	        var b16 = addend.low >>> 16;
	        var b00 = addend.low & 0xFFFF;

	        var c48 = 0, c32 = 0, c16 = 0, c00 = 0;
	        c00 += a00 + b00;
	        c16 += c00 >>> 16;
	        c00 &= 0xFFFF;
	        c16 += a16 + b16;
	        c32 += c16 >>> 16;
	        c16 &= 0xFFFF;
	        c32 += a32 + b32;
	        c48 += c32 >>> 16;
	        c32 &= 0xFFFF;
	        c48 += a48 + b48;
	        c48 &= 0xFFFF;
	        return fromBits((c16 << 16) | c00, (c48 << 16) | c32, this.unsigned);
	    };

	    /**
	     * Returns the difference of this and the specified Long.
	     * @param {!Long|number|string} subtrahend Subtrahend
	     * @returns {!Long} Difference
	     */
	    LongPrototype.subtract = function subtract(subtrahend) {
	        if (!isLong(subtrahend))
	            subtrahend = fromValue(subtrahend);
	        return this.add(subtrahend.neg());
	    };

	    /**
	     * Returns the difference of this and the specified Long. This is an alias of {@link Long#subtract}.
	     * @function
	     * @param {!Long|number|string} subtrahend Subtrahend
	     * @returns {!Long} Difference
	     */
	    LongPrototype.sub = LongPrototype.subtract;

	    /**
	     * Returns the product of this and the specified Long.
	     * @param {!Long|number|string} multiplier Multiplier
	     * @returns {!Long} Product
	     */
	    LongPrototype.multiply = function multiply(multiplier) {
	        if (this.isZero())
	            return ZERO;
	        if (!isLong(multiplier))
	            multiplier = fromValue(multiplier);
	        if (multiplier.isZero())
	            return ZERO;
	        if (this.eq(MIN_VALUE))
	            return multiplier.isOdd() ? MIN_VALUE : ZERO;
	        if (multiplier.eq(MIN_VALUE))
	            return this.isOdd() ? MIN_VALUE : ZERO;

	        if (this.isNegative()) {
	            if (multiplier.isNegative())
	                return this.neg().mul(multiplier.neg());
	            else
	                return this.neg().mul(multiplier).neg();
	        } else if (multiplier.isNegative())
	            return this.mul(multiplier.neg()).neg();

	        // If both longs are small, use float multiplication
	        if (this.lt(TWO_PWR_24) && multiplier.lt(TWO_PWR_24))
	            return fromNumber(this.toNumber() * multiplier.toNumber(), this.unsigned);

	        // Divide each long into 4 chunks of 16 bits, and then add up 4x4 products.
	        // We can skip products that would overflow.

	        var a48 = this.high >>> 16;
	        var a32 = this.high & 0xFFFF;
	        var a16 = this.low >>> 16;
	        var a00 = this.low & 0xFFFF;

	        var b48 = multiplier.high >>> 16;
	        var b32 = multiplier.high & 0xFFFF;
	        var b16 = multiplier.low >>> 16;
	        var b00 = multiplier.low & 0xFFFF;

	        var c48 = 0, c32 = 0, c16 = 0, c00 = 0;
	        c00 += a00 * b00;
	        c16 += c00 >>> 16;
	        c00 &= 0xFFFF;
	        c16 += a16 * b00;
	        c32 += c16 >>> 16;
	        c16 &= 0xFFFF;
	        c16 += a00 * b16;
	        c32 += c16 >>> 16;
	        c16 &= 0xFFFF;
	        c32 += a32 * b00;
	        c48 += c32 >>> 16;
	        c32 &= 0xFFFF;
	        c32 += a16 * b16;
	        c48 += c32 >>> 16;
	        c32 &= 0xFFFF;
	        c32 += a00 * b32;
	        c48 += c32 >>> 16;
	        c32 &= 0xFFFF;
	        c48 += a48 * b00 + a32 * b16 + a16 * b32 + a00 * b48;
	        c48 &= 0xFFFF;
	        return fromBits((c16 << 16) | c00, (c48 << 16) | c32, this.unsigned);
	    };

	    /**
	     * Returns the product of this and the specified Long. This is an alias of {@link Long#multiply}.
	     * @function
	     * @param {!Long|number|string} multiplier Multiplier
	     * @returns {!Long} Product
	     */
	    LongPrototype.mul = LongPrototype.multiply;

	    /**
	     * Returns this Long divided by the specified. The result is signed if this Long is signed or
	     *  unsigned if this Long is unsigned.
	     * @param {!Long|number|string} divisor Divisor
	     * @returns {!Long} Quotient
	     */
	    LongPrototype.divide = function divide(divisor) {
	        if (!isLong(divisor))
	            divisor = fromValue(divisor);
	        if (divisor.isZero())
	            throw Error('division by zero');
	        if (this.isZero())
	            return this.unsigned ? UZERO : ZERO;
	        var approx, rem, res;
	        if (!this.unsigned) {
	            // This section is only relevant for signed longs and is derived from the
	            // closure library as a whole.
	            if (this.eq(MIN_VALUE)) {
	                if (divisor.eq(ONE) || divisor.eq(NEG_ONE))
	                    return MIN_VALUE;  // recall that -MIN_VALUE == MIN_VALUE
	                else if (divisor.eq(MIN_VALUE))
	                    return ONE;
	                else {
	                    // At this point, we have |other| >= 2, so |this/other| < |MIN_VALUE|.
	                    var halfThis = this.shr(1);
	                    approx = halfThis.div(divisor).shl(1);
	                    if (approx.eq(ZERO)) {
	                        return divisor.isNegative() ? ONE : NEG_ONE;
	                    } else {
	                        rem = this.sub(divisor.mul(approx));
	                        res = approx.add(rem.div(divisor));
	                        return res;
	                    }
	                }
	            } else if (divisor.eq(MIN_VALUE))
	                return this.unsigned ? UZERO : ZERO;
	            if (this.isNegative()) {
	                if (divisor.isNegative())
	                    return this.neg().div(divisor.neg());
	                return this.neg().div(divisor).neg();
	            } else if (divisor.isNegative())
	                return this.div(divisor.neg()).neg();
	            res = ZERO;
	        } else {
	            // The algorithm below has not been made for unsigned longs. It's therefore
	            // required to take special care of the MSB prior to running it.
	            if (!divisor.unsigned)
	                divisor = divisor.toUnsigned();
	            if (divisor.gt(this))
	                return UZERO;
	            if (divisor.gt(this.shru(1))) // 15 >>> 1 = 7 ; with divisor = 8 ; true
	                return UONE;
	            res = UZERO;
	        }

	        // Repeat the following until the remainder is less than other:  find a
	        // floating-point that approximates remainder / other *from below*, add this
	        // into the result, and subtract it from the remainder.  It is critical that
	        // the approximate value is less than or equal to the real value so that the
	        // remainder never becomes negative.
	        rem = this;
	        while (rem.gte(divisor)) {
	            // Approximate the result of division. This may be a little greater or
	            // smaller than the actual value.
	            approx = Math.max(1, Math.floor(rem.toNumber() / divisor.toNumber()));

	            // We will tweak the approximate result by changing it in the 48-th digit or
	            // the smallest non-fractional digit, whichever is larger.
	            var log2 = Math.ceil(Math.log(approx) / Math.LN2),
	                delta = (log2 <= 48) ? 1 : pow_dbl(2, log2 - 48),

	            // Decrease the approximation until it is smaller than the remainder.  Note
	            // that if it is too large, the product overflows and is negative.
	                approxRes = fromNumber(approx),
	                approxRem = approxRes.mul(divisor);
	            while (approxRem.isNegative() || approxRem.gt(rem)) {
	                approx -= delta;
	                approxRes = fromNumber(approx, this.unsigned);
	                approxRem = approxRes.mul(divisor);
	            }

	            // We know the answer can't be zero... and actually, zero would cause
	            // infinite recursion since we would make no progress.
	            if (approxRes.isZero())
	                approxRes = ONE;

	            res = res.add(approxRes);
	            rem = rem.sub(approxRem);
	        }
	        return res;
	    };

	    /**
	     * Returns this Long divided by the specified. This is an alias of {@link Long#divide}.
	     * @function
	     * @param {!Long|number|string} divisor Divisor
	     * @returns {!Long} Quotient
	     */
	    LongPrototype.div = LongPrototype.divide;

	    /**
	     * Returns this Long modulo the specified.
	     * @param {!Long|number|string} divisor Divisor
	     * @returns {!Long} Remainder
	     */
	    LongPrototype.modulo = function modulo(divisor) {
	        if (!isLong(divisor))
	            divisor = fromValue(divisor);
	        return this.sub(this.div(divisor).mul(divisor));
	    };

	    /**
	     * Returns this Long modulo the specified. This is an alias of {@link Long#modulo}.
	     * @function
	     * @param {!Long|number|string} divisor Divisor
	     * @returns {!Long} Remainder
	     */
	    LongPrototype.mod = LongPrototype.modulo;

	    /**
	     * Returns the bitwise NOT of this Long.
	     * @returns {!Long}
	     */
	    LongPrototype.not = function not() {
	        return fromBits(~this.low, ~this.high, this.unsigned);
	    };

	    /**
	     * Returns the bitwise AND of this Long and the specified.
	     * @param {!Long|number|string} other Other Long
	     * @returns {!Long}
	     */
	    LongPrototype.and = function and(other) {
	        if (!isLong(other))
	            other = fromValue(other);
	        return fromBits(this.low & other.low, this.high & other.high, this.unsigned);
	    };

	    /**
	     * Returns the bitwise OR of this Long and the specified.
	     * @param {!Long|number|string} other Other Long
	     * @returns {!Long}
	     */
	    LongPrototype.or = function or(other) {
	        if (!isLong(other))
	            other = fromValue(other);
	        return fromBits(this.low | other.low, this.high | other.high, this.unsigned);
	    };

	    /**
	     * Returns the bitwise XOR of this Long and the given one.
	     * @param {!Long|number|string} other Other Long
	     * @returns {!Long}
	     */
	    LongPrototype.xor = function xor(other) {
	        if (!isLong(other))
	            other = fromValue(other);
	        return fromBits(this.low ^ other.low, this.high ^ other.high, this.unsigned);
	    };

	    /**
	     * Returns this Long with bits shifted to the left by the given amount.
	     * @param {number|!Long} numBits Number of bits
	     * @returns {!Long} Shifted Long
	     */
	    LongPrototype.shiftLeft = function shiftLeft(numBits) {
	        if (isLong(numBits))
	            numBits = numBits.toInt();
	        if ((numBits &= 63) === 0)
	            return this;
	        else if (numBits < 32)
	            return fromBits(this.low << numBits, (this.high << numBits) | (this.low >>> (32 - numBits)), this.unsigned);
	        else
	            return fromBits(0, this.low << (numBits - 32), this.unsigned);
	    };

	    /**
	     * Returns this Long with bits shifted to the left by the given amount. This is an alias of {@link Long#shiftLeft}.
	     * @function
	     * @param {number|!Long} numBits Number of bits
	     * @returns {!Long} Shifted Long
	     */
	    LongPrototype.shl = LongPrototype.shiftLeft;

	    /**
	     * Returns this Long with bits arithmetically shifted to the right by the given amount.
	     * @param {number|!Long} numBits Number of bits
	     * @returns {!Long} Shifted Long
	     */
	    LongPrototype.shiftRight = function shiftRight(numBits) {
	        if (isLong(numBits))
	            numBits = numBits.toInt();
	        if ((numBits &= 63) === 0)
	            return this;
	        else if (numBits < 32)
	            return fromBits((this.low >>> numBits) | (this.high << (32 - numBits)), this.high >> numBits, this.unsigned);
	        else
	            return fromBits(this.high >> (numBits - 32), this.high >= 0 ? 0 : -1, this.unsigned);
	    };

	    /**
	     * Returns this Long with bits arithmetically shifted to the right by the given amount. This is an alias of {@link Long#shiftRight}.
	     * @function
	     * @param {number|!Long} numBits Number of bits
	     * @returns {!Long} Shifted Long
	     */
	    LongPrototype.shr = LongPrototype.shiftRight;

	    /**
	     * Returns this Long with bits logically shifted to the right by the given amount.
	     * @param {number|!Long} numBits Number of bits
	     * @returns {!Long} Shifted Long
	     */
	    LongPrototype.shiftRightUnsigned = function shiftRightUnsigned(numBits) {
	        if (isLong(numBits))
	            numBits = numBits.toInt();
	        numBits &= 63;
	        if (numBits === 0)
	            return this;
	        else {
	            var high = this.high;
	            if (numBits < 32) {
	                var low = this.low;
	                return fromBits((low >>> numBits) | (high << (32 - numBits)), high >>> numBits, this.unsigned);
	            } else if (numBits === 32)
	                return fromBits(high, 0, this.unsigned);
	            else
	                return fromBits(high >>> (numBits - 32), 0, this.unsigned);
	        }
	    };

	    /**
	     * Returns this Long with bits logically shifted to the right by the given amount. This is an alias of {@link Long#shiftRightUnsigned}.
	     * @function
	     * @param {number|!Long} numBits Number of bits
	     * @returns {!Long} Shifted Long
	     */
	    LongPrototype.shru = LongPrototype.shiftRightUnsigned;

	    /**
	     * Converts this Long to signed.
	     * @returns {!Long} Signed long
	     */
	    LongPrototype.toSigned = function toSigned() {
	        if (!this.unsigned)
	            return this;
	        return fromBits(this.low, this.high, false);
	    };

	    /**
	     * Converts this Long to unsigned.
	     * @returns {!Long} Unsigned long
	     */
	    LongPrototype.toUnsigned = function toUnsigned() {
	        if (this.unsigned)
	            return this;
	        return fromBits(this.low, this.high, true);
	    };

	    /**
	     * Converts this Long to its byte representation.
	     * @param {boolean=} le Whether little or big endian, defaults to big endian
	     * @returns {!Array.<number>} Byte representation
	     */
	    LongPrototype.toBytes = function(le) {
	        return le ? this.toBytesLE() : this.toBytesBE();
	    }

	    /**
	     * Converts this Long to its little endian byte representation.
	     * @returns {!Array.<number>} Little endian byte representation
	     */
	    LongPrototype.toBytesLE = function() {
	        var hi = this.high,
	            lo = this.low;
	        return [
	             lo         & 0xff,
	            (lo >>>  8) & 0xff,
	            (lo >>> 16) & 0xff,
	            (lo >>> 24) & 0xff,
	             hi         & 0xff,
	            (hi >>>  8) & 0xff,
	            (hi >>> 16) & 0xff,
	            (hi >>> 24) & 0xff
	        ];
	    }

	    /**
	     * Converts this Long to its big endian byte representation.
	     * @returns {!Array.<number>} Big endian byte representation
	     */
	    LongPrototype.toBytesBE = function() {
	        var hi = this.high,
	            lo = this.low;
	        return [
	            (hi >>> 24) & 0xff,
	            (hi >>> 16) & 0xff,
	            (hi >>>  8) & 0xff,
	             hi         & 0xff,
	            (lo >>> 24) & 0xff,
	            (lo >>> 16) & 0xff,
	            (lo >>>  8) & 0xff,
	             lo         & 0xff
	        ];
	    }

	    return Long;
	});

	/* WEBPACK VAR INJECTION */}.call(exports, __webpack_require__(5)(module)))

/***/ },
/* 8 */
/***/ function(module, exports) {

	/* (ignored) */

/***/ },
/* 9 */
/***/ function(module, exports) {

	/* (ignored) */

/***/ },
/* 10 */
/***/ function(module, exports) {

	'use strict';

	Object.defineProperty(exports, "__esModule", {
	  value: true
	});
	exports.debounce = debounce;
	exports.ajax = ajax;
	/**
	 * Returns a function, that, as long as it continues to be invoked, will not
	 * be triggered. The function will be called after it stops being called for
	 * N milliseconds. If `immediate` is passed, trigger the function on the
	 * leading edge, instead of the trailing.
	 */
	function debounce(func, wait, immediate) {
	  var timeout;

	  return function () {
	    var context = this,
	        args = arguments;

	    var later = function later() {
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
	function ajax(url, data, callback) {
	  try {
	    (function () {
	      var xhr = void 0;

	      if (window.XMLHttpRequest) {
	        xhr = new window.XMLHttpRequest();
	      } else if (window.ActiveXObject) {
	        xhr = new window.ActiveXObject('MSXML2.XMLHTTP.3.0');
	      }

	      xhr.open(data ? 'POST' : 'GET', url, true);
	      xhr.setRequestHeader('Content-Type', 'text/plain;charset=utf8');

	      xhr.onreadystatechange = function () {
	        if (xhr.readyState > 3 && callback) {
	          callback(xhr);
	        }
	      };

	      xhr.send(data);
	    })();
	  } catch (e) {
	    console.log(e);
	  }
	}

/***/ },
/* 11 */
/***/ function(module, exports) {

	module.exports = {
		"package": null,
		"messages": [
			{
				"name": "LogPrebidEvents",
				"fields": [
					{
						"rule": "optional",
						"type": "fixed64",
						"name": "timestamp",
						"id": 1
					},
					{
						"rule": "optional",
						"type": "string",
						"name": "remote_addr_macro",
						"id": 2
					},
					{
						"rule": "optional",
						"type": "string",
						"name": "user_agent_macro",
						"id": 3
					},
					{
						"rule": "optional",
						"type": "string",
						"name": "referer_url",
						"id": 4
					},
					{
						"rule": "optional",
						"type": "uint32",
						"name": "seller_member_id",
						"id": 5
					},
					{
						"rule": "repeated",
						"type": "Auction",
						"name": "auctions",
						"id": 6
					}
				],
				"messages": [
					{
						"name": "Auction",
						"fields": [
							{
								"rule": "optional",
								"type": "string",
								"name": "version",
								"id": 1
							},
							{
								"rule": "optional",
								"type": "fixed64",
								"name": "auction_init_timestamp",
								"id": 2
							},
							{
								"rule": "optional",
								"type": "string",
								"name": "prebid_auction_id",
								"id": 3
							},
							{
								"rule": "optional",
								"type": "uint32",
								"name": "configured_timeout_ms",
								"id": 4
							},
							{
								"rule": "repeated",
								"type": "AdUnit",
								"name": "ad_units",
								"id": 5
							}
						],
						"messages": [
							{
								"name": "AdUnit",
								"fields": [
									{
										"rule": "optional",
										"type": "string",
										"name": "ad_unit_code",
										"id": 1
									},
									{
										"rule": "repeated",
										"type": "Bid",
										"name": "bids",
										"id": 2
									}
								],
								"messages": [
									{
										"name": "Bid",
										"fields": [
											{
												"rule": "optional",
												"type": "string",
												"name": "bid_id",
												"id": 1
											},
											{
												"rule": "optional",
												"type": "double",
												"name": "price",
												"id": 2
											},
											{
												"rule": "optional",
												"type": "string",
												"name": "bidder_code",
												"id": 3
											},
											{
												"rule": "optional",
												"type": "string",
												"name": "bidder_ad_unit_id",
												"id": 4
											},
											{
												"rule": "optional",
												"type": "fixed64",
												"name": "request_timestamp",
												"id": 5
											},
											{
												"rule": "optional",
												"type": "fixed64",
												"name": "response_timestamp",
												"id": 6
											},
											{
												"rule": "optional",
												"type": "uint32",
												"name": "status_code",
												"id": 7
											},
											{
												"rule": "optional",
												"type": "Creative",
												"name": "creative",
												"id": 8
											}
										],
										"messages": [
											{
												"name": "Creative",
												"fields": [
													{
														"rule": "optional",
														"type": "string",
														"name": "creative_id",
														"id": 1
													},
													{
														"rule": "optional",
														"type": "uint32",
														"name": "width",
														"id": 2
													},
													{
														"rule": "optional",
														"type": "uint32",
														"name": "height",
														"id": 3
													},
													{
														"rule": "optional",
														"type": "string",
														"name": "brand",
														"id": 4
													}
												]
											}
										]
									}
								]
							}
						]
					}
				]
			}
		]
	};

/***/ },
/* 12 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

	var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; /** @module pbjs */

	var _prebidGlobal = __webpack_require__(13);

	var _utils = __webpack_require__(14);

	var _video = __webpack_require__(16);

	__webpack_require__(31);

	var _url = __webpack_require__(30);

	var _cpmBucketManager = __webpack_require__(24);

	function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

	var pbjs = (0, _prebidGlobal.getGlobal)();
	var CONSTANTS = __webpack_require__(15);
	var utils = __webpack_require__(14);
	var bidmanager = __webpack_require__(23);
	var adaptermanager = __webpack_require__(17);
	var bidfactory = __webpack_require__(25);
	var adloader = __webpack_require__(22);
	var events = __webpack_require__(20);
	var adserver = __webpack_require__(32);

	/* private variables */

	var objectType_function = 'function';
	var objectType_undefined = 'undefined';
	var objectType_object = 'object';
	var BID_WON = CONSTANTS.EVENTS.BID_WON;
	var AUCTION_END = CONSTANTS.EVENTS.AUCTION_END;

	var auctionRunning = false;
	var bidRequestQueue = [];
	var presetTargeting = [];
	var pbTargetingKeys = [];

	var eventValidators = {
	  bidWon: checkDefinedPlacement
	};

	/* Public vars */

	pbjs._bidsRequested = [];
	pbjs._bidsReceived = [];
	pbjs._winningBids = [];
	pbjs._adsReceived = [];
	pbjs._sendAllBids = false;

	pbjs.bidderSettings = pbjs.bidderSettings || {};

	//default timeout for all bids
	pbjs.bidderTimeout = pbjs.bidderTimeout || 3000;

	// current timeout set in `requestBids` or to default `bidderTimeout`
	pbjs.cbTimeout = pbjs.cbTimeout || 200;

	// timeout buffer to adjust for bidder CDN latency
	pbjs.timeoutBuffer = 200;

	pbjs.logging = pbjs.logging || false;

	//let the world know we are loaded
	pbjs.libLoaded = true;

	//version auto generated from build
	utils.logInfo('Prebid.js v0.14.0 loaded');

	//create adUnit array
	pbjs.adUnits = pbjs.adUnits || [];

	/**
	 * Command queue that functions will execute once prebid.js is loaded
	 * @param  {function} cmd Annoymous function to execute
	 * @alias module:pbjs.que.push
	 */
	pbjs.que.push = function (cmd) {
	  if ((typeof cmd === 'undefined' ? 'undefined' : _typeof(cmd)) === objectType_function) {
	    try {
	      cmd.call();
	    } catch (e) {
	      utils.logError('Error processing command :' + e.message);
	    }
	  } else {
	    utils.logError('Commands written into pbjs.que.push must wrapped in a function');
	  }
	};

	function processQue() {
	  for (var i = 0; i < pbjs.que.length; i++) {
	    if (_typeof(pbjs.que[i].called) === objectType_undefined) {
	      try {
	        pbjs.que[i].call();
	        pbjs.que[i].called = true;
	      } catch (e) {
	        utils.logError('Error processing command :', 'prebid.js', e);
	      }
	    }
	  }
	}

	function checkDefinedPlacement(id) {
	  var placementCodes = pbjs._bidsRequested.map(function (bidSet) {
	    return bidSet.bids.map(function (bid) {
	      return bid.placementCode;
	    });
	  }).reduce(_utils.flatten).filter(_utils.uniques);

	  if (!utils.contains(placementCodes, id)) {
	    utils.logError('The "' + id + '" placement is not defined.');
	    return;
	  }

	  return true;
	}

	function resetPresetTargeting() {
	  if ((0, _utils.isGptPubadsDefined)()) {
	    window.googletag.pubads().getSlots().forEach(function (slot) {
	      pbTargetingKeys.forEach(function (key) {
	        slot.setTargeting(key, null);
	      });
	    });
	  }
	}

	function setTargeting(targetingConfig) {
	  window.googletag.pubads().getSlots().forEach(function (slot) {
	    targetingConfig.filter(function (targeting) {
	      return Object.keys(targeting)[0] === slot.getAdUnitPath() || Object.keys(targeting)[0] === slot.getSlotElementId();
	    }).forEach(function (targeting) {
	      return targeting[Object.keys(targeting)[0]].forEach(function (key) {
	        key[Object.keys(key)[0]].map(function (value) {
	          utils.logMessage('Attempting to set key value for slot: ' + slot.getSlotElementId() + ' key: ' + Object.keys(key)[0] + ' value: ' + value);
	          return value;
	        }).forEach(function (value) {
	          slot.setTargeting(Object.keys(key)[0], value);
	        });
	      });
	    });
	  });
	}

	function isNotSetByPb(key) {
	  return pbTargetingKeys.indexOf(key) === -1;
	}

	function getPresetTargeting() {
	  if ((0, _utils.isGptPubadsDefined)()) {
	    presetTargeting = function getPresetTargeting() {
	      return window.googletag.pubads().getSlots().map(function (slot) {
	        return _defineProperty({}, slot.getAdUnitPath(), slot.getTargetingKeys().filter(isNotSetByPb).map(function (key) {
	          return _defineProperty({}, key, slot.getTargeting(key));
	        }));
	      });
	    }();
	  }
	}

	function getWinningBids(adUnitCode) {
	  // use the given adUnitCode as a filter if present or all adUnitCodes if not
	  var adUnitCodes = adUnitCode ? [adUnitCode] : pbjs.adUnits.map(function (adUnit) {
	    return adUnit.code;
	  });

	  return pbjs._bidsReceived.filter(function (bid) {
	    return adUnitCodes.includes(bid.adUnitCode);
	  }).filter(function (bid) {
	    return bid.cpm > 0;
	  }).map(function (bid) {
	    return bid.adUnitCode;
	  }).filter(_utils.uniques).map(function (adUnitCode) {
	    return pbjs._bidsReceived.filter(function (bid) {
	      return bid.adUnitCode === adUnitCode ? bid : null;
	    }).reduce(_utils.getHighestCpm, {
	      adUnitCode: adUnitCode,
	      cpm: 0,
	      adserverTargeting: {},
	      timeToRespond: 0
	    });
	  });
	}

	function getWinningBidTargeting() {
	  var winners = getWinningBids();

	  // winning bids with deals need an hb_deal targeting key
	  winners.filter(function (bid) {
	    return bid.dealId;
	  }).map(function (bid) {
	    return bid.adserverTargeting.hb_deal = bid.dealId;
	  });

	  winners = winners.map(function (winner) {
	    return _defineProperty({}, winner.adUnitCode, Object.keys(winner.adserverTargeting, function (key) {
	      return key;
	    }).map(function (key) {
	      return _defineProperty({}, key.substring(0, 20), [winner.adserverTargeting[key]]);
	    }));
	  });

	  return winners;
	}

	function getDealTargeting() {
	  return pbjs._bidsReceived.filter(function (bid) {
	    return bid.dealId;
	  }).map(function (bid) {
	    var dealKey = 'hb_deal_' + bid.bidderCode;
	    return _defineProperty({}, bid.adUnitCode, getTargetingMap(bid, CONSTANTS.TARGETING_KEYS).concat(_defineProperty({}, dealKey.substring(0, 20), [bid.adserverTargeting[dealKey]])));
	  });
	}

	/**
	 * Get custom targeting keys for bids that have `alwaysUseBid=true`.
	 */
	function getAlwaysUseBidTargeting() {
	  //in case using a custom standard key set, we'll capture those here
	  var standardKeys = bidmanager.getStandardBidderAdServerTargeting().map(function (targeting) {
	    return targeting.key;
	  });
	  //then append standard keys defined in the library.
	  standardKeys = standardKeys.concat(CONSTANTS.TARGETING_KEYS).filter(_utils.uniques);
	  return pbjs._bidsReceived.map(function (bid) {
	    if (bid.alwaysUseBid) {
	      return _defineProperty({}, bid.adUnitCode, Object.keys(bid.adserverTargeting, function (key) {
	        return key;
	      }).map(function (key) {
	        // Get only the non-standard keys of the losing bids, since we
	        // don't want to override the standard keys of the winning bid.
	        if (standardKeys.indexOf(key) > -1) {
	          return;
	        }

	        return _defineProperty({}, key.substring(0, 20), [bid.adserverTargeting[key]]);
	      }).filter(function (key) {
	        return key;
	      }));
	    }
	  }).filter(function (bid) {
	    return bid;
	  }); // removes empty elements in array;
	}

	function getBidLandscapeTargeting() {
	  var standardKeys = CONSTANTS.TARGETING_KEYS;

	  return pbjs._bidsReceived.map(function (bid) {
	    if (bid.adserverTargeting) {
	      return _defineProperty({}, bid.adUnitCode, getTargetingMap(bid, standardKeys));
	    }
	  }).filter(function (bid) {
	    return bid;
	  }); // removes empty elements in array
	}

	function getTargetingMap(bid, keys) {
	  return keys.map(function (key) {
	    return _defineProperty({}, (key + '_' + bid.bidderCode).substring(0, 20), [bid.adserverTargeting[key]]);
	  });
	}

	function getAllTargeting() {
	  // Get targeting for the winning bid. Add targeting for any bids that have
	  // `alwaysUseBid=true`. If sending all bids is enabled, add targeting for losing bids.
	  var targeting = getWinningBidTargeting().concat(getAlwaysUseBidTargeting()).concat(pbjs._sendAllBids ? getBidLandscapeTargeting() : []).concat(getDealTargeting());

	  //store a reference of the targeting keys
	  targeting.map(function (adUnitCode) {
	    Object.keys(adUnitCode).map(function (key) {
	      adUnitCode[key].map(function (targetKey) {
	        if (pbTargetingKeys.indexOf(Object.keys(targetKey)[0]) === -1) {
	          pbTargetingKeys = Object.keys(targetKey).concat(pbTargetingKeys);
	        }
	      });
	    });
	  });
	  return targeting;
	}

	function markComplete(adObject) {
	  pbjs._bidsRequested.filter(function (request) {
	    return request.requestId === adObject.requestId;
	  }).forEach(function (request) {
	    return request.bids.filter(function (bid) {
	      return bid.placementCode === adObject.adUnitCode;
	    }).forEach(function (bid) {
	      return bid.complete = true;
	    });
	  });

	  pbjs._bidsReceived.filter(function (bid) {
	    return bid.requestId === adObject.requestId && bid.adUnitCode === adObject.adUnitCode;
	  }).forEach(function (bid) {
	    return bid.complete = true;
	  });
	}

	function removeComplete() {
	  var requests = pbjs._bidsRequested;
	  var responses = pbjs._bidsReceived;

	  requests.map(function (request) {
	    return request.bids.filter(function (bid) {
	      return bid.complete;
	    });
	  }).forEach(function (request) {
	    return requests.splice(requests.indexOf(request), 1);
	  });

	  responses.filter(function (bid) {
	    return bid.complete;
	  }).forEach(function (bid) {
	    return responses.splice(responses.indexOf(bid), 1);
	  });

	  // also remove bids that have an empty or error status so known as not pending for render
	  responses.filter(function (bid) {
	    return bid.getStatusCode && bid.getStatusCode() === 2;
	  }).forEach(function (bid) {
	    return responses.splice(responses.indexOf(bid), 1);
	  });
	}

	function setRenderSize(doc, width, height) {
	  if (doc.defaultView && doc.defaultView.frameElement) {
	    doc.defaultView.frameElement.width = width;
	    doc.defaultView.frameElement.height = height;
	  }
	}

	//////////////////////////////////
	//                              //
	//    Start Public APIs         //
	//                              //
	//////////////////////////////////

	/**
	 * This function returns the query string targeting parameters available at this moment for a given ad unit. Note that some bidder's response may not have been received if you call this function too quickly after the requests are sent.
	 * @param  {string} [adunitCode] adUnitCode to get the bid responses for
	 * @alias module:pbjs.getAdserverTargetingForAdUnitCodeStr
	 * @return {array}  returnObj return bids array
	 */
	pbjs.getAdserverTargetingForAdUnitCodeStr = function (adunitCode) {
	  utils.logInfo('Invoking pbjs.getAdserverTargetingForAdUnitCodeStr', arguments);

	  // call to retrieve bids array
	  if (adunitCode) {
	    var res = pbjs.getAdserverTargetingForAdUnitCode(adunitCode);
	    return utils.transformAdServerTargetingObj(res);
	  } else {
	    utils.logMessage('Need to call getAdserverTargetingForAdUnitCodeStr with adunitCode');
	  }
	};

	/**
	* This function returns the query string targeting parameters available at this moment for a given ad unit. Note that some bidder's response may not have been received if you call this function too quickly after the requests are sent.
	 * @param adUnitCode {string} adUnitCode to get the bid responses for
	 * @returns {object}  returnObj return bids
	 */
	pbjs.getAdserverTargetingForAdUnitCode = function (adUnitCode) {
	  utils.logInfo('Invoking pbjs.getAdserverTargetingForAdUnitCode', arguments);

	  return getAllTargeting().filter(function (targeting) {
	    return (0, _utils.getKeys)(targeting)[0] === adUnitCode;
	  }).map(function (targeting) {
	    return _defineProperty({}, Object.keys(targeting)[0], targeting[Object.keys(targeting)[0]].map(function (target) {
	      return _defineProperty({}, Object.keys(target)[0], target[Object.keys(target)[0]].join(', '));
	    }).reduce(function (p, c) {
	      return _extends(c, p);
	    }, {}));
	  }).reduce(function (accumulator, targeting) {
	    var key = Object.keys(targeting)[0];
	    accumulator[key] = _extends({}, accumulator[key], targeting[key]);
	    return accumulator;
	  }, {})[adUnitCode];
	};

	/**
	 * returns all ad server targeting for all ad units
	 * @return {object} Map of adUnitCodes and targeting values []
	 * @alias module:pbjs.getAdserverTargeting
	 */

	pbjs.getAdserverTargeting = function () {
	  utils.logInfo('Invoking pbjs.getAdserverTargeting', arguments);
	  return getAllTargeting().map(function (targeting) {
	    return _defineProperty({}, Object.keys(targeting)[0], targeting[Object.keys(targeting)[0]].map(function (target) {
	      return _defineProperty({}, Object.keys(target)[0], target[Object.keys(target)[0]].join(', '));
	    }).reduce(function (p, c) {
	      return _extends(c, p);
	    }, {}));
	  }).reduce(function (accumulator, targeting) {
	    var key = Object.keys(targeting)[0];
	    accumulator[key] = _extends({}, accumulator[key], targeting[key]);
	    return accumulator;
	  }, {});
	};

	/**
	 * This function returns the bid responses at the given moment.
	 * @alias module:pbjs.getBidResponses
	 * @return {object}            map | object that contains the bidResponses
	 */

	pbjs.getBidResponses = function () {
	  utils.logInfo('Invoking pbjs.getBidResponses', arguments);
	  var responses = pbjs._bidsReceived;

	  // find the last requested id to get responses for most recent auction only
	  var currentRequestId = responses && responses.length && responses[responses.length - 1].requestId;

	  return responses.map(function (bid) {
	    return bid.adUnitCode;
	  }).filter(_utils.uniques).map(function (adUnitCode) {
	    return responses.filter(function (bid) {
	      return bid.requestId === currentRequestId && bid.adUnitCode === adUnitCode;
	    });
	  }).filter(function (bids) {
	    return bids && bids[0] && bids[0].adUnitCode;
	  }).map(function (bids) {
	    return _defineProperty({}, bids[0].adUnitCode, { bids: bids });
	  }).reduce(function (a, b) {
	    return _extends(a, b);
	  }, {});
	};

	/**
	 * Returns bidResponses for the specified adUnitCode
	 * @param  {String} adUnitCode adUnitCode
	 * @alias module:pbjs.getBidResponsesForAdUnitCode
	 * @return {Object}            bidResponse object
	 */

	pbjs.getBidResponsesForAdUnitCode = function (adUnitCode) {
	  var bids = pbjs._bidsReceived.filter(function (bid) {
	    return bid.adUnitCode === adUnitCode;
	  });
	  return {
	    bids: bids
	  };
	};

	/**
	 * Set query string targeting on all GPT ad units.
	 * @alias module:pbjs.setTargetingForGPTAsync
	 */
	pbjs.setTargetingForGPTAsync = function () {
	  utils.logInfo('Invoking pbjs.setTargetingForGPTAsync', arguments);
	  if (!(0, _utils.isGptPubadsDefined)()) {
	    utils.logError('window.googletag is not defined on the page');
	    return;
	  }

	  //first reset any old targeting
	  getPresetTargeting();
	  resetPresetTargeting();
	  //now set new targeting keys
	  setTargeting(getAllTargeting());
	};

	/**
	 * Returns a bool if all the bids have returned or timed out
	 * @alias module:pbjs.allBidsAvailable
	 * @return {bool} all bids available
	 */
	pbjs.allBidsAvailable = function () {
	  utils.logInfo('Invoking pbjs.allBidsAvailable', arguments);
	  return bidmanager.bidsBackAll();
	};

	/**
	 * This function will render the ad (based on params) in the given iframe document passed through. Note that doc SHOULD NOT be the parent document page as we can't doc.write() asynchrounsly
	 * @param  {object} doc document
	 * @param  {string} id bid id to locate the ad
	 * @alias module:pbjs.renderAd
	 */
	pbjs.renderAd = function (doc, id) {
	  utils.logInfo('Invoking pbjs.renderAd', arguments);
	  utils.logMessage('Calling renderAd with adId :' + id);
	  if (doc && id) {
	    try {
	      //lookup ad by ad Id
	      var adObject = pbjs._bidsReceived.find(function (bid) {
	        return bid.adId === id;
	      });
	      if (adObject) {
	        //save winning bids
	        pbjs._winningBids.push(adObject);
	        //emit 'bid won' event here
	        events.emit(BID_WON, adObject);

	        // mark bid requests and responses for this placement in this auction as "complete"
	        markComplete(adObject);
	        var height = adObject.height;
	        var width = adObject.width;
	        var url = adObject.adUrl;
	        var ad = adObject.ad;

	        if (doc === document || adObject.mediaType === 'video') {
	          utils.logError('Error trying to write ad. Ad render call ad id ' + id + ' was prevented from writing to the main document.');
	        } else if (ad) {
	          doc.write(ad);
	          doc.close();
	          setRenderSize(doc, width, height);
	        } else if (url) {
	          doc.write('<IFRAME SRC="' + url + '" FRAMEBORDER="0" SCROLLING="no" MARGINHEIGHT="0" MARGINWIDTH="0" TOPMARGIN="0" LEFTMARGIN="0" ALLOWTRANSPARENCY="true" WIDTH="' + width + '" HEIGHT="' + height + '"></IFRAME>');
	          doc.close();
	          setRenderSize(doc, width, height);
	        } else {
	          utils.logError('Error trying to write ad. No ad for bid response id: ' + id);
	        }
	      } else {
	        utils.logError('Error trying to write ad. Cannot find ad by given id : ' + id);
	      }
	    } catch (e) {
	      utils.logError('Error trying to write ad Id :' + id + ' to the page:' + e.message);
	    }
	  } else {
	    utils.logError('Error trying to write ad Id :' + id + ' to the page. Missing document or adId');
	  }
	};

	/**
	 * Remove adUnit from the pbjs configuration
	 * @param  {String} adUnitCode the adUnitCode to remove
	 * @alias module:pbjs.removeAdUnit
	 */
	pbjs.removeAdUnit = function (adUnitCode) {
	  utils.logInfo('Invoking pbjs.removeAdUnit', arguments);
	  if (adUnitCode) {
	    for (var i = 0; i < pbjs.adUnits.length; i++) {
	      if (pbjs.adUnits[i].code === adUnitCode) {
	        pbjs.adUnits.splice(i, 1);
	      }
	    }
	  }
	};

	pbjs.clearAuction = function () {
	  auctionRunning = false;
	  utils.logMessage('Prebid auction cleared');
	  events.emit(AUCTION_END);
	  if (bidRequestQueue.length) {
	    bidRequestQueue.shift()();
	  }
	};

	/**
	 *
	 * @param bidsBackHandler
	 * @param timeout
	 * @param adUnits
	 * @param adUnitCodes
	 */
	pbjs.requestBids = function (_ref15) {
	  var bidsBackHandler = _ref15.bidsBackHandler,
	      timeout = _ref15.timeout,
	      adUnits = _ref15.adUnits,
	      adUnitCodes = _ref15.adUnitCodes;

	  var cbTimeout = pbjs.cbTimeout = timeout || pbjs.bidderTimeout;
	  adUnits = adUnits || pbjs.adUnits;

	  // if specific adUnitCodes filter adUnits for those codes
	  if (adUnitCodes && adUnitCodes.length) {
	    adUnits = adUnits.filter(function (adUnit) {
	      return adUnitCodes.includes(adUnit.code);
	    });
	  }

	  // for video-enabled adUnits, only request bids if all bidders support video
	  var invalidVideoAdUnits = adUnits.filter(_video.videoAdUnit).filter(_video.hasNonVideoBidder);
	  invalidVideoAdUnits.forEach(function (adUnit) {
	    utils.logError('adUnit ' + adUnit.code + ' has \'mediaType\' set to \'video\' but contains a bidder that doesn\'t support video. No Prebid demand requests will be triggered for this adUnit.');
	    for (var i = 0; i < adUnits.length; i++) {
	      if (adUnits[i].code === adUnit.code) {
	        adUnits.splice(i, 1);
	      }
	    }
	  });

	  if (auctionRunning) {
	    bidRequestQueue.push(function () {
	      pbjs.requestBids({ bidsBackHandler: bidsBackHandler, timeout: cbTimeout, adUnits: adUnits });
	    });
	    return;
	  }
	  auctionRunning = true;
	  removeComplete();

	  utils.logInfo('Invoking pbjs.requestBids', arguments);

	  if (!adUnits || adUnits.length === 0) {
	    utils.logMessage('No adUnits configured. No bids requested.');
	    if ((typeof bidsBackHandler === 'undefined' ? 'undefined' : _typeof(bidsBackHandler)) === objectType_function) {
	      bidmanager.addOneTimeCallback(bidsBackHandler, false);
	    }
	    bidmanager.executeCallback();
	    return;
	  }

	  //set timeout for all bids
	  var timedOut = true;
	  var timeoutCallback = bidmanager.executeCallback.bind(bidmanager, timedOut);
	  var timer = setTimeout(timeoutCallback, cbTimeout);
	  if ((typeof bidsBackHandler === 'undefined' ? 'undefined' : _typeof(bidsBackHandler)) === objectType_function) {
	    bidmanager.addOneTimeCallback(bidsBackHandler, timer);
	  }

	  adaptermanager.callBids({ adUnits: adUnits, adUnitCodes: adUnitCodes, cbTimeout: cbTimeout });
	  if (pbjs._bidsRequested.length === 0) {
	    bidmanager.executeCallback();
	  }
	};

	/**
	 *
	 * Add adunit(s)
	 * @param {Array|String} adUnitArr Array of adUnits or single adUnit Object.
	 * @alias module:pbjs.addAdUnits
	 */
	pbjs.addAdUnits = function (adUnitArr) {
	  utils.logInfo('Invoking pbjs.addAdUnits', arguments);
	  if (utils.isArray(adUnitArr)) {
	    //append array to existing
	    pbjs.adUnits.push.apply(pbjs.adUnits, adUnitArr);
	  } else if ((typeof adUnitArr === 'undefined' ? 'undefined' : _typeof(adUnitArr)) === objectType_object) {
	    pbjs.adUnits.push(adUnitArr);
	  }
	};

	pbjs.registerEnterpriseEvents = function ({ events, adUnits }, data) {

    if (events && events.length) {
      events.forEach(event => {
        const { type, trigger, target, targetGroup } = event;
         Array.prototype.slice.call(document.querySelectorAll(trigger))
          .forEach(trigger => trigger.addEventListener(type, ev => {
            const adUnits = data.find(config => config.group === targetGroup).adUnits;
            pbjs.requestBids(
              {
                adUnits,
                bidsBackHandler: () => {
                  pbjs.setTargetingForGPTAsync();
                  googletag.pubads().refresh(adUnits.map(unit => unit.code));
                }});
        }));
      });
    }
  };
	/**
	 * @param {String} event the name of the event
	 * @param {Function} handler a callback to set on event
	 * @param {String} id an identifier in the context of the event
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
	pbjs.onEvent = function (event, handler, id) {
	  utils.logInfo('Invoking pbjs.onEvent', arguments);
	  if (!utils.isFn(handler)) {
	    utils.logError('The event handler provided is not a function and was not set on event "' + event + '".');
	    return;
	  }

	  if (id && !eventValidators[event].call(null, id)) {
	    utils.logError('The id provided is not valid for event "' + event + '" and no handler was set.');
	    return;
	  }

	  events.on(event, handler, id);
	};

	/**
	 * @param {String} event the name of the event
	 * @param {Function} handler a callback to remove from the event
	 * @param {String} id an identifier in the context of the event (see `pbjs.onEvent`)
	 */
	pbjs.offEvent = function (event, handler, id) {
	  utils.logInfo('Invoking pbjs.offEvent', arguments);
	  if (id && !eventValidators[event].call(null, id)) {
	    return;
	  }

	  events.off(event, handler, id);
	};

	/**
	 * Add a callback event
	 * @param {String} eventStr event to attach callback to Options: "allRequestedBidsBack" | "adUnitBidsBack"
	 * @param {Function} func  function to execute. Paramaters passed into the function: (bidResObj), [adUnitCode]);
	 * @alias module:pbjs.addCallback
	 * @returns {String} id for callback
	 */
	pbjs.addCallback = function (eventStr, func) {
	  utils.logInfo('Invoking pbjs.addCallback', arguments);
	  var id = null;
	  if (!eventStr || !func || (typeof func === 'undefined' ? 'undefined' : _typeof(func)) !== objectType_function) {
	    utils.logError('error registering callback. Check method signature');
	    return id;
	  }

	  id = utils.getUniqueIdentifierStr;
	  bidmanager.addCallback(id, func, eventStr);
	  return id;
	};

	/**
	 * Remove a callback event
	 * //@param {string} cbId id of the callback to remove
	 * @alias module:pbjs.removeCallback
	 * @returns {String} id for callback
	 */
	pbjs.removeCallback = function () /* cbId */{
	  //todo
	  return null;
	};

	/**
	 * Wrapper to register bidderAdapter externally (adaptermanager.registerBidAdapter())
	 * @param  {[type]} bidderAdaptor [description]
	 * @param  {[type]} bidderCode    [description]
	 * @return {[type]}               [description]
	 */
	pbjs.registerBidAdapter = function (bidderAdaptor, bidderCode) {
	  utils.logInfo('Invoking pbjs.registerBidAdapter', arguments);
	  try {
	    adaptermanager.registerBidAdapter(bidderAdaptor(), bidderCode);
	  } catch (e) {
	    utils.logError('Error registering bidder adapter : ' + e.message);
	  }
	};

	/**
	 * Wrapper to register analyticsAdapter externally (adaptermanager.registerAnalyticsAdapter())
	 * @param  {[type]} options [description]
	 */
	pbjs.registerAnalyticsAdapter = function (options) {
	  utils.logInfo('Invoking pbjs.registerAnalyticsAdapter', arguments);
	  try {
	    adaptermanager.registerAnalyticsAdapter(options);
	  } catch (e) {
	    utils.logError('Error registering analytics adapter : ' + e.message);
	  }
	};

	pbjs.bidsAvailableForAdapter = function (bidderCode) {
	  utils.logInfo('Invoking pbjs.bidsAvailableForAdapter', arguments);

	  pbjs._bidsRequested.find(function (bidderRequest) {
	    return bidderRequest.bidderCode === bidderCode;
	  }).bids.map(function (bid) {
	    return _extends(bid, bidfactory.createBid(1), {
	      bidderCode: bidderCode,
	      adUnitCode: bid.placementCode
	    });
	  }).map(function (bid) {
	    return pbjs._bidsReceived.push(bid);
	  });
	};

	/**
	 * Wrapper to bidfactory.createBid()
	 * @param  {[type]} statusCode [description]
	 * @return {[type]}            [description]
	 */
	pbjs.createBid = function (statusCode) {
	  utils.logInfo('Invoking pbjs.createBid', arguments);
	  return bidfactory.createBid(statusCode);
	};

	/**
	 * Wrapper to bidmanager.addBidResponse
	 * @param {[type]} adUnitCode [description]
	 * @param {[type]} bid        [description]
	 */
	pbjs.addBidResponse = function (adUnitCode, bid) {
	  utils.logInfo('Invoking pbjs.addBidResponse', arguments);
	  bidmanager.addBidResponse(adUnitCode, bid);
	};

	/**
	 * Wrapper to adloader.loadScript
	 * @param  {[type]}   tagSrc   [description]
	 * @param  {Function} callback [description]
	 * @return {[type]}            [description]
	 */
	pbjs.loadScript = function (tagSrc, callback, useCache) {
	  utils.logInfo('Invoking pbjs.loadScript', arguments);
	  adloader.loadScript(tagSrc, callback, useCache);
	};

	/**
	 * Will enable sendinga prebid.js to data provider specified
	 * @param  {object} config object {provider : 'string', options : {}}
	 */
	pbjs.enableAnalytics = function (config) {
	  if (config && !utils.isEmpty(config)) {
	    utils.logInfo('Invoking pbjs.enableAnalytics for: ', config);
	    adaptermanager.enableAnalytics(config);
	  } else {
	    utils.logError('pbjs.enableAnalytics should be called with option {}');
	  }
	};

	pbjs.aliasBidder = function (bidderCode, alias) {
	  utils.logInfo('Invoking pbjs.aliasBidder', arguments);
	  if (bidderCode && alias) {
	    adaptermanager.aliasBidAdapter(bidderCode, alias);
	  } else {
	    utils.logError('bidderCode and alias must be passed as arguments', 'pbjs.aliasBidder');
	  }
	};

	/**
	 * Sets a default price granularity scheme.
	 * @param {String|Object} granularity - the granularity scheme.
	 * "low": $0.50 increments, capped at $5 CPM
	 * "medium": $0.10 increments, capped at $20 CPM (the default)
	 * "high": $0.01 increments, capped at $20 CPM
	 * "auto": Applies a sliding scale to determine granularity
	 * "dense": Like "auto", but the bid price granularity uses smaller increments, especially at lower CPMs
	 *
	 * Alternatively a custom object can be specified:
	 * { "buckets" : [{"min" : 0,"max" : 20,"increment" : 0.1,"cap" : true}]};
	 * See http://prebid.org/dev-docs/publisher-api-reference.html#module_pbjs.setPriceGranularity for more details
	 */
	pbjs.setPriceGranularity = function (granularity) {
	  utils.logInfo('Invoking pbjs.setPriceGranularity', arguments);
	  if (!granularity) {
	    utils.logError('Prebid Error: no value passed to `setPriceGranularity()`');
	    return;
	  }
	  if (typeof granularity === 'string') {
	    bidmanager.setPriceGranularity(granularity);
	  } else if ((typeof granularity === 'undefined' ? 'undefined' : _typeof(granularity)) === 'object') {
	    if (!(0, _cpmBucketManager.isValidePriceConfig)(granularity)) {
	      utils.logError('Invalid custom price value passed to `setPriceGranularity()`');
	      return;
	    }
	    bidmanager.setCustomPriceBucket(granularity);
	    bidmanager.setPriceGranularity(CONSTANTS.GRANULARITY_OPTIONS.CUSTOM);
	    utils.logMessage('Using custom price granularity');
	  }
	};

	pbjs.enableSendAllBids = function () {
	  pbjs._sendAllBids = true;
	};

	pbjs.getAllWinningBids = function () {
	  return pbjs._winningBids;
	};

	/**
	 * Build master video tag from publishers adserver tag
	 * @param {string} adserverTag default url
	 * @param {object} options options for video tag
	 */
	pbjs.buildMasterVideoTagFromAdserverTag = function (adserverTag, options) {
	  utils.logInfo('Invoking pbjs.buildMasterVideoTagFromAdserverTag', arguments);
	  var urlComponents = (0, _url.parse)(adserverTag);

	  //return original adserverTag if no bids received
	  if (pbjs._bidsReceived.length === 0) {
	    return adserverTag;
	  }

	  var masterTag = '';
	  if (options.adserver.toLowerCase() === 'dfp') {
	    var dfpAdserverObj = adserver.dfpAdserver(options, urlComponents);
	    if (!dfpAdserverObj.verifyAdserverTag()) {
	      utils.logError('Invalid adserverTag, required google params are missing in query string');
	    }
	    dfpAdserverObj.appendQueryParams();
	    masterTag = (0, _url.format)(dfpAdserverObj.urlComponents);
	  } else {
	    utils.logError('Only DFP adserver is supported');
	    return;
	  }
	  return masterTag;
	};

	/**
	 * Set the order bidders are called in. If not set, the bidders are called in
	 * the order they are defined wihin the adUnit.bids array
	 * @param {string} order - Order to call bidders in. Currently the only possible value
	 * is 'random', which randomly shuffles the order
	 */
	pbjs.setBidderSequence = function (order) {
	  if (order === CONSTANTS.ORDER.RANDOM) {
	    adaptermanager.setBidderSequence(CONSTANTS.ORDER.RANDOM);
	  }
	};

	/**
	 * Get array of highest cpm bids for all adUnits, or highest cpm bid
	 * object for the given adUnit
	 * @param {string} adUnitCode - optional ad unit code
	 * @return {array} array containing highest cpm bid object(s)
	 */
	pbjs.getHighestCpmBids = function (adUnitCode) {
	  return getWinningBids(adUnitCode);
	};

	processQue();

/***/ },
/* 13 */
/***/ function(module, exports) {

	"use strict";

	Object.defineProperty(exports, "__esModule", {
	  value: true
	});
	exports.getGlobal = getGlobal;
	// if pbjs already exists in global document scope, use it, if not, create the object
	// global defination should happen BEFORE imports to avoid global undefined errors.
	window.pbjs = window.pbjs || {};
	window.pbjs.que = window.pbjs.que || [];

	function getGlobal() {
	  return window.pbjs;
	}

/***/ },
/* 14 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	Object.defineProperty(exports, "__esModule", {
	  value: true
	});

	var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

	exports.uniques = uniques;
	exports.flatten = flatten;
	exports.getBidRequest = getBidRequest;
	exports.getKeys = getKeys;
	exports.getValue = getValue;
	exports.getBidderCodes = getBidderCodes;
	exports.isGptPubadsDefined = isGptPubadsDefined;
	exports.getHighestCpm = getHighestCpm;
	exports.shuffle = shuffle;
	var CONSTANTS = __webpack_require__(15);

	var objectType_object = 'object';
	var objectType_string = 'string';
	var objectType_number = 'number';

	var _loggingChecked = false;

	var t_Arr = 'Array';
	var t_Str = 'String';
	var t_Fn = 'Function';
	var t_Numb = 'Number';
	var toString = Object.prototype.toString;
	var infoLogger = null;
	try {
	  infoLogger = console.info.bind(window.console);
	} catch (e) {}

	/*
	 *   Substitutes into a string from a given map using the token
	 *   Usage
	 *   var str = 'text %%REPLACE%% this text with %%SOMETHING%%';
	 *   var map = {};
	 *   map['replace'] = 'it was subbed';
	 *   map['something'] = 'something else';
	 *   console.log(replaceTokenInString(str, map, '%%')); => "text it was subbed this text with something else"
	 */
	exports.replaceTokenInString = function (str, map, token) {
	  this._each(map, function (value, key) {
	    value = value === undefined ? '' : value;

	    var keyString = token + key.toUpperCase() + token;
	    var re = new RegExp(keyString, 'g');

	    str = str.replace(re, value);
	  });

	  return str;
	};

	/* utility method to get incremental integer starting from 1 */
	var getIncrementalInteger = function () {
	  var count = 0;
	  return function () {
	    count++;
	    return count;
	  };
	}();

	function _getUniqueIdentifierStr() {
	  return getIncrementalInteger() + Math.random().toString(16).substr(2);
	}

	//generate a random string (to be used as a dynamic JSONP callback)
	exports.getUniqueIdentifierStr = _getUniqueIdentifierStr;

	/**
	 * Returns a random v4 UUID of the form xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx,
	 * where each x is replaced with a random hexadecimal digit from 0 to f,
	 * and y is replaced with a random hexadecimal digit from 8 to b.
	 * https://gist.github.com/jed/982883 via node-uuid
	 */
	exports.generateUUID = function generateUUID(placeholder) {
	  return placeholder ? (placeholder ^ Math.random() * 16 >> placeholder / 4).toString(16) : ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, generateUUID);
	};

	exports.getBidIdParamater = function (key, paramsObj) {
	  if (paramsObj && paramsObj[key]) {
	    return paramsObj[key];
	  }

	  return '';
	};

	exports.tryAppendQueryString = function (existingUrl, key, value) {
	  if (value) {
	    return existingUrl += key + '=' + encodeURIComponent(value) + '&';
	  }

	  return existingUrl;
	};

	//parse a query string object passed in bid params
	//bid params should be an object such as {key: "value", key1 : "value1"}
	exports.parseQueryStringParameters = function (queryObj) {
	  var result = '';
	  for (var k in queryObj) {
	    if (queryObj.hasOwnProperty(k)) result += k + '=' + encodeURIComponent(queryObj[k]) + '&';
	  }

	  return result;
	};

	//transform an AdServer targeting bids into a query string to send to the adserver
	exports.transformAdServerTargetingObj = function (targeting) {
	  // we expect to receive targeting for a single slot at a time
	  if (targeting && Object.getOwnPropertyNames(targeting).length > 0) {

	    return getKeys(targeting).map(function (key) {
	      return key + '=' + encodeURIComponent(getValue(targeting, key));
	    }).join('&');
	  } else {
	    return '';
	  }
	};

	//Copy all of the properties in the source objects over to the target object
	//return the target object.
	exports.extend = function (target, source) {
	  target = target || {};

	  this._each(source, function (value, prop) {
	    if (_typeof(source[prop]) === objectType_object) {
	      target[prop] = this.extend(target[prop], source[prop]);
	    } else {
	      target[prop] = source[prop];
	    }
	  });

	  return target;
	};

	/**
	 * Parse a GPT-Style general size Array like `[[300, 250]]` or `"300x250,970x90"` into an array of sizes `["300x250"]` or '['300x250', '970x90']'
	 * @param  {array[array|number]} sizeObj Input array or double array [300,250] or [[300,250], [728,90]]
	 * @return {array[string]}  Array of strings like `["300x250"]` or `["300x250", "728x90"]`
	 */
	exports.parseSizesInput = function (sizeObj) {
	  var parsedSizes = [];

	  //if a string for now we can assume it is a single size, like "300x250"
	  if ((typeof sizeObj === 'undefined' ? 'undefined' : _typeof(sizeObj)) === objectType_string) {
	    //multiple sizes will be comma-separated
	    var sizes = sizeObj.split(',');

	    //regular expression to match strigns like 300x250
	    //start of line, at least 1 number, an "x" , then at least 1 number, and the then end of the line
	    var sizeRegex = /^(\d)+x(\d)+$/i;
	    if (sizes) {
	      for (var curSizePos in sizes) {
	        if (hasOwn(sizes, curSizePos) && sizes[curSizePos].match(sizeRegex)) {
	          parsedSizes.push(sizes[curSizePos]);
	        }
	      }
	    }
	  } else if ((typeof sizeObj === 'undefined' ? 'undefined' : _typeof(sizeObj)) === objectType_object) {
	    var sizeArrayLength = sizeObj.length;

	    //don't process empty array
	    if (sizeArrayLength > 0) {
	      //if we are a 2 item array of 2 numbers, we must be a SingleSize array
	      if (sizeArrayLength === 2 && _typeof(sizeObj[0]) === objectType_number && _typeof(sizeObj[1]) === objectType_number) {
	        parsedSizes.push(this.parseGPTSingleSizeArray(sizeObj));
	      } else {
	        //otherwise, we must be a MultiSize array
	        for (var i = 0; i < sizeArrayLength; i++) {
	          parsedSizes.push(this.parseGPTSingleSizeArray(sizeObj[i]));
	        }
	      }
	    }
	  }

	  return parsedSizes;
	};

	//parse a GPT style sigle size array, (i.e [300,250])
	//into an AppNexus style string, (i.e. 300x250)
	exports.parseGPTSingleSizeArray = function (singleSize) {
	  //if we aren't exactly 2 items in this array, it is invalid
	  if (this.isArray(singleSize) && singleSize.length === 2 && !isNaN(singleSize[0]) && !isNaN(singleSize[1])) {
	    return singleSize[0] + 'x' + singleSize[1];
	  }
	};

	exports.getTopWindowLocation = function () {
	  try {
	    return window.top.location;
	  } catch (e) {
	    return window.location;
	  }
	};

	exports.getTopWindowUrl = function () {
	  return this.getTopWindowLocation().href;
	};

	exports.logWarn = function (msg) {
	  if (debugTurnedOn() && console.warn) {
	    console.warn('WARNING: ' + msg);
	  }
	};

	exports.logInfo = function (msg, args) {
	  if (debugTurnedOn() && hasConsoleLogger()) {
	    if (infoLogger) {
	      if (!args || args.length === 0) {
	        args = '';
	      }

	      infoLogger('INFO: ' + msg + (args === '' ? '' : ' : params : '), args);
	    }
	  }
	};

	exports.logMessage = function (msg) {
	  if (debugTurnedOn() && hasConsoleLogger()) {
	    console.log('MESSAGE: ' + msg);
	  }
	};

	function hasConsoleLogger() {
	  return window.console && window.console.log;
	}

	exports.hasConsoleLogger = hasConsoleLogger;

	var errLogFn = function (hasLogger) {
	  if (!hasLogger) return '';
	  return window.console.error ? 'error' : 'log';
	}(hasConsoleLogger());

	var debugTurnedOn = function debugTurnedOn() {
	  if (pbjs.logging === false && _loggingChecked === false) {
	    pbjs.logging = getParameterByName(CONSTANTS.DEBUG_MODE).toUpperCase() === 'TRUE';
	    _loggingChecked = true;
	  }

	  return !!pbjs.logging;
	};

	exports.debugTurnedOn = debugTurnedOn;

	exports.logError = function (msg, code, exception) {
	  var errCode = code || 'ERROR';
	  if (debugTurnedOn() && hasConsoleLogger()) {
	    console[errLogFn](console, errCode + ': ' + msg, exception || '');
	  }
	};

	exports.createInvisibleIframe = function _createInvisibleIframe() {
	  var f = document.createElement('iframe');
	  f.id = _getUniqueIdentifierStr();
	  f.height = 0;
	  f.width = 0;
	  f.border = '0px';
	  f.hspace = '0';
	  f.vspace = '0';
	  f.marginWidth = '0';
	  f.marginHeight = '0';
	  f.style.border = '0';
	  f.scrolling = 'no';
	  f.frameBorder = '0';
	  f.src = 'about:blank';
	  f.style.display = 'none';
	  return f;
	};

	/*
	 *   Check if a given parameter name exists in query string
	 *   and if it does return the value
	 */
	var getParameterByName = function getParameterByName(name) {
	  var regexS = '[\\?&]' + name + '=([^&#]*)';
	  var regex = new RegExp(regexS);
	  var results = regex.exec(window.location.search);
	  if (results === null) {
	    return '';
	  }

	  return decodeURIComponent(results[1].replace(/\+/g, ' '));
	};

	/**
	 * This function validates paramaters.
	 * @param  {object[string]} paramObj          [description]
	 * @param  {string[]} requiredParamsArr [description]
	 * @return {bool}                   Bool if paramaters are valid
	 */
	exports.hasValidBidRequest = function (paramObj, requiredParamsArr, adapter) {
	  var found = false;

	  function findParam(value, key) {
	    if (key === requiredParamsArr[i]) {
	      found = true;
	    }
	  }

	  for (var i = 0; i < requiredParamsArr.length; i++) {
	    found = false;

	    this._each(paramObj, findParam);

	    if (!found) {
	      this.logError('Params are missing for bid request. One of these required paramaters are missing: ' + requiredParamsArr, adapter);
	      return false;
	    }
	  }

	  return true;
	};

	// Handle addEventListener gracefully in older browsers
	exports.addEventHandler = function (element, event, func) {
	  if (element.addEventListener) {
	    element.addEventListener(event, func, true);
	  } else if (element.attachEvent) {
	    element.attachEvent('on' + event, func);
	  }
	};
	/**
	 * Return if the object is of the
	 * given type.
	 * @param {*} object to test
	 * @param {String} _t type string (e.g., Array)
	 * @return {Boolean} if object is of type _t
	 */
	exports.isA = function (object, _t) {
	  return toString.call(object) === '[object ' + _t + ']';
	};

	exports.isFn = function (object) {
	  return this.isA(object, t_Fn);
	};

	exports.isStr = function (object) {
	  return this.isA(object, t_Str);
	};

	exports.isArray = function (object) {
	  return this.isA(object, t_Arr);
	};

	exports.isNumber = function (object) {
	  return this.isA(object, t_Numb);
	};

	/**
	 * Return if the object is "empty";
	 * this includes falsey, no keys, or no items at indices
	 * @param {*} object object to test
	 * @return {Boolean} if object is empty
	 */
	exports.isEmpty = function (object) {
	  if (!object) return true;
	  if (this.isArray(object) || this.isStr(object)) {
	    return !(object.length > 0); // jshint ignore:line
	  }

	  for (var k in object) {
	    if (hasOwnProperty.call(object, k)) return false;
	  }

	  return true;
	};

	/**
	 * Return if string is empty, null, or undefined
	 * @param str string to test
	 * @returns {boolean} if string is empty
	 */
	exports.isEmptyStr = function (str) {
	  return this.isStr(str) && (!str || 0 === str.length);
	};

	/**
	 * Iterate object with the function
	 * falls back to es5 `forEach`
	 * @param {Array|Object} object
	 * @param {Function(value, key, object)} fn
	 */
	exports._each = function (object, fn) {
	  if (this.isEmpty(object)) return;
	  if (this.isFn(object.forEach)) return object.forEach(fn, this);

	  var k = 0;
	  var l = object.length;

	  if (l > 0) {
	    for (; k < l; k++) {
	      fn(object[k], k, object);
	    }
	  } else {
	    for (k in object) {
	      if (hasOwnProperty.call(object, k)) fn.call(this, object[k], k);
	    }
	  }
	};

	exports.contains = function (a, obj) {
	  if (this.isEmpty(a)) {
	    return false;
	  }

	  if (this.isFn(a.indexOf)) {
	    return a.indexOf(obj) !== -1;
	  }

	  var i = a.length;
	  while (i--) {
	    if (a[i] === obj) {
	      return true;
	    }
	  }

	  return false;
	};

	exports.indexOf = function () {
	  if (Array.prototype.indexOf) {
	    return Array.prototype.indexOf;
	  }

	  // ie8 no longer supported
	  //return polyfills.indexOf;
	}();

	/**
	 * Map an array or object into another array
	 * given a function
	 * @param {Array|Object} object
	 * @param {Function(value, key, object)} callback
	 * @return {Array}
	 */
	exports._map = function (object, callback) {
	  if (this.isEmpty(object)) return [];
	  if (this.isFn(object.map)) return object.map(callback);
	  var output = [];
	  this._each(object, function (value, key) {
	    output.push(callback(value, key, object));
	  });

	  return output;
	};

	var hasOwn = function hasOwn(objectToCheck, propertyToCheckFor) {
	  if (objectToCheck.hasOwnProperty) {
	    return objectToCheck.hasOwnProperty(propertyToCheckFor);
	  } else {
	    return typeof objectToCheck[propertyToCheckFor] !== 'undefined' && objectToCheck.constructor.prototype[propertyToCheckFor] !== objectToCheck[propertyToCheckFor];
	  }
	};
	/**
	 * Creates a snippet of HTML that retrieves the specified `url`
	 * @param  {string} url URL to be requested
	 * @return {string}     HTML snippet that contains the img src = set to `url`
	 */
	exports.createTrackPixelHtml = function (url) {
	  if (!url) {
	    return '';
	  }

	  var escapedUrl = encodeURI(url);
	  var img = '<div style="position:absolute;left:0px;top:0px;visibility:hidden;">';
	  img += '<img src="' + escapedUrl + '"></div>';
	  return img;
	};

	/**
	 * Returns iframe document in a browser agnostic way
	 * @param  {object} iframe reference
	 * @return {object}        iframe `document` reference
	 */
	exports.getIframeDocument = function (iframe) {
	  if (!iframe) {
	    return;
	  }

	  var doc = void 0;
	  try {
	    if (iframe.contentWindow) {
	      doc = iframe.contentWindow.document;
	    } else if (iframe.contentDocument.document) {
	      doc = iframe.contentDocument.document;
	    } else {
	      doc = iframe.contentDocument;
	    }
	  } catch (e) {
	    this.logError('Cannot get iframe document', e);
	  }

	  return doc;
	};

	exports.getValueString = function (param, val, defaultValue) {
	  if (val === undefined || val === null) {
	    return defaultValue;
	  }
	  if (this.isStr(val)) {
	    return val;
	  }
	  if (this.isNumber(val)) {
	    return val.toString();
	  }
	  this.logWarn('Unsuported type for param: ' + param + ' required type: String');
	};

	function uniques(value, index, arry) {
	  return arry.indexOf(value) === index;
	}

	function flatten(a, b) {
	  return a.concat(b);
	}

	function getBidRequest(id) {
	  return pbjs._bidsRequested.map(function (bidSet) {
	    return bidSet.bids.find(function (bid) {
	      return bid.bidId === id;
	    });
	  }).find(function (bid) {
	    return bid;
	  });
	}

	function getKeys(obj) {
	  return Object.keys(obj);
	}

	function getValue(obj, key) {
	  return obj[key];
	}

	function getBidderCodes() {
	  var adUnits = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : pbjs.adUnits;

	  // this could memoize adUnits
	  return adUnits.map(function (unit) {
	    return unit.bids.map(function (bid) {
	      return bid.bidder;
	    }).reduce(flatten, []);
	  }).reduce(flatten).filter(uniques);
	}

	function isGptPubadsDefined() {
	  if (window.googletag && exports.isFn(window.googletag.pubads) && exports.isFn(window.googletag.pubads().getSlots)) {
	    return true;
	  }
	}

	function getHighestCpm(previous, current) {
	  if (previous.cpm === current.cpm) {
	    return previous.timeToRespond > current.timeToRespond ? current : previous;
	  }
	  return previous.cpm < current.cpm ? current : previous;
	}

	/**
	 * Fisherâ€“Yates shuffle
	 */
	function shuffle(array) {
	  var counter = array.length;

	  // while there are elements in the array
	  while (counter > 0) {
	    // pick a random index
	    var index = Math.floor(Math.random() * counter);

	    // decrease counter by 1
	    counter--;

	    // and swap the last element with it
	    var temp = array[counter];
	    array[counter] = array[index];
	    array[index] = temp;
	  }

	  return array;
	}

/***/ },
/* 15 */
/***/ function(module, exports) {

	module.exports = {
		"JSON_MAPPING": {
			"PL_CODE": "code",
			"PL_SIZE": "sizes",
			"PL_BIDS": "bids",
			"BD_BIDDER": "bidder",
			"BD_ID": "paramsd",
			"BD_PL_ID": "placementId",
			"ADSERVER_TARGETING": "adserverTargeting",
			"BD_SETTING_STANDARD": "standard"
		},
		"REPO_AND_VERSION": "prebid_prebid_0.14.0",
		"DEBUG_MODE": "pbjs_debug",
		"STATUS": {
			"GOOD": 1,
			"NO_BID": 2
		},
		"CB": {
			"TYPE": {
				"ALL_BIDS_BACK": "allRequestedBidsBack",
				"AD_UNIT_BIDS_BACK": "adUnitBidsBack",
				"BID_WON": "bidWon"
			}
		},
		"objectType_function": "function",
		"objectType_undefined": "undefined",
		"objectType_object": "object",
		"objectType_string": "string",
		"objectType_number": "number",
		"EVENTS": {
			"AUCTION_INIT": "auctionInit",
			"AUCTION_END": "auctionEnd",
			"BID_ADJUSTMENT": "bidAdjustment",
			"BID_TIMEOUT": "bidTimeout",
			"BID_REQUESTED": "bidRequested",
			"BID_RESPONSE": "bidResponse",
			"BID_WON": "bidWon"
		},
		"EVENT_ID_PATHS": {
			"bidWon": "adUnitCode"
		},
		"ORDER": {
			"RANDOM": "random"
		},
		"GRANULARITY_OPTIONS": {
			"LOW": "low",
			"MEDIUM": "medium",
			"HIGH": "high",
			"AUTO": "auto",
			"DENSE": "dense",
			"CUSTOM": "custom"
		},
		"TARGETING_KEYS": [
			"hb_bidder",
			"hb_adid",
			"hb_pb",
			"hb_size"
		]
	};

/***/ },
/* 16 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	Object.defineProperty(exports, "__esModule", {
	  value: true
	});
	exports.hasNonVideoBidder = exports.videoAdUnit = undefined;

	var _adaptermanager = __webpack_require__(17);

	/**
	 * Helper functions for working with video-enabled adUnits
	 */
	var videoAdUnit = exports.videoAdUnit = function videoAdUnit(adUnit) {
	  return adUnit.mediaType === 'video';
	};
	var nonVideoBidder = function nonVideoBidder(bid) {
	  return !_adaptermanager.videoAdapters.includes(bid.bidder);
	};
	var hasNonVideoBidder = exports.hasNonVideoBidder = function hasNonVideoBidder(adUnit) {
	  return adUnit.bids.filter(nonVideoBidder).length;
	};

/***/ },
/* 17 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

	var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; }; /** @module adaptermanger */

	var _utils = __webpack_require__(14);

	var _sizeMapping = __webpack_require__(18);

	var _baseAdapter = __webpack_require__(19);

	var utils = __webpack_require__(14);
	var CONSTANTS = __webpack_require__(15);
	var events = __webpack_require__(20);


	var _bidderRegistry = {};
	exports.bidderRegistry = _bidderRegistry;

	var _analyticsRegistry = {};
	var _bidderSequence = null;

	function getBids(_ref) {
	  var bidderCode = _ref.bidderCode,
	      requestId = _ref.requestId,
	      bidderRequestId = _ref.bidderRequestId,
	      adUnits = _ref.adUnits;

	  return adUnits.map(function (adUnit) {
	    return adUnit.bids.filter(function (bid) {
	      return bid.bidder === bidderCode;
	    }).map(function (bid) {
	      var sizes = adUnit.sizes;
	      if (adUnit.sizeMapping) {
	        var sizeMapping = (0, _sizeMapping.mapSizes)(adUnit);
	        if (sizeMapping === '') {
	          return '';
	        }
	        sizes = sizeMapping;
	      }
	      return _extends(bid, {
	        placementCode: adUnit.code,
	        mediaType: adUnit.mediaType,
	        sizes: sizes,
	        bidId: utils.getUniqueIdentifierStr(),
	        bidderRequestId: bidderRequestId,
	        requestId: requestId
	      });
	    });
	  }).reduce(_utils.flatten, []).filter(function (val) {
	    return val !== '';
	  });
	}

	exports.callBids = function (_ref2) {
	  var adUnits = _ref2.adUnits,
	      cbTimeout = _ref2.cbTimeout;

	  var requestId = utils.generateUUID();
	  var auctionStart = Date.now();

	  var auctionInit = {
	    timestamp: auctionStart,
	    requestId: requestId
	  };
	  events.emit(CONSTANTS.EVENTS.AUCTION_INIT, auctionInit);

	  var bidderCodes = (0, _utils.getBidderCodes)(adUnits);
	  if (_bidderSequence === CONSTANTS.ORDER.RANDOM) {
	    bidderCodes = (0, _utils.shuffle)(bidderCodes);
	  }

	  bidderCodes.forEach(function (bidderCode) {
	    var adapter = _bidderRegistry[bidderCode];
	    if (adapter) {
	      var bidderRequestId = utils.getUniqueIdentifierStr();
	      var bidderRequest = {
	        bidderCode: bidderCode,
	        requestId: requestId,
	        bidderRequestId: bidderRequestId,
	        bids: getBids({ bidderCode: bidderCode, requestId: requestId, bidderRequestId: bidderRequestId, adUnits: adUnits }),
	        start: new Date().getTime(),
	        auctionStart: auctionStart,
	        timeout: cbTimeout
	      };
	      if (bidderRequest.bids && bidderRequest.bids.length !== 0) {
	        utils.logMessage('CALLING BIDDER ======= ' + bidderCode);
	        pbjs._bidsRequested.push(bidderRequest);
	        events.emit(CONSTANTS.EVENTS.BID_REQUESTED, bidderRequest);
	        adapter.callBids(bidderRequest);
	      }
	    } else {
	      utils.logError('Adapter trying to be called which does not exist: ' + bidderCode + ' adaptermanager.callBids');
	    }
	  });
	};

	exports.registerBidAdapter = function (bidAdaptor, bidderCode) {
	  if (bidAdaptor && bidderCode) {

	    if (_typeof(bidAdaptor.callBids) === CONSTANTS.objectType_function) {
	      _bidderRegistry[bidderCode] = bidAdaptor;
	    } else {
	      utils.logError('Bidder adaptor error for bidder code: ' + bidderCode + 'bidder must implement a callBids() function');
	    }
	  } else {
	    utils.logError('bidAdaptor or bidderCode not specified');
	  }
	};

	exports.aliasBidAdapter = function (bidderCode, alias) {
	  var existingAlias = _bidderRegistry[alias];

	  if ((typeof existingAlias === 'undefined' ? 'undefined' : _typeof(existingAlias)) === CONSTANTS.objectType_undefined) {
	    var bidAdaptor = _bidderRegistry[bidderCode];

	    if ((typeof bidAdaptor === 'undefined' ? 'undefined' : _typeof(bidAdaptor)) === CONSTANTS.objectType_undefined) {
	      utils.logError('bidderCode "' + bidderCode + '" is not an existing bidder.', 'adaptermanager.aliasBidAdapter');
	    } else {
	      try {
	        var newAdapter = null;
	        if (bidAdaptor instanceof _baseAdapter.BaseAdapter) {
	          //newAdapter = new bidAdaptor.constructor(alias);
	          utils.logError(bidderCode + ' bidder does not currently support aliasing.', 'adaptermanager.aliasBidAdapter');
	        } else {
	          newAdapter = bidAdaptor.createNew();
	          newAdapter.setBidderCode(alias);
	          this.registerBidAdapter(newAdapter, alias);
	        }
	      } catch (e) {
	        utils.logError(bidderCode + ' bidder does not currently support aliasing.', 'adaptermanager.aliasBidAdapter');
	      }
	    }
	  } else {
	    utils.logMessage('alias name "' + alias + '" has been already specified.');
	  }
	};

	exports.registerAnalyticsAdapter = function (_ref3) {
	  var adapter = _ref3.adapter,
	      code = _ref3.code;

	  if (adapter && code) {

	    if (_typeof(adapter.enableAnalytics) === CONSTANTS.objectType_function) {
	      adapter.code = code;
	      _analyticsRegistry[code] = adapter;
	    } else {
	      utils.logError('Prebid Error: Analytics adaptor error for analytics "' + code + '"\n        analytics adapter must implement an enableAnalytics() function');
	    }
	  } else {
	    utils.logError('Prebid Error: analyticsAdapter or analyticsCode not specified');
	  }
	};

	exports.enableAnalytics = function (config) {
	  if (!utils.isArray(config)) {
	    config = [config];
	  }

	  utils._each(config, function (adapterConfig) {
	    var adapter = _analyticsRegistry[adapterConfig.provider];
	    if (adapter) {
	      adapter.enableAnalytics(adapterConfig);
	    } else {
	      utils.logError('Prebid Error: no analytics adapter found in registry for\n        ' + adapterConfig.provider + '.');
	    }
	  });
	};

	exports.setBidderSequence = function (order) {
	  _bidderSequence = order;
	};

	var AppnexusAdapter = __webpack_require__(21);
	exports.registerBidAdapter(new AppnexusAdapter.createNew(), 'appnexus');
	exports.videoAdapters = [];

	var appnexus = __webpack_require__(27).default || __webpack_require__(27);
	exports.registerAnalyticsAdapter({ adapter: appnexus, code: 'appnexus' });

/***/ },
/* 18 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	Object.defineProperty(exports, "__esModule", {
	  value: true
	});
	exports.setWindow = exports.getScreenWidth = exports.mapSizes = undefined;

	var _utils = __webpack_require__(14);

	var utils = _interopRequireWildcard(_utils);

	function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

	var _win = void 0; /**
	                    * @module sizeMapping
	                    */


	function mapSizes(adUnit) {
	  if (!isSizeMappingValid(adUnit.sizeMapping)) {
	    return adUnit.sizes;
	  }
	  var width = getScreenWidth();
	  if (!width) {
	    //size not detected - get largest value set for desktop
	    var _mapping = adUnit.sizeMapping.reduce(function (prev, curr) {
	      return prev.minWidth < curr.minWidth ? curr : prev;
	    });
	    if (_mapping.sizes) {
	      return _mapping.sizes;
	    }
	    return adUnit.sizes;
	  }
	  var sizes = '';
	  var mapping = adUnit.sizeMapping.find(function (sizeMapping) {
	    return width > sizeMapping.minWidth;
	  });
	  if (mapping && mapping.sizes) {
	    sizes = mapping.sizes;
	    utils.logMessage('AdUnit : ' + adUnit.code + ' resized based on device width to : ' + sizes);
	  } else {
	    utils.logMessage('AdUnit : ' + adUnit.code + ' not mapped to any sizes for device width. This request will be suppressed.');
	  }
	  return sizes;
	}

	function isSizeMappingValid(sizeMapping) {
	  if (utils.isArray(sizeMapping) && sizeMapping.length > 0) {
	    return true;
	  }
	  utils.logInfo('No size mapping defined');
	  return false;
	}

	function getScreenWidth(win) {
	  var w = win || _win || window;
	  if (w.screen && w.screen.width) {
	    return w.screen.width;
	  }
	  return 0;
	}

	function setWindow(win) {
	  _win = win;
	}

	exports.mapSizes = mapSizes;
	exports.getScreenWidth = getScreenWidth;
	exports.setWindow = setWindow;

/***/ },
/* 19 */
/***/ function(module, exports) {

	'use strict';

	Object.defineProperty(exports, "__esModule", {
	  value: true
	});

	var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

	function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

	var BaseAdapter = exports.BaseAdapter = function () {
	  function BaseAdapter(code) {
	    _classCallCheck(this, BaseAdapter);

	    this.code = code;
	  }

	  _createClass(BaseAdapter, [{
	    key: 'getCode',
	    value: function getCode() {
	      return this.code;
	    }
	  }, {
	    key: 'setCode',
	    value: function setCode(code) {
	      this.code = code;
	    }
	  }, {
	    key: 'callBids',
	    value: function callBids() {
	      throw 'adapter implementation must override callBids method';
	    }
	  }]);

	  return BaseAdapter;
	}();

/***/ },
/* 20 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	/**
	 * events.js
	 */
	var utils = __webpack_require__(14);
	var CONSTANTS = __webpack_require__(15);
	var slice = Array.prototype.slice;
	var push = Array.prototype.push;

	//define entire events
	//var allEvents = ['bidRequested','bidResponse','bidWon','bidTimeout'];
	var allEvents = utils._map(CONSTANTS.EVENTS, function (v) {
	  return v;
	});

	var idPaths = CONSTANTS.EVENT_ID_PATHS;

	//keep a record of all events fired
	var eventsFired = [];

	module.exports = function () {

	  var _handlers = {};
	  var _public = {};

	  /**
	   *
	   * @param {String} eventString  The name of the event.
	   * @param {Array} args  The payload emitted with the event.
	   * @private
	   */
	  function _dispatch(eventString, args) {
	    utils.logMessage('Emitting event for: ' + eventString);

	    var eventPayload = args[0] || {};
	    var idPath = idPaths[eventString];
	    var key = eventPayload[idPath];
	    var event = _handlers[eventString] || { que: [] };
	    var eventKeys = utils._map(event, function (v, k) {
	      return k;
	    });

	    var callbacks = [];

	    //record the event:
	    eventsFired.push({
	      eventType: eventString,
	      args: eventPayload,
	      id: key
	    });

	    /** Push each specific callback to the `callbacks` array.
	     * If the `event` map has a key that matches the value of the
	     * event payload id path, e.g. `eventPayload[idPath]`, then apply
	     * each function in the `que` array as an argument to push to the
	     * `callbacks` array
	     * */
	    if (key && utils.contains(eventKeys, key)) {
	      push.apply(callbacks, event[key].que);
	    }

	    /** Push each general callback to the `callbacks` array. */
	    push.apply(callbacks, event.que);

	    /** call each of the callbacks */
	    utils._each(callbacks, function (fn) {
	      if (!fn) return;
	      try {
	        fn.apply(null, args);
	      } catch (e) {
	        utils.logError('Error executing handler:', 'events.js', e);
	      }
	    });
	  }

	  function _checkAvailableEvent(event) {
	    return utils.contains(allEvents, event);
	  }

	  _public.on = function (eventString, handler, id) {

	    //check whether available event or not
	    if (_checkAvailableEvent(eventString)) {
	      var event = _handlers[eventString] || { que: [] };

	      if (id) {
	        event[id] = event[id] || { que: [] };
	        event[id].que.push(handler);
	      } else {
	        event.que.push(handler);
	      }

	      _handlers[eventString] = event;
	    } else {
	      utils.logError('Wrong event name : ' + eventString + ' Valid event names :' + allEvents);
	    }
	  };

	  _public.emit = function (event) {
	    var args = slice.call(arguments, 1);
	    _dispatch(event, args);
	  };

	  _public.off = function (eventString, handler, id) {
	    var event = _handlers[eventString];

	    if (utils.isEmpty(event) || utils.isEmpty(event.que) && utils.isEmpty(event[id])) {
	      return;
	    }

	    if (id && (utils.isEmpty(event[id]) || utils.isEmpty(event[id].que))) {
	      return;
	    }

	    if (id) {
	      utils._each(event[id].que, function (_handler) {
	        var que = event[id].que;
	        if (_handler === handler) {
	          que.splice(utils.indexOf.call(que, _handler), 1);
	        }
	      });
	    } else {
	      utils._each(event.que, function (_handler) {
	        var que = event.que;
	        if (_handler === handler) {
	          que.splice(utils.indexOf.call(que, _handler), 1);
	        }
	      });
	    }

	    _handlers[eventString] = event;
	  };

	  _public.get = function () {
	    return _handlers;
	  };

	  /**
	   * This method can return a copy of all the events fired
	   * @return {Array} array of events fired
	   */
	  _public.getEvents = function () {
	    var arrayCopy = [];
	    utils._each(eventsFired, function (value) {
	      var newProp = utils.extend({}, value);
	      arrayCopy.push(newProp);
	    });

	    return arrayCopy;
	  };

	  return _public;
	}();

/***/ },
/* 21 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	var _utils = __webpack_require__(14);

	var CONSTANTS = __webpack_require__(15);
	var utils = __webpack_require__(14);
	var adloader = __webpack_require__(22);
	var bidmanager = __webpack_require__(23);
	var bidfactory = __webpack_require__(25);
	var Adapter = __webpack_require__(26);

	var AppNexusAdapter;
	AppNexusAdapter = function AppNexusAdapter() {
	  var baseAdapter = Adapter.createNew('appnexus');

	  baseAdapter.callBids = function (params) {
	    //var bidCode = baseAdapter.getBidderCode();

	    var anArr = params.bids;

	    //var bidsCount = anArr.length;

	    //set expected bids count for callback execution
	    //bidmanager.setExpectedBidsCount(bidCode, bidsCount);

	    for (var i = 0; i < anArr.length; i++) {
	      var bidRequest = anArr[i];
	      var callbackId = bidRequest.bidId;
	      adloader.loadScript(buildJPTCall(bidRequest, callbackId));

	      //store a reference to the bidRequest from the callback id
	      //bidmanager.pbCallbackMap[callbackId] = bidRequest;
	    }
	  };

	  function buildJPTCall(bid, callbackId) {

	    //determine tag params
	    var placementId = utils.getBidIdParamater('placementId', bid.params);

	    //memberId will be deprecated, use member instead
	    var memberId = utils.getBidIdParamater('memberId', bid.params);
	    var member = utils.getBidIdParamater('member', bid.params);
	    var inventoryCode = utils.getBidIdParamater('invCode', bid.params);
	    var query = utils.getBidIdParamater('query', bid.params);
	    var referrer = utils.getBidIdParamater('referrer', bid.params);
	    var altReferrer = utils.getBidIdParamater('alt_referrer', bid.params);

	    //build our base tag, based on if we are http or https

	    var jptCall = 'http' + (document.location.protocol === 'https:' ? 's://secure.adnxs.com/jpt?' : '://ib.adnxs.com/jpt?');

	    jptCall = utils.tryAppendQueryString(jptCall, 'callback', 'pbjs.handleAnCB');
	    jptCall = utils.tryAppendQueryString(jptCall, 'callback_uid', callbackId);
	    jptCall = utils.tryAppendQueryString(jptCall, 'psa', '0');
	    jptCall = utils.tryAppendQueryString(jptCall, 'id', placementId);
	    if (member) {
	      jptCall = utils.tryAppendQueryString(jptCall, 'member', member);
	    } else if (memberId) {
	      jptCall = utils.tryAppendQueryString(jptCall, 'member', memberId);
	      utils.logMessage('appnexus.callBids: "memberId" will be deprecated soon. Please use "member" instead');
	    }

	    jptCall = utils.tryAppendQueryString(jptCall, 'code', inventoryCode);

	    //sizes takes a bit more logic
	    var sizeQueryString = '';
	    var parsedSizes = utils.parseSizesInput(bid.sizes);

	    //combine string into proper querystring for impbus
	    var parsedSizesLength = parsedSizes.length;
	    if (parsedSizesLength > 0) {
	      //first value should be "size"
	      sizeQueryString = 'size=' + parsedSizes[0];
	      if (parsedSizesLength > 1) {
	        //any subsequent values should be "promo_sizes"
	        sizeQueryString += '&promo_sizes=';
	        for (var j = 1; j < parsedSizesLength; j++) {
	          sizeQueryString += parsedSizes[j] += ',';
	        }

	        //remove trailing comma
	        if (sizeQueryString && sizeQueryString.charAt(sizeQueryString.length - 1) === ',') {
	          sizeQueryString = sizeQueryString.slice(0, sizeQueryString.length - 1);
	        }
	      }
	    }

	    if (sizeQueryString) {
	      jptCall += sizeQueryString + '&';
	    }

	    //this will be deprecated soon
	    var targetingParams = utils.parseQueryStringParameters(query);

	    if (targetingParams) {
	      //don't append a & here, we have already done it in parseQueryStringParameters
	      jptCall += targetingParams;
	    }

	    //append custom attributes:
	    var paramsCopy = utils.extend({}, bid.params);

	    //delete attributes already used
	    delete paramsCopy.placementId;
	    delete paramsCopy.memberId;
	    delete paramsCopy.invCode;
	    delete paramsCopy.query;
	    delete paramsCopy.referrer;
	    delete paramsCopy.alt_referrer;
	    delete paramsCopy.member;

	    //get the reminder
	    var queryParams = utils.parseQueryStringParameters(paramsCopy);

	    //append
	    if (queryParams) {
	      jptCall += queryParams;
	    }

	    //append referrer
	    if (referrer === '') {
	      referrer = utils.getTopWindowUrl();
	    }

	    jptCall = utils.tryAppendQueryString(jptCall, 'referrer', referrer);
	    jptCall = utils.tryAppendQueryString(jptCall, 'alt_referrer', altReferrer);

	    //remove the trailing "&"
	    if (jptCall.lastIndexOf('&') === jptCall.length - 1) {
	      jptCall = jptCall.substring(0, jptCall.length - 1);
	    }

	    // @if NODE_ENV='debug'
	    utils.logMessage('jpt request built: ' + jptCall);

	    // @endif

	    //append a timer here to track latency
	    bid.startTime = new Date().getTime();

	    return jptCall;
	  }

	  //expose the callback to the global object:
	  pbjs.handleAnCB = function (jptResponseObj) {

	    var bidCode;

	    if (jptResponseObj && jptResponseObj.callback_uid) {

	      var responseCPM;
	      var id = jptResponseObj.callback_uid;
	      var placementCode = '';
	      var bidObj = (0, _utils.getBidRequest)(id);
	      if (bidObj) {

	        bidCode = bidObj.bidder;

	        placementCode = bidObj.placementCode;

	        //set the status
	        bidObj.status = CONSTANTS.STATUS.GOOD;
	      }

	      // @if NODE_ENV='debug'
	      utils.logMessage('JSONP callback function called for ad ID: ' + id);

	      // @endif
	      var bid = [];
	      if (jptResponseObj.result && jptResponseObj.result.cpm && jptResponseObj.result.cpm !== 0) {
	        responseCPM = parseInt(jptResponseObj.result.cpm, 10);

	        //CPM response from /jpt is dollar/cent multiplied by 10000
	        //in order to avoid using floats
	        //switch CPM to "dollar/cent"
	        responseCPM = responseCPM / 10000;

	        //store bid response
	        //bid status is good (indicating 1)
	        var adId = jptResponseObj.result.creative_id;
	        bid = bidfactory.createBid(1);
	        bid.creative_id = adId;
	        bid.bidderCode = bidCode;
	        bid.cpm = responseCPM;
	        bid.adUrl = jptResponseObj.result.ad;
	        bid.width = jptResponseObj.result.width;
	        bid.height = jptResponseObj.result.height;
	        bid.dealId = jptResponseObj.result.deal_id;

	        bidmanager.addBidResponse(placementCode, bid);
	      } else {
	        //no response data
	        // @if NODE_ENV='debug'
	        utils.logMessage('No prebid response from AppNexus for placement code ' + placementCode);

	        // @endif
	        //indicate that there is no bid for this placement
	        bid = bidfactory.createBid(2);
	        bid.bidderCode = bidCode;
	        bidmanager.addBidResponse(placementCode, bid);
	      }
	    } else {
	      //no response data
	      // @if NODE_ENV='debug'
	      utils.logMessage('No prebid response for placement %%PLACEMENT%%');

	      // @endif
	    }
	  };

	  return {
	    callBids: baseAdapter.callBids,
	    setBidderCode: baseAdapter.setBidderCode,
	    createNew: exports.createNew,
	    buildJPTCall: buildJPTCall
	  };
	};

	exports.createNew = function () {
	  return new AppNexusAdapter();
	};

	// module.exports = AppNexusAdapter;

/***/ },
/* 22 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	var utils = __webpack_require__(14);
	var _requestCache = {};

	//add a script tag to the page, used to add /jpt call to page
	exports.loadScript = function (tagSrc, callback, cacheRequest) {
	  //var noop = () => {};
	  //
	  //callback = callback || noop;
	  if (!tagSrc) {
	    utils.logError('Error attempting to request empty URL', 'adloader.js:loadScript');
	    return;
	  }

	  if (cacheRequest) {
	    if (_requestCache[tagSrc]) {
	      if (callback && typeof callback === 'function') {
	        if (_requestCache[tagSrc].loaded) {
	          //invokeCallbacks immediately
	          callback();
	        } else {
	          //queue the callback
	          _requestCache[tagSrc].callbacks.push(callback);
	        }
	      }
	    } else {
	      _requestCache[tagSrc] = {
	        loaded: false,
	        callbacks: []
	      };
	      if (callback && typeof callback === 'function') {
	        _requestCache[tagSrc].callbacks.push(callback);
	      }

	      requestResource(tagSrc, function () {
	        _requestCache[tagSrc].loaded = true;
	        try {
	          for (var i = 0; i < _requestCache[tagSrc].callbacks.length; i++) {
	            _requestCache[tagSrc].callbacks[i]();
	          }
	        } catch (e) {
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
	  var delimiter = void 0;
	  var trackingPixel = void 0;

	  if (!pixelUrl || typeof pixelUrl !== 'string') {
	    utils.logMessage('Missing or invalid pixelUrl.');
	    return;
	  }

	  delimiter = pixelUrl.indexOf('?') > 0 ? '&' : '?';

	  //add a cachebuster so we don't end up dropping any impressions
	  trackingPixel = pixelUrl + delimiter + 'rnd=' + Math.floor(Math.random() * 1E7);
	  new Image().src = trackingPixel;
	  return trackingPixel;
	};

/***/ },
/* 23 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

	var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

	var _utils = __webpack_require__(14);

	var _cpmBucketManager = __webpack_require__(24);

	var CONSTANTS = __webpack_require__(15);
	var utils = __webpack_require__(14);
	var events = __webpack_require__(20);

	var objectType_function = 'function';

	var externalCallbacks = { byAdUnit: [], all: [], oneTime: null, timer: false };
	var _granularity = CONSTANTS.GRANULARITY_OPTIONS.MEDIUM;
	var _customPriceBucket = void 0;
	var defaultBidderSettingsMap = {};

	exports.setCustomPriceBucket = function (customConfig) {
	  _customPriceBucket = customConfig;
	};

	/**
	 * Returns a list of bidders that we haven't received a response yet
	 * @return {array} [description]
	 */
	exports.getTimedOutBidders = function () {
	  return pbjs._bidsRequested.map(getBidderCode).filter(_utils.uniques).filter(function (bidder) {
	    return pbjs._bidsReceived.map(getBidders).filter(_utils.uniques).indexOf(bidder) < 0;
	  });
	};

	function timestamp() {
	  return new Date().getTime();
	}

	function getBidderCode(bidSet) {
	  return bidSet.bidderCode;
	}

	function getBidders(bid) {
	  return bid.bidder;
	}

	function bidsBackAdUnit(adUnitCode) {
	  var requested = pbjs._bidsRequested.map(function (request) {
	    return request.bids.filter(function (bid) {
	      return bid.placementCode === adUnitCode;
	    });
	  }).reduce(_utils.flatten).map(function (bid) {
	    return bid.bidder === 'indexExchange' ? bid.sizes.length : 1;
	  }).reduce(add, 0);

	  var received = pbjs._bidsReceived.filter(function (bid) {
	    return bid.adUnitCode === adUnitCode;
	  }).length;
	  return requested === received;
	}

	function add(a, b) {
	  return a + b;
	}

	function bidsBackAll() {
	  var requested = pbjs._bidsRequested.map(function (request) {
	    return request.bids;
	  }).reduce(_utils.flatten).map(function (bid) {
	    return bid.bidder === 'indexExchange' ? bid.sizes.length : 1;
	  }).reduce(add, 0);

	  var received = pbjs._bidsReceived.length;
	  return requested === received;
	}

	exports.bidsBackAll = function () {
	  return bidsBackAll();
	};

	function getBidSet(bidder, adUnitCode) {
	  return pbjs._bidsRequested.find(function (bidSet) {
	    return bidSet.bids.filter(function (bid) {
	      return bid.bidder === bidder && bid.placementCode === adUnitCode;
	    }).length > 0;
	  }) || { start: null, requestId: null };
	}

	/*
	 *   This function should be called to by the bidder adapter to register a bid response
	 */
	exports.addBidResponse = function (adUnitCode, bid) {
	  if (bid) {
	    var _getBidSet = getBidSet(bid.bidderCode, adUnitCode),
	        requestId = _getBidSet.requestId,
	        start = _getBidSet.start;

	    _extends(bid, {
	      requestId: requestId,
	      responseTimestamp: timestamp(),
	      requestTimestamp: start,
	      cpm: bid.cpm || 0,
	      bidder: bid.bidderCode,
	      adUnitCode: adUnitCode
	    });

	    bid.timeToRespond = bid.responseTimestamp - bid.requestTimestamp;

	    if (bid.timeToRespond > pbjs.cbTimeout + pbjs.timeoutBuffer) {
	      var timedOut = true;

	      exports.executeCallback(timedOut);
	    }

	    //emit the bidAdjustment event before bidResponse, so bid response has the adjusted bid value
	    events.emit(CONSTANTS.EVENTS.BID_ADJUSTMENT, bid);

	    //emit the bidResponse event
	    events.emit(CONSTANTS.EVENTS.BID_RESPONSE, bid);

	    //append price strings
	    var priceStringsObj = (0, _cpmBucketManager.getPriceBucketString)(bid.cpm, _customPriceBucket);
	    bid.pbLg = priceStringsObj.low;
	    bid.pbMg = priceStringsObj.med;
	    bid.pbHg = priceStringsObj.high;
	    bid.pbAg = priceStringsObj.auto;
	    bid.pbDg = priceStringsObj.dense;
	    bid.pbCg = priceStringsObj.custom;

	    //if there is any key value pairs to map do here
	    var keyValues = {};
	    if (bid.bidderCode && bid.cpm !== 0) {
	      keyValues = getKeyValueTargetingPairs(bid.bidderCode, bid);

	      if (bid.dealId) {
	        keyValues['hb_deal_' + bid.bidderCode] = bid.dealId;
	      }

	      bid.adserverTargeting = keyValues;
	    }

	    pbjs._bidsReceived.push(bid);
	  }

	  if (bid && bid.adUnitCode && bidsBackAdUnit(bid.adUnitCode)) {
	    triggerAdUnitCallbacks(bid.adUnitCode);
	  }

	  if (bidsBackAll()) {
	    exports.executeCallback();
	  }
	};

	function getKeyValueTargetingPairs(bidderCode, custBidObj) {
	  var keyValues = {};
	  var bidder_settings = pbjs.bidderSettings;

	  //1) set the keys from "standard" setting or from prebid defaults
	  if (custBidObj && bidder_settings) {
	    //initialize default if not set
	    var standardSettings = getStandardBidderSettings();
	    setKeys(keyValues, standardSettings, custBidObj);
	  }

	  //2) set keys from specific bidder setting override if they exist
	  if (bidderCode && custBidObj && bidder_settings && bidder_settings[bidderCode] && bidder_settings[bidderCode][CONSTANTS.JSON_MAPPING.ADSERVER_TARGETING]) {
	    setKeys(keyValues, bidder_settings[bidderCode], custBidObj);
	    custBidObj.alwaysUseBid = bidder_settings[bidderCode].alwaysUseBid;
	    filterIfSendStandardTargeting(bidder_settings[bidderCode]);
	  }

	  //2) set keys from standard setting. NOTE: this API doesn't seem to be in use by any Adapter
	  else if (defaultBidderSettingsMap[bidderCode]) {
	      setKeys(keyValues, defaultBidderSettingsMap[bidderCode], custBidObj);
	      custBidObj.alwaysUseBid = defaultBidderSettingsMap[bidderCode].alwaysUseBid;
	      filterIfSendStandardTargeting(defaultBidderSettingsMap[bidderCode]);
	    }

	  function filterIfSendStandardTargeting(bidderSettings) {
	    if (typeof bidderSettings.sendStandardTargeting !== "undefined" && bidderSettings.sendStandardTargeting === false) {
	      for (var key in keyValues) {
	        if (CONSTANTS.TARGETING_KEYS.indexOf(key) !== -1) {
	          delete keyValues[key];
	        }
	      }
	    }
	  }

	  return keyValues;
	}

	exports.getKeyValueTargetingPairs = function () {
	  return getKeyValueTargetingPairs.apply(undefined, arguments);
	};

	function setKeys(keyValues, bidderSettings, custBidObj) {
	  var targeting = bidderSettings[CONSTANTS.JSON_MAPPING.ADSERVER_TARGETING];
	  custBidObj.size = custBidObj.getSize();

	  utils._each(targeting, function (kvPair) {
	    var key = kvPair.key;
	    var value = kvPair.val;

	    if (keyValues[key]) {
	      utils.logWarn('The key: ' + key + ' is getting ovewritten');
	    }

	    if (utils.isFn(value)) {
	      try {
	        value = value(custBidObj);
	      } catch (e) {
	        utils.logError('bidmanager', 'ERROR', e);
	      }
	    }

	    if (typeof bidderSettings.suppressEmptyKeys !== "undefined" && bidderSettings.suppressEmptyKeys === true && (utils.isEmptyStr(value) || value === null || value === undefined)) {
	      utils.logInfo("suppressing empty key '" + key + "' from adserver targeting");
	    } else {
	      keyValues[key] = value;
	    }
	  });

	  return keyValues;
	}

	exports.setPriceGranularity = function setPriceGranularity(granularity) {
	  var granularityOptions = CONSTANTS.GRANULARITY_OPTIONS;
	  if (Object.keys(granularityOptions).filter(function (option) {
	    return granularity === granularityOptions[option];
	  })) {
	    _granularity = granularity;
	  } else {
	    utils.logWarn('Prebid Warning: setPriceGranularity was called with invalid setting, using' + ' `medium` as default.');
	    _granularity = CONSTANTS.GRANULARITY_OPTIONS.MEDIUM;
	  }
	};

	exports.registerDefaultBidderSetting = function (bidderCode, defaultSetting) {
	  defaultBidderSettingsMap[bidderCode] = defaultSetting;
	};

	exports.executeCallback = function (timedOut) {
	  // if there's still a timeout running, clear it now
	  if (!timedOut && externalCallbacks.timer) {
	    clearTimeout(externalCallbacks.timer);
	  }

	  if (externalCallbacks.all.called !== true) {
	    processCallbacks(externalCallbacks.all);
	    externalCallbacks.all.called = true;

	    if (timedOut) {
	      var timedOutBidders = exports.getTimedOutBidders();

	      if (timedOutBidders.length) {
	        events.emit(CONSTANTS.EVENTS.BID_TIMEOUT, timedOutBidders);
	      }
	    }
	  }

	  //execute one time callback
	  if (externalCallbacks.oneTime) {
	    try {
	      processCallbacks([externalCallbacks.oneTime]);
	    } finally {
	      externalCallbacks.oneTime = null;
	      externalCallbacks.timer = false;
	      pbjs.clearAuction();
	    }
	  }
	};

	function triggerAdUnitCallbacks(adUnitCode) {
	  //todo : get bid responses and send in args
	  var params = [adUnitCode];
	  processCallbacks(externalCallbacks.byAdUnit, params);
	}

	function processCallbacks(callbackQueue, params) {
	  var i;
	  if (utils.isArray(callbackQueue)) {
	    for (i = 0; i < callbackQueue.length; i++) {
	      var func = callbackQueue[i];
	      func.apply(pbjs, params || [pbjs._bidsReceived.reduce(groupByPlacement, {})]);
	    }
	  }
	}

	/**
	 * groupByPlacement is a reduce function that converts an array of Bid objects
	 * to an object with placement codes as keys, with each key representing an object
	 * with an array of `Bid` objects for that placement
	 * @param prev previous value as accumulator object
	 * @param item current array item
	 * @param idx current index
	 * @param arr the array being reduced
	 * @returns {*} as { [adUnitCode]: { bids: [Bid, Bid, Bid] } }
	 */
	function groupByPlacement(prev, item, idx, arr) {
	  // this uses a standard "array to map" operation that could be abstracted further
	  if (item.adUnitCode in Object.keys(prev)) {
	    // if the adUnitCode key is present in the accumulator object, continue
	    return prev;
	  } else {
	    // otherwise add the adUnitCode key to the accumulator object and set to an object with an
	    // array of Bids for that adUnitCode
	    prev[item.adUnitCode] = {
	      bids: arr.filter(function (bid) {
	        return bid.adUnitCode === item.adUnitCode;
	      })
	    };
	    return prev;
	  }
	}

	/**
	 * Add a one time callback, that is discarded after it is called
	 * @param {Function} callback
	 * @param timer Timer to clear if callback is triggered before timer time's out
	 */
	exports.addOneTimeCallback = function (callback, timer) {
	  externalCallbacks.oneTime = callback;
	  externalCallbacks.timer = timer;
	};

	exports.addCallback = function (id, callback, cbEvent) {
	  callback.id = id;
	  if (CONSTANTS.CB.TYPE.ALL_BIDS_BACK === cbEvent) {
	    externalCallbacks.all.push(callback);
	  } else if (CONSTANTS.CB.TYPE.AD_UNIT_BIDS_BACK === cbEvent) {
	    externalCallbacks.byAdUnit.push(callback);
	  }
	};

	//register event for bid adjustment
	events.on(CONSTANTS.EVENTS.BID_ADJUSTMENT, function (bid) {
	  adjustBids(bid);
	});

	function adjustBids(bid) {
	  var code = bid.bidderCode;
	  var bidPriceAdjusted = bid.cpm;
	  if (code && pbjs.bidderSettings && pbjs.bidderSettings[code]) {
	    if (_typeof(pbjs.bidderSettings[code].bidCpmAdjustment) === objectType_function) {
	      try {
	        bidPriceAdjusted = pbjs.bidderSettings[code].bidCpmAdjustment.call(null, bid.cpm, utils.extend({}, bid));
	      } catch (e) {
	        utils.logError('Error during bid adjustment', 'bidmanager.js', e);
	      }
	    }
	  }

	  if (bidPriceAdjusted >= 0) {
	    bid.cpm = bidPriceAdjusted;
	  }
	}

	exports.adjustBids = function () {
	  return adjustBids.apply(undefined, arguments);
	};

	function getStandardBidderSettings() {
	  var bidder_settings = pbjs.bidderSettings;
	  if (!bidder_settings[CONSTANTS.JSON_MAPPING.BD_SETTING_STANDARD]) {
	    bidder_settings[CONSTANTS.JSON_MAPPING.BD_SETTING_STANDARD] = {
	      adserverTargeting: [{
	        key: 'hb_bidder',
	        val: function val(bidResponse) {
	          return bidResponse.bidderCode;
	        }
	      }, {
	        key: 'hb_adid',
	        val: function val(bidResponse) {
	          return bidResponse.adId;
	        }
	      }, {
	        key: 'hb_pb',
	        val: function val(bidResponse) {
	          if (_granularity === CONSTANTS.GRANULARITY_OPTIONS.AUTO) {
	            return bidResponse.pbAg;
	          } else if (_granularity === CONSTANTS.GRANULARITY_OPTIONS.DENSE) {
	            return bidResponse.pbDg;
	          } else if (_granularity === CONSTANTS.GRANULARITY_OPTIONS.LOW) {
	            return bidResponse.pbLg;
	          } else if (_granularity === CONSTANTS.GRANULARITY_OPTIONS.MEDIUM) {
	            return bidResponse.pbMg;
	          } else if (_granularity === CONSTANTS.GRANULARITY_OPTIONS.HIGH) {
	            return bidResponse.pbHg;
	          } else if (_granularity === CONSTANTS.GRANULARITY_OPTIONS.CUSTOM) {
	            return bidResponse.pbCg;
	          }
	        }
	      }, {
	        key: 'hb_size',
	        val: function val(bidResponse) {
	          return bidResponse.size;
	        }
	      }]
	    };
	  }
	  return bidder_settings[CONSTANTS.JSON_MAPPING.BD_SETTING_STANDARD];
	}

	function getStandardBidderAdServerTargeting() {
	  return getStandardBidderSettings()[CONSTANTS.JSON_MAPPING.ADSERVER_TARGETING];
	}

	exports.getStandardBidderAdServerTargeting = getStandardBidderAdServerTargeting;

/***/ },
/* 24 */
/***/ function(module, exports) {

	'use strict';

	Object.defineProperty(exports, "__esModule", {
	  value: true
	});
	var _defaultPrecision = 2;
	var _lgPriceConfig = {
	  'buckets': [{
	    'min': 0,
	    'max': 5,
	    'increment': 0.5
	  }]
	};
	var _mgPriceConfig = {
	  'buckets': [{
	    'min': 0,
	    'max': 20,
	    'increment': 0.1
	  }]
	};
	var _hgPriceConfig = {
	  'buckets': [{
	    'min': 0,
	    'max': 20,
	    'increment': 0.01
	  }]
	};
	var _densePriceConfig = {
	  'buckets': [{
	    'min': 0,
	    'max': 3,
	    'increment': 0.01
	  }, {
	    'min': 3,
	    'max': 8,
	    'increment': 0.05
	  }, {
	    'min': 8,
	    'max': 20,
	    'increment': 0.5
	  }]
	};
	var _autoPriceConfig = {
	  'buckets': [{
	    'min': 0,
	    'max': 5,
	    'increment': 0.05
	  }, {
	    'min': 5,
	    'max': 10,
	    'increment': 0.1
	  }, {
	    'min': 10,
	    'max': 20,
	    'increment': 0.5
	  }]
	};

	function getPriceBucketString(cpm, customConfig) {
	  var cpmFloat = 0;
	  cpmFloat = parseFloat(cpm);
	  if (isNaN(cpmFloat)) {
	    cpmFloat = '';
	  }

	  return {
	    low: cpmFloat === '' ? '' : getCpmStringValue(cpm, _lgPriceConfig),
	    med: cpmFloat === '' ? '' : getCpmStringValue(cpm, _mgPriceConfig),
	    high: cpmFloat === '' ? '' : getCpmStringValue(cpm, _hgPriceConfig),
	    auto: cpmFloat === '' ? '' : getCpmStringValue(cpm, _autoPriceConfig),
	    dense: cpmFloat === '' ? '' : getCpmStringValue(cpm, _densePriceConfig),
	    custom: cpmFloat === '' ? '' : getCpmStringValue(cpm, customConfig)
	  };
	}

	function getCpmStringValue(cpm, config) {
	  var cpmStr = '';
	  if (!isValidePriceConfig(config)) {
	    return cpmStr;
	  }
	  var cap = config.buckets.reduce(function (prev, curr) {
	    if (prev.max > curr.max) {
	      return prev;
	    }
	    return curr;
	  }, {
	    'max': 0
	  });
	  var bucket = config.buckets.find(function (bucket) {
	    if (cpm > cap.max) {
	      var precision = bucket.precision || _defaultPrecision;
	      cpmStr = bucket.max.toFixed(precision);
	    } else if (cpm <= bucket.max && cpm >= bucket.min) {
	      return bucket;
	    }
	  });
	  if (bucket) {
	    cpmStr = getCpmTarget(cpm, bucket.increment, bucket.precision);
	  }
	  return cpmStr;
	}

	function isValidePriceConfig(config) {
	  if (!config || !config.buckets || !Array.isArray(config.buckets)) {
	    return false;
	  }
	  var isValid = true;
	  config.buckets.forEach(function (bucket) {
	    if (typeof bucket.min === 'undefined' || !bucket.max || !bucket.increment) {
	      isValid = false;
	    }
	  });
	  return isValid;
	}

	function getCpmTarget(cpm, increment, precision) {
	  if (!precision) {
	    precision = _defaultPrecision;
	  }
	  var bucketSize = 1 / increment;
	  return (Math.floor(cpm * bucketSize) / bucketSize).toFixed(precision);
	}

	exports.getPriceBucketString = getPriceBucketString;
	exports.isValidePriceConfig = isValidePriceConfig;

/***/ },
/* 25 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	var utils = __webpack_require__(14);

	/**
	 Required paramaters
	 bidderCode,
	 height,
	 width,
	 statusCode
	 Optional paramaters
	 adId,
	 cpm,
	 ad,
	 adUrl,
	 dealId,
	 priceKeyString;
	 */
	function Bid(statusCode, bidRequest) {
	  var _bidId = bidRequest && bidRequest.bidId || utils.getUniqueIdentifierStr();
	  var _statusCode = statusCode || 0;

	  this.bidderCode = '';
	  this.width = 0;
	  this.height = 0;
	  this.statusMessage = _getStatus();
	  this.adId = _bidId;

	  function _getStatus() {
	    switch (_statusCode) {
	      case 0:
	        return 'Pending';
	      case 1:
	        return 'Bid available';
	      case 2:
	        return 'Bid returned empty or error response';
	      case 3:
	        return 'Bid timed out';
	    }
	  }

	  this.getStatusCode = function () {
	    return _statusCode;
	  };

	  //returns the size of the bid creative. Concatenation of width and height by â€˜xâ€™.
	  this.getSize = function () {
	    return this.width + 'x' + this.height;
	  };
	}

	// Bid factory function.
	exports.createBid = function () {
	  return new (Function.prototype.bind.apply(Bid, [null].concat(Array.prototype.slice.call(arguments))))();
	};

/***/ },
/* 26 */
/***/ function(module, exports) {

	"use strict";

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

	exports.createNew = function (bidderCode) {
	  return new Adapter(bidderCode);
	};

/***/ },
/* 27 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	Object.defineProperty(exports, "__esModule", {
	  value: true
	});

	var _AnalyticsAdapter = __webpack_require__(28);

	var _AnalyticsAdapter2 = _interopRequireDefault(_AnalyticsAdapter);

	function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

	exports.default = (0, _AnalyticsAdapter2.default)({
	  global: 'AppNexusPrebidAnalytics',
	  handler: 'on',
	  analyticsType: 'bundle'
	}); /**
	     * appnexus.js - AppNexus Prebid Analytics Adapter
	     */

/***/ },
/* 28 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	Object.defineProperty(exports, "__esModule", {
	  value: true
	});
	exports.default = AnalyticsAdapter;

	var _constants = __webpack_require__(15);

	var _constants2 = _interopRequireDefault(_constants);

	var _adloader = __webpack_require__(22);

	var _ajax = __webpack_require__(29);

	function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

	var events = __webpack_require__(20);
	var utils = __webpack_require__(14);

	var AUCTION_INIT = _constants2.default.EVENTS.AUCTION_INIT;
	var BID_REQUESTED = _constants2.default.EVENTS.BID_REQUESTED;
	var BID_TIMEOUT = _constants2.default.EVENTS.BID_TIMEOUT;
	var BID_RESPONSE = _constants2.default.EVENTS.BID_RESPONSE;
	var BID_WON = _constants2.default.EVENTS.BID_WON;
	var BID_ADJUSTMENT = _constants2.default.EVENTS.BID_ADJUSTMENT;

	var LIBRARY = 'library';
	var ENDPOINT = 'endpoint';
	var BUNDLE = 'bundle';

	var _timedOutBidders = [];

	function AnalyticsAdapter(_ref) {
	  var url = _ref.url,
	      analyticsType = _ref.analyticsType,
	      global = _ref.global,
	      handler = _ref.handler;

	  var _queue = [];
	  var _eventCount = 0;
	  var _enableCheck = true;

	  if (analyticsType === LIBRARY) {
	    (0, _adloader.loadScript)(url, _emptyQueue);
	  }

	  if (analyticsType === ENDPOINT || BUNDLE) {
	    _emptyQueue();
	  }

	  return {
	    track: _track,
	    enqueue: _enqueue,
	    enableAnalytics: _enable,
	    getAdapterType: function getAdapterType() {
	      return analyticsType;
	    },
	    getGlobal: function getGlobal() {
	      return global;
	    },
	    getHandler: function getHandler() {
	      return handler;
	    },
	    getUrl: function getUrl() {
	      return url;
	    }
	  };

	  function _track(_ref2) {
	    var eventType = _ref2.eventType,
	        args = _ref2.args;

	    if (this.getAdapterType() === LIBRARY || BUNDLE) {
	      window[global](handler, eventType, args);
	    }

	    if (this.getAdapterType() === ENDPOINT) {
	      _callEndpoint.apply(undefined, arguments);
	    }
	  }

	  function _callEndpoint(_ref3) {
	    var eventType = _ref3.eventType,
	        args = _ref3.args,
	        callback = _ref3.callback;

	    (0, _ajax.ajax)(url, callback, JSON.stringify({ eventType: eventType, args: args }));
	  }

	  function _enqueue(_ref4) {
	    var eventType = _ref4.eventType,
	        args = _ref4.args;

	    var _this = this;

	    if (global && window[global] && eventType && args) {
	      this.track({ eventType: eventType, args: args });
	    } else {
	      _queue.push(function () {
	        _eventCount++;
	        _this.track({ eventType: eventType, args: args });
	      });
	    }
	  }

	  function _enable(config) {
	    var _this2 = this;

	    var _this = this;

	    //first send all events fired before enableAnalytics called
	    events.getEvents().forEach(function (event) {
	      if (!event) {
	        return;
	      }

	      var eventType = event.eventType,
	          args = event.args;


	      if (eventType === BID_TIMEOUT) {
	        _timedOutBidders = args.bidderCode;
	      } else {
	        _enqueue.call(_this, { eventType: eventType, args: args });
	      }
	    });

	    //Next register event listeners to send data immediately

	    //bidRequests
	    events.on(BID_REQUESTED, function (args) {
	      return _this2.enqueue({ eventType: BID_REQUESTED, args: args });
	    });
	    events.on(BID_RESPONSE, function (args) {
	      return _this2.enqueue({ eventType: BID_RESPONSE, args: args });
	    });
	    events.on(BID_TIMEOUT, function (args) {
	      return _this2.enqueue({ eventType: BID_TIMEOUT, args: args });
	    });
	    events.on(BID_WON, function (args) {
	      return _this2.enqueue({ eventType: BID_WON, args: args });
	    });
	    events.on(BID_ADJUSTMENT, function (args) {
	      return _this2.enqueue({ eventType: BID_ADJUSTMENT, args: args });
	    });
	    events.on(AUCTION_INIT, function (args) {
	      args.config = config.options; // enableAnaltyics configuration object
	      _this2.enqueue({ eventType: AUCTION_INIT, args: args });
	    });

	    // finally set this function to return log message, prevents multiple adapter listeners
	    this.enableAnalytics = function _enable() {
	      return utils.logMessage('Analytics adapter for "' + global + '" already enabled, unnecessary call to `enableAnalytics`.');
	    };
	  }

	  function _emptyQueue() {
	    if (_enableCheck) {
	      for (var i = 0; i < _queue.length; i++) {
	        _queue[i]();
	      }

	      //override push to execute the command immediately from now on
	      _queue.push = function (fn) {
	        fn();
	      };

	      _enableCheck = false;
	    }

	    utils.logMessage('event count sent to ' + global + ': ' + _eventCount);
	  }
	}

/***/ },
/* 29 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	Object.defineProperty(exports, "__esModule", {
	  value: true
	});

	var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

	exports.ajax = ajax;

	var _url = __webpack_require__(30);

	var utils = __webpack_require__(14);

	var XHR_DONE = 4;

	/**
	 * Simple IE9+ and cross-browser ajax request function
	 * Note: x-domain requests in IE9 do not support the use of cookies
	 *
	 * @param url string url
	 * @param callback object callback
	 * @param data mixed data
	 * @param options object
	 */

	function ajax(url, callback, data) {
	  var options = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : {};


	  var x = void 0,
	      method = options.method || (data ? 'POST' : 'GET'),

	  // For IE9 support use XDomainRequest instead of XMLHttpRequest.
	  useXDomainRequest = window.XDomainRequest && (!window.XMLHttpRequest || new window.XMLHttpRequest().responseType === undefined);

	  if (useXDomainRequest) {
	    x = new window.XDomainRequest();
	    x.onload = function () {
	      callback(x.responseText, x);
	    };

	    // http://stackoverflow.com/questions/15786966/xdomainrequest-aborts-post-on-ie-9
	    x.onerror = function () {
	      utils.logMessage('xhr onerror');
	    };
	    x.ontimeout = function () {
	      utils.logMessage('xhr timeout');
	    };
	    x.onprogress = function () {
	      utils.logMessage('xhr onprogress');
	    };
	  } else {
	    x = new window.XMLHttpRequest();
	    x.onreadystatechange = handler;
	  }

	  if (method === 'GET' && data) {
	    var urlInfo = (0, _url.parse)(url);
	    _extends(urlInfo.search, data);
	    url = (0, _url.format)(urlInfo);
	  }

	  x.open(method, url);

	  if (!useXDomainRequest) {
	    if (options.withCredentials) {
	      x.withCredentials = true;
	    }
	    if (options.preflight) {
	      x.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
	    }
	    x.setRequestHeader('Content-Type', options.contentType || 'text/plain');
	  }

	  x.send(method === 'POST' && data);

	  function handler() {
	    if (x.readyState === XHR_DONE && callback) {
	      callback(x.responseText, x);
	    }
	  }
	}

/***/ },
/* 30 */
/***/ function(module, exports) {

	'use strict';

	Object.defineProperty(exports, "__esModule", {
	  value: true
	});

	var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

	exports.parseQS = parseQS;
	exports.formatQS = formatQS;
	exports.parse = parse;
	exports.format = format;
	function parseQS(query) {
	  return !query ? {} : query.replace(/^\?/, '').split('&').reduce(function (acc, criteria) {
	    var _criteria$split = criteria.split('='),
	        _criteria$split2 = _slicedToArray(_criteria$split, 2),
	        k = _criteria$split2[0],
	        v = _criteria$split2[1];

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
	  return Object.keys(query).map(function (k) {
	    return Array.isArray(query[k]) ? query[k].map(function (v) {
	      return k + '[]=' + v;
	    }).join('&') : k + '=' + query[k];
	  }).join('&');
	}

	function parse(url) {
	  var parsed = document.createElement('a');
	  parsed.href = decodeURIComponent(url);
	  return {
	    protocol: (parsed.protocol || '').replace(/:$/, ''),
	    hostname: parsed.hostname,
	    port: +parsed.port,
	    pathname: parsed.pathname,
	    search: parseQS(parsed.search || ''),
	    hash: (parsed.hash || '').replace(/^#/, ''),
	    host: parsed.host
	  };
	}

	function format(obj) {
	  return (obj.protocol || 'http') + '://' + (obj.host || obj.hostname + (obj.port ? ':' + obj.port : '')) + (obj.pathname || '') + (obj.search ? '?' + formatQS(obj.search || '') : '') + (obj.hash ? '#' + obj.hash : '');
	}

/***/ },
/* 31 */
/***/ function(module, exports) {

	'use strict';

	/** @module polyfill
	Misc polyfills
	*/
	/*jshint -W121 */
	if (!Array.prototype.find) {
	  Object.defineProperty(Array.prototype, "find", {
	    value: function value(predicate) {
	      if (this === null) {
	        throw new TypeError('Array.prototype.find called on null or undefined');
	      }
	      if (typeof predicate !== 'function') {
	        throw new TypeError('predicate must be a function');
	      }
	      var list = Object(this);
	      var length = list.length >>> 0;
	      var thisArg = arguments[1];
	      var value;

	      for (var i = 0; i < length; i++) {
	        value = list[i];
	        if (predicate.call(thisArg, value, i, list)) {
	          return value;
	        }
	      }
	      return undefined;
	    }
	  });
	}

	if (!Array.prototype.includes) {
	  Object.defineProperty(Array.prototype, "includes", {
	    value: function value(searchElement) {
	      var O = Object(this);
	      var len = parseInt(O.length, 10) || 0;
	      if (len === 0) {
	        return false;
	      }
	      var n = parseInt(arguments[1], 10) || 0;
	      var k;
	      if (n >= 0) {
	        k = n;
	      } else {
	        k = len + n;
	        if (k < 0) {
	          k = 0;
	        }
	      }
	      var currentElement;
	      while (k < len) {
	        currentElement = O[k];
	        if (searchElement === currentElement || searchElement !== searchElement && currentElement !== currentElement) {
	          // NaN !== NaN
	          return true;
	        }
	        k++;
	      }
	      return false;
	    }
	  });
	}

	// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Number/isInteger
	Number.isInteger = Number.isInteger || function (value) {
	  return typeof value === 'number' && isFinite(value) && Math.floor(value) === value;
	};

/***/ },
/* 32 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	var _url = __webpack_require__(30);

	//Adserver parent class
	var AdServer = function AdServer(attr) {
	  this.name = attr.adserver;
	  this.code = attr.code;
	  this.getWinningBidByCode = function () {
	    var _this = this;

	    var bidObject = pbjs._bidsReceived.find(function (bid) {
	      return bid.adUnitCode === _this.code;
	    });
	    return bidObject;
	  };
	};

	//DFP ad server
	exports.dfpAdserver = function (options, urlComponents) {
	  var adserver = new AdServer(options);
	  adserver.urlComponents = urlComponents;

	  var dfpReqParams = {
	    'env': 'vp',
	    'gdfp_req': '1',
	    'impl': 's',
	    'unviewed_position_start': '1'
	  };

	  var dfpParamsWithVariableValue = ['output', 'iu', 'sz', 'url', 'correlator', 'description_url', 'hl'];

	  var getCustomParams = function getCustomParams(targeting) {
	    return encodeURIComponent((0, _url.formatQS)(targeting));
	  };

	  adserver.appendQueryParams = function () {
	    var bid = adserver.getWinningBidByCode();
	    this.urlComponents.search.description_url = encodeURIComponent(bid.vastUrl);
	    this.urlComponents.search.cust_params = getCustomParams(bid.adserverTargeting);
	    this.urlComponents.correlator = Date.now();
	  };

	  adserver.verifyAdserverTag = function () {
	    for (var key in dfpReqParams) {
	      if (!this.urlComponents.search.hasOwnProperty(key) || this.urlComponents.search[key] !== dfpReqParams[key]) {
	        return false;
	      }
	    }
	    for (var i in dfpParamsWithVariableValue) {
	      if (!this.urlComponents.search.hasOwnProperty(dfpParamsWithVariableValue[i])) {
	        return false;
	      }
	    }
	    return true;
	  };

	  return adserver;
	};

/***/ }
/******/ ]);
//# sourceMa ppingURL=prebid.js.map