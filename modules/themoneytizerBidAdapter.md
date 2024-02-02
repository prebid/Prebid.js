# Overview

```
Module Name: The Moneytizer Bid Adapter
Module Type: Bidder Adapter
Maintainer: tech@themoneytizer.com
```

## Description

Module that connects to The Moneytizer demand sources

## Test parameters

```js

var adUnits = [
  {
    code: 'your-adunit-code',
    mediaTypes: {
      banner: {
        sizes: [[300, 250]],
      },
    },
    bids: [
      {
        bidder: "themoneytizer",
        params: {
          pid: -1,
          test: 1
        },
      },
    ],
  },
];
```
