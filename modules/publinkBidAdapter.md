# Overview

```text
Module Name: Publink Bid Adapter
Module Type: Bidder Adapter
Maintainer: hello@publink.io
```

# Description

Connects to the Publink OpenRTB endpoint for banner, instream video and audio.
The adapter uses Prebid's ORTB converter and sends one request per placement.
Native and adapter-provided outstream rendering are not supported.

# Bid Parameters

| Name | Scope | Description | Type |
|---|---|---|---|
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
    bids: [{ bidder: 'publink', params: { placementId: 'publink-prebid-banner' } }]
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
    bids: [{ bidder: 'publink', params: { placementId: 'publink-prebid-video' } }]
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
    bids: [{ bidder: 'publink', params: { placementId: 'publink-prebid-audio' } }]
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
- No storage, cookies, user syncs, external scripts or custom tracking hooks
  are registered by the adapter.
