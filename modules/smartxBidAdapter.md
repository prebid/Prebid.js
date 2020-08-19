Overview
Module Name: smartclip Bidder Adapter
Module Type: Bidder Adapter
Maintainer: adtech@smartclip.tv
Description
Connect to smartclip for bids.

This adapter requires setup and approval from the smartclip team.

Test Parameters - Use case #1 - outstream with default rendering options

 var sizes = [
        [300, 250],
        [300, 50],
        [640, 480]
    ];
    var adUnits = [{
        code: 'video1',
        mediaTypes: {
            banner: {
                sizes: sizes
            },
            video: {
                context: 'outstream',
                playerSize: [640, 360]
            }
        },
        bids: [{
                bidder: 'smartx',
                params: {
                    tagId: 'Nu68JuOWAvrbzoyrOR9a7A',
                    publisherId: '__name__tbdbysmartclip__',
                    siteId: '__name__tbdbysmartclip__',
                    cat: "sport",
                    bidfloor: 0.3,
                    bidfloorcur: "EUR",
                    at: 2,
                    cur: ["EUR"],
                    outstream_options: {
                        slot: 'video1'
                    },
                    user: {
                        data: [{
                            id: 'emq',
                            name: 'emq',
                            segment: [{
                                id: 'emq',
                                name:'emq',
                                value: 'e0:k14:e24'
                            }]
                            },
                            {
                            id: 'gs',
                            name: 'gs',
                            segment: [{
                                id: 'gs',
                                name:'gs',
                                value: 'tone_of_voice_dislike:tone_of_voice_negative:gs_health'
                            }]
                    }]
                }
                    //outstream_function: myOutstreamFunction
                }
            }],
    }];
