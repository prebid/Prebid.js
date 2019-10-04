# Overview

```
Module Name: Smart Ad Server Bidder Adapter
Module Type: Bidder Adapter
Maintainer: gcarnec@smartadserver.com
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
               sizes: [[300, 250]],  // a display size
               bids: [
                   {
                       bidder: "smart",
                       params: {
                            domain: 'http://ww251.smartadserver.com',
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
               sizes: [[300, 250]],  // a display size
               bids: [
                   {
                       bidder: "smart",
                       params: {
                            domain: 'http://ww251.smartadserver.com',
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

## Outstream Video
```
    var adUnits = [{
			code: 'test-div',
			mediaTypes: {
				video: {
					context: 'outstream',
					playerSize: [640, 480]
				}
			},
			bids: [{
				bidder: "smart",
				params: {
					domain: 'http://ww251.smartadserver.com',
					siteId: 207435,
					pageId: 896536,
					formatId: 85089,
					bidfloor: 5
				}
			}]
		}
    ];
```