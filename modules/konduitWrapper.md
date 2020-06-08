# Overview

```
Module Name:  Konduit Accelerate
Module Type:  Video Module
Maintainer:   support@konduit.me
```

# Description

Konduit Wrapper is a prebid module that allows
- wrapping a bid response so that it is processed through Konduit platform
- obtaining a historical performance indicator for a bid


# Configuration

## Building Prebid with the Konduit wrapper function

Your Prebid build must include the **konduitWrapper** module. Follow the build instructions for Prebid as explained in the top level README.md file of the Prebid source tree.

ex: $ gulp build --modules=konduitWrapper


## Prebid related configuration

Konduit module should be used with a valid Konduit identifier.

```javascript
pbjs.setConfig({
  konduit: {
    konduitId: your_konduit_id,
  }
});
```

Please contact support@konduit.me for assistance.


## GAM related configuration

It is important to configure your GAM line items. 
Please contact support@konduit.me for assistance.

In most cases it would require only Creative VAST URL update with the following URL:
```
https://p.konduit.me/api/vastProxy?konduit_hb=1&konduit_hb_awarded=1&konduit_cache_key=%%PATTERN:konduit_cache_key%%&konduit_id=%%PATTERN:konduit_id%%
```


# Usage

Konduit module contains a single function that accepts an `options` parameter.

The `options` parameter can include:
* `bid` - prebid object with VAST url that should be cached (if not passed first winning bid from `auctionManager.getWinningBids()` will be used)
* `adUnitCode` - adUnitCode where a winner bid can be found
* `timeout` - max time to wait for Konduit response with cache key and kCpm data
* `callback` - callback function is called once Konduit cache data for the bid. Arguments of this function are - `error` and `bids` (error should be `null` if Konduit request is successful)

The function adds two parameters into the passed bid - kCpm and konduitCacheKey. Additionally `processBids` updates bid's `adserverTargeting` with `k_cpm`, `konduti_cache_key` and `konduit_id` fields.


```javascript
pbjs.requestBids({
    bidsBackHandler: function (bids) {
        pbjs.adServers.konduit.processBids({
            callback: function (error, bids) {
                var videoUrl = pbjs.adServers.dfp.buildVideoUrl({
                    ...
                });
            }
        });
    }
})
```


# Sample code

```javascript
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
  pbjs.setConfig({
    konduit: {
      konduitId: 'your_konduit_id',
    },
  });

  pbjs.requestBids({
    bidsBackHandler : function(bids) {
      var winnerBid = pbjs.getHighestCpmBids('videoAd')[0];
      pbjs.adServers.konduit.processBids({
        bid: winnerBid,
        adUnitCode: videoAdUnit[0].code,
        timeout: 2000,
        callback: function (error, processedBids) {
          var vastTagUrl = pbjs.adServers.dfp.buildVideoUrl({
            adUnit: videoAdUnit,
            params: {
                iu: '<gam ad unit>',
                output: 'vast',
            },
          });

          invokeVideoPlayer(vastTagUrl);
        }
      });
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



