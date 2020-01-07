# Overview

**Module Name**: Somo Audience Bidder Adapter  
**Module Type**: Bidder Adapter  
**Maintainer**: prebid@somoaudience.com
# Description
Connects to Somo Audience demand source.  
Please use ```somo``` as the bidder code.  

For video integration, somoAudience returns content as vastXML and requires the publisher to define the cache url in config passed to Prebid for it to be valid in the auction
# Test Site Parameters
```
    var adUnits = [{
      code: 'banner-ad-div',
      sizes: [[300, 250]],
      bids: [{
          bidder: 'somo',
          params: {
              placementId: '22a58cfb0c9b656bff713d1236e930e8'
          }
      }]
    }];
```
# Test App Parameters
```
var adUnits = [{
  code: 'banner-ad-div',
  sizes: [[300, 250]],
  bids: [{
      bidder: 'somo',
      params: {
          placementId: '22a58cfb0c9b656bff713d1236e930e8',
          app: {
            bundle: 'com.somoaudience.apps',
            storeUrl: 'http://somoaudience.com/apps',
            domain: 'somoaudience.com',
          }
      }
  }]
}];
```
