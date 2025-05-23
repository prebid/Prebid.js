# Overview

```
Module Name: Holid Bid Adapter
Module Type: Bidder Adapter
Maintainer: richard@holid.se
```

# Description

The Holid Bid Adapter is a Prebid.js bidder adapter designed for display (banner) ads. It fully supports TCF (GDPR) and GPP frameworks, along with US Privacy signals. Key features include:

```
Supply Chain (schain) support ensuring transparency.
Safeframes to securely display ads.
Floors Module Support to enforce bid floors.
Comprehensive User ID integrations.
Compliance with COPPA and support for first-party data.
The adapter selects the highest bid for optimal revenue.
Additional support for Demand Chain and ORTB Blocking should be confirmed with the bidder.
```

# Specifications

```
Bidder Code: holid
Prebid.js Adapter: yes
Media Types: display (banner)
TCF-EU Support: yes
GPP Support: yes
Supply Chain Support: yes
Safeframes OK: yes
Floors Module Support: yes
User IDs: all
Privacy Sandbox: check with bidder
Prebid.org Member: no
Prebid Server Adapter: no
Multi Format Support: no
IAB GVL ID: 1177
DSA Support: no
COPPA Support: yes
Demand Chain Support: check with bidder
Supports Deals: yes
First Party Data Support: yes
ORTB Blocking Support: check with bidder
Prebid Server App Support: no
```

## Sample Banner Ad Unit

```js
var adUnits = [
  {
    code: 'bannerAdUnit',
    mediaTypes: {
      banner: {
        sizes: [[300, 250]],
      },
    },
    bids: [
      {
        bidder: 'holid',
        params: {
          adUnitID: '12345',
          // Optional: set a bid floor if needed
          floor: 0.5,
        },
      },
    ],
  },
];
```
