# Overview

```
Module Name:  TRUSTX 2.0 Bid Adapter
Module Type:  Bidder Adapter
Maintainer:   prebid@trustx.org
```

# Description

Module that connects to TRUSTX's premium demand sources.
TRUSTX 2.0 bid adapter supports Banner and Video ad formats with advanced targeting capabilities.

# Test Parameters

## Banner

```
var adUnits = [
    {
        code: 'trustx-banner-container',
        mediaTypes: {
            banner: {
                sizes: [[300, 250], [300, 600], [728, 90]]
            }
        },
        bids: [{
            bidder: 'trustx2',
            params: {
                placementId: 'trustx-placement-1',
                publisherId: 'trustx-pub-5678',
                bidfloor: 3.25,
                bidfloorcur: 'USD'
            }
        }]
    }
];
```

## Video

We support the following OpenRTB params that can be specified in `mediaTypes.video` or in `bids[].params.video`:
- 'mimes'
- 'minduration'
- 'maxduration'
- 'plcmt'
- 'protocols'
- 'startdelay'
- 'skip'
- 'skipafter'
- 'minbitrate'
- 'maxbitrate'
- 'delivery'
- 'playbackmethod'
- 'api'
- 'linearity'


## Instream Video adUnit using mediaTypes.video
*Note:* By default, the adapter will read the mandatory parameters from mediaTypes.video.
*Note:* The TRUSTX ad server will respond with a VAST XML to load into your defined player.
```
  var adUnits = [
    {
        code: 'trustx-video-container',
          mediaTypes: {
            video: {
                  context: 'instream',
                  playerSize: [640, 480],
                  mimes: ['video/mp4', 'video/webm'],
                  protocols: [2, 3, 5, 6],
                  api: [2, 7],
                  position: 1,
                  delivery: [2],
                  minduration: 5,
                  maxduration: 60,
                  plcmt: 1,
                  playbackmethod: [1, 3, 5],
            }
          },
          bids: [
            {
              bidder: 'trustx2',
              params: {
                bidfloor: 5.0,
                publisherId: 'trustx-pub-5678',
                placementId: 'trustx-video-01'
              }
            }
          ]
      }
  ]
```

## Outstream Video
TRUSTX 2.0 also supports outstream video format that can be displayed in non-video placements.

```
  var adUnits = [
    {
        code: 'trustx-outstream-container',
          mediaTypes: {
            video: {
                  context: 'outstream',
                  playerSize: [640, 360],
                  mimes: ['video/mp4', 'video/webm'],
                  protocols: [2, 3, 5, 6],
                  api: [2, 7],
                  placement: 3,
                  minduration: 5,
                  maxduration: 30,
            }
          },
          bids: [
            {
              bidder: 'trustx2',
              params: {
                bidfloor: 6.0,
                publisherId: 'trustx-pub-5678',
                placementId: 'trustx-outstream-01'
              }
            }
          ]
      }
  ]
```

# End-to-End Testing Mode
By passing bid.params.e2etest = true you will be able to receive a test creative without needing to set up real placements.

## Banner
```
var adUnits = [
    {
        code: 'trustx-test-banner',
        mediaTypes: {
            banner: {
                sizes: [[300, 250], [300, 600], [728, 90]]
            }
        },
        bids: [{
            bidder: 'trustx2',
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
      code: 'trustx-test-video',
      mediaTypes: {
        video: {
          context: "instream",
          playerSize: [[640, 480]],
          mimes: ['video/mp4', 'video/webm'],
          protocols: [2, 3, 5, 6],
        }
      },
      bids: [
        {
          bidder: 'trustx2',
          params: {
            e2etest: true
          }
        }
      ]
    }
]
```

# Additional Configuration Options

## GPP/GCC Support
TRUSTX 2.0 fully supports Global Privacy Platform (GPP) and Global Cookie Consent (GCC) standards.

## GDPR, CCPA and other Privacy Regulations
TRUSTX 2.0 is fully compliant with GDPR, CCPA, and other global privacy regulations.
