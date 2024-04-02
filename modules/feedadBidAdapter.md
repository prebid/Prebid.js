# Overview

```
Module Name: FeedAd Adapter
Module Type: Bidder Adapter
Maintainer: mail@feedad.com
```

# Description

Prebid.JS adapter that connects to the FeedAd demand sources.

# Test Parameters
```
    var adUnits = [
        {
            code: 'test-div',
            mediaTypes: {
                banner: { // supports all banner sizes
                    sizes: [[300, 250]],
                }
            },
            bids: [
                {
                    bidder: "feedad",
                    params: {
                        clientToken: 'your-client-token' // see below for more info
                        placementId: 'your-placement-id' // see below for more info
                        decoration: 'decoration parameters' // optional, see below for info
                    }
                }
            ]
        }
    ];
```

# Required Parameters

| Parameter     | Description |
|---------------| ----------- |
| `clientToken` | Your FeedAd web client token. You can view your client token inside the FeedAd admin panel. |
| `placementId` | You can choose placement IDs yourself. A placement ID should be named after the ad position inside your product. For example, if you want to display an ad inside a list of news articles, you could name it "ad-news-overview".<br> A placement ID may consist of lowercase `a-z`, `0-9`, `-` and `_`. You do not have to manually create the placement IDs before using them. Just specify them within the code, and they will appear in the FeedAd admin panel after the first request. <br> [Learn more](/concept/feed_ad/index.html) about Placement IDs and how they are grouped to play the same Creative. |
| `decoration`  | Optional. If you want to apply a [decoration](https://docs.feedad.com/web/feed_ad/#decorations) to the ad.
