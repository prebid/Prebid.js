# Overview

```
Module Name:  djax Bid Adapter
Module Type:  Bidder Adapter
Maintainer :  support@djaxtech.com
```

# Description

Connects to Djax Ad Server for bids.

djax bid adapter supports Banner and Video.

# Test Parameters
```
 var adUnits = [
   //bannner object
   {
          code: 'banner-ad-slot',
          mediaTypes: {
            banner: {
              sizes: [[300, 250], [300,600]],
            }
          },
          bids: [{
            bidder: 'djax',
            params: {
              publisherId: 2
            }
          }]
  
        },
      //video object
      {
         code: 'video-ad-slot',
         mediaTypes: {
              video: {
                context: 'instream',
                playerSize: [640, 480],
              },
            },
            bids: [{
              bidder: "djax",
              params: {
                publisherId: 2
              }
            }]
          }];
```