### Overview

```
Module Name: Dailymotion Bid Adapter
Module Type: Bidder Adapter
Maintainer: ad-leo-engineering@dailymotion.com
```

### Description

Dailymotion prebid adapter.
Supports video ad units in instream context.

### Configuration options

Before calling this adapter, you need to at least set a video adUnit in an instream context and the API key in the bid parameters:

```javascript
const adUnits = [
  {
    bids: [{
      bidder: 'dailymotion',
      params: {
        apiKey: 'fake_api_key'
      },
    }],
    code: 'test-ad-unit',
    mediaTypes: {
      video: {
        context: 'instream',
      },
    },
  }
];
```

`apiKey` is your publisher API key. For testing purpose, you can use "dailymotion-testing".

#### User Sync

To enable user synchronization, add the following code. Dailymotion highly recommends using iframes and/or pixels for user syncing. This feature enhances DSP user match rates, resulting in higher bid rates and bid prices. Ensure that `pbjs.setConfig()` is called only once.

```javascript
pbjs.setConfig({
  userSync: {
    syncEnabled: true,
    filterSettings: {
      iframe: {
        bidders: '*', // Or add dailymotion to your list included bidders
        filter: 'include'
      },
      image: {
        bidders: '*', // Or add dailymotion to your list of included bidders
        filter: 'include'
      },
    },
  },
});
```

### Test Parameters

By setting the following bid parameters, you'll get a constant response to any request, to validate your adapter integration:

```javascript
const adUnits = [
  {
    bids: [{
      bidder: 'dailymotion',
      params: {
        apiKey: 'dailymotion-testing',
      },
    }],
    code: 'test-ad-unit',
    mediaTypes: {
      video: {
        context: 'instream',
      },
    },
  }
];
```

Please note that failing to set these will result in the adapter not bidding at all.

### Sample video AdUnit

To allow better targeting, you should provide as much context about the video as possible.
There are three ways of doing this depending on if you're using Dailymotion player or a third party one.

If you are using the Dailymotion player, you should only provide the video `xid` in your ad unit, example:

```javascript
const adUnits = [
  {
    bids: [{
      bidder: 'dailymotion',
      params: {
        apiKey: 'dailymotion-testing',
        video: {
          xid: 'x123456'     // Dailymotion infrastructure unique video ID
        },
      }
    }],
    code: 'test-ad-unit',
    mediaTypes: {
      video: {
        api: [2, 7],
        context: 'instream',
        startdelay: 0,
        w: 1280,
        h: 720,
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
          description: 'this is a video description',
          duration: 556,
          iabcat1: ['IAB-2'],
          iabcat2: ['6', '17'],
          id: '54321',
          lang: 'FR',
          livestream: 0,
          private: false,
          tags: 'tag_1,tag_2,tag_3',
          title: 'test video',
          topics: 'topic_1, topic_2',
          isCreatedForKids: false,
          videoViewsInSession: 1,
          autoplay: false,
          playerVolume: 8
        }
      }
    }],
    code: 'test-ad-unit',
    mediaTypes: {
      video: {
        api: [2, 7],
        context: 'instream',
        mimes: ['video/mp4'],
        minduration: 5,
        maxduration: 30,
        playbackmethod: [3],
        plcmt: 1,
        protocols: [7, 8, 11, 12, 13, 14]
        startdelay: 0,
        w: 1280,
        h: 720,
      },
    }
  }
];
```

Each of the following video metadata fields can be added in bids.params.video.

* `description` - Video description
* `duration` - Video duration in seconds
* `iabcat1` - List of IAB category IDs from the [1.0 taxonomy](https://github.com/InteractiveAdvertisingBureau/Taxonomies/blob/main/Content%20Taxonomies/Content%20Taxonomy%201.0.tsv)
* `iabcat2` - List of IAB category IDs from the [2.0 taxonomy](https://github.com/InteractiveAdvertisingBureau/Taxonomies/blob/main/Content%20Taxonomies/Content%20Taxonomy%202.0.tsv) and above
* `id` - Video unique ID in host video infrastructure
* `lang` - ISO 639-1 code for main language used in the video
* `livestream` - 0 = not live, 1 = content is live
* `private` - True if video is not publicly available
* `tags` - Tags for the video, comma separated
* `title` - Video title
* `url` - URL of the content
* `topics` - Main topics for the video, comma separated
* `xid` - Dailymotion video identifier (only applicable if using the Dailymotion player)
* `isCreatedForKids` - [The content is created for children as primary audience](https://faq.dailymotion.com/hc/en-us/articles/360020920159-Content-created-for-kids)

The following contextual informations can also be added in bids.params.video.

* `videoViewsInSession` - Number of videos viewed within the current user session
* `autoplay` - Playback was launched without user interaction
* `playerVolume` - Player volume between 0 (muted, 0%) and 10 (100%)

If you already specify [First-Party data](https://docs.prebid.org/features/firstPartyData.html) through the `ortb2` object when calling [`pbjs.requestBids(requestObj)`](https://docs.prebid.org/dev-docs/publisher-api-reference/requestBids.html), we will collect the following values and fallback to bids.params.video values when applicable. See the mapping below.

| From ortb2                                                                      | Metadata fields |
|---------------------------------------------------------------------------------|-----------------|
| `ortb2.site.content.cat` OR `ortb2.site.content.data` where `ext.segtax` is `4` | `iabcat1`       |
| `ortb2.site.content.data` where `ext.segtax` is `5`, `6` or `7`                 | `iabcat2`       |
| `ortb2.site.content.id`                                                         | `id`            |
| `ortb2.site.content.language`                                                   | `lang`          |
| `ortb2.site.content.livestream`                                                 | `livestream`    |
| `ortb2.site.content.keywords`                                                   | `tags`          |
| `ortb2.site.content.title`                                                      | `title`         |
| `ortb2.site.content.url`                                                        | `url`           |
| `ortb2.app.bundle`                                                              | N/A             |
| `ortb2.app.storeurl`                                                            | N/A             |
| `ortb2.device.lmt`                                                              | N/A             |
| `ortb2.device.ifa`                                                              | N/A             |
| `ortb2.device.ext.atts`                                                         | N/A             |

### Integrating the adapter

To use the adapter with any non-test request, you first need to ask an API key from Dailymotion. Please contact us through **DailymotionPrebid.js@dailymotion.com**.

You will then be able to use it within the bid parameters before making a bid request.

This API key will ensure proper identification of your inventory and allow you to get real bids.
