# Optimera Real-Time Data Module

```
Module Name: Optimera Real-Time Data Module  
Module Type: RTD Module  
Maintainer: kcandiotti@optimera.nyc  
```

## Description

The Optimera Real-Time Data (RTD) Module provides targeting data for ad requests using data collected from the Optimera Measurement script deployed on your site. It is a port of the Optimera Bidder Adapter.

Please contact [Optimera](http://optimera.nyc/) for integration assistance.

## Build Instructions

To compile the Optimera RTD provider into your Prebid build:

```bash
gulp build --modules=optimeraRtdProvider,rtdModule
```

## Configuration Example

```javascript
pbjs.setConfig({
  realTimeData: {
    dataProviders: [
      {
        name: 'optimeraRTD',
        waitForIt: true,
        auctionDelay: 500,
        params: {
          clientID: '9999',
          optimeraKeyName: 'optimera',
          device: 'de',
          apiVersion: 'v0',
          transmitWithBidRequests: 'allow'
        }
      }
    ]
  }
});
```

## Parameters

| Parameter Name             | Type    | Scope     | Description |
|----------------------------|---------|-----------|-------------|
| `clientID`                 | string  | required  | Optimera Client ID. Contact Optimera to obtain yours. |
| `optimeraKeyName`          | string  | optional  | GAM key name for Optimera targeting. Defaults to `hb_deal_optimera` for legacy compatibility. |
| `device`                   | string  | optional  | Device type code. Use `mo` (mobile), `tb` (tablet), or `de` (desktop) or output the common library splitter value here. |
| `apiVersion`               | string  | optional  | Optimera API version. Allowed values: `v0` or `v1`. **Note:** `v1` must be enabled by Optimera. |
| `transmitWithBidRequests` | string  | optional  | Set to `'allow'` (default if not set) to inject Optimera data into the ORTB2 object for bid requests or `'deny'` to prevent injection. |
