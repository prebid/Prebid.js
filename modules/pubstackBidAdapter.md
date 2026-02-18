# Overview
```
Module Name: Pubstack Bidder Adapter
Module Type: Bidder Adapter
Maintainer: prebid@pubstack.io
```

# Description
Connects to Pubstack exchange for bids.

Pubstack bid adapter supports all media type including video, banner and native.

# Test Parameters
```
var adUnits = [{
  code: 'adunit-1',
  mediaTypes: {
    banner: {
      sizes: [[300, 250]]
    }
  },
  bids: [{
    bidder: 'pubstack',
    params: {
      siteId: 'your-side-id',
      adUnitName: 'adunit-1'
    }
  }]
}];
```