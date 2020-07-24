# Overview

**Module Name**: One Video Bidder Adapter
**Module Type**: Bidder Adapter
**Maintainer**: deepthi.neeladri.sravana@verizonmedia.com

# Description
Connects to Verizon Media's Video SSP (AKA ONE Video / Adap.tv) demand source to fetch bids.

# Integration Examples:
## Instream Video adUnit example & parameters
*Note:* The Video SSP ad server will respond with an VAST XML to load into your defined player.
```
  var adUnits = [
    {
        code: 'video1',
          mediaTypes: {
            video: {
                  context: 'instream',
                  playerSize: [480, 640]
            }
          },
          bids: [
            {
              bidder: 'oneVideo',
              params: {
                video: {
                  playerWidth: 480,
                  playerHeight: 640,
                  mimes: ['video/mp4', 'application/javascript'],
                  protocols: [2,5],
                  api: [2],
                  position: 1,
                  delivery: [2],
                  playbackmethod: [1,5],
                  sid: YOUR_VSSP_ORG_ID,
                  hp: 1,
                  rewarded: 1,
                  placement: 1,
                  inventoryid: 123,
                  minduration: 10,
                  maxduration: 30,
                },
                site: {
                    id: 1,
                    page: 'https://verizonmedia.com',
                    referrer: 'https://verizonmedia.com'
                  },
                pubId: 'HBExchange'
                }
            }
          ]
      }
  ]
```
## Outstream Video adUnit example & parameters
*Note:* The Video SSP ad server will load it's own Outstream Renderer (player) as a fallback if no player is defined on the publisher page. The Outstream player will inject into the div id that has an identical adUnit code.
```
  var adUnits = [
    {
        code: 'video1',
          mediaTypes: {
            video: {
                  context: 'outstream',
                  playerSize: [480, 640]
            }
          },
          bids: [
            {
              bidder: 'oneVideo',
              params: {
                video: {
                  playerWidth: 480,
                  playerHeight: 640,
                  mimes: ['video/mp4', 'application/javascript'],
                  protocols: [2,5],
                  api: [2],
                  position: 1,
                  delivery: [2],
                  playbackmethod: [1,5],
                  sid: YOUR_VSSP_ORG_ID,
                  hp: 1,
                  rewarded: 1,
                  placement: 1,
                  inventoryid: 123,
                  minduration: 10,
                  maxduration: 30,
                },
                site: {
                    id: 1,
                    page: 'https://verizonmedia.com',
                    referrer: 'https://verizonmedia.com'
                  },
                pubId: 'HBExchange'
                }
            }
          ]
      }
  ]
```

## S2S / Video: Dynamic Ad Placement (DAP) adUnit example & parameters
*Note:* The Video SSP ad server will respond with HTML embed tag to be injected into an iFrame you create.
```
  var adUnits = [
    {
      code: 'video1',
      mediaTypes: {
        video: {
          context: "instream",
          playerSize: [480, 640]
        }
      },
      bids: [
        {
          bidder: 'oneVideo',
          params: {
            video: {
              playerWidth: 480,
              playerHeight: 640,
              mimes: ['video/mp4', 'application/javascript'],
              position: 1,
              display: 1
            },
            site: {
              id: 1,
              page: 'https://verizonmedia.com',
              referrer: 'https://verizonmedia.com'
            },
            pubId: 'HBExchangeDAP'
          }
        }
      ]
    }
]
```
## Prebid.js / Banner: Dynamic Ad Placement (DAP) adUnit example & parameters
*Note:* The Video SSP ad server will respond with HTML embed tag to be injected into an iFrame created by Google Ad Manager (GAM).
```
  var adUnits = [
    {
      code: 'banner-1',
      mediaTypes: {
        banner: {
          sizes: [300, 250]
        }
      },
      bids: [
        {
          bidder: 'oneVideo',
          params: {
            video: {
              playerWidth: 300,
              playerHeight: 250,
              mimes: ['video/mp4', 'application/javascript'],
              display: 1
            },
            site: {
              id: 1,
              page: 'https://verizonmedia.com',
              referrer: 'https://verizonmedia.com'
            },
            pubId: 'HBExchangeDAP'
          }
        }
      ]
    }
]
```

# End 2 End Testing Mode
By passing bid.params.video.e2etest = true you will be able to receive a test creative when connecting via VPN location U.S West Coast. This will allow you to trubleshoot how your player/ad-server parses and uses the VAST XML response.
This automatically sets default values for the outbound bid-request to respond from our test exchange.
No need to override the site/ref urls or change your pubId
```
var adUnits = [
    {
      code: 'video-1',
      mediaTypes: {
        video: {
          context: "instream",
          playerSize: [480, 640]
        }
      },
      bids: [
        {
          bidder: 'oneVideo',
          params: {
            video: {
              playerWidth: 300,
              playerHeight: 250,
              mimes: ['video/mp4', 'application/javascript'],
              e2etest: true
            }
            pubId: 'YOUR_PUBLISHER_ID'
          }
        }
      ]
    }
]
```

# Supply Chain Object Support
The oneVideoBidAdapter supports 2 methods for passing/creating an schain object.
1. By passing your Video SSP Org ID in the bid.video.params.sid - The adapter will create a new schain object and our ad-server will fill in the data for you.
2. Using the Prebid Supply Chain Object Module - The adapter will capture the schain object
*Note:* You cannot pass both schain object and bid.video.params.sid together. Option 1 will always be the default.

## Create new schain using bid.video.params.sid
sid = your Video SSP Organization ID.
This is for direct publishers only.
```
var adUnits = [
    {
        code: 'video1',
          mediaTypes: {
            video: {
                  context: 'instream',
                  playerSize: [480, 640]
            }
          },
          bids: [
            {
              bidder: 'oneVideo',
              params: {
                video: {
                  playerWidth: 480,
                  playerHeight: 640,
                  mimes: ['video/mp4', 'application/javascript'],
                  protocols: [2,5],
                  api: [2],
                  sid:
                },
                site: {
                    id: 1,
                    page: 'https://verizonmedia.com',
                    referrer: 'https://verizonmedia.com'
                  },
                pubId: 'HBExchange'
                }
            }
          ]
      }
  ]
```

## Pass global schain using pbjs.setConfig(SCHAIN_OBJECT)
For both Authorized resellers and direct publishers.
```
pbjs.setConfig({
  "schain": {
      "validation": "strict",
      "config": {
          "ver": "1.0",
          "complete": 1,
          "nodes": [{
                  "asi": "some-platform.com",
                  "sid": "111111",
                  "hp": 1
          }]
      }
  }
});

var adUnits = [
    {
        code: 'video1',
          mediaTypes: {
            video: {
                  context: 'instream',
                  playerSize: [480, 640]
            }
          },
          bids: [
            {
              bidder: 'oneVideo',
              params: {
                video: {
                  playerWidth: 480,
                  playerHeight: 640,
                  mimes: ['video/mp4', 'application/javascript'],
                  protocols: [2,5],
                  api: [2],
                },
                site: {
                    id: 1,
                    page: 'https://verizonmedia.com',
                    referrer: 'https://verizonmedia.com'
                  },
                pubId: 'HBExchange'
                }
            }
          ]
      }
  ]
```
