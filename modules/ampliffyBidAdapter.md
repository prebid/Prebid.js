# Overview

```
Module Name: Ampliffy Bidder Adapter
Module Type: Bidder Adapter
Maintainer: bidder@ampliffy.com
```

# Description

Connects to Ampliffy Ad server for bids.

Ampliffy bid adapter supports Video currently, and has initial support for Banner.

For more information about [Ampliffy](https://www.ampliffy.com/en/), please contact [info@ampliffy.com](info@ampliffy.com).

# Sample Ad Unit: For Publishers
```javascript
var videoAdUnit = [
{
  code: 'video1',
  mediaTypes: {
    video: {
      playerSize: [[640, 480]],
      context: 'instream'
    },
  },
  bids: [{
    bidder: 'ampliffy',
    params: {
        server: 'bidder.ampliffy.com',
        placementId: '1213213/example/vrutal_/',
        format: 'video'
    }
  }]
}];
```

```
