---
layout: page_v2
title: azerion RTD Provider
display_name: Azerion RTD Provider
description: Real Time audience generator.
page_type: module
module_type: rtd
module_code: azerionRtdProvider
enable_download: true
vendor_specific: true
sidebarType: 1
---

# Azerion RTD Provider

Azerion RTD is designed to help publishers find its users interests
while providing these interests to buyers in the bid request. All this without
exposing data to thir-party services.

{:.no_toc}

- TOC
  {:toc}

## Integration

Compile the Azerion RTD module (`azerionRtdProvider`) into your Prebid build,
along with the parent RTD Module (`rtdModule`):

```bash
gulp build --modules=rtdModule,azerionRtdProvider,appnexusBidAdapter,improvedigitalBidAdapter
```

Set configuration via `pbjs.setConfig`.

```js
pbjs.setConfig(
    ...
    realTimeData: {
        auctionDelay: 1000,
        dataProviders: [
            {
                name: 'azerion',
                waitForIt: true,
                params: {
                    publisherId: 'publisherId',
                    bidders: ['appnexus', 'improvedigital'],
                    process: {}
                }
            }
        ]
    }
    ...
}
```

### Parameter Description

{: .table .table-bordered .table-striped }
| Name | Type | Description | Notes |
| :--- | :------- | :------------------ | :--------------- |
| name | `String` | RTD sub module name | Always "azerion" |
| waitForIt | `Boolean` | Required to ensure that the auction is delayed for the module to respond. | Optional. Defaults to false but recommended to true. |
| params.key | `String` | Publisher partner specific key | Optional |
| params.bidders | `Array` | Bidders with which to share segment information | Optional. Defaults to "improvedigital". |
| params.process | `Object` | Configuration for the publisher audiences script. | Optional. Defaults to `{}`. |

### Configuration `process` Description

{: .table .table-bordered .table-striped }
| Name | Type | Description | Notes |
| :------------- | :-------- | :----------------------------------------------- | :-------------------------- |
| process.optout | `Boolean` | Disables the process of audiences for the users. | Optional. Defaults to false |

## Testing

To view an example:

```bash
gulp serve-fast --modules=rtdModule,azerionRtdProvider,appnexusBidAdapter,improvedigitalBidAdapter
```

Access [http://localhost:9999/integrationExamples/gpt/azerionRtdProvider_example.html](http://localhost:9999/integrationExamples/gpt/azerionRtdProvider_example.html)
in your browser.

Run the unit tests:

```bash
npm test -- --file "test/spec/modules/azerionRtdProvider_spec.js"
```

## Support

If you require further assistance please contact [support@azerion.com](mailto:support@azerion.com).
