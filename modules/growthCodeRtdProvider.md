## GrowthCode Real-time Data Submodule

The [GrowthCode](https://growthcode.io) real-time data module in Prebid enables publishers to fully 
leverage the potential of their first-party audiences and contextual data. 
With an integrated cookieless GrowthCode identity, this module offers real-time 
contextual and audience segmentation (IAB Taxonomy 2.2, cattax: 6) capabilities, and HEMs that can seamlessly 
integrate into your existing Prebid deployment, making it easy to maximize 
your advertising strategies.

## Building Prebid with GrowthCode Support

Compile the GrowthCode RTD module into your Prebid build:

`gulp serve --modules=userId,rtdModule,appnexusBidAdapter,growthCodeRtdProvider,sharedIdSystem,criteoBidAdapter`

Please visit https://growthcode.io/ for more information.

```
pbjs.setConfig(
    ...
    realTimeData: {
         auctionDelay: 1000,
          dataProviders: [
          {
            name: 'growthCodeRtd',
            waitForIt: true,
            params: {
              pid: 'TEST01',
            }
          }
       ]
    }
    ...
}
```

### Parameter Descriptions for the GrowthCode Configuration Section

| Name                             | Type    | Description                                                               | Notes                       |
|:---------------------------------|:--------|:--------------------------------------------------------------------------|:----------------------------|
| name                             | String  | Real time data module name                                                | Always 'growthCodeRtd'             |
| waitForIt                        | Boolean | Required to ensure that the auction is delayed until prefetch is complete | Optional. Defaults to false |
| params                           | Object  |                                                                           |                             |
| params.pid                       | String  | This is the Parter ID value obtained from GrowthCode                      | `TEST01`                    |
| params.url                       | String  | Custom URL for server                                                     | Optional                    |

## Testing

To view an example of GrowthCode backends:

`gulp serve --modules=userId,rtdModule,appnexusBidAdapter,growthCodeRtdProvider,sharedIdSystem,criteoBidAdapter`

and then point your browser at:

`http://localhost:9999/integrationExamples/gpt/growthcode.html`
