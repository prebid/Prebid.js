## fake-server

A simple http server that matches incoming requests to a stored list of `request-response` pair, and returns a fake response. The server is meant to replace actual calls to `appnexus` adapter (extendable to any other adapter) endpoint when the e2e tests runs.


## How to add a Request - Response pair ?

All the `request-response` pairs are stored in the `fixtures/` directory. They are organized by their test group and test name.

Follow the steps below to add another `request-response` pair.

1. Inside the `/fixtures` directory, create a directory and give it a suitable name. 
  - If you are creating a one-off type of test, you can name this directory with a name that describes the test; for example `basic-banner`.  
  - If you plan to create a series of tests focusing on one feature/topic, then you can create a generic container directory to hold all your tests together; for example `longform`.  
  - If you did the latter case, please proceed to create the necessary test directories describing them with a meaningful and **unique** test name.
2. If you are planning to handle multiple bidder requests as part of your tests, you will need to create a specific directory for each request.  For example, you could create a pair named like so `longform_biddersettings_1` and `longform_biddersettings_2`.
3. Once all your directories are created, inside the bottom test folder(s), create **three files**:
  - `description.md` (Contains path of test page and spec file. Also, contains the ad unit that generates the **request-response** pair)
  - `request.json` (This object will be matched against the acutal incoming request)
  - `response.json` (This object will be returned as response of the fake-server, if the response object's request pair matchest the incoming request)

For reference, please have a look at `fixtures/basic-banner` or `fixtures/longform` directories (as matching your scenario).

## How is the server initiated ?

When the command `gulp e2e-test --host=test.localhost` is executed, gulp task `test` automatically spawns the `fake-server` which runs on port `4444`.

On execution of the tests, the server automatically stops.