Overview
========

```
Module Name: AMX Adapter
Module Type: Bidder Adapter
Maintainer: prebid.support@amxrtb.com
```

Description
===========

This module connects web publishers to AMX RTB video and display demand.

# Bid Parameters

| Key | Required | Example | Description |
| --- | -------- | ------- | ----------- |
| `endpoint`  | **yes** | `https://prebid.a-mo.net/a/c` | The url including https:// and any path |
| `testMode` | no | `true` | this will activate test mode / 100% fill with sample ads |
| `tagId` | no | `"eh3hffb"` | can be used for more specific targeting of inventory. Your account manager will provide this ID if needed |

# Test Parameters

```
var adUnits = [{
  code: 'test-div',
  sizes: [[300, 250]],
  bids: [{
    bidder: 'amx',
    params: {
      testMode: true,
      endpoint: 'https://prebid.a-mo.net/a/c',
    },
  }]
}]
```
