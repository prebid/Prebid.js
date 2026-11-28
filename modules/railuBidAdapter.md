# Overview

```
Module Name: Railu Bidder Adapter
Module Type: Bidder Adapter
Maintainer: dev@railu.ai
```

# Description

Connects a Prebid.js publisher to Railu's auction over OpenRTB 2.6. One request per auction to
`https://api.railu.ai/v1/ortb/bid`; the answer carries the served creative (VAST for video, HTML for banner, OpenRTB
Native 1.2 for native) with Railu's signed trackers inside, so delivery is confirmed by Proof the same way as a
trafficked tag. No cookies, no user syncs.

Supported media types: banner, video (instream and outstream), native. An ad unit with several formats sends them all;
Railu answers in the first one it can fill, in the order the ad unit declares them (or `params.format` first). The
publisher's `ortb2.badv` and `ortb2.bcat` blocks are honoured.

# Bid params

| Name | Scope | Description | Example |
|---|---|---|---|
| `tid` | recommended | your public Railu tag ID (Connect your supply in the console); bids count as yours on your own domains | `'t_k3m9p2x7q4w8z6'` |
| `source` | optional | the seller's registered Railu source key (attribution, the seller's fences and floors) | `'src_7f3a'` |
| `placement` | optional | where on the page the slot is: `topscroll`, `midscroll`, `interscroller`, `skin`, `outstream`, `instream`, `infeed`, `display`. Priced by the seller's offer for it and filled by deals for it (also read from `ortb2Imp.ext.data.placement`) | `'topscroll'` |
| `format` | optional | the format Railu answers in first when the ad unit declares several (`'banner'`, `'video'` or `'native'`); by default the order the ad unit declares them in | `'video'` |
| `domain` | optional | the property, when `refererInfo` cannot see it | `'news.example.com'` |
| `segments` | optional | the seller's declared first-party segments for this impression | `['sports', 'auto']` |
| `signals` | optional | the seller's declared signal ids | `['sig_42']` |
| `endpoint` | optional | override the bid endpoint (staging) | `'https://railu-edge-staging.praevis.workers.dev/v1/ortb/bid'` |

# Test parameters

```js
var adUnits = [
  { code: 'banner-1', mediaTypes: { banner: { sizes: [[300, 250]] } }, bids: [{ bidder: 'railu', params: {} }] },
  { code: 'video-1', mediaTypes: { video: { context: 'instream', playerSize: [[640, 360]], mimes: ['video/mp4'], protocols: [2, 3, 7, 8], maxduration: 30 } }, bids: [{ bidder: 'railu', params: {} }] },
  { code: 'native-1', mediaTypes: { native: { title: { required: true }, image: { required: true } } }, bids: [{ bidder: 'railu', params: {} }] },
];
```

# Deals

When a Railu deal wins, the bid carries `dealId`. Prebid then sets the `hb_deal_railu` targeting key (and `hb_deal`
when it is the winning bid), so a Google Ad Manager line item that targets the deal key serves it. The Railu console
lists each deal's ID; the Prebid setup guide shows the line item step by step.

