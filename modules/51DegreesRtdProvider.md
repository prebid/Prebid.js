# 51Degrees RTD Submodule

## Overview

    Module Name: 51Degrees Rtd Provider
    Module Type: Rtd Provider
    Maintainer: engineering@51degrees.com

## Description

51Degrees module enriches an OpenRTB request with [51Degrees Device Data](https://51degrees.com/documentation/index.html).

51Degrees module sets the following fields of the device object: `make`, `model`, `os`, `osv`, `h`, `w`, `ppi`, `pixelratio` - interested bidder adapters may use these fields as needed. In addition the module sets `device.ext.fiftyonedegrees_deviceId` to a permanent device ID which can be rapidly looked up in on premise data exposing over 250 properties including the device age, chip set, codec support, and price, operating system and app/browser versions, age, and embedded features.

The module supports on premise and cloud device detection services with free options for both. 

A free resource key for use with 51Degrees cloud service can be obtained from [51Degrees cloud configuration](https://configure.51degrees.com/tWrhNfY6).  This is the simplest approach to trial the module.

An interface compatible self hosted service can be used with .NET, Java, Node, PHP, and Python.  See [51Degrees examples](https://51degrees.com/documentation/_examples__device_detection__getting_started__web__on_premise.html).

Free cloud and on premise solutions can be expanded to support unlimited requests, additional properties, and automatic daily on premise data updates via a [subscription](https://51degrees.com/pricing).

## Usage

### Integration

Compile the 51Degrees RTD Module with other modules and adapters into your Prebid.js build:

```
gulp build --modules="rtdModule,51DegreesRtdProvider,appnexusBidAdapter,..."  
```

> Note that the 51Degrees RTD module is dependent on the global real-time data module, `rtdModule`.

### Prerequisites

#### Resource Key
In order to use the module please first obtain a Resource Key using the [Configurator tool](https://configure.51degrees.com/tWrhNfY6) - choose the following properties:
* DeviceId
* DeviceType
* HardwareVendor
* HardwareName
* HardwareModel
* PlatformName 
* PlatformVersion
* ScreenPixelsHeight
* ScreenPixelsWidth
* ScreenInchesHeight
* ScreenInchesWidth
* PixelRatio (optional)

PixelRatio is desirable, but it's a paid property requiring a paid license.  Also free API service is limited to 500,000 requests per month - consider picking a [51Degrees pricing plan](https://51degrees.com/pricing) that fits your needs. 

#### User Agent Client Hint (UA-CH) Permissions

Some UA-CH headers are not available to third parties. To allow 51Degrees cloud service to access these headers for more accurate detection and lower latency, it is highly recommended to set `Permissions-Policy` in one of two ways:

In the HTML of the publisher's web page where Prebid.js wrapper is integrated:

```html
<meta http-equiv="Delegate-CH" content="sec-ch-ua-arch https://cloud.51degrees.com; sec-ch-ua-full-version https://cloud.51degrees.com; sec-ch-ua-full-version-list https://cloud.51degrees.com; sec-ch-ua-model https://cloud.51degrees.com; sec-ch-ua-platform https://cloud.51degrees.com; sec-ch-ua-platform-version https://cloud.51degrees.com"/>
```

Or in the Response Headers of the publisher's web server:

```http
Permissions-Policy: ch-ua-arch=(self "https://cloud.51degrees.com"), ch-ua-full-version=(self "https://cloud.51degrees.com"), ch-ua-full-version-list=(self "https://cloud.51degrees.com"), ch-ua-model=(self "https://cloud.51degrees.com"), ch-ua-platform=(self "https://cloud.51degrees.com"), ch-ua-platform-version=(self "https://cloud.51degrees.com")

Accept-CH: sec-ch-ua-arch, sec-ch-ua-full-version, sec-ch-ua-full-version-list, sec-ch-ua-model, sec-ch-ua-platform, sec-ch-ua-platform-version
```

See the [51Degrees documentation](https://51degrees.com/documentation/_device_detection__features__u_a_c_h__overview.html) for more information concerning UA-CH and permissions.

### Configuration

This module is configured as part of the `realTimeData.dataProviders`

```javascript
pbjs.setConfig({
    debug: true, // we recommend turning this on for testing as it adds more logging
    realTimeData: {
        auctionDelay: 1000, // should be set lower in production use
        dataProviders: [
            {
                name: '51Degrees',
                waitForIt: true, // should be true, otherwise the auctionDelay will be ignored
                params: {
                    // Get your resource key from https://configure.51degrees.com/tWrhNfY6 to connect to cloud.51degrees.com
                    resourceKey: '<YOUR_RESOURCE_KEY>',
                    // alternatively, you can use the on-premise version of the 51Degrees service and connect to your chosen end point
                    // onPremiseJSUrl: 'https://localhost/51Degrees.core.js'
                },
            },
        ],
    },
});
```

### Parameters 

> Note that `resourceKey` and `onPremiseJSUrl` are mutually exclusive parameters.  Use strictly one of them: either a `resourceKey` for cloud integration and `onPremiseJSUrl` for the on-premise self-hosted integration. 

| Name                  | Type    | Description                                                                                  | Default            |
|:----------------------|:--------|:---------------------------------------------------------------------------------------------|:-------------------|
| name                  | String  | Real time data module name                                                                   | Always '51Degrees' |
| waitForIt             | Boolean | Should be `true` if there's an `auctionDelay` defined (mandatory)                            | `false`            |
| params                | Object  |                                                                                              |                    |
| params.resourceKey    | String  | Your 51Degrees Cloud Resource Key                                                            |                    |
| params.onPremiseJSUrl | String  | Direct URL to your self-hosted on-premise JS file (e.g. https://localhost/51Degrees.core.js) |                    |

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

When using the 51Degrees cloud service publishers need to reference the 51Degrees [client services privacy policy](https://51degrees.com/terms/client-services-privacy-policy) in their customer notices.