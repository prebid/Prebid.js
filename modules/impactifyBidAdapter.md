# Overview

```
Module Name: Impactify Bidder Adapter
Module Type: Bidder Adapter
Maintainer: programmatic@impactify.io
```

# Description

Module that connects to the Impactify solution.
The impactify bidder need 3 parameters:
- appId : This is your unique publisher identifier
- format : This is the ad format needed, can be : screen or display (Only for video media type)
- style : This is the ad style needed, can be : inline, impact or static (Only for video media type)

Note : Impactify adapter need storage access to work properly (Do not forget to set storageAllowed to true).

# Test Parameters
```
    pbjs.bidderSettings = {
        impactify: {
            storageAllowed: true // Mandatory
        }
    };
    
    var adUnitsVideo = [{
      code: 'your-slot-div-id-video', // This is your slot div id
      mediaTypes: {
          video: {
              context: 'outstream'
          }
      },
      bids: [{
          bidder: 'impactify',
          params: {
              appId: 'example.com',
              format: 'screen',
              style: 'inline'
          }
      }]
    }];
    
    var adUnitsBanner = [{
      code: 'your-slot-div-id-banner', // This is your slot div id
      mediaTypes: {
          banner: {
            sizes: [
                [728, 90]
            ]
         }
      },
      bids: [{
          bidder: 'impactify',
          params: {
              appId: 'example.com',
              format: 'display',
              size: '728x90',
              style: 'static'
          }
      }]
    }];
```
