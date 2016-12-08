import * as Adapter from './adapter.js';
import bidfactory from 'src/bidfactory';
import bidmanager from 'src/bidmanager';
import * as utils from 'src/utils';
import { ajax } from 'src/ajax';
import { STATUS } from 'src/constants';

const RUBICON_BIDDER_CODE = 'rubicon';

var sizeMap = {
  1:'468x60',
  2:'728x90',
  8:'120x600',
  9:'160x600',
  10:'300x600',
  15:'300x250',
  16:'336x280',
  19:'300x100',
  43:'320x50',
  44:'300x50',
  48:'300x300',
  54:'300x1050',
  55:'970x90',
  57:'970x250',
  58:'1000x90',
  59:'320x80',
  61:'1000x1000',
  65:'640x480',
  67:'320x480',
  68:'1800x1000',
  72:'320x320',
  73:'320x160',
  83:'480x300',
  94:'970x310',
  96:'970x210',
  101:'480x320',
  102:'768x1024',
  113:'1000x300',
  117:'320x100',
  125:'800x250',
  126:'200x600'
};
utils._each(sizeMap, (item, key) => sizeMap[item] = key);

function RubiconAdapter() {

  function _callBids(bidderRequest) {
    var bids = bidderRequest.bids || [];

    bids.forEach(bid => {
      try {
        ajax(buildOptimizedCall(bid), bidCallback, undefined, {withCredentials: true});
      } catch(err) {
        utils.logError('Error sending rubicon request for placement code ' + bid.placementCode, null, err);
      }

      function bidCallback(responseText) {
        try {
          utils.logMessage('XHR callback function called for ad ID: ' + bid.bidId);
          handleRpCB(responseText, bid);
        } catch (err) {
          if (typeof err === "string") {
            utils.logWarn(`${err} when processing rubicon response for placement code ${bid.placementCode}`);
          } else {
            utils.logError('Error processing rubicon response for placement code ' + bid.placementCode, null, err);
          }

          //indicate that there is no bid for this placement
          let badBid = bidfactory.createBid(STATUS.NO_BID, bid);
          badBid.bidderCode = bid.bidder;
          badBid.error = err;
          bidmanager.addBidResponse(bid.placementCode, badBid);
        }
      }
    });
  }

  function buildOptimizedCall(bid) {
    bid.startTime = new Date().getTime();

    var {
      accountId,
      siteId,
      zoneId,
      position,
      keywords,
      visitor,
      inventory,
      userId,
      referrer: pageUrl
    } = bid.params;

    // defaults
    position = position || 'btf';

    // use rubicon sizes if provided, otherwise adUnit.sizes
    var parsedSizes = RubiconAdapter.masSizeOrdering(Array.isArray(bid.params.sizes) ?
      bid.params.sizes.map(size => (sizeMap[size] || '').split('x')) : bid.sizes
    );

    if(parsedSizes.length < 1) {
      throw "no valid sizes";
    }

    // using array to honor ordering. if order isn't important (it shouldn't be), an object would probably be preferable
    var queryString = [
      'account_id', accountId,
      'site_id', siteId,
      'zone_id', zoneId,
      'size_id', parsedSizes[0],
      'alt_size_ids', parsedSizes.slice(1).join(',') || undefined,
      'p_pos', position,
      'rp_floor', '0.01',
      'tk_flint', 'pbjs.lite',
      'p_screen_res', window.screen.width +'x'+ window.screen.height,
      'kw', keywords,
      'tk_user_key', userId
    ];

    if(visitor !== null && typeof visitor === "object") {
      utils._each(visitor, (item, key) => queryString.push(`tg_v.${key}`, item));
    }

    if(inventory !== null && typeof inventory === 'object') {
      utils._each(inventory, (item, key) => queryString.push(`tg_i.${key}`, item));
    }

    queryString.push(
      'rand', Math.random(),
      'rf', !pageUrl ? utils.getTopWindowUrl() : pageUrl
    );

    return queryString.reduce(
      (memo, curr, index) =>
        index % 2 === 0 && queryString[index + 1] !== undefined ?
        memo + curr + '=' + encodeURIComponent(queryString[index + 1]) + '&' : memo,
      '//fastlane.rubiconproject.com/a/api/fastlane.json?' // use protocol relative link for http or https
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
    let responseObj = JSON.parse(responseText); // can throw

    if(
      typeof responseObj !== 'object' ||
      responseObj.status !== 'ok' ||
      !Array.isArray(responseObj.ads) ||
      responseObj.ads.length < 1
    ) {
      throw 'bad response';
    }

    var ads = responseObj.ads;

    // if there are multiple ads, sort by CPM
    ads = ads.sort(_adCpmSort);

    ads.forEach(function (ad) {
      if(ad.status !== 'ok') {
        throw 'bad ad status';
      }

      //store bid response
      //bid status is good (indicating 1)
      var bid = bidfactory.createBid(STATUS.GOOD, bidRequest);
      bid.creative_id = ad.ad_id;
      bid.bidderCode = bidRequest.bidder;
      bid.cpm = ad.cpm || 0;
      bid.ad = _renderCreative(ad.script, ad.impression_id);
      [bid.width, bid.height] = sizeMap[ad.size_id].split('x').map(num => Number(num));
      bid.dealId = ad.deal;

      bidmanager.addBidResponse(bidRequest.placementCode, bid);
    });
  }

  function _adCpmSort(adA, adB) {
    return (adB.cpm || 0.0) - (adA.cpm || 0.0);
  }

  return Object.assign(Adapter.createNew(RUBICON_BIDDER_CODE), {
    callBids: _callBids,
    createNew: RubiconAdapter.createNew
  });
}

RubiconAdapter.masSizeOrdering = function(sizes) {
  const MAS_SIZE_PRIORITY = [15, 2, 9];

  return utils.parseSizesInput(sizes)
    // map sizes while excluding non-matches
    .reduce((result, size) => {
      let mappedSize = parseInt(sizeMap[size], 10);
      if(mappedSize) {
        result.push(mappedSize);
      }
      return result;
    }, [])
    .sort((first, second) => {
      // sort by MAS_SIZE_PRIORITY priority order
      let firstPriority = MAS_SIZE_PRIORITY.indexOf(first),
          secondPriority = MAS_SIZE_PRIORITY.indexOf(second);

      if(firstPriority > -1 || secondPriority > -1) {
        if(firstPriority === -1) {
          return 1;
        }
        if(secondPriority === -1) {
          return -1;
        }
        return firstPriority - secondPriority;
      }

      // and finally ascending order
      return first - second;
    });
};

RubiconAdapter.createNew = function() {
  return new RubiconAdapter();
};

module.exports = RubiconAdapter;

