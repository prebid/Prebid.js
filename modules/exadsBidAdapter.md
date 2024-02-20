# Overview

**Module Name**: Exads Bidder Adapter

**Module Type**: Bidder Adapter

**Maintainer**: info@exads.com

# Description

Module that connects to EXADS' bidder for bids.

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
 
Now you will find the different parameters to set, based on publisher website. They are optional unless otherwise specified.
 
#### RTB Banner 2.4

* **zoneId** (required) - you can get it from the endpoint created after configuring the zones (integer)
* **fid** (required) - you can get it from the endpoint created after configuring the zones (string)
* **partner** (required) - currently we support rtb 2.4 ("ortb_2_4") only (string)
* **siteId** (recommended) - unique Site ID (string)
* **banner.sizes** (required) - one integer array - [width, height]
* **catIab** - IAB category ID (string array)
* **userIp** (required) - IP address of the user, ipv4 or ipv6 (string)
* **userId** (*required) - unique user ID (string). *If you cannot generate a user ID, you can leave it empty (""). The request will get a response as long as "user" object is included in the request
* **country** - country ISO3
* **impressionId** (required) - unique impression ID within this bid request (string)
* **keywords** - keywords can be used to ensure ad zones get the right type of advertising. Keywords should be a string of comma-separated words
* **bidfloor** - minimum bid for this impression (CPM) / click (CPC) and account currency (float) 
* **bidfloorcur** - currency for minimum bid value specified using ISO-4217 alpha codes (string)
* **mimes** - list of supported mime types. We support: image/jpeg, image/jpg, image/png, image/png, image/gif, image/webp, video/mp4 (string array)
* **endpoint** (required) - EXADS endpoint (URL)

##### RTB Banner 2.4 (Image)
* **imageOutput** - indicates output format for image banners (string)
    * options are **xml** or **html**. Default value is **xml** in case field is not provided

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
                    partner: 'ortb_2_4',
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
                    imageOutput: 'html',
                    endpoint: 'https://your-ad-network.com/rtb.php'
                }
            }]
        }];
```

##### RTB Banner 2.4 (Video)
* **videoOutput** - indicates output format for video banners (string)
    * options are **xml** or **html**. Default value is **xml** in case field is not provided

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
                    partner: 'ortb_2_4',
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
                    videoOutput: 'html',
                    endpoint: 'https://your-ad-network.com/rtb.php'
                }
            }]
        }];
```

#### RTB 2.4 Video (Instream/OutStream/Video Slider) - VAST XML or VAST TAG (url)

* **zoneId** (required) - you can get it from the endpoint created after configuring the zones (integer)
* **fid** (required) - you can get it from the endpoint created after configuring the zones (string)
* **partner** (required) - currently we support rtb 2.4 ("ortb_2_4") only (string)
* **siteId** (recommended) - unique Site ID (string)
* **catIab** - IAB category ID (string array)
* **userIp** (required) - IP address of the user, ipv4 or ipv6 (string)
* **userId** (*required) - unique user ID (string). *If you cannot generate a user ID, you can leave it empty (""). The request will get a response as long as "user" object is included in the request
* **country** - Country ISO3 (string)
* **impressionId** (required) - unique impression ID within this bid request (string)
* **keywords** - keywords can be used to ensure ad zones get the right type of advertising. Keywords should be a string of comma-separated words
* **bidfloor** - minimum bid for this impression (CPM) / click (CPC) and account currency, optional (float) 
* **bidfloorcur** - currency for minimum bid value specified using ISO-4217 alpha codes, optional (string)
* **video.mimes** - list of supported mime types (string array)
* **context** - (recommended) - the video context, either 'instream', 'outstream'. Defaults to ‘instream’ (string)
* **protocols** - list of supported video bid response protocols (integer array) 
* **endpoint** (required) - EXADS endpoint (URL)

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
            partner: 'ortb_2_4',
            siteId: '123',
            catIab: ['IAB17-15'],
            userIp: '0.0.0.0',
            userId: '1234',
            impressionId: '1234',
            stream: {
                video: {
                    mimes: ['video/mp4'],
                    protocols: [3,6]
                },
                ext: {
                    video_cta: 0
                }
            },
            country: 'IRL',
            keywords: 'lifestyle, humour',
            bidfloor: 0.00000011,
            bidfloorcur: 'EUR',
            endpoint: 'https://your-ad-network.com/rtb.php'
        }
    }]
}];
```

#### RTB 2.4 Native

* **zoneId** (required) - you can get it from the endpoint created after configuring the zones (integer)
* **fid** (required) - you can get it from the endpoint created after configuring the zones (string)
* **partner** (required) - currently we support rtb 2.4 ("ortb_2_4") only (string)
* **siteId** (recommended) - unique Site ID (string)
* **catIab** - IAB category ID (string array)
* **userIp** (required) - IP address of the user, ipv4 or ipv6 (string)
* **userId** (*required) - unique user ID (string). *If you cannot generate a user ID, you can leave it empty (""). The request will get a response as long as "user" object is included in the request
* **country** - country ISO3 (string)
* **impressionId** (required) - unique impression ID within this bid request (string)
* **keywords** - keywords can be used to ensure ad zones get the right type of advertising. Keywords should be a string of comma-separated words
* **bidfloor** - minimum bid for this impression (CPM) / click (CPC) and account currency, optional (float) 
* **bidfloorcur** - currency for minimum bid value specified using ISO-4217 alpha codes, optional (string)
* **native.plcmtcnt** - the number of identical placements in this Layout (integer)
* **assets (title)**
    * **id** - unique asset ID, assigned by exchange. Typically a counter for the array (integer): 
        * 1 - image asset ID
        * 2 - title asset ID
        * 3 - description asset ID
    * **required** - set to 1 if asset is required or 0 if asset is optional (integer)
    * **title**
        * len (required) - maximum length of the text in the title element (integer)
* **assets (data)**
    * **id** - unique asset ID, assigned by exchange. Typically a counter for the array (integer):
        * 1 - image asset ID
        * 2 - title asset ID
        * 3 - description asset ID
    * **data**
        * **type** - type ID of the element supported by the publisher (integer). We support: 
            * 1 - sponsored - sponsored By message where response should contain the brand name of the sponsor
            * 2 - desc - descriptive text associated with the product or service being advertised
        * **len** - maximum length of the text in the element’s response (integer)
* **assets (img)**
    * **id** - unique asset ID, assigned by exchange. Typically a counter for the array (integer): 
        * 1 - image asset ID
        * 2 - title asset ID
        * 3 - description asset ID
    * **required** - set to 1 if asset is required or 0 if asset is optional (integer)
    * **img**
        * **type** - type ID of the image element supported by the publisher. We support: 
            * 1 - icon image (integer)
            * 3 - large image preview for the ad (integer)
        * **w** - width of the image in pixels, optional (integer)
        * **h** - height of the image in pixels, optional (integer)
    
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
                        h: 300
                    }
                }]
            }
        }
    },
    bids: [{
        bidder: 'exadsadserver',
        params: {
                zoneId: 12345,
                fid: '829a896f011475d50da0d82cfdd1af8d9cdb07ff',
                partner: 'ortb_2_4',
                siteId: '123',
                catIab: ['IAB17-15'],
                userIp: '0.0.0.0',
                userId: '1234',
                impressionId: '1234',
                native: {
                    plcmtcnt: 4
                },
                country: 'IRL',
                keywords: 'lifestyle, humour',
                bidfloor: 0.00000011,
                bidfloorcur: 'EUR',
                endpoint: 'https://your-ad-network.com/rtb.php'
            }
        }]
}];
```
# Tools and suggestions
This section contains some suggestions that allow to set some parameters automatically.

### User Ip / Country
In order to detect the current user ip there are different approaches. An example is using public web services as ```https://api.ipify.org```.

Example of usage (to add to the publisher websites):

```
<script>
    let userIp = '';
    let ip_script = document.createElement("script");
    ip_script.type = "text/javascript";
    ip_script.src = "https://api.ipify.org?format=jsonp&callback=userIpCallback";
    
    function userIpCallback(user_ip) {
        userIp = user_ip.ip;
    }
</script>
```

The same service gives the possibility to detect the country as well. Check the official web page about possible limitations of the free licence. 

### Impression Id
Each advertising request has to be identified uniquely by an id.
One possible approach is using a classical hash function.

```
<script>
    let impression_id = hashCode(new Date().getTime().toString());
    
    // MurmurHash3 hash function
    function hashCode(str, seed = 0) {
        let h1 = 0xdeadbeef ^ seed, h2 = 0x41c6ce57 ^ seed;
        for (let i = 0, ch; i < str.length; i++) {
            ch = str.charCodeAt(i);
            h1 = Math.imul(h1 ^ ch, 2654435761);
            h2 = Math.imul(h2 ^ ch, 1597334677);
        }
        h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
        h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
        return 4294967296 * (2097151 & h2) + (h1 >>> 0);
    }
</script>
```

### User Id
The approach used for impression id could be used for generating a unique user id.
Also, it is recommended to store the id locally, e.g. by the browser localStorage.

```
<script>
let userId = localStorage.getItem('prebidJS.user_id');

if(!userId) {
    localStorage.setItem('prebidJS.user_id', hashCode('user_id' + new Date().getTime().toString()));
    userId =  localStorage.getItem('prebidJS.user_id');
}
</script>
```