# Overview

```
Module Name:  DXTech Bid Adapter
Module Type:  Bidder Adapter
Maintainer:   support@dxtech.ai
```

# Description

Module that connects to DXTech's demand sources.
DXTech bid adapter supports Banner and Video.


# Test Parameters

## Banner

```
var adUnits = [
    {
        code: 'banner-ad-div',
        mediaTypes: {
            banner: {
                sizes: [[300, 250], [300,600]]
            }
        },
        bids: [{
            bidder: 'dxtech',
            params: {
                placementId: 'test',
                publisherId: 'test',
                bidfloor: 2.7,
                bidfloorcur: 'USD'
            }
        }]
    }
];
```

## Video

We support the following OpenRTB params that can be specified in `mediaTypes.video` or in `bids[].params.video`
- 'mimes',
- 'minduration',
- 'maxduration',
- 'plcmt',
- 'protocols',
- 'startdelay',
- 'skip',
- 'skipafter',
- 'minbitrate',
- 'maxbitrate',
- 'delivery',
- 'playbackmethod',
- 'api',
- 'linearity'


## Instream Video adUnit using mediaTypes.video
*Note:* By default, the adapter will read the mandatory parameters from mediaTypes.video.
*Note:* The Video SSP ad server will respond with an VAST XML to load into your defined player.
```
  var adUnits = [
    {
        code: 'video1',
          mediaTypes: {
            video: {
                  context: 'instream',
                  playerSize: [640, 480],
                  mimes: ['video/mp4', 'application/javascript'],
                  protocols: [2,5],
                  api: [2],
                  position: 1,
                  delivery: [2],
                  minduration: 10,
                  maxduration: 30,
                  plcmt: 1,
                  playbackmethod: [1,5],
            }
          },
          bids: [
            {
              bidder: 'dxtech',
              params: {
                bidfloor: 0.5,
                publisherId: '12345',
                placementId: '6789'
              }
            }
          ]
      }
  ]
```

# End To End testing mode
By passing bid.params.e2etest = true you will be able to receive a test creative

## Banner
```
var adUnits = [
    {
        code: 'banner-ad-div',
        mediaTypes: {
            banner: {
                sizes: [[300, 250], [300,600]]
            }
        },
        bids: [{
            bidder: 'dxtech',
            params: {
                e2etest: true
            }
        }]
    }
];
```

## Video
```
var adUnits = [
    {
      code: 'video1',
      mediaTypes: {
        video: {
          context: "instream",
          playerSize: [[640, 480]],
          mimes: ['video/mp4'],
          protocols: [2,5],
        }
      },
      bids: [
        {
          bidder: 'dxtech',
          params: {
            e2etest: true
          }
        }
      ]
    }
]
```
