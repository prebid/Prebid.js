import {getDevicePixelRatio} from '../libraries/devicePixelRatio/devicePixelRatio.js';
import {deepAccess, getWinDimensions, getWindowTop, isGptPubadsDefined} from '../src/utils.js';
import {registerBidder} from '../src/adapters/bidderFactory.js';
import {config} from '../src/config.js';
import {BANNER, NATIVE} from '../src/mediaTypes.js';
import {getStorageManager} from '../src/storageManager.js';
import {ajax} from '../src/ajax.js';
import {convertOrtbRequestToProprietaryNative} from '../src/native.js';
import {getAdUnitSizes} from '../libraries/sizeUtils/sizeUtils.js';
import {isWebdriverEnabled} from '../libraries/webdriver/webdriver.js';
import { buildNativeRequest, parseNativeResponse } from '../libraries/nativeAssetsUtils.js';

export const storage = getStorageManager({bidderCode: 'datablocks'});

// DEFINE THE PREBID BIDDER SPEC
export const spec = {
  supportedMediaTypes: [BANNER, NATIVE],
  code: 'datablocks',

  // DATABLOCKS SCOPED OBJECT
  db_obj: {metrics_host: 'prebid.dblks.net', metrics: [], metrics_timer: null, metrics_queue_time: 1000, vis_optout: false, source_id: 0},

  // STORE THE DATABLOCKS BUYERID IN STORAGE
  store_dbid: function(dbid) {
    let stored = false;

    // CREATE 1 YEAR EXPIRY DATE
    const d = new Date();
    d.setTime(Date.now() + (365 * 24 * 60 * 60 * 1000));

    // TRY TO STORE IN COOKIE
    if (storage.cookiesAreEnabled) {
      storage.setCookie('_db_dbid', dbid, d.toUTCString(), 'None', null);
      stored = true;
    }

    // TRY TO STORE IN LOCAL STORAGE
    if (storage.localStorageIsEnabled) {
      storage.setDataInLocalStorage('_db_dbid', dbid);
      stored = true;
    }

    return stored;
  },

  // FETCH DATABLOCKS BUYERID FROM STORAGE
  get_dbid: function() {
    let dbId = '';
    if (storage.cookiesAreEnabled) {
      dbId = storage.getCookie('_db_dbid') || '';
    }

    if (!dbId && storage.localStorageIsEnabled) {
      dbId = storage.getDataFromLocalStorage('_db_dbid') || '';
    }
    return dbId;
  },

  // STORE SYNCS IN STORAGE
  store_syncs: function(syncs) {
    if (storage.localStorageIsEnabled) {
      const syncObj = {};
      syncs.forEach(sync => {
        syncObj[sync.id] = sync.uid;
      });

      // FETCH EXISTING SYNCS AND MERGE NEW INTO STORAGE
      const storedSyncs = this.get_syncs();
      storage.setDataInLocalStorage('_db_syncs', JSON.stringify(Object.assign(storedSyncs, syncObj)));

      return true;
    }
  },

  // GET SYNCS FROM STORAGE
  get_syncs: function() {
    if (storage.localStorageIsEnabled) {
      const syncData = storage.getDataFromLocalStorage('_db_syncs');
      if (syncData) {
        return JSON.parse(syncData);
      } else {
        return {};
      }
    } else {
      return {};
    }
  },

  // ADD METRIC DATA TO THE METRICS RESPONSE QUEUE
  queue_metric: function(metric) {
    if (typeof metric === 'object') {
      // PUT METRICS IN THE QUEUE
      this.db_obj.metrics.push(metric);

      // RESET PREVIOUS TIMER
      if (this.db_obj.metrics_timer) {
        clearTimeout(this.db_obj.metrics_timer);
      }

      // SETUP THE TIMER TO FIRE BACK THE DATA
      const scope = this;
      this.db_obj.metrics_timer = setTimeout(function() {
        scope.send_metrics();
      }, this.db_obj.metrics_queue_time);

      return true;
    } else {
      return false;
    }
  },

  // POST CONSOLIDATED METRICS BACK TO SERVER
  send_metrics: function() {
    // POST TO SERVER
    ajax(`https://${this.db_obj.metrics_host}/a/pb/`, null, JSON.stringify(this.db_obj.metrics), {method: 'POST', withCredentials: true});

    // RESET THE QUEUE OF METRIC DATA
    this.db_obj.metrics = [];

    return true;
  },

  // GET BASIC CLIENT INFORMATION
  get_client_info: function () {
    const botTest = new BotClientTests();
    const win = getWindowTop();
    const windowDimensions = getWinDimensions();
    return {
      'wiw': windowDimensions.innerWidth,
      'wih': windowDimensions.innerHeight,
      'saw': null,
      'sah': null,
      'scd': null,
      'sw': windowDimensions.screen.width,
      'sh': windowDimensions.screen.height,
      'whl': win.history.length,
      'wxo': win.pageXOffset,
      'wyo': win.pageYOffset,
      'wpr': getDevicePixelRatio(win),
      'is_bot': botTest.doTests(),
      'is_hid': win.document.hidden,
      'vs': win.document.visibilityState
    };
  },

  // LISTEN FOR GPT VIEWABILITY EVENTS
  get_viewability: function(bid) {
    // ONLY RUN ONCE IF PUBLISHER HAS OPTED IN
    if (!this.db_obj.vis_optout && !this.db_obj.vis_run) {
      this.db_obj.vis_run = true;

      // ADD GPT EVENT LISTENERS
      const scope = this;
      if (isGptPubadsDefined()) {
        if (typeof window['googletag'].pubads().addEventListener === 'function') {
          // TODO: fix auctionId leak: https://github.com/prebid/Prebid.js/issues/9781
          window['googletag'].pubads().addEventListener('impressionViewable', function(event) {
            scope.queue_metric({type: 'slot_view', source_id: scope.db_obj.source_id, auction_id: bid.auctionId, div_id: event.slot.getSlotElementId(), slot_id: event.slot.getSlotId().getAdUnitPath()});
          });
          window['googletag'].pubads().addEventListener('slotRenderEnded', function(event) {
            scope.queue_metric({type: 'slot_render', source_id: scope.db_obj.source_id, auction_id: bid.auctionId, div_id: event.slot.getSlotElementId(), slot_id: event.slot.getSlotId().getAdUnitPath()});
          })
        }
      }
    }
  },

  // VALIDATE THE BID REQUEST
  isBidRequestValid: function(bid) {
    // SET GLOBAL VARS FROM BIDDER CONFIG
    this.db_obj.source_id = bid.params.source_id;
    if (bid.params.vis_optout) {
      this.db_obj.vis_optout = true;
    }

    return !!(bid.params.source_id && bid.mediaTypes && (bid.mediaTypes.banner || bid.mediaTypes.native));
  },

  // GENERATE THE RTB REQUEST
  buildRequests: function(validRequests, bidderRequest) {
    // convert Native ORTB definition to old-style prebid native definition
    validRequests = convertOrtbRequestToProprietaryNative(validRequests);

    // RETURN EMPTY IF THERE ARE NO VALID REQUESTS
    if (!validRequests.length) {
      return [];
    }

    const imps = [];
    // ITERATE THE VALID REQUESTS AND GENERATE IMP OBJECT
    validRequests.forEach(bidRequest => {
      // BUILD THE IMP OBJECT
      const imp = {
        id: bidRequest.bidId,
        tagid: bidRequest.params.tagid || bidRequest.adUnitCode,
        placement_id: bidRequest.params.placement_id || 0,
        secure: window.location.protocol === 'https:',
        ortb2: deepAccess(bidRequest, `ortb2Imp`) || {},
        floor: {}
      }

      // CHECK FOR FLOORS
      if (typeof bidRequest.getFloor === 'function') {
        imp.floor = bidRequest.getFloor({
          currency: 'USD',
          mediaType: '*',
          size: '*'
        });
      }

      // BUILD THE SIZES
      if (deepAccess(bidRequest, `mediaTypes.banner`)) {
        const sizes = getAdUnitSizes(bidRequest);
        if (sizes.length) {
          imp.banner = {
            w: sizes[0][0],
            h: sizes[0][1],
            format: sizes.map(size => ({ w: size[0], h: size[1] }))
          };

          // ADD TO THE LIST OF IMP REQUESTS
          imps.push(imp);
        }
      } else if (deepAccess(bidRequest, `mediaTypes.native`)) {
        // ADD TO THE LIST OF IMP REQUESTS
        imp.native = buildNativeRequest(bidRequest.nativeParams);
        imps.push(imp);
      }
    });

    // RETURN EMPTY IF THERE WERE NO PROPER ADUNIT REQUESTS TO BE MADE
    if (!imps.length) {
      return [];
    }

    // GENERATE SITE OBJECT
    const site = {
      domain: window.location.host,
      // TODO: is 'page' the right value here?
      page: bidderRequest.refererInfo.page,
      schain: validRequests[0]?.ortb2?.source?.ext?.schain || {},
      ext: {
        p_domain: bidderRequest.refererInfo.domain,
        rt: bidderRequest.refererInfo.reachedTop,
        frames: bidderRequest.refererInfo.numIframes,
        stack: bidderRequest.refererInfo.stack,
        timeout: config.getConfig('bidderTimeout')
      },
    };

    // ADD REF URL IF FOUND
    if (self === top && document.referrer) {
      site.ref = document.referrer;
    }

    // ADD META KEYWORDS IF FOUND
    const keywords = document.getElementsByTagName('meta')['keywords'];
    if (keywords && keywords.content) {
      site.keywords = keywords.content;
    }

    // GENERATE DEVICE OBJECT
    const device = {
      ip: 'peer',
      ua: window.navigator.userAgent,
      js: 1,
      language: ((navigator.language || navigator.userLanguage || '').split('-'))[0] || 'en',
      buyerid: this.get_dbid() || 0,
      ext: {
        pb_eids: validRequests[0].userIdAsEids || {},
        syncs: this.get_syncs() || {},
        coppa: config.getConfig('coppa') || 0,
        gdpr: bidderRequest.gdprConsent || {},
        usp: bidderRequest.uspConsent || {},
        client_info: this.get_client_info(),
        ortb2: bidderRequest.ortb2 || {}
      }
    };

    const sourceId = validRequests[0].params.source_id || 0;
    const host = validRequests[0].params.host || 'prebid.dblks.net';

    // RETURN WITH THE REQUEST AND PAYLOAD
    return {
      method: 'POST',
      url: `https://${host}/openrtb/?sid=${sourceId}`,
      data: {
        id: bidderRequest.bidderRequestId,
        imp: imps,
        site: site,
        device: device
      },
      options: {
        withCredentials: true
      }
    };
  },

  // INITIATE USER SYNCING
  getUserSyncs: function(options, rtbResponse, gdprConsent) {
    const syncs = [];
    const bidResponse = rtbResponse?.[0]?.body ?? null;
    const scope = this;

    // LISTEN FOR SYNC DATA FROM IFRAME TYPE SYNC
    window.addEventListener('message', function (event) {
      if (event.data.sentinel && event.data.sentinel === 'dblks_syncData') {
        // STORE FOUND SYNCS
        if (event.data.syncs) {
          scope.store_syncs(event.data.syncs);
        }
      }
    });

    // POPULATE GDPR INFORMATION
    const gdprData = {
      gdpr: 0,
      gdprConsent: ''
    }
    if (typeof gdprConsent === 'object') {
      if (typeof gdprConsent.gdprApplies === 'boolean') {
        gdprData.gdpr = Number(gdprConsent.gdprApplies);
        gdprData.gdprConsent = gdprConsent.consentString;
      } else {
        gdprData.gdprConsent = gdprConsent.consentString;
      }
    }

    // EXTRACT BUYERID COOKIE VALUE FROM BID RESPONSE AND PUT INTO STORAGE
    let dbBuyerId = this.get_dbid() || '';
    if (bidResponse.ext && bidResponse.ext.buyerid) {
      dbBuyerId = bidResponse.ext.buyerid;
      this.store_dbid(dbBuyerId);
    }

    // EXTRACT USERSYNCS FROM BID RESPONSE
    if (bidResponse.ext && bidResponse.ext.syncs) {
      bidResponse.ext.syncs.forEach(sync => {
        if (checkValid(sync)) {
          syncs.push(addParams(sync));
        }
      })
    }

    // APPEND PARAMS TO SYNC URL
    function addParams(sync) {
      // PARSE THE URL
      try {
        const url = new URL(sync.url);
        const urlParams = {};
        for (const [key, value] of url.searchParams.entries()) {
          urlParams[key] = value;
        };

        // APPLY EXTRA VARS
        urlParams.gdpr = gdprData.gdpr;
        urlParams.gdprConsent = gdprData.gdprConsent;
        urlParams.bidid = bidResponse.bidid;
        urlParams.id = bidResponse.id;
        urlParams.uid = dbBuyerId;

        // REBUILD URL
        sync.url = `${url.origin}${url.pathname}?${Object.keys(urlParams).map(key => key + '=' + encodeURIComponent(urlParams[key])).join('&')}`;
      } catch (e) {};

      // RETURN THE REBUILT URL
      return sync;
    }

    // ENSURE THAT THE SYNC TYPE IS VALID AND HAS PERMISSION
    function checkValid(sync) {
      if (!sync.type || !sync.url) {
        return false;
      }
      switch (sync.type) {
        case 'iframe':
          return options.iframeEnabled;
        case 'image':
          return options.pixelEnabled;
        default:
          return false;
      }
    }
    return syncs;
  },

  // DATABLOCKS WON THE AUCTION - REPORT SUCCESS
  onBidWon: function(bid) {
    this.queue_metric({type: 'bid_won', source_id: bid.params[0].source_id, req_id: bid.requestId, slot_id: bid.adUnitCode, auction_id: bid.auctionId, size: bid.size, cpm: bid.cpm, pb: bid.adserverTargeting.hb_pb, rt: bid.timeToRespond, ttl: bid.ttl});
  },

  // TARGETING HAS BEEN SET
  onSetTargeting: function(bid) {
    // LISTEN FOR VIEWABILITY EVENTS
    this.get_viewability(bid);
  },

  // PARSE THE RTB RESPONSE AND RETURN FINAL RESULTS
  interpretResponse: function(rtbResponse, bidRequest) {
    const bids = [];
    const resBids = deepAccess(rtbResponse, 'body.seatbid') || [];
    resBids.forEach(bid => {
      const resultItem = {requestId: bid.id, cpm: bid.price, creativeId: bid.crid, currency: bid.currency || 'USD', netRevenue: true, ttl: bid.ttl || 360, meta: {advertiserDomains: bid.adomain}};

      const mediaType = deepAccess(bid, 'ext.mtype') || '';
      switch (mediaType) {
        case 'banner':
          bids.push(Object.assign({}, resultItem, {mediaType: BANNER, width: bid.w, height: bid.h, ad: bid.adm}));
          break;

        case 'native':
          const nativeResult = JSON.parse(bid.adm);
          bids.push(Object.assign({}, resultItem, {mediaType: NATIVE, native: parseNativeResponse(nativeResult.native)}));
          break;

        default:
          break;
      }
    })

    return bids;
  }
};

// DETECT BOTS
export class BotClientTests {
  constructor() {
    this.tests = {
      headless_chrome: function() {
        // Warning: accessing navigator.webdriver may impact fingerprinting scores when this API is included in the built script.
        return isWebdriverEnabled();
      },

      selenium: function () {
        let response = false;

        if (window && document) {
          const results = [
            'webdriver' in window,
            '_Selenium_IDE_Recorder' in window,
            'callSelenium' in window,
            '_selenium' in window,
            '__webdriver_script_fn' in document,
            '__driver_evaluate' in document,
            '__webdriver_evaluate' in document,
            '__selenium_evaluate' in document,
            '__fxdriver_evaluate' in document,
            '__driver_unwrapped' in document,
            '__webdriver_unwrapped' in document,
            '__selenium_unwrapped' in document,
            '__fxdriver_unwrapped' in document,
            '__webdriver_script_func' in document,
            document.documentElement.getAttribute('selenium') !== null,
            document.documentElement.getAttribute('webdriver') !== null,
            document.documentElement.getAttribute('driver') !== null
          ];

          results.forEach(result => {
            if (result === true) {
              response = true;
            }
          })
        }

        return response;
      },
    }
  }
  doTests() {
    let response = false;
    for (const i of Object.keys(this.tests)) {
      if (this.tests[i]() === true) {
        response = true;
      }
    }
    return response;
  }
}

// INIT OUR BIDDER WITH PREBID
registerBidder(spec);
