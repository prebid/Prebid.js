# Overview

```
Module Name: Deepintent Bidder Adapter
Module Type: Bidder Adapter
Maintainer: prebid@deepintent.com
```

# Description

Deepintent currently supports the BANNER and VIDEO type ads through prebid js

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

# Sample Video Ad Unit
```
var adVideoAdUnits = [
{
    code: 'test-div-video',
    mediaTypes: {
        video: {
            playerSize: [640, 480],           // required
            context: 'instream'               //required
        }
    },
    bids: [{
      bidder: 'deepintent',
      params: {
        tagId: '1300',  // Required parameter                 // required
        video: {
          mimes: ['video/mp4','video/x-flv'],   // required
          skippable: true,                      // optional
          minduration: 5,                       // optional
          maxduration: 30,                      // optional
          startdelay: 5,                        // optional
          playbackmethod: [1,3],                // optional
          api: [ 1, 2 ],                        // optional
          protocols: [ 2, 3 ],                  // optional
          battr: [ 13, 14 ],                    // optional
          linearity: 1,                         // optional
          plcmt: 2,                             // optional
          minbitrate: 10,                       // optional
          maxbitrate: 10                        // optional
        }
      }
    }]
}]
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
