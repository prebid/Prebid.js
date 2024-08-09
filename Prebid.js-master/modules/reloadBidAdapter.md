# Overview

Module Name: Reload Bid Adapter

Module Type: Bidder Adapter

Maintainer: prebid@reload.net

# Description

Prebid module for connecting to Reload

# Parameters
## Banner

| Name          | Scope    | Description                                     | Example                            |
| :------------ | :------- | :---------------------------------------------- | :--------------------------------- |
| `plcmID`      | required | Placement ID (provided by Reload)               | "4234897234"                       |
| `partID`      | required | Partition ID (provided by Reload)               | "part_01"                          |
| `opdomID`     | required | Internal parameter (provided by Reload)         | 0                                  |
| `bsrvID`      | required | Internal parameter (provided by Reload)         | 12                                 |
| `type`        | optional | Internal parameter (provided by Reload)         | "pcm"                              |

# Example ad units
# Test Parameters
```
var adUnits = [
  // Banner adUnit
  {
    code: 'banner-div',
    mediaTypes: {
      banner: {
        sizes: [
          [300, 250]
        ],
      }
    },
    bids: [{
      bidder: 'reload',
      params: {
        plcmID: 'prebid_check',
        partID: 'part_4',
        opdomID: '0',
        bsrvID: 0,
        type: 'pcm'
      }
    }]
  }];