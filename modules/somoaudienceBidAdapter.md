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
              placement: 'abc'
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
          placement: 'abc',
          app: {
            bundle: 'com.somoaudience.apps',
            storeUrl: 'http://somoaudience.com/apps',
            domain: 'somoaudience.com',
          }
      }
  }]
}];
```
