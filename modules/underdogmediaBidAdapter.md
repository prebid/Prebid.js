# Overview

**Module Name**: Underdog Media Bidder Adapter
**Module Type**: Bidder Adapter
**Maintainer**: jake@underdogmedia.com

# Description

Module that connects to Underdog Media's servers to fetch bids.

# Test Parameters
```
    var adUnits = [
        {
            code: 'test-div',
            mediaTypes: {
            banner: {
                sizes: [[300, 250]],  // a display size
            }
          },
            bids: [
                {
                    bidder: "underdogmedia",
                    params: {
                        siteId: '12143'
                    }
                }
            ]
        }
    ];
```