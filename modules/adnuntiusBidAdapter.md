# Overview

```
Module Name: Adnuntius Bidder Adapter
Module Type: Bidder Adapter
Maintainer: info@adnuntius.com
```

# Description

Adnuntius Bidder Adapter for Prebid.js. Video and Banner formats are supported.

The adaptor supports returning both the highest bidder **and**
bids with Deal IDs when a `maxDeals` parameter greater than `0`
is provided.

If deal bids are returned, they are assigned a `bidderCode` using
one of the aliases supplied for this bidder:

- `adndeal1`
- `adndeal2`
- `adndeal3`
- `adndeal4`
- `adndeal5`

If you want to accept these responses, you must add the following 
configuration:

```javascript
pbjs.bidderSettings = {
            adnuntius: {
                allowAlternateBidderCodes: true,
                allowedAlternateBidderCodes: [
                  "adndeal1", 
                  "adndeal2", 
                  "adndeal3",
                  "adndeal4",
                  "adndeal5"
                ],
            }
        };
```

# Test Parameters
```
    var adUnits = [
            {
                code: "test-div",
                mediaTypes: {
                    banner: {
                        sizes: [[980, 360], [980, 300], [980, 240], [980, 120]]
                    }
                },
                bids: [
                    {
                        bidder: "adnuntius",
                        params: {
                            auId: "8b6bc",
                            network: "adnuntius",
                            maxDeals: 1
                        }
                    },
                ]
            },
           
        ];
```
