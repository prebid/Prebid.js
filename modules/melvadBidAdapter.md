# Overview

```
Module Name:  Melvad Bid Adapter
Module Type:  Bidder Adapter
Maintainer:   support@melvad.com
```

# Description

Connects to the Melvad SSP for banner, native and video bids. The SSP runs its own auction among the
connected DSPs and answers one bid per impression, priced after the Melvad commission (`netRevenue: true`).

The adapter sends one OpenRTB 2.5 request per auction to `https://pub.supplier.melvad.com/prebid`
(`Content-Type: text/plain`, no cookies, so no preflight). Every impression carries the Melvad placement
in `imp.ext.melvad.placementId`. A bid names its format in `bid.ext.melvad.mediaType` (or `mtype`), its
lifetime in `bid.exp` and carries the markup (HTML, Native 1.2 JSON or VAST XML) in `adm`. Video bids are
returned as `vastXml`; set `cache.allowVastXmlOnly` when the player takes the XML directly. The adapter calls
the win and billing URLs of a bid on the Prebid `bidWon` and `billable` events and fills the price macros of
the banner markup with the price and the currency of the response.

Every bid also carries `bid.melvad` for pages that render the markup themselves: `api` (the OpenRTB API
frameworks of the creative), `attr` (the creative attributes) and `nroa` (the advertising marking required
in Russia: `erid`, `inn`, `name`).

Melvad bids in the currency of the placement: set `currency.adServerCurrency` to it (RUB for the test
placements) or load the currency module. The user is taken from first party data
(`ortb2.user.buyeruid`); the adapter runs no user sync of its own.

# Bid Params

| Name          | Scope    | Description                   | Example          | Type     |
|---------------|----------|-------------------------------|------------------|----------|
| `placementId` | required | Placement ID issued by Melvad | `'pl-a962d9cff'` | `string` |

# Configuration

```javascript
pbjs.setConfig({
  currency: { adServerCurrency: 'RUB' },
  cache: { allowVastXmlOnly: true },
  ortb2: { user: { buyeruid: 'prebid-test-user' } }
});
```

# Test Parameters

```javascript
var adUnits = [
  {
    code: 'banner-div',
    mediaTypes: { banner: { sizes: [[300, 250]] } },
    bids: [{ bidder: 'melvad', params: { placementId: 'pl-a962d9cff' } }]
  },
  {
    code: 'native-div',
    mediaTypes: {
      native: {
        ortb: {
          assets: [
            { id: 1, required: 1, title: { len: 25 } },
            { id: 4, required: 1, img: { type: 3, wmin: 1200, hmin: 627 } },
            { id: 2, data: { type: 2, len: 90 } }
          ]
        }
      }
    },
    bids: [{ bidder: 'melvad', params: { placementId: 'pl-c4ead8e7b' } }]
  }
];
```
