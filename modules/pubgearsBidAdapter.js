var bidfactory = require('src/bidfactory.js');
var bidmanager = require('src/bidmanager.js');
var consts = require('src/constants.json');
var utils = require('src/utils.js');
var adaptermanager = require('src/adaptermanager');
var d = document;
var SCRIPT = 'script';
var PARAMS = 'params';
var SIZES = 'sizes';
var SIZE = 'size';
var CPM = 'cpm';
var AD = 'ad';
var WIDTH = 'width';
var HEIGHT = 'height';
var PUB_ZONE = 'pub_zone';
var GROSS_PRICE = 'gross_price';
var RESOURCE = 'resource';
var DETAIL = 'detail';
var BIDDER_CODE_RESPONSE_KEY = 'bidderCode';
var BIDDER_CODE = 'pubgears';
var SCRIPT_ID = 'pg-header-tag';
var ATTRIBUTE_PREFIX = 'data-bsm-';
var SLOT_LIST_ATTRIBUTE = 'slot-list';
var PUBLISHER_ATTRIBUTE = 'pub';
var FLAG_ATTRIBUTE = 'flag';
var PLACEMENT_CODE = 'placementCode';
var BID_ID = 'bidId';
var PUBLISHER_PARAM = 'publisherName';
var PUB_ZONE_PARAM = 'pubZone';
var BID_RECEIVED_EVENT_NAME = 'onBidResponse';
var SLOT_READY_EVENT_NAME = 'onResourceComplete';
var CREATIVE_TEMPLATE = decodeURIComponent("%3Cscript%3E%0A(function(define)%7B%0Adefine(function(a)%7B%0A%09var%20id%3D%20%22pg-ad-%22%20%2B%20Math.floor(Math.random()%20*%201e10)%2C%20d%3D%20document%0A%09d.write(\'%3Cdiv%20id%3D%22\'%2Bid%2B\'%22%3E%3C%2Fdiv%3E\')%0A%09a.push(%7B%0A%09%09pub%3A%20\'%25%25PUBLISHER_NAME%25%25\'%2C%0A%09%09pub_zone%3A%20\'%25%25PUB_ZONE%25%25\'%2C%0A%09%09sizes%3A%20%5B\'%25%25SIZE%25%25\'%5D%2C%0A%09%09flag%3A%20true%2C%0A%09%09container%3A%20d.getElementById(id)%2C%0A%09%7D)%3B%0A%7D)%7D)(function(f)%7Bvar%20key%3D\'uber_imps\'%2Ca%3Dthis%5Bkey%5D%3Dthis%5Bkey%5D%7C%7C%5B%5D%3Bf(a)%3B%7D)%3B%0A%3C%2Fscript%3E%0A%3Cscript%20src%3D%22%2F%2Fc.pubgears.com%2Ftags%2Fb%22%3E%3C%2Fscript%3E%0A");
var TAG_URL = '//c.pubgears.com/tags/h';
var publisher = '';

adaptermanager.registerBidAdapter(new PubGearsAdapter, BIDDER_CODE);

module.exports = PubGearsAdapter;

function PubGearsAdapter() {
  var proxy = null;
  var pendingSlots = {};
  var initialized = false;

  this.callBids = callBids;

  function callBids(params) {
    var bids = params[consts.JSON_MAPPING.PL_BIDS];
    var slots = bids.map(getSlotFromBidParam);
    if (slots.length <= 0)
      { return; }
    publisher = bids[0][PARAMS][PUBLISHER_PARAM];

    bids.forEach(function(bid) {
      var name = getSlotFromBidParam(bid);
      pendingSlots[ name ] = bid;
    });

    proxy = proxy || getScript(SCRIPT_ID) || makeScript(slots, publisher, SCRIPT_ID, TAG_URL);
    if (!initialized)
      { registerEventListeners(proxy); }
    initialized = true;
  }
  function loadScript(script) {
    var anchor = (function(scripts) {
      return scripts[ scripts.length - 1 ];
    })(d.getElementsByTagName(SCRIPT));

    return anchor.parentNode.insertBefore(script, anchor);
  }
  function getSlotFromBidParam(bid) {
    var size = getSize(bid);
    var params = bid[PARAMS];
    var slotName = params[PUB_ZONE_PARAM];
    return [ slotName, size ].join('@');
  }
  function getSlotFromResource(resource) {
    var size = resource[SIZE];
    var key = [ resource[PUB_ZONE], size ].join('@');
    return key;
  }
  function getSize(bid) {
    var sizes = bid[SIZES];
    var size = Array.isArray(sizes[0]) ? sizes[0] : sizes;
    return size.join('x');
  }
  function makeScript(slots, publisher, id, url) {
    var script = d.createElement(SCRIPT);
    script.src = url;
    script.id = id;
    script.setAttribute(ATTRIBUTE_PREFIX + SLOT_LIST_ATTRIBUTE, slots.join(' '));
    script.setAttribute(ATTRIBUTE_PREFIX + FLAG_ATTRIBUTE, 'true');
    script.setAttribute(ATTRIBUTE_PREFIX + PUBLISHER_ATTRIBUTE, publisher);

    return loadScript(script);
  }
  function getScript(id) {
    return d.getElementById(id);
  }
  function registerEventListeners(script) {
    script.addEventListener(BID_RECEIVED_EVENT_NAME, onBid, true);
    script.addEventListener(SLOT_READY_EVENT_NAME, onComplete, true);
  }
  function onBid(event) {
    var data = event[DETAIL];
    var slotKey = getSlotFromResource(data[RESOURCE]);
    var bidRequest = pendingSlots[slotKey];
    var adUnitCode = bidRequest[PLACEMENT_CODE];
    var bid = null;

    if (bidRequest) {
      bid = buildResponse(data, bidRequest);
      bidmanager.addBidResponse(adUnitCode, bid);
      utils.logMessage('adding bid respoonse to "' + adUnitCode + '" for bid request "' + bidRequest[BID_ID] + '"');
    } else {
      utils.logError('Cannot get placement id for slot "' + slotKey + '"');
    }
  }
  function buildResponse(eventData, bidRequest) {
    var resource = eventData[RESOURCE];
    var dims = resource[SIZE].split('x');
    var price = Number(eventData[GROSS_PRICE]);
    var status = isNaN(price) || price <= 0 ? 2 : 1;

    var response = bidfactory.createBid(status, bidRequest);
    response[BIDDER_CODE_RESPONSE_KEY] = BIDDER_CODE;

    if (status !== 1)
      { return response; }

    response[AD] = getCreative(resource);

    response[CPM] = price / 1e3;
    response[WIDTH] = dims[0];
    response[HEIGHT] = dims[1];
    return response;
  }
  function getCreative(resource) {
    var token = '%%';
    var creative = CREATIVE_TEMPLATE;
    var replacementValues = {
      publisher_name: publisher,
      pub_zone: resource[PUB_ZONE],
      size: resource[SIZE]
    };
    return utils.replaceTokenInString(creative, replacementValues, token);
  }
  function onComplete(event) {
    var data = event[DETAIL];
    var slotKey = getSlotFromResource(data[RESOURCE]);
    delete pendingSlots[slotKey];
  }
}
