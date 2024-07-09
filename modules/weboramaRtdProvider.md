# Weborama Real-Time Data Submodule

```
Module Name: Weborama Rtd Provider
Module Type: Rtd Provider
Maintainer: prebid-support@weborama.com
```

## Description

Weborama provides a Real-Time Data Submodule for `Prebid.js`, allowing to easy integrate different products such as:

* Semantic AI Contextual API that classifies in Real-time a web page seen by a web user within generic and custom topics. It enables publishers to better monetize their inventory and unlock it to programmatic.

* Weborama Audience Manager (WAM) is a DMP (Data Management Platform) used by over 60 companies in the world. This platform distinguishes itself particularly by a high level interconnexion with the adtech & martech ecosystem and a transparent access to the database intelligence.

* LiTE by SFBX® (Local inApp Trust Engine) provides “Zero Party Data” given by users, stored and calculated only on the user’s device. Through a unique cohorting system, it enables better monetization in a consent/consentless and identity-less mode.

Contact [prebid-support@weborama.com] for more information.

### Publisher Usage

Compile the Weborama RTD module into your Prebid build:

`gulp build --modules=rtdModule,weboramaRtdProvider`

Add the Weborama RTD provider to your Prebid config, use the configuration template below:

```javascript
var pbjs = pbjs || {};
pbjs.que = pbjs.que || [];

pbjs.que.push(function () {
    pbjs.setConfig({
        debug: true, // Output debug messages to the web console, *should* be disabled in production
        realTimeData: {
            auctionDelay: 1000,
            dataProviders: [{
                name: "weborama",
                waitForIt: true,
                params: {
                    /* add weborama rtd submodule configuration here */
                },
            },
            // other modules...
            ]
        }
    });
});
```

The module configuration has 3 independent sections (`weboCtxConf`, `weboUserDataConf` and `sfbxLiteDataConf`), each one mapped to a single product (`contextual`, `wam` and `lite`). No section is enabled by default, we must be explicit like in the minimal example below:

```javascript
pbjs.setConfig({
    debug: true,
    realTimeData: {
        auctionDelay: 1000,
        dataProviders: [{
            name: "weborama",
            waitForIt: true,
            params: {
                weboCtxConf: {     // contextual site-centric configuration, *omit if not needed*
                    token: "<<to-be-defined>>", // mandatory
                },
                weboUserDataConf: { // wam user-centric configuration, *omit if not needed*
                    enabled: true,
                },
                sfbxLiteDataConf: { // sfbx-lite site-centric configuration, *omit if not needed*
                    enabled: true, 
                },
            }
        },
        // other modules...
        ]
    }
});
```

Each module can perform two actions:

* set targeting on [GPT](https://docs.prebid.org/dev-docs/publisher-api-reference/setTargetingForGPTAsync.html) / [AST](https://docs.prebid.org/dev-docs/publisher-api-reference/setTargetingForAst.html) via `prebid.js`

* send data to other `prebid.js` bidder modules (check the complete list at the end of this page)

### Parameter Descriptions for the Weborama Configuration Section

This is the main configuration section

| Name  |Type | Description   | Notes  |
| :------------ | :------------ | :------------ |:------------ |
| name | String | Real time data module name | Mandatory. Always 'Weborama' |
| waitForIt | Boolean | Mandatory. Required to ensure that the auction is delayed until prefetch is complete | Optional. Defaults to false but recommended to true |
| params | Object | | Optional |
| params.setPrebidTargeting | Boolean | If true, may use the profile to set the prebid (GPT/GAM or AST) targeting of all adunits managed by prebid.js | Optional. Affects the `weboCtxConf`, `weboUserDataConf` and `sfbxLiteDataConf` sections |
| params.sendToBidders | Boolean or Array | If true, may send the profile to all bidders. If an array, will specify the bidders to send data | Optional. Affects the `weboCtxConf`, `weboUserDataConf` and `sfbxLiteDataConf` sections |
| params.weboCtxConf | Object | Weborama Contextual Site-Centric Configuration | Optional |
| params.weboUserDataConf | Object | Weborama WAM User-Centric Configuration | Optional |
| params.sfbxLiteDataConf | Object | Sfbx LiTE Site-Centric Configuration | Optional |
| params.onData | Callback | If set, will receive the profile and metadata | Optional. Affects the `weboCtxConf`, `weboUserDataConf` and `sfbxLiteDataConf` sections |

#### Contextual Site-Centric Configuration

To be possible use the integration with Weborama Contextual Service you must be a client with a valid API token. Please contact weborama if you don't have it.

On this section we will explain the `params.weboCtxConf` subconfiguration:

| Name  |Type | Description   | Notes  |
| :------------ | :------------ | :------------ |:------------ |
| token | String | Security Token provided by Weborama, unique per client | Mandatory |
| targetURL | String | Url to be profiled in the contextual api | Optional. Defaults to `document.URL` |
| assetID | Function or String | if provided, we will call the document-profile api using this asset id. |Optional|
| setPrebidTargeting|Various|If true, will use the contextual profile to set the prebid (GPT/GAM or AST) targeting of all adunits managed by prebid.js| Optional. Default is `params.setPrebidTargeting` (if any) or `true`.|
| sendToBidders|Various|If true, will send the contextual profile to all bidders. If an array, will specify the bidders to send data| Optional. Default is `params.sendToBidders` (if any) or `true`.|
| defaultProfile | Object | default value of the profile to be used when there are no response from contextual api (such as timeout)| Optional. Default is `{}` |
| onData | Callback | If set, will receive the profile and metadata | Optional. Default is `params.onData` (if any) or log via prebid debug |
| enabled | Boolean| if false, will ignore this configuration| Default is `true` if this section is present|
| baseURLProfileAPI | String| if present, update the domain of the contextual api| Optional. Default is `ctx.weborama.com` |

#### User-Centric Configuration

To be possible use the integration with Weborama Audience Manager (WAM) you must be a client with an account id and you must include the `wamfactory` script in your pages with `wam2gam` feature activated.
Please contact weborama if you don't have it.

On this section we will explain the `params.weboUserDataConf` subconfiguration:

| Name  |Type | Description   | Notes  |
| :------------ | :------------ | :------------ |:------------ |
| accountId|Number|WAM account id. If you don't have it, please contact weborama. | Recommended.|
| setPrebidTargeting|Various|If true, will use the user profile to set the prebid (GPT/GAM or AST) targeting of all adunits managed by prebid.js| Optional. Default is `params.setPrebidTargeting` (if any) or `true`.|
| sendToBidders|Various|If true, will send the user profile to all bidders| Optional. Default is `params.sendToBidders` (if any) or `true`.|
| onData | Callback | If set, will receive the profile and site flag | Optional. Default is `params.onData` (if any) or log via prebid debug |
| defaultProfile | Object | default value of the profile to be used when there are no response from contextual api (such as timeout)| Optional. Default is `{}` |
| localStorageProfileKey| String | can be used to customize the local storage key | Optional |
| enabled | Boolean| if false, will ignore this configuration| Default is `true` if this section is present|

##### User Consent

The WAM User-Centric configuration will check for user consent if gdpr applies. It will check for consent:

* Vendor ID 284 (Weborama)
* Purpose IDs: 1, 3, 4, 5 and 6

If the user consent does not match such conditions, this module will not load, means we will not check for any data in local storage and the default profile will be ignored.

#### Sfbx LiTE Site-Centric Configuration

To be possible use the integration between Weborama and Sfbx LiTE you should also contact SFBX® to setup this product.

On this section we will explain the `params.sfbxLiteDataConf` subconfiguration:

| Name  |Type | Description   | Notes  |
| :------------ | :------------ | :------------ |:------------ |
| setPrebidTargeting|Various|If true, will use the user profile to set the prebid (GPT/GAM or AST) targeting of all adunits managed by prebid.js| Optional. Default is `params.setPrebidTargeting` (if any) or `true`.|
| sendToBidders|Varios|If true, will send the user profile to all bidders| Optional. Default is `params.sendToBidders` (if any) or `true`.|
| onData | Callback | If set, will receive the profile and site flag | Optional. Default is `params.onData` (if any) or log via prebid debug |
| defaultProfile | Object | default value of the profile to be used when there are no response from contextual api (such as timeout)| Optional. Default is `{}` |
| localStorageProfileKey| String | can be used to customize the local storage key | Optional |
| enabled | Boolean| if false, will ignore this configuration| Default is `true` if this section is present|

##### Property setPrebidTargeting supported types

This property support the following types

| Type  | Description | Example   | Notes  |
| :------------ | :------------ | :------------ |:------------ |
| Boolean|If true, set prebid targeting for all adunits, or not in case of false| `true` | default value |
| String|Will set prebid targeting only for one adunit | `'adUnitCode1'` |  |
| Array of Strings|Will set prebid targeting only for some adunits| `['adUnitCode1','adUnitCode2']` |  |
| Callback |Will be executed for each adunit, expects return a true value to set prebid targeting or not| `function(adUnitCode){return adUnitCode == 'adUnitCode';}` |  |

The complete callback function signature is:

```javascript
setPrebidTargeting: function(adUnitCode, data, metadata){
    return true; // or false, depending on the logic
}
```

This callback will be executed with the adUnitCode, profile and a metadata with the following fields

| Name  |Type | Description   | Notes  |
| :------------ | :------------ | :------------ |:------------ |
| user | Boolean | If true, it contains user-centric data |  |
| source | String | Represent the source of data | can be `contextual`, `wam` or `lite`  |
| isDefault | Boolean | If true, it contains the default profile defined in the configuration |  |

It is possible customize the targeting based on the parameters:

```javascript
setPrebidTargeting: function(adUnitCode, data, metadata){
    // check metadata.source can be omitted if defined in params.weboUserDataConf
    if (adUnitCode == 'adUnitCode1' && metadata.source == 'wam'){
        data['foo']=['bar'];  // add this section only for adUnitCode1
        delete data['other']; // remove this section
    }
    return true;
}
```

##### Property sendToBidders supported types

This property support the following types

| Type  | Description | Example   | Notes  |
| :------------ | :------------ | :------------ |:------------ |
| Boolean|If true, send data to all bidders, or not in case of false| `true` | default value |
| String|Will send data to only one bidder | `'appnexus'` |  |
| Array of Strings|Will send data to only some bidders | `['appnexus','pubmatic']` |  |
| Object |Will send data to only some bidders and some ad units | `{appnexus: true, pubmatic:['adUnitCode1']}` |  |
| Callback |Will be executed for each adunit, expects return a true value to set prebid targeting or not| `function(bid, adUnitCode){return bid.bidder == 'appnexus' && adUnitCode == 'adUnitCode';}` |  |

A better look on the `Object` type

```javascript
sendToBidders: {
    appnexus: true,           // send profile to appnexus on all ad units
    pubmatic: ['adUnitCode1'],// send profile to pubmatic on this ad units 
}
```

The complete callback function signature is:

```javascript
sendToBidders: function(bid, adUnitCode, data, metadata){
    return true; // or false, depending on the logic
}
```

This callback will be executed with the bid object (contains a field `bidder` with name), adUnitCode, profile and a metadata with the following fields

| Name  |Type | Description   | Notes  |
| :------------ | :------------ | :------------ |:------------ |
| user | Boolean | If true, it contains user-centric data |  |
| source | String | Represent the source of data | can be `contextual`, `wam` or `lite`  |
| isDefault | Boolean | If true, it contains the default profile defined in the configuration |  |

It is possible customize the targeting based on the parameters:

```javascript
sendToBidders: function(bid, adUnitCode, data, metadata){
    if (bid.bidder == 'appnexus' && adUnitCode == 'adUnitCode1'){
        data['foo']=['bar']; // add this section only for appnexus + adUnitCode1
        delete data['other']; // remove this section
    }
    return true;
}
```

To be possible customize the way we send data to bidders via this callback:

```javascript
sendToBidders: function(bid, adUnitCode, data, metadata){
    if (bid.bidder == 'other'){
        /* use bid object to store data based on this specific logic, like in the example below */
       
        bid.params = bid.params || {};
        bid.params['some_specific_key'] = data;

        return false; // will prevent the module to follow the pre-defined logic per bidder
    }
    // others
    return true;
}
```

In case of using bid _aliases_, we should match the same string used in the adUnit configuration.

```javascript
pbjs.aliasBidder('appnexus', 'foo');
pbjs.aliasBidder('criteo', 'bar');
pbjs.aliasBidder('pubmatic', 'baz');
pbjs.setConfig({
    realTimeData: {
        dataProviders: [{
            name: "weborama",
            waitForIt: true,
            params: {
                weboCtxConf: {
                    token: "to-be-defined", // mandatory
                    sendToBidders: ['foo','bar'], // will share site-centric data with bidders foo and bar
                },
                weboUserDataConf: {
                    accountId: 12345,       // recommended,
                    sendToBidders: ['baz'], // will share user-centric data with only bidder baz
                }
            }
        }]
    }
});
```

##### Using onData callback

We can specify a callback to handle the profile data from site-centric or user-centric data.

This callback will be executed with the profile and a metadata with the following fields

| Name  |Type | Description   | Notes  |
| :------------ | :------------ | :------------ |:------------ |
| user | Boolean | If true, it contains user-centric data |  |
| source | String | Represent the source of data | can be `contextual`, `wam` or `lite`  |
| isDefault | Boolean | If true, it contains the default profile defined in the configuration |  |

The metadata maybe not useful if we define the callback on site-centric of user-centric configuration, but if defined in the global level:

```javascript
params: {
    onData: function(data, metadata){
        var hasUserCentricData = metadata.user;
        var dataSource = metadata.source;
        console.log('onData', data, hasUserCentricData, dataSource);
    }
}
```

an interesting example is to set GAM targeting in global level instead in slot level only for contextual data:

```javascript
params: {
    weboCtxConf: {
        token: 'to-be-defined',
        setPrebidTargeting: false,
        onData: function(data, metadata){
            var googletag = googletag || {};
            googletag.cmd = googletag.cmd || [];
            googletag.cmd.push(function () {
                for(var key in data){
                    googletag.pubads().setTargeting(key, data[key]);
                }
            });
        },
    }
}
```

### More configuration examples

A more complete example can be found below. We can define default profiles, for each section, to be used in case of no data are found.

We can control if we will set prebid targeting or send data to bidders in a global level or on each section (`contextual`, `wam` or `lite`).

By default we try to send the data to all destinations, always. To restrict we can have two choices:

* Set `setPrebidTargeting` or `sendToBidders` explicity to `true` or `false` on each section;
* Set `setPrebidTargeting` or `sendToBidders` globally to `false` and only enable on the right sections;

```javascript
var pbjs = pbjs || {};
pbjs.que = pbjs.que || [];

pbjs.que.push(function () {
    pbjs.setConfig({
        debug: true,
        realTimeData: {
            auctionDelay: 1000,
            dataProviders: [{
                name: "weborama",
                waitForIt: true,
                params: {
                    weboCtxConf: {
                        token: "<<to-be-defined>>", // mandatory
                        targetURL: "https://example.org", // default is document.URL
                        setPrebidTargeting: true, // override param.setPrebidTargeting. default is true
                        sendToBidders: true,      // override param.sendToBidders. default is true
                        defaultProfile: {         // optional, used if nothing is found
                            webo_ctx: [ ... ],    // contextual segments
                            webo_ds: [ ...],      // data science segments
                        },
                        enabled: true,
                    },
                    weboUserDataConf: {
                        setPrebidTargeting: true, // override param.setPrebidTargeting. default is true
                        sendToBidders: true,      // override param.sendToBidders. default is true
                        defaultProfile: {            // optional, used if nothing is found
                            webo_cs: [...],        // wam custom segments
                            webo_audiences: [...], // wam audiences 
                        },
                        enabled: true,
                    },
                    sfbxLiteDataConf: {
                        setPrebidTargeting: true, // override param.setPrebidTargeting. default is true
                        sendToBidders: true,      // override param.sendToBidders. default is true
                        defaultProfile: {           // optional, used if nothing is found
                            /* add specific lite segments here */
                        },
                        enabled: true,
                    },
                }
            }]
        }
    });
});
```

An alternative version, using asset id instead of target url on contextual, can be found here:

```javascript
var pbjs = pbjs || {};
pbjs.que = pbjs.que || [];

pbjs.que.push(function () {
    pbjs.setConfig({
        debug: true,
        realTimeData: {
            auctionDelay: 1000,
            dataProviders: [{
                name: "weborama",
                waitForIt: true,
                params: {
                    weboCtxConf: {
                        token: "<<to-be-defined>>", // mandatory
                        assetID: "datasource:docId", // can be a callback to be executed in runtime and returns the identifier
                        setPrebidTargeting: true, // override param.setPrebidTargeting. default is true
                        sendToBidders: true,      // override param.sendToBidders. default is true
                        defaultProfile: {         // optional, used if nothing is found
                            webo_ctx: [ ... ],    // contextual segments
                            webo_ds: [ ...],      // data science segments
                        },
                        enabled: true,
                    },
                    ...
    });
});
```

Imagine we need to configure the following options using the previous example, we can write the configuration like the one below.

||contextual|wam|lite|
| :------------ | :------------ | :------------ |:------------ |
|setPrebidTargeting|true|false|true|
|sendToBidders|false|true|true|

```javascript
var pbjs = pbjs || {};
pbjs.que = pbjs.que || [];

pbjs.que.push(function () {
    pbjs.setConfig({
        debug: true,
        realTimeData: {
            auctionDelay: 1000,
            dataProviders: [{
                name: "weborama",
                waitForIt: true,
                params: {
                    setPrebidTargeting: false, // optional. set the default value of each section.
                    sendToBidders: false,      // optional. set the default value of each section.
                    weboCtxConf: {
                        token: "<<to-be-defined>>", // mandatory
                        targetURL: "https://example.org", // default is document.URL
                        setPrebidTargeting: true, // override param.setPrebidTargeting. default is true
                        enabled: true,
                    },
                    weboUserDataConf: {
                        sendToBidders: true,      // override param.sendToBidders. default is true
                        enabled: true,
                    },
                    sfbxLiteDataConf: {
                        setPrebidTargeting: true, // override param.setPrebidTargeting. default is true
                        sendToBidders: true,      // override param.sendToBidders. default is true
                        enabled: true,
                    },
                }
            }]
        }
    });
});
```

We can also define a list of adunits / bidders that will receive data instead of using boolean values.

```javascript
var pbjs = pbjs || {};
pbjs.que = pbjs.que || [];

pbjs.que.push(function () {
    pbjs.setConfig({
        debug: true,
        realTimeData: {
            auctionDelay: 1000,
            dataProviders: [{
                name: "weborama",
                waitForIt: true,
                params: {
                    weboCtxConf: {
                        token: "to-be-defined", // mandatory
                        setPrebidTargeting: ['adUnitCode1',...], // set target only on certain adunits 
                        sendToBidders: ['appnexus',...], // overide, send to only some bidders
                        enabled: true,
                    },
                    weboUserDataConf: {
                        accountId: 12345,           // recommended
                        setPrebidTargeting: ['adUnitCode2',...], // set target only on certain adunits 
                        sendToBidders: ['rubicon',...], // overide, send to only some bidders
                        enabled: true,
                    },
                    sfbxLiteDataConf: {
                        setPrebidTargeting: ['adUnitCode3',...], // set target only on certain adunits 
                        sendToBidders: ['smartadserver',...], // overide, send to only some bidders
                        enabled: true,
                    }
                }
            }]
        }
    });
});
```

Finally, we can combine several styles in the same configuration if needed. Including the callback style.

```javascript
var pbjs = pbjs || {};
pbjs.que = pbjs.que || [];

pbjs.que.push(function () {
    pbjs.setConfig({
        debug: true,
        realTimeData: {
            auctionDelay: 1000,
            dataProviders: [{
                name: "weborama",
                waitForIt: true,
                params: {
                    setPrebidTargeting: true, // optional
                    sendToBidders: true,      // optional
                    onData: function(data, meta){ // optional
                        var userCentricData = meta.user;   // maybe undefined
                        var sourceOfData    = meta.source; // contextual, wam or lite

                        var isDefault       = meta.isDefault; // true if uses default profile

                        console.log('onData', data, meta);
                    },
                    weboCtxConf: {
                        token: "to-be-defined", // mandatory
                        targetURL: "https://prebid.org", // default is document.URL
                        setPrebidTargeting: true, // override param.setPrebidTargeting or default true
                        sendToBidders: ['appnexus',...], // overide, send to only some bidders
                        defaultProfile: {         // optional
                            webo_ctx: ['moon'],
                            webo_ds: ['bar']
                        },
                        enabled: true,
                        //, onData: function (data, ...) { ...}
                    },
                    weboUserDataConf: {
                        accountId: 12345,           // recommended
                        setPrebidTargeting: ['adUnitCode1',...], // set target only on certain adunits 
                        sendToBidders: { // send to only some bidders and adunits
                            'appnexus': true,               // all adunits for appnexus 
                            'pubmatic': ['adUnitCode1',...] // some adunits for pubmatic
                            // other bidders will be ignored
                        },
                        defaultProfile: {           // optional
                            webo_cs: ['Red'],
                            webo_audiences: ['bam']
                        },
                        localStorageProfileKey: 'webo_wam2gam_entry', // default
                        enabled: true,
                        //, onData: function (data, ...) { ...}
                    },
                    sfbxLiteDataConf: {
                        setPrebidTargeting: function(adUnitCode){ // specify set target via callback
                            return adUnitCode == 'adUnitCode1';
                        },
                        sendToBidders: function(bid, adUnitCode){ // specify sendToBidders via callback
                            return bid.bidder == 'appnexus' && adUnitCode == 'adUnitCode1';
                        }
                        defaultProfile: {           // optional
                            lite_occupation: ['gérant', 'bénévole'],
                            lite_hobbies: ['sport', 'cinéma'],
                        },
                        localStorageProfileKey: '_lite', // default
                        enabled: true,
                        //, onData: function (data, ...) { ...}
                    }
                }
            }]
        }
    });
});
```

### Supported Bidders

We currently support the following bidder adapters with dedicated code:

* AppNexus SSP

We also set the bidder (and global, if no specific bidders are set on `sendToBidders`) ortb2 `site.ext.data` and `user.ext.data` sections (as arbitrary data). The following bidders may support it, to be sure, check the `First Party Data Support` on the feature list for the particular bidder from [here](https://docs.prebid.org/dev-docs/bidders).

* Adagio
* AdformOpenRTB
* AdKernel
* AdMixer
* Adnuntius
* Adrelevantis
* adxcg
* AMX RTB
* Avocet
* BeOp
* Criteo
* Etarget
* Inmar
* Index Exchange
* Livewrapped
* Mediakeys
* NoBid
* OpenX
* Opt Out Advertising
* Ozone Project
* Proxistore
* PubMatic SSP
* Rise
* Rubicon SSP
* Smaato
* Smart ADServer SSP
* Sonobi
* TheMediaGrid
* TripleLift
* TrustX
* Yahoo SSP
* Yieldlab
* Zeta Global Ssp

### Testing

To view an example of available segments returned by Weborama's backends:

`gulp serve --notest --nolint --modules=rtdModule,weboramaRtdProvider,smartadserverBidAdapter,pubmaticBidAdapter,appnexusBidAdapter,rubiconBidAdapter,criteoBidAdapter`

and then point your browser at:

`http://localhost:9999/integrationExamples/gpt/weboramaRtdProvider_example.html`
