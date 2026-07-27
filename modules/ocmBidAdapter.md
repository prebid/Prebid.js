# Overview

```text
Module Name: OCM Bid Adapter
Module Type: Bidder Adapter
Maintainer: support@orangeclickmedia.com
```

## Description

OCM Bid Adapter supports Banner, Video, and Native media types.

The adapter uses OpenRTB format and connects to Orange Click Media's prebid server.

## Test Parameters

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

## Outstream Video Rendering

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

## Configuration

## Required Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `publisherId` | String | Your publisher ID provided by Orange Click Media |
| `placementId` | String | The placement ID for the ad unit |

## User Syncing

OCM's Prebid Server `cookie_sync` endpoint is POST-only, so it cannot be loaded directly from an
iframe or pixel. Syncing is therefore routed through a GET endpoint on the OCM origin that performs
the POST on the client's behalf. There are two, and the adapter picks one based on the sync types the
publisher has enabled for `ocm`:

| Publisher enables | Sync emitted | Endpoint | Behaviour |
|---|---|---|---|
| iframe (with or without image) | `iframe` | `/static/cookie_sync.html` | Loader page: POSTs to `cookie_sync` and drops each returned `usersync` (an `iframe` type becomes a hidden iframe, a `redirect` type an image pixel) |
| image only | `image` | `/cookie_sync/redirect` | POSTs to `cookie_sync` server-side and 302-chains the `redirect`-type syncs it returns |

The iframe loader is preferred when available because it can drop both iframe and redirect syncs. The
image path matters because Prebid core's **default** `userSync.filterSettings` enables image syncs
only — without it, every publisher who has not explicitly turned iframe syncing on for `ocm` would
sync nothing at all.

Flow:

1. `getUserSyncs` reads the bidders PBS actually invoked from the auction response
   (`ext.responsetimemillis` keys, plus any `seatbid[].seat`).
2. It emits a sync to the endpoint above with those bidders, the publisher `account` (echoed by PBS
   at `ext.account`), the sync `limit`, `coopSync=0`, the publisher's `filterSettings` (see below),
   and all consent signals (`gdpr`, `gdpr_consent`, `us_privacy`, `gpp`, `gpp_sid`).
3. The endpoint POSTs `{ bidders, account, limit, coopSync, filterSettings, gdpr, ... }` to
   `https://pbam.orangeclickmedia.com/cookie_sync` and delivers the syncs it returns.

**Deployment requirement:** both endpoints must be reachable on the PBS origin, which keeps them
same-origin with `/cookie_sync` (no CORS) and with the PBS `uids` cookie (first-party):

- the loader page at `https://pbam.orangeclickmedia.com/static/cookie_sync.html` — on PBS-Go, drop
  the file into the server's `./static/` directory (served via
  `ServeFiles("/static/*filepath", http.Dir("static"))`);
- the redirect endpoint at `https://pbam.orangeclickmedia.com/cookie_sync/redirect`, which must
  answer a GET with a 302 chain rather than a document.

### Consent and filter settings

Syncing is skipped entirely — no endpoint is called — when COPPA is enabled
(`pbjs.setConfig({coppa: true})`) or when GDPR applies without consent for TCF **purpose 1** ("store
and/or access information on a device"), since every sync the endpoint drops exists to read or write
a device identifier.

The publisher's own `userSync.filterSettings` is forwarded to `cookie_sync` as its `filterSettings`
object, so the per-bidder rules apply to the downstream syncs too instead of only to the `ocm` sync
itself. A sync type Prebid did not authorise for `ocm` is explicitly blocked (`{bidders: '*', filter:
'exclude'}`), because PBS treats an absent per-type filter as "allowed for everyone". `ocm` itself is
dropped from a `bidders` list before forwarding: it names the client-side adapter (which is what
authorises the sync in the first place), while the remaining names are PBS-side bidders. So the
recommended config below authorises all of OCM's server-side bidders for iframe syncing:

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

To restrict which PBS-side bidders may sync, name them instead:

```javascript
pbjs.setConfig({
    userSync: {
        filterSettings: {
            iframe: { bidders: ['ocm', 'bidderA', 'bidderB'], filter: 'include' }
        }
    }
});
```

## Notes

- Both `publisherId` and `placementId` are required parameters for all ad units
- The adapter supports all three media types: Banner, Video, and Native
- Video ads support both instream and outstream contexts; outstream bids are rendered client-side by the OCM Video Player (see *Outstream Video Rendering* above)
- Native ads should use the ORTB format (ortb.assets)
- The request `tmax` is the Prebid auction timeout minus a buffer (200ms, capped at a quarter of the timeout) so a Prebid Server response that leaves the server on time still arrives before Prebid's auction timer fires. The un-buffered auction timeout is sent as `ext.tmaxmax`. Setting `ortb2.tmax` overrides the computed value
- The bid's billing URL (`burl`) is registered as an ORTB impression event tracker (via the shared PBS extensions), so Prebid core fires it once at billing time — the adapter does not fire it on win. The win-notice URL (`nurl`) is handled by Prebid's ORTB conversion per media type and is not fired separately
- When the Prebid Server account has event tracking enabled, PBS returns event URLs on each bid at `bid.ext.prebid.events` (`win` and `imp`). The adapter registers these as ORTB event trackers on the bid response, so Prebid core fires them at the standard times: the `win` URL when the bid wins and the `imp` URL when the bid is billed (on render, or on `pbjs.triggerBilling()` for ad units that defer billing). For video, PBS injects the impression tracker into the VAST server-side, so `imp` is normally absent on video bids
