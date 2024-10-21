# Overview

```text
Module Name: Setupad Bid Adapter
Module Type: Bidder Adapter
Maintainer: it@setupad.com
```

# Description

Module that connects to Setupad's demand sources.

# Test Parameters

```js
const adUnits = [
  {
    code: 'test-div',
    mediaTypes: {
      banner: {
        sizes: [[300, 250]],
      },
    },
    bids: [
      {
        bidder: 'setupad',
        params: {
          placement_id: '123', //required
          account_id: '123', //optional
        },
      },
    ],
  },
];
```
