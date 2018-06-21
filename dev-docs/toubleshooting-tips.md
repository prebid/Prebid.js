---
layout: page
title: Dev Tips
description: Troubleshooting tips for developers implementing Prebid.js Header Bidding.
pid: 0

top_nav_section: dev_docs
nav_section: troubleshooting

---

<div class="bs-docs-section" markdown="1">

# Tips for Troubleshooting
{:.no_toc}

This page has tips and tricks for troubleshooting issues with your Prebid.js integration.

* TOC
{:toc}

## Turn on Prebid.js debug messages

Add `pbjs_debug=true` to the end of your page's URL. For example: <a href="{{ site.github.url }}/examples/pbjs_demo.html?pbjs_debug=true" class="btn btn-default btn-sm" target="_blank">/pbjs_demo.html?pbjs_debug=true</a>. This will add two types of messages to your browser's developer console:

1. Prebid.js suppresses Javascript errors in the normal mode to not break the rest of your page. Adding the `pbjs_debug` parameter will expose the Javascript errors.
2. You'll find additional debug messages. Filter the messages by string `MESSAGE:`. For example:

<br>

{: .pb-md-img :}
![Prebid.js Debug Console]({{ site.github.url }}/assets/images/dev-docs/pbjs_debug-console-log.png)

<br>

{: .table .table-bordered .table-striped }
| Message |  Description   |
| :----  |:--------|
| Calling bidder |  When Prebid.js sends out bid requests, this message is logged |
| Set key value for placement | After all the bids came back, or when timeout is reached, prebid.js will set keyword targeting for the defined ad units. |
| Calling renderAd | If a header bidding bid wins the ad server's auction, prebid.js will render the winning bid's creative. |

<br>

## Turn on your ad server's developer console

The ad server's developer console usually provide information such as targeting, latency, and key events logging. For example, here is a screenshot of DFP's GPT developer console logs:

<br>

{: .pb-md-img :}
![Prebid.js Debug Console]({{ site.github.url }}/assets/images/dev-docs/googfc.png)

<br>

## See all bids in the console

To print information about all of the bids that come in to the Console on any page that is running Prebid.js, follow these steps.

Open the Chrome Dev Tools.  In the **Sources** tab, next to **Content Scripts**, click the **>>** button and you can add **Snippets**:

{: .pb-img.pb-md-img :}
![View Snippets in Dev Tools]({{site.github.url}}/assets/images/dev-docs/troubleshooting-tips/01-view-snippets.png)

<br />

Right-click to add a **New** snippet:

{: .pb-img.pb-md-img :}
![Add New Snippet in Dev Tools]({{site.github.url}}/assets/images/dev-docs/troubleshooting-tips/02-add-new-snippet.png)

<br />

Paste in the following code using Control-V (or Command-V on Mac), and give the snippet a name, such as 'show-all-bids':

```javascript
(function() {
  var responses = pbjs.getBidResponses();
  var winners = pbjs.getAllWinningBids();
  var output = [];
  Object.keys(responses).forEach(function(adUnitCode) {
    var response = responses[adUnitCode];
    response.bids.forEach(function(bid) {
      output.push({
        bid: bid,
        adunit: adUnitCode,
        adId: bid.adId,
        bidder: bid.bidder,
        time: bid.timeToRespond,
        cpm: bid.cpm,
        msg: bid.statusMessage,
        rendered: !!winners.find(function(winner) {
          return winner.adId==bid.adId;
        })
      });
    });
  });
  if (output.length) {
    if (console.table) {
      console.table(output);
    } else {
      for (var j = 0; j < output.length; j++) {
        console.log(output[j]);
      }
    }
  } else {
    console.warn('NO prebid responses');
  }
})();
```

<br />

Right-click the snippet and choose **Run**:

{: .pb-img.pb-md-img :}
![Run a Snippet in Dev Tools]({{site.github.url}}/assets/images/dev-docs/troubleshooting-tips/03-run-snippet.png)

<br />

Check the output in Console to see the bids:

{: .pb-img.pb-lg-img :}
![See Snippet Output in Dev Tools]({{site.github.url}}/assets/images/dev-docs/troubleshooting-tips/04-snippet-output.png)

## See all winning bids in the console

To print information about all of the winning bids that come in to the Console on any page that is running Prebid.js, follow these steps.

Open the Chrome Dev Tools.  In the **Sources** tab, next to **Content Scripts**, click the **>>** button and you can add **Snippets**:

{: .pb-img.pb-md-img :}
![View Snippets in Dev Tools]({{site.github.url}}/assets/images/dev-docs/troubleshooting-tips/01-view-snippets.png)

<br />

Right-click to add a **New** snippet:

{: .pb-img.pb-md-img :}
![Add New Snippet in Dev Tools]({{site.github.url}}/assets/images/dev-docs/troubleshooting-tips/02-add-new-snippet.png)

<br />

Paste in the following code using Control-V (or Command-V on Mac), and give the snippet a name, such as 'show-all-winning-bids':

```javascript
var bids = pbjs.getHighestCpmBids();
var output = [];
for (var i = 0; i < bids.length; i++) {
    var b = bids[i];
    output.push({
        'adunit': b.adUnitCode, 'adId': b.adId, 'bidder': b.bidder,
        'time': b.timeToRespond, 'cpm': b.cpm
    });
}
if (output.length) {
    if (console.table) {
        console.table(output);
    } else {
        for (var j = 0; j < output.length; j++) {
            console.log(output[j]);
        }
    }
} else {
    console.warn('No prebid winners');
}
```

<br />

Right-click the snippet and choose **Run**:

{: .pb-img.pb-md-img :}
![Run a Snippet in Dev Tools]({{site.github.url}}/assets/images/dev-docs/troubleshooting-tips/03-run-snippet.png)

<br />

Check the output in Console to see the bids (note that this screenshot shows the output from "see all bids" but they're very similar):

{: .pb-img.pb-lg-img :}
![See Snippet Output in Dev Tools]({{site.github.url}}/assets/images/dev-docs/troubleshooting-tips/04-snippet-output.png)

## Related Reading

+ [Prebid FAQ]({{site.github.url}}/dev-docs/faq.html)
+ [Prebid Common Issues]({{site.github.url}}/dev-docs/common-issues.html)

</div>
