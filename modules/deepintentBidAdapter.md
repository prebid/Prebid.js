# Overview

```
Module Name: Deepintent Bidder Adapter
Module Type: Bidder Adapter
Maintainer: prebid@deepintent.com
```

# Description

Deepintent currently supports the BANNER type ads through prebid js

Module that connects to Deepintent's demand sources.

# Banner Test Request
```
  var adUnits = [
    {
      code: 'di_adUnit1',
      mediaTypes: {
        banner: {
            sizes: [[300, 250]],  // a display size, only first one will be picked up since multiple ad sizes are not supported yet 
        }
      }
      bids: [
        {
            bidder: 'deepintent',
            params: {
                tagId: '1300',  // Required parameter
                w: 300,   // Width and Height here will override sizes in mediatype
                h: 250,
                pos: 1,
                custom: {              // Custom parameters in form of key value pairs
                    user_min_age: 18
                }
            }
        }
      ]
    }
  ];
```

###Recommended User Sync Configuration

```javascript
pbjs.setConfig({
   userSync: {
    iframeEnabled: true,
    enabledBidders: ['deepintent'],
    syncDelay: 3000
 }});


```
