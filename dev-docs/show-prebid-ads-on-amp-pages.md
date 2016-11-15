---
layout: page
title: Show Prebid Ads on AMP Pages
description: 
pid: 1
is_top_nav: yeah
top_nav_section: dev_docs
nav_section: prebid-amp
---

<div class="bs-docs-section" markdown="1">

# Show Prebid Ads on AMP Pages
{: .no_toc}

<span style="color: rgb(255,0,0);">FIXME</span>: <strong>mark this as "Beta"?</strong>

<span style="color: rgb(255,0,0);">FIXME</span>: <strong>see if we're actually marking the "amp" type in the adaptors file</strong>

This page has instructions for showing ads on AMP pages using Prebid.js.

Specifically, these instructions show you how to serve Prebid.js demand into `<amp-ad>` elements.  For more information about the `<amp-ad>` element, [see the AMP documentation](https://www.ampproject.org/docs/reference/components/amp-ad).

* TOC
{:toc }

## Prerequisites

To set up Prebid.js to serve ads into your AMP pages, you'll need:

+ Two different domains, both of which are served over HTTPS:
  1. One domain for your main AMP content page
  2. Another domain where Prebid.js can run
+ Access to developers who can get this working, obv.
+ Prebid.js, obv.
+ Determination
+ Integrations with AMP-enabled bidders
(In the file `adapters.json` in the Prebid.js repo, they will have
`"amp"` in their list of supported media types).


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



#### 2. Add Prebid.js boilerplate (adunits, etc.)

#### ?. Munge the Targeting



#### ?. Send the ad to the creative

#### ?. Load Prebid.js

#### ?. Implement `draw3p`, the integration point with AMP

#### ?. Listen to the ad request from the creative

<a name="html-creative" />

### HTML Creative

<a name="example-code" />

## Example Code

For example code, see the [AMP integration examples](https://github.com/prebid/Prebid.js/tree/master/integrationExamples/gpt/amp) in the main Prebid.js repo.

</div>
