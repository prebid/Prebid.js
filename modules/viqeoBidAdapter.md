# Overview

**Module Name**: Viqeo Bidder Adapter
**Module Type**: Bidder Adapter
**Maintainer**: muravjovv1@gmail.com

# Description

Viqeo Bidder Adapter for Prebid.js. About: https://viqeo.tv/

# Test Parameters
```
    var adUnits = [{
      code: 'your-slot', // use exactly the same code as your slot div id.
      mediaTypes: {
          banner: {
              sizes: [[640, 480]]
          }
      },
      bids: [{
        bidder: 'viqeo',
        params: { 
            user: {
                buyeruid: '1',
            },
            playerOptions: {
                videoId: 'ed584da454c7205ca7e4',
                profileId: 1382,
            },
            test: 1,
        }
      }]
    }];
```
