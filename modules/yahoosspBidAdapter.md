# Overview
**Module Name:** Yahoo Advertising Bid Adapter
**Module Type:** Bidder Adapter
**Maintainer:** hb-fe-tech@yahooinc.com

# Description
The Yahoo Advertising Bid Adapter is an OpenRTB interface that consolidates all previous "Oath.inc" adapters such as: "aol", "oneMobile", "oneDisplay" & "oneVideo" supply-side platforms.

# Supported Features:
* Media Types: Banner & Video
* Outstream renderer
* Multi-format adUnits
* Schain module
* Price floors module
* Advertiser domains
* End-2-End self-served testing mode
* Outstream renderer/Player
* User ID Modules - ConnectId and others
* First Party Data (ortb2 & ortb2Imp)
* Custom TTL (time to live)


# Adapter Request mode
Since the Yahoo Advertising bid adapter supports both Banner and Video adUnits, a controller was needed to allow you to define when the adapter should generate a bid-requests to the Yahoo bid endpoint.

**Important!** By default the adapter mode is set to "banner" only.
This means that you do not need to explicitly declare the `yahooAds.mode` property in the global config to initiate banner adUnit requests.

## Request modes:
* **undefined** - (Default) Will generate bid-requests for "Banner" formats only.
* **banner** - Will generate bid-requests for "Banner" formats only (Explicit declaration).
* **video** - Will generate bid-requests for "Video" formats only (Explicit declaration).
* **all** - Will generate bid-requests for both "Banner" & "Video" formats.

**Important!** When setting `yahooAds.mode` to `'all'`, make sure your Yahoo Placement (pos id) supports both Banner & Video placements.
If it does not, the Yahoo bid server will respond only in the format it is set too.

### Example: explicitly setting the request mode
```javascript
pbjs.setConfig({
    yahooAds: {
        mode: 'banner' // 'all', 'video', 'banner' (default)
    }
});
```

# Integration Options
The Yahoo Advertising bid adapter supports 2 types of integration:
1. **dcn & pos** DEFAULT (Site/App & Position targeting) - For Display partners/publishers.
2. **pubId** (Publisher ID) - For legacy "oneVideo" AND new partners/publishers.
**Important:** pubId integration (option 2) is only possible when your seller account is setup for "Inventory Mapping".

**Please Note:** Most examples in this file are using dcn & pos.

## Who is currently eligible for "pubId" integration
At this time, only the following partners/publishers are eligble for pubId integration:
1. New partners/publishers that do not have an existing account with Yahoo Advertising (aka: aol, oneMobile, oneDisplay).
2. Video SSP (oneVideo) partners/publishers that
   A. Do not have any display/banner inventory.
   B. Do not have an existing account with Yahoo Advertising (aka: aol, oneMobile, oneDisplay).

# Mandatory Bidder Parameters
## dcn & pos (DEFAULT)
The minimal requirements for the Yahoo Advertising bid adapter to generate an outbound bid-request to Yahoo's bid endpoint are:
1. At least 1 adUnit including mediaTypes: banner or video
2. **bidder.params** object must include:
    A. **dcn:** Yahoo Advertising Site/App inventory parameter.
    B. **pos:** Yahoo Advertising position inventory parameter.

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
            bidder: 'yahooAds',
            params: {
                dcn: '8a969516017a7a396ec539d97f540011', // Site/App ID provided by Yahoo Advertising
                pos: '8a969978017a7aaabab4ab0bc01a0009' // Placement ID provided by Yahoo Advertising
            }
        }
    ]
}];
```

## pubId
The minimal requirements for the Yahoo Advertising bid adapter to generate an outbound bid-request to Yahoo's bid endpoint are:
1. At least 1 adUnit including mediaTypes: banner or video
2. **bidder.params** object must include:
    A. **pubId:** Yahoo Advertising Publisher ID (AKA oneVideo pubId/Exchange name)

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
            bidder: 'yahooAds',
            params: {
                pubId: 'DemoPublisher', // Publisher defined external ID as configured by Yahoo Advertising.
            }
        }
    ]
}];
```

# Advanced adUnit Examples:
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
        bidder: 'yahooAds',
        params: {
            dcn: '8a969516017a7a396ec539d97f540011', // Site/App ID provided by Yahoo Advertising
            pos: '8a969978017a7aaabab4ab0bc01a0009', // Placement ID provided by Yahoo Advertising
            }
        }
    }]
}];
```

## Video Instream
**Important!** Make sure that the Yahoo Advertising Placement type (in-stream) matches the adUnit video inventory type.
**Note:** Make sure to set the adapter mode to allow video requests by setting it to mode: 'video' OR mode: 'all'.
```javascript
pbjs.setConfig({
    yahooAds: {
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
        bidder: 'yahooAds',
        params: {
            dcn: '8a969516017a7a396ec539d97f540011', // Site/App ID provided by Yahoo Advertising
            pos: '8a96958a017a7a57ac375d50c0c700cc', // Placement ID provided by Yahoo Advertising
        }
    }]
}];

```
## Video Outstream
**Important!** Make sure that the Yahoo Advertsing placement type (in-feed/ in-article) matches the adUnit video inventory type.
**Note:** Make sure to set the adapter mode to allow video requests by setting it to mode: 'video' OR mode: 'all'
```javascript
pbjs.setConfig({
    yahooAds: {
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
        bidder: 'yahooAds',
        params: {
            dcn: '8a969516017a7a396ec539d97f540011', // Site/App ID provided by Yahoo Advertising
            pos: '8a96958a017a7a57ac375d50c0c700cc', // Placement ID provided by Yahoo Advertising
        }
    }]
}];

```
## Multi-Format
**Important!** If you intend to use the Yahoo Advertising bidder for both Banner and Video formats please make sure:
1. Set the adapter as mode: 'all' - to configure the bid adapter to call the bid endpoint for both banner & video formats.
2. Make sure the Yahoo Advertising placement (pos id) supports both banner & video format requests.
```javascript
pbjs.setConfig({
    yahooAds: {
        mode: 'all'
    }
});

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
        bidder: 'yahooAds',
        params: {
            dcn: '8a969516017a7a396ec539d97f540011', // Site/App ID provided by Yahoo Advertising
            pos: '8a96958a017a7a57ac375d50c0c700cc', // Placement ID provided by Yahoo Advertising
        }
    }]
}];
```

# Optional: Schain module support
The Yahoo Advertising bid adapter supports the Prebid.org Schain module and will pass it through to our bid endpoint.
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
            "bidders": ['yahooAds'], // can list more bidders here if they share the same config
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
The Yahoo Advertising bid adapter supports the Prebid.org Price Floors module and will use it to define the outbound bidfloor and currency, if the relevant floors have been defined in the configuration.
A cusom method for defining bid floors is also supported, this can be enabled by setting the `params.bidOverride.imp.bidfloor` bidder parameter.

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
        bidder: 'yahooAds',
        params: {
            dcn: '8a969516017a7a396ec539d97f540011', // Site/App ID provided by Yahoo Advertising
            pos: '8a969978017a7aaabab4ab0bc01a0009', // Placement ID provided by Yahoo Advertising
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
If you want to see how the Yahoo Advertising bid adapter works and loads you are invited to try it out using our testing mode.
This is useful for integration testing and response parsing when checking banner vs video capabilities.

## How to use E2E test mode:
1. Set the `yahooAds` global config mode to either `'banner'` or `'video'` - depending on the adUnit you want to test.
2. Add params.testing.e2etest: true to your adUnit bidder config - See examples below.

**Note:** When using E2E Test Mode you do not need to pass mandatory bidder params dcn or pos.

**Important!** E2E Testing Mode only works when the Bidder Request Mode is set explicitly to either `'banner'` or `'video'`.

## Activating E2E Test for "Banner"
 ```javascript
pbjs.setConfig({
    yahooAds: {
        mode: 'banner' // select 'banner' or 'video' to define what response to load
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
            bidder: 'yahooAds',
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
    yahooAds: {
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
        bidder: 'yahooAds',
        params: {
            testing: {
                e2etest: true // Activate E2E Test mode
            }
        }
    }]
}];
```

# Optional: First Party Data
The Yahoo Advertising bid adapter supports first party data passed via:
1. Global ortb2 object using `pbjs.setConfig()`
2. adUnit ortb2Imp object declared within an adUnit.
For further details please see, https://docs.prebid.org/features/firstPartyData.html
## Global First Party Data "ortb2"
### Passing First Party "site" data:
```javascript
pbjs.setConfig({
            ortb2: {
                site: {
                    name: 'Yahoo Advertising',
                    domain: 'yahooadvertising.com',
                    cat: ['IAB2'],
                    sectioncat: ['IAB2-2'],
                    pagecat: ['IAB2-2'],
                    page: 'https://page.yahooadvertising.com.com/here.html',
                    ref: 'https://ref.yahooadvertising.com.com/there.html',
                    keywords:'yahoo, ad, tech',
                    search: 'header bidding',
                    content: {
                        id: '1234',
                        title: 'Title',
                        series: 'Series',
                        season: 'Season',
                        episode: 1,
                        cat: ['IAB1', 'IAB1-1', 'IAB1-2', 'IAB2', 'IAB2-1'],
                        genre: 'Fantase',
                        contentrating: 'C-Rating',
                        language: 'EN',
                        prodq: 1,
                        context: 1,
                        len: 200,
                        data: [{
                            name: "www.dataprovider1.com",
                            ext: { segtax: 4 },
                            segment: [
                                { id: "687" },
                                { id: "123" }
                            ]
                        }],
                        ext: {
                            network: 'ext-network',
                            channel: 'ext-channel',
                            data: {
                                pageType: "article",
                                category: "repair"
                            }
                        }
                    }
                }
            }
        });
```

Notes: The first party site info is filtered and only the following specific keys are allowed in the bidRequests:

| Field                       | Type   |
|-----------------------------|--------|
| site.name                   | String |
| site.domain                 | String |
| site.page                   | String |
| site.ref                    | String |
| site.keywords               | String |
| site.search                 | String |
| site.cat                    | Array  |
| site.sectioncat             | Array  |
| site.pagecat                | Array  |
| site.ext                    | Object |
| site.publisher.ext          | Object |
| site.content.id             | String |
| site.content.title          | String |
| site.content.series         | String |
| site.content.season         | String |
| site.content.genre          | String |
| site.content.contentrating  | String |
| site.content.language       | String |
| site.content.episode        | Number |
| site.content.prodq          | Number |
| site.content.context        | Number |
| site.content.livestream     | Number |
| site.content.len            | Number |
| site.content.cat            | Array  |
| site.content.ext            | Object |
| site.content.data           | Array  |
| site.content.data[].id      | String |
| site.content.data[].name    | String |
| site.content.data[].segment | Array  |
| site.content.data[].ext     | Object |


### Passing First Party "user" data:
```javascript
pbjs.setConfig({
            ortb2: {
                user: {
                    yob: 1985,
                    gender: 'm',
                    keywords: 'a,b',
                    data: [{
                            name: "www.dataprovider1.com",
                            ext: { segtax: 4 },
                            segment: [
                                { id: "687" },
                                { id: "123" }
                            ]
                    }],
                    ext: {
                        data: {
                            registered: true,
                            interests: ['cars']
                        }
                    }
                }
            }
        });
```
### Passing First Party "app.content.data" data:
```javascript
pbjs.setConfig({
            ortb2: {
                app: {
                    content: {
                        data: [{
                            name: "www.dataprovider1.com",
                            ext: { segtax: 4 },
                            segment: [
                                { id: "687" },
                                { id: "123" }
                            ]
                        }],
                    }
                }
            }
        });
```


## AdUnit First Party Data "ortb2Imp"
Most DSPs are adopting the Global Placement ID (GPID).
Please pass your placement specific GPID value by setting `adUnit.ortb2Imp.ext.data.pbadslot`.
```javascript
const adUnits = [{
                code: 'placement',
                mediaTypes: {
                    banner: {
                        sizes: [
                            [300, 250]
                        ]
                    },
                },
                ortb2Imp: {
                    ext: {
                        data: {
                            pbadslot: "homepage-top-rect",
                            adUnitSpecificAttribute: "123"
                        }
                    }
                },
                bids: [{
                    bidder: 'yahooAds',
                    params: {
                        pubdId: 'DemoPublisher'
                    }
                }]
            }
        ]
```

# Optional: Bidder bidOverride Parameters
The Yahoo Advertising bid adapter allows passing override data to the outbound bid-request that overrides First Party Data.
**Important!** We highly recommend using prebid modules to pass data instead of bidder speicifc overrides.
The use of these parameters are a last resort to force a specific feature or use case in your implementation.

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
        bidder: 'yahooAds',
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
                        startdelay: 0,
                        rewarded: 0
                    }
                },
                site: {
                    page: 'https://yahooAdvertising-bid-adapter.com',
                },
                device: {
                    ip: "1.2.3.4"
                }
            }
        }
    }]
}]
```

# Optional: Custom Key-Value Pairs
Custom key-value paris can be used for both inventory targeting and reporting.
You must set up key-value pairs in the Yahoo SSP before sending them via the adapter otherwise the Ad Server will not be listening and picking them up.

Important! Key-value pairs can only contain values of the following data types: String, Number, Array of strings OR Array of numbers

```javascript
const adUnits = [{
    code: 'key-value-pairs',
    mediaTypes: {
        video: {
            context: 'outstream',
            playerSize: [
                [300, 250]
            ],
        }
    },
    bids: [{
        bidder: 'yahooAds',
        params: {
            dcn: '8a969516017a7a396ec539d97f540011',
            pos: '8a96958a017a7a57ac375d50c0c700cc',
            kvp: {
                key1: 'value', // String
                key2: 123456,   // Number
                key3: ['string1','string2', 'string3'], // Array of strings
                key4: [1, 23, 456, 7890] // Array of Numbers
            }
        }
    }]
}]
```

# Optional: Custom Cache Time To Live (ttl):
The Yahoo Advertising bid adapter supports passing of "Time To Live" (ttl) to indicate to prebid how long the bid response from Yahoo Advertising should be retained by Prebid for. This configuration value must be a Number in seconds, with the valid range being 1 - 3600 inclusive.
The setting can be defined globally using `setConfig` or within the adUnit.params.
Global level `setConfig` overrides adUnit.params.
If no value is being passed default is 300 seconds.
## Global TTL
```javascript
pbjs.setConfig({
    yahooAds: {
        ttl: 300
    }
});

const adUnits = [{
    code: 'global-ttl',
    mediaTypes: {
        video: {
            context: 'outstream',
            playerSize: [
                [300, 250]
            ],
        }
    },
    bids: [{
        bidder: 'yahooAds',
        params: {
            dcn: '8a969516017a7a396ec539d97f540011',
            pos: '8a96958a017a7a57ac375d50c0c700cc',
        }
    }]
}]
```

## Ad Unit Params TTL
```javascript
const adUnits = [{
    code: 'adUnit-ttl',
    mediaTypes: {
        banner: {
            sizes: [[300, 250]],
        }
    },
    bids: [{
        bidder: 'yahooAds',
        params: {
            dcn: '8a969516017a7a396ec539d97f540011',
            pos: '8a96958a017a7a57ac375d50c0c700cc',
            ttl: 300,
        }
    }]
}]

```
# Optional: Video Features
## Rewarded video flag
To indicate to Yahoo Advertising that this adUnit is a rewarded video you can set the `params.bidOverride.imp.video.rewarded` property to `1`

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
        bidder: 'yahooAds',
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
To target your adUnit explicitly to a specific Site/App Object in Yahoo Advertising, you can pass one of the following:
1. params.siteId = External Site ID || Video SSP RTBIS Id (in String format).
2. params.bidOverride.site.id = External Site ID || Video SSP RTBIS Id (in String format).
**Important:** Site override is a only supported when using "pubId" mode.
**Important:** If you are switching from the oneVideo adapter, please make sure to pass inventoryid as a String instead of Integer.

```javascript
const adUnits = [{
    code: 'pubId-site-targeting-adUnit',
    mediaTypes: {
        video: {
            context: 'outstream',
            playerSize: [
                [300, 250]
            ],
        }
    },
    bids: [{
        bidder: 'yahooAds',
        params: {
            pubId: 'DemoPublisher',
            siteId: '1234567';
        }
    }]
}]
```

## Placement Targeting for "pubId" Inventory Mapping
To target your adUnit explicitly to a specific Placement within a Site/App Object in Yahoo Advertising, you can pass the following params.placementId = External Placement ID || Placement Alias

**Important!** Placement override is a only supported when using "pubId" mode.
**Important!** It is highly recommended that you pass both `siteId` AND `placementId` together to avoid inventory mismatching.

### Site & Placement override
**Important!** If the placement ID does not reside under the defined Site/App object, the request will not resolve and no response will be sent back from the bid-server.
```javascript
const adUnits = [{
    code: 'pubId-site-targeting-adUnit',
    mediaTypes: {
        video: {
            context: 'outstream',
            playerSize: [
                [300, 250]
            ],
        }
    },
    bids: [{
        bidder: 'yahooAds',
        params: {
            pubId: 'DemoPublisher',
            siteId: '1234567',
            placementId: 'header-250x300'
        }
    }]
}]
```
### Placement only override
**Important!** Using this method is not advised if you have multiple Site/Apps that are broken out of a Run Of Network (RON) Site/App. If the placement ID does not reside under a matching Site/App object, the request will not resolve and no response will be sent back from the bid-server.
```javascript
const adUnits = [{
    code: 'pubId-site-targeting-adUnit',
    mediaTypes: {
        video: {
            context: 'outstream',
            playerSize: [
                [300, 250]
            ],
        }
    },
    bids: [{
        bidder: 'yahooAds',
        params: {
            pubId: 'DemoPublisher',
            placementId: 'header-250x300'
        }
    }]
}]
```

# Optional: Legacy override Parameters
This adapter does not support passing legacy overrides via `bidder.params.ext` since most of the data should be passed using prebid modules (First Party Data, Schain, Price Floors etc.).
If you do not know how to pass a custom parameter that you previously used, please contact us using the information provided above.

Thank you,
Yahoo Advertsing
