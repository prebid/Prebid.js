# Overview

Module Name: multibid

Purpose: To expand the number of key value pairs going to the ad server in the normal Prebid way by establishing the concept of a "dynamic alias" -- a bidder code that exists only on the response, not in the adunit. 


# Description



# Example of using config
```
    pbjs.setConfig({
        multibid: [{
            bidder: "bidderA",
            maxbids: 3,
            targetbiddercodeprefix: "bidA"
        },{
            bidder: "bidderB",
            maxbids: 3,
            targetbiddercodeprefix: "bidB"
        },{
            bidder: "bidderC",
            maxbids: 3
        }]
    });
```

# Please Note:
- 

