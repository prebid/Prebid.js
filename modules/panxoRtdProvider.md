# Overview

```text
Module Name: Panxo RTD Provider
Module Type: RTD Provider
Maintainer: prebid@panxo.ai
```

The Panxo RTD provider adds the external runtime's coarse AI-visit classification
to an auction. Contact [publishers@panxo.ai](mailto:publishers@panxo.ai) or register
at [app.panxo.ai](https://app.panxo.ai) to obtain a publisher property identifier.

## External script disclosure

This module loads external code that is not open source and has not been
reviewed by Prebid.org. It loads `https://api.idsequoia.ai/rtd.js` with the
publisher's `siteId` and a per-connection `session` parameter. The script request
uses anonymous CORS and a no-referrer policy. These attributes do not restrict
network or storage operations performed by the external script after loading.

The provider registers GVL ID **1527** and checks Prebid's `accessDevice` and
`enrichUfpd` activities before connecting or enriching. The loader also applies
`loadExternalScript`. Configure consent and activity controls before or together
with RTD configuration.

## Build

```bash
gulp build --modules=rtdModule,panxoRtdProvider,...
```

## Configuration

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

| Parameter | Type | Required | Description |
| :-------- | :--- | :------- | :---------- |
| `siteId` | String | Yes | Publisher property identifier: 16 lowercase hexadecimal characters. |
| `verbose` | Boolean | No | Enable diagnostic logging. Default: `false`. |

`auctionDelay` limits the RTD core's wait for providers marked `waitForIt`.
If Panxo has no signal when the auction continues, the auction proceeds without
Panxo enrichment.

A data-deletion request clears the provider's cached signal and disables its
connection for the rest of the page. A new page load is required to reconnect.
This hook does not delete data held independently by the external runtime.

## Data added to the auction

An AI visit produces:

```javascript
ortb2.site.ext.data.panxo = { ai: true };
```

The flag classifies the visit. A missing or false signal adds no Panxo data.
