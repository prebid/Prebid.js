# Overview

Module Name: InMobi Vantage Bidder Adapter
Module Type: Bidder Adapter
Maintainer: prebid-support@inmobi.com

# Description

Module that sends the auction to InMobi Vantage (InMobi's Prebid Server), which runs it across the demand partners configured for the placement.

# Bid Params

| Name       | Scope    | Description                    | Example     | Type     |
|------------|----------|--------------------------------|-------------|----------|
| `tagID`    | required | InMobi Vantage placement ID    | `'1234'`    | `string` |
| `siteID`   | required | InMobi Vantage site ID         | `'5678'`    | `string` |
| `bidfloor` | optional | Bid floor (USD)                | `1.2`       | `float`  |

`tagID` is sent as the stored impression id (`imp.ext.prebid.storedrequest.id`, also `imp.tagid`) and
`siteID` as the request-level stored request id (`ext.prebid.storedrequest.id`).

# User Sync

The adapter registers one iframe sync (`https://pbs.inmobi.com/static/load-cookie.html`) with Prebid's
user sync queue, so `userSync` settings, activity controls and `syncDelay` apply. The page calls
InMobi Vantage's `/cookie_sync` for every demand partner that ran in the auction and fires the sync of
each one that doesn't have a user id yet; the partners redirect back to `/setuid`, which stores their ids
in the `uids` cookie.

Cooperative syncing (partners outside the auction) is decided by InMobi Vantage: the adapter sends the
`siteID` as the account, and the account's cookie-sync config (or the host default) applies.

Iframe syncs are off in Prebid's default config, so enable them for this bidder:

```
pbjs.setConfig({
    userSync: {
        filterSettings: {
            iframe: {
                bidders: ['inmobiVantage'],
                filter: 'include'
            }
        }
    }
});
```


# Test Parameters

## Banner
```
    var adUnits = [{
            code: 'div-gpt-ad-1460505748561-0',
            mediaTypes: {
                banner: {
                    sizes: [[300, 250]],
                }
            },

            bids: [{
                bidder: 'inmobiVantage',
                params: {
                    tagID: '1719108420057',
                    siteID: '5678'
                }
            }]

    }];
```

## Video
```
    var adUnits = [{
            code: 'div-gpt-ad-1460505748561-0',
            mediaTypes: {
                video: {
                    playerSize : [300,250],
                    mimes :  ["video/x-ms-wmv", "video/mp4"],
                    minduration : 0,
                    maxduration: 30,
                    protocols : [1,2],
                    api: [1, 2, 4, 6],
                    protocols: [3, 4, 7, 8, 10],
                    placement: 1,
                    plcmt: 1
                }
            },

            // Replace this object to test a new Adapter!
            bids: [{
                bidder: 'inmobiVantage',
                params: {
                    tagID: '1443164204446401',
                    siteID: '5678'
                }
            }]
    }];
```

## Native
```
    var adUnits = [{
            code: 'div-gpt-ad-1460505748561-0',
            mediaTypes: {
                native: {
                        type: 'image'
                }
            },

            bids: [{
                bidder: 'inmobiVantage',
                params: {
                    tagID: '10000033152',
                    siteID: '5678',
                    bidfloor: 0.9
                }
            }]
    }];
```        