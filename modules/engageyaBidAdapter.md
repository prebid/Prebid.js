# Overview

```
Module Name: Engageya's Bidder Adapter
Module Type: Bidder Adapter
Maintainer: prebid@engageya.com
```

# Description

Module that connects to Engageya's demand sources

# Test Parameters
```
    var adUnits = [
        {
            code: 'test-div',
            mediaTypes: {
                banner: {
                    sizes: [[300, 250]],  // a display size
                }
            },
            bids: [
                {
                    bidder: "engageya",
                    params: {
						widgetId: '<put here widget id>',
						websiteId: '<put here website id>',
						pageUrl:'[PAGE_URL]'
					}
                }
            ]
        },{
            code: 'test-div',
            mediaTypes: {
                native: {
					image: {
						required: true,
						sizes: [236, 202]
					},
					title: {
						required: true,
						len: 80
					},
					sponsoredBy: {
						required: true
					},
					clickUrl: {
						required: true
					},
					body: {
						required: true
					}
				}
            },
            bids: [
                {
                    bidder: "engageya",
                    params: {
                        widgetId: '<put here widget id>',
						websiteId: '<put here website id>',
						pageUrl:'[PAGE_URL]'
                    }
                }
            ]
        }
    ];
```
