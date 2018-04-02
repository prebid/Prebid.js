# Overview

**Module Name**: Rtbdemand Lite Bidder Adapter  
**Module Type**: Bidder Adapter  
**Maintainer**: ExchangeTeam@rtbdemand.com  

# Description

Connects to Rtbdemand demand source to fetch bids.  
Banner, Outstream and Native formats are supported.  
Please use ```rtbdemandLite``` as the bidder code.  

# Test Parameters
```
    var adUnits = [{
      code: 'banner-ad-div',
      sizes: [[300, 250]],
      bids: [{
          bidder: 'rtbdemandLite',
          params: { 
              cf: '300X250',
              zoneid: 9999,
              floor: 0.01,
              server: bidding.rtbdemand.com
          }
      }]
    },{
      code: 'banner-ad-div',
      sizes: [[300, 250]],
      bids: [{
          bidder: 'rtbdemandLite',
          params: {
              cf: '300X250',
              zoneid: 9999,
              floor: 0.01,
              server: bidding.rtbdemand.com,
         app: {
               bundle: 'com.rtbdemand.apps',
               storeUrl: 'http://rtbdemand.com/apps',
               domain: 'rtbdemand.com',
               }
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
          bidder: 'rtbdemandLite',
          params: { 
              zoneid: 9999,
              floor: 0.01,
              server: bidding.rtbdemand.com
          }
      }]
    }];
```
