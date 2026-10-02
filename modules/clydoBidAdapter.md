# Overview

```
Module Name: Clydo Bid Adapter
Module Type: Bidder Adapter
Maintainer: cto@clydo.io
```

# Description

The Clydo adapter connects to the Clydo bidding endpoint to request bids using OpenRTB.

- Supported media types: banner, video, native
- Endpoint is derived from parameters: `https://{region}.clydo.io/{partnerId}`
- Passes GDPR, USP/CCPA, and GPP consent when available
- Propagates `schain` and `userIdAsEids`

# Bid Params

- `partnerId` (string, required): Partner identifier provided by Clydo
- `region` (string, required): One of `us`, `usw`, `eu`, `apac`

# Test Parameters (Banner)
```javascript
var adUnits = [{
  code: '/15185185/prebid_banner_example_1',
  mediaTypes: {
    banner: {
      sizes: [[300, 250], [300, 600]]
    }
  },
  bids: [{
    bidder: 'clydo',
    params: {
      partnerId: 'abcdefghij',
      region: 'us'
    }
  }]
}];
```

# Test Parameters (Video)
```javascript
var adUnits = [{
  code: '/15185185/prebid_video_example_1',
  mediaTypes: {
    video: {
      context: 'instream',
      playerSize: [[640, 480]],
      mimes: ['video/mp4']
    }
  },
  bids: [{
    bidder: 'clydo',
    params: {
      partnerId: 'abcdefghij',
      region: 'us'
    }
  }]
}];
```

# Test Parameters (Native)
```javascript
var adUnits = [{
  code: '/15185185/prebid_native_example_1',
  mediaTypes: {
    native: {
      title: { required: true },
      image: { required: true, sizes: [120, 120] },
      icon: { required: false, sizes: [50, 50] },
      body: { required: false },
      sponsoredBy: { required: false },
      clickUrl: { required: false },
      cta: { required: false }
    }
  },
  bids: [{
    bidder: 'clydo',
    params: {
      partnerId: 'abcdefghij',
      region: 'us'
    }
  }]
}];
```

# Notes

- Floors: If the ad unit implements `getFloor`, the adapter forwards the value as `imp.bidfloor` (USD).
- Consent: When present, the adapter forwards `gdprApplies`/`consentString`, `uspConsent`, and `gpp`/`gpp_sid`.
- Supply Chain and IDs: `schain` is set under `source.ext.schain`; user IDs are forwarded under `user.ext.eids`.

