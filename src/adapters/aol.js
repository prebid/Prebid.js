var CONSTANTS = require('../constants.json');
var utils = require('../utils.js');
var bidfactory = require('../bidfactory.js');
var bidmanager = require('../bidmanager.js');

/**
 * Adapter for requesting bids from Aol.
 *
 * @returns {{callBids: _callBids}}
 * @constructor
 */
var AolAdapter = function AolAdapter() {

    var ADTECH_ENDPOINT = 'http://__SERVER__/pubapi/__API_VERSION__/__NETWORK__/__CONTENT_UNIT_ID__/__PAGE_ID__/__SIZE_ID__/ADTECH;cmd=bid;cors=yes;__OPTIONS__';
    var BIDDER_CODE = 'aol';

    /**
     * Request bids from AOL
     * @param params : list of bids
     * @private
     */
	function _callBids(params) {
        var bids = params.bids || [];
        bids.forEach(_requestBid);
	}


    /**
     * Call an url and retrieve/parse returned JSON
     * Please check check http://www.html5rocks.com/en/tutorials/cors for more information about implementation details
     * @param url : url pointing to a JSON
     * @param callback : function(error, data){} to be called once we have a parsed JSON (or an error)
     * @param options : additional request options. currently, only the "method" option is supported (HTTP verb to be used, by default, we use GET)
     * @private
     */
    function _getJSON(url, callback, options) {

        var method = 'GET';
        if (options && options.method) {
            method = options.method;
        }

        var xhr = new XMLHttpRequest();
        if ("withCredentials" in xhr) {
            xhr.open(method, url, true);

        } else if (typeof XDomainRequest != "undefined") {
            // XDomainRequest for IE.
            xhr = new XDomainRequest();
            xhr.open(method, url);
        } else {
            // CORS not supported.
            xhr = null;
        }

        if (!xhr) {
            callback(new Error('CORS not supported !'), null);

        } else {

            xhr.onreadystatechange = function() {
                if (xhr.readyState == 4) {
                    if (xhr.status == 200) {
                        try {
                            var parsed = JSON.parse(xhr.responseText);
                            callback(null, parsed);
                        } catch (e) {
                            callback(e, null);
                        }
                    } else {
                        callback(new Error('Status = ' + xhr.status), null);
                    }
                }
            };

            xhr.send();
        }
    }

    /**
     * Serialize options to be added in the endpoint url
     * @param options : javascript object containing options to serialize (key/value pairs)
     * @param separator : optional separator to be used to separate options. By default, we will use ";"
     * @returns {string} : serialized options
     * @private
     */
    function _serializeOptions(options, separator) {
        var array = [];
        if (options) {
            for(var key in options){
                array.push(key + '=' + options[key]);
            }
        }
        return array.join(separator || ';');
    }


    /**
     * Extend a javascript object with the properties of one or more objects
     * This code was taken from http://stackoverflow.com/questions/11197247/javascript-equivalent-of-jquerys-extend-method
     * @returns {*} : Extended javascript object
     * @private
     */
    function _extend(){
        for(var i=1; i<arguments.length; i++) {
            for(var key in arguments[i]) {
                if(arguments[i].hasOwnProperty(key)) {
                    arguments[0][key] = arguments[i][key];
                }
            }
        }
        return arguments[0];
    }


    /**
     * Generate the Endpoint URL to call in order to request a bid
     * @param bidconf : bid description
     * @returns {string} : bidding url
     * @private
     */
    function _generateBiddingApiUrl(bidconf) {
        return ADTECH_ENDPOINT
            .replace('__SERVER__', bidconf.params.server || 'adserver.adtechus.com')
            .replace('__NETWORK__', bidconf.params.network)
            .replace('__API_VERSION__', bidconf.params.apiVersion || '3.0')
            .replace('__CONTENT_UNIT_ID__', bidconf.params.placement)
            .replace('__PAGE_ID__', bidconf.params.pageId)
            .replace('__SIZE_ID__', bidconf.params.sizeId)
            .replace('__OPTIONS__', _serializeOptions(_extend({misc: (new Date).getTime()}, bidconf.params.options)));
    }


    /**
     * Request a bid from AOL
     * @param bidconf : bid description
     * @private
     */
	function _requestBid(bidconf) {

        _getJSON(_generateBiddingApiUrl(bidconf), function(err, response){

            try {
                var data = response.seatbid[0].bid[0];
                var bid = bidfactory.createBid(1);
                bid.cpm = data.price;
                bid.cur = response.cur;
                bid.ad = data.adm;
                bid.ad_id = data.impid;
                bid.bidderCode = BIDDER_CODE;
                bid.width = data.w;
                bid.height = data.h;
                bid.crid = data.crid;
                bidmanager.addBidResponse(bidconf.placementCode, bid);

            } catch (e) {
                var bid = bidfactory.createBid(2);
                bid.bidderCode = BIDDER_CODE;
                bidmanager.addBidResponse(bidconf.placementCode, bid);
            }

        });
	}

	return {
		callBids: _callBids
	};
};

module.exports = AolAdapter;