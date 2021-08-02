# Overview

```
Module Name: Impactify Bidder Adapter
Module Type: Bidder Adapter
Maintainer: thomas.destefano@impactify.io
```

# Description

Module that connects to the Impactify solution.
The impactify bidder need 3 parameters:
    - appId : This is your unique publisher identifier
    - format : This is the ad format needed, can be : screen or display
    - style : This is the ad style needed, can be : inline, impact or static

# Test Parameters
```
    var adUnits = [{
      code: 'your-slot-div-id', // This is your slot div id
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
```
