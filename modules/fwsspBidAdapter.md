# Overview

Module Name: Freewheel MRM Bidder Adapter
Module Type: Bidder Adapter
Maintainer:  vis@freewheel.com

# Description

Module that connects to Freewheel MRM's demand sources

# Test Parameters
```
	var adUnits = [
		   {
			   bids: [
				   {
						bidder: 'fwssp',    // or use alias 'freewheel-mrm'
						params: {
							serverUrl: 'https://example.com/ad/g/1',
							networkId: '42015',
							profile: '42015:js_allinone_profile',
							siteSectionId: 'js_allinone_demo_site_section',
							videoAssetId: '0',
							flags: '+play-uapl'    // optional: users may include capability if needed
							mode: 'live',
							minD: 30,
							maxD: 60,
							adRequestKeyValues: {    // optional: users may include adRequestKeyValues if needed
								_fw_player_width: '1920',
								_fw_player_height: '1080'
							},
							format: 'inbanner'
						}
				   }
			   ]
		   }
	   ];
```
