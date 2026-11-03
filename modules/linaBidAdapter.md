# Overview

```text
Module Name: LINA Bidder Adapter
Module Type: Bidder Adapter
Maintainer: linadev@lge.com
```

# Description

Connects Prebid.js to LINA SSP for client-side Banner, Video, and Native bids.

The bidder code is `lina`. An active LINA publisher account and authorized
placements are required. LINA SSP provides the required `publisherId` and
`placementId` values.

`publisherId` is the public integration key (`app_key`), not the account UUID or
login password. `placementId` is the UUID of the registered placement, independent
of its media types.

LINA supports Multi-format Ad Units and returns one winning format per bid
request. Currency, floors, and fees are managed by LINA SSP. Returned CPM is
publisher Net CPM with `netRevenue: true`.

The adapter passes OpenRTB request fields through without duplicating server
field-removal policies. It only maps LINA identifiers and selected media formats.
LINA SSP determines which fields to use and applies inventory, pricing,
supply-chain, and privacy policies. Explicit SSP settings take precedence.
The SSP placement floor takes priority, including an explicit zero. If it is
unset, the SSP uses `ortb2Imp.bidfloor`; if both are unset or null, no floor
restriction applies. There are no currency-specific default floors. Floors are
publisher Net CPM and are converted to DSP Gross CPM using the publisher fee.
A positive request floor's `bidfloorcur` must match the publisher currency;
when omitted, it is USD under OpenRTB. Currency conversion is not supported.
The adapter passes these OpenRTB fields through without calling `getFloor()`.

The adapter does not access cookies or local storage and does not register
user syncs.

## SSP endpoint

Requests use the fixed HTTPS QA endpoint
`https://ssp-api.qa.web3lge.com/v1/prebid/bids`.
Endpoint overrides are not supported.

The SSP must allow the page origin and the `Content-Type` and `X-App-Key`
headers through CORS.

Transaction ID sharing is optional. The adapter preserves shared
`ortb2.source.tid` and `ortb2Imp.ext.tid` values and leaves missing TIDs unset.
LINA SSP accepts requests without TIDs and generates its own request ID for
request tracking. Publishers do not need to enable TID sharing to use LINA.

# Test Parameters

The IDs below are defined by the mandatory LINA SSP official inventory Seed.
All four placements belong to the same publisher and site. Before submission,
apply the Seed to the deployed endpoint, verify creative supply for every
format. Seed definitions alone do not guarantee deployed Bid responses.

| Parameter | Test Value | Applies To |
| --- | --- | --- |
| `publisherId` | `appk_b4771a5bc0b1a362c3176fced60d9300` | All four test placements |

| Test Ad Unit | `placementId` | Enabled Formats and Sizes |
| --- | --- | --- |
| Banner | `34c7b802-2005-4c1e-9a6f-7047b4d9c170` | Banner 300x250 |
| Video | `ad1e1f25-4c73-430f-80f3-439ddc5aa568` | Video 1280x720 |
| Native | `5e1eb3e8-b069-4778-abc3-c04a337f7aa7` | Native |
| Multi-format | `31c4c968-7dc1-42d9-8fab-07c71be36be8` | Banner 300x250, Video 1280x720, Native |

## Test Ad Units

The examples below use the test identifiers from the tables above.

```javascript
var adUnits = [
  // Banner
  {
    code: 'lina-test-banner',
    mediaTypes: {
      banner: {
        sizes: [[300, 250]]
      }
    },
    bids: [{
      bidder: 'lina',
      params: {
        publisherId: 'appk_b4771a5bc0b1a362c3176fced60d9300',
        placementId: '34c7b802-2005-4c1e-9a6f-7047b4d9c170'
      }
    }]
  },
  // Video
  {
    code: 'lina-test-video',
    mediaTypes: {
      video: {
        context: 'instream',
        playerSize: [[1280, 720]],
        mimes: ['video/mp4'],
        protocols: [2, 3],
        minduration: 5,
        maxduration: 30
      }
    },
    bids: [{
      bidder: 'lina',
      params: {
        publisherId: 'appk_b4771a5bc0b1a362c3176fced60d9300',
        placementId: 'ad1e1f25-4c73-430f-80f3-439ddc5aa568'
      }
    }]
  },
  // Native
  {
    code: 'lina-test-native',
    mediaTypes: {
      native: {
        ortb: {
          ver: '1.2',
          assets: [
            { id: 1, required: 1, title: { len: 80 } },
            { id: 2, required: 1, img: { type: 3, wmin: 300, hmin: 169 } },
            { id: 3, required: 1, data: { type: 1 } }
          ]
        }
      }
    },
    bids: [{
      bidder: 'lina',
      params: {
        publisherId: 'appk_b4771a5bc0b1a362c3176fced60d9300',
        placementId: '5e1eb3e8-b069-4778-abc3-c04a337f7aa7'
      }
    }]
  },
  // Multi-format: Banner, Video, and Native
  {
    code: 'lina-test-multi-format',
    mediaTypes: {
      banner: {
        sizes: [[300, 250]]
      },
      video: {
        context: 'instream',
        playerSize: [[1280, 720]],
        mimes: ['video/mp4'],
        protocols: [2, 3],
        minduration: 5,
        maxduration: 30
      },
      native: {
        ortb: {
          ver: '1.2',
          assets: [
            { id: 1, required: 1, title: { len: 80 } },
            { id: 2, required: 1, img: { type: 3, wmin: 300, hmin: 169 } },
            { id: 3, required: 1, data: { type: 1 } }
          ]
        }
      }
    },
    bids: [{
      bidder: 'lina',
      params: {
        publisherId: 'appk_b4771a5bc0b1a362c3176fced60d9300',
        placementId: '31c4c968-7dc1-42d9-8fab-07c71be36be8'
      }
    }]
  }
];
```

The Banner and Video sizes must match the corresponding placement settings.
The adapter uses the first valid Video player size and returns inline VAST XML
as `vastXml`. Outstream tests require a publisher-supplied renderer.

Native responses use OpenRTB Native markup. Configure a compatible Native
template and rendering integration. Multi-format tests require rendering
support for every requested format.

## Video Playback

Explicit playback fields from `mediaTypes.video` take precedence over the
corresponding `ortb2Imp.video` fields; omitted fields retain their OpenRTB values.
MIME types are required as a nonempty array of nonblank strings. Protocols and
durations are optional and remain omitted when not supplied; the adapter does
not infer player capabilities or a duration range. Supplied protocols must be
positive integers, and durations must be nonnegative integers with
`minduration <= maxduration` when both are supplied. `minduration: 0` is valid.

The SSP preserves publisher-supplied `site.page`, `site.domain`, and Banner or
Video `pos`. Missing values use registered SSP settings when available, otherwise
they remain omitted. An explicit `pos: 0` is preserved, not replaced by the SSP.

For a test player that consumes raw VAST XML, run this in the Prebid command
queue before requesting bids:

```javascript
pbjs.setConfig({
  cache: { allowVastXmlOnly: true }
});
```

This permits inline VAST bids; the test player must still play the returned
`vastXml`. For a player or ad server that needs a VAST URL, configure
[`cache.url`](https://docs.prebid.org/dev-docs/publisher-api-reference/setConfig.html#client-side-caching-of-vast-xml)
with your Prebid Cache endpoint instead.

## Native Rendering

Include [`nativeRendering`](https://docs.prebid.org/dev-docs/modules/nativeRendering.html)
in the Prebid.js build for direct Native rendering. Before adding the Ad Units
above, attach this template; its asset IDs match the Native test requests:

```javascript
adUnits.forEach(function (adUnit) {
  if (adUnit.mediaTypes.native) {
    adUnit.mediaTypes.native.adTemplate =
      '<a class="pb-click" href="##hb_native_linkurl##">' +
      '<img src="##hb_native_asset_id_2##" alt="">' +
      '<span>##hb_native_asset_id_1##</span>' +
      '<span>##hb_native_asset_id_3##</span></a>';
  }
});
```

After the auction, pass the selected Native bid's `adId` and the target
iframe's document to [`pbjs.renderAd()`](https://docs.prebid.org/dev-docs/publisher-api-reference/renderAd.html).
