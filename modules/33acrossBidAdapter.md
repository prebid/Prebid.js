# Overview

```
Module Name:  33Across Bid Adapter
Module Type:  Bidder Adapter
Maintainer: aparna.hegde@33across.com
```

# Description

Connects to 33Across's exchange for bids.

33Across bid adapter supports only Banner at present and follows MRA

# Sample Ad Unit: For Publishers
```
var adUnits = [
{
    code: '33across-hb-ad-123456-1',    
    sizes: [
        [300, 250], 
        [728, 90]
    ],     
    bids: [{
        bidder: '33across',
        params: {
            siteId: 'pub1234',     
            productId: 'infeed'     
        }
    }]
}
```

# Ad Unit and Setup: For Testing
In order to receive bids please map localhost to (any) test domain.

```
<--! Prebid Config section >
<script> 
    var PREBID_TIMEOUT = 3000;
    var adUnits = [
    {
        code: '33across-hb-ad-123456-1',
        sizes: [
            [300, 250], 
            [728, 90]
        ],     
        bids: [{
            bidder: '33across',
            params: {
            site: {
                id: 'aRlI5W_9yr5jkxacwqm_6r',
                page: "http://thinkbabynames.com/baby-mcbabyface",
                ext: {
                    ttx: {
                        ssp_configs: [
                            {
                            "name": "index",
                            "enabled": false
                            },
                            {
                            "name": "rubicon",
                            "enabled": true
                            },
                            {
                            "name": "33xchange",
                            "enabled": false
                            }
                        ]
                    }
                }
            },
            productId: 'infeed'
        }
        }]
    }
    ];
    
    var pbjs = pbjs || {};
    pbjs.que = pbjs.que || [];

    // Adjust bid CPM to ensure it wins the auction (USED ONLY FOR TESTING). Need to do this since test bids have too low a CPM
    pbjs.bidderSettings = {
      '33across': {
        bidCpmAdjustment : function(bidCpm, bid){
          // adjust the bid in real time before the auction takes place, only do so for valid bids ignore no bids
          if (bid.w !== 0 && bid.h !== 0 && bidCpm !== 0) {
            return bidCpm + 0.50;
          }
        }
      }
    };
  </script>
  <!-- End Prebid Config section>
  ```