---
layout: example
title: Serve Responsive Ads with Size Mapping
description: Serve Responsive Ads with Size Mapping

top_nav_section: dev_docs
nav_section: quick-start

hide: true

about:
- Example showing how to configure ad units to resize dynamically based on screen size

jsfiddle_link: jsfiddle.net/prebid/58udrja1/31/embedded/html,result

code_height: 3000
code_lines: 118

pid: 102
---

<div markdown="1">

#### Line 8: Add size mapping to the ad unit

You can use the ad unit's new `sizeMapping` property to declaratively specify the ad sizes that should be shown when the device screen is greater than or equal to a given size.

For example, as shown in the first ad unit, if `minWidth` is set to `1024`, then Prebid.js will attempt to show a 300x250 ad (the first size in the array).  If no ad that size is available, it will try to show a 300x600 ad.  Otherwise, it will use the largest ad size in `sizes`.

{% include sizemapping-and-screen-widths.md %}

</div>
