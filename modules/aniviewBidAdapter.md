# Overview

```
Module Name: ANIVIEW Bidder Adapter
Module Type: Bidder Adapter
Maintainer: support@aniview.com
```

# Description

Connects to ANIVIEW Ad server for bids.

ANIVIEW bid adapter supports Video ads currently.

For more information about [Aniview](http://www.aniview.com), please contact [support@aniview.com](support@aniview.com).

# Sample Ad Unit: For Publishers
```javascript
var videoAdUnit = [
{
    code: 'video1',
    sizes: [
        [300, 250],
        [640, 480]
    ],
    bids: [{
        bidder: 'aniview',
        params: {
            AV_PUBLISHERID: '55b78633181f4603178b4568',
            AV_CHANNELID: '55b7904d181f46410f8b4568'
        }
    }]
}];
```

```
