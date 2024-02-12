# Overview

```
Module Name: The Moneytizer Bid Adapter
Module Type: Bidder Adapter
Maintainer: tech@themoneytizer.com
```

## Description

Module that connects to The Moneytizer demand sources

## Bid Parameters

| Key             | Required | Example                                      | Description                            |
| --------------- | -------- | ---------------------------------------------| ---------------------------------------|
| `pid`           | yes      | `12345`                                      | The Moneytizer's publisher token       |
| `test`          | no       | `1`                                          | Set to 1 to receive a test bid response|
| `baseUrl`       | no       | `'https://custom-endpoint.biddertmz.com/m/'` | Call on custom endpoint                |

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
