# Weborama Real-Time Data Submodule

Module Name: Weborama Rtd Provider
Module Type: Rtd Provider
Maintainer: prebid@weborama.com

# Description

Weborama provides a disruptive API that allows its partners to leverage its
cutting-edge contextualization technology and its audience segments based on
cookies and consent or without cookies nor consent!

User-based segments and page-level automatic contextual categories will be
attached to bid request objects sent to different SSPs in order to optimize
targeting.

Automatic integration with Google Ad Manager and major bidders like Xandr/Appnexus,
Smartadserver, Index Exchange, Proxistore, Magnite/Rubicon or Triplelift !

User's country and choice management are included in the module, so it's 100%
compliant with local and regional laws like GDPR and CCPA/CPRA.

ORTB2 compliant and FPD support for Prebid versions < 4.29

Contact prebid@weborama.com for information.

### Publisher Usage

Compile the Weborama RTD module into your Prebid build:

`gulp build --modules=rtdModule,weboramaRtdProvider`

Add the Weborama RTD provider to your Prebid config.

Segments ids (user-centric) and category ids (page-centric) will be provided
salted and hashed : you can use them with a dedicated and private matching table.
Should you want to allow a SSP or a partner to curate your media and operate
cross-publishers campaigns with our data, please ask Weborama (prebid@weborama.com) to
open it for you account.

```javascript
pbjs.setConfig(
    ...
    realTimeData: {
        auctionDelay: 1000,
        dataProviders: [
            {
                name: "WeboramaRTD",
                waitForIt: true,
                params: {
                  weboCtxConf: {
                      setTargeting: true,
                      token: "<<token provided by weborama>>",
                      targetURL: "..."
                    }
                }
            }
        ]
    }
    ...
}
```

### Parameter Descriptions for the Weborama Configuration Section

| Name  |Type | Description   | Notes  |
| :------------ | :------------ | :------------ |:------------ |
| name | String | Real time data module name | Mandatory. Always 'Weborama' |
| waitForIt | Boolean | Mandatory. Required to ensure that the auction is delayed until prefetch is complete | Optional. Defaults to false but recommended to true |
| params | Object | | Optional |
| params.weboCtxConf | Object | Weborama Contextual Configuration | Optional |
| params.weboCtxConf.token | String | Security Token provided by Weborama, unique per client | Mandatory |
| params.weboCtxConf.targetURL | String | Url to be profiled in the contextual api | Optional. Defaults to document.URL |
| params.weboCtxConf.defaultProfile | Object | default value of the profile to be used when there are no response from contextual api (such as timeout)| Optional. Default is `{}` |
| gamTargetingWeboCtxKey | String | allow rename the key `webo_ctx`  in gam targeting| Optional. Default is `webo_ctx`|
| gamTargetingWeboDSKey | String | allow rename the key `webo_ds` in gam targeting | Optional. Default is `webo_ds`|




### Testing

To view an example of available segments returned by Weborama's backends:

`gulp serve --modules=rtdModule,weboramaRtdProvider,appnexusBidAdapter`

and then point your browser at:

`http://localhost:9999/integrationExamples/gpt/weboramaRtdProvider_example.html`
