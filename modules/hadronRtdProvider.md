## Audigent Hadron Real-time Data Submodule

Audigent is a next-generation, 1st party data management platform and the
world’s first "data agency", powering the programmatic landscape and DTC
eCommerce with actionable 1st party audience and contextual data from the
world’s most influential retailers, lifestyle publishers, content creators,
athletes and artists.

The Hadron real-time data module in Prebid has been built so that publishers
can maximize the power of their first-party audiences and contextual data.
This module provides both an integrated cookieless Hadron identity with real-time
contextual and audience segmentation solution that seamlessly and easily
integrates into your existing Prebid deployment.

Users, devices, content, cohorts and other features are identified and utilized
to augment every bid request with targeted, 1st party data-derived segments
before being submitted to supply-side platforms. Enriching the bid request with
robust 1st party audience and contextual data, Audigent's Hadron RTD module
optimizes targeting, increases the number of bids, increases bid value,
and drives additional incremental revenue for publishers.

### Publisher Usage

Compile the Hadron RTD module into your Prebid build:

`gulp build --modules=userId,unifiedIdSystem,rtdModule,hadronRtdProvider,appnexusBidAdapter`

Add the Hadron RTD provider to your Prebid config. In this example we will configure
publisher 1234 to retrieve segments from Audigent. See the
"Parameter Descriptions" below for more detailed information of the
configuration parameters. Please work with your Audigent Prebid support team
(prebid@audigent.com) on which version of Prebid.js supports different bidder
and segment configurations.

```
pbjs.setConfig(
    ...
    realTimeData: {
        auctionDelay: 5000,
        dataProviders: [
            {
                name: "hadron",
                waitForIt: true,
                params: {
                    segmentCache: false,
                    requestParams: {
                        publisherId: 1234  // deprecated, use partnerId instead
                    },
                    partnerId: 1234
                }
            }
        ]
    }
    ...
}
```

### Parameter Descriptions for the Hadron Configuration Section

| Name                             | Type     | Description                                                                                                                                                                                                                          | Notes                        |
|:---------------------------------|:---------|:-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|:-----------------------------|
| name                             | String   | Real time data module name                                                                                                                                                                                                           | Always 'hadron'              |
| waitForIt                        | Boolean  | Required to ensure that the auction is delayed until prefetch is complete                                                                                                                                                            | Optional. Defaults to false  |
| params                           | Object   |                                                                                                                                                                                                                                      |                              |
| params.partnerId                 | Number   | This is the Audigent Partner ID obtained from Audigent.                                                                                                                                                                              | `1234`                       |
| params.handleRtd                 | Function | A passable RTD handler that allows custom adunit and ortb2 logic to be configured. The function signature is (bidConfig, rtd, rtdConfig, pbConfig) => {}.                                                                            | Optional                     |
| params.segmentCache              | Boolean  | This parameter tells the Hadron RTD module to attempt reading segments from a local storage cache instead of always requesting them from the Audigent server.                                                                        | Optional. Defaults to false. |
| params.requestParams             | Object   | Publisher partner specific configuration options, such as optional publisher id and other segment query related metadata to be submitted to Audigent's backend with each request.  Contact prebid@audigent.com for more information. | Optional                     |
| params.requestParams.publisherId | Object   | (deprecated) Publisher id and other segment query related metadata to be submitted to Audigent's backend with each request.  Contact prebid@audigent.com for more information.                                                       | Optional                     |
| params.hadronIdUrl               | String   | Parameter to specify alternate hadronid endpoint url.                                                                                                                                                                                | Optional                     |

### Publisher Customized RTD Handling
As indicated above, it is possible to provide your own bid augmentation
functions rather than simply merging supplied data.  This is useful if you
want to perform custom bid augmentation and logic with Hadron real-time data
prior to the bid request being sent. Simply add your custom logic to the
optional handleRtd parameter and provide your custom RTD handling logic there.

Please see the following example, which provides a function to modify bids for
a bid adapter called adBuzz and perform custom logic on bidder parameters.

```
pbjs.setConfig(
    ...
    realTimeData: {
        auctionDelay: auctionDelay,
        dataProviders: [
            {
                name: "hadron",
                waitForIt: true,
                params: {
                    handleRtd: function(bidConfig, rtd, rtdConfig, pbConfig) {
                        var adUnits = bidConfig.adUnits;
                        for (var i = 0; i < adUnits.length; i++) {
                            var adUnit = adUnits[i];
                            for (var j = 0; j < adUnit.bids.length; j++) {
                                var bid = adUnit.bids[j];
                                if (bid.bidder == 'adBuzz' && rtd['adBuzz'][0].value != 'excludeSeg') {
                                    bid.params.adBuzzCustomSegments.push(rtd['adBuzz'][0].id);
                                }
                            }
                        }
                    },
                    segmentCache: false,
                    requestParams: {
                        publisherId: 1234  // deprecated, use partnerId instead
                    },
                    partnerId: 1234
                }
            }
        ]
    }
    ...
}
```

The handleRtd function can also be used to configure custom ortb2 data
processing. Please see the examples available in the hadronRtdProvider_spec.js
tests and work with your Audigent Prebid integration team (prebid@audigent.com)
on how to best configure your own Hadron RTD & Open RTB data handlers.

### Testing

To view an example of available segments returned by Audigent's backends:

`gulp serve --modules=userId,unifiedIdSystem,rtdModule,hadronRtdProvider,appnexusBidAdapter`

and then point your browser at:

`http://localhost:9999/integrationExamples/gpt/hadronRtdProvider_example.html`
