# Overview

```markdown
Module Name: T-Advertising Bid Adapter
Module Type: Bidder Adapter
Maintainer: dev@emetriq.com


# Description

Module that connects to T-Advertising Solutions demand sources.
Banner and Video ad formats are supported.

# Test Parameters
```
    var adUnits = {
        code: 'div-gpt-ad-1460505748561-0',
        mediaTypes: {
            banner: {
                sizes: [[300, 250]],
            }
        },
        bids: [{
            bidder: 'tadvertising',
            params: {
                publisherId: 'your-publisher-id'
            }
        }]
    };
```
