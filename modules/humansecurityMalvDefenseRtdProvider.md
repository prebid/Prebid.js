# Overview

```
Module Name: humansecurityMalvDefense RTD Provider
Module Type: RTD Provider
Maintainer: eugene.tikhonov@humansecurity.com
```

The HUMAN Security Malvertising Defense RTD submodule offers a robust, easy-to-implement anti-malvertising solution for publishers.
Its automatic updates continuously detect and block on-page malicious ad behaviors — such as unwanted redirects and deceptive ads with harmful landing pages.
This safeguards revenue and visitor experience without extra maintenance, and with minimal impact on page load speed and overall site performance.
Publishers can also opt in to add HUMAN Ad Quality monitoring for broader protection.

Using this module requires prior agreement with [HUMAN Security](https://www.humansecurity.com/) to obtain the necessary distribution key.

## Integration

To integrate, add the HUMAN Security Malvertising Defense submodule to your Prebid.js package with:

```bash
gulp build --modules="rtdModule,humansecurityMalvDefenseRtdProvider,..."
```

> `rtdModule` is a required module to use HUMAN Security RTD module.

## Configuration

This module is configured as part of the `realTimeData.dataProviders` object.

When built into Prebid.js, this module can be configured through the following `pbjs.setConfig` call:

```javascript
pbjs.setConfig({
    realTimeData: {
        dataProviders: [{
            name: 'humansecurityMalvDefense',
            params: {
                cdnUrl: 'https://cadmus.script.ac/<yourUniqueId>/script.js', // Contact HUMAN Security to get your own CDN URL
                protectionMode: 'full', // Supported modes are 'full', 'bids' and 'bids-nowait', see below.
            }
        }]
    }
});
```

### Configuration parameters

{: .table .table-bordered .table-striped }

| Name | Type | Scope | Description |
| :------------ | :------------ | :------------ |:------------ |
| ``cdnUrl`` | ``string`` | Required | CDN URL of the script, which is to be used for protection. |
| ``protectionMode`` | ``'full'`` or ``'bids'`` or ``'bids-nowait'`` | Required | Integration mode. Please refer to the "Integration modes" section for details. |

### Integration modes

{: .table .table-bordered .table-striped }

| Integration Mode | Parameter Value | Description  |
| :------------ | :------------ | :------------ |
| Full page protection | ``'full'`` | Preferred mode. The module will add the protector agent script directly to the page, and it will protect all placements. This mode will make the most out of various behavioral detection mechanisms, and will also prevent typical malicious behaviors. |
| Bids-only protection | ``'bids'`` | The module will protect specific bid responses - specifically, the HTML that represents the ad payload - by wrapping them with the agent script. Ads served outside of Prebid will not be protected in this mode, as the module can only access ads delivered through Prebid. |
| Bids-only protection with no delay on bid rendering | ``'bids-nowait'`` | Same as above, but in this mode, the script will also *not* wrap those bid responses, which arrived prior to successful preloading of agent script.   |
