# Overview

```
Module Name: smartclip Bidder Adapter
Module Type: Bidder Adapter
Maintainer: adtech@smartclip.tv
```

# Description

Connect to smartx for bids.

This adapter requires setup and approval from the smartclip team.

# Test Parameters - Use case #1 - Out-Stream example and default rendering options
```
    var adUnits = [{
        code: 'video1',
        mediaTypes: {
            video: {
                context: 'outstream',
                playerSize: [640, 360]
            }
        },
        bids: [{
            bidder: 'smartx',
            params: {
                tagId: 'Nu68JuOWAvrbzoyrOR9a7A',
                publisherId: '11986',
                siteId: '22860',
                bidfloor: 0.3,
                bidfloorcur: "EUR",
                at: 2,
                cur: ["EUR"],
                outstream_options: {
                    slot: 'video1'
                },
            }
        }],
    }];
```

# Test Parameters - Use case #2 - Out-Stream with targeting example and default rendering options
```
    var adUnits = [{
        code: 'video1',
        mediaTypes: {
            video: {
                context: 'outstream',
                playerSize: [640, 360]
            }
        },
        bids: [{
            bidder: 'smartx',
            params: {
                tagId: 'Nu68JuOWAvrbzoyrOR9a7A',
                publisherId: '11986',
                siteId: '22860',
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
                            name: 'emq',
                            value: 'e0:k14:e24'
                        }]
                    }, {
                        id: 'gs',
                        name: 'gs',
                        segment: [{
                            id: 'gs',
                            name: 'gs',
                            value: 'tone_of_voice_dislike:tone_of_voice_negative:gs_health'
                        }]
                    }]
                }
            }
        }]
    }];
```

# Test Parameters - Use case #3 - In-Stream example and default rendering options
```
    var adUnits = [{
        code: 'video1',
        mediaTypes: {
            video: {
                context: 'instream',
                playerSize: [640, 360]
            }
        },
        bids: [{
            bidder: 'smartx',
            params: {
                tagId: 'Nu68JuOWAvrbzoyrOR9a7A',
                publisherId: '11986',
                siteId: '22860',
                bidfloor: 0.3,
                bidfloorcur: "EUR",
                at: 2,
                cur: ["EUR"]
            }
        }],
    }];
```

# Test Parameters - Use case #4 - In-Stream with targeting example and default rendering options
```
    var adUnits = [{
        code: 'video1',
        mediaTypes: {
            video: {
                context: 'instream',
                playerSize: [640, 360]
            }
        },
        bids: [{
            bidder: 'smartx',
            params: {
                tagId: 'Nu68JuOWAvrbzoyrOR9a7A',
                publisherId: '11986',
                siteId: '22860',
                bidfloor: 0.3,
                bidfloorcur: "EUR",
                at: 2,
                cur: ["EUR"],
                user: {
                    data: [{
                            id: 'emq',
                            name: 'emq',
                            segment: [{
                                id: 'emq',
                                name: 'emq',
                                value: 'e0:k14:e24'
                            }]
                        },
                        {
                            id: 'gs',
                            name: 'gs',
                            segment: [{
                                id: 'gs',
                                name: 'gs',
                                value: 'tone_of_voice_dislike:tone_of_voice_negative:gs_health'
                            }]
                        }
                    ]
                }
            }
        }],
    }];
```