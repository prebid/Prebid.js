# Overview

Module Name: Smartico Bidder Adapter
Module Type: Bidder Adapter
Maintainer: sk@smartico.eu

# Description

Module that connects to Smartico's demand sources

# Test Parameters

    var adUnits = [
        {
            code: 'medium_rectangle',
            mediaTypes: {
                banner: {
                    sizes: [[300, 250]],  // a display size
                }
            },
            sizes:[[300,250]],
            bids: [
                {
                    bidder: "smartico",
                    params: {
					    test: true,
                                            placementId: 'mediumrectangle-demo', //mandatory
                                            token: "FNVzUGZn9ebpIOoheh3kEJ2GQ6H6IyMH39sHXaya", // mandatory
				            region: "region-code", // optional for one region case
                                            regions: ["region_code1","region_code"], // optional for one or more regions case, also can be as region codes comma separated
                                            bannerFormat: "medium_rectangle", // optional -  an alias of banner format for more specific format than automatically detected by sizes
                                            language:"de" // optional - two letter code of ad language
                    }
                }
            ]
        },
    ];

