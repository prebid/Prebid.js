# Overview

```text
Module Name: Publink.io Bid Adapter
Module Type: Bidder Adapter
Maintainer: hello@publink.io
```

# Description

Publink is an independent ad-server company and platform. It is not affiliated
with Epsilon or Epsilon's Publisher Link product.

Connects to the Publink OpenRTB endpoint for banner, instream video and audio.
The adapter uses Prebid's ORTB converter and sends one request per placement.
Native and adapter-provided outstream rendering are not supported.

# Bid Parameters

| Name | Scope | Description | Type |
| --- | --- | --- | --- |
| `placementId` | optional* | Overrides standard `ortb2Imp.tagid` with the Publink placement ID. | `string` |
| `bidFloor` | optional | Nonnegative fallback CPM; standard impression/floors values take precedence. | `number` |
| `currency` | optional | Fallback floor currency; only `USD` is supported. | `string` |

*Provide a nonblank `placementId` or `ortb2Imp.tagid`. Prebid Server uses the
same params, with `imp.tagid` as the standard fallback. Bids are priced in USD.

# Test Parameters

These dedicated review placements return Publink test creatives. They do not
call third-party demand. The video and audio files are six seconds long.
Configure VAST caching for the player; the following enables local caching in
a browser demo:

```javascript
pbjs.setConfig({ cache: { useLocal: true } });

var adUnits = [
  {
    code: 'publink-banner',
    mediaTypes: { banner: { sizes: [[300, 250]] } },
    bids: [{ bidder: 'publinkio', params: { placementId: 'publink-prebid-banner' } }]
  },
  {
    code: 'publink-video',
    mediaTypes: {
      video: {
        context: 'instream',
        playerSize: [640, 360],
        mimes: ['video/mp4'],
        protocols: [2, 3, 5, 6, 7, 8],
        playbackmethod: [2]
      }
    },
    bids: [{ bidder: 'publinkio', params: { placementId: 'publink-prebid-video' } }]
  },
  {
    code: 'publink-audio',
    mediaTypes: {
      audio: {
        context: 'instream',
        mimes: ['audio/mpeg'],
        protocols: [2, 3, 5, 6, 7, 8]
      }
    },
    bids: [{ bidder: 'publinkio', params: { placementId: 'publink-prebid-audio' } }]
  }
];
```

# Notes

- Publisher first-party data, EIDs, supply chain and standard transaction IDs
  are forwarded via Prebid conversion. Existing standard values are retained.
- Standard floors take priority over the optional USD fallback floor.
- US privacy, GPP and COPPA fields are forwarded. There is no GVL ID or
  advertised TCF-EU support; publishers must configure traffic accordingly.
- The gateway's win-notice URL is not used as a VAST document URL. Inline VAST
  contains the rendering trackers.
- Video/audio win notices are sent once through a low-priority keepalive GET
  when Prebid reports the winning bid; banner notices use core rendering.
- No storage, cookies, user syncs or external scripts
  are registered by the adapter.

When a custom player selects a winning video/audio bid, report the win through
Prebid, for example `pbjs.markWinningBidAsUsed({ adId: bid.adId, events: true })`.
This triggers the win-notice lifecycle separately from VAST render events.

# Optional campaign priority (client-to-server)

On a Prebid.js build containing the priority support from #15816 and this
adapter update, a publisher can explicitly trust Publink's campaign priority:

```javascript
pbjs.bidderSettings = pbjs.bidderSettings || {};
pbjs.bidderSettings.publinkio = Object.assign({}, pbjs.bidderSettings.publinkio, {
  allowPriorityBids: true
});
```

This is a publisher choice for this bidder; setting it under `standard` does
not grant trust. The adapter signals that choice to Publink using
`ext.prebid.as: { ap: true, apb: ['publinkio'] }`.

With the corresponding gateway update, a winning direct campaign with a
configured positive integer priority supplies `dealid` and
`ext.prebid.deal: { type: 0, priority: <campaign priority> }`. An existing deal ID
is retained; otherwise an opaque stable campaign identifier is used. Type 0
means unknown: campaign contract types are not inferred. The standard ORTB
converter reads this into `meta.deal`; Prebid core enforces publisher trust and
uses lower numbers first, with a default priority of 12 for ordinary bids.

The bid's CPM, currency, floors, price buckets and win/billing notice prices
remain the transaction values. This extension does not add a ranking CPM,
zero-CPM house bids or floor bypass. Without the opt-in or a configured campaign
priority, Publink sends an ordinary bid.

The existing Prebid Server integration continues to support ordinary bids.
Priority support through S2S additionally requires the PBS host to preserve
`ext.prebid.as` on requests and `ext.prebid.deal` on responses. The current PBS
submission does not implement that core forwarding, so enabling
`s2sConfig.allowPriorityBids` alone does not enable Publink campaign priorities.
