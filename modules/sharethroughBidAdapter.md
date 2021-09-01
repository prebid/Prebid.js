# Overview

```
Module Name: Sharethrough Bidder Adapter
Module Type: Bidder Adapter
Maintainer: pubgrowth.engineering@sharethrough.com
```

# Description

Module that connects to Sharethrough's demand sources

# Test Parameters
```
  var adUnits = [
    {
      code: 'test-div',
      sizes: [[300,250], [1, 1]],
      bids: [
        {
          bidder: "sharethrough",
          params: {
            // REQUIRED - The placement key
            pkey: 'LuB3vxGGFrBZJa6tifXW4xgK',

            // OPTIONAL - Blocked Advertiser Domains
            badv: ['domain1.com', 'domain2.com'],

            // OPTIONAL - Blocked Categories (IAB codes)
            bcat: ['IAB1-1', 'IAB1-2'],

            // OPTIONAL - default bid floor, if not specified in bid request (USD)
            floor: 0.1,
          }
        }
      ]
    }
  ];
```

# Sample Instream Video Ad Unit: For Publishers
```
var adVideoAdUnits = [
{
    code: 'test-div-video',
    mediaTypes: {
        video: {
            // CANNOT be 'outstream'
            context: 'instream', 
            placement: 1,
            delivery: 1,
            companiontype: 'companion type',
            companionad: 'companion ad',
            // default values shown below this point
            pos: 0,
            skip: 0,
            linearity: 1,
            minduration: 5,
            maxduration: 60,
            playbackmethod: [2],
            api: [2],
            mimes: ['video/mp4'],
            protocols: [2, 3, 5, 6, 7, 8],
            playerSize: [640, 360],
            startdelay: 0,
            skipmin: 0,
            skipafter: 0,
        },
    },
    bids: [{
        bidder: 'sharethrough',
        params: {
            pkey: 'pkey1'           
        }
    }]
}]
```

# Sample Banner Ad Unit: For Publishers
```
var adUnits = [
{
    code: 'test-div-video',
    mediaTypes: {
        banner: {
            pos: 0, // default
        },
    },
    bids: [{
      bidder: 'sharethrough',
      params: {
            pkey: 'pkey1'
      }
    }]
}]
```
