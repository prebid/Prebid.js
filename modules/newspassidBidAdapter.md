Overview
========

```
Module Name: NewsPassID Bid Adapter
Module Type: Bidder Adapter
Maintainer: techsupport@newspassid.com
```

Description
===========

Bid adapter to connect to Local Media Consortium's NewsPassID (NPID) demand source(s).

# Bid Parameters

| Key | Required | Example | Description |
| --- | -------- | ------- | ----------- |
| `accountId` | yes | `"01952070-3b08-7d30-9daf-93f1f7e4247f"` | this is the account ID associated with your publisher account with NewsPassID initiative |
| `groupId` | yes | `"leftrail-mobile-1"` | For associating the ad placement inventory with demand. This ID must be predefined by NewsPassID provider |

# Test Parameters

```
var adUnits = [{
  code: 'newspass-test-div',
  sizes: [[300, 250]],
  bids: [{
    bidder: 'newspassid',
    params: {
      accountId: '123456',
      groupId: 'test-group1'
    },
  }]
}]
```

### Note:

Please contact us at techsupport@newspassid.com for any assistance testing your implementation before going live into production.
