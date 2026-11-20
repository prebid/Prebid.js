# CORS preflight probe

A maintainer tool. It checks which bid adapter, user ID and RTD endpoints still answer when a request leaves out the
things that make a browser send a CORS preflight.

It is not part of the build or the test suite. Nothing in `gulpfile.js`, `test/vitest/vitest.config.mjs` or CI loads
it, so it runs only when someone runs it by hand.

## Why

A cross-origin `POST` is a "simple" request as long as its `Content-Type` is `text/plain`,
`application/x-www-form-urlencoded` or `multipart/form-data`, and it carries no other non-safelisted headers. Anything
else, such as `Content-Type: application/json` or a custom header like `X-Openrtb-Version`, makes the browser send an
`OPTIONS` preflight first and wait for the answer. That costs a round trip about as long as the request itself. For a
bid request it eats into the bidder's timeout. For a user ID module behind `auctionDelay`, or an RTD provider with
`waitForIt: true`, it delays the whole auction.

Prebid core sends JSON bodies as `text/plain` for this reason. [#12948](https://github.com/prebid/Prebid.js/issues/12948) by [@pm-harshad-mane](https://github.com/pm-harshad-mane) measured the cost in
DevTools, and his write-up
[Optimizing cross-origin requests: avoiding CORS preflight](https://www.linkedin.com/pulse/optimizing-cross-origin-requests-avoiding-cors-preflight-harshad-mane-szy1c/)
explains it. Some modules still override the content type (`contentType: 'application/json'`, which the
`prebid/json-request-content-type` CodeQL rule flags) or add custom headers (`customHeaders`, which the rule misses).

Some endpoints really do reject `text/plain`. Insticator's did ([#15749](https://github.com/prebid/Prebid.js/issues/15749), after [#15720](https://github.com/prebid/Prebid.js/pull/15720)), and the vendor fixed it server side within a
week. This probe finds out, endpoint by endpoint, which case each module is in.

## How it works

1. **Capture** (`vitest.config.mjs`, `captureSetup.mjs`). This runs the modules' own unit test specs in the normal
   Vitest browser harness, with one extra setup file. The setup file records:
   - every request a bid adapter's `spec.buildRequests` returns (URL, method, body and `options`);
   - every `Request` the page constructs, which covers everything that goes through `src/ajax.ts`, as user ID and RTD
     modules do.

   So the requests are built by the modules themselves, from the bid and config fixtures in their spec files. One JSON
   file per spec is written to `out/capture/` (git-ignored).
2. **Probe** (`probe.mjs`). For each module, this picks the first captured request that a browser would preflight. It
   prefers an `https:` URL on a real host; fixture hosts such as `example.com` or `test.com` are skipped. For a bid
   adapter only `buildRequests` output counts, because that is the bid request. A bidder whose only trigger is
   elsewhere, such as a win notification, is reported with a note. Then, from Node, the probe sends:
   - **(a)** the request as the module sends it, with its content type and custom headers;
   - **(b)** the same body as `Content-Type: text/plain;charset=UTF-8`, with no custom headers. A `GET` without a body is
     sent with no `Content-Type` at all;
   - **(c)** an `OPTIONS` preflight, with `Access-Control-Request-Method` and `Access-Control-Request-Headers` listing
     what the module sends.

## Running it

```sh
npx gulp precompile
npx vitest run --config tools/preflight-probe/vitest.config.mjs BidAdapter_spec IdSystem_spec Idsystem_spec RtdProvider_spec
node tools/preflight-probe/probe.mjs --dry-run            # lists the targets; sends nothing
node tools/preflight-probe/probe.mjs > results.md          # sends the requests; also writes out/results.json
```

The capture takes about a minute and a half for all 670 specs. Spec failures don't matter to it. `--only a,b` limits
the probe to some modules. `--from out/results.json` reclassifies a saved run without sending anything, which is useful
after changing the classification rules.

## What it sends, and to whom

- Only the endpoints the modules themselves build requests for, with the modules' unit test fixtures: test placement
  IDs, fake consent strings and fake user IDs. No real user data.
- Three requests per module: (a), (b) and (c). Up to 8 modules are probed at once, each with a 10 s timeout. Nothing is
  retried; a 429 or 503 is recorded as such.
- Every request carries `User-Agent: Prebid.js preflight probe (+https://github.com/prebid/Prebid.js)`,
  `Origin: https://example.com` and `Referer: https://example.com/preflight-probe.html`.
- Only the status, the response content type, the `Access-Control-*` headers and a short summary of the body are kept.
  The summary is `bid`, `no-bid`, `json`, `empty`, or the first 60 characters of an error text. Full responses are not
  stored.

## Reading the results

Each row gives the module, the endpoint host, the trigger and the three outcomes. The trigger is either
`contentType <type>` or `header <name>`, and `(no body)` marks a content type sent on a request without a body. The
classes are:

| class | meaning |
|---|---|
| **works without** | (a) and (b) both succeed with the same kind of response. The module can drop the trigger today. |
| **needs it** | (a) succeeds, but (b) gets a 4xx (usually 415) or a parse error. The vendor has to change the server before the module can drop the trigger. Also used when (a) is rejected with test params but (b) gets a 415. |
| **inconclusive** | Can't tell. Both requests are rejected the same way (usually because of the test params), or the host rate-limited or overloaded, or CORS isn't granted to `https://example.com`. That last one could be dead CORS or an origin allowlist. A 2xx/204 to both still shows that `text/plain` was accepted. |
| **broken today** | (a) can't connect (DNS, TLS, timeout or reset), (a) gets a 415 for the module's own content type, or the preflight (c) is answered with an error status. In a browser, the request as sent now cannot work. Those modules are input for the Prebid 12 dead-adapter audit. |
| **not probed** / **out of scope** | Fixtures only use placeholder hosts, or the trigger is publisher configuration rather than the module's. |

Caveats:

- Each run is one snapshot from one network. Treat a DNS or timeout failure as a lead to check, not a verdict.
- With test params, many endpoints answer `204` or `no-bid` whatever you send. That still shows they accept the content
  type, but not that they would bid.
- The first run (`results-2026-11-20.md`) kept the `Access-Control-*` headers of the preflight only. The script now
  keeps them for (a) and (b) too, and marks a 2xx (a) that lacks them as inconclusive.

[`results-2026-11-20.md`](results-2026-11-20.md) has the first run.
