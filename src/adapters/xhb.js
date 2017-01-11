import { getBidRequest } from '../utils.js';

var CONSTANTS = require('../constants.json');
var utils = require('../utils.js');
var adloader = require('../adloader.js');
var bidmanager = require('../bidmanager.js');
var bidfactory = require('../bidfactory.js');
//var Adapter = require('./adapter.js');

var XhbAdapter = function XhbAdapter() {

    function buildJPTCall(bid, callbackId) {
        //determine tag params
        var placementId = utils.getBidIdParamater('placementId', bid.params);
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

        // @if NODE_ENV='debug'
        utils.logMessage('jpt request built: ' + jptCall);
        // @endif

        //append a timer here to track latency
        bid.startTime = new Date().getTime();

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

            // @if NODE_ENV='debug'
            utils.logMessage('JSONP callback function called for ad ID: ' + id);
            // @endif

            var bid = [];
            if (jptResponseObj.result && jptResponseObj.result.ad && jptResponseObj.result.ad !== '') {


                //responseCPM = parseInt(jptResponseObj.result.cpm, 10);
                //CPM response from /jpt is dollar/cent multiplied by 10000
                //in order to avoid using floats
                //switch CPM to "dollar/cent"
                //responseCPM = responseCPM / 10000;
                responseCPM = 0.00;

                //store bid response
                //bid status is good (indicating 1)

                var adId = jptResponseObj.result.creative_id;
                bid = bidfactory.createBid(1);
                bid.creative_id = adId;
                bid.bidderCode = bidCode;
                bid.cpm = responseCPM;
                //bid.available = '1';
                bid.adUrl = jptResponseObj.result.ad;
                bid.width = jptResponseObj.result.width;
                bid.height = jptResponseObj.result.height;
                //bid.dealId = jptResponseObj.result.deal_id;
                bid.dealId = '99999999';

                bidmanager.addBidResponse(placementCode, bid);

            } else {
                //no response data
                // @if NODE_ENV='debug'
                utils.logMessage('No prebid response from AppNexus for placement code ' + placementCode);
                // @endif

                //indicate that there is no bid for this placement
                bid = bidfactory.createBid(2);
                bid.bidderCode = bidCode;
                bidmanager.addBidResponse(placementCode, bid);
            }

        } else {
            //no response data
            // @if NODE_ENV='debug'
            utils.logMessage('No prebid response for placement %%PLACEMENT%%');

            // @endif
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
