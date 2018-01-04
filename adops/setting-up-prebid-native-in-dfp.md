---
layout: page
title: Setting up Prebid Native in DFP (Alpha)
head_title: Setting up Prebid Native in DFP
description: Setting up Prebid Native in DFP
pid: 3
hide: false
top_nav_section: adops
nav_section: tutorials
---

<div class="bs-docs-section" markdown="1">

# Setting up Prebid Native in DFP (Alpha)
{: .no_toc}

This page describes how to set up native creatives in DFP for use with Prebid.js.

For more information about DFP native ad setup, see the [DFP native ads documentation](https://support.google.com/dfp_premium/answer/6366845?hl=en).

* TOC
{:toc}

## 1. Add a native ad unit

You can specify a size for the ad unit, or specify the "fluid" size.  In this case we'll go with **Fluid**.

{: .pb-img.pb-md-img :}
![prebid native adunit]({{site.github.url}}/assets/images/ad-ops/dfp-native/prebid_native_adunit.png)

## 2. Create a custom native ad format

For Prebid, create a [custom native ad format](https://support.google.com/dfp_sb/answer/6366911?hl=en).

Make sure to remove all variables except **Click-through URL**.

{: .pb-img.pb-md-img :}
![prebid native format]({{site.github.url}}/assets/images/ad-ops/dfp-native/prebid-native-format.png)

## 3. Create new native style

In this example, we're targeting `"prebid_native_adunit"`, so the *Size* is set to **Fluid**.

Add the HTML and CSS that define your native ad template. Note that `%%PATTERN%%` macros can be included in either field, and the HTML can contain JavaScript.  For more information, see the [DFP native styles docs](https://support.google.com/dfp_premium/answer/6366914).

{: .alert.alert-danger :}
**Native impression tracking requirements**  
You must include the `postMessage` code snippet as shown in the screenshot and example code below so impression trackers will fire.

{: .pb-img.pb-lg-img :}
![Native ad content]({{site.github.url}}/assets/images/ad-ops/dfp-native/native-content-ad.png)

Example HTML and CSS:

{% highlight html %}

<div class="sponsored-post">
  <div class="thumbnail"></div>
  <div class="content">
    <h1><a href="%%CLICK_URL_UNESC%%%%PATTERN:hb_native_linkurl%%" target="_blank">%%PATTERN:hb_native_title%%</a></h1>
    <p>%%PATTERN:hb_native_body%%</p>
    <div class="attribution">%%PATTERN:hb_native_brand%%</div>
  </div>
</div>

<script>
window.parent.postMessage(JSON.stringify({
  message: 'Prebid Native',
  adId: '%%PATTERN:hb_adid%%'
}), '*');
</script>

{% endhighlight %}

{% highlight css %}

.sponsored-post {
    background-color: #fffdeb;
    font-family: sans-serif;
    padding: 10px 20px 10px 20px;
}

.content {
    overflow: hidden;
}

.thumbnail {
    width: 120px;
    height: 100px;
    float: left;
    margin: 0 20px 10px 0;
    background-image: url(%%PATTERN:hb_native_image%%);
    background-size: cover;
}

h1 {
    font-size: 18px;
    margin: 0;
}

a {
    color: #0086b3;
    text-decoration: none;
}

p {
    font-size: 16px;
    color: #444;
    margin: 10px 0 10px 0;
}

.attribution {
    color: #fff;
    font-size: 9px;
    font-weight: bold;
    display: inline-block;
    letter-spacing: 2px;
    background-color: #ffd724;
    border-radius: 2px;
    padding: 4px;
}

{% endhighlight %}

## 4. Create new native order and line items

1. Add the native format created in **Step 1** under **Inventory Sizes** (in this case, "Prebid Native Format")
2. Be sure to set inventory targeting and key-value targeting on `hb_pb` corresponding to the line item's CPM.

{: .pb-img.pb-md-img :}
![create a native order and line item]({{site.github.url}}/assets/images/ad-ops/dfp-native/new-order-and-line-item.png)

{: .pb-img.pb-md-img :}
![add targeting]({{site.github.url}}/assets/images/ad-ops/dfp-native/add-targeting.png)

## 5. Create a new native creative

1. Be sure to select the format you created in **Step 1** (in this case, "Prebid Native Format")
2. Under **Click-through URL**, add any value.  This will be overwritten by Prebid.

{: .pb-img.pb-md-img :}
![create a new native creative]({{site.github.url}}/assets/images/ad-ops/dfp-native/new-creative.png)

{: .pb-img.pb-md-img :}
![creative click-through URL]({{site.github.url}}/assets/images/ad-ops/dfp-native/creative-click-through-url.png)

## Related Topics

+ [Show Native Ads with Prebid.js]({{site.github.url}}/dev-docs/show-native-ads.html) (Engineering setup instructions)
+ [Step by Step Guide to DFP Setup]({{site.github.url}}/adops/step-by-step.html) (Send top bid to ad server)
+ [Send all bids to the ad server]({{site.github.url}}/adops/send-all-bids-adops.html)

</div>
