Overview
========

```
Module Name: Teal Adapter
Module Type: Bidder Adapter
Maintainer: prebid@teal.works
```

Description
===========

This module connects web publishers to Teal demand.

# Bid Parameters

| Key | Required | Example | Description |
| --- | -------- | ------- | ----------- |
| `account` | yes | `myaccount` | account name provided by your account manager |
| `placement` | no | `mysite300x250` | placement name provided by your account manager |
| `testMode` | no | `true` | activate test mode - 100% test bids |
| `useSourceBidderCode` | no | `true` | use seat bidder code as hb_bidder, instead of teal (or confgiured alias) |

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
