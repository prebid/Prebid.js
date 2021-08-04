 ---
 layout: page_v2
 title: AirGrid RTD SubModule
 description: Client-side, cookieless and privacy-first audiences.
 page_type: module
 module_type: rtd
 module_code : example
 enable_download : true
 sidebarType : 1
 ---

# AirGrid

AirGrid is a privacy-first, cookie-less audience platform. Designed to help publishers increase inventory yield,
whilst providing audience signal to buyers in the bid request, without exposing raw user level data to any party.

This real-time data module provides quality first-party data, contextual data, site-level data and more that is 
injected into bid request objects destined for different bidders in order to optimize targeting.

## Usage

Compile the Halo RTD module into your Prebid build:

`gulp build --modules=rtdModule,airgridRtdProvider,appnexusBidAdapter`

Add the AirGrid RTD provider to your Prebid config. In this example we will configure publisher 1234 to retrieve segments from Audigent. See the "Parameter Descriptions" below for more detailed information of the configuration parameters. 

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

| Name  |Type | Description   | Notes  |
| :------------ | :------------ | :------------ |:------------ |
| name | `String` | RTD sub module name | Always 'airgrid' |
| waitForIt | `Boolean` | Wether to delay auction for module response | Optional. Defaults to false |
| params.apiKey | `Boolean` | Publisher partner specific API key | Required |
| params.accountId | `String` | Publisher partner specific account ID | Required |
| params.publisherId | `String` | Publisher partner specific publisher ID | Required |
| params.bidders | `Array` | Bidders with which to share segment information | Optional |

_Note: Although the module supports passing segment data to any bidder using the ORTB2 spec, there is no way for this to be currently monetised. Please reach out to support, to discuss using bidders other than Xandr/AppNexus._

If you do not have your own `apiKey`, `accountId` & `publisherId` please reach out to [support@airgrid.io](mailto:support@airgrid.io)

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

You are also able to find more examples and other integration routes on the [AirGrid docs site](docs.airgrid.io).

Happy Coding! 😊
The AirGrid Team.
