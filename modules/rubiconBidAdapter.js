import * as utils from 'src/utils';
import { registerBidder } from 'src/adapters/bidderFactory';
import { config } from 'src/config';

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
  113: '1000x300',
  117: '320x100',
  125: '800x250',
  126: '200x600',
  195: '600x300'
};
utils._each(sizeMap, (item, key) => sizeMap[item] = key);

export const spec = {
  code: 'rubicon',
  aliases: ['rubiconLite'],
  supportedMediaTypes: ['video'],
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
  /**
   * @param {BidRequest[]} bidRequests
   * @param bidderRequest
   * @return ServerRequest[]
   */
  buildRequests: function(bidRequests, bidderRequest) {
    return bidRequests.map(bidRequest => {
      bidRequest.startTime = new Date().getTime();

      if (bidRequest.mediaType === 'video') {
        let params = bidRequest.params;
        let size = parseSizes(bidRequest);

        let data = {
          page_url: !params.referrer ? utils.getTopWindowUrl() : params.referrer,
          resolution: _getScreenResolution(),
          account_id: params.accountId,
          integration: INTEGRATION,
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
      }

      // non-video request builder
      let {
        accountId,
        siteId,
        zoneId,
        position,
        floor,
        keywords,
        visitor,
        inventory,
        userId,
        referrer: pageUrl
      } = bidRequest.params;

      // defaults
      floor = (floor = parseFloat(floor)) > 0.01 ? floor : 0.01;
      position = position || 'btf';

      // use rubicon sizes if provided, otherwise adUnit.sizes
      let parsedSizes = parseSizes(bidRequest);

      // using array to honor ordering. if order isn't important (it shouldn't be), an object would probably be preferable
      let data = [
        'account_id', accountId,
        'site_id', siteId,
        'zone_id', zoneId,
        'size_id', parsedSizes[0],
        'alt_size_ids', parsedSizes.slice(1).join(',') || undefined,
        'p_pos', position,
        'rp_floor', floor,
        'rp_secure', isSecure() ? '1' : '0',
        'tk_flint', INTEGRATION,
        'tid', bidRequest.transactionId,
        'p_screen_res', _getScreenResolution(),
        'kw', keywords,
        'tk_user_key', userId
      ];

      if (visitor !== null && typeof visitor === 'object') {
        utils._each(visitor, (item, key) => data.push(`tg_v.${key}`, item));
      }

      if (inventory !== null && typeof inventory === 'object') {
        utils._each(inventory, (item, key) => data.push(`tg_i.${key}`, item));
      }

      data.push(
        'rand', Math.random(),
        'rf', !pageUrl ? utils.getTopWindowUrl() : pageUrl
      );

      data = data.concat(_getDigiTrustQueryParams());

      data = data.reduce(
        (memo, curr, index) =>
          index % 2 === 0 && data[index + 1] !== undefined
            ? memo + curr + '=' + encodeURIComponent(data[index + 1]) + '&' : memo,
        ''
      ).slice(0, -1); // remove trailing &

      return {
        method: 'GET',
        url: FASTLANE_ENDPOINT,
        data,
        bidRequest
      };
    });
  },
  /**
   * @param {*} responseObj
   * @param {BidRequest} bidRequest
   * @return {Bid[]} An array of bids which
   */
  interpretResponse: function(responseObj, {bidRequest}) {
    responseObj = responseObj.body
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
    ads = ads.sort(_adCpmSort);

    return ads.reduce((bids, ad) => {
      if (ad.status !== 'ok') {
        return [];
      }

      let bid = {
        requestId: bidRequest.bidId,
        currency: 'USD',
        creativeId: ad.creative_id,
        cpm: ad.cpm || 0,
        dealId: ad.deal,
        ttl: 300, // 5 minutes
        netRevenue: config.getConfig('rubicon.netRevenue') || false
      };
      if (bidRequest.mediaType === 'video') {
        bid.width = bidRequest.params.video.playerWidth;
        bid.height = bidRequest.params.video.playerHeight;
        bid.vastUrl = ad.creative_depot_url;
        bid.descriptionUrl = ad.impression_id;
        bid.impression_id = ad.impression_id;
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

function _adCpmSort(adA, adB) {
  return (adB.cpm || 0.0) - (adA.cpm || 0.0);
}

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
  return [
    'dt.id', digiTrustId.id,
    'dt.keyv', digiTrustId.keyv,
    'dt.pref', 0
  ];
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
  return masSizeOrdering(Array.isArray(params.sizes)
    ? params.sizes.map(size => (sizeMap[size] || '').split('x')) : bid.sizes
  );
}

export function masSizeOrdering(sizes) {
  const MAS_SIZE_PRIORITY = [15, 2, 9];

  return utils.parseSizesInput(sizes)
    // map sizes while excluding non-matches
    .reduce((result, size) => {
      let mappedSize = parseInt(sizeMap[size], 10);
      if (mappedSize) {
        result.push(mappedSize);
      }
      return result;
    }, [])
    .sort((first, second) => {
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
