# Overview

```
Module Name:  envivo Bid Adapter
Module Type:  Bidder Adapter
Maintainer :  adtech@nvivo.tv
```

# Description

Connects to Envivo Ad Server for bids.

envivo bid adapter supports Banner and Video.

# Test Parameters
```
 var adUnits = [
   //bannner object
   {
          code: 'banner-ad-slot',
          mediaTypes: {
            banner: {
              sizes: [[300, 250]],
            }
          },
          bids: [{
            bidder: 'envivo',
            params: {
              publisherId: 14
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
              bidder: "envivo",
              params: {
                publisherId: 14
              }
            }]
          }];
```
