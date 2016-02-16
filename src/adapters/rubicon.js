/**
 * @file Rubicon (Rubicon) adapter
 */
var utils = require('../utils');
var bidmanager = require('../bidmanager');
var bidfactory = require('../bidfactory');
var adloader = require('../adloader');

/**
 * @class RubiconAdapter
 * Prebid adapter for Rubicon's header bidding client
 */
var RubiconAdapter = function RubiconAdapter() {
    var RUBICONTAG_URL = (window.location.protocol) + '//ads.rubiconproject.com/header/';
    var RUBICON_OK_STATUS = 'ok';
    var RUBICON_BIDDER_CODE = 'rubicon';
    var RUBICON_SIZE_MAP = {
        "728x90": 2,
        "160x600": 9,
        "300x600": 10,
        "300x250": 15,
        "320x50": 43,
        "300x1050": 54,
        "970x250": 57
    };
    var RUBICON_INITIALIZED = 0;

    // the fastlane creative code
    var RUBICON_CREATIVE_START = '<script type="text/javascript">;(function (w, fe) { w.rubicontag.renderCreative(fe, "';
    var RUBICON_CREATIVE_END = '"); }(window.top, (document.body || document.documentElement)));</script>';

    // pre-initialize the rubicon object
    // needs to be attached to the window
    window.rubicontag = window.rubicontag || {};
    window.rubicontag.cmd = window.rubicontag.cmd || [];

    // timestamp for logging
    var _bidStart = null;
    var bidCount = 0;

    /**
     * Create an error bid
     * @param {String} placement - the adunit path
     * @param {Object} response - the (error) response from fastlane
     * @return {Bid} a bid, for prebid
     */
    function _errorBid(response, ads) {
        var bidResponse = bidfactory.createBid(2);
        bidResponse.bidderCode = RUBICON_BIDDER_CODE;

        // use the raw ads as the 'error'
        bidResponse.error = ads;
        return bidResponse;
    }

    /**
     * Sort function for CPM
     * @param {Object} adA
     * @param {Object} adB
     * @return {Float} sort order value
     */
    function _adCpmSort(adA, adB) {
        return (adB.cpm || 0.0) - (adA.cpm || 0.0);
    }

    /**
     * Produce the code to render a creative
     * @param {String} elemId the element passed to rubicon; this is essentially the ad-id
     * @param {Array<Integer,Integer>} size array of width, height
     * @return {String} creative
     */
    function _creative(elemId, size) {

        // convert the size to a rubicon sizeId
        var sizeId = RUBICON_SIZE_MAP[size.join('x')];

        if (!sizeId) {
            utils.logError(
                'fastlane: missing sizeId for size: ' + size.join('x') + ' could not render creative',
                RUBICON_BIDDER_CODE, RUBICON_SIZE_MAP);
            return '';
        }

        return RUBICON_CREATIVE_START + elemId + '", "' + sizeId + RUBICON_CREATIVE_END;
    }

    /**
     * Create a (successful) bid for a unit,
     * based on the given response
     * @param {String} placement placement code/unit path
     * @param {Object} response the response from rubicon
     * @return {Bid} a bid objectj
     */
    function _makeBid(response, ads) {

        // if there are multiple ads, sort by CPM
        ads = ads.sort(_adCpmSort);

        var bidResponse = bidfactory.createBid(1),
            ad = ads[0],
            size = ad.dimensions;

        if (!size) {
            // this really shouldn't happen
            utils.logError('no dimensions given', RUBICON_BIDDER_CODE, ad);
            return _errorBid(response, ads);
        }

        bidResponse.bidderCode = RUBICON_BIDDER_CODE;
        bidResponse.cpm = ad.cpm;
        // the element id is what the iframe will use to render
        // itself using the rubicontag.renderCreative API
        bidResponse.ad = _creative(response.getElementId(), size);
        bidResponse.width = size[0];
        bidResponse.height = size[1];
        return bidResponse;
    }

    /**
     * Add a success/error bid based
     * on the response from rubicon
     * @param {Object} response -- AJAX response from fastlane
     */
    function _addBid(response, ads) {
        // get the bid for the placement code
        var bid;
        if (!ads || ads.length === 0) {
            bid = _errorBid(response, ads);
        } else {
            bid = _makeBid(response, ads);
        }

        bidmanager.addBidResponse(response.getSlotName(), bid);
    }

    /**
     * Helper to queue functions on rubicontag
     * ready/available
     * @param {Function} callback
     */
    function _rready(callback) {
        window.rubicontag.cmd.push(callback);
    }

    /**
     * download the rubicontag sdk
     * @param {Object} options
     * @param {String} options.accountId
     * @param {Function} callback
     */
    function _initSDK(options, done) {
        if (RUBICON_INITIALIZED) return;
        RUBICON_INITIALIZED = 1;
        var accountId = options.accountId;
        adloader.loadScript(RUBICONTAG_URL + accountId + '.js', done);
    }

    /**
     * map the sizes in `bid.sizes` to Rubicon specific keys
     * @param  {object} array of bids
     * @return {[type]}      [description]
     */
    function _mapSizes(bids){
        utils._each(bids, function(bid){
            if(bid.params.sizes){
                return;
            }
             //return array like ['300x250', '728x90']
            var parsedSizes = utils.parseSizesInput(bid.sizes);
            //iterate the bid.sizes array to lookup codes
            var tempSize = [];
            for(var i =0; i < parsedSizes.length; i++){
                var rubiconKey = RUBICON_SIZE_MAP[parsedSizes[i]];
                if(rubiconKey){
                    tempSize.push(rubiconKey);
                }
            }
            bid.params.sizes = tempSize;
        });
    }

    /**
     * Define the slot using the rubicontag.defineSlot API
     * @param {Object} Bidrequest
     */
    function _defineSlot(bid) {
        _rready(function () {
            var newSlot=window.rubicontag.defineSlot({
                siteId: bid.params.siteId,
                zoneId: bid.params.zoneId,
                id: bid.placementCode,
                sizes: bid.params.sizes
            });
            if (bid.params.position) {
                newSlot.setPosition(bid.params.position);
            }
            if (bid.params.userId) {
                window.rubicontag.setUserKey(bid.params.userId);
            }
            if (bid.params.keywords) {
                for(var i=0; i < bid.params.keywords.length; i++){
                    newSlot.addKW(bid.params.keywords[i]);
                }
            }
            if (bid.params.inventory) {
                for (var p in bid.params.inventory) {
                    if (bid.params.inventory.hasOwnProperty(p)) {
                        newSlot.addFPI(p,bid.params.inventory[p]);
                    }
                }
            }
            if (bid.params.visitor) {
                for (var p in bid.params.visitor) {
                    if (bid.params.visitor.hasOwnProperty(p)) {
                        newSlot.addFPV(p,bid.params.visitor[p]);
                    }
                }
            }
        });
    }

    /**
     * Handle the bids received (from rubicon)
     */
    function _bidsReady() {
        // NOTE: we don't really need to do anything,
        // because right now we're shimming XMLHttpRequest.open,
        // but in the future we'll get data from rubicontag here
        utils.logMessage('Rubicon Project bidding complete: ' + ((new Date).getTime() - _bidStart));

        utils._each(rubicontag.getAllSlots(), function (slot) {
            _addBid(slot, slot.getRawResponses());
        });
    }


    /**
     * Request the specified bids from
     * Rubicon
     * @param {Object} params the bidder-level params (from prebid)
     * @param {Array} params.bids the bids requested
     */
    function _callBids(params) {

        // start the timer; want to measure from
        // even just loading the SDK
        _bidStart = (new Date).getTime();

        _mapSizes(params.bids);

        utils._each(params.bids, function (bid, index) {
            // on the first bid, set up the SDK
            // the config will be set on each bid
            if (index === 0) {
                _initSDK(bid.params);
            }

            _defineSlot(bid);
        });

        _rready(function () {
            window.rubicontag.run(_bidsReady);
        });
    }

    return {
        /**
         * @public callBids
         * the interface to Prebid
         */
        callBids: _callBids
    };
};

module.exports = RubiconAdapter;
