var utils = require('../utils.js');
var adloader = require('../adloader.js');
var bidmanager = require('../bidmanager.js');
var bidfactory = require('../bidfactory.js');

function AdformAdapter() {

    return {
        callBids: _callBids
    };

    function _callBids(params) {
        var callbackName, bid;
        var bids = params.bids;

        for (var i = 0, l = bids.length; i < l; i++) {
            bid = bids[i];
            callbackName = '_adf_' + utils.getUniqueIdentifierStr();

            pbjs[callbackName] = handleCallback(bid);
            adloader.loadScript(formRequestUrl(bid.params, callbackName));
        }
    }

    function formRequestUrl(reqData, callbackName) {

        var key;
        var url = [ '//', reqData.adxDomain || 'adx.adform.net', '/adx/?' ];
        
        var validProps = [
            'mid', 'inv', 'pdom', 'mname', 'mkw', 'mkv', 'cat', 'bcat', 'bcatrt', 'adv', 'advt', 'cntr', 'cntrt', 'maxp',
            'minp', 'sminp', 'w', 'h', 'pb', 'pos', 'cturl', 'iturl', 'cttype', 'hidedomain', 'cdims', 'test'
        ];

        for (var i = 0, l = validProps.length; i < l; i++) {
            key = validProps[i];
            if (reqData.hasOwnProperty(key))
                url.push(key, '=', reqData[key], '&');
        }

        url.push('callback=pbjs.', callbackName);

        return url.join('');
    }

    function handleCallback(bid) {
        return function handleResponse(adItem) {
            var bidObject, bidder = 'adform';

            if (adItem && adItem.response == 'banner') {
                bidObject = bidfactory.createBid(1);
                bidObject.bidderCode = bidder;
                bidObject.cpm = parseInt(adItem.win_bid, 10);
                bidObject.cur = adItem.win_cur;
                bidObject.ad = adItem.banner;
                bidObject.width = adItem.width;
                bidObject.height = adItem.height;

                bidmanager.addBidResponse(bid.placementCode, bidObject);
            } else {
                bidObject = bidfactory.createBid(2);
                bidObject.bidderCode = bidder;

                bidmanager.addBidResponse(bid.placementCode, bidObject);
            }
        };
    }
}

module.exports = AdformAdapter;
