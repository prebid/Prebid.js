# Overview

```
Module Name: AdFusion Bid Adapter
Module Type: Bidder Adapter
Maintainer: prebid@adfusion.pl
```

# Description

Module that connects to AdFusion demand sources

# Banner Test Parameters

```js
var adUnits = [
  {
    code: "test-banner",
    mediaTypes: {
      banner: {
        sizes: [
          [300, 250],
          [300, 600],
          [320, 480],
        ],
      },
    },
    bids: [
      {
        bidder: "adfusion",
        params: {
          accountId: 1234, // required
        },
      },
    ],
  },
];
```

# Video Test Parameters

```js
var videoAdUnit = {
  code: "video1",
  mediaTypes: {
    video: {
      context: "instream",
      playerSize: [640, 480],
      mimes: ["video/mp4"],
    },
  },
  bids: [
    {
      bidder: "adfusion",
      params: {
        accountId: 1234, // required
      },
    },
  ],
};
```
