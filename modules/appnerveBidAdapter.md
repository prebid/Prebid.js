# Overview

Module Name: Appnerve Bidder Adapter  
Module Type: Bidder Adapter  
Maintainer: prebid@appnerve.com

# Description

Connects Prebid.js publisher inventory to Appnerve Exchange. The production
endpoint is fixed by the adapter; publishers provide only their Appnerve
`sourceId`.

# Test Parameters

```javascript
var adUnits = [{
  code: 'appnerve-banner-test',
  mediaTypes: {
    banner: {sizes: [[300, 250]]}
  },
  bids: [{
    bidder: 'appnerve',
    params: {sourceId: '74000976'}
  }]
}];
```

Replace the sample ID with the permanent community-review source selected in
the Appnerve Prebid onboarding panel. Keep separate active sources and safe
creatives for video, native, and audio when declaring those formats.
