# Overview

```
Module Name: Playgama Bid Adapter
Module Type: Bidder Adapter
Maintainer: ads@playgama.com
```

# Description

Connects to the Playgama SSP for banner and video (instream and outstream) demand.
All ad units of an auction are sent in a single POST request to the SSP.

# Bid Params

| Name          | Scope    | Type    | Description                                                                                       |
| ------------- | -------- | ------- | ------------------------------------------------------------------------------------------------- |
| `publisherId` | required | String  | Publisher ID issued by Playgama.                                                                  |
| `adUnitId`    | required | String  | Ad unit ID issued by Playgama.                                                                    |
| `env`         | optional | String  | `'production'` (default) or `'staging'`. Staging is for integration testing only.                 |
| `test`        | optional | Boolean | Test mode: the impression is not billed. Default `false`.                                         |

# Supported Features

* Media types: banner, video (instream and outstream)
* Price Floors module (`getFloor`)
* First-party data (`ortb2`, `ortb2Imp`), supply chain, user ID modules (EIDs) and consent signals are forwarded from the bid request as-is.

# Disclosures

* **Storage.** The adapter stores the Playgama user id returned by the SSP in the first-party cookie `_pgid` (90 days) through the Prebid `StorageManager`, and sends it back on later requests. The id is issued per site and is used by Playgama for frequency capping and audience targeting. It is not derived from or linked to any shared id module. Like any bidder storage in Prebid.js it only takes effect when the publisher allows it with `pbjs.bidderSettings.playgama.storageAllowed = true`; without it the adapter still bids, just without the id.
* **External scripts.** Outstream video and interstitial bids are rendered by Playgama's own renderers, loaded on demand from `https://playgama.com/prebid-renderers/` (or the staging host when `env: 'staging'`) through the Prebid `Renderer`. No script is loaded for banner or instream bids.
* **User syncs.** The SSP response may carry image and iframe sync pixels of its demand partners; they are registered through `getUserSyncs` and honour the publisher's `userSync` settings.

# Test Parameters

```javascript
var adUnits = [
  {
    code: 'banner-div',
    mediaTypes: {
      banner: {
        sizes: [[300, 250]],
      },
    },
    bids: [
      {
        bidder: 'playgama',
        params: {
          publisherId: 'pub-demo-001',
          adUnitId: 'au-banner-300x250',
          env: 'staging',
          test: true,
        },
      },
    ],
  },
  {
    code: 'video-div',
    mediaTypes: {
      video: {
        context: 'outstream',
        playerSize: [640, 480],
        mimes: ['video/mp4'],
        protocols: [2, 3, 5, 6],
      },
    },
    bids: [
      {
        bidder: 'playgama',
        params: {
          publisherId: 'pub-demo-001',
          adUnitId: 'au-multi-outstream',
          env: 'staging',
          test: true,
        },
      },
    ],
  },
];
```
