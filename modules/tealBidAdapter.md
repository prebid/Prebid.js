Overview
========

```
Module Name: Teal Adapter
Module Type: Bidder Adapter
Maintainer: prebid@teal.works
```

Description
===========

This module connects web publishers to Teal's server-side banner demand.

# Bid Parameters

| Key | Required | Example | Description |
| --- | -------- | ------- | ----------- |
| `account` | yes | `myaccount` | account name provided by your account manager - set to `test-account` for test mode |
| `placement` | no | `mysite300x250` | placement name provided by your account manager - set to `test-placement300x250` for test mode |
| `testMode` | no | `true` | activate test mode - 100% test bids - placement needs be set to `test-placement300x250` for this option to work |
| `useSourceBidderCode` | no | `true` | use seat bidder code as hb_bidder, instead of teal (or configured alias) |
| `subAccount` | no | `mysubaccount` | subAccount name, if provided by your account manager |

### Notes

- Specific ads.txt entries are required for the Teal bid adapter - please contact your account manager or <prebid@teal.works> for more details.
- This adapter requires iframe user syncs to be enabled to support uids.
- For full functionality in GDPR territories, please ensure Teal Digital Group Ltd is configured in your CMP.

# Test Parameters

```
var adUnits = [{
  code: 'test-div',
  sizes: [[300, 250]],
  bids: [{
    bidder: 'teal',
    params: {
      account: 'test-account',
      placement: 'test-placement300x250',
      testMode: true
    },
  }]
}]
```
