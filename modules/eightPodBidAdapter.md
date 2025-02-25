# Overview
Module Name: 8pod Bidder Adapter 

Module Type: Bidder Adapter

Maintainer: bianca@8pod.com

# Description

Connect to 8pod for bids.

This adapter requires setup and approval from the 8pod team.

Please add eightPodAnalytics to collect user behavior and improve user experience as well.

# Bidder Adapter configuration example

```
var adUnits = [{
        code: 'something',
        mediaTypes: {
            banner: {
                sizes: [[350, 550]],
            },
        },
        bids: [
            {
                bidder: 'eightPod',
                params: {
                    placementId: 13144370,
                    publisherId: 'publisherID-488864646',
                },
            },
        ],
    }];
```
