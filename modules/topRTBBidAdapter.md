# Overview

```
Module Name: topRTB Bidder Adapter
Module Type: Bidder Adapter
Maintainer: karthikeyan.d@djaxtech.com
```

# Description

topRTB Bidder Adapter for Prebid.js. 
Only Banner & video format is supported.

# Test Parameters
```
    var adUnits = [
       {
       // Banner adUnit
           code: 'test-div-0',
           sizes: [[970,90]],  // a display size
           bids: [
               {
                    bidder: 'topRTB',
                    params: {
                        adUnitId: '3ec5a94f00cf4cc2858bc21533542827'
                    }
               }
           ]
       },
       // Video instream adUnit
        		code: 'video1',
                mediaTypes: {
                    video: {
                        playerSize: [640, 480],
                        context: 'instream'
                    }
                },
                bids: [{
                    bidder: 'topRTB',
                    params: {
							adUnitId: '29f929a511eb4adca361f4591be04488'
         		          		   
      			 		}
                }]
    ];
```
