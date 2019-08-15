# Overview

```
Module Name:  Cosmos Bid Adapter
Module Type:  Bidder Adapter
Maintainer:   dev@cosmoshq.com
```

# Description

Module that connects to Cosmos server for bids.
Currently banner and video formats are supported.

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
