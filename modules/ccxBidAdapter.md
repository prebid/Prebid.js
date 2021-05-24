# Overview

Module Name: Clickonometrics Bidder Adapter
Module Type: Bidder Adapter
Maintainer: it@clickonometrics.pl

# Description

Module that connects to Clickonometrics's demand sources

# Test Parameters

    var adUnits = [
	{
	    code: 'test-banner',
	    mediaTypes: {
		banner: {
		    sizes: [[300, 250]],
		}
	    },
	    bids: [
		{
		    bidder: "ccx",
		    params: {
			placementId: 3286844
		    }
		}
	    ]
	},
	{
	    code: 'test-video',
	    mediaTypes: {
		video: {
		    playerSize: [1920, 1080]
		    protocols: [2, 3, 5, 6], //default
		    mimes: ["video/mp4", "video/x-flv"], //default 
		    playbackmethod: [1, 2, 3, 4], //default
		    skip: 1, //default 0
		    skipafter: 5 //delete this key if skip = 0
		}
	    },
	    bids: [
		{
		    bidder: "ccx",
		    params: {
			placementId: 3287742
		    }
		}
	    ]
	}

    ];
