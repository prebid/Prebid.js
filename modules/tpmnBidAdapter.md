# Overview

```
Module Name:  TPMN Bid Adapter
Module Type:  Bidder Adapter
Maintainer: develop@tpmn.co.kr
```

# Description

Connects to TPMN exchange for bids.

NOTE:
- TPMN bid adapter only supports MediaType BANNER, VIDEO.
- Multi-currency is not supported.
- Please contact the TPMN sales team via email for "inventoryId" issuance.


# Bid Parameters

## bids.params (Banner, Video)
***Pay attention to the case sensitivity.***

{: .table .table-bordered .table-striped }
|       Name     |    Scope    |                 Description                |    Example    |     Type     |
| -------------- | ----------- | ------------------------------------------ | ------------- | ------------ |
| `inventoryId` | required | Ad Inventory id TPMN | 123 | Number |
| `bidFloor` | recommended | Minimum price in USD. bidFloor applies to a specific unit. | 1.50 | Number |
| `bcat` | optional | IAB 5.1 Content Categories | ['IAB7-39'] | [String] |
| `badv` | optional | IAB Block list of advertisers by their domains | ['example.com'] | [String] |
| `bapp` | optional | IAB Block list of applications  | ['com.blocked'] | [String] |


# Banner Ad Unit Config
```
  var adUnits = [{
      // Banner adUnit
      code: 'banner-div',
	  mediaTypes: {
		  banner: {
		    sizes: [[300, 250], [320, 50]],  // banner size
		    battr: [1,2,3]                   // optional
		  }
	  },
    bids: [
      {
        bidder: 'tpmn',
        params: {
          inventoryId: 1,         // required
          bidFloor: 2.0,            // recommended
          ... // bcat, badv, bapp   // optional
        }
      }
    ]
    }];
```


# mediaTypes Parameters

## mediaTypes.banner

The following banner parameters are supported here so publishers may fully declare their banner inventory:

{: .table .table-bordered .table-striped }
|    Name   |    Scope    |                      Description                                  |  Example  |    Type   |
| --------- | ------------| ----------------------------------------------------------------- | --------- | --------- |
| `sizes` | required | Avalaible sizes supported for banner ad unit | [ [300, 250], [300, 600] ] | [[Integer, Integer], [Integer, Integer]] | 
| `battr` | optional | IAB 5.3 Creative Attributes | [1,2,3] | [Number] |
## mediaTypes.video

We support the following OpenRTB params that can be specified in `mediaTypes.video` or in `bids[].params.video`

{: .table .table-bordered .table-striped }
|    Name   |    Scope    |                      Description                                  |  Example  |    Type   |
| --------- | ------------| ----------------------------------------------------------------- | --------- | --------- |
| `context` | required | instream or outstream |'outstream' | string | 
| `playerSize` | required | Avalaible sizes supported for video ad unit. | [[300, 250]] | [Integer, Integer] | 
| `mimes` | required | List of content MIME types supported by the player. | ['video/mp4']| [String]|
| `protocols` | optional | Supported video bid response protocol values. | [2,3,5,6] | [integers]|
| `api` | optional | Supported API framework values. | [2] |  [integers] |
| `maxduration` | optional | Maximum video ad duration in seconds. | 30 | Integer |
| `minduration` | optional | Minimum video ad duration in seconds. | 6 | Integer |
| `startdelay` | optional | Indicates the start delay in seconds for pre-roll, mid-roll, or post-roll ad placements. | 0 | Integer |
| `placement` | optional | Placement type for the impression. | 1 | Integer |
| `minbitrate` | optional | Minimum bit rate in Kbps. | 300 | Integer |
| `maxbitrate` | optional | Maximum bit rate in Kbps. | 9600 | Integer |
| `playbackmethod` | optional | Playback methods that may be in use. Only one method is typically used in practice. | [2]| [Integers] |
| `linearity` | optional | OpenRTB2 linearity. in-strea,overlay... | 1 | Integer |
| `skip` | optional | Indicates if the player will allow the video to be skipped, where 0 = no, 1 = yes . | 1 | Integer |
| `battr` | optional | IAB 5.3 Creative Attributes | [1,2,3] | [Number] |


# Video Ad Unit Config
```
  var adUnits = [{
        code: 'video-div',
        mediaTypes: {
            video: {
                context: 'instream',                    // required
                mimes: ['video/mp4'],                   // required
                playerSize: [[ 640, 480 ]],               // required
                ... // skippable, startdelay, battr..   // optional
            }
        },
        bids: [{
            bidder: 'tpmn',
            params: {
                inventoryId: 2,         // required
                bidFloor: 2.0,            // recommended
                ... // bcat, badv, bapp   // optional
            }
        }]
    }];
```