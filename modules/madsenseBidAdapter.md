# Overview
```
Module Name:  madSense Bid Adapter
Module Type:  Bidder Adapter
Maintainer:   prebid@madsense.io
```

# Description

- A module that integrates with madSense's demand sources.
- The madSense bid adapter supports both Banner and Video formats.


### Test Parameters

#### Banner

```
var adUnits = [
    {
        code: 'adUnitBanner_div_1',
        mediaTypes: {
            banner: {
                sizes: [[300, 250], [300,600]]
            }
        },
        bids: [{
            bidder: 'madsense',
            params: {
                company_id: '1234567',
                bidfloor: 2.7,
            }
        }]
    }
];
```

#### Video

We support the following OpenRTB parameters, which can be defined in `mediaTypes.video` or `bids[].params.video`.
- `mimes`, `minduration`, `maxduration`, `plcmt`, `protocols`, `startdelay`, `skip`, `skipafter`, `minbitrate`, `maxbitrate`, `delivery`, `playbackmethod`, `api`, `linearity`


##### Instream Video Ad Unit with mediaTypes.video
- Note: The adapter, by default, will retrieve the required parameters from mediaTypes.video.
- Note: The Video SSP ad server will return a VAST XML, which can be loaded into your specified player.
```
  var adUnits = [
    {
        code: 'adUnitVideo_1',
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
              bidder: 'madsense',
              params: {
                company_id: '1234567'
              }
            }
          ]
      }
  ]
```

## End To End Testing Mode
By setting `bid.params.test = true`, you can receive a test creative.

#### Banner
```
var adUnits = [
    {
        code: 'adUnitBanner_div_1',
        mediaTypes: {
            banner: {
                sizes: [[300, 250], [300,600]]
            }
        },
        bids: [{
            bidder: 'madsense',
            params: {
                test: true
            }
        }]
    }
];
```

#### Video
```
var adUnits = [
    {
      code: 'adUnitVideo_1',
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
          bidder: 'madsense',
          params: {
            test: true
          }
        }
      ]
    }
]
```
