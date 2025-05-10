# Overview

```
Module Name:    VLYBY Prebid Outstream
Module Type:    Bidder Adapter
Tech-Support:   prebid@vlyby.com
Client-Support: support@vlyby.com
```

# Description

VLYBY Digital GmbH provides with this VLYBY Prebid Adapter a Mediation for the Outstream Product. Please contact support@vlyby.com for additional information and access to VLYBY User Interface and Prebid IDs.

# Demo Implementation

In most of the cases a Publisher will use his own AdServer for delivering Creatives to a Publisher-Website. This GPT implementation is only a skeleton. You need an additional Line-Item in your AdServer, Prebid Creative, access to VLYBY UI. 

### GPT Implementation
```javascript
    var adUnits = [{
        code: '/your-network-id/adunit',
        mediaTypes: {
            banner: {
                sizes: div_1_sizes
            }
        },
        bids: [{
            bidder: 'vlyby',
                params: { 
                    publisherId: 'f363eb2b75459b34592cc4',     // needed - only demo
                    siteId: 'techpreview.vlyby_prebidadapter', // needed - only demo
                    placement:'default'                        // optional - provided by VLYBY UI
                }
        }]
    }]
```