import { ortbConverter } from '../libraries/ortbConverter/converter.js';
import { pbsExtensions } from '../libraries/pbsExtensions/pbsExtensions.js';
import { registerBidder } from '../src/adapters/bidderFactory.js';
import { config } from '../src/config.js';
import { BANNER, NATIVE, VIDEO } from '../src/mediaTypes.js';
import { find } from '../src/polyfill.js';
import { getGlobal } from '../src/prebidGlobal.js';
import { Renderer } from '../src/Renderer.js';
import {
  convertTypes,
  deepAccess,
  deepSetValue,
  formatQS,
  isArray,
  isNumber,
  isStr,
  logError,
  logMessage,
  logWarn,
  mergeDeep,
  parseSizesInput, _each
} from '../src/utils.js';

const DEFAULT_INTEGRATION = 'pbjs_lite';
const DEFAULT_PBS_INTEGRATION = 'pbjs';
const DEFAULT_RENDERER_URL = 'https://video-outstream.rubiconproject.com/apex-2.2.1.js';
// renderer code at https://github.com/rubicon-project/apex2

let rubiConf = {};
// we are saving these as global to this module so that if a pub accidentally overwrites the entire
// rubicon object, then we do not lose other data
config.getConfig('rubicon', config => {
  mergeDeep(rubiConf, config.rubicon);
});

const GVLID = 52;

var sizeMap = {
  1: '468x60',
  2: '728x90',
  5: '120x90',
  7: '125x125',
  8: '120x600',
  9: '160x600',
  10: '300x600',
  13: '200x200',
  14: '250x250',
  15: '300x250',
  16: '336x280',
  17: '240x400',
  19: '300x100',
  31: '980x120',
  32: '250x360',
  33: '180x500',
  35: '980x150',
  37: '468x400',
  38: '930x180',
  39: '750x100',
  40: '750x200',
  41: '750x300',
  42: '2x4',
  43: '320x50',
  44: '300x50',
  48: '300x300',
  53: '1024x768',
  54: '300x1050',
  55: '970x90',
  57: '970x250',
  58: '1000x90',
  59: '320x80',
  60: '320x150',
  61: '1000x1000',
  64: '580x500',
  65: '640x480',
  66: '930x600',
  67: '320x480',
  68: '1800x1000',
  72: '320x320',
  73: '320x160',
  78: '980x240',
  79: '980x300',
  80: '980x400',
  83: '480x300',
  85: '300x120',
  90: '548x150',
  94: '970x310',
  95: '970x100',
  96: '970x210',
  101: '480x320',
  102: '768x1024',
  103: '480x280',
  105: '250x800',
  108: '320x240',
  113: '1000x300',
  117: '320x100',
  125: '800x250',
  126: '200x600',
  144: '980x600',
  145: '980x150',
  152: '1000x250',
  156: '640x320',
  159: '320x250',
  179: '250x600',
  195: '600x300',
  198: '640x360',
  199: '640x200',
  213: '1030x590',
  214: '980x360',
  221: '1x1',
  229: '320x180',
  230: '2000x1400',
  232: '580x400',
  234: '6x6',
  251: '2x2',
  256: '480x820',
  257: '400x600',
  258: '500x200',
  259: '998x200',
  261: '480x480',
  264: '970x1000',
  265: '1920x1080',
  274: '1800x200',
  278: '320x500',
  282: '320x400',
  288: '640x380',
  524: '1x2',
  548: '500x1000',
  550: '980x480',
  552: '300x200',
  558: '640x640',
  562: '300x431',
  564: '320x431',
  566: '320x300',
  568: '300x150',
  570: '300x125',
  572: '250x350',
  574: '620x891',
  576: '610x877',
  578: '980x552',
  580: '505x656',
  622: '192x160'
};

_each(sizeMap, (item, key) => sizeMap[item] = key);

export const converter = ortbConverter({
  request(buildRequest, imps, bidderRequest, context) {
    const {bidRequests} = context;
    const data = buildRequest(imps, bidderRequest, context);
    data.cur = ['USD'];
    data.test = config.getConfig('debug') ? 1 : 0;
    deepSetValue(data, 'ext.prebid.cache', {
      vastxml: {
        returnCreative: rubiConf.returnVast === true
      }
    });

    deepSetValue(data, 'ext.prebid.bidders', {
      rubicon: {
        integration: rubiConf.int_type || DEFAULT_PBS_INTEGRATION,
      }
    });

    deepSetValue(data, 'ext.prebid.targeting.pricegranularity', getPriceGranularity(config));

    let modules = (getGlobal()).installedModules;
    if (modules && (!modules.length || modules.indexOf('rubiconAnalyticsAdapter') !== -1)) {
      deepSetValue(data, 'ext.prebid.analytics', {'rubicon': {'client-analytics': true}});
    }

    addOrtbFirstPartyData(data, bidRequests);

    delete data?.ext?.prebid?.storedrequest;

    // floors
    if (rubiConf.disableFloors === true) {
      delete data.ext.prebid.floors;
    }

    // If the price floors module is active, then we need to signal to PBS! If floorData obj is present is best way to check
    const haveFloorDataBidRequests = bidRequests.filter(bidRequest => typeof bidRequest.floorData === 'object');
    if (haveFloorDataBidRequests.length > 0) {
      data.ext.prebid.floors = { enabled: false };
    }
    return data;
  },
  imp(buildImp, bidRequest, context) {
    // skip banner-only requests
    const bidRequestType = bidType(bidRequest);
    if (bidRequestType.includes(BANNER) && bidRequestType.length == 1) return;

    const imp = buildImp(bidRequest, context);
    imp.id = bidRequest.adUnitCode;
    delete imp.banner;
    if (config.getConfig('s2sConfig.defaultTtl')) {
      imp.exp = config.getConfig('s2sConfig.defaultTtl');
    };
    bidRequest.params.position === 'atf' && (imp.video.pos = 1);
    bidRequest.params.position === 'btf' && (imp.video.pos = 3);
    delete imp.ext?.prebid?.storedrequest;

    setBidFloors(bidRequest, imp);

    return imp;
  },
  bidResponse(buildBidResponse, bid, context) {
    const bidResponse = buildBidResponse(bid, context);
    bidResponse.meta.mediaType = deepAccess(bid, 'ext.prebid.type');
    const {bidRequest} = context;
    if (bidResponse.mediaType === VIDEO && bidRequest.mediaTypes.video.context === 'outstream') {
      bidResponse.renderer = outstreamRenderer(bidResponse);
    }
    bidResponse.width = bid.w || deepAccess(bidRequest, 'mediaTypes.video.w') || deepAccess(bidRequest, 'params.video.playerWidth');
    bidResponse.height = bid.h || deepAccess(bidRequest, 'mediaTypes.video.h') || deepAccess(bidRequest, 'params.video.playerHeight');

    if (deepAccess(bid, 'ext.bidder.rp.advid')) {
      deepSetValue(bidResponse, 'meta.advertiserId', bid.ext.bidder.rp.advid);
    }
    return bidResponse;
  },
  context: {
    netRevenue: rubiConf.netRevenue !== false, // If anything other than false, netRev is true
    ttl: 300,
  },
  processors: pbsExtensions
});

export const spec = {
  code: 'rubicon',
  gvlid: GVLID,
  supportedMediaTypes: [BANNER, VIDEO, NATIVE],
  /**
   * @param {object} bid
   * @return boolean
   */
  isBidRequestValid: function (bid) {
    let valid = true;
    if (typeof bid.params !== 'object') {
      return false;
    }
    // validate account, site, zone have numeric values
    for (let i = 0, props = ['accountId', 'siteId', 'zoneId']; i < props.length; i++) {
      bid.params[props[i]] = parseInt(bid.params[props[i]])
      if (isNaN(bid.params[props[i]])) {
        logError('Rubicon: wrong format of accountId or siteId or zoneId.')
        return false
      }
    }
    let bidFormats = bidType(bid, true);
    // bidType is undefined? Return false
    if (!bidFormats.length) {
      return false;
    } else if (bidFormats.includes(VIDEO)) { // bidType is video, make sure it has required params
      valid = hasValidVideoParams(bid);
    }
    const hasBannerOrNativeMediaType = [BANNER, NATIVE].filter(mediaType => bidFormats.includes(mediaType)).length > 0;
    if (!hasBannerOrNativeMediaType) return valid;
    return valid && hasBannerOrNativeMediaType;
  },
  /**
   * @param {BidRequest[]} bidRequests
   * @param bidderRequest
   * @return BidRequest[]
   */
  buildRequests: function (bidRequests, bidderRequest) {
    // separate video bids because the requests are structured differently
    let requests = [];
    let filteredHttpRequest = [];
    let filteredRequests;

    filteredRequests = bidRequests.filter(req => {
      const mediaTypes = bidType(req) || [];
      const { length } = mediaTypes;
      const { bidonmultiformat, video } = req.params || {};

      return (
        // if there's just one mediaType and it's video or native, just send it!
        (length === 1 && (mediaTypes.includes(VIDEO) || mediaTypes.includes(NATIVE))) ||
        // if it's two mediaTypes, and they don't contain banner, send to PBS both native & video
        (length === 2 && !mediaTypes.includes(BANNER)) ||
        // if it contains the video param and the Video mediaType, send Video to PBS (not native!)
        (video && mediaTypes.includes(VIDEO)) ||
        // if bidonmultiformat is on, send everything to PBS
        (bidonmultiformat && (mediaTypes.includes(VIDEO) || mediaTypes.includes(NATIVE)))
      )
    });

    if (filteredRequests && filteredRequests.length) {
      const data = converter.toORTB({bidRequests: filteredRequests, bidderRequest});

      filteredHttpRequest.push({
        method: 'POST',
        url: `https://${rubiConf.videoHost || 'prebid-server'}.rubiconproject.com/openrtb2/auction`,
        data,
        bidRequest: filteredRequests
      });
    }

    const bannerBidRequests = bidRequests.filter((req) => {
      const mediaTypes = bidType(req) || [];
      const {bidonmultiformat, video} = req.params || {};
      return (
        // Send to fastlane if: it must include BANNER and...
        mediaTypes.includes(BANNER) && (
          // if it's just banner
          (mediaTypes.length === 1) ||
          // if bidonmultiformat is true
          bidonmultiformat ||
          // if bidonmultiformat is false and there's no video parameter
          (!bidonmultiformat && !video) ||
          // if there's video parameter, but there's no video mediatype
          (!bidonmultiformat && video && !mediaTypes.includes(VIDEO))
        )
      );
    });
    if (config.getConfig('rubicon.singleRequest') !== true) {
      // bids are not grouped if single request mode is not enabled
      requests = filteredHttpRequest.concat(bannerBidRequests.map(bidRequest => {
        const bidParams = spec.createSlotParams(bidRequest, bidderRequest);
        return {
          method: 'GET',
          url: `https://${rubiConf.bannerHost || 'fastlane'}.rubiconproject.com/a/api/fastlane.json`,
          data: spec.getOrderedParams(bidParams).reduce((paramString, key) => {
            const propValue = bidParams[key];
            return ((isStr(propValue) && propValue !== '') || isNumber(propValue)) ? `${paramString}${encodeParam(key, propValue)}&` : paramString;
          }, '') + `slots=1&rand=${Math.random()}`,
          bidRequest
        };
      }));
    } else {
      // single request requires bids to be grouped by site id into a single request
      // note: groupBy wasn't used because deep property access was needed
      const groupedBidRequests = bannerBidRequests.reduce((groupedBids, bid) => {
        (groupedBids[bid.params['siteId']] = groupedBids[bid.params['siteId']] || []).push(bid);
        return groupedBids;
      }, {});

      // fastlane SRA has a limit of 10 slots
      const SRA_BID_LIMIT = 10;

      // multiple requests are used if bids groups have more than 10 bids
      requests = filteredHttpRequest.concat(Object.keys(groupedBidRequests).reduce((aggregate, bidGroupKey) => {
        // for each partioned bidGroup, append a bidRequest to requests list
        partitionArray(groupedBidRequests[bidGroupKey], SRA_BID_LIMIT).forEach(bidsInGroup => {
          const combinedSlotParams = spec.combineSlotUrlParams(bidsInGroup.map(bidRequest => {
            return spec.createSlotParams(bidRequest, bidderRequest);
          }));

          // SRA request returns grouped bidRequest arrays not a plain bidRequest
          aggregate.push({
            method: 'GET',
            url: `https://${rubiConf.bannerHost || 'fastlane'}.rubiconproject.com/a/api/fastlane.json`,
            data: spec.getOrderedParams(combinedSlotParams).reduce((paramString, key) => {
              const propValue = combinedSlotParams[key];
              return ((isStr(propValue) && propValue !== '') || isNumber(propValue)) ? `${paramString}${encodeParam(key, propValue)}&` : paramString;
            }, '') + `slots=${bidsInGroup.length}&rand=${Math.random()}`,
            bidRequest: bidsInGroup
          });
        });
        return aggregate;
      }, []));
    }
    return requests;
  },

  getOrderedParams: function(params) {
    const containsTgV = /^tg_v/
    const containsTgI = /^tg_i/
    const containsUId = /^eid_|^tpid_/

    const orderedParams = [
      'account_id',
      'site_id',
      'zone_id',
      'size_id',
      'alt_size_ids',
      'p_pos',
      'gdpr',
      'gdpr_consent',
      'us_privacy',
      'rp_schain',
    ].concat(Object.keys(params).filter(item => containsUId.test(item)))
      .concat([
        'x_liverampidl',
        'ppuid',
        'rf',
        'p_geo.latitude',
        'p_geo.longitude',
        'kw'
      ]).concat(Object.keys(params).filter(item => containsTgV.test(item)))
      .concat(Object.keys(params).filter(item => containsTgI.test(item)))
      .concat([
        'tk_flint',
        'x_source.tid',
        'l_pb_bid_id',
        'p_screen_res',
        'rp_floor',
        'rp_secure',
        'tk_user_key'
      ]);

    return orderedParams.concat(Object.keys(params).filter(item => (orderedParams.indexOf(item) === -1)));
  },

  /**
   * @summary combines param values from an array of slots into a single semicolon delineated value
   * or just one value if they are all the same.
   * @param {Object[]} aSlotUrlParams - example [{p1: 'foo', p2: 'test'}, {p2: 'test'}, {p1: 'bar', p2: 'test'}]
   * @return {Object} - example {p1: 'foo;;bar', p2: 'test'}
   */
  combineSlotUrlParams: function(aSlotUrlParams) {
    // if only have params for one slot, return those params
    if (aSlotUrlParams.length === 1) {
      return aSlotUrlParams[0];
    }

    // reduce param values from all slot objects into an array of values in a single object
    const oCombinedSlotUrlParams = aSlotUrlParams.reduce(function(oCombinedParams, oSlotUrlParams, iIndex) {
      Object.keys(oSlotUrlParams).forEach(function(param) {
        if (!oCombinedParams.hasOwnProperty(param)) {
          oCombinedParams[param] = new Array(aSlotUrlParams.length); // initialize array;
        }
        // insert into the proper element of the array
        oCombinedParams[param].splice(iIndex, 1, oSlotUrlParams[param]);
      });

      return oCombinedParams;
    }, {});

    // convert arrays into semicolon delimited strings
    const re = new RegExp('^([^;]*)(;\\1)+$'); // regex to test for duplication

    Object.keys(oCombinedSlotUrlParams).forEach(function(param) {
      const sValues = oCombinedSlotUrlParams[param].join(';');
      // consolidate param values into one value if they are all the same
      const match = sValues.match(re);
      oCombinedSlotUrlParams[param] = match ? match[1] : sValues;
    });

    return oCombinedSlotUrlParams;
  },

  /**
   * @param {BidRequest} bidRequest
   * @param {Object} bidderRequest
   * @returns {Object} - object key values named and formatted as slot params
   */
  createSlotParams: function(bidRequest, bidderRequest) {
    bidRequest.startTime = new Date().getTime();

    const params = bidRequest.params;

    // use rubicon sizes if provided, otherwise adUnit.sizes
    const parsedSizes = parseSizes(bidRequest, 'banner');

    const [latitude, longitude] = params.latLong || [];

    const data = {
      'account_id': params.accountId,
      'site_id': params.siteId,
      'zone_id': params.zoneId,
      'size_id': parsedSizes[0],
      'alt_size_ids': parsedSizes.slice(1).join(',') || undefined,
      'rp_floor': (params.floor = parseFloat(params.floor)) >= 0.01 ? params.floor : undefined,
      'rp_secure': '1',
      'tk_flint': `${rubiConf.int_type || DEFAULT_INTEGRATION}_v$prebid.version$`,
      'x_source.tid': bidRequest.transactionId,
      'x_imp.ext.tid': bidRequest.transactionId,
      'l_pb_bid_id': bidRequest.bidId,
      'p_screen_res': _getScreenResolution(),
      'tk_user_key': params.userId,
      'p_geo.latitude': isNaN(parseFloat(latitude)) ? undefined : parseFloat(latitude).toFixed(4),
      'p_geo.longitude': isNaN(parseFloat(longitude)) ? undefined : parseFloat(longitude).toFixed(4),
      'tg_fl.eid': bidRequest.code,
      'rf': _getPageUrl(bidRequest, bidderRequest)
    };

    // If floors module is enabled and we get USD floor back, send it in rp_hard_floor else undfined
    if (typeof bidRequest.getFloor === 'function' && !rubiConf.disableFloors) {
      let floorInfo;
      try {
        floorInfo = bidRequest.getFloor({
          currency: 'USD',
          mediaType: 'banner',
          size: '*'
        });
      } catch (e) {
        logError('Rubicon: getFloor threw an error: ', e);
      }
      data['rp_hard_floor'] = typeof floorInfo === 'object' && floorInfo.currency === 'USD' && !isNaN(parseInt(floorInfo.floor)) ? floorInfo.floor : undefined;
    }

    // add p_pos only if specified and valid
    // For SRA we need to explicitly put empty semi colons so AE treats it as empty, instead of copying the latter value
    let posMapping = {1: 'atf', 3: 'btf'};
    let pos = posMapping[deepAccess(bidRequest, 'mediaTypes.banner.pos')] || '';
    data['p_pos'] = (params.position === 'atf' || params.position === 'btf') ? params.position : pos;

    // pass publisher provided userId if configured
    const configUserId = config.getConfig('user.id');
    if (configUserId) {
      data['ppuid'] = configUserId;
    }
    // loop through userIds and add to request
    if (bidRequest.userIdAsEids) {
      bidRequest.userIdAsEids.forEach(eid => {
        try {
          // special cases
          if (eid.source === 'adserver.org') {
            data['tpid_tdid'] = eid.uids[0].id;
            data['eid_adserver.org'] = eid.uids[0].id;
          } else if (eid.source === 'liveintent.com') {
            data['tpid_liveintent.com'] = eid.uids[0].id;
            data['eid_liveintent.com'] = eid.uids[0].id;
            if (eid.ext && Array.isArray(eid.ext.segments) && eid.ext.segments.length) {
              data['tg_v.LIseg'] = eid.ext.segments.join(',');
            }
          } else if (eid.source === 'liveramp.com') {
            data['x_liverampidl'] = eid.uids[0].id;
          } else if (eid.source === 'id5-sync.com') {
            data['eid_id5-sync.com'] = `${eid.uids[0].id}^${eid.uids[0].atype}^${(eid.uids[0].ext && eid.uids[0].ext.linkType) || ''}`;
          } else {
            // add anything else with this generic format
            data[`eid_${eid.source}`] = `${eid.uids[0].id}^${eid.uids[0].atype || ''}`;
          }
          // send AE "ppuid" signal if exists, and hasn't already been sent
          if (!data['ppuid']) {
            // get the first eid.uids[*].ext.stype === 'ppuid', if one exists
            const ppId = find(eid.uids, uid => uid.ext && uid.ext.stype === 'ppuid');
            if (ppId && ppId.id) {
              data['ppuid'] = ppId.id;
            }
          }
        } catch (e) {
          logWarn('Rubicon: error reading eid:', eid, e);
        }
      });
    }

    if (bidderRequest.gdprConsent) {
      // add 'gdpr' only if 'gdprApplies' is defined
      if (typeof bidderRequest.gdprConsent.gdprApplies === 'boolean') {
        data['gdpr'] = Number(bidderRequest.gdprConsent.gdprApplies);
      }
      data['gdpr_consent'] = bidderRequest.gdprConsent.consentString;
    }

    if (bidderRequest.uspConsent) {
      data['us_privacy'] = encodeURIComponent(bidderRequest.uspConsent);
    }

    data['rp_maxbids'] = bidderRequest.bidLimit || 1;

    applyFPD(bidRequest, BANNER, data);

    if (config.getConfig('coppa') === true) {
      data['coppa'] = 1;
    }

    // if SupplyChain is supplied and contains all required fields
    if (bidRequest.schain && hasValidSupplyChainParams(bidRequest.schain)) {
      data.rp_schain = spec.serializeSupplyChain(bidRequest.schain);
    }

    return data;
  },

  /**
   * Serializes schain params according to OpenRTB requirements
   * @param {Object} supplyChain
   * @returns {String}
   */
  serializeSupplyChain: function (supplyChain) {
    const supplyChainIsValid = hasValidSupplyChainParams(supplyChain);
    if (!supplyChainIsValid) return '';
    const { ver, complete, nodes } = supplyChain;
    return `${ver},${complete}!${spec.serializeSupplyChainNodes(nodes)}`;
  },

  /**
   * Properly sorts schain object params
   * @param {Array} nodes
   * @returns {String}
   */
  serializeSupplyChainNodes: function (nodes) {
    const nodePropOrder = ['asi', 'sid', 'hp', 'rid', 'name', 'domain'];
    return nodes.map(node => {
      return nodePropOrder.map(prop => encodeURIComponent(node[prop] || '')).join(',');
    }).join('!');
  },

  /**
   * @param {*} responseObj
   * @param {BidRequest|Object.<string, BidRequest[]>} request - if request was SRA the bidRequest argument will be a keyed BidRequest array object,
   * non-SRA responses return a plain BidRequest object
   * @return {Bid[]} An array of bids which
   */
  interpretResponse: function (responseObj, request) {
    responseObj = responseObj.body;
    const {data} = request;

    // check overall response
    if (!responseObj || typeof responseObj !== 'object') {
      return [];
    }

    // Response from PBS Java openRTB
    if (responseObj.seatbid) {
      const responseErrors = deepAccess(responseObj, 'ext.errors.rubicon');
      if (Array.isArray(responseErrors) && responseErrors.length > 0) {
        logWarn('Rubicon: Error in video response');
      }
      const bids = converter.fromORTB({request: data, response: responseObj}).bids;
      return bids;
    }

    let ads = responseObj.ads;
    let lastImpId;
    let multibid = 0;
    const {bidRequest} = request;

    // video ads array is wrapped in an object
    if (typeof bidRequest === 'object' && !Array.isArray(bidRequest) && bidType(bidRequest).includes(VIDEO) && typeof ads === 'object') {
      ads = ads[bidRequest.adUnitCode];
    }

    // check the ad response
    if (!Array.isArray(ads) || ads.length < 1) {
      return [];
    }

    return ads.reduce((bids, ad, i) => {
      (ad.impression_id && lastImpId === ad.impression_id) ? multibid++ : lastImpId = ad.impression_id;

      if (ad.status !== 'ok') {
        return bids;
      }

      // associate bidRequests; assuming ads matches bidRequest
      const associatedBidRequest = Array.isArray(bidRequest) ? bidRequest[i - multibid] : bidRequest;

      if (associatedBidRequest && typeof associatedBidRequest === 'object') {
        let bid = {
          requestId: associatedBidRequest.bidId,
          currency: 'USD',
          creativeId: ad.creative_id || `${ad.network || ''}-${ad.advertiser || ''}`,
          cpm: ad.cpm || 0,
          dealId: ad.deal,
          ttl: 300, // 5 minutes
          netRevenue: rubiConf.netRevenue !== false, // If anything other than false, netRev is true
          rubicon: {
            advertiserId: ad.advertiser, networkId: ad.network
          },
          meta: {
            advertiserId: ad.advertiser, networkId: ad.network, mediaType: BANNER
          }
        };

        if (ad.creative_type) {
          bid.mediaType = ad.creative_type;
        }

        if (ad.adomain) {
          bid.meta.advertiserDomains = Array.isArray(ad.adomain) ? ad.adomain : [ad.adomain];
        }

        if (ad.creative_type === VIDEO) {
          bid.width = associatedBidRequest.params.video.playerWidth;
          bid.height = associatedBidRequest.params.video.playerHeight;
          bid.vastUrl = ad.creative_depot_url;
          bid.impression_id = ad.impression_id;
          bid.videoCacheKey = ad.impression_id;
        } else {
          bid.ad = _renderCreative(ad.script, ad.impression_id);
          [bid.width, bid.height] = sizeMap[ad.size_id].split('x').map(num => Number(num));
        }

        // add server-side targeting
        bid.rubiconTargeting = (Array.isArray(ad.targeting) ? ad.targeting : [])
          .reduce((memo, item) => {
            memo[item.key] = item.values[0];
            return memo;
          }, {'rpfl_elemid': associatedBidRequest.adUnitCode});

        bids.push(bid);
      } else {
        logError(`Rubicon: bidRequest undefined at index position:${i}`, bidRequest, responseObj);
      }
      return bids;
    }, []).sort((adA, adB) => {
      return (adB.cpm || 0.0) - (adA.cpm || 0.0);
    });
  },
  getUserSyncs: function (syncOptions, responses, gdprConsent, uspConsent) {
    if (!hasSynced && syncOptions.iframeEnabled) {
      // data is only assigned if params are available to pass to syncEndpoint
      let params = {};

      if (gdprConsent) {
        if (typeof gdprConsent.gdprApplies === 'boolean') {
          params['gdpr'] = Number(gdprConsent.gdprApplies);
        }
        if (typeof gdprConsent.consentString === 'string') {
          params['gdpr_consent'] = gdprConsent.consentString;
        }
      }

      if (uspConsent) {
        params['us_privacy'] = encodeURIComponent(uspConsent);
      }

      params = Object.keys(params).length ? `?${formatQS(params)}` : '';

      hasSynced = true;
      return {
        type: 'iframe',
        url: `https://${rubiConf.syncHost || 'eus'}.rubiconproject.com/usync.html` + params
      };
    }
  },
  /**
   * Covert bid param types for S2S
   * @param {Object} params bid params
   * @param {Boolean} isOpenRtb boolean to check openrtb2 protocol
   * @return {Object} params bid params
   */
  transformBidParams: function(params, isOpenRtb) {
    return convertTypes({
      'accountId': 'number',
      'siteId': 'number',
      'zoneId': 'number'
    }, params);
  }
};

function _getScreenResolution() {
  return [window.screen.width, window.screen.height].join('x');
}

/**
 * @param {BidRequest} bidRequest
 * @param bidderRequest
 * @returns {string}
 */
function _getPageUrl(bidRequest, bidderRequest) {
  let pageUrl;
  if (bidRequest.params.referrer) {
    pageUrl = bidRequest.params.referrer;
  } else {
    pageUrl = bidderRequest.refererInfo.page;
  }
  return bidRequest.params.secure ? pageUrl.replace(/^http:/i, 'https:') : pageUrl;
}

function _renderCreative(script, impId) {
  return `<html>
<head><script type='text/javascript'>inDapIF=true;</script></head>
<body style='margin : 0; padding: 0;'>
<!-- Rubicon Project Ad Tag -->
<div data-rp-impression-id='${impId}'>
<script type='text/javascript'>${script}</script>
</div>
</body>
</html>`;
}

function hideGoogleAdsDiv(adUnit) {
  const el = adUnit.querySelector("div[id^='google_ads']");
  if (el) {
    el.style.setProperty('display', 'none');
  }
}

function hideSmartAdServerIframe(adUnit) {
  const el = adUnit.querySelector("script[id^='sas_script']");
  const nextSibling = el && el.nextSibling;
  if (nextSibling && nextSibling.localName === 'iframe') {
    nextSibling.style.setProperty('display', 'none');
  }
}

function renderBid(bid) {
  // hide existing ad units
  const adUnitElement = document.getElementById(bid.adUnitCode);
  hideGoogleAdsDiv(adUnitElement);
  hideSmartAdServerIframe(adUnitElement);

  // configure renderer
  const config = bid.renderer.getConfig();
  bid.renderer.push(() => {
    window.MagniteApex.renderAd({
      width: bid.width,
      height: bid.height,
      vastUrl: bid.vastUrl,
      placement: {
        attachTo: adUnitElement,
        align: config.align || 'center',
        position: config.position || 'append'
      },
      closeButton: config.closeButton || false,
      label: config.label || undefined,
      collapse: config.collapse || true
    });
  });
}

function outstreamRenderer(rtbBid) {
  const renderer = Renderer.install({
    id: rtbBid.adId,
    url: rubiConf.rendererUrl || DEFAULT_RENDERER_URL,
    config: rubiConf.rendererConfig || {},
    loaded: false,
    adUnitCode: rtbBid.adUnitCode
  });

  try {
    renderer.setRender(renderBid);
  } catch (err) {
    logWarn('Prebid Error calling setRender on renderer', err);
  }

  return renderer;
}

function parseSizes(bid, mediaType) {
  let params = bid.params;
  if (mediaType === VIDEO) {
    let size = [];
    if (params.video && params.video.playerWidth && params.video.playerHeight) {
      size = [
        params.video.playerWidth,
        params.video.playerHeight
      ];
    } else if (Array.isArray(deepAccess(bid, 'mediaTypes.video.playerSize')) && bid.mediaTypes.video.playerSize.length === 1) {
      size = bid.mediaTypes.video.playerSize[0];
    } else if (Array.isArray(bid.sizes) && bid.sizes.length > 0 && Array.isArray(bid.sizes[0]) && bid.sizes[0].length > 1) {
      size = bid.sizes[0];
    }
    return size;
  }

  // deprecated: temp legacy support
  let sizes = [];
  if (Array.isArray(params.sizes)) {
    sizes = params.sizes;
  } else if (typeof deepAccess(bid, 'mediaTypes.banner.sizes') !== 'undefined') {
    sizes = mapSizes(bid.mediaTypes.banner.sizes);
  } else if (Array.isArray(bid.sizes) && bid.sizes.length > 0) {
    sizes = mapSizes(bid.sizes);
  } else {
    logWarn('Rubicon: no sizes are setup or found');
  }

  return masSizeOrdering(sizes);
}

function applyFPD(bidRequest, mediaType, data) {
  const BID_FPD = {
    user: {ext: {data: {...bidRequest.params.visitor}}},
    site: {ext: {data: {...bidRequest.params.inventory}}}
  };

  if (bidRequest.params.keywords) BID_FPD.site.keywords = (isArray(bidRequest.params.keywords)) ? bidRequest.params.keywords.join(',') : bidRequest.params.keywords;

  let fpd = mergeDeep({}, bidRequest.ortb2 || {}, BID_FPD);
  let impExt = deepAccess(bidRequest.ortb2Imp, 'ext') || {};
  let impExtData = deepAccess(bidRequest.ortb2Imp, 'ext.data') || {};

  const gpid = deepAccess(bidRequest, 'ortb2Imp.ext.gpid');
  const SEGTAX = {user: [4], site: [1, 2, 5, 6]};
  const MAP = {user: 'tg_v.', site: 'tg_i.', adserver: 'tg_i.dfp_ad_unit_code', pbadslot: 'tg_i.pbadslot', keywords: 'kw'};
  const validate = function(prop, key, parentName) {
    if (key === 'data' && Array.isArray(prop)) {
      return prop.filter(name => name.segment && deepAccess(name, 'ext.segtax') && SEGTAX[parentName] &&
        SEGTAX[parentName].indexOf(deepAccess(name, 'ext.segtax')) !== -1).map(value => {
        let segments = value.segment.filter(obj => obj.id).reduce((result, obj) => {
          result.push(obj.id);
          return result;
        }, []);
        if (segments.length > 0) return segments.toString();
      }).toString();
    } else if (typeof prop === 'object' && !Array.isArray(prop)) {
      return undefined;
    } else if (typeof prop !== 'undefined') {
      return (Array.isArray(prop)) ? prop.filter(value => {
        if (typeof value !== 'object' && typeof value !== 'undefined') return value.toString();

        logWarn('Rubicon: Filtered value: ', value, 'for key', key, ': Expected value to be string, integer, or an array of strings/ints');
      }).toString() : prop.toString();
    }
  };
  const addBannerData = function(obj, name, key, isParent = true) {
    let val = validate(obj, key, name);
    let loc = (MAP[key] && isParent) ? `${MAP[key]}` : (key === 'data') ? `${MAP[name]}iab` : `${MAP[name]}${key}`;
    data[loc] = (data[loc]) ? data[loc].concat(',', val) : val;
  };

  if (mediaType === BANNER) {
    ['site', 'user'].forEach(name => {
      Object.keys(fpd[name]).forEach((key) => {
        if (name === 'site' && key === 'content' && fpd[name][key].data) {
          addBannerData(fpd[name][key].data, name, 'data');
        } else if (key !== 'ext') {
          addBannerData(fpd[name][key], name, key);
        } else if (fpd[name][key].data) {
          Object.keys(fpd[name].ext.data).forEach((key) => {
            addBannerData(fpd[name].ext.data[key], name, key, false);
          });
        }
      });
    });
    Object.keys(impExtData).forEach((key) => {
      if (key !== 'adserver') {
        addBannerData(impExtData[key], 'site', key);
      } else if (impExtData[key].name === 'gam') {
        addBannerData(impExtData[key].adslot, name, key)
      }
    });

    // add in gpid
    if (gpid) {
      data['p_gpid'] = gpid;
    }

    // only send one of pbadslot or dfp adunit code (prefer pbadslot)
    if (data['tg_i.pbadslot']) {
      delete data['tg_i.dfp_ad_unit_code'];
    }
  } else {
    if (Object.keys(impExt).length) {
      mergeDeep(data.imp[0].ext, impExt);
    }
    // add in gpid
    if (gpid) {
      data.imp[0].ext.gpid = gpid;
    }

    mergeDeep(data, fpd);
  }
}

/**
 * @param sizes
 * @returns {*}
 */
function mapSizes(sizes) {
  return parseSizesInput(sizes)
  // map sizes while excluding non-matches
    .reduce((result, size) => {
      let mappedSize = parseInt(sizeMap[size], 10);
      if (mappedSize) {
        result.push(mappedSize);
      }
      return result;
    }, []);
}

/**
 * Test if bid has mediaType or mediaTypes set for video.
 * Also checks if the video object is present in the rubicon bidder params
 * @param {BidRequest} bidRequest
 * @returns {boolean}
 */
export function classifiedAsVideo(bidRequest) {
  let isVideo = typeof deepAccess(bidRequest, `mediaTypes.${VIDEO}`) !== 'undefined';
  let isBanner = typeof deepAccess(bidRequest, `mediaTypes.${BANNER}`) !== 'undefined';
  let isBidOnMultiformat = typeof deepAccess(bidRequest, `params.bidonmultiformat`) !== 'undefined';
  let isMissingVideoParams = typeof deepAccess(bidRequest, 'params.video') !== 'object';
  // If an ad has both video and banner types, a legacy implementation allows choosing video over banner
  // based on whether or not there is a video object defined in the params
  // Given this legacy implementation, other code depends on params.video being defined

  // if it's bidonmultiformat, we don't care of the video object
  if (isVideo && isBidOnMultiformat) return true;

  if (isBanner && isMissingVideoParams) {
    isVideo = false;
  }
  if (isVideo && isMissingVideoParams) {
    deepSetValue(bidRequest, 'params.video', {});
  }
  return isVideo;
}

/**
 * Determine bidRequest mediaTypes. All mediaTypes must be correct. If one fails, all the others will fail too.
 * @param bid the bid to test
 * @param log boolean. whether we should log errors/warnings for invalid bids
 * @returns {string|undefined} Returns an array containing one of 'video' or 'banner' or 'native' if resolves to a type.
 */
function bidType(bid, log = false) {
  // Is it considered video ad unit by rubicon
  let bidTypes = [];
  if (classifiedAsVideo(bid)) {
    // Removed legacy mediaType support. new way using mediaTypes.video object is now required
    // We require either context as instream or outstream
    if (['outstream', 'instream'].indexOf(deepAccess(bid, `mediaTypes.${VIDEO}.context`)) === -1) {
      if (log) {
        logError('Rubicon: mediaTypes.video.context must be outstream or instream');
      }
      return bidTypes;
    }

    // we require playerWidth and playerHeight to come from one of params.playerWidth/playerHeight or mediaTypes.video.playerSize or adUnit.sizes
    if (parseSizes(bid, VIDEO).length < 2) {
      if (log) {
        logError('Rubicon: could not determine the playerSize of the video');
      }
      return bidTypes;
    }

    if (log) {
      logMessage('Rubicon: making video request for adUnit', bid.adUnitCode);
    }
    bidTypes.push(VIDEO);
  }
  if (typeof deepAccess(bid, `mediaTypes.${NATIVE}`) !== 'undefined') {
    bidTypes.push(NATIVE);
  }

  if (typeof deepAccess(bid, `mediaTypes.${BANNER}`) !== 'undefined') {
    // we require banner sizes to come from one of params.sizes or mediaTypes.banner.sizes or adUnit.sizes, in that order
    // if we cannot determine them, we reject it!
    if (parseSizes(bid, BANNER).length === 0) {
      if (log) {
        logError('Rubicon: could not determine the sizes for banner request');
      }
      return bidTypes;
    }

    // everything looks good for banner so lets do it
    if (log) {
      logMessage('Rubicon: making banner request for adUnit', bid.adUnitCode);
    }
    bidTypes.push(BANNER);
  }
  return bidTypes;
}

export const resetRubiConf = () => rubiConf = {};
export function masSizeOrdering(sizes) {
  const MAS_SIZE_PRIORITY = [15, 2, 9];

  return sizes.sort((first, second) => {
    // sort by MAS_SIZE_PRIORITY priority order
    const firstPriority = MAS_SIZE_PRIORITY.indexOf(first);
    const secondPriority = MAS_SIZE_PRIORITY.indexOf(second);

    if (firstPriority > -1 || secondPriority > -1) {
      if (firstPriority === -1) {
        return 1;
      }
      if (secondPriority === -1) {
        return -1;
      }
      return firstPriority - secondPriority;
    }

    // and finally ascending order
    return first - second;
  });
}

export function determineRubiconVideoSizeId(bid) {
  // If we have size_id in the bid then use it
  let rubiconSizeId = parseInt(deepAccess(bid, 'params.video.size_id'));
  if (!isNaN(rubiconSizeId)) {
    return rubiconSizeId;
  }
  // otherwise 203 for outstream and 201 for instream
  // When this function is used we know it has to be one of outstream or instream
  return deepAccess(bid, `mediaTypes.${VIDEO}.context`) === 'outstream' ? 203 : 201;
}

/**
 * @param {PrebidConfig} config
 * @returns {{ranges: {ranges: Object[]}}}
 */
export function getPriceGranularity(config) {
  return {
    ranges: {
      low: [{max: 5.00, increment: 0.50}],
      medium: [{max: 20.00, increment: 0.10}],
      high: [{max: 20.00, increment: 0.01}],
      auto: [
        {max: 5.00, increment: 0.05},
        {min: 5.00, max: 10.00, increment: 0.10},
        {min: 10.00, max: 20.00, increment: 0.50}
      ],
      dense: [
        {max: 3.00, increment: 0.01},
        {min: 3.00, max: 8.00, increment: 0.05},
        {min: 8.00, max: 20.00, increment: 0.50}
      ],
      custom: config.getConfig('customPriceBucket') && config.getConfig('customPriceBucket').buckets
    }[config.getConfig('priceGranularity')]
  };
}

// Function to validate the required video params
export function hasValidVideoParams(bid) {
  let isValid = true;
  // incase future javascript changes the string represenation of the array or number classes!
  let arrayType = Object.prototype.toString.call([]);
  let numberType = Object.prototype.toString.call(0);
  // required params and their associated object type
  var requiredParams = {
    mimes: arrayType,
    protocols: arrayType,
    linearity: numberType,
    api: arrayType
  }
  // loop through each param and verify it has the correct
  Object.keys(requiredParams).forEach(function(param) {
    if (Object.prototype.toString.call(deepAccess(bid, 'mediaTypes.video.' + param)) !== requiredParams[param]) {
      isValid = false;
      logError('Rubicon: mediaTypes.video.' + param + ' is required and must be of type: ' + requiredParams[param]);
    }
  })
  return isValid;
}

/**
 * Make sure the required params are present
 * @param {Object} schain
 * @param {Bool}
 */
export function hasValidSupplyChainParams(schain) {
  let isValid = false;
  const requiredFields = ['asi', 'sid', 'hp'];
  if (!schain.nodes) return isValid;
  isValid = schain.nodes.reduce((status, node) => {
    if (!status) return status;
    return requiredFields.every(field => node.hasOwnProperty(field));
  }, true);
  if (!isValid) logError('Rubicon: required schain params missing');
  return isValid;
}

/**
 * Creates a URL key value param, encoding the param unless the key is schain
 * @param {String} key
 * @param {String} param
 * @returns {String}
 */
export function encodeParam(key, param) {
  if (key === 'rp_schain') return `rp_schain=${param}`;
  return `${key}=${encodeURIComponent(param)}`;
}

/**
 * split array into multiple arrays of defined size
 * @param {Array} array
 * @param {number} size
 * @returns {Array}
 */
function partitionArray(array, size) {
  return array.map((e, i) => (i % size === 0) ? array.slice(i, i + size) : null).filter((e) => e)
}

var hasSynced = false;

export function resetUserSync() {
  hasSynced = false;
}

/**
 * Sets the floor on the bidRequest. imp.bidfloor and imp.bidfloorcur
 * should be already set by the conversion library. if they're not,
 * or invalid, try to read from params.floor.
 * @param {*} bidRequest
 * @param {*} imp
 */
function setBidFloors(bidRequest, imp) {
  if (imp.bidfloorcur != 'USD') {
    delete imp.bidfloor;
    delete imp.bidfloorcur;
  }

  if (!imp.bidfloor) {
    let bidFloor = parseFloat(deepAccess(bidRequest, 'params.floor'));

    if (!isNaN(bidFloor)) {
      imp.bidfloor = bidFloor;
      imp.bidfloorcur = 'USD';
    }
  }
}

function addOrtbFirstPartyData(data, nonBannerRequests) {
  let fpd = {};
  const keywords = new Set();
  nonBannerRequests.forEach(bidRequest => {
    const bidFirstPartyData = {
      user: {ext: {data: {...bidRequest.params.visitor}}},
      site: {ext: {data: {...bidRequest.params.inventory}}}
    };

    // add site.content.language
    const impThatHasVideoLanguage = data.imp.find(imp => imp.ext?.prebid?.bidder?.rubicon?.video?.language);
    if (impThatHasVideoLanguage) {
      bidFirstPartyData.site.content = {
        language: impThatHasVideoLanguage.ext?.prebid?.bidder?.rubicon?.video?.language
      }
    }

    if (bidRequest.params.keywords) {
      const keywordsArray = (!Array.isArray(bidRequest.params.keywords) ? bidRequest.params.keywords.split(',') : bidRequest.params.keywords);
      keywordsArray.forEach(keyword => keywords.add(keyword));
    }
    fpd = mergeDeep(fpd, bidRequest.ortb2 || {}, bidFirstPartyData);

    // add user.id from config.
    // NOTE: This is DEPRECATED. user.id should come from setConfig({ortb2}).
    const configUserId = config.getConfig('user.id');
    fpd.user.id = fpd.user.id || configUserId;
  });

  mergeDeep(data, fpd);

  if (keywords && keywords.size) {
    deepSetValue(data, 'site.keywords', Array.from(keywords.values()).join(','));
  }
  delete data?.ext?.prebid?.storedrequest;
}

registerBidder(spec);
