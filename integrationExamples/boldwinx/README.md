# BoldwinX demo

Three pages that request bids from Boldwin. Video ads play with Google IMA.

- `instream.html`: the ad plays before the content video in a video.js player.
- `outstream.html`: the ad is a video block of its own in the middle of an article. Prebid runs a
  renderer that the page provides, because the adapter has none.
- `multi.html`: three ad units on one page: a 728x90 banner, an outstream video and a 300x250 banner.
  The adapter sends one request per ad unit, because the endpoint takes one impression per request.

For video the adapter puts `burl` and `nurl` into the VAST as `<Impression>` pixels, so the player opens
them when the ad starts. For banners Prebid fires `burl` when it shows the ad, and `nurl` is a pixel in
the ad markup. The log on each page shows the steps, and the panel below it lists the pixels in the VAST.

## Run

```bash
npx gulp serve-fast --modules=boldwinxBidAdapter
```

Then open, with the epid issued by Boldwin:

- `http://localhost:9999/integrationExamples/boldwinx/instream.html?epid=<EPID>`
- `http://localhost:9999/integrationExamples/boldwinx/outstream.html?epid=<EPID>`
- `http://localhost:9999/integrationExamples/boldwinx/multi.html?epid=<EPID>`

An ad blocker can block Prebid, Google IMA or the Boldwin hosts; turn it off for these pages.
To see the pixels, open DevTools > Network and filter by `algotoro`.
