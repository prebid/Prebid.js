# BoldwinX video demo

Two pages that request a video bid from Boldwin and play it with Google IMA:

- `instream.html`: the ad plays before the content video in a video.js player.
- `outstream.html`: the ad is a video block of its own in the middle of an article. Prebid runs a
  renderer that the page provides, because the adapter has none.

The adapter puts `burl` and `nurl` into the VAST as `<Impression>` pixels, so the player opens them when
the ad starts. The log on each page shows the steps, and the panel below it lists the pixels in the VAST.

## Run

```bash
npx gulp serve-fast --modules=boldwinxBidAdapter
```

Then open, with the epid issued by Boldwin:

- `http://localhost:9999/integrationExamples/boldwinx/instream.html?epid=<EPID>`
- `http://localhost:9999/integrationExamples/boldwinx/outstream.html?epid=<EPID>`

An ad blocker can block Prebid, Google IMA or the Boldwin hosts; turn it off for these pages.
To see the pixels, open DevTools > Network and filter by `algotoro`.
