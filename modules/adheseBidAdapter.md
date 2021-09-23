# Overview

```
Module Name: Adhese Bidder Adapter
Module Type: Bidder Adapter
Maintainer: info@adhese.com 
```

# Description

Module that connects with Adhese Adserver and Adhese Gateway. Banner and Video are supported.

# Test Parameters
```
    var adUnits = [
        {
            code: 'test-div1',
            mediaTypes: {
                banner: {
                    sizes: [[728, 90], [850, 150]],  // a display size
                }
            },
            bids: [
                {
                    bidder: "adhese",
                    params: {
                        account: 'demo',                   // required - the name of your adhese account, if unknown, please contact your sales rep
                        location: '_adhese_prebid_demo_',  // required - the location you want to refer to for a specific section or page, as defined in your Adhese inventory
                        format: 'leaderboard',             // required - the format you accept for this unit, as defined in your Adhese inventory
                        data: {                            // optional - target params, as defined in your Adhese setup
                            'ci': ['gent', 'brussels']
                            'ag': ['55']
                            'tl': ['all']
                        }
                    }
                }
            ]
        }
    ];
```
