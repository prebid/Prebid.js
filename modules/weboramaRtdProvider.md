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

Contact prebid-support@weborama.com for more information.

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

The module configuration has 3 independent sections (`weboCtxConf` and `weboUserDataConf`), each one mapped to a single product (`contextual` and `wam`). No section is enabled by default, we must be explicit like in the minimal example below:

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
            }
        },
        // other modules...
        ]
    }
});
```

Each module can perform two actions:

* set targeting on [GPT](https://docs.prebid.org/dev-docs/publisher-api-reference/setTargetingForGPTAsync.html) / [AST](https://docs.prebid.org/dev-docs/publisher-api-reference/setTargetingForAst.html]) via `prebid.js`

* send data to other `prebid.js` bidder modules (check the complete list at the end of this page)

### Parameter Descriptions for the Weborama Configuration Section

This is the main configuration section

| Name  |Type | Description   | Notes  |
| :------------ | :------------ | :------------ |:------------ |
| name | String | Real time data module name | Mandatory. Always 'Weborama' |
| waitForIt | Boolean | Mandatory. Required to ensure that the auction is delayed until prefetch is complete | Optional. Defaults to false but recommended to true |
| params | Object | | Optional |
| params.setPrebidTargeting | Boolean | If true, may use the profile to set the prebid (GPT/GAM or AST) targeting of all adunits managed by prebid.js | Optional. Affects the `weboCtxConf` and `weboUserDataConf` sections |
| params.sendToBidders | Boolean or Array | If true, may send the profile to all bidders. If an array, will specify the bidders to send data | Optional. Affects the `weboCtxConf` and `weboUserDataConf` sections |
| params.weboCtxConf | Object | Weborama Contextual Site-Centric Configuration | Optional |
| params.weboUserDataConf | Object | Weborama WAM User-Centric Configuration | Optional |
| params.onData | Callback | If set, will receive the profile and metadata | Optional. Affects the `weboCtxConf` and `weboUserDataConf` sections |

#### Contextual Site-Centric Configuration

To be possible use the integration with Weborama Contextual Service you must be a client with a valid API token. Please contact weborama if you don't have it.

On this section we will explain the `params.weboCtxConf` subconfiguration:

| Name  |Type | Description   | Notes  |
| :------------ | :------------ | :------------ |:------------ |
| token | String | Security Token provided by Weborama, unique per client | Mandatory |
| targetURL | String | Url to be profiled in the contextual api | Optional. Defaults to `document.URL` |
| setPrebidTargeting|Various|If true, will use the contextual profile to set the prebid (GPT/GAM or AST) targeting of all adunits managed by prebid.js| Optional. Default is `params.setPrebidTargeting` (if any) or `true`.|
| sendToBidders|Various|If true, will send the contextual profile to all bidders. If an array, will specify the bidders to send data| Optional. Default is `params.sendToBidders` (if any) or `true`.|
| defaultProfile | Object | default value of the profile to be used when there are no response from contextual api (such as timeout)| Optional. Default is `{}` |
| onData | Callback | If set, will receive the profile and metadata | Optional. Default is `params.onData` (if any) or log via prebid debug |
| enabled | Boolean| if false, will ignore this configuration| Default is `true` if this section is present|
| baseURLProfileAPI | String| if present, update the domain of the contextual api| Optional. Default is `ctx.weborama.com` |

#### WAM User-Centric Configuration

To be possible use the integration with Weborama Audience Manager (WAM) you must be a client with an account id and you lust include the `wamfactory` script in your pages with `wam2gam` feature activated.
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

### More configuration examples

A more complete example can be found below. We can define default profiles, for each section, to be used in case of no data are found.

We can control if we will set prebid targeting or send data to bidders in a global level or on each section (`contextual` or `wam`).

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
                }
            }]
        }
    });
});
```

Imagine we need to configure the following options using the previous example, we can write the configuration like the one below.

||contextual|wam|
| :------------ | :------------ | :------------ |
|setPrebidTargeting|true|false|
|sendToBidders|false|true|

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
                        var sourceOfData    = meta.source; // contextual or wam
                        var isDefault       = meta.isDefault; // true if using default profile

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
                }
            }]
        }
    });
});
```

### Supported Bidders

We currently support the following bidder adapters:

* SmartADServer SSP
* PubMatic SSP
* AppNexus SSP
* Rubicon SSP

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
* Rise
* Smaato
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
