# Overview

```
Module Name: Integral Ad Science(IAS) Bidder Adapter
Module Type: Bidder Adapter
Maintainer: kat@integralads.com
```

# Description

This module is an integration with prebid.js with an IAS product, pet.js. It is not a bidder per se but works in a similar way: retrieve data that publishers might be interested in setting keyword targeting. 

# Test Parameters
```
    var adUnits = [
           {
               code: 'ias-dfp-test-async',
               sizes: [[300, 250]],  // a display size
               bids: [
                   {
                       bidder: "ias",
                       params: {
                           pubId: '99',
                           adUnitPath: '/57514611/news.com'
                       }
                   }
               ]
           }
       ];
```
