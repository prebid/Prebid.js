---
layout: bidder
title: Improve Digital
description: Prebid Improve Digital Bidder Adaptor
top_nav_section: dev_docs
nav_section: reference
biddercode: improvedigital
biddercode_longer_than_12: true
hide: true
prebid_1_0_supported : true
---

### Send All Bids Ad Server Keys:
(truncated to 20 chars due to [DFP limit](https://support.google.com/dfp_premium/answer/1628457?hl=en#Key-values))

`hb_bidder_improvedig`
`hb_pb_improvedigital`
`hb_adid_improvedigit`
`hb_size_improvedigit`

### Bid params

Depending on your setup in our system, your placements will either have a globally-unique placement ID or a publisher-unique placement key as an identifier.  Therefore, to identify your placement you either need a placementId only, or a combination of publisherId and placementKey.

{: .table .table-bordered .table-striped }
| Name             | Scope    | Description                                                                                                                                                                                                          | Example           |
|------------------+----------+----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+-------------------|
| `placementId`    | optional | The placement ID from Improve Digital.                                                                                          | `1234567`      |
| `publisherId` | optional | Your publisher ID.  This is only required when using a placementKey  | `950` |
| `placementKey`        | optional | The placement key for your placement.  Must be used with `publisherId`.                                                                                                                                                        | `"myMainBannerPlacement300x200"`        |
| `keyValues`         | optional | Contains one or more key-value pairings for key-value targeting                                                                                                                                                           | `{testKey1: ["testValueA"], testKey2: ["testValueB", "testValueC"]}`         |
| `size`        | optional | Size filter.  Where a placement supports multiple sizes, this forces the response to featur only one of the multiple sizes                                                                                                                                                                     | `{w:300,h:250}`            |


<a name="improvedigital-examples" />

### Examples

#### Configuration With placementId

    var adUnits = [{
        code: 'div-gpt-ad-1499748733608-0',
        sizes: [[600, 290]],
        bids: [
            {
                bidder: 'improvedigital',
                params: {
                    placementId:1053688
                }
            }
        ]
    }];

#### Configuration With publisherId/placementKey

    var adUnits = [{
        code: 'div-gpt-ad-1499748733608-0',
        sizes: [[600, 290]],
        bids: [
            {
                bidder: 'improvedigital',
                params: {
                    placementKey:'',
                    publisherId: 
                }
            }
        ]
    }];

#### Configuration With PlacementId and Key-Values

    var adUnits = [{
        code: 'div-gpt-ad-1499748733608-0',
        sizes: [[600, 290]],
        bids: [
            {
                bidder: 'improvedigital',
                params: {
                   placementId:1053689,
                    keyValues: {
                        testKey1: ["testValueA"],
                        testKey2: ["testValueB", "testValueC"]
                    }
                }
            }
        ]
    }];

#### Configuration With PlacementId and Size Filter

    var adUnits = [{
        code: 'div-gpt-ad-1499748733608-0',
        sizes: [[600, 290]],
        bids: [
            {
                bidder: 'improvedigital',
                params: {
                    placementId:1053687,
                    size: {
                        w:300,
                        h:300
                    }
                }
            }
        ]
    }];

{: .alert.alert-info :}
Sizes set in the `adUnit` object will not be used since sizes are already defined as part of the placement setup.
