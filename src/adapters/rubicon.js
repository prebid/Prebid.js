/**
 * @file Rubicon (RubiconRapid) adapter
 */

var CONSTANTS = require('../constants.json');
var utils = require('../utils.js');
var bidmanager = require('../bidmanager.js');
var bidfactory = require('../bidfactory.js');
var ajax = require("../ajax.js").ajax;

function RubiconAdapter(mockResponse) {

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
      if(!mockResponse) {
        ajax(buildOptimizedCall(bid), cb, undefined, {withCredentials: true});
      } else {
        cb(mockResponse);
      }

      function cb(responseText) {
        try {
          utils.logMessage('XHR callback function called for ad ID: ' + bid.bidId);
          handleRpCB(responseText, bid);
        } catch(err) {
          if(typeof err === "string") {
            utils.logWarn(`${err} when processing RubiconRapid for placement code ${bid.placementCode}`);
          } else {
            utils.logError('Error processing response in RubiconRapid for placement code ' + bid.placementCode, null, err);
          }

          //indicate that there is no bid for this placement
          let badBid = bidfactory.createBid(2, bid);
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
      'tk_flint', 'pbjs.rapid',
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

  let _renderCreative = (script, impId) =>
    '<html>\n' +
    '<head>\n' +
    '<scr' + 'ipt type=\'text\/javascript\'>' +
    'inDapIF=true;\n' +
    '<' + '/scr' + 'ipt>\n' +
    '<\/head>\n' +
    '<body style=\'margin : 0; padding: 0;\'>\n' +
    '<!-- Rubicon Project Ad Tag -->\n' +
    '<div data-rp-impression-id=\'' + impId + '\'>\n' +
    '<scr' + 'ipt type=\'text\/javascript\'>\n' +
    ''+ script + '' +
    '<' + '/scr' + 'ipt>\n' +
    '</div>\n' +
    '<\/body>\n' +
    '<\/html>';

  //expose the callback to the global object:
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

      //set the status
      bidRequest.status = CONSTANTS.STATUS.GOOD;

      //store bid response
      //bid status is good (indicating 1)
      var bid = bidfactory.createBid(1, bidRequest);
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