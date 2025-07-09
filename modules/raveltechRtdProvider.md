# Raveltech RTD Module for Prebid.js

## Overview

```
Module Name:  Raveltech RTD Provider
Module Type:  RTD Provider
Maintainer: maintainers@raveltech.io
```

The RavelTech RTD (Real-Time Data) module for Prebid.js enables publishers to integrate seamlessly with Ravel Technologies' privacy-focused solution, ensuring bidder requests are anonymized before reaching SSPs and DSPs. By leveraging the Ravel Privacy Bus, this module prevents the transmission of personally identifiable information (PII) in bid requests, strengthening privacy compliance and security.

## How It Works

The module operates in two modes:
1. **Bid URL Replacement:** The module modifies the bid request URL of the configured bidders to pass through the Ravel proxy, ensuring that all IDs are anonymized.
2. **Bid Duplication (if `preserveOriginalBid` is enabled):** The module duplicates the original bid request, sending one request as-is and another through the Ravel proxy with anonymized IDs.

## Configuration

To enable the Raveltech RTD module, you need to configure it with a list of bidders and specify whether to preserve the original bid request.
For the anonymization feature to work, you also need to load a javascript in the header of your HTML page:
```html
<script src="https://cdn.rvlproxy.net/latest/zkad.js" async></script>
```

### Build
```
gulp build --modules="rtdModule,raveltechRtdProvider,appnexusBidAdapter,..."  
```

> Note that the global RTD module, `rtdModule`, is a prerequisite of the raveltech RTD module.

### Parameters

| Parameter           | Type    | Description |
|--------------------|--------|-------------|
| `bidders`         | Array  | A list of bidder codes (or their alias if an alias is used) that should have their bid requests anonymized via Ravel. |
| `preserveOriginalBid` | Boolean | If `true`, the original bid request is preserved, and an additional bid request is sent through the Ravel proxy. If `false`, the original bid request is replaced with the Ravel-protected request. |

### Example Configuration

```javascript
pbjs.setConfig({
    realTimeData: {
        dataProviders: [{
            name: 'raveltech',
            params: {
                bidders: ['appnexus', 'rubicon'],
                preserveOriginalBid: true
            }
        }]
    }
});
```

## Privacy Features

The RavelTech RTD module allows publishers to implement the following privacy protections:
- Personally Identifiable Information (PII) is either removed or converted into Anonymized IDs (RIDs).
- Bid requests are routed through an anonymized proxy before reaching the SSP, ensuring IP address anonymization.
