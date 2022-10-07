# Overview
- Module Name: Conversant Bidder Adapter
- Module Type: Analytics Adapter
- Maintainer: mediapsr@conversantmedia.com

## Description

Analytics adapter for Conversant is used to track performance of Prebid auctions.  See the usage below for how to 
configure the adapter for your webpage. To enable analytics and gain access to the data publishers will need
 to contact their Conversant representative.

## Setup

Before any analytics are recorded for your website you will need to have a Conversant representative turn
on Prebid analytics for your website.  

The simplest configuration to add Conversant Prebid analytics to your page is as follows:

```
    pbjs.que.push(function() {
        pbjs.enableAnalytics({
            provider: 'conversant',
            options: {
                site_id: '<YOUR_SITE_ID>'
            }
        })
    });
```

Additionally the following options are supported:

- **sampleRate**: Expects an integer from 0 to 100. By default only 50% (corresponds to a value of 50) of instances are enabled
for Conversant Prebid Analytics. This field allows the publisher to override that percentage to sample
at a higher or lower rate. '0' would completely disable sampling and '100' would capture every instance.

### Complete Example
```
    pbjs.que.push(function() {
        pbjs.enableAnalytics({
            provider: 'conversant',
            options: {
                site_id: '1234',
                sampleRate: 90
            }
        })
    });
```
