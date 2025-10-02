# Overview

```
Module Name:  33Across Bid Adapter
Module Type:  Bidder Adapter
Maintainer: headerbidding@33across.com
```

# Description

Connects to 33Across's exchange for bids.

33Across bid adapter supports Banner and Video at present and follows MRA

# Sample Ad Unit: For Publishers
## Sample Banner only Ad Unit
```
var adUnits = [
{
  code: '33across-hb-ad-123456-1', // ad slot HTML element ID
  mediaTypes: {
    banner: {
      sizes: [
          [300, 250],
          [728, 90]
      ]
    }
  }
  bids: [{
    bidder: '33across',
    params: {
        zoneId: 'sample33xGUID123456789',
        productId: 'siab'
    }
  }]
}
```

## Sample Video only Ad Unit: Outstream
```
var adUnits = [
{
  code: '33across-hb-ad-123456-1', // ad slot HTML element ID
  mediaTypes: {
    video: {
      playerSize: [300, 250],
      context: 'outstream',
      plcmt: 4 // Video ads that are played without streaming video content
      ... // Additional ORTB video params
    }
  },
  renderer: {
    url: 'https://acdn.adnxs.com/video/outstream/ANOutstreamVideo.js',
    render: function (bid) {
        adResponse = {
            ad: {
                video: {
                    content: bid.vastXml,
                    player_height: bid.playerHeight,
                    player_width: bid.playerWidth
                }
            }
        }
        // push to render queue because ANOutstreamVideo may not be loaded yet.
        bid.renderer.push(() => {
            ANOutstreamVideo.renderAd({
                targetId: bid.adUnitCode, // target div id to render video.
                adResponse: adResponse
            });
        });
    }
  },
  bids: [{
    bidder: '33across',
    params: {
        zoneId: 'sample33xGUID123456789',
        productId: 'siab'
    }
  }]
}
```

## Sample Multi-Format Ad Unit: Outstream
```
var adUnits = [
{
  code: '33across-hb-ad-123456-1', // ad slot HTML element ID
  mediaTypes: {
    banner: {
      sizes: [
          [300, 250],
          [728, 90]
      ]
    },
    video: {
      playerSize: [300, 250],
      context: 'outstream',
      plcmt: 4 // Video ads that are played without streaming video content
      ... // Additional ORTB video params
    }
  },
  renderer: {
    url: 'https://acdn.adnxs.com/video/outstream/ANOutstreamVideo.js',
    render: function (bid) {
        adResponse = {
            ad: {
                video: {
                    content: bid.vastXml,
                    player_height: bid.playerHeight,
                    player_width: bid.playerWidth
                }
            }
        }
        // push to render queue because ANOutstreamVideo may not be loaded yet.
        bid.renderer.push(() => {
            ANOutstreamVideo.renderAd({
                targetId: bid.adUnitCode, // target div id to render video.
                adResponse: adResponse
            });
        });
    }
  },
  bids: [{
    bidder: '33across',
    params: {
        zoneId: 'sample33xGUID123456789',
        productId: 'siab'
    }
  }]
}
```

## Sample Video only Ad Unit: Instream
```
var adUnits = [
{
  code: '33across-hb-ad-123456-1', // ad slot HTML element ID
  mediaTypes: {
    video: {
      playerSize: [300, 250],
      context: 'intstream',
      plcmt: 1
      ... // Additional ORTB video params
    }
  }
  bids: [{
    bidder: '33across',
    params: {
        zoneId: 'sample33xGUID123456789',
        productId: 'instream'
    }
  }]
}
```
