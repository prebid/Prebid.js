# Overview

**Module Name**: One Video Bidder Adapter
**Module Type**: Bidder Adapter
**Maintainer**: deepthi.neeladri.sravana@verizonmedia.com
                adam.browning@verizonmedia.com

# Description
Connects to Verizon Media's Video SSP (AKA ONE Video / Adap.tv) demand source to fetch bids.
# Prebid.js V5.0 Support
The oneVideo adapter now reads `mediaTypes.video` for mandatory parameters such as `playerSize` & `mimes`.
Note: You can use the `bid.params.video` object to specify explicit overrides for whatever is declared in `mediaTypes.video`.
Important: You must pass `bid.params.video = {}` as bare minimum for the adapter to work.
# Integration Examples:

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
                  playerSize: [480, 640],
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
              bidder: 'oneVideo',
              params: {
                video: {
                  sid: YOUR_VSSP_ORG_ID,
                  hp: 1,
                  rewarded: 1,
                  inventoryid: 123,
                  ttl: 300,
                  custom: {
                    key1: "value1",
                    key2: 123345
                  }
                },
                bidfloor: 0.5,
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
## Instream Video adUnit using params.video overrides
*Note:* If the mandatory parameters are not specified in mediaTypes.video the adapter will read check to see if overrides are set in params.video. Decalring values using params.video will always override the settings in mediaTypes.video.
*Note:* The Video SSP ad server will respond with an VAST XML to load into your defined player.
```
  var adUnits = [
    {
        code: 'video1',
          mediaTypes: {
            video: {
                  context: 'instream',
            }
          },
          bids: [
            {
              bidder: 'oneVideo',
              params: {
                video: {
                  playerWidth: 640,
                  playerHeight: 480,
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
                  sid: YOUR_VSSP_ORG_ID,
                  hp: 1,
                  rewarded: 1,
                  inventoryid: 123,
                  ttl: 300,
                  custom: {
                    key1: "value1",
                    key2: 123345
                  }
                },
                bidfloor: 0.5,
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
                  playerSize: [480, 640],
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
              bidder: 'oneVideo',
              params: {
                video: {
                  sid: YOUR_VSSP_ORG_ID,
                  hp: 1,
                  rewarded: 1,
                  ttl: 250
                },
                bidfloor: 0.5,
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
          playerSize: [480, 640],
          mimes: ['video/mp4', 'application/javascript'],
        }
      },
      bids: [
        {
          bidder: 'oneVideo',
          params: {
            video: {
              ttl: 250
            },
            bidfloor: 0.5,
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
            bidfloor: 0.5,
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
          mimes: ['video/mp4', 'application/javascript'],
        }
      },
      bids: [
        {
          bidder: 'oneVideo',
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
                  playerSize: [480, 640],
                  mimes: ['video/mp4', 'application/javascript'],
                  protocols: [2,5],
                  api: [2],
            }
          },
          bids: [
            {
              bidder: 'oneVideo',
              params: {
                video: {
                  sid: 123456
                },
                bidfloor: 0.5,
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
                  playerSize: [480, 640],
                  mimes: ['video/mp4', 'application/javascript'],
                  protocols: [2,5],
                  api: [2],
            }
          },
          bids: [
            {
              bidder: 'oneVideo',
              params: {
                video: {
                  ttl: 250
                },
                bidfloor: 0.5,
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
# Content Object Support
The oneVideoBidAdapter supports passing of OpenRTB V2.5 Content Object.

```
const adUnits = [{
            code: 'video1',
            mediaTypes: {
                video: {
                    context: 'outstream',
                    playerSize: [640, 480],
                    mimes: ['video/mp4', 'application/javascript'],
                    protocols: [2, 5],
                    api: [1, 2],
                }
            },
            bids: [{
                bidder: 'oneVideo',
                params: {
                    video: {
                        ttl: 300,
                        content: {
                            id: "1234",
                            title: "Title",
                            series: "Series",
                            season: "Season",
                            episode: 1
                            cat: [
                                "IAB1",
                                "IAB1-1",
                                "IAB1-2",
                                "IAB2",
                                "IAB2-1"
                            ],
                            genre: "Genre",
                            contentrating: "C-Rating",
                            language: "EN",
                            prodq: 1,
                            context: 1,
                            livestream: 0,
                            len: 360,
                            ext: {
                                network: "ext-network",
                                channel: "ext-channel"
                            }
                        }
                      },
                      bidfloor: 0.5,
                      pubId: 'HBExchange'
                    }
                }
            }]
        }]
```


# TTL Support
The oneVideoBidAdapter supports passing of "Time To Live" (ttl)  that indicates to prebid chache for how long to keep the chaced winning bid alive.
Value is Number in seconds
You can enter any number between 1 - 3600 (seconds)
```
const adUnits = [{
            code: 'video1',
            mediaTypes: {
                video: {
                    context: 'outstream',
                    playerSize: [640, 480],
                    mimes: ['video/mp4', 'application/javascript'],
                    protocols: [2, 5],
                    api: [1, 2],
                }
            },
            bids: [{
                bidder: 'oneVideo',
                params: {
                    video: {
                        ttl: 300
                    },
                    bidfloor: 0.5,
                    pubId: 'HBExchange'
                }
            }]
        }]
```

