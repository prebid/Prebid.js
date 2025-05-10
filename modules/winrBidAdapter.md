# Overview

```
Module Name:  WINR Corporation Bid Adapter
Module Type:  Bidder Adapter
Maintainer: tech@winr.com.au
```

# Description

WINR AdGate Bid Adaptor for Prebid.js.

Connects to AppNexus exchange for bids.

This bid adapter supports the Banner media type only.

Please reach out to the WINR team before using this plugin to get `placementId`.

`domParent` and `child` position settings are usually determined and remotely controlled for each publisher site by the WINR team. If you would prefer to have control over these settings, please get in touch.

The code below returns a demo ad.

# Test Parameters

```js
var adUnits = [
  // Banner adUnit
  {
    code: "ad-unit",
    mediaTypes: {
      banner: {
        sizes: [[1, 1]],
      },
    },
    bids: [
      {
        bidder: "winr",
        params: {
          placementId: 21764100,
          domParent: ".blog-post", // optional
          child: 4, // optional
        },
      },
    ],
  },
];
```

# Example page

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Prebid.js Banner Example</title>
    <script async src="prebid.js"></script>
    <script>
      var adUnits = [
        {
          code: "winr-demo",
          mediaTypes: {
            banner: {
              sizes: [[1, 1]],
            },
          },
          bids: [
            {
              bidder: "winr",
              params: {
                placementId: 21764100,
                domParent: ".blog-post",
                child: 4,
              },
            },
          ],
        },
      ];

      var PREBID_TIMEOUT = 2000;
      var pbjs = pbjs || {};
      pbjs.que = pbjs.que || [];

      pbjs.que.push(function () {
        pbjs.addAdUnits(adUnits);
        pbjs.requestBids({
          bidsBackHandler: function (bidResponses) {
            initAdserver();
          },
          timeout: PREBID_TIMEOUT,
        });
      });
    </script>

    <script type="text/javascript">
      // start loading tags
      function initAdserver() {
        if (pbjs.adserverRequestSent) return;
        pbjs.adserverRequestSent = true;

        var params = pbjs.getAdserverTargetingForAdUnitCode("winr-demo");
        var iframe = document.getElementById("winr-demo");
        if (params && params["hb_adid"]) {
          pbjs.renderAd(iframe.contentDocument, params["hb_adid"]);
        }
      }
    </script>

    <!-- Bootstrap core CSS -->
    <link
      href="https://getbootstrap.com/docs/5.0/dist/css/bootstrap.min.css"
      rel="stylesheet"
      crossorigin="anonymous"
    />

    <style>
      .bd-placeholder-img {
        font-size: 1.125rem;
        text-anchor: middle;
        -webkit-user-select: none;
        -moz-user-select: none;
        user-select: none;
      }

      @media (min-width: 768px) {
        .bd-placeholder-img-lg {
          font-size: 3.5rem;
        }
      }
    </style>

    <!-- Custom styles for this template -->
    <link
      href="https://fonts.googleapis.com/css?family=Playfair+Display:700,900&amp;display=swap"
      rel="stylesheet"
    />
    <link
      href="https://getbootstrap.com/docs/5.0/examples/blog/blog.css"
      rel="stylesheet"
    />
  </head>

  <body class="single-post">
    <div class="container">
      <header class="blog-header py-3">
        <div class="row flex-nowrap justify-content-between align-items-center">
          <div class="col-12 text-center">
            <a class="blog-header-logo text-dark" href="#">WINR</a>
          </div>
        </div>
      </header>
    </div>

    <main class="container">
      <div class="p-4 p-md-5 mb-4 text-white rounded bg-dark">
        <div class="col-md-6 px-0">
          <h1 class="display-4 fst-italic">Title of a featured blog post</h1>
          <p class="lead my-3">
            Multiple lines of text that form the lede, informing new readers
            quickly and efficiently about what’s most interesting in this post’s
            contents.
          </p>
          <p class="lead mb-0">
            <a href="#" class="text-white fw-bold">Continue reading...</a>
          </p>
        </div>
      </div>

      <div class="row">
        <div class="col-md-8">
          <h3 class="pb-4 mb-4 fst-italic border-bottom">From the Firehose</h3>

          <!-- domParent -->
          <article class="blog-post">
            <h2 class="blog-post-title">Sample blog post</h2>
            <p class="blog-post-meta">
              January 1, 2021 by <a href="#">Mark</a>
            </p>

            <p>
              This blog post shows a few different types of content that’s
              supported and styled with Bootstrap. Basic typography, images, and
              code are all supported.
            </p>
            <hr />
            <p>
              Yeah, she dances to her own beat. Oh, no. You could've been the
              greatest. 'Cause, baby, <a href="#">you're a firework</a>. Maybe a
              reason why all the doors are closed. Open up your heart and just
              let it begin. So très chic, yeah, she's a classic.
            </p>
            <blockquote>
              <p>
                Bikinis, zucchinis, Martinis, no weenies. I know there will be
                sacrifice but that's the price.
                <strong>This is how we do it</strong>. I'm not sticking around
                to watch you go down. You think you're so rock and roll, but
                you're really just a joke. I know one spark will shock the
                world, yeah yeah. Can't replace you with a million rings.
              </p>
            </blockquote>
            <p>
              Trying to connect the dots, don't know what to tell my boss.
              Before you met me I was alright but things were kinda heavy. You
              just gotta ignite the light and let it shine. Glitter all over the
              room <em>pink flamingos</em> in the pool.
            </p>
            <h3>Sub-heading</h3>
            <p>
              You got the finest architecture. Passport stamps, she's
              cosmopolitan. Fine, fresh, fierce, we got it on lock. Never
              planned that one day I'd be losing you. She eats your heart out.
            </p>
            <ul>
              <li>Got a motel and built a fort out of sheets.</li>
              <li>Your kiss is cosmic, every move is magic.</li>
              <li>Suiting up for my crowning battle.</li>
            </ul>
            <p>
              Takes you miles high, so high, 'cause she’s got that one
              international smile.
            </p>
            <ol>
              <li>Scared to rock the boat and make a mess.</li>
              <li>I could have rewrite your addiction.</li>
              <li>I know you get me so I let my walls come down.</li>
            </ol>
            <p>After a hurricane comes a rainbow.</p>

            <!-- Ad unit -->
            <div style="width: 1px; height: 1px;">
              <iframe id="winr-demo" style="display: none;"></iframe>
            </div>
          </article>
          <!-- /.blog-post -->
        </div>

        <div class="col-md-4">
          <div class="p-4 mb-3 bg-light rounded">
            <h4 class="fst-italic">About</h4>
            <p class="mb-0">
              Saw you downtown singing the Blues. Watch you circle the drain.
              Why don't you let me stop by? Heavy is the head that
              <em>wears the crown</em>. Yes, we make angels cry, raining down on
              earth from up above.
            </p>
          </div>

          <div class="p-4">
            <h4 class="fst-italic">Archives</h4>
            <ol class="list-unstyled mb-0">
              <li><a href="#">March 2021</a></li>
              <li><a href="#">February 2021</a></li>
              <li><a href="#">January 2021</a></li>
              <li><a href="#">December 2020</a></li>
            </ol>
          </div>
        </div>
      </div>
      <!-- /.row -->
    </main>
    <!-- /.container -->

    <footer class="blog-footer">
      <p>
        Blog template built for
        <a href="https://getbootstrap.com/">Bootstrap</a> by
        <a href="https://twitter.com/mdo">@mdo</a>.
      </p>
      <p>
        <a href="#">Back to top</a>
      </p>
    </footer>
  </body>
</html>
```

# Example page with GPT

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Prebid.js Banner Example</title>
    <script async src="prebid.js"></script>
    <script
      async
      src="https://www.googletagservices.com/tag/js/gpt.js"
    ></script>

    <script>
      var adUnits = [
        {
          code: "div-gpt-ad-1460505748561-0",
          mediaTypes: {
            banner: {
              sizes: [[1, 1]],
            },
          },
          bids: [
            {
              bidder: "winr",
              params: {
                placementId: 21764100,
                domParent: ".blog-post",
                child: 4,
              },
            },
          ],
        },
      ];

      var FAILSAFE_TIMEOUT = 3300;
      var PREBID_TIMEOUT = 1000;
      var pbjs = pbjs || {};
      pbjs.que = pbjs.que || [];
    </script>
    <!-- Prebid Config Section END -->

    <script>
      var googletag = googletag || {};
      googletag.cmd = googletag.cmd || [];
      googletag.cmd.push(function () {
        googletag.pubads().disableInitialLoad();
      });

      pbjs.que.push(function () {
        pbjs.setConfig({
          debug: true,
        });
        pbjs.addAdUnits(adUnits);
        pbjs.requestBids({
          bidsBackHandler: sendAdserverRequest,
          timeout: PREBID_TIMEOUT,
        });
      });

      function sendAdserverRequest() {
        if (pbjs.adserverRequestSent) return;
        pbjs.adserverRequestSent = true;
        googletag.cmd.push(function () {
          pbjs.que.push(function () {
            pbjs.setTargetingForGPTAsync();
            googletag.pubads().refresh();
          });
        });
      }

      setTimeout(function () {
        sendAdserverRequest();
      }, FAILSAFE_TIMEOUT);
    </script>

    <script>
      googletag.cmd.push(function () {
        googletag
          .defineSlot(
            "/19968336/header-bid-tag-0",
            [
              [1, 1],
              [300, 250],
            ],
            "div-gpt-ad-1460505748561-0"
          )
          .addService(googletag.pubads());

        googletag.pubads().enableSingleRequest();
        googletag.enableServices();
      });
    </script>

    <!-- Bootstrap core CSS -->
    <link
      href="https://getbootstrap.com/docs/5.0/dist/css/bootstrap.min.css"
      rel="stylesheet"
      crossorigin="anonymous"
    />

    <style>
      .bd-placeholder-img {
        font-size: 1.125rem;
        text-anchor: middle;
        -webkit-user-select: none;
        -moz-user-select: none;
        user-select: none;
      }

      @media (min-width: 768px) {
        .bd-placeholder-img-lg {
          font-size: 3.5rem;
        }
      }
    </style>

    <!-- Custom styles for this template -->
    <link
      href="https://fonts.googleapis.com/css?family=Playfair+Display:700,900&amp;display=swap"
      rel="stylesheet"
    />
    <link
      href="https://getbootstrap.com/docs/5.0/examples/blog/blog.css"
      rel="stylesheet"
    />
  </head>

  <body class="single-post">
    <div class="container">
      <header class="blog-header py-3">
        <div class="row flex-nowrap justify-content-between align-items-center">
          <div class="col-12 text-center">
            <a class="blog-header-logo text-dark" href="#">WINR</a>
          </div>
        </div>
      </header>
    </div>

    <main class="container">
      <div class="p-4 p-md-5 mb-4 text-white rounded bg-dark">
        <div class="col-md-6 px-0">
          <h1 class="display-4 fst-italic">Title of a featured blog post</h1>
          <p class="lead my-3">
            Multiple lines of text that form the lede, informing new readers
            quickly and efficiently about what’s most interesting in this post’s
            contents.
          </p>
          <p class="lead mb-0">
            <a href="#" class="text-white fw-bold">Continue reading...</a>
          </p>
        </div>
      </div>

      <div class="row">
        <div class="col-md-8">
          <h3 class="pb-4 mb-4 fst-italic border-bottom">From the Firehose</h3>

          <!-- domParent -->
          <article class="blog-post">
            <h2 class="blog-post-title">Sample blog post</h2>
            <p class="blog-post-meta">
              January 1, 2021 by <a href="#">Mark</a>
            </p>

            <p>
              This blog post shows a few different types of content that’s
              supported and styled with Bootstrap. Basic typography, images, and
              code are all supported.
            </p>
            <hr />
            <p>
              Yeah, she dances to her own beat. Oh, no. You could've been the
              greatest. 'Cause, baby, <a href="#">you're a firework</a>. Maybe a
              reason why all the doors are closed. Open up your heart and just
              let it begin. So très chic, yeah, she's a classic.
            </p>
            <blockquote>
              <p>
                Bikinis, zucchinis, Martinis, no weenies. I know there will be
                sacrifice but that's the price.
                <strong>This is how we do it</strong>. I'm not sticking around
                to watch you go down. You think you're so rock and roll, but
                you're really just a joke. I know one spark will shock the
                world, yeah yeah. Can't replace you with a million rings.
              </p>
            </blockquote>
            <p>
              Trying to connect the dots, don't know what to tell my boss.
              Before you met me I was alright but things were kinda heavy. You
              just gotta ignite the light and let it shine. Glitter all over the
              room <em>pink flamingos</em> in the pool.
            </p>
            <h3>Sub-heading</h3>
            <p>
              You got the finest architecture. Passport stamps, she's
              cosmopolitan. Fine, fresh, fierce, we got it on lock. Never
              planned that one day I'd be losing you. She eats your heart out.
            </p>
            <ul>
              <li>Got a motel and built a fort out of sheets.</li>
              <li>Your kiss is cosmic, every move is magic.</li>
              <li>Suiting up for my crowning battle.</li>
            </ul>
            <p>
              Takes you miles high, so high, 'cause she’s got that one
              international smile.
            </p>
            <ol>
              <li>Scared to rock the boat and make a mess.</li>
              <li>I could have rewrite your addiction.</li>
              <li>I know you get me so I let my walls come down.</li>
            </ol>
            <p>After a hurricane comes a rainbow.</p>

            <!-- Ad unit -->
            <div id="div-gpt-ad-1460505748561-0">
              <script type="text/javascript">
                googletag.cmd.push(function () {
                  googletag.display("div-gpt-ad-1460505748561-0");
                });
              </script>
            </div>
          </article>
          <!-- /.blog-post -->
        </div>

        <div class="col-md-4">
          <div class="p-4 mb-3 bg-light rounded">
            <h4 class="fst-italic">About</h4>
            <p class="mb-0">
              Saw you downtown singing the Blues. Watch you circle the drain.
              Why don't you let me stop by? Heavy is the head that
              <em>wears the crown</em>. Yes, we make angels cry, raining down on
              earth from up above.
            </p>
          </div>

          <div class="p-4">
            <h4 class="fst-italic">Archives</h4>
            <ol class="list-unstyled mb-0">
              <li><a href="#">March 2021</a></li>
              <li><a href="#">February 2021</a></li>
              <li><a href="#">January 2021</a></li>
              <li><a href="#">December 2020</a></li>
            </ol>
          </div>
        </div>
      </div>
      <!-- /.row -->
    </main>
    <!-- /.container -->

    <footer class="blog-footer">
      <p>
        Blog template built for
        <a href="https://getbootstrap.com/">Bootstrap</a> by
        <a href="https://twitter.com/mdo">@mdo</a>.
      </p>
      <p>
        <a href="#">Back to top</a>
      </p>
    </footer>
  </body>
</html>
```
