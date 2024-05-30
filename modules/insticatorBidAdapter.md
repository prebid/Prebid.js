Overview
========

```
Module Name: Insticator Adapter
Module Type: Bidder Adapter
Maintainer: contact@insticator.com
```

Description
===========

This module connects publishers to Insticator exchange of demand sources through Prebid.js. 

### Supported Media Types

| Type | Support
| --- | ---
| Banner | Fully supported for all approved sizes.

# Bid Parameters

Each of the Insticator-specific parameters provided under the `adUnits[].bids[].params`
object are detailed here.

### Banner

| Key | Scope | Type | Description
| --- | --- | --- | ---
| adUnitId | Required | String | The ad unit ID provided by Insticator. 


# Test Parameters
```
    var adUnits = [
           {
               code: 'test-div',
               mediaTypes: {
                   banner: {
                       sizes: [[300, 250], [300, 600]]
                   }
               },
               bids: [
                   {
                       bidder: 'insticator',
                       params: {
                           adUnitId: 'test'
                       }
                   }
               ]
           }
	]
```
