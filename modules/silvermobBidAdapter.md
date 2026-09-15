# Overview

```
Module Name: SilverMob Bidder Adapter
Module Type: Bidder Adapter
Maintainer: prebid@silvermob.com
```

# Description

Module that connects to the SilverMob platform. Supports banner, video and native ad units,
user syncing (iframe or pixel), GDPR / USP / GPP consent forwarding and price floors.

# Bid Params

| Name       | Scope    | Description                                        | Example  | Type     |
|------------|----------|----------------------------------------------------|----------|----------|
| `zoneid`   | required | Placement id                                       | `'3011'` | `string` |
| `host`     | optional | Data center: `us` (default), `eu`, `ru` or `apac`  | `'eu'`   | `string` |
| `bidfloor` | optional | Floor price in `currency`, used when no floor module value | `0.5` | `number` |
| `currency` | optional | Request currency, `USD` by default                 | `'EUR'`  | `string` |

Ad units on different zones (or data centers) are sent as separate requests.

# User Sync

The adapter registers one sync per data center used in the auction. Enable iframe syncs to let
SilverMob sync with its demand partners in one hop:

```
pbjs.setConfig({
  userSync: {
    filterSettings: {
      iframe: { bidders: ['silvermob'], filter: 'include' }
    }
  }
});
```

# Test Parameters
```
    var adUnits = [
                // Will return static native ad. Assets are stored through user UI for each placement separetly
                {
                    code: 'placementId_0',
                    mediaTypes: {
                        native: {}
                    },
                    bids: [
                        {
                            bidder: 'silvermob',
                            params: {
                                host: 'us',
                                zoneid: '0'
                            }
                        }
                    ]
                },
                // Will return static test banner
                {
                    code: 'placementId_0',
                    mediaTypes: {
                        banner: {
                            sizes: [[300, 250]],
                        }
                    },
                    bids: [
                        {
                            bidder: 'silvermob',
                            params: {
                              host: 'us',
                              zoneid: '0'
                            }
                        }
                    ]
                },
                // Will return test vast xml. All video params are stored under placement in publishers UI
                {
                    code: 'placementId_0',
                    mediaTypes: {
                        video: {
                            playerSize: [640, 480],
                            context: 'instream'
                        }
                    },
                    bids: [
                        {
                            bidder: 'silvermob',
                            params: {
                                host: 'us',
                                zoneid: '0'
                            }
                        }
                    ]
                }
            ];
```
