# Overview

```
Module Name:  HyperBrainz Bid Adapter
Module Type:  Bidder Adapter
Maintainer:   it@hyperbrainz.com
```

# Description

Module that connects to the HyperBrainz Ad Exchange as a demand source.

Supports **Banner**, **Video (Instream & Outstream)**, and **Native** for web
inventory. The adapter is OpenRTB 2.5 compliant and supports ORTB2 first-party
data, EIDs, supply chain (schain), and all major privacy frameworks
(GDPR/TCF, CCPA/USP, GPP, COPPA).

# Bidder Parameters

| Param         | Type     | Required | Description                              |
|---------------|----------|----------|------------------------------------------|
| `placementId` | `string` | Yes      | Unique placement identifier              |
| `publisherId` | `string` | No       | Publisher identifier                     |
| `bidFloor`    | `number` | No       | Minimum bid floor (CPM, USD) override    |
| `ext`         | `object` | No       | Custom bidder extension fields           |

# Test Parameters

```javascript
var adUnits = [
  // Banner
  {
    code: 'test-banner',
    mediaTypes: {
      banner: { sizes: [[300, 250], [728, 90]] }
    },
    bids: [{
      bidder: 'hyperbrainz',
      params: {
        placementId: 'hb_test_banner',
        bidFloor: 0.30
      }
    }]
  },
  // Video (instream / outstream)
  {
    code: 'test-video',
    mediaTypes: {
      video: {
        context: 'instream',
        playerSize: [640, 360],
        mimes: ['video/mp4', 'video/webm'],
        protocols: [2, 3, 5, 6]
      }
    },
    bids: [{
      bidder: 'hyperbrainz',
      params: { placementId: 'hb_test_video' }
    }]
  },
  // Native (OpenRTB Native 1.2)
  {
    code: 'test-native',
    mediaTypes: {
      native: {
        title: { required: true, len: 80 },
        body: { required: false },
        sponsoredBy: { required: false },
        image: { required: true, sizes: [1200, 627] }
      }
    },
    bids: [{
      bidder: 'hyperbrainz',
      params: { placementId: 'hb_test_native' }
    }]
  }
];
```

# Outstream Video

For outstream video, the publisher must supply a renderer on the ad unit
(`mediaTypes.video.renderer`). Without a renderer, Prebid will discard the
outstream bid. Instream video does not require a renderer.

# User Sync

Iframe sync is recommended:

```javascript
pbjs.setConfig({
  userSync: {
    iframeEnabled: true,
    filterSettings: {
      iframe: { bidders: ['hyperbrainz'], filter: 'include' }
    }
  }
});
```

# Privacy

GDPR/TCF, CCPA/USP, GPP and COPPA signals are forwarded automatically when the
corresponding Prebid consent modules are configured.
