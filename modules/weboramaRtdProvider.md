# Weborama Real-Time Data Submodule

```
Module Name: Weborama Rtd Provider
Module Type: Rtd Provider
Maintainer: prebid-support@weborama.com
```

# Description

Weborama provides a Semantic AI Contextual API that classifies in Real-time a web page seen by a web user within generic and custom topics. It enables publishers to better monetize their inventory and unlock it to programmatic.

TODO: add text about user-centric profile/wam2gam

Contact prebid-support@weborama.com for information.

### Publisher Usage

Compile the Weborama RTD module into your Prebid build:

`gulp build --modules=rtdModule,weboramaRtdProvider`

Add the Weborama RTD provider to your Prebid config.

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
                    weboCtxConf: {
                        token: "to-be-defined", // mandatory
                        targetURL: "https://prebid.org", // default is document.URL
                        setPrebidTargeting: true, // override param.setPrebidTargeting or default true
                        sendToBidders: true,      // override param.sendToBidders or default true
                        defaultProfile: {         // optruetional
                            webo_ctx: ['moon'],
                            webo_ds: ['bar']
                        }
                    },
                    weboUserDataConf: {
                        setPrebidTargeting: true, // override param.setPrebidTargeting or default true
                        sendToBidders: true,      // override param.sendToBidders or default true
                        defaultProfile: {         // optional
                            webo_cs: ['Red'],
                            webo_audiences: ['bam']
                        },
                        localStorageProfileKey: 'webo_wam2gam_entry' // default
                    }
                }
            }]
        }
    });
});
```

### Parameter Descriptions for the Weborama Configuration Section

| Name  |Type | Description   | Notes  |
| :------------ | :------------ | :------------ |:------------ |
| name | String | Real time data module name | Mandatory. Always 'Weborama' |
| waitForIt | Boolean | Mandatory. Required to ensure that the auction is delayed until prefetch is complete | Optional. Defaults to false but recommended to true |
| params | Object | | Optional |
| params.setPrebidTargeting | Boolean | If true, may use the profile to set the prebid (GPT/GAM or AST) targeting of all adunits managed by prebid.js | Optional. Affects the `weboCtxConf` and `weboUserDataConf` sections |
| params.sendToBidders | Boolean | If true, may send the profile to all bidders | Optional. Affects the `weboCtxConf` and `weboUserDataConf` sections |
| params.weboCtxConf | Object | Weborama Contextual Configuration | Optional |
| params.weboCtxConf.token | String | Security Token provided by Weborama, unique per client | Mandatory |
| params.weboCtxConf.targetURL | String | Url to be profiled in the contextual api | Optional. Defaults to `document.URL` |
| params.weboCtxConf.setPrebidTargeting|Boolean|If true, will use the contextual profile to set the prebid (GPT/GAM or AST) targeting of all adunits managed by prebid.js| Optional. Default is `params.setPrebidTargeting` (if any) or **true**.|
| params.weboCtxConf.sendToBidders|Boolean|If true, will send the contextual profile to all bidders| Optional. Default is `params.sendToBidders` (if any) or **true**.|
| params.weboCtxConf.defaultProfile | Object | default value of the profile to be used when there are no response from contextual api (such as timeout)| Optional. Default is `{}` |
| params.weboUserDataConf | Object | WeboUserData Configuration | Optional |
| params.weboUserDataConf.setPrebidTargeting|Boolean|If true, will use the user profile to set the prebid (GPT/GAM or AST) targeting of all adunits managed by prebid.js| Optional. Default is `params.setPrebidTargeting` (if any) or **true**.|
| params.weboUserDataConf.sendToBidders|Boolean|If true, will send the user profile to all bidders| Optional. Default is `params.sendToBidders` (if any) or **true**.|
| params.weboUserDataConf.defaultProfile | Object | default value of the profile to be used when there are no response from contextual api (such as timeout)| Optional. Default is `{}` |
| params.weboUserDataConf.localStorageProfileKey| String | can be used to customize the local storage key | Optional |

### Supported Bidders

We currently support the following bidder adapters:
* SmartADServer SSP
* PubMatic SSP
* AppNexus SSP
* Rubicon SSP

We also set the bidder and global ortb2 `site` and `user` sections. The following bidders may support it, to be sure, check the `First Party Data Support` on the feature list for the particular bidder from here: https://docs.prebid.org/dev-docs/bidders 

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

`gulp serve --modules=rtdModule,weboramaRtdProvider,smartadserverBidAdapter,pubmaticBidAdapter,appnexusBidAdapter,rubiconBidAdapter`

and then point your browser at:

`http://localhost:9999/integrationExamples/gpt/weboramaRtdProvider_example.html`
