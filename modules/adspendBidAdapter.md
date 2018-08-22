# Overview

```
Module Name: AdSpend Bidder Adapter
Module Type: Bidder Adapter
Maintainer: gaffoonster@gmail.com
```

# Description

Connects to AdSpend bidder.
AdSpend adapter supports only Banner at the moment. Video and Native will be add soon.

# Test Parameters
```
var adUnits = [
    // Banner
    {
        code: 'any_code',
        mediaTypes: {
            banner: {
                // You can choose one of them
                sizes: [
                  [300, 250],
                  [300, 600],
                  [240, 400],
                  [728, 90],
                ]
            }
        },
        bids: [
            {
                bidder: "adspend",
                params: {
                    // These params is required for getting test banner
                    placement: 'test',
                    tagId: 'test-ad',
                }
            }
        ]
    }
];

pbjs.que.push(() => {
  pbjs.setConfig({
    userSync: {
      syncEnabled: true,
      enabledBidders: ['adspend'],
      pixelEnabled: true,
      syncsPerBidder: 200,
      syncDelay: 100,
    },
    currency: {
      adServerCurrency: 'RUB' // We work only with rubles for now
    }
  });
});
```
