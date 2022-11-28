# Overview

```
Module Name: BLIINK Bidder Adapter
Module Type: Bidder Adapter
Maintainer: samuel@bliink.io | ibrahima@bliink.io
gdpr_supported: true
tcf2_supported: true
media_types: banner, video
```

# Description

Module that connects to BLIINK demand sources to fetch bids.

# Test Parameters

## Sample Banner Ad Unit

```js
const adUnits = [
  {
    code: '/19968336/test',
    mediaTypes: {
      banner: {
        sizes: [[300, 250]]
      }
    },
    bids: [
      {
        bidder: 'bliink',
        params: {
          tagId: '41'
        }
      }
    ]
  }
]
```

## Sample Instream Video Ad Unit

```js
const adUnits = [
  {
    code: '/19968336/prebid_cache_video_adunit',
    sizes: [[640,480]],
    mediaType: 'video',
    mediaTypes: {
      video: {
        context: 'instream',
        playerSize: [[640,480]],
      }
    },
    bids: [
      {
        bidder: 'bliink',
        params: {
          tagId: '41',
        }
      }
    ]
  }
]
```

## Sample outstream Video Ad Unit

```js
const adUnits = [
  {
    code: '/19968336/prebid_cache_video_adunit',
    sizes: [[640,480]],
    mediaType: 'video',
    mediaTypes: {
      video: {
        context: 'outstream',
        playerSize: [[640,480]],
      }
    },
    bids: [
      {
        bidder: 'bliink',
        params: {
          tagId: '41',
        }
      }
    ]
  }
]
```
