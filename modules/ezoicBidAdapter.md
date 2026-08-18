# Overview

```text
Module Name: Ezoic Bid Adapter
Module Type: Bidder Adapter
Maintainer: prebid-adapter@ezoic.com
```

## Description

Ezoic Bid Adapter supports Banner, Video, and Native media types.

Ezoic is a publisher monetization platform serving demand across a large network of
site inventory (GVL ID 347). The adapter connects to Ezoic's Prebid demand endpoint.

No bidder params are required — every ad unit routed to `ezoic` is a valid bid
request. The optional params below let a publisher pass placement context through
to the endpoint; omit them and the adapter still participates in the auction.

## Bidder Params

| Name | Scope | Type | Description | Example |
| --- | --- | --- | --- | --- |
| `placementType` | optional | `string` | Publisher-declared placement context | `'interstitial'`, `'rewarded'`, `'display'` |
| `bidfloor` | optional | `number` | Explicit CPM floor (USD unless `bidfloorcur` is set); takes precedence over the Prebid floors module | `0.50` |
| `bidfloorcur` | optional | `string` | Currency of `bidfloor` | `'USD'` |
| `publisherProvidedId` | optional | `string` | Publisher-supplied identifier echoed back on the impression | `'ppid-123'` |

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
