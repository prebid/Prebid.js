# Overview

```
Module Name: APS Bidder Adapter
Module Type: Bidder Adapter
Maintainer: aps-prebid@amazon.com
```

# Description

Connects to Amazon Publisher Services (APS) for bids.

## Test Bids

Please contact your APS Account Manager to learn more about our testing policies.

# Usage

## Prerequisites

Add the account ID provided by APS to your configuration.

```
pbjs.setBidderConfig(
  {
    bidders: ['aps'],
    config: {
      aps: {
        accountID: YOUR_APS_ACCOUNT_ID,
      }
    },
  },
  true // mergeConfig toggle
);
```

## Ad Units

## Banner

```
const adUnits = [
  {
    code: 'banner_div',
    mediaTypes: {
      banner: {
        sizes: [[300, 250]],
      },
    },
    bids: [{ bidder: 'aps' }],
  },
];
```

## Video

Please select your preferred video renderer. The following example uses in-renderer-js:

```
const adUnits = [
  {
    code: 'video_div',
    mediaTypes: {
      video: {
        playerSize: [400, 225],
        context: 'outstream',
        mimes: ['video/mp4'],
        protocols: [1, 2, 3, 4, 5, 6, 7, 8],
        minduration: 5,
        maxduration: 30,
        placement: 3,
      },
    },
    bids: [{ bidder: 'aps' }],
    renderer: {
      url: 'https://cdn.jsdelivr.net/npm/in-renderer-js@1/dist/in-renderer.umd.min.js',
      render(bid) {
        new window.InRenderer().render('video_div', bid);
      },
    },
  },
];

```
