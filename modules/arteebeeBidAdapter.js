
import { BANNER } from 'src/mediaTypes';
import { registerBidder } from 'src/adapters/bidderFactory';

const BIDDER_CODE = 'arteebee';
export const spec = {
    code: BIDDER_CODE,
    supportedMediaTypes: [BANNER],
    isBidRequestValid: function(bidRequest) {
        return 'params' in bidRequest && bidRequest.params.pub !== undefined
        && bidRequest.params.source !== undefined;
    },
    buildRequests: function(validBidRequests) {
        const payload = {};
        const payloadString = JSON.stringify(payload);
        return {
            method: 'POST',
            url: 'https://bidder.mamrtb.com/dsdds',
            data: payloadString
        };
    },
    interpretResponse: function(serverResponse, bidRequest) {
        const bidResponses = [];
        const bidResponse = {
            requestId: bidRequest.bidId,
            cpm: 1,
            width: 300,
            height: 250,
            mediaType: BANNER,
            creativeId: 'aaa',
            currency: 'USD',
            netRevenue: true,
            ttl: 360,
            ad: 'dsdsd'
        };
        bidResponses.push(bidResponse);
        return bidResponses;
    },
    getUserSyncs: function(syncOptions, serverResponses) {
        return [];
    }
}

registerBidder(spec);