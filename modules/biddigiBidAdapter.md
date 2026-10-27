# Overview

```
Module Name: BidDigi Bidder Adapter
Module Type: Bidder Adapter
Maintainer: kunal@biddigi.com
```

# Description

Module that connects to BidDigi's own OpenRTB 2.5+ auction endpoint. BidDigi is a programmatic
SSP with 380+ verified publishers across news, sports, entertainment, OTT and CTV. This adapter
lets any Prebid.js publisher (not just BidDigi's own network) request bids from BidDigi's demand.

Supports banner, video (instream/outstream), and native.

# Bid Params

| Name | Scope | Description | Example | Type |
|------|-------|--------------|---------|------|
| `placementId` | required | BidDigi placement identifier, from your BidDigi dashboard | `'placement-123'` | `string` |
| `publisherId` | required | BidDigi publisher/account identifier | `'publisher-abc'` | `string` |
| `region` | optional | Routes the bid request to a regional BidDigi endpoint. Defaults to `'in'`. | `'in'`, `'us'` | `string` |
| `bidfloor` | optional | Per-imp floor override, in `bidfloorcur` (defaults to INR) | `12.5` | `float` |
| `bidfloorcur` | optional | Currency of `bidfloor` | `'INR'` | `string` |

# Test Parameters

```js
const adUnits = [
  {
    code: 'banner-div',
    mediaTypes: {
      banner: {
        sizes: [[300, 250], [300, 600]],
      },
    },
    bids: [
      {
        bidder: 'biddigi',
        params: {
          placementId: 'placement-123',
          publisherId: 'publisher-abc',
        },
      },
    ],
  },
  {
    code: 'video-div',
    mediaTypes: {
      video: {
        context: 'instream',
        playerSize: [640, 480],
        mimes: ['video/mp4'],
        protocols: [2, 5],
        minduration: 5,
        maxduration: 30,
      },
    },
    bids: [
      {
        bidder: 'biddigi',
        params: {
          placementId: 'placement-video-1',
          publisherId: 'publisher-abc',
          region: 'us',
        },
      },
    ],
  },
  {
    code: 'native-div',
    mediaTypes: {
      native: {
        title: { required: true, len: 80 },
        image: { required: true },
        sponsoredBy: { required: true },
        clickUrl: { required: true },
        body: { required: false },
      },
    },
    bids: [
      {
        bidder: 'biddigi',
        params: {
          placementId: 'placement-native-1',
          publisherId: 'publisher-abc',
        },
      },
    ],
  },
];
```

# Notes for reviewers

BidDigi's oRTB endpoint (`biddigi-auction-service.biddigi25.workers.dev`, a Cloudflare Worker) is
live. This adapter has been verified end-to-end against it: unit tests via the real
`gulp test-only`/`eslint` harness, plus an integration test that runs the built bundle through a
real headless-Chromium auction. `region` (`in`/`us`) currently resolves to the same global
Worker URL — Cloudflare's own edge network handles geographic routing, so no per-region backend
host is needed. A custom domain (`auction.biddigi.com`) isn't wired up yet; the `workers.dev` URL
is what's live and what this adapter ships with.
