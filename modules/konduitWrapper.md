## Konduit video tags wrapper

Konduit Wrapper is a prebid module to generate Konduit wrapped VAST tag URLs for a provided bid or a winning bid.


### Setup

```
var videoAdUnit = [{
  code: 'videoAd',
  mediaTypes: {
    video: {
      playerSize: [640, 480],
      context: 'instream'
    }
  },
  bids: [{
    bidder: 'appnexus',
    params: {
      placementId: 13232361,
      video: {
        skippable: true,
        playback_method: ['auto_play_sound_off']
      }
    }
  }]
}];

pbjs.que.push(function(){
  pbjs.addAdUnits(videoAdUnit);
  pbjs.requestBids({
    timeout : 700,
    bidsBackHandler : function(bids) {
      var winnerBid = pbjs.getHighestCpmBids('videoAd')[0];
      var vastTagUrl = pbjs.adServers.konduit.buildVastUrl({
        bid: winnerBid, // just in case if you want to pass your bid
        params: {
          konduit_id: 'your_konduit_id'
        }
      });
        
      invokeVideoPlayer(vastTagUrl);
    }
  });
});

function invokeVideoPlayer(vastTagUrl) {
    videojs("video_player_id").ready(function() {
      this.vastClient({
        adTagUrl: vastTagUrl,
        playAdAlways: true,
        verbosity: 4,
        autoplay: true
      });

      this.play();
    });
  }
```

Function parameters:
* `bid` - prebid object with VAST url that should be wrapped (if not passed first winning bid from `auctionManager.getWinningBids()` is used)
* `konduit_id` - your personal unique Konduit identifier (required)

The function returns a Konduit wrapped VAST url if valid parameters are passed in. If some of the parameters are not passed or are invalid the function returns 'null' along with related error logs providing more details.


### Building Prebid with the Konduit wrapper function

Your Prebid build must include the **konduitWrapper** module. Follow the build instructions for Prebid as explained in the top level README.md file of the Prebid source tree.

ex: $ gulp build --modules=konduitWrapper

