# Overview

```
Module Name: LKQD Bidder Adapter
Module Type: Bidder Adapter
Maintainer: support@lkqd.com
```

# Description

Connects to LKQD exchange for bids.

LKQD bid adapter supports Video ads currently.

For more information about [LKQD Ad Serving and Management](http://www.lkqd.com/ad-serving-and-management/), please contact [info@lkqd.com](info@lkqd.com).

# Sample Ad Unit: For Publishers
```
var videoAdUnit = [
{
    code: 'video1',
    sizes: [
        [300, 250],
        [640, 480]
    ],
    bids: [{
        bidder: 'lkqd',
        params: {
            siteId: '662921',
            placementId: '263'
        }
    }]
}];
