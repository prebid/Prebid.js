# Overview

```text
Module Name: Ezoic Bid Adapter
Module Type: Bidder Adapter
Maintainer: prebid@ezoic.com
```

## Description

Ezoic Bid Adapter supports Banner, Video, and Native media types.

Ezoic is a publisher monetization platform serving demand across a large network of
site inventory (GVL ID 347). The adapter connects to Ezoic's Prebid demand endpoint.

Ezoic requires publisher domains to be registered and approved before bidding;
unapproved inventory receives no-bid responses. Contact prebid@ezoic.com to get
set up.

The param contract mirrors the Ezoic Prebid Server adapter: a single optional
`placementId`. No params are required — every ad unit routed to `ezoic` is a
valid bid request. Bid floors flow through the standard Prebid floors module;
the adapter forwards the returned value and currency as `floor` / `floorCur`
on each impression (including when `getFloor` cannot convert to USD and
returns the publisher's original currency).

## Bidder Params

| Name | Scope | Type | Description | Example |
| --- | --- | --- | --- | --- |
| `placementId` | optional | `string` | Placement identifier assigned during Ezoic onboarding | `'placement-123'` |

## Outstream Video

The adapter returns outstream video bids as VAST (`vastUrl`/`vastXml`) and does not
bundle a renderer. Use a standard Prebid outstream setup: supply a renderer on the ad
unit or `mediaTypes.video`, or use a cache-based configuration
(`mediaTypes.video.useCacheKey` with a Prebid Cache URL) where your player fetches the
cached VAST. Prebid core validates the setup and rejects outstream bids that have
neither. Instream video is unaffected.

## Test Parameters

```javascript
var adUnits = [
    {
        code: 'banner-ad-unit',
        mediaTypes: {
            banner: {
                sizes: [[300, 250]]
            }
        },
        bids: [{
            bidder: 'ezoic',
            params: {}
        }]
    }
];
```

## User Syncing

The adapter registers an iframe user sync (`https://g.ezoic.net/ezoic/prebid/adapter/usersync-frame`)
that carries GDPR, GPP, and CCPA/USP consent as query parameters. Cookie storage and reads happen
server-side inside the sync frame. Enable iframe syncing to allow it to run:

```javascript
pbjs.setConfig({
    userSync: {
        filterSettings: {
            iframe: {
                bidders: ['ezoic'],
                filter: 'include'
            }
        }
    }
});
```
