# Overview

```
Module Name: Adelerate Bid Adapter
Module Type: Bidder Adapter
Maintainer: support@adelerate.com
```

# Description

Module that connects to Adelerate's demand sources. Supports banner, video (instream/outstream), and native media types.

# Bid Parameters

These parameters apply to all supported media types (banner, video, native).

| Name            | Scope    | Type   | Description                                                                                               | Example     |
|-----------------|----------|--------|-----------------------------------------------------------------------------------------------------------|-------------|
| `placementId`   | required | String | The placement ID provided by your Adelerate representative.                                               | `"abc123"`  |
| `publisherId`   | required | String | The publisher ID provided by your Adelerate representative.                                               | `"pub-456"` |
| `floor`         | optional | Number | Minimum CPM price in USD. Use of the Prebid Floors module (`pbjs.setConfig({floors: ...})`) is preferred. | `0.50`      |
| `floorCurrency` | optional | String | Currency for the floor param. Defaults to `"USD"`.                                                        | `"EUR"`     |

Video parameters (mimes, protocols, playerSize, etc.) should be defined in `mediaTypes.video` on the ad unit, not in bidder params.

Native assets (title, image, data, etc.) should be defined in `mediaTypes.native` on the ad unit using the ORTB native format.

# Test Parameters

```javascript
var adUnits = [
  // Banner ad unit
  {
    code: 'banner-div',
    mediaTypes: {
      banner: {
        sizes: [[300, 250], [728, 90]]
      }
    },
    bids: [{
      bidder: 'adelerate',
      params: {
        placementId: 'test-placement-1',
        publisherId: 'test-publisher-1'
      }
    }]
  },
  // Video ad unit (instream)
  {
    code: 'video-div',
    mediaTypes: {
      video: {
        context: 'instream',
        playerSize: [640, 480],
        mimes: ['video/mp4'],
        protocols: [1, 2, 3, 4, 5, 6],
        minduration: 5,
        maxduration: 30
      }
    },
    bids: [{
      bidder: 'adelerate',
      params: {
        placementId: 'test-placement-2',
        publisherId: 'test-publisher-1'
      }
    }]
  },
  // Native ad unit
  {
    code: 'native-div',
    mediaTypes: {
      native: {
        ortb: {
          assets: [
            { id: 1, required: 1, title: { len: 90 } },
            { id: 2, required: 1, img: { type: 3, wmin: 300, hmin: 250 } },
            { id: 3, required: 0, data: { type: 2, len: 200 } }
          ]
        }
      }
    },
    bids: [{
      bidder: 'adelerate',
      params: {
        placementId: 'test-placement-3',
        publisherId: 'test-publisher-1'
      }
    }]
  },
  // Multiformat ad unit (banner + video + native)
  {
    code: 'multi-div',
    mediaTypes: {
      banner: {
        sizes: [[300, 250]]
      },
      video: {
        context: 'outstream',
        playerSize: [640, 480],
        mimes: ['video/mp4'],
        protocols: [1, 2]
      },
      native: {
        ortb: {
          assets: [
            { id: 1, required: 1, title: { len: 90 } },
            { id: 2, required: 1, img: { type: 3, wmin: 300, hmin: 250 } }
          ]
        }
      }
    },
    bids: [{
      bidder: 'adelerate',
      params: {
        placementId: 'test-placement-4',
        publisherId: 'test-publisher-1'
      }
    }]
  }
];
```

# Configuration

Enable user syncing for improved match rates. By default, Prebid.js disables iframe-based syncing.

```javascript
pbjs.setConfig({
  userSync: {
    iframeEnabled: true
  }
});
```

# GDPR / TCF

Adelerate is not currently registered on the IAB Europe Global Vendor List (GVL), so the adapter does not declare a `gvlid`. As a result, when GDPR applies, Prebid.js core will withhold bid requests and user syncs to this bidder unless the publisher's consent management setup explicitly permits it. The adapter is intended for non-TCF traffic until registration is complete; a `gvlid` will be added in a follow-up PR once the IAB Europe registration is finalized.
