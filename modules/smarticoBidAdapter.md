# Overview

Module Name: Smartico Bidder Adapter
Module Type: Bidder Adapter
Maintainer: sk@smartico.eu

# Description

Module that connects to Smartico's demand sources.

# Test Parameters

    var adUnits = [
        {
            code: 'medium_rectangle',
            mediaTypes: {
                banner: {
                    sizes: [[300, 250]],  // a display size
                }
            },
            bids: [
                {
                    bidder: 'smartico',
                    params: {
                           placementId: 'testPlacementId', 
                           token: "FNVzUGZn9ebpIOoheh3kEJ2GQ6H6IyMH39sHXaya"
                    }
                }
            ]
        }
    ];

