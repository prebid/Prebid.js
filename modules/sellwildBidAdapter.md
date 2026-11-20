# Overview

```
Module Name: Sellwild Bid Adapter
Module Type: Bidder Adapter
Maintainer: support@sellwild.com
```

# Description

Connects publishers to the Sellwild exchange over OpenRTB 2.6. Supports banner, video and native.

Sellwild assigns each publisher a `partnerCode` and a Prebid.js `key`. The key is meant to sit in the page: it is accepted only for the site domains Sellwild has approved for that partner, and it is separate from the server-side token used by the Sellwild Prebid Server adapter. Contact support@sellwild.com to get set up.

The adapter sends one request per `partnerCode` and `key`. Sellwild bills its demand when the ad renders: for banner and native the adapter fires the bid's `burl`, and video creatives carry their own impression tracker in the VAST.

Outstream video needs a renderer from the publisher (on the ad unit or `mediaTypes.video`); the adapter doesn't supply one.

# Bid Params

| Name          | Scope    | Description                        | Example     | Type     |
|---------------|----------|------------------------------------|-------------|----------|
| `partnerCode` | required | Partner code assigned by Sellwild  | `'acme'`    | `string` |
| `key`         | required | Prebid.js key assigned by Sellwild | `'pub-key'` | `string` |

# Test Parameters

These parameters reach a Sellwild test partner that always returns a canned bid: a 300x250 banner at $0.50 and an instream video at $2.00. The key is public by design.

```js
var adUnits = [
  {
    code: 'banner-div',
    mediaTypes: {
      banner: { sizes: [[300, 250], [728, 90]] }
    },
    bids: [{
      bidder: 'sellwild',
      params: { partnerCode: 'prebid-review', key: '96cfc5631735b2b9665bf5eed03bae4b366130493cf14a4398429b3e3db2c143' }
    }]
  },
  {
    code: 'video-div',
    mediaTypes: {
      video: {
        context: 'instream',
        playerSize: [[640, 480]],
        mimes: ['video/mp4'],
        protocols: [2, 3, 5, 6],
        plcmt: 1
      }
    },
    bids: [{
      bidder: 'sellwild',
      params: { partnerCode: 'prebid-review', key: '96cfc5631735b2b9665bf5eed03bae4b366130493cf14a4398429b3e3db2c143' }
    }]
  }
];
```
