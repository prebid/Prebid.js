# Overview

```
Module Name: Dailymotion Bid Adapter
Module Type: Bidder Adapter
Maintainer: ad-leo-engineering@dailymotion.com
```

# Description

Dailymotion prebid adapter.

# Configuration options

Before calling this adapter, you need to set its configuration with a call like this:

```javascript
pbjs.setBidderConfig({
    bidders: ["dailymotion"],
    config: {
        dailymotion: {
            api_key: 'fake_api_key',
        }
    }
});
```

This call must be made before the first auction to allow proper authentication with our servers.

`api_key` is your publisher API key. For testing purpose, you can use "dailymotion-testing".

# Test Parameters

By setting the following configuration options, you'll get a constant response to any request to validate your adapter integration:

```javascript
pbjs.setBidderConfig({
    bidders: ["dailymotion"],
    config: {
        dailymotion: {
            api_key: 'dailymotion-testing'
        }
    }
});
```

Please note that failing to set these configuration options will result in the adapter not bidding at all.

# Sample video AdUnit

```javascript
const adUnits = [
  {
    code: 'test-ad-unit',
    mediaTypes: {
      video: {
        context: 'instream',
        playerSize: [1280, 720],
        api: [2,7],
        description: 'this is a video description',
        duration: 556,
        iabcat2: 'test_cat',
        id: '54321',
        lang: 'FR',
        private: false,
        tags: 'tag_1,tag_2,tag_3',
        title: 'test video',
        topics: 'topic_1, topic_2',
        xid: 'x123456'
      },
    },
    bids: [{
      bidder: "dailymotion",
      params: {
        video: {
          description: 'this is a test video description',
          duration: 330,
          iabcat2: 'test_cat',
          id: '54321',
          lang: 'FR',
          private: false,
          tags: 'tag_1,tag_2,tag_3',
          title: 'test video',
          topics: 'topic_1, topic_2, topic_3',
          xid: 'x123456'
        }
      }
    }]
  }
];
```

Following video metadata fields can be added in mediaTypes.video or bids.params.video. If a field exists in both places, it will be overridden by bids.params.video.

* `description` - Video description
* `duration` - Video duration in seconds
* `iabcat2` - Video IAB category
* `id` - Video unique ID in host video infrastructure
* `lang` - ISO 639-1 code for main language used in the video
* `private` - True if video is not publicly available
* `tags` - Tags for the video, comma separated
* `title` - Video title
* `topics` - Main topics for the video, comma separated
* `xid` - Dailymotion video identifier (only applicable if using the Dailymotion player) and allows better targeting

# Integrating the adapter

To use the adapter with any non-test request, you first need to ask an API key from Dailymotion. Please contact us through **DailymotionPrebid.js@dailymotion.com**.

You will then be able to use it within the `config` before making a bid request.

This API key will ensure proper identification of your inventory and allow you to get real bids.
