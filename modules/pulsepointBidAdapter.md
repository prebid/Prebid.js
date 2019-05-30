# Overview

**Module Name**: PulsePoint Bidder Adapter  
**Module Type**: Bidder Adapter  
**Maintainer**: ExchangeTeam@pulsepoint.com  

# Description

Connects to PulsePoint demand source to fetch bids.  
Banner, Video and Native formats are supported.  
Please use ```pulsepoint``` as the bidder code.
```pulseLite``` and ```pulsepointLite``` aliases also supported as well.

# Test Parameters
```
    var adUnits = [{
      code: 'banner-ad-div',
      sizes: [[300, 250]],
      bids: [{
          bidder: 'pulsepoint',
          params: { 
              cf: '300X250',
              cp: 512379,
              ct: 486653
          }
      }]
    },{
      code: 'native-ad-div',
      sizes: [[1, 1]],
      nativeParams: {
          title: { required: true, len: 75  },
          image: { required: true  },
          body: { len: 200  },
          sponsoredBy: { len: 20 }
      },
      bids: [{
          bidder: 'pulsepoint',
          params: { 
              cp: 512379,
              ct: 505642
          }
      }]
    }];
```
