# MobileFuse Bidder Adapter

## Overview

Module Name: MobileFuse Bidder Adapter
Module Type: Bidder
Maintainer: prebid@mobilefuse.com
GVL ID: 909

The MobileFuse adapter supports banner and video formats. It supports OpenRTB 2.6 request fields and standard US & Canada privacy signals, including GP and US Privacy. User ID modules such as UID2, SharedID, and ID5 are also supported.

## Supported Media Types
- Banner
- Video

## Bid Params
| Name           | Scope     | Type   | Description                           |
|----------------|-----------|--------|---------------------------------------|
| `placement_id` | required  | string | Identifier for the ad placement       |
| `bidfloor`     | optional  | number | Static floor price (in USD) for the impression |

### Banner Example
```javascript
var adUnits = [
  {
    code: 'ad-slot-1',
    mediaTypes: {
      banner: {
        sizes: [[300, 250]]
      }
    },
    bids: [
      {
        bidder: 'mobilefuse',
        params: {
          placement_id: 'abc123',
          bidfloor: 1.25
        }
      }
    ]
  }
];
```

### Video Example
```javascript
var adUnits = [
  {
    code: 'video-slot-1',
    mediaTypes: {
      video: {
        playerSize: [[640, 480]],
        context: 'instream',
        mimes: ['video/mp4'],
        protocols: [2, 3, 5, 6]
      }
    },
    bids: [
      {
        bidder: 'mobilefuse',
        params: {
          placement_id: 'video123',
          bidfloor: 2.00
        }
      }
    ]
  }
];
```

## User Sync
The adapter supports both iframe-based and pixel user syncing. It's recommended to enable iframe syncing in order to improve monetization.

```javascript
pbjs.setConfig({
  //...
  userSync: {
    filterSettings: {
      iframe: {
        // '*' means all bidders, you could limit to just ['mobilefuse']
        bidders: '*',
        filter: 'include'
      }
    }
  }
  //...
});
```
