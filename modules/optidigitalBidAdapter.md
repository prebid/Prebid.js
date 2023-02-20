# Overview

**Module Name**: OptiDigital Bidder Adapter  
**Module Type**: Bidder Adapter  
**Maintainer**: prebid@optidigital.com

# Description

Bidder Adapter for Prebid.js.

## AdUnits configuration example
```
    var adUnits = [{
      code: 'your-slot_1-div', //use exactly the same code as your slot div id.
      mediaTypes: {
        banner: {
            sizes: [[300,600]]
        }
      },
      bids: [{
          bidder: 'optidigital',
          params: {
            publisherId: 'test',
            placementId: 'Billboard_Top',
            divId: 'Billboard_Top_3c5425', // optional parameter
            pageTemplate: 'home', // optional parameter
            badv: ['example.com'], // optional parameter
            bcat: ['IAB1-1'], // optional parameter
            bapp: ['com.blocked'], // optional parameter 
            battr: [1, 2] // optional parameter 
          }
      }]
    }];
```

## UserSync example

```
pbjs.setConfig({
  userSync: {
    iframeEnabled: true,
    syncEnabled: true,
    syncDelay: 3000
  }
});
```
