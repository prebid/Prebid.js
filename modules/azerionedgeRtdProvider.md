---
layout: page_v2
title: Azerion Edge RTD Provider
display_name: Azerion Edge RTD Provider
description: Client-side contextual cookieless audiences.
page_type: module
module_type: rtd
module_code: azerionedgeRtdProvider
enable_download: true
vendor_specific: true
sidebarType: 1
---

# Azerion Edge RTD Provider

Client-side contextual cookieless audiences.

Azerion Edge RTD module helps publishers to capture users' interest
audiences on their site, and attach these into the bid request.

Please contact [edge@azerion.com](edge@azerion.com) for more information.

Maintainer: [azerion.com](https://www.azerion.com/)

{:.no_toc}

- TOC
  {:toc}

## Integration

Compile the Azerion Edge RTD module (`azerionedgeRtdProvider`) into your Prebid build,
along with the parent RTD Module (`rtdModule`):

```bash
gulp build --modules=rtdModule,azerionedgeRtdProvider
```

Set configuration via `pbjs.setConfig`.

```js
pbjs.setConfig(
    ...
    realTimeData: {
        auctionDelay: 1000,
        dataProviders: [
            {
                name: 'azerionedge',
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
| name | `String` | RTD sub module name | Always "azerionedge" |
| waitForIt | `Boolean` | Required to ensure that the auction is delayed for the module to respond. | Optional. Defaults to false but recommended to true. |
| params.key | `String` | Publisher partner specific key | Mandatory. The key is required for the module to work. If you haven't received one, please reach [support@improvedigital.com](support@improvedigital.com) |
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
    vendorExceptions: ["azerionedge"]
  },
  ...
]
```

## Testing

To view an example:

```bash
gulp serve-fast --modules=rtdModule,azerionedgeRtdProvider
```

Access [http://localhost:9999/integrationExamples/gpt/azerionedgeRtdProvider_example.html](http://localhost:9999/integrationExamples/gpt/azerionedgeRtdProvider_example.html)
in your browser.

Run the unit tests:

```bash
npm test -- --file "test/spec/modules/azerionedgeRtdProvider_spec.js"
```
