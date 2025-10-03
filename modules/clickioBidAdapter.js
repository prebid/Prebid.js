import {deepSetValue, deepAccess} from '../src/utils.js';
import {registerBidder} from '../src/adapters/bidderFactory.js';
import {ortbConverter} from '../libraries/ortbConverter/converter.js';

const BIDDER_CODE = 'clickio';

const converter = ortbConverter({     
    context: {
        // `netRevenue` and `ttl` are required properties of bid responses - provide a default for them 
        netRevenue: true,    // or false if your adapter should set bidResponse.netRevenue = false
        ttl: 30              // default bidResponse.ttl (when not specified in ORTB response.seatbid[].bid[].exp)  
    },
    imp(buildImp, bidRequest, context) {
       const imp = buildImp(bidRequest, context);
       deepSetValue(imp, 'ext.params', bidRequest.params);
       return imp;
    }
/*    request(buildRequest, imps, bidderRequest, context) {
      let request = buildRequest(imps, bidderRequest, context);
      return request;
    },*/
});

registerBidder({
    code: BIDDER_CODE,
    buildRequests(bidRequests, bidderRequest) {
        const data = converter.toORTB({bidRequests, bidderRequest})
        return [{
            method: 'POST',
            url: 'https://o.clickiocdn.com/bids',
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

      return [
      {
        type: 'iframe',
        url: `https://onetag-sys.com/usync/?pubId=7685cd60ce8d4f0&${queryParams.join('&')}`
      }
      ];
    }
})