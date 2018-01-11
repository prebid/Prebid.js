# Overview

**Module Name**: Somo Audience Bidder Adapter  
**Module Type**: Bidder Adapter  
**Maintainer**: prebid@somoaudience.com
# Description
Connects to Somo Audience demand source.  
Please use ```somoaudience``` as the bidder code.  
# Test Site Parameters
```
    var adUnits = [{
      code: 'banner-ad-div',
      sizes: [[300, 250]],
      bids: [{
          bidder: 'somoaudience',
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
      bidder: 'somoaudience',
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
