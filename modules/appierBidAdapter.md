# Overview

```
Module Name:  Appier Bid Adapter
Module Type:  Bidder Adapter
Maintainer: apn-dev@appier.com
```

# Description

Connects to Appier exchange for bids.

NOTE:
- Appier bid adapter only supports Banner at the moment.
- Multi-currency is not supported. Please make sure you have correct DFP currency settings according to your deal with Appier.

# Sample Ad Unit Config
```
var adUnits = [
   // Banner adUnit
   {
      code: 'banner-div',
      mediaTypes: {
        banner: {
          sizes: [[300, 250], [300,600]]
        }
      },
      bids: [{
         bidder: 'appier',
         params: {
           hzid: 'WhM5WIOp'
         }
       }]
   }
];
```

# Additional Config (Optional)
Set the "farm" to use region-specific server
```
  // use the bid server in Taiwan (country code: tw)
  pbjs.setConfig({
    appier: {
      'farm': 'tw'
    }
  });
```

Explicitly override the bid server used for bidding
```
  // use the bid server specified and override the default
  pbjs.setConfig({
    appier: {
      'server': '${HOST_NAME_OF_THE_SERVER}'
    }
  });
```
