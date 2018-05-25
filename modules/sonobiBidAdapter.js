var bidfactory = require('src/bidfactory.js');
var bidmanager = require('src/bidmanager.js');
var adloader = require('src/adloader.js');
var utils = require('src/utils');
var adaptermanager = require('src/adaptermanager');
const { BANNER, VIDEO } = require('src/mediaTypes');

var SonobiAdapter = function SonobiAdapter() {
  var keymakerAssoc = {}; //  Remember placement codes for callback mapping
  var bidReqAssoc = {}; //  Remember bids for bid complete reporting

  function _phone_in(request) {
    var trinity = 'https://apex.go.sonobi.com/trinity.js?key_maker=';
    var adSlots = request.bids || [];
    var bidderRequestId = request.bidderRequestId;
    var ref = '&ref=' + _getReferrer(adSlots)
    var libName = '&lib_name=prebid';
    var libVersion = '&lib_v=$prebid.version$';
    var vp = '&vp=' + _getPlatform();
    var key_maker = _keymaker(adSlots);
    if (utils.isEmpty(key_maker)) {
      return null;
    }
    return adloader.loadScript(trinity + JSON.stringify(key_maker) + '&cv=' + _operator(bidderRequestId) + ref + vp + libVersion + libName);
  }

  function _keymaker(adSlots) {
    var keyring = {};
    utils._each(adSlots, function(bidRequest) {
      if (bidRequest.params) {
        //  Optional
        var floor = (bidRequest.params.floor) ? bidRequest.params.floor : null;
        //  Mandatory
        var slotIdentifier = (bidRequest.params.ad_unit) ? bidRequest.params.ad_unit : (bidRequest.params.placement_id) ? bidRequest.params.placement_id : null;
        var sizes = (bidRequest.params.sizes) ? bidRequest.params.sizes : bidRequest.sizes || null;
        sizes = utils.parseSizesInput(sizes).toString();

        var bidId = bidRequest.bidId;

        var args = (sizes) ? ((floor) ? (sizes + '|f=' + floor) : (sizes)) : (floor) ? ('f=' + floor) : '';
        if (/^[\/]?[\d]+[[\/].+[\/]?]?$/.test(slotIdentifier)) {
          slotIdentifier = slotIdentifier.charAt(0) === '/' ? slotIdentifier : '/' + slotIdentifier;
          keyring[slotIdentifier + '|' + bidId] = args;
          keymakerAssoc[slotIdentifier + '|' + bidId] = bidRequest.placementCode;
          bidReqAssoc[bidRequest.placementCode] = bidRequest;
        } else if (/^[0-9a-fA-F]{20}$/.test(slotIdentifier) && slotIdentifier.length === 20) {
          keyring[bidId] = slotIdentifier + '|' + args;
          keymakerAssoc[bidId] = bidRequest.placementCode;
          bidReqAssoc[bidRequest.placementCode] = bidRequest;
        } else {
          keymakerAssoc[bidId] = bidRequest.placementCode;
          bidReqAssoc[bidRequest.placementCode] = bidRequest;
          _failure(bidRequest.placementCode);
          utils.logError('The ad unit code or Sonobi Placement id for slot ' + bidRequest.placementCode + ' is invalid');
        }
      }
    });
    return keyring;
  }

  function _operator(bidderRequestId) {
    var cb_name = 'sbi_' + bidderRequestId;
    window[cb_name] = _trinity;
    return cb_name;
  }

  function _trinity(response) {
    var slots = response.slots || {};
    var sbi_dc = response.sbi_dc || '';
    utils._each(slots, function(bid, slot_id) {
      var placementCode = keymakerAssoc[slot_id];
      if (bid.sbi_aid && bid.sbi_mouse && bid.sbi_size) {
        _success(placementCode, sbi_dc, bid);
      } else {
        _failure(placementCode);
      }
      delete keymakerAssoc[slot_id];
    });
  }

  function _seraph(placementCode) {
    var theOne = bidReqAssoc[placementCode];
    delete bidReqAssoc[placementCode];
    return theOne;
  }

  function _success(placementCode, sbi_dc, bid) {
    const adunitConfig = _seraph(placementCode);
    var createCreative = _creative(bid.sbi_ct, _getReferrer([adunitConfig]));
    var goodBid = bidfactory.createBid(1, adunitConfig);
    if (bid.sbi_dozer) {
      goodBid.dealId = bid.sbi_dozer;
    }
    goodBid.bidderCode = 'sonobi';
    goodBid.ad = createCreative(sbi_dc, bid.sbi_aid);
    goodBid.creativeId = bid.sbi_crid || bid.sbi_aid;
    goodBid.cpm = Number(bid.sbi_mouse);
    goodBid.width = Number(bid.sbi_size.split('x')[0]) || 1;
    goodBid.height = Number(bid.sbi_size.split('x')[1]) || 1;
    goodBid.aid = bid.sbi_aid;
    if (bid.sbi_ct === 'video') {
      goodBid.mediaType = 'video';
      goodBid.vastUrl = createCreative(sbi_dc, bid.sbi_aid);
      delete goodBid.ad;
      delete goodBid.width;
      delete goodBid.height;
    }

    bidmanager.addBidResponse(placementCode, goodBid);
  }

  function _failure(placementCode) {
    var failBid = bidfactory.createBid(2, _seraph(placementCode));
    failBid.bidderCode = 'sonobi';
    bidmanager.addBidResponse(placementCode, failBid);
  }

  function _creative(mediaType, referrer) {
    return function (sbi_dc, sbi_aid) {
      if (mediaType === 'video') {
        return `https://${sbi_dc}apex.go.sonobi.com/vast.xml?vid=${sbi_aid}&ref=${referrer}`;
      }
      const src = 'https://' + sbi_dc + 'apex.go.sonobi.com/sbi.js?aid=' + sbi_aid + '&as=null&ref=' + referrer;
      return '<script type="text/javascript" src="' + src + '"></script>';
    }
  }

  /**
   * @param context - the window to determine the innerWidth from. This is purely for test purposes as it should always be the current window
   */
  function _isInBounds(context = window) {
    return function (lowerBound = 0, upperBound = Number.MAX_SAFE_INTEGER) {
      return context.innerWidth >= lowerBound && context.innerWidth < upperBound;
    }
  }

  /**
   * @param context - the window to determine the innerWidth from. This is purely for test purposes as it should always be the current window
   */
  function _getPlatform(context = window) {
    var isInBounds = _isInBounds(context);
    var MOBILE_VIEWPORT = {
      lt: 768
    };
    var TABLET_VIEWPORT = {
      lt: 992,
      ge: 768
    };
    if (isInBounds(0, MOBILE_VIEWPORT.lt)) {
      return 'mobile'
    }
    if (isInBounds(TABLET_VIEWPORT.ge, TABLET_VIEWPORT.lt)) {
      return 'tablet'
    }
    return 'desktop';
  }

  function _getReferrer(bids) {
    let ref = encodeURI(utils.getTopWindowLocation().host);
    try {
      if (bids[0].params.referrer) {
        ref = bids[0].params.referrer
      }
    } catch (e) {
      utils.logError(e)
    }
    return ref;
  }

  return {
    callBids: _phone_in,
    formRequest: _keymaker,
    parseResponse: _trinity,
    success: _success,
    failure: _failure,
    // export helper functions for testing purposes
    _isInBounds: _isInBounds,
    _getPlatform: _getPlatform,
    _getReferrer: _getReferrer
  };
};

adaptermanager.registerBidAdapter(new SonobiAdapter(), 'sonobi', {supportedMediaTypes: [BANNER, VIDEO]});

module.exports = SonobiAdapter;
