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
  mediaTypes: {
    video: {
      playerSize: [[640, 480]],
      context: 'instream'
    },
  },
  bids: [{
    bidder: 'aniview',
    params: {
      AV_PUBLISHERID: '55b78633181f4603178b4568',
      AV_CHANNELID: '5d19dfca4b6236688c0a2fc4'
    }
  }]
}];
```

```
