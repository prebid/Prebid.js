## Konduit video tags wrapper

Konduit Wrapper is a prebid module to generate Konduit wrapped VAST tag URLs for a provided bid or a winning bid.


### Setup

```
pbjs.que.push(function(){
  pbjs.addAdUnits(videoAdUnit);
  pbjs.requestBids({
    timeout : 700,
    bidsBackHandler : function(bids) {
      var videoUrl = pbjs.adServers.konduit.buildVastUrl({
        bid: winnerBid,
        params: {
          konduit_id: 'your_konduit_id'
        }
      });
        
      invokeVideoPlayer(vastTagUrl);
    }
  });
});
```

Function parameters:
* `bid` - prebid object with VAST url that should be wrapped (if not passed first winning bid from `auctionManager.getWinningBids()` is used)
* `konduit_id` - your personal unique Konduit identifier (required)

The function returns a Konduit wrapped VAST url if valid parameters are passed in. If some of the parameters are not passed or are invalid the function returns 'null' along with related error logs providing more details.


### Building Prebid with the Konduit wrapper function

Your Prebid build must include the **konduitWrapper** module. Follow the build instructions for Prebid as explained in the top level README.md file of the Prebid source tree.

ex: $ gulp build --modules=konduitWrapper

