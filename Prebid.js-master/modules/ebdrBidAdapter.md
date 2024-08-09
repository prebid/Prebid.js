# Overview

```
Module Name:  EngageBDR Bid Adapter
Module Type:  Bidder Adapter
Maintainer:	  tech@engagebdr.com 
```

# Description

Adapter that connects to EngageBDR's demand sources.

# Test Parameters
```
    var adUnits = [{
        code: 'div-gpt-ad-1460505748561-0',
        mediaTypes: {
            banner: {
                sizes: [[300, 250], [300,600]],
            }
        },
        bids: [{
            bidder: 'ebdr',
            params: {
               zoneid: '99999',
               bidfloor: '1.00',
               IDFA:'xxx-xxx',
               ADID:'xxx-xxx',
               latitude:'34.089811',
               longitude:'-118.392805'
            }
        }]
    },{
        code: 'test-video',
        mediaTypes: {
            video: {
                context: 'instream',
                playerSize: [300, 250]
            }
        },
         bids: [{
            bidder: 'ebdr',
            params: {
               zoneid: '99998',
               bidfloor: '1.00',
               IDFA:'xxx-xxx',
               ADID:'xxx-xxx',
               latitude:'34.089811',
               longitude:'-118.392805'
            }
        }]
    }];
```
