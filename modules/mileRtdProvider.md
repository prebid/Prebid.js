# Mile RTD Provider

## Overview

The `mile` RTD provider computes per-slot targeting values through a runtime engine and sets GPT slot targeting used by floor logic.

It sets a single targeting key:

- `mile_rtd`

The value is provider-specific and is returned by `window[params.runtimeGlobalName].getMileTargetingByAdUnit(...)`

## When targeting is applied

Targeting is applied during:

- `onAuctionInitEvent`
- `onBidResponseEvent`

The provider only applies targeting when flooring is enforced for the auction.

If flooring is not enforced, no `mile_rtd` targeting is set.

## Key-value mapping

The runtime engine returns a map keyed by ad unit identifier (slot element ID or ad unit path), and each resolved slot gets:

- key: `mile_rtd`
- value: `targetingByAdUnit[slotElementId]` or `targetingByAdUnit[adUnitPath]`

Example runtime response:

```js
{
  "div-gpt-ad-123": "segA_floorHigh",
  "/1234567/homepage/top": "segB_floorMid"
}
```

Resulting GPT slot targeting:

```js
slot.setTargeting("mile_rtd", "segA_floorHigh");
```

## Configuration

Use the RTD module with provider name `mile`:

```js
pbjs.setConfig({
  realTimeData: {
    dataProviders: [
      {
        name: "mile",
        waitForIt: false,
        params: {
          runtimeScriptUrl: "https://cdn.example.com/mile-rtd-runtime.js",
          runtimeGlobalName: "mileRtdRuntime", // optional, default shown
        },
      },
    ],
  },
});
```

### Params

- `runtimeScriptUrl` (optional): URL of runtime script to load.
- `runtimeGlobalName` (optional): global object name exposing `getMileTargetingByAdUnit`; defaults to `mileRtdRuntime`.
