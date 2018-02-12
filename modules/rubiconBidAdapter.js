import * as utils from 'src/utils';
import {registerBidder} from 'src/adapters/bidderFactory';
import {config} from 'src/config';

const INTEGRATION = 'pbjs_lite_v$prebid.version$';

function isSecure() {
  return location.protocol === 'https:';
}

// use protocol relative urls for http or https
const FASTLANE_ENDPOINT = '//fastlane.rubiconproject.com/a/api/fastlane.json';
const VIDEO_ENDPOINT = '//fastlane-adv.rubiconproject.com/v1/auction/video';
const SYNC_ENDPOINT = 'https://tap-secure.rubiconproject.com/partner/scripts/rubicon/emily.html?rtb_ext=1';

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
  54: '300x1050',
  55: '970x90',
  57: '970x250',
  58: '1000x90',
  59: '320x80',
  60: '320x150',
  61: '1000x1000',
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
  195: '600x300',
  199: '640x200',
  213: '1030x590',
  214: '980x360',
};
utils._each(sizeMap, (item, key) => sizeMap[item] = key);

export const spec = {
  code: 'rubicon',
  aliases: ['rubiconLite'],
  supportedMediaTypes: ['banner', 'video'],
  /**
   * @param {object} bid
   * @return boolean
   */
  isBidRequestValid: function(bid) {
    if (typeof bid.params !== 'object') {
      return false;
    }
    let params = bid.params;

    if (!/^\d+$/.test(params.accountId)) {
      return false;
    }

    let parsedSizes = parseSizes(bid);
    if (parsedSizes.length < 1) {
      return false;
    }

    if (bid.mediaType === 'video') {
      if (typeof params.video !== 'object' || !params.video.size_id) {
        return false;
      }
    }
    return true;
  },

  createVideoBid: function(bidRequest, bidderRequest) {
    bidRequest.startTime = new Date().getTime();
    let params = bidRequest.params;
    let size = parseSizes(bidRequest);
    let page_rf = !params.referrer ? utils.getTopWindowUrl() : params.referrer;

    let data = {
      page_url: params.secure ? page_rf.replace(/^http:/i, 'https:') : page_rf,
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
      position: params.position || 'btf',
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

    return {
      method: 'POST',
      url: VIDEO_ENDPOINT,
      data,
      bidRequest
    }
  },

  /**
   * @param {BidRequest[]} bidRequests
   * @param bidderRequest
   * @return ServerRequest[]
   */
  buildRequests: function(bidRequests, bidderRequest) {

    const videoBidRequests = bidRequests.filter(bidRequest => bidRequest.mediaType === 'video').map(bidRequest => {
      return spec.createVideoBid(bidRequest, bidderRequest);
    });

    const nonVideoBidRequests = bidRequests.filter(bidRequest => bidRequest.mediaType !== 'video');

    let bidRequestGroups = [];

    // bids are not grouped if single request mode is not enabled
    if (config.getConfig('rubicon.singleRequest') !== true) {
      bidRequestGroups = nonVideoBidRequests.map(bidRequest => {
        const slotParams = spec.createSlotParams(bidRequest, bidderRequest);
        const combinedSlotParams = spec.combineSlotUrlParams([slotParams]);

        return {
          method: 'GET',
          url: FASTLANE_ENDPOINT,
          data: Object.keys(combinedSlotParams).reduce((paramString, key) => `${paramString}${key}=${combinedSlotParams[key]}&`, '?')
          + `slots=1&rand=${Math.random()}`, bidRequest
        };
      });
    }
    else {
      // single request requires bids to be grouped by site id into a single request
      bidRequestGroups = bidRequests
        .map(bidRequest => bidRequest.params.siteId)
        .filter(utils.uniques)
        .map(siteId => bidRequests.filter(bidRequest => (bidRequest.params.siteId === siteId)))
        .map(bidRequests => {
          if (bidRequests.length > 10) {
            bidRequests = bidRequests.slice(0, 10);
          }
          const slotParams = bidRequests.map(item => {
            spec.createSlotParams(item, bidderRequest)
          });
          const combinedSlotParams = spec.combineSlotUrlParams(slotParams);

          return {
            method: 'GET',
            url: FASTLANE_ENDPOINT,
            data: Object.keys(combinedSlotParams).reduce((paramString, key) => `${paramString}${key}=${combinedSlotParams[key]}&`, '?')
            + `slots=1&rand=${Math.random()}`,
            bidRequests
          };
        });
    }

    return bidRequestGroups.concat(videoBidRequests);
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

  createSlotParams: function(bidRequest) {
    bidRequest.startTime = new Date().getTime();

    // use rubicon sizes if provided, otherwise adUnit.sizes
    const parsedSizes = parseSizes(bidRequest);

    const data = {
      'account_id': bidRequest.params.accountId,
      'site_id': bidRequest.params.siteId,
      'zone_id': bidRequest.params.zoneId,
      'size_id': parsedSizes[0],
      'alt_size_ids': parsedSizes.slice(1).join(',') || undefined,
      'p_pos': bidRequest.params.position || 'btf',
      'rp_floor': (parseFloat(bidRequest.params.floor)) > 0.01 ? parseFloat(bidRequest.params.floor) : 0.01,
      'rp_secure': '1',
      'tk_flint': 'pbjs_lite_v',
      'x_source.tid': bidRequest.transactionId,
      'p_screen_res': `${window.screen.width}x${window.screen.height}`,
      'kw': bidRequest.params.keywords.join(','),
      'tk_user_key': bidRequest.params.userId,
      'rf': !pageUrl ? utils.getTopWindowUrl() : pageUrl
    };
    const visitor = bidRequest.params.visitor;
    if (visitor !== null && typeof visitor === 'object') {
      Object.keys(visitor).forEach((key) => {
        data[`tg_v.${key}`] = visitor[key];
      });
    }

    const inventory = bidRequest.params.inventory;
    if (inventory !== null && typeof inventory === 'object') {
      Object.keys(inventory).forEach((key) => {
        data[`tg_i.${key}`] = inventory[key];
      });
    }

    const digiTrustUser = window.DigiTrust && (config.getConfig('digiTrustId') || window.DigiTrust.getUser({member: 'T9QSFKPDN9'}));
    const digiTrustId = (digiTrustUser && digiTrustUser.success && digiTrustUser.identity) || null;
    // Verify there is an ID and this user has not opted out
    if (digiTrustId && (digiTrustId.privacy && digiTrustId.privacy.optout !== true)) {
      data['dt.id'] = digiTrustId.id;
      data['dt.keyv'] = digiTrustId.keyv;
      data['dt.pref'] = 0;
    }
    return data;
  },

  /**
   * @param {*} responseObj
   * @param {BidRequest} bidRequest
   * @return {Bid[]} An array of bids which
   */
  interpretResponse: function(responseObj, {bidRequest}) {
    responseObj = responseObj.body;
    // console.log('responseObj %O  bidRequest %O', responseObj, bidRequest);
    let ads = responseObj.ads;

    // check overall response
    if (typeof responseObj !== 'object' || responseObj.status !== 'ok') {
      return [];
    }

    // video ads array is wrapped in an object
    if (typeof bidRequest === 'object' && bidRequest.mediaType === 'video' && typeof ads === 'object') {
      ads = ads[bidRequest.adUnitCode];
    }

    // check the ad response
    if (!Array.isArray(ads) || ads.length < 1) {
      return [];
    }

    // if there are multiple ads, sort by CPM
    // commented out for singleRequest function signature modifications
    // ads = ads.sort(_adCpmSort);

    return ads.reduce((bids, ad) => {
      if (ad.status !== 'ok') {
        return [];
      }

      let bid = {
        requestId: bidRequest.bidId,
        currency: 'USD',
        creativeId: ad.creative_id,
        mediaType: ad.creative_type,
        cpm: ad.cpm || 0,
        dealId: ad.deal,
        ttl: 300, // 5 minutes
        netRevenue: config.getConfig('rubicon.netRevenue') || false
      };
      if (bidRequest.mediaType === 'video') {
        bid.width = bidRequest.params.video.playerWidth;
        bid.height = bidRequest.params.video.playerHeight;
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
        }, {'rpfl_elemid': bidRequest.adUnitCode});

      bids.push(bid);

      return bids;
    }, []);
  },
  getUserSyncs: function(syncOptions) {
    if (!hasSynced && syncOptions.iframeEnabled) {
      hasSynced = true;
      return {
        type: 'iframe',
        url: SYNC_ENDPOINT
      };
    }
  }
};

function _getScreenResolution() {
  return [window.screen.width, window.screen.height].join('x');
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
  if (bid.mediaType === 'video') {
    let size = [];
    if (params.video.playerWidth && params.video.playerHeight) {
      size = [
        params.video.playerWidth,
        params.video.playerHeight
      ];
    } else if (
      Array.isArray(bid.sizes) && bid.sizes.length > 0 &&
      Array.isArray(bid.sizes[0]) && bid.sizes[0].length > 1
    ) {
      size = bid.sizes[0];
    }
    return size;
  }

  let sizes = Array.isArray(params.sizes) ? params.sizes : mapSizes(bid.sizes)

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
