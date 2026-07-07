# Overview

```
Module Name: OCM Bid Adapter
Module Type: Bidder Adapter
Maintainer: support@orangeclickmedia.com
```

# Description

OCM Bid Adapter supports Banner, Video, and Native media types.

The adapter uses OpenRTB format and connects to Orange Click Media's prebid server.

# Test Parameters

## Banner Ad Unit
```javascript
var adUnits = [
    {
        code: 'banner-ad-unit',
        mediaTypes: {
            banner: {
                sizes: [[300, 250], [728, 90]]
            }
        },
        bids: [{
            bidder: 'ocm',
            params: {
                publisherId: 'your_publisher_id',
                placementId: 'your_placement_id'
            }
        }]
    }
];
```

## Video Ad Unit: Instream
```javascript
var adUnits = [
    {
        code: 'video-instream-ad-unit',
        mediaTypes: {
            video: {
                context: 'instream',
                playerSize: [640, 480],
                mimes: ['video/mp4', 'video/webm'],
                protocols: [2, 3, 5, 6],
                maxduration: 30,
                minduration: 5
            }
        },
        bids: [{
            bidder: 'ocm',
            params: {
                publisherId: 'your_publisher_id',
                placementId: 'your_placement_id'
            }
        }]
    }
];
```

## Video Ad Unit: Outstream
```javascript
var adUnits = [
    {
        code: 'video-outstream-ad-unit',
        mediaTypes: {
            video: {
                context: 'outstream',
                playerSize: [640, 480],
                mimes: ['video/mp4'],
                protocols: [2, 3, 5, 6]
            }
        },
        bids: [{
            bidder: 'ocm',
            params: {
                publisherId: 'your_publisher_id',
                placementId: 'your_placement_id'
            }
        }]
    }
];
```

## Native Ad Unit
```javascript
var adUnits = [
    {
        code: 'native-ad-unit',
        mediaTypes: {
            native: {
                ortb: {
                    assets: [
                        {
                            id: 1,
                            required: 1,
                            title: {
                                len: 80
                            }
                        },
                        {
                            id: 2,
                            required: 1,
                            img: {
                                type: 3,
                                w: 150,
                                h: 150
                            }
                        },
                        {
                            id: 3,
                            required: 0,
                            data: {
                                type: 1
                            }
                        }
                    ]
                }
            }
        },
        bids: [{
            bidder: 'ocm',
            params: {
                publisherId: 'your_publisher_id',
                placementId: 'your_placement_id'
            }
        }]
    }
];
```

## Multi-Format Ad Unit
```javascript
var adUnits = [
    {
        code: 'multi-format-ad-unit',
        mediaTypes: {
            banner: {
                sizes: [[300, 250], [728, 90]]
            },
            video: {
                context: 'outstream',
                playerSize: [640, 480],
                mimes: ['video/mp4']
            },
            native: {
                ortb: {
                    assets: [
                        {
                            id: 1,
                            required: 1,
                            title: {
                                len: 80
                            }
                        }
                    ]
                }
            }
        },
        bids: [{
            bidder: 'ocm',
            params: {
                publisherId: 'your_publisher_id',
                placementId: 'your_placement_id'
            }
        }]
    }
];
```

# Outstream Video Rendering

Outstream video bids are rendered automatically by the adapter using the **OCM Video Player**. When
an outstream video bid is built, the adapter attaches a Prebid `Renderer` to it; Prebid lazily loads
the player script (`https://cdn.orangeclickmedia.com/tech/libs/ocm-player.js`) the first time the bid
renders, then calls the global `window.OcmPlayer(containerId, config, callback)`. The player is
mounted into a child element of the ad unit's slot (`document.getElementById(adUnitCode)`), sized from
the bid's player size, and fed the bid's VAST (`vastUrl`, falling back to inline `vastXml`).

No extra configuration is required — defining an outstream video ad unit (see the example above) is
enough. Notes:

- **Instream** video is left untouched; it is expected to be rendered by the publisher's own video
  player / ad server.
- **Publisher renderers win.** If you define your own renderer on the ad unit (`adUnit.renderer`) or
  on `mediaTypes.video.renderer` and it is not flagged `backupOnly: true`, the OCM renderer is not
  installed and your renderer is used instead.
- **Player overrides.** Options set on `mediaTypes.video.renderer.options` (or `params.rendererConfig`)
  are deep-merged into the OCM player config at render time, so you can tweak player behaviour while
  still using the OCM player.

```javascript
var adUnits = [
    {
        code: 'video-outstream-ad-unit',
        mediaTypes: {
            video: {
                context: 'outstream',
                playerSize: [640, 480],
                mimes: ['video/mp4'],
                protocols: [2, 3, 5, 6],
                // optional: override OCM player defaults
                renderer: {
                    options: { player: { muted: false, autoplay: false } }
                }
            }
        },
        bids: [{
            bidder: 'ocm',
            params: { publisherId: 'your_publisher_id', placementId: 'your_placement_id' }
        }]
    }
];
```

# Configuration

## Required Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `publisherId` | String | Your publisher ID provided by Orange Click Media |
| `placementId` | String | The placement ID for the ad unit |

# User Syncing

OCM's Prebid Server `cookie_sync` endpoint is POST-only, so it cannot be loaded directly from an
iframe/pixel. Syncing is therefore routed through a small GET-renderable **loader page** that the
adapter renders in a hidden iframe; the loader POSTs to `cookie_sync` (with credentials) and drops
the per-bidder sync pixels it returns.

Flow:
1. `getUserSyncs` reads the bidders PBS actually invoked from the auction response
   (`ext.responsetimemillis` keys, plus any `seatbid[].seat`).
2. It renders an iframe to the loader page with those bidders, the publisher `account`
   (the `publisherId`), the sync `limit`, and all consent signals
   (`gdpr`, `gdpr_consent`, `us_privacy`, `gpp`, `gpp_sid`).
3. The loader POSTs `{ bidders, account, limit, gdpr, ... }` to
   `https://pbam.orangeclickmedia.com/cookie_sync` and drops each returned `usersync` (an `iframe`
   type becomes a hidden iframe; a `redirect` type becomes an image pixel).

**Deployment requirement:** the loader page must be reachable at
`https://pbam.orangeclickmedia.com/static/cookie_sync.html`. On PBS-Go, drop the file into the
server's `./static/` directory (served via `ServeFiles("/static/*filepath", http.Dir("static"))`),
which keeps it same-origin with `/cookie_sync` (no CORS) and with the PBS `uids` cookie
(first-party). A reference implementation is provided in `tasks/cookie_sync.html`.

User syncing only runs if the publisher enables iframe syncing and allows the `ocm` bidder
(the adapter returns an iframe sync only — the loader handles the per-bidder image/iframe pixels
itself). For example:

```javascript
pbjs.setConfig({
    userSync: {
        filterSettings: {
            iframe: {
                bidders: ['ocm'],   // or '*'
                filter: 'include'
            }
        }
    }
});
```

Without iframe syncing enabled for `ocm`, `getUserSyncs` returns no syncs (it is a no-op).

# Notes

- Both `publisherId` and `placementId` are required parameters for all ad units
- The adapter supports all three media types: Banner, Video, and Native
- Video ads support both instream and outstream contexts; outstream bids are rendered client-side by the OCM Video Player (see *Outstream Video Rendering* above)
- Native ads should use the ORTB format (ortb.assets)
- The bid's billing URL (`burl`) is registered as an ORTB impression event tracker (via the shared PBS extensions), so Prebid core fires it once at billing time — the adapter does not fire it on win. The win-notice URL (`nurl`) is handled by Prebid's ORTB conversion per media type and is not fired separately
- When the Prebid Server account has event tracking enabled, PBS returns event URLs on each bid at `bid.ext.prebid.events` (`win` and `imp`). The adapter registers these as ORTB event trackers on the bid response, so Prebid core fires them at the standard times: the `win` URL when the bid wins and the `imp` URL when the bid is billed (on render, or on `pbjs.triggerBilling()` for ad units that defer billing). For video, PBS injects the impression tracker into the VAST server-side, so `imp` is normally absent on video bids
