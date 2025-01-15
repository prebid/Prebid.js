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
      },
    ],
  },
];

pbjs.que.push(function () {
  pbjs.setBidderConfig({
    bidders: ['mobkoi'],
    config: {
      ortb2: {
        site: {
          publisher: {
            id: 'module-test-publisher-id',
            ext: {
              adServerBaseUrl: 'https://adserver.dev.mobkoi.com',
            },
          },
        },
      },
    },
  });

  pbjs.addAdUnits(adUnits);
});
```
