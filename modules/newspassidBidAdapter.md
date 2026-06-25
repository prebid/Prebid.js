Overview
========

```
Module Name: NewsPassID Bid Adapter
Module Type: Bidder Adapter
Maintainer: techsupport@newspassid.com
```

Description
===========

Bid adapter to connect to Local Media Consortium's NewsPassID (NPID) demand source(s). This adapter runs bid requests through ad server technology built and maintained by Aditude.

# Bid Parameters

| Key | Required | Example | Description |
| --- | -------- | ------- | ----------- |
| `publisherId` | yes | `"123456"` | For associating the publisher account for the NewsPassID initiative |
| `placementId` | yes | `"leftrail-mobile-1"` | For associating the ad placement inventory with demand. This ID must be predefined by NewsPassID provider |


# Test Parameters

```javascript
pbjs.setConfig({
  newspassid: {
    publisherId: '123456',
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
          publisherId: '123456', // optional if you set in bidder config
          placementId: 'test-group1'
        }
      }
    ]
  }
]
```
