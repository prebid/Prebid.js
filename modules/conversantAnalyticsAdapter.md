# Overview
- Module Name: Epsilon Analytics Adapter
- Module Type: Analytics Adapter
- Maintainer: mediapsr@epsilon.com

## Description

Analytics adapter for Epsilon (formerly Conversant) is used to track performance of Prebid auctions.  See the usage below for how to 
configure the adapter for your webpage. To enable analytics and gain access to the data publishers will need
 to contact their Epsilon representative (publishersupport@epsilon.com).

## Setup

Before any analytics are recorded for your website you will need to have an Epsilon representative turn
on Prebid analytics for your website.  

The simplest configuration to add Epsilon Prebid analytics to your page is as follows:

```
    pbjs.que.push(function() {
        pbjs.enableAnalytics({
            provider: 'conversant',
            options: {
                site_id: <YOUR_SITE_ID>
            }
        })
    });
```

Additionally, the following options are supported:

- **cnvr_sampling**: Sample rate for analytics data. Value should be between 0 and 1 (inclusive), 0 == never sample, 
1 == always sample, 0.5 == send analytics 50% of the time.

### Complete Example
```
    pbjs.que.push(function() {
        pbjs.enableAnalytics({
            provider: 'conversant',
            options: {
                site_id: 1234,
                cnvr_sampling: 0.9
            }
        })
    });
```
