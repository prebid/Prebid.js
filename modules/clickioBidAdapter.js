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
    getUserSyncs(syncOptions, _, gdprConsent, uspConsent, gppConsent = {}) {
      const { gppString = '', applicableSections = [] } = gppConsent;
      const queryParams = [];

      if (gdprConsent) {
        if (gdprConsent.gdprApplies) {
          queryParams.push(`gdpr=${gdprConsent.gdprApplies == true ? 1 : 0}`);
        }
        if (gdprConsent.consentString) {
          queryParams.push(`gdpr_consent=${gdprConsent.consentString}`);
        }
      }
      if (uspConsent) {
        queryParams.push(`us_privacy=${uspConsent}`);
      }
      queryParams.push(`gpp=${gppString}`);
      if (Array.isArray(applicableSections)) {
        for (const applicableSection of applicableSections) {
          queryParams.push(`gpp_sid=${applicableSection}`);
        }
      }

      return [{
        type: 'image',
        url: `https://o.clickiocdn.com/redirect?${queryParams.join('&')}`
      }];
    }
})