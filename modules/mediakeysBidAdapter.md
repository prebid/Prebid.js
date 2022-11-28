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

The Mediakeys adapter accepts any valid OpenRTB Spec 2.5 property.

```javascript
var adUnits = [{
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
}]
```

## Native only Ad Unit

The Mediakeys adapter accepts two optional params for native requests. Please see the [OpenRTB Native Ads Specification](https://www.iab.com/wp-content/uploads/2018/03/OpenRTB-Native-Ads-Specification-Final-1.2.pdf) for valid values.

```javascript
var adUnits = [{
    code: 'test',
    mediaTypes: {
        native: {
            title: {
                required: true,
                len: 120
            },
            image: {
                required: true,
                sizes: [300, 250]
            }
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
}]
```

## Video only Ad Unit

The Mediakeys adapter accepts any valid openRTB 2.5 video property. Properties can be defined at the adUnit `mediaTypes.video` or `bid[].params` level.

### Outstream context

```javascript
var adUnits = [{
    code: 'test',
    mediaTypes: {
        video: {
            context: 'outstream',
            playerSize: [1280, 720],
            // additional OpenRTB video params
            // placement: 2,
            // api: [1],
            // …
            mimes: ['video/mp4'],
            protocols: [2, 3],
            skip: 0
        }
    },
    renderer: {
        url: 'https://acdn.adnxs.com/video/outstream/ANOutstreamVideo.js',
        // the render method must fetch the vast xml document before displaying video
        render: function (bid) {
            var adResponse = fetch(bid.vastUrl).then(resp => resp.text()).then(text => ({
                ad: {
                    video: {
                        content: text,
                        player_height: bid.playerHeight,
                        player_width: bid.playerWidth
                    }
                }
            }))

            adResponse.then((content) => {
                bid.renderer.push(() => {
                    ANOutstreamVideo.renderAd({
                        targetId: bid.adUnitCode,
                        adResponse: content
                    });
                });
            })
        }
    },
    bids: [{
        bidder: 'mediakeys',
        params: {
            video: {
                // additional OpenRTB video params.
                // will be merged with params defined at mediaTypes level
                api: [1]
            }
        }
    }]
}]
```

### Instream context

For Instream Video, you have to enable the Instream Tracking Module to have Prebid emit the onBidWon required event.

```javascript
var adUnits = [{
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
            // additional OpenRTB video params.
            // will be merged with params defined at mediaTypes level
        }
    }]
}]
```
