/**
 * @file Rubicon (RubiconLite) adapter
 */

import bidfactory from 'src/bidfactory';
import bidmanager from 'src/bidmanager';
import * as utils from 'src/utils';
import { ajax } from 'src/ajax';
import { STATUS } from 'src/constants';

function RubiconAdapter() {

  var sizeMap = {
    1:'468x60',
    2:'728x90',
    8:'120x600',
    9:'160x600',
    10:'300x600',
    15:'300x250',
    16:'336x280',
    43:'320x50',
    44:'300x50',
    54:'300x1050',
    55:'970x90',
    57:'970x250',
    58:'1000x90',
    59:'320x80',
    65:'640x480',
    67:'320x480',
    68:'1800x1000',
    72:'320x320',
    73:'320x160',
    101:'480x320',
    102:'768x1024',
    113:'1000x300',
    117:'320x100',
    125:'800x250',
    126:'200x600'
  };
  utils._each(sizeMap, (item, key) => sizeMap[item] = key);

  function _callBids(bidderRequest) {
    var bids = bidderRequest.bids || [];

    bids.forEach(bid => {
      ajax(buildOptimizedCall(bid), function bidCallback(responseText) {
        try {
          utils.logMessage('XHR callback function called for ad ID: ' + bid.bidId);
          handleRpCB(responseText, bid);
        } catch (err) {
          if (typeof err === "string") {
            utils.logWarn(`${err} when processing RubiconLite for placement code ${bid.placementCode}`);
          } else {
            utils.logError('Error processing response in RubiconLite for placement code ' + bid.placementCode, null, err);
          }

          //indicate that there is no bid for this placement
          let badBid = bidfactory.createBid(STATUS.NO_BID, bid);
          badBid.bidderCode = bid.bidder;
          badBid.error = err;
          bidmanager.addBidResponse(bid.placementCode, badBid);
        }
      }, undefined, {withCredentials: true});
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

    var parsedSizes = utils.parseSizesInput(bid.sizes);

    // using array to honor ordering. if order isn't important (it shouldn't be), an object would probably be preferable
    var queryString = [
      'account_id', accountId,
      'site_id', siteId,
      'zone_id', zoneId,
      'size_id', sizeMap[parsedSizes[0]],
      'alt_size_ids', parsedSizes.slice(1).map(size => sizeMap[size]).join(','),
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
      bid.dealId = responseObj.deal;

      bidmanager.addBidResponse(bidRequest.placementCode, bid);
    });
  }

  function _adCpmSort(adA, adB) {
    return (adB.cpm || 0.0) - (adA.cpm || 0.0);
  }

  return {
    callBids: _callBids
  };
}

module.exports = RubiconAdapter;