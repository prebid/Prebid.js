```
Module Name: district m Bid Adapter
Module Type: Bidder Adapter
Maintainer: Steve Alliance (steve@districtm.net)
```

# Overview

The `districtmDmxAdapter` module allows publishers to include DMX Exchange demand using Prebid 1.0+.

## Attributes

* Single Request
* Multi-Size Support
* GDPR Compliant
* Bids returned in **NET**

 ## Media Types
 
* Banner

## Bidder Parameters

| Key | Scope | Type | Description
| --- | --- | --- | ---
| dmxid | Mandatory | Integer | Unique identifier of the placement, dmxid can be obtained in the district m Boost platform.
| memberid | Mandatory | Integer | Unique identifier for your account, memberid can be obtained in the district m Boost platform.

# Ad Unit Configuration Example

```javascript
    var adUnits = [{
        code: 'div-gpt-ad-1460505748561-0',
        mediaTypes: {
            banner: {
                sizes: [[300, 250], [300,600]],
            }
        },
        bids: [{
            bidder: 'districtmDMX',
            params: {
                dmxid: 100001,
                memberid:  100003
            }
        }]
    }];
```


# Quick Start Guide

###### 1. Including the `districtmDmxAdapter` in your build process.

Add the adapter as an argument to gulp build.

```
gulp build --modules=districtmDmxAdapter,ixBidAdapter,appnexusBidAdapter
```

*Adding `"districtmDmxAdapter"` as an entry in a JSON file with your bidders is also acceptable.*

```
[
	"districtmDmxAdapter",
	"ixBidAdapter",
	"appnexusBidAdapter"
]
```

*Proceed to build with the JSON file.*

```
gulp build --modules=bidderModules.json
```

###### 2. Configure the ad unit object

Once Prebid is ready you may use the below example to create the adUnits object and begin building the configuration.

```javascript
var adUnits = [{
		code: 'div-gpt-ad-1460505748561-0',
		mediaTypes: {
			banner: {
				sizes: [[300, 250], [300, 600], [728, 90]],
			}
		},
		bids: []
	}
];
```

###### 3. Add the bidder

Our demand and adapter supports multiple sizes per placement, as such a single dmxid may be used for all sizes of a single domain.

```javascript
    var adUnits = [{
        code: 'div-gpt-ad-1460505748561-0',
        mediaTypes: {
            banner: {
                sizes: [[300, 250], [300, 600], [728, 90]],
            }
        },
        bids: [{
            bidder: 'districtmDMX',
            params: {
                dmxid: 100001,
                memberid:  100003
            }
        }]
    }];
```

###### 4. Implementation Checking

Once the bidder is live in your Prebid configuration you may confirm it is making requests to our end point by looking for requests to `https://dmx.districtm.io/b/v1`. 


###### 5. Setting first party data 

```code
pbjs.setConfig({
    dmx: {
        user: {
            'gender': 'M',
            'yob': 1992,
            // keywords example
            'keywords': 'automotive,dodge,engine,car'
            
        },
        site: {
            cat: ['IAB-12'],
            pagecat: ['IAB-14'],
            sectioncat: ['IAB-24']
        }
    }
});
```
