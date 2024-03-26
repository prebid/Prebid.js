# Overview

```
Module Name:  Gamma Bid Adapter
Module Type:  Bidder Adapter
Maintainer: support@gammassp.com
```

# Description

Connects to Gamma exchange for bids.

Gamma bid adapter supports Banner, Video.

# Parameters

| Name          | Scope    | Description               | Example              |
| :------------ | :------- | :------------------------ | :------------------- |
| `zoneId`      | required                     | Zone ID | "1398219417" |
| `siteId`      | required                     | Website ID | "1398219351" |
| `region`      | optional (for prebid.js)     | Prefix of the region to which prebid must send requests. Possible values: "SGP", "JPN", "US_WEST", "EU" | "SGP" |

# Test Parameters: For Banner
```
var adUnits = [{
          code: 'gamma-hb-ad-123456-0',
          sizes: [[300, 250]],
  
          // Replace this object to test a new Adapter!
          bids: [{
			bidder: 'gamma',
            params: {
				siteId: '1398219351',
				zoneId: '1398219417',
				region: 'SGP'	
            }
          }]
  
        }];
```
# Test Parameters: For Video
```
var adUnits = [{
          code: 'gamma-hb-ad-78910-0',
          sizes: [[640, 480]],
  
          // Replace this object to test a new Adapter!
          bids: [{
			bidder: 'gamma',
            params: {
				siteId: '1398219351',
				zoneId: '1614755846',
				region: 'SGP'
            }
          }]
  
        }];
```
# Ad Unit and Setup: For Testing
In order to receive bids please map localhost to (any) test domain.

```
<--! Prebid Config section >
<script> 
    var PREBID_TIMEOUT = 3000;
    var adUnits = [{
        code: 'gamma-hb-ad-123456-0',
        sizes: [[300, 250]],
        bids: [{
		bidder: 'gamma',
            params: {
		siteId: '1398219351',
		zoneId: '1398219417',
		region: 'SGP'
            }
          }]
    }];
    
    var pbjs = pbjs || {};
    pbjs.que = pbjs.que || [];

    // Adjust bid CPM to ensure it wins the auction (USED ONLY FOR TESTING). Need to do this since test bids have too low a CPM
    pbjs.bidderSettings = {
      'gamma': {
        bidCpmAdjustment : function(bidCpm, bid){
          // adjust the bid in real time before the auction takes place, only do so for valid bids ignore no bids
          if (bid.w !== 0 && bid.h !== 0 && bidCpm !== 0) {
            return bidCpm + 0.50;
          }
        }
      }
    };
  </script>
  <!-- End Prebid Config section>
  ```
