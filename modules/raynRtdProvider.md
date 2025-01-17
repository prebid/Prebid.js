---
layout: page_v2
title: Rayn RTD Provider
display_name: Rayn Real Time Data Module
description: Rayn Real Time Data module appends privacy preserving enhanced contextual categories and audiences. Moments matter.
page_type: module
module_type: rtd
module_code: raynRtdProvider
enable_download: true
vendor_specific: true
sidebarType: 1
---

# Rayn Real-time Data Submodule

Rayn is a privacy preserving, data platform. We turn content into context, into audiences. For Personalisation, Monetisation and Insights. This module reads contextual categories and audience cohorts from RaynJS (via localStorage) and passes them to the bid-stream.

## Integration

To install the module, follow these instructions:

Step 1: Prepare the base Prebid file
Compile the Rayn RTD module (`raynRtdProvider`) into your Prebid build along with the parent RTD Module (`rtdModule`). From the command line, run gulp build `gulp build --modules=rtdModule,raynRtdProvider`

Step 2: Set configuration
Enable Rayn RTD Module using pbjs.setConfig. Example is provided in the Configuration section. See the **Parameter Description** for more detailed information of the configuration parameters.

### Configuration

This module is configured as part of the realTimeData.dataProviders object.

Example format:

```js
pbjs.setConfig(
    // ...
    realTimeData: {
        auctionDelay: 1000,
        dataProviders: [
            {
                name: "rayn",
                waitForIt: true,
                params: {
                    bidders: ["appnexus", "pubmatic"],
                    integration: {
                        iabAudienceCategories: {
                            v1_1: {
                                tier: 6,
                                enabled: true,
                            },
                        },
                        iabContentCategories: {
                            v3_0: {
                                tier: 4,
                                enabled: true,
                            },
                            v2_2: {
                                tier: 4,
                                enabled: true,
                            },
                        },
                    }
                }
            }
        ]
    }
    // ...
}
```

## Parameter Description

The parameters below provide configurability for general behaviours of the RTD submodule, as well as enabling settings for specific use cases mentioned above (e.g. tiers and bidders).

### Parameters

{: .table .table-bordered .table-striped }
| Name                                                  | Type      | Description                                                                          | Notes |
| :---------------------------------------------------- | :-------- | :----------------------------------------------------------------------------------- | :---- |
| name                                                  | `String`  | RTD sub module name                                                                  | Always "rayn" |
| waitForIt                                             | `Boolean` | Required to ensure that the auction is delayed for the module to respond             | Optional. Defaults to false but recommended to true |
| params                                                | `Object`  |                                                                                      ||
| params.bidders                                        | `Array`   | Bidders with which to share context and segment information                          | Optional. In case no bidder is specified Rayn will append data for all bidders |
| params.integration                                    | `Object`  | Controls which IAB taxonomy should be used and up to which category tier             | Optional. In case it's not defined, all supported IAB taxonomies and all category tiers will be used |
| params.integration.iabAudienceCategories              | `Object`  |                                                                                      ||
| params.integration.iabAudienceCategories.v1_1         | `Object`  |                                                                                      ||
| params.integration.iabAudienceCategories.v1_1.enabled | `Boolean` | Controls if IAB Audience Taxonomy v1.1 will be used                                  | Optional. Enabled by default |
| params.integration.iabAudienceCategories.v1_1.tier    | `Number`  | Controls up to which IAB Audience Taxonomy v1.1 Category tier will be used           | Optional. Tier 6 by default |
| params.integration.iabContentCategories               | `Object`  |                                                                                      ||
| params.integration.iabContentCategories.v3_0          | `Object`  |                                                                                      ||
| params.integration.iabContentCategories.v3_0.enabled  | `Boolean` | Controls if IAB Content Taxonomy v3.0 will be used                                   | Optional. Enabled by default |
| params.integration.iabContentCategories.v3_0.tier     | `Number`  | Controls up to which IAB Content Taxonomy v3.0 Category tier will be used            | Optional. Tier 4 by default |
| params.integration.iabContentCategories.v2_2          | `Object`  |                                                                                      ||
| params.integration.iabContentCategories.v2_2.enabled  | `Boolean` | Controls if IAB Content Taxonomy v2.2 will be used                                   | Optional. Enabled by default |
| params.integration.iabContentCategories.v2_2.tier     | `Number`  | Controls up to which IAB Content Taxonomy v2.2 Category tier will be used            | Optional. Tier 4 by default |

Please note that raynRtdProvider should be integrated into the website along with RaynJS.

## Testing

To view an example of the on page setup:

```bash
gulp serve-fast --modules=rtdModule,raynRtdProvider,appnexusBidAdapter
```

Then in your browser access: [http://localhost:9999/integrationExamples/gpt/raynRtdProvider_example.html](http://localhost:9999/integrationExamples/gpt/raynRtdProvider_example.html)

Run the unit tests, just on the Rayn RTD module test file:

```bash
gulp test --file "test/spec/modules/raynRtdProvider_spec.js"
```

## Support

If you require further assistance or are interested in discussing the module functionality please reach out to [support@rayn.io](mailto:support@rayn.io).
You are also able to find more examples and other integration routes on the Rayn documentation site.
