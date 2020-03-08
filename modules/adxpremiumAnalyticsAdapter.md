# Overview

Module Name: AdxPremium Analytics Adapter

Module Type: Analytics Adapter

Maintainer: info@luponmedia.com

---

# Description

Analytics adapter for luponmedia.com prebid platform. Contact [info@luponmedia.com]() if you have any questions about integration.

---

# Integration

AdxPremium Anaytics Adapter can be used as:

- Part of the whole AdxPremium Header Bidding Ecosystem *(free)*

- External Analytics tool for your Prebid script *(Paid)*

##### AdxPremium Header Bidding Ecosystem

Integration is as easy as adding the following lines of code:

```javascript
pbjs.que.push(function () {
    pbjs.enableAnalytics([{
        provider: 'adxpremium',
        options: {
            pubID: 12345678
        }
    });
    }]);
});
```

*Note*: To use AdxPremium Prebid Analytics Adapter, you have to be AdxPremium publisher and get the publisher ID as well as include the adapter in your **Prebid Core** script.
