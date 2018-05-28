# Overview

**Module Name**: Adxcg Bidder Adapter
**Module Type**: Bidder Adapter
**Maintainer**: info@adxcg.com

# Description

Module that connects to an Adxcg.com zone to fetch bids.

# Test Parameters
```
   ``
       var adUnits = [{
         code: 'banner-ad-div',
         sizes: [[300, 250]],
         bids: [{
                  bidder: 'adxcg',
                  params: {
                    adzoneid: '1'
                  }
                }]
       },{
         code: 'native-ad-div',
         sizes: [[300, 250], [1, 1]],
         nativeParams: {
                             title: { required: true, len: 75 },
                             image: { required: true },
                             body: { len: 200 },
                             sponsoredBy: { len: 20 }
         },
         bids: [{
                  bidder: 'adxcg',
                  params: {
                    adzoneid: '2379'
                  }
                }
         }]
       },{
         code: 'video',
         sizes: [[640, 480]],
         bids: [{
                   bidder: 'adxcg',
                    params: {
                      adzoneid: '20'
                    }
                }
         }]
       }];
```
