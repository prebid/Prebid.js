# Overview

```
Module Name: SmartyAds Bidder Adapter
Module Type: Bidder Adapter
Maintainer: supply@smartyads.com
```

# Description

Module that connects to SmartyAds' demand sources

# Parameters

| Name          | Scope    | Description               | Example              |
| :------------ | :------- | :------------------------ | :------------------- |
| `sourceid`  | required (for prebid.js)     | Placement ID | "0" |
| `host`      | required (for prebid-server) | Const value, set to "prebid" | "prebid" |
| `accountid` | required (for prebid-server) | Partner ID | "1901" |
| `traffic`   | optional (for prebid.js)     | Configures the mediaType that should be used. Values can be banner, native or video | "banner" |
| `region`    | optional (for prebid.js)     | Prefix of the region to which prebid must send requests. Possible values: "US_EAST", "EU" | "US_EAST" |

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
                            bidder: 'smartyads',
                            params: {
                                host: 'prebid',
                                sourceid: '0',
                                accountid: '0',
                                traffic: 'native',
                                region: 'US_EAST'

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
                            bidder: 'smartyads',
                            params: {
                              host: 'prebid',
                                sourceid: '0',
                                accountid: '0',
                                traffic: 'banner',
                                region: 'US_EAST'
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
                            bidder: 'smartyads',
                            params: {
                              host: 'prebid',
                                sourceid: '0',
                                accountid: '0',
                                traffic: 'video',
                                region: 'US_EAST'

                            }
                        }
                    ]
                }
            ];
```
