# Overview

```
Module Name:  Rubicon Project Bid Adapter
Module Type:  Bidder Adapter
Maintainer:   header-bidding@rubiconproject.com
```

# Description

Connect to Rubicon Project's exchange for bids.

The Rubicon Project adapter requires setup and approval from the
Rubicon Project team. Please reach out to your account team or
globalsupport@rubiconproject.com for more information.

# Test Parameters
```
    var adUnits = [
           {
               code: 'test-div',
               mediaTypes: {
                   banner: {
                       sizes: [[300, 250]]
                   }
               },
               bids: [
                   {
                       bidder: "rubicon",
                       params: {
                           accountId: 1001,
                           siteId: 113932,
                           zoneId: 535510
                       }
                   }
               ]
           },{
               code: 'test-native-size',
               mediaTypes: {
                   banner: {
                       sizes: [[300, 50]]
                   }
               },
               bids: [
                   {
                       bidder: "rubicon",
                       params: {
                           accountId: 1001,
                           siteId: 113932,
                           zoneId: 535510
                       }
                   }
               ]
           }
       ];
       
       var videoAdUnit = {
       code: 'myVideoAdUnit',
       mediaTypes: {
         video: {
            context: 'instream',
            playerSize: [640, 480],
            mimes: ['video/mp4', 'video/x-ms-wmv'],
            protocols: [2,5],
            maxduration:30,
            linearity: 1,
            api: [2]
         }
       },
       bids: [{
        bidder: 'rubicon',
        params: {
            accountId: '7780',
            siteId: '87184',
            zoneId: '413290',
            video: {
                language: 'en'
            }
         }
       }]
};
```
