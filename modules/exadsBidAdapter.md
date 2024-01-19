# Overview

**Module Name**: Exads Bidder Adapter

**Module Type**: Bidder Adapter

**Maintainer**: info@exads.com

# Description

Module that connects to Exads's bidder for bids.

### Build
```
gulp build --modules="--modules=consentManagement,exadsBidAdapter"  
```

### Configuration

Use `setConfig` to instruct Prebid.js to initilize the exadsBidAdapter, as specified below. 
* Set "debug" as true if you need to read logs;
* Set "gdprApplies" as true if you need to pass gdpr consent string;
* The tcString is the iabtcf consent string for gdpr;
* Uncomment the cache instruction if you need to configure a cache server (e.g. for instream video)

```
pbjs.setConfig({
    debug: false,
    //cache: { url: "https://prebid.adnxs.com/pbc/v1/cache" },
    consentManagement: {
        gdpr: {
            cmpApi: 'static',
            timeout: 1000000,
            defaultGdprScope: true,
            consentData: {
                getTCData: {
                    tcString: consentString,
                    gdprApplies: false // set to true to pass the gdpr consent string
                }
            }
        }
    }
});

```

# Test Parameters
 
 
#### RTB Banner 2.4

* **zoneId** (required) - you can get it from the endpoint created after configuring the zones (integer)
* **fid** (required) - you can get it from the endpoint created after configuring the zones (string)
* **partner** (required) - currently we support rtb 2.4 ("rtb_2_4") only (string)
* **siteId** (recommended) - unique Site ID (string)
* **banner.sizes** (required) - One array of integer - [width, height]
* **catIab** - IAB category ID (array of string)
* **userIp** (required) - IP address of the user (string)*
* **userId** (*required) - unique user ID (string). *If you cannot generate a user ID, you can leave it empty (""). The request will get a response as long as "user" object is included in the request.
* **country** - Country ISO3
* **impressionId** (required) - unique impression ID within this bid request (string)
* **keywords** - keywords can be used to ensure ad zones get the right type of advertising. Keywords should be a string of comma-separated words
* **bidfloor** - Minimum bid for this impression (CPM) / click (CPC) and account currency, optional (float) 
* **bidfloorcur** - Currency for minimum bid value specified using ISO-4217 alpha codes, optional (string)
* **mimes** - List of supported mime types. We support: image/jpeg, image/jpg, image/png, image/png, image/gif, image/webp, video/mp4 (string array)
* **endpoint** (required) - Exads endpoint (URL)

##### RTB Banner 2.4 (Image)
* **image_output** - Indicates output format for image banners* (string)

```javascript

adUnits = 
    [{  code: 'postbid_iframe', // the frame where to render the creative
        mediaTypes: {
            banner: {
                sizes: [300, 250]
            }
        },
        bids: [{
            bidder: 'exadsadserver',
            params: {
                    zoneId: 12345,
                    fid: '829a896f011475d50da0d82cfdd1af8d9cdb07ff',
                    partner: 'rtb_2_4',
                    siteId: '123',
                    catIab: ['IAB17-15'],
                    userIp: '0.0.0.0',
                    userId: '1234',
                    country: 'IRL',
                    impressionId: impression_id.toString(),
                    keywords: 'lifestyle, humour',
                    bidfloor: 0.00000011,
                    bidfloorcur: 'EUR',
                    mimes: ['image/jpg'],
                    image_output: 'html',
                    endpoint: 'https://rtb.exads.rocks/rtb.php'
                }
            }]
        }];
```

##### RTB Banner 2.4 (Video)
* **video_output** - Indicates output format for video banners* (string)

```javascript
adUnits = 
    [{  code: 'postbid_iframe', // the frame where to render the creative
        mediaTypes: {
            banner: {
                sizes: [900, 250]
            }
        },
        bids: [{
            bidder: 'exadsadserver',
            params: {
                    zoneId: 12345,
                    fid: '829a896f011475d50da0d82cfdd1af8d9cdb07ff',
                    partner: 'rtb_2_4',
                    siteId: '123',
                    catIab: ['IAB17-15'],
                    userIp: '0.0.0.0',
                    userId: '1234',
                    country: 'IRL',
                    impressionId: '1234',
                    keywords: 'lifestyle, humour',
                    bidfloor: 0.00000011,
                    bidfloorcur: 'EUR',
                    mimes: ['image/jpg'],
                    video_output: 'html',
                    endpoint: 'https://rtb.exads.rocks/rtb.php'
                }
            }]
        }];
```

#### RTB 2.4 Video (Instream/OutStream/Video Slider) - VAST XML or VAST TAG (url)

* **zoneId** (required) - you can get it from the endpoint created after configuring the zones (integer)
* **fid** (required) - you can get it from the endpoint created after configuring the zones (string)
* **partner** (required) - currently we support rtb 2.4 ("rtb_2_4") only (string)
* **siteId** (recommended) - unique Site ID (string)
* **catIab** - IAB category ID (array of string)
* **userIp** (required) - IP address of the user (string)*
* **userId** (*required) - unique user ID (string). *If you cannot generate a user ID, you can leave it empty (""). The request will get a response as long as "user" object is included in the request.
* **country** - Country ISO3 (string)
* **impressionId** (required) - unique impression ID within this bid request (string)
* **keywords** - keywords can be used to ensure ad zones get the right type of advertising. Keywords should be a string of comma-separated words
* **bidfloor** - Minimum bid for this impression (CPM) / click (CPC) and account currency, optional (float) 
* **bidfloorcur** - Currency for minimum bid value specified using ISO-4217 alpha codes, optional (string)
* **video.mimes** - List of supported mime types (string array)
* **context** - (recommended) - The video context, either 'instream', 'outstream'. Defaults to ‘instream’ (string)
* **protocols** - List of supported video bid response protocols (int array) 
* **endpoint** (required) - Exads endpoint (URL)

```javascript
adUnits = [{
    code: 'postbid_iframe',
    mediaTypes: {
        video: {
            mimes: ['video/mp4'],
            context: 'instream',
            protocols: [3, 6]
        }
    },
    bids: [{
        bidder: 'exadsadserver',
        params: {
            zoneId: 12345,
            fid: '829a896f011475d50da0d82cfdd1af8d9cdb07ff',
            partner: 'rtb_2_4',
            siteId: '123',
            catIab: ['IAB17-15'],
            userIp: '0.0.0.0',
            userId: '1234',
            impressionId: '1234',
            stream: {
                video: {
                    mimes: ['video/mp4']
                },
                protocols: [
                    3,
                    6
                ],
                ext: {
                    video_cta: 0
                }
            },
            country: 'IRL',
            keywords: 'lifestyle, humour',
            bidfloor: 0.00000011,
            bidfloorcur: 'EUR',
            endpoint: 'https://rtb.exads.rocks/rtb.php',
        }
    }]
}];
```

#### RTB 2.4 Native

* **zoneId** (required) - you can get it from the endpoint created after configuring the zones (integer)
* **fid** (required) - you can get it from the endpoint created after configuring the zones (string)
* **partner** (required) - currently we support rtb 2.4 ("rtb_2_4") only (string)
* **siteId** (recommended) - unique Site ID (string)
* **catIab** - IAB category ID (array of string)
* **userIp** (required) - IP address of the user (string)*
* **userId** (*required) - unique user ID (string). *If you cannot generate a user ID, you can leave it empty (""). The request will get a response as long as "user" object is included in the request.
* **country** - Country ISO3 (string)
* **impressionId** (required) - unique impression ID within this bid request (string)
* **keywords** - keywords can be used to ensure ad zones get the right type of advertising. Keywords should be a string of comma-separated words
* **bidfloor** - Minimum bid for this impression (CPM) / click (CPC) and account currency, optional (float) 
* **bidfloorcur** - Currency for minimum bid value specified using ISO-4217 alpha codes, optional (string)
* **native.plcmtcnt** - The number of identical placements in this Layout (integer)
* **assets (title)** - Title object for title assets* (JSON object)
    * **id** - Unique asset ID, assigned by exchange. Typically a counter for the array (integer) 1: Image asset ID, 2: Title asset ID, 3: Description asset ID
    * **required** - Set to 1 if asset is required or 0 if asset is optional (integer)
    * **title**
        * len (required) - Maximum length of the text in the title element. (integer)
* **assets (data)**
    * **id** - Unique asset ID, assigned by exchange. Typically a counter for the array (integer) 1: Image asset ID, 2: Title asset ID, 3: Description asset ID
    * **data**
        * **type** - Type ID of the element supported by the publisher (integer). We support: 1 (sponsored - Sponsored By message where response should contain the brand name of the sponsor), 2 (desc - Descriptive text associated with the product or service being advertised)
        * **len**
* **assets (img)**
    * **id** - Unique asset ID, assigned by exchange. Typically a counter for the array (integer) 1: Image asset ID, 2: Title asset ID, 3: Description asset ID
    * **required** - Set to 1 if asset is required or 0 if asset is optional (integer)
    * **img**
        * **type** - Type ID of the image element supported by the publisher. We support: 1 (Icon image) (integer), 3 (Large image preview for the ad) (integer)
        * **w** - Width of the image in pixels, optional (integer)
        * **h** - Height of the image in pixels, optional (integer)
    
```javascript
adUnits = [{
    code: 'postbid_iframe',
    mediaTypes: {
        native: {
            ortb: {
                assets: [{
                    id: 2,
                    required: 1,
                    title: {
                        len: 124
                    }
                },
                {
                    id: 3,
                    data: {
                        type: 1,
                        len: 50
                    }
                },
                {
                    id: 1,
                    required: 1,
                    img: {
                        type: 3,
                        w: 300,
                        h: 300,
                    }
                }]
            }
        },
    },
    bids: [{
        bidder: 'exadsadserver',
        params: {
                zoneId: 12345,
                fid: '829a896f011475d50da0d82cfdd1af8d9cdb07ff',
                partner: 'rtb_2_4',
                siteId: '123',
                catIab: ['IAB17-15'],
                userIp: '0.0.0.0',
                userId: '1234',
                impressionId: '1234',
                native: {
                    plcmtcnt: 4,
                },
                country: 'IRL',
                keywords: 'lifestyle, humour',
                bidfloor: 0.00000011,
                bidfloorcur: 'EUR',
                endpoint: 'https://rtb.exads.rocks/rtb.php',
            }
        }]
}];
```