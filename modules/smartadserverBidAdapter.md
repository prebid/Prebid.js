# Overview

```
Module Name: Smart Ad Server Bidder Adapter
Module Type: Bidder Adapter
Maintainer: support@smartadserver.com
```

# Description

Connect to Smart for bids.

The Smart adapter requires setup and approval from the Smart team.
Please reach out to your Technical account manager for more information.

# Test Parameters

## Web
```
    var adUnits = [
        {
            code: 'test-div',
            mediaTypes: {
                banner: {
                    sizes: [[300, 250]]
                }
            },
            bids: [
                {
                    bidder: "smart",
                    params: {
                        domain: 'https://prg.smartadserver.com',
                        siteId: 207435,
                        pageId: 896536,
                        formatId: 62913,
                        ckId: 1122334455 // optional
                    }
                }
            ]
        }
    ];
```

## In-app
```
    var adUnits = [
        {
            code: 'test-div',
            mediaTypes: {
                banner: {
                    sizes: [[300, 250]]
                }
            },
            bids: [
                {
                    bidder: "smart",
                    params: {
                        domain: 'https://prg.smartadserver.com',
                        siteId: 207435,
                        pageId: 896536,
                        formatId: 65906,
                        buId: "com.smartadserver.android.dashboard", // in-app only
                        appName: "Smart AdServer Preview", // in-app only
                        ckId: 1122334455 // optional
                    }
                }
            ]
        }
    ];
```

## Instream Video
```
    var videoAdUnit = {
        code: 'test-div',
        mediaTypes: {
            video: {
                context: 'instream',
                playerSize: [640, 480]
            }
        },
        bids: [{
            bidder: "smart",
            params: {
                domain: 'https://prg.smartadserver.com',
                siteId: 326147,
                pageId: 1153895,
                formatId: 55710,
                bidfloor: 5,
                video: {
                    protocol: 6,
                    startDelay: 1
                }
            }
        }]
    };
```

## Outstream Video

```
    var outstreamVideoAdUnit = {
			code: 'test-div',
			mediaTypes: {
				video: {
					context: 'outstream',
					playerSize: [640, 480]
				}
			},
			renderer: {
				url: 'https://acdn.adnxs.com/video/outstream/ANOutstreamVideo.js',
				render: function (bid) {
					bid.renderer.push(() => {
						ANOutstreamVideo.renderAd({
							targetId: bid.adUnitCode,
							adResponse: bid
						});
					});
				}
			},
			bids: [{
				bidder: "smart",
				params: {
					domain: 'https://prg.smartadserver.com',
					siteId: 207435,
					pageId: 896536,
					formatId: 85089,
					bidfloor: 5,
                    video: {
                        protocol: 6,
                        startDelay: 1
                    }
				}
			}]
		};
```

##  Double Mediatype Setup (Banner & Video)

```
    var adUnits = [{
        code: 'prebid_tag_001',
        mediaTypes: {
            banner: {
                sizes: [[300,250]]
            },
            video: {
                context: 'outstream',
                playerSize: [640, 480]
            }
        },
        bids: [{
            bidder: 'smartadserver',
            params: {
                domain: 'https://prg.smartadserver.com',
                siteId: 411951,
                pageId: 1383641,
                formatId: 84313,
                target: 'iid=8984466',
                video: {
                    protocol: 6, // Stands for "up to VAST 3". For "up to VAST 4" it is 8
                }
            }
        }]
    }];
```