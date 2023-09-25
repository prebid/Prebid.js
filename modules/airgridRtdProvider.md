---
layout: page_v2
title: AirGrid RTD Provider
display_name: AirGrid RTD Provider
description: Client-side, cookieless and privacy-first audiences.
page_type: module
module_type: rtd
module_code : airgridRtdProvider
enable_download : true
vendor_specific: true
sidebarType : 1
---

# AirGrid RTD Provider

AirGrid is a privacy-first, cookie-less audience platform. Designed to help publishers increase inventory yield,
whilst providing audience signal to buyers in the bid request, without exposing raw user level data to any party.

This real-time data module provides quality first-party data, contextual data, site-level data and more that is 
injected into bid request objects destined for different bidders in order to optimize targeting.

{:.no_toc}
* TOC
{:toc}

## Usage

Compile the AirGrid RTD module (`airgridRtdProvider`) into your Prebid build, along with the parent RTD Module (`rtdModule`):

`gulp build --modules=rtdModule,airgridRtdProvider,appnexusBidAdapter`

Next we configure the module, via `pbjs.setConfig`. See the **Parameter Descriptions** below for more detailed information of the configuration parameters. 

```js
pbjs.setConfig(
    ...
    realTimeData: {
        auctionDelay: 1000,
        dataProviders: [
            {
                name: 'airgrid',
                waitForIt: true,
                params: {
                    // These are unique values for each account.
                    apiKey: 'apiKey',
                    accountId: 'accountId',
                    publisherId: 'publisherId',
                    bidders: ['appnexus', 'pubmatic']
                }
            }
        ]
    }
    ...
}
```

### Parameter Descriptions

{: .table .table-bordered .table-striped }
| Name  |Type | Description   | Notes  |
| :------------ | :------------ | :------------ |:------------ |
| name | `String` | RTD sub module name | Always 'airgrid' |
| waitForIt | `Boolean` | Wether to delay auction for module response | Optional. Defaults to false |
| params.apiKey | `Boolean` | Publisher partner specific API key | Required |
| params.accountId | `String` | Publisher partner specific account ID | Required |
| params.publisherId | `String` | Publisher partner specific publisher ID | Required |
| params.bidders | `Array` | Bidders with which to share segment information | Optional |

_Note: Although the module supports passing segment data to any bidder using the ORTB2 spec, there is no way for this to be currently monetised. Please reach out to support, to discuss using bidders other than Xandr/AppNexus._

If you do not have your own `apiKey`, `accountId` & `publisherId` please reach out to [support@airgrid.io](mailto:support@airgrid.io) or you can sign up via the [AirGrid platform](https://app.airgrid.io).

## Testing

To view an example of the on page setup required:

```bash
gulp serve-fast --modules=rtdModule,airgridRtdProvider,appnexusBidAdapter
```

Then in your browser access:

```
http://localhost:9999/integrationExamples/gpt/airgridRtdProvider_example.html
```

Run the unit tests, just on the AirGrid RTD module test file:

```bash
gulp test --file "test/spec/modules/airgridRtdProvider_spec.js" 
```

## Support

If you require further assistance or are interested in discussing the module functionality please reach out to:
- [hello@airgrid.io](mailto:hello@airgrid.io) for general questions.
- [support@airgrid.io](mailto:support@airgrid.io) for technical questions.

You are also able to find more examples and other integration routes on the [AirGrid docs site](https://docs.airgrid.io), or learn more on our [site](https://airgrid.io)!

Happy Coding! 😊
The AirGrid Team.
