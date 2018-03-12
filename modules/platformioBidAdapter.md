# Overview

**Module Name**: Platform.io Bidder Adapter  
**Module Type**: Bidder Adapter  
**Maintainer**: siarhei.kasukhin@platform.io  

# Description

Connects to Platform.io demand source to fetch bids.  
Banner and Native formats are supported.  
Please use ```platformio``` as the bidder code.

# Test Parameters
```
    var adUnits = [{
      code: 'banner-ad-div',
      sizes: [[300, 250]],
      bids: [{
          bidder: 'platformio',
          params: { 
              pubId: '29521', // required
              siteId: '26047', // required
              size: '250X250', // required
              placementId: '123', // required
              bidFloor: '0.001'
          }
      }]
    },{
      code: 'native-ad-div',
      sizes: [[1, 1]],
      nativeParams: {
          title: { required: true, len: 75  },
          image: { required: true  },
          body: { len: 200  },
          sponsoredBy: { len: 20 },
          icon: { required: false }
      },
      bids: [{
          bidder: 'platformio',
          params: { 
              pubId: '29521', // required
              siteId: '26047', // required
              placementId: '123', // required
              bidFloor: '0.001'
          }
      }]
    }];
```
