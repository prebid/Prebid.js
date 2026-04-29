# Overview

```
Module Name: Billowlink OpenRTB 2.5 Bidder Adapter
Module Type: Bidder Adapter
Maintainer: zepeng.yin@billowlink.com
```

**Bidder code:** `billow_rtb25`

# Description

The Billowlink adapter connects Prebid.js to Billowlink’s OpenRTB 2.5 HTTP endpoint. It uses Prebid’s [`ortbConverter`](https://github.com/prebid/Prebid.js/tree/master/libraries/ortbConverter) to translate ad units into a standard OpenRTB `BidRequest` and to map the `BidResponse` back into Prebid bid objects.

**Currency**

- Billowlink returns prices in **USD**. The adapter always sets `bid.currency` to `USD` and substitutes `${AUCTION_CURRENCY}` with `USD`, regardless of `BidResponse.cur`.

**Placement mapping**

- Your server-side placement configuration is keyed off OpenRTB `imp.tagid`.
- The adapter sets `imp.tagid` from `bid.params.placementId` (stringified). This value must match the placement identifier configured on the Billowlink side.

**Supported media types**

- Banner (`adm` → `bid.ad`)
- Video (`adm` → `bid.vastXml`; optional `nurl` → `bid.vastUrl`)
- Native (`adm` as OpenRTB Native JSON → `bid.native.ortb`)
  OpenRTB 2.5 responses do not include `mtype`; the adapter infers `mediaType` from the **request** impression (`imp.native` / `imp.video` / otherwise banner).

**OpenRTB macros in markup**

If `adm` / VAST still contains `${AUCTION_*}` placeholders after your server responds, the adapter replaces them on `bid.ad`, `bid.vastXml`, and `bid.vastUrl` after `fromORTB`:

| Macro | Value used |
|-------|------------|
| `${AUCTION_ID}` | OpenRTB `BidRequest.id` on the outgoing request (`request.data.id`). |
| `${AUCTION_BID_ID}` | OpenRTB bid `id` → Prebid `seatBidId`. |
| `${AUCTION_IMP_ID}` | OpenRTB `imp.id` from the request → Prebid `requestId`. |
| `${AUCTION_SEAT_ID}` | `seatbid.seat` for the seat entry that contains this bid. |
| `${AUCTION_AD_ID}` | OpenRTB `seatbid[].bid[].adid` returned by backend (matched by bid id). |
| `${AUCTION_PRICE}` | Clearing price: `originalCpm` if set, otherwise `cpm`. |
| `${AUCTION_CURRENCY}` | Always `USD` (Billowlink prices are USD; `BidResponse.cur` is not used). |
| `${AUCTION_MBR}` | Empty string (not derived here). |
| `${AUCTION_LOSS}` | `0` on the **winning** render path. |

Prefer server-side substitution when possible.

**Outstream video**

The adapter does not attach an outstream renderer. For `mediaTypes.video` with `context: 'outstream'`, publishers must supply a renderer (for example `mediaTypes.video.renderer` on the ad unit) or use their standard video / PUC integration, per Prebid documentation.

**Privacy and first-party data**

The adapter does not implement custom GDPR/CCPA/COPPA logic. It merges `bidderRequest.ortb2` into the outgoing request (site, user, device, regs, etc.). Configure consent modules and `setConfig` as for any ORTB2-based bidder so that the correct signals are present in `ortb2`.

**CORS**

Browser-side calls to the bid endpoint require CORS on the Billowlink server if the origin differs from the API host (e.g. `Access-Control-Allow-Origin`, credentials if needed).

# Bid Parameters

| Name           | Scope    | Type   | Description |
|----------------|----------|--------|-------------|
| `placementId`  | Required | String or Number | Placement ID on the Billowlink side; sent as OpenRTB `imp.tagid`. |
| `endpoint`     | Optional | String | Overrides the default bid URL (e.g. staging or local `https://adx-sg.billowlink.com/api/rtb/adsWeb`). If omitted, the production default below is used. |

**Default endpoint:** `https://adx-sg.billowlink.com/api/rtb/adsWeb`

# Example: Banner

```javascript
var adUnits = [{
  code: 'div-gpt-ad-example',
  mediaTypes: {
    banner: { sizes: [[300, 250], [728, 90]] }
  },
  bids: [{
    bidder: 'billow_rtb25',
    params: {
      placementId: 'YOUR_PLACEMENT_ID'
      // endpoint: 'https://your-staging-host/api/rtb/adsWeb'  // optional
    }
  }]
}];
```

# Example: Video (instream or outstream)

```javascript
var videoAdUnits = [{
  code: 'div-video-example',
  mediaTypes: {
    video: {
      context: 'instream', // or 'outstream' (renderer required for outstream)
      playerSize: [640, 480],
      mimes: ['video/mp4'],
      minduration: 1,
      maxduration: 120,
      protocols: [2, 3, 5, 6]
    }
  },
  bids: [{
    bidder: 'billow_rtb25',
    params: {
      placementId: 'YOUR_VIDEO_PLACEMENT_ID'
    }
  }]
}];
```

# Example: Native

```javascript
var nativeAdUnits = [{
  code: 'div-native-example',
  mediaTypes: {
    native: {
      ortb: {
        ver: '1.2',
        assets: [
          { id: 1, required: 1, title: { len: 80 } },
          { id: 2, required: 1, img: { type: 3, wmin: 100, hmin: 100 } }
        ]
      }
    }
  },
  bids: [{
    bidder: 'billow_rtb25',
    params: {
      placementId: 'YOUR_NATIVE_PLACEMENT_ID'
    }
  }]
}];
```

Ensure the bid request includes a valid native ORTB payload (e.g. `nativeOrtbRequest` / `mediaTypes.native.ortb`) so that `imp.native` is populated for the converter.

# User sync

`getUserSyncs` currently returns no sync URLs. If cookie or iframe sync is added later, it will be documented here and implemented per Prebid’s user-sync rules.

# Build

Include the module in your Prebid bundle, for example:

```bash
gulp build --modules=billow_rtb25BidAdapter,...
```

# Notes for maintainers

- Responses with no bids should use HTTP 204 or an empty `seatbid` array; the adapter returns `[]` in those cases.
- Request `Content-Type` uses Prebid's default for POST (`text/plain` with JSON body), which avoids triggering CORS preflight.
- Default `ttl` for bids is 30 seconds when the response omits `exp`; `netRevenue` is set to `true` in the converter context.
