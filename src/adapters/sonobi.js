var bidfactory = require('../bidfactory.js');
var bidmanager = require('../bidmanager.js');
var adloader = require('../adloader.js');
var utils = require('../utils');

var SonobiAdapter = function SonobiAdapter(){
  var keymakerAssoc = {};   //  Remember placement codes for callback mapping
  var bidReqAssoc = {};     //  Remember bids for bid complete reporting

  function _phone_in(request){
    var trinity = 'https://apex.go.sonobi.com/trinity.js?key_maker=';
    var adSlots = request.bids || [];
    var bidderRequestId = request.bidderRequestId;
    var ref = (window.frameElement) ? '&ref=' + encodeURI(top.location.host || document.referrer) : '';
    adloader.loadScript(trinity + JSON.stringify(_keymaker(adSlots)) + '&cv=' + _operator(bidderRequestId) + ref );
  }

  function _keymaker(adSlots){
    var keyring = {};
    utils._each(adSlots, function(bidRequest){
      if(bidRequest.params){
        //  Optional
        var floor = (bidRequest.params.floor) ? bidRequest.params.floor : null;
        //  Mandatory
        var slotIdentifier = (bidRequest.params.ad_unit) ? bidRequest.params.ad_unit : (bidRequest.params.placement_id) ? bidRequest.params.placement_id : null;
        var sizes = utils.parseSizesInput(bidRequest.sizes).toString() || null;
        var bidId = bidRequest.bidId;
        if (utils.isEmpty(sizes)){
          utils.logError('Sonobi adapter expects sizes for ' + bidRequest.placementCode);
        }
        var args = (sizes) ? ((floor) ? (sizes + '|f=' + floor) : (sizes)) : (floor) ? ('f=' + floor) : '';
        if (/^[\/]?[\d]+[[\/].+[\/]?]?$/.test(slotIdentifier)){
          slotIdentifier = slotIdentifier.charAt(0) === '/' ? slotIdentifier : '/' + slotIdentifier;
          keyring[slotIdentifier + '|' + bidId] = args;
          keymakerAssoc[slotIdentifier + '|' + bidId] = bidRequest.placementCode;
          bidReqAssoc[bidRequest.placementCode] = bidRequest;
        } else if (/^[0-9a-fA-F]{20}$/.test(slotIdentifier) && slotIdentifier.length === 20){
          keyring[bidId] = slotIdentifier + '|' + args;
          keymakerAssoc[bidId] = bidRequest.placementCode;
          bidReqAssoc[bidRequest.placementCode] = bidRequest;
        } else  {
          keymakerAssoc[bidId] = bidRequest.placementCode;
          bidReqAssoc[bidRequest.placementCode] = bidRequest;
          _failure(bidRequest.placementCode);
          utils.logError('The ad unit code or Sonobi Placement id for slot ' + bidRequest.placementCode + ' is invalid');
        }
      }
    });
    return keyring;
  }

  function _operator(bidderRequestId){
    var cb_name = "sbi_" + bidderRequestId;
    window[cb_name] = _trinity;
    return cb_name;
  }

  function _trinity(response){
    var slots = response.slots || {};
    var sbi_dc = response.sbi_dc || '';
    utils._each(slots, function(bid, slot_id){
      var placementCode = keymakerAssoc[slot_id];
      if (bid.sbi_aid && bid.sbi_mouse && bid.sbi_size){
        _success(placementCode, sbi_dc, bid);
      } else {
        _failure(placementCode);
      }
      delete keymakerAssoc[slot_id];
    });
  }

  function _seraph(placementCode){
    var theOne = bidReqAssoc[placementCode];
    delete bidReqAssoc[placementCode];
    return theOne;
  }

  function _success(placementCode, sbi_dc, bid){
    var goodBid = bidfactory.createBid(1, _seraph(placementCode));
    if(bid.sbi_dozer){
      goodBid.dealId = bid.sbi_dozer;
    }
    goodBid.bidderCode = 'sonobi';
    goodBid.ad = _creative(sbi_dc, bid.sbi_aid);
    goodBid.cpm = Number(bid.sbi_mouse);
    goodBid.width = Number(bid.sbi_size.split('x')[0]) || 1;
    goodBid.height = Number(bid.sbi_size.split('x')[1]) || 1;
    bidmanager.addBidResponse(placementCode, goodBid);
  }

  function _failure(placementCode){
    var failBid = bidfactory.createBid(2, _seraph(placementCode));
    failBid.bidderCode = 'sonobi';
    bidmanager.addBidResponse(placementCode, failBid);
  }

  function _creative(sbi_dc, sbi_aid){
    var src = 'https://' + sbi_dc + 'apex.go.sonobi.com/sbi.js?aid=' + sbi_aid + '&as=null';
    return '<script type="text/javascript" src="' + src + '"></script>';
  }

  return {
    callBids:    _phone_in,
    formRequest: _keymaker,
    parseResponse:  _trinity,
    success: _success,
    failure: _failure
  };
};

module.exports = SonobiAdapter;