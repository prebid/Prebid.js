### Overview

```
Module Name: Dailymotion Bid Adapter
Module Type: Bidder Adapter
Maintainer: ad-leo-engineering@dailymotion.com
```

### Description

Dailymotion prebid adapter.
Supports video ad units in instream context.

### Usage

Make sure to have the following modules listed while building prebid : `priceFloors,dailymotionBidAdapter`

`priceFloors` module is needed to retrieve the price floor: https://docs.prebid.org/dev-docs/modules/floors.html 

```shell
gulp build --modules=priceFloors,dailymotionBidAdapter
```

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

#### Price floor

The price floor can be set at the ad unit level, for example : 

```javascript
const adUnits = [{
  floors: {
    currency: 'USD',
    schema: {
      fields: [ 'mediaType', 'size' ]
    },
    values: {
      'video|300x250': 2.22,
      'video|*': 1
    }
  },
  bids: [{
    bidder: 'dailymotion',
    params: {
      apiKey: 'dailymotion-testing',
    }
  }],
  code: 'test-ad-unit',
  mediaTypes: {
    video: {
      playerSize: [300, 250],
      context: 'instream',
    },
  }
}];

// Do not forget to set an empty object for "floors" to active the price floor module
pbjs.setConfig({floors: {}});
```

The following request will be sent to Dailymotion Prebid Service : 

```javascript
{
  "pbv": "9.23.0-pre",
  "ortb": {
    "imp": [
      {
        ...
        "bidfloor": 2.22,
        "bidfloorcur": "USD"
      }
    ],
  }
  ...
}
```

Or the price floor can be set at the package level, for example : 

```javascript
const adUnits = [
  {
    bids: [{
      bidder: 'dailymotion',
      params: {
        apiKey: 'dailymotion-testing',
      }
    }],
    code: 'test-ad-unit',
    mediaTypes: {
      video: {
        playerSize: [1280,720],
        context: 'instream',
      },
    }
  }
];

pbjs.setConfig({
  floors: {
      data: { 
          currency: 'USD',
          schema: {
              fields: [ 'mediaType', 'size' ]
          },
          values: {
              'video|300x250': 2.22,
              'video|*': 1
          }
      }
  }
})
```

This will send the following bid floor in the request to Daiymotion Prebid Service : 

```javascript
{
  "pbv": "9.23.0-pre",
  "ortb": {
    "imp": [
      {
        ...
        "bidfloor": 1,
        "bidfloorcur": "USD"
      }
    ],
    ...
  }
}
```

You can also [set dynamic floors](https://docs.prebid.org/dev-docs/modules/floors.html#bid-adapter-interface).

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

If you are using the Dailymotion player, you must provide the video `xid` in the `video.id` field of your ad unit, example:

```javascript
const adUnits = [
  {
    bids: [{
      bidder: 'dailymotion',
      params: {
        apiKey: 'dailymotion-testing',
        video: {
          id: 'x123456'     // Dailymotion infrastructure unique video ID
          autoplay: false,
          playerName: 'dailymotion',
          playerVolume: 8
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
Please note that if you provide any video metadata not listed above, they will be replaced by the ones fetched from the `video.id`.

If you are using a third party video player, you should fill the following members:

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
          url: 'https://test.com/testvideo'
          topics: 'topic_1, topic_2',
          isCreatedForKids: false,
          videoViewsInSession: 1,
          autoplay: false,
          playerName: 'video.js',
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
        protocols: [7, 8, 11, 12, 13, 14],
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
* `isCreatedForKids` - [The content is created for children as primary audience](https://faq.dailymotion.com/hc/en-us/articles/360020920159-Content-created-for-kids)

The following contextual information can also be added in bids.params.video.

* `autoplay` - Playback was launched without user interaction
* `playerName` - Name of the player used to display the video
* `playerVolume` - Player volume between 0 (muted, 0%) and 10 (100%)
* `videoViewsInSession` - Number of videos viewed within the current user session

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
| `ortb2.*`                                                                       | N/A             |
