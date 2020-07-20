# Overview

```
Module Name:  PubMatic Bid Adapter
Module Type:  Bidder Adapter
Maintainer: header-bidding@pubmatic.com
```

# Description

Connects to PubMatic exchange for bids.

PubMatic bid adapter supports Video, Banner and Native currently.

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
        adSlot: 'pubmatic_test2',            // optional
        pmzoneid: 'zone1, zone11',           // optional
        lat: '40.712775',                    // optional
        lon: '-74.005973',                   // optional
        yob: '1982',                         // optional
        kadpageurl: 'www.test.com',          // optional							
        gender: 'M',                         // optional
        kadfloor: '0.50',                    // optional
        currency: 'AUD',                     // optional (Value configured only in the 1st adunit will be passed on. < br/> Values if present in subsequent adunits, will be ignored.)
        dctr: 'key1=123|key2=345',            // optional (Value configured only in the 1st adunit will be passed on. < br/> Values if present in subsequent adunits, will be ignored.)
        bcat: ['IAB1-5', 'IAB1-7'],                // Optional: Blocked IAB Categories. (Values from all slots will be combined and only unique values will be passed. An array of strings only. Each category should be a string of a length of more than 3 characters.)
        deals: ['deal-id-1', 'deal-id-200']   // optional: PMP Deals, should be array of strings
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
        publisherId: '156209',                  // required
        adSlot: 'pubmatic_video1',              // optional
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

# Sample Native Ad Unit: For Publishers
```
var adUnits = [
{
    code: 'test-div',    
    mediaTypes: {
       native: {
            image: {
                required: true,
                sizes: [150, 50]
            },
            title: {
                required: true,
                len: 80
            },
            sponsoredBy: {
                required: true
            },
            clickUrl: {
                required: true
            }
        }
    },
    bids: [{
      bidder: 'pubmatic',
      params: {
        publisherId: '156295',               // required
        adSlot: 'pubmatic_test2@1x1',       // optional
      }
    }]
}];
```
# Sample Configuration for Multi-format Ad Unit: For Publishers
```
var adUnits = [
{
    code: 'test-div',
    mediaTypes: {
        banner: {
            sizes: [
                [300, 250],
                [728, 90]
            ]
        },
        video: {
            playerSize: [640, 480],          // required
            context: 'instream'
        },
        native: {
            image: {
                required: true,
                sizes: [150, 50]
            },
            title: {
                required: true,
                len: 80
            },
            sponsoredBy: {
                required: true
            },
            clickUrl: {
                required: true
            }
        }
    },
    bids: [{
      bidder: 'pubmatic',
      params: {
        publisherId: '156209',               // required
        adSlot: 'pubmatic_test2@300x250',    // optional
        pmzoneid: 'zone1, zone11',           // optional
        lat: '40.712775',                    // optional
        lon: '-74.005973',                   // optional
        yob: '1982',                         // optional
        kadpageurl: 'www.test.com',          // optional
        gender: 'M',                         // optional
        kadfloor: '0.50',                    // optional
        currency: 'AUD',                     // optional (Value configured only in the 1st adunit will be passed on. < br/> Values if present in subsequent adunits, will be ignored.)
        dctr: 'key1=123|key2=345',           // optional (Value configured only in the 1st adunit will be passed on. < br/> Values if present in subsequent adunits, will be ignored.)
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
}];
```


# ## Configuration

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

# Notes: 
- PubMatic will return a test-bid if "pubmaticTest=true" is present in page URL
- PubMatic will set bid.adserverTargeting.hb_buyid_pubmatic targeting key while submitting a bid into Prebid

