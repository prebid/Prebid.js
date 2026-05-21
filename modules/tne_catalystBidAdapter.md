# TNE Catalyst

## Overview

TNE Catalyst is a programmatic exchange that manages demand relationships server-side. Publishers configure a single bidder with their account ID and placement slot; TNE routes the request to its configured SSP partners and returns the winning bid. No SSP-specific IDs or configuration is required on the publisher side.

## Bid Parameters

| Param | Scope | Type | Description |
|-------|-------|------|-------------|
| `publisherId` | required | string | Publisher account ID assigned by TNE (e.g. `NXS003`) |
| `slot` | required | string | Placement identifier matching the slot configured in the TNE dashboard (e.g. `billboard`) |
| `bidfloor` | optional | number | Minimum acceptable CPM in USD |

## Supported Media Types

- Banner
- Native
- Video (VAST)

## Maintainer

**The Nexus Engine**
ops@thenexusengine.io

## Privacy & Compliance

| Feature | Supported |
|---------|-----------|
| TCF 2.0 (GDPR) | ✅ |
| US Privacy (CCPA) | ✅ |
| GPP | ✅ |
| COPPA | via `regs.coppa` |
| sChain | ✅ |
| User IDs / EIDs | ✅ |
| GVL ID | 1494 |

## Example Ad Units

### Banner

```javascript
var adUnits = [
  {
    code: 'div-billboard',
    mediaTypes: {
      banner: { sizes: [[970, 250], [728, 90]] }
    },
    bids: [{
      bidder: 'tne_catalyst',
      params: {
        publisherId: 'NXS003',
        slot: 'billboard'
      }
    }]
  },
  {
    code: 'div-rectangle',
    mediaTypes: {
      banner: { sizes: [[300, 250], [300, 600]] }
    },
    bids: [{
      bidder: 'tne_catalyst',
      params: {
        publisherId: 'NXS003',
        slot: 'rectangle'
      }
    }]
  }
];
```

### Native

```javascript
var adUnits = [{
  code: 'div-native-feed',
  mediaTypes: {
    native: {
      title:       { required: true,  len: 80 },
      body:        { required: true },
      image:       { required: true,  sizes: [{ min_width: 300, ratio_width: 2, ratio_height: 1 }] },
      sponsoredBy: { required: true },
      clickUrl:    { required: true },
    }
  },
  bids: [{
    bidder: 'tne_catalyst',
    params: {
      publisherId: 'NXS003',
      slot: 'native-feed'
    }
  }]
}];
```

### Video (Instream)

```javascript
var adUnits = [{
  code: 'div-video-player',
  mediaTypes: {
    video: {
      context:     'instream',
      playerSize:  [[640, 480]],
      mimes:       ['video/mp4'],
      protocols:   [2, 3, 5, 6],
      minduration: 5,
      maxduration: 30,
      startdelay:  0,
      placement:   1,
      linearity:   1,
    }
  },
  bids: [{
    bidder: 'tne_catalyst',
    params: {
      publisherId: 'NXS003',
      slot: 'preroll'
    }
  }]
}];
```

## User Sync

User synchronisation is handled automatically via the TNE Catalyst cookie sync endpoint. No per-SSP configuration is required. Include the sync endpoint in your `s2sConfig` or allow iframe/pixel syncs via `pbjs.setConfig({ userSync: { ... } })`.

## Contact

For account setup, new publisher onboarding, or technical questions:
**ops@thenexusengine.io**
