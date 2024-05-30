# Overview

```
Module Name: clean.io Rtd provider
Module Type: Rtd Provider
Maintainer: nick@clean.io
```

The clean.io Realtime module provides effective anti-malvertising solution for publishers, including, but not limited to,
blocking unwanted 0- and 1-click redirects, deceptive ads or those with malicious landing pages, and various types of affiliate fraud.

Using this module requires prior agreement with [clean.io](https://clean.io) to obtain the necessary distribution key.


# Integration

clean.io Realtime module can be built just like any other prebid module:

```
gulp build --modules=cleanioRtdProvider,...
```


# Configuration

When built into prebid.js, this module can be configured through the following `pbjs.setConfig` call:

```javascript
pbjs.setConfig({
    realTimeData: {
        dataProviders: [{
            name: 'clean.io',
            params: {
                cdnUrl: 'https://abc1234567890.cloudfront.net/script.js', ///< Contact clean.io to get your own CDN URL
                protectionMode: 'full', ///< Supported modes are 'full', 'bids' and 'bids-nowait', see below.
            }
        }]
    }
});
```


## Configuration parameters

{: .table .table-bordered .table-striped }
| Name | Type  | Scope | Description |
| :------------ | :------------ | :------------ |:------------ |
| ``cdnUrl`` | ``string`` | Required | CDN URL of the script, which is to be used for protection. |
| ``protectionMode`` | ``'full' \| 'bids' \| 'bids-nowait'`` | Required | Integration mode. Please refer to the "Integration modes" section for details. |


## Integration modes

{: .table .table-bordered .table-striped }
| Integration Mode | Parameter Value | Description |
| :------------ | :------------ | :------------ |
| Full page protection | ``'full'`` | Preferred mode. The module will add the protector agent script directly to the page, and it will protect all placements. This mode will make the most out of various behavioral detection mechanisms, and will also prevent typical malicious behaviors. Please note that in this mode, depending on Prebid library naming, Chrome may mistakenly tag non-ad-related content as ads: https://chromium.googlesource.com/chromium/src/+/refs/heads/main/docs/ad_tagging.md. |
| Bids-only protection | ``'bids'`` | The module will protect specific bid responses, more specifically, the HTML representing ad payload, by wrapping it into the agent script. Please note that in this mode, ads delivered directly, outside of Prebid integration, will not be protected, since the module can only access the ads coming through Prebid. |
| Bids-only protection with no delay on bid rendering | ``'bids-nowait'`` | Same as above, but in this mode, the script will also *not* wrap those bid responses, which arrived prior to successful preloading of agent script. |
