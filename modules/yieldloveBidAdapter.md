# Overview

```
Module Name:  Yieldlove Bid Adapter
Module Type:  Bidder Adapter
Maintainer:   adapter@yieldlove.com
```


# Description

Connects to **[Yieldlove](https://www.yieldlove.com/)**s S2S platform for bids.

```js
const adUnits = [
  {
    code: 'test-div',
    mediaTypes: { banner: { sizes: [[300, 250]] }},
    bids: [
      {
        bidder: 'yieldlove',
        params: {
          pid: 34437,
          rid: 'website.com'
        }
      }
    ]
  }
]
```


# Bid Parameters

| Name          | Scope        | Description                                             | Example                    | Type         |
|---------------|--------------|---------------------------------------------------------|----------------------------|--------------|
| rid           | **required** | Publisher ID on the Yieldlove platform                  | `website.com`              | String       |
| pid           | **required** | Placement ID on the Yieldlove platform                  | `34437`                    | Number       |
