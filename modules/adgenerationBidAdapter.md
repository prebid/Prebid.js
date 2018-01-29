# Overview

```
Module Name:  Adgeneration Bid Adapter
Module Type:  Bidder Adapter
Maintainer: ssp-ope@supership.jp
```

# Description

Connects to Adgeneration exchange for bids.

Adgeneration bid adapter supports Banner and Native.

# Test Parameters
```
var adUnits = [
   // Banner adUnit
   {
       code: 'banner-div', // banner
               sizes: [[300, 250]],
               bids: [
                 {
                   bidder: 'adg',
                   params: {
                     id: '58278', // banner
                   }
                 },
               ]
   },
   // Native adUnit
   {
      code: 'native-div',
      sizes: [[1,1]],
              mediaTypes: {
                native: {
                  image: {
                    required: true
                  },
                  title: {
                    required: true,
                    len: 80
                  },
                  sponsoredBy: {
                    required: true
                  },
                  clickUrl: {
                    required: true
                  },
                  body: {
                    required: true
                  },
                  icon: {
                    required: true
                  }
                },
              },
              bids: [
                {
                  bidder: 'adg',
                  params: {
                    id: '58279', //native
                  }
                },
              ]
   },
];
```
