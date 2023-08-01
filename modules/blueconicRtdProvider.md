# Overview

coppa_supported: true  (COPPA support)

Module Name: BlueConic Rtd Provider
Module Type: Rtd Provider
Maintainer: connectors@blueconic.com


## BlueConic Real-time Data Submodule

The BlueConic real-time data module in Prebid has been built so that publishers
can maximize the power of their first-party audiences, user-level and contextual data.
This module provides both an integrated BlueConic identity with real-time
contextual and audience segmentation solution that seamlessly and easily
integrates into your existing Prebid deployment.

BlueConic's Real-time Data Provider automatically obtains segmentation data and other user level data from the BlueConic script (via `localStorage`) and passes them to the bid-stream. Please reach out to BlueConic team(info@blueconic.com) or visit our [website](https://support.blueconic.com/hc/en-us) if you have any questions or need further help to integrate Prebid or blueconicRtdProvider.

### Publisher Usage

Compile the BlueConic RTD module into your Prebid build:

`gulp build --modules=rtdModule,blueconicRtdProvider,appnexusBidAdapter`

Add the BlueConic RTD provider to your Prebid config. In this example we will configure
publisher 1234 to retrieve segments, profile data from BlueConic. See the
"Parameter Descriptions" below for more detailed information of the
configuration parameters. Please work with your BlueConic Prebid support team
(info@blueconic.com) on which version of Prebid.js supports different bidder
and segment configurations.

```
pbjs.setConfig(
    ...
    realTimeData: {
        auctionDelay: 1000,
        dataProviders: [
            {
                name: "blueconic",
                waitForIt: true,
                params: {
                    requestParams: {
                        publisherId: 1234,
                        coppa: true
                    }
                }
            }
        ]
    }
    ...
}
```

### Parameter Descriptions for the Blueconic Configuration Section

| Name  |Type | Description   | Notes  |
| :------------ | :------------ | :------------ |:------------ |
| name | String | Real time data module name | Always 'blueconic' |
| waitForIt | Boolean | Required to ensure that the auction is delayed until prefetch is complete | Optional. Defaults to false |
| params | Object | | |
| params.requestParams | Object | Publisher partner specific configuration options, such as optional publisher id, coppa config and other segment query related metadata  | Optional |


Please see the examples available in the blueconicRtdProvider_spec.js
tests and work with your Blueconic Prebid integration team (connectors@blueconic.com).

#### COPPA support

COPPA support can be enabled for all the visitors by changing the config value:

```js
config.setConfig({ coppa: true });
```

### Testing 

To run test suite for blueconic:

`gulp test --modules=rtdModule,blueconicRtdProvider,appnexusBidAdapter`

### Example

To view an example of available segments:

`gulp serve --modules=rtdModule,blueconicRtdProvider,appnexusBidAdapter`

and then point your browser at:

`http://localhost:9999/integrationExamples/gpt/blueconicRtdProvider_example.html`
