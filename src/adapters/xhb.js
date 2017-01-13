import {getBidRequest} from '../utils.js';

const CONSTANTS = require('../constants.json');
var utils = require('../utils.js');
var adloader = require('../adloader.js');
var bidmanager = require('../bidmanager.js');
var bidfactory = require('../bidfactory.js');

var XhbAdapter = function XhbAdapter() {

    function buildJPTCall(bid, callbackId) {
        //determine tag params
        const placementId = utils.getBidIdParamater('placementId', bid.params);
        var inventoryCode = utils.getBidIdParamater('invCode', bid.params);
        var referrer = utils.getBidIdParamater('referrer', bid.params);
        var altReferrer = utils.getBidIdParamater('alt_referrer', bid.params);

        //Always use https
        var jptCall = 'https://ib.adnxs.com/jpt?';

        jptCall = utils.tryAppendQueryString(jptCall, 'callback', '$$PREBID_GLOBAL$$.handleXhbCB');
        jptCall = utils.tryAppendQueryString(jptCall, 'callback_uid', callbackId);
        jptCall = utils.tryAppendQueryString(jptCall, 'id', placementId);
        jptCall = utils.tryAppendQueryString(jptCall, 'code', inventoryCode);

        //sizes takes a bit more logic
        var sizeQueryString = '';
        var parsedSizes = utils.parseSizesInput(bid.sizes);

        //combine string into proper querystring for impbus
        var parsedSizesLength = parsedSizes.length;
        if (parsedSizesLength > 0) {
            //first value should be "size"
            sizeQueryString = 'size=' + parsedSizes[0];
            if (parsedSizesLength > 1) {
                //any subsequent values should be "promo_sizes"
                sizeQueryString += '&promo_sizes=';
                for (var j = 1; j < parsedSizesLength; j++) {
                    sizeQueryString += parsedSizes[j] += ',';
                }
                //remove trailing comma
                if (sizeQueryString && sizeQueryString.charAt(sizeQueryString.length - 1) === ',') {
                    sizeQueryString = sizeQueryString.slice(0, sizeQueryString.length - 1);
                }
            }
        }

        if (sizeQueryString) {
            jptCall += sizeQueryString + '&';
        }

        //append custom attributes:
        var paramsCopy = utils.extend({}, bid.params);

        //delete attributes already used
        delete paramsCopy.placementId;
        delete paramsCopy.invCode;
        delete paramsCopy.query;
        delete paramsCopy.referrer;
        delete paramsCopy.alt_referrer;

        //get the reminder
        var queryParams = utils.parseQueryStringParameters(paramsCopy);

        //append
        if (queryParams) {
            jptCall += queryParams;
        }

        //append referrer
        if (referrer === '') {
            referrer = utils.getTopWindowUrl();
        }

        jptCall = utils.tryAppendQueryString(jptCall, 'referrer', referrer);
        jptCall = utils.tryAppendQueryString(jptCall, 'alt_referrer', altReferrer);


        //remove the trailing "&"
        if (jptCall.lastIndexOf('&') === jptCall.length - 1) {
            jptCall = jptCall.substring(0, jptCall.length - 1);
        }

        return jptCall;
    }

    //expose the callback to the global object:
    $$PREBID_GLOBAL$$.handleXhbCB = function (jptResponseObj) {

        var bidCode;

        if (jptResponseObj && jptResponseObj.callback_uid) {

            var responseCPM;
            var id = jptResponseObj.callback_uid;
            var placementCode = '';
            var bidObj = getBidRequest(id);
            if (bidObj) {
                bidCode = bidObj.bidder;
                placementCode = bidObj.placementCode;
                //set the status
                bidObj.status = CONSTANTS.STATUS.GOOD;
            }

            var bid = [];
            if (jptResponseObj.result && jptResponseObj.result.ad && jptResponseObj.result.ad !== '') {
                responseCPM = 0.00;

                //store bid response
                //bid status is good (indicating 1)
                var adId = jptResponseObj.result.creative_id;
                bid = bidfactory.createBid(CONSTANTS.STATUS.GOOD, bidObj);
                bid.creative_id = adId;
                bid.bidderCode = bidCode;
                bid.cpm = responseCPM;
                bid.adUrl = jptResponseObj.result.ad;
                bid.width = jptResponseObj.result.width;
                bid.height = jptResponseObj.result.height;
                bid.dealId = '99999999';

                bidmanager.addBidResponse(placementCode, bid);

            } else {
                //no response data
                //indicate that there is no bid for this placement
                bid = bidfactory.createBid(2);
                bid.bidderCode = bidCode;
                bidmanager.addBidResponse(placementCode, bid);
            }
        }
    };

    function _callBids(params) {
        var bids = params.bids || [];
        for (var i = 0; i < bids.length; i++) {
            var bid = bids[i];
            var callbackId = bid.bidId;
            adloader.loadScript(buildJPTCall(bid, callbackId));
        }
    }

    // Export the callBids function, so that prebid.js can execute
    // this function when the page asks to send out bid requests.
    return {
        callBids: _callBids
    };
};

module.exports = XhbAdapter;
