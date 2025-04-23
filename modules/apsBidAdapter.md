# Overview

```
Module Name:  APS Prebid Adapter
Module Type:  Bidder Adapter
```

# Description

APS Prebid Adapter

# Configuration

## Allow localStorage Access
The APS adapter requires localStorage access to function properly:


```js
pbjs.bidderSettings = {
  aps: {
    storageAllowed: true
  }
};
```

# Ad Unit Example

```js
var adUnits = [
  {
    code: 'display-ad',
    mediaTypes: {
      banner: {
        sizes: [[300, 250]],
      },
    },
    bids: [
      {
        bidder: "aps",
        params: {
          accountID: YOUR_APS_ACCOUNT_ID,
        },
      },
    ],
  },
];

window.pbjs.que.push(function () {
  window.pbjs.addAdUnits(adUnits);
});
```
