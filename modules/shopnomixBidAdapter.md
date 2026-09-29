# Overview

```
Module Name: Shopnomix Bid Adapter
Module Type: Bidder Adapter
Maintainer: prebid@shopnomix.com
```

# Description

Connects Prebid.js to the Shopnomix RTB auction endpoint. Outbound requests are
built with Prebid's ORTB conversion library (`libraries/ortbConverter`), and the
adapter only layers Shopnomix fields on top.

# Supported Features

* Media Types: Native
* Price Floors module (`getFloor`), USD only
* Bills on render, or deferred to the publisher with `deferBilling`
* Up to ten impressions per request, grouped by publisher

Bids are CPM in USD, reported net. A floor in another currency is refused, so
run Prebid's currency module to convert one.

Billing runs through Prebid's billing API, so the page needs no billing code.
Setting `deferBilling: true` bills on viewable impressions instead, released by
the publisher's own check or the `bidViewability` module.

# Bidder Parameters

| Name          | Scope    | Description                   | Example                            | Type     |
|---------------|----------|-------------------------------|------------------------------------|----------|
| `publisherId` | required | Shopnomix publisher ID        | `'pub_01h2xcejqtf2nbrexx3vqjhp41'` | `string` |
| `placementId` | required | Shopnomix native placement ID | `'plc_01h2xcejqtf2nbrexx3vqjhp41'` | `string` |

Both are `pub_` or `plc_` followed by 26 characters. A malformed ID is dropped
before the request is built, so that slot does not bid.

> These are the only two bidder params. Everything else the adapter sends comes
> from the ad unit and `ortb2`, handled by Prebid's ORTB conversion library.

# Test Parameters

```javascript
const adUnits = [{
  code: 'native-div',
  mediaTypes: {
    native: {
      ortb: {
        ver: '1.2',
        assets: [
          { id: 1, required: 1, title: { len: 80 } },
          { id: 2, required: 1, img: { type: 3, wmin: 300, hmin: 150 } },
          { id: 3, required: 1, data: { type: 1, len: 60 } }
        ],
        eventtrackers: [{ event: 1, methods: [1] }]
      }
    }
  },
  bids: [{
    bidder: 'shopnomix',
    params: {
      publisherId: 'pub_01h2xcejqtf2nbrexx3vqjhp41',
      placementId: 'plc_01h2xcejqtf2nbrexx3vqjhp41'
    }
  }]
}];
```

The ad unit has to allow an image impression tracker, as above. Without one the
adapter does not bid, since there would be no way to count the impression.

The endpoint only answers requests whose `Origin` is registered against the
publisher, so these parameters return `403` from anywhere else. Contact
prebid@shopnomix.com to have a test origin allow-listed.
