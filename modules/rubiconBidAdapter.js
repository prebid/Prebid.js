import * as utils from 'src/utils';
import {registerBidder} from 'src/adapters/bidderFactory';
import {config} from 'src/config';
import {BANNER, VIDEO} from 'src/mediaTypes';

const INTEGRATION = 'pbjs_lite_v$prebid.version$';

function isSecure() {
  return location.protocol === 'https:';
}

// use protocol relative urls for http or https
const FASTLANE_ENDPOINT = '//fastlane.rubiconproject.com/a/api/fastlane.json';
const VIDEO_ENDPOINT = '//fastlane-adv.rubiconproject.com/v1/auction/video';
const SYNC_ENDPOINT = 'https://eus.rubiconproject.com/usync.html';

const TIMEOUT_BUFFER = 500;

var sizeMap = {
  1: '468x60',
  2: '728x90',
  5: '120x90',
  8: '120x600',
  9: '160x600',
  10: '300x600',
  13: '200x200',
  14: '250x250',
  15: '300x250',
  16: '336x280',
  19: '300x100',
  31: '980x120',
  32: '250x360',
  33: '180x500',
  35: '980x150',
  37: '468x400',
  38: '930x180',
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
  67: '320x480',
  68: '1800x1000',
  72: '320x320',
  73: '320x160',
  78: '980x240',
  79: '980x300',
  80: '980x400',
  83: '480x300',
  94: '970x310',
  96: '970x210',
  101: '480x320',
  102: '768x1024',
  103: '480x280',
  108: '320x240',
  113: '1000x300',
  117: '320x100',
  125: '800x250',
  126: '200x600',
  144: '980x600',
  159: '320x250',
  195: '600x300',
  199: '640x200',
  213: '1030x590',
  214: '980x360',
  232: '580x400'
};
utils._each(sizeMap, (item, key) => sizeMap[item] = key);

export const spec = {
  code: 'rubicon',
  aliases: ['rubiconLite'],
  supportedMediaTypes: [BANNER, VIDEO],
  /**
   * @param {object} bid
   * @return boolean
   */
  isBidRequestValid: function (bid) {
    if (typeof bid.params !== 'object') {
      return false;
    }
    let params = bid.params;

    if (!/^\d+$/.test(params.accountId)) {
      return false;
    }

    // Log warning if context is 'outstream', is not currently supported
    if (utils.deepAccess(bid, `mediaTypes.${VIDEO}.context`) === 'outstream') {
      utils.logWarn('Warning: outstream video for Rubicon Client Adapter is not supported yet');
    }

    // Log warning if mediaTypes contains both 'banner' and 'video'
    if (spec.hasVideoMediaType(bid) && typeof utils.deepAccess(bid, `mediaTypes.${BANNER}`) !== 'undefined') {
      utils.logWarn('Warning: instream video and banner requested for same ad unit, continuing with video instream request');
    }

    // Bid is invalid if legacy video is set but params video is missing size_id
    if (bid.mediaType === 'video' && typeof utils.deepAccess(bid, 'params.video.size_id') === 'undefined') {
      return false;
    }

    // Bid is invalid if mediaTypes video is invalid and a mediaTypes banner property is not defined
    if (bid.mediaTypes && !spec.hasVideoMediaType(bid) && typeof bid.mediaTypes.banner === 'undefined') {
      return false;
    }

    let parsedSizes = parseSizes(bid);
    if (parsedSizes.length < 1) {
      return false;
    }

    return true;
  },
  /**
   * @param {BidRequest[]} bidRequests
   * @param bidderRequest
   * @return ServerRequest[]
   */
  buildRequests: function (bidRequests, bidderRequest) {
    // separate video bids because the requests are structured differently
    let requests = [];
    const videoRequests = bidRequests.filter(spec.hasVideoMediaType).map(bidRequest => {
      bidRequest.startTime = new Date().getTime();

      let params = bidRequest.params;
      let size = parseSizes(bidRequest);

      let data = {
        page_url: _getPageUrl(bidRequest),
        resolution: _getScreenResolution(),
        account_id: params.accountId,
        integration: INTEGRATION,
        'x_source.tid': bidRequest.transactionId,
        timeout: bidderRequest.timeout - (Date.now() - bidderRequest.auctionStart + TIMEOUT_BUFFER),
        stash_creatives: true,
        ae_pass_through_parameters: params.video.aeParams,
        slots: []
      };

      // Define the slot object
      let slotData = {
        site_id: params.siteId,
        zone_id: params.zoneId,
        position: parsePosition(params.position),
        floor: parseFloat(params.floor) > 0.01 ? params.floor : 0.01,
        element_id: bidRequest.adUnitCode,
        name: bidRequest.adUnitCode,
        language: params.video.language,
        width: size[0],
        height: size[1],
        size_id: params.video.size_id
      };

      if (params.inventory && typeof params.inventory === 'object') {
        slotData.inventory = params.inventory;
      }

      if (params.keywords && Array.isArray(params.keywords)) {
        slotData.keywords = params.keywords;
      }

      if (params.visitor && typeof params.visitor === 'object') {
        slotData.visitor = params.visitor;
      }

      data.slots.push(slotData);

      if (bidderRequest.gdprConsent) {
        // add 'gdpr' only if 'gdprApplies' is defined
        if (typeof bidderRequest.gdprConsent.gdprApplies === 'boolean') {
          data.gdpr = Number(bidderRequest.gdprConsent.gdprApplies);
        }
        data.gdpr_consent = bidderRequest.gdprConsent.consentString;
      }

      return {
        method: 'POST',
        url: VIDEO_ENDPOINT,
        data,
        bidRequest
      }
    });

    if (config.getConfig('rubicon.singleRequest') !== true) {
      // bids are not grouped if single request mode is not enabled
      requests = videoRequests.concat(bidRequests.filter(bidRequest => !spec.hasVideoMediaType(bidRequest)).map(bidRequest => {
        const bidParams = spec.createSlotParams(bidRequest, bidderRequest);
        return {
          method: 'GET',
          url: FASTLANE_ENDPOINT,
          data: spec.getOrderedParams(bidParams).reduce((paramString, key) => {
            const propValue = bidParams[key];
            return ((utils.isStr(propValue) && propValue !== '') || utils.isNumber(propValue)) ? `${paramString}${key}=${encodeURIComponent(propValue)}&` : paramString;
          }, '') + `slots=1&rand=${Math.random()}`,
          bidRequest
        };
      }));
    } else {
      // single request requires bids to be grouped by site id into a single request
      // note: utils.groupBy wasn't used because deep property access was needed
      const nonVideoRequests = bidRequests.filter(bidRequest => !spec.hasVideoMediaType(bidRequest));
      const groupedBidRequests = nonVideoRequests.reduce((groupedBids, bid) => {
        (groupedBids[bid.params['siteId']] = groupedBids[bid.params['siteId']] || []).push(bid);
        return groupedBids;
      }, {});

      requests = videoRequests.concat(Object.keys(groupedBidRequests).map(bidGroupKey => {
        let bidsInGroup = groupedBidRequests[bidGroupKey];

        // fastlane SRA has a limit of 10 slots
        if (bidsInGroup.length > 10) {
          utils.logWarn(`single request mode has a limit of 10 bids: ${bidsInGroup.length - 10} bids were not sent`);
          bidsInGroup = bidsInGroup.slice(0, 10);
        }

        const combinedSlotParams = spec.combineSlotUrlParams(bidsInGroup.map(bidRequest => {
          return spec.createSlotParams(bidRequest, bidderRequest);
        }));

        // SRA request returns grouped bidRequest arrays not a plain bidRequest
        return {
          method: 'GET',
          url: FASTLANE_ENDPOINT,
          data: spec.getOrderedParams(combinedSlotParams).reduce((paramString, key) => {
            const propValue = combinedSlotParams[key];
            return ((utils.isStr(propValue) && propValue !== '') || utils.isNumber(propValue)) ? `${paramString}${key}=${encodeURIComponent(propValue)}&` : paramString;
          }, '') + `slots=${bidsInGroup.length}&rand=${Math.random()}`,
          bidRequest: bidsInGroup,
        };
      }));
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
      'rf',
      'dt.id',
      'dt.keyv',
      'dt.pref',
      'p_geo.latitude',
      'p_geo.longitude',
      'kw'
    ].concat(Object.keys(params).filter(item => containsTgV.test(item)))
      .concat(Object.keys(params).filter(item => containsTgI.test(item)))
      .concat([
        'tk_flint',
        'x_source.tid',
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
    const parsedSizes = parseSizes(bidRequest);

    const [latitude, longitude] = params.latLong || [];

    const data = {
      'account_id': params.accountId,
      'site_id': params.siteId,
      'zone_id': params.zoneId,
      'size_id': parsedSizes[0],
      'alt_size_ids': parsedSizes.slice(1).join(',') || undefined,
      'p_pos': parsePosition(params.position),
      'rp_floor': (params.floor = parseFloat(params.floor)) > 0.01 ? params.floor : 0.01,
      'rp_secure': isSecure() ? '1' : '0',
      'tk_flint': INTEGRATION,
      'x_source.tid': bidRequest.transactionId,
      'p_screen_res': _getScreenResolution(),
      'kw': Array.isArray(params.keywords) ? params.keywords.join(',') : '',
      'tk_user_key': params.userId,
      'p_geo.latitude': isNaN(parseFloat(latitude)) ? undefined : parseFloat(latitude).toFixed(4),
      'p_geo.longitude': isNaN(parseFloat(longitude)) ? undefined : parseFloat(longitude).toFixed(4),
      'tg_fl.eid': bidRequest.code,
      'rf': _getPageUrl(bidRequest)
    };

    if (bidderRequest.gdprConsent) {
      // add 'gdpr' only if 'gdprApplies' is defined
      if (typeof bidderRequest.gdprConsent.gdprApplies === 'boolean') {
        data['gdpr'] = Number(bidderRequest.gdprConsent.gdprApplies);
      }
      data['gdpr_consent'] = bidderRequest.gdprConsent.consentString;
    }

    // visitor properties
    if (params.visitor !== null && typeof params.visitor === 'object') {
      Object.keys(params.visitor).forEach((key) => {
        data[`tg_v.${key}`] = params.visitor[key].toString();
      });
    }

    // inventory properties
    if (params.inventory !== null && typeof params.inventory === 'object') {
      Object.keys(params.inventory).forEach((key) => {
        data[`tg_i.${key}`] = params.inventory[key].toString();
      });
    }

    // digitrust properties
    const digitrustParams = _getDigiTrustQueryParams();
    Object.keys(digitrustParams).forEach(paramKey => {
      data[paramKey] = digitrustParams[paramKey];
    });

    return data;
  },

  /**
   * Test if bid has mediaType or mediaTypes set for video.
   * note: 'mediaType' has been deprecated, however support will remain for a transitional period
   * @param {BidRequest} bidRequest
   * @returns {boolean}
   */
  hasVideoMediaType: function (bidRequest) {
    return (typeof utils.deepAccess(bidRequest, 'params.video.size_id') !== 'undefined' &&
      (bidRequest.mediaType === VIDEO || utils.deepAccess(bidRequest, `mediaTypes.${VIDEO}.context`) === 'instream'));
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

    let ads = responseObj.ads;

    // video ads array is wrapped in an object
    if (typeof bidRequest === 'object' && !Array.isArray(bidRequest) && spec.hasVideoMediaType(bidRequest) && typeof ads === 'object') {
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
          creativeId: ad.creative_id,
          cpm: ad.cpm || 0,
          dealId: ad.deal,
          ttl: 300, // 5 minutes
          netRevenue: config.getConfig('rubicon.netRevenue') || false,
          rubicon: {
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
        utils.logError(`bidRequest undefined at index position:${i}`, bidRequest, responseObj);
      }

      return bids;
    }, []).sort((adA, adB) => {
      return (adB.cpm || 0.0) - (adA.cpm || 0.0);
    });
  },
  getUserSyncs: function (syncOptions, responses, gdprConsent) {
    if (!hasSynced && syncOptions.iframeEnabled) {
      // data is only assigned if params are available to pass to SYNC_ENDPOINT
      let params = '';

      if (gdprConsent && typeof gdprConsent.consentString === 'string') {
        // add 'gdpr' only if 'gdprApplies' is defined
        if (typeof gdprConsent.gdprApplies === 'boolean') {
          params += `?gdpr=${Number(gdprConsent.gdprApplies)}&gdpr_consent=${gdprConsent.consentString}`;
        } else {
          params += `?gdpr_consent=${gdprConsent.consentString}`;
        }
      }

      hasSynced = true;
      return {
        type: 'iframe',
        url: SYNC_ENDPOINT + params
      };
    }
  }
};

function _getScreenResolution() {
  return [window.screen.width, window.screen.height].join('x');
}

function _getDigiTrustQueryParams() {
  function getDigiTrustId() {
    let digiTrustUser = window.DigiTrust && (config.getConfig('digiTrustId') || window.DigiTrust.getUser({member: 'T9QSFKPDN9'}));
    return (digiTrustUser && digiTrustUser.success && digiTrustUser.identity) || null;
  }

  let digiTrustId = getDigiTrustId();
  // Verify there is an ID and this user has not opted out
  if (!digiTrustId || (digiTrustId.privacy && digiTrustId.privacy.optout)) {
    return [];
  }
  return {
    'dt.id': digiTrustId.id,
    'dt.keyv': digiTrustId.keyv,
    'dt.pref': 0
  };
}

/**
 * @param {BidRequest} bidRequest
 * @returns {string}
 */
function _getPageUrl(bidRequest) {
  let page_url = config.getConfig('pageUrl');
  if (bidRequest.params.referrer) {
    page_url = bidRequest.params.referrer;
  } else if (!page_url) {
    page_url = utils.getTopWindowUrl();
  }
  return bidRequest.params.secure ? page_url.replace(/^http:/i, 'https:') : page_url;
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

function parseSizes(bid) {
  let params = bid.params;
  if (spec.hasVideoMediaType(bid)) {
    let size = [];
    if (typeof utils.deepAccess(bid, 'mediaTypes.video.playerSize') !== 'undefined') {
      size = bid.mediaTypes.video.playerSize;
    } else if (params.video && params.video.playerWidth && params.video.playerHeight) {
      size = [
        params.video.playerWidth,
        params.video.playerHeight
      ];
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
    utils.logWarn('Warning: no sizes are setup or found');
  }

  return masSizeOrdering(sizes);
}

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

function parsePosition(position) {
  if (position === 'atf' || position === 'btf') {
    return position;
  }
  return 'unknown';
}

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

var hasSynced = false;

export function resetUserSync() {
  hasSynced = false;
}

registerBidder(spec);
