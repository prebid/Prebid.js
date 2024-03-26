# Overview

```
Module Name: PremiumAds Bid Adapter
Module Type: Bidder Adapter
Maintainer: adops@premiumads.net
```

# Description

- Connects to PremiumAds Exchange for bids.
- PremiumAds bid adapter supports Banner currently.

# Test Parameters

```
var adUnits = [
  {
    code: 'banner-sample',
    mediaTypes: {
      banner: {
        sizes: [[300, 250]]
      }
    },
    bids: [
      {
          bidder: 'premiumads',
          params: {
              adUnitId: 1123568438, // required, Ad unit id provided by PremiumAds
              floor: 0.1         // optional  
          }
      }
    ]
  }
];
```

Note: Combine the above the configuration with any other UserSync configuration. Multiple setConfig() calls overwrite
each other and only last call for a given attribute will take effect.

# Notes:

- PremiumAds will return a test-bid if "premiumadsTest=true" is present in page URL
- PremiumAds will set bid.adserverTargeting.hb_buyid_premiumads targeting key while submitting a bid into Prebid

