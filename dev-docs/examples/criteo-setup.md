---
layout: example
title: Criteo Setup example
description: Setup for Criteo bidder

top_nav_section: dev_docs
nav_section: quick-start

hide: true

about:
- Bidder Setup for Criteo.
- Criteo bidder is called as part of the prebid.js setup.
- keyword are passed to the adserver using <strong>the standard RTA integration</strong>.
- one set of line item must be set in the adserver to manage criteo bidder separately. <strong>Follow Criteo's RTA guideline for the line item setup</strong>.

jsfiddle_link: jsfiddle.net/hqz36ew2/1/embedded/html,result
code_height: 2620
code_lines: 120

pid: 10
---


<br>
<br>
<br>

<div markdown="1">
#### Line 1 to 81: Set timeout and define ad units

Same setup as in [Basic Example](/dev-docs/examples/basic-example.html). Check the basic example page for more details.

</div>

<br><br><br><br><br><br>
<br><br><br><br><br><br>
<br><br><br><br><br><br>
<br><br><br><br><br><br>
<br><br><br><br><br><br>
<br><br><br><br><br><br>

<div markdown="1">
#### Line 46 to 51 and 60 to 65: Define the criteo bid

In this example, Criteo bidder is setup with:

- `nid` (provided by Criteo) to `1234`
- `cookiename` `crtg_rta` (default value)
- `crtg_varname` to `crtg_varname_1234` (will be used as variable name to define criteo interest in bidding on the impression).

Note: It isn't necessary to setup twice the criteo bid, it can be defined only once, for any of the adunits.
If defined multiple time, with the same nid, prebid.js will actually only call criteo once, for performance.

</div>




<br><br><br><br><br><br>
<br><br><br><br><br><br>
<br><br><br><br><br><br>
<br><br><br><br><br><br>


<div markdown="1">
#### Line 85: Set specific targeting for criteo bidder

Because Criteo doesn't send back a price, he can't take place in the client side prebid auction with the other bidders.
Instead, we always pass to the adserver criteo's interest to bid on the impression.
This is done by setting the targeting at the page level.

{% highlight js %}
    pbjs.que.push(function() {
      googletag.pubads().setTargeting(crtg_varname_1234);
      ...
    });

{% endhighlight %}


</div>
