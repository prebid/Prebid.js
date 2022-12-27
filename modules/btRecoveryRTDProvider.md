# Overview

```
Module Name: Blockthrough Realtime Data Provider
Module Type: RTD Provider
Maintainer: contact@blockthrough.com
```

Using this module requires prior agreement with [Blockthrough](https://blockthrough.com) to obtain your Publisher ID.

## Description

The module provides effective way for Publishers to recover their revenue in AdBlock traffic with respect to users preferences and not breaking Acceptable Ads Standard.

## Integration

Add the BT Recovery module to your Prebid.js package with:

```
gulp build --modules=btRecovery,rtdModule,...
```
note, `rtdModule` should be also installed.

## Configuration

This module is configured as a part of the `realTimeData.dataProviders` object. The following configuration parameters are available:

| Param under realTimeData.dataProviders[] | Scope |  Description | Type | Example |
|:--------------:|:--------:|:-----------------------------------------|:--------------:|:--------------:|
|    `name`      | required | Real time data module name               |    `string`    | `'btRecovery'` |
|   `params`     | required | Details for the module initialization    |    `Object`    |                |
| `params.pubID` | required | BT Publisher ID                          |    `string`    | Please reach out to Blockthrough and request your `pubID` |


### Example

Configure `btRecovery` module in your `realTimeData` configuration:

```
pbjs.setConfig({
  realTimeData: {
    dataProviders: [
      {
        name: 'btRecovery',
        params: {
          pubID: '1234567890123456',
        },
      },
    ],
  }
});
```
