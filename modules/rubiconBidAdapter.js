import Adapter from 'src/adapter';
import bidfactory from 'src/bidfactory';
import bidmanager from 'src/bidmanager';
import adaptermanager from 'src/adaptermanager';
import * as utils from 'src/utils';
import { ajax } from 'src/ajax';
import { STATUS } from 'src/constants';

const RUBICON_BIDDER_CODE = 'rubicon';

// use deferred function call since version isn't defined yet at this point
function getIntegration() {
  return 'pbjs_lite_' + $$PREBID_GLOBAL$$.version;
}

function isSecure() {
  return location.protocol === 'https:';
}

// use protocol relative urls for http or https
const FASTLANE_ENDPOINT = '//fastlane.rubiconproject.com/a/api/fastlane.json';
const VIDEO_ENDPOINT = '//fastlane-adv.rubiconproject.com/v1/auction/video';

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

function RubiconAdapter() {
  var baseAdapter = new Adapter(RUBICON_BIDDER_CODE);
  var hasUserSyncFired = false;

  function _callBids(bidderRequest) {
    var bids = bidderRequest.bids || [];

    bids.forEach(bid => {
      try {
        // Video endpoint only accepts POST calls
        if (bid.mediaType === 'video') {
          ajax(
            VIDEO_ENDPOINT,
            {
              success: bidCallback,
              error: bidError
            },
            buildVideoRequestPayload(bid, bidderRequest),
            {
              withCredentials: true
            }
          );
        } else {
          ajax(
            buildOptimizedCall(bid),
            {
              success: bidCallback,
              error: bidError
            },
            undefined,
            {
              withCredentials: true
            }
          );
        }
      } catch (err) {
        utils.logError('Error sending rubicon request for placement code ' + bid.placementCode, null, err);
        addErrorBid();
      }

      function bidCallback(responseText) {
        try {
          utils.logMessage('XHR callback function called for ad ID: ' + bid.bidId);
          handleRpCB(responseText, bid);
        } catch (err) {
          if (typeof err === 'string') {
            utils.logWarn(`${err} when processing rubicon response for placement code ${bid.placementCode}`);
          } else {
            utils.logError('Error processing rubicon response for placement code ' + bid.placementCode, null, err);
          }
          addErrorBid();
        }
      }

      function bidError(err, xhr) {
        utils.logError('Request for rubicon responded with:', xhr.status, err);
        addErrorBid();
      }

      function addErrorBid() {
        let badBid = bidfactory.createBid(STATUS.NO_BID, bid);
        badBid.bidderCode = baseAdapter.getBidderCode();
        bidmanager.addBidResponse(bid.placementCode, badBid);
      }
    });
  }

  function _getScreenResolution() {
    return [window.screen.width, window.screen.height].join('x');
  }

  function _getDigiTrustQueryParams() {
    function getDigiTrustId() {
      let digiTrustUser = window.DigiTrust && ($$PREBID_GLOBAL$$.getConfig('digiTrustId') || window.DigiTrust.getUser({member: 'T9QSFKPDN9'}));
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

  function buildVideoRequestPayload(bid, bidderRequest) {
    bid.startTime = new Date().getTime();

    let params = bid.params;

    if (!params || typeof params.video !== 'object') {
      throw 'Invalid Video Bid';
    }

    let size;
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
    } else {
      throw 'Invalid Video Bid - No size provided';
    }

    let postData = {
      page_url: !params.referrer ? utils.getTopWindowUrl() : params.referrer,
      resolution: _getScreenResolution(),
      account_id: params.accountId,
      integration: getIntegration(),
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
      element_id: bid.placementCode,
      name: bid.placementCode,
      language: params.video.language,
      width: size[0],
      height: size[1]
    };

    // check and add inventory, keywords, visitor and size_id data
    if (params.video.size_id) {
      slotData.size_id = params.video.size_id;
    } else {
      throw 'Invalid Video Bid - Invalid Ad Type!';
    }

    if (params.inventory && typeof params.inventory === 'object') {
      slotData.inventory = params.inventory;
    }

    if (params.keywords && Array.isArray(params.keywords)) {
      slotData.keywords = params.keywords;
    }

    if (params.visitor && typeof params.visitor === 'object') {
      slotData.visitor = params.visitor;
    }

    postData.slots.push(slotData);

    return (JSON.stringify(postData));
  }

  function buildOptimizedCall(bid) {
    bid.startTime = new Date().getTime();

    var {
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
    } = bid.params;

    // defaults
    floor = (floor = parseFloat(floor)) > 0.01 ? floor : 0.01;
    position = position || 'btf';

    // use rubicon sizes if provided, otherwise adUnit.sizes
    var parsedSizes = RubiconAdapter.masSizeOrdering(Array.isArray(bid.params.sizes)
      ? bid.params.sizes.map(size => (sizeMap[size] || '').split('x')) : bid.sizes
    );

    if (parsedSizes.length < 1) {
      throw 'no valid sizes';
    }

    if (!/^\d+$/.test(accountId)) {
      throw 'invalid accountId provided';
    }

    // using array to honor ordering. if order isn't important (it shouldn't be), an object would probably be preferable
    var queryString = [
      'account_id', accountId,
      'site_id', siteId,
      'zone_id', zoneId,
      'size_id', parsedSizes[0],
      'alt_size_ids', parsedSizes.slice(1).join(',') || undefined,
      'p_pos', position,
      'rp_floor', floor,
      'rp_secure', isSecure() ? '1' : '0',
      'tk_flint', getIntegration(),
      'p_screen_res', _getScreenResolution(),
      'kw', keywords,
      'tk_user_key', userId
    ];

    if (visitor !== null && typeof visitor === 'object') {
      utils._each(visitor, (item, key) => queryString.push(`tg_v.${key}`, item));
    }

    if (inventory !== null && typeof inventory === 'object') {
      utils._each(inventory, (item, key) => queryString.push(`tg_i.${key}`, item));
    }

    queryString.push(
      'rand', Math.random(),
      'rf', !pageUrl ? utils.getTopWindowUrl() : pageUrl
    );

    queryString = queryString.concat(_getDigiTrustQueryParams());

    return queryString.reduce(
      (memo, curr, index) =>
        index % 2 === 0 && queryString[index + 1] !== undefined
          ? memo + curr + '=' + encodeURIComponent(queryString[index + 1]) + '&' : memo,
      FASTLANE_ENDPOINT + '?'
    ).slice(0, -1); // remove trailing &
  }

  let _renderCreative = (script, impId) => `<html>
<head><script type='text/javascript'>inDapIF=true;</script></head>
<body style='margin : 0; padding: 0;'>
<!-- Rubicon Project Ad Tag -->
<div data-rp-impression-id='${impId}'>
<script type='text/javascript'>${script}</script>
</div>
</body>
</html>`;

  function handleRpCB(responseText, bidRequest) {
    const responseObj = JSON.parse(responseText); // can throw
    let ads = responseObj.ads;
    const adResponseKey = bidRequest.placementCode;

    // check overall response
    if (typeof responseObj !== 'object' || responseObj.status !== 'ok') {
      throw 'bad response';
    }

    // video ads array is wrapped in an object
    if (bidRequest.mediaType === 'video' && typeof ads === 'object') {
      ads = ads[adResponseKey];
    }

    // check the ad response
    if (!Array.isArray(ads) || ads.length < 1) {
      throw 'invalid ad response';
    }

    // if there are multiple ads, sort by CPM
    ads = ads.sort(_adCpmSort);

    ads.forEach(ad => {
      if (ad.status !== 'ok') {
        throw 'bad ad status';
      }

      // store bid response
      // bid status is good (indicating 1)
      var bid = bidfactory.createBid(STATUS.GOOD, bidRequest);
      bid.currency = 'USD';
      bid.creative_id = ad.creative_id;
      bid.bidderCode = baseAdapter.getBidderCode();
      bid.cpm = ad.cpm || 0;
      bid.dealId = ad.deal;
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
        }, {'rpfl_elemid': bidRequest.placementCode});

      try {
        bidmanager.addBidResponse(bidRequest.placementCode, bid);
      } catch (err) {
        utils.logError('Error from addBidResponse', null, err);
      }
    });
    // Run the Emily user sync
    hasUserSyncFired = syncEmily(hasUserSyncFired);
  }

  function _adCpmSort(adA, adB) {
    return (adB.cpm || 0.0) - (adA.cpm || 0.0);
  }

  return Object.assign(this, baseAdapter, {
    callBids: _callBids
  });
}

RubiconAdapter.masSizeOrdering = function(sizes) {
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
};

/**
 * syncEmily
 * @summary A user sync dependency for the Rubicon Project adapter
 * When enabled, creates an user sync iframe after a delay once the first auction is complete.
 * Only fires once except that with each winning creative there will be additional, similar calls to the same service.
 * @example
 *  // Config example for Rubicon user sync
 *  $$PREBID_GLOBAL$$.setConfig({ rubicon: {
 *    userSync: {
 *      enabled: true,
 *      delay: 1000
 *    }
 *  }});
 * @return {boolean} Whether or not Emily synced
 */
function syncEmily(hasSynced) {
  // Check that it has not already been triggered - only meant to fire once
  if (hasSynced) {
    return true;
  }

  const defaultUserSyncConfig = {
    enabled: true,
    delay: 5000
  };
  const iframeUrl = 'https://tap-secure.rubiconproject.com/partner/scripts/rubicon/emily.html?rtb_ext=1';

  let rubiConfig = $$PREBID_GLOBAL$$.getConfig('rubicon');
  let publisherUserSyncConfig = rubiConfig && rubiConfig.userSync;

  // Merge publisher user sync config with the defaults
  let userSyncConfig = Object.assign(defaultUserSyncConfig, publisherUserSyncConfig);

  // Check that user sync is enabled
  if (!userSyncConfig.enabled) {
    return false;
  }

  // Delay inserting the Emily iframe
  setTimeout(() => utils.insertCookieSyncIframe(iframeUrl), Number(userSyncConfig.delay));
  return true;
}

adaptermanager.registerBidAdapter(new RubiconAdapter(), RUBICON_BIDDER_CODE, {
  supportedMediaTypes: ['video']
});
adaptermanager.aliasBidAdapter(RUBICON_BIDDER_CODE, 'rubiconLite');

module.exports = RubiconAdapter;
