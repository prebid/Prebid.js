# Overview

```
Module Name: Mediakeys Bid Adapter
Module Type: Bidder Adapter
Maintainer: prebidjs@mediakeys.com
```

# Description

Connects to Mediakeys demand source to fetch bids.

# Test Parameters

## Banner only Ad Unit

```
var adUnits = [
{
    code: 'test',
    mediaTypes: {
        banner: {
            sizes: [[300, 250], [300, 600]],
        }
    },
    bids: [{
        bidder: 'mediakeys',
        params: {} // no params required.
    }]
},
```

## Native only Ad Unit

The Mediakeys adapter accepts two optional params for native requests. Please see the [OpenRTB Native Ads Specification](https://www.iab.com/wp-content/uploads/2018/03/OpenRTB-Native-Ads-Specification-Final-1.2.pdf) for valid values.

```
var adUnits = [
{
    code: 'test',
    mediaTypes: {
        native: {
            type: 'image',
        }
    },
    bids: [{
        bidder: 'mediakeys',
        params: {
            native: {
                context: 1, // ORTB Native Context Type IDs. Default `1`.
                plcmttype: 1, // ORTB Native Placement Type IDs. Default `1`.
            }
        }
    }]
},
```

## Video only Ad Unit

The Mediakeys adapter accepts any valid openRTB 2.5 video property. Properties can be defined at the adUnit `mediaTypes.video` or `bid[].params` level.

### Outstream context

```
var adUnits = [
{
    code: 'test',
    mediaTypes: {
        video: {
            context: 'outstream',
            playerSize: [300, 250],
            // additional OpenRTB video params
            // placement: 2,
            // api: [1],
            // …
        }
    },
    renderer: {
        url: 'https://acdn.adnxs.com/video/outstream/ANOutstreamVideo.js',
        render: function (bid) {
            var bidReqConfig = pbjs.adUnits.find(bidReq => bidReq.bidId === bid.impid);

            if (bidReqConfig && bidReqConfig.mediaTypes && bidReqConfig.mediaTypes.video && bidReqConfig.mediaTypes.video.context === 'outstream') {
                var adResponse = fetch(bid.vastUrl).then(resp => resp.text()).then(text => ({
                    ad: {
                        video: {
                            content: text,
                            player_width: bid.width || bidReqConfig.mediaTypes.video.playerSize[0],
                            player_height: bid.height || bidReqConfig.mediaTypes.video.playerSize[1],
                        }
                    }
                }))

                adResponse.then((ad) => {
                    bid.renderer.push(() => {
                        ANOutstreamVideo.renderAd({
                            targetId: bid.adUnitCode,
                            adResponse: ad
                        });
                    });
                })
            }
        }
    },
    bids: [{
        bidder: 'mediakeys',
        params: {
            video: {
                // additional OpenRTB video params. Will be merged with params defined at mediaTypes level
            }
        }
    }]
},
```

### Instream context

```
var adUnits = [
{
    code: 'test',
    mediaTypes: {
        video: {
            context: 'instream',
            playerSize: [300, 250],
            // additional OpenRTB video params
            // placement: 2,
            // api: [1],
            // …
        }
    },
    bids: [{
        bidder: 'mediakeys',
        params: {
            // additional OpenRTB video params. Will be merged with params defined at mediaTypes level
        }
    }]
},
```
