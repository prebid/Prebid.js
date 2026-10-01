# Overview

Module Name: SSMas Bidder Adapter
Module Type: Bidder Adapter
Maintainer: ivan@ssmas.com

# Description

Module that connects to Sem Seo & Mas header bidding endpoint to fetch bids.
Supports Banner
Supported currencies: EUR

Required parameters:
- placement id

# Test Parameters
```
var adUnits = [
   // Banner adUnit
   {
      code: 'banner-div',
      mediaTypes: {
        banner: {
          sizes: [[300, 250]]
        }
      },
      bids: [{
         bidder: 'ssmas',
         params: {
            placementId: "10336"
         }
       }]
   }
];
```

# User Sync

The demand partners behind the endpoint receive their user id with each
request once they are synced. The request says which kinds of sync the
`userSync` config allows the `ssmas` bidder, and the bid response lists, in
`ext.usersync`, the partners the user is missing, each in one of those kinds,
which the adapter loads. Allowing iframes syncs the partners that only offer
an iframe:

```
pbjs.setConfig({
   userSync: {
      filterSettings: {
         iframe: { bidders: ['ssmas'], filter: 'include' }
      }
   }
});
```
