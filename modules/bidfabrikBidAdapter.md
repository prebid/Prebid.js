# Overview

```
Module Name:  BidFabrik Bid Adapter
Module Type:  Bidder Adapter
Maintainer:   bern@revantage.io
```

# Description

BidFabrik is a white-label OpenRTB bid adapter supporting banner, video, and native. Each supply feed is identified by a `feed` parameter. The adapter groups impressions by `(host, feed)` and sends one OpenRTB 2.x request per group.

Aliases: `revortb`, `xrevantage`

# Test Parameters

```javascript
var adUnits = [
  {
    code: 'banner-div',
    mediaTypes: {
      banner: { sizes: [[300, 250], [728, 90]] }
    },
    bids: [{
      bidder: 'bidfabrik',
      params: {
        feed: 'oubjsrii',
        host: 'bid.bidfabrik.com'  // optional, defaults to bid.bidfabrik.com
      }
    }]
  },
  {
    code: 'video-div',
    mediaTypes: {
      video: {
        context: 'instream',
        playerSize: [[640, 480]],
        mimes: ['video/mp4'],
        protocols: [2, 3, 5, 6]
      }
    },
    bids: [{
      bidder: 'bidfabrik',
      params: {
        feed: 'oubjsrii'
      }
    }]
  }
];
```
