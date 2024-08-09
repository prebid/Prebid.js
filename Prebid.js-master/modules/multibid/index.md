# Overview

Module Name: multibid

Purpose: To expand the number of key value pairs going to the ad server in the normal Prebid way by establishing the concept of a "dynamic alias" -- a bidder code that exists only on the response, not in the adunit. 


# Description
Allowing a single bidder to multi-bid into an auction has several use cases:

1. allows a bidder to provide both outstream and banner
2. supports the video VAST fallback scenario
3. allows one bid to be blocked in the ad server and the second one still considered
4. add extra high-value bids to the cache for future refreshes


# Example of using config
```
    pbjs.setConfig({
        multibid: [{
            bidder: "bidderA",
            maxBids: 3,
            targetBiddercodePrefix: "bidA"
        },{
            bidder: "bidderB",
            maxBids: 3,
            targetBiddercodePrefix: "bidB"
        },{
            bidder: "bidderC",
            maxBids: 3
        },{
            bidders: ["bidderD", "bidderE"],
            maxBids: 2
        }]
    });
```

# Please Note:
- 

