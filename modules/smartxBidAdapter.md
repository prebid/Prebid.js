# Overview

```
Module Name: smartclip Bidder Adapter
Module Type: Bidder Adapter
Maintainer: bidding@smartclip.tv
```

# Description

Connect to smartx for bids.

This adapter requires setup and approval from the smartclip team.

# Video parameters

Each video field in the request comes from the bidder params first, then from `mediaTypes.video` on the ad unit, then from the default below. An empty string counts as not set.

| Field | Default |
| --- | --- |
| `mimes` | `['application/javascript', 'video/mp4', 'video/webm']` |
| `linearity` | `1` |
| `minduration` | `0` |
| `maxduration` | `500` |
| `startdelay` | `0` |
| `minbitrate` | `0` |
| `maxbitrate` | `3500` |
| `delivery` | `[2]` |
| `pos` | `1` |
| `api` | `[2]` |
| `protocols` | `[2, 3, 5, 6]` |

`plcmt`, `skip`, `skipmin`, `skipafter`, `battr`, `playbackend` and `playbackmethod` have no default and are only sent when set. Prebid sets `plcmt` to 4 on outstream ad units and to 2 when `playbackmethod` starts muted (2 or 6), so declare it on the ad unit when that guess is wrong.

```
    mediaTypes: {
        video: {
            context: 'instream',
            playerSize: [640, 360],
            plcmt: 1,
            skip: 1
        }
    }
```

# Test Parameters - Use case #1 - Out-Stream example and default rendering options
```
    var adUnits = [{
        code: 'video1',
        mediaTypes: {
            video: {
                context: 'outstream',
                playerSize: [640, 360]
            }
        },
        bids: [{
            bidder: 'smartx',
            params: {
                tagId: 'Nu68JuOWAvrbzoyrOR9a7A',
                publisherId: '11986',
                siteId: '22860',
                bidfloor: 0.3,
                bidfloorcur: 'EUR',
                at: 2,
                cur: ['EUR'],
                outstream_options: {
                    slot: 'video1',
                    minAdWidth: 290,
                    maxAdWidth: 900,
                    title: '',
                    skipOffset: 0,
                    startOpen: 'true',
                    endingScreen: 'true',
                    desiredBitrate: 800,
                },
            }
        }],
    }];
```

# Test Parameters - Use case #2 - Out-Stream with targeting example and default rendering options
```
    var adUnits = [{
        code: 'video1',
        mediaTypes: {
            video: {
                context: 'outstream',
                playerSize: [640, 360]
            }
        },
        bids: [{
            bidder: 'smartx',
            params: {
                tagId: 'Nu68JuOWAvrbzoyrOR9a7A',
                publisherId: '11986',
                siteId: '22860',
                bidfloor: 0.3,
                bidfloorcur: 'EUR',
                at: 2,
                cur: ['EUR'],
                outstream_options: {
                    slot: 'video1',
                    minAdWidth: 290,
                    maxAdWidth: 900,
                    title: '',
                    skipOffset: 0,
                    startOpen: 'true',
                    endingScreen: 'true',
                    desiredBitrate: 800,
                },
                user: {
                    data: [{
                        id: 'emq',
                        name: 'emq',
                        segment: [{
                            id: 'emq',
                            name: 'emq',
                            value: 'e0:k14:e24'
                        }]
                    }, {
                        id: 'gs',
                        name: 'gs',
                        segment: [{
                            id: 'gs',
                            name: 'gs',
                            value: 'tone_of_voice_dislike:tone_of_voice_negative:gs_health'
                        }]
                    }]
                }
            }
        }]
    }];
```

# Test Parameters - Use case #3 - In-Stream example and default rendering options
```
    var adUnits = [{
        code: 'video1',
        mediaTypes: {
            video: {
                context: 'instream',
                playerSize: [640, 360]
            }
        },
        bids: [{
            bidder: 'smartx',
            params: {
                tagId: 'Nu68JuOWAvrbzoyrOR9a7A',
                publisherId: '11986',
                siteId: '22860',
                bidfloor: 0.3,
                bidfloorcur: 'EUR',
                at: 2,
                cur: ['EUR']
            }
        }],
    }];
```

# Test Parameters - Use case #4 - In-Stream with targeting example and default rendering options
```
    var adUnits = [{
        code: 'video1',
        mediaTypes: {
            video: {
                context: 'instream',
                playerSize: [640, 360]
            }
        },
        bids: [{
            bidder: 'smartx',
            params: {
                tagId: 'Nu68JuOWAvrbzoyrOR9a7A',
                publisherId: '11986',
                siteId: '22860',
                bidfloor: 0.3,
                bidfloorcur: 'EUR',
                at: 2,
                cur: ['EUR'],
                user: {
                    data: [{
                            id: 'emq',
                            name: 'emq',
                            segment: [{
                                id: 'emq',
                                name: 'emq',
                                value: 'e0:k14:e24'
                            }]
                        },
                        {
                            id: 'gs',
                            name: 'gs',
                            segment: [{
                                id: 'gs',
                                name: 'gs',
                                value: 'tone_of_voice_dislike:tone_of_voice_negative:gs_health'
                            }]
                        }
                    ]
                }
            }
        }],
    }];
```

# First party data

The publisher's `ortb2.site.content` goes out as `site.content`. The `sitekey` param is added as `site.content.ext.sitekey`.

When `ortb2.app` is set, the request carries an `app` object instead of `site`. It is the publisher's `ortb2.app` with `id` set to `siteId` and `publisher.id` set to `publisherId`, and `ortb2.app.content` goes out as `app.content`.

```
    pbjs.setConfig({
        ortb2: {
            site: {
                content: {
                    id: 'episode-123',
                    title: 'Episode title',
                    series: 'Series name',
                    genre: 'Comedy',
                    language: 'de',
                    livestream: 0
                }
            }
        }
    });
```

# User IDs

IDs from the Prebid userId modules go out as `user.ext.eids`, the OpenRTB 2.5 location. Prebid merges eids the publisher sets in `ortb2.user.eids` or `ortb2.user.ext.eids` into the same list and drops duplicates, so both are forwarded.

# Inventory Sharing

Both oRTB 2.6 and 2.5 inventory sharing formats are supported:

- In oRTB 2.6, the first-class param `inventorypartnerdomain` is passed to `[app|site].ext.inventorypartnerdomain`.
- In oRTB 2.5, the param `ext.inventorypartnerdomain` is passed to `[app|site].ext.inventorypartnerdomain`.
