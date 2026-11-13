# Overview

```
Module Name: Bid Espresso Bid Adapter
Module Type: Bidder Adapter
Maintainer: prebid@bidespresso.com
```

# Description

Bid Espresso is a supply-side auction gateway. The adapter sends a single
OpenRTB request per auction to the Bid Espresso gateway, which enriches it and
fans out to demand server-side. Bids are returned net of the Bid Espresso
margin (`netRevenue: true`).

Banner and video are supported (outstream video requires a publisher-supplied
renderer). Mixed banner+video ad units send both media objects on a single
imp — the gateway auctions each media class separately server-side, stamps
oRTB `mtype` on every bid, and either class can win. The adapter forwards
GDPR, US Privacy (CCPA) and GPP consent, first-party data (`ortb2`),
extended IDs (`userId`/`eids`), and floors via the floors module.

Note: the auction request is credentialed (`withCredentials: true`) so the
Bid Espresso user-match cookie can attach. The match id is carried only by
that cookie, which is set server-side during sync — the adapter itself uses
no storage manager and writes nothing to cookies or localStorage.

Bid Espresso does not currently declare an IAB TCF Global Vendor List ID.
Publishers enforcing vendor-level TCF consent should list `bidespresso`
under `vendorExceptions` (or supply a `gvlMapping` entry) to include the
adapter for EEA traffic; GDPR, US Privacy and GPP consent signals are always
forwarded on both auction requests and user syncs regardless.

Price floors are read from the floors module (`getFloor`) and requested in
USD — floors configured in another currency are converted automatically when
the currency module is present. Only floors that cannot be resolved to USD
are withheld: the Bid Espresso gateway prices floors in USD, and forwarding
an unconverted floor would silently misprice it. Banner bids carry
a 300s TTL and video bids 900s; a per-bid `exp` from the gateway takes
precedence.

# Bid Parameters

| Name          | Scope    | Description                                                                              | Example      | Type     |
|---------------|----------|------------------------------------------------------------------------------------------|--------------|----------|
| `publisherId` | required | Publisher ID on the Bid Espresso gateway. Provided by Bid Espresso during onboarding.     | `'k8xw2r4p'` | `string` |
| `inventoryId` | required | Inventory segment ID. Always assigned by Bid Espresso during onboarding — single-placement integrations receive their default segment ID. | `'n7c3tkqe'` | `string` |

# Example Ad Unit

```js
var adUnits = [
  {
    code: 'div-ad-leaderboard',
    mediaTypes: {
      banner: {
        sizes: [
          [728, 90],
          [970, 90]
        ]
      }
    },
    bids: [{
      bidder: 'bidespresso',
      params: {
        publisherId: 'k8xw2r4p', // Required — provided by Bid Espresso during onboarding
        inventoryId: 'n7c3tkqe'  // Required — assigned by Bid Espresso during onboarding
      }
    }]
  }
];
```

# Configuration

User syncing requires iframe syncs to be enabled for this bidder — Prebid
does not enable them by default, and without this the adapter registers no
syncs and user matching silently never happens (the sync chain must execute
as a document, so it registers nothing in pixel-only mode):

```js
pbjs.setConfig({
  userSync: {
    filterSettings: {
      iframe: {
        bidders: ['bidespresso'],
        filter: 'include'
      }
    }
  }
});
```

# Test Parameters

```js
var adUnits = [
  {
    code: 'test-div',
    mediaTypes: {
      banner: {
        sizes: [[300, 250]]
      }
    },
    bids: [{
      bidder: 'bidespresso',
      params: {
        publisherId: 'prebidtest',
        inventoryId: 'ron'
      }
    }]
  }
];
```
