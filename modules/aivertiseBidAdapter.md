# Overview

```
Module Name:  Aivertise Bidder Adapter
Module Type:  Bidder Adapter
Maintainer: bidder@aivertise.com
```

# Description

The Aivertise bid adapter connects Prebid.js to Aivertise's demand, so Aivertise can bid on your display ad units alongside your other bidders. It supports banner ads only.

The Aivertise bidding adapter requires setup before use. Please contact us at [bidder@aivertise.com](mailto:bidder@aivertise.com).

# Bidder Parameters

| Name          | Scope    | Description                                                       | Example         | Type     |
|---------------|----------|-------------------------------------------------------------------|-----------------|----------|
| `publisherId` | required | Publisher ID assigned by Aivertise                                     | `'11111'`       | `string` |
| `siteDomain`  | optional | Site domain. Only needed if different from the current page domain | `'example.com'` | `string` |
| `placementId` | optional | Placement ID. Only needed if a placement differs from the others   | `'11111'`       | `string` |

# Test Parameters

The `prebid-test` publisher's `prebid-test-display` placement always bids a CPM of 2.50 EUR (unless a floor is above it) with an Aivertise banner, in any of these sizes:

- 300x250, 300x600, 320x50, 320x100, 320x480, 728x90, 970x250
- 1024x768 (desktop interstitial)

```javascript
var adUnits = [
  {
    code: 'aivertise-banner-ad',
    mediaTypes: {
      banner: {
        sizes: [[300, 250]]
      }
    },
    bids: [
      {
        bidder: 'aivertise',
        params: {
          publisherId: 'prebid-test',
          placementId: 'prebid-test-display'
        }
      }
    ]
  }
];
```

Where GDPR applies, the test placement bids like any other: only with TCF consent for Aivertise (see GDPR / TCF). A request that doesn't say whether GDPR applies is treated as if it does. On a test page without a CMP, declare that it doesn't:

```javascript
pbjs.setConfig({
  ortb2: {
    regs: { ext: { gdpr: 0 } }
  }
});
```

Add `aivertiseTest=1` to the page URL to mark the auction as a test: Aivertise then bids its banner at a CPM of 20 EUR for any publisher, and nothing is reported as delivery. Test bids carry the ad server targeting key `aivertiseBidderTest=1`.

# Requests and Responses

The adapter sends a single OpenRTB 2.6 bid request per auction to Aivertise's auction endpoint and reads an OpenRTB 2.6 response.

The request carries Prebid's first-party data plus TCF consent (Aivertise is IAB TCF vendor 1654), US Privacy, GPP and COPPA signals, the supply chain object and user IDs, all in their OpenRTB 2.6 locations.

Bids are returned in EUR, net revenue.

# Floors

Floors from the Price Floors module are respected. Aivertise only compares floors in EUR, so use the Currency module for floors in other currencies.

# Rendering

Aivertise creatives are not compatible with SafeFrames.

# User Sync

Aivertise syncs with an iframe, or with an image where iframe syncs aren't allowed for `aivertise`. Where GDPR applies, it needs consent for purpose 1 (see GDPR / TCF).

The iframe sync is preferred. If your `userSync.filterSettings` only allows iframe syncs for listed bidders, add `aivertise` to the list:

```javascript
pbjs.setConfig({
  userSync: {
    filterSettings: {
      iframe: {
        bidders: ['aivertise'], // plus your other iframe bidders
        filter: 'include'
      }
    }
  }
});
```

# Debugging

Every response from Aivertise carries its request ID in the `X-Aivertise-Request-Id` header, and a no-bid (204) says why in `X-Aivertise-No-Bid-Reason` (for example `no_consent:no_vendor_consent`). With Prebid's debug mode on (`pbjs_debug=true`), the adapter logs both, so a response can be looked up with Aivertise. A no-bid for lack of consent is logged as a warning.

# GDPR / TCF

Aivertise is IAB Europe TCF vendor **1654** (Dorvan Srl). Add it to your CMP's vendor list: where GDPR applies, Aivertise only bids with consent for vendor 1654 and for purposes 1 and 2, and only syncs users with consent for purpose 1. The cookie it sets is described in the vendor's device storage disclosure, `https://a.aivertise.com/vendor-disclosure-aivertise-bidder.json`.
