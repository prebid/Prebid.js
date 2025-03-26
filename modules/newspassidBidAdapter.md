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
| `groupId` | yes | `"leftrail-mobile-1"` | For associating the ad placement inventory with demand. This ID must be predefined by NewsPassID provider |
| `accountId` | no | `"123456"` | this is the account ID associated with your publisher account with NewsPassID initiative |

# Test Parameters

```javascript
pbjs.setBidderConfig({
  bidders: ['newspassid'],
  config: {
    accountId: '123456',
  }
});

var adUnits = [
  {
    code: 'newspass-test-div',
    sizes: [[300, 250]],
    bids: [
      {
        bidder: 'newspassid',
        params: {
          accountId: '123456', // optional if you set in bidder config
          groupId: 'test-group1'
        },
      }
    ]
  }
]
```
