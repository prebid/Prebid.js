---
layout: page
title: Module - GDPR ConsentManagement
description: Add on module to consume and distribute consent information to bidder adapters
top_nav_section: dev_docs
nav_section: modules
module_code : consentManagement
display_name : GDPR ConsentManagement
enable_download : true
---

<div class="bs-docs-section" markdown="1">

# GDPR ConsentManagement Module
{: .no_toc }

* TOC
{: toc }

## Summary & Purpose

Designed to support the EU General Data Protection Regulation ([GDPR](https://www.eugdpr.org/)), this module works with supported Consent Management Platforms (CMPs) to fetch an encoded string representing the user's consent choices and make it available for adapters to consume and process.

This module will perform its tasks with the CMP prior to the auction starting.  A rough synopsis of this interaction process would be:

1. Fetch the user's consent data from the CMP (see note below regarding a workflow variance for new users).
2. With a valid set of consent information, we will incorporate this data into the auction objects (for adapters to collect) and then allow the auction to proceed.

Note - In the the case of a new user, the CMP will respond only once there is consent information available; ie the user picked their consent choices.  Given this can take some time for the average user, coupled into the module is a timeout setting.
For those unfamiliar with this timeout setting in place, the CMP will be permitted a specified amount of time to operate before it's deemed unacceptable or it's assumed an issue has occurred.

When either this timeout occurs or if an error from the CMP is thrown, one of two options are taken; either:

1. The auction is canceled outright.
2. The auction proceeds without the user's consent information.  

Though these options are mutually exclusive, they are configurable by the publisher via the site's implementation of the prebid code (see further below for details) so that they can be used in the proper scenarios for that site/audience.


## Page integration

To utilize this module, a separate CMP needs to be implemented onto the site to interact with the user and obtain their consent choices.  

The actual implementation details of this CMP are not covered by this page; any questions on that implemenation should be referred to the CMP in question.  However, we would recommend to have the CMP's code located before the prebid code in the head of the page, in order to ensure their framework is implemented before the prebid code starts to execute.

The module currently supports any CMP that conforms to the IAB standard for the 1.1 CMP spec ([more info here](https://github.com/InteractiveAdvertisingBureau/GDPR-Transparency-and-Consent-Framework)).

Once the CMP is implemented, simply include the module in your build and add a `consentManagement` object in the `setConfig()` call.  Adapters that support this feature will be able to retrieve the consent information and incorporate it in their requests.

{: .table .table-bordered .table-striped }
| Param | Type | Description | Example |
| --- | --- | --- | --- |
| cmpApi | `string` | The ID for the CMP in use on the page.  Default is `'iab'` | `'iab'` |
| timeout | `integer` | Length of time (in milliseconds) to allow the CMP to perform its tasks before aborting the process. Default is `10000` | `10000` |
| allowAuctionWithoutConsent | `boolean` | A setting to determine what will happen when obtaining consent information from the CMP fails; either allow the auction to proceed (**true**) or cancel the auction (**false**). Default is `true` | `true` or `false` |

Example: IAB CMP using the custom timeout and cancel auction options.

{% highlight js %}
     var pbjs = pbjs || {};
     pbjs.que = pbjs.que || [];
     pbjs.que.push(function() {
        pbjs.setConfig({
          consentManagement: {
            cmpApi: 'iab',
            timeout: 8000,
            allowAuctionWithoutConsent: false
          }
        });
        pbjs.addAdUnits(adUnits);
     });
{% endhighlight %}

## Build the package
 
#### Step 1: Bundle the module code

Follow the basic build instructions on the Github repo's main README. To include the module, an additional option must be added to the the gulp build command:
 
{% highlight bash %}
gulp build --modules=consentManagement,bidAdapter1,bidAdapter2
{% endhighlight %}
 
#### Step 2: Publish the package(s) to the CDN

After testing, get your javascript file(s) out to your Content Delivery Network (CDN) as normal.

Note that there are more dynamic ways of combining these components for publishers or integrators ready to build a more advanced infrastructure.

## Adapter Integration

_Note - for any adapters submitting changes to make themselves compliant, please also submit a PR to the [docs repo](https://github.com/prebid/prebid.github.io) to add a `gdpr_supported: true` variable to your respective page in the [bidders directory](https://github.com/prebid/prebid.github.io/tree/master/dev-docs/bidders).  This will have your adapter's name automatically appear on the list of GDPR compliant adapters (at the bottom of this page)._

### BuildRequests Integration

To find the GDPR consent information to pass along to your system, adapters should look for the `bidderRequest.gdprConsent` field in their buildRequests() method. 
Below is a sample of how the data is structured in the `bidderRequest` object:

{% highlight js %}
{
  "bidderCode": "appnexus",
  "auctionId": "e3a336ad-2761-4a1c-b421-ecc7c5294a34",
  "bidderRequestId": "14c4ede8c693f",
  "bids": [
    {
      "bidder": "appnexus",
      "params": {
        "placementId": "13144370"
      },
      "adUnitCode": "ad-unit-code",
      "transactionId": "0e8c6732-0999-4ca8-b44f-8fe514f53cc3",
      "sizes": [[300, 250], [300, 600]],
      "bidId": "2e6fe30b22b4fc",
      "bidderRequestId": "14c4ede8c693f",
      "auctionId": "e3a336ad-2761-4a1c-b421-ecc7c5294a34"
    }
  ],
  "auctionStart": 1520001292880,
  "timeout": 3000,
  "gdprConsent": {
    "consentString": "BOJ/P2HOJ/P2HABABMAAAAAZ+A==",
    "vendorData": {...},
    "gdprApplies": true
  },
  "start": 1520001292884,
  "doneCbCallCount": 0
}
{% endhighlight %}

#### **Notes about the data fields**

**_consentString_**

This field contains the user's choices on consent, represented as an encoded string value.  In certain scenarios, this field may come to you with an `undefined` value; normally this happens when there was an error during the CMP interaction and the publisher had the config option `allowAuctionWithoutConsent` set to `true`.  If you wish to set your own value for this scenario rather than pass along `undefined` to your system, you can check for the `undefined` value in the field and replace it accordingly.  The code sample provided in the *consentRequried* section below provides a possible approach to perform this type of check/replacement.

**_vendorData_**

This field contains the raw vendor data in relation to the user's choices on consent.  This object will contain a map of all available vendors for any potential adapters that may wish to read the data directly.  One use-case for reading this data could be if an adapter wished to be omitted in a request if they knew if consent wasn't given for them.  Adapters will need to read through the object to find their appropriate information.

**_gdprApplies_**

This boolean represents if the user in question belonged to an area where GDPR applies.  This field comes from the CMP itself; it's comes included in the response when a request is made to the CMP API.  In the odd chance for some reason this value isn't defined by the CMP, each adapter has the opportunity to set their own value for this field.
There are two general approaches that can be taken by the adapter to populate this field:

- Set a hardcoded default value.
- Using their own system, derive if consent is required for the end-user and set the value accordingly.

Using the former option, below is an example of how the integration could look:

{% highlight js %}
...
buildRequests: function (bidRequests, bidderRequest) {
  ...
  if (bidderRequest && bidderRequest.gdprConsent) {
    adapterRequest.gdpr_consent = {
      consent_string: bidderRequest.gdprConsent.consentString,
      // will check if the gdprApplies field was populated with a boolean value (ie from page config).  If it's undefined, then default to true
      consent_required: (typeof bidderRequest.gdprConsent.gdprApplies === 'boolean') ? bidderRequest.gdprConsent.gdprApplies : true
    }
  }
  ...
}
...
{% endhighlight %}

The implementation of the latter option is up to the adapter, but the general premise should be the same.  You would check to see if the `bidderRequest.gdprConsent.gdprApplies` field is undefined and if so, set the derived value from your independent system.

If neither option are taken, then there is the remote chance this field's value will be undefined.  As long as that acceptable, this could be a potential third option.

### UserSync Integration

The `gdprConsent` object is also available when registering `userSync` pixels.  The object can be accessed by including it as an argument in the `getUserSyncs` function in the following manner:

{% highlight js %}
getUserSyncs: function(syncOptions, responses, gdprConsent) {
...
}
{% endhighlight %}

Depending on your needs, you could potentially either include the consent information in a query of your pixel and/or given the consent choices determine if you should drop the pixels at all.

{% assign bidder_pages = site.pages | where: "layout", "bidder" %}

<script>
$(function(){
  $('.adapters .col-md-4').hide();
  $('.gdpr_supported').show();
});
</script>

## List of GDPR compliant Adapters

Below is a list of Adapters that currently support GDPR:
<div class="adapters">
{% for page in bidder_pages %}
  <div class="col-md-4{% if page.gdpr_supported %} gdpr_supported{% endif %}">
  {{ page.title }}
  </div>
{% endfor %}
</div>

</div>
