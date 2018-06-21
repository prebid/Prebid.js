---
layout: page
title: Integrate with the Prebid Analytics API
description: Integrate with the Prebid Analytics API
pid: 28
top_nav_section: dev_docs
nav_section: adapters
hide: false
---

<div class="bs-docs-section" markdown="1">

# Integrate with the Prebid Analytics API
{:.no_toc}

{: .alert.alert-warning :}
This page has been updated for Prebid 1.0. It adds the requirement for a markdown file containing the maintainer's contact info. Note also that there are a couple of new bidResponse attributes that may be of interest to analytics providers: bid currency and bid gross-vs-net.

The Prebid Analytics API provides a way to get analytics data from `Prebid.js` and send it to the analytics provider of your choice, such as Google Analytics.  Because it's an open source API, you can write an adapter to send analytics data to any provider you like.  Integrating with the Prebid Analytics API has the following benefits:

+ It decouples your analytics from the `Prebid.js` library so you can choose the analytics provider you like, based on your needs.

+ You can selectively build the `Prebid.js` library to include only the analytics adapters for the provider(s) you want.  This keeps the library small and minimizes page load time.

+ Since this API separates your analytics provider's code from `Prebid.js`, the upgrade and maintenance of the two systems are separate.  If you want to upgrade your analytics library, there is no need to upgrade or test the core of `Prebid.js`.

* TOC
{:toc }

## Architecture of the Analytics API

Before we jump into looking at code, let's look at the high-level architecture.  As shown in the diagram below, `Prebid.js` calls into an _analytics adapter_.  The analytics adapter is the only part of the code that must be stored in the `Prebid.js` repo.

The analytics adapter listens to events and may call out directly to the analytics backend, or it may call out to an analytics _library_ that integrates with the analytics server.

For instructions on integrating an analytics provider, see the next section.

{: .pb-img.pb-md-img :}
![Prebid Analytics Architecture Diagram]({{ site.baseurl }}/assets/images/prebid-analytics-architecture.png)

## Integrate an Analytics Provider

You can integrate an analytics provider using the steps outlined below.  In the example we'll use Google Analytics for simplicity, but you can integrate any analytics provider you like as long as you have an adapter and any necessary libraries.

If you want to see how to write your own analytics adapters, look in the repo under [modules](https://github.com/prebid/Prebid.js/tree/master/modules).

Summary of the steps involved:

+ <a href="#on-the-site">Plan the site integration</a>
+ <a href="#in-the-prebidjs-repo">Create the <code>Prebid.js</code> analytics module</a>
+ <a href="#build-the-package">Build the package</a>

<a name="on-the-site"></a>

### Plan the site integration

Some analytics adapters may require the publisher to load a library in the page. If this is the case for your analytics adapter, consider providing an example for users.

For example, to use Google Analytics, publishers must load the Google Analytics library:

{% highlight js %}
    (function (i, s, o, g, r, a, m) {
        i['GoogleAnalyticsObject'] = r;
        i[r] = i[r] || function () {
                    (i[r].q = i[r].q || []).push(arguments)
                }, i[r].l = 1 * new Date();
        a = s.createElement(o),
                m = s.getElementsByTagName(o)[0];
        a.async = 1;
        a.src = g;
        m.parentNode.insertBefore(a, m)
    })(window, document, 'script', '//www.google-analytics.com/analytics.js', 'ga');

    ga('create', 'GOOGLE-ANALYTICS-ID', 'auto');
{% endhighlight %}
(See [the Google docs](https://developers.google.com/analytics/devguides/collection/analyticsjs/) for up-to-date instructions.)

A call to `pbjs.enableAnalytics(analyticsAdapters)` is needed to initialize the module(s). It should be called once on the page, after any analytics libraries have been loaded. Note that more than one analytics adapter can be loaded, though this isn't necessarily recommended.

{% highlight js %}
pbjs.que.push(function () {
    pbjs.enableAnalytics([{
        provider: 'ga',
        options: {
            enableDistribution: false
        }
    },{
        provider: 'abc',
	options: {
                account: 'ABC-ACCOUNT-ID',
                endpoint: 'https://...'
                }
        });
    }]);
});
{% endhighlight %}

<a name="in-the-prebidjs-repo"></a>

### Create the `Prebid.js` analytics module

#### Step 1: Add a markdown file describing the module

1. Create a markdown file under `modules` with the name of the bidder suffixed with 'AnalyticsAdapter', e.g., `exAnalyticsAdapter.md`

Example markdown file:
{% highlight text %}
# Overview

Module Name: Ex Analytics Adapter
Module Type: Analytics Adapter
Maintainer: prebid@example.com

# Description

Analytics adapter for Example.com. Contact prebid@example.com for information.

{% endhighlight %}

#### Step 2: Add analytics source code

{: .alert.alert-danger :}
**Breaking changes for Prebid 1.0**  
There are two breaking changes to the data emitted from analytic events for Prebid 1.0:  
1. Events that previously emitted a `requestId` property now emit that data as the `auctionId` property  
2. The `BID_TIMEOUT` event that previously emitted an array of bidder code strings now emits an array of objects containing `bidId`, `bidder`, `adUnitCode`, and `auctionId` for timed out bids  


1. Create a JS file under `modules` with the name of the bidder suffixed with 'AnalyticsAdapter', e.g., `exAnalyticsAdapter.js`

2. Create an analytics adapter to listen for Prebid events and call the analytics library or server. See the existing *AnalyticsAdapter.js files in the repo under [modules](https://github.com/prebid/Prebid.js/tree/master/modules).

3. There are several types of analytics adapters. The example here focuses on the 'endpoint' type. See [AnalyticsAdapter.js](https://github.com/prebid/Prebid.js/blob/master/src/AnalyticsAdapter.js) for more info on the 'library' and 'bundle' types.

    * endpoint - Calls the specified URL on analytics events. Doesn't require a global context.
    * library - The URL is considered to be a library to load. Expects a global context.
    * bundle - An advanced option expecting a global context.

4. In order to get access to the configuration passed in from the page, the analytics
adapter needs to specify an enableAnalytics() function, but it should also call
the base class function to set up the events.

A basic prototype analytics adapter:

{% highlight js %}
import {ajax} from 'src/ajax';
import adapter from 'src/AnalyticsAdapter';
import CONSTANTS from 'src/constants.json';
import adaptermanager from 'src/adaptermanager';

const analyticsType = 'endpoint';
const url = 'URL_TO_SERVER_ENDPOINT';

let exAnalytics = Object.assign(adapter({url, analyticsType}), {
  // ... code ...
});

// save the base class function
exAnalytics.originEnableAnalytics = exAdapter.enableAnalytics;

// override enableAnalytics so we can get access to the config passed in from the page
exAnalytics.enableAnalytics = function (config) {
  initOptions = config.options;
  exAnalytics.originEnableAnalytics(config);  // call the base class function
};

adaptermanager.registerAnalyticsAdapter({
  adapter: exAnalytics,
  code: 'exAnalytic'
});
{% endhighlight %}

Analytics adapter best practices:

+ listen only to the events required
+ batch up calls to the backend for post-auction logging rather than calling immediately after each event.

### Build the package

To add the new analyticsAdapter into a prebid package, use a command like this:

{% highlight js %}
gulp bundle --modules=exAnalyticsAdapter,xyzBidAdapter
{% endhighlight %}

## Further Reading

- [Analytics for Prebid]({{site.baseurl}}/overview/analytics.html) (Overview and list of analytics providers)
- [Integrate with the Prebid Analytics API]({{site.baseurl}}/dev-docs/integrate-with-the-prebid-analytics-api.html) (For developers)

</div>
