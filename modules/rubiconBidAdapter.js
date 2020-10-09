import * as utils from '../src/utils.js';
import {registerBidder} from '../src/adapters/bidderFactory.js';
import {config} from '../src/config.js';
import {BANNER, VIDEO} from '../src/mediaTypes.js';
import find from 'core-js-pure/features/array/find.js';

const DEFAULT_INTEGRATION = 'pbjs_lite';
const DEFAULT_PBS_INTEGRATION = 'pbjs';

let rubiConf = {};
// we are saving these as global to this module so that if a pub accidentally overwrites the entire
// rubicon object, then we do not lose other data
config.getConfig('rubicon', config => {
  utils.mergeDeep(rubiConf, config.rubicon);
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
  264: '970x1000',
  265: '1920x1080',
  274: '1800x200',
  278: '320x500',
  282: '320x400',
  288: '640x380'
};
utils._each(sizeMap, (item, key) => sizeMap[item] = key);

export const spec = {
  code: 'rubicon',
  gvlid: GVLID,
  supportedMediaTypes: [BANNER, VIDEO],
  /**
   * @param {object} bid
   * @return boolean
   */
  isBidRequestValid: function (bid) {
    if (typeof bid.params !== 'object') {
      return false;
    }
    // validate account, site, zone have numeric values
    for (let i = 0, props = ['accountId', 'siteId', 'zoneId']; i < props.length; i++) {
      bid.params[props[i]] = parseInt(bid.params[props[i]])
      if (isNaN(bid.params[props[i]])) {
        utils.logError('Rubicon: wrong format of accountId or siteId or zoneId.')
        return false
      }
    }
    let bidFormat = bidType(bid, true);
    // bidType is undefined? Return false
    if (!bidFormat) {
      return false;
    } else if (bidFormat === 'video') { // bidType is video, make sure it has required params
      return hasValidVideoParams(bid);
    }
    // bidType is banner? return true
    return true;
  },
  /**
   * @param {BidRequest[]} bidRequests
   * @param bidderRequest
   * @return BidRequest[]
   */
  buildRequests: function (bidRequests, bidderRequest) {
    // separate video bids because the requests are structured differently
    let requests = [];
    const videoRequests = bidRequests.filter(bidRequest => bidType(bidRequest) === 'video').map(bidRequest => {
      bidRequest.startTime = new Date().getTime();

      const data = {
        id: bidRequest.transactionId,
        test: config.getConfig('debug') ? 1 : 0,
        cur: ['USD'],
        source: {
          tid: bidRequest.transactionId
        },
        tmax: bidderRequest.timeout,
        imp: [{
          exp: config.getConfig('s2sConfig.defaultTtl'),
          id: bidRequest.adUnitCode,
          secure: 1,
          ext: {
            [bidRequest.bidder]: bidRequest.params
          },
          video: utils.deepAccess(bidRequest, 'mediaTypes.video') || {}
        }],
        ext: {
          prebid: {
            cache: {
              vastxml: {
                returnCreative: rubiConf.returnVast === true
              }
            },
            targeting: {
              includewinners: true,
              // includebidderkeys always false for openrtb
              includebidderkeys: false,
              pricegranularity: getPriceGranularity(config)
            },
            bidders: {
              rubicon: {
                integration: rubiConf.int_type || DEFAULT_PBS_INTEGRATION
              }
            }
          }
        }
      }

      // Add alias if it is there
      if (bidRequest.bidder !== 'rubicon') {
        data.ext.prebid.aliases = {
          [bidRequest.bidder]: 'rubicon'
        }
      }

      let bidFloor;
      if (typeof bidRequest.getFloor === 'function' && !rubiConf.disableFloors) {
        let floorInfo;
        try {
          floorInfo = bidRequest.getFloor({
            currency: 'USD',
            mediaType: 'video',
            size: parseSizes(bidRequest, 'video')
          });
        } catch (e) {
          utils.logError('Rubicon: getFloor threw an error: ', e);
        }
        bidFloor = typeof floorInfo === 'object' && floorInfo.currency === 'USD' && !isNaN(parseInt(floorInfo.floor)) ? parseFloat(floorInfo.floor) : undefined;
      } else {
        bidFloor = parseFloat(utils.deepAccess(bidRequest, 'params.floor'));
      }
      if (!isNaN(bidFloor)) {
        data.imp[0].bidfloor = bidFloor;
      }
      // if value is set, will overwrite with same value
      data.imp[0].ext[bidRequest.bidder].video.size_id = determineRubiconVideoSizeId(bidRequest)

      appendSiteAppDevice(data, bidRequest, bidderRequest);

      addVideoParameters(data, bidRequest);

      if (bidderRequest.gdprConsent) {
        // note - gdprApplies & consentString may be undefined in certain use-cases for consentManagement module
        let gdprApplies;
        if (typeof bidderRequest.gdprConsent.gdprApplies === 'boolean') {
          gdprApplies = bidderRequest.gdprConsent.gdprApplies ? 1 : 0;
        }

        utils.deepSetValue(data, 'regs.ext.gdpr', gdprApplies);
        utils.deepSetValue(data, 'user.ext.consent', bidderRequest.gdprConsent.consentString);
      }

      if (bidderRequest.uspConsent) {
        utils.deepSetValue(data, 'regs.ext.us_privacy', bidderRequest.uspConsent);
      }

      const eids = utils.deepAccess(bidderRequest, 'bids.0.userIdAsEids');
      if (eids && eids.length) {
        utils.deepSetValue(data, 'user.ext.eids', eids);

        // liveintent requires additional props to be set
        const liveIntentEid = find(data.user.ext.eids, eid => eid.source === 'liveintent.com');
        if (liveIntentEid) {
          utils.deepSetValue(data, 'user.ext.tpid', { source: liveIntentEid.source, uid: liveIntentEid.uids[0].id });
          if (liveIntentEid.ext && liveIntentEid.ext.segments) {
            utils.deepSetValue(data, 'rp.target.LIseg', liveIntentEid.ext.segments);
          }
        }
      }

      // set user.id value from config value
      const configUserId = config.getConfig('user.id');
      if (configUserId) {
        utils.deepSetValue(data, 'user.id', configUserId);
      }

      if (config.getConfig('coppa') === true) {
        utils.deepSetValue(data, 'regs.coppa', 1);
      }

      if (bidRequest.schain && hasValidSupplyChainParams(bidRequest.schain)) {
        utils.deepSetValue(data, 'source.ext.schain', bidRequest.schain);
      }

      const siteData = Object.assign({}, bidRequest.params.inventory, config.getConfig('fpd.context'));
      const userData = Object.assign({}, bidRequest.params.visitor, config.getConfig('fpd.user'));
      if (!utils.isEmpty(siteData) || !utils.isEmpty(userData)) {
        const bidderData = {
          bidders: [ bidderRequest.bidderCode ],
          config: {
            fpd: {}
          }
        };

        if (!utils.isEmpty(siteData)) {
          bidderData.config.fpd.site = siteData;
        }

        if (!utils.isEmpty(userData)) {
          bidderData.config.fpd.user = userData;
        }

        utils.deepSetValue(data, 'ext.prebid.bidderconfig.0', bidderData);
      }

      /**
       * Prebid AdSlot
       * @type {(string|undefined)}
       */
      const pbAdSlot = utils.deepAccess(bidRequest, 'fpd.context.pbAdSlot');
      if (typeof pbAdSlot === 'string' && pbAdSlot) {
        utils.deepSetValue(data.imp[0].ext, 'context.data.pbadslot', pbAdSlot);
      }

      /**
       * Copy GAM AdUnit and Name to imp
       */
      ['name', 'adSlot'].forEach(name => {
        /** @type {(string|undefined)} */
        const value = utils.deepAccess(bidRequest, `fpd.context.adserver.${name}`);
        if (typeof value === 'string' && value) {
          utils.deepSetValue(data.imp[0].ext, `context.data.adserver.${name.toLowerCase()}`, value);
        }
      });

      // if storedAuctionResponse has been set, pass SRID
      if (bidRequest.storedAuctionResponse) {
        utils.deepSetValue(data.imp[0], 'ext.prebid.storedauctionresponse.id', bidRequest.storedAuctionResponse.toString());
      }

      // set ext.prebid.auctiontimestamp using auction time
      utils.deepSetValue(data.imp[0], 'ext.prebid.auctiontimestamp', bidderRequest.auctionStart);

      return {
        method: 'POST',
        url: `https://${rubiConf.videoHost || 'prebid-server'}.rubiconproject.com/openrtb2/auction`,
        data,
        bidRequest
      }
    });

    if (rubiConf.singleRequest !== true) {
      // bids are not grouped if single request mode is not enabled
      requests = videoRequests.concat(bidRequests.filter(bidRequest => bidType(bidRequest) === 'banner').map(bidRequest => {
        const bidParams = spec.createSlotParams(bidRequest, bidderRequest);
        return {
          method: 'GET',
          url: `https://${rubiConf.bannerHost || 'fastlane'}.rubiconproject.com/a/api/fastlane.json`,
          data: spec.getOrderedParams(bidParams).reduce((paramString, key) => {
            const propValue = bidParams[key];
            return ((utils.isStr(propValue) && propValue !== '') || utils.isNumber(propValue)) ? `${paramString}${encodeParam(key, propValue)}&` : paramString;
          }, '') + `slots=1&rand=${Math.random()}`,
          bidRequest
        };
      }));
    } else {
      // single request requires bids to be grouped by site id into a single request
      // note: utils.groupBy wasn't used because deep property access was needed
      const nonVideoRequests = bidRequests.filter(bidRequest => bidType(bidRequest) === 'banner');
      const groupedBidRequests = nonVideoRequests.reduce((groupedBids, bid) => {
        (groupedBids[bid.params['siteId']] = groupedBids[bid.params['siteId']] || []).push(bid);
        return groupedBids;
      }, {});

      // fastlane SRA has a limit of 10 slots
      const SRA_BID_LIMIT = 10;

      // multiple requests are used if bids groups have more than 10 bids
      requests = videoRequests.concat(Object.keys(groupedBidRequests).reduce((aggregate, bidGroupKey) => {
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
              return ((utils.isStr(propValue) && propValue !== '') || utils.isNumber(propValue)) ? `${paramString}${encodeParam(key, propValue)}&` : paramString;
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
      'tpid_tdid',
      'tpid_liveintent.com',
      'tg_v.LIseg',
      'ppuid',
      'eid_pubcid.org',
      'eid_sharedid.org',
      'eid_criteo.com',
      'rf',
      'p_geo.latitude',
      'p_geo.longitude',
      'kw'
    ].concat(Object.keys(params).filter(item => containsTgV.test(item)))
      .concat(Object.keys(params).filter(item => containsTgI.test(item)))
      .concat([
        'tk_flint',
        'x_source.tid',
        'x_source.pchain',
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
      'rp_floor': (params.floor = parseFloat(params.floor)) > 0.01 ? params.floor : 0.01,
      'rp_secure': '1',
      'tk_flint': `${rubiConf.int_type || DEFAULT_INTEGRATION}_v$prebid.version$`,
      'x_source.tid': bidRequest.transactionId,
      'x_source.pchain': params.pchain,
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
        utils.logError('Rubicon: getFloor threw an error: ', e);
      }
      data['rp_hard_floor'] = typeof floorInfo === 'object' && floorInfo.currency === 'USD' && !isNaN(parseInt(floorInfo.floor)) ? floorInfo.floor : undefined;
    }

    // add p_pos only if specified and valid
    // For SRA we need to explicitly put empty semi colons so AE treats it as empty, instead of copying the latter value
    data['p_pos'] = (params.position === 'atf' || params.position === 'btf') ? params.position : '';

    if (bidRequest.userIdAsEids && bidRequest.userIdAsEids.length) {
      const unifiedId = find(bidRequest.userIdAsEids, eid => eid.source === 'adserver.org');
      if (unifiedId) {
        data['tpid_tdid'] = unifiedId.uids[0].id;
      }
      const liveintentId = find(bidRequest.userIdAsEids, eid => eid.source === 'liveintent.com');
      if (liveintentId) {
        data['tpid_liveintent.com'] = liveintentId.uids[0].id;
        if (liveintentId.ext && Array.isArray(liveintentId.ext.segments) && liveintentId.ext.segments.length) {
          data['tg_v.LIseg'] = liveintentId.ext.segments.join(',');
        }
      }
      const liverampId = find(bidRequest.userIdAsEids, eid => eid.source === 'liveramp.com');
      if (liverampId) {
        data['x_liverampidl'] = liverampId.uids[0].id;
      }
      const sharedId = find(bidRequest.userIdAsEids, eid => eid.source === 'sharedid.org');
      if (sharedId) {
        data['eid_sharedid.org'] = `${sharedId.uids[0].id}^${sharedId.uids[0].atype}^${sharedId.uids[0].ext.third}`;
      }
      const pubcid = find(bidRequest.userIdAsEids, eid => eid.source === 'pubcid.org');
      if (pubcid) {
        data['eid_pubcid.org'] = `${pubcid.uids[0].id}^${pubcid.uids[0].atype}`;
      }
      const criteoId = find(bidRequest.userIdAsEids, eid => eid.source === 'criteo.com');
      if (criteoId) {
        data['eid_criteo.com'] = `${criteoId.uids[0].id}^${criteoId.uids[0].atype}`;
      }
    }

    // set ppuid value from config value
    const configUserId = config.getConfig('user.id');
    if (configUserId) {
      data['ppuid'] = configUserId;
    } else {
      // if config.getConfig('user.id') doesn't return anything, then look for the first eid.uids[*].ext.stype === 'ppuid'
      for (let i = 0; bidRequest.userIdAsEids && i < bidRequest.userIdAsEids.length; i++) {
        if (bidRequest.userIdAsEids[i].uids) {
          const pubProvidedId = find(bidRequest.userIdAsEids[i].uids, uid => uid.ext && uid.ext.stype === 'ppuid');
          if (pubProvidedId && pubProvidedId.id) {
            data['ppuid'] = pubProvidedId.id;
            break;
          }
        }
      }
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

    // visitor properties
    const visitorData = Object.assign({}, params.visitor, config.getConfig('fpd.user'));
    Object.keys(visitorData).forEach((key) => {
      if (visitorData[key] != null && key !== 'keywords') {
        data[`tg_v.${key}`] = typeof visitorData[key] === 'object' && !Array.isArray(visitorData[key])
          ? JSON.stringify(visitorData[key])
          : visitorData[key].toString(); // initialize array;
      }
    });

    // inventory properties
    const inventoryData = Object.assign({}, params.inventory, config.getConfig('fpd.context'));
    Object.keys(inventoryData).forEach((key) => {
      if (inventoryData[key] != null && key !== 'keywords') {
        data[`tg_i.${key}`] = typeof inventoryData[key] === 'object' && !Array.isArray(inventoryData[key])
          ? JSON.stringify(inventoryData[key])
          : inventoryData[key].toString();
      }
    });

    // keywords
    const keywords = (params.keywords || []).concat(
      utils.deepAccess(config.getConfig('fpd.user'), 'keywords') || [],
      utils.deepAccess(config.getConfig('fpd.context'), 'keywords') || []);
    data.kw = Array.isArray(keywords) && keywords.length ? keywords.join(',') : '';

    /**
     * Prebid AdSlot
     * @type {(string|undefined)}
     */
    const pbAdSlot = utils.deepAccess(bidRequest, 'fpd.context.pbAdSlot');
    if (typeof pbAdSlot === 'string' && pbAdSlot) {
      data['tg_i.pbadslot'] = pbAdSlot.replace(/^\/+/, '');
    }

    /**
     * GAM Ad Unit
     * @type {(string|undefined)}
     */
    const gamAdUnit = utils.deepAccess(bidRequest, 'fpd.context.adServer.adSlot');
    if (typeof gamAdUnit === 'string' && gamAdUnit) {
      data['tg_i.dfp_ad_unit_code'] = gamAdUnit.replace(/^\/+/, '');
    }

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
   * @param {BidRequest|Object.<string, BidRequest[]>} bidRequest - if request was SRA the bidRequest argument will be a keyed BidRequest array object,
   * non-SRA responses return a plain BidRequest object
   * @return {Bid[]} An array of bids which
   */
  interpretResponse: function (responseObj, {bidRequest}) {
    responseObj = responseObj.body;

    // check overall response
    if (!responseObj || typeof responseObj !== 'object') {
      return [];
    }

    // video response from PBS Java openRTB
    if (responseObj.seatbid) {
      const responseErrors = utils.deepAccess(responseObj, 'ext.errors.rubicon');
      if (Array.isArray(responseErrors) && responseErrors.length > 0) {
        utils.logWarn('Rubicon: Error in video response');
      }
      const bids = [];
      responseObj.seatbid.forEach(seatbid => {
        (seatbid.bid || []).forEach(bid => {
          let bidObject = {
            requestId: bidRequest.bidId,
            currency: responseObj.cur || 'USD',
            creativeId: bid.crid,
            cpm: bid.price || 0,
            bidderCode: seatbid.seat,
            ttl: 300,
            netRevenue: rubiConf.netRevenue !== false, // If anything other than false, netRev is true
            width: bid.w || utils.deepAccess(bidRequest, 'mediaTypes.video.w') || utils.deepAccess(bidRequest, 'params.video.playerWidth'),
            height: bid.h || utils.deepAccess(bidRequest, 'mediaTypes.video.h') || utils.deepAccess(bidRequest, 'params.video.playerHeight'),
          };

          if (bid.id) {
            bidObject.seatBidId = bid.id;
          }

          if (bid.dealid) {
            bidObject.dealId = bid.dealid;
          }

          let serverResponseTimeMs = utils.deepAccess(responseObj, 'ext.responsetimemillis.rubicon');
          if (bidRequest && serverResponseTimeMs) {
            bidRequest.serverResponseTimeMs = serverResponseTimeMs;
          }

          if (utils.deepAccess(bid, 'ext.prebid.type') === VIDEO) {
            bidObject.mediaType = VIDEO;
            const extPrebidTargeting = utils.deepAccess(bid, 'ext.prebid.targeting');

            // If ext.prebid.targeting exists, add it as a property value named 'adserverTargeting'
            if (extPrebidTargeting && typeof extPrebidTargeting === 'object') {
              bidObject.adserverTargeting = extPrebidTargeting;
            }

            // try to get cache values from 'response.ext.prebid.cache.js'
            // else try 'bid.ext.prebid.targeting' as fallback
            if (bid.ext.prebid.cache && typeof bid.ext.prebid.cache.vastXml === 'object' && bid.ext.prebid.cache.vastXml.cacheId && bid.ext.prebid.cache.vastXml.url) {
              bidObject.videoCacheKey = bid.ext.prebid.cache.vastXml.cacheId;
              bidObject.vastUrl = bid.ext.prebid.cache.vastXml.url;
            } else if (extPrebidTargeting && extPrebidTargeting.hb_uuid && extPrebidTargeting.hb_cache_host && extPrebidTargeting.hb_cache_path) {
              bidObject.videoCacheKey = extPrebidTargeting.hb_uuid;
              // build url using key and cache host
              bidObject.vastUrl = `https://${extPrebidTargeting.hb_cache_host}${extPrebidTargeting.hb_cache_path}?uuid=${extPrebidTargeting.hb_uuid}`;
            }

            if (bid.adm) { bidObject.vastXml = bid.adm; }
            if (bid.nurl) { bidObject.vastUrl = bid.nurl; }
            if (!bidObject.vastUrl && bid.nurl) { bidObject.vastUrl = bid.nurl; }
          } else {
            utils.logWarn('Rubicon: video response received non-video media type');
          }

          bids.push(bidObject);
        });
      });

      return bids;
    }

    let ads = responseObj.ads;

    // video ads array is wrapped in an object
    if (typeof bidRequest === 'object' && !Array.isArray(bidRequest) && bidType(bidRequest) === 'video' && typeof ads === 'object') {
      ads = ads[bidRequest.adUnitCode];
    }

    // check the ad response
    if (!Array.isArray(ads) || ads.length < 1) {
      return [];
    }

    return ads.reduce((bids, ad, i) => {
      if (ad.status !== 'ok') {
        return bids;
      }

      // associate bidRequests; assuming ads matches bidRequest
      const associatedBidRequest = Array.isArray(bidRequest) ? bidRequest[i] : bidRequest;

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
            advertiserId: ad.advertiser, networkId: ad.network
          }
        };

        if (ad.creative_type) {
          bid.mediaType = ad.creative_type;
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
        utils.logError(`Rubicon: bidRequest undefined at index position:${i}`, bidRequest, responseObj);
      }

      return bids;
    }, []).sort((adA, adB) => {
      return (adB.cpm || 0.0) - (adA.cpm || 0.0);
    });
  },
  getUserSyncs: function (syncOptions, responses, gdprConsent, uspConsent) {
    if (!hasSynced && syncOptions.iframeEnabled) {
      // data is only assigned if params are available to pass to syncEndpoint
      let params = '';

      if (gdprConsent && typeof gdprConsent.consentString === 'string') {
        // add 'gdpr' only if 'gdprApplies' is defined
        if (typeof gdprConsent.gdprApplies === 'boolean') {
          params += `?gdpr=${Number(gdprConsent.gdprApplies)}&gdpr_consent=${gdprConsent.consentString}`;
        } else {
          params += `?gdpr_consent=${gdprConsent.consentString}`;
        }
      }

      if (uspConsent) {
        params += `${params ? '&' : '?'}us_privacy=${encodeURIComponent(uspConsent)}`;
      }

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
    return utils.convertTypes({
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
  let pageUrl = config.getConfig('pageUrl');
  if (bidRequest.params.referrer) {
    pageUrl = bidRequest.params.referrer;
  } else if (!pageUrl) {
    pageUrl = bidderRequest.refererInfo.referer;
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

function parseSizes(bid, mediaType) {
  let params = bid.params;
  if (mediaType === 'video') {
    let size = [];
    if (params.video && params.video.playerWidth && params.video.playerHeight) {
      size = [
        params.video.playerWidth,
        params.video.playerHeight
      ];
    } else if (Array.isArray(utils.deepAccess(bid, 'mediaTypes.video.playerSize')) && bid.mediaTypes.video.playerSize.length === 1) {
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
  } else if (typeof utils.deepAccess(bid, 'mediaTypes.banner.sizes') !== 'undefined') {
    sizes = mapSizes(bid.mediaTypes.banner.sizes);
  } else if (Array.isArray(bid.sizes) && bid.sizes.length > 0) {
    sizes = mapSizes(bid.sizes)
  } else {
    utils.logWarn('Rubicon: no sizes are setup or found');
  }

  return masSizeOrdering(sizes);
}

/**
 * @param {Object} data
 * @param bidRequest
 * @param bidderRequest
 */
function appendSiteAppDevice(data, bidRequest, bidderRequest) {
  if (!data) return;

  // ORTB specifies app OR site
  if (typeof config.getConfig('app') === 'object') {
    data.app = config.getConfig('app');
  } else {
    data.site = {
      page: _getPageUrl(bidRequest, bidderRequest)
    }
  }
  if (typeof config.getConfig('device') === 'object') {
    data.device = config.getConfig('device');
  }
  // Add language to site and device objects if there
  if (bidRequest.params.video.language) {
    ['site', 'device'].forEach(function(param) {
      if (data[param]) {
        data[param].content = Object.assign({language: bidRequest.params.video.language}, data[param].content)
      }
    });
  }
}

/**
 * @param {Object} data
 * @param {BidRequest} bidRequest
 */
function addVideoParameters(data, bidRequest) {
  if (typeof data.imp[0].video === 'object' && data.imp[0].video.skip === undefined) {
    data.imp[0].video.skip = bidRequest.params.video.skip;
  }
  if (typeof data.imp[0].video === 'object' && data.imp[0].video.skipafter === undefined) {
    data.imp[0].video.skipafter = bidRequest.params.video.skipdelay;
  }
  // video.pos can already be specified by adunit.mediatypes.video.pos.
  // but if not, it might be specified in the params
  if (typeof data.imp[0].video === 'object' && data.imp[0].video.pos === undefined) {
    if (bidRequest.params.position === 'atf') {
      data.imp[0].video.pos = 1;
    } else if (bidRequest.params.position === 'btf') {
      data.imp[0].video.pos = 3;
    }
  }

  const size = parseSizes(bidRequest, 'video')
  data.imp[0].video.w = size[0]
  data.imp[0].video.h = size[1]
}

/**
 * @param sizes
 * @returns {*}
 */
function mapSizes(sizes) {
  return utils.parseSizesInput(sizes)
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
 * Also makes sure the video object is present in the rubicon bidder params
 * @param {BidRequest} bidRequest
 * @returns {boolean}
 */
export function hasVideoMediaType(bidRequest) {
  if (typeof utils.deepAccess(bidRequest, 'params.video') !== 'object') {
    return false;
  }
  return (typeof utils.deepAccess(bidRequest, `mediaTypes.${VIDEO}`) !== 'undefined');
}

/**
 * Determine bidRequest mediaType
 * @param bid the bid to test
 * @param log whether we should log errors/warnings for invalid bids
 * @returns {string|undefined} Returns 'video' or 'banner' if resolves to a type, or undefined otherwise (invalid).
 */
function bidType(bid, log = false) {
  // Is it considered video ad unit by rubicon
  if (hasVideoMediaType(bid)) {
    // Removed legacy mediaType support. new way using mediaTypes.video object is now required
    // We require either context as instream or outstream
    if (['outstream', 'instream'].indexOf(utils.deepAccess(bid, `mediaTypes.${VIDEO}.context`)) === -1) {
      if (log) {
        utils.logError('Rubicon: mediaTypes.video.context must be outstream or instream');
      }
      return;
    }

    // we require playerWidth and playerHeight to come from one of params.playerWidth/playerHeight or mediaTypes.video.playerSize or adUnit.sizes
    if (parseSizes(bid, 'video').length < 2) {
      if (log) {
        utils.logError('Rubicon: could not determine the playerSize of the video');
      }
      return;
    }

    if (log) {
      utils.logMessage('Rubicon: making video request for adUnit', bid.adUnitCode);
    }
    return 'video';
  } else {
    // we require banner sizes to come from one of params.sizes or mediaTypes.banner.sizes or adUnit.sizes, in that order
    // if we cannot determine them, we reject it!
    if (parseSizes(bid, 'banner').length === 0) {
      if (log) {
        utils.logError('Rubicon: could not determine the sizes for banner request');
      }
      return;
    }

    // everything looks good for banner so lets do it
    if (log) {
      utils.logMessage('Rubicon: making banner request for adUnit', bid.adUnitCode);
    }
    return 'banner';
  }
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
  let rubiconSizeId = parseInt(utils.deepAccess(bid, 'params.video.size_id'));
  if (!isNaN(rubiconSizeId)) {
    return rubiconSizeId;
  }
  // otherwise 203 for outstream and 201 for instream
  // When this function is used we know it has to be one of outstream or instream
  return utils.deepAccess(bid, `mediaTypes.${VIDEO}.context`) === 'outstream' ? 203 : 201;
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
    maxduration: numberType,
    linearity: numberType,
    api: arrayType
  }
  // loop through each param and verify it has the correct
  Object.keys(requiredParams).forEach(function(param) {
    if (Object.prototype.toString.call(utils.deepAccess(bid, 'mediaTypes.video.' + param)) !== requiredParams[param]) {
      isValid = false;
      utils.logError('Rubicon: mediaTypes.video.' + param + ' is required and must be of type: ' + requiredParams[param]);
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
  if (!isValid) utils.logError('Rubicon: required schain params missing');
  return isValid;
}

/**
 * Creates a URL key value param, encoding the
 * param unless the key is schain
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

registerBidder(spec);
