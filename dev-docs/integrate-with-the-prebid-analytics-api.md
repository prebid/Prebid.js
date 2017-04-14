---
layout: page
title: Integrate with the Prebid Analytics API
description: Integrate with the Prebid Analytics API
pid: 28

top_nav_section: dev_docs
nav_section: adaptors
hide: false
---

<div class="bs-docs-section" markdown="1">

# Integrate with the Prebid Analytics API
{:.no_toc}

The Prebid Analytics API provides a way to get analytics data from `Prebid.js` and send it to the analytics provider of your choice, such as Google Analytics.  Because it's an open source API, you can write an adapter to send analytics data to any provider you like.  Integrating with the Prebid Analytics API has the following benefits:

+ It decouples your analytics from the `Prebid.js` library so you can choose the analytics provider you like, based on your needs.

+ You can selectively build the `Prebid.js` library to include only the analytics adaptors for the provider(s) you want.  This keeps the library small and minimizes page load time.

+ Since this API separates your analytics provider's code from `Prebid.js`, the upgrade and maintenance of the two systems are separate.  If you want to upgrade your analytics library, there is no need to upgrade or test the core of `Prebid.js`.

## Architecture of the Analytics API

Before we jump into looking at code, let's look at the high-level architecture.  As shown in the diagram below, `Prebid.js` calls into an _adapter_.  The adapter is the only part of the code that must be stored in the `Prebid.js` repo.

The adapter in turn calls out to an analytics _library_.  The library is responsible for integrating with your analytics provider's backend.  The library may or may not be stored in the `Prebid.js` repo.

For instructions on integrating an analytics provider, see the next section.

{: .pb-img.pb-md-img :}
![Prebid Analytics Architecture Diagram]({{ site.github.url }}/assets/images/prebid-analytics-architecture.png)

## Integrate an Analytics Provider

You can integrate an analytics provider using the steps outlined below.  In the example we'll use Google Analytics for simplicity, but you can integrate any analytics provider you like as long as you have an adapter and a library.

If you want to see how to write your own adapters and libraries, there are analytics adapters in the repo under `src/adapters/analytics`, and libraries under `src/adapters/analytics/libraries`.

+ <a href="#on-your-site">On your Site</a>
+ <a href="#in-the-prebidjs-repo">In the <code>Prebid.js</code> repo</a>

<a name="on-your-site"></a>

### On your Site

+ Add the analytics library to your site as described in the provider's documentation.  For example, you can load the Google Analytics library like so (see [their docs](https://developers.google.com/analytics/devguides/collection/analyticsjs/) for up-to-date instructions):

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

    ga('create', 'XXXXXX', 'auto');
{% endhighlight %}

+ Add a call to `pbjs.enableAnalytics(analyticsAdapters)` to your page's Prebid integration.  It should be called once on the page, after all analytics libraries have been loaded:

{% highlight js %}
pbjs.que.push(function () {
    pbjs.enableAnalytics([{
        provider: 'ga',
        options: {
            enableDistribution: false
        }
    },{
        provider: 'other',
        options: {
            foo: 1234
        }
    }]);
});
{% endhighlight %}

<a name="in-the-prebidjs-repo"></a>

### In the `Prebid.js` repo

+ Create an analytics adapter to listen for Prebid events and call the analytics library (See `src/adapters/analytics/ga.js` in the repo for the Google Analytics adapter, or `src/adapters/analytics/example.js` for a generic adapter).

+ Add the analytics adapter's file name to the `"analytics"` array in `package.json` and build `Prebid.js`.  The build will contain only the analytics adapters you specified.

</div>
