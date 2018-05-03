---
layout: page
title: Analytics for Prebid
description: Prebid.js Analytics Overview
pid: 10
top_nav_section: overview
nav_section: analytics
---

<div class="bs-docs-section" markdown="1">

# Analytics for Prebid

There are several analytics adapter plugins available to track header bidding performance for your site.

{: .table .table-bordered .table-striped }
| Analytics Adapter                                                | Cost                                                                                | Contact                                                          | Version Added |
| -------------                                                    | -------------                                                                       | -----------                                                      |  ------------ |
| [Google Analytics](http://prebid.org/overview/ga-analytics.html) | Free up to a certain volume. See [terms](https://www.google.com/analytics/terms/).  | [Website](https://www.google.com/analytics)                      |               |
| AppNexus                                                         | Contact vendor                                                                      | [Website](https://www.appnexus.com/en/publishers/header-bidding) |               |
| PulsePoint                                                       | Contact vendor                                                                      | [Website](https://www.pulsepoint.com/header-bidding.html)        |               |
| ShareThrough                                                     | Contact vendor                                                                      |                                                                  |               |
| PrebidAnalytics by Roxot                                         | Paid, see [pricing](http://prebidanalytics.com/#pricing). | [Website](http://prebidanalytics.com/overview-examples)          |          0.22 |
| PubWise                                                          | Free & Paid, see [pricing](https://pubwise.io/pricing/)                                    | [Website](https://pubwise.io/pubwise/)                                   |          0.24 |
| Assertive Yield (contact for adapter) | Free to try (Large accounts $0.002 CPM or sampled < 10mm/m imp.) | [Website](https://yield.assertcom.de) | |
| Vuble                                                            | Contact vendor                                                                      | [Website](https://vuble.tv/us/prebid/)                           |               |
| YuktaMedia Analytics                                                      | Contact vendor                                                                      | [website](https://yuktamedia.com/publishers/prebid/)                                        | 1.0.0 |

None of these analytics options are endorsed or supported by Prebid.org.

## How it works

Each analytics provider has specific instructions for using their system, but these are the general steps:

* Create an account with the analytics vendor and obtain the necessary IDs
* Build Prebid.js package with the vendor's analytics adapter
* Load analytics JavaScript from vendor directly on the page
* Call the `pbjs.enableAnalytics()` function
* Use the vendor's UI for reporting

This is an example call to `pbjs.enableAnalytics()`:

{% highlight js %}

pbjs.que.push(function() {
    pbjs.enableAnalytics({
        provider: 'NAME',
        options: {
            [...]
        }
    });
});

{% endhighlight %}

## Further Reading

- [Integrate with the Prebid Analytics API]({{site.baseurl}}/dev-docs/integrate-with-the-prebid-analytics-api.html) (For developers)

</div>
