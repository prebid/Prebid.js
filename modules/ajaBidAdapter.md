# Overview

```
Module Name: Aja Bid adapter
Module Type: Bidder adapter
Maintainer: ssp_support@aja-kk.co.jp
```

# Description
Connects to Aja exchange for bids.
Aja bid adapter supports Banner and Outstream Video.

# Test Parameters
```js
var adUnits = [
  // Banner adUnit
  {
    code: 'prebid_banner',
    mediaTypes: {
      banner: {
        sizes: [
          [300, 250]
        ],
      }
    },
    bids: [{
      bidder: 'aja',
      params: {
        asi: 'tk82gbLmg'
      }
    }]
  },
  // Video outstream adUnit
  {
    code: 'prebid_video',
    mediaTypes: {
      video: {
        context: 'outstream',
        playerSize: [300, 250]
      }
    },
    bids: [{
      bidder: 'aja',
      params: {
        asi: '1-KwEG_iR'
      }
    }]
  },
  // Native adUnit
  {
    code: 'prebid_native',
    mediaTypes: {
      native: {
        image: {
          required: true
        },
        title: {
          required: true
        },
        sponsoredBy: {
          required: false
        },
        clickUrl: {
          required: false
        },
        body: {
          required: false
        },
        icon: {
          required: false
        }
      }
    },
    bids: [{
      bidder: 'aja',
      params: {
        asi: 'qxueUGliR'
      }
    }]
  }
];
```
