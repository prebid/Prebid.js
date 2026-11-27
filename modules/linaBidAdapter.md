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
placement identifier. The placement identifier can be supplied as
`params.placementId`, or as standard OpenRTB `ortb2Imp.tagid` when no bidder
override is configured.

`publisherId` is the public integration key (`app_key`), not the account UUID or
login password. `placementId` is the UUID of the registered placement, independent
of its media types. A valid LINA placement identifier is always required; when
`params.placementId` and `ortb2Imp.tagid` are both present, the bidder parameter
takes precedence. The integration key is sent in `request.ext.lina.publisherId`.

LINA supports Multi-format Ad Units and returns one winning format per bid
request. The publisher currency is fixed by LINA SSP registration. Returned CPM
is publisher Net CPM. `netRevenue: true` is adapter response configuration and
does not appear in the OpenRTB wire response.

The adapter uses Prebid.js `ortbConverter` for standard request and response
mapping. Banner, Video, and Native sizing, fields, and extensions are passed
through the converter's standard processors without LINA-specific reshaping.
The wire request is a direct OpenRTB BidRequest: the top-level
`id` is the Prebid bidder request ID, `tmax` is the Prebid request budget, and
each Prebid bid becomes one `imp`. The Prebid bid ID is `imp.id`, the LINA
placement is `imp.tagid`, and standard `source`, `site`, `device`, `user`,
`regs`, and media fields remain in their OpenRTB locations. Transaction IDs
remain in the standard `source.tid` and `imp.ext.tid` fields when Prebid Core
provides them; the adapter does not backfill unshared IDs.

LINA SSP determines inventory authorization, pricing, supply-chain, deal,
creative, and privacy policy. The adapter sends the Publisher floor as standard
`imp.bidfloor` and `imp.bidfloorcur`, and a Publisher floor for each present
media type and each `imp.banner.format` entry in the standard
`imp.<mediatype>.ext.bidfloor` / `ext.bidfloorcur` fields when it differs from
the impression floor. It calls `bid.getFloor()` with wildcard media type and
size for the impression floor, and with each present media type (and each
banner format size) for those granular floors. The only request currency is
a single valid explicit
`ortb2.cur`; that currency is also used for floor lookup. Without it, floor
lookup falls back to a valid existing `imp.bidfloorcur`, then USD, without
promoting either fallback to request `cur`. `ortb2.ext.prebid.adServerCurrency`
is independent: the converter may preserve it in the extension, but the
adapter never uses it for floor lookup and never synthesizes request `cur` or
an impression-floor currency from it; it is not a clearing-currency source.
It accepts a finite, nonnegative floor
result, including an explicit zero. A missing floor-result currency follows
the effective lookup currency. The adapter performs no FX conversion. Invalid
or multiple request currencies, failed `getFloor()` calls, malformed results,
invalid floor currencies, and currency mismatches skip the affected request
or bid. A null or empty result is a valid "no matching rule" result: it
preserves a static `ortb2Imp.bidfloor` / `bidfloorcur`, while a static
granular floor supplied in `ortb2Imp.<mediatype>.ext` or
`ortb2Imp.banner.format[].ext` is replaced, so a stale per-format floor is
never sent without a matching lookup. Request and clearing currency
remain subject to LINA SSP's registered-publisher currency policy.

The SSP uses `max(placement floor, client floor)` as the publisher Net CPM
floor and converts that value to DSP Gross CPM using the publisher fee. Floor
currency, response currency, and the registered publisher currency must align.
SSP floor policy is authoritative: the adapter never chooses the final
billing floor or price. A missing floor remains distinct from a configured
zero.

The adapter does not access cookies or local storage, does not register user
syncs, and sends the auction request without browser credentials.

## SSP endpoint

Requests use the fixed HTTPS QA endpoint
`https://ssp-api.qa.web3lge.com/v1/prebid/bids`.

Requests are direct OpenRTB JSON bodies sent with `Content-Type: text/plain`.
The adapter omits `X-App-Key` and other custom headers to keep cross-origin
POSTs CORS-simple and avoid a preflight round trip within the auction budget.
The public integration key is exposed in `ext.lina.publisherId`. The old
`auctionId`, `publisherId`, `timeoutMs`, `ortb2`, `bids[]`, and `privacy`
envelope is not supported. CORS must allow the publisher origin and
`Content-Type`.

Responses use the standard OpenRTB shape:

```json
{
  "id": "bidder-request-id",
  "cur": "USD",
  "seatbid": [{
    "bid": [{
      "id": "ssp-bid-id",
      "impid": "prebid-bid-id",
      "price": 2.5,
      "crid": "creative-id",
      "adm": "<div>creative</div>",
      "w": 300,
      "h": 250,
      "mtype": 1,
      "exp": 300,
      "adomain": ["advertiser.example"]
    }]
  }]
}
```

The response `id` must echo the request `id`, and an explicitly supplied
request currency must match the response currency. The converter maps `exp` to
Prebid `ttl`, `cur` to `currency`, and `mtype` to Banner (`1`), Video (`2`), or
Native (`4`). Standard Prebid response processing handles creative fields,
native markup, dimensions, and no-bid/malformed shapes. SSP creative and
advertiser-domain validation remains authoritative. Banner and Video may use
`nurl`; Native width and height are optional. HTTP 204 and an empty `seatbid`
are No Bid.

## Privacy

Prebid Core and the configured consent modules place privacy signals in
standard OpenRTB locations. The converter preserves that `ortb2` data unchanged;
the adapter adds no separate privacy wrapper and does not add user sync,
cookie, local-storage, or external JavaScript behavior.

## Timeout

Prebid Core's `bidderRequest.timeout` is forwarded in standard OpenRTB `tmax`;
there is no separate `timeoutMs`. LINA uses this budget first. If it is absent
or null, the SSP uses `BID_DEFAULT_TMAX_MS`, or 1000ms when that environment
variable is unset. The total budget is capped at 5000ms, then 200ms is reserved
once for network and SSP processing. The remainder is sent to ADEx as `tmax`.
Explicit budgets of 200ms or less are rejected.

# Test Parameters

Use the following IDs with the test Ad Unit examples below. All four
placements belong to the same publisher and site.

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
