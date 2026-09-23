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

### User

Supplied under `params.user`. First party data set through `ortb2.user` is also
forwarded, and where both name the same field the `ortb2` value is used.

| Key | Scope | Type | Description
| --- | --- | --- | ---
| yob | Optional | Integer | Year of birth.
| gender | Optional | String | `M`, `F` or `O`.
| keywords | Optional | String | Comma separated keywords.
| data | Optional | Array | OpenRTB `user.data` segments. Concatenated after any set on `ortb2.user.data`.
| ext | Optional | Object | Merged under `user.ext`.

### Video

Supplied under `params.video`, and taking precedence over the same field on
`mediaTypes.video`. Every key is optional and is dropped if it fails validation.

`minduration`, `maxduration`, `protocols`, `startdelay`, `linearity`, `skip`,
`skipmin`, `skipafter`, `sequence`, `battr`, `maxextended`, `minbitrate`,
`maxbitrate`, `playbackmethod`, `playbackend`, `delivery`, `pos`, `api`,
`podid`, `podseq`, `poddur`, `slotinpod`, `mincpmpersec`, `maxseq`, `rqddurs`,
`ext`

### Audio

Supplied under `params.audio`, and taking precedence over the same field on
`mediaTypes.audio`. Every key is optional and is dropped if it fails validation.

`mimes`, `minduration`, `maxduration`, `poddur`, `protocols`, `startdelay`,
`rqddurs`, `podid`, `podseq`, `sequence`, `slotinpod`, `mincpmpersec`, `battr`,
`maxextended`, `minbitrate`, `maxbitrate`, `delivery`, `companionad`, `api`,
`companiontype`, `maxseq`, `feed`, `stitched`, `nvol`, `durfloors`, `ext`


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
                       maxduration: 30,
                       feed: 3,
                       stitched: 0,
                       nvol: 1
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
