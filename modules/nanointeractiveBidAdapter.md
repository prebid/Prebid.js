# Overview

```
Module Name:  Nano Interactive Bid Adapter
Module Type:  Bidder Adapter
Maintainer: rade@nanointeractive.com
```

# Description

Connects to Nano Interactive search retargeting Ad Server for bids.



<br>
### Requirements:
To be able to get identification key (`pid`), please contact us at <br> 
`https://www.nanointeractive.com/publishers` <br>
<br><br><br>

#### Send All Bids Ad Server Keys:
(truncated to 20 chars due to [DFP limit](https://support.google.com/dfp_premium/answer/1628457?hl=en#Key-values))

`hb_adid_nanointeract`
`hb_bidder_nanointera`
`hb_pb_nanointeractiv`
`hb_format_nanointera`
`hb_size_nanointeract`
`hb_source_nanointera`

#### Default Deal ID Keys:
`hb_deal_nanointeract`

### bid params

{: .table .table-bordered .table-striped }
| Name           | Scope    | Description                                      | Example                      |
| :------------- | :------- | :----------------------------------------------- | :--------------------------- |
| `pid`          | required | Identification key, provided by Nano Interactive | `'5afaa0280ae8996eb578de53'` |
| `category`     | optional | Contextual taxonomy                              | `'automotive'`               |
| `categoryName` | optional | Contextual taxonomy (from URL query param)       | `'cat_name'`                 |
| `nq`           | optional | User search query                                | `'automobile search query'`  |
| `name`         | optional | User search query (from URL query param)         | `'search_param'`             |
| `subId`        | optional | Channel - used to separate traffic sources       | `'123'`                      |

#### Configuration
The `category` and `categoryName` are mutually exclusive. If you pass both, `categoryName` takes precedence.
<br>
The `nq` and `name` are mutually exclusive. If you pass both, `name` takes precedence.

#### Example with only required field `pid`
    var adUnits = [{
        code: 'nano-div',
        sizes: [[300, 250], [300,600]],
        bids: [{
            bidder: 'nanointeractive',
            params: {
                pid: '5afaa0280ae8996eb578de53'
            }
        }]
    }];
    
#### Example with `category`
    var adUnits = [{
        code: 'nano-div',
        sizes: [[300, 250], [300,600]],
        bids: [{
            bidder: 'nanointeractive',
            params: {
                pid: '5afaa0280ae8996eb578de53',
                category: 'automotive',
                subId: '123'
            }
        }]
    }];
    
#### Example with `categoryName`
    var adUnits = [{
        code: 'nano-div',
        sizes: [[300, 250], [300,600]],
        bids: [{
            bidder: 'nanointeractive',
            params: {
                pid: '5afaa0280ae8996eb578de53',
                // Category "automotive" is in the URL like:
                // https://www....?cat_name=automotive&...
                categoryName: 'cat_name',
                subId: '123'
            }
        }]
    }];
    
#### Example with `nq`
    var adUnits = [{
        code: 'nano-div',
        sizes: [[300, 250], [300,600]],
        bids: [{
            bidder: 'nanointeractive',
            params: {
                pid: '5afaa0280ae8996eb578de53',
                // User searched "automobile search query" (extracted from search text field) 
                nq: 'automobile search query',
                subId: '123'
            }
        }]
    }];
    
#### Example with `name`
    var adUnits = [{
        code: 'nano-div',
        sizes: [[300, 250], [300,600]],
        bids: [{
            bidder: 'nanointeractive',
            params: {
                pid: '5afaa0280ae8996eb578de53',
                // User searched "automobile search query" and it is in the URL like:
                // https://www....?search_param=automobile%20search%20query&... 
                name: 'search_param',
                subId: '123'
            }
        }]
    }];
    
#### Example with `category` and `nq`
    var adUnits = [{
        code: 'nano-div',
        sizes: [[300, 250], [300,600]],
        bids: [{
            bidder: 'nanointeractive',
            params: {
                pid: '5afaa0280ae8996eb578de53',
                category: 'automotive',
                nq: 'automobile search query',
                subId: '123'
            }
        }]
    }];

#### Example with `categoryName` and `name`
    var adUnits = [{
        code: 'nano-div',
        sizes: [[300, 250], [300,600]],
        bids: [{
            bidder: 'nanointeractive',
            params: {
                pid: '5afaa0280ae8996eb578de53',
                categoryName: 'cat_name',
                name: 'search_param',
                subId: '123'
            }
        }]
    }];