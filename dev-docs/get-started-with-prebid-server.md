---
layout: page
title: Get Started with Prebid Server
description: Get Started with Prebid Server
pid: 27
top_nav_section: dev_docs
nav_section: prebid-server
---

<div class="bs-docs-section" markdown="1">

# Get Started with Prebid Server
{:.no_toc}

This page has instructions for setting up Prebid.js with [Prebid Server](https://prebid.adnxs.com).

For many publishers, client-side header bidding is a balancing act between the inclusion of demand partners and impact to the page.

Using [Prebid Server](https://prebid.adnxs.com), you can move demand partners server-side, eliminating most of the latency impact that comes with adding more partners.

This should help you make more money without sacrificing user experience.

{: .alert.alert-success :}
**Prebid Server is open source!**  
Prebid Server is an open source project.  [The source code is hosted under the Prebid organization on Github](https://github.com/prebid/prebid-server).

* TOC
{:toc}

## Step 1. Register for a Prebid Server account

- Go to the [Prebid Server sign-up page](https://prebid.adnxs.com) and click the button to sign up.

- Fill out the form details, including your email address.

- When approved, you will receive an email with your assigned `accountId`. You will need this for configuring Prebid.js to use Prebid Server.

## Step 2. Download Prebid.js with Prebid Server enabled

- Go to [the Prebid.org download page]({{site.github.url}}/download.html), select all the demand adapters you want to work with, and include "Prebid Server".

- For example, if you want to use AppNexus, Index Exchange, and Rubicon with Prebid Server, select:
  - *AppNexus*
  - *Index Exchange*
  - *Rubicon*
  - *Prebid Server*

- Then, click **Get Custom Prebid.js** and follow the instructions.

## Step 3. Update your site with the new build of Prebid.js

Update your site's hosted copy of Prebid.js to use the new build you just generated.  (For example, you may host your copy on your site's servers or using a [CDN](https://en.wikipedia.org/wiki/Content_delivery_network) such as Fastly or Akamai.)

## Step 4. Configure S2S bidder adapters

The Prebid Server settings (defined by the `pbjs.setS2SConfig` method) go in the same anonmymous function where you define your ad units.  This method must be called before `pbjs.requestBids`.

The code in your Prebid configuration block should look something like the following.  See the table below the code sample for definitions of the keys passed to `setS2SConfig`.

{% highlight js %}
var pbjs = pbjs || {};

pbjs.que.push(function() {

    pbjs.logging = true;

    pbjs.setS2SConfig({
        accountId: '1',
        enabled: true,
        bidders: ['appnexus', 'pubmatic'],
        timeout: 1000,
        adapter: 'prebidServer',
        endpoint: 'https://prebid.adnxs.com/pbs/v1/auction'
    });

    var adUnits = [{
        code: '/19968336/header-bid-tag-1',
        sizes: sizes,
        bids: [{
            /* Etc. */
        }]
    }];
});
{% endhighlight %}

Fields you can set in `setS2SConfig`:

{: .table .table-bordered .table-striped }
| Field       | Type          | Required? | Description                                                            |
|-------------+---------------+-----------+------------------------------------------------------------------------|
| `accountId` | String        | X         | Prebid Server account ID                                               |
| `enabled`   | Boolean       | X         | Enables S2S; default: `false`                                          |
| `bidders`   | Array[String] | X         | List of bidder codes; must have been enabled during Prebid.js build    |
| `timeout`   | Number        |           | Bidder timeout, in milliseconds; default: `1000`                       |
| `adapter`   | String        |           | Adapter code; default: `"prebidServer"`                                |
| `endpoint`  | String        |           | Will override the default endpoint                                     |
| `cookieSet` | Boolean       |           | Set to `false` to opt out of cookieset/link rewriting; default: `true` |

{: .alert.alert-info :}
**Additional `cookieSet` details**  
We recommend that users leave `cookieSet` enabled since it's essential for server-to-server header bidding that we have a persistent cookie for Safari/mobile web.  If set to `false`:  
&bull; Prebid.js will not overwrite all links on page to redirect through the AppNexus `cookiePersistUrl`  
&bull; Prebid.js will not display a footer message on Safari indicating that AppNexus will be placing cookies on browsers that block 3rd party cookies  

## Related Topics

+ [Prebid.js Developer Docs]({{site.github.url}}/dev-docs/getting-started.html)
+ [Prebid Server homepage](https://prebid.adnxs.com/)

</div>
