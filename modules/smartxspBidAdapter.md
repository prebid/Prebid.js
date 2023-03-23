# Overview

Module Name: SmartXSP Bidder Adapter
Module Type: Bidder Adapter
Maintainer: pbjs@smartxsp.io

# Description

Module that connects to SmartXSP's demand sources.

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
                    bidder: 'smartxsp',
                    params: {
                           widgetId: 'sc.demo.oursblanc.io', 
                           accountId: "29Md1Mx1x2MpM7Me"
                    }
                }
            ]
        }
    ];

