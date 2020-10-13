# Overview


**Module Name**: Hybrid.ai Bidder Adapter
**Module Type**: Bidder Adapter
**Maintainer**: prebid@hybrid.ai

# Description

You can use this adapter to get a bid from Hybrid.ai

About us: https://hybrid.ai

## Sample Banner Ad Unit

```js
var adUnits = [{
    code: 'banner_ad_unit',
    mediaTypes: {
        banner: {
            sizes: [[728, 90]]
        }
    },
    bids: [{
        bidder: "hybrid",
        params: {
            placement: "banner",                  // required
            placeId: "5af45ad34d506ee7acad0c26"   // required
        }
    }]
}];
```

## Sample Video Ad Unit

```js
var adUnits = [{
    code: 'video_ad_unit',
    mediaTypes: {
        video: {
            context: 'outstream',    // required
            playerSize: [640, 480]   // required
        }
    },
    bids: [{
        bidder: 'hybrid',
        params: {
            placement: "video",                   // required
            placeId: "5af45ad34d506ee7acad0c26"   // required
        }
    }]
}];
```

