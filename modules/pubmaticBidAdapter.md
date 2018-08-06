# Overview

```
Module Name:  PubMatic Bid Adapter
Module Type:  Bidder Adapter
Maintainer: header-bidding@pubmatic.com
```

# Description

Connects to PubMatic exchange for bids.

PubMatic bid adapter supports Video and Banner currently.

# Sample Banner Ad Unit: For Publishers
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
        kadfloor: '0.50',                    // optional
        currency: 'AUD'                      // optional
        dctr: 'key1=123|key2=345'            // optional
      }
    }]
}];
```

# Sample Video Ad Unit: For Publishers
```
var adVideoAdUnits = [
{
    code: 'test-div-video',
    mediaTypes: {
        video: {
            playerSize: [640, 480],           // required
            context: 'instream'
        }
    },
    bids: [{
      bidder: 'pubmatic',
      params: {
        publisherId: '351',                     // required
        adSlot: '1363568@300x250',              // required
        video: {
          mimes: ['video/mp4','video/x-flv'],   // required
          skippable: true,                      // optional
          minduration: 5,                       // optional
          maxduration: 30,                      // optional
          startdelay: 5,                        // optional
          playbackmethod: [1,3],                // optional
          api: [ 1, 2 ],                        // optional
          protocols: [ 2, 3 ],                  // optional
          battr: [ 13, 14 ],                    // optional
          linearity: 1,                         // optional
          placement: 2,                         // optional
          minbitrate: 10,                       // optional
          maxbitrate: 10                        // optional
        }
      }
    }]
}]
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


For Video ads, prebid cache needs to be enabled for PubMatic adapter.
pbjs.setConfig({
    debug: true,
    cache: {
        url: 'https://prebid.adnxs.com/pbc/v1/cache'
    }
});

```
Note: Combine the above the configuration with any other UserSync configuration.  Multiple setConfig() calls overwrite each other and only last call for a given attribute will take effect.
