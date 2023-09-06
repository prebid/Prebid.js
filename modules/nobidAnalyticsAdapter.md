# Overview
Module Name: NoBid Analytics Adapter

Module Type: Analytics Adapter

Maintainer: [nobid.io](https://nobid.io)


# NoBid Analytics Registration

The NoBid Analytics Adapter is free to use during our Beta period, but requires a simple registration with NoBid. Please visit [www.nobid.io](https://www.nobid.io/contact-1/) to sign up and request your NoBid Site ID to get started. If you're already using the NoBid Prebid Adapter, you may use your existing Site ID with the NoBid Analytics Adapter.

The NoBid privacy policy is at [nobid.io/privacy-policy](https://www.nobid.io/privacy-policy/).

## NoBid Analytics Configuration

First, make sure to add the NoBid Analytics submodule to your Prebid.js package with:

```
gulp build --modules=...,nobidAnalyticsAdapter...
```

The following configuration parameters are available:

```javascript
pbjs.enableAnalytics({
    provider: 'nobidAnalytics',
    options: {
        siteId: 123    // change to the Site ID you received from NoBid
    }
});
```

{: .table .table-bordered .table-striped }
| Parameter | Scope | Type | Description | Example |
| --- | --- | --- | --- | --- |
| provider | Required | String | The name of this module: `nobidAnalytics` | `nobidAnalytics` |
| options.siteId | Required | Number | This is the NoBid Site ID Number obtained from registering with NoBid. | `1234` |
