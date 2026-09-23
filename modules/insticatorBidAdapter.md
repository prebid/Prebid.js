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
| Video | Fully supported.
| Audio | Fully supported.

# Bid Parameters

Each of the Insticator-specific parameters provided under the `adUnits[].bids[].params`
object are detailed here.

### Banner

| Key | Scope | Type | Description
| --- | --- | --- | ---
| adUnitId | Required | String | The ad unit ID provided by Insticator. 


# Test Parameters

### Banner
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

### Video
```
    var adUnits = [
           {
               code: 'test-video-div',
               mediaTypes: {
                   video: {
                       playerSize: [[640, 480]],
                       mimes: ['video/mp4'],
                       plcmt: 1,
                       minduration: 1,
                       maxduration: 30
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

### Audio
```
    var adUnits = [
           {
               code: 'test-audio-div',
               mediaTypes: {
                   audio: {
                       mimes: ['audio/mp4', 'audio/mpeg'],
                       minduration: 5,
                       maxduration: 30
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
