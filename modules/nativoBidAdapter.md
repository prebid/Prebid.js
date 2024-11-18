# Overview

```
Module Name: Nativo Bid Adapter
Module Type: Bidder Adapter
Maintainer: prebiddev@nativo.com
```

# Description

Module that connects to Nativo's demand sources

# Dev

gulp serve --modules=nativoBidAdapter

# Test Parameters

## Banner

```js
var adUnits = [
  {
    code: 'div-gpt-ad-1460505748561-0',
    mediaTypes: {
      banner: {
        sizes: [
          [300, 250],
          [300, 600],
        ],
      },
    },
    // Replace this object to test a new Adapter!
    bids: [
      {
        bidder: 'nativo',
        params: {
          url: 'https://test-sites.internal.nativo.net/testing/prebid_adpater.html',
        },
      },
    ],
  },
]
```

## Video

```js
var adUnits = [
  {
    code: 'ntvPlaceholder-1',
    mediaTypes: {
      video: {
        mimes: ['video/mp4'],
        protocols: [2, 3, 5, 6],
        playbackmethod: [1, 2],
        skip: 1,
        skipafter: 5,
      },
    },
    video: {
      divId: 'player',
    },
    bids: [
      {
        bidder: 'nativo',
        params: {
          url: 'https://test-sites.internal.nativo.net/testing/prebid_adpater.html',
        },
      },
    ],
  },
]
```

## Native

```js
var adUnits = [
  {
    code: '/416881364/prebid-native-test-unit',
    sizes: [[300, 250]],
    mediaTypes: {
      native: {
        title: {
          required: true,
        },
        image: {
          required: true,
        },
        sponsoredBy: {
          required: true,
        },
      },
    },
    bids: [
      {
        bidder: 'nativo',
        params: {
          url: 'https://test-sites.internal.nativo.net/testing/prebid_adpater.html',
        },
      },
    ],
  },
]
```
