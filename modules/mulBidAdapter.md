# Overview

```markdown
Module Name: Mul Bidder Adapter
Module Type: Bidder Adapter
Maintainer: business@responsiq.com
```

# Description

The Mul (MonetiseUp) bidder adapter connects publishers directly to MonetiseUp's header bidding marketplace, aggregating demand from top programmatic SSPs and DSPs including Adagio, PubMatic, OpenX, 152Media, Nobid, OnlineMediaSolutions, Scalibur, TripleLift, Eskimi, and Equativ. It supports both banner and video (instream/outstream) ad formats through OpenRTB protocol.

# Test Parameters

### Banner Ad Unit

```javascript
var adUnits = [
  {
    code: 'test-banner-div',
    mediaTypes: {
      banner: {
        sizes: [[300, 250], [728, 90]]
      }
    },
    bids: [
      {
        bidder: 'mul',
        params: {
          placementId: 'test-placement-123'
        }
      }
    ]
  }
];
```

### Video Ad Unit

```javascript
var adUnits = [
  {
    code: 'test-video-div',
    mediaTypes: {
      video: {
        playerSize: [[640, 480]],
        context: 'instream',
        mimes: ['video/mp4'],
        protocols: [2, 3, 5, 6],
        minduration: 5,
        maxduration: 30,
        startdelay: 0,
        playbackmethod: [1, 2],
        api: [1, 2]
      }
    },
    bids: [
      {
        bidder: 'mul',
        params: {
          placementId: 'test-placement-video'
        }
      }
    ]
  }
];
```

### Multi-Format Ad Unit

```javascript
var adUnits = [
  {
    code: 'test-multiformat-div',
    mediaTypes: {
      banner: {
        sizes: [[300, 250], [728, 90]]
      },
      video: {
        playerSize: [[640, 480]],
        context: 'instream',
        mimes: ['video/mp4'],
        protocols: [2, 3, 5, 6]
      }
    },
    bids: [
      {
        bidder: 'mul',
        params: {
          placementId: 'test-placement-multiformat'
        }
      }
    ]
  }
];
```

# Video Support

The MonetiseUp adapter supports Video ads via both direct VAST XML (`vastXml`) and VAST URLs (`vastUrl`).
- **Instream**: Video ads support standard `instream` player contexts.
- **Outstream**: For `outstream` context, a publisher-defined renderer (e.g. `renderer: { url, render }`) or `useCacheKey` must be supplied on the ad unit.

# User Sync and Device Storage Disclosure

When user syncing is enabled in Prebid (`userSync.filterSettings`), the adapter triggers user synchronization via the endpoint `https://bid5up.monetiseup.com/api/usersync`.

- **Sync Types**: Supports `iframe` and `image` (pixel) syncs.
- **Privacy Controls**: All consent signals (`gdpr`, `gdpr_consent`, `us_privacy`, `gpp`, `gpp_sid`) are attached to user sync requests.
- **Device Storage**: The sync endpoint sets a first-party/third-party synchronization identifier cookie (`mu_uid`) on the MonetiseUp bidding domain for cookie matching across integrated DSPs. The adapter does not access or read `localStorage` or `document.cookie` directly from the publisher page.
