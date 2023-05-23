# Overview

Module Name: RTB House Bidder Adapter
Module Type: Bidder Adapter
Maintainer: prebid@rtbhouse.com

# Description

Connects to RTB House unique demand.
Banner and native formats are supported.
Unique publisherId is required. 
Please reach out to pmp@rtbhouse.com to receive your own

# Test Parameters
```
    var adUnits = [
           // banner
           {
               code: 'test-div',
               mediaTypes: {
	           banner: {
                       sizes: [[300, 250]],
                   }
               },
               bids: [
                   {
                       bidder: "rtbhouse",
                       params: {
                           region: 'prebid-eu',
                           publisherId: 'PREBID_TEST_ID',
                           bidfloor: 0.01  // optional
                       }
                   }
               ]
           },
           // native
           {
                code: 'test-div',
                mediaTypes: {
                    native: {
                        title: {
                            required: true,
                            len: 25
                        },
                        image: {
                            required: true,
                            sizes: [300, 250]
                        },
                        body: {
                            required: true,
                            len: 90
                        }
                    }
                },
                bids: [
                    {
                        bidder: "rtbhouse",
                        params: {
                            region: 'prebid-eu',
                            publisherId: 'PREBID_TEST_ID'
                            bidfloor: 0.01  // optional
                        }
                    }
                ]
           }
       ];
```

# Protected Audience API (FLEDGE) support
There’s an option to receive demand for Protected Audience API (FLEDGE) 
ads using RTB House bid adapter. 
Prebid’s [fledgeForGpt](https://docs.prebid.org/dev-docs/modules/fledgeForGpt.html) 
module and Google Ad Manager is currently required.

The following steps are necessary for proper set up FLEDGE demand - 
also described in [fledgeForGpt](https://docs.prebid.org/dev-docs/modules/fledgeForGpt.html) 
module documentation. Please note that the steps may be replaced 
or simplified in the future when 
[fledgeForGpt](https://docs.prebid.org/dev-docs/modules/fledgeForGpt.html) module and/or 
other parts of Prebid's core requirements are modifed.

1. Reach out to your RTB House partner to coordinate the setup

2. Build the prebid.js bundle with fledgeForGpt module added:
```javascript
gulp build --modules=fledgeForGpt,...
```

3. Enable the fledgeForGpt module using the setConfig method:
```javascript
pbjs.setConfig({
  fledgeForGpt: {
    enabled: true
  }
});
```

4. Enable the bidder to participate in FLEDGE auctions:
```javascript
pbjs.setBidderConfig({
    bidders: ["rtbhouse"],
    config: {
        fledgeEnabled: true
    }
});
```
If there are any other bidders to be allowed for that, add them to the bidders array.

5. Enable the ad units which you allow to display FLEDGE ads:
```javascript
pbjs.addAdUnits({
    code: "fledge-allowed-adunit-div",
    ...
    ortb2Imp: {
        ext: {
            ae: 1
        }
    }
});
```