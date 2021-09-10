# Overview

```
Module Name:  Bright Mountain Media Bidder Adapter
Module Type:  Bidder Adapter
Maintainer: dev@brightmountainmedia.com
```

# Description

Connects to Bright Mountain Media exchange for bids.

Bright Mountain Media bid adapter currently supports Banner and Video.

# Sample Ad Unit: For Publishers

## Sample Banner only Ad Unit

```
var adUnits = [
      {
        code: 'postbid_iframe',
        mediaTypes: {
          banner: {
            sizes: [[300, 250]]
          }
        },
        bids: [
          {
            "bidder": "bmtm",
            "params": {
              "placement_id": 1
            }
          }
        ]
      }
    ];
```

## Sample Video only Ad Unit: Outstream

```
var adUnits = [
    {
        code: 'postbid_iframe_video',
        mediaTypes: {
          video: {
            playerSize: [[640, 480]],
            context: 'outstream'
            ... // Additional ORTB video params 
          }
        },
        bids: [
          {
            bidder: "bmtm",
            params: {
              placement_id: 1
            }
          }
        ],
        renderer: {
          url: 'https://acdn.adnxs.com/video/outstream/ANOutstreamVideo.js',
          render: function (bid) {
            adResponse = {
              ad: {
                video: {
                  content: bid.vastXml,
                  player_height: bid.height,
                  player_width: bid.width
                }
              }
            }
            // push to render queue because ANOutstreamVideo may not be loaded yet.
            bid.renderer.push(() => {
              ANOutstreamVideo.renderAd({
                targetId: bid.adUnitCode,
                adResponse: adResponse
              });
            });
          }
        }
      }
];

```

## Sample Video only Ad Unit: Instream

```
var adUnits = [
    {
        code: 'postbid_iframe_video',
        mediaTypes: {
          video: {
            playerSize: [[640, 480]],
            context: 'instream'
            ... // Additional ORTB video params 
          },
        },
        bids: [
          {
            bidder: "bmtm",
            params: {
              placement_id: 1
            }
          }
        ]
      }
];

```
