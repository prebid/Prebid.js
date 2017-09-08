---
layout: bidder
title: AppNexus
description: Prebid AppNexus Bidder Adaptor
top_nav_section: dev_docs
nav_section: reference
biddercode: appnexus
biddercode_longer_than_12: false
hide: true
---

### bid params

{: .table .table-bordered .table-striped }
| Name           | Scope    | Description                                                                                                                                                                                        | Example           |
|----------------+----------+----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+-------------------|
| `placementId`  | required | The placement ID from AppNexus.  You may identify a placement using the `invCode` and `member` instead of a placement ID.                                                                          | `"234234"`        |
| "arbitraryKey" | optional | This key can be *any publisher-defined string*. The value (also a string) maps to a querystring segment for enhanced buy-side targeting. Multiple key-value pairs can be added. See example below. | `'genre': 'rock'` |
| `invCode`      | optional | The inventory code from AppNexus. Must be used with `member`.                                                                                                                                      | `"abc123"`        |
| `member`       | optional | The member ID  from AppNexus. Must be used with `invCode`.                                                                                                                                         | `"12345"`         |
| `reserve`      | optional | Sets a floor price for the bid that is returned.                                                                                                                                                   | `0.90`            |

{: .alert.alert-info :}
**Support for Publisher-Defined Keys**  
To pass in a publisher-defined key whose value maps to a querystring segment for buy-side targeting, set up your `params` object as shown below.  For more information, see the [query string targeting documentation](https://wiki.appnexus.com/x/7oCzAQ) (login required).

{% highlight js %}
var adUnits = [{
    code: 'div-gpt-ad-1460505748511-01',
    sizes: [
        [300, 250],
        [300, 50]
    ],
    bids: [{
        bidder: 'appnexus',
        params: {
            placementId: '123456789',
            'playlist': '12345', // <----| Publisher-defined key-values
            'genre': 'rock'      // <----| (key and value must be strings)
        }
    }]
}]
{% endhighlight %}

(Sizes set in `adUnit` object will also apply to the AppNexus bid requests.)
