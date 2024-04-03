# Overview

```
Module Name: Dailymotion Bid Adapter
Module Type: Bidder Adapter
Maintainer: ad-leo-engineering@dailymotion.com
```

# Description

Dailymotion prebid adapter.

# Configuration options

Before calling this adapter, you need to set at least the API key in the bid parameters:

```javascript
const adUnits = [
  {
    bids: [{
      bidder: 'dailymotion',
      params: {
        apiKey: 'fake_api_key'
      }
    }]
  }
];
```

`apiKey` is your publisher API key. For testing purpose, you can use "dailymotion-testing".

# Test Parameters

By setting the following bid parameters, you'll get a constant response to any request, to validate your adapter integration:

```javascript
const adUnits = [
  {
    bids: [{
      bidder: 'dailymotion',
      params: {
        apiKey: 'dailymotion-testing'
      }
    }]
  }
];
```

Please note that failing to set these will result in the adapter not bidding at all.

# Sample video AdUnit

To allow better targeting, you should provide as much context about the video as possible.
There are two ways of doing this depending on if you're using Dailymotion player or a third party one.

If you are using the Dailymotion player, you should only provide the video `xid` in your ad unit, example:

```javascript
const adUnits = [
  {
    bids: [{
      bidder: 'dailymotion',
      params: {
        apiKey: 'dailymotion-testing'
      }
    }],
    code: 'test-ad-unit',
    mediaTypes: {
      video: {
        api: [2, 7],
        context: 'instream',
        playerSize: [ [1280, 720] ],
        startDelay: 0,
        xid: 'x123456'     // Dailymotion infrastructure unique video ID
      },
    }
  }
];
```

This will automatically fetch the most up-to-date information about the video.
If you provide any other metadata in addition to the `xid`, they will be ignored.

If you are using a third party video player, you should not provide any `xid` and instead fill the following members:

```javascript
const adUnits = [
  {
    bids: [{
      bidder: 'dailymotion',
      params: {
        apiKey: 'dailymotion-testing',
        video: {
          description: 'overriden video description'
        }
      }
    }],
    code: 'test-ad-unit',
    mediaTypes: {
      video: {
        api: [2, 7],
        context: 'instream',
        description: 'this is a video description',
        duration: 556,
        iabcat2: ['6', '17'],
        id: '54321',
        lang: 'FR',
        playerSize: [ [1280, 720] ],
        private: false,
        startDelay: 0,
        tags: 'tag_1,tag_2,tag_3',
        title: 'test video',
        topics: 'topic_1, topic_2',
      },
    }
  }
];
```

Each of the following video metadata fields can be added in mediaTypes.video or bids.params.video.
If a field exists in both places, it will be overridden by bids.params.video.

* `description` - Video description
* `duration` - Video duration in seconds
* `iabcat2` - List of IAB category IDs from the [2.0 taxonomy](https://github.com/InteractiveAdvertisingBureau/Taxonomies/blob/main/Content%20Taxonomies/Content%20Taxonomy%202.0.tsv)
* `id` - Video unique ID in host video infrastructure
* `lang` - ISO 639-1 code for main language used in the video
* `private` - True if video is not publicly available
* `tags` - Tags for the video, comma separated
* `title` - Video title
* `topics` - Main topics for the video, comma separated
* `xid` - Dailymotion video identifier (only applicable if using the Dailymotion player)

# Integrating the adapter

To use the adapter with any non-test request, you first need to ask an API key from Dailymotion. Please contact us through **DailymotionPrebid.js@dailymotion.com**.

You will then be able to use it within the bid parameters before making a bid request.

This API key will ensure proper identification of your inventory and allow you to get real bids.
