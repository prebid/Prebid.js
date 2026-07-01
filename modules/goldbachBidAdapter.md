# Goldbach Bidder Adapter

## Overview

```text
Module Name:  Goldbach Bidder Adapter
Module Type:  Bidder Adapter
Maintainer:   benjamin.brachmann@goldbach.com
GVL ID:       580
```

## Description

Connects publishers to the Goldbach SSP. Supported media types: **banner**, **video** (instream + outstream), **native**.

## Bid Parameters

| Name              | Scope    | Type    | Description                                                            | Example                       |
|-------------------|----------|---------|------------------------------------------------------------------------|-------------------------------|
| `publisherId`     | required | string  | Non-empty publisher identifier provisioned by Goldbach.                | `'de-publisher.ch-ios'`       |
| `slotId`          | optional | string  | Publisher-defined slot identifier. Falls back to `adUnit.code`.        | `'/123/example.com/slot/key'` |
| `customTargeting` | optional | object  | Free-form key/value targeting forwarded to the Goldbach auction.       | `{ language: 'de' }`          |

## Disclosures

For outstream video creatives, the adapter loads an external rendering script from `https://goldplayer.prod.gbadtech.io/scripts/goldplayer.js`.

Sampled lifecycle events are sent to a Goldbach metrics endpoint for monitoring.

## Build

```shell
gulp build --modules=goldbachBidAdapter,userId,pubProvidedIdSystem,consentManagementTcf
```

## Test Parameters

```javascript
var adUnits = [
  {
    code: 'au-1',
    mediaTypes: { banner: { sizes: [[300, 250]] } },
    bids: [{
      bidder: 'goldbach',
      params: { publisherId: 'goldbach_debug', slotId: '/123/example.com/banner' }
    }]
  },
  {
    code: 'au-2',
    mediaTypes: {
      video: { context: 'outstream', playerSize: [[640, 480]], mimes: ['video/mp4'] }
    },
    bids: [{
      bidder: 'goldbach',
      params: { publisherId: 'goldbach_debug', slotId: '/123/example.com/video' }
    }]
  },
  {
    code: 'au-3',
    mediaTypes: {
      native: {
        title: { required: true, len: 50 },
        image: { required: true, sizes: [300, 157] },
        icon:  { required: true, sizes: [30, 30] }
      }
    },
    bids: [{
      bidder: 'goldbach',
      params: {
        publisherId: 'goldbach_debug',
        slotId: '/123/example.com/native',
        customTargeting: { language: 'de' }
      }
    }]
  }
];
```
