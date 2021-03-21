# Overview

```
Module Name: AdDefend Bid Adapter
Module Type: Bidder Adapter
Maintainer: prebid@addefend.com
```

# Description

Module that connects to AdDefend as a demand source. 

## Parameters
| Param        | Description           | Optional  | Default  |
| ------------- | ------------- | ----- | ----- |
| pageId | id assigned to the website in the AdDefend system. (ask AdDefend support) | no | - |
| placementId | id of the placement in the AdDefend system.  (ask AdDefend support) | no | - |
| trafficTypes | comma seperated list of the following traffic types:<br/>ADBLOCK - user has a activated adblocker<br/>PM - user has firefox private mode activated<br/>NC - user has not given consent<br/>NONE - user traffic is none of the above, this usually means this is a "normal" user.<br/>| yes | ADBLOCK |


# Test Parameters
```
    var adUnits = [
        {
            code: 'test-div',
            mediaTypes: {
                banner: {
                    sizes: [[970, 250]],  // a display size
                }
            },
            bids: [
                {
                    bidder: "addefend",
                    params: {
                        pageId: "887",
                        placementId: "9398",
                        trafficTypes: "ADBLOCK"
                    }
                }
            ]
        }
    ];
```
