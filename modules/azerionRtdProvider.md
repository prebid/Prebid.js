---
layout: page_v2
title: azerion RTD Provider
display_name: Azerion RTD Provider
description: Client-side contextual cookieless audiences.
page_type: module
module_type: rtd
module_code: azerionRtdProvider
enable_download: true
vendor_specific: true
sidebarType: 1
---

# Azerion RTD Provider

Client-side contextual cookieless audiences.

Azerion RTD module helps publishers to capture users' interest
audiences on their site, and attach these into the bid request.

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
                    key: '',
                    bidders: ['improvedigital'],
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
| params.process | `Object` | Configuration for the Azerion Edge script. | Optional. Defaults to `{}`. |

## Context

As all data collection is on behalf of the publisher and based on the consent the publisher has
received from the user, this module does not require a TCF vendor configuration. Consent is
provided to the module when the user gives the relevant permissions on the publisher website.

As Prebid.js utilizes TCF vendor consent for the RTD module to load, the module needs to be labeled
within the Vendor Exceptions.

### Instructions

If the Prebid GDPR enforcement is enabled, the module should be labeled
as exception, as shown below:

```js
[
  {
    purpose: 'storage',
    enforcePurpose: true,
    enforceVendor: true,
    vendorExceptions: ["azerion"]
  },
  ...
]
```

## Testing

To view an example:

```bash
gulp serve-fast --modules=rtdModule,azerionRtdProvider,improvedigitalBidAdapter
```

Access [http://localhost:9999/integrationExamples/gpt/azerionRtdProvider_example.html](http://localhost:9999/integrationExamples/gpt/azerionRtdProvider_example.html)
in your browser.

Run the unit tests:

```bash
npm test -- --file "test/spec/modules/azerionRtdProvider_spec.js"
```

## Support

If you require further assistance please contact [support@azerion.com](mailto:support@azerion.com).
