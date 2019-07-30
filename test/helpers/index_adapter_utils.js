var AllowedAdUnits = [[728, 90], [120, 600], [300, 250], [160, 600], [336, 280], [234, 60], [300, 600], [300, 50], [320, 50], [970, 250], [300, 1050], [970, 90], [180, 150]];
var UnsupportedAdUnits = [[700, 100], [100, 600], [300, 200], [100, 600], [300, 200], [200, 60], [900, 200], [300, 1000], [900, 90], [100, 100]];

exports.supportedSizes = AllowedAdUnits;
exports.unsupportedSizes = UnsupportedAdUnits;

var DefaultSiteID = 234567;
var DefaultPlacementCodePrefix = 'placementCode-';
var DefaultCurrency = 'USD';
var DefaultDspID = 124;
var DefaultTradingDeskID = 3456;
var DefaultCreativeID = 123234;
var DefaultBrandID = 123356;
var DefaultBrand = 'LA Tourism & Convention Board';
var DefaultAdDoman = 2342342;
var DefaultPriceLevel = 1000; // only this is important?
var DefaultDeal = '515';
var DefaultDealName = 'name: testdeal';
var DefaultDealID = 'ixdl';

var ADAPTER_CODE = 'indexExchange';

exports.DefaultSiteID = DefaultSiteID;
exports.DefaultPlacementCodePrefix = DefaultPlacementCodePrefix;
exports.DefaultCurrency = DefaultCurrency;
exports.DefaultDspID = DefaultDspID;
exports.DefaultTradingDeskID = DefaultTradingDeskID;
exports.DefaultCreativeID = DefaultCreativeID;
exports.DefaultBrandID = DefaultBrandID;
exports.DefaultBrand = DefaultBrand;
exports.DefaultAdDoman = DefaultAdDoman;
exports.DefaultPriceLevel = DefaultPriceLevel;
exports.DefaultDeal = DefaultDeal;
exports.DefaultDealName = DefaultDealName;
exports.DefaultDealID = DefaultDealID;

exports.ADAPTER_CODE = ADAPTER_CODE;

function _createBidSlot(placementCode, indexSlotID, sizes, config) {
  config = config || {};
  var bid = {};
  bid.bidder = ('bidder' in config) ? config.bidder : ADAPTER_CODE;
  bid.placementCode = placementCode;
  bid.params = {};
  bid.params.id = indexSlotID;
  bid.params.siteID = ('siteID' in config) ? config.siteID : DefaultSiteID;
  bid.sizes = sizes;

  // optional parameter
  if (typeof config.timeout !== 'undefined') {
    bid.params.timeout = config.timeout;
  }
  if (typeof config.tier2SiteID !== 'undefined') {
    bid.params.tier2SiteID = config.tier2SiteID;
  }
  if (typeof config.tier3SiteID !== 'undefined') {
    bid.params.tier3SiteID = config.tier3SiteID;
  }
  if (typeof config.slotSize !== 'undefined') {
    bid.params.size = config.slotSize;
  }

  // special parameter
  if (typeof (config.missingSlotID) !== 'undefined') {
    delete bid.params.id;
  }
  if (typeof (config.missingSiteID) !== 'undefined') {
    delete bid.params.siteID;
  }

  return bid;
}

exports.createBidSlot = _createBidSlot;

exports.createBidSlots = function(numSlot, numSize) {
  if (typeof numSlot === 'undefined') numSlot = 1;
  if (typeof numSize === 'undefined') numSize = 1;

  var bids = new Array(numSlot);

  var mkPlacementCode = function(i, j) { return DefaultPlacementCodePrefix + i + '_' + j; };
  for (var i = 0; i < bids.length; i++) {
    var requestSizes = new Array(numSize);
    for (var j = 0; j < requestSizes.length; j++) requestSizes[j] = AllowedAdUnits[(i + j) % AllowedAdUnits.length];

    bids[i] = _createBidSlot(mkPlacementCode(i, j), 'slot-' + i, requestSizes, {
      siteID: DefaultSiteID + i
    });
  }
  return bids;
}

exports.parseIndexRequest = function(url) {
  if (typeof url === 'undefined') return {};
  var uri = url.split('?')[1];
  var hashes = uri.split('&');
  var requestJSON = {};
  var hash;
  for (var i = 0; i < hashes.length; i++) {
    hash = hashes[i].split('=');
    if (hash[0] === 'r') {
      requestJSON[hash[0]] = JSON.parse(decodeURIComponent(hash[1]));
    } else {
      requestJSON[hash[0]] = decodeURIComponent(hash[1]);
    }
  }
  return requestJSON;
}

exports.getExpectedIndexSlots = function(bids) {
  var size = 0;
  for (var i = 0; i < bids.length; i++) {
    size += bids[i].sizes.length;
  }
  return size;
}

function clone(x) {
  return JSON.parse(JSON.stringify(x));
}

// returns the difference(lhs, rhs), difference(rhs,lhs), and intersection(lhs, rhs) based on the object keys
function compareOnKeys(lhs, rhs) {
  var lonly = [];
  var ronly = [];
  var both = [];

  for (var key in lhs) {
    if (key in rhs) {
      both.push({ left: lhs[key], right: rhs[key], name: key });
    } else {
      lonly.push(lhs[key]);
    }
  }

  for (var key in rhs) {
    if (key in lhs) {
    } else {
      ronly.push(rhs[key]);
    }
  }

  return { lhsOnly: lonly, rhsOnly: ronly, intersection: both };
}

function createObjectFromArray(arr) {
  var obj = {};

  for (var i = 0; i < arr.length; i++) {
    var key = arr[i][0];
    if (key in obj) {
      throw new Error('message: keys in object must by unique');
    }
    obj[key] = arr[i][1];
  }

  return obj;
}

exports.expandSizes = function(bid) {
  var result = [];
  for (var i = 0; i < bid.sizes.length; i++) {
    var size = bid.sizes[i];
    var copy = clone(bid);
    delete copy.sizes;
    copy.size = size;
    result.push(copy);
  }

  return result;
}

exports.matchOnPlacementCode = function(expected, prebid) {
  var compared = compareOnKeys(expected, prebid);

  return { unmatched: { expected: compared.lhsOnly, prebid: compared.rhsOnly }, matched: compared.intersection.map(function(pair) { return { expected: pair.left, prebid: pair.right, placementCode: pair.name }; }) };
};

exports.matchBidsOnSID = function(lhs, rhs) {
  var lonly = [];
  var ronly = [];

  var configured = [];
  for (var i = 0; i < lhs.length; i++) {
    var group = lhs[i];
    for (var j = 0; j < group.length; j++) {
      var bid = group[j];
      configured.push([bid.params.id + '_' + (j + 1), bid]);

      if (typeof bid.params.tier2SiteID !== 'undefined') {
        configured.push(['T1_' + bid.params.id + '_' + (j + 1), bid]);
      }
      if (typeof bid.params.tier3SiteID !== 'undefined') {
        configured.push(['T2_' + bid.params.id + '_' + (j + 1), bid]);
      }
    }
  }

  var lstore = createObjectFromArray(configured);
  var rstore = createObjectFromArray(rhs.map(bid => [bid.ext.sid, bid]));

  var compared = compareOnKeys(lstore, rstore);
  var matched = compared.intersection.map(function(pair) { return { configured: pair.left, sent: pair.right, name: pair.name } });

  return { unmatched: { configured: compared.lhsOnly, sent: compared.rhsOnly }, matched: matched };
}

exports.matchBidsOnSize = function(lhs, rhs) {
  var lonly = [];
  var ronly = [];

  var configured = [];
  for (var i = 0; i < lhs.length; i++) {
    var group = lhs[i];
    for (var j = 0; j < group.length; j++) {
      var bid = group[j];
      configured.push([bid.size[0] + 'x' + bid.size[1], bid]);
    }
  }

  var lstore = createObjectFromArray(configured);
  var rstore = createObjectFromArray(rhs.map(bid => [ bid.banner.w + 'x' + bid.banner.h, bid ]));

  var compared = compareOnKeys(lstore, rstore);
  var matched = compared.intersection.map(function(pair) { return { configured: pair.left, sent: pair.right, name: pair.name } });

  return { unmatched: { configured: compared.lhsOnly, sent: compared.rhsOnly }, matched: matched };
}

exports.getBidResponse = function(configuredBids, urlJSON, optionalPriceLevel, optionalResponseIdentifier, optionalPassOnBid, optionalResponseParam) {
  if (typeof configuredBids === 'undefined' || typeof urlJSON === 'undefined') return {};
  var response = {};

  response.cur = DefaultCurrency;
  response.id = urlJSON.r.id;
  response.seatbid = [];

  optionalPassOnBid = optionalPassOnBid || [];

  var priceLevel = DefaultPriceLevel;
  var adCount = 1;

  for (var i = 0; i < configuredBids.length; i++) {
    var bidObj = {};
    bidObj.seat = (DefaultTradingDeskID + i).toString();
    bidObj.bid = [];

    var sizes = configuredBids[i].sizes;
    var impressionID = 1;
    for (var j = 0; j < sizes.length; j++) {
      if (typeof optionalPassOnBid[i] !== 'undefined' && typeof optionalPassOnBid[i][j] !== 'undefined' && optionalPassOnBid[i][j]) continue;

      var bid = {};
      bid.adomain = [ (DefaultAdDoman + adCount).toString() ];
      bid.adid = (DefaultCreativeID + adCount).toString();
      bid.impid = adCount.toString();
      bid.id = adCount.toString();
      bid.adm = configuredBids[i].params.id + '_' + (j + 1);
      if (typeof optionalResponseIdentifier !== 'undefined') bid.adm += '_' + optionalResponseIdentifier;
      bid.ext = {};
      bid.ext.dspid = (DefaultDspID + adCount).toString();
      bid.ext.advbrandid = (DefaultBrandID + adCount).toString();
      bid.ext.advbrand = DefaultBrand;

      var optionalSlotParam;
      if (typeof optionalResponseParam !== 'undefined' && typeof optionalResponseParam[i] !== 'undefined' && typeof optionalResponseParam[i][j] !== 'undefined') {
        optionalSlotParam = optionalResponseParam[i][j];
      }

      if (typeof optionalSlotParam !== 'undefined' && typeof optionalSlotParam.ext !== 'undefined' && optionalSlotParam.ext.dealid !== 'undefined') {
        bid.ext.dealid = optionalSlotParam.ext.dealid;
      }

      priceLevel = priceLevel * 2;
      if (typeof optionalPriceLevel !== 'undefined' && optionalPriceLevel[i].length !== 0) {
        priceLevel = optionalPriceLevel[i][j];
      }
      bid.ext.pricelevel = '_' + priceLevel;
      adCount++;
      bidObj.bid.push(bid);
    }

    response.seatbid.push(bidObj);
  }
  return response;
}

exports.getExpectedAdaptorResponse = function(configuredBids, asResponse) {
  var asAllBids = asResponse.seatbid;
  var expectedResponse = {};
  for (var m = 0; m < asAllBids.length; m++) {
    var asBids = asAllBids[m].bid;
    for (var i = 0; i < asBids.length; i++) {
      var slotID = asBids[i].adm.split('_')[0];
      var sizeID = asBids[i].adm.split('_')[1] - 1;

      for (var j = 0; j < configuredBids.length; j++) {
        if (configuredBids[j].params.id !== slotID) continue;

        var result = {};
        var placementCode = configuredBids[j].placementCode;

        result.siteID = configuredBids[j].params.siteID;
        result.bidderCode = ADAPTER_CODE;
        result.width = configuredBids[j].sizes[sizeID][0];
        result.height = configuredBids[j].sizes[sizeID][1];
        result.ad = asBids[i].adm;
        result.cpm = asBids[i].ext.pricelevel.split('_')[1] / 100;

        if (typeof asBids[i].ext !== 'undefined' && typeof asBids[i].ext.dealid !== 'undefined') {
          result.dealId = asBids[i].ext.dealid;
        }

        if (typeof expectedResponse[placementCode] === 'undefined') {
          expectedResponse[placementCode] = [ result ];
        } else {
          expectedResponse[placementCode].push(result);
        }
      }
    }
  }
  return expectedResponse;
}
