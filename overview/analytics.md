---
layout: page
title: Analytics Overview
description: Prebid.js Analytics Overview

pid: 10

top_nav_section: overview
nav_section: analytics

---
<div class="bs-docs-section" markdown="1">
# Analytics for Prebid

There are several analytics adapter plugins available to track header bidding performance for your site.

| Analytics Adapter | Cost | Contact | Version Added |
| ------------- | ------------- | ----------- | ------------|
| [Google Analytics](http://prebid.org/overview/ga-analytics.html) | Free up to a certain volume. See [terms](https://www.google.com/analytics/terms/). | [Website](https://www.google.com/analytics) | |
| AppNexus | Contact vendor | [Website](https://www.appnexus.com/en/publishers/header-bidding) | |
| PulsePoint | Contact vendor | [Website](https://www.pulsepoint.com/header-bidding.html) | |
| ShareThrough |Contact vendor | | |
| PrebidAnalytics by Roxot | Free, see [terms](http://panel.prebidanalytics.com/account/pages/terms-of-service). | [Website](http://prebidanalytics.com/overview-examples) | 0.22 |
| PubWise | Free, see [terms](http://admin.pubwise.io/terms) | [Website](https://pubwise.io/) | 0.24 |

None of these analytics options are endorsed or supported by Prebid.org.

## How it works

Each analytics provider has specific instructions for using their system, but these are the general steps:

* Create an account with the analytics vendor and obtain the necessary IDs
* Build Prebid.js package with the vendor's analytics adapter
* Load analytics javascript from vendor directly on the page
* Call the pbjs.enableAnalytics() function
* Use the vendor's UI for reporting

This is an example call to pbjs.enableAnalytics():

```
pbjs.que.push(function() {
    pbjs.enableAnalytics({
        provider: 'NAME',
        options: {
            [...]
        }
    });
});
```
## More Details
* [Creating a new analytics adapter](/dev-docs/integrate-with-the-prebid-analytics-api.html)
</div>
