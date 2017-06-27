---
layout: page
title: Setting up Prebid for AMP in DFP
head_title: Setting up Prebid for AMP in DFP
description: Setting up Prebid for AMP in DFP
pid: 3
hide: false
top_nav_section: adops
nav_section: tutorials
---

<div class="bs-docs-section" markdown="1">

# Setting up Prebid for AMP in DFP
{: .no_toc}

This page describes how to set up a line item and creative to serve on AMP pages with Prebid.js.

* TOC
{:toc}


## Line Item Setup

In addition to your other line item settings, you'll need the following:

+ Enter the **Inventory Sizes** of the creatives you want the line item to use, e.g., *300x250*, *300x50*, etc.

+ Set the **Type** to *Price Priority*

+ Set **Display creatives** to *One or More*.

+ Set **Rotate creatives** to *Evenly*.

+ In the targeting section, select **Key-values** targeting.  In [Show Prebid Ads on AMP Pages]({{site.github.url}}/dev-docs/show-prebid-ads-on-amp-pages.html), we targeted the "prebid_amp" keyword set to "true" from the developer side as an example, but you will want to coordinate with your development team to use your own key-values.

Save your line item and add a creative.


## Creative Setup

On the new creative screen, select the **Third party** creative type.

Enter the below code snippet in the **Code snippet** text area, and make sure to uncheck the **Serve into a SafeFrame** checkbox.

Note that you can always get the latest version of the creative code below from [the AMP example creative file in our GitHub repo](https://github.com/prebid/Prebid.js/blob/master/integrationExamples/gpt/amp/creative.html).

```html
<!-- This script tag should be returned by your ad server -->

<script>
    // This is the `renderAd` function from Prebid.js moved within the creative iframe
  var renderAd = function (ev) {
    var key = ev.message ? "message" : "data";
    var data = {};
    try {
      data = JSON.parse(ev[key]);
    } catch (e) {
      // Do nothing.  No ad found.
    }
    if (data.ad || data.adUrl) {
      if (data.ad) {
        document.write(data.ad);
        document.close();
      } else if (data.adUrl) {
        document.write('<IFRAME SRC="' + data.adUrl + '" FRAMEBORDER="0" SCROLLING="no" MARGINHEIGHT="0" MARGINWIDTH="0" TOPMARGIN="0" LEFTMARGIN="0" ALLOWTRANSPARENCY="true"></IFRAME>');
        document.close();
      }
    }
  };

  var requestAdFromPrebid = function () {
    var message = JSON.stringify({
      message: 'Prebid creative requested: %%PATTERN:hb_adid%%',
      adId: '%%PATTERN:hb_adid%%'
    });
    window.parent.postMessage(message, '*');
  };

  var listenAdFromPrebid = function () {
    window.addEventListener("message", renderAd, false);
  };

  listenAdFromPrebid();
  requestAdFromPrebid();
</script>
```


## Further Reading

+ [Show Prebid Ads on AMP Pages]({{site.github.url}}/dev-docs/show-prebid-ads-on-amp-pages.html)
+ [How Prebid on AMP Works]({{site.github.url}}/dev-docs/how-prebid-on-amp-works.html)

</div>
