# 51Degrees RTD Submodule

## Overview

    Module Name: 51Degrees RTD Provider
    Module Type: RTD Provider
    Maintainer: support@51degrees.com

## Description

51Degrees module enriches an OpenRTB request with [51Degrees Device Data](https://51degrees.com/documentation/index.html) and (optionally) IP-derived geo plus a 51DiD (51Degrees identifier) entry in `user.eids`.

51Degrees module sets the following fields of the device object: `devicetype`, `make`, `model`, `hwv`, `os`, `osv`, `h`, `w`, `ppi`, `pxratio`. Interested bidder adapters may use these fields as needed. 

The module also adds a `device.ext.fod` extension object (fod == fifty one degrees) and sets `device.ext.fod.deviceId` to a permanent device ID, which can be rapidly looked up in on-premise data, exposing over 250 properties, including device age, chipset, codec support, price, operating system and app/browser versions, age, and embedded features.

It also sets `device.ext.fod.tpc` to a binary value to indicate whether third-party cookies are enabled in the browser (1 if enabled, 0 if disabled).

When 51Degrees IPI is available in the cloud response, the module sets `device.ip` and `device.ipv6`, and (if the location confidence is `high` or `medium`) populates `device.geo.{lat,lon,country,zip,utcoffset,accuracy,type,ipservice}` per OpenRTB 2.6 and AdCOM 1.0.

[51DiD](https://51degrees.com/documentation/4.5/_identifiers_51_did.html) is a 51Degrees privacy-safe identifier derived from device signals. Its production requires a marketing usage preference (`id.usage`). The recommended way to collect and store that preference is the [51Degrees Preference Management Platform (PMP)](https://51degrees.com/documentation/4.5/_identifiers__p_m_p.html) — a lightweight consent widget that writes the user's choice to `localStorage`. When PMP is present on the page the module picks up that preference automatically. When PMP is absent the module falls back to inferring the preference from the publisher's existing TCF or GPP consent string (see below).

When 51DiD is available, the module appends one `user.eids` entry per identifier type returned by the cloud, each with `source = "51d.es"` and `inserter = "51degrees.com"`. The match method (`mm`) is an eid-level field set per type: Probabilistic is `mm = 5` (inference), Random is `mm = 0` (unknown), and Hashed Email is `mm = 3` (authenticated). A type's license and global values share its entry as `uids` (license value first), carrying `atype = 1` for the device or browser-tied Probabilistic and Random values and `atype = 3` for the person-based Hashed Email. The `ext.tdl` URL comes from the `params.tdlUrl` module config and is added to every entry. Random and Hashed Email appear only when the resource key includes those properties, and Hashed Email additionally requires evidence that is supplied to the 51Degrees integration itself (see the On-page integration section).

The module forwards the publisher's consent strings to the cloud as evidence when present. The TCF consent string (from Prebid's GDPR consent) is sent as `tcstring` and the GPP string (from Prebid's GPP consent) is sent as `gppstring`; the cloud can infer the marketing usage preference from either when PMP is not present, so 51DiD works for publishers running any TCF or GPP CMP. These come from Prebid's consent data, not module params.

When the consent evidence changes mid-session, the module reloads its own script so the new strings reach the cloud, and removes the `fod` entry the 51Degrees script keeps in session storage. That entry is the script's cached cloud response, and it is keyed on nothing but the script's object name, so without removing it the reloaded script would replay the response the previous consent produced and take its values in preference to the fresh ones. The module writes nothing to session storage and removes only that one key, and only on a consent change; where session storage is not permitted the removal is skipped and the cached response stands. This does not apply to the on-page integration mode below, where the module does not own the script.

### On-page integration

When the page already runs its own 51Degrees integration, the module detects it automatically (the integration's `window.fod` object) and consumes its result instead of loading a second copy of the script. No module params are needed in this mode:

```javascript
pbjs.setConfig({
    realTimeData: {
        auctionDelay: 250,
        dataProviders: [
            {
                name: '51Degrees',
                waitForIt: true,
            },
        ],
    },
});
```

In this mode the module converts the integration's payload and enriches the ORTB2 request; `tdlUrl` is still honoured. The module sends nothing to the cloud itself, so the integration's script URL must carry the same parameters the module would send: `id.usage` (or the `tcstring` / `gppstring` consent strings) and any client-hint parameters. When an integration is present on the page, the module uses it even if `resourceKey` is configured.

Two limitations follow from consuming the page integration directly:

- A consent change during the session does not re-run the page integration. Its payload reflects the consent state it was loaded under; the new preference takes effect from the next page load.
- If the integration never completes, the module never calls back and the auction proceeds only after the configured `auctionDelay`. The module does not fall back to loading its own script while `window.fod` is present, because two integrations on one page would conflict.

Publisher requirements:

- Load the 51Degrees script **synchronously**, before Prebid runs the auction. Do not use `async` or `defer` on the script tag, and do not inject it from a later-running script. Detection is a point-in-time check for `window.fod` at auction time: if the integration has not executed by then, the module does not see it and falls back to its configured behaviour. With `resourceKey` set that means loading a second copy of the script, which is both an extra billable request and a second integration racing the page's own for `window.fod`; with no `resourceKey` set the auction is simply not enriched and the module logs a missing-parameter error that does not point at the real cause.
- Keep the default object name (`fod`); the module reads `window.fod`, so an integration configured to publish under a different object name is not detected.
- Identifiers that require additional evidence are configured on the 51Degrees integration itself; see the [51Degrees documentation](https://51degrees.com/documentation/index.html).

The module supports on-premise and cloud device detection services, with free options for both.

A free resource key for use with 51Degrees cloud service can be obtained from [51Degrees cloud configuration](https://configure.51degrees.com/Q5cD1H9W). This is the simplest approach to trial the module.

An interface-compatible self-hosted service can be used with .NET, Java, Node, PHP, and Python. See [51Degrees examples](https://51degrees.com/documentation/_examples__device_detection__getting_started__web__on_premise.html).

Free cloud and on-premise solutions can be expanded to support unlimited requests, additional properties, and automatic daily on-premise data updates via a [subscription](https://51degrees.com/pricing).

## Usage

### Integration

Compile the 51Degrees RTD Module with other modules and adapters into your Prebid.js build:

```
gulp build --modules=rtdModule,51DegreesRtdProvider,appnexusBidAdapter,...
```

> Note that the 51Degrees RTD module is dependent on the global real-time data module, `rtdModule`.

### Prerequisites

#### Resource Key

In order to use the module, please first obtain a Resource Key using the [Configurator tool](https://configure.51degrees.com/Q5cD1H9W) - choose the following properties:

* DeviceId
* DeviceType
* HardwareVendor
* HardwareName
* HardwareNamePrefix
* HardwareNameVersion
* HardwareModel
* PlatformName
* PlatformVersion
* ScreenPixelsHeight
* ScreenPixelsWidth
* ScreenPixelsPhysicalHeight
* ScreenPixelsPhysicalWidth
* ScreenInchesHeight
* ScreenInchesWidth
* PixelRatio
* ThirdPartyCookiesEnabled

The Cloud API is **free** to integrate and use. To increase limits, please check [51Degrees pricing](https://51degrees.com/pricing).

#### User Agent Client Hint (UA-CH) Permissions

Some UA-CH headers are not available to third parties. To allow the 51Degrees cloud service to access these headers for more accurate detection and lower latency, it is highly recommended to set `Permissions-Policy` in one of two ways:

In the HTML of the publisher's web page where the Prebid.js wrapper is integrated:

```html
<meta http-equiv="Delegate-CH" content="sec-ch-ua-arch https://cloud.51degrees.com; sec-ch-ua-full-version https://cloud.51degrees.com; sec-ch-ua-full-version-list https://cloud.51degrees.com; sec-ch-ua-model https://cloud.51degrees.com; sec-ch-ua-platform https://cloud.51degrees.com; sec-ch-ua-platform-version https://cloud.51degrees.com"/>
```

Or in the Response Headers of the publisher's web server:

```http
Permissions-Policy: ch-ua-arch=(self "https://cloud.51degrees.com"), ch-ua-full-version=(self "https://cloud.51degrees.com"), ch-ua-full-version-list=(self "https://cloud.51degrees.com"), ch-ua-model=(self "https://cloud.51degrees.com"), ch-ua-platform=(self "https://cloud.51degrees.com"), ch-ua-platform-version=(self "https://cloud.51degrees.com")

Accept-CH: sec-ch-ua-arch, sec-ch-ua-full-version, sec-ch-ua-full-version-list, sec-ch-ua-model, sec-ch-ua-platform, sec-ch-ua-platform-version
```

See the [51Degrees documentation](https://51degrees.com/documentation/_device_detection__features__u_a_c_h__overview.html) for more information concerning UA-CH and permissions.

##### Why not use the GetHighEntropyValues API instead?

Thanks for asking.

The script this module injects has a fallback to the GetHighEntropyValues API but does not rely on it as a first (or only) choice route. Please see the illustrative cases below. Although it seems easier, the GHEV API is not supported by all browsers (so the decision to call it should be conditional). Also, even in Chrome, this API will likely be subject to the Privacy Budget in the future.

In summary, we recommend using `Delegate-CH` http-equiv as the preferred method of obtaining the necessary evidence because it is the fastest and most future-proof method.

##### Illustrative Cases

* If the device is iPhone/iPad, there is no point in checking for or calling GetHighEntropyValues at the moment because iOS does not support this API. However, this might change in the future. Platforms like iOS require additional techniques to identify the model, which are not covered via a single API call, and change from version to version of the operating system and browser rendering engine. **When used with iOS, 51Degrees resolves the [iPhone/iPad model groups](https://51degrees.com/documentation/4.4/_device_detection__features__apple_device_table.html) using these techniques.** That is one of the benefits the module brings to the Prebid community, as most solutions do not resolve iPhone/iPad model groups. More on Apple Device Detection [here](https://51degrees.com/documentation/4.4/_device_detection__features__apple_detection.html).

* If the browser is Firefox on Android or Desktop, there is similarly no point in requesting GHEV, as the API is not supported.

* If the browser is Chrome, the `Delegate-CH`, if enabled by the publisher, would allow the browser to provide the necessary evidence. However, if this is not implemented, then the dynamic script would fall back to GHEV, which is slower.

### Configuration

This module is configured as part of the `realTimeData.dataProviders`. We recommend setting `auctionDelay` to at least 250 ms and ensuring `waitForIt` is set to `true` for the `51Degrees` RTD provider.

```javascript
pbjs.setConfig({
    debug: false, // turn on for testing, remove in production
    realTimeData: {
        auctionDelay: 250,
        dataProviders: [
            {
                name: '51Degrees',
                waitForIt: true, // should be true, otherwise the auctionDelay will be ignored
                params: {
                    resourceKey: '<YOUR_RESOURCE_KEY>',
                    // Get your resource key from https://configure.51degrees.com/Q5cD1H9W
                    // alternatively, you can use the on-premise version of the 51Degrees service and connect to your chosen endpoint
                    // onPremiseJSUrl: 'https://localhost/51Degrees.core.js'
                },
            },
        ],
    },
});
```

### Parameters 

> Note that `resourceKey` and `onPremiseJSUrl` are mutually exclusive parameters. Use strictly one of them: either a `resourceKey` for cloud integration or `onPremiseJSUrl` for the on-premise self-hosted integration. 

| Name                  | Type    | Description                                                                                                                                | Default            |
|:----------------------|:--------|:-------------------------------------------------------------------------------------------------------------------------------------------|:-------------------|
| name                  | String  | Real-time data module name                                                                                                                 | Always '51Degrees' |
| waitForIt             | Boolean | Should be `true` if there's an `auctionDelay` defined (mandatory)                                                                          | `false`            |
| params                | Object  |                                                                                                                                            |                    |
| params.resourceKey    | String  | Your 51Degrees Cloud Resource Key                                                                                                          |                    |
| params.onPremiseJSUrl | String  | Direct URL to your self-hosted on-premise JS file (e.g. https://localhost/51Degrees.core.js)                                              |                    |
| params.tdlUrl         | String  | URL of your Terms Document Locator (TDL): a machine-readable document declaring the data usage terms under which the identifier is shared, per the [data-labels proposal](https://github.com/jwrosewell/data-labels/tree/main) and its [OpenRTB extension](https://github.com/jwrosewell/data-labels/blob/main/OpenRTB.md). The URL is placed in the `ext.tdl` array of the `51d.es` eids entry. Omit if you do not publish a TDL; the module will log a warning and emit the eids entry without `ext.tdl`. |                    |

> Note: if you use a third-party Prebid.js wrapper, there might be a chance that the UI will force you to input both `resourceKey` and `onPremiseJSUrl`. In this case, you can set a redundant parameter to a string equal to "0", which will be ignored by the module.

## Example 

> Note: you need to have a valid resource key to run the example.\
> It should be set in the configuration instead of `<YOUR_RESOURCE_KEY>`.\
> It is located in the `integrationExamples/gpt/51DegreesRtdProvider_example.html` file.

If you want to see an example of how the 51Degrees RTD module works,\
run the following command:

`gulp serve --modules=rtdModule,51DegreesRtdProvider,appnexusBidAdapter`

and then open the following URL in your browser:

`http://localhost:9999/integrationExamples/gpt/51DegreesRtdProvider_example.html`

A second example shows the on-page integration mode:\
`http://localhost:9999/integrationExamples/gpt/51DegreesRtdProvider_pageIntegration_example.html`

Open the browser console to see the logs.

## Customer Notices

When using the 51Degrees cloud service, publishers need to reference the 51Degrees [client services privacy policy](https://51degrees.com/terms/client-services-privacy-policy) in their customer notices.

## Optimisation

To reduce latency when loading the 51Degrees cloud service script, it's recommended to preconnect to the 51Degrees domain. This will establish an early connection, allowing the browser to resolve DNS, set up TCP, and perform the TLS handshake ahead of time, speeding up the script download.

To enable `preconnect`, add the following in the `<head>` of your HTML:

```html
<link rel="preconnect" href="https://cloud.51degrees.com">
```
