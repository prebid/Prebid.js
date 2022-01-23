# Weborama Real-Time Data Submodule

```
Module Name: Weborama Rtd Provider
Module Type: Rtd Provider
Maintainer: prebid-support@weborama.com
```

# Description

Weborama provides a Semantic AI Contextual API that classifies in Real-time a web page seen by a web user within generic and custom topics. It enables publishers to better monetize their inventory and unlock it to programmatic.

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
                    onData: function(data, site){ // optional
                        var kind = (site)? 'site' : 'user';
                        console.log('onData', kind, data);
                    },
                    weboCtxConf: {
                        token: "to-be-defined", // mandatory
                        targetURL: "https://prebid.org", // default is document.URL
                        setPrebidTargeting: true, // override param.setPrebidTargeting or default true
                        sendToBidders: true,      // override param.sendToBidders or default true
                        defaultProfile: {         // optional
                            webo_ctx: ['moon'],
                            webo_ds: ['bar']
                        }
                        //, onData: function (data, ...) { ...}
                    },
                    weboUserDataConf: {
                        accountId: 12345,         // optional, used for logging
                        setPrebidTargeting: true, // override param.setPrebidTargeting or default true
                        sendToBidders: true,      // override param.sendToBidders or default true
                        defaultProfile: {         // optional
                            webo_cs: ['Red'],
                            webo_audiences: ['bam']
                        },
                        localStorageProfileKey: 'webo_wam2gam_entry' // default
                        //, onData: function (data, ...) { ...}
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
| params.weboCtxConf | Object | Weborama Contextual Configuration | Optional 
| params.weboUserDataConf | Object | Weborama User-Centric Configuration | Optional |
| params.onData | Callback | If set, will receive the profile and site flag | Optional. Affects the `weboCtxConf` and `weboUserDataConf` sections |

#### Contextual Configuration

| Name  |Type | Description   | Notes  |
| :------------ | :------------ | :------------ |:------------ |
| token | String | Security Token provided by Weborama, unique per client | Mandatory |
| targetURL | String | Url to be profiled in the contextual api | Optional. Defaults to `document.URL` |
| setPrebidTargeting|Boolean|If true, will use the contextual profile to set the prebid (GPT/GAM or AST) targeting of all adunits managed by prebid.js| Optional. Default is `params.setPrebidTargeting` (if any) or **true**.|
| sendToBidders|Boolean|If true, will send the contextual profile to all bidders| Optional. Default is `params.sendToBidders` (if any) or **true**.|
| defaultProfile | Object | default value of the profile to be used when there are no response from contextual api (such as timeout)| Optional. Default is `{}` |
| onData | Callback | If set, will receive the profile and site flag | Optional. Default is `params.onData` (if any) or log via prebid debug |
| enabled | Boolean| if false, will ignore this configuration| default true|

#### User-Centric Configuration

| Name  |Type | Description   | Notes  |
| :------------ | :------------ | :------------ |:------------ |
| accountId|Number|WAM account id. If present, will be used on logging and statistics| Optional.|
| setPrebidTargeting|Boolean|If true, will use the user profile to set the prebid (GPT/GAM or AST) targeting of all adunits managed by prebid.js| Optional. Default is `params.setPrebidTargeting` (if any) or **true**.|
| sendToBidders|Boolean|If true, will send the user profile to all bidders| Optional. Default is `params.sendToBidders` (if any) or **true**.|
| onData | Callback | If set, will receive the profile and site flag | Optional. Default is `params.onData` (if any) or log via prebid debug |
| defaultProfile | Object | default value of the profile to be used when there are no response from contextual api (such as timeout)| Optional. Default is `{}` |
| localStorageProfileKey| String | can be used to customize the local storage key | Optional |
| enabled | Boolean| if false, will ignore this configuration| default true|

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

`gulp serve --notest --nolint --modules=rtdModule,weboramaRtdProvider,smartadserverBidAdapter,pubmaticBidAdapter,appnexusBidAdapter,rubiconBidAdapter,criteoBidAdapter`

and then point your browser at:

`http://localhost:9999/integrationExamples/gpt/weboramaRtdProvider_example.html`
