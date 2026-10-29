# Overview

```
Module Name: VisionForgeX Bid Adapter
Module Type: Bidder Adapter
Maintainer: support@visionforgex.com
```

# Description

Connects to the VisionForgeX Exchange (<https://visionforgex.com>), an OpenRTB 2.6 exchange for banner and video.
One request per auction is sent to `https://ex.visionforgex.com/openrtb2/prebid` as `text/plain`, so the browser makes no preflight call.

- Consent (TCF, US Privacy, GPP, COPPA), the supply chain, first party data, user IDs and floors are read from the bid request (`ortb2`, `ortb2Imp`, the floors module); nothing is asked of the publisher as a bidder parameter.
- The Exchange adds its own node to the supply chain. Its seller IDs are listed at <https://visionforgex.com/sellers.json>.
- Prices are net, in USD.
- The adapter sets no cookies, uses no storage and makes no user syncs.
- Banner and video. Multiformat ad units are bid on in every format they offer.

# Bid Params

| Name          | Scope    | Description                                   | Example           | Type     |
|---------------|----------|-----------------------------------------------|-------------------|----------|
| `placementId` | required | The placement ID from VisionForgeX            | `'vfx7q2m9k4d1x'` | `string` |

# Test Parameters

The placement IDs `vfx-test-banner` and `vfx-test-video` always answer with a labelled VisionForgeX test ad at $0.50, on any domain.

```javascript
var adUnits = [
  {
    code: 'test-div-banner',
    mediaTypes: {
      banner: {
        sizes: [[300, 250], [728, 90]]
      }
    },
    bids: [{
      bidder: 'visionforgex',
      params: {
        placementId: 'vfx-test-banner'
      }
    }]
  },
  {
    code: 'test-div-video',
    mediaTypes: {
      video: {
        context: 'instream',
        playerSize: [640, 360],
        mimes: ['video/mp4'],
        protocols: [2, 3, 5, 6],
        maxduration: 30
      }
    },
    bids: [{
      bidder: 'visionforgex',
      params: {
        placementId: 'vfx-test-video'
      }
    }]
  }
];
```

# GDPR / TCF

VisionForgeX is not yet registered on the IAB Europe Global Vendor List, so the adapter does not declare a `gvlid`. Where GDPR applies, Prebid.js withholds requests to this bidder unless the publisher's consent setup allows it. A `gvlid` will be added once registration is complete.
