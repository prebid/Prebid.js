	
# Overview

```
Module Name: Ozone Project Bidder Adapter
Module Type: Bidder Adapter
Maintainer: engineering@ozoneproject.com

```

# Description

Module that connects to the Ozone Project's demand source(s).

The Ozone Project bid adapter supports Banner and Outstream Video mediaTypes ONLY.
 
# Test Parameters


A test ad unit that will consistently return test creatives:

```

//Banner adUnit

adUnits = [{
                    code: 'id-of-your-banner-div',
			        mediaTypes: {
			          banner: {
			            sizes: [[300, 250], [300,600]]
			          }
			        },
                    bids: [{
                        bidder: 'ozone',
                        params: {
                            publisherId: 'OZONENUK0001', /* an ID to identify the publisher account  - required */
                            siteId: '4204204201', /* An ID used to identify a site within a publisher account - required */
                            placementId: '0420420421', /* an ID used to identify the piece of inventory - required - for appnexus test use 13144370. */
							customData: [{"settings": {}, "targeting": {"key": "value", "key2": ["value1", "value2"]}}],/* optional array with 'targeting' placeholder for passing publisher specific key-values for targeting. */                            
                        }
                    }]
                }];
```


```

//Outstream Video adUnit

adUnits = [{
                    code: 'id-of-your-video-div',
                    mediaTypes: {
                        video: {
                            playerSize: [640, 360],
                            mimes: ['video/mp4'],
                            context: 'outstream',
                        }
                    },
                    bids: [{
                        bidder: 'ozone',
                        params: {
                            publisherId: 'OZONENUK0001', /* an ID to identify the publisher account  - required */
                            siteId: '4204204201', /* An ID used to identify a site within a publisher account - required */
							customData: [{"settings": {}, "targeting": { "key": "value", "key2": ["value1", "value2"]}}]
                            placementId: '0440440442', /* an ID used to identify the piece of inventory - required - for unruly test use 0440440442. */
							video: {
                                skippable: true, /* optional */
                                playback_method: ['auto_play_sound_off'], /* optional */
                                targetDiv: 'some-different-div-id-to-my-adunitcode' /* optional */
                            }
                        }
                    }]
                }];
```

//Instream Video adUnit

adUnits = [{
					code: 'video1',
					mediaTypes: {
						video: {
							playerSize: [640, 480],
							context: 'instream',
							mimes: ['video/mp4'],
							protocols: [1, 2, 3, 4, 5, 6, 7, 8],
							playbackmethod: [2]
						}
					},
					bids: [{
							bidder: 'ozone',
							params: {
								publisherId: 'OZONENUK0001',
								placementId: '8000000328', // or 999
								siteId: '4204204201',
								video: {
									skippable: true,
									playback_method: ['auto_play_sound_off']
								},
							customData: [{
							      "settings": {},
							      "targeting": {
							          "key": "value",
								  "key2": ["value1", "value2"]
								  }
							}
							]

							}
						}]
				};
```
