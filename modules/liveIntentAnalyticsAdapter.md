# Overview
Module Name: LiveIntent Analytics Adapter

Module Type: Analytics Adapter

Maintainer: product@liveintent.com

# Description

Analytics adapter for [LiveIntent](https://www.liveintent.com/). Contact product@liveintent.com for information.

# Configuration

Customers using GAM and the LiveIntent HIRO snippet for HIRO reporting, and looking to test the Analytics Adapter set up, should add the lines below to their Prebid configuration to enable the analytics module:

```
pbjs.setConfig({
    analyticsLabels: {
      "partnerId": "did-0000" // your distributor id or application id
    }
});

pbjs.enableAnalytics({
    provider: 'liveintent',
    options: {
        sampling: 1 // all winning bid events will be sent to our backend 
    }
});
```

New customers or customers that are removing the GAM integration for HIRO reporting and the LiveIntent HIRO snippet, the Prebid configuration should set `activatePartialTreatment` to `true`. By default, that will treat only 97% of all page visits and leave 3% untreated (not enriched with LiveIntent-provided IDs). If the desirable treatment rate is different, it can be adjusted by setting `window.liTreatmentRate` to the desired value (between 0.0 and 1.0).

```
pbjs.setConfig({
    userSync: {
        userIds: [
            {
                "name": "liveIntentId",
                "params": {
                    "distributorId": "did-0000", // your distributor id; alternatively, liCollectConfig.appId if you have an application id
                    "activatePartialTreatment" : true,
                    "requestedAttributesOverrides": {
                        'sovrn': true, 
                        'medianet': true, 
                        'bidswitch': true, 
                        ...
                    }
                }
            }
        ]
    }
});

The lines below will enable the analytics module:

pbjs.enableAnalytics({
  provider: 'liveintent',
  options: {
    sampling: 1
  }
});
```

# Test Parameters

```
{
  provider: 'liveintent',
  options: {
     sampling: 0.5 // the tracked event percentage, a number between 0 to 1
  }
}
```
