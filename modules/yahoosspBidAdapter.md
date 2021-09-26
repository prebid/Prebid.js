# Overview
**Module Name:** yahoossp Bid Adapter
**Module Type:** Bidder Adapter
**Maintainer:** hb-fe-tech@oath.com

# Description
The Yahoo SSP Bid Adapter is an OpenRTB interface that consolidates all previous "Oath.inc" adapters such as: "aol", "oneMobile", "oneDisplay" & "oneVideo" supply-side platforms.

# Supported Features:
* Media Types: Banner & Video
* Outstream renderer
* Multi-format adUnits
* Schain module
* Price floors module
* Advertiser domains
* End-2-End self-served testing mode
* Outstream renderer/Player
* First Party Data (excluding ortb2Imp adUnit level data at this point)
    * site
        * page
        * content
    * user
        * yob
        * gender
        * keywords
        * data
        * ext

# Integration Options
The 'yahoossp' bid adapter supports 2 types of integration:
1. dcn & pos DEFAULT (Site/App & Position targeting) - For Display partners/publishers.
2. pubId (Publisher ID) - For legacy "oneVideo" AND New partners/publishers.
**Important:** pubId integration (option 2) is only possible when your Seller account is setup for "Inventory Mapping".

**Please Note:** Most examples in this file are using dcn & pos.

## Who is currently eligable for "pubId" integration
At this time, only the following partners/publishers are eligble for pubId integration:
1. New partners/publishers that do not have any existing accounts on Yahoo SSP (aka: aol, oneMobile, oneDisplay).
2. Video SSP (oneVideo) partners/publishers that
   A. Do not have any display/banner inventory.
   B. Do not have any existing accounts on Yahoo SSP (aka: aol, oneMobile, oneDisplay).

# Mandaotory Bidder Parameters
## dcn & pos (DEFAULT)
The minimal requirements for the 'yahoossp' bid adapter to generate an outbound bid-request to our Yahoo SSP are:
1. At least 1 adUnit including mediaTypes: banner or video
2. **bidder.params** object must include:
    A. **dcn:** Yahoo SSP Site/App inventory parameter.
    B. **pos:** Yahoo SSP position inventory parameter.

### Example: dcn & pos Mandatory Parameters (Single banner adUnit)
```javascript
const adUnits = [{
    code: 'your-placement',
    mediaTypes: {
            banner: {
                sizes: [[300, 250]]
            }
        },
    bids: [
        {
            bidder: 'yahoossp',
            params: {
                dcn: '8a969516017a7a396ec539d97f540011', // Site/App ID provided from SSP
                pos: '8a969978017a7aaabab4ab0bc01a0009' // Placement ID provided from SSP
            }
        }
    ]
}];
```

## pubId
The minimal requirements for the 'yahoossp' bid adapter to generate an outbound bid-request to our Yahoo SSP are:
1. At least 1 adUnit including mediaTypes: banner or video
2. **bidder.params** object must include:
    A. **pubId:** Yahoo SSP Publisher ID (AKA oneVideo pubId/Exchange name)

### Example: pubId Mandatory Parameters (Single banner adUnit)
```javascript
const adUnits = [{
    code: 'your-placement',
    mediaTypes: {
            banner: {
                sizes: [[300, 250]]
            }
        },
    bids: [
        {
            bidder: 'yahoossp',
            params: {
                pubId: 'DemoPublisher', // Publisher External ID provided from Yahoo SSP.
            }
        }
    ]
}];
```
# Adapter Request mode
Since the yahoossp adapter now supports both Banner and Video adUnits a controller was needed to allow you to define when the adapter should generate a bid-requests to our Yahoo SSP.

**Important!** By default the adapter mode is set to "banner" only.
This means that you do not need to explicitly declare the yahoossp.mode in the Global config to initiate banner adUnit requests.

## Request modes:
* **undefined** - (Default) Will generate bid-requests for "Banner" formats only.
* **banner** - Will generate bid-requests for "Banner" formats only (Explicit declaration).
* **video** - Will generate bid-requests for "Video" formats only (Explicit declaration).
* **all** - Will generate bid-requests for both "Banner" & "Video" formats

**Important!** When setting yahoossp.mode = 'all' Make sure your Yahoo SSP Placement (pos id) supports both Banner & Video placements.
If it does not, the Yahoo SSP will respond only in the format it is set too.

```javascript
pbjs.setConfig({
    yahoossp: {
        mode: 'banner' // 'all', 'video', 'banner' (default)
    }
});

```

# Advance adUnit Examples:
## Banner
```javascript
const adUnits = [{
    code: 'banner-adUnit',
    mediaTypes: {
        banner: {
            sizes: [
                [300, 250]
            ]
        }
    },
    bids: [{
        bidder: 'yahoossp',
        params: {
            dcn: '8a969516017a7a396ec539d97f540011', // Site/App ID provided from Yahoo SSP
            pos: '8a969978017a7aaabab4ab0bc01a0009', // Placement ID provided from Yahoo SSP
            }
        }
    }]
}];
```
## Video Instream
**Note:** Make sure to set the adapter mode to allow video requests by setting it to mode: 'video' OR mode: 'all'
```javascript
pbjs.setConfig({
    yahoossp: {
        mode: 'video'
    }
});

const adUnits = [{
    code: 'video-adUnit',
    mediaTypes: {
        video: {
            context: 'instream',
            playerSize: [
                [300, 250]
            ],
            mimes: ['video/mp4','application/javascript'],
            api: [2]
        }
    },
    bids: [{
        bidder: 'yahoossp',
        params: {
            dcn: '8a969516017a7a396ec539d97f540011', // Site/App ID provided from Yahoo SSP
            pos: '8a96958a017a7a57ac375d50c0c700cc', // Placement ID provided from Yahoo SSP
        }
    }]
}];
```
## Video Outstream
**Note:** Make sure to set the adapter mode to allow video requests by setting it to mode: 'video' OR mode: 'all'
```javascript
pbjs.setConfig({
    yahoossp: {
        mode: 'video'
    }
});

const adUnits = [{
    code: 'video-adUnit',
    mediaTypes: {
        video: {
            context: 'outstream',
            playerSize: [
                [300, 250]
            ],
            mimes: ['video/mp4','application/javascript'],
            api: [2]
        }
    },
    bids: [{
        bidder: 'yahoossp',
        params: {
            dcn: '8a969516017a7a396ec539d97f540011', // Site/App ID provided from Yahoo SSP
            pos: '8a96958a017a7a57ac375d50c0c700cc', // Placement ID provided from Yahoo SSP
        }
    }]
}];
```
## Multi-Format
**Important!** If you intend to use the yahoossp bidder for both Banner and Video formats please make sure:
1. Set the adapter as mode: 'all' - to call the Yahoo SSP for both banner & video formats.
2. Make sure the Yahoo SSP placement (pos id) supports both banner & video format requests.

```javascript
const adUnits = [{
    code: 'video-adUnit',
    mediaTypes: {
        banner: {
                sizes: [[300, 250]]
            },
        video: {
            context: 'outstream',
            playerSize: [
                [300, 250]
            ],
            mimes: ['video/mp4','application/javascript'],
            api: [2]
        }
    },
    bids: [{
        bidder: 'yahoossp',
        params: {
            dcn: '8a969516017a7a396ec539d97f540011', // Site/App ID provided from Yahoo SSP
            pos: '8a96958a017a7a57ac375d50c0c700cc', // Placement ID provided from Yahoo SSP
        }
    }]
}];
```

# Optional: Schain module support
The yahoossp adapter supports the Prebid.org Schain module and will pass it through to our Yahoo SSP
For further details please see, https://docs.prebid.org/dev-docs/modules/schain.html

## Global Schain Example:
```javascript
        pbjs.setConfig({
            "schain": {
                "validation": "off",
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
```
## Bidder Specific Schain Example:
```javascript
        pbjs.setBidderConfig({
            "bidders": ['yahoossp'], // can list more bidders here if they share the same config
            "config": {
            "schain": {
                "validation": "strict",
                "config": {
                    "ver": "1.0",
                    "complete": 1,
                    "nodes": [{
                            "asi": "other-platform.com",
                            "sid": "222222",
                            "hp": 0
                    }]
                }
            }
        }
        });
```

# Optional: Price floors module & bidfloor
The yahoossp adapter supports the Prebid.org Price Floors module and will use it to define the outbound bidfloor and currency.
By default the adapter will always check the existance of Module price floor.
If a module price floor does not exist you can set a custom bid floor for your impression using "params.bidOverride.imp.bidfloor".

**Note:** All override params apply to all requests generated using this configuration regardless of format type.

```javascript
const adUnits = [{
    code: 'override-pricefloor',
    mediaTypes: {
        banner: {
            sizes: [
                [300, 250]
            ]
        }
    },
    bids: [{
        bidder: 'yahoossp',
        params: {
            dcn: '8a969516017a7a396ec539d97f540011', // Site/App ID provided from Yahoo SSP
            pos: '8a969978017a7aaabab4ab0bc01a0009', // Placement ID provided from Yahoo SSP
            bidOverride :{
                imp: {
                    bidfloor: 5.00 // bidOverride priceFloor
                }
            }
            }
        }
    }]
}];
```

For further details please see, https://docs.prebid.org/dev-docs/modules/floors.html

# Optional: Self-served E2E testing mode
If you want to see how the yahoossp adapter works and loads you are invited to try it out using our testing mode.
This is useful for intergration testing and response parsing when checking banner vs video capabilities.

## How to use E2E test mode:
1. Set the yahoossp global config mode to either 'banner' or 'video' - depending on the adUnit you want to test.
2. Add params.testing.e2etest: true to your adUnit bidder config - See examples below.

**Note:** When using E2E Test Mode you do not need to pass mandatory bidder params dcn or pos.

**Important!** E2E Testing Mode only works when the Bidder Request Mode is set explicitly to either 'banner' or 'video'.

## Activating E2E Test for"Banner"
 ```javascript
pbjs.setConfig({
    yahoossp: {
        mode: 'banner'
    }
});

const adUnits = [{
    code: 'your-placement',
    mediaTypes: {
            banner: {
                sizes: [[300, 250]]
            }
        },
    bids: [
        {
            bidder: 'yahoossp',
            params: {
                testing: {
                    e2etest: true // Activate E2E Test mode
                }
            }
        }
    ]
}];

```
## Activating E2E Test for "Video"
**Note:** We recommend using Video Outstream as it would load the video response using our Outstream Renderer feature
 ```javascript
pbjs.setConfig({
    yahoossp: {
        mode: 'video'
    }
});

const adUnits = [{
    code: 'video-adUnit',
    mediaTypes: {
        video: {
            context: 'outstream',
            playerSize: [
                [300, 250]
            ],
            mimes: ['video/mp4','application/javascript'],
            api: [2]
        }
    },
    bids: [{
        bidder: 'yahoossp',
        params: {
            testing: {
                e2etest: true // Activate E2E Test mode
            }
        }
    }]
}];
```

# Optional: First Party Data
The yahoossp adapter now supports first party data passed via the global ortb2 object.
**Note:** We currently do not support data being passed on the adUnit level via ortb2Imp.
For further details please see, https://docs.prebid.org/features/firstPartyData.html
```javascript
pbjs.setConfig({
            ortb2: {
                site: {
                    page: 'https://yahooadtech.com',
                    content: {
                        id: "1234",
                        title: "Title",
                        series: "Series",
                        season: "Season",
                        episode: 1,
                        cat: [
                            "IAB1",
                            "IAB1-1",
                            "IAB1-2",
                            "IAB2",
                            "IAB2-1"
                        ],
                        genre: "Fantase",
                        contentrating: "C-Rating",
                        language: "EN",
                        prodq: 1,
                        context: 1,
                        len: 200,
                        ext: {
                            network: "ext-network",
                            channel: "ext-channel"
                        }
                    }
                },
                user: {
                    yob: 1985,
                    gender: "m",
                    keywords: "a,b",
                    data: [{
                        name: "dataprovider.com",
                        ext: {
                            segtax: 3
                        },
                        segment: [{
                            id: "1"
                        }]
                    }],
                    ext: {
                        data: {
                            registered: true,
                            interests: ["cars"]
                        }
                    }
                }
            }
        });
```

# Optional: Bidder bidOverride Parameters
The yahoossp adapter allows passing override data to the outbound bid-request in certain senarios.
Currently the bidOverride object only accepts the following:
* imp
  * video
    * mimes
    * w
    * h
    * maxbitrate
    * maxduration
    * minduration
    * api
    * delivery
    * pos
    * playbackmethod
    * placement
    * linearity
    * protocols
    * rewarded
* site
  * page
* device
  * ip


```javascript
const adUnits = [{
    code: 'bidOverride-adUnit',
    mediaTypes: {
        video: {
            context: 'outstream',
            playerSize: [
                [300, 250]
            ],
        }
    },
    bids: [{
        bidder: 'yahoossp',
        params: {
            dcn: '8a969516017a7a396ec539d97f540011',
            pos: '8a96958a017a7a57ac375d50c0c700cc',
            bidOverride: {
                imp: {
                    video: {
                        mimes: ['video/mp4', 'javascript/application'],
                        w: 300,
                        h: 200,
                        maxbitrate: 4000,
                        maxduration: 30,
                        minduration: 10,
                        api: [1,2],
                        delivery: 1,
                        pos: 1,
                        playbackmethod: 0,
                        placement: 1,
                        linearity: 1,
                        protocols: [2,5],
                        rewarded: 0
                    }
                },
                site: {
                    page: 'https://yahoossp-bid-adapter.com',
                },
                device: {
                    ip: "1.2.3.4"
                }
            }
        }
    }]
}]
```

# Special Video Features
## Rewarded video flag
To indicate to Yahoo SSP that this adUnit is a rewarded video you can pass the following in the params.bidOverride.imp.video.rewarded: 1

```javascript
const adUnits = [{
    code: 'rewarded-video-adUnit',
    mediaTypes: {
        video: {
            context: 'outstream',
            playerSize: [
                [300, 250]
            ],
        }
    },
    bids: [{
        bidder: 'yahoossp',
        params: {
            dcn: '8a969516017a7a396ec539d97f540011',
            pos: '8a96958a017a7a57ac375d50c0c700cc',
            bidOverride: {
                imp: {
                    video: {
                        rewarded: 1
                    }
                }
            }
        }
    }]
}]
```

## Site/App Targeting for "pubId" Inventory Mapping
To target your adUnit explicitly to a specific Site/App Object in Yahoo SSP, you can pass the following
params.inventoryid = External Site ID || Video SSP RTBIS Id (Integer).

```javascript
const adUnits = [{
    code: 'rewarded-video-adUnit',
    mediaTypes: {
        video: {
            context: 'outstream',
            playerSize: [
                [300, 250]
            ],
        }
    },
    bids: [{
        bidder: 'yahoossp',
        params: {
            pubId: 'DemoPublisher',
            inventoryid: 1234567;
        }
    }]
}]
```
# Optional: Legacy override Parameters
For backward compatibility, partners who previously used the 'bidder.params.ext' object to pass custom overrides can still use them, but we urge you to move to the new params.bidOverride format.



