# Overview

Module Name: Criteo Bidder Adapter
Module Type: Bidder Adapter
Maintainer: pi-direct@criteo.com

# Description

Module that connects to Criteo's demand sources.

# Test Parameters
```
    var adUnits = [
        {
            code: 'banner-ad-div',
            sizes: [[300, 250], [728, 90]],
            bids: [
                {
                    bidder: 'criteo',
                    params: {
                        zoneId: 497747
                    }
                }
            ]
        }
    ];
```

# Additional Config (Optional)
Set the "ceh" property to provides the user's hashed email if available
```
  pbjs.setConfig({
    criteo: {
      ceh: 'hashed mail'
    }
  });
```