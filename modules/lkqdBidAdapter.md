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
```javascript
var videoAdUnit = [
{
    code: 'video1',
    mediaTypes: {
        video: {
            context: "instream",
            playerSize: [640, 480]
        }
    },
    bids: [{
        bidder: 'lkqd',
        params: {
            siteId: '662921',
            placementId: '263'
        }
    }]
}];
```

# Configuration

The LKQD Bidder Adapter expects Prebid Cache to be enabled so that we can store and retrieve a single vastXml. If this value is not set it will have to use vastUrl to make a duplicate call to the SSP and cannot guarantee the same ad will be received after auctionEnd.

```javascript
pbjs.setConfig({
    usePrebidCache: true,
    cache: {
        url: 'https://prebid.adnxs.com/pbc/v1/cache'
    }
});
```
