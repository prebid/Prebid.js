# Overview

```
Module Name: Monetize.site Bidder Adapter
Module Type: Bidder Adapter
Maintainer: support@monetize.site
```

# Description

Connects Prebid.js to Monetize.site demand over OpenRTB 2.x (`https://rtb.monetize.site/ssp`).
Requests are built with Prebid's `ortbConverter` library, one request per ad unit, with the
zone id passed in the URL (`?z=<zoneID>`) and as `imp.tagid`.

# Supported Features

* Media Types: Banner, Video, Native (incl. multi-format ad units)
* Price Floors module
* First party data from `ortb2` / `ortb2Imp`, including supply chain and user ids (eids)
* Privacy: GDPR consent string, US Privacy, GPP and COPPA are forwarded in the request (see GDPR / TCF below)
* User syncs (image and iframe), returned by the server in `ext.pixels`

# Bidder Parameters

| Name       | Scope    | Description                                                          | Example    | Type              |
|------------|----------|----------------------------------------------------------------------|------------|-------------------|
| `zoneID`   | required | Zone id provided by Monetize.site                                    | `'922800027'` | `string`/`number` |
| `bidfloor` | optional | Impression floor, used when the Price Floors module sets none; default `0` | `0.5`      | `number`          |
| `cur`      | optional | ISO 4217 currency of `bidfloor`; default `USD`                      | `'EUR'`    | `string`          |
| `mirror`   | optional | Hostname to send the request to instead of `rtb.monetize.site` (https, same path); overrides the `endpoint` config | `'rtb.example.com'` | `string` |

Everything else (site, device, consent, schain, floors, eids) is read from the ad unit and `ortb2`
automatically and is not accepted as a bidder param.

# Test Parameters

```javascript
const adUnits = [
  {
    code: 'banner-div',
    mediaTypes: { banner: { sizes: [[300, 250]] } },
    bids: [{ bidder: 'monetsite', params: { zoneID: '922800027' } }]
  },
  {
    code: 'video-div',
    mediaTypes: {
      video: {
        context: 'instream',
        playerSize: [[640, 480]],
        mimes: ['video/mp4'],
        protocols: [2, 3, 5, 6],
        maxduration: 30
      }
    },
    bids: [{ bidder: 'monetsite', params: { zoneID: '984341227' } }]
  },
  {
    code: 'native-div',
    mediaTypes: {
      native: {
        ortb: {
          assets: [
            { id: 1, required: 1, title: { len: 80 } },
            { id: 2, required: 1, img: { type: 3, w: 300, h: 300 } }
          ]
        }
      }
    },
    bids: [{ bidder: 'monetsite', params: { zoneID: '917767897' } }]
  }
];
```

# Bid Floors

Every impression is sent with `bidfloor`/`bidfloorcur`, resolved in this order:

1. the Price Floors module, when it is installed and a rule matches the ad unit;
2. `params.bidfloor` and `params.cur`;
3. `bidfloor: 0`, `bidfloorcur: 'USD'`.

```javascript
bids: [{ bidder: 'monetsite', params: { zoneID: '922800027', bidfloor: 0.5, cur: 'EUR' } }]
```

The request-level `cur` follows the floor currency.

# GDPR / TCF

Monetize.site is not on the IAB Global Vendor List, so the adapter declares no `gvlid`. With the
`tcfControl` module and its default rules, bid requests to `monetsite` are blocked whenever GDPR
applies, and so are its user syncs. To allow them, add the bidder to the vendor exceptions of the
`basicAds` (bid requests) and `storage` (user syncs) rules:

```javascript
pbjs.setConfig({
  consentManagement: {
    gdpr: {
      rules: [
        { purpose: 'storage', enforcePurpose: true, enforceVendor: true, softVendorExceptions: ['monetsite'] },
        { purpose: 'basicAds', enforcePurpose: true, enforceVendor: true, softVendorExceptions: ['monetsite'] }
      ]
    }
  }
});
```

`softVendorExceptions` still requires purpose consent; use `vendorExceptions` to skip both checks.
The TC string itself is always forwarded in the request (`user.ext.consent`, `regs.ext.gdpr`).

# Optional Configuration

```javascript
pbjs.setConfig({
  monetsite: {
    ttl: 360,                                  // bid TTL in seconds (0 < ttl <= 5000), default 500
    endpoint: 'https://rtb.monetize.site/ssp?z=' // endpoint override; the zone id is appended
  }
});
```

# User Syncs

The adapter does not store anything in the browser itself. Sync pixels are returned by the server in
`response.ext.pixels` as `[type, url]` pairs (`image`/`img` or `iframe`) and are only fired when the
publisher enables that sync type. Consent parameters (`gdpr`, `gdpr_consent`, `us_privacy`, `gpp`,
`gpp_sid`) are appended to every sync URL. Duplicate pixels across responses are registered once, and no syncs are
registered when COPPA applies.
