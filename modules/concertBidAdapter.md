# Overview

```
Module Name: Concert Bid Adapter
Module Type: Bidder Adapter
Maintainer: 'TODO ADD EMAIL'
```

# Description

Module that connects to Concert demand sources

# Test Paramters
```
  var adUnits = [
    {
      code: 'desktop_leaderboard_variable',
      mediaTypes: {
        banner: {
          sizes: [[1030, 590]]
        }
      }
      bids: [
        {
          bidder: "concert",
          params: {
            partnerId: 'test_partner'
          }
        }
      ]
    }
  ];
```