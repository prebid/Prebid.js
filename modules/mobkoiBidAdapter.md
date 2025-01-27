# Overview

Module Name: Mobkoi Bidder Adapter
Module Type: Bidder Adapter
Maintainer: platformteam@mobkoi.com

# Description

Module that connects to Mobkoi Ad Server

### Supported formats:
- Banner

# Test Parameters
```js
const adUnits = [
  {
    code: 'banner-ad',
    mediaTypes: {
      banner: { sizes: [300, 200] },
    },
    bids: [
      {
        bidder: 'mobkoi',
        params: {
          publisherId: 'module-test-publisher-id',
          adServerBaseUrl: 'https://adserver.maximus.mobkoi.com',
        }
      },
    ],
  },
];

pbjs.que.push(function () {
  pbjs.addAdUnits(adUnits);
});
```
