---
layout: bidder
title: Nano Interactive
description: Prebid Nano Interactive Bidder Adapter
top_nav_section: dev_docs
nav_section: reference
hide: true
biddercode: nanointeractive
biddercode_longer_than_12: true
prebid_1_0_supported : true
media_types: banner
gdpr_supported: true
---

<br>
### Requirements:
To be able to get identification key (`pid`), you must register at <br> 
`https://audiencemanager.de/public/data-partners-register` <br>
and follow further instructions.
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

### bid params: basic call

{: .table .table-bordered .table-striped }
| Name           | Scope    | Description                         | Example |
| :------------- | :------- | :---------------------------------- | :------ |
| `pid`        | required | Identification key | `'58bfec94eb0a1916fa380163'` |

#### Example
    var adUnits = [{
        code: 'basic-div',
        sizes: [[300, 250], [300,600]],
        bids: [{
            bidder: 'nanointeractive',
            params: {
                pid: '58bfec94eb0a1916fa380163'
            }
        }]
    }];

### bid params: hardcoded user search

{: .table .table-bordered .table-striped }
| Name           | Scope    | Description                         | Example |
| :------------- | :------- | :---------------------------------- | :------ |
| `pid`        | required | Identification key | `'58bfec94eb0a1916fa380163'` |
| `nq`   | optional | User search query | `some search query` |

#### Example
    var adUnits = [{
        code: 'nq-div',
        sizes: [[300, 250], [300,600]],
        bids: [{
            bidder: 'nanointeractive',
            params: {
                pid: '58bfec94eb0a1916fa380163',
                // User searched "some search query" (extracted from search text field) 
                nq: 'some search query'
            }
        }]
    }];
    
### bid params: URL user search

{: .table .table-bordered .table-striped }
| Name           | Scope    | Description                         | Example |
| :------------- | :------- | :---------------------------------- | :------ |
| `pid`        | required | Identification key | `'58bfec94eb0a1916fa380163'` |
| `name`   | optional | Search query param name of the current URL | `search_param` |

#### Example
    var adUnits = [{
        code: 'url-div',
        sizes: [[300, 250], [300,600]],
        bids: [{
            bidder: 'nanointeractive',
            params: {
                pid: '58bfec94eb0a1916fa380163',
                // User searched "some search query" and it is in the URL like:
                // https://www....?search_param=some%20search%20query&...
                name: 'search_param'
            }
        }]
    }];
