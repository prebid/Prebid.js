# Overview

```
Module Name: Browsi Bid Adapter
Module Type: Bidder Adapter
Maintainer: support@browsi.com
```

# Description

Connects to Browsi Ad server for bids.

Browsi bid adapter supports Video media type.

**Note:** The bid adapter requires correct setup and approval, including an existing publisher account.

For more information about [Browsi](https://www.browsi.com), please contact [support@browsi.com](support@browsi.com).

# Sample Ad Unit:
```javascript
let videoAdUnit = [
{
  code: 'videoAdUnit',
  mediaTypes: {
    video: {
      playerSize: [[300, 250]],
      context: 'outstream'
    },
  },
  bids: [{
    bidder: 'browsi',
    params: {
      pubId: '117a476f-9791-4a82-80db-4c01c1683db0', // Publisher ID provided by Browsi
      tagId: '1' // Tag ID provided by Browsi
    }
  }]
}];
```
