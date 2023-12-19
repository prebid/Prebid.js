# Overview

```
Module Name: Preciso Bidder Adapter
Module Type: Bidder Adapter
Maintainer: tech@preciso.net
```

# Description

Module that connects to preciso' demand sources

# Parameters

| Name          | Scope    | Description               | Example              |
| :------------ | :------- | :------------------------ | :------------------- |
| `region`  | required (for prebid.js)     | region | "prebid-eu" |
| `publisherId` | required (for prebid-server) | partner ID | "1901" |
| `traffic`   | optional (for prebid.js)     | Configures the mediaType that should be used. Values can be banner, native or video | "banner" |

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
                            bidder: 'preciso',
                            params: {
                                host: 'prebid',
                                publisherId: '0',
                                region: 'prebid-eu',
                                traffic: 'native'
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
                            bidder: 'preciso',
                            params: {
                                host: 'prebid',
                                publisherId: '0',
                                region: 'prebid-eu',
                                traffic: 'banner'
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
                            bidder: 'preciso',
                            params: {
                                host: 'prebid',
                                publisherId: '0',
                                region: 'prebid-eu',
                                traffic: 'video'
                            }
                        }
                    ]
                }
            ]; 
```