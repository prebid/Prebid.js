var bidfactory = require('../bidfactory.js');
var bidmanager = require('../bidmanager.js');
var adloader = require('../adloader.js');
var utils = require('../utils');

var SonobiAdapter = function SonobiAdapter(){
  var test = false;               //  tag tester = true || false
  var cb_map = {};

  function _phone_in(params){
    var trinity = 'https://apex.go.sonobi.com/trinity.js?key_maker=';
    var bids = params.bids || [];
    adloader.loadScript(trinity + JSON.stringify(_keymaker(bids)) + '&cv=' + _operator(), null);
  }

  function _keymaker(bids){       //  Make keys
    var keyring = {};
    utils._each(bids, function(o){
      var sizes = [];
      utils._each(o.sizes, function(size){
        sizes.push(size.join('x'));
      });
      sizes = sizes.toString();
      if (!!o.params.ad_unit && o.params.ad_unit.length > 0) {
        //  Cypher
        keyring[o.params.ad_unit + '|' + o.params.dom_id] = sizes;
        cb_map[o.params.ad_unit + '|' + o.params.dom_id] = o.placementCode;
      } else if (!!o.params.placement_id && o.params.placement_id.length > 0) {
        //  Morpheus
        keyring[o.params.dom_id] = o.params.placement_id + (test ? '-test' : '')  + '|' + sizes;
        cb_map[o.params.dom_id] = o.placementCode;
      } else {
        utils.logError('sonobi unable to bid: Improper parameters for ' + o.placementCode);
      }
    });
    return keyring;
  }

  function _operator(){           //  Uniqify callbacks
    var uniq = "cb" + utils.getUniqueIdentifierStr();
    window[uniq] = _trinity;
    return uniq;
  }

  function _trinity(response){    //  Callback
    var slots = response.slots || {};
    var sbi_dc = response.sbi_dc || '';
    var bidObject = {};
    for (var slot in slots) {
      if (slots[slot].sbi_aid){
        bidObject = bidfactory.createBid(1);
        bidObject.bidderCode = 'sonobi';
        bidObject.cpm = Number(slots[slot].sbi_mouse);
        bidObject.ad = _get_creative(sbi_dc, slots[slot].sbi_aid);
        bidObject.width = Number(slots[slot].sbi_size.split('x')[0]);
        bidObject.height = Number(slots[slot].sbi_size.split('x')[1]);
        bidmanager.addBidResponse(cb_map[slot], bidObject);
      } else {                      //  No aid? No ad.
        bidObject = bidfactory.createBid(2);
        bidObject.bidderCode = 'sonobi';
        bidmanager.addBidResponse(cb_map[slot], bidObject);
      }
    }
  }

  function _get_creative(sbi_dc, sbi_aid){
    var creative = '<scr' + 'ipt type="text/javascript"src="https://' + sbi_dc;
    creative += 'apex.go.sonobi.com/sbi.js?as=dfps&aid=' + sbi_aid;
    creative += '"></scr' + 'ipt>';
    return creative;
  }

  return { callBids: _phone_in };
};

module.exports = SonobiAdapter;