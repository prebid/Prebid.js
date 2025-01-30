# Overview

Module Name: Dynamic Ad Boost
Module Type: Track when a adunit is viewable
Maintainer: info@luponmedia.com

# Description

Enhance your revenue with the cutting-edge DynamicAdBoost module! By seamlessly integrating the powerful LuponMedia technology, our module retrieves adunits viewability data, providing publishers with valuable insights to optimize their revenue streams. To unlock the full potential of this technology, we provide a customized LuponMedia module tailored to your specific site requirements. Boost your ad revenue and gain unprecedented visibility into your performance with our advanced solution.

In order to utilize this module, it is essential to collaborate with [LuponMedia](https://www.luponmedia.com/) to create an account and obtain detailed guidelines on configuring your sites. Working hand in hand with LuponMedia will ensure a smooth integration process, enabling you to fully leverage the capabilities of this module on your website. Take the first step towards optimizing your ad revenue and enhancing your site's performance by partnering with LuponMedia for a seamless experience.
Contact info@luponmedia.com for information.

## Building Prebid with Real-time Data Support

First, make sure to add the Dynamic AdBoost submodule to your Prebid.js package with:

`gulp build --modules=rtdModule,dynamicAdBoostRtdProvider`

The following configuration parameters are available:

```
pbjs.setConfig(
    ...
    realTimeData: {
        auctionDelay: 2000,
        dataProviders: [
            {
                name: "dynamicAdBoost",
                params: {
                    keyId: "[PROVIDED_KEY]", // Your provided Dynamic AdBoost keyId
                    adUnits: ["allowedAdUnit1", "allowedAdUnit2"],
                    threshold: 35 // optional
                }
            }
        ]
    }
    ...
}
```
