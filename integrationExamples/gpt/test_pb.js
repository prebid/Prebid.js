/* eslint-disable */
/* Generated from hbw: 1.4.0 */
var pbjs = window.pbjs || {};
pbjs.que = pbjs.que || [];
var googletag = window.googletag || {};
googletag.cmd = googletag.cmd || [];
var PREBID_TIMEOUT = 1500;

var REQUEST_BIDS_ON_PAGE_LOAD = true;
var SHOW_ADS_ON_PAGE_LOAD = {};
SHOW_ADS_ON_PAGE_LOAD.INITIALIZE_TARGETING_DATA = true;
SHOW_ADS_ON_PAGE_LOAD.ALLOW = true;

var IS_PREBID_LEGACY = false;

(function() {
  var logStorage = [];
  var debug = isDebug();
  var retries = 0;
  var MAX_RETRIES = 40;
  var data = [
    {
      'url': [
        'ap.localhost:9999'
      ],
      'adUnits': [
        {
          'code': 'div-1',
          'bids': [
            {
              'bidder': 'appnexus',
              'params': {
                'placementId': 13144370
              }
            }
          ],
          'mediaTypes': {
            'banner': {
              'sizes': [
                [
                  300,
                  250
                ],
                [
                  300,
                  600
                ]
              ]
            }
          },
          'sizes': [
            [
              300,
              250
            ],
            [
              300,
              600
            ]
          ]
        },
        {
          'code': 'out-video1',
          'bids': [
            {
              'bidder': 'appnexus',
              'params': {
                'placementId': 13232385,
                'video': {
                  'skippable': true,
                  'playback_method': [
                    'auto_play_sound_off'
                  ]
                }
              }
            }
          ],
          'mediaTypes': {
            'video': {
              'playerSize': [
                300,
                250
              ],
              'context': 'outstream'
            }
          },
          'sizes': [
            [
              300,
              250
            ]
          ]
        },
        {
          'code': 'video1',
          'bids': [
            {
              'bidder': 'appnexus',
              'params': {
                'placementId': 13232361,
                'video': {
                  'skippable': true,
                  'playback_method': [
                    'auto_play_sound_off'
                  ]
                }
              }
            }
          ],
          'mediaTypes': {
            'video': {
              'playerSize': [
                640,
                480
              ],
              'context': 'instream',
              'code': '/19968336/prebid_cache_video_adunit',
              'callback': "function(url) {videojs('vid1').ready(function(){var player=this;var vastAd=player.vastClient({adTagUrl:url,playAdAlways:true,verbosity:4,vpaidFlashLoaderPath:'https://github.com/MailOnline/videojs-vast-vpaid/blob/RELEASE/bin/VPAIDFlash.swf?raw=true',autoplay:true});player.muted(true);player.play();})}"
            }
          },
          'sizes': [
            [
              640,
              480
            ]
          ]
        }
      ]
    }
  ];

  var siteData;
  logMessage('Running HBW: 1.4.0 and prebid.js: 1.18.0');

  // 1) check on page var matching first
  data.forEach(function(config) {
    if (config.on_page_var) {
      try {
        if (getVarConfig(config)) {
          siteData = config.adUnits;
        }
      }catch (e) {}
    }
  });

  function getVarConfig(config) {
    var matched = false;
    var pieces = config.on_page_var.name.split('.');
    config.on_page_var.value.forEach(function(value) {
      var current = window;
      for (var i = 0; i <= pieces.length; i++) {
        if (current[pieces[i]]) {
          if (current[pieces[i]] === value) {
            logMatch('var', config.on_page_var.name, value);
            matched = true;
          }
          // move to next object to check
          current = current[pieces[i]];
        }
      }
    });
    return matched;
  }

  // 2) Check page URL matching 2nd.
  if (!siteData) {
    siteData = getConfig(data);
  }

  if (!siteData) {
    logMessage('Error: No valid configuration found for site');
    // invoke refresh call immediately and return
    initAdserver();
    return;
  }

  function contains(arr, obj) {
    return (arr.indexOf(obj) !== -1);
  }

  function filterAdSlots(slotIdArray) {
    return window.googletag.pubads().getSlots()
      .filter(function(slot) {
        return contains(slotIdArray, slot.getAdUnitPath()) || contains(slotIdArray, slot.getSlotElementId());
      });
  }

  // SOME RUNNING DEV NOTES
  // SPLIT winningBids object into two arrays based on mediaTypes and feed respective codes to each approach?
  // PASS entire adunits object to handleVideoReseponse first (as it will parse out the outstream/instream)
  //  NOTE -- does the renderAd function in the oustream the right thing to do for a refresh?
  // PASS filtered banner adUnit codes to the old code (need to update the setTargeting/dfp.refresh code?)
  //  NOTE -- could we refresh the outstream video ads here???

  // may still need raw adunits object

  // codes -> ['code1', 'code2']
  // read from pbjs.adunits[0].code
  function refreshAds(codes, opt) {
    pbjs.initAdserverSet = true;
    pbjs.requestBids({
      adUnitCodes: codes,

      // winningBids looks like {'adUnitCode1': { bids: [{ ... , mediaType: 'banner', }] } , 'adUnitCode2': {...}}
      bidsBackHandler: function bidsBackHandler(winningBids) {
        var videoCodes = [];
        var otherCodes = [];

        // get adUnits objects that need to be refreshed (mainly for video)
        var refreshAdUnits = pbjs.adUnits.filter(function(adUnit) {
          return codes.some(function(code) {
            return adUnit.code === code;
          });
        });

        // video instream rendering code
        refreshAdUnits.forEach(function(adUnit) {
          if (adUnit.mediaTypes && adUnit.mediaTypes.video && adUnit.mediaTypes.video.context !== 'outstream') {
            videoCodes.push(adUnit.code);
            renderInstreamVideoAd(adUnit);
          } else {
            otherCodes.push(adUnit.code);
          }
        });

        // banner/outstream? rendering code
        if (otherCodes && otherCodes.length > 0) {
          googletag.cmd.push(function() {
            pbjs.setTargetingForGPTAsync(otherCodes); // note should this be banner/outstream? codes only???
            window.googletag.pubads().refresh(filterAdSlots(otherCodes), opt);
          });
        }
      }
    });
  }

  pbjs.refreshAds = refreshAds;

  /*

  This function extends pbjs.refreshAds() and allows clients to refresh ads in
  the use case where infinite scroll is in place and/or the div id is dynamic.

  The client should provide mapping objects within an array as the first
  argument in the function. This contains the ad unit div id (as defined in
  the Prebid Enterprise Worksheet) and its corresponding actual ad unit div id
  on the webpage. Optionally a second argument can be supplied that is used in
  pbjs.refreshAds to pass additional parameters to googletag.pubads().refresh()

  Example:

  pbjs.infiniteScroll([{
    targetAdUnitCode: 'worksheet-div-id',
    newAdUnitCode: 'actual-div-id-onpage'
  }], {changeCorrelator: false})

  */
  function infiniteScroll(mapping, opt) {
    var codes = [];
    var configAdUnits = siteData
    var infiniteScrollMap = {};
    if (mapping.length > 0) {
      for (var i = 0; i < mapping.length; i++) {
        infiniteScrollMap[mapping[i].targetAdUnitCode] = mapping[i].newAdUnitCode;
        codes.push(mapping[i].newAdUnitCode);
      }
      for (var i = 0; i < configAdUnits.length; i++) {
        val = infiniteScrollMap[configAdUnits[i].code];
        if (typeof val != 'undefined') {
          pbjs.removeAdUnit(configAdUnits[i].code);
          configAdUnits[i].code = infiniteScrollMap[configAdUnits[i].code];
        }
      };
      pbjs.addAdUnits(configAdUnits);
    }
    pbjs.refreshAds(codes, opt);
  };
  pbjs.infiniteScroll = infiniteScroll

  pbjs.que.push(function() {
    pbjs.logging = true;
    pbjs.setConfig({priceGranularity: {'buckets': [{'max': 10, 'cap': 'False', 'increment': 0.01, 'min': 0.01}, {'max': 20, 'cap': 'False', 'increment': 0.05, 'min': 10}, {'max': 95, 'cap': 'True', 'increment': 0.5, 'min': 20}], 'precision': '2'}});






    if (containsInstreamAdunit(siteData)) {
      var cacheConfig = {
        cache: { url: 'https://prebid.adnxs.com/pbc/v1/cache' },
      }
      if (IS_PREBID_LEGACY) {
        cacheConfig['usePrebidCache'] = true;
      }
      pbjs.setConfig(cacheConfig);
    }

    pbjs.addAdUnits(siteData);

    if (REQUEST_BIDS_ON_PAGE_LOAD) {
      pbjs.requestBids({
        bidsBackHandler: function(bidResponses) {
          initAdserver();
        }
      });
    }
  });

  /**
   * UTIL FUNCTIONS
   **/

  function initAdserver() {
    if (pbjs.initAdserverSet) {
      return;
    }

    // RAD-1815 - set targeting right away then bail
    if (!SHOW_ADS_ON_PAGE_LOAD.ALLOW) {
      if (SHOW_ADS_ON_PAGE_LOAD.INITIALIZE_TARGETING_DATA) {
        queueSetTargeting();
      }
      pbjs.initAdserverSet = true;
      return;
    }
    if (!googletag.pubadsReady && retries <= MAX_RETRIES) {
      setTimeout(initAdserver, 75); // poll is hardcoded for now
      retries++;
      return;
    }

    handleVideoResponses(siteData);

    queueSetTargeting();
    googletag.cmd.push(function() {
      googletag.pubads().refresh();
    });
    pbjs.initAdserverSet = true;
  }

  function queueSetTargeting() {
    googletag.cmd.push(function() {
      pbjs.que.push(function() {
        pbjs.setTargetingForGPTAsync();
      });
    });
  }

  function logMatch(type, key, value) {
    if (type === 'url') {
      logMessage('configuration matched for type: "url" Matched key: ' + key);
    } else {
      logMessage('configuration matched for type: "var" Matched var name: ' + key + ' matched value: ' + value);
    }
  }

  function getConfig(data) {
    if (!data) return;

    var url = getHref();
    var keys = getKey(url);
    var config;
    keys.some(function(key) {
      return data.some(function(configObj) {
        if (!configObj || !configObj.url) return;
        configObj.url.forEach(function(url) {
          if (url === key) {
            config = configObj.adUnits;
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
      logMessage(e);
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
      // match trailing slash in config (RAD-1018)
      arr.push(url + '/');
    }
    return arr;
  }

  function logMessage() {
    logStorage.push(arguments);
    if (debug) {
   	 window.console.log.apply(null, arguments);
    }
  }

  function isDebug() {
    return window.location.search.toLowerCase().indexOf('pbjs_debug=true') !== -1;
  }

  function containsInstreamAdunit(adUnits) {
    var result = false;

    adUnits.forEach(function(adUnit) {
      if (
        adUnit &&
        adUnit.mediaTypes &&
        adUnit.mediaTypes.video &&
        adUnit.mediaTypes.video.context !== 'outstream'
      ) {
        result = true;
      }
    });

    return result;
  }

  function handleVideoResponses(adUnits) {
    adUnits && adUnits.forEach && adUnits.forEach(function(adUnit) {
      // instream
      if (
        adUnit.mediaTypes &&
        adUnit.mediaTypes.video &&
        adUnit.mediaTypes.video.context !== 'outstream'
      ) {
        renderInstreamVideoAd(adUnit);
      }

      // outstream
      if (
        adUnit.mediaTypes &&
        adUnit.mediaTypes.video &&
        adUnit.mediaTypes.video.context === 'outstream'
      ) {
        var video = pbjs.getAdserverTargetingForAdUnitCode(adUnit.code);
        pbjs.renderAd(document, video.hb_adid);
      }
    });
  }

  function renderInstreamVideoAd(adUnit) {
    var params = {
      adUnit: {code: adUnit.code, sizes: adUnit.sizes},
      params: {iu: adUnit.mediaTypes.video.code || adUnit.code, output: 'vast'}
    };

    var url = adUnit.mediaTypes.video.url;
    if (url) { params.url = url; }

    var videoUrl = pbjs.adServers.dfp.buildVideoUrl(params);
    if (adUnit.mediaTypes.video.callback) {
      var callbackFn = new Function(['videoUrl'], '(' + adUnit.mediaTypes.video.callback + ')(videoUrl)');
      callbackFn(videoUrl);
    }
  }

  /**
   * Function for replaying the logs (in case debug wasn't able to be turned on)
   * We don't have to synchronize with prebid.js this way.
   */
  pbjs.debugReplayLogs = function() {
    for (var i = 0; i < logStorage.length; i++) {
      window.console.log.apply(null, logStorage[i]);
    }
  }
  // we only want to fire initAdServer if we have requested demand - otherwise seems just silly
  // added the 2nd check for backwards compatibility - in case someone is counting on us to invoke the ad server with SHOW_ADS_ON_PAGE_LOAD flag even without demand fetched (again silly)
  if (REQUEST_BIDS_ON_PAGE_LOAD === true || (SHOW_ADS_ON_PAGE_LOAD.ALLOW === true && REQUEST_BIDS_ON_PAGE_LOAD === false)) {
    // setTimeout(initAdserver, PREBID_TIMEOUT);
  }
})(); // end closure

// var imported = document.createElement('script');
// imported.src = 'http://ap.localhost:9999/build/dev/prebid.js';
// document.head.appendChild(imported);
