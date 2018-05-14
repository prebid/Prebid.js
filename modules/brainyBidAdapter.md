# Overview

```
Module Name: brainy Bid Adapter
Module Type: Bidder Adapter
Maintainer: support@mg.brainy-inc.co.jp
```

# Description
This module connects to brainy's demand sources. It supports display, and rich media formats.
brainy will provide ``accountID`` and ``slotID`` that are specific to your ad type.
Please reach out to ``support@mg.brainy-inc.co.jp`` to set up an brainy account and above ids.
Use bidder code ```brainy``` for all brainy traffic.


# Test Parameters

```
 var adUnits = [{
   code: 'test-div',
   sizes: [[300, 250],
   bids: [{
       bidder: 'brainy',
       params: {
         accountID: "3481",
         slotID: "5569"
       }
     }]
   }
 ];
```
