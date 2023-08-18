# Overview

**Module Name:** Vidoomy Bid Adapter

**Module Type:** Bidder Adapter

**Maintainer:** support@vidoomy.com

# Description

Module to connect with Vidoomy, supporting banner and video
 
# Test Parameters
For banner
```js
var adUnits = [
  {
    code: 'test-ad',
    mediaTypes: {
        banner: {
            sizes: [[300, 250]] // only first size will be accepted
        }
    },
    bids: [
      {
        bidder: 'vidoomy',
        params: {
          id: '123123',
          pid: '123123',
          bidfloor: 0.5 // This is optional
        }
      }
    ]
  }
];
```

For video
```js
var adUnits = [
  {
    code: 'test-ad',
    mediaTypes: {
        video: {
            context: 'outstream',
            playerSize: [300, 250]
        }
    },
    bids: [
      {
        bidder: 'vidoomy',
        params: {
          id: '123123',
          pid: '123123',
          bidfloor: 0.5 // This is optional
        }
      }
    ]
  }
];
```
