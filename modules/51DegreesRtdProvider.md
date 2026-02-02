# 51Degrees RTD Submodule

## Overview

    Module Name: 51Degrees RTD Provider
    Module Type: RTD Provider
    Maintainer: support@51degrees.com

## Description

51Degrees module enriches an OpenRTB request with [51Degrees Device Data](https://51degrees.com/documentation/index.html).

51Degrees module sets the following fields of the device object: `devicetype`, `make`, `model`, `os`, `osv`, `h`, `w`, `ppi`, `pxratio`. Interested bidder adapters may use these fields as needed. 

The module also adds a `device.ext.fod` extension object (fod == fifty one degrees) and sets `device.ext.fod.deviceId` to a permanent device ID, which can be rapidly looked up in on-premise data, exposing over 250 properties, including device age, chipset, codec support, price, operating system and app/browser versions, age, and embedded features. 

It also sets `device.ext.fod.tpc` key to a binary value to indicate whether third-party cookies are enabled in the browser (1 if enabled, 0 if disabled).

The module supports on-premise and cloud device detection services, with free options for both.

A free resource key for use with 51Degrees cloud service can be obtained from [51Degrees cloud configuration](https://configure.51degrees.com/7bL8jDGz). This is the simplest approach to trial the module.

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

In order to use the module, please first obtain a Resource Key using the [Configurator tool](https://configure.51degrees.com/7bL8jDGz) - choose the following properties:

* DeviceId
* DeviceType
* HardwareVendor
* HardwareName
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
                    // Get your resource key from https://configure.51degrees.com/7bL8jDGz
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

| Name                  | Type    | Description                                                                                  | Default            |
|:----------------------|:--------|:---------------------------------------------------------------------------------------------|:-------------------|
| name                  | String  | Real-time data module name                                                                   | Always '51Degrees' |
| waitForIt             | Boolean | Should be `true` if there's an `auctionDelay` defined (mandatory)                            | `false`            |
| params                | Object  |                                                                                              |                    |
| params.resourceKey    | String  | Your 51Degrees Cloud Resource Key                                                            |                    |
| params.onPremiseJSUrl | String  | Direct URL to your self-hosted on-premise JS file (e.g. https://localhost/51Degrees.core.js) |                    |

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

Open the browser console to see the logs.

## Customer Notices

When using the 51Degrees cloud service, publishers need to reference the 51Degrees [client services privacy policy](https://51degrees.com/terms/client-services-privacy-policy) in their customer notices.

## Optimisation

To reduce latency when loading the 51Degrees cloud service script, it's recommended to preconnect to the 51Degrees domain. This will establish an early connection, allowing the browser to resolve DNS, set up TCP, and perform the TLS handshake ahead of time, speeding up the script download.

To enable `preconnect`, add the following in the `<head>` of your HTML:

```html
<link rel="preconnect" href="https://cloud.51degrees.com">
```
