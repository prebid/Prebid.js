# Overview

```
Module Name: Panxo RTD Provider
Module Type: RTD Provider
Maintainer: prebid@panxo.ai
```

# Description

The Panxo RTD module enriches OpenRTB bid requests with real-time AI traffic classification signals. It detects visits originating from AI assistants and provides contextual data through `device.ext.panxo` and `site.ext.data.panxo`, enabling the Panxo Bid Adapter and other demand partners to apply differentiated bidding on AI-referred inventory.

To use this module, contact [publishers@panxo.ai](mailto:publishers@panxo.ai) or sign up at [app.panxo.com](https://app.panxo.com) to receive your property identifier.

# Build

```bash
gulp build --modules=rtdModule,panxoRtdProvider,...
```

> `rtdModule` is required to use the Panxo RTD module.

# Configuration

```javascript
pbjs.setConfig({
    realTimeData: {
        auctionDelay: 300,
        dataProviders: [{
            name: 'panxo',
            waitForIt: true,
            params: {
                siteId: 'a1b2c3d4e5f67890'
            }
        }]
    }
});
```

## Parameters

| Name      | Type    | Description                                            | Required |
| :-------- | :------ | :----------------------------------------------------- | :------- |
| `siteId`  | String  | 16-character hex property identifier provided by Panxo | Yes      |
| `verbose` | Boolean | Enable verbose logging for troubleshooting             | No       |
