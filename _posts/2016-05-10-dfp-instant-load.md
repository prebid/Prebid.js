---
layout: post
title: Load DFP Lightning Fast with Prebid

description: New way to load DFP lightning fast with Prebid for header bidding.

permalink: /blog/dfp-instant-load

---

Prebid is introducing a new way of loading GPT and sending GPT requests. Compared to the previous mechanism, the new method has the below advantages.

<br>

#### Benefits:

- **Further reduces latency**: the new method loads ads **40-80ms** faster than the old method on fast Internet connections, and more (go up to **150ms** faster) on slower Internet connections, such as those of mobile cellular. Reasons:

	- The new method requires no need to delay the loading of the GPT library. The GPT library can be loaded upfront.

	- Instantly send out ad server ad requests when bids are ready or timeout is hit. No need to wait until the GPT library finishes loading.

- **Easier implementation and maintenance**: The new method requires no change to your pages' original GPT implementation. It's a simple code snippet insertion now. This can be done by the ad ops teams within a tag management system.

**Example:**

GPT Instant Load (right) sends GPT ad requests about 100ms faster than the previous method (left):

![Prebid Instant Load Benefits]({{ site.github.url }}/assets/images/blog/instant-load/prebid-instant-load.png)

<br>

#### What is GPT Instant Load?

GPT Instant Load leverages the `googletag.pubads().disableInitialLoad()`call to disable GPT from sending out ad requests out immediately. This call informs GPT to wait until the first `googletag.pubads().refresh()` is executed. GPT Instant Load triggers the `refresh()` call when all requested bids are back, or when timeout is hit, whichever happens faster.

{% highlight js %}

googletag.pubads().disableInitialLoad();

pbjs.requestBids({
  bidsBackHandler: function() {
    pbjs.setTargetingForGPTAsync();
    googletag.pubads().refresh();
  }
});

{% endhighlight %}

<br>

#### How to implement it?

Please follow the line by line code example [documented here](/dev-docs/examples/basic-example.html).

<br>

#### Credits

Credits to [Bart Van Bragt](https://github.com/BartVB) in the [Github suggestion](https://github.com/prebid/Prebid.js/issues/276).
