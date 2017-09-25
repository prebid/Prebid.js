---
layout: page
title: Prebid 1.0 Publisher API Changes
description: Description of the changes to the publisher facing API for Prebid 1.0
top_nav_section: dev_docs
nav_section: reference
hide: false
---

<div class="bs-docs-section" markdown="1">

# Prebid 1.0 Publisher API Changes
{:.no_toc}

This document describes the changes to the Publisher API for version 1.0.

* TOC
{:toc}

## New API - `pbjs.setConfig`

For 1.0, we're **deprecating** the following APIs in favor of a generic "options" param object passed to the [`pbjs.setConfig`]({{site.baseurl}}/dev-docs/publisher-api-reference.html#module_pbjs.setConfig) method:

- `pbjs.bidderTimeout`
- `pbjs.logging` (* [1](#options-footnotes))
- `pbjs.publisherDomain`
- `pbjs.cookieSyncDelay`
- `pbjs.setPriceGranularity`
- `pbjs.enableSendAllBids` (* [2](#options-footnotes))
- `pbjs.setBidderSequence`
- `pbjs.setS2SConfig`

Mapping will be straightforward with the name of the param being the same, except dropping the `set` prefix where appropriate.

<a name="options-footnotes" />

1. Renamed to `debug`
2. `pbjs.enableSendAllBids` will default to `true` in 1.0

### `pbjs.setConfig` example
{:.no_toc}

{: .alert.alert-warning :}
The input to `pbjs.setConfig` must be JSON (no JavaScript functions allowed).

{% highlight js %}

pbjs.setConfig({
    "currency": {
        "adServerCurrency": "JPY", /* Enables currency feature -- loads the rate file */
        "conversionRateFile": "url" // Allows the publisher to override the default rate file
    },
    "debug" : true, // Previously `logging`
    "s2sConfig" : {...},
    "priceGranularity": "medium",
    "enableSendAllBids": false, // Default will be `true` as of 1.0
    "bidderSequence": "random",
    "bidderTimeout" : 700,      // Default for all requests. 
    "publisherDomain" : "abc.com", // Used for SafeFrame creative. 
    "pageOptions" : {...},
    "sizeConfig" : {...}
});

{% endhighlight %}

## Size Mapping Changes 

The previous `sizeMapping` functionality will be deprecated in favor of a more powerful way to describe types of devices and screens that uses the `pbjs.setConfig` method.

**Rules if `sizeConfig` is present**

- Before `requestBids` sends bids requests to adapters, it will evaluate and pick the appropriate `label(s)` based on the `sizeConfig.mediaQuery` and device properties and then filter the `adUnit.bids` based on the `labels` defined (by dropping those adUnits that don't match the label definition).
 - The `sizeConfig.mediaQuery` property allows media queries in the form described [here](https://developer.mozilla.org/en-US/docs/Web/CSS/Media_Queries/Using_media_queries).  They are tested using the [`window.matchMedia`](https://developer.mozilla.org/en-US/docs/Web/API/Window/matchMedia) API.
- If a label doesn't exist on an adUnit, it is automatically included in all requests for bids
- If multiple rules match, the sizes will be filtered to the intersection of all matching rules' `sizeConfig.sizesSupported` arrays.  
- The `adUnit.sizes` selected will be filtered based on the `sizesSupported` of the matched `sizeConfig`. So the `adUnit.sizes` is a subset of the sizes defined from the resulting intersection of `sizesSupported` sizes and `adUnit.sizes`. 

### `sizeConfig` Example
{:.no_toc}

To set size configuration rules, you can use `pbjs.setConfig` as follows:

{% highlight js %}

pbjs.setConfig({
  sizeConfig: [{
    'mediaQuery': '(min-width: 1200px)',
    'sizesSupported': [
      [970, 90],
      [728, 90],
      [300, 250]
    ],
    'labels': ['desktop']
  }, {
    'mediaQuery': '(min-width: 768px) and (max-width: 1199px)',
    'sizesSupported': [
      [728, 90],
      [300, 250]
    ],
    'labels': ['tablet', 'phone']
  }, {
    'mediaQuery': '(min-width: 0px)',
    'sizesSupported': [
      [300, 250],
      [300, 100]
    ],
    'labels': ['phone']
  }]
});

{% endhighlight %}

### Labels
{:.no_toc}

Labels can now be specified as a property on either an `adUnit` or on `adUnit.bids[]`.  The presence of a label will disable the adUnit or bidder unless a sizeConfig rule has matched and enabled the label or the label has been enabled manually through `pbjs.setConfig({labels:[]})`.  Defining labels on the adUnit looks like the following:

{% highlight js %}

pbjs.addAdUnits([{
  "code": "ad-slot-1",
  "sizes": [ [ 970,90 ], [ 728,90 ], [ 300,250 ], [ 300,100 ] ],
  "labels": ["visitor-uk"] 
  "bids": [  // the full set of bids, not all of which are relevant on all devices
    {
      "bidder": "pulsepoint",
      "labels": [ "desktop", "tablet" ], // flags this bid as relevant only on these screen sizes
      "params": {
        "cf": "728X90",
        "cp": 123456,
        "ct": 123456
      }
    },
    {
      "bidder": "pulsepoint",
      "labels": [ "desktop", "phone" ],
      "params": {
        "cf": "300x250",
        "cp": 123456,
        "ct": 123456
      }
    },
    {
      "bidder": "sovrn",
      "labels": [ "desktop", "tablet" ],
      "params": {
        "tagid": "123456"
      }
    },
    {
      "bidder": "sovrn",
      "labels": [ "phone" ],
      "params": {
        "tagid": "111111"
      }
    }
  ]
}];

{% endhighlight %}

### Manual Label Configuration
{:.no_toc}

If an adUnit and/or adUnit.bids[] bidder has labels defined, they will be disabled by default.  Manually setting active labels using `pbjs.setConfig` will re-enable the selected adUnits and/or bidders.

You can manually turn on labels using the following:

{% highlight js %}

pbjs.setConfig({
  labels: ['visitor-uk']
});

{% endhighlight %}

## AdUnit Changes

The `mediaType` attribute is **deprecated** in favor of a `mediaTypes` object. This will accept multiple items (i.e. `video`, `banner`, `native` etc) with a optional key-value pair object nested inside.

### AdUnit Example
{:.no_toc}

{% highlight js %}

adUnit =
{
  "code" : "unique_code_for_placement"
  "sizes" : [[300,250]],
   "mediaTypes": {          // new field to replace mediaType. Default to banner if not specified. 
    video: { context: "outstream"},
    banner: {...options},
    nativeAd: {...options}
   },
  labels : ["desktop", "mobile"]
  bids : {...}  // same as existing definition with addition of `label` attribute
}

{% endhighlight %}

## Further Reading

[Publisher API Reference]({{site.baseurl}}/dev-docs/publisher-api-reference.html)
