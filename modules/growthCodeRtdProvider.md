## GrowthCode Real-time Data Submodule

The [GrowthCode](https://growthcode.io) real-time data module in Prebid enables publishers to fully 
leverage the potential of their first-party audiences and contextual data. 

This module reads the EID blob from localStorage (populated by the GrowthCode 
pixel via `/v4/sync`) and injects all resolved universal IDs into the Prebid 
`ortb2.user.ext.eids` array. Supported IDs include GCID, UID2, ID5, Criteo, 
Xandr, TradeDesk, Panorama, and 25+ additional providers.

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
| realTimeData.auctionDelay        | Integer | Standard Prebid setting: max time (ms) the auction may be delayed for RTD providers. Required (together with `waitForIt`) so the module can wait for the EID blob on a user's first page load; otherwise first-load auctions go out without GrowthCode EIDs. | Recommended. e.g. `1000`   |
| name                             | String  | Real time data module name                                                | Always 'growthCodeRtd'             |
| waitForIt                        | Boolean | Whether to delay the auction for this provider. Set to `true` so the auction waits for the EID blob on a cold (first) page load. On subsequent loads the blob is already present and is injected synchronously. | Recommended `true`. Defaults to false |
| params                           | Object  |                                                                           |                             |
| params.pid                       | String  | The Partner ID obtained from GrowthCode. Used to configure the GrowthCode pixel (`gc_superscript`); this module itself does not require it. | Optional. `TEST01`          |
| params.eidWaitMs                 | Integer | Max time (ms) the module will wait for the EID blob on a cold load before releasing the auction. Defaults to 900ms and is automatically capped at `auctionDelay` (most publishers can omit it). | Optional. e.g. `1000`       |

### How It Works

1. The GrowthCode pixel (`gc_superscript`) calls `/v4/sync` and writes the EID blob to `localStorage['gceb']`, then dispatches a `growthCodeEIDArrayPresentEvent`.
2. At auction time, this RTD module reads `gceb` from localStorage.
   - **Warm path (2nd+ page loads):** the blob is already present, so EIDs are injected synchronously and the auction proceeds immediately.
   - **Cold path (first page load):** the blob may not be written yet. With `waitForIt: true` and a non-zero `auctionDelay`, the module waits for the `growthCodeEIDArrayPresentEvent` (or a timeout — `eidWaitMs`, default 900ms, capped at `auctionDelay`), then injects and releases the auction. This ensures the first auction also carries the EIDs.
3. Parsed EIDs are injected into `ortb2.user.ext.eids` for all bidders.
4. No server call is made by this module — `gc_superscript` performs the only network request (`/v4/sync`).

> Note: EIDs are placed in `ortb2.user.ext.eids`, which is consumed by ORTB bidders and Prebid Server. Adapters that read only `userIdAsEids` (e.g. AppNexus/Xandr's legacy path) will not pick these up.

## Testing

To view an example of GrowthCode backends:

`gulp serve --modules=userId,rtdModule,appnexusBidAdapter,growthCodeRtdProvider,sharedIdSystem,criteoBidAdapter`

and then point your browser at:

`http://localhost:9999/integrationExamples/gpt/growthcode.html`
