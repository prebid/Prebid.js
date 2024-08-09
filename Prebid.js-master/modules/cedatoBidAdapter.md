# Overview

```
Module Name: Cedato Bidder Adapter
Module Type: Bidder Adapter
Maintainer: alexk@cedato.com
```

# Description

Connects to Cedato Bidder. 
Player ID must be replaced. You can approach your Cedato account manager to get one.

# Test Parameters
```
var adUnits = [
    // Banner
    {
        code: 'div-gpt-ad-1460505748561-0',
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
                bidder: "cedato",
                params: {
                    player_id: 1450133326,
                }
            }
        ]
    }
];

pbjs.que.push(() => {
  pbjs.setConfig({
    userSync: {
      syncEnabled: true,
      enabledBidders: ['cedato'],
      pixelEnabled: true,
      syncsPerBidder: 200,
      syncDelay: 100,
    },
  });
});
```
