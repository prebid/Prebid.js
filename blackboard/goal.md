# Goal
make changes in mobianRtdProvider* files to support new viewability prediction endoint. `MOBIAN_VIEWABILITY_URL` is changing. the new endpoint is "https://vp-data.themobianprebid.ai/<gam network code>/<gam site>.json". gam = google ad manager (or doubleclick for publishers). here are two example file you can fetch to examine:
1) `https://vp-data.themobianprebid.ai/36117602/hdm-cosmopolitan.json`
2) `https://vp-data.themobianprebid.ai/36117602/hnp-seattlepi.com.json`

## json response
the important part for you is in "rows". 

### How to read `rows`

`rows` is a JSON object. Each key identifies a placement; inside it, device codes map to three-value arrays:

```json
{
  "/36117602/hdm-cosmopolitan/homepage/atf": {
    "d": [0.3041, 30, "high"],
    "m": [0.2453, 20, "high"],
    "t": [0.3989, 35, "medium"]
  }
}
```

The key is a Google Ad Manager (GAM) ad unit path. A key with an extra segment for a slot ID—for example, `/homepage/atf/gpt_lb_a`—is a slot-level placement: the ad unit path followed by its `adid` slot ID. The file does not label each row with a separate `grain` field; the key tells you which placement it represents. [The model docs define these paths and slot IDs](</Users/anton/mobian/prebid-viewability/docs/MODEL.md:5>).

The device codes are:

- `d`: desktop
- `m`: phone
- `t`: tablet
- `o`: other

Each device’s array is `[probability, bucket_percent, confidence]`:

| Position | Meaning | Example: `d: [0.3041, 30, "high"]` |
|---|---|---|
| 1 | Predicted viewable rate, as a decimal from 0 to 1 | `0.3041` means **30.41%** |
| 2 | That rate placed into a 5-point bucket, rounded **down** | `30` means the prediction falls in the 30–34.99% range |
| 3 | Confidence band based on the amount of history | `high` means at least 2,000 recency-weighted measurable impressions |

So that example predicts a **30.41% viewable rate for desktop** on that ad unit, assigns it to bucket **30**, and marks the estimate `high` confidence. The bucket is not rounded to the nearest five: a prediction of 42.91%, for example, gets bucket 40.

### Example: path prediction versus slot prediction

The live file includes both this ad unit path row:

```json
"/36117602/hdm-cosmopolitan/homepage/atf": {
  "d": [0.3041, 30, "high"],
  "m": [0.2453, 20, "high"]
}
```

and a more specific slot row:

```json
"/36117602/hdm-cosmopolitan/homepage/atf/gpt_lb_a": {
  "d": [0.4291, 40, "high"],
  "m": [0.0894, 5, "medium"]
}
```

## what to do with the json response
the end result is largely unchanged. once we have the slot level data we still want to set slot level targeting via `getTargetingData`. here are some (but maybe not all) differences:
- there is no more http request per ad unit / slot - the json file has the data for all slots.
- we need to get the right device (research the repo to see if there is precedent for this) but we dont want to import code from other modules, only from `libraries` like gptUtils.js for example
- the mobian_vp_* target keys are the same except "likely_viewable" is not in the json, it's just defined as `probability >= 0.5`.
- we want to  use the slot row keys (ex "/36117602/hdm-cosmopolitan/homepage/atf/gpt_lb_a") from the response because `getTargetingData` is at the ad slot level.

# how to build the ad slot key
- getTargetingData is passed adUnitCodes. it's an array that looks like this: `'["Crown","Flex1","AP300","APflex","BPflex","CPflex","DPflex"]'` or `'["gpt_lb_a","gpt_gal_a"]'`
- we should be able to use `getGptSlotForAdUnitCode()` to get the slot and once you have the slot you can use `getAdUnitPath()`
- to look up the slot key in the json its concating ad unit path + ad unit code - for example "/36117602/hdm-cosmopolitan/homepage/atf/" + "gpt_lb_a"


# how to test
- there is a local prebid test page running on http://localhost:8080/
- you can use the chrome extension to run the test page. if that doesn't work, let me know so we can figure something out so you can actually run everything end to end.
- the code is /Users/anton/mobian/dev-prebid
- the build prebid.js is in /Users/anton/mobian/dev-prebid/build/prebid.js
- the file in dev-prebid doesn't auto get updated. the flow is like this:
```
# make changes to mobianRtdProvider.js in /Users/anton/mobian/Prebid.js 
# when changesa ready to test, build the dev js file:
gulp build-bundle-dev --modules=consentManagementGpp,consentManagementTcf,gppControl_usnat,gppControl_usstates,gptPreAuction,storageControl,tcfControl,mobianRtdProvider
# move the built dev js file to dev-prebid
cp -f /Users/anton/mobian/Prebid.js/build/dev/prebid.js /Users/anton/mobian/dev-prebid/build
```
- i'm not sure how to best provide a test json file - let me know your thoughts on this. instead of using `https://vp-data.themobianprebid.ai/...` in the dev-prebid/build file you could just hardcode it to localhost:8080 while testing
