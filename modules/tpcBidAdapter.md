# Overview

```
Module Name:  TPC Bid Adapter
Module Type:  Bidder Adapter
Maintainer:   your-team@tpcsrv.com
```

Connects to the TPC Prebid Server at `pbs.tpcsrv.com` for header bidding.
Supports **banner**, **video** (instream & outstream), and **native** ad formats.

---

## Consent & Privacy Support

| Signal | Support |
|--------|---------|
| TCF / GDPR | ✅ Passed in `regs.ext.gdpr` + `user.ext.consent` |
| US Privacy (legacy) | ✅ Passed in `regs.ext.us_privacy` |
| GPP (Global Privacy Platform) | ✅ Passed in `regs.gpp` + `regs.gpp_sid` |
| COPPA | ✅ Reads `pbjs.setConfig({ coppa: true })` |

---

## User ID & Identity

Any EIDs collected by the Prebid.js **User ID module** are forwarded to Prebid Server in `user.eids`.

---

## User Syncing

After each auction the adapter triggers a single **iframe** (preferred) or **pixel** sync with the
PBS `/cookie_sync` endpoint. Bidder codes are derived automatically from the auction response, so
PBS syncs only the seats that actually responded.

---

## Bid Params

| Name | Scope | Type | Description |
|------|-------|------|-------------|
| `accountId` | **Required** | string | Publisher account ID on pbs.tpcsrv.com |
| `placementId` | Optional | string | Placement / tag identifier |
| `bidder` | Optional | string | Downstream PBS bidder code for single-bidder passthrough |

---

## Ad Unit Examples

### Banner

```js
var adUnits = [{
  code: 'banner-div',
  mediaTypes: {
    banner: { sizes: [[300, 250], [728, 90]] },
  },
  bids: [{
    bidder: 'tpc',
    params: {
      accountId: 'pub-1234',
      placementId: 'homepage-leaderboard',
    },
  }],
}];
```

### Video (instream)

```js
var adUnits = [{
  code: 'video-div',
  mediaTypes: {
    video: {
      playerSize: [[640, 480]],
      context: 'instream',
      mimes: ['video/mp4'],
      protocols: [1, 2, 3, 4, 5, 6],
      playbackmethod: [2],
      skip: 1,
    },
  },
  bids: [{
    bidder: 'tpc',
    params: {
      accountId: 'pub-1234',
      placementId: 'pre-roll-640',
    },
  }],
}];
```

### Native

```js
var adUnits = [{
  code: 'native-div',
  mediaTypes: {
    native: {
      ortb: {
        assets: [
          { id: 1, required: 1, title: { len: 80 } },
          { id: 2, required: 1, img: { type: 3, w: 300, h: 250 } },
          { id: 3, required: 0, data: { type: 2 } }, // description
        ],
      },
    },
  },
  bids: [{
    bidder: 'tpc',
    params: {
      accountId: 'pub-1234',
    },
  }],
}];
```

### Multi-format

```js
var adUnits = [{
  code: 'multi-div',
  mediaTypes: {
    banner: { sizes: [[300, 250]] },
    video: {
      playerSize: [[300, 250]],
      context: 'outstream',
      mimes: ['video/mp4'],
      protocols: [1, 2, 3, 4],
    },
  },
  bids: [{
    bidder: 'tpc',
    params: {
      accountId: 'pub-1234',
      placementId: 'sidebar-multi',
    },
  }],
}];
```

---

## Full Example Setup

```js
pbjs.que.push(function () {
  pbjs.addAdUnits(adUnits);

  pbjs.requestBids({
    bidsBackHandler: function (bids) {
      // ... send targeting to ad server
    },
  });
});
```
