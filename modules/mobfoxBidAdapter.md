# Overview

```
Module Name: Mobfox Bidder Adapter
Module Type: Bidder Adapter
Maintainer: solutions-team@matomy.com
```

# Description

Module that connects to Mobfox's demand sources

# Test Parameters
```
    var adUnits = [{
                code: 'div-gpt-ad-1460505748561-0',
                sizes: [[320, 480], [300, 250], [300,600]],
    
                // Replace this object to test a new Adapter!
                bids: [{
                    bidder: 'mobfox',
                    params: {
                        s: "267d72ac3f77a3f447b32cf7ebf20673", // required - The hash of your inventory to identify which app is making the request,
                        imp_instl: 1 // optional - set to 1 if using interstitial otherwise delete or set to 0
                    }
                }]
    
            }];
```
