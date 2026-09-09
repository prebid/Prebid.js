## fake-server

A simple http server that matches incoming requests to a stored list of `request-response` pairs, and returns a fake response. The server is meant to replace actual calls to a bid adapter's endpoint when the e2e tests run.

## What is where ?

- `index.js` — registers one route per bidder and starts the server on port `4444`.
- `bundle.js` — builds Prebid on demand for the test pages, rewriting each adapter's real endpoint to the matching local route.
- `makeResponder.js` — builds the express middleware for one bidder out of that bidder's fixtures.
- `responders/<bidder>.js` — one file per bidder, calling `makeResponder` with that bidder's matching rules.
- `fixtures/<bidder>/…` — the `request-response` pairs, grouped by bidder.

## How to add a Request - Response pair ?

All the `request-response` pairs are stored under `fixtures/<bidder>/`, where `<bidder>` is the fixture group its responder loads. Below that, any directory holding a `request.json` is one pair, at any depth.

Follow the steps below to add another `request-response` pair.

1. Inside `fixtures/<bidder>/`, create a directory and give it a suitable name.
  - If you are creating a one-off type of test, you can name this directory with a name that describes the test; for example `basic-banner`.
  - If you plan to create a series of tests focusing on one feature/topic, then you can create a generic container directory to hold all your tests together; for example `multi-bidder`.
  - If you did the latter case, please proceed to create the necessary test directories describing them with a meaningful name.
2. If you are planning to handle multiple bidder requests as part of your tests, each of those requests needs its own pair, in the fixture group of the bidder that sends it. Note that an alias sends to the endpoint of the bidder it aliases, so its pairs belong in that bidder's group — `adasta` is an `appnexus` alias, which is why `multi-bidder/multi-bidder-adasta` lives under `fixtures/appnexus`.
3. Once all your directories are created, inside the bottom test folder(s), create **three files**:
  - `description.md` (Contains path of test page and spec file. Also, contains the ad unit that generates the **request-response** pair)
  - `request.json` (This object will be matched against the acutal incoming request)
  - `response.json` (This object will be returned as response of the fake-server, if the response object's request pair matchest the incoming request)

Pairs are keyed by their path under `fixtures/`, so a directory name only has to be unique among its siblings. What does have to be unique is the *match*: a request matching two pairs fails with `More than one mock response found`, and one matching none fails with `No mock response found`.

Fixtures are read when the server starts, so a running fake-server has to be restarted to pick up an edited fixture.

For reference, please have a look at `fixtures/appnexus/basic-banner` or `fixtures/appnexus/multi-bidder` directories (as matching your scenario).

## How to add a bidder ?

1. Create `fixtures/<bidder>/` with at least one pair, as above.
2. Create `responders/<bidder>.js`, exporting a responder for that fixture group — see **Writing a responder** below.
3. Register the route in `index.js`, alongside the ones already there:

   ```javascript
   app.post('/<bidder>', bidderHandler, (req, res) => {
     res.send();
   });
   ```

4. Add the adapter's real endpoint to `REPLACE` in `bundle.js`, pointing at that route. The bundle served to the test pages is rewritten with these substitutions, which is what sends the adapter's requests to the fake-server.

### Writing a responder

The simplest responder needs nothing but the name of its fixture group:

```javascript
const makeResponder = require('../makeResponder.js');

module.exports = makeResponder('<bidder>');
```

`makeResponder(fixtureGroup, matchRequests, makeResponse)` defaults to matching when the incoming body deep-equals `request.json`, and to returning `response.json` unchanged. Both hooks are usually needed anyway, because a real request carries values no stored fixture can predict — transaction ids, the browser's user agent, screen size.

Pass `matchRequests(actualRequest, mockRequest)` to compare only the stable parts of the request, and `makeResponse(actualRequest, mockResponse)` to carry per-request values into the response. The `mock` argument is a deep copy in both cases, so a hook can mutate it without corrupting the loaded fixtures.

`responders/appnexus.js` uses both: it drops `uuid` and `tid` before comparing, then copies each request's `uuid` into the response it returns. `responders/triplelift.js` only overrides matching, comparing `imp` alone with `tid` stripped, so that the volatile `ortb2` fields a fixture cannot predict are ignored.

## How is the server initiated ?

When the command `gulp e2e-test --host=test.localhost` is executed, gulp task `test` automatically spawns the `fake-server` which runs on port `4444`.

On execution of the tests, the server automatically stops.
