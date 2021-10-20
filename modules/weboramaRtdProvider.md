# Weborama Real-Time Data Submodule

```
Module Name: Weborama Rtd Provider
Module Type: Rtd Provider
Maintainer: prebid-support@weborama.com
```

# Description

Weborama provides a Semantic AI Contextual API that classifies in Real-time a web page seen by a web user within generic and custom topics. It enables publishers to better monetize their inventory and unlock it to programmatic.

ORTB2 compliant and FPD support for Prebid versions < 4.29

Contact prebid-support@weborama.com for information.

### Publisher Usage

Compile the Weborama RTD module into your Prebid build:

`gulp build --modules=rtdModule,weboramaRtdProvider`

Add the Weborama RTD provider to your Prebid config.

```javascript
pbjs.setConfig(
    ...
    realTimeData: {
        auctionDelay: 1000,
        dataProviders: [
            {
                name: "weborama",
                waitForIt: true,
                params: {
                  weboCtxConf: {
                      setTargeting: true,
                      token: "<<token provided by weborama>>",
                      targetURL: "..." // default is document.URL
                    },
                    wam2gamConf: {
                        setTargeting: true,
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
| params.weboCtxConf.targetURL | String | Url to be profiled in the contextual api | Optional. Defaults to `document.URL` |
| params.weboCtxConf.setTargeting|Boolean|If true, will use the contextual profile to set the gam targeting of all adunits managed by prebid.js| Optional. Default is *true*.|
| params.weboCtxConf.setBidderTargeting|Boolean|If true, will send the contextual profile to all bidders (only smartadserver is supported now)| Optional. Default is *true*.|
| params.weboCtxConf.defaultProfile | Object | default value of the profile to be used when there are no response from contextual api (such as timeout)| Optional. Default is `{}` |
| params.wam2gamConf | Object | Wam2gam Configuration | Optional |
| params.wam2gamConf.localStorageProfileKey| String | can be used to customize the local storage key | Optional |
| params.wam2gamConf.setTargeting|Boolean|If true, will use the contextual profile to set the gam targeting of all adunits managed by prebid.js| Optional. Default is *true*.|
| params.wam2gamConf.setBidderTargeting|Boolean|If true, will send the contextual profile to all bidders (only smartadserver is supported now)| Optional. Default is *true*.|
| params.wam2gamConf.defaultProfile | Object | default value of the profile to be used when there are no response from contextual api (such as timeout)| Optional. Default is `{}` |

### Testing

To view an example of available segments returned by Weborama's backends:

`gulp serve --modules=rtdModule,weboramaRtdProvider,appnexusBidAdapter`

and then point your browser at:

`http://localhost:9999/integrationExamples/gpt/weboramaRtdProvider_example.html`
