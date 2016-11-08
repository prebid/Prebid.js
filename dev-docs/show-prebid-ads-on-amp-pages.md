---
layout: page
title: Show Prebid Ads on AMP Pages
description: 
pid: 0
is_top_nav: yeah
top_nav_section: dev_docs
nav_section: prebid-amp
---

<div class="bs-docs-section" markdown="1">

# Show Prebid Ads on AMP Pages
{: .no_toc}

<span style="color: rgb(255,0,0);">FIXME</span>: <strong>mark this as "Beta"?</strong>

<span style="color: rgb(255,0,0);">FIXME</span>: <strong>see if we're actually marking the "amp" type in the adaptors file</strong>

Note that you'll need to make sure to work with AMP-enabled bidders
(In the file `adapters.json` in the Prebid.js repo, they will have
`"amp"` in their list of supported media types).

This page has instructions for showing ads on AMP pages using Prebid.js.

* TOC
{:toc }

## How it Works

Using the AMP for Ads integration, you can serve Prebid.js demand into `<amp-ad>` elements.  For more information, [see the `amp-ad` documentation](https://www.ampproject.org/docs/reference/components/amp-ad).

The diagram below shows how the pieces all fit together.  The way it works is:

+ The main content page (`amp.publisher.com/amp_page.html` in the diagram) is a mostly normal AMP page that serves over HTTPS and uses AMP's new ad element (`amp-ad`)
    + It has a `meta` element pointing to a cross-domain host where Prebid.js runs.  It needs to be a cross-domain host so our JS executes inside a secure iFrame.
+ The cross-domain host (`amp-x-domain.publisher.com/remote.html` in the diagram) is where Prebid.js runs, fetching bids from bidders, etc.  In addition, this host is where the communication that needs to happen with the main content page takes place (using `postMessage`).  For more information about the requirements on this page, see the section **Enhance incoming ad configuration** of [the AMP docs](https://www.ampproject.org/docs/reference/components/amp-ad)
+ Finally, the creative (`creative.html` in the diagram) is what your ad ops team puts into your ad server.  It's a mostly standard Prebid.js creative with a few tweaks to allow it to work in AMP-land.

(<span style="color: rgb(255,0,0);">FIXME</span>: <strong>consider removing publisher.com box? not 100% sure what it's accomplishing here - does it redirect to the AMP page?  I read that AMP pages were just cached on the Goog, so not sure how this fits in.</strong>)

The filenames in the diagram correspond with [the AMP example HTML files in the repo](https://github.com/prebid/Prebid.js/tree/master/integrationExamples/gpt/amp).

![Prebid AMP Overview Diagram]({{site.github.url}}/assets/images/dev-docs/prebid-amp.png)

## Prerequisites

To set up Prebid.js to serve ads into your AMP pages, you'll need:

+ Two different domains, both of which are served over HTTPS:
  1. One domain for your main AMP content page
  2. Another domain where Prebid.js can run
+ Access to developers who can get this working, obv.
+ Prebid.js, obv.
+ Determination

## Implementation

+ [Main content page](#main-content-page)
+ [Prebid.js page](#prebid.js-page)
+ [HTML Creative](#html-creative)

<a name="main-content-page" />

### Main content page

The special meta tag specifies the path to the publisher-hosted file to use as the AMP x-domain host. The domain for ./remote.html must be different from the domain for ./amp_page.html to be a cross domain (secure, unfriendly) iframe.  In this example the domains and ports are:

https://publisher.com:9999/amp_page.html

and

https://amp.publisher.com:5000/remote.html


Further reading
AMP documentation <amp-ad> spec

https://www.ampproject.org/docs/reference/components/amp-ad

See sections on "Running ads from a custom domain" and "Enhance incoming ad configuration" for more details on techniques used here.

```html
<meta name="amp-3p-iframe-src" content="http://45.55.79.103:3000/remote.html">
```

<a name="prebid.js-page" />

### Prebid.js page

#### 1. Add the AMP cross-domain iFrame source file

<a name="html-creative" />

#### 2. Add Prebid.js boilerplate (adunits, etc.)

#### ?. Munge the Targeting

#### ?. Send the ad to the creative

#### ?. Load Prebid.js

#### ?. Implement `draw3p`, the integration point with AMP

#### ?. Listen to the ad request from the creative

### HTML Creative

## Example Code

For example code, see the [AMP integration examples](https://github.com/prebid/Prebid.js/tree/master/integrationExamples/gpt/amp) in the main Prebid.js repo.

</div>
