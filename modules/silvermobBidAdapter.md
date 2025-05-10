# Overview

```
Module Name: SilverMob Bidder Adapter
Module Type: Bidder Adapter
Maintainer: prebid@silvermob.com
```

# Description

Module that connects to SilverMob platform

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
