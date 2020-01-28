# Overview

```
Module Name:  media.net Bid Adapter
Module Type:  Bidder Adapter
Maintainer: prebid-support@media.net
```

# Description

Connects to Media.net's exchange for bids.
This adapter currently only supports Banner Ads.

# Sample Ad Unit: For Publishers
```javascript
var adUnits = [{
    code: 'media.net-hb-ad-123456-1',
    sizes: [
        [300, 250],
        [300, 600],
    ],
    bids: [{
        bidder: 'medianet',
        params: {
            cid: '<required-customerid-provided-by-media.net>',
            bidfloor: '<optional-float>',
            crid: '<required-pleacementid-provided-by-media.net>'
        }
    }]
}];
```

# Ad Unit and Setup: For Testing (Banner)

```html
 <!-- Prebid Config section -->
 <script>
     var PREBID_TIMEOUT = 2000;
     var adUnits = [{
         code: 'media.net-hb-ad-123456-1',
         sizes: [[300, 250]],
         bids: [{
             bidder: 'medianet',
             params: {
                 cid: '8CUX0H51C',
                 crid: '451466393',
                 // Site member is to be used only for testing
                 site: {
                     page: 'http://smoketesting.net/prebidtest/',
                     domain: 'smoketesting.net',
                     ref: 'http://smoketesting.net/prebidtest/'
                 }
             }
         }]
     }]; 
    var pbjs = pbjs || {};
    pbjs.que = pbjs.que || [];
</script>
<!-- End Prebid Config section -->
```


# Ad Unit and Setup: For Testing (Native)

```html
 <!-- Prebid Config section -->
 <script>
    var PREBID_TIMEOUT = 2000;
    var adUnits = [
        {
            code: 'div-gpt-ad-1544091247692-0',
            mediaTypes: {
                native: {
                    image: {
                        required: true,
                        sizes: [300, 250],
                        wmin: 50,
                    },
                    title: {
                        required: true,
                        len: 80
                    }
                }
            },
            bids: [
                {
                    bidder: 'medianet',
                    params: {
                        cid: '8CUX0H51C',
                        crid: '776755783',
                        // Site member is to be used only for testing
                        site: {
                            page: 'http://smoketesting.net/prebidtest/',
                            domain: 'smoketesting.net',
                            ref: 'http://smoketesting.net/prebidtest/'
                        }
                    }
                }
            ]
        }
    ];        
</script>
<!-- End Prebid Config section -->
