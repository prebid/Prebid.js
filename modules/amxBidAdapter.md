Overview
========

```
Module Name: AMX Adapter
Module Type: Bidder Adapter
Maintainer: prebid@amxrtb.com
```

Description
===========

This module connects web publishers to AMX RTB video and display demand.

# Bid Parameters

| Key | Required | Example | Description |
| --- | -------- | ------- | ----------- |
| `testMode` | no | `true` | this will activate test mode / 100% fill with sample ads |
| `tagId` | no | `"cHJlYmlkLm9yZw"` | can be used for more specific targeting of inventory. Your account manager will provide this ID if needed |
| `adUnitId` | no | `"sticky_banner"` | optional. To override the bid.adUnitCode provided by prebid. For use in ad-unit level reporting |

# Test Parameters

```
var adUnits = [{
  code: 'test-div',
  sizes: [[300, 250]],
  bids: [{
    bidder: 'amx',
    params: {
      testMode: true,
      tagId: 'cHJlYmlkLm9yZw'
    },
  }]
}]
```
