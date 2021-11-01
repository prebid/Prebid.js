# Overview

```
Module Name:  Delta Projects Bid Adapter
Module Type:  Bidder Adapter
Maintainer:   dev@deltaprojects.com
```

# Description

Connects to Delta Projects DSP for bids.

# Test Parameters
```
// define banner unit
var bannerUnit = {
  code: 'div-gpt-ad-1460505748561-0',
  mediaTypes: {
    banner: {
      sizes: [[300, 250], [300,600]],
    }
  },
  // Replace this object to test a new Adapter!
  bids: [{
    bidder: 'deltaprojects',
    params: {
      publisherId: '4'   //required
    }
  }]
};
```

