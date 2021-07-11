# Overview

```
Module Name:  Missena Bid Adapter
Module Type:  Bidder Adapter
Maintainer: jney@missena.com
```

## Introduction

Connects to Missena for bids.

**Note:** this adapter doesn't support SafeFrame.

Useful resources:

- [README](../README.md#Build)
- [https://docs.prebid.org/dev-docs/bidder-adaptor.html](https://docs.prebid.org/dev-docs/bidder-adaptor.html)

## Develop

Setup the missena adapter in `integrationExamples/gpt/userId_example.html`.

For example:

```js
const AD_UNIT_CODE = "test-div";
const PUBLISHER_MISSENA_TOKEN = "PA-34745704";

var adUnits = [
  {
    code: AD_UNIT_CODE,
    mediaTypes: {
      banner: {
        sizes: [1, 1],
      },
    },
    bids: [
      {
        bidder: "missena",
        params: {
          apiKey: PUBLISHER_MISSENA_TOKEN,
        },
      },
    ],
  },
];
```

Then start the demo app:

```shell
gulp serve-fast --modules=missenaBidAdapter
```

And open [http://localhost:9999/integrationExamples/gpt/userId_example.html](http://localhost:9999/integrationExamples/gpt/userId_example.html)

## Test

```shell
gulp test --file test/spec/modules/missenaBidAdapter_spec.js
```

Add the `--watch` option to re-run unit tests whenever the source code changes.

## Build

```shell
gulp build --modules=missenaBidAdapter
```
