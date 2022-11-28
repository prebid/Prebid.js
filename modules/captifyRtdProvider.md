# Captify Real-Time Data Submodule

# Overview

    Module Name: Captify Rtd Provider
    Module Type: Rtd Provider
	Layout: integrationExamples/gpt/captifyRtdProvider_example.html
    Maintainer: prebid@captify.tech

# Description

Captify uses publisher first-party on-site search data to power machine learning algorithms to create a suite of
contextual based targeting solutions that activate in a cookieless environment.

The RTD submodule allows bid requests to be classified by our live-classification service on the first ad call,
maximising value for publishers by increasing scale for advertisers.

Segments will be attached to bid request objects sent to different SSPs in order to optimize targeting.

Contact prebid@captify.tech for information.

### Publisher Usage

Compile the Captify RTD module into your Prebid build:

`npm ci && gulp build --modules=rtdModule,appnexusBidAdapter,captifyRtdProvider`

Add the Captify RTD provider to your Prebid config.

```javascript
pbjs.setConfig({
    realTimeData: {
        auctionDelay: 1000,
        dataProviders: [
            {
                name: "CaptifyRTDModule",
                waitForIt: true,
                params: {
                    pubId: 123456,
                    bidders: ['appnexus'],
                }
            }
        ]
    }
});
```

### Parameter Description
This module is configured as part of the `realTimeData.dataProviders` object.

| Name           |Type           | Description                                                         |Mandatory | Notes  |
| :------------- | :------------ | :------------------------------------------------------------------ |:---------|:------------ |
| name           | String        | Real time data module name                                          | yes     | Always 'CaptifyRTDModule' |
| waitForIt      | Boolean       | Should be `true` if there's an `auctionDelay` defined (recommended) | no      | Default `false` |
| params         | Object        | |  | |
| params.pubId   | Integer       | Partner ID, required to get results and provided by Captify         | yes      | Use 123456 for tests and speak to your Captify account manager to receive your pubId |
| params.bidders | Array<String> | List of bidders for which you would like data to be set             | yes      | Currently only 'appnexus' supported |
| params.url     | String        | Captify live-classification service url                             | no       | Defaults to `https://live-classification.cpx.to/prebid-segments`

### Testing

To view an example of available segments returned by Captify:

`gulp serve --modules=rtdModule,captifyRtdProvider,appnexusBidAdapter`

and then point your browser at:

`http://localhost:9999/integrationExamples/gpt/captifyRtdProvider_example.html?pbjs_debug=true`
