# Overview

```
Module Name:  PubMatic Bid Adapter
Module Type:  Bidder Adapter
Maintainer: header-bidding@pubmatic.com
```

# Description

Connects to PubMatic exchange for bids.

PubMatic bid adapter supports Banner currently.

# Sample Ad Unit: For Publishers
```
var adUnits = [
{
    code: 'test-div',    
    sizes: [
        [300, 250],
        [728, 90]
    ],     
    bids: [{
      bidder: 'pubmatic',
      params: {
        publisherId: '156209',               // required
        adSlot: 'pubmatic_test2@300x250',    // required
        pmzoneid: 'zone1, zone11',           // optional
        lat: '40.712775',                    // optional
        lon: '-74.005973',                   // optional
        yob: '1982',                         // optional
        kadpageurl: 'www.test.com',          // optional							
        gender: 'M',                         // optional
        kadfloor: '0.50'                     // optional 									
      }
    }]
}
```

### Configuration

PubMatic recommends the UserSync configuration below.  Without it, the PubMatic adapter will not able to perform user syncs, which lowers match rate and reduces monetization.

```javascript
pbjs.setConfig({
   userSync: {
    iframeEnabled: true,
    enabledBidders: ['pubmatic'],
    syncDelay: 6000
 }});
```
Note: Combine the above the configuration with any other UserSync configuration.  Multiple setConfig() calls overwrite each other and only last call for a given attribute will take effect.
