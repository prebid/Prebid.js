# Overview

```
Module Name:  Cosmos Bid Adapter
Module Type:  Bidder Adapter
Maintainer:   dev@cosmoshq.com
```

# Description

Module that connects to Cosmos server for bids.
Supported Ad Fortmats:
* Banner
* Video

# Configuration
## Following configuration required for enabling user sync.
```javascript
pbjs.setConfig({
   userSync: {
    iframeEnabled: true,
    enabledBidders: ['cosmos'],
    syncDelay: 6000
 }});
```
## For Video ads, enable prebid cache
```javascript
pbjs.setConfig({
    cache: {
        url: 'https://prebid.adnxs.com/pbc/v1/cache'
    }
});
```

# Test Parameters
```
    var adUnits = [
           // Banner adUnit
           {
               code: 'banner-div',
               mediaTypes: {
                   banner: { //supported as per the openRTB spec
                       sizes: [[300, 250]]                            // required
                   }
               },
               bids: [
                   {
                       bidder: "cosmos",
                       params: {
                           publisherId: 1001, // required
                           tagId: 1           // optional
                       }
                   }
               ]
           },
           // Video adUnit
           {
               code: 'video-div',
               mediaTypes: {
                   video: { // supported as per the openRTB spec
                       sizes: [[300, 50]],                              // required
					  mimes : ['video/mp4', 'application/javascript'],   // required
                       context: 'instream'                              // optional
                   }
               },
               bids: [
                   {
                       bidder: "cosmos",
                       params: {
                           publisherId: 1001, // required
                           tagId: 1,          // optional
                           video: {           // supported as per the openRTB spec
                               
                           }
                       }
                   }
               ]
           }
       ];
```
