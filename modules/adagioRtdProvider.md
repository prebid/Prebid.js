# Overview

Module Name: Adagio Rtd Provider
Module Type: Rtd Provider
Maintainer: dev@adagio.io

# Description

This module is exclusively used in combination with Adagio Bidder Adapter (SSP) and/or with Adagio prebid server endpoint, and mandatory for Adagio customers.
It computes and collects data required to leverage Adagio viewability and attention prediction engine.

Features are computed for the Adagio bidder only and placed into `ortb2.ext` and `AdUnit.ortb2Imp.ext.data`.

To collect data, an external script is loaded by the provider.
It relies on the listening of ad-server events.
Supported ad-servers are GAM, Smart Ad Server, Xandr. Custom ad-server can also be used,
please contact [contact@adagio.io](contact@adagio.io) for more information.

# Integration

```bash
gulp build --modules=adagioBidAdapter,rtdModule,adagioRtdProvider
```

```javascript
pbjs.setConfig({
  realTimeData: {
    dataProviders:[{
      name: 'adagio',
      params: {
        organizationId: '1000' // Required. Provided by Adagio
        site: 'my-site' // Required. Provided by Adagio
      }
    }]
  }
});
```
