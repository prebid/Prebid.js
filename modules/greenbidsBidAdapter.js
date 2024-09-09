import * as utils from 'src/utils';
import {config} from 'src/config';
import {registerBidder} from 'src/adapters/bidderFactory';
import {BANNER, VIDEO, NATIVE} from 'src/mediaTypes.js';
const BIDDER_CODE = 'example';
export const spec = {
        code: BIDDER_CODE,
    gvlid: 0000000000,
    supportedMediaTypes: [BANNER, VIDEO, NATIVE],
        aliases: [{code: "myAlias", gvlid: 99999999999} ],
        /**
         * Determines whether or not the given bid request is valid.
         *
         * @param {BidRequest} bid The bid params to validate.
         * @return boolean True if this is a valid bid, and false otherwise.
         */
        isBidRequestValid: function(bid) {
            return !!(bid.params.placementId || (bid.params.member && bid.params.invCode));
        },
        /**
         * Make a server request from the list of BidRequests.
         *
         * @param {validBidRequests[]} - an array of bids
         * @return ServerRequest Info describing the request to the server.
         */
        buildRequests: function(validBidRequests) {
            const payload = {
                /*
                Use `bidderRequest.bids[]` to get bidder-dependent
                request info.

                If your bidder supports multiple currencies, use
                `config.getConfig(currency)` to find which one the ad
                server needs.

                Pull the requested transaction ID from
                `bidderRequest.bids[].transactionId`.
                */
            };
            const payloadString = JSON.stringify(payload);
            return {
                method: 'POST',
                url: ENDPOINT_URL,
                data: payloadString,
            };
        },
        /**
         * Unpack the response from the server into a list of bids.
         *
         * @param {ServerResponse} serverResponse A successful response from the server.
         * @return {Bid[]} An array of bids which were nested inside the server.
         */
        interpretResponse: function(serverResponse, bidRequest) {
            // const serverBody  = serverResponse.body;
            // const headerValue = serverResponse.headers.get('some-response-header');
            const bidResponses = [];
            const bidResponse = {
                requestId: bidRequest.bidId,
                cpm: CPM,
                width: WIDTH,
                height: HEIGHT,
                creativeId: CREATIVE_ID,
                dealId: DEAL_ID,
                currency: CURRENCY,
                netRevenue: true,
                ttl: TIME_TO_LIVE,
                referrer: REFERER,
                ad: CREATIVE_BODY
            };
            bidResponses.push(bidResponse);
            return bidResponses;
        };
    },

    /**
     * Register the user sync pixels which should be dropped after the auction.
     *
     * @param {SyncOptions} syncOptions Which user syncs are allowed?
     * @param {ServerResponse[]} serverResponses List of server's responses.
     * @return {UserSync[]} The user syncs which should be dropped.
     */
    getUserSyncs: function(syncOptions, serverResponses, gdprConsent, uspConsent) {
       const syncs = []

       var gdpr_params;
       if (typeof gdprConsent.gdprApplies === 'boolean') {
           gdpr_params = `gdpr=${Number(gdprConsent.gdprApplies)}&gdpr_consent=${gdprConsent.consentString}`;
       } else {
           gdpr_params = `gdpr_consent=${gdprConsent.consentString}`;
       }

        if (syncOptions.iframeEnabled) {
            syncs.push({
                type: 'iframe',
                url: '//acdn.adnxs.com/ib/static/usersync/v3/async_usersync.html?' + gdpr_params
            });
        }
        if (syncOptions.pixelEnabled && serverResponses.length > 0) {
            syncs.push({
                type: 'image',
                url: serverResponses[0].body.userSync.url + gdpr_params
            });
        }
        return syncs;
    }

    /**
     * Register bidder specific code, which will execute if bidder timed out after an auction
     * @param {data} Containing timeout specific data
     */
    onTimeout: function(data) {
        // Bidder specifc code
    }

    /**
     * Register bidder specific code, which will execute if a bid from this bidder won the auction
     * @param {Bid} The bid that won the auction
     */
    onBidWon: function(bid) {
        // Bidder specific code
    }

    /**
     * Register bidder specific code, which will execute when the adserver targeting has been set for a bid from this bidder
     * @param {Bid} The bid of which the targeting has been set
     */
    onSetTargeting: function(bid) {
        // Bidder specific code
    }

    /**
     * Register bidder specific code, which will execute if the bidder responded with an error
     * @param {error, bidderRequest} An object with the XMLHttpRequest error and the bid request object
     */
    onBidderError: function({ error, bidderRequest }) {
        // Bidder specific code
    }

    /**
     * Register bidder specific code, which will execute if the ad
     * has been rendered successfully
     * @param {bid} bid request object
     */
    onAdRenderSucceeded: function(bid) {
        // Bidder specific code
    }
}
registerBidder(spec);
