# Overview

```
Module Name: VideoByte Bidder Adapter
Module Type: Bidder Adapter
Maintainer: prebid@videobyte.com
```

# Description

Module that connects to VideoByte's demand sources

*Note:* The Video SSP ad server will respond with an VAST XML to load into your defined player.

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
                  placement: 1,
                  playbackmethod: [1,5],
                  protocols: [2,5],
                  api: [2],
            }
          },
          bids: [
            {
              bidder: 'videobyte',
              params: {
                bidfloor: 0.5,
                pubId: 'e2etest'
              }
            }
          ]
      }
  ]
```

## Instream Video adUnit with placement, nid and content params
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
                  placement: 1,
                  playbackmethod: [1,5],
                  protocols: [2,5],
                  api: [2],
            }
          },
          bids: [
            {
                  bidder: 'videobyte',
                  params: {
                    bidfloor: 0.5,
                    pubId: 'e2etest',
                    placementId: '1234567',
                    nid: '1234',
                    video: {
                      content:{
                        id: "uuid",
                        url: "https://videobyte.com/awesome-video.mp4",
                        title: "Awesome video",
                        genre: "Comedy",
                        language: "en",
                        season: "1",
                        series: "1",
        
                      }
                    }
                  }
                }
          ]
      }
  ]
```

# End To End testing mode
By passing bid.params.video.e2etest = true you will be able to receive a test creative

```
var adUnits = [
    {
      code: 'video-1',
      mediaTypes: {
        video: {
          context: "instream",
          playerSize: [[640, 480]],
          mimes: ['video/mp4'],
        }
      },
      bids: [
        {
          bidder: 'videobyte',
          params: {
            video: {
              e2etest: true
            }
          }
        }
      ]
    }
]
```
