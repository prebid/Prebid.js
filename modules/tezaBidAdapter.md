# Overview

```
Module Name: Teza Bidder Adapter
Module Type: Bidder Adapter
```

# Description

Minimal banner-only adapter for an OpenRTB 2.x endpoint.

### Bid params

| Name          | Scope    | Description                                                                 | Example    | Type      |
| ------------- | -------- | --------------------------------------------------------------------------- | ---------- | --------- |
| `account`     | required | Account identifier provided by Teza.                                        | `acct123`  | `string`  |
| `tagid`       | optional | Ad placement identifier; falls back to GPID or `adUnitCode` if not present. | `home-top` | `string`  |
| `bidfloor`    | optional | Minimum price to bid. Default `0.01`.                                       | `0.10`     | `number`  |
| `bidfloorcur` | optional | Currency for `bidfloor`. Default `USD`.                                     | `USD`      | `string`  |
| `test`        | optional | When `true`, enables test mode (`test=1`) on requests.                      | `true`     | `boolean` |

# Test Parameters

```js
var adUnits = [
  {
    code: "div-1",
    mediaTypes: { banner: { sizes: [[300, 250]] } },
    bids: [
      {
        bidder: "teza",
        params: {
          account: "acct123",
          bidfloor: 0.1,
          test: true,
        },
      },
    ],
  },
];
```
