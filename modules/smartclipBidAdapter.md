Overview
Module Name: smartclip Bidder Adapter
Module Type: Bidder Adapter
Maintainer: adtech@smartclip.tv
Description
Connect to smartclip for bids.

This adapter requires setup and approval from the smartclip team.

Test Parameters - Use case #1 - outstream with default rendering options

var adUnits = [{
        code: 'video1',
        mediaTypes: {
            banner: {
                sizes: sizes
            },
            video: {
                context: 'outstream',
                playerSize: [640, 480]
            }
        },
        bids: [{
                bidder: 'smartclip',
                params: {
                    tagId: 'Nu68JuOWAvrbzoyrOR9a7A',
                    publisherId: 'pubid',
                    siteId: 'siteId',
					cat: "category",
                    bidfloor: 0.3,
                    bidfloorcur: "EUR",
                    at: 2,
                    cur: ["EUR"],
                    outstream_options: {
                        slot: 'video1'
                    },
					user: [{
						data: {
							id: 'emq',
							name: 'emq',
							segment: [{
								id: 'emq',
								name:'emq',
								value: 'e0:k14'
						}]
					}
				}]
                    //outstream_function: myOutstreamFunction
                }
            }],
    }];