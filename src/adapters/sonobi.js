var bidfactory = require('../bidfactory.js');
var bidmanager = require('../bidmanager.js');
var adloader = require('../adloader.js');
var utils = require('../utils');

var SonobiAdapter = function SonobiAdapter(){
  var keymakerAssoc = {};   //  Remember placement codes for callback mapping
  var bidIdAssoc = {};      //  Remember bids for bid complete reporting

  function _phone_in(request){
    var trinity = 'https://apex.go.sonobi.com/trinity.js?key_maker=';
    var adSlots = request.bids || [];
    var bidderRequestId = request.bidderRequestId;
    adloader.loadScript(trinity + JSON.stringify(_keymaker(adSlots)) + '&cv=' + _operator(bidderRequestId));
  }

  function _keymaker(adSlots){                                  //  Keymaker makes keys
    var keyring = {};
    utils._each(adSlots, function(bidSlot){
      if(bidSlot.params){
        //  Optional (please don't set these as the word 'OPTIONAL' come on now why would you think that was OK?)
        var dom_id = (bidSlot.params.dom_id && !utils.isEmpty(bidSlot.params.dom_id)) ? bidSlot.params.dom_id : !utils.isEmpty(bidSlot.placementCode) ? bidSlot.placementCode : "dom_" + utils.getUniqueIdentifierStr();
        var floor = (bidSlot.params.floor) ? bidSlot.params.floor : null;
        //  Mandatory
        var slotIdentifier = (bidSlot.params.ad_unit) ? bidSlot.params.ad_unit : (bidSlot.params.placement_id) ? bidSlot.params.placement_id : null;
        var sizes = utils.parseSizesInput(bidSlot.sizes).toString() || null;
        if (utils.isEmpty(sizes)){
          utils.logError('Sonobi adapter expects sizes for ' + bidSlot.placementCode);
        }
        var args = (sizes) ? ((floor) ? (sizes + '|f=' + floor) : (sizes)) : (floor) ? ('f=' + floor) : '';
        if (/[0-9a-fA-F]+/.test(slotIdentifier) && slotIdentifier.length === 20){
          //  Placements are 20 character hex
          keyring[dom_id] = slotIdentifier + '|' + args;
          keymakerAssoc[dom_id] = bidSlot.placementCode;
          bidIdAssoc[bidSlot.placementCode] = bidSlot;
        } else if (/\/?[0-9]*\/(.*\/?)*/.test(slotIdentifier)){
          //  AdUnitCode rules from DFP allow a lot of things you wouldn't expect
          slotIdentifier = slotIdentifier.charAt(0) === '/' ? slotIdentifier : '/' + slotIdentifier;
          //  Consistency isn't really their thing they can't even decide if leading slash matters
          keyring[slotIdentifier + '|' + dom_id] = args;
          keymakerAssoc[slotIdentifier + '|' + dom_id] = bidSlot.placementCode;
          bidIdAssoc[bidSlot.placementCode] = bidSlot;
        } else {
          keymakerAssoc[dom_id] = bidSlot.placementCode;
          bidIdAssoc[bidSlot.placementCode] = bidSlot;
          _failure(bidSlot.placementCode);
          utils.logError('The ad unit code or Sonobi Placement id for slot ' + bidSlot.placementCode + ' is invalid');
        }
      }
    });
    return keyring;
  }

  function _operator(bidderRequestId){                          //  Name jsonp callbacks by request
    var cb_name = "sbi_" + bidderRequestId;
    window[cb_name] = _trinity;
    return cb_name;
  }

  function _trinity(response){                                  //  Call back
    var slots = response.slots || {};
    var sbi_dc = response.sbi_dc || '';
    utils._each(slots, function(bid, slot_id){
      var placementCode = keymakerAssoc[slot_id];
      if (bid.sbi_aid && bid.sbi_mouse && bid.sbi_size){        //  I got the money you got the stuff?
        _success(placementCode, sbi_dc, bid);
      } else {
        _failure(placementCode);
      }
      delete keymakerAssoc[slot_id];                            //  You're done get outta here
    });
  }

  function _seraph(placementCode){                              //  Search for the one
    var theOne = bidIdAssoc[placementCode];
    delete bidIdAssoc[placementCode];                           //  Eliminate him
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
    //  Video creatives will return sbi_size="outstream", default to 1x1
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
