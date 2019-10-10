# Overview

```
Module Name:  Advertly Bid Adapter
Module Type:  Bidder Adapter
Maintainer :  support@advertly.com
```

# Description

Connects to Advertly Ad Server for bids.

advertly bid adapter supports Banner and Video.

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
            bidder: 'advertly',
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
              bidder: "advertly",
              params: {
                publisherId: 2
              }
            }]
          }];
```
