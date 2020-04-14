## fake-server

A simple http server that matches incoming requests to a stored list of `request-response` pair, and returns a fake response. The server is meant to replace actual calls to `appnexus` adapter (extendable to any other adapter) endpoint when the e2e tests runs.


## How to add a Request - Response pair ?

All the `request-response` pairs are stored in the `fixtures/` directory. They are organized by their media types.

Follow the steps below to add another `request-response` pair.

1. Inside the `/fixtures` directory, create a directory and give it a suitable name. For example, `fixtures/banner/`
2. Once inside the new directory, create another directory, this one is specifically for storing the `request-response` pair. For example, `fixtures/banner/banner-1/`
3. Inside the new directory, create **three files**.
  - `description.md` (Contains path of test page and spec file. Also, contains the ad unit that generates the **request-response** pair)
  - `request.json` (This object will be matched against the acutal incoming request)
  - `response.json` (This object will be returned as response of the fake-server, if the response object's request pair matchest the incoming request)

For reference, please have a look at `fixtures/banner` directory.

## How is the server initiated ?

When the command `gulp e2e-test --host=test.localhost` is executed, gulp task `test` automatically spawns the `fake-server` which runs on port `4444`.

On execution of the tests, the server automatically stops.
