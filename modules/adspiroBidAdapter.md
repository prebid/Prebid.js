# Overview

```
Module Name: Adspiro Bidder Adapter
Module Type: Bidder Adapter
Maintainer: connect@adspiro.io
```

# Description

Connects to the Adspiro OpenRTB 2.6 exchange for bids. Supports banner, video
(instream; outstream needs the publisher's own renderer), native (ORTB native
request) and audio. Adspiro serves US traffic.

Contact connect@adspiro.io to get a `publisherId`, then add this line to your
ads.txt (app-ads.txt for apps):

```
adspiro.io, <publisherId>, DIRECT
```

Bids are net CPMs in USD. Price floors are sent in USD; a floor in another
currency is left out of the request, and Prebid still enforces it on the bids.

User sync is an iframe sync on `rtb.adspiro.io`, or an image sync when iframes are
not allowed. It carries the GDPR, US Privacy and GPP signals Prebid has, and no
sync is made when COPPA applies. When the US Privacy CMP registers a data deletion
request (`consentManagementUsp` module), the adapter asks `rtb.adspiro.io` to delete
the user's data.

Use `publisherId: 'test'` for test bids: one $0.50 test bid per ad unit, with no
buyer called and nothing billed.

# Bid Params

| Name          | Scope    | Description                                       | Example  | Type     |
|---------------|----------|---------------------------------------------------|----------|----------|
| `publisherId` | required | Adspiro publisher ID. `'test'` returns test bids. | `'test'` | `string` |

# User Sync

Image syncs are allowed by default. To allow the iframe sync:

```js
pbjs.setConfig({
  userSync: {
    filterSettings: {
      iframe: {
        bidders: ['adspiro'],
        filter: 'include'
      }
    }
  }
});
```

# Test Parameters

Instream video and audio bids return VAST XML, so they need Prebid Cache
(`cache: { url: ... }` or `cache: { useLocal: true }`).

```js
var adUnits = [
  // Banner
  {
    code: 'test-banner',
    mediaTypes: {
      banner: {
        sizes: [[300, 250], [728, 90]]
      }
    },
    bids: [{
      bidder: 'adspiro',
      params: {
        publisherId: 'test'
      }
    }]
  },
  // Video, instream
  {
    code: 'test-video-instream',
    mediaTypes: {
      video: {
        context: 'instream',
        playerSize: [640, 480],
        mimes: ['video/mp4'],
        protocols: [2, 3, 5, 6],
        plcmt: 1
      }
    },
    bids: [{
      bidder: 'adspiro',
      params: {
        publisherId: 'test'
      }
    }]
  },
  // Video, outstream with the publisher's renderer
  {
    code: 'test-video-outstream',
    mediaTypes: {
      video: {
        context: 'outstream',
        playerSize: [640, 360],
        mimes: ['video/mp4'],
        protocols: [2, 3, 5, 6]
      }
    },
    renderer: {
      url: 'https://acdn.adnxs.com/video/outstream/ANOutstreamVideo.js',
      render: function (bid) {
        bid.renderer.push(function () {
          ANOutstreamVideo.renderAd({
            targetId: bid.adUnitCode,
            adResponse: {
              ad: {
                video: {
                  content: bid.vastXml,
                  player_width: bid.playerWidth,
                  player_height: bid.playerHeight
                }
              }
            }
          });
        });
      }
    },
    bids: [{
      bidder: 'adspiro',
      params: {
        publisherId: 'test'
      }
    }]
  },
  // Native
  {
    code: 'test-native',
    mediaTypes: {
      native: {
        ortb: {
          ver: '1.2',
          assets: [
            { id: 1, required: 1, title: { len: 90 } },
            { id: 2, required: 1, img: { type: 3, w: 1200, h: 627 } },
            { id: 3, required: 1, data: { type: 1 } },
            { id: 4, required: 0, data: { type: 2 } }
          ]
        }
      }
    },
    bids: [{
      bidder: 'adspiro',
      params: {
        publisherId: 'test'
      }
    }]
  },
  // Audio
  {
    code: 'test-audio',
    mediaTypes: {
      audio: {
        context: 'instream',
        mimes: ['audio/mp4', 'audio/mpeg'],
        minduration: 5,
        maxduration: 30,
        protocols: [2, 3, 5, 6]
      }
    },
    bids: [{
      bidder: 'adspiro',
      params: {
        publisherId: 'test'
      }
    }]
  }
];
```
