# Overview

```
Module Name:  TRUSTX Bid Adapter
Module Type:  Bidder Adapter
Maintainer:   prebid@trustx.org
```

# Description

Module that connects to TRUSTX's premium demand sources.
TRUSTX bid adapter supports Banner and Video ad formats with advanced targeting capabilities.

# Required Parameters

## Banner

- `uid` or `secid` (required) - Placement ID / Tag ID
- `mediaTypes.banner.sizes` (required) - Array of banner sizes

## Video

- `uid` or `secid` (required) - Placement ID / Tag ID
- `mediaTypes.video.context` (required) - Must be 'instream' or 'outstream'
- `mediaTypes.video.playerSize` (required) - Array format [[w, h]]
- `mediaTypes.video.mimes` (required) - Array of MIME types
- `mediaTypes.video.protocols` (required) - Array of protocol numbers

# Test Parameters

## Banner

```
var adUnits = [
    {
        code: 'trustx-banner-container',
        mediaTypes: {
            banner: {
                sizes: [[300, 250], [300, 600], [728, 90]]
            }
        },
        bids: [{
            bidder: 'trustx',
            params: {
                uid: 123456,
                bidFloor: 0.5
            }
        }]
    }
];
```

## Video

We support the following OpenRTB params that can be specified in `mediaTypes.video` or in `bids[].params.video`:
- 'mimes'
- 'minduration'
- 'maxduration'
- 'plcmt'
- 'protocols'
- 'startdelay'
- 'skip'
- 'skipafter'
- 'minbitrate'
- 'maxbitrate'
- 'delivery'
- 'playbackmethod'
- 'api'
- 'linearity'

## Instream Video adUnit using mediaTypes.video

*Note:* By default, the adapter will read the mandatory parameters from mediaTypes.video.
*Note:* The TRUSTX ad server will respond with a VAST XML to load into your defined player.

```
var adUnits = [
    {
        code: 'trustx-video-container',
        mediaTypes: {
            video: {
                context: 'instream',
                playerSize: [[640, 480]],
                mimes: ['video/mp4', 'video/webm'],
                protocols: [2, 3, 5, 6],
                api: [2, 7],
                position: 1,
                delivery: [2],
                minduration: 5,
                maxduration: 60,
                plcmt: 1,
                playbackmethod: [1, 3, 5],
            }
        },
        bids: [
            {
                bidder: 'trustx',
                params: {
                    uid: 123456,
                    bidFloor: 5.0
                }
            }
        ]
    }
]
```

## Outstream Video

TRUSTX also supports outstream video format that can be displayed in non-video placements.

```
var adUnits = [
    {
        code: 'trustx-outstream-container',
        mediaTypes: {
            video: {
                context: 'outstream',
                playerSize: [[640, 360]],
                mimes: ['video/mp4', 'video/webm'],
                protocols: [2, 3, 5, 6],
                api: [2, 7],
                placement: 3,
                minduration: 5,
                maxduration: 30,
            }
        },
        bids: [
            {
                bidder: 'trustx',
                params: {
                    uid: 123456,
                    bidFloor: 6.0
                }
            }
        ]
    }
]
```

# Test Mode

By passing `bid.params.test = true` you will be able to receive a test creative without needing to set up real placements.

## Banner

```
var adUnits = [
    {
        code: 'trustx-test-banner',
        mediaTypes: {
            banner: {
                sizes: [[300, 250], [300, 600], [728, 90]]
            }
        },
        bids: [{
            bidder: 'trustx',
            params: {
                test: true
            }
        }]
    }
];
```

## Video

```
var adUnits = [
    {
        code: 'trustx-test-video',
        mediaTypes: {
            video: {
                context: "instream",
                playerSize: [[640, 480]],
                mimes: ['video/mp4', 'video/webm'],
                protocols: [2, 3, 5, 6],
            }
        },
        bids: [
            {
                bidder: 'trustx',
                params: {
                    test: true
                }
            }
        ]
    }
]
```

# Optional Parameters

## Bid Floor

You can specify bid floor using any of these parameter names:
- `bidFloor` (camelCase)
- `bidfloor` (lowercase)
- `floorcpm` (alternative name)

The adapter also supports Prebid's Floor Module via `getFloor()` function. The highest value between params and Floor Module will be used.

```
params: {
    uid: 455069,
    bidFloor: 0.5,  // or bidfloor or floorcpm
    currency: 'USD' // optional, defaults to USD
}
```

## Backward Compatibility with Grid Adapter

The TRUSTX adapter is fully compatible with Grid adapter parameters for seamless migration:

- `uid` - Same as Grid adapter (required)
- `secid` - Alternative to uid (required if uid not provided)
- `bidFloor` / `bidfloor` / `floorcpm` - Bid floor (optional)

# First Party Data (FPD) Support

The adapter automatically includes First Party Data from `ortb2` configuration:

## Site FPD

```
pbjs.setConfig({
    ortb2: {
        site: {
            name: 'Example Site',
            domain: 'example.com',
            page: 'https://example.com/page',
            cat: ['IAB12-1'],
            content: {
                data: [{
                    name: 'reuters.com',
                    segment: [{id: '391'}, {id: '52'}]
                }]
            }
        }
    }
});
```

## User FPD

User IDs are passed through Prebid's User ID modules (e.g., SharedId) via `user.ext.eids`.

## Device FPD

Device data from `ortb2.device` is automatically included in requests.

# User Sync

The adapter supports server-side user sync. Sync URLs are extracted from server response (`ext.usersync`) and automatically registered with Prebid.js.

```
pbjs.setConfig({
    userSync: {
        syncEnabled: true,
        iframeEnabled: true,
        pixelEnabled: true
    }
});
```

# Additional Configuration Options

## GPP Support

TRUSTX fully supports Global Privacy Platform (GPP) standards. GPP data is automatically passed from `bidderRequest.gppConsent` or `ortb2.regs.gpp`.

## CCPA Support

CCPA (US Privacy) data is automatically passed from `bidderRequest.uspConsent` or `ortb2.regs.ext.us_privacy`.

## COPPA Support

COPPA compliance is automatically handled when `config.getConfig('coppa') === true`.

## DSA Support

Digital Services Act (DSA) data is automatically passed from `ortb2.regs.ext.dsa`.

## Supply Chain (schain)

Supply chain data is automatically passed from `ortb2.source.ext.schain` or `bidRequest.schain`.

## Source Transaction ID (tid)

Transaction ID is automatically passed from `ortb2.source.tid`.

# Response Format

The adapter returns bids in standard Prebid.js format with the following additional fields:

- `adserverTargeting.hb_ds` - Network name from server response (`ext.bidder.trustx.networkName`)
- `meta.demandSource` - Network name metadata (same as `networkName` from server)
- `netRevenue: false` - Revenue model