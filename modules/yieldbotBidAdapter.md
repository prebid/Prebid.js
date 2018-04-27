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

# Yieldbot Query Parameters

| Name | Description |
| :--- | :---------- |
| `apie` | Yieldbot error description parameter |
| `bt` | Yieldbot bid request type: `initial` or `refresh` |
| `cts_ad` | Yieldbot ad creative request sent timestamp, in milliseconds since the UNIX epoch |
| `cts_imp` | Yieldbot ad impression request sent timestamp, in milliseconds since the UNIX epoch |
| `cts_ini` | Yieldbot bid request sent timestamp, in milliseconds since the UNIX epoch |
| `cts_js` | Adapter code interpreting started timestamp, in milliseconds since the UNIX epoch |
| `cts_ns` | Performance timing navigationStart |
| `cts_rend` | Yieldbot ad creative render started timestamp, in milliseconds since the UNIX epoch |
| `cts_res` | Yieldbot bid response processing started timestamp, in milliseconds since the UNIX epoch |
| `e` | Yieldbot search parameters terminator |
| `ioa` | Indicator that the user-agent supports the Intersection Observer API |
| `it` | Indicator to specify Yieldbot creative rendering occured in an iframe: same/cross origin (`so`)/(`co`) or top (`none`) |
| `la` | Language and locale of the user-agent |
| `lo` | The page visit location Url |
| `lpv` | Time in milliseconds since the last page visit |
| `lpvi` | Pageview identifier for the last pageview within the session TTL |
| `np` | User-agent browsing platform |
| `pvd` | Counter for page visits within a session |
| `pvi` | Page visit identifier |
| `r` | The referring page Url |
| `ri` | Yieldbot ad request identifier |
| `sb` | Yieldbot ads blocked by user opt-out or suspicious activity detected during session |
| `sd` | User-agent screen dimensions |
| `si` | Publisher site visit session identifier |
| `slot` | Slot name for Yieldbot ad markup request e.g. `<slot name>:<width>x<height>` |
| `sn` | Yieldbot bid slot names |
| `ssz` | Dimensions for the respective bid slot names |
| `to` | Number of hours offset from UTC |
| `ua` | User-Agent string |
| `v` | The version of the YieldbotAdapter |
| `vi` | First party user identifier |


# First-party Cookies

| Name | Description |
| :--- | :---------- |
| `__ybotn` | The session is temporarily suspended from the ad server e.g. User-Agent, Geo location or suspicious activity |
| `__ybotu` | The Yieldbot first-party user identifier |
| `__ybotsi` | The user session identifier |
| `__ybotpvd` | The session pageview depth |
| `__ybotlpvi` | The last pageview identifier within the session |
| `__ybotlpv` | The time in **[ms]** since the last visit within the session |
| `__ybotc` | Geo/IP proximity location request Url |
