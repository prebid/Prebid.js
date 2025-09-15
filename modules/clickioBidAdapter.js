import {registerBidder} from '../src/adapters/bidderFactory.js';
import {ortbConverter} from '../libraries/ortbConverter/converter.js';

const BIDDER_CODE = 'clickio';

const converter = ortbConverter({     
    context: {
        // `netRevenue` and `ttl` are required properties of bid responses - provide a default for them 
        netRevenue: true,    // or false if your adapter should set bidResponse.netRevenue = false
        ttl: 30              // default bidResponse.ttl (when not specified in ORTB response.seatbid[].bid[].exp)  
    }
});

registerBidder({
    code: BIDDER_CODE,
    // ... rest of your spec goes here ...    
    buildRequests(bidRequests, bidderRequest) {
        const data = converter.toORTB({bidRequests, bidderRequest})
        // you may need to adjust `data` to suit your needs - see "customization" below
        return [{
            method: 'POST',
            url: 'https://platform.clickio.com/api/AdUnit/',
            data
        }]
    },
    isBidRequestValid(bid) {
        return true; 
    },
    interpretResponse(response, request) {
        const bids = converter.fromORTB({response: response.body, request: request.data}).bids;
        // likewise, you may need to adjust the bid response objects
        return bids;
    },
})