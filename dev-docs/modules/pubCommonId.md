---
layout: page
title: Module - Publisher Common ID
description: User ID persisted in first party domain
top_nav_section: dev_docs
nav_section: modules
module_code : pubCommonId
display_name : Publisher Common ID
enable_download : true
---

<div class="bs-docs-section" markdown="1">

# Publisher Common ID Module
{:.no_toc}

This module stores an unique user id in the first party domain and makes it accessible to all adapters. Similar to IDFA and AAID, this is a simple UUID that can be utilized to improve user matching, especially for iOS and MacOS browsers, and is compatible with ITP (Intelligent Tracking Prevention). It's lightweight and self contained.  Adapters that support Publisher Common ID will be able to pick up the user ID and return it for additional server-side cross device tracking.

## Page integration

Simply include the module in your build and it's automatically enabled.  Adapters that support this feature will be able to retrieve the ID and incorporate it in their requests.

### Optional configuration

Add a pubcid object in the setConfig() call.

{: .table .table-bordered .table-striped }
| Param | Type | Description | Example |
| --- | --- | --- | --- |
| enable | `boolean` | Enable or disable the module. Setting it to false will disable the module without having to remove it from the bundle.  Default is true. | true |
| expInterval | `decimal` | Expiration interval of the cookie in minutes.  Default is 2628000, or 5 years.  | 525600 |

Example: Changing ID expiration to 1 year

{% highlight js %}
     var pbjs = pbjs || {};
     pbjs.que = pbjs.que || [];
     pbjs.que.push(function() {
        pbjs.setConfig({pubcid: {expInterval: 525600}});
        pbjs.addAdUnits(adUnits);
     });
{% endhighlight %}

### Build the package
 
#### Step 1: Bundle the module code

Follow the basic build instructions on the Github repo's main README. To include the module, an additional option must be added to the the gulp build command:
 
{% highlight bash %}
gulp build --modules=pubCommonId,bidAdapter1,bidAdapter2
{% endhighlight %}
 
#### Step 2: Publish the package(s) to the CDN

After testing, get your javascript file(s) out to your Content Delivery Network (CDN) as normal.

Note that there are more dynamic ways of combining these components for publishers or integrators ready to build a more advanced infrastructure.

## Adapter integration

Adapters should look for `bid.crumbs.pubcid` in buildRequests() method. 

{% highlight js %}
[
   {
      "bidder":"appnexus",
      "params":{
         "placement":"12345"
      },
      "crumbs":{
         "pubcid":"c4a4c843-2368-4b5e-b3b1-6ee4702b9ad6"
      },
      "adUnitCode":"ad-unit-code",
      "transactionId":"b7d0a99d-ceb0-419e-bbd7-6767ab038d9d",
      "sizes":[[300, 250], [300,600]],
      "bidId":"222187f1ef97e6",
      "bidderRequestId":"12088b9bd86f26",
      "auctionId":"a1a98ab2-97c9-4f42-970e-6e03040559f2"
   }
]
{% endhighlight %}


## Technical Details

- The ID is UUID v4 and stored as a cookie called `_pubcid` in the page's domain.
- This module hooks into the pbjs.requestBids() method.  When invoked, it retrieves the cookie, updates the expiration time, and decorates the adUnits objects.  A new cookie will be created if one doesn't exist already.
- Beware that if prebid.js is included in an ad server frame, then the ID would have ad server domain instead.

</div>
