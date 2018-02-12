# Overview

```
Module Name:  Yieldbot Bid Adapter
Module Type:  Bidder Adapter
Maintainer:   pubops@yieldbot.com
```

# Description
The Yieldbot Prebid.js bid adapter integrates Yieldbot demand to publisher inventory.

# BaseAdapter Settings

| Setting               | Value         |
| :-------------------- | :------------ |
| `supportedMediaTypes` | **banner**      |
| `getUserSyncs`        | **image** pixel |
| `ttl`                 | **180** [s]       |
| `currency`            | **USD**       |

# Parameters
The following table lists parameters required for Yieldbot bidder configuration.
See also [Test Parameters](#test-parameters) for an illustration of parameter usage.

| Name    | Scope    | Description                                                         | Example         |
| :------ | :------- | :------------------------------------------------------------------ | :-------------- |
| `psn`   | required | The Yieldbot publisher account short name identifier                | "7b25"          |
| `slot`  | required | The Yieldbot slot name associated to the publisher adUnit to bid on | "mobile_REC_2"  |

## Example Bidder Configuration
```javascript
var adUnit0 = {
    code: '/00000000/leaderboard',
    mediaTypes: {
        banner: {
            sizes: [728, 90]
        }
    },
    bids: [
        {
            bidder: 'yieldbot',
            params: {
                psn: '7b25',
                slot: 'desktop_LB'
            }
        }
    ]
};
```

# Test Parameters
For integration testing, the Yieldbot Platform can be set to always return a bid for requested slots.

When Yieldbot testing mode is enabled, a cookie (`__ybot_test`) on the domain `.yldbt.com` tells the Yieldbot ad server to always return a bid. Each bid is associated to a static mock integration testing creative.

- **Enable** integration testing mode:
  - http://i.yldbt.com/integration/start
- **Disable** integration testing mode:
  - http://i.yldbt.com/integration/stop

***Note:***

- No ad serving metrics are impacted when integration testing mode is enabled.
- The `__ybot_test` cookie expires in 24 hours.
- It is good practice to click "Stop testing" when testing is complete, to return to normal ad delivery.

For reference, the test bidder configuration below is included in the following manual test/example file [test/spec/e2e/gpt-examples/gpt_yieldbot.html](../test/spec/e2e/gpt-examples/gpt_yieldbot.html)
- Replace the adUnit `code` values with your respective DFP adUnitCode.
- ***Remember*** to **Enable** Yieldbot testing mode to force a bid to be returned.

```javascript
var adUnit0 = {
   code: '/00000000/leaderboard',
   mediaTypes: {
       banner: {
           sizes: [728, 90]
       }
   },
   bids: [
       {
           bidder: 'yieldbot',
           params: {
               psn: '1234',
               slot: 'leaderboard'
           }
       }
   ]
};

var adUnit1 = {
   code: '/00000000/medium-rectangle',
   mediaTypes: {
       banner: {
           sizes: [[300, 250]]
       }
   },
   bids: [
       {
           bidder: 'yieldbot',
           params: {
               psn: '1234',
               slot: 'medrec'
           }
       }
   ]
};

var adUnit2 = {
   code: '/00000000/large-rectangle',
   mediaTypes: {
       banner: {
           sizes: [[300, 600]]
       }
   },
   bids: [
       {
           bidder: 'yieldbot',
           params: {
               psn: '1234',
               slot: 'sidebar'
           }
       }
   ]
};

var adUnit3 = {
   code: '/00000000/skyscraper',
   mediaTypes: {
       banner: {
           sizes: [[160, 600]]
       }
   },
   bids: [
       {
           bidder: 'yieldbot',
           params: {
               psn: '1234',
               slot: 'skyscraper'
           }
       }
   ]
};
```
