---
layout: example
title: Criteo Setup example
description: Setup for Criteo bidder

top_nav_section: dev_docs
nav_section: quick-start

hide: true

about: 
- <strong>Bidder Setup for Criteo.</strong>
- Criteo bidder is called as part of the prebid.js setup
- keyword are passed to the adserver using the standard RTA integration
- one set of line item must be set in the adserver to manage criteo bidder separately

jsfiddle_link: jsfiddle.net/hqz36ew2/1/embedded/html,result
code_height: 2210
code_lines: 116

pid: 10
---


<br>
<br>
<br>

<div markdown="1">
#### Line 1 to 58: Set timeout and define ad units

Same setup as in [Basic Example](/dev-docs/examples/basic-example.html). Check the basic example page for more details.

</div>

<br><br><br><br><br><br>
<br><br><br><br><br><br>
<br><br><br><br><br><br>
<br><br><br><br><br><br>
<br><br><br><br><br><br>
<br><br><br><br><br><br>
<br><br><br><br><br><br>

<div markdown="1">
#### Line 60 to 66: Define the criteo bid

In this example, Criteo bidder is setup with:

- nid (provided by Criteo) to 1234
- cookiename crtg_rta (default value)
- crtg_varname to crtg_varname_1234 (will be used as variable name to define criteo interest in bidding on the impression).


</div>




<br><br><br><br><br><br>
<br><br><br><br><br><br>
<br><br><br><br><br><br>
<br>

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
