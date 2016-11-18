---
layout: page
title: Show Prebid Ads on AMP Pages (Alpha)
description: 
pid: 1
is_top_nav: yeah
top_nav_section: dev_docs
nav_section: prebid-amp
---

<div class="bs-docs-section" markdown="1">

# Show Prebid Ads on AMP Pages (Alpha)
{: .no_toc}

This page has instructions for showing ads on AMP pages using Prebid.js.

These instructions assume you have read [How Prebid on AMP Works]({{site.github.url}}/dev-docs/how-prebid-on-amp-works.html).

For more information about the techniques used here, see the sections "Running ads from a custom domain" and "Enhance incoming ad configuration" of the [AMP for Ads](https://www.ampproject.org/docs/reference/components/amp-ad) docs.

* TOC
{:toc }

## Prerequisites

To set up Prebid.js to serve ads into your AMP pages, you'll need:

+ Prebid.js
+ Two different domains, both of which are served over HTTPS:
  1. One domain for your main AMP content
  2. Another domain where Prebid.js can run

## Implementation

+ [AMP content page](#amp-content-page): This is where your content lives.
+ [Prebid.js page](#prebid.js-page): This is where the Prebid auction is run.
+ [HTML Creative](#html-creative): This is the creative your Ad Ops team puts in your ad server.

Note that these instructions just try to explain what is in the [AMP integration example in our repo](https://github.com/prebid/Prebid.js/tree/master/integrationExamples/gpt/amp).  When in doubt, use those files as a reference.

We *strongly* recommend that you use the example files from the repo as a starting point for your integration.  We do not recommend just copying and pasting the code from this page.  Even though it is the same code as in the repo at the time of this writing, it's meant to be used as an explainer for the example code in the repo, which is likely to get updates and fixes faster than this doc.

The best way to read this page is side-by-side with [the AMP example in the repo](https://github.com/prebid/Prebid.js/tree/master/integrationExamples/gpt/amp).

<a name="amp-content-page" />

### AMP content page

The special meta tag in [amp_page.html](https://github.com/prebid/Prebid.js/blob/master/integrationExamples/gpt/amp/amp_page.html) specifies the path to the publisher-hosted file to use as the AMP cross-domain host:

```html
<meta name="amp-3p-iframe-src" content="https://amp.publisher.com:5000/remote.html">
```

The `amp-ad` elements in the page body need to be set up as shown below, especially the following attributes:

+ *data-slot*: Identifies the ad slot for the auction.
+ *json*: Used to pass JSON configuration data across to the cross-domain host running the Prebid auction.  The format of the JSON is as shown: a `"prebid"` object containing the standard `"adUnits"` you know and love, plus a `"requestBidsDuration"` key which sets the Prebid auction timeout (in milliseconds).

```html
    <amp-ad
      width="300"
      height="250"
      layout="fixed"
      type="doubleclick"
      json='{"prebid":{"requestBidsDuration":1000,"adUnits":[{"code":"/19968336/header-bid-tag-1","sizes":[[300,250],[300,600],[300,250],[100,100]],"bids":[{"bidder":"appnexusAst","params":{"placementId":"4799418","dealId":"some deal!"}},{"bidder":"aol","params":{"network":"10077.1","placement":3671670}},{"bidder":"sovrn","params":{"tagid":"315045"}}]},{"code":"/19968336/header-bid-tag-2","sizes":[[300,250],[300,600],[300,250],[100,100]],"bids":[{"bidder":"appnexusAst","params":{"placementId":"4799418","dealId":"some deal!"}},{"bidder":"aol","params":{"network":"10077.1","placement":3671670}},{"bidder":"sovrn","params":{"tagid":"315045"}}]}]}}'
      data-slot="/19968336/header-bid-tag-1">
    </amp-ad>
```


<a name="prebid.js-page" />

### Prebid.js page

The instructions below try to explain the code in [remote.html](https://github.com/prebid/Prebid.js/tree/master/integrationExamples/gpt/amp/remote.html) in the [AMP integration example in our repo](https://github.com/prebid/Prebid.js/tree/master/integrationExamples/gpt/amp).  When in doubt, use the AMP example files in the repo as your primary reference.

The steps below are written to correspond roughly with the order in which you might write the code. For each step, we note whether the code should go in the page header or body.

We recommend reading this side-by-side with [the AMP example files](https://github.com/prebid/Prebid.js/tree/master/integrationExamples/gpt/amp) to see exactly how it's all laid out.

This file is where the Prebid auction actually runs.

#### 1. Add the AMP cross-domain iFrame source file (header)

In your page's header, add the following JS in a script tag:

```html
<script>

    /** This file is the AMP x-domain iframe source file.
     *  Host this file on a cross-domain from your AMP pages,
     *  set the `amp-3p-iframe-src` meta tag on your AMP pages
     *  (see `./amp_page.html`)
     *
     *  see "Enhance incoming ad configuration" section of AMP docs
     *  https://www.ampproject.org/docs/reference/components/amp-ad
     */

    (function() {
var v = location.search.substr(1);
if (!(/^\d+(-canary)?$/.test(v))) return;
var u = 'https://3p.ampproject.net/'+encodeURIComponent(v)+'/f.js';
document.write('<script'+' src="'+encodeURI(u)+'"><'+'/script>');
})();
</script>
```


#### 2. Add Prebid.js boilerplate (header)

This is the standard Prebid prelude, similar to the [Basic Example]({{site.github.url}}/dev-docs/examples/basic-example.html).  Note the additional variable `requestBidsDuration`; this is passed from the `amp-ad` element's JSON attribute on the [AMP content page](#amp-content-page), and sets the auction timeout.

```javascript
    // The Prebid global must match Prebid.js setting
    var $$PREBID_GLOBAL$$ = pbjs;
    var prebidSrc = 'https://publisher.com:9999/build/dev/prebid.js';
    var adUnits;
    var requestBidsDuration;

    // load Prebid.js
    (function () {
        var d = document, pbs = d.createElement("script"), pro = d.location.protocal;
        pbs.type = "text/javascript";
        pbs.src = prebidSrc;
        var target = document.getElementsByTagName("head")[0];
        target.insertBefore(pbs, target.firstChild);
    })();

    var pbjs = pbjs || {};
    pbjs.que = pbjs.que || [];
```


#### 3. Targeting and other helper functions (header)

The following are helper functions that make dealing with targeting settings a little easier.  In the example we assume you are doing key-value targeting in DFP against the `prebid_amp=true` key-value pair.

```javascript
    function setTargeting(config, done) {
        config.targeting = getTargeting(config.slot);
        done(config);
    }

    function getTargeting(slot) {
        var targeting = window.context.master.pbjs.getAdserverTargeting()[slot];
        for (var key in targeting) {
            if (targeting.hasOwnProperty(key)) {
                targeting[key] = [targeting[key]];
            }
        }
        targeting['prebid_amp'] = ['true'];
        return targeting;
    }
```

Here's a helper function that lets the page listen to the ad request from the creative.

```javascript
    function listenAdRequestFromCreative() {
      addEventListener('message', sendAdToCreative, false);
    }
```


#### 4. Send the ad to the creative (header)

This function posts the ad content from the auction winner back to content page's domain where [creative.html](https://github.com/prebid/Prebid.js/blob/master/integrationExamples/gpt/amp/creative.html) is served into the `amp-ad` element.

```javascript
    function sendAdToCreative(ev) {
      var key = ev.message ? 'message' : 'data';
      var data = {};
      try {
        data = JSON.parse(ev[key]);
      } catch (e) {
        // Do nothing.  No ad found.
      }
      if (data.adId) {
          // AMP ads a `context` object to `window`s and that is used to find the
          // `master` iframe where Prebid is loaded
        var adObject = window.context.master.pbjs._bidsReceived.find(function (bid) {
          return bid.adId === data.adId;
        });

        var ad = adObject.ad;
        var adUrl = adObject.adUrl;
        var message = JSON.stringify({
          message: 'Prebid creative sent: ' + data.adId,
          ad: ad,
          adUrl: adUrl
        });
        ev.source.postMessage(message, '*');
      }
    }
```


#### 5. Load Prebid.js (header)

The function `loadPrebidJS()` shown below is what's called by the AMP `draw3p` function in this page's body (see next step), which is the integration point between AMP and content in third-party iframes (which is what this page is).

For an example showing how `draw3p` is used, see [this AMP test](https://dfp-amp-testing-1185.appspot.com/amp_tests/dfp-3p-iframe.html).

For more information about `draw3p`, see:

+ [Its implementation](https://github.com/ampproject/amphtml/blob/e5501a30adf15c8fef049729f5e0e3137dbb18ca/3p/integration.js#L252)

+ [The issue that led to its implementation](https://github.com/ampproject/amphtml/issues/1210)

```javascript
    // Helper that runs inside `loadPrebidJS()`
    function initAdserver() {
      var i;
      var adCalls = window.context.master.adCalls;
      var adCallsLength = adCalls.length;
      for (i = 0; i < adCallsLength; i++) {
        adCalls.pop()();
      }
    }

    /** wrap the rest of the setup in a function that will be called by the
     * AMP `draw3p` hook see
     * this example for more info:
     * https://dfp-amp-testing-1185.appspot.com/amp_tests/dfp-3p-iframe.html
     * */
     function loadPrebidJS() {
        pbjs.que.push(function () {
            pbjs.logging = true;
            pbjs.addAdUnits(adUnits);

            pbjs.requestBids({
                bidsBackHandler: function (bidResponses) {
                    initAdserver();
                    console.log('bidsBackHandler responses: ', bidResponses);
                },
                timeout: requestBidsDuration
            });
        });
    }
```


#### 6. Implement `draw3p`, the integration point with AMP (body)

In the page's body, implement the `draw3p` function as shown below.  Don't forget to add the arrays showing the ad networks used and the domains allowed to load this file in an iframe.

`draw3p` is the integration point between AMP and content in third-party iframes (which is what this page is).

For an example showing how `draw3p` is used, see [this AMP test](https://dfp-amp-testing-1185.appspot.com/amp_tests/dfp-3p-iframe.html).

For more information about `draw3p`, see:

+ [Its implementation](https://github.com/ampproject/amphtml/blob/e5501a30adf15c8fef049729f5e0e3137dbb18ca/3p/integration.js#L252)

+ [The issue that led to its implementation](https://github.com/ampproject/amphtml/issues/1210)

```javascript
      /** The draw3p function is the integration point between AMP and content in third party
        * iframes. For more info see: https://github.com/ampproject/amphtml/blob/e5501a30adf15c8fef049729f5e0e3137dbb18ca/3p/integration.js#L252
        */
    draw3p(function(config, done) {
      if (typeof window.context.master.adCalls === 'undefined') {
        window.context.master.adCalls = [];
      }
        if (window.context && window.context.isMaster && config.prebid) {
            var prebid = config.prebid;
            adUnits = prebid.adUnits;
            requestBidsDuration = prebid.requestBidsDuration;
            loadPrebidJS();
        }
        window.context.master.adCalls.push(setTargeting.bind(null, config, done));
    }, ['doubleclick'], ['publisher.com']);
// the first array contains ad networks used, the second domains allows to load this file in an iframe
```


#### 7. Listen to the ad request from the creative (body)

In the same `script` tag in the body as the previous step, call

```javascript
listenAdRequestFromCreative();
```

which is one of the helper functions defined in Step 3.

<a name="html-creative" />

### HTML Creative

This is the creative that your Ad Ops team uploads to the ad server.  You can see it in the AMP example in our repo: [creative.html](https://github.com/prebid/Prebid.js/blob/master/integrationExamples/gpt/amp/creative.html).

It basically does two things:

+ Ask for an ad from the Prebid auction running in [remote.html](https://github.com/prebid/Prebid.js/blob/master/integrationExamples/gpt/amp/remote.html).

+ Render that ad in an iframe

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


## Related Topics

+ [How Prebid on AMP Works]({{site.github.url}}/dev-docs/how-prebid-on-amp-works.html)
+ Sections "Running ads from a custom domain" and "Enhance incoming ad configuration" of the [AMP for Ads](https://www.ampproject.org/docs/reference/components/amp-ad) docs
+ [Setting up Prebid for AMP in DFP]({{}}/adops/setting-up-prebid-for-amp-in-dfp.html) (Ad Ops)

</div>
