var bidfactory = require('../bidfactory.js');
var bidmanager = require('../bidmanager.js');
var adloader = require('../adloader');

var SovrnAdapter = function SovrnAdapter() {
    pbjs.sovrn = {
        requestMap: {},
        impressionMap: {},
        handleSovrnCallback: function (response) {
            var i, j, bid, bidObject;
            if (undefined === pbjs.sovrn.requestMap[response.id]) {
                return;
            }

            for (i = 0; i < response.seatbid.length; i++) {
                for (j = 0; j < response.seatbid[i].bid.length; j++) {
                    bid = response.seatbid[i].bid[j];
                    if (undefined === pbjs.sovrn.impressionMap[bid.impid]) {
                        continue;
                    }

                    bidObject = bidfactory.createBid(1);
                    bidObject.bidderCode = 'sovrn';
                    bidObject.cpm = bid.price;
                    bidObject.ad = bid.adm;
                    bidObject.width = pbjs.sovrn.impressionMap[bid.impid].width;
                    bidObject.height = pbjs.sovrn.impressionMap[bid.impid].height;
                    bidmanager.addBidResponse(pbjs.sovrn.impressionMap[bid.impid].adUnitCode, bidObject);
                }
            }
        }
    };

    function _callBids(params) {
        if (-1 == params.bidderCode.indexOf('sovrn')) {
            return;
        }

        var bids = params.bids || [];
        if (0 == bids.length) {
            return;
        }

        var impressions = [];
        for (var i = 0; i < bids.length; i++) {
            var bid = bids[i];
            for (var j = 0; j < bids[i].sizes.length; j++) {
                var size = bid.sizes[j];
                var width = size[0];
                var height = size[1];
                var impressionId = 'i_' + width + 'x' + height + '_' + (new Date()).getTime();
                pbjs.sovrn.impressionMap[impressionId] = {
                    bid: bid,
                    width: width,
                    height: height,
                    adUnitCode: bid.placementCode
                };
                impressions.push({
                    id: impressionId,
                    banner: {
                        w: width,
                        h: height
                    },
                    tagid: bid.params.tagId,
                    bidfloor: bid.params.bidFloor
                });
            }
        }

        var requestId = 'br_' + (new Date()).getTime();
        pbjs.sovrn.requestMap[requestId] = bids;
        var bidRequest = {
            id: requestId,
            imp: impressions,
            site: {
                domain: location.hostname,
                page: location.pathname + location.search + location.hash
            }
        };

        var scriptUrl = '//ap.lijit.com/rtb/bid?callback=window.pbjs.sovrn.handleSovrnCallback&br=' +
            encodeURIComponent(JSON.stringify(bidRequest));
        adloader.loadScript(scriptUrl);
    }

    // Export the callBids function, so that prebid.js can execute this function
    // when the page asks to send out bid requests.
    return {
        callBids: _callBids
    };
};

module.exports = SovrnAdapter;
