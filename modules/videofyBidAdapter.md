# Overview

```
Module Name: Videofy Bidder Adapter
Module Type: Bidder Adapter
Maintainer: support1@videofy.ai
```

# Description

Connects to Videofy for bids.

Videofy bid adapter supports Video ads currently.

# Sample Ad Unit: For Publishers
```javascript
var videoAdUnit = [
{
  code: 'video1',
  mediaTypes: {
    video: {
      playerSize: [[640, 480]],
      context: 'outstream'
    },
  },
  bids: [{
    bidder: 'videofy',
    params: {
      AV_PUBLISHERID: '55b78633181f4603178b4568',
      AV_CHANNELID: '5d19dfca4b6236688c0a2fc4'
    }
  }]
}];
```

```
